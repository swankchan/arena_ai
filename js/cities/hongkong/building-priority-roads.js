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
const corrections = new Map([
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
