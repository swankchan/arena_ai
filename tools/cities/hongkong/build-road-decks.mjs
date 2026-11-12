// Give mapped flyovers a real deck height instead of drawing every bridge on the road underneath.
//
// The checked-in viaduct inventory carries the OSM `layer` for each elevated carriageway. `layer` is a stacking order,
// not a height in metres, so the deck height here is an explicit presentation convention: each layer clears the surface
// by one step, and the ramp up to it is limited to a stated grade. It is NOT a surveyed engineering elevation.
//
// OSM splits a flyover into short ways at every junction and many of those ways carry no layer tag of their own, so
// deciding per way leaves almost every real overpass flat. Decks are therefore built per *group*: ways are joined when
// they share endpoints and their layers do not contradict each other, and the group's level is passed between them.
// Groups with no positive layer are left alone and reported, never guessed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HK_FULL_ROADS } from '../../../js/hk-full-roads-data.js';
import { HK_VERIFIED_BRIDGES } from '../../../js/hk-verified-bridge-data.js';
import { CROSSING_ROUTES } from '../../../js/cities/hongkong/crossings.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_INVENTORY = path.resolve(HERE, '../../data/hongkong/viaduct-inventory.json');
const DEFAULT_OUT = path.resolve(HERE, '../../../js/hk-road-deck-data.js');

export const LAYER_CLEARANCE = 5.5;   // layer-1 soffit clearance over the carriageway below
export const LAYER_STEP = 4.2;        // each extra layer adds one storey
export const MAX_DECK_LAYER = 3;      // real decks are 1-3 storeys up; higher tags are reported, not converted
export const MAX_DECK_LIFT = 20;      // hard ceiling on the presentation lift
export const MAX_RAMP_GRADE = 0.09;   // longitudinal ramp limit
export const MIN_DECK_SPAN = 12;      // a shorter way cannot hold a deck and a ramp

const EPSILON = 1e-6;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => value * value * (3 - 2 * value);

export function deckLiftForLayer(layer) {
  if (!Number.isFinite(layer) || layer <= 0) return 0;
  return Math.min(MAX_DECK_LIFT, LAYER_CLEARANCE + (layer - 1) * LAYER_STEP);
}

function chainages(flat) {
  const points = flat.length / 2;
  const out = [0];
  for (let i = 1; i < points; i++) {
    out.push(out.at(-1) + Math.hypot(flat[i * 2] - flat[i * 2 - 2], flat[i * 2 + 1] - flat[i * 2 - 1]));
  }
  return out;
}

// Blend along one way: 0 at both ends, 1 on the deck, ramp capped by MAX_RAMP_GRADE. Two sweeps are enough; a way too
// short to hold a ramp simply ends up barely raised, which is the honest answer for a mapped 12 m link.
function rampBlend(chain, lift, options = {}) {
  const count = chain.length;
  const length = chain.at(-1);
  if (lift <= 0 || count < 3) return new Array(count).fill(0);
  const ramp = Math.min(options.rampRun ?? 90, length / 2, lift / MAX_RAMP_GRADE);
  const blend = chain.map((distance) =>
    ramp <= EPSILON ? 0 : smoothstep(clamp01(Math.min(distance, length - distance) / ramp)));
  if (options.groundedStart !== false) blend[0] = 0;
  if (options.groundedEnd !== false) blend[count - 1] = 0;
  // The cap applies to the stored (3-decimal) blend values, so it is tightened slightly to survive that rounding.
  const quantised = MAX_RAMP_GRADE - 0.002;
  const maxStep = (index) => quantised * (chain[index] - chain[index - 1]) / lift;
  for (let index = 1; index < count; index++) blend[index] = Math.min(blend[index], blend[index - 1] + maxStep(index));
  for (let index = count - 2; index >= 0; index--) blend[index] = Math.min(blend[index], blend[index + 1] + maxStep(index + 1));
  return blend;
}

const nodeKey = (x, z) => `${x.toFixed(2)},${z.toFixed(2)}`;

// Union-find over elevated ways that touch end to end with compatible layers.
function buildGroups(candidates) {
  const parent = new Map();
  const find = (id) => {
    while (parent.get(id) !== id) { parent.set(id, parent.get(parent.get(id))); id = parent.get(id); }
    return id;
  };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const id of candidates.keys()) parent.set(id, id);
  const byNode = new Map();
  for (const [wayId, entry] of candidates) {
    for (const endpoint of [0, entry.count - 1]) {
      const key = nodeKey(entry.flat[endpoint * 2], entry.flat[endpoint * 2 + 1]);
      let list = byNode.get(key);
      if (!list) byNode.set(key, (list = []));
      list.push(wayId);
    }
  }
  for (const list of byNode.values()) {
    for (let i = 1; i < list.length; i++) {
      const a = candidates.get(list[0]), b = candidates.get(list[i]);
      if (a.layer > 0 && b.layer > 0 && a.layer !== b.layer) continue;
      union(list[0], list[i]);
    }
  }
  const groups = new Map();
  for (const wayId of candidates.keys()) {
    const root = find(wayId);
    let group = groups.get(root);
    if (!group) groups.set(root, (group = []));
    group.push(wayId);
  }
  return [...groups.values()];
}

export function buildRoadDecks({ inventoryFile = DEFAULT_INVENTORY, outFile = DEFAULT_OUT, write = true } = {}) {
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
  const byRecord = new Map(inventory.ways.map((way) => [way.sourceRecordIndex, way]));
  const verified = new Set(HK_VERIFIED_BRIDGES.ways.map((way) => way.wayId));
  const specialCrossings = new Set();
  for (const route of CROSSING_ROUTES) for (const index of route.wayIds) specialCrossings.add(index);

  const skipped = {
    verifiedBridge: 0, specialCrossing: 0, tunnel: 0, unresolvedTags: 0, tooShort: 0,
    layerOutOfRange: 0, noLayerInGroup: 0
  };

  const candidates = new Map();
  for (let wayId = 0; wayId < HK_FULL_ROADS.roads.length; wayId++) {
    const road = HK_FULL_ROADS.roads[wayId];
    if (!road || !(road[4] & 2)) continue;
    if (road[4] & 4) { skipped.tunnel++; continue; }
    if (verified.has(wayId)) { skipped.verifiedBridge++; continue; }
    if (specialCrossings.has(wayId)) { skipped.specialCrossing++; continue; }
    const record = byRecord.get(wayId);
    if (!record || record.classification === 'review-special-bridge' || record.classification === 'review-degenerate-geometry') {
      skipped.unresolvedTags++;
      continue;
    }
    const flat = road[5], chain = chainages(flat);
    candidates.set(wayId, {
      wayId,
      osmWayId: record.osmWayId,
      layer: Math.max(0, record.layer ?? 0),
      flat,
      chain,
      length: chain.at(-1),
      count: flat.length / 2
    });
  }

  const decks = [];
  for (const group of buildGroups(candidates)) {
    const entries = group.map((wayId) => candidates.get(wayId));
    const layer = Math.max(...entries.map((entry) => entry.layer));
    if (!(layer > 0)) { skipped.noLayerInGroup += entries.length; continue; }
    if (layer > MAX_DECK_LAYER) { skipped.layerOutOfRange += entries.length; continue; }
    const usable = entries.filter((entry) => entry.length >= MIN_DECK_SPAN);
    skipped.tooShort += entries.length - usable.length;
    if (!usable.length) continue;
    const lift = deckLiftForLayer(layer);
    // An end that meets another way of this group continues the deck instead of coming back down to the surface.
    const endpoints = new Map();
    for (const entry of usable) {
      for (const endpoint of [0, entry.count - 1]) {
        const key = nodeKey(entry.flat[endpoint * 2], entry.flat[endpoint * 2 + 1]);
        endpoints.set(key, (endpoints.get(key) ?? 0) + 1);
      }
    }
    for (const entry of usable) {
      const startKey = nodeKey(entry.flat[0], entry.flat[1]);
      const endKey = nodeKey(entry.flat[(entry.count - 1) * 2], entry.flat[(entry.count - 1) * 2 + 1]);
      const blend = rampBlend(entry.chain, lift, {
        groundedStart: (endpoints.get(startKey) ?? 0) < 2,
        groundedEnd: (endpoints.get(endKey) ?? 0) < 2
      });
      decks.push({
        wayId: entry.wayId,
        osmWayId: entry.osmWayId,
        layer,
        lift: Math.round(lift * 100) / 100,
        lengthM: Math.round(entry.length * 10) / 10,
        deckFraction: Math.round(Math.max(...blend) * 1000) / 1000,
        vertexBlend: blend.map((value) => Math.round(value * 1000) / 1000)
      });
    }
  }

  const byLayer = Object.fromEntries([...new Set(decks.map((deck) => deck.layer))].sort((a, b) => a - b)
    .map((layer) => [layer, decks.filter((deck) => deck.layer === layer).length]));
  const data = {
    version: 1,
    city: 'hongkong',
    source: {
      inventory: 'tools/data/hongkong/viaduct-inventory.json',
      roadTable: 'js/hk-full-roads-data.js',
      layerStatus: 'OSM layer is a stacking order, not a height in metres.',
      heightStatus: 'Deck heights are a presentation convention, not surveyed engineering elevations.',
      grouping: 'ways joined end-to-end with compatible layer values share one deck level',
      layerClearanceMetres: LAYER_CLEARANCE,
      layerStepMetres: LAYER_STEP,
      maxDeckLayer: MAX_DECK_LAYER,
      maxDeckLiftMetres: MAX_DECK_LIFT,
      maxRampGrade: MAX_RAMP_GRADE,
      minimumDeckSpanMetres: MIN_DECK_SPAN
    },
    counts: {
      decks: decks.length,
      fullDeck: decks.filter((deck) => deck.deckFraction > 0.9).length,
      rampOnly: decks.filter((deck) => deck.deckFraction <= 0.9).length,
      byLayer,
      skipped
    },
    decks
  };
  if (write) {
    const output = `// Generated by tools/cities/hongkong/build-road-decks.mjs. Do not hand-edit.\n`
      + `// OSM layer values are source data; deck heights are a presentation convention, not surveyed elevations.\n`
      + `export const HK_ROAD_DECKS = ${JSON.stringify(data)};\n`;
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, output);
  }
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = buildRoadDecks();
  console.log(`[hk-road-decks] ${data.counts.decks} decks (${data.counts.fullDeck} reach full deck height)`);
  console.log(`[hk-road-decks] by layer ${JSON.stringify(data.counts.byLayer)}`);
  console.log(`[hk-road-decks] skipped ${JSON.stringify(data.counts.skipped)}`);
}
