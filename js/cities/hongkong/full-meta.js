import { GEO } from '../../hk-geodata.js';
import { HK_FULL_MAP } from '../../hk-full-map-data.js';
import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { CROSSING_FLAT_EXCLUSION_IDS } from './crossings.js';

// Spatial queries for the territory-wide 3D road layer. The detailed core keeps its original graph; outside it, these
// way/segment indexes provide safe road spawns, HUD labels and ground heights without scanning 77,000 ways per query.
export const FULL_BOUNDS = HK_FULL_ROADS.bounds;
const CELL = 400;
const CELL_STRIDE = 100003;

export function isDetailedCore(x, z) {
  const b = GEO.bounds;
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

function pointInRing(flat, x, z) {
  let inside = false;
  for (let i = 0, j = flat.length - 2; i < flat.length; j = i, i += 2) {
    const xi = flat[i], zi = flat[i + 1], xj = flat[j], zj = flat[j + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function flatBounds(flat) {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i + 1 < flat.length; i += 2) {
    b.minX = Math.min(b.minX, flat[i]); b.maxX = Math.max(b.maxX, flat[i]);
    b.minZ = Math.min(b.minZ, flat[i + 1]); b.maxZ = Math.max(b.maxZ, flat[i + 1]);
  }
  return b;
}

const land = HK_FULL_MAP.land.map((ring) => ({ ring, bounds: flatBounds(ring) }));
export function isTerritoryLand(x, z) {
  for (const entry of land) {
    const b = entry.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (pointInRing(entry.ring, x, z)) return true;
  }
  return false;
}

const parks = HK_FULL_MAP.parks.map(([cat, name, ring]) => ({ cat, name, ring, bounds: flatBounds(ring) }));
export function territoryParkAt(x, z) {
  for (const park of parks) {
    const b = park.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (pointInRing(park.ring, x, z)) return { name: park.name, rings: [park.ring], cat: park.cat };
  }
  return null;
}

const ways = HK_FULL_ROADS.roads.map(([name, width, dir, lanes, flags, flat], id) => ({
  id, name, width, dir, lanes, flags, flat, bounds: flatBounds(flat), stamp: 0
}));
const wayCells = new Map();
for (const way of ways) {
  const b = way.bounds;
  for (let ix = Math.floor(b.minX / CELL); ix <= Math.floor(b.maxX / CELL); ix++) {
    for (let iz = Math.floor(b.minZ / CELL); iz <= Math.floor(b.maxZ / CELL); iz++) {
      const key = ix * CELL_STRIDE + iz;
      let list = wayCells.get(key);
      if (!list) wayCells.set(key, (list = []));
      list.push(way);
    }
  }
}

let queryStamp = 0;
function candidates(x, z, radius) {
  queryStamp++;
  if (queryStamp >= Number.MAX_SAFE_INTEGER) {
    queryStamp = 1;
    for (const way of ways) way.stamp = 0;
  }
  const out = [];
  for (let ix = Math.floor((x - radius) / CELL); ix <= Math.floor((x + radius) / CELL); ix++) {
    for (let iz = Math.floor((z - radius) / CELL); iz <= Math.floor((z + radius) / CELL); iz++) {
      for (const way of wayCells.get(ix * CELL_STRIDE + iz) || []) {
        if (way.stamp === queryStamp) continue;
        way.stamp = queryStamp;
        const b = way.bounds;
        if (x < b.minX - radius || x > b.maxX + radius || z < b.minZ - radius || z > b.maxZ + radius) continue;
        out.push(way);
      }
    }
  }
  return out;
}

function segmentHit(x, z, way, i) {
  const flat = way.flat;
  const ax = flat[i - 2], az = flat[i - 1], bx = flat[i], bz = flat[i + 1];
  const dx = bx - ax, dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
  const px = ax + dx * t, pz = az + dz * t;
  const length = Math.hypot(dx, dz) || 1;
  const sign = way.dir === -1 ? -1 : 1;
  const dirX = dx / length * sign, dirZ = dz / length * sign;
  return {
    x: px, z: pz, distance: Math.hypot(x - px, z - pz), way, length, t,
    name: way.name, width: way.width, dir: way.dir, lanes: way.lanes, flags: way.flags,
    heading: Math.atan2(dirX, dirZ), leftX: dirZ, leftZ: -dirX
  };
}

export function nearestFullRoad(x, z, { radius = 1800, minWidth = 0, namedOnly = false, excludeCrossings = false } = {}) {
  let best = null;
  for (const way of candidates(x, z, radius)) {
    if (way.width < minWidth || (namedOnly && !way.name) || (excludeCrossings && CROSSING_FLAT_EXCLUSION_IDS.has(way.id))) continue;
    for (let i = 2; i + 1 < way.flat.length; i += 2) {
      const hit = segmentHit(x, z, way, i);
      if (hit.distance > radius || (best && hit.distance >= best.distance)) continue;
      best = hit;
    }
  }
  return best;
}

export function nearestFullRoads(x, z, radius = 45) {
  const best = new Map();
  for (const way of candidates(x, z, radius)) {
    if (!way.name) continue;
    for (let i = 2; i + 1 < way.flat.length; i += 2) {
      const hit = segmentHit(x, z, way, i);
      if (hit.distance > radius) continue;
      const current = best.get(way.name);
      if (!current || hit.distance < current.distance) best.set(way.name, hit);
    }
  }
  return [...best.values()].sort((a, b) => a.distance - b.distance);
}

export function isTerritoryRoad(x, z, margin = 0) {
  const hit = nearestFullRoad(x, z, { radius: 70 + Math.max(0, margin) });
  return Boolean(hit && hit.distance <= hit.width * 0.5 + margin);
}

export function isFlatTerritoryRoad(x, z, margin = 0) {
  const hit = nearestFullRoad(x, z, { radius: 70 + Math.max(0, margin), excludeCrossings: true });
  return Boolean(hit && hit.distance <= hit.width * 0.5 + margin);
}

export function spawnOnFullRoad(x, z, { minWidth = 8, laneOffset = 2.6, radius = 2500 } = {}) {
  let hit = null;
  let bestScore = Infinity;
  for (const way of candidates(x, z, radius)) {
    if (way.width < minWidth) continue;
    for (let i = 2; i + 1 < way.flat.length; i += 2) {
      const candidate = segmentHit(x, z, way, i);
      if (candidate.distance > radius) continue;
      const endpoint = Math.min(candidate.t * candidate.length, (1 - candidate.t) * candidate.length);
      // A five-metre stub or a segment endpoint is a poor place to arrive in a car. Prefer a nearby usable stretch,
      // while retaining every road as a fallback when a remote settlement only has short ways.
      const score = candidate.distance + Math.max(0, 35 - candidate.length) * 8 + Math.max(0, 18 - endpoint) * 6;
      if (score < bestScore) { bestScore = score; hit = candidate; }
    }
  }
  if (!hit) return null;
  const offset = Math.min(laneOffset, Math.max(1.2, hit.width * 0.22));
  return {
    x: hit.x + hit.leftX * offset,
    z: hit.z + hit.leftZ * offset,
    heading: hit.heading,
    width: hit.width,
    name: hit.name,
    distance: hit.distance,
    roadId: hit.way.id,
    segmentLength: hit.length
  };
}

export function nearestTerritoryPlace(x, z, maxDistance = 8000) {
  let best = null;
  let bestDistance = maxDistance;
  for (const [name, px, pz, rank] of HK_FULL_MAP.places) {
    const distance = Math.hypot(px - x, pz - z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { name, x: px, z: pz, rank, distance };
    }
  }
  return best;
}

export function territoryPlace(name) {
  const place = HK_FULL_MAP.places.find((entry) => entry[0] === name);
  return place ? { name: place[0], x: place[1], z: place[2], rank: place[3] } : null;
}

export const FULL_ROAD_STATS = Object.freeze({
  ways: ways.length,
  namedWays: ways.filter((way) => way.name).length,
  cells: wayCells.size,
  landRings: land.length
});
export const FULL_ROAD_NAMES = new Set(ways.map((way) => way.name).filter(Boolean));
export const FULL_PLACE_NAMES = new Set(HK_FULL_MAP.places.map((place) => place[0]).filter(Boolean));
