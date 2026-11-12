// A lamp post standing under a flyover still carries a 9.6 m column and a bracket that reaches 2.15 m sideways. Where the
// deck above is lower than the lantern, the head visibly punches through the concrete. The source CSV is a survey of
// every lamp post in the territory, not of which ones clear each new deck level, so the lamp is suppressed rather than
// invented into a shorter post that the survey does not describe.
//
// Measured on the bundled data: 554 of 48,332 sampled lamps sit under a deck that their lantern would cross.
import { HK_ROAD_DECKS } from '../../hk-road-deck-data.js';
import { HK_FULL_ROADS } from './building-priority-roads.js';
import { roadRibbonHeightAtVertex } from './road-elevation.js';

const ARM_REACH = 2.15;
// The column is 9.6 m and the head box sits at 9.60 m, so anything below this is punched through.
const LANTERN_HEADROOM = 9.78;
const CELL = 60;
const REACH = 4;

// Coarse grid of deck centrelines so the check stays cheap for 145,000 lamps.
const deckCells = new Map();
let built = false;
function buildDeckIndex() {
  if (built) return;
  built = true;
  for (const deck of HK_ROAD_DECKS.decks) {
    const road = HK_FULL_ROADS.roads[deck.wayId];
    if (!road) continue;
    const flat = road[5];
    for (let vertex = 1; vertex < flat.length / 2; vertex++) {
      const ax = flat[vertex * 2 - 2], az = flat[vertex * 2 - 1], bx = flat[vertex * 2], bz = flat[vertex * 2 + 1];
      if (Math.hypot(bx - ax, bz - az) < 0.5) continue;
      // Only the part of the way that is actually up on the deck matters.
      if (deck.vertexBlend[vertex] < 0.05 && deck.vertexBlend[vertex - 1] < 0.05) continue;
      const key = `${Math.floor((ax + bx) / 2 / CELL)},${Math.floor((az + bz) / 2 / CELL)}`;
      let list = deckCells.get(key);
      if (!list) deckCells.set(key, (list = []));
      list.push([deck.wayId, vertex - 1, deck]);
    }
  }
}

function deckClearanceAt(x, z, groundY) {
  buildDeckIndex();
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  let lowestSoffit = Infinity;
  for (let ix = cx - 1; ix <= cx + 1; ix++) {
    for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const list = deckCells.get(`${ix},${iz}`);
      if (!list) continue;
      for (const [wayId, segmentIndex] of list) {
        const flat = HK_FULL_ROADS.roads[wayId][5];
        const ax = flat[segmentIndex * 2], az = flat[segmentIndex * 2 + 1];
        const bx = flat[segmentIndex * 2 + 2], bz = flat[segmentIndex * 2 + 3];
        const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
        if (lengthSq < 0.25) continue;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
        const distance = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
        if (distance > HK_FULL_ROADS.roads[wayId][1] * 0.5 + REACH) continue;
        const deckY = roadRibbonHeightAtVertex(wayId, t < 0.5 ? segmentIndex : segmentIndex + 1);
        if (deckY - groundY < 2.5) continue;
        lowestSoffit = Math.min(lowestSoffit, deckY - 0.72); // addVerifiedBridgeQuad deck depth
      }
    }
  }
  return lowestSoffit === Infinity ? Infinity : lowestSoffit - groundY;
}

// True when the lantern (pole top or either bracket end) would break through a deck above this lamp.
export function lampUnderLowDeck(x, z, heading, arms, groundY) {
  const clearance = deckClearanceAt(x, z, groundY);
  if (clearance === Infinity) return false;
  if (clearance < LANTERN_HEADROOM) return true;
  for (let arm = 0; arm < arms; arm++) {
    const armHeading = heading + arm * Math.PI;
    const hx = x + Math.sin(armHeading) * ARM_REACH;
    const hz = z + Math.cos(armHeading) * ARM_REACH;
    if (deckClearanceAt(hx, hz, groundY) < LANTERN_HEADROOM) return true;
  }
  return false;
}

export const LAMP_LANTERN_HEADROOM = LANTERN_HEADROOM;
