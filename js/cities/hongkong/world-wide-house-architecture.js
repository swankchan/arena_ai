import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';

// OSM way 295407372 v9 is the four-storey podium, not the office tower.
export const WORLD_WIDE_PODIUM_SOURCE = authoredOsmSource({
  id: 295407372, version: 9, sourceTimestamp: '2025-12-28T04:37:36Z',
  tags: { building: 'yes', 'building:function': 'podium', 'building:levels': '4' },
  geometry: [
    [114.1574693,22.2825664],[114.1577437,22.2822286],[114.1578264,22.2822346],
    [114.1578376,22.2822517],[114.1580473,22.2825727],[114.1580766,22.2826175],
    [114.1578651,22.2828667],[114.1578468,22.2828528],[114.1577784,22.2828009],
    [114.1574693,22.2825664]
  ].map(([lon,lat]) => ({lon,lat})),
  evidence: 'OSM podium outline; upper tower footprint is not separately mapped.'
});
export const WORLD_WIDE_PODIUM = makeAuthoredSite('worldWideHouse', '環球大廈', 'World-Wide House', WORLD_WIDE_PODIUM_SOURCE, {height: 16});
// Traced from the labelled, unscaled 5–11/F floor plan at HK Podium / 28Hse.
// Uniform approximate scale and a best-fit placement inside the mapped podium;
// neither exact offset nor upper storeys are independently surveyed.
const trace = [[19,85],[39,65],[448,65],[468,85],[468,246],[590,246],[610,266],
  [610,607],[590,627],[180,627],[160,607],[160,455],[39,455],[19,435]];
const highTrace = [[19,85],[39,65],[448,65],[468,85],[468,455],[39,455],[19,435]];
const convert = pts => Object.freeze([...pts,pts[0]].flatMap(([x,z]) => [-4 - (x - 314.5) * .073, -5 + (z - 346) * .073]));
export const WORLD_WIDE_TOWER_RING = convert(trace);
export const WORLD_WIDE_HIGH_RING = convert(highTrace);
export const WORLD_WIDE_HEIGHT = 108;
export const WORLD_WIDE_LOWER_HEIGHT = 100; // approximate visual setback, not surveyed
export const WORLD_WIDE_PODIUM_HEIGHT = 16;
export const WORLD_WIDE_ENTRANCE_VERTICES = Object.freeze([3,4]); // OSM nodes 2991175226, 2991175248
