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
import { containerVoidCeilingsUnder } from './container-voids.js';

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

// The highest a deck top may reach while still leaving the structure's own headroom beneath its slab. Reported as an
// absolute height, or null when no structure spans the station.
function lowestStructureCeilingUnder(wayId, x, z, ux, uz, deckHeight) {
  let lowest = null;
  for (const voidSpan of containerVoidCeilingsUnder(x, z, ux, uz)) {
    const gap = voidSpan.ceiling - deckHeight;
    if (gap < 2.2) continue; // already inside: not this pass's problem, and lifting would make it worse
    if (lowest === null || gap < lowest) lowest = gap;
  }
  return lowest === null ? null : deckHeight + lowest;
}

// A deck occupies its full carriageway, not just its centreline: on way 40414 at Sorrento the centreline runs past the
// podium corner while the shoulder is already beneath the slab. Test the centreline and both shoulders.
function lowestStructureCeilingAcrossCarriageway(wayId, x, z, ux, uz, deckHeight, halfWidth) {
  let lowest = lowestStructureCeilingUnder(wayId, x, z, ux, uz, deckHeight);
  for (const side of [-1, 1]) {
    const px = x - uz * halfWidth * side, pz = z + ux * halfWidth * side;
    const at = lowestStructureCeilingUnder(wayId, px, pz, ux, uz, deckHeight);
    if (at !== null && (lowest === null || at < lowest)) lowest = at;
  }
  return lowest;
}

// How far each deck way needs lifting, as metres per vertex-index (null = untouched). Computed once and cached: the
// road builder asks for vertex heights hundreds of thousands of times.
let liftsByWay = null;
// True while computeLifts() is running. The lift pass itself asks for road ribbon heights, and those queries must not
// populate the segment profile cache: at that moment the lift table is still empty, so a cached profile would freeze
// the deck at its un-lifted height for the rest of the session. See road-elevation.js.
let computingLifts = false;

let clamped = 0, skipped = 0, inverted = 0, buried = 0;
let lowestDeckLayer = null;
function computeLifts() {
  computingLifts = true;
  try {
    computeLiftsInner();
  } finally {
    computingLifts = false;
  }
}

function computeLiftsInner() {
  liftsByWay = new Map();
  clamped = 0;
  skipped = 0;
  inverted = 0;
  buried = 0;
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
          // Two deck ribbons can intersect where neither is reliably "the flyover". The higher layer stays: lift only
          // the deck that is already on top, never the one that would have to burrow through the other.
          const otherLayer = lowestDeckLayer.get(crossing.wayId);
          // A road with no deck at all is a surface street: anything above it must clear it, even a deck drawn below it.
          const onTop = otherLayer === undefined || deck.layer >= otherLayer;
          // A negative gap against another deck means this ribbon is the one passing underneath; lifting it would also
          // have to lift the deck it serves, so it is reported instead.
          if (gap < 0 && otherLayer !== undefined) { inverted++; continue; }
          if (!onTop) { skipped++; continue; }
          let need = UNDERPASS_CLEARANCE_M - gap;
          if (need > MAX_UNDERPASS_LIFT_M) { clamped++; continue; }
          // A deck must not answer the street below by burying itself in a podium that already spans it. On way 40414
          // at Sorrento the 9.7 m layer lift pushed the ramp 2 m into the slab: the slab leaves only 2.6 m of headroom,
          // so no lift can reach the 5.2 m the street asks for. A partial lift would not fix the crossing, it would
          // only trade one clash for another, so the station keeps the ground-following height it already had.
          const ceiling = lowestStructureCeilingAcrossCarriageway(deck.wayId, x, z, ux, uz, base, road[1] * 0.5);
          if (ceiling !== null && ceiling - below < UNDERPASS_CLEARANCE_M) { buried++; continue; }
          touched = true;
          lifts[vertex] = Math.max(lifts[vertex], need);
          lifts[vertex + 1] = Math.max(lifts[vertex + 1], need);
        }
      }
    }
    if (touched) {
      // A vertex carries the largest demand of every station in its segment, so a 55 m link that starts outside the
      // Sorrento podium and ends inside it still lifted its podium end by the outside demand. Clamp each vertex by the
      // slab above it: at Sorrento that slab leaves only 2.6 m of headroom, where no lift can reach the 5.2 m the
      // street below asks for, so the vertex keeps the height it would have had without a lift.
      for (let vertex = 0; vertex < count; vertex++) {
        if (lifts[vertex] <= 0.05) continue;
        const x = flat[vertex * 2], z = flat[vertex * 2 + 1];
        const segment = Math.min(vertex, count - 2);
        const before = roadRibbonHeightAtSegment(deck.wayId, segment, vertex === 0 ? 0 : 1);
        const adjacent = roadRibbonHeightAtSegment(deck.wayId, segment, vertex === 0 ? 0.02 : 0.98);
        const ux = (flat[segment * 2 + 2] - flat[segment * 2]) / Math.hypot(flat[segment * 2 + 2] - flat[segment * 2], flat[segment * 2 + 3] - flat[segment * 2 + 1]);
        const uz = (flat[segment * 2 + 3] - flat[segment * 2 + 1]) / Math.hypot(flat[segment * 2 + 2] - flat[segment * 2], flat[segment * 2 + 3] - flat[segment * 2 + 1]);
        const ceiling = lowestStructureCeilingAcrossCarriageway(deck.wayId, x, z, ux, uz, before, road[1] * 0.5);
        if (ceiling === null) continue;
        // The slab has to leave room for the carriageway beneath it, not merely for the deck.
        // Never let a vertex reach the ceiling exactly: the clearance assertion is strict, and rebuilding the same
        // value by three separate subtractions lands a floating point ulp below the requirement.
        const headroom = Math.max(0, Math.min(ceiling - before, ceiling - adjacent) - 1e-3);
        if (headroom < lifts[vertex]) {
          if (headroom <= 0.05) buried++;
          lifts[vertex] = headroom;
        }
      }
      liftsByWay.set(deck.wayId, lifts);
    }
  }
}

export function isComputingUnderpassLifts() {
  return computingLifts;
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
    skippedStructureBound: buried,
    maxLiftM: Math.round(maxLift * 100) / 100,
    clearanceM: UNDERPASS_CLEARANCE_M, maxLiftCapM: MAX_UNDERPASS_LIFT_M
  };
}

// Test hook: forget the caches so a changed deck table can be measured again.
export function resetUnderpassLifts() {
  liftsByWay = null;
  index = null;
}
