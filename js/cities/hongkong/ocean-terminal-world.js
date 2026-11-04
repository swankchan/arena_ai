import * as THREE from 'three/webgpu';
import {
  OCEAN_TERMINAL_SITE, OCEAN_TERMINAL_MAIN_ENTRANCE, OCEAN_TERMINAL_EXTENSION_LEVELS,
  OCEAN_TERMINAL_EXTENSION_COMPLETION, OCEAN_TERMINAL_EXTENSION_ARCHITECT,
  OCEAN_TERMINAL_EXTENSION_EXECUTIVE_ARCHITECT, OCEAN_TERMINAL_EXTENSION_GFA_SQM,
  OCEAN_TERMINAL_ROAD_SOFFIT, HARBOUR_CITY_ROAD_LINTEL_DEPTH,
  harbourCityRingColliders, harbourCitySegmentCollider, harbourCityLocalCollider,
  harbourCityRoadRecords, harbourCityPodiumBayConflict,
  harbourCityGroundHeightAt, harbourCityLocalToWorld
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import { pointInFlatRing } from './landmark-site.js';
import {
  store, quad, meshStore, merged, box, cylinder, beam, point, edgeBox, roofGeometry,
  harbourCityPalette, createStreetLevel, ringBand, addEdgeSign, addEntranceCanopy, signMesh, hash
} from './harbour-city-world-utils.js';

// The western joint is a photo-directed modelling plane, not a surveyed structural gridline. The complete OSM ring
// remains authoritative; clipping only separates the 1966 terminal and the 2017 cascading extension inside that ring.
export const OCEAN_TERMINAL_EXTENSION_JOINT_X = -105;
export const OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT = 4.4;
export const OCEAN_TERMINAL_MAIN_ROOF = 18;
export const OCEAN_TERMINAL_ROOF_CANOPY = 24;
export const OCEAN_TERMINAL_LCX_LEVEL = 3;
const WATER_LEVEL = -2.2;

function clipRingX(ring, boundary, keepLess) {
  const output = [], inside = (x) => keepLess ? x <= boundary + 1e-7 : x >= boundary - 1e-7;
  for (let i = 0; i < ring.length - 2; i += 2) {
    const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], aIn = inside(ax), bIn = inside(bx);
    if (aIn) output.push(ax, az);
    if (aIn !== bIn) { const t = (boundary - ax) / (bx - ax); output.push(boundary, az + (bz - az) * t); }
  }
  if (output.length < 6) return Object.freeze([]);
  if (Math.hypot(output[0] - output[output.length - 2], output[1] - output[output.length - 1]) > 1e-7) output.push(output[0], output[1]);
  return Object.freeze(output);
}
function narrowRing(ring, factor = .78) { return Object.freeze(ring.map((value, index) => index % 2 ? value * factor : value)); }
function localExtremeEdge(ring, axis, direction) {
  let best = -Infinity, result = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) { const i = edge * 2, value = (ring[i + (axis === 'z' ? 1 : 0)] + ring[i + 2 + (axis === 'z' ? 1 : 0)]) * .5 * direction; if (value > best) { best = value; result = edge; } }
  return result;
}
function withRing(site, ring) { return { ...site, localRing: ring }; }
function absoluteColliders(colliders, base) { return colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base })); }
function addRoof(group, ring, y, material, name) {
  if (!ring.length) return null; const mesh = new THREE.Mesh(roofGeometry(ring, y), material); mesh.name = name;
  mesh.receiveShadow = true; mesh.castShadow = true; group.add(mesh); return mesh;
}
function addGlazedLevel(group, site, y0, y1, materials, options = {}) {
  const glass = store(), backing = store(), fins = [], slabs = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const bays = Math.max(1, Math.ceil(length / (options.bayWidth ?? 3.2))), p = (t, y, o = .03) => point(site, edge, t, y, o);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + .001, t1 = (bay + 1) / bays - .001, variation = hash(edge, bay, Math.round(y0 * 10));
      quad(backing, p(t0, y0 + .25, -.22), p(t1, y0 + .25, -.22), p(t1, y1 - .42, -.22), p(t0, y1 - .42, -.22), [.08, .12, .13], .05 + variation * .2);
      quad(glass, p(t0, y0 + .3), p(t1, y0 + .3), p(t1, y1 - .48), p(t0, y1 - .48),
        options.old ? [.10 + variation * .06, .25 + variation * .08, .28 + variation * .09] : [.12 + variation * .08, .27 + variation * .09, .30 + variation * .1], .08 + variation * .2);
      const q = p(bay / bays, (y0 + y1) * .5, .1); box(fins, q, [options.old ? .22 : .12, y1 - y0, options.old ? .48 : .22]);
    }
    edgeBox(slabs, site, edge, .5, y0 + .12, .08, length + .05, .24, .28);
    edgeBox(slabs, site, edge, .5, y1 - .22, .12, length + .06, .44, .38);
  }
  meshStore(group, backing, materials.interior, `${options.name ?? 'Terminal'} interior backing`, false);
  meshStore(group, glass, materials.glazing, `${options.name ?? 'Terminal'} glazing`, false);
  merged(group, fins, materials.white, `${options.name ?? 'Terminal'} vertical fins`);
  merged(group, slabs, materials.white, `${options.name ?? 'Terminal'} floor edges`);
}
function addTerraceRail(group, site, y, materials, name) {
  const rails = [], louvres = [], glass = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const count = Math.max(1, Math.ceil(length / 1.8));
    edgeBox(rails, site, edge, .5, y + 1.08, .08, length + .04, .09, .1);
    edgeBox(glass, site, edge, .5, y + .58, .05, length, .94, .055);
    for (let i = 0; i <= count; i++) {
      const t = i / count, a = point(site, edge, t, y + .04, .12), b = point(site, edge, t, y - .85, -.28);
      beam(louvres, a, b, .075, .12);
    }
  }
  merged(group, rails, materials.white, `${name} handrails`); merged(group, louvres, materials.white, `${name} angled balustrades and louvres`);
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x91b8bd, transparent: true, opacity: .34, roughness: .16, metalness: .18, depthWrite: false });
  merged(group, glass, glassMaterial, `${name} glass balustrades`, false);
}
function addGrandSteps(group, ring, level, materials) {
  const edge = localExtremeEdge(ring, 'z', -1), site = withRing(OCEAN_TERMINAL_SITE, ring), frame = point(site, edge, .5, 0, 0);
  const minX = Math.min(...ring.filter((_, i) => i % 2 === 0)), y0 = level * OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT;
  const z = frame[2] + 1.25, startX = minX + 2.2, run = 16.5, steps = 22, treads = [], rails = [], glass = [];
  for (let i = 0; i < steps; i++) {
    const t = (i + .5) / steps; box(treads, [startX + run * t, y0 + OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT * (i + 1) / steps, z], [run / steps + .025, .13, 2.15]);
  }
  for (const side of [-1, 1]) {
    const zz = z + side * 1.08; beam(rails, [startX, y0 + 1.05, zz], [startX + run, y0 + OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT + 1.05, zz], .08);
    beam(rails, [startX, y0 + .12, zz], [startX + run, y0 + OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT + .12, zz], .12);
    for (let i = 0; i <= 5; i++) { const t = i / 5; beam(rails, [startX + run * t, y0 + OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT * t, zz], [startX + run * t, y0 + OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT * t + 1.05, zz], .055); }
  }
  merged(group, treads, materials.paleStone, `Extension glazed grand-step flight ${level + 1}`); merged(group, rails, materials.metal, `Extension stair rails ${level + 1}`);
}
function addQuay(group, base, materials) {
  const site = OCEAN_TERMINAL_SITE, wall = store(), fenders = [], bollards = [], rails = [], colliders = [];
  addRoof(group, site.localRing, 0, materials.roof, 'Continuous marine deck inside the exact OSM pier ring');
  const bottom = WATER_LEVEL - base;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const p = (t, y, o = 0) => point(site, edge, t, y, o);
    quad(wall, p(0, bottom), p(1, bottom), p(1, 0), p(0, 0), [.32, .34, .32]);
    const bays = Math.max(1, Math.ceil(length / 4));
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, mid = (t0 + t1) * .5, local = p(mid, 0, 0), world = harbourCityLocalToWorld(site, local[0], local[2]);
      if (harbourCityPodiumBayConflict(site, edge, t0, t1, .15)) continue;
      if (world.x < 860) {
        edgeBox(fenders, site, edge, mid, -1.25, .24, Math.min(2.2, length / bays * .7), 2.5, .42);
        const b = p(mid, .34, -.55); cylinder(bollards, b, .16, .68, 10); box(bollards, [b[0], .63, b[2]], [.58, .14, .2]);
        colliders.push(harbourCitySegmentCollider(site, edge, t0, t1, base, base + 1.08, .24));
        edgeBox(rails, site, edge, mid, 1.02, 0, length / bays + .02, .075, .09);
      }
    }
  }
  meshStore(group, wall, materials.interior, 'Quay walls down to the harbour waterline');
  merged(group, fenders, materials.dark, 'Marine rubber fenders'); merged(group, bollards, materials.metal, 'Mooring bitts'); merged(group, rails, materials.metal, 'Quay safety rails');
  return colliders;
}
function addRooftopParking(group, oldCore, materials) {
  const markings = [], cars = [], carGlass = [], canopy = [], columns = [];
  for (let x = -72; x <= 158; x += 6) for (const z of [-8.2, 8.2]) {
    if (!pointInFlatRing(oldCore.localRing, x, z)) continue;
    box(markings, [x, OCEAN_TERMINAL_MAIN_ROOF + .055, z], [.11, .035, 4.8]);
    if (hash(x, z, 4) > .28) {
      const colour = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hash(x, z, 8), .12, .42 + hash(x, z, 9) * .35), roughness: .42, metalness: .32 });
      const car = new THREE.Mesh(new THREE.BoxGeometry(3.9, .85, 1.75), colour); car.position.set(x + 2.25, OCEAN_TERMINAL_MAIN_ROOF + .62, z); car.castShadow = true; group.add(car);
      box(carGlass, [x + 2.1, OCEAN_TERMINAL_MAIN_ROOF + 1.18, z], [2.05, .52, 1.55]);
    }
  }
  for (let x = -70; x < 150; x += 12) if (pointInFlatRing(oldCore.localRing, x, 0)) box(markings, [x, OCEAN_TERMINAL_MAIN_ROOF + .06, 0], [5.5, .035, .12]);
  // OSM height=24 and roof:height=6 are expressed as an open six-metre rooftop canopy, not another enclosed tower.
  box(canopy, [128, OCEAN_TERMINAL_ROOF_CANOPY, 0], [35, .28, 15]);
  for (const x of [113, 128, 143]) for (const z of [-6.3, 6.3]) box(columns, [x, 21, z], [.24, 6, .24]);
  merged(group, markings, materials.white, 'Rooftop car-park painted bays', false); merged(group, carGlass, materials.dark, 'Rooftop parked-car glazing');
  merged(group, canopy, materials.white, 'Six-metre rooftop canopy'); merged(group, columns, materials.white, 'Rooftop canopy columns');
}

export function buildOceanTerminal(scene, { groundOffset } = {}) {
  const site = OCEAN_TERMINAL_SITE, base = groundOffset ?? harbourCityPadHeight(site.key), root = new THREE.Group(); root.name = 'Harbour City — Ocean Terminal, LCX and 2017 extension';
  const group = new THREE.Group(); group.name = 'Ocean Terminal authored local frame'; group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const materials = harbourCityPalette({ stone: [.63, .64, .60], paleStone: [.86, .86, .81], metal: [.31, .36, .37], roof: [.42, .43, .40] });
  materials.glazing.side = THREE.DoubleSide;
  const oldRing = clipRingX(site.localRing, OCEAN_TERMINAL_EXTENSION_JOINT_X, false), oldCore = withRing(site, narrowRing(oldRing, .78));
  const colliders = addQuay(group, base, materials);
  const entranceEdge = OCEAN_TERMINAL_MAIN_ENTRANCE.sourceEdge;
  const street = createStreetLevel(oldCore, { soffit: OCEAN_TERMINAL_ROAD_SOFFIT, customEdges: [entranceEdge], glassA: [.05, .14, .16], glassB: [.16, .29, .30] });
  meshStore(group, street.backing, materials.interior, 'Ocean Terminal ground-floor interiors'); meshStore(group, street.glass, materials.glazing, 'Ocean Terminal service and mall glazing');
  meshStore(group, street.stone, materials.interior, 'Ocean Terminal ground-floor stone spandrels'); merged(group, street.frames, materials.white, 'Road-safe eight-metre lintels'); merged(group, street.columns, materials.white, 'Road-safe terminal columns');
  colliders.push(...absoluteColliders(street.colliders, base));
  // The old terminal keeps its white vertical fins, two broad glazing bands and open rooftop car park.
  addGlazedLevel(group, oldCore, 8, 13, materials, { old: true, name: 'Ocean Terminal L2' });
  addGlazedLevel(group, oldCore, 13, OCEAN_TERMINAL_MAIN_ROOF, materials, { old: true, name: 'LCX L3' });
  colliders.push(...harbourCityRingColliders(oldCore, base + 8, base + OCEAN_TERMINAL_MAIN_ROOF));
  addEntranceCanopy(group, oldCore, entranceEdge, materials, { name: 'Ocean Terminal Canton Road entrance canopy', width: 24, projection: 5.2, y: 5.1 });
  addRoof(group, oldCore.localRing, OCEAN_TERMINAL_MAIN_ROOF, materials.roof, 'Old Ocean Terminal rooftop car park');
  addRooftopParking(group, oldCore, materials);
  const parapets = []; ringBand(parapets, oldCore, 18.55, 1.1, .05, .24); merged(group, parapets, materials.white, 'Old terminal rooftop parapet and flagpole rhythm');
  // Five cascading storeys. Every slab stays inside the source ring; successive glazed cores step back from the sea.
  const extensionLevels = [];
  for (let level = 0; level < OCEAN_TERMINAL_EXTENSION_LEVELS; level++) {
    const xMin = -191 + level * 7.5, terraceRing = clipRingX(site.localRing, xMin, false).length ? clipRingX(clipRingX(site.localRing, OCEAN_TERMINAL_EXTENSION_JOINT_X, true), xMin, false) : [];
    if (!terraceRing.length) continue;
    const core = withRing(site, narrowRing(terraceRing, .78)), y0 = level * OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT, y1 = y0 + OCEAN_TERMINAL_EXTENSION_FLOOR_HEIGHT;
    addGlazedLevel(group, core, y0, y1, materials, { name: `2017 extension L${level}`, bayWidth: 3.05 });
    addRoof(group, terraceRing, y1, materials.paleStone, `Extension cantilevered terrace ${level + 1}`);
    addTerraceRail(group, withRing(site, terraceRing), y1, materials, `Extension terrace ${level + 1}`);
    colliders.push(...harbourCityRingColliders(core, base + y0, base + y1));
    if (level < 4) addGrandSteps(group, terraceRing, level, materials);
    extensionLevels.push({ level, y0, y1, xMin, vertices: terraceRing.length / 2 - 1 });
  }
  // Public roof lawn, paving, grandstand and the light V-supported atrium canopy are separate authored features.
  const roofLawn = new THREE.Mesh(new THREE.BoxGeometry(24, .12, 10), materials.lawn); roofLawn.position.set(-137, 22.12, 7.5); roofLawn.name = 'Ocean Terminal Deck roof lawn'; group.add(roofLawn);
  const deck = [], grandstand = [], canopy = [], supports = [], lights = [];
  box(deck, [-137, 22.08, -4], [48, .12, 11]);
  for (let i = 0; i < 5; i++) box(grandstand, [-174 + i * 1.05, 22.18 + i * .32, -2], [1.1, .32 + i * .64, 12]);
  box(canopy, [-124, 24, -2], [35, .24, 8]);
  for (const x of [-137, -111]) { beam(supports, [x - 3, 22.1, -5], [x, 23.9, -2], .18); beam(supports, [x + 3, 22.1, 1], [x, 23.9, -2], .18); }
  for (let level = 1; level <= 5; level++) box(lights, [-155 + level * 4, level * 4.4 - .28, -20], [16, .055, .08]);
  merged(group, deck, materials.roof, 'Ocean Terminal Deck paving'); merged(group, grandstand, materials.paleStone, 'Harbour-facing grandstand seating');
  merged(group, canopy, materials.white, 'Extension atrium canopy'); merged(group, supports, materials.white, 'V-shaped canopy supports'); merged(group, lights, materials.warmLight, 'Terrace soffit lighting', false);
  // Permanent identity and wayfinding only; no temporary tenant / event artwork is baked into the building.
  addEdgeSign(group, oldCore, entranceEdge, '海運大廈  OCEAN TERMINAL', 'HARBOUR CITY  ·  LCX — L3', 10.8, 23, 3.1, .7, { background: '#e8e7df', foreground: '#273b3d', accent: '#8b7448' });
  const deckSign = signMesh('OCEAN TERMINAL DECK', '海運大廈頂層觀景台  ·  OPEN PUBLIC DECK', 18, 2.2, { background: '#e8e8e1', foreground: '#2b3c3d' });
  deckSign.position.set(-150, 23.1, -7); deckSign.rotation.y = Math.PI * .5; group.add(deckSign);
  // LCX is retained in the permanent main sign as the official Ocean Terminal L3 shopping section.
  scene.add(root);
  const landmark = { id: 'ocean-terminal', name: '海運大廈 Ocean Terminal · LCX', position: { x: site.x, y: base, z: site.z }, radius: 205, height: 24 };
  const stats = {
    oceanTerminalSourceVertices: site.ring.length / 2 - 1, oceanTerminalRingArea: site.ringArea,
    oceanTerminalExtensionLevels: extensionLevels.length, oceanTerminalExtensionTerraces: extensionLevels.length,
    oceanTerminalExtensionCompletion: OCEAN_TERMINAL_EXTENSION_COMPLETION, oceanTerminalExtensionArchitect: OCEAN_TERMINAL_EXTENSION_ARCHITECT,
    oceanTerminalExtensionExecutiveArchitect: OCEAN_TERMINAL_EXTENSION_EXECUTIVE_ARCHITECT, oceanTerminalExtensionGfaSqm: OCEAN_TERMINAL_EXTENSION_GFA_SQM,
    oceanTerminalLcxLevel: OCEAN_TERMINAL_LCX_LEVEL, oceanTerminalRoadCrossings: site.roadIds.length,
    oceanTerminalOpenRoadBays: street.openRoadBays, oceanTerminalClosedRoadBays: street.closedBays,
    oceanTerminalRoadSoffit: OCEAN_TERMINAL_ROAD_SOFFIT, oceanTerminalRoadLintelDepth: HARBOUR_CITY_ROAD_LINTEL_DEPTH,
    oceanTerminalRooftopCanopyHeight: OCEAN_TERMINAL_ROOF_CANOPY, oceanTerminalQuayColliders: colliders.length
  };
  return {
    root, group, colliders, landmarks: [landmark], stats, groundOffset: base, site, roads: harbourCityRoadRecords(site), extensionLevels,
    groundHeightAt: (x, z, ground) => harbourCityGroundHeightAt(site, x, z, ground, { deck: base + .12 }),
    metadata: { source: site.source, extensionJointLocalX: OCEAN_TERMINAL_EXTENSION_JOINT_X, jointEvidence: 'Photo-directed visual joint only; not a surveyed structural dimension.', lcx: 'Official Harbour City directory: Ocean Terminal L3 OT300.' }
  };
}
