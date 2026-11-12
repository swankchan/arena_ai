// A mapped flyover must actually clear the streets it spans.
//
// Deck lift currently comes from the OSM `layer` tag alone (`5.5 + 4.2·(layer−1)`, capped at 20 m). That number has no
// relationship to what is underneath: a `layer=1` link crossing a dual carriageway on a fill embankment ends up a metre
// above it, and a `layer=2` ramp over a flyover can sit below the lower deck. This module measures the surface roads
// under each deck way and raises the deck just enough to clear them.
//
// Raising is safe in the direction that matters: decks are already lifted above the ground, so an extra metre never
// buries the carriageway, only separates the two surfaces that were intersecting.
import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { HK_ROAD_DECKS } from '../../hk-road-deck-data.js';
import { roadRibbonHeightAtSegment } from './road-elevation.js';

export const UNDER = 1;
export const OVER = 2;

// Vertical clearance required between the deck soffit and the road below. Hong Kong's road design minimum for a new
// flyover is ~5.1 m; 5.2 m leaves a little margin for the 0.72 m soffit drawn under verified bridges.
export const UNDERPASS_CLEARANCE_M = 5.2;
// Presentation cap. Raising a deck tens of metres away from its approach would replace a clearance clash with an
// absurd ramp, so anything beyond this is left as it is and reported instead of silently becoming a landmark viaduct.
export const MAX_UNDERPASS_LIFT_M = 8.5;
// Sample spacing along a deck way when looking for roads beneath it.
const SAMPLE_STEP_M = 6;
// A road only counts as passing under when it crosses at a real angle; parallel carriageways and merge tapers are not
// underpasses, and treating them as such would lift a flyover away from the road it runs beside.
const MIN_CROSSING_SIN = 0.45;
const REACH_M = 12;

function buildSurfaceIndex() {
  const cells = new Map();
  const cell = 60;
  for (let wayId = 0; wayId < HK_FULL_ROADS.roads.length; wayId++) {
    const road = HK_FULL_ROADS.roads[wayId];
    // Elevated and tunnel ways are not the road underneath anything.
    if (road[4] & 6) continue;
    const flat = road[5];
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const ax = flat[i - 2], az = flat[i - 1], bx = flat[i], bz = flat[i + 1];
      const lengthSq = (bx - ax) ** 2 + (bz - az) ** 2;
      if (lengthSq < 1) continue;
      const key = `${Math.floor((ax + bx) * 0.5 / cell)},${Math.floor((az + bz) * 0.5 / cell)}`;
      let list = cells.get(key);
      if (!list) cells.set(key, (list = []));
      list.push({ wayId, segment: i / 2 - 1, ax, az, bx, bz, lengthSq, width: road[1], elev: 0 });
    }
  }
  // Deck ways are also "roads underneath" other decks: a layer-3 ramp must clear the layer-2 deck it crosses.
  for (const deck of HK_ROAD_DECKS.decks) {
    const road = HK_FULL_ROADS.roads[deck.wayId];
    if (!road) continue;
    const flat = road[5];
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const ax = flat[i - 2], az = flat[i - 1], bx = flat[i], bz = flat[i + 1];
      const lengthSq = (bx - ax) ** 2 + (bz - az) ** 2;
      if (lengthSq < 1) continue;
      const key = `${Math.floor((ax + bx) * 0.5 / cell)},${Math.floor((az + bz) * 0.5 / cell)}`;
      let list = cells.get(key);
      if (!list) cells.set(key, (list = []));
      list.push({ wayId: deck.wayId, segment: i / 2 - 1, ax, az, bx, bz, lengthSq, width: road[1], elev: 1 });
    }
  }
  return { cells, cell };
}

let index = null;
export function surfaceCrossingsUnder(wayId, x, z, ux, uz) {
  index ||= buildSurfaceIndex();
  const { cells, cell } = index;
  const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  const found = [];
  for (let ix = cx - 1; ix <= cx + 1; ix++) {
    for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const list = cells.get(`${ix},${iz}`);
      if (!list) continue;
      for (const segment of list) {
        if (segment.wayId === wayId) continue;
        const dx = segment.bx - segment.ax, dz = segment.bz - segment.az;
        const length = Math.sqrt(segment.lengthSq);
        const sin = Math.abs(ux * (dz / length) - uz * (dx / length));
        if (sin < MIN_CROSSING_SIN) continue;
        const t = Math.max(0, Math.min(1, ((x - segment.ax) * dx + (z - segment.az) * dz) / segment.lengthSq));
        const distance = Math.hypot(x - (segment.ax + dx * t), z - (segment.az + dz * t));
        if (distance > segment.width * 0.5 + REACH_M) continue;
        found.push({ ...segment, t });
      }
    }
  }
  return found;
}

/**
 * Extra lift (metres, ≥ 0) that a deck way needs at one station so that every road crossing beneath it clears
 * UNDERPASS_CLEARANCE_M. `deckHeight` is the current drawn height of the deck at that station.
 */
export function underpassLiftAt(wayId, x, z, ux, uz, deckHeight) {
  let lift = 0;
  for (const crossing of surfaceCrossingsUnder(wayId, x, z, ux, uz)) {
    const below = roadRibbonHeightAtSegment(crossing.wayId, crossing.segment, crossing.t);
    const required = below + UNDERPASS_CLEARANCE_M;
    if (required > deckHeight + lift) lift = required - deckHeight;
  }
  return lift;
}

// How far each deck way needs lifting, as metres per vertex-index (null = untouched). Computed once and cached: the
// road builder asks for vertex heights hundreds of thousands of times.
let liftsByWay = null;

let clamped = 0, skipped = 0, inverted = 0;
let lowestDeckLayer = null;
function computeLifts() {
  liftsByWay = new Map();
  clamped = 0;
  skipped = 0;
  inverted = 0;
  // Lowest layer of each way that carries a deck, so a crossing pair has a deterministic "which one is on top".
  lowestDeckLayer = new Map();
  for (const deck of HK_ROAD_DECKS.decks) {
    const known = lowestDeckLayer.get(deck.wayId);
    if (known === undefined || deck.layer < known) lowestDeckLayer.set(deck.wayId, deck.layer);
  }

  for (const deck of HK_ROAD_DECKS.decks) {
    const road = HK_FULL_ROADS.roads[deck.wayId];
    if (!road) continue;
    const flat = road[5];
    const count = flat.length / 2;
    const lifts = new Float64Array(count);
    let touched = false;
    for (let vertex = 0; vertex + 1 < count; vertex++) {
      const ax = flat[vertex * 2], az = flat[vertex * 2 + 1];
      const bx = flat[vertex * 2 + 2], bz = flat[vertex * 2 + 3];
      const dx = bx - ax, dz = bz - az;
      const length = Math.hypot(dx, dz);
      if (length < 0.5) continue;
      const ux = dx / length, uz = dz / length;
      const steps = Math.max(1, Math.ceil(length / SAMPLE_STEP_M));
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const x = ax + dx * t, z = az + dz * t;
        const base = roadRibbonHeightAtSegment(deck.wayId, vertex, t);
        for (const crossing of surfaceCrossingsUnder(deck.wayId, x, z, ux, uz)) {
          const below = roadRibbonHeightAtSegment(crossing.wayId, crossing.segment, crossing.t);
          const gap = base - below;
          if (gap >= UNDERPASS_CLEARANCE_M) continue;
          // A negative gap means this ribbon runs beneath the other one; it cannot be lifted to pass over itself.
          if (gap < 0) { inverted++; continue; }
          // Two deck ribbons can intersect where neither is reliably "the flyover". The higher layer stays: lift only
          // the deck that is already on top, never the one that would have to burrow through the other.
          const otherLayer = lowestDeckLayer.get(crossing.wayId);
          // A road with no deck at all is a surface street: anything above it must clear it.
          const onTop = otherLayer === undefined || deck.layer >= otherLayer;
          if (!onTop) { skipped++; continue; }
          const need = UNDERPASS_CLEARANCE_M - gap;
          if (need > MAX_UNDERPASS_LIFT_M) { clamped++; continue; }
          touched = true;
          lifts[vertex] = Math.max(lifts[vertex], need);
          lifts[vertex + 1] = Math.max(lifts[vertex + 1], need);
        }
      }
    }
    if (touched) liftsByWay.set(deck.wayId, lifts);
  }
}

export function underpassLiftAtVertex(wayId, vertexIndex) {
  liftsByWay ||= (computeLifts(), liftsByWay);
  const lifts = liftsByWay.get(wayId);
  return lifts ? lifts[Math.max(0, Math.min(lifts.length - 1, vertexIndex))] : 0;
}

export function underpassLiftStats() {
  liftsByWay ||= (computeLifts(), liftsByWay);
  let ways = 0, raisedVertices = 0, maxLift = 0;
  for (const lifts of liftsByWay.values()) {
    ways++;
    for (const lift of lifts) {
      if (lift > 0.01) raisedVertices++;
      if (lift > maxLift) maxLift = lift;
    }
  }
  return {
    ways, raisedVertices, clampedStations: clamped, skippedLowerDecks: skipped, skippedInverted: inverted,
    maxLiftM: Math.round(maxLift * 100) / 100,
    clearanceM: UNDERPASS_CLEARANCE_M, maxLiftCapM: MAX_UNDERPASS_LIFT_M
  };
}

// Test hook: forget the caches so a changed deck table can be measured again.
export function resetUnderpassLifts() {
  liftsByWay = null;
  index = null;
}
