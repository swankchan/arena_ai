import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CULTURAL_CENTRE_SITE, CULTURAL_CENTRE_MAIN_RING, CULTURAL_CENTRE_ADMIN_RING,
  CULTURAL_CENTRE_MAIN_ENTRANCE, CULTURAL_CENTRE_PARTITION_T, CULTURAL_CENTRE_PARTITION_POINT,
  CULTURAL_CENTRE_OPENING_YEAR, CULTURAL_CENTRE_SITE_HECTARES, CULTURAL_CENTRE_GROSS_FLOOR_AREA,
  CULTURAL_CENTRE_ADMIN_HEIGHT, CULTURAL_CENTRE_SAIL_BASE_HEIGHT, CULTURAL_CENTRE_EAST_PEAK_HEIGHT,
  CULTURAL_CENTRE_HARBOUR_CHAIN_EDGES, CULTURAL_CENTRE_CHAIN_LENGTH,
  culturalCentreChainNearest, culturalCentreChainFrameAtDistance, culturalCentreRoadRecords,
  culturalCentreTerrainHeightAt, harbourCityLocalToWorld,
} from './cultural-centre-architecture.js';
import { harbourCityLocalCollider, harbourCitySegmentCollider } from './harbour-city-architecture.js';
import { culturalCentrePadHeight, rawHongKongTerrainHeight } from './terrain.js';
import {
  merged, box, cylinder, beam, point, edgeBox, roofGeometry, ringFrame,
  nightAmount, store, quad, meshStore,
} from './harbour-city-world-utils.js';

function geometry(positions, indices = null) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (indices) g.setIndex(indices);
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function addQuad(positions, indices, a, b, c, d) {
  const i = positions.length / 3; positions.push(...a, ...b, ...c, ...d); indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
}
function densifyRing(ring, step = 3) {
  const result = [];
  for (let i = 0; i < ring.length - 2; i += 2) {
    const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], length = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(length / step));
    for (let j = 0; j < n; j += 1) result.push(ax + (bx - ax) * j / n, az + (bz - az) * j / n);
  }
  result.push(ring[0], ring[1]); return result;
}
function sailRoofGeometry(ring) {
  const dense = densifyRing(ring), contour = [];
  for (let i = 0; i < dense.length - 2; i += 2) contour.push(new THREE.Vector2(dense[i], dense[i + 1]));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []), positions = [], indices = [], subdivisions = 3;
  const heightAt = (x, z) => culturalCentreChainNearest(x, z).height;
  for (const triangle of triangles) {
    const a = contour[triangle[0]], b = contour[triangle[1]], c = contour[triangle[2]], vertices = new Map();
    const indexAt = (i, j) => {
      const key = `${i},${j}`; if (vertices.has(key)) return vertices.get(key);
      const u = i / subdivisions, v = j / subdivisions, w = 1 - u - v, x = a.x * w + b.x * u + c.x * v, z = a.y * w + b.y * u + c.y * v;
      const index = positions.length / 3; positions.push(x, heightAt(x, z), z); vertices.set(key, index); return index;
    };
    const addTriangle = (ia, ib, ic) => {
      const ai = ia * 3, bi = ib * 3, ci = ic * 3;
      const abx = positions[bi] - positions[ai], abz = positions[bi + 2] - positions[ai + 2];
      const acx = positions[ci] - positions[ai], acz = positions[ci + 2] - positions[ai + 2];
      if (abz * acx - abx * acz < 0) indices.push(ia, ic, ib); else indices.push(ia, ib, ic);
    };
    for (let i = 0; i < subdivisions; i += 1) for (let j = 0; j < subdivisions - i; j += 1) {
      addTriangle(indexAt(i, j), indexAt(i + 1, j), indexAt(i, j + 1));
      if (i + j <= subdivisions - 2) addTriangle(indexAt(i + 1, j), indexAt(i + 1, j + 1), indexAt(i, j + 1));
    }
  }
  return geometry(positions, indices);
}

const outerSailSegments = () => [
  ...CULTURAL_CENTRE_HARBOUR_CHAIN_EDGES.map((edge) => ({ edge, t0: 0, t1: 1 })),
  { edge: 10, t0: 0, t1: CULTURAL_CENTRE_PARTITION_T },
];
function sampleSegment(site, segment, y, offset, t) {
  const u = segment.t0 + (segment.t1 - segment.t0) * t;
  return point(site, segment.edge, u, y, offset);
}
function sailWallsAndSkirts(site) {
  const walls = { positions: [], indices: [] }, skirts = { positions: [], indices: [] }, internal = { positions: [], indices: [] };
  const tiles = [], caps = [], fins = [], uplights = [], recesses = store();
  for (const segment of outerSailSegments()) {
    const frame = ringFrame(site, segment.edge), length = frame.length * (segment.t1 - segment.t0), n = Math.max(1, Math.ceil(length / 3));
    for (let i = 0; i < n; i += 1) {
      const t0 = i / n, t1 = (i + 1) / n;
      const a = sampleSegment(site, segment, 0, 0, t0), b = sampleSegment(site, segment, 0, 0, t1);
      const ah = culturalCentreChainNearest(a[0], a[2]).height, bh = culturalCentreChainNearest(b[0], b[2]).height;
      const aBase = sampleSegment(site, segment, CULTURAL_CENTRE_SAIL_BASE_HEIGHT, -1, t0), bBase = sampleSegment(site, segment, CULTURAL_CENTRE_SAIL_BASE_HEIGHT, -1, t1);
      const aTop = sampleSegment(site, segment, ah, -1, t0), bTop = sampleSegment(site, segment, bh, -1, t1);
      addQuad(skirts.positions, skirts.indices, a, b, bBase, aBase);
      addQuad(walls.positions, walls.indices, aBase, bBase, bTop, aTop);
      beam(caps, aTop, bTop, .14, .14);
      for (let y = CULTURAL_CENTRE_SAIL_BASE_HEIGHT + 1.15; y < Math.min(ah, bh) - .08; y += 1.15) {
        tiles.push(...sampleSegment(site, segment, y, -.955, t0), ...sampleSegment(site, segment, y, -.955, t1));
      }
      for (let y = 1.1; y < CULTURAL_CENTRE_SAIL_BASE_HEIGHT; y += 1.1) {
        const offset = -y / CULTURAL_CENTRE_SAIL_BASE_HEIGHT + .035;
        tiles.push(...sampleSegment(site, segment, y, offset, t0), ...sampleSegment(site, segment, y, offset, t1));
      }
      tiles.push(...sampleSegment(site, segment, CULTURAL_CENTRE_SAIL_BASE_HEIGHT, -.95, t0), ...sampleSegment(site, segment, ah, -.95, t0));
    }
    const bays = Math.max(1, Math.ceil(length / 5.5));
    for (let bay = 0; bay < bays; bay += 1) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, mid = (t0 + t1) * .5;
      beam(fins, sampleSegment(site, segment, .08, .14, t0), sampleSegment(site, segment, CULTURAL_CENTRE_SAIL_BASE_HEIGHT, -1, t0), .55, .52);
      const half = Math.min(.34 / bays, .72 / length), y0 = .55, y1 = 4.35;
      const offset0 = -y0 / CULTURAL_CENTRE_SAIL_BASE_HEIGHT + .055, offset1 = -y1 / CULTURAL_CENTRE_SAIL_BASE_HEIGHT + .055;
      quad(recesses,
        sampleSegment(site, segment, y0, offset0, mid - half), sampleSegment(site, segment, y0, offset0, mid + half),
        sampleSegment(site, segment, y1, offset1, mid + half), sampleSegment(site, segment, y1, offset1, mid - half), [.12, .13, .13]);
      if (bay % 2 === 0) box(uplights, sampleSegment(site, segment, .14, .52, mid), [.3, .22, .3]);
    }
  }
  // The high internal return closes the auditorium roof behind the lower administration strip.
  const a = { x: CULTURAL_CENTRE_PARTITION_POINT[0], z: CULTURAL_CENTRE_PARTITION_POINT[1] }, b = { x: CULTURAL_CENTRE_SITE.localRing[0], z: CULTURAL_CENTRE_SITE.localRing[1] };
  const length = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(length / 3);
  for (let i = 0; i < n; i += 1) {
    const t0 = i / n, t1 = (i + 1) / n, x0 = a.x + (b.x - a.x) * t0, z0 = a.z + (b.z - a.z) * t0, x1 = a.x + (b.x - a.x) * t1, z1 = a.z + (b.z - a.z) * t1;
    const h0 = culturalCentreChainNearest(x0, z0).height, h1 = culturalCentreChainNearest(x1, z1).height;
    addQuad(internal.positions, internal.indices, [x0, 0, z0], [x1, 0, z1], [x1, h1, z1], [x0, h0, z0]);
  }
  return { walls, skirts, internal, tiles, caps, fins, uplights, recesses };
}

function adminOuterSegments() { return [{ edge: 10, t0: CULTURAL_CENTRE_PARTITION_T, t1: 1 }, { edge: 11, t0: 0, t1: 1 }, { edge: 12, t0: 0, t1: 1 }]; }
function adminWalls(site) {
  const positions = [], indices = [], tiles = [];
  for (const segment of adminOuterSegments()) {
    const length = ringFrame(site, segment.edge).length * (segment.t1 - segment.t0), n = Math.max(1, Math.ceil(length / 3));
    for (let i = 0; i < n; i += 1) {
      const t0 = i / n, t1 = (i + 1) / n;
      addQuad(positions, indices, sampleSegment(site, segment, 0, 0, t0), sampleSegment(site, segment, 0, 0, t1),
        sampleSegment(site, segment, CULTURAL_CENTRE_ADMIN_HEIGHT, 0, t1), sampleSegment(site, segment, CULTURAL_CENTRE_ADMIN_HEIGHT, 0, t0));
      for (const y of [1.15, 2.3, 3.45, 4.6, 8.35, 9.5, 13.25, 14.4, 15.55]) tiles.push(...sampleSegment(site, segment, y, .035, t0), ...sampleSegment(site, segment, y, .035, t1));
      tiles.push(...sampleSegment(site, segment, .15, .035, t0), ...sampleSegment(site, segment, CULTURAL_CENTRE_ADMIN_HEIGHT, .035, t0));
    }
  }
  return { geometry: geometry(positions, indices), tiles };
}
function facadeGroup(parent, site, edge, t, name) {
  const frame = ringFrame(site, edge, t), group = new THREE.Group(); group.name = name;
  group.position.set(frame.x, 0, frame.z); group.rotation.y = frame.ry; parent.add(group); return { group, frame };
}
function facadeToSite(frame, x, z) { return { x: frame.x + x * frame.nz + z * frame.nx, z: frame.z - x * frame.nx + z * frame.nz }; }

function buildAdminFenestration(root, materials) {
  for (const segment of adminOuterSegments()) {
    const t = (segment.t0 + segment.t1) * .5, length = ringFrame(CULTURAL_CENTRE_SITE, segment.edge).length * (segment.t1 - segment.t0);
    const { group } = facadeGroup(root, CULTURAL_CENTRE_SITE, segment.edge, t, `Cultural Centre administration ribbon facade ${segment.edge}`);
    const glass = [], frames = [], spandrels = [];
    for (const y of [6.15, 11.35]) {
      const pane = new THREE.PlaneGeometry(length - 1.1, 1.85); pane.translate(0, y, .075); glass.push(pane);
      const count = Math.max(2, Math.ceil(length / 3));
      for (let i = 0; i <= count; i += 1) box(frames, [-length * .5 + .55 + (length - 1.1) * i / count, y, .12], [.085, 1.95, .11]);
      for (const dy of [-.96, .96]) box(frames, [0, y + dy, .12], [length - 1, .09, .11]);
    }
    for (const y of [4.35, 8.45, 13.45, 16.15]) box(spandrels, [0, y, .04], [length, .22, .1]);
    merged(group, glass, materials.glass, 'Cultural Centre dark horizontal administration glazing', false);
    merged(group, frames, materials.frames, 'Cultural Centre administration ribbon mullions');
    merged(group, spandrels, materials.adminDark, 'Cultural Centre fine tiled spandrel bands');
  }
}

function entranceLettering() {
  if (typeof document === 'undefined') return new THREE.Group();
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#302b28';
  ctx.font = '600 66px Arial, sans-serif'; ctx.fillText('HONG KONG CULTURAL CENTRE', 768, 94, 1420);
  ctx.font = '400 31px Arial, sans-serif'; ctx.fillText('10 SALISBURY ROAD', 768, 178);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: .08, roughness: .72, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 2.58), material); mesh.name = 'Cultural Centre direct entrance lettering'; return mesh;
}
function buildEntrance(root, materials, colliders, base) {
  const entrance = CULTURAL_CENTRE_MAIN_ENTRANCE;
  const { group, frame } = facadeGroup(root, CULTURAL_CENTRE_SITE, entrance.sourceEdge, entrance.t, 'Cultural Centre covered Salisbury Road foyer and arrival');
  const glass = [], frames = [], canopy = [], columns = [], steps = [], rails = [], lights = [], ribs = [];
  const doors = new THREE.PlaneGeometry(18, 3.5); doors.translate(0, 1.9, .13); glass.push(doors);
  for (let i = 0; i <= 10; i += 1) box(frames, [-9 + i * 1.8, 1.9, .19], [.09, 3.6, .12]);
  for (const y of [.15, 3.68]) box(frames, [0, y, .19], [18.2, .1, .12]);
  box(canopy, [0, 4.15, 2.45], [24, .32, 5.3]); box(canopy, [0, 3.88, 4.95], [24, .7, .28]);
  box(canopy, [-18, 4.08, 2.65], [9.4, .26, 5.4]);
  for (const x of [-10, 10]) {
    cylinder(columns, [x, 2.02, 4.05], .43, 4.04, 16);
    const p = facadeToSite(frame, x, 4.05); colliders.push(harbourCityLocalCollider(CULTURAL_CENTRE_SITE, p.x, p.z, .9, .9, base, base + 4.15));
  }
  for (let i = 0; i < 3; i += 1) box(steps, [0, .035 + i * .035, 5.45 + i * .42], [24 - i * .3, .07 + i * .07, .46]);
  const ramp = new THREE.BoxGeometry(2.2, .12, 6.4); ramp.rotateX(Math.atan2(.2, 6.4)); ramp.translate(13.2, .13, 4.15); steps.push(ramp);
  for (const x of [12.02, 14.38]) {
    for (const h of [.55, 1]) beam(rails, [x, .24 + h, 1], [x, .06 + h, 7.25], .05, .05);
    for (let i = 0; i <= 4; i += 1) { const z = 1 + i * 1.56, y = .24 - i / 4 * .18; beam(rails, [x, y, z], [x, y + 1.02, z], .05, .05); }
  }
  for (const x of [-8, -4, 0, 4, 8]) for (const z of [1.6, 3.6]) cylinder(lights, [x, 3.965, z], .16, .035, 14);
  for (let i = 0; i < 6; i += 1) {
    const x = -21 + i * 1.15, curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 4.25, .6), new THREE.Vector3(x, 6.65, 1.8),
      new THREE.Vector3(x, 7.05, 3.5), new THREE.Vector3(x, 4.55, 5.1),
    ]);
    ribs.push(new THREE.TubeGeometry(curve, 18, .17, 6, false));
  }
  merged(group, glass, materials.glass, 'Cultural Centre automatic foyer doors and glazing', false);
  merged(group, frames, materials.frames, 'Cultural Centre entrance door mullions');
  merged(group, canopy, materials.admin, 'Cultural Centre deep tiled entrance canopy');
  merged(group, columns, materials.admin, 'Cultural Centre round tiled canopy columns');
  merged(group, steps, materials.paving, 'Cultural Centre shallow arrival steps and accessible ramp');
  merged(group, rails, materials.frames, 'Cultural Centre arrival stainless-steel handrails');
  merged(group, lights, materials.warmLight, 'Cultural Centre warm canopy downlights', false);
  merged(group, ribs, materials.admin, 'Cultural Centre six curved entrance canopy ribs');
  const lettering = entranceLettering(); lettering.position.set(0, 3.88, 5.105); group.add(lettering);
  return group;
}

function palmLeaves(crown) {
  const positions = [], indices = [];
  for (let frond = 0; frond < 9; frond += 1) {
    const angle = frond / 9 * Math.PI * 2 + .18, dx = Math.cos(angle), dz = Math.sin(angle), px = -dz, pz = dx;
    for (let segment = 0; segment < 4; segment += 1) {
      const pointAt = (i) => {
        const r = i / 4 * 3.5, y = crown[1] + Math.sin(i / 4 * Math.PI) * .55 - i / 4 * .72, width = [.16, .52, .58, .4, .04][i];
        return { c: [crown[0] + dx * r, y, crown[2] + dz * r], width };
      };
      const a = pointAt(segment), b = pointAt(segment + 1);
      addQuad(positions, indices,
        [a.c[0] + px * a.width, a.c[1], a.c[2] + pz * a.width], [a.c[0] - px * a.width, a.c[1], a.c[2] - pz * a.width],
        [b.c[0] - px * b.width, b.c[1], b.c[2] - pz * b.width], [b.c[0] + px * b.width, b.c[1], b.c[2] + pz * b.width]);
    }
  }
  return geometry(positions, indices);
}
function buildPiazzaLandscape(root, materials, colliders, base) {
  const planters = [], trunks = [], leaves = [], benches = [], benchFrames = [];
  for (const s of [18, 42, 66, 88, 116, 140, 164, 184]) {
    const chain = culturalCentreChainFrameAtDistance(s), p = point(CULTURAL_CENTRE_SITE, chain.edge, chain.t, 0, 4.2), world = harbourCityLocalToWorld(CULTURAL_CENTRE_SITE, p[0], p[2]);
    const ground = rawHongKongTerrainHeight(world.x, world.z), y = ground - base + .04;
    cylinder(planters, [p[0], y + .24, p[2]], 1.02, .48, 16);
    cylinder(trunks, [p[0], y + 2.85, p[2]], .16, 5.25, 10, .11);
    leaves.push(palmLeaves([p[0], y + 5.5, p[2]]));
    colliders.push(harbourCityLocalCollider(CULTURAL_CENTRE_SITE, p[0], p[2], 2.05, 2.05, ground, ground + .5));
    colliders.push(harbourCityLocalCollider(CULTURAL_CENTRE_SITE, p[0], p[2], .42, .42, ground, ground + 5.6));
    const benchChain = culturalCentreChainFrameAtDistance(Math.min(CULTURAL_CENTRE_CHAIN_LENGTH, s + 2.8)), frame = ringFrame(CULTURAL_CENTRE_SITE, benchChain.edge, benchChain.t), bp = point(CULTURAL_CENTRE_SITE, benchChain.edge, benchChain.t, 0, 6.1), bw = harbourCityLocalToWorld(CULTURAL_CENTRE_SITE, bp[0], bp[2]);
    const benchGround = rawHongKongTerrainHeight(bw.x, bw.z), by = benchGround - base + .04;
    box(benches, [bp[0], by + .57, bp[2]], [2.5, .16, .68], frame.ry);
    for (const dx of [-.85, .85]) {
      const q = facadeToSite(frame, dx, 0); // tangent offsets on the source-aligned bench
      const ox = bp[0] + (q.x - frame.x), oz = bp[2] + (q.z - frame.z);
      box(benchFrames, [ox, by + .28, oz], [.18, .55, .52], frame.ry);
    }
    colliders.push(harbourCityLocalCollider(CULTURAL_CENTRE_SITE, bp[0], bp[2], 2.5, .68, benchGround, benchGround + .72, CULTURAL_CENTRE_SITE.ry + frame.ry));
  }
  merged(root, planters, materials.planter, 'Cultural Centre piazza circular palm planters');
  merged(root, trunks, materials.trunk, 'Cultural Centre eight piazza palm trunks');
  merged(root, leaves, materials.leaves, 'Cultural Centre individual curved palm fronds', false);
  merged(root, benches, materials.bench, 'Cultural Centre piazza timber bench slats');
  merged(root, benchFrames, materials.planter, 'Cultural Centre piazza bench concrete supports');
}

function buildWaterfrontViewingArcade(root, materials, colliders, base) {
  const piers = [], deck = [], rails = [], lights = [];
  const deckHeight = 4.8;
  for (let s = 20; s <= 180; s += 16) {
    const chain = culturalCentreChainFrameAtDistance(s);
    const frame = ringFrame(CULTURAL_CENTRE_SITE, chain.edge, chain.t);
    const pOut = point(CULTURAL_CENTRE_SITE, chain.edge, chain.t, 0, 3.8);
    const pIn = point(CULTURAL_CENTRE_SITE, chain.edge, chain.t, 0, 0.4);
    const world = harbourCityLocalToWorld(CULTURAL_CENTRE_SITE, pOut[0], pOut[2]);
    const ground = rawHongKongTerrainHeight(world.x, world.z);
    const y = ground - base;

    beam(piers, [pOut[0], y, pOut[2]], [pIn[0], y + deckHeight, pIn[2]], 0.55, 0.48);
    box(piers, [pOut[0], y + deckHeight * 0.5, pOut[2]], [0.65, deckHeight, 0.45], frame.ry);

    const midX = (pOut[0] + pIn[0]) * 0.5, midZ = (pOut[2] + pIn[2]) * 0.5;
    box(deck, [midX, y + deckHeight, midZ], [15.2, 0.35, 3.8], frame.ry);
    box(rails, [pOut[0], y + deckHeight + 0.65, pOut[2]], [15.2, 1.05, 0.08], frame.ry);
    cylinder(lights, [midX, y + deckHeight - 0.2, midZ], 0.22, 0.06, 8);

    colliders.push(harbourCityLocalCollider(CULTURAL_CENTRE_SITE, pOut[0], pOut[2], 0.7, 0.7, ground, ground + deckHeight, CULTURAL_CENTRE_SITE.ry + frame.ry));
  }
  merged(root, piers, materials.admin, 'Cultural Centre waterfront slanted colonnade piers');
  merged(root, deck, materials.paving, 'Cultural Centre elevated harbour viewing promenade deck');
  merged(root, rails, materials.frames, 'Cultural Centre viewing deck stainless handrails');
  merged(root, lights, materials.warmLight, 'Cultural Centre colonnade soffit downlights', false);
}

function localSegmentCollider(site, a, b, minY, maxY, depth = .5) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  return harbourCityLocalCollider(site, (a[0] + b[0]) * .5, (a[1] + b[1]) * .5, length, depth, minY, maxY, site.ry + Math.atan2(-dz, dx));
}

export function buildCulturalCentre(scene, { groundOffset } = {}) {
  const site = CULTURAL_CENTRE_SITE, base = groundOffset ?? culturalCentrePadHeight(), root = new THREE.Group();
  root.name = 'Hong Kong Cultural Centre — exact OSM ring with twin tiled sails'; root.position.set(site.x, base, site.z); root.rotation.y = site.ry;
  const wall = new THREE.MeshStandardMaterial({ color: 0xb7a294, roughness: .84, metalness: .02, side: THREE.DoubleSide });
  wall.emissiveNode = color(.34, .43, .58).mul(nightAmount()).mul(.025);
  const admin = new THREE.MeshStandardMaterial({ color: 0xb9a596, roughness: .84, metalness: .02, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({ color: 0x172a2c, roughness: .25, metalness: .28, side: THREE.DoubleSide });
  glass.emissiveNode = color(1, .67, .34).mul(nightAmount()).mul(.55);
  const warmLight = new THREE.MeshStandardMaterial({ color: 0xffe1a6, roughness: .45 });
  warmLight.emissiveNode = color(1, .63, .26).mul(nightAmount()).mul(2.1);
  const uplight = new THREE.MeshStandardMaterial({ color: 0xd4dce2, roughness: .42, metalness: .25 });
  uplight.emissiveNode = color(.55, .72, 1).mul(nightAmount()).mul(1.25);
  const materials = {
    wall, admin, glass, warmLight,
    roof: new THREE.MeshStandardMaterial({ color: 0x8e837b, roughness: .88, metalness: .03, side: THREE.DoubleSide }),
    adminDark: new THREE.MeshStandardMaterial({ color: 0x9a887c, roughness: .86, metalness: .02 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b2826, roughness: .8, side: THREE.DoubleSide }),
    frames: new THREE.MeshStandardMaterial({ color: 0x89928f, roughness: .34, metalness: .72 }),
    paving: new THREE.MeshStandardMaterial({ color: 0x8d8580, roughness: .94 }),
    planter: new THREE.MeshStandardMaterial({ color: 0x8c8580, roughness: .9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x756552, roughness: .96 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x315c3c, roughness: .9, side: THREE.DoubleSide }),
    bench: new THREE.MeshStandardMaterial({ color: 0x76543b, roughness: .86 }),
  };

  const sail = sailWallsAndSkirts(site);
  const roof = new THREE.Mesh(sailRoofGeometry(CULTURAL_CENTRE_MAIN_RING), materials.roof); roof.name = 'Cultural Centre continuous winged-chute auditorium roof'; roof.castShadow = true; roof.receiveShadow = true; root.add(roof);
  const highWalls = new THREE.Mesh(geometry(sail.walls.positions, sail.walls.indices), wall); highWalls.name = 'Cultural Centre two concave-profile windowless tiled sail walls'; highWalls.castShadow = true; highWalls.receiveShadow = true; root.add(highWalls);
  const skirt = new THREE.Mesh(geometry(sail.skirts.positions, sail.skirts.indices), wall); skirt.name = 'Cultural Centre inward-sloping lower tiled wall'; skirt.castShadow = true; skirt.receiveShadow = true; root.add(skirt);
  const internal = new THREE.Mesh(geometry(sail.internal.positions, sail.internal.indices), wall); internal.name = 'Cultural Centre high auditorium return behind administration'; internal.castShadow = true; internal.receiveShadow = true; root.add(internal);
  meshStore(root, sail.recesses, materials.dark, 'Cultural Centre repeated dark recesses between sloping tiled fins');
  merged(root, sail.fins, wall, 'Cultural Centre repeated inward-sloping tiled base fins');
  merged(root, sail.caps, materials.admin, 'Cultural Centre fine pale sail coping');
  merged(root, sail.uplights, uplight, 'Cultural Centre restrained cool sail uplight fixtures', false);
  const tileMaterial = new THREE.LineBasicMaterial({ color: 0x6f6058, transparent: true, opacity: .34, depthWrite: false });
  const tileLines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(sail.tiles, 3)), tileMaterial); tileLines.name = 'Cultural Centre small pink ceramic tile joints on sails and sloping base'; root.add(tileLines);

  const adminShell = adminWalls(site), adminMesh = new THREE.Mesh(adminShell.geometry, admin); adminMesh.name = 'Cultural Centre lower administration and Salisbury Road foyer walls'; adminMesh.castShadow = true; adminMesh.receiveShadow = true; root.add(adminMesh);
  const adminRoof = new THREE.Mesh(roofGeometry(CULTURAL_CENTRE_ADMIN_RING, CULTURAL_CENTRE_ADMIN_HEIGHT), materials.roof); adminRoof.name = 'Cultural Centre lower flat administration roof'; adminRoof.receiveShadow = true; root.add(adminRoof);
  const adminTiles = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(adminShell.tiles, 3)), tileMaterial); adminTiles.name = 'Cultural Centre administration ceramic tile courses'; root.add(adminTiles);
  buildAdminFenestration(root, materials);

  const slitFrame = ringFrame(site, 6), slitHeight = culturalCentreChainNearest(slitFrame.x, slitFrame.z).height - CULTURAL_CENTRE_SAIL_BASE_HEIGHT;
  const { group: slit } = facadeGroup(root, site, 6, .5, 'Cultural Centre narrow vertical glazed sail slit');
  const slitGlass = [], slitFrames = [];
  const pane = new THREE.PlaneGeometry(1.45, slitHeight - .25); pane.translate(0, CULTURAL_CENTRE_SAIL_BASE_HEIGHT + slitHeight * .5, -.94); slitGlass.push(pane);
  for (const x of [-.77, .77]) box(slitFrames, [x, CULTURAL_CENTRE_SAIL_BASE_HEIGHT + slitHeight * .5, -.88], [.075, slitHeight, .1]);
  for (let y = CULTURAL_CENTRE_SAIL_BASE_HEIGHT + .2; y < CULTURAL_CENTRE_SAIL_BASE_HEIGHT + slitHeight; y += 2.1) box(slitFrames, [0, y, -.88], [1.55, .075, .1]);
  merged(slit, slitGlass, glass, 'Cultural Centre dark glazed vertical slit', false); merged(slit, slitFrames, materials.frames, 'Cultural Centre narrow slit transoms');

  const colliders = [];
  const entrance = buildEntrance(root, materials, colliders, base);
  buildPiazzaLandscape(root, materials, colliders, base);
  buildWaterfrontViewingArcade(root, materials, colliders, base);
  for (const segment of outerSailSegments()) {
    const mid = sampleSegment(site, segment, 0, 0, .5), height = culturalCentreChainNearest(mid[0], mid[2]).height;
    colliders.push(harbourCitySegmentCollider(site, segment.edge, segment.t0, segment.t1, base, base + height, .5));
  }
  colliders.push(localSegmentCollider(site, CULTURAL_CENTRE_PARTITION_POINT, [site.localRing[0], site.localRing[1]], base, base + CULTURAL_CENTRE_EAST_PEAK_HEIGHT));
  colliders.push(harbourCitySegmentCollider(site, 10, CULTURAL_CENTRE_PARTITION_T, 1, base, base + CULTURAL_CENTRE_ADMIN_HEIGHT));
  colliders.push(harbourCitySegmentCollider(site, 11, 0, 1, base, base + CULTURAL_CENTRE_ADMIN_HEIGHT));
  for (const [t0, t1] of [[0, .42], [.58, 1]]) colliders.push(harbourCitySegmentCollider(site, 12, t0, t1, base, base + CULTURAL_CENTRE_ADMIN_HEIGHT));
  colliders.push(harbourCitySegmentCollider(site, 12, .42, .58, base + 4.25, base + CULTURAL_CENTRE_ADMIN_HEIGHT));

  scene.add(root);
  const landmark = { id: 'hong-kong-cultural-centre', name: site.name, position: { x: site.x, y: base, z: site.z }, radius: 100, height: CULTURAL_CENTRE_EAST_PEAK_HEIGHT };
  return {
    root, entrance, colliders, landmarks: [landmark], groundOffset: base, site,
    roads: culturalCentreRoadRecords(site),
    stats: {
      culturalCentreSourceVertices: 13, culturalCentreRingArea: site.ringArea, culturalCentreOpeningYear: CULTURAL_CENTRE_OPENING_YEAR,
      culturalCentreSiteHectares: CULTURAL_CENTRE_SITE_HECTARES, culturalCentreGrossFloorArea: CULTURAL_CENTRE_GROSS_FLOOR_AREA,
      culturalCentrePeakHeight: CULTURAL_CENTRE_EAST_PEAK_HEIGHT, culturalCentreAdminHeight: CULTURAL_CENTRE_ADMIN_HEIGHT,
      culturalCentreHarbourSailEdges: 10, culturalCentrePiazzaPalms: 8, culturalCentreRoadCrossings: 0,
    },
    groundHeightAt: (x, z, ground) => culturalCentreTerrainHeightAt(x, z, ground, base),
  };
}
