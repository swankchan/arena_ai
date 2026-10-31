import * as THREE from 'three/webgpu';
import {
  Fn, float, vec2, vec3, vec4, color,
  positionGeometry, positionWorld, cameraPosition, cameraViewMatrix,
  time, sin, cos, floor, fract, clamp, mix, smoothstep, dot,
  normalize, pow, max, texture
} from 'three/tsl';
import { getWaterWaveTexture } from '../../tsl-materials.js';

// Victoria Harbour is a sheltered, working harbour rather than an open-ocean surf surface. Four advected FFT wind-sea
// scales provide chop and sub-pixel slope variance; three longer deep-water swells really displace the mesh and also
// contribute to its shading normal. Mean displacement is zero, so the surveyed/presentation water level stays -2.2 m.
// There are deliberately no painted Manhattan shoreline reflections in this material.

const harbourHash = Fn(([p]) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)));
const harbourNoise = Fn(([p]) => {
  const pv = vec2(p).toVar();
  const i = floor(pv).toVar();
  const f = fract(pv).toVar();
  const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0))).toVar();
  const a = harbourHash(i);
  const b = harbourHash(i.add(vec2(1.0, 0.0)));
  const c = harbourHash(i.add(vec2(0.0, 1.0)));
  const d = harbourHash(i.add(vec2(1.0, 1.0)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

// [wavelength m, amplitude m, direction x/z, phase]. omega=sqrt(g*k) gives each swell its own deep-water period.
const SWELLS = [
  [240, 0.13, 0.94, 0.342, 0.4],
  [165, 0.20, 0.81, -0.586, 2.1],
  [128, 0.09, 0.98, 0.199, 4.3]
];

// vec3(height, dh/dx, dh/dz). Used by both positionNode and the fragment normal, keeping motion and reflections locked.
const longSwell = Fn(([p]) => {
  const height = float(0).toVar();
  const slopeX = float(0).toVar();
  const slopeZ = float(0).toVar();
  for (const [wavelength, amplitude, dx, dz, phaseOffset] of SWELLS) {
    const k = Math.PI * 2 / wavelength;
    const omega = Math.sqrt(9.81 * k);
    const phase = dot(p, vec2(dx, dz)).mul(k).sub(time.mul(omega)).add(phaseOffset);
    height.addAssign(sin(phase).mul(amplitude));
    const derivative = cos(phase).mul(amplitude * k);
    slopeX.addAssign(derivative.mul(dx));
    slopeZ.addAssign(derivative.mul(dz));
  }
  return vec3(height, slopeX, slopeZ);
});

export function createHongKongHarbourWaterMaterial({ centre = [0, 0], bakedWorld = false } = {}) {
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.28 });
  const waveTexture = getWaterWaveTexture();

  // Ordinary water uses PlaneGeometry's local XY. Portal-cut water is baked into world XZ instead, because the
  // opening rectangles are world-space; both forms displace the mean surface by the same long swell.
  material.positionNode = Fn(() => {
    const p = positionGeometry;
    if (bakedWorld) return vec3(p.x, p.y.add(longSwell(p.xz).x), p.z);
    const worldXZ = vec2(p.x, p.y.negate()).add(vec2(centre[0], centre[1]));
    return vec3(p.x, p.y, longSwell(worldXZ).x);
  })();

  // [tile m, rotation, RMS slope]. Incommensurate sizes and angles hide repetition at harbour and aerial scales.
  const layers = [
    [83.0, 0.15, 0.076],
    [31.7, 1.73, 0.092],
    [11.3, 3.91, 0.104],
    [4.1, 2.43, 0.072]
  ];

  // vec4(mean slope x/z, unresolved slope variance, signed crest height).
  const windWaves = Fn(() => {
    const p = positionWorld.xz;
    const gustA = harbourNoise(p.mul(0.0043).add(vec2(time.mul(0.010), time.mul(-0.006))));
    const gustB = harbourNoise(p.mul(0.0127).add(vec2(time.mul(-0.008), time.mul(0.012))).add(31.7));
    const gust = smoothstep(0.16, 0.84, gustA.mul(0.64).add(gustB.mul(0.36)));
    const energy = mix(float(0.58), float(1.52), gust).toVar();
    const slope = vec2(0).toVar();
    const variance = energy.mul(energy).mul(0.0025).toVar();
    const crest = float(0).toVar();

    for (const [tile, rotation, sigma] of layers) {
      const c = Math.cos(rotation), s = Math.sin(rotation);
      const speed = 1.05 * Math.sqrt(tile / 9) / tile;
      const waveUV = vec2(
        p.x.mul(c).sub(p.y.mul(s)),
        p.x.mul(s).add(p.y.mul(c))
      ).div(tile).add(vec2(Math.cos(0.3) * speed, Math.sin(0.3) * speed).mul(time));
      const sample = texture(waveTexture, waveUV);
      const amplitude = energy.mul(sigma);
      slope.addAssign(vec2(
        sample.x.mul(c).add(sample.y.mul(s)),
        sample.y.mul(c).sub(sample.x.mul(s))
      ).mul(amplitude));
      variance.addAssign(max(sample.z.sub(dot(sample.xy, sample.xy)), 0).mul(amplitude.mul(amplitude)));
      crest.addAssign(sample.w.mul(sigma));
    }
    return vec4(slope, variance, crest.mul(4));
  })();

  const swell = longSwell(positionWorld.xz);
  const slope = windWaves.xy.add(swell.yz);
  const waterNormal = normalize(vec3(slope.x.negate(), 1, slope.y.negate()));
  material.normalNode = cameraViewMatrix.transformDirection(waterNormal);

  // Unresolved wave slopes become GGX roughness: crisp nearby chop, softer glitter towards the far shore.
  material.roughnessNode = clamp(pow(windWaves.z, 0.25).mul(0.88), 0.10, 0.54);
  const viewDirection = normalize(cameraPosition.sub(positionWorld));
  const fresnel = pow(float(1).sub(clamp(dot(waterNormal, viewDirection), 0, 1)), 5).mul(0.98).add(0.02);
  material.metalnessNode = clamp(fresnel.mul(1.55), 0, 0.86);

  material.colorNode = Fn(() => {
    const silt = harbourNoise(positionWorld.xz.mul(0.0028).add(7.3));
    const body = mix(color(0x123b42), color(0x315b57), smoothstep(0.20, 0.86, silt));
    const crestTint = smoothstep(0.45, 1.9, windWaves.w.add(swell.x.mul(2))).mul(0.26).add(1);
    return body.mul(crestTint);
  })();

  material.userData.harbourWater = {
    spectrum: '4 FFT wind-sea scales + 3 displaced deep-water swells',
    wavelengths: SWELLS.map((wave) => wave[0]),
    maximumLongSwellDisplacement: SWELLS.reduce((sum, wave) => sum + wave[1], 0),
    meanDisplacement: 0
  };
  return material;
}

export function createHongKongHarbourWaterGeometry(size = 16000, segments = 384) {
  // ~42 m vertices resolve the 128 m shortest displaced swell; all shorter waves live in the normal/roughness field.
  return new THREE.PlaneGeometry(size, size, segments, segments);
}
