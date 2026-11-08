import { HK_FULL_ROADS as source } from '../../hk-full-roads-data.js';

// Project roads are centre lines with inferred ribbon widths, not surveyed kerbs.
// The World-Wide House podium (OSM way 295407372 v9) marginally overlaps
// the default 11.6 m ribbon of Des Voeux Road Central (indices 17569/17570).
// Keep both centrelines and all three lanes, but reduce the inferred total width
// by 0.4 m; this puts the closest edge outside that mapped building outline.
// This is a rendering/gameplay correction, not a claim of measured road width.
// Postal private driveway (44961) is an inferred 8.4 m ribbon alongside the mapped
// building; 7.6 m avoids grazing its long rear facade while preserving two lanes.
// The width is an estimate, not a surveyed kerb.
// Gloucester Road service ribbon next to the OSM HF95 staircase (way 148858993).
// The default inferred width overlaps the footbridge stairs; keep both traffic
// lanes on the original centreline and reduce 8.4 to 7.0 m (not surveyed kerbs).
// Brewin Path OSM way 156335538 is a narrow hillside access way; the 8.5 m
// generated ribbon overlaps the Peak Tram. Keep its exact centreline, two-way
// topology and both lanes, but use an estimated 4.8 m ribbon (not a survey).
const corrections = new Map([
  [39703, {width: 4.8, name: '蒲魯賢徑', originalWidth: 8.5, lanes: 2, original: [-436.5,829.7,-374.4,822.8,-368,823.3,-352.3,827.2,-337.8,837.9,-329.2,838.3,-321.3,833.2,-319.8,830.7,-319.1,819.8,-324.8,807.6,-331.4,802.2,-334.5,795.4,-333.6,788.8,-330.6,784.5]}],
  [8995, { width: 7.0, name: '告士打道', originalWidth: 8.4, lanes: 2, original: [1381,307.8,1288.2,316.1,1253.3,315.8] }],
  [44961, { width: 7.6, name: '', originalWidth: 8.4, lanes: 2, original: [10.5, -194, 44.2, -172, 44.2, -167.8, 28, -141.4] }],
  [17569, { width: 11.2, original: [-292.7, -164.2, -217.5, -61.3] }],
  [17570, { width: 11.2, original: [-217.5, -61.3, -209.6, -50.7] }],
]);
for (const [id, correction] of corrections) {
  const road = source.roads[id];
  if (!road || road[0] !== (correction.name ?? '德輔道中') || road[1] !== (correction.originalWidth ?? 11.6) || road[3] !== (correction.lanes ?? 3) ||
      road[5].length !== correction.original.length || road[5].some((v, i) => v !== correction.original[i])) {
    throw new Error(`Building-priority road correction ${id} no longer matches its source; review regenerated roads`);
  }
}
export const buildingPriorityRoadWidth = (id) => corrections.get(id)?.width ?? null;
export const HK_FULL_ROADS = {
  ...source,
  roads: source.roads.map((road, id) => {
    const width = buildingPriorityRoadWidth(id);
    return width == null ? road : [road[0], width, road[2], road[3], road[4], road[5]];
  })
};
