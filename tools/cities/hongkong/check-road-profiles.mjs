// Offline diagnostic for the two ways a hillside road breaks up in the drawn surface:
//  1. 段裂 — two OSM ways meeting at the same mapped node with different drawn heights.
//  2. 曲折 — the max-of-three cross-section envelope zig-zagging between profile stations inside one segment.
// Reports grade-change counts, node gaps and max profile deviation. Not a ride-quality standard.
import { HK_FULL_ROADS } from '../../../js/cities/hongkong/building-priority-roads.js';
import { roadRibbonProfileAtSegment, roadRibbonHeightAtVertex } from '../../../js/cities/hongkong/road-elevation.js';

const roads = HK_FULL_ROADS.roads;
const GRADE_CHANGE = 0.03; // 3% change between adjacent chords

let segments = 0, stations = 0, gradeChanges = 0, maxDeviation = 0;
const nodeHeights = new Map();
for (let wayId = 0; wayId < roads.length; wayId++) {
  const road = roads[wayId];
  if (!road) continue;
  if (road[4] & 6) continue;
  const flat = road[5], count = flat.length / 2;
  for (let v = 0; v < count; v++) {
    const key = `${flat[v * 2].toFixed(2)},${flat[v * 2 + 1].toFixed(2)}`;
    let list = nodeHeights.get(key);
    if (!list) nodeHeights.set(key, (list = []));
    list.push(roadRibbonHeightAtVertex(wayId, v));
  }
  for (let s = 0; s + 1 < count; s++) {
    const profile = roadRibbonProfileAtSegment(wayId, s);
    segments++;
    stations += profile.ts.length;
    const length = Math.hypot(flat[s * 2 + 2] - flat[s * 2], flat[s * 2 + 3] - flat[s * 2 + 1]);
    let previous = null;
    for (let i = 1; i < profile.ts.length; i++) {
      const run = (profile.ts[i] - profile.ts[i - 1]) * length;
      if (run < 0.5) continue;
      const grade = (profile.heights[i] - profile.heights[i - 1]) / run;
      if (previous !== null && Math.abs(grade - previous) > GRADE_CHANGE) gradeChanges++;
      previous = grade;
    }
    const start = profile.heights[0], end = profile.heights.at(-1);
    for (let i = 1; i + 1 < profile.ts.length; i++) {
      maxDeviation = Math.max(maxDeviation,
        Math.abs(profile.heights[i] - (start + (end - start) * profile.ts[i])));
    }
  }
}
let shared = 0, gap5 = 0, gap30 = 0, worstGap = 0;
for (const list of nodeHeights.values()) {
  if (list.length < 2) continue;
  shared++;
  const gap = Math.max(...list) - Math.min(...list);
  if (gap > 0.05) gap5++;
  if (gap > 0.3) gap30++;
  worstGap = Math.max(worstGap, gap);
}
console.log(JSON.stringify({
  segments, stations, gradeChangesOver3pct: gradeChanges,
  profileDeviationMaxM: +maxDeviation.toFixed(2),
  sharedSurfaceNodes: shared, nodesOver5cmApart: gap5, nodesOver30cmApart: gap30,
  worstNodeGapM: +worstGap.toFixed(3),
  caveat: 'Max-of-three cross-section envelope, uncut DTM. Coastal tunnel cuts and vehicle sweeps are not applied.',
}, null, 2));
