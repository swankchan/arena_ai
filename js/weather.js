import * as THREE from 'three/webgpu';
import {
  Fn, abs, attribute, color, float, floor, fract, length, mrt,
  sin, cos, smoothstep, time, uniform, uv, vec2, vec3, vec4
} from 'three/tsl';

// Camera-local, GPU-animated precipitation and a double-pulse lightning system. No sprite
// downloads or CPU particle uploads are needed: each instance is a deterministic seed and
// the TSL vertex shader wraps it through a world-space volume around the current camera.

const WEATHER_MODES = new Set(['clear', 'rain', 'storm', 'snow']);
const TAU = Math.PI * 2;
const transparentEffectMRT = mrt({
  normal: vec4(0.0, 0.0, 0.0, 0.0),
  metalRough: vec4(0.0, 0.0, 0.0, 0.0)
});

function randomGenerator(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function wrapAroundCenter(seedCoordinate, cameraCoordinate, span) {
  return seedCoordinate.add(
    floor(cameraCoordinate.sub(seedCoordinate).div(span).add(0.5)).mul(span)
  );
}

function createPrecipitation(mode, count) {
  const random = randomGenerator(mode === 'rain' ? 9157 : 41731);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seeds[i * 4] = random() * 2 - 1;
    seeds[i * 4 + 1] = random();
    seeds[i * 4 + 2] = random() * 2 - 1;
    seeds[i * 4 + 3] = random();
  }

  const plane = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.setAttribute('position', plane.getAttribute('position'));
  geometry.setAttribute('normal', plane.getAttribute('normal'));
  geometry.setAttribute('uv', plane.getAttribute('uv'));
  geometry.setAttribute('aWeatherSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = count;

  const material = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true
  });
  material.mrtNode = transparentEffectMRT;

  const seed = attribute('aWeatherSeed', 'vec4');
  const center = uniform(new THREE.Vector3());
  const rain = mode === 'rain';
  const range = rain ? 58 : 46;
  const span = range * 2;
  const height = rain ? 44 : 36;
  const top = rain ? 25 : 19;
  const speed = rain ? 0.53 : 0.034;

  material.positionNode = Fn(() => {
    const life = fract(seed.y.add(time.mul(speed))).toVar();
    const sx = seed.x.mul(range);
    const sz = seed.z.mul(range);
    const x = wrapAroundCenter(sx, center.x, span).toVar();
    const z = wrapAroundCenter(sz, center.z, span).toVar();
    if (rain) {
      // A steady crosswind slants the fall without moving the whole volume with the player.
      x.addAssign(life.mul(5.5));
      z.addAssign(life.mul(1.4));
    } else {
      const phase = seed.w.mul(TAU);
      x.addAssign(sin(time.mul(0.72).add(phase)).mul(1.45)).addAssign(life.mul(1.8));
      z.addAssign(cos(time.mul(0.58).add(phase)).mul(1.15));
    }
    const y = center.y.add(top).sub(life.mul(height));
    return vec3(x, y, z);
  })();

  if (rain) {
    material.scaleNode = vec2(float(0.028).add(seed.w.mul(0.025)), float(0.9).add(seed.w.mul(1.0)));
    material.rotationNode = float(-0.12);
    material.colorNode = color(0xc6dce8);
    material.opacityNode = Fn(() => {
      const across = float(1.0).sub(abs(uv().x.sub(0.5)).mul(2.0)).clamp(0.0, 1.0);
      const caps = smoothstep(0.0, 0.12, uv().y)
        .mul(smoothstep(0.0, 0.12, float(1.0).sub(uv().y)));
      return across.mul(across).mul(caps).mul(0.55);
    })();
  } else {
    const size = float(0.075).add(seed.w.mul(0.105));
    material.scaleNode = vec2(size, size);
    material.rotationNode = seed.w.mul(TAU).add(time.mul(seed.w.sub(0.5).mul(1.4)));
    material.colorNode = color(0xf4f8ff);
    material.opacityNode = Fn(() => {
      const distance = length(uv().sub(vec2(0.5, 0.5))).mul(2.0);
      const softDisc = float(1.0).sub(smoothstep(0.18, 1.0, distance));
      return softDisc.mul(0.88);
    })();
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = rain ? 'WeatherRain' : 'WeatherSnow';
  mesh.frustumCulled = false;
  mesh.renderOrder = 9;
  mesh.visible = false;
  mesh.userData.weatherCenter = center;
  return mesh;
}

function lightningTube(points, radius, material) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(points[i - 1], points[i]));
  const geometry = new THREE.TubeGeometry(path, Math.max(12, points.length * 3), radius, 5, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  return mesh;
}

export class WeatherSystem {
  constructor(scene, lightingSystem) {
    this.scene = scene;
    this.lighting = lightingSystem;
    this.mode = 'clear';
    this.root = new THREE.Group();
    this.root.name = 'WeatherSystem';
    this.rain = createPrecipitation('rain', 3200);
    this.snow = createPrecipitation('snow', 2200);
    this.root.add(this.rain, this.snow);

    this.boltMaterial = new THREE.MeshBasicNodeMaterial({
      color: 0xd9edff,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.boltMaterial.mrtNode = transparentEffectMRT;
    this.boltMaterial.colorNode = vec3(3.2, 4.0, 5.5);
    this.bolt = null;
    this.flashAge = Infinity;
    this.nextLightning = 2.5;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    scene.add(this.root);
  }

  setWeather(mode) {
    if (!WEATHER_MODES.has(mode)) return;
    this.mode = mode;
    this.rain.visible = mode === 'rain' || mode === 'storm';
    this.snow.visible = mode === 'snow';
    this.lighting.setWeather(mode);
    if (mode === 'storm') {
      this.nextLightning = Math.min(this.nextLightning, 0.9);
    } else {
      this.clearLightning();
    }
  }

  clearLightning() {
    this.flashAge = Infinity;
    this.lighting.uLightningFlash.value = 0;
    this.lighting.hemiLight.intensity = this.lighting.baseHemiIntensity;
    if (this.bolt) this.bolt.visible = false;
  }

  triggerLightning(camera) {
    if (!camera) return;
    camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, 1);
    this.forward.normalize();
    this.right.set(this.forward.z, 0, -this.forward.x);

    const distance = 330 + Math.random() * 130;
    const lateral = (Math.random() - 0.5) * 300;
    const baseX = camera.position.x + this.forward.x * distance + this.right.x * lateral;
    const baseZ = camera.position.z + this.forward.z * distance + this.right.z * lateral;
    const bottom = Math.max(4, camera.position.y - 28);
    const points = [];
    let x = baseX, z = baseZ;
    for (let i = 0; i <= 13; i++) {
      const t = i / 13;
      if (i > 0 && i < 13) {
        x += (Math.random() - 0.5) * 13;
        z += (Math.random() - 0.5) * 9;
      }
      points.push(new THREE.Vector3(x, bottom + (1 - t) * 285, z));
    }

    if (this.bolt) {
      this.root.remove(this.bolt);
      this.bolt.traverse((object) => object.geometry?.dispose());
    }
    this.bolt = new THREE.Group();
    this.bolt.name = 'WeatherLightningBolt';
    this.bolt.add(lightningTube(points, 0.42, this.boltMaterial));
    const branchStart = points[5];
    const branch = [branchStart.clone()];
    for (let i = 1; i <= 5; i++) {
      branch.push(new THREE.Vector3(
        branchStart.x + this.right.x * i * 7 + (Math.random() - 0.5) * 7,
        branchStart.y - i * 10,
        branchStart.z + this.right.z * i * 7 + (Math.random() - 0.5) * 7
      ));
    }
    this.bolt.add(lightningTube(branch, 0.19, this.boltMaterial));
    this.root.add(this.bolt);
    this.flashAge = 0;
    this.nextLightning = 4.5 + Math.random() * 6.5;
  }

  update(dt, camera) {
    this.rain.userData.weatherCenter.value.copy(camera.position);
    this.snow.userData.weatherCenter.value.copy(camera.position);
    if (this.mode !== 'storm') return;

    this.nextLightning -= dt;
    if (this.nextLightning <= 0) this.triggerLightning(camera);
    this.flashAge += dt;
    const age = this.flashAge;
    const first = Math.exp(-Math.max(0, age) * 20);
    const second = age >= 0.17 ? Math.exp(-(age - 0.17) * 25) * 0.82 : 0;
    const flash = age < 0.85 ? Math.max(first, second) : 0;
    this.lighting.uLightningFlash.value = flash * 1.65;
    this.lighting.hemiLight.intensity = this.lighting.baseHemiIntensity + flash * 4.2;
    if (this.bolt) this.bolt.visible = age < 0.105 || (age >= 0.17 && age < 0.225);
  }
}
