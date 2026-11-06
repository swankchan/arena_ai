// Former Kowloon-Canton Railway Clock Tower: exact OSM monument ring and source-tagged main entrance.
// The 44 m tower and 7 m lightning rod are official facts. Pool, apron, palms and architectural stage
// proportions are photo-directed visual modelling values, not surveyed dimensions or an invented OSM fountain.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
import {
  harbourCityLocalToWorld, harbourCityWorldToLocal, harbourCityRoadRecords,
  harbourCityPointInRoadCorridor, harbourCityEdgeFrame,
} from './harbour-city-architecture.js';

export const CLOCK_TOWER_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-04',
  sourceUrl: 'https://www.openstreetmap.org/api/0.6/way/37664321/full.json', type: 'way', id: 37664321,
  version: 17, sourceTimestamp: '2023-10-21T07:19:47Z', changeset: 142910648,
  nodes: Object.freeze([441536070, 6980052362, 441536071, 441536072, 441536073, 441536070]),
  tags: Object.freeze({"alt_name":"九廣鐵路鐘樓 Kowloon-Canton Railway Clock Tower","alt_name:en":"Kowloon-Canton Railway Clock Tower","alt_name:zh":"九廣鐵路鐘樓","amenity":"clock","bell":"yes","building":"service","description":"Former KCR Clock Tower","description:en":"Former Kowloon-Canton Railway Clock Tower","display":"analog","faces":"4","height":"44","man_made":"tower","name":"尖沙咀鐘樓 Tsim Sha Tsui Clock Tower","name:en":"Tsim Sha Tsui Clock Tower","name:zh":"尖沙咀鐘樓","roof:shape":"dome","tower":"bell","tower:construction":"concrete","tower:type":"bell_tower","wikidata":"Q692288","wikimedia_commons":"Category:Clock Tower, Hong Kong","wikipedia":"zh:前九廣鐵路鐘樓"}),
  geometry: Object.freeze([
    Object.freeze({ lat: 22.2935899, lon: 114.1694890, id: 441536070 }),
    Object.freeze({ lat: 22.2936138, lon: 114.1695114, id: 6980052362 }),
    Object.freeze({ lat: 22.2936376, lon: 114.1695337, id: 441536071 }),
    Object.freeze({ lat: 22.2935953, lon: 114.1695866, id: 441536072 }),
    Object.freeze({ lat: 22.2935475, lon: 114.1695418, id: 441536073 }),
    Object.freeze({ lat: 22.2935899, lon: 114.1694890, id: 441536070 }),
  ]),
});
export const CLOCK_TOWER_ENTRANCE_OSM_SOURCE = Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-04',
  sourceUrl: 'https://www.openstreetmap.org/api/0.6/node/6980052362.json', type: 'node', id: 6980052362,
  version: 5, sourceTimestamp: '2023-08-26T16:28:01Z', lat: 22.2936138, lon: 114.1695114,
  tags: Object.freeze({ entrance: 'main' }),
});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
function flatRingArea(ring) { let area = 0; for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return area * .5; }
const ring = Object.freeze(CLOCK_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const baseSite = {
  key: 'clockTower', name: '尖沙咀鐘樓 Tsim Sha Tsui Clock Tower', englishName: 'Former Kowloon-Canton Railway Clock Tower',
  source: CLOCK_TOWER_OSM_SOURCE, osmType: 'way', osmId: CLOCK_TOWER_OSM_SOURCE.id,
  ring, bounds: flatRingBounds(ring), ringArea: Math.abs(flatRingArea(ring)), ...minimumAreaObb(ring),
  height: 44, levels: 6, minHeight: 0, roadIds: Object.freeze([]),
};
const localRing = Object.freeze(ring.flatMap((value, index, array) => {
  if (index % 2) return [];
  const p = harbourCityWorldToLocal(baseSite, value, array[index + 1]); return [p.x, p.z];
}));
export const CLOCK_TOWER_SITE = Object.freeze({ ...baseSite, localRing });

// OSM splits the northwest facade at the real entrance node. Rejoin only that collinear pair for four architectural facades;
// the underlying collision / footprint ring retains every source vertex and the door remains exactly on node 6980052362.
const facadeSpans = [[0, 2], [2, 3], [3, 4], [4, 5]];
function makeFacade(index) {
  const [ia, ib] = facadeSpans[index], ax = localRing[ia * 2], az = localRing[ia * 2 + 1], bx = localRing[ib * 2], bz = localRing[ib * 2 + 1];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz), sign = flatRingArea(localRing) >= 0 ? 1 : -1;
  const nx = dz / length * sign, nz = -dx / length * sign, cs = Math.cos(baseSite.ry), sn = Math.sin(baseSite.ry);
  return Object.freeze({
    index, sourceEdges: Object.freeze(index === 0 ? [0, 1] : [index + 1]),
    a: Object.freeze([ax, az]), b: Object.freeze([bx, bz]), x: (ax + bx) * .5, z: (az + bz) * .5,
    length, nx, nz, worldNx: cs * nx + sn * nz, worldNz: -sn * nx + cs * nz, ry: Math.atan2(nx, nz),
    windowed: index === 0 || index === 2, entrance: index === 0, fountain: index === 2,
  });
}
export const CLOCK_TOWER_FACADES = Object.freeze([0, 1, 2, 3].map(makeFacade));
// User-reviewed orientation: rotate the complete pool garden exactly +90° counterclockwise about local Y,
// from waterfront facade 3 to the landward doorway side at facade 2. The OSM main-entrance node stays on facade 0.
const waterfrontFacade = CLOCK_TOWER_FACADES[3], fountainNx = waterfrontFacade.nz, fountainNz = -waterfrontFacade.nx;
const fountainCs = Math.cos(baseSite.ry), fountainSn = Math.sin(baseSite.ry);
export const CLOCK_TOWER_FOUNTAIN_FACADE = Object.freeze({
  index: 2, x: waterfrontFacade.z, z: -waterfrontFacade.x, nx: fountainNx, nz: fountainNz,
  worldNx: fountainCs * fountainNx + fountainSn * fountainNz,
  worldNz: -fountainSn * fountainNx + fountainCs * fountainNz,
  ry: waterfrontFacade.ry + Math.PI / 2, fountain: true,
});
export const CLOCK_TOWER_MAIN_ENTRANCE = Object.freeze({
  ...harbourCityEdgeFrame(CLOCK_TOWER_SITE, 0, 'Clock Tower real OSM main entrance',
    'Exact entrance=main node 6980052362; source edge 0 ends at this node and collinear source edge 1 continues the same facade.', 1),
  sourceNodeId: 6980052362, source: CLOCK_TOWER_ENTRANCE_OSM_SOURCE,
});

export const CLOCK_TOWER_HEIGHT = 44;
export const CLOCK_TOWER_LIGHTNING_ROD_HEIGHT = 7;
export const CLOCK_TOWER_TOTAL_HEIGHT = CLOCK_TOWER_HEIGHT + CLOCK_TOWER_LIGHTNING_ROD_HEIGHT;
export const CLOCK_TOWER_MAIN_LEVELS = 6, CLOCK_TOWER_TURRET_LEVELS = 2, CLOCK_TOWER_CLOCK_FACES = 4;
export const CLOCK_TOWER_COMPLETED_YEAR = 1915, CLOCK_TOWER_CLOCKS_COMMISSIONED_YEAR = 1921;
export const CLOCK_TOWER_DECLARED_MONUMENT_DATE = '1990-07-13';
// Visual stage allocations within the official 44 m enclosure; these individual levels are not surveyed measurements.
export const CLOCK_TOWER_MAIN_CORNICE_HEIGHT = 34, CLOCK_TOWER_LOWER_TURRET_TOP = 37.1, CLOCK_TOWER_BELFRY_TOP = 41;

function localRectangle(facade, start, length, halfWidth) {
  const tx = facade.nz, tz = -facade.nx, cx = facade.x + facade.nx * (start + length * .5), cz = facade.z + facade.nz * (start + length * .5), result = [];
  for (const [side, end] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]) {
    result.push(cx + tx * halfWidth * side + facade.nx * length * .5 * end,
      cz + tz * halfWidth * side + facade.nz * length * .5 * end);
  }
  return Object.freeze(result);
}
const toWorldRing = (local) => Object.freeze(local.flatMap((value, index, array) => {
  if (index % 2) return [];
  const p = harbourCityLocalToWorld(CLOCK_TOWER_SITE, value, array[index + 1]); return [p.x, p.z];
}));
export const CLOCK_TOWER_POOL_OFFSET = 2, CLOCK_TOWER_POOL_LENGTH = 18, CLOCK_TOWER_POOL_WIDTH = 4.4;
export const CLOCK_TOWER_APRON_LENGTH = 20, CLOCK_TOWER_APRON_WIDTH = 6.8;
export const CLOCK_TOWER_POOL_LOCAL_RING = localRectangle(CLOCK_TOWER_FOUNTAIN_FACADE, CLOCK_TOWER_POOL_OFFSET, CLOCK_TOWER_POOL_LENGTH, CLOCK_TOWER_POOL_WIDTH * .5);
export const CLOCK_TOWER_POOL_RING = toWorldRing(CLOCK_TOWER_POOL_LOCAL_RING);
const gardenLocalRing = localRectangle(CLOCK_TOWER_FOUNTAIN_FACADE, 0, CLOCK_TOWER_APRON_LENGTH, CLOCK_TOWER_APRON_WIDTH * .5);
const gardenRing = toWorldRing(gardenLocalRing);
export const CLOCK_TOWER_GARDEN_SITE = Object.freeze({
  key: 'clockTowerFountainGarden', name: '尖沙咀鐘樓噴水池一帶 Clock Tower Fountain Garden',
  photoDirected: true, osmType: null, osmId: null, source: null,
  evidence: 'AMO photographs direct the long reflecting pool, central jet line, paving and palm rows. The user-reviewed garden orientation is southeast on facade 2, rotated +90° counterclockwise from facade 3. No precise OSM fountain footprint or surveyed pool dimensions are claimed.',
  x: CLOCK_TOWER_SITE.x, z: CLOCK_TOWER_SITE.z, ry: CLOCK_TOWER_SITE.ry,
  localRing: gardenLocalRing, ring: gardenRing, bounds: flatRingBounds(gardenRing), ringArea: Math.abs(flatRingArea(gardenRing)),
  roadIds: Object.freeze([]),
});
export const CLOCK_TOWER_PALM_DISTANCES = Object.freeze([4, 7.6, 11.2, 14.8, 18.4]);
export const CLOCK_TOWER_PALM_OFFSET = 6.1;
export const CLOCK_TOWER_PALMS = Object.freeze(CLOCK_TOWER_PALM_DISTANCES.flatMap((distance, index) => [-1, 1].map((side) => {
  const f = CLOCK_TOWER_FOUNTAIN_FACADE, x = f.x + f.nx * distance + f.nz * side * CLOCK_TOWER_PALM_OFFSET;
  const z = f.z + f.nz * distance - f.nx * side * CLOCK_TOWER_PALM_OFFSET, world = harbourCityLocalToWorld(CLOCK_TOWER_SITE, x, z);
  return Object.freeze({ index, side, distance, x, z, worldX: world.x, worldZ: world.z });
})));
export const CLOCK_TOWER_JET_DISTANCES = Object.freeze([4, 7.5, 11, 14.5, 18]);
export const CLOCK_TOWER_JETS = Object.freeze(CLOCK_TOWER_JET_DISTANCES.map((distance, index) => {
  const f = CLOCK_TOWER_FOUNTAIN_FACADE;
  return Object.freeze({ index, distance, x: f.x + f.nx * distance, z: f.z + f.nz * distance });
}));

export const CLOCK_TOWER_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://www.amo.gov.hk/en/historic-buildings/monuments/kowloon/monuments_43/index.html', publisher: 'Antiquities and Monuments Office', evidence: 'Official monument history and architecture: completed in 1915, declared a monument on 13 July 1990, Edwardian Classical Revival red brick and granite, 44 m high with a 7 m lightning rod, four clock faces, white scroll buttresses / columns / cornices and an octagonal domed belfry.' }),
  Object.freeze({ url: 'https://www.amo.gov.hk/filemanager/amo/common/download-area/pamphlet/clock_tower.pdf', publisher: 'Antiquities and Monuments Office — official Clock Tower pamphlet', evidence: 'Official pamphlet: six-storey square main building plus a two-storey octagonal domed turret; rectangular wooden-framed glazing with granite surrounds and pediment heads, diamond-pattern windows near the flat top, concrete dome and slender steel support for the 7 m rod. Electric clocks and the one-ton bell commenced operation in March 1921.' }),
  Object.freeze({ url: 'https://www.amo.gov.hk/en/historic-buildings/monuments/kowloon/monuments_43/index.html#photographs', publisher: 'AMO monument photographs DM043_1–DM043_4', evidence: 'Visually checked official photographs show alternating granite quoins, the tall red-brick panels, three narrow windows above each clock, the long narrow reflecting pool, a central line of water jets and flanking palm rows. Temporary festival displays and present repair hoarding / scaffolding are not permanent architecture.' }),
]);
export const CLOCK_TOWER_MODEL_NOTES = 'Only the tower uses OSM way 37664321 v17. The 18 m × 4.4 m pool, 20 m × 6.8 m apron, five jets and ten palms are photo-directed visual modelling choices constrained to land; they are not surveyed dimensions or a claimed OSM fountain.';

export function clockTowerTerrainHeightAt(x, z, rawHeight, padHeight) {
  const inTower = pointInFlatRing(CLOCK_TOWER_SITE.ring, x, z), inGarden = pointInFlatRing(CLOCK_TOWER_GARDEN_SITE.ring, x, z);
  if (!inTower && !inGarden) return rawHeight;
  if (inTower && harbourCityPointInRoadCorridor(CLOCK_TOWER_SITE, x, z)) return rawHeight;
  if (inGarden && harbourCityPointInRoadCorridor(CLOCK_TOWER_GARDEN_SITE, x, z)) return rawHeight;
  return Math.max(rawHeight, padHeight);
}
export function clockTowerGroundHeightAt(x, z, ground, padHeight) { return clockTowerTerrainHeightAt(x, z, ground, padHeight); }
export function clockTowerRoadRecords(site) { return harbourCityRoadRecords(site); }
export { harbourCityLocalToWorld, harbourCityWorldToLocal };
