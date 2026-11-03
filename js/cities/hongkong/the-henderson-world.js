import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  HENDERSON_SITE, HENDERSON_OSM_SOURCE, HENDERSON_LOCAL_RING, HENDERSON_RING_AREA,
  HENDERSON_OSM_HEIGHT, HENDERSON_WSP_HEIGHT, HENDERSON_DISCOVER_HK_HEIGHT, HENDERSON_SEELE_HEIGHT,
  HENDERSON_LIGHTING_DESIGN_HEIGHT, HENDERSON_HEIGHT, HENDERSON_OSM_LEVELS, HENDERSON_ZHA_LEVELS,
  HENDERSON_UNDERGROUND_LEVELS, HENDERSON_HIP_HING_TYPICAL_FLOORS, HENDERSON_WORKPLACE_TYPICAL_FLOORS,
  HENDERSON_OFFICE_FLOORS, HENDERSON_SKY_GARDEN_FLOOR, HENDERSON_CLOUD_39_FLOOR, HENDERSON_SEELE_BANQUET_FLOORS,
  HENDERSON_ZHA_PROJECT_PERIOD, HENDERSON_HIP_HING_COMPLETION_YEAR, HENDERSON_WSP_STATUS, HENDERSON_WSP_GFA,
  HENDERSON_COLUMN_FREE_SPAN, HENDERSON_FLOOR_TO_FLOOR, HENDERSON_CLEAR_HEADROOM, HENDERSON_MEGA_COLUMNS,
  HENDERSON_CORE_SIDE, HENDERSON_FACADE_PANELS_OVER, HENDERSON_FACADE_PLIES, HENDERSON_FACADE_LAMINATIONS,
  HENDERSON_SEELE_PODIUM_FACADE_AREA, HENDERSON_SEELE_ENTRANCE_GLASS_HEIGHT, HENDERSON_CLOUD_39_FACADE_AREA,
  HENDERSON_CLOUD_39_ROOF_PANELS, HENDERSON_CLOUD_39_GLASS_FINS, HENDERSON_CLOUD_39_MAX_WIND_SUCTION,
  HENDERSON_CLOUD_39_CEILING_HEIGHT, HENDERSON_CLOUD_39_BALLROOM_SQFT, HENDERSON_CLOUD_39_FOYER_SQFT,
  HENDERSON_CLOUD_39_TERRACE_SQFT, HENDERSON_BASE_TOP, HENDERSON_MID_PLANT_BOTTOM,
  HENDERSON_SKY_GARDEN_BOTTOM, HENDERSON_SKY_GARDEN_TOP, HENDERSON_UPPER_GLASS_TOP,
  HENDERSON_CLOUD_39_BOTTOM, HENDERSON_CLOUD_39_ROOF_BASE, HENDERSON_OFFICE_COURSES,
  HENDERSON_TARGET_PANEL_WIDTH, HENDERSON_PLAZA_TOP, HENDERSON_MAIN_ENTRANCE, HENDERSON_UPPER_ENTRANCE,
  HENDERSON_UPPER_LOBBY_GROUND, HENDERSON_MAIN_FORECOURT_WIDTH, HENDERSON_MAIN_FORECOURT_DEPTH,
  hendersonEdgeOutward, hendersonRingColliders, hendersonLocalCollider, hendersonFrameCollider,
  hendersonGroundHeightAt
} from './the-henderson-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const nightAmount = () => smoothstep(.55, 1.4, cityUniforms.uInteriorGlow);
const store = () => ({ positions: [], colors: [], lit: [] });
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function hash(a, b, c, d = 0) { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return v - Math.floor(v); }
function quad(s, a, b, c, d, tint, lit = 0) { for (const p of [a, b, c, a, c, d]) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); } }
function triangle(s, a, b, c, tint, lit = 0) { for (const p of [a, b, c]) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); } }
function geometry(s) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3)); g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null; const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null;
  // Box / cylinder details are indexed while icosahedral foliage and sculpture parts are not; normalize before merging.
  const normalized = parts.map((part) => part.index ? part.toNonIndexed() : part), geo = mergeGeometries(normalized, false);
  for (let i = 0; i < parts.length; i++) { normalized[i].dispose(); if (normalized[i] !== parts[i]) parts[i].dispose(); }
  if (!geo) throw new Error(`The Henderson could not merge ${name}`);
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) { const g = new THREE.BoxGeometry(...size); if (ry) g.rotateY(ry); g.translate(...center); parts.push(g); return g; }
function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius) { const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments); g.translate(...center); parts.push(g); return g; }
function beam(parts, a, b, width = .1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length(); if (length < .001) return;
  const g = new THREE.BoxGeometry(width, length, depth); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
function shapeGeometry(ring, y) {
  const shape = new THREE.Shape(); for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
function scaledRing(ring, scale) { const out = []; for (let i = 0; i < ring.length - 2; i += 2) out.push(ring[i] * scale, ring[i + 1] * scale); out.push(out[0], out[1]); return Object.freeze(out); }
function annulusStore(store, inner, outer, y, tint, lit = 0) {
  for (let i = 0; i < outer.length - 2; i += 2) quad(store,
    [inner[i], y, inner[i + 1]], [outer[i], y, outer[i + 1]], [outer[i + 2], y, outer[i + 3]], [inner[i + 2], y, inner[i + 3]], tint, lit);
}
function sampleRing(ring, count) {
  const lengths = [], totalRing = []; let total = 0;
  for (let i = 0; i < ring.length - 2; i += 2) { const length = Math.hypot(ring[i + 2] - ring[i], ring[i + 3] - ring[i + 1]); lengths.push(length); total += length; }
  for (let sector = 0; sector <= count; sector++) {
    let distance = total * sector / count, edge = 0; while (edge < lengths.length - 1 && distance > lengths[edge]) { distance -= lengths[edge]; edge++; }
    const i = edge * 2, t = lengths[edge] ? distance / lengths[edge] : 0;
    totalRing.push(lerp(ring[i], ring[i + 2], t), lerp(ring[i + 1], ring[i + 3], t));
  }
  return Object.freeze(totalRing);
}

// These are photo-directed petal profiles around the exact OSM site ring, not substitute surveyed upper-floor plans.
const PETAL_PROFILE = [
  [0, .86, 0], [11, .89, .008], [18, 1.055, .024], [27, 1.045, .032], [34, .94, 0],
  [42, .97, .012], [78, 1.04, .032], [101, 1, 0], [105, .95, 0], [113, .97, .01],
  [150, 1.065, .035], [174, 1.018, .022], [181.8, .93, 0]
];
function petalProfile(y) {
  const value = clamp(y, 0, 181.8); let index = 0; while (index < PETAL_PROFILE.length - 2 && value > PETAL_PROFILE[index + 1][0]) index++;
  const a = PETAL_PROFILE[index], b = PETAL_PROFILE[index + 1], t = clamp((value - a[0]) / (b[0] - a[0]), 0, 1);
  return { scale: lerp(a[1], b[1], t), amplitude: lerp(a[2], b[2], t) };
}
function petalAngle(x, z) { return Math.atan2(z / (HENDERSON_SITE.d * .5), x / (HENDERSON_SITE.w * .5)); }
function crownEave(theta) { return HENDERSON_CLOUD_39_ROOF_BASE + 6.2 * Math.pow((1 + Math.cos(3 * theta + .35)) * .5, .65); }
const ringCache = new Map();
function ringAtHeight(y) {
  const key = y.toFixed(4); if (ringCache.has(key)) return ringCache.get(key);
  const profile = petalProfile(y), out = [];
  for (let i = 0; i < HENDERSON_LOCAL_RING.length - 2; i += 2) {
    const x = HENDERSON_LOCAL_RING[i], z = HENDERSON_LOCAL_RING[i + 1], theta = petalAngle(x, z);
    const scale = profile.scale + profile.amplitude * Math.cos(3 * theta + .35);
    out.push(x * scale, z * scale);
  }
  out.push(out[0], out[1]); const ring = Object.freeze(out); ringCache.set(key, ring); return ring;
}
function towerPoint(edge, t, y, offset = 0) {
  const ring = ringAtHeight(y), i = edge * 2, { nx, nz } = hendersonEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
function seamAt(x, z) {
  const theta = petalAngle(x, z), wave = Math.abs(Math.cos(1.5 * (theta + .35 / 3)));
  return Math.pow(wave, 30);
}

function createOfficeFacade() {
  const glass = store(), backing = store(), frames = store(), spandrel = store(), fins = [];
  let glassPanels = 0, verticalJoints = 0;
  const bottom = HENDERSON_BASE_TOP, top = HENDERSON_CLOUD_39_BOTTOM;
  for (let edge = 0; edge < HENDERSON_LOCAL_RING.length / 2 - 1; edge++) {
    const length = hendersonEdgeOutward(HENDERSON_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / HENDERSON_TARGET_PANEL_WIDTH));
    for (let course = 0; course < HENDERSON_OFFICE_COURSES; course++) {
      let y0 = lerp(bottom, top, course / HENDERSON_OFFICE_COURSES), y1 = lerp(bottom, top, (course + 1) / HENDERSON_OFFICE_COURSES);
      // Leave the 22/F Sky Garden genuinely open; the running track and planting must not sit behind an unbroken glass wall.
      if (y0 < HENDERSON_SKY_GARDEN_TOP && y1 > HENDERSON_SKY_GARDEN_BOTTOM) {
        if (y0 < HENDERSON_SKY_GARDEN_BOTTOM) y1 = HENDERSON_SKY_GARDEN_BOTTOM;
        else if (y1 > HENDERSON_SKY_GARDEN_TOP) y0 = HENDERSON_SKY_GARDEN_TOP;
        else continue;
      }
      quad(spandrel, towerPoint(edge, 0, y0, .07), towerPoint(edge, 1, y0, .07), towerPoint(edge, 1, y0 + .14, .07), towerPoint(edge, 0, y0 + .14, .07), [.48, .56, .59]);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + .00065, t1 = (bay + 1) / bays - .00065, tm = (t0 + t1) * .5;
        const i = edge * 2, x = lerp(HENDERSON_LOCAL_RING[i], HENDERSON_LOCAL_RING[i + 2], tm), z = lerp(HENDERSON_LOCAL_RING[i + 1], HENDERSON_LOCAL_RING[i + 3], tm);
        const seam = seamAt(x, z), recess = seam > .4 ? -.48 * seam : 0, p = (t, y, o = 0) => towerPoint(edge, t, y, o + recess);
        const variation = hash(edge, bay, course, 28), lit = variation > .94 ? .1 + hash(course, bay, edge, 7) * .45 : 0;
        const reflection = clamp(.52 + .26 * Math.sin(petalAngle(x, z) * 2 + .8) + (variation - .5) * .12, 0, 1);
        const tint = mix([.24, .34, .38], [.58, .67, .69], reflection);
        quad(backing, p(t0, y0 + .14, -.2), p(t1, y0 + .14, -.2), p(t1, y1 - .055, -.2), p(t0, y1 - .055, -.2), [.025, .045, .055], lit * .4);
        quad(glass, p(t0, y0 + .14, .015), p(t1, y0 + .14, .015), p(t1, y1 - .055, .015), p(t0, y1 - .055, .015), mix(tint, [.035, .07, .085], seam * .75), lit); glassPanels++;
        const dt = Math.min(.0011, .022 / length);
        quad(frames, p(Math.max(0, t0 - dt), y0 + .12, .065), p(Math.min(1, t0 + dt), y0 + .12, .065), p(Math.min(1, t0 + dt), y1, .065), p(Math.max(0, t0 - dt), y1, .065), [.32, .39, .42]); verticalJoints++;
      }
    }
  }
  for (const edge of [0, 11, 20, 29, 38, 48]) for (let course = 0; course < HENDERSON_OFFICE_COURSES; course++) {
    const y0 = lerp(bottom, top, course / HENDERSON_OFFICE_COURSES), y1 = lerp(bottom, top, (course + 1) / HENDERSON_OFFICE_COURSES);
    beam(fins, towerPoint(edge, 0, y0, .19), towerPoint(edge, 0, y1, .19), .105, .16);
  }
  const colliders = [];
  for (const [y0, y1] of [[34, 74], [74, 105], [113, 150], [150, 174]]) colliders.push(...hendersonRingColliders(ringAtHeight(y0), y0, y1), ...hendersonRingColliders(ringAtHeight(y1), y0, y1));
  return { glass, backing, frames, spandrel, fins, colliders, glassPanels, verticalJoints };
}

function createElevatedBase(materials) {
  const group = new THREE.Group(); group.name = 'TheHendersonElevatedBaseAndCivicPlaza';
  const lobby = store(), lobbyFrames = [], glass = store(), backing = store(), silver = [], dark = [], columns = [], core = [], lights = [], colliders = [];
  let basePanels = 0;
  for (let edge = 0; edge < HENDERSON_LOCAL_RING.length / 2 - 1; edge++) {
    const length = hendersonEdgeOutward(HENDERSON_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / 1.8));
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + .0008, t1 = (bay + 1) / bays - .0008;
      for (const [y0, y1] of [[0, 5.5], [5.5, 11]]) quad(lobby, towerPoint(edge, t0, y0 + .05), towerPoint(edge, t1, y0 + .05), towerPoint(edge, t1, y1 - .05), towerPoint(edge, t0, y1 - .05), [.32, .49, .52], .12);
      for (const t of [t0]) beam(lobbyFrames, towerPoint(edge, t, 0, .05), towerPoint(edge, t, 11, .05), .065, .1);
    }
    for (let course = 0; course < 5; course++) {
      const y0 = lerp(11, 34, course / 5), y1 = lerp(11, 34, (course + 1) / 5);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + .0007, t1 = (bay + 1) / bays - .0007, p = (t, y, o = 0) => towerPoint(edge, t, y, o);
        const i = edge * 2, x = lerp(HENDERSON_LOCAL_RING[i], HENDERSON_LOCAL_RING[i + 2], (t0 + t1) * .5), z = lerp(HENDERSON_LOCAL_RING[i + 1], HENDERSON_LOCAL_RING[i + 3], (t0 + t1) * .5);
        const reflection = clamp(.55 + .24 * Math.sin(petalAngle(x, z) * 2 + .8) + (hash(edge, course, bay, 4) - .5) * .1, 0, 1);
        const tint = mix([.28, .38, .41], [.6, .68, .69], reflection);
        quad(backing, p(t0, y0, -.18), p(t1, y0, -.18), p(t1, y1, -.18), p(t0, y1, -.18), [.035, .055, .06], .07);
        quad(glass, p(t0, y0 + .04, .015), p(t1, y0 + .04, .015), p(t1, y1 - .04, .015), p(t0, y1 - .04, .015), tint, .18); basePanels++;
        beam(silver, p(t0, y0, .07), p(t0, y1, .07), .065, .1);
      }
      beam(silver, towerPoint(edge, 0, y0, .08), towerPoint(edge, 1, y0, .08), .07, .11);
    }
  }
  const columnVertices = [3, 11, 20, 29, 38, 48];
  for (const vertex of columnVertices) {
    const edge = vertex % 58, bottom = towerPoint(edge, 0, 0, -2.2), top = towerPoint(edge, 0, 18, -1.1);
    bottom[0] *= .84; bottom[2] *= .84; top[0] *= .94; top[2] *= .94;
    beam(columns, bottom, top, 1.05, 1.35); cylinder(silver, [bottom[0], .22, bottom[2]], .82, .44, 20);
    colliders.push(hendersonLocalCollider(bottom[0], bottom[2], 1.35, 1.55, 0, 18));
  }
  box(core, [12.2, 87, 0], [5.2, 174, 12]); colliders.push(hendersonLocalCollider(12.2, 0, 5.2, 12, 0, 174));
  for (let i = 0; i < 18; i++) { const theta = i * Math.PI * 2 / 18; cylinder(lights, [Math.cos(theta) * 10.5, 10.72, Math.sin(theta) * 13], .11, .055, 12); }
  const soffit = new THREE.Mesh(shapeGeometry(ringAtHeight(11), 10.82), materials.mirror); soffit.name = 'TheHendersonMirroredElevatedSoffit'; soffit.receiveShadow = true; group.add(soffit);
  meshStore(group, lobby, materials.lobbyGlass, 'TheHenderson11mDoubleHeightCurvedFoyerGlazing', false); merged(group, lobbyFrames, materials.silver, 'TheHendersonFoyerMullions');
  meshStore(group, backing, materials.backing, 'TheHendersonBaseRecessedGlassBacking'); meshStore(group, glass, materials.baseGlass, 'TheHendersonLowerSilverPetalCluster');
  merged(group, silver, materials.silver, 'TheHendersonBaseCurvedFramesAndColumnCollars'); merged(group, columns, materials.mirror, 'TheHendersonSixMegaColumns');
  merged(group, core, materials.dark, 'TheHendersonRecessedEasternCore'); merged(group, lights, materials.light, 'TheHendersonSoffitDownlights', false);
  colliders.push(...hendersonRingColliders(ringAtHeight(0), 0, 11), ...hendersonRingColliders(ringAtHeight(11), 11, 34), ...hendersonRingColliders(ringAtHeight(34), 11, 34));
  return { group, colliders, basePanels, megaColumns: columnVertices.length };
}

function createPetalApertures() {
  const surround = store(), dark = store(), trim = []; let count = 0;
  const rows = [[30.2, 4.5], [101.8, 4.1], [116, 3.7]];
  for (const [cy, height] of rows) for (let edge = 0; edge < HENDERSON_LOCAL_RING.length / 2 - 1; edge++) {
    const length = hendersonEdgeOutward(HENDERSON_LOCAL_RING, edge).length, pieces = Math.max(1, Math.floor(length / 3));
    for (let piece = 0; piece < pieces; piece++) {
      const tc = (piece + .5) / pieces, width = Math.min(1.15, length / pieces * .58), halfT = width / length * .5;
      const capsule = (scale, offset, target, tint) => {
        const centre = towerPoint(edge, tc, cy, offset); let first = null;
        for (let k = 0; k <= 16; k++) {
          const angle = k * Math.PI * 2 / 16, c = Math.cos(angle), s = Math.sin(angle);
          const t = tc + Math.sign(c) * Math.pow(Math.abs(c), .72) * halfT * scale;
          const y = cy + Math.sign(s) * Math.pow(Math.abs(s), .82) * height * .5 * scale;
          const p = towerPoint(edge, clamp(t, .02, .98), y, offset); if (!first) first = p; if (k > 0) triangle(target, centre, first, p, tint); first = p;
        }
      };
      capsule(1.13, .115, surround, [.57, .64, .66]); capsule(1, .155, dark, [.018, .032, .038]);
      const left = towerPoint(edge, tc - halfT * 1.05, cy, .18), right = towerPoint(edge, tc + halfT * 1.05, cy, .18);
      beam(trim, [left[0], cy + height * .53, left[2]], [right[0], cy + height * .53, right[2]], .055, .09); count++;
    }
  }
  return { surround, dark, trim, count };
}

function createSkyGarden(materials) {
  const group = new THREE.Group(); group.name = 'TheHenderson22FSkyGardenRunningTrackAndAquaponics';
  const ring = ringAtHeight(HENDERSON_SKY_GARDEN_BOTTOM), track = store(), lanes = store(), rails = [], glass = store(), planters = [], shrubs = [], trunks = [], leaves = [], pipes = [], colliders = [];
  const deck = new THREE.Mesh(shapeGeometry(ring, HENDERSON_SKY_GARDEN_BOTTOM + .02), materials.gardenPaving); deck.name = 'TheHendersonSkyGardenTerraceDeck'; deck.receiveShadow = true; group.add(deck);
  annulusStore(track, scaledRing(ring, .77), scaledRing(ring, .88), HENDERSON_SKY_GARDEN_BOTTOM + .055, [.19, .23, .24]);
  annulusStore(lanes, scaledRing(ring, .822), scaledRing(ring, .827), HENDERSON_SKY_GARDEN_BOTTOM + .063, [.82, .84, .81]);
  meshStore(group, track, materials.track, 'TheHendersonSkyGardenTwoLaneRunningTrack'); meshStore(group, lanes, materials.trackLine, 'TheHendersonSkyGardenTrackLaneLine', false);
  let trees = 0, aquaponicColumns = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const p = (t, y, o = 0) => towerPoint(edge, t, y, o), length = hendersonEdgeOutward(ring, edge).length;
    quad(glass, p(0, 105.14, -.12), p(1, 105.14, -.12), p(1, 106.22, -.12), p(0, 106.22, -.12), [.34, .52, .54]);
    beam(rails, p(0, 106.28, -.1), p(1, 106.28, -.1), .065, .09);
    if (length > 1.25 && edge % 2 === 0) {
      const q = p(.5, 105.34, -2.05), ry = hendersonEdgeOutward(ring, edge).ry; box(planters, q, [1.6, .58, .85], ry);
      for (let cluster = 0; cluster < 3; cluster++) { const g = new THREE.IcosahedronGeometry(.38 + hash(edge, cluster, 2) * .15, 1); g.translate(q[0] + (cluster - 1) * .38, 105.82 + cluster * .08, q[2]); shrubs.push(g); }
    }
    if (edge % 5 === 0) {
      const q = p(.5, 105.1, -3.1); cylinder(trunks, [q[0], 106.35, q[2]], .1, 2.5, 10);
      for (let cluster = 0; cluster < 3; cluster++) { const g = new THREE.IcosahedronGeometry(.68, 1); g.translate(q[0] + (cluster - 1) * .45, 107.75 + cluster * .16, q[2] + (cluster % 2 ? .25 : -.2)); leaves.push(g); } trees++;
    }
    if (edge % 4 === 1) {
      const q = p(.5, 105.1, -1.25); cylinder(pipes, [q[0], 106.35, q[2]], .16, 2.5, 12);
      for (let level = 0; level < 5; level++) { const g = new THREE.IcosahedronGeometry(.24, 1); g.translate(q[0] + (level % 2 ? .2 : -.2), 105.45 + level * .45, q[2]); leaves.push(g); } aquaponicColumns++;
    }
  }
  merged(group, rails, materials.silver, 'TheHendersonSkyGardenHandrails'); meshStore(group, glass, materials.balustrade, 'TheHendersonSkyGardenGlassBalustrade', false);
  merged(group, planters, materials.planter, 'TheHendersonSkyGardenPlanters'); merged(group, shrubs, materials.leaves, 'TheHendersonSkyGardenShrubs');
  merged(group, trunks, materials.trunk, 'TheHendersonSkyGardenTreeTrunks'); merged(group, leaves, materials.leaves, 'TheHendersonSkyGardenTreesAndAquaponicPlanting');
  merged(group, pipes, materials.silver, 'TheHendersonSkyGardenAquaponicColumns');
  return { group, colliders, trees, aquaponicColumns, trackSegments: ring.length / 2 - 1 };
}

function roofPoint(ring, sector, radial, thetaOffset = 0) {
  const i = sector * 2, theta = petalAngle(ring[i], ring[i + 1]) + thetaOffset;
  const delta = crownEave(theta) - HENDERSON_CLOUD_39_ROOF_BASE;
  // A square-root dome keeps the three raised petal rims without letting their interpolation overshoot the 190 m datum.
  return [ring[i] * radial, HENDERSON_CLOUD_39_ROOF_BASE + 8 * (1 - Math.sqrt(radial)) + delta * radial, ring[i + 1] * radial];
}
function createCloud39(materials) {
  const group = new THREE.Group(); group.name = 'TheHendersonCloud39AllGlassBallroom';
  const sideGlass = store(), roofGlass = store(), sideFrames = [], roofFins = [], silver = [], led = [], floor = [], tables = [], chairs = [], pv = [], pvFrames = [], weather = [], colliders = [];
  const eaveRing = ringAtHeight(HENDERSON_CLOUD_39_ROOF_BASE), sampled = sampleRing(eaveRing, 22);
  for (let edge = 0; edge < HENDERSON_LOCAL_RING.length / 2 - 1; edge++) {
    const length = hendersonEdgeOutward(HENDERSON_LOCAL_RING, edge).length, bays = Math.max(1, Math.ceil(length / 2.4));
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + .0007, t1 = (bay + 1) / bays - .0007;
      const a = towerPoint(edge, t0, 174), b = towerPoint(edge, t1, 174);
      const thetaA = petalAngle(a[0], a[2]), thetaB = petalAngle(b[0], b[2]);
      const c = towerPoint(edge, t1, crownEave(thetaB)), d = towerPoint(edge, t0, crownEave(thetaA));
      quad(sideGlass, a, b, c, d, [.38, .56, .6], .18);
      beam(sideFrames, a, d, .055, .085);
    }
  }
  // Exactly 132 curved roof panels: 22 circumferential sectors by six radial courses.
  for (let sector = 0; sector < 22; sector++) for (let band = 0; band < 6; band++) {
    const next = sector + 1, r0 = 1 - band / 6, r1 = 1 - (band + 1) / 6;
    const a = roofPoint(sampled, sector, r0), b = roofPoint(sampled, next, r0), c = roofPoint(sampled, next, r1), d = roofPoint(sampled, sector, r1);
    const tint = mix([.31, .48, .54], [.63, .72, .73], hash(sector, band, 39));
    if (band === 5) triangle(roofGlass, a, b, [0, 189.8, 0], tint, .12); else quad(roofGlass, a, b, c, d, tint, .12);
  }
  // Exactly 119 structural-glass fin segments: seventeen radial fins, each in seven followable pieces.
  for (let fin = 0; fin < 17; fin++) {
    const sector = Math.round(fin * 22 / 17);
    for (let segment = 0; segment < 7; segment++) {
      const r0 = 1 - segment / 7, r1 = 1 - (segment + 1) / 7, a = roofPoint(sampled, sector, r0), b = roofPoint(sampled, sector, r1);
      a[1] += .035; b[1] += .035; beam(roofFins, a, b, .065, .11);
    }
  }
  for (let sector = 0; sector < 22; sector++) {
    const a = roofPoint(sampled, sector, 1), b = roofPoint(sampled, sector + 1, 1); a[1] += .025; b[1] += .025;
    beam(silver, a, b, .12, .18); const la = [...a], lb = [...b]; la[1] = Math.min(189.94, la[1] + .06); lb[1] = Math.min(189.94, lb[1] + .06); beam(led, la, lb, .035, .055);
  }
  const ballroomFloor = new THREE.Mesh(shapeGeometry(scaledRing(ringAtHeight(174), .91), 174.03), materials.ballroomFloor); ballroomFloor.name = 'TheHendersonCloud39ColumnFreeBallroomFloor'; group.add(ballroomFloor);
  for (let i = 0; i < 12; i++) {
    const theta = i * Math.PI * 2 / 12, x = Math.cos(theta) * 9.2, z = Math.sin(theta) * 11.2;
    cylinder(tables, [x, 174.78, z], .82, .12, 24); cylinder(tables, [x, 174.4, z], .12, .72, 12);
    for (let chair = 0; chair < 6; chair++) { const a = chair * Math.PI * 2 / 6; box(chairs, [x + Math.cos(a) * 1.25, 174.46, z + Math.sin(a) * 1.25], [.38, .78, .38], -a); }
  }
  // CIBSE documents a 230 m² walkable rooftop PV array. These six modules are only a service-roof visual cue,
  // not a claimed surveyed panel count or layout, and they do not cover the glass ballroom ceiling.
  for (let i = 0; i < 6; i++) {
    const x = 9.5 + (i % 2) * 1.7, z = -3 + Math.floor(i / 2) * 2, g = new THREE.BoxGeometry(1.5, .065, 1.4); g.rotateX(-.18); g.translate(x, 174.28, z); pv.push(g);
    beam(pvFrames, [x - .55, 174.06, z + .45], [x - .55, 174.28, z], .045); beam(pvFrames, [x + .55, 174.06, z + .45], [x + .55, 174.28, z], .045);
  }
  // ZHA's roof weather station stays at or below the 190 m model datum; no invented antenna is added.
  cylinder(weather, [0, 189.9, 0], .055, .12, 12); cylinder(weather, [0, 189.96, 0], .18, .08, 16);
  box(weather, [.28, 189.87, 0], [.28, .12, .18]);
  meshStore(group, sideGlass, materials.cloudGlass, 'TheHendersonCloud39Panoramic375sqmFacade', false);
  meshStore(group, roofGlass, materials.cloudGlass, 'TheHendersonCloud39Exactly132CurvedRoofGlassPanels', false);
  merged(group, sideFrames, materials.silver, 'TheHendersonCloud39MinimalFacadeJoints'); merged(group, roofFins, materials.structuralGlass, 'TheHendersonCloud39Exactly119StructuralGlassFinSegments', false);
  merged(group, silver, materials.mirror, 'TheHendersonCloud39MirrorPolished3DRoofEdges'); merged(group, led, materials.light, 'TheHendersonCloud39IntegratedRoofEdgeLED', false);
  merged(group, tables, materials.ballroomFurniture, 'TheHendersonCloud39TwelveBanquetTables'); merged(group, chairs, materials.ballroomFurniture, 'TheHendersonCloud39BanquetChairs');
  merged(group, pv, materials.pv, 'TheHendersonEasternServiceRoofPhotovoltaicModules'); merged(group, pvFrames, materials.silver, 'TheHendersonRoofPhotovoltaicSupports');
  merged(group, weather, materials.silver, 'TheHendersonRoofWeatherStationBelow190m');
  colliders.push(...hendersonRingColliders(ringAtHeight(174), 174, 183), hendersonLocalCollider(0, 0, .6, .6, 189.7, 190));
  return { group, colliders, roofPanels: 132, glassFinSegments: 119, banquetTables: 12, pvModules: 6 };
}

function textPlane(text, width, height, fontSize = 64, tint = '#f1f3ee') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192; const context = canvas.getContext('2d');
  context.fillStyle = tint; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `500 ${fontSize}px Arial, sans-serif`; context.fillText(text, 512, 96);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); mesh.renderOrder = 12; return mesh;
}
function frameGroup(frame, lift = HENDERSON_PLAZA_TOP) { const group = new THREE.Group(); group.position.set(frame.localX, lift, frame.localZ); group.rotation.y = frame.ry - HENDERSON_SITE.ry; return group; }
function createEntrance(frame, materials, upper = false) {
  const group = frameGroup(frame, upper ? HENDERSON_UPPER_LOBBY_GROUND : HENDERSON_PLAZA_TOP); group.name = upper ? 'TheHendersonElevatedWalkwayPublicLobby' : 'TheHendersonMurrayRoad11mArrivalFoyer';
  const parts = { glass: [], frames: [], mirror: [], dark: [], gold: [], lights: [], paving: [] }, colliders = [], width = upper ? 6.4 : 8.8, height = upper ? 4.6 : 4.8;
  for (let panel = 0; panel < 4; panel++) {
    const pw = width / 4; box(parts.glass, [-width * .5 + pw * (panel + .5), height * .5, .04], [pw - .055, height, .075]);
    box(parts.frames, [-width * .5 + pw * panel, height * .5, .1], [.055, height + .08, .11]);
    if (panel === 1 || panel === 2) beam(parts.frames, [-width * .5 + pw * (panel + .5) + (panel === 1 ? .18 : -.18), 1.05, .21], [-width * .5 + pw * (panel + .5) + (panel === 1 ? .18 : -.18), 2.05, .21], .035);
  }
  box(parts.frames, [width * .5, height * .5, .1], [.055, height + .08, .11]); box(parts.frames, [0, height + .04, .1], [width + .1, .07, .12]);
  box(parts.gold, [0, 2.7, -2.2], [width + 2.4, 5.4, .25]);
  // A thin mirrored soffit continues the actual elevated base, rather than adding a generic rectangular porch roof.
  for (let panel = 0; panel < 7; panel++) { const x = -6 + panel * 2; box(parts.mirror, [x, upper ? 6.5 : 6.15, 1.15], [1.94, .16, 2.5]); }
  for (const x of [-4.5, 0, 4.5]) cylinder(parts.lights, [x, upper ? 6.39 : 6.04, 1.3], .1, .045, 12);
  box(parts.dark, [0, 5.15, .19], [6.6, 1.15, .12]);
  const sign = textPlane('The Henderson', upper ? 4.8 : 5.6, .7, 76, '#f1f0e8'); sign.position.set(0, 5.4, .34); group.add(sign);
  const address = textPlane('2 MURRAY ROAD', 3.6, .4, 82, '#e2e4df'); address.position.set(0, 4.96, .34); group.add(address);
  if (!upper) {
    // In Bloom / warm lobby cues are geometric and remain behind the glass; no reference photo is used as a texture.
    for (let i = 0; i < 18; i++) { const x = -3.6 + (i % 6) * 1.4, y = 4.2 + Math.floor(i / 6) * .48, z = -1.1 - (i % 2) * .35; beam(parts.gold, [x, y + .7, z], [x, y, z], .025); const g = new THREE.IcosahedronGeometry(.16 + hash(i, 2, 8) * .1, 1); g.translate(x, y, z); parts.gold.push(g); }
    box(parts.paving, [0, .035, 1.45], [HENDERSON_MAIN_FORECOURT_WIDTH, .07, HENDERSON_MAIN_FORECOURT_DEPTH]);
  } else {
    box(parts.paving, [0, -.08, 1.1], [8.4, .16, 2.4]);
    for (const side of [-1, 1]) { box(parts.frames, [side * 4.1, .62, 1.1], [.07, 1.25, 2.4]); box(parts.glass, [side * 4.05, .63, 1.1], [.045, 1.05, 2.25]); }
  }
  merged(group, parts.glass, materials.clearGlass, `${group.name}SlidingGlassAndBalustrades`, false); merged(group, parts.frames, materials.silver, `${group.name}FramesHandlesAndThreshold`);
  merged(group, parts.mirror, materials.mirror, `${group.name}CurvedMirrorSoffit`); merged(group, parts.gold, materials.gold, `${group.name}WarmLobbyAndInBloom`);
  merged(group, parts.dark, materials.dark, `${group.name}EntranceSignPlaque`); merged(group, parts.lights, materials.light, `${group.name}WarmDownlights`, false); merged(group, parts.paving, materials.paving, `${group.name}Paving`);
  colliders.push(hendersonFrameCollider(frame, 0, .02, width, .24, 0, height, upper ? HENDERSON_UPPER_LOBBY_GROUND : HENDERSON_PLAZA_TOP));
  return { group, colliders };
}

function createArtGarden(materials) {
  const group = frameGroup(HENDERSON_MAIN_ENTRANCE, HENDERSON_PLAZA_TOP); group.name = 'TheHendersonArtGardenBreathingTreeAndTopiary';
  const silver = [], dark = [], leaves = [], trunks = [], lights = [], colliders = [], centreX = -5.7, centreZ = 1.35;
  cylinder(dark, [centreX, .1, centreZ], 1.38, .2, 40); cylinder(silver, [centreX, .22, centreZ], 1.12, .08, 40);
  for (let rod = 0; rod < 36; rod++) {
    const theta = rod * Math.PI * 2 / 36, lower = [centreX + Math.cos(theta) * .38, .25, centreZ + Math.sin(theta) * .38];
    const middle = [centreX + Math.cos(theta) * .48, 2.15, centreZ + Math.sin(theta) * .48];
    const upper = [centreX + Math.cos(theta) * (1.15 + .18 * Math.sin(theta * 3)), 4.15 + .22 * Math.cos(theta * 2), centreZ + Math.sin(theta) * (1.15 + .18 * Math.sin(theta * 3))];
    beam(silver, lower, middle, .035); beam(silver, middle, upper, .03);
  }
  for (let ring = 0; ring < 5; ring++) for (let segment = 0; segment < 24; segment++) {
    const a = segment * Math.PI * 2 / 24, b = (segment + 1) * Math.PI * 2 / 24, radius = .4 + ring * .04, y = .65 + ring * .62;
    beam(silver, [centreX + Math.cos(a) * radius, y, centreZ + Math.sin(a) * radius], [centreX + Math.cos(b) * radius, y, centreZ + Math.sin(b) * radius], .022);
  }
  for (let i = 0; i < 12; i++) { const theta = i * Math.PI * 2 / 12; cylinder(lights, [centreX + Math.cos(theta) * 1.23, .24, centreZ + Math.sin(theta) * 1.23], .045, .035, 8); }
  const lightRing = new THREE.TorusGeometry(1.24, .025, 6, 48); lightRing.rotateX(Math.PI / 2); lightRing.translate(centreX, .245, centreZ); lights.push(lightRing);
  const mistPositions = [];
  for (let i = 0; i < 90; i++) { const theta = hash(i, 1, 4) * Math.PI * 2, radius = .35 + hash(i, 2, 5) * 1.2; mistPositions.push(centreX + Math.cos(theta) * radius, 1.1 + hash(i, 3, 6) * 3.2, centreZ + Math.sin(theta) * radius); }
  const mistGeometry = new THREE.BufferGeometry(); mistGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mistPositions, 3)); mistGeometry.computeBoundingSphere();
  const mist = new THREE.Points(mistGeometry, materials.mist); mist.name = 'TheHendersonBreathingTreeSubtleWaterMist'; group.add(mist);
  for (const [x, z] of [[5.8, 1.25], [7.25, .75]]) {
    cylinder(dark, [x, .25, z], .72, .5, 20); cylinder(trunks, [x, 1.25, z], .09, 2.1, 10);
    for (let cluster = 0; cluster < 4; cluster++) { const g = new THREE.IcosahedronGeometry(.55 + cluster * .06, 1); g.translate(x + (cluster % 2 ? .24 : -.24), 1.55 + cluster * .36, z); leaves.push(g); }
    colliders.push(hendersonFrameCollider(HENDERSON_MAIN_ENTRANCE, x, z, 1.5, 1.5, 0, .55, HENDERSON_PLAZA_TOP));
  }
  merged(group, silver, materials.silver, 'TheHendersonBreathingTree36KineticMetalRods'); merged(group, dark, materials.dark, 'TheHendersonBreathingTreeBasinAndTopiaryPlanters');
  merged(group, leaves, materials.leaves, 'TheHendersonArtGardenTopiary'); merged(group, trunks, materials.trunk, 'TheHendersonArtGardenTopiaryTrunks'); merged(group, lights, materials.light, 'TheHendersonArtGardenWarmRingLighting', false);
  colliders.push(hendersonFrameCollider(HENDERSON_MAIN_ENTRANCE, centreX, centreZ, 2.85, 2.85, 0, .32, HENDERSON_PLAZA_TOP));
  return { group, colliders, breathingTreeRods: 36, mistPoints: 90 };
}

export function buildTheHenderson(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'TheHenderson'; group.userData.landmark = 'the-henderson'; group.userData.osm = { type: 'way', id: HENDERSON_OSM_SOURCE.id };
  group.position.set(HENDERSON_SITE.x, groundOffset, HENDERSON_SITE.z); group.rotation.y = HENDERSON_SITE.ry; root.add(group);
  const glass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .46, roughness: .17, side: THREE.DoubleSide }); glass.colorNode = attribute('color'); glass.emissiveNode = color(0xffd8aa).mul(attribute('aLit')).mul(nightAmount());
  const backing = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .2, roughness: .45, side: THREE.DoubleSide }); backing.colorNode = attribute('color'); backing.emissiveNode = color(0xffd8aa).mul(attribute('aLit')).mul(nightAmount());
  const frames = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .68, roughness: .28, side: THREE.DoubleSide }); frames.colorNode = attribute('color');
  const spandrel = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .64, roughness: .3, side: THREE.DoubleSide }); spandrel.colorNode = attribute('color'); spandrel.emissiveNode = color(0xd9e7e8).mul(nightAmount()).mul(.035);
  const silver = new THREE.MeshStandardNodeMaterial({ color: 0xbcc8ca, metalness: .72, roughness: .25 }); silver.emissiveNode = color(0xe1ebeb).mul(nightAmount()).mul(.035);
  const mirror = new THREE.MeshStandardMaterial({ color: 0xc3c9c7, metalness: .94, roughness: .075, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202b30, metalness: .42, roughness: .4 });
  const aperture = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .24, roughness: .26, side: THREE.DoubleSide }); aperture.colorNode = attribute('color'); aperture.emissiveNode = color(0xffd6a0).mul(nightAmount()).mul(.018);
  const baseGlass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .28, roughness: .14, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false }); baseGlass.colorNode = attribute('color'); baseGlass.emissiveNode = color(0xffd5a0).mul(attribute('aLit')).mul(nightAmount()).mul(.8);
  const lobbyGlass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .12, roughness: .1, transparent: true, opacity: .24, side: THREE.DoubleSide, depthWrite: false }); lobbyGlass.colorNode = attribute('color'); lobbyGlass.emissiveNode = color(0xffd5a0).mul(attribute('aLit')).mul(nightAmount()).mul(.65);
  const clearGlass = new THREE.MeshStandardNodeMaterial({ color: 0xa9c5c8, metalness: .1, roughness: .09, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }); clearGlass.emissiveNode = color(0xffd5a0).mul(nightAmount()).mul(.08);
  const balustrade = new THREE.MeshStandardNodeMaterial({ vertexColors: true, transparent: true, opacity: .26, roughness: .12, metalness: .08, side: THREE.DoubleSide, depthWrite: false }); balustrade.colorNode = attribute('color');
  const cloudGlass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .12, roughness: .09, transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false }); cloudGlass.colorNode = attribute('color'); cloudGlass.emissiveNode = color(0xffdfad).mul(attribute('aLit')).mul(nightAmount()).mul(.5);
  const structuralGlass = new THREE.MeshStandardNodeMaterial({ color: 0xc4dcda, metalness: .08, roughness: .08, transparent: true, opacity: .42, depthWrite: false });
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe4b8 }); light.emissiveNode = color(0xffd18a).mul(nightAmount()).mul(2);
  const gold = new THREE.MeshStandardNodeMaterial({ color: 0x8a795d, metalness: .6, roughness: .38 }); gold.emissiveNode = color(0xffc56f).mul(nightAmount()).mul(.5);
  const paving = new THREE.MeshStandardMaterial({ color: 0x777d79, roughness: .86, metalness: .02 });
  const gardenPaving = new THREE.MeshStandardMaterial({ color: 0x8b918a, roughness: .86, side: THREE.DoubleSide });
  const track = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: .88, side: THREE.DoubleSide }); track.colorNode = attribute('color');
  const trackLine = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: .8, side: THREE.DoubleSide }); trackLine.colorNode = attribute('color');
  const planter = new THREE.MeshStandardMaterial({ color: 0x777f79, roughness: .78 }), leaves = new THREE.MeshStandardMaterial({ color: 0x3e6c46, roughness: .92 }), trunk = new THREE.MeshStandardMaterial({ color: 0x51483b, roughness: .95 });
  const ballroomFloor = new THREE.MeshStandardMaterial({ color: 0xaaa596, roughness: .58, side: THREE.DoubleSide }), ballroomFurniture = new THREE.MeshStandardMaterial({ color: 0xc2bcad, roughness: .62 });
  const pv = new THREE.MeshStandardMaterial({ color: 0x193d51, metalness: .62, roughness: .24 });
  const mist = new THREE.PointsMaterial({ color: 0xe4efed, size: .16, transparent: true, opacity: .18, depthWrite: false, sizeAttenuation: true });
  const materials = { glass, baseGlass, backing, frames, spandrel, silver, mirror, dark, aperture, lobbyGlass, clearGlass, balustrade, cloudGlass, structuralGlass, light, gold, paving, gardenPaving, track, trackLine, planter, leaves, trunk, ballroomFloor, ballroomFurniture, pv, mist };

  const base = createElevatedBase(materials); group.add(base.group);
  const tower = createOfficeFacade(); meshStore(group, tower.backing, backing, 'TheHendersonOfficeRecessedCurtainWallBacking'); meshStore(group, tower.glass, glass, 'TheHendersonThreeClusterDoubleCurvedInsulatedGlass');
  meshStore(group, tower.frames, frames, 'TheHendersonFineCurvedGlassPanelJoints'); meshStore(group, tower.spandrel, spandrel, 'TheHendersonSilverHorizontalTransoms'); merged(group, tower.fins, silver, 'TheHendersonSixContinuousPetalSeamFins');
  const apertures = createPetalApertures(); meshStore(group, apertures.surround, spandrel, 'TheHendersonSilverPetalApertureSurrounds'); meshStore(group, apertures.dark, aperture, 'TheHendersonRecessedElongatedPetalApertures'); merged(group, apertures.trim, silver, 'TheHendersonApertureUpperEyebrows');
  const garden = createSkyGarden(materials); group.add(garden.group);
  const cloud = createCloud39(materials); group.add(cloud.group);
  const main = createEntrance(HENDERSON_MAIN_ENTRANCE, materials, false); group.add(main.group);
  const upper = createEntrance(HENDERSON_UPPER_ENTRANCE, materials, true); group.add(upper.group);
  const art = createArtGarden(materials); group.add(art.group);
  const colliders = [...base.colliders, ...tower.colliders, ...garden.colliders, ...cloud.colliders, ...main.colliders, ...upper.colliders, ...art.colliders];
  for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + HENDERSON_PLAZA_TOP }, landmark = { id: 'the-henderson', name: HENDERSON_SITE.name, position: { x: HENDERSON_SITE.x, y: groundOffset, z: HENDERSON_SITE.z }, radius: 68, height: HENDERSON_HEIGHT };
  const stats = {
    hendersonGroundOffset: groundOffset, hendersonLandmarks: 1, hendersonOsmHeight: HENDERSON_OSM_HEIGHT, hendersonWspHeight: HENDERSON_WSP_HEIGHT,
    hendersonDiscoverHkHeight: HENDERSON_DISCOVER_HK_HEIGHT, hendersonSeeleHeight: HENDERSON_SEELE_HEIGHT, hendersonLightingDesignHeight: HENDERSON_LIGHTING_DESIGN_HEIGHT, hendersonHeight: HENDERSON_HEIGHT,
    hendersonOsmLevels: HENDERSON_OSM_LEVELS, hendersonZhaLevels: HENDERSON_ZHA_LEVELS, hendersonUndergroundLevels: HENDERSON_UNDERGROUND_LEVELS,
    hendersonHipHingTypicalFloors: `${HENDERSON_HIP_HING_TYPICAL_FLOORS.first}/F–${HENDERSON_HIP_HING_TYPICAL_FLOORS.last}/F`, hendersonWorkplaceTypicalFloors: `${HENDERSON_WORKPLACE_TYPICAL_FLOORS.first}/F–${HENDERSON_WORKPLACE_TYPICAL_FLOORS.last}/F`,
    hendersonOfficeFloors: HENDERSON_OFFICE_FLOORS, hendersonSkyGardenFloor: HENDERSON_SKY_GARDEN_FLOOR, hendersonCloud39Floor: HENDERSON_CLOUD_39_FLOOR, hendersonSeeleBanquetFloors: HENDERSON_SEELE_BANQUET_FLOORS.join('/'),
    hendersonZhaProjectStart: HENDERSON_ZHA_PROJECT_PERIOD.start, hendersonZhaProjectEnd: HENDERSON_ZHA_PROJECT_PERIOD.end, hendersonHipHingCompletionYear: HENDERSON_HIP_HING_COMPLETION_YEAR, hendersonWspStatus: HENDERSON_WSP_STATUS,
    hendersonWspGfa: HENDERSON_WSP_GFA, hendersonColumnFreeSpan: HENDERSON_COLUMN_FREE_SPAN, hendersonFloorToFloor: HENDERSON_FLOOR_TO_FLOOR, hendersonClearHeadroom: HENDERSON_CLEAR_HEADROOM,
    hendersonMegaColumns: base.megaColumns, hendersonCoreSide: HENDERSON_CORE_SIDE, hendersonFacadePanelsOver: HENDERSON_FACADE_PANELS_OVER, hendersonFacadePlies: HENDERSON_FACADE_PLIES, hendersonFacadeLaminations: HENDERSON_FACADE_LAMINATIONS,
    hendersonSeelePodiumFacadeArea: HENDERSON_SEELE_PODIUM_FACADE_AREA, hendersonSeeleEntranceGlassHeight: HENDERSON_SEELE_ENTRANCE_GLASS_HEIGHT,
    hendersonCloud39FacadeArea: HENDERSON_CLOUD_39_FACADE_AREA, hendersonCloud39RoofPanels: cloud.roofPanels, hendersonCloud39GlassFinSegments: cloud.glassFinSegments,
    hendersonCloud39MaxWindSuction: HENDERSON_CLOUD_39_MAX_WIND_SUCTION, hendersonCloud39CeilingHeight: HENDERSON_CLOUD_39_CEILING_HEIGHT,
    hendersonCloud39BallroomSqft: HENDERSON_CLOUD_39_BALLROOM_SQFT, hendersonCloud39FoyerSqft: HENDERSON_CLOUD_39_FOYER_SQFT, hendersonCloud39TerraceSqft: HENDERSON_CLOUD_39_TERRACE_SQFT,
    hendersonSourceVertices: HENDERSON_OSM_SOURCE.geometry.length - 1, hendersonOsmWayVersion: HENDERSON_OSM_SOURCE.version, hendersonRingArea: HENDERSON_RING_AREA,
    hendersonVisualOfficeCourses: HENDERSON_OFFICE_COURSES, hendersonOfficeGlassPanels: tower.glassPanels, hendersonBaseGlassPanels: base.basePanels, hendersonVerticalPanelJoints: tower.verticalJoints,
    hendersonPetalApertures: apertures.count, hendersonSkyGardenTrees: garden.trees, hendersonAquaponicColumns: garden.aquaponicColumns, hendersonRunningTrackSegments: garden.trackSegments,
    hendersonCloud39BanquetTables: cloud.banquetTables, hendersonRoofPvModules: cloud.pvModules, hendersonBreathingTreeRods: art.breathingTreeRods, hendersonMistPoints: art.mistPoints,
    hendersonMainEntranceNode: HENDERSON_MAIN_ENTRANCE.nodeId, hendersonUpperEntranceNode: HENDERSON_UPPER_ENTRANCE.nodeId,
    hendersonMainEntranceEdge: HENDERSON_MAIN_ENTRANCE.sourceEdge, hendersonUpperEntranceEdge: HENDERSON_UPPER_ENTRANCE.sourceEdge,
    hendersonMainForecourtWidth: HENDERSON_MAIN_FORECOURT_WIDTH, hendersonMainForecourtDepth: HENDERSON_MAIN_FORECOURT_DEPTH, hendersonPlazaGround: grounds.plaza, hendersonColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza, groundHeightAt: (x, z, ground) => hendersonGroundHeightAt(x, z, ground, grounds) };
}
