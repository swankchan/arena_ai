// Measure how many places a mapped flyover deck fails to clear the road that passes beneath it.
//
// This is the diagnostic behind js/cities/hongkong/flyover-underpass-clearance.js: it re-walks the territory deck
// ribbons, finds surface roads crossing underneath at a real angle, and compares the drawn deck height with the road
// below. Run it before and after a clearance change to see the difference.
import { HK_FULL_ROADS } from '../../../js/hk-full-roads-data.js';
import { HK_ROAD_DECKS } from '../../../js/hk-road-deck-data.js';
import { roadRibbonHeightAtSegment, roadRibbonHeightAtVertex } from '../../../js/cities/hongkong/road-elevation.js';

const CLEARANCE = 5.2;
const MIN_SIN = 0.45;
const REACH = 12;

const deckWays = new Set(HK_ROAD_DECKS.decks.map((deck) => deck.wayId));
// Lowest deck layer per way, so a clash between two decks is only counted against the one that is supposed to be on top.
const lowestLayer = new Map();
for (const deck of HK_ROAD_DECKS.decks) {
  const known = lowestLayer.get(deck.wayId);
  if (known === undefined || deck.layer < known) lowestLayer.set(deck.wayId, deck.layer);
}
const surfaceCells = new Map();
const CELL = 60;

function addSegment(index, wayId, segment, ax, az, bx, bz, width) {
  const lengthSq = (bx - ax) ** 2 + (bz - az) ** 2;
  if (lengthSq < 1) return;
  const key = `${Math.floor((ax + bx) * 0.5 / CELL)},${Math.floor((az + bz) * 0.5 / CELL)}`;
  let list = index.get(key);
  if (!list) index.set(key, (list = []));
  list.push({ wayId, segment, ax, az, bx, bz, lengthSq, width });
}

// Every road that can be underneath something: surface roads plus decks (a ramp can cross another deck).
const deckCells = new Map();
for (let wayId = 0; wayId < HK_FULL_ROADS.roads.length; wayId++) {
  const road = HK_FULL_ROADS.roads[wayId];
  const flat = road[5];
  for (let i = 2; i + 1 < flat.length; i += 2) {
    const target = (road[4] & 6) ? deckCells : (deckWays.has(wayId) ? deckCells : surfaceCells);
    addSegment(target, wayId, i / 2 - 1, flat[i - 2], flat[i - 1], flat[i], flat[i + 1], road[1]);
  }
}

let samples = 0, crossings = 0, tooLow = 0, inverted = 0, worstGap = Infinity, worstAt = null;
const offenders = new Map();

for (let wayId = 0; wayId < HK_FULL_ROADS.roads.length; wayId++) {
  const road = HK_FULL_ROADS.roads[wayId];
  if (!(road[4] & 2) || (road[4] & 4)) continue;
  if (!deckWays.has(wayId)) continue;
  const flat = road[5];
  for (let vertex = 0; vertex + 1 < flat.length / 2; vertex++) {
    const ax = flat[vertex * 2], az = flat[vertex * 2 + 1];
    const bx = flat[vertex * 2 + 2], bz = flat[vertex * 2 + 3];
    const dx = bx - ax, dz = bz - az;
    const length = Math.hypot(dx, dz);
    if (length < 1) continue;
    const ux = dx / length, uz = dz / length;
    const steps = Math.max(1, Math.ceil(length / 6));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const x = ax + dx * t, z = az + dz * t;
      const deckY = roadRibbonHeightAtVertex(wayId, t < 0.5 ? vertex : vertex + 1);
      samples++;
      const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
      let best = null;
      for (let ix = cx - 1; ix <= cx + 1; ix++) {
        for (let iz = cz - 1; iz <= cz + 1; iz++) {
          for (const [index, isDeck] of [[surfaceCells, false], [deckCells, true]]) {
            for (const segment of index.get(`${ix},${iz}`) || []) {
              if (segment.wayId === wayId) continue;
              if (isDeck && !deckWays.has(segment.wayId)) continue;
              // The lower of two crossing decks passes under the other by design; only the upper one owes clearance.
              const otherLayer = lowestLayer.get(segment.wayId);
              if (otherLayer !== undefined && lowestLayer.get(wayId) < otherLayer) continue;
              const sdx = segment.bx - segment.ax, sdz = segment.bz - segment.az;
              const sLength = Math.sqrt(segment.lengthSq);
              const sin = Math.abs(ux * (sdz / sLength) - uz * (sdx / sLength));
              if (sin < MIN_SIN) continue;
              const u = Math.max(0, Math.min(1,
                ((x - segment.ax) * sdx + (z - segment.az) * sdz) / segment.lengthSq));
              const distance = Math.hypot(x - (segment.ax + sdx * u), z - (segment.az + sdz * u));
              if (distance > segment.width * 0.5 + REACH) continue;
              if (best && distance >= best.distance) continue;
              best = { ...segment, u, distance };
            }
          }
        }
      }
      if (!best) continue;
      crossings++;
      const below = roadRibbonHeightAtSegment(best.wayId, best.segment, best.u);
      const gap = deckY - below;
      if (gap >= CLEARANCE) continue;
      if (gap < 0) { inverted++; continue; }
      tooLow++;
      if (gap < worstGap) { worstGap = gap; worstAt = { deck: road[0] || wayId, under: HK_FULL_ROADS.roads[best.wayId][0] || best.wayId, gap: +gap.toFixed(2) }; }
      const key = `${road[0] || wayId} / ${HK_FULL_ROADS.roads[best.wayId][0] || best.wayId}`;
      offenders.set(key, (offenders.get(key) || 0) + 1);
    }
  }
}

const report = {
  clearanceM: CLEARANCE,
  deckWays: deckWays.size,
  samples,
  crossings,
  underClearance: tooLow,
  deckRunsBeneath: inverted,
  underClearanceShare: +(tooLow / Math.max(1, crossings)).toFixed(3),
  worstGapM: worstGap === Infinity ? null : +worstGap.toFixed(2),
  worstAt,
  worstPairs: [...offenders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
};
console.log(JSON.stringify(report, null, 2));
