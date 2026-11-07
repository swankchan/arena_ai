// Aberdeen Tunnel: OSM ways 23298496 and 155997128 (runtime signatures below), not a surveyed engineering model.
// Inside the hill only: the generic road profiles and terrain portal cuts remain authoritative at both ends.
import * as THREE from 'three/webgpu';
import { HK_FULL_ROADS } from './building-priority-roads.js';
import { roadRibbonHeightAtVertex } from './road-elevation.js';
import { hongKongTerrainHeight } from './terrain.js';
import { segmentWall } from './colliders.js';

const SOURCES = [
  { start: [2011.9, 3164.2], end: [2142.6, 1257.1] },
  { start: [2167.8, 1251.3], end: [2047.9, 3184.7] },
];
const near = (a, b) => Math.abs(a - b) < .11;
function findWay({ start, end }) {
  const matches = HK_FULL_ROADS.roads.map((r, id) => ({ r, id })).filter(({ r }) => {
    const f = r[5]; return r[0] === '香港仔隧道' && (r[4] & 4) && f.length >= 4
      && near(f[0], start[0]) && near(f[1], start[1]) && near(f.at(-2), end[0]) && near(f.at(-1), end[1]);
  });
  if (matches.length !== 1) throw new Error('Aberdeen Tunnel source road signature is missing or ambiguous');
  return matches[0];
}
// Short profile stations are used for terrain clearance, lighting and wall colliders. The source interpolation is
// the same roadRibbonHeightAtVertex interpolation as the generic drivable tunnel.
export function aberdeenTunnelSections() {
  const sections = [];
  for (const source of SOURCES) {
    const { id, r } = findWay(source), f = r[5], width = r[1]; let distance = 0;
    for (let i = 0; i + 3 < f.length; i += 2) {
      const ax = f[i], az = f[i + 1], bx = f[i + 2], bz = f[i + 3], dx = bx - ax, dz = bz - az;
      const length = Math.hypot(dx, dz); if (length < .01) continue;
      const count = Math.ceil(length / 8), ux = dx / length, uz = dz / length, nx = uz, nz = -ux;
      const y0 = roadRibbonHeightAtVertex(id, i / 2), y1 = roadRibbonHeightAtVertex(id, i / 2 + 1);
      const at = (t) => ({ x: ax + dx * t, z: az + dz * t, y: y0 + (y1 - y0) * t });
      for (let j = 0; j < count; j++) {
        const a = at(j / count), b = at((j + 1) / count), mid = at((j + .5) / count);
        // All three stations at both shoulders must be safely below terrain. No false shell through the portals.
        const covered = [a, mid, b].every(p => [-1, 0, 1].every(side =>
          hongKongTerrainHeight(p.x + side * nx * (width * .5 + .3), p.z + side * nz * (width * .5 + .3)) - p.y >= 6.15));
        if (covered) sections.push({ id, a, b, width, nx, nz, distance: distance + length * (j + .5) / count });
      }
      distance += length;
    }
  }
  return sections;
}
function quad(out, a, b, c, d) { out.push(...a, ...b, ...c, ...a, ...c, ...d); }
function mesh(group, positions, material, name, normals = null) {
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  else geometry.computeVertexNormals();
  geometry.computeBoundingSphere(); const result = new THREE.Mesh(geometry, material);
  result.name = name; group.add(result);
}
export function buildAberdeenTunnel(root) {
  const group = new THREE.Group(); group.name = 'AberdeenTunnelInterior'; const walls = [], wallJoints = [], skirting = [], arch = [], archNormals = [], lights = [], colliders = [], sites = [];
  const sections = aberdeenTunnelSections();
  for (const s of sections) {
    const { a, b, nx, nz, width } = s, half = width * .5 + .35;
    const point = (p, offset, h) => [p.x + nx * offset, p.y + h, p.z + nz * offset];
    for (const side of [-1, 1]) {
      const o = side * half;
      quad(walls, point(a, o, .05), point(b, o, .05), point(b, o, 3.55), point(a, o, 3.55));
      // Recessed-looking tile joints and the dark service kerb in the interior photo. These are deliberately
      // shallow, not posts or colliders: they must not narrow either lane.
      const face = o - side * .018;
      quad(skirting, point(a, face, .05), point(b, face, .05), point(b, face, .42), point(a, face, .42));
      for (const h of [1.55, 3.0]) quad(wallJoints, point(a, face, h), point(b, face, h), point(b, face, h + .015), point(a, face, h + .015));
      const length = Math.hypot(b.x-a.x,b.z-a.z), count = Math.max(1, Math.ceil(length / 1.6));
      for (let n = 0; n < count; n++) {
        const t = n/count, u = Math.min(1, t + .015 / Math.max(length, .01));
        const lerp = f => ({ x: a.x + (b.x-a.x)*f, y: a.y + (b.y-a.y)*f, z: a.z + (b.z-a.z)*f });
        const p = lerp(t), q = lerp(u);
        quad(wallJoints, point(p, face, .42), point(q, face, .42), point(q, face, 3.55), point(p, face, 3.55));
      }
      const wall = segmentWall(a.x + nx * o, a.z + nz * o, b.x + nx * o, b.z + nz * o,
        { thickness: .12, base: Math.min(a.y, b.y) - .1, top: Math.max(a.y, b.y) + 3.55 });
      if (wall) colliders.push(wall);
    }
    // Shallow segmental vaulted crown; colours follow the northbound interior photograph, not surveyed tiles.
    for (let k = 0; k < 12; k++) {
      const t0 = k / 12 * Math.PI, t1 = (k + 1) / 12 * Math.PI;
      const o0 = Math.cos(t0) * half, o1 = Math.cos(t1) * half;
      const h0 = 3.55 + Math.sin(t0) * 2.0, h1 = 3.55 + Math.sin(t1) * 2.0;
      quad(arch, point(a, o0, h0), point(b, o0, h0), point(b, o1, h1), point(a, o1, h1));
      // Smooth elliptical crown normals; separate faces create conspicuous longitudinal bands under lights.
      const normal = t => { const x = Math.cos(t) / half, y = Math.sin(t) / 2, m = Math.hypot(x, y); return [-nx*x/m, -y/m, -nz*x/m]; };
      const n0 = normal(t0), n1 = normal(t1);
      archNormals.push(...n0, ...n0, ...n1, ...n0, ...n1, ...n1);
    }
    quad(lights, point(a, -.12, 5.50), point(b, -.12, 5.50), point(b, .12, 5.50), point(a, .12, 5.50));
    if (Math.floor(s.distance / 24) !== Math.floor((s.distance - Math.hypot(b.x - a.x, b.z - a.z)) / 24)) {
      sites.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 4.7, z: (a.z + b.z) / 2 });
    }
  }
  // Consecutive source segments can change heading at the shared centreline vertex. Their
  // independently offset walls and vaults otherwise leave visible wedges (up to half a metre).
  // Join only genuinely adjacent covered sections: never bridge an uncovered portal interval.
  for (let i = 1; i < sections.length; i++) {
    const previous = sections[i - 1], next = sections[i];
    const a = previous.b, b = next.a;
    if (previous.id !== next.id || Math.hypot(a.x - b.x, a.z - b.z, a.y - b.y) > 1e-5) continue;
    if (Math.hypot(previous.nx - next.nx, previous.nz - next.nz) < 1e-6) continue;
    const half = previous.width * .5 + .35;
    const point = (p, s, offset, height) => [p.x + s.nx * offset, p.y + height, p.z + s.nz * offset];
    for (const side of [-1, 1]) {
      const o = side * half, face = o - side * .018;
      const pa = (offset, h) => point(a, previous, offset, h);
      const pb = (offset, h) => point(b, next, offset, h);
      const gap = Math.hypot(pa(o, 0)[0] - pb(o, 0)[0], pa(o, 0)[2] - pb(o, 0)[2]);
      if (gap < 1e-5) continue;
      quad(walls, pa(o, .05), pb(o, .05), pb(o, 3.55), pa(o, 3.55));
      quad(skirting, pa(face, .05), pb(face, .05), pb(face, .42), pa(face, .42));
      for (const h of [1.55, 3.0]) quad(wallJoints, pa(face, h), pb(face, h), pb(face, h + .015), pa(face, h + .015));
      const wall = segmentWall(pa(o, 0)[0], pa(o, 0)[2], pb(o, 0)[0], pb(o, 0)[2],
        { thickness: .12, base: a.y - .1, top: a.y + 3.55 });
      if (wall) colliders.push(wall);
    }
    for (let k = 0; k < 12; k++) {
      const t0 = k * Math.PI / 12, t1 = (k + 1) * Math.PI / 12;
      const o0 = Math.cos(t0) * half, o1 = Math.cos(t1) * half;
      const h0 = 3.55 + Math.sin(t0) * 2, h1 = 3.55 + Math.sin(t1) * 2;
      quad(arch, point(a, previous, o0, h0), point(b, next, o0, h0), point(b, next, o1, h1), point(a, previous, o1, h1));
      const normal = (section, t) => { const x = Math.cos(t) / half, y = Math.sin(t) / 2, m = Math.hypot(x, y); return [-section.nx*x/m, -y/m, -section.nz*x/m]; };
      const a0 = normal(previous,t0), b0 = normal(next,t0), b1 = normal(next,t1), a1 = normal(previous,t1);
      archNormals.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
    }
  }
  mesh(group, walls, new THREE.MeshStandardMaterial({ color: 0x9f9c8d, roughness: .8, side: THREE.DoubleSide }), 'Aberdeen Tunnel pale wall lining');
  mesh(group, skirting, new THREE.MeshStandardMaterial({ color: 0x454a47, roughness: .86, side: THREE.DoubleSide }), 'Aberdeen Tunnel dark lower wall skirting');
  mesh(group, wallJoints, new THREE.MeshStandardMaterial({ color: 0x88877c, roughness: .84, side: THREE.DoubleSide }), 'Aberdeen Tunnel wall panel joints');
  mesh(group, arch, new THREE.MeshStandardMaterial({ color: 0x4b4c48, roughness: .84, side: THREE.DoubleSide }), 'Aberdeen Tunnel dark vaulted ceiling', archNormals);
  mesh(group, lights, new THREE.MeshBasicMaterial({ color: 0xe4f0eb, side: THREE.DoubleSide, toneMapped: false }), 'Aberdeen Tunnel continuous central light strip');
  const pool = Array.from({ length: 12 }, () => { const light = new THREE.PointLight(0xe4f1eb, 0, 38, 1.4); group.add(light); return light; });
  root.add(group);
  function update(cameraSystem) {
    const p = cameraSystem?.camera?.position; if (!p) return;
    const nearest = sites.map(s => ({ s, d: (s.x-p.x)**2 + (s.y-p.y)**2 + (s.z-p.z)**2 })).filter(x => x.d < 180**2).sort((a,b) => a.d-b.d);
    pool.forEach((light, i) => { const s = nearest[i]?.s; light.intensity = s ? 50 : 0; if (s) light.position.set(s.x, s.y, s.z); });
  }
  return { group, colliders, update, stats: { aberdeenTunnelSections: sections.length, aberdeenTunnelLightSites: sites.length } };
}
