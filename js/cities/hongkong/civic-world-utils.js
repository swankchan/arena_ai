// Small renderer helpers for source-aligned civic elevations.  Facade u follows the source edge,
// y is up and positive offset points out of the building; no photographic textures are used.
import * as THREE from 'three/webgpu';
import { box, merged, roofGeometry } from './harbour-city-world-utils.js';
import { harbourCityEdgeOutward } from './harbour-city-architecture.js';

export function civicChainFrame(site, edges) {
  if (!edges.length) throw new Error('A civic facade chain needs an edge');
  const first = edges[0] * 2, last = edges[edges.length - 1] * 2 + 2;
  const ax = site.localRing[first], az = site.localRing[first + 1];
  const bx = site.localRing[last], bz = site.localRing[last + 1];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
  const outward = harbourCityEdgeOutward(site.localRing, edges[0]);
  return { x: (ax + bx) * .5, z: (az + bz) * .5, length, ry: Math.atan2(-dz, dx), nx: outward.nx, nz: outward.nz, edges };
}
export function civicFramePoint(frame, u, y = 0, offset = 0) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return [frame.x + cs * u + sn * offset, y, frame.z - sn * u + cs * offset];
}
export function civicFrameBox(parts, frame, u, y, offset, width, height, depth) {
  return box(parts, civicFramePoint(frame, u, y, offset), [width, height, depth], frame.ry);
}
export function civicFrameGroup(site, frame, name) {
  const group = new THREE.Group(); group.name = name; group.position.set(frame.x, 0, frame.z); group.rotation.y = frame.ry; site?.localRing; return group;
}
export function civicRingWallsGeometry(ring, bottom, top) {
  const positions = [];
  for (let i = 0; i < ring.length - 2; i += 2) {
    const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    positions.push(ax, bottom, az, bx, bottom, bz, bx, top, bz, ax, bottom, az, bx, top, bz, ax, top, az);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}
export function civicRingPrism(group, ring, bottom, top, wallMaterial, roofMaterial, name) {
  const walls = new THREE.Mesh(civicRingWallsGeometry(ring, bottom, top), wallMaterial); walls.name = `${name} exact source-ring walls`; walls.castShadow = true; walls.receiveShadow = true; group.add(walls);
  const roof = new THREE.Mesh(roofGeometry(ring, top), roofMaterial); roof.name = `${name} source-ring roof`; roof.castShadow = true; roof.receiveShadow = true; group.add(roof);
  return { walls, roof };
}
export function civicFacadeGrid(parts, frame, {
  rows = 1, bayWidth = 3, y0 = 0, floorHeight = 4, panelHeight = null, offset = .08,
  glass = parts.glass, frames = parts.frames, stone = parts.stone, margin = .22,
  mullion = .11, horizontal = .14, panelDepth = .09, solid = false,
} = {}) {
  const bays = Math.max(1, Math.round(frame.length / bayWidth)), bay = frame.length / bays;
  const height = panelHeight ?? floorHeight - .65;
  for (let row = 0; row < rows; row += 1) {
    const y = y0 + row * floorHeight + floorHeight * .5;
    for (let b = 0; b < bays; b += 1) {
      const u = -frame.length * .5 + (b + .5) * bay;
      if (!solid) civicFrameBox(glass, frame, u, y, offset, Math.max(.12, bay - margin * 2), height, panelDepth);
      else civicFrameBox(stone, frame, u, y, offset, Math.max(.12, bay - margin * 2), height, panelDepth);
    }
    civicFrameBox(frames, frame, 0, y0 + row * floorHeight, offset + .035, frame.length, horizontal, .15);
    for (let b = 0; b <= bays; b += 1) {
      const u = -frame.length * .5 + b * bay;
      civicFrameBox(frames, frame, u, y, offset + .04, mullion, height + .25, .16);
    }
  }
  civicFrameBox(frames, frame, 0, y0 + rows * floorHeight, offset + .035, frame.length, horizontal, .15);
  return { bays, rows };
}
export function civicDisposeParts(parts) {
  for (const value of Object.values(parts)) if (Array.isArray(value)) for (const geometry of value) geometry.dispose();
}
export { box, merged, roofGeometry };
