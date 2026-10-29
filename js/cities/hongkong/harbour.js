import * as THREE from 'three/webgpu';
import { GEO } from '../../hk-geodata.js';

// Harbour life: the Star Ferry across Victoria Harbour, Hong Kong's double-decker trams, and a red-sailed junk.
// Each vehicle is a small hand-built model; the routes come from the real road and harbour geography.

const hash = (n) => {
  const v = Math.sin(n * 12.9898 + 7.13) * 43758.5453;
  return v - Math.floor(v);
};

function roadPath(name) {
  let best = null, bestLength = 0;
  for (const road of GEO.roads) {
    if (road[0] !== name) continue;
    const flat = road[5];
    let length = 0;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      length += Math.hypot(flat[i] - flat[i - 2], flat[i + 1] - flat[i - 1]);
    }
    if (length > bestLength) { bestLength = length; best = flat; }
  }
  if (!best) return null;
  const points = [];
  for (let i = 0; i + 1 < best.length; i += 2) points.push([best[i], best[i + 1]]);
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return { points, distances, length: distances[distances.length - 1] };
}

function sample(path, s) {
  const { points, distances } = path;
  s = Math.max(0, Math.min(distances[distances.length - 1], s));
  let i = 1;
  while (i < distances.length - 1 && distances[i] < s) i++;
  const t = (s - distances[i - 1]) / Math.max(1e-6, distances[i] - distances[i - 1]);
  const ax = points[i - 1][0], az = points[i - 1][1];
  const bx = points[i][0], bz = points[i][1];
  const dx = bx - ax, dz = bz - az;
  return {
    x: ax + dx * t, z: az + dz * t,
    heading: Math.atan2(dx, dz)
  };
}

function box(w, h, d, color, x, y, z, material = null) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material || new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createTram() {
  const group = new THREE.Group();
  group.name = 'HongKongTram';
  const green = new THREE.MeshStandardMaterial({ color: 0x1f6b4a, roughness: 0.42, metalness: 0.16 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe6ddc4, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101a1d, roughness: 0.2, metalness: 0.35 });
  group.add(box(2.2, 2.0, 11.6, 0, 0, 1.0, 0, green));
  group.add(box(2.24, 1.7, 10.4, 0, 0, 3.0, 0, green));
  group.add(box(2.06, 0.22, 11.9, 0, 0, 3.96, 0, cream));
  // Window bands on both decks.
  for (const side of [-1, 1]) {
    group.add(box(0.04, 0.72, 9.8, 0, side * 1.112, 1.15, 0, dark));
    group.add(box(0.04, 0.82, 9.4, 0, side * 1.132, 3.06, 0, dark));
  }
  // Front and rear glass.
  group.add(box(1.95, 0.8, 0.04, 0, 0, 3.05, 5.2, dark));
  group.add(box(1.95, 0.8, 0.04, 0, 0, 3.05, -5.2, dark));
  group.add(box(2.3, 0.1, 0.9, 0, 0, 4.12, 5.1, cream));
  const light = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.22, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd37a, emissiveIntensity: 1.6 })
  );
  light.position.set(0, 0.55, 5.84);
  group.add(light);
  return group;
}

function createFerry() {
  const group = new THREE.Group();
  group.name = 'StarFerry';
  const green = new THREE.MeshStandardMaterial({ color: 0x1f6f4f, roughness: 0.45, metalness: 0.1 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe7e3d4, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101c22, roughness: 0.22, metalness: 0.3 });
  group.add(box(9.4, 1.2, 23.0, 0, 0, 0.6, 0, green));
  group.add(box(9.0, 1.7, 19.0, 0, 0, 2.05, 0, white));
  group.add(box(9.2, 0.22, 20.4, 0, 0, 2.98, 0, green));
  group.add(box(7.6, 1.42, 12.2, 0, 0, 3.78, 0, white));
  group.add(box(7.8, 0.24, 13.0, 0, 0, 4.56, 0, green));
  // Window strips and wheelhouse.
  for (const side of [-1, 1]) {
    group.add(box(0.05, 0.76, 16.5, 0, side * 4.52, 2.18, 0, dark));
    group.add(box(0.05, 0.66, 10.4, 0, side * 3.82, 3.76, 0, dark));
  }
  group.add(box(3.0, 2.0, 4.2, 0, 0, 5.6, 2.6, white));
  group.add(box(2.7, 0.9, 3.4, 0, 0, 6.02, 2.7, dark));
  group.add(box(0.18, 4.2, 0.18, 0, 0, 7.8, 2.4, green));
  const light = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.35, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xffe3a2, emissiveIntensity: 1.4 })
  );
  light.position.set(0, 6.2, 5.1);
  group.add(light);
  return group;
}

function createJunk() {
  const group = new THREE.Group();
  group.name = 'RedSailedJunk';
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.82 });
  const red = new THREE.MeshStandardMaterial({
    color: 0x8f1712, roughness: 0.68, metalness: 0.02, side: THREE.DoubleSide,
    emissive: 0x2a0603, emissiveIntensity: 0.25
  });
  group.add(box(6.4, 1.1, 19, 0, 0, 0.65, 0, wood));
  group.add(box(5.2, 0.7, 11, 0, 0, 1.35, -1.5, wood));
  group.add(box(2.4, 1.3, 3.8, 0, 0, 2.2, -5.4, wood));
  const sailGeometry = new THREE.BufferGeometry();
  sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 0, 8.5, 0, 4.6, 1.1, 0,
    0, 0, 0, 0, 8.0, 0, -4.2, 1.4, 0
  ], 3));
  sailGeometry.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeometry, red);
  sail.position.set(0, 2.5, 3.0);
  sail.castShadow = true;
  group.add(sail);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 11, 6),
    new THREE.MeshStandardMaterial({ color: 0x332015, roughness: 0.85 })
  );
  mast.position.set(0, 6.2, 3.0);
  mast.castShadow = true;
  group.add(mast);
  return group;
}

export function createHongKongHarbour(scene) {
  const group = new THREE.Group();
  group.name = 'HongKongHarbour';
  scene.add(group);

  // Trams on Des Voeux Road Central and Hennessy Road.
  const tramRoutes = [roadPath('德輔道中'), roadPath('軒尼詩道')].filter(Boolean);
  const trams = [];
  tramRoutes.forEach((route, index) => {
    for (let i = 0; i < 2; i++) {
      const mesh = createTram();
      group.add(mesh);
      trams.push({
        mesh, route,
        s: route.length * (0.2 + i * 0.46),
        dir: i % 2 === 0 ? 1 : -1,
        speed: 4.2 + hash(index * 3 + i) * 0.7
      });
    }
  });

  // Star Ferry: a gentle curved crossing between Central and Tsim Sha Tsui.
  const ferryRoute = {
    a: [275, -455], b: [875, -1255], control: [330, -1050]
  };
  const ferryLength = 1280;
  const ferries = [];
  for (let i = 0; i < 2; i++) {
    const mesh = createFerry();
    group.add(mesh);
    ferries.push({ mesh, t: 0.12 + i * 0.5, dir: i === 0 ? 1 : -1, speed: 8.8 });
  }

  const junk = createJunk();
  group.add(junk);

  const ferryPoint = (t) => {
    const a = ferryRoute.a, b = ferryRoute.b, c = ferryRoute.control;
    const u = 1 - t;
    return [
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]
    ];
  };

  function update(dt, elapsed) {
    for (const tram of trams) {
      tram.s += tram.speed * tram.dir * dt;
      if (tram.s > tram.route.length) { tram.s = tram.route.length; tram.dir = -1; }
      if (tram.s < 0) { tram.s = 0; tram.dir = 1; }
      const p = sample(tram.route, tram.s);
      tram.mesh.position.set(p.x, 0.18, p.z);
      tram.mesh.rotation.y = p.heading + (tram.dir < 0 ? Math.PI : 0);
    }

    for (const ferry of ferries) {
      ferry.t += (ferry.speed / ferryLength) * ferry.dir * dt;
      if (ferry.t > 1) { ferry.t = 1; ferry.dir = -1; }
      if (ferry.t < 0) { ferry.t = 0; ferry.dir = 1; }
      const t = ferry.t;
      const p = ferryPoint(t);
      const ahead = ferryPoint(Math.min(1, t + 0.002));
      const behind = ferryPoint(Math.max(0, t - 0.002));
      const dx = ahead[0] - behind[0], dz = ahead[1] - behind[1];
      ferry.mesh.position.set(p[0], -2.5, p[1]);
      ferry.mesh.rotation.y = Math.atan2(dx, dz) + (ferry.dir < 0 ? Math.PI : 0);
      ferry.mesh.rotation.z = Math.sin(elapsed * 0.7 + ferry.t * 5) * 0.018;
    }

    const angle = elapsed * 0.028;
    const radius = 185;
    const cx = 510 + Math.cos(angle) * radius;
    const cz = -1110 + Math.sin(angle) * radius * 0.6;
    const aheadX = 510 + Math.cos(angle + 0.02) * radius;
    const aheadZ = -1110 + Math.sin(angle + 0.02) * radius * 0.6;
    junk.position.set(cx, -2.65, cz);
    junk.rotation.y = Math.atan2(aheadX - cx, aheadZ - cz);
    junk.rotation.z = Math.sin(elapsed * 0.5) * 0.02;
  }

  return { group, trams, ferries, junk, update };
}
