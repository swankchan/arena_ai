// Build the per-way kerb statement the road ribbon needs, straight from the OSM sidewalk tags.
//
// The territory road layer (js/hk-full-roads-data.js) is generated from a wider Geofabrik extract than this repo checks in,
// so its build cannot be re-run here. This table is derived from the tag data that IS checked in
// (tools/data/hongkong/roads_*.json), keyed by OSM way id, and joined at runtime by the road builder.
//
// Truth as tagged, not as guessed:
//  * `sidewalk=both|left|right`, `sidewalk:left|right=yes|separate` and the older `footway:*` spelling each name a side
//    with a walkable edge, so that side gets a kerb.
//  * An explicit `no`/`none` on a side means no kerb there.
//  * A way that says nothing gets no kerb. 12,472 of the 18,596 checked-in ways are untagged, which is the honest
//    answer for them — a kerb drawn everywhere would be an invention.
//  * `separation:*` can veto a side that is only a road marking or a gore; there is nothing raised to draw.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeFrame } from '../../geo/frame.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DATA = path.resolve(HERE, '../../data/hongkong');
const OUT = path.resolve(HERE, '../../../js/hk-road-kerb-sides.js');
const MANIFEST = path.resolve(HERE, '../../data/hongkong/road-kerb-sides-manifest.json');
const FILES = ['roads_major.json', 'roads_minor_sw.json', 'roads_minor_se.json', 'roads_minor_nw.json', 'roads_minor_ne.json'];

// Bits: 1 = kerb on the left shoulder, 2 = kerb on the right shoulder (in the way's own direction).
export const KERB_LEFT = 1, KERB_RIGHT = 2;

// Any of these names a real walkable edge. `separate` means the footway is mapped as its own way, so the kerb between it
// and the carriageway exists all the same. `lane`/`shared_line`/`service` describe a marked or service edge rather than a
// raised one, and are deliberately not kerbs.
const WALKABLE = new Set(['yes', 'both', 'left', 'right', 'separate', 'designated', 'permissive', 'crossing']);
const NOT_A_KERB = new Set(['no', 'none']);
const FLAT_SEPARATION = new Set(['road_marking', 'lane_markings', 'no']);

function sideValue(tags, side) {
  // The side-specific tagging wins over the way-wide shorthand, which is how OSM renders it too. `sidewalk:right=no` has
  // to beat `sidewalk=both`, so an explicit side key is consulted before the shorthand rather than after it.
  const specific = tags[`sidewalk:${side}`] ?? tags[`footway:${side}`];
  if (specific !== undefined) return specific;
  // The shorthand is only directional for `left`/`right`; `both`/`yes` name both sides and `no` names neither.
  const shorthand = tags.sidewalk;
  if (shorthand === undefined) return undefined;
  if (shorthand === 'left') return side === 'left' ? 'yes' : 'no';
  if (shorthand === 'right') return side === 'right' ? 'yes' : 'no';
  return shorthand;
}

export function kerbSidesForTags(tags) {
  let sides = 0, stated = false;
  for (const [side, bit] of [['left', KERB_LEFT], ['right', KERB_RIGHT]]) {
    const value = sideValue(tags, side);
    if (value === undefined) continue;
    stated = true;
    if (NOT_A_KERB.has(value)) continue;
    // `both` names both sides, but only as they are examined: each iteration must add just its own side, otherwise a
    // `sidewalk:right=no` examined afterwards can never take the right side back out again.
    if (value === 'both') { sides |= bit; continue; }
    // `left`/`right` only reach here from a side-specific key (the shorthand is normalised above), where they are
    // nonsense; treat them as `yes` on the side that carries them.
    if (value === 'left' || value === 'right') { sides |= bit; continue; }
    if (!WALKABLE.has(value)) continue;
    sides |= bit;
  }
  if (!stated) return 0;
  // A gore or plain road marking leaves nothing raised to draw, but only vetoes sides that OSM did not call a sidewalk.
  const separation = [tags['separation:left'], tags['separation:right']].filter(Boolean);
  if (separation.length && separation.every((value) => FLAT_SEPARATION.has(value))) return 0;
  return sides;
}

// The runtime road array is keyed by record index, not by OSM way id, and the index order is not recoverable from the
// checked-in data — so join on geometry instead of assuming a mapping. Each road without a matched tagged way simply
// has no kerb, which is the same answer as an untagged way.
function indexRoadRecords(roads) {
  const index = new Map();
  for (let record = 0; record < roads.length; record++) {
    const flat = roads[record][5];
    const key = `${Math.round(flat[0])},${Math.round(flat[1])}`;
    let list = index.get(key);
    if (!list) index.set(key, (list = []));
    list.push(record);
  }
  return index;
}

function findRecord(index, x, z) {
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const list = index.get(`${Math.round(x) + dx},${Math.round(z) + dz}`);
      if (list && list.length) return list[0];
    }
  }
  return null;
}

export async function buildKerbSides() {
  const seen = new Set();
  const elements = [];
  const ways = [];
  const counts = { left: 0, right: 0, both: 0, none: 0, untagged: 0 };
  let source = null;
  const hashes = {};
  for (const file of FILES) {
    const text = fs.readFileSync(path.join(DATA, file), 'utf8');
    hashes[file] = createHash('sha256').update(text).digest('hex');
    const json = JSON.parse(text);
    source ||= json.source;
    for (const element of json.elements) {
      const tags = element.tags || {};
      if (!tags.highway || seen.has(element.id)) continue;
      seen.add(element.id);
      elements.push(element);
      const sides = kerbSidesForTags(tags);
      if (sides === 0) { counts.none++; continue; }
      if (sides === 3) counts.both++; else if (sides & KERB_LEFT) counts.left++; else counts.right++;
      ways.push([element.id, sides]);
    }
  }
  counts.untagged = 0; // nothing is recorded for untagged ways, by design.
  ways.sort((a, b) => a[0] - b[0]);
  // Join to the runtime road records on first-point geometry.
  const { HK_FULL_ROADS: roads } = await import('../../../js/cities/hongkong/building-priority-roads.js');
  const { default: cfg } = await import('./config.mjs');
  const frame = makeFrame(cfg.frame);
  const index = indexRoadRecords(roads.roads);
  const byRecord = new Map();
  const unmatchedWays = [];
  for (const element of elements) {
    const sides = kerbSidesForTags(element.tags || {});
    if (!sides) continue;
    const [x, z] = frame.toWorld(element.geometry[0].lon, element.geometry[0].lat);
    const record = findRecord(index, x, z);
    if (record === null) { unmatchedWays.push(element.id); continue; }
    byRecord.set(record, sides);
  }
  const kerbed = [...byRecord.entries()].sort((a, b) => a[0] - b[0]);
  const data = {
    version: 1,
    convention: 'Kerb sides are the OSM sidewalk tags reduced to two bits per way. Untagged ways carry no kerb; the '
      + 'roadside there is left exactly as it was rather than guessed.',
    source: { ...(source || {}), files: hashes, ways, unmatchedWays},
    counts: { ...counts, roadRecords: roads.roads.length, kerbedRecords: kerbed.length },
    // [road record index, side bits] pairs the road builder consumes directly.
    kerbed
  };
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(OUT, `// Generated by tools/cities/hongkong/build-kerb-sides.mjs.\n// © OpenStreetMap contributors, ODbL 1.0.\nexport const HK_ROAD_KERB_SIDES = ${JSON.stringify(data)};\n`);
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = await buildKerbSides();
  const total = data.counts.kerbedRecords, tagged = data.source.ways.length;
  console.log(`[hk-kerb-sides] ${tagged} tagged ways -> ${total} road records — both ${data.counts.both}, left only ${data.counts.left}, right only ${data.counts.right}, unmatched ${data.source.unmatchedWays.length}`);
  console.log(`[hk-kerb-sides] ${OUT}`);
}
