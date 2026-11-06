import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HK_STREET_LIGHTS } from '../../../js/hk-street-light-data.js';
import { fullRoadSurfaceAt } from '../../../js/cities/hongkong/full-meta.js';
import { crossingSurfaceAt } from '../../../js/cities/hongkong/crossings.js';
import { surfaceRoadHeight } from '../../../js/cities/hongkong/road-elevation.js';
import { HK_TRAM_NETWORK } from '../../../js/hk-tram-network-data.js';
import { TIMES_SQUARE_SITE, timesSquareWorldToLocal, timesSquareLocalToWorld } from '../../../js/cities/hongkong/times-square-architecture.js';
import {
  KOWLOON_SHANGRI_LA_SITE, kowloonShangriLaWorldToLocal, kowloonShangriLaLocalToWorld,
} from '../../../js/cities/hongkong/kowloon-shangri-la-architecture.js';
import { majorParkLampConflictAt } from '../../../js/cities/hongkong/major-parks-architecture.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';

const MAX_RELOCATION = 24;
const CARRIAGEWAY_MARGIN = 0.22;
const HEIGHT_TOLERANCE = 2;
const TRAM_TRACK_CLEARANCE = 1.45;
const TRAM_POLE_CLEARANCE = 0.75;
const TRAM_WIRE_CLEARANCE = 0.35;
const TRAM_CELL = 40;
const tramTrackCells = new Map(), tramPoleCells = new Map(), tramWireCells = new Map();
const tramKey = (x, z) => `${Math.floor(x / TRAM_CELL)},${Math.floor(z / TRAM_CELL)}`;
function addTramItem(cells, item, x, z, radius) {
  for (let cx = Math.floor((x - radius) / TRAM_CELL); cx <= Math.floor((x + radius) / TRAM_CELL); cx++) {
    for (let cz = Math.floor((z - radius) / TRAM_CELL); cz <= Math.floor((z + radius) / TRAM_CELL); cz++) {
      const key = `${cx},${cz}`;
      let list = cells.get(key); if (!list) cells.set(key, (list = []));
      list.push(item);
    }
  }
}
for (const track of HK_TRAM_NETWORK.tracks) {
  for (let index = 3; index < track.points.length; index += 3) {
    const item = {
      ax: track.points[index - 3], az: track.points[index - 1],
      bx: track.points[index], bz: track.points[index + 2]
    };
    item.dx = item.bx - item.ax; item.dz = item.bz - item.az; item.lengthSq = item.dx * item.dx + item.dz * item.dz || 1;
    addTramItem(tramTrackCells, item, (item.ax + item.bx) * 0.5, (item.az + item.bz) * 0.5, Math.hypot(item.dx, item.dz) * 0.5 + TRAM_TRACK_CLEARANCE);
  }
}
for (const span of HK_TRAM_NETWORK.spans) {
  for (const pole of [span.left, span.right]) addTramItem(tramPoleCells, { x: pole[0], z: pole[2] }, pole[0], pole[2], TRAM_POLE_CLEARANCE);
  const item = { ax: span.left[0], az: span.left[2], bx: span.right[0], bz: span.right[2] };
  item.dx = item.bx - item.ax; item.dz = item.bz - item.az; item.lengthSq = item.dx * item.dx + item.dz * item.dz || 1;
  addTramItem(tramWireCells, item, (item.ax + item.bx) * 0.5, (item.az + item.bz) * 0.5, Math.hypot(item.dx, item.dz) * 0.5 + TRAM_WIRE_CLEARANCE);
}
function closestTramItem(cells, x, z, clearance) {
  let best = null;
  for (const item of cells.get(tramKey(x, z)) || []) {
    if (Number.isFinite(item.x)) {
      const distance = Math.hypot(x - item.x, z - item.z);
      if (distance < clearance && (!best || distance < best.distance)) best = { item, distance, x: item.x, z: item.z };
      continue;
    }
    const t = Math.max(0, Math.min(1, ((x - item.ax) * item.dx + (z - item.az) * item.dz) / item.lengthSq));
    const px = item.ax + item.dx * t, pz = item.az + item.dz * t, distance = Math.hypot(x - px, z - pz);
    if (distance < clearance && (!best || distance < best.distance)) best = { item, distance, x: px, z: pz };
  }
  return best;
}
function tramConflictAt(x, z) {
  const track = closestTramItem(tramTrackCells, x, z, TRAM_TRACK_CLEARANCE);
  const pole = closestTramItem(tramPoleCells, x, z, TRAM_POLE_CLEARANCE);
  const wire = closestTramItem(tramWireCells, x, z, TRAM_WIRE_CLEARANCE);
  let nearest = null;
  for (const [kind, hit, width] of [['tram-track', track, TRAM_TRACK_CLEARANCE * 2], ['tram-pole', pole, TRAM_POLE_CLEARANCE * 2], ['tram-wire', wire, TRAM_WIRE_CLEARANCE * 2]]) {
    if (hit && (!nearest || hit.distance < nearest.hit.distance)) nearest = { kind, hit, width };
  }
  if (!nearest) return null;
  const { item, distance } = nearest.hit;
  const length = Math.sqrt(item.lengthSq || 1);
  return {
    kind: nearest.kind, distance, width: nearest.width, x: nearest.hit.x, z: nearest.hit.z,
    leftX: Number.isFinite(item.x) ? 1 : item.dz / length,
    leftZ: Number.isFinite(item.x) ? 0 : -item.dx / length,
    height: baseHeight(x, z)
  };
}

function baseHeight(x, z) {
  const crossing = crossingSurfaceAt(x, z, 1);
  return crossing?.kind === 'bridge' ? crossing.height : surfaceRoadHeight(x, z);
}

function roadConflictAt(x, z) {
  const baseY = baseHeight(x, z);
  const hit = fullRoadSurfaceAt(x, z, CARRIAGEWAY_MARGIN, baseY);
  if (!hit || Math.abs(hit.height - baseY) > HEIGHT_TOLERANCE) return null;
  return { hit, baseY };
}
function conflictAt(x, z) {
  const road = roadConflictAt(x, z);
  if (road) return road;
  const tram = tramConflictAt(x, z);
  return tram ? { hit: tram, baseY: baseHeight(x, z) } : null;
}

function clearCandidate(x, z) {
  const conflict = conflictAt(x, z);
  return conflict ? null : baseHeight(x, z);
}

function relocate(x, z, heading) {
  const original = conflictAt(x, z);
  if (!original) return { x, z, baseY: baseHeight(x, z), relocated: false };
  // Prefer the short outward normal of the actual conflicting segment. Revalidate after every move because parallel
  // carriageways, medians and layered roads can make the first apparently clear point belong to another road.
  let px = x, pz = z;
  for (let iteration = 0; iteration < 8; iteration++) {
    const conflict = conflictAt(px, pz);
    if (!conflict) return { x: px, z: pz, baseY: baseHeight(px, pz), relocated: true };
    const hit = conflict.hit, distance = hit.distance;
    const nx = distance > 1e-6 ? (px - hit.x) / distance : hit.leftX;
    const nz = distance > 1e-6 ? (pz - hit.z) / distance : hit.leftZ;
    const outward = hit.width * 0.5 + CARRIAGEWAY_MARGIN + 0.65 - distance;
    const candidates = [
      [px + nx * outward, pz + nz * outward],
      [px - nx * (outward + distance * 2), pz - nz * (outward + distance * 2)]
    ];
    let moved = false;
    for (const [cx, cz] of candidates) {
      if (Math.hypot(cx - x, cz - z) > MAX_RELOCATION) continue;
      const baseY = clearCandidate(cx, cz);
      if (baseY !== null) return { x: cx, z: cz, baseY, relocated: true };
    }
    const next = candidates[0];
    if (Math.hypot(next[0] - x, next[1] - z) <= MAX_RELOCATION) {
      px = next[0]; pz = next[1]; moved = true;
    }
    if (!moved) break;
  }
  // Deterministic radial fallback covers junctions and overlapping ways where a single segment normal is insufficient.
  for (const radius of [1.5, 3, 5, 8, 12, 16, 20, 24]) {
    for (let step = 0; step < 16; step++) {
      const angle = heading + step * Math.PI / 8;
      const cx = x + Math.sin(angle) * radius, cz = z + Math.cos(angle) * radius;
      const baseY = clearCandidate(cx, cz);
      if (baseY !== null) return { x: cx, z: cz, baseY, relocated: true };
    }
  }
  return null;
}

function clearTimesSquareFootprint(sourceX, sourceZ, dx, dz, baseY) {
  const finalX = sourceX + dx / 100, finalZ = sourceZ + dz / 100;
  if (!pointInFlatRing(TIMES_SQUARE_SITE.ring, finalX, finalZ)) return { dx, dz, baseY };
  const local = timesSquareWorldToLocal(finalX, finalZ);
  // The affected southern footway lamp is moved back towards the carriageway-side footway, never into the mall.
  // Every centimetre-quantised candidate is revalidated against both the building and all road / tram clearances.
  for (let step = 1; step <= 30; step++) {
    const candidate = timesSquareLocalToWorld(local.x, local.z + step * .1);
    const candidateDx = Math.round((candidate.x - sourceX) * 100), candidateDz = Math.round((candidate.z - sourceZ) * 100);
    const x = sourceX + candidateDx / 100, z = sourceZ + candidateDz / 100;
    if (pointInFlatRing(TIMES_SQUARE_SITE.ring, x, z) || conflictAt(x, z)) continue;
    return { dx: candidateDx, dz: candidateDz, baseY: Math.round(baseHeight(x, z) * 100) };
  }
  return null;
}

function distanceToFlatRing(ring, x, z) {
  let minimum = Infinity;
  for (let i = 2; i < ring.length; i += 2) {
    const ax = ring[i - 2], az = ring[i - 1], dx = ring[i] - ax, dz = ring[i + 1] - az;
    const lengthSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    minimum = Math.min(minimum, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return minimum;
}

function clearKowloonShangriLaFootprint(sourceX, sourceZ, dx, dz, baseY) {
  const finalX = sourceX + dx / 100, finalZ = sourceZ + dz / 100;
  if (!pointInFlatRing(KOWLOON_SHANGRI_LA_SITE.ring, finalX, finalZ)) return { dx, dz, baseY };
  const local = kowloonShangriLaWorldToLocal(KOWLOON_SHANGRI_LA_SITE, finalX, finalZ);
  // The two affected source lamps are immediately inside the long northern facade. Move them onto the
  // adjacent footway, never through the preserved arrival roads or back into the exact building ring.
  for (let step = 1; step <= 80; step++) {
    const candidate = kowloonShangriLaLocalToWorld(KOWLOON_SHANGRI_LA_SITE, local.x, local.z + step * .1);
    const candidateDx = Math.round((candidate.x - sourceX) * 100), candidateDz = Math.round((candidate.z - sourceZ) * 100);
    const x = sourceX + candidateDx / 100, z = sourceZ + candidateDz / 100;
    if (pointInFlatRing(KOWLOON_SHANGRI_LA_SITE.ring, x, z) || distanceToFlatRing(KOWLOON_SHANGRI_LA_SITE.ring, x, z) < .55 || conflictAt(x, z)) continue;
    return { dx: candidateDx, dz: candidateDz, baseY: Math.round(baseHeight(x, z) * 100) };
  }
  return null;
}

function clearMajorParkFeatures(sourceX, sourceZ, dx, dz, baseY) {
  const finalX = sourceX + dx / 100, finalZ = sourceZ + dz / 100;
  if (!majorParkLampConflictAt(finalX, finalZ)) return { dx, dz, baseY };
  // A source light may remain beside the general park edge, but never inside an authored water body,
  // building, play/court facility, entrance threshold or walking corridor. Revalidate every centimetre-quantised move.
  for (const radius of [1.5, 3, 5, 8, 12, 16, 20, 24]) {
    for (let step = 0; step < 16; step++) {
      const angle = step * Math.PI / 8;
      const candidateDx = Math.round((finalX + Math.sin(angle) * radius - sourceX) * 100);
      const candidateDz = Math.round((finalZ + Math.cos(angle) * radius - sourceZ) * 100);
      const x = sourceX + candidateDx / 100, z = sourceZ + candidateDz / 100;
      if (majorParkLampConflictAt(x, z) || conflictAt(x, z)) continue;
      return { dx: candidateDx, dz: candidateDz, baseY: Math.round(baseHeight(x, z) * 100) };
    }
  }
  return null;
}

function clearAuthoredLandmarkFootprints(sourceX, sourceZ, dx, dz, baseY) {
  const timesSquare = clearTimesSquareFootprint(sourceX, sourceZ, dx, dz, baseY);
  if (!timesSquare) return null;
  const kowloonShangriLa = clearKowloonShangriLaFootprint(sourceX, sourceZ, timesSquare.dx, timesSquare.dz, timesSquare.baseY);
  if (!kowloonShangriLa) return null;
  return clearMajorParkFeatures(sourceX, sourceZ, kowloonShangriLa.dx, kowloonShangriLa.dz, kowloonShangriLa.baseY);
}

export async function buildHongKongStreetLightClearance({
  outFile = fileURLToPath(new URL('../../../js/hk-street-light-clearance-data.js', import.meta.url)),
  manifestFile = fileURLToPath(new URL('../../../tools/data/hongkong/street-light-clearance-manifest.json', import.meta.url))
} = {}) {
  const overrides = [], suppressed = [];
  let tramAdjusted = 0;
  for (let index = 0; index < HK_STREET_LIGHTS.lamps.length; index++) {
    const [x, z, heading] = HK_STREET_LIGHTS.lamps[index];
    const tramAdjustedSource = !!tramConflictAt(x, z);
    const result = relocate(x, z, heading);
    if (tramAdjustedSource) tramAdjusted++;
    if (!result) { suppressed.push(index); continue; }
    let dx = Math.round((result.x - x) * 100), dz = Math.round((result.z - z) * 100);
    let baseY = Math.round(result.baseY * 100);
    if (Math.hypot(dx / 100, dz / 100) > MAX_RELOCATION) { suppressed.push(index); continue; }
    // Centimetre quantisation is part of the runtime table, so validate exactly what will be rendered.
    const conflict = conflictAt(x + dx / 100, z + dz / 100);
    if (conflict) { suppressed.push(index); continue; }
    const landmarkClear = clearAuthoredLandmarkFootprints(x, z, dx, dz, baseY);
    if (!landmarkClear) { suppressed.push(index); continue; }
    dx = landmarkClear.dx; dz = landmarkClear.dz; baseY = landmarkClear.baseY;
    if (!result.relocated && dx === 0 && dz === 0) continue;
    overrides.push([index, dx, dz, baseY]);
  }
  let remainingCarriagewayConflicts = 0, remainingTramConflicts = 0, remainingMajorParkFeatureConflicts = 0;
  const moved = new Map(overrides.map((row) => [row[0], row]));
  const hidden = new Set(suppressed);
  for (let index = 0; index < HK_STREET_LIGHTS.lamps.length; index++) {
    if (hidden.has(index)) continue;
    const [x, z] = HK_STREET_LIGHTS.lamps[index], row = moved.get(index);
    const finalX = x + (row?.[1] || 0) / 100, finalZ = z + (row?.[2] || 0) / 100;
    if (roadConflictAt(finalX, finalZ)) remainingCarriagewayConflicts++;
    if (tramConflictAt(finalX, finalZ)) remainingTramConflicts++;
    if (majorParkLampConflictAt(finalX, finalZ)) remainingMajorParkFeatureConflicts++;
  }
  const manifest = {
    version: 1,
    source: { sha256: HK_STREET_LIGHTS.source.sha256, records: HK_STREET_LIGHTS.lamps.length },
    derivation: {
      algorithm: 'segment-normal-then-radial-tram-v2', carriagewayMargin: CARRIAGEWAY_MARGIN,
      heightTolerance: HEIGHT_TOLERANCE, maxRelocation: MAX_RELOCATION, radialDirections: 16,
      tramTrackClearance: TRAM_TRACK_CLEARANCE, tramPoleClearance: TRAM_POLE_CLEARANCE, tramWireClearance: TRAM_WIRE_CLEARANCE,
      tramNetworkSha256: HK_TRAM_NETWORK.source.alignmentSha256,
      authoredLandmarkFootprints: ['Times Square OSM way 26469269', 'Kowloon Shangri-La OSM way 29403978', 'Hong Kong Park OSM way 42255430 authored facilities and paths', 'Kowloon Park OSM way 4977404 authored facilities and paths', 'Victoria Park OSM way 4182605 authored facilities and paths'],
      kowloonShangriLaFacadeMargin: .55
    },
    counts: {
      relocated: overrides.length, suppressed: suppressed.length,
      rendered: HK_STREET_LIGHTS.lamps.length - suppressed.length,
      tramAdjusted, remainingCarriagewayConflicts, remainingTramConflicts, remainingMajorParkFeatureConflicts
    }
  };
  const javascript = `// Generated by tools/cities/hongkong/build-street-light-clearance.mjs.\n` +
    `export const HK_STREET_LIGHT_CLEARANCE = ${JSON.stringify({ version: 1, overrides, suppressed, tramAdjusted })};\n`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(outFile, javascript);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await buildHongKongStreetLightClearance();
  console.log(JSON.stringify(result, null, 2));
}
