import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import { rawHongKongTerrainHeight } from './terrain.js';
import {
  TIMES_SQUARE_SITE, TIMES_SQUARE_MALL_OSM_SOURCE, TIMES_SQUARE_LOCAL_RING,
  TIMES_SQUARE_TOWER_ONE_SITE, TIMES_SQUARE_TOWER_ONE_LOCAL_RING,
  TIMES_SQUARE_TOWER_TWO_SITE, TIMES_SQUARE_TOWER_TWO_LOCAL_RING,
  TIMES_SQUARE_LANDUSE_LOCAL_RING, TIMES_SQUARE_HEIGHT,
  TIMES_SQUARE_TOWER_ONE_HEIGHT, TIMES_SQUARE_TOWER_ONE_OSM_HEIGHT,
  TIMES_SQUARE_TOWER_TWO_HEIGHT, TIMES_SQUARE_TOWER_TWO_OSM_HEIGHT,
  TIMES_SQUARE_TOWER_ONE_OSM_LEVELS, TIMES_SQUARE_TOWER_TWO_OSM_LEVELS,
  TIMES_SQUARE_TOWER_ONE_OFFICE_LEVELS, TIMES_SQUARE_TOWER_TWO_OFFICE_LEVELS,
  TIMES_SQUARE_TOWER_ONE_OFFICE_TOP, TIMES_SQUARE_TOWER_TWO_OFFICE_TOP,
  TIMES_SQUARE_RETAIL_LEVELS, TIMES_SQUARE_OSM_MALL_LEVELS,
  TIMES_SQUARE_BELOW_GROUND_LEVELS, TIMES_SQUARE_CINEMAS,
  TIMES_SQUARE_COMPLETION_YEAR, TIMES_SQUARE_OPENING_DATE, TIMES_SQUARE_ARCHITECT,
  TIMES_SQUARE_GFA_SQFT, TIMES_SQUARE_TOWER_ONE_TYPICAL_FLOOR_SQFT,
  TIMES_SQUARE_TOWER_TWO_TYPICAL_FLOOR_SQFT, TIMES_SQUARE_OFFICE_FLOOR_TO_FLOOR,
  TIMES_SQUARE_FEATURE_FLOOR_TO_FLOOR, TIMES_SQUARE_PODIUM_HEIGHT,
  TIMES_SQUARE_STREET_HEIGHT, TIMES_SQUARE_ROAD_SOFFIT, TIMES_SQUARE_ROAD_LINTEL_DEPTH,
  TIMES_SQUARE_ROAD_VEHICLE_CLEARANCE, TIMES_SQUARE_PODIUM_BAY_WIDTH,
  TIMES_SQUARE_MAIN_ENTRANCE, TIMES_SQUARE_CURVED_ATRIUM, TIMES_SQUARE_LED_FRONTAGE,
  TIMES_SQUARE_CLOCK, TIMES_SQUARE_CROSSING_ROADS,
  TIMES_SQUARE_TOWER_ONE_OSM_SOURCE, TIMES_SQUARE_TOWER_TWO_OSM_SOURCE,
  timesSquareLocalToWorld, timesSquareWorldToLocal, timesSquareEdgeOutward,
  timesSquareRingColliders, timesSquareSegmentCollider, timesSquareLocalCollider,
  timesSquareFrameToWorld, timesSquareFrameCollider, timesSquarePodiumBayConflict,
  timesSquareRoadConflictAtLocal, timesSquarePointInRoadCorridor,
  isTimesSquareOpenPiazzaPoint, timesSquareGroundHeightAt
} from './times-square-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(.55, 1.4, cityUniforms.uInteriorGlow);
const store = () => ({ positions: [], colors: [], lit: [] });
const mix = (a, b, t) => a.map((value, index) => lerp(value, b[index], t));
function hash(a, b, c, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
function quad(s, a, b, c, d, tint, lit = 0) {
  for (const p of [a, b, c, a, c, d]) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); }
}
function geometry(s) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3));
  g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null;
  const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null;
  const geo = mergeGeometries(parts, false); for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true;
  group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) {
  const g = new THREE.BoxGeometry(...size); if (ry) g.rotateY(ry); g.translate(...center); parts.push(g); return g;
}
function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius) {
  const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments); g.translate(...center); parts.push(g); return g;
}
function beam(parts, a, b, width = .1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length();
  if (length < .001) return;
  const g = new THREE.BoxGeometry(width, length, depth);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
function point(ring, edge, t, y, offset = 0) {
  const i = edge * 2, { nx, nz } = timesSquareEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const p = point(ring, edge, t, y, offset), { ry } = timesSquareEdgeOutward(ring, edge);
  return box(parts, p, [width, height, depth], ry);
}
function roofGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
function ringFrame(ring, edge, t = .5) {
  const i = edge * 2, x = lerp(ring[i], ring[i + 2], t), z = lerp(ring[i + 1], ring[i + 3], t);
  return { x, z, ...timesSquareEdgeOutward(ring, edge) };
}
function featureGroup(ring, edge, name) {
  const frame = ringFrame(ring, edge), group = new THREE.Group(); group.name = name;
  group.position.set(frame.x, 0, frame.z); group.rotation.y = frame.ry; return group;
}
function frameGroup(frame, name) {
  const group = new THREE.Group(); group.name = name; group.position.set(frame.localX, 0, frame.localZ);
  group.rotation.y = frame.ry - TIMES_SQUARE_SITE.ry; return group;
}
function polygonCentre(ring) {
  let area = 0, x = 0, z = 0;
  for (let i = 0; i < ring.length - 2; i += 2) {
    const cross = ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; area += cross;
    x += (ring[i] + ring[i + 2]) * cross; z += (ring[i + 1] + ring[i + 3]) * cross;
  }
  return { x: x / (3 * area), z: z / (3 * area) };
}
function scaledRing(ring, scale) {
  const centre = polygonCentre(ring);
  return Object.freeze(ring.map((value, index) => centre[index % 2 ? 'z' : 'x'] + (value - centre[index % 2 ? 'z' : 'x']) * scale));
}
function segmentColliderWorld(a, b, minY, maxY, depth = .5) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  const centre = timesSquareWorldToLocal((a.x + b.x) * .5, (a.z + b.z) * .5);
  return timesSquareLocalCollider(centre.x, centre.z, length, depth, minY, maxY, Math.atan2(-dz, dx));
}

function createStreetLevel() {
  const glass = store(), stone = store(), backing = store(), frames = [], columns = [], colliders = [];
  let openRoadBays = 0, entranceBays = 0, closedBays = 0, columnCount = 0;
  for (let edge = 0; edge < TIMES_SQUARE_LOCAL_RING.length / 2 - 1; edge++) {
    const length = timesSquareEdgeOutward(TIMES_SQUARE_LOCAL_RING, edge).length;
    const bays = Math.max(1, Math.ceil(length / TIMES_SQUARE_PODIUM_BAY_WIDTH));
    const customFrontage = edge === TIMES_SQUARE_MAIN_ENTRANCE.sourceEdge || edge === TIMES_SQUARE_CURVED_ATRIUM.sourceEdge;
    const p = (t, y, o = .05) => point(TIMES_SQUARE_LOCAL_RING, edge, t, y, o);
    if (!customFrontage) edgeBox(frames, TIMES_SQUARE_LOCAL_RING, edge, .5, TIMES_SQUARE_ROAD_SOFFIT - TIMES_SQUARE_ROAD_LINTEL_DEPTH * .5,
      .06, length, TIMES_SQUARE_ROAD_LINTEL_DEPTH, .5);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + .0008, t1 = (bay + 1) / bays - .0008;
      if (timesSquarePodiumBayConflict(TIMES_SQUARE_LOCAL_RING, edge, bay / bays, (bay + 1) / bays)) { openRoadBays++; continue; }
      if (customFrontage) { entranceBays++; continue; }
      const variation = hash(edge, bay, 90);
      quad(backing, p(t0, .18, -.24), p(t1, .18, -.24), p(t1, 5.35, -.24), p(t0, 5.35, -.24), [.17, .12, .09], .12 + variation * .32);
      quad(glass, p(t0, .25), p(t1, .25), p(t1, 5.25), p(t0, 5.25), mix([.035, .09, .105], [.15, .25, .26], variation), .08 + variation * .15);
      quad(stone, p(t0, 5.3, .08), p(t1, 5.3, .08), p(t1, 6, .08), p(t0, 6, .08), [.61, .53, .47]);
      colliders.push(timesSquareSegmentCollider(TIMES_SQUARE_LOCAL_RING, edge, bay / bays, (bay + 1) / bays, 0, TIMES_SQUARE_STREET_HEIGHT));
      closedBays++;
    }
    if (customFrontage) continue;
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, i = edge * 2;
      const x = lerp(TIMES_SQUARE_LOCAL_RING[i], TIMES_SQUARE_LOCAL_RING[i + 2], t);
      const z = lerp(TIMES_SQUARE_LOCAL_RING[i + 1], TIMES_SQUARE_LOCAL_RING[i + 3], t);
      if (timesSquareRoadConflictAtLocal(x, z)) continue;
      const q = point(TIMES_SQUARE_LOCAL_RING, edge, t, TIMES_SQUARE_STREET_HEIGHT * .5, -.17);
      box(columns, q, [.48, TIMES_SQUARE_STREET_HEIGHT, .48], timesSquareEdgeOutward(TIMES_SQUARE_LOCAL_RING, edge).ry);
      colliders.push(timesSquareLocalCollider(q[0], q[2], .54, .54, 0, TIMES_SQUARE_STREET_HEIGHT)); columnCount++;
    }
  }
  return { glass, stone, backing, frames, columns, colliders, openRoadBays, entranceBays, closedBays, columnCount };
}

function createPodiumUpper() {
  const glass = store(), stone = store(), recess = store(), mullions = store(), bands = [];
  const glazedEdges = new Set([0, 2, 4, 5, 9, 11, 18, 20]);
  let glassPanels = 0, stonePanels = 0, horizontalBands = 0;
  for (let edge = 0; edge < TIMES_SQUARE_LOCAL_RING.length / 2 - 1; edge++) {
    const length = timesSquareEdgeOutward(TIMES_SQUARE_LOCAL_RING, edge).length;
    const bays = Math.max(1, Math.round(length / 3.05)), glazed = glazedEdges.has(edge);
    const p = (t, y, o = .04) => point(TIMES_SQUARE_LOCAL_RING, edge, t, y, o);
    if (edge === TIMES_SQUARE_MAIN_ENTRANCE.sourceEdge || edge === TIMES_SQUARE_CURVED_ATRIUM.sourceEdge) {
      const featureTop = edge === TIMES_SQUARE_MAIN_ENTRANCE.sourceEdge ? 40 : 46;
      quad(recess, p(0, 6, -.22), p(1, 6, -.22), p(1, featureTop, -.22), p(0, featureTop, -.22), [.035, .055, .063]);
      for (let y = featureTop; y < 60; y += 3.85) {
        quad(stone, p(0, y, -.04), p(1, y, -.04), p(1, Math.min(60, y + 3.85), -.04), p(0, Math.min(60, y + 3.85), -.04), [.61, .53, .47]);
        quad(stone, p(0, y, .08), p(1, y, .08), p(1, y + .48, .08), p(0, y + .48, .08), [.70, .62, .55]);
        edgeBox(bands, TIMES_SQUARE_LOCAL_RING, edge, .5, y + .5, .18, length, .12, .38); horizontalBands++;
      }
      continue;
    }
    quad(glazed ? recess : stone, p(0, 6, -.14), p(1, 6, -.14), p(1, 60, -.14), p(0, 60, -.14),
      glazed ? [.035, .055, .063] : [.57, .49, .43]);
    for (let course = 0; course < TIMES_SQUARE_RETAIL_LEVELS; course++) {
      const y0 = lerp(6, 60, course / TIMES_SQUARE_RETAIL_LEVELS), y1 = lerp(6, 60, (course + 1) / TIMES_SQUARE_RETAIL_LEVELS);
      const band = course % 4 === 3 ? .68 : .46;
      quad(stone, p(0, y0, .07), p(1, y0, .07), p(1, y0 + band, .07), p(0, y0 + band, .07),
        course % 4 === 3 ? [.69, .61, .55] : [.62, .54, .48]);
      if (course % 2 === 0) { edgeBox(bands, TIMES_SQUARE_LOCAL_RING, edge, .5, y0 + band, .18, length, .12, .38); horizontalBands++; }
      for (let bay = 0; bay < bays; bay++) {
        const centre = (bay + .5) / bays, half = .5 / bays;
        const widthFactor = glazed ? .88 : (bay % 3 === 1 ? .27 : .12);
        const t0 = centre - half * widthFactor, t1 = centre + half * widthFactor;
        if (!glazed && bay % 3 !== 1) { stonePanels++; continue; }
        const variation = hash(edge, course, bay, 90);
        const lit = variation > .77 ? .08 + variation * .42 : 0;
        quad(glass, p(t0, y0 + band + .12, .02), p(t1, y0 + band + .12, .02), p(t1, y1 - .16, .02), p(t0, y1 - .16, .02),
          mix([.035, .10, .13], [.19, .31, .34], variation), lit); glassPanels++;
        if (glazed) {
          const mt = bay / bays, dt = Math.min(.0012, .045 / length);
          quad(mullions, p(mt, y0 + band, .1), p(mt + dt, y0 + band, .1), p(mt + dt, y1 - .08, .1), p(mt, y1 - .08, .1), [.32, .34, .34]);
        }
      }
    }
  }
  return { glass, stone, recess, mullions, bands, glassPanels, stonePanels, horizontalBands,
    colliders: timesSquareRingColliders(TIMES_SQUARE_LOCAL_RING, TIMES_SQUARE_STREET_HEIGHT, TIMES_SQUARE_PODIUM_HEIGHT) };
}

function createTower({ id, ring, levels, officeTop, height, stoneEdges, archEdges }) {
  const glass = store(), stone = store(), silver = store(), recess = store(), mullions = store(), fins = [];
  let glassPanels = 0, horizontalBands = 0;
  const stones = new Set(stoneEdges);
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = timesSquareEdgeOutward(ring, edge).length, bays = Math.max(1, Math.round(length / 2.55));
    const stoneEdge = stones.has(edge), p = (t, y, o = .04) => point(ring, edge, t, y, o);
    quad(stoneEdge ? stone : recess, p(0, 60, -.15), p(1, 60, -.15), p(1, officeTop, -.15), p(0, officeTop, -.15),
      stoneEdge ? [.61, .56, .51] : [.035, .055, .066]);
    for (let course = 0; course < levels; course++) {
      const y0 = 60 + course * TIMES_SQUARE_OFFICE_FLOOR_TO_FLOOR;
      const y1 = Math.min(officeTop, y0 + TIMES_SQUARE_OFFICE_FLOOR_TO_FLOOR);
      const band = course % 8 === 7 ? .72 : .48;
      quad(stoneEdge ? stone : silver, p(0, y0, .075), p(1, y0, .075), p(1, y0 + band, .075), p(0, y0 + band, .075),
        stoneEdge ? [.72, .66, .60] : [.63, .68, .69]);
      edgeBox(fins, ring, edge, .5, y0 + band * .6, .19, length, .11, stoneEdge ? .34 : .48); horizontalBands++;
      for (let bay = 0; bay < bays; bay++) {
        const centre = (bay + .5) / bays, half = .5 / bays, widthFactor = stoneEdge ? (bay % 2 ? .26 : .16) : .88;
        if (stoneEdge && bay % 2 === 0 && length > 8) continue;
        const t0 = centre - half * widthFactor, t1 = centre + half * widthFactor, variation = hash(edge, bay, course, id.length);
        const lit = variation > .83 ? .08 + variation * .52 : 0;
        quad(glass, p(t0, y0 + band + .1, .025), p(t1, y0 + band + .1, .025), p(t1, y1 - .13, .025), p(t0, y1 - .13, .025),
          mix([.055, .14, .18], [.29, .43, .47], .12 + variation * .7), lit); glassPanels++;
        if (!stoneEdge) {
          const mt = bay / bays, dt = Math.min(.0012, .04 / length);
          quad(mullions, p(mt, y0 + band, .11), p(mt + dt, y0 + band, .11), p(mt + dt, y1 - .07, .11), p(mt, y1 - .07, .11), [.26, .31, .33]);
        }
      }
    }
    if (!stoneEdge && length > 7) {
      const count = Math.max(1, Math.floor(length / 10));
      for (let index = 0; index <= count; index++) edgeBox(fins, ring, edge, index / count, (60 + officeTop) * .5, .23, .15, officeTop - 60, .48);
    }
  }
  const arches = [];
  for (const edge of archEdges) arches.push(createTowerArch(ring, edge, officeTop, id));
  const crown = createTowerCrown(ring, officeTop, height, id);
  return { glass, stone, silver, recess, mullions, fins, arches, crown, glassPanels, horizontalBands,
    colliders: [...timesSquareRingColliders(ring, 60, officeTop), ...crown.colliders, ...arches.flatMap((arch) => arch.colliders)] };
}
function archShape(width, bottom, spring) {
  const radius = width * .5, shape = new THREE.Shape();
  shape.moveTo(-radius, bottom); shape.lineTo(radius, bottom); shape.lineTo(radius, spring);
  shape.absarc(0, spring, radius, 0, Math.PI, false); shape.lineTo(-radius, bottom); shape.closePath(); return shape;
}
function createTowerArch(ring, edge, officeTop, id) {
  const frame = ringFrame(ring, edge), group = featureGroup(ring, edge, `${id}NearTopArchedRecess`);
  const width = Math.min(10, frame.length * .58), bottom = officeTop - 13.2, spring = officeTop - 6.1;
  const pane = new THREE.Mesh(new THREE.ShapeGeometry(archShape(width, bottom, spring)), new THREE.MeshStandardMaterial({
    color: 0x19323c, metalness: .4, roughness: .26, side: THREE.DoubleSide
  })); pane.position.z = .14; pane.name = `${id}ArchedBlueGlass`; group.add(pane);
  const frameParts = [], mullions = [], radius = width * .5;
  for (const side of [-1, 1]) box(frameParts, [side * (radius + .35), (bottom + spring) * .5, .22], [.7, spring - bottom, .62]);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI, b = (i + 1) / 24 * Math.PI;
    beam(frameParts, [Math.cos(a) * (radius + .35), spring + Math.sin(a) * (radius + .35), .22],
      [Math.cos(b) * (radius + .35), spring + Math.sin(b) * (radius + .35), .22], .7, .62);
  }
  for (let x = -radius + 1.2; x < radius; x += 1.2) {
    const top = spring + Math.sqrt(Math.max(0, radius * radius - x * x));
    beam(mullions, [x, bottom + .2, .28], [x, top - .15, .28], .075);
  }
  merged(group, frameParts, new THREE.MeshStandardMaterial({ color: 0xa89b8e, roughness: .63 }), `${id}ArchStoneSurround`);
  merged(group, mullions, new THREE.MeshStandardMaterial({ color: 0x8c9b9e, metalness: .55, roughness: .35 }), `${id}ArchMullions`);
  return { group, colliders: [] };
}
function createTowerCrown(ring, officeTop, height, id) {
  const group = new THREE.Group(); group.name = `${id}RoundedDarkPlantCrown`;
  const crownRing = scaledRing(ring, .9), dark = store(), louvres = [], rails = [];
  for (let edge = 0; edge < crownRing.length / 2 - 1; edge++) {
    const length = timesSquareEdgeOutward(crownRing, edge).length, p = (t, y, o = 0) => point(crownRing, edge, t, y, o);
    quad(dark, p(0, officeTop), p(1, officeTop), p(1, height - 1.25), p(0, height - 1.25), [.12, .15, .16]);
    for (let y = officeTop + .4; y < height - 1.3; y += .62) edgeBox(louvres, crownRing, edge, .5, y, .1, length, .1, .26);
    edgeBox(rails, crownRing, edge, .5, height - .65, .02, length, 1.3, .24);
  }
  const centre = polygonCentre(crownRing);
  const plant = new THREE.Mesh(new RoundedBoxGeometry(12, 3.8, 10, 3, .7), new THREE.MeshStandardMaterial({ color: 0x252c2e, metalness: .35, roughness: .48 }));
  plant.position.set(centre.x, height - 1.9, centre.z); plant.name = `${id}RoundedRooftopPlant`; plant.castShadow = true; group.add(plant);
  const deck = new THREE.Mesh(roofGeometry(crownRing, height - 1.24), new THREE.MeshStandardMaterial({ color: 0x42484a, roughness: .72, side: THREE.DoubleSide }));
  deck.name = `${id}CrownRoofDeck`; group.add(deck);
  meshStore(group, dark, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .48, metalness: .32, side: THREE.DoubleSide }), `${id}DarkCrownBacking`);
  const metal = new THREE.MeshStandardMaterial({ color: 0x5d6769, metalness: .55, roughness: .4 });
  merged(group, louvres, metal, `${id}CrownHorizontalLouvres`); merged(group, rails, metal, `${id}CrownRoundedParapet`);
  return { group, colliders: timesSquareRingColliders(crownRing, officeTop, height) };
}

// Embedded stroke lettering avoids relying on an installed CJK font for the identifying signs.
const TIMES_SQUARE_GLYPHS = {
  '時': [[[8,18],[34,18],[34,78],[8,78],[8,18]],[[20,4],[20,94]],[[8,46],[34,46]],[[46,18],[92,18]],[[70,4],[70,94]],[[46,42],[92,42]],[[48,62],[88,62]],[[54,82],[46,96]]],
  '代': [[[24,8],[8,42]],[[18,28],[18,94]],[[42,24],[84,24]],[[56,4],[48,58],[36,94]],[[56,54],[76,72],[94,94]],[[78,12],[88,22]]],
  '廣': [[[50,4],[50,14]],[[12,18],[90,18]],[[18,18],[18,94]],[[26,32],[80,32]],[[38,22],[38,50]],[[66,22],[66,50]],[[26,44],[80,44]],[[30,56],[76,56],[76,80],[30,80],[30,56]],[[52,56],[52,92]],[[52,82],[34,96]],[[56,82],[76,96]]],
  '場': [[[8,30],[34,30]],[[20,12],[20,78]],[[6,78],[36,78]],[[46,12],[82,12],[82,40],[46,40],[46,12]],[[46,26],[82,26]],[[42,50],[90,50]],[[54,50],[42,94]],[[54,62],[84,62],[78,94]],[[56,72],[44,88]],[[70,72],[58,90]]]
};
function drawChinese(context, text, centreX, centreY, size, fill, vertical = false) {
  const chars = [...text], advance = size * 1.12;
  context.strokeStyle = fill; context.lineWidth = Math.max(1.5, size * .052); context.lineJoin = 'miter'; context.lineCap = 'square';
  chars.forEach((char, index) => {
    const glyph = TIMES_SQUARE_GLYPHS[char]; if (!glyph) return;
    const x = vertical ? centreX - size * .5 : centreX - (chars.length - 1) * advance * .5 - size * .5 + index * advance;
    const y = vertical ? centreY - (chars.length - 1) * advance * .5 - size * .5 + index * advance : centreY - size * .5;
    for (const path of glyph) {
      context.beginPath(); path.forEach(([px, py], pointIndex) => {
        const xx = x + px * size / 100, yy = y + py * size / 100;
        if (pointIndex) context.lineTo(xx, yy); else context.moveTo(xx, yy);
      }); context.stroke();
    }
  });
}
function canvasPlane(width, height, canvas, emissive = false) {
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = emissive ? new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
    : new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: .42, metalness: .08, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.renderOrder = 12; return mesh;
}
function textSign(text, width, height, { vertical = false, chinese = false, tint = '#e5ddd2', background = null } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = vertical ? 256 : 1024; canvas.height = vertical ? 1024 : 256;
  const ctx = canvas.getContext('2d'); if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.fillStyle = tint; ctx.strokeStyle = tint; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (chinese) drawChinese(ctx, text, canvas.width * .5, canvas.height * .5, vertical ? 176 : 150, tint, vertical);
  else { ctx.font = `500 ${vertical ? 92 : 116}px Arial, sans-serif`; ctx.fillText(text, canvas.width * .5, canvas.height * .5); }
  return canvasPlane(width, height, canvas, true);
}
function timesSquareDevice(size = 5) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(224,216,204,.96)'; ctx.beginPath(); ctx.arc(256, 256, 238, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#71685f'; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(256, 256, 213, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#202a32'; ctx.fillRect(112, 112, 288, 288);
  ctx.strokeStyle = '#d9d4ca'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(142, 142); ctx.lineTo(370, 370); ctx.moveTo(370, 142); ctx.lineTo(142, 370); ctx.stroke();
  ctx.fillStyle = '#202a32'; ctx.beginPath(); ctx.arc(256, 256, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e6e0d5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 56px Arial, sans-serif';
  ctx.fillText('TIMES', 256, 158); ctx.font = '700 48px Arial, sans-serif'; ctx.fillText('SQUARE', 256, 358);
  return canvasPlane(size, size, canvas, true);
}
function createMainEntrance(materials) {
  const group = frameGroup(TIMES_SQUARE_MAIN_ENTRANCE, 'TimesSquareRussellStreetArchedMainEntrance');
  const stone = [], metal = [], glass = [], dark = [], lights = [], colliders = [];
  const width = 13.2, radius = width * .5, bottom = 5.6, spring = 28.6;
  const backing = new THREE.Mesh(new THREE.ShapeGeometry(archShape(width, bottom, spring)), materials.dark);
  backing.position.z = -.28; backing.name = 'TimesSquareMainArchRecess'; group.add(backing);
  const pane = new THREE.Mesh(new THREE.ShapeGeometry(archShape(width - .5, bottom + .2, spring)), materials.atriumGlass);
  pane.position.z = .08; pane.name = 'TimesSquareTallArchedAtriumGlazing'; group.add(pane);
  for (const side of [-1, 1]) {
    box(stone, [side * (radius + .65), 20.2, .05], [1.3, 40.4, 1.25]);
    colliders.push(timesSquareFrameCollider(TIMES_SQUARE_MAIN_ENTRANCE, side * (radius + .65), .05, 1.3, 1.25, 0, 40.4));
  }
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI, b = (i + 1) / 32 * Math.PI;
    beam(stone, [Math.cos(a) * (radius + .65), spring + Math.sin(a) * (radius + .65), .05],
      [Math.cos(b) * (radius + .65), spring + Math.sin(b) * (radius + .65), .05], 1.3, 1.25);
  }
  for (let x = -radius + 1.1; x < radius; x += 1.1) {
    const top = spring + Math.sqrt(Math.max(0, radius * radius - x * x));
    beam(metal, [x, bottom + .1, .23], [x, top - .18, .23], .085);
  }
  for (let y = 9; y < spring + radius; y += 3.6) {
    const half = y <= spring ? radius : Math.sqrt(Math.max(0, radius * radius - (y - spring) ** 2));
    if (half > .2) beam(metal, [-half + .1, y, .24], [half - .1, y, .24], .09);
  }
  for (const side of [-1, 1]) {
    box(glass, [side * 3.9, 2.85, .12], [2.7, 5.3, .1]);
    colliders.push(timesSquareFrameCollider(TIMES_SQUARE_MAIN_ENTRANCE, side * 3.9, .12, 2.7, .24, 0, 5.5));
  }
  for (const x of [-5.25, -2.55, 2.55, 5.25]) box(metal, [x, 2.85, .22], [.1, 5.4, .16]);
  box(stone, [0, 5.65, 1.15], [15.1, .42, 3.1]);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) cylinder(lights, [x, 5.38, 1.35], .11, .06, 12);
  const device = timesSquareDevice(4.9); device.position.set(5.25, 38.3, 1.02); device.name = 'TimesSquareCircularWallDeviceNotThePiazzaClock'; group.add(device);
  const vertical = textSign('時代廣場', 1.6, 10, { vertical: true, chinese: true, tint: '#302823' });
  vertical.position.set(-7.25, 26.2, .72); vertical.name = 'TimesSquareVerticalChineseLettering'; group.add(vertical);
  const english = textSign('TIMES SQUARE', 10.8, 1.65, { tint: '#403830' }); english.position.set(0, 7.25, .82); group.add(english);
  merged(group, stone, materials.stone, 'TimesSquareMainArchStonePiersAndVoussoirs');
  merged(group, metal, materials.silver, 'TimesSquareMainArchMullionsAndDoors');
  merged(group, glass, materials.atriumGlass, 'TimesSquareMainEntranceSideDoors', false);
  merged(group, dark, materials.dark, 'TimesSquareMainEntranceInterior'); merged(group, lights, materials.light, 'TimesSquareMainEntranceSoffitLights', false);
  return { group, colliders };
}
function createCurvedAtrium(materials) {
  const frame = TIMES_SQUARE_CURVED_ATRIUM, group = frameGroup(frame, 'TimesSquarePiazzaCurvedGlassAtrium');
  const glass = store(), stone = [], metal = [], lights = [], colliders = [];
  const width = frame.length, projection = 5.2, segments = 28, levels = 10;
  const p = (t, y, offset = 0) => [(t - .5) * width, y, projection * Math.sin(Math.PI * t) + offset];
  const topAt = (t) => 42 + 4 * Math.sin(Math.PI * t);
  let glassPanels = 0;
  for (let segment = 0; segment < segments; segment++) {
    const t0 = segment / segments, t1 = (segment + 1) / segments;
    for (let level = 0; level < levels; level++) {
      const y0 = 6 + level * 3.6, y1 = Math.min(42, y0 + 3.6);
      if (y0 >= 42) continue;
      const variation = hash(segment, level, 10);
      quad(glass, p(t0, y0), p(t1, y0), p(t1, y1), p(t0, y1), mix([.035, .12, .15], [.20, .36, .39], variation), variation > .8 ? .32 : 0); glassPanels++;
    }
    quad(glass, p(t0, 42), p(t1, 42), p(t1, topAt(t1)), p(t0, topAt(t0)), [.12, .28, .32], .08); glassPanels++;
    const a = timesSquareFrameToWorld(frame, ...(() => { const q = p(t0, 0); return [q[0], q[2]]; })());
    const b = timesSquareFrameToWorld(frame, ...(() => { const q = p(t1, 0); return [q[0], q[2]]; })());
    colliders.push(segmentColliderWorld(a, b, 6, 46, .38));
  }
  for (let segment = 0; segment <= segments; segment++) {
    const t = segment / segments; beam(metal, p(t, 6, .12), p(t, topAt(t), .12), .085);
  }
  for (let y = 6; y <= 42; y += 3.6) for (let segment = 0; segment < segments; segment++) {
    beam(metal, p(segment / segments, y, .13), p((segment + 1) / segments, y, .13), .09);
  }
  for (let segment = 0; segment < segments; segment++) {
    beam(stone, p(segment / segments, 46.15, .02), p((segment + 1) / segments, 46.15, .02), .55, .7);
    beam(stone, p(segment / segments, 5.85, .05), p((segment + 1) / segments, 5.85, .05), .45, .65);
  }
  for (const t of [0, 1]) {
    const q = p(t, 23); box(stone, q, [1.1, 46, 1.15]);
    colliders.push(timesSquareFrameCollider(frame, q[0], q[2], 1.1, 1.15, 0, 46));
  }
  for (const t of [.35, .45, .55, .65]) {
    const q = p(t, 2.9); box(metal, [q[0], q[1], q[2] + .12], [.09, 5.8, .14]);
  }
  for (const t of [.2, .4, .6, .8]) { const q = p(t, 5.55, .6); cylinder(lights, q, .1, .06, 12); }
  const sign = textSign('TIMES SQUARE', 17.5, 2.1, { tint: '#443b34' }); sign.position.set(0, 48.2, .4); sign.name = 'TimesSquareCurvedAtriumHorizontalLettering'; group.add(sign);
  meshStore(group, glass, materials.glass, 'TimesSquareCurvedAtriumBlueGreenPanels');
  merged(group, metal, materials.silver, 'TimesSquareCurvedAtriumVerticalAndHorizontalMullions');
  merged(group, stone, materials.stone, 'TimesSquareCurvedAtriumStoneCanopy'); merged(group, lights, materials.light, 'TimesSquareCurvedAtriumWarmSoffitLights', false);
  return { group, colliders, glassPanels };
}
function createLedFrontage(materials) {
  const group = frameGroup(TIMES_SQUARE_LED_FRONTAGE, 'TimesSquareCornerLEDMediaFrontage');
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 1024; const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 640, 1024); gradient.addColorStop(0, '#173b56'); gradient.addColorStop(.48, '#287c8a'); gradient.addColorStop(1, '#7b313c');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 640, 1024);
  ctx.strokeStyle = 'rgba(220,245,240,.55)'; ctx.lineWidth = 9;
  for (let i = -4; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 90, 1024); ctx.lineTo(i * 90 + 520, 0); ctx.stroke(); }
  ctx.fillStyle = '#f1eee4'; ctx.textAlign = 'center'; ctx.font = '300 82px Arial, sans-serif'; ctx.fillText('TIMES', 320, 440); ctx.fillText('SQUARE', 320, 535);
  ctx.font = '500 28px Arial, sans-serif'; ctx.fillText('CAUSEWAY BAY', 320, 600);
  const screen = canvasPlane(10.2, 16.3, canvas, true); screen.position.set(0, 24, .62); screen.name = 'TimesSquarePermanentProceduralLEDContent'; group.add(screen);
  const frame = []; box(frame, [0, 24, .25], [11.1, 17.2, .5]); merged(group, frame, materials.dark, 'TimesSquareLEDDeepFrame');
  // Re-add in front of the solid surround; the surround must not occlude the screen.
  group.remove(screen); group.add(screen);
  return { group };
}

function localGround(x, z, groundOffset) {
  const p = timesSquareLocalToWorld(x, z);
  return Math.max(rawHongKongTerrainHeight(p.x, p.z), groundOffset) + .12 - groundOffset;
}
function subdivideTriangle(a, b, c, out, depth = 0) {
  const lengths = [Math.hypot(a[0] - b[0], a[1] - b[1]), Math.hypot(b[0] - c[0], b[1] - c[1]), Math.hypot(c[0] - a[0], c[1] - a[1])];
  const longest = lengths.indexOf(Math.max(...lengths));
  if (depth >= 7 || lengths[longest] <= 2.8) { out.push([a, b, c]); return; }
  if (longest === 0) { const m = [(a[0] + b[0]) * .5, (a[1] + b[1]) * .5]; subdivideTriangle(a, m, c, out, depth + 1); subdivideTriangle(m, b, c, out, depth + 1); }
  else if (longest === 1) { const m = [(b[0] + c[0]) * .5, (b[1] + c[1]) * .5]; subdivideTriangle(a, b, m, out, depth + 1); subdivideTriangle(a, m, c, out, depth + 1); }
  else { const m = [(c[0] + a[0]) * .5, (c[1] + a[1]) * .5]; subdivideTriangle(a, b, m, out, depth + 1); subdivideTriangle(m, b, c, out, depth + 1); }
}
function createPiazzaGround(groundOffset) {
  const shape = new THREE.Shape();
  TIMES_SQUARE_LANDUSE_LOCAL_RING.slice(0, -2).forEach((value, index, array) => {
    if (index % 2) return; if (index === 0) shape.moveTo(value, -array[index + 1]); else shape.lineTo(value, -array[index + 1]);
  }); shape.closePath();
  const hole = new THREE.Path();
  TIMES_SQUARE_LOCAL_RING.slice(0, -2).forEach((value, index, array) => {
    if (index % 2) return; if (index === 0) hole.moveTo(value, -array[index + 1]); else hole.lineTo(value, -array[index + 1]);
  }); hole.closePath(); shape.holes.push(hole);
  const source = new THREE.ShapeGeometry(shape); source.rotateX(-Math.PI / 2);
  const position = source.getAttribute('position'), triangles = [];
  for (let i = 0; i + 2 < position.count; i += 3) subdivideTriangle(
    [position.getX(i), position.getZ(i)], [position.getX(i + 1), position.getZ(i + 1)], [position.getX(i + 2), position.getZ(i + 2)], triangles);
  source.dispose();
  const paving = store(); let pavingTriangles = 0;
  for (const triangle of triangles) {
    const centre = [(triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3, (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3];
    const samples = [...triangle, centre].map(([x, z]) => timesSquareLocalToWorld(x, z));
    if (samples.some((p) => timesSquarePointInRoadCorridor(p.x, p.z, .12))) continue;
    const centreWorld = timesSquareLocalToWorld(...centre);
    if (!isTimesSquareOpenPiazzaPoint(centreWorld.x, centreWorld.z)) continue;
    const tint = [.61, .57, .52];
    for (const order of [0, 1, 2]) {
      const [x, z] = triangle[order]; paving.positions.push(x, localGround(x, z, groundOffset), z); paving.colors.push(...tint); paving.lit.push(0);
    }
    pavingTriangles++;
  }
  return { paving, pavingTriangles };
}
function createClockFace(materials) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#eee9dc'; ctx.beginPath(); ctx.arc(256, 256, 242, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a2d2d'; ctx.lineWidth = 12; ctx.stroke(); ctx.fillStyle = '#242727'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '500 42px Arial, sans-serif';
  for (let n = 1; n <= 12; n++) { const a = n / 12 * Math.PI * 2; ctx.fillText(String(n), 256 + Math.sin(a) * 184, 256 - Math.cos(a) * 184); }
  for (let n = 0; n < 60; n++) { const a = n / 60 * Math.PI * 2, inner = n % 5 ? 213 : 203; ctx.lineWidth = n % 5 ? 3 : 6; ctx.beginPath();
    ctx.moveTo(256 + Math.sin(a) * inner, 256 - Math.cos(a) * inner); ctx.lineTo(256 + Math.sin(a) * 225, 256 - Math.cos(a) * 225); ctx.stroke(); }
  ctx.lineCap = 'round'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(256, 256); ctx.lineTo(205, 194); ctx.stroke();
  ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(256, 256); ctx.lineTo(330, 172); ctx.stroke();
  ctx.fillStyle = '#8c7754'; ctx.beginPath(); ctx.arc(256, 256, 14, 0, Math.PI * 2); ctx.fill();
  const face = canvasPlane(1.55, 1.55, canvas, false); face.material.emissive = new THREE.Color(0xffe2a5); face.material.emissiveIntensity = .12; return face;
}
function createPiazzaClock(materials, groundOffset) {
  const group = new THREE.Group(); group.name = 'TimesSquareFreestandingFourFacedPiazzaClock';
  const base = localGround(TIMES_SQUARE_CLOCK.localX, TIMES_SQUARE_CLOCK.localZ, groundOffset);
  group.position.set(TIMES_SQUARE_CLOCK.localX, base, TIMES_SQUARE_CLOCK.localZ);
  const stone = [], dark = [], brass = [], colliders = [];
  box(stone, [0, .18, 0], [5.1, .36, 5.1]); box(stone, [0, .62, 0], [4.5, .72, 4.5]); box(stone, [0, 1.18, 0], [3.9, .42, 3.9]);
  colliders.push(timesSquareLocalCollider(TIMES_SQUARE_CLOCK.localX, TIMES_SQUARE_CLOCK.localZ, 5.1, 5.1, base, base + 1.4));
  for (const x of [-1.35, 1.35]) for (const z of [-1.35, 1.35]) {
    box(dark, [x, 3.25, z], [.22, 4.1, .22]);
    colliders.push(timesSquareLocalCollider(TIMES_SQUARE_CLOCK.localX + x, TIMES_SQUARE_CLOCK.localZ + z, .34, .34, base + 1.2, base + 5.3));
  }
  box(dark, [0, 4.1, 0], [2.35, 2.05, 2.35]);
  for (let side = 0; side < 4; side++) {
    const face = createClockFace(materials), angle = side * Math.PI * .5;
    face.position.set(Math.sin(angle) * 1.19, 4.15, Math.cos(angle) * 1.19); face.rotation.y = angle; face.name = `TimesSquareClockFace${side + 1}`; group.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.84, .07, 8, 32), materials.brass); rim.position.copy(face.position); rim.rotation.y = angle; group.add(rim);
  }
  const radius = 2.15, spring = 5.35, ribs = 12;
  for (let rib = 0; rib < ribs; rib++) {
    const angle = rib / ribs * Math.PI * 2;
    for (let step = 0; step < 10; step++) {
      const a = step / 10 * Math.PI * .5, b = (step + 1) / 10 * Math.PI * .5;
      beam(dark, [Math.cos(angle) * Math.cos(a) * radius, spring + Math.sin(a) * radius, Math.sin(angle) * Math.cos(a) * radius],
        [Math.cos(angle) * Math.cos(b) * radius, spring + Math.sin(b) * radius, Math.sin(angle) * Math.cos(b) * radius], .075);
    }
  }
  for (const phi of [0, .32, .62]) {
    const r = Math.cos(phi) * radius, y = spring + Math.sin(phi) * radius;
    for (let segment = 0; segment < 48; segment++) {
      const a = segment / 48 * Math.PI * 2, b = (segment + 1) / 48 * Math.PI * 2;
      beam(dark, [Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(b) * r, y, Math.sin(b) * r], .065);
    }
  }
  cylinder(brass, [0, 7.72, 0], .09, .48, 12, .025);
  const plaque = textSign('TIMES SQUARE', 3.1, .48, { tint: '#d8c9a9', background: '#37332f' }); plaque.position.set(0, .72, 2.27); group.add(plaque);
  merged(group, stone, materials.stone, 'TimesSquareClockSteppedStonePlinth'); merged(group, dark, materials.dark, 'TimesSquareClockOpenDomedMetalCanopy');
  merged(group, brass, materials.brass, 'TimesSquareClockFinial');
  return { group, colliders, faces: 4, ribs };
}
function createPiazzaFurniture(materials, groundOffset) {
  const group = new THREE.Group(); group.name = 'TimesSquareCivicPiazzaPavingBenchesAndPlanters'; const colliders = [];
  const ground = createPiazzaGround(groundOffset); meshStore(group, ground.paving, materials.paving, 'TimesSquareContinuousDTMSensitivePiazzaPaving', false);
  const benches = [], planters = [], leaves = [], seams = [];
  for (const [x, z, ry] of [[76,-11,0],[79,-27,Math.PI/2],[66,-28,0],[57,-26,0]]) {
    const p = timesSquareLocalToWorld(x, z); if (!isTimesSquareOpenPiazzaPoint(p.x, p.z)) continue;
    const y = localGround(x, z, groundOffset);
    for (let slat = -2; slat <= 2; slat++) box(benches, [x, y + .55, z + slat * .12], [2.5, .09, .09], ry);
    for (const side of [-1, 1]) box(benches, [x + side * .9, y + .28, z], [.1, .55, .55], ry);
    colliders.push(timesSquareLocalCollider(x, z, 2.6, .75, y, y + .65, TIMES_SQUARE_SITE.ry + ry));
  }
  for (const [x, z] of [[81,-19],[69,-30]]) {
    const p = timesSquareLocalToWorld(x, z); if (!isTimesSquareOpenPiazzaPoint(p.x, p.z)) continue;
    const y = localGround(x, z, groundOffset); cylinder(planters, [x, y + .42, z], 1.05, .84, 20, 1.14);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, g = new THREE.IcosahedronGeometry(.48 + hash(i, x, z) * .16, 1);
      g.translate(x + Math.cos(a) * .52, y + 1.05 + hash(i, z, x) * .25, z + Math.sin(a) * .52); leaves.push(g); }
    colliders.push(timesSquareLocalCollider(x, z, 2.15, 2.15, y, y + .9));
  }
  for (let x = 48; x <= 84; x += 4) for (let z = -30; z <= 4; z += 2) {
    const a = timesSquareLocalToWorld(x, z), b = timesSquareLocalToWorld(x + 1.8, z);
    if (!isTimesSquareOpenPiazzaPoint(a.x, a.z) || !isTimesSquareOpenPiazzaPoint(b.x, b.z)) continue;
    const y = localGround(x + .9, z, groundOffset) + .012; box(seams, [x + .9, y, z], [1.8, .015, .025]);
  }
  merged(group, benches, materials.bench, 'TimesSquarePiazzaTimberBenches'); merged(group, planters, materials.stone, 'TimesSquarePiazzaStonePlanters');
  merged(group, leaves, materials.leaves, 'TimesSquarePiazzaPlanterShrubs'); merged(group, seams, materials.seam, 'TimesSquarePiazzaStoneExpansionJoints', false);
  return { group, colliders, pavingTriangles: ground.pavingTriangles };
}

export function buildTimesSquare(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'TimesSquareCausewayBay'; group.userData.landmark = 'times-square';
  group.userData.osm = { mall: TIMES_SQUARE_MALL_OSM_SOURCE.id, towerOne: TIMES_SQUARE_TOWER_ONE_OSM_SOURCE.id, towerTwo: TIMES_SQUARE_TOWER_TWO_OSM_SOURCE.id };
  group.position.set(TIMES_SQUARE_SITE.x, groundOffset, TIMES_SQUARE_SITE.z); group.rotation.y = TIMES_SQUARE_SITE.ry; root.add(group);
  const glass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .38, roughness: .2, side: THREE.DoubleSide });
  glass.colorNode = attribute('color'); glass.emissiveNode = color(0xffd3a0).mul(attribute('aLit')).mul(nightAmount());
  const stone = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .04, roughness: .66, side: THREE.DoubleSide }); stone.colorNode = attribute('color');
  stone.emissiveNode = color(0xffd8ae).mul(nightAmount()).mul(.028);
  const silver = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .52, roughness: .34, side: THREE.DoubleSide }); silver.colorNode = attribute('color');
  const recess = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .2, roughness: .42, side: THREE.DoubleSide }); recess.colorNode = attribute('color');
  const mullion = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .58, roughness: .32, side: THREE.DoubleSide }); mullion.colorNode = attribute('color');
  const solidStone = new THREE.MeshStandardNodeMaterial({ color: 0xa89586, roughness: .66, metalness: .04 });
  solidStone.emissiveNode = color(0xffd8ae).mul(nightAmount()).mul(.025);
  const solidSilver = new THREE.MeshStandardMaterial({ color: 0x9da9aa, roughness: .35, metalness: .58 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x20292d, roughness: .44, metalness: .32 });
  const atriumGlass = new THREE.MeshStandardNodeMaterial({ color: 0x6d9ca4, transparent: true, opacity: .38, roughness: .12, metalness: .18, side: THREE.DoubleSide, depthWrite: false });
  atriumGlass.emissiveNode = color(0xffd09a).mul(nightAmount()).mul(.1);
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe4b5 }); light.emissiveNode = color(0xffd18a).mul(nightAmount()).mul(2.2);
  const paving = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: .82, metalness: .02, side: THREE.DoubleSide }); paving.colorNode = attribute('color');
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a8357, roughness: .36, metalness: .68 });
  const bench = new THREE.MeshStandardMaterial({ color: 0x574334, roughness: .78 });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x3f6341, roughness: .9 });
  const seam = new THREE.MeshStandardMaterial({ color: 0x625b54, roughness: .9 });
  const materials = { glass, stone: solidStone, silver: solidSilver, dark, atriumGlass, light, paving, brass, bench, leaves, seam };

  const street = createStreetLevel();
  meshStore(group, street.backing, recess, 'TimesSquareWarmGroundFloorRetailBacking'); meshStore(group, street.glass, glass, 'TimesSquareRoadSafeGroundFloorShopfronts');
  meshStore(group, street.stone, stone, 'TimesSquareGroundFloorStoneFascia');
  merged(group, street.frames, solidStone, 'TimesSquareRoadClearSixMetreLintels'); merged(group, street.columns, solidStone, 'TimesSquareRoadSafeStreetColumns');
  const podium = createPodiumUpper();
  meshStore(group, podium.recess, recess, 'TimesSquarePodiumRecessedGlazingBacking'); meshStore(group, podium.glass, glass, 'TimesSquareFourteenCoursePodiumGlazing');
  meshStore(group, podium.stone, stone, 'TimesSquarePinkBeigeHorizontalStonePodium');
  meshStore(group, podium.mullions, mullion, 'TimesSquarePodiumFineMullions'); merged(group, podium.bands, solidStone, 'TimesSquarePodiumProjectingStringCourses');
  const soffit = new THREE.Mesh(roofGeometry(TIMES_SQUARE_LOCAL_RING, TIMES_SQUARE_ROAD_SOFFIT), new THREE.MeshStandardMaterial({ color: 0x6f665e, roughness: .78, side: THREE.DoubleSide }));
  soffit.name = 'TimesSquareContinuousRoadClearPodiumSoffit'; group.add(soffit);
  const roof = new THREE.Mesh(roofGeometry(TIMES_SQUARE_LOCAL_RING, 60), new THREE.MeshStandardMaterial({ color: 0x827a71, roughness: .75, side: THREE.DoubleSide }));
  roof.name = 'TimesSquareRetailPodiumRoof'; group.add(roof);

  const towerOne = createTower({ id: 'TimesSquareTowerOne', ring: TIMES_SQUARE_TOWER_ONE_LOCAL_RING,
    levels: TIMES_SQUARE_TOWER_ONE_OFFICE_LEVELS, officeTop: TIMES_SQUARE_TOWER_ONE_OFFICE_TOP,
    height: TIMES_SQUARE_TOWER_ONE_HEIGHT, stoneEdges: [4,5,6,7,8,9,10], archEdges: [0,11] });
  const towerTwo = createTower({ id: 'TimesSquareTowerTwo', ring: TIMES_SQUARE_TOWER_TWO_LOCAL_RING,
    levels: TIMES_SQUARE_TOWER_TWO_OFFICE_LEVELS, officeTop: TIMES_SQUARE_TOWER_TWO_OFFICE_TOP,
    height: TIMES_SQUARE_TOWER_TWO_HEIGHT, stoneEdges: [5,6,7,8,9,10], archEdges: [0,3] });
  for (const [tower, id] of [[towerOne, 'TimesSquareTowerOne'], [towerTwo, 'TimesSquareTowerTwo']]) {
    meshStore(group, tower.recess, recess, `${id}RecessedCurtainWallBacking`); meshStore(group, tower.glass, glass, `${id}BlueGreenOfficeGlassAndStoneSlitWindows`);
    meshStore(group, tower.stone, stone, `${id}PinkBeigeStoneAndHorizontalSpandrels`);
    meshStore(group, tower.silver, silver, `${id}SilverHorizontalOfficeBands`); meshStore(group, tower.mullions, mullion, `${id}FineOfficeMullions`);
    merged(group, tower.fins, solidSilver, `${id}OfficeSunshadesAndVerticalFins`);
    for (const arch of tower.arches) group.add(arch.group); group.add(tower.crown.group);
  }
  const mainEntrance = createMainEntrance(materials); group.add(mainEntrance.group);
  const atrium = createCurvedAtrium(materials); group.add(atrium.group);
  const led = createLedFrontage(materials); group.add(led.group);
  const clock = createPiazzaClock(materials, groundOffset); group.add(clock.group);
  const piazza = createPiazzaFurniture(materials, groundOffset); group.add(piazza.group);

  const colliders = [...street.colliders, ...podium.colliders, ...towerOne.colliders, ...towerTwo.colliders,
    ...mainEntrance.colliders, ...atrium.colliders, ...clock.colliders, ...piazza.colliders];
  for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + .12 };
  const landmark = { id: 'times-square', name: TIMES_SQUARE_SITE.name,
    position: { x: TIMES_SQUARE_SITE.x, y: groundOffset, z: TIMES_SQUARE_SITE.z }, radius: 105, height: TIMES_SQUARE_HEIGHT };
  const stats = {
    timesSquareGroundOffset: groundOffset, timesSquareLandmarks: 1, timesSquareHeight: TIMES_SQUARE_HEIGHT,
    timesSquareTowerOneHeight: TIMES_SQUARE_TOWER_ONE_HEIGHT, timesSquareTowerOneOsmHeight: TIMES_SQUARE_TOWER_ONE_OSM_HEIGHT,
    timesSquareTowerTwoHeight: TIMES_SQUARE_TOWER_TWO_HEIGHT, timesSquareTowerTwoOsmHeight: TIMES_SQUARE_TOWER_TWO_OSM_HEIGHT,
    timesSquareTowerOneOsmLevels: TIMES_SQUARE_TOWER_ONE_OSM_LEVELS, timesSquareTowerTwoOsmLevels: TIMES_SQUARE_TOWER_TWO_OSM_LEVELS,
    timesSquareTowerOneOfficeLevels: TIMES_SQUARE_TOWER_ONE_OFFICE_LEVELS, timesSquareTowerTwoOfficeLevels: TIMES_SQUARE_TOWER_TWO_OFFICE_LEVELS,
    timesSquareRetailLevels: TIMES_SQUARE_RETAIL_LEVELS, timesSquareOsmMallLevels: TIMES_SQUARE_OSM_MALL_LEVELS,
    timesSquareBelowGroundLevels: TIMES_SQUARE_BELOW_GROUND_LEVELS, timesSquareCinemas: TIMES_SQUARE_CINEMAS,
    timesSquareCompletionYear: TIMES_SQUARE_COMPLETION_YEAR, timesSquareOpeningDate: TIMES_SQUARE_OPENING_DATE,
    timesSquareArchitect: TIMES_SQUARE_ARCHITECT, timesSquareGfaSqft: TIMES_SQUARE_GFA_SQFT,
    timesSquareTowerOneTypicalFloorSqft: TIMES_SQUARE_TOWER_ONE_TYPICAL_FLOOR_SQFT,
    timesSquareTowerTwoTypicalFloorSqft: TIMES_SQUARE_TOWER_TWO_TYPICAL_FLOOR_SQFT,
    timesSquareOfficeFloorToFloor: TIMES_SQUARE_OFFICE_FLOOR_TO_FLOOR, timesSquareFeatureFloorToFloor: TIMES_SQUARE_FEATURE_FLOOR_TO_FLOOR,
    timesSquarePodiumHeight: TIMES_SQUARE_PODIUM_HEIGHT, timesSquareRoadSoffit: TIMES_SQUARE_ROAD_SOFFIT,
    timesSquareRoadVehicleClearance: TIMES_SQUARE_ROAD_VEHICLE_CLEARANCE, timesSquareCrossingRoadRecords: TIMES_SQUARE_CROSSING_ROADS.length,
    timesSquareMallSourceVertices: 22, timesSquareTowerOneSourceVertices: 13, timesSquareTowerTwoSourceVertices: 13,
    timesSquareLanduseSourceVertices: 21, timesSquareMallRingArea: TIMES_SQUARE_SITE.ringArea,
    timesSquareTowerOneRingArea: TIMES_SQUARE_TOWER_ONE_SITE.ringArea, timesSquareTowerTwoRingArea: TIMES_SQUARE_TOWER_TWO_SITE.ringArea,
    timesSquareGlassPanels: podium.glassPanels + towerOne.glassPanels + towerTwo.glassPanels + atrium.glassPanels,
    timesSquareHorizontalBands: podium.horizontalBands + towerOne.horizontalBands + towerTwo.horizontalBands,
    timesSquareOpenRoadBays: street.openRoadBays, timesSquareEntranceBays: street.entranceBays,
    timesSquareClosedStreetBays: street.closedBays, timesSquareStreetColumns: street.columnCount,
    timesSquarePiazzaTriangles: piazza.pavingTriangles, timesSquareClockFaces: clock.faces, timesSquareClockDomeRibs: clock.ribs,
    timesSquarePlazaGround: grounds.plaza, timesSquareColliders: colliders.length
  };
  return { group, colliders, landmarks: [landmark], stats, groundOffset, grounds, plazaTop: grounds.plaza,
    groundHeightAt: (x, z, ground) => timesSquareGroundHeightAt(x, z, ground, grounds) };
}
