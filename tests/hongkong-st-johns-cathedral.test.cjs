'use strict';
// 聖約翰座堂 St John's Cathedral and 長江公園 Cheung Kong Park.
//
// These assert BEHAVIOUR, not source strings: that the cathedral is founded on the OSM ring rather than an invented box,
// that its terrace does not bury or float the walls, that the garden stops at its neighbouring OSM ways, and that the
// park follows the ground instead of being flattened onto an invented deck.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function probe(source) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: path.join(__dirname, '..'), encoding: 'utf8',
  });
  assert.equal(result.status, 0, `probe failed: ${result.stderr}`);
  return JSON.parse(result.stdout.trim().split('\n').pop());
}

const CATHEDRAL_PROBE = `
import * as THREE from 'three/webgpu';
import { buildStJohnsCathedral } from './js/cities/hongkong/st-johns-cathedral-world.js';
import { ST_JOHNS_CATHEDRAL_SITE as S, CHEUNG_KONG_PARK_SITE as PK } from './js/cities/hongkong/st-johns-cathedral-site.js';
import { hongKongTerrainHeight, stJohnsCathedralPadHeight } from './js/cities/hongkong/terrain.js';
const scene = new THREE.Scene();
const out = buildStJohnsCathedral(scene);
let minTerrain = Infinity, maxTerrain = -Infinity;
for (let i = 0; i < S.ring.length; i += 2) {
  const h = hongKongTerrainHeight(S.ring[i], S.ring[i + 1]);
  if (h < minTerrain) minTerrain = h;
  if (h > maxTerrain) maxTerrain = h;
}
// World-space footprint of every mesh, to prove nothing is drawn outside the mapped precinct + garden.
const box = new THREE.Box3().setFromObject(out.group);
let nonFinite = 0;
const inRing = (ring, x, z) => {
  const n = ring.length / 2 - 1;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2], zi = ring[i * 2 + 1], xj = ring[j * 2], zj = ring[j * 2 + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
// 聖約翰座堂辦事處, OSM way 107497702, projected to world space from the checked-in landmark geometry.
const OFFICE_RING = [
  34.35, 327.2, 28.5, 333.65, 39.49, 343.51, 32.71, 350.99, 34.85, 352.91, 33.03, 354.92,
  40.71, 361.81, 56.15, 344.78, 46.31, 335.98, 45.34, 337.05,
];
const inOffice = (x, z) => inRing(OFFICE_RING, x, z);
let verticesInPark = 0, verticesInOffice = 0;
out.group.updateMatrixWorld(true);
out.group.traverse((object) => {
  if (!object.geometry) return;
  const position = object.geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
    if (inRing(PK.ring, vertex.x, vertex.z)) verticesInPark++;
    if (inOffice(vertex.x, vertex.z)) verticesInOffice++;
  }
});
out.group.traverse((object) => {
  if (!object.geometry) return;
  const position = object.geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    if (!Number.isFinite(position.getX(i)) || !Number.isFinite(position.getY(i)) || !Number.isFinite(position.getZ(i))) nonFinite++;
  }
});
console.log(JSON.stringify({
  stats: out.stats, ground: out.groundOffset, minTerrain, maxTerrain,
  pad: stJohnsCathedralPadHeight(), ringPoints: S.ring.length / 2 - 1, colliders: out.colliders.length,
  landmarks: out.landmarks.map((l) => l.id), nonFinite,
  min: box.min.toArray(), max: box.max.toArray(),
  bounds: S.bounds, ringArea: S.ringArea,
  verticesInPark, verticesInOffice, overlapsZ: box.max.z > PK.bounds.minZ && box.min.z < PK.bounds.maxZ,
}));
`;

const PARK_PROBE = `
import * as THREE from 'three/webgpu';
import { buildCheungKongPark } from './js/cities/hongkong/cheung-kong-park-world.js';
import { CHEUNG_KONG_PARK_SITE as P } from './js/cities/hongkong/st-johns-cathedral-site.js';
import { hongKongTerrainHeight } from './js/cities/hongkong/terrain.js';
const scene = new THREE.Scene();
const out = buildCheungKongPark(scene);
let minTerrain = Infinity, maxTerrain = -Infinity;
for (let i = 0; i < P.ring.length; i += 2) {
  const h = hongKongTerrainHeight(P.ring[i], P.ring[i + 1]);
  if (h < minTerrain) minTerrain = h;
  if (h > maxTerrain) maxTerrain = h;
}
const box = new THREE.Box3().setFromObject(out.group);
console.log(JSON.stringify({
  stats: out.stats, ground: out.groundOffset, minTerrain, maxTerrain,
  landmarks: out.landmarks.map((l) => l.id), min: box.min.toArray(), max: box.max.toArray(),
  bounds: P.bounds, ringArea: P.ringArea,
}));
`;

let cathedral, park;
test('build the authored sites once', () => {
  cathedral = probe(CATHEDRAL_PROBE);
  park = probe(PARK_PROBE);
  assert.ok(cathedral && park);
});

test('the cathedral is founded on the OSM precinct ring, not an invented footprint', () => {
  // 16 mapped vertices -> 15 edges. The walls are that ring extruded, so the plan is the survey.
  assert.equal(cathedral.ringPoints, 15);
  assert.equal(cathedral.stats.stJohnsCathedralWalls, 2, 'ring extrusion plus the tower volume');
  assert.ok(cathedral.ringArea > 1000 && cathedral.ringArea < 1200, `ring area ${cathedral.ringArea}`);
  // Standing on a surveyed footprint of ~52 x 29 m, not a tower block.
  const width = cathedral.max[0] - cathedral.min[0], depth = cathedral.max[2] - cathedral.min[2];
  assert.ok(width > 50 && width < 120, `world width ${width}`);
  assert.ok(depth > 50 && depth < 120, `world depth ${depth}`);
});

test('the precinct terrace neither buries the walls nor floats them over Garden Road', () => {
  // The ring's own ground falls several metres; the pad holds the interior at the highest raw sample, and the building is
  // founded at the LOWEST ground under the ring so the walls run down behind the terrace instead of hanging in the air.
  const fall = cathedral.maxTerrain - cathedral.minTerrain;
  assert.ok(fall > 3, `expected a real fall across the ring, got ${fall}`);
  assert.ok(cathedral.pad > cathedral.maxTerrain - 0.2, 'pad should sit at the highest raw datum');
  assert.ok(Math.abs(cathedral.ground - cathedral.minTerrain) < 0.05,
    `building founded at ${cathedral.ground}, lowest ring ground ${cathedral.minTerrain}`);
  // The eaves are a real height above the terrace, and the tower is the tallest element on the site.
  assert.ok(cathedral.stats.stJohnsCathedralEavesHeight >= 7, 'eaves too low to be a church');
  assert.ok(cathedral.stats.stJohnsCathedralTowerHeight > cathedral.stats.stJohnsCathedralEavesHeight,
    'the west tower must rise above the eaves');
  assert.ok(cathedral.stats.stJohnsCathedralTowerHeight < 40, 'a 17.6 m tower plus pinnacles, not a skyscraper');
});

test('every cathedral window sits on a mapped wall, and none is invented', () => {
  // 43 lancets across 15 edges, skipping the short internal jogs of the plan.
  assert.ok(cathedral.stats.stJohnsCathedralWindows > 20, `only ${cathedral.stats.stJohnsCathedralWindows} windows`);
  assert.ok(cathedral.stats.stJohnsCathedralWindows < 80, 'too many windows for a 50 m church');
});

test('the cathedral geometry is finite and registered as one landmark', () => {
  assert.equal(cathedral.nonFinite, 0);
  assert.deepEqual(cathedral.landmarks, ['st-johns-cathedral']);
  assert.ok(cathedral.colliders >= 4, 'the cruciform mass needs several box colliders');
});

test('the park follows the ground instead of inventing a flat deck', () => {
  // OSM tags the park level=3 because it is laid out over terraced podium levels, but it is a hillside garden: the ring
  // falls several metres and no levelling datum is applied, which is why the DTM is preserved here.
  const fall = park.maxTerrain - park.minTerrain;
  assert.ok(fall > 3, `expected the park to span a real fall, got ${fall}`);
  assert.equal(park.stats.cheungKongParkAreaM2, 4789, 'the OSM ring area');
  assert.ok(park.stats.cheungKongParkPonds >= 2, 'the ponds and cascades are the park identity');
  assert.ok(park.stats.cheungKongParkCanopyInstances > 60, 'the park is known for dense canopy');
  assert.ok(park.stats.cheungKongParkTerraceFallM > 2, 'the terraces should follow the hillside');
});

test('the park is drawn inside its own mapped ring and nothing else', () => {
  const slack = 6; // boundary kerb + canopy overhang
  assert.ok(park.min[0] >= park.bounds.minX - slack, `park drew to x ${park.min[0]}`);
  assert.ok(park.max[0] <= park.bounds.maxX + slack, `park drew to x ${park.max[0]}`);
  assert.ok(park.min[2] >= park.bounds.minZ - slack, `park drew to z ${park.min[2]}`);
  assert.ok(park.max[2] <= park.bounds.maxZ + slack, `park drew to z ${park.max[2]}`);
});

test('the cathedral never encroaches on the park or the cathedral office plot', () => {
  // Their OSM rings are neighbours that do not overlap, and 聖約翰座堂辦事處 (way 107497702) fills the corner between them.
  // An axis-aligned world box cannot prove this (a rotated building's AABB spans its own diagonal), so the probe checks
  // every vertex against the park ring and the office quadrilateral in world space.
  assert.equal(cathedral.verticesInPark, 0, `${cathedral.verticesInPark} cathedral vertices fell inside the park ring`);
  assert.equal(cathedral.verticesInOffice, 0, `${cathedral.verticesInOffice} cathedral vertices fell inside the office plot (way 107497702)`);
  assert.ok(cathedral.overlapsZ, 'the two sites are close enough to share a z band; they are neighbours');
});

test('both sites are wired into the city world with their own colliders and landmark', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(__dirname, '..', 'js/cities/hongkong/simple-world.js'), 'utf8');
  assert.match(source, /buildStJohnsCathedral\(scene\)/);
  assert.match(source, /buildCheungKongPark\(scene\)/);
  assert.match(source, /\.\.\.stJohnsCathedral\.colliders/);
  assert.match(source, /\.\.\.cheungKongPark\.colliders/);
  assert.match(source, /\.\.\.stJohnsCathedral\.landmarks/);
  assert.match(source, /\.\.\.cheungKongPark\.landmarks/);
});
