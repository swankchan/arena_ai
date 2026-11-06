// Hong Kong Central Library, Causeway Bay: exact current OSM building and outer-site rings.
// OSM supplies geography and tags; the Gate to Knowledge, facade schedule and forecourt pieces are
// photo/official-publication-directed modelling controls, not surveyed architectural drawings.
import {
  authoredOsmSource, makeAuthoredSite, makePhotoDirectedSite, authoredTerrainHeightAt,
  authoredLocalToWorld, authoredWorldToLocal,
} from './authored-landmark-site.js';
import {
  harbourCityRoadRecords, harbourCityPointInRoadCorridor, harbourCityLocalCollider,
  harbourCitySegmentCollider, harbourCityEdgeFrame, harbourCityEdgeOutward,
} from './harbour-city-architecture.js';
import { pointInFlatRing } from './landmark-site.js';

const ll = (points) => points.map(([lon, lat, id]) => ({ lon, lat, ...(id ? { id } : {}) }));
const source = (value) => authoredOsmSource({
  ...value,
  evidence: value.evidence || 'Current OSM way geometry and tags retrieved from the OSM API; not a surveyed architectural drawing.',
});

export const CENTRAL_LIBRARY_BUILDING_OSM_SOURCE = source({
  id: 856995407, version: 5, sourceTimestamp: '2024-12-01T03:15:58Z',
  tags: {
    'addr:housename': '香港中央圖書館 Hong Kong Central Library', 'addr:housename:en': 'Hong Kong Central Library', 'addr:housename:zh': '香港中央圖書館',
    'addr:housenumber': '66', 'addr:street': '高士威道 Causeway Road', amenity: 'library', building: 'civic', 'building:levels': '11',
    community_centre: 'yes', library: 'yes', name: '香港中央圖書館 Hong Kong Central Library', 'name:en': 'Hong Kong Central Library', 'name:zh': '香港中央圖書館',
    'name:zh-Hans': '香港中央图书馆', 'name:zh-Hant': '香港中央圖書館', operator: '香港公共圖書館 Hong Kong Public Libraries',
    'operator:en': 'Hong Kong Public Libraries', 'operator:short': 'HKPL', 'operator:type': 'government', 'operator:wikidata': 'Q838662',
    'operator:zh': '香港公共圖書館', 'operator:zh-Hans': '香港公共图书馆', 'operator:zh-Hant': '香港公共圖書館',
  },
  geometry: ll([
    [114.1895186, 22.2794392, 6164915329], [114.1901317, 22.2798575, 12304843893], [114.1901630, 22.2798788, 6164915330],
    [114.1898090, 22.2803480, 6164915325], [114.1897897, 22.2803348, 12304843892], [114.1897371, 22.2802989, 6164915326],
    [114.1897026, 22.2803423, 6164915328], [114.1896676, 22.2803184, 12304843891], [114.1893924, 22.2801307, 12304843890],
    [114.1891173, 22.2799430, 9626527740], [114.1895186, 22.2794392, 6164915329],
  ]),
});

export const CENTRAL_LIBRARY_SITE_OSM_SOURCE = source({
  id: 856995408, version: 5, sourceTimestamp: '2024-12-01T03:15:58Z',
  tags: {
    'addr:housename': '香港中央圖書館 Hong Kong Central Library', 'addr:housename:en': 'Hong Kong Central Library', 'addr:housename:zh': '香港中央圖書館',
    'addr:housenumber': '66', 'addr:street': '高士威道 Causeway Road', 'addr:street:en': 'Causeway Road', 'addr:street:zh': '高士威道',
    amenity: 'library', branch: '香港中央 Hong Kong Central', 'branch:en': 'Hong Kong Central', 'branch:zh': '香港中央', community_centre: 'yes',
    designation: '中央圖書館 Central Library', 'designation:en': 'Central Library', 'designation:zh': '中央圖書館',
    email: 'hkcl_ref@lcsd.gov.hk', fax: '+852 2881 5500', name: '香港中央圖書館 Hong Kong Central Library', 'name:en': 'Hong Kong Central Library',
    'name:zh': '香港中央圖書館', 'name:zh-Hans': '香港中央图书馆', 'name:zh-Hant': '香港中央圖書館',
    operator: '康樂及文化事務署 Leisure and Cultural Services Department', 'operator:en': 'Leisure and Cultural Services Department',
    'operator:ownership': 'government', 'operator:wikidata': 'Q2353346', 'operator:zh': '康樂及文化事務署', ownership: 'government',
    phone: '+852 3150 1234', toilets: 'yes', 'toilets:wheelchair': 'yes', website: 'https://www.hkpl.gov.hk/hkcl/', wheelchair: 'yes',
    wikidata: 'Q616184', wikimedia_commons: 'Category:Hong Kong Central Library', wikipedia: 'zh-yue:香港中央圖書館',
  },
  geometry: ll([
    [114.1895442, 22.2793815, 7280114953], [114.1889883, 22.2800767, 9626527741], [114.1896688, 22.2805339, 9626527747],
    [114.1898090, 22.2803480, 6164915325], [114.1900369, 22.2800460, 9626527738], [114.1900896, 22.2799762, 9626527739],
    [114.1901630, 22.2798788, 6164915330], [114.1901997, 22.2798303, 9626527744], [114.1896653, 22.2794644, 8062666829],
    [114.1895442, 22.2793815, 7280114953],
  ]),
});

export const CENTRAL_LIBRARY_SITE_ROAD_IDS = Object.freeze([45333]);
export const CENTRAL_LIBRARY_SITE = makeAuthoredSite(
  'centralLibrarySite', '香港中央圖書館 Hong Kong Central Library', 'Hong Kong Central Library', CENTRAL_LIBRARY_SITE_OSM_SOURCE,
  { role: 'site', roadIds: CENTRAL_LIBRARY_SITE_ROAD_IDS, evidence: 'Outer OSM site way 856995408 is used for the forecourt/ground audit only; it is not a second solid building footprint.' },
);
export const CENTRAL_LIBRARY_BUILDING_SITE = makeAuthoredSite(
  'centralLibrary', '香港中央圖書館 Hong Kong Central Library', 'Hong Kong Central Library', CENTRAL_LIBRARY_BUILDING_OSM_SOURCE,
  { height: null, levels: 11, role: 'building', evidence: 'Exact OSM way 856995407 building ring and 11-level tag. HKPL describes a 12-storey library; the visual height is separately photo-directed and is not an OSM height tag.' },
);
export const CENTRAL_LIBRARY_BUILDING_SITES = Object.freeze([CENTRAL_LIBRARY_BUILDING_SITE]);
export const CENTRAL_LIBRARY_GROUND_SITES = Object.freeze([CENTRAL_LIBRARY_SITE]);
export const CENTRAL_LIBRARY_GROUND_RINGS = Object.freeze([CENTRAL_LIBRARY_SITE.ring]);

export const CENTRAL_LIBRARY_OPENING_YEAR = 2001;
export const CENTRAL_LIBRARY_OFFICIAL_STOREYS = 12;
export const CENTRAL_LIBRARY_OSM_LEVELS = 11;
export const CENTRAL_LIBRARY_OFFICIAL_SITE_AREA = 9400;
export const CENTRAL_LIBRARY_OFFICIAL_GROSS_FLOOR_AREA = 33800;
// Visual modelling dimensions, deliberately not presented as surveyed or official height measurements.
export const CENTRAL_LIBRARY_HEIGHT = 58.8;
export const CENTRAL_LIBRARY_PODIUM_HEIGHT = 8.4;
export const CENTRAL_LIBRARY_FLOOR_HEIGHT = 4.35;
export const CENTRAL_LIBRARY_MAIN_FACADE_EDGES = Object.freeze([7, 8]);
export const CENTRAL_LIBRARY_MAIN_FACADE_LENGTH = CENTRAL_LIBRARY_MAIN_FACADE_EDGES.reduce((sum, edge) => sum + harbourCityEdgeOutward(CENTRAL_LIBRARY_BUILDING_SITE.localRing, edge).length, 0);

// The main frontage is the shared midpoint of source edges 7+8, facing Causeway Road. There is no
// entrance=yes node in the source way, so this is explicitly photo/floorplan-directed.
export const CENTRAL_LIBRARY_MAIN_ENTRANCE = harbourCityEdgeFrame(
  CENTRAL_LIBRARY_BUILDING_SITE, 7, 'Hong Kong Central Library Causeway Road main entrance',
  'Photo- and HKPL-ground-floor-plan-directed midpoint of the two Causeway Road facade edges 7+8; no OSM entrance node is claimed.', 1,
);
export const CENTRAL_LIBRARY_WINDOW_OF_HOPE = harbourCityEdgeFrame(
  CENTRAL_LIBRARY_BUILDING_SITE, 0, 'Hong Kong Central Library Window of Hope',
  'Photo-directed rear Window of Hope on source edge 0; its size and arched frame are visual controls, not a measured opening.', .5,
);

// A circular photo-directed fountain / rotating-globe feature in the outer forecourt. It is not an OSM ring.
const fountainCentre = {
  x: CENTRAL_LIBRARY_MAIN_ENTRANCE.x + CENTRAL_LIBRARY_MAIN_ENTRANCE.nx * 13.2,
  z: CENTRAL_LIBRARY_MAIN_ENTRANCE.z + CENTRAL_LIBRARY_MAIN_ENTRANCE.nz * 13.2,
};
const fountainRing = [];
for (let i = 0; i <= 32; i += 1) {
  const angle = i / 32 * Math.PI * 2;
  fountainRing.push(fountainCentre.x + Math.cos(angle) * 5.2, fountainCentre.z + Math.sin(angle) * 5.2);
}
export const CENTRAL_LIBRARY_FOUNTAIN_SITE = makePhotoDirectedSite(
  'centralLibraryFountain', '中央圖書館地球噴泉 Central Library globe fountain', fountainRing,
  'Photo-directed circular forecourt fountain and rotating globe outside the Causeway Road entrance; not a fabricated OSM footprint.',
  { role: 'fountain' },
);
export const CENTRAL_LIBRARY_FOUNTAIN_WORLD = Object.freeze(fountainCentre);

const arrivalRing = [];
const arrivalTangent = { x: Math.cos(CENTRAL_LIBRARY_MAIN_ENTRANCE.ry), z: -Math.sin(CENTRAL_LIBRARY_MAIN_ENTRANCE.ry) };
for (const [u, v] of [[-15, 0], [15, 0], [15, 9], [-15, 9], [-15, 0]]) {
  arrivalRing.push(
    CENTRAL_LIBRARY_MAIN_ENTRANCE.x + arrivalTangent.x * u + CENTRAL_LIBRARY_MAIN_ENTRANCE.nx * v,
    CENTRAL_LIBRARY_MAIN_ENTRANCE.z + arrivalTangent.z * u + CENTRAL_LIBRARY_MAIN_ENTRANCE.nz * v,
  );
}
export const CENTRAL_LIBRARY_ARRIVAL_SITE = makePhotoDirectedSite(
  'centralLibraryArrival', '中央圖書館入口雙樓梯 Central Library double-stair arrival', arrivalRing,
  'Photo-directed 30 x 9 m entrance/stair clearance apron derived from the Causeway Road facade; not an OSM footprint.',
  { role: 'arrival' },
);

export function centralLibraryRoadRecords(site) { return harbourCityRoadRecords(site); }
export function centralLibraryPointInRoadCorridor(site, x, z, margin = .35) { return harbourCityPointInRoadCorridor(site, x, z, margin); }
export function centralLibraryTerrainHeightAt(x, z, rawHeight, padHeight) { return authoredTerrainHeightAt(CENTRAL_LIBRARY_GROUND_SITES, x, z, rawHeight, padHeight); }
export function centralLibraryGroundHeightAt(x, z, ground, padHeight) { return centralLibraryTerrainHeightAt(x, z, ground, padHeight); }
export function centralLibraryLocalToWorld(site, x, z) { return authoredLocalToWorld(site, x, z); }
export function centralLibraryWorldToLocal(site, x, z) { return authoredWorldToLocal(site, x, z); }
export function centralLibraryLocalCollider(site, x, z, w, d, minY, maxY, ry = site.ry) { return harbourCityLocalCollider(site, x, z, w, d, minY, maxY, ry); }
export function centralLibrarySegmentCollider(site, edge, t0, t1, minY, maxY, depth = .5) { return harbourCitySegmentCollider(site, edge, t0, t1, minY, maxY, depth); }
export function centralLibraryRingColliders(site, minY, maxY, depth = .5) {
  const colliders = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) colliders.push(centralLibrarySegmentCollider(site, edge, 0, 1, minY, maxY, depth));
  return colliders;
}
function distanceToRing(ring, x, z) {
  let distance = Infinity;
  for (let i = 2; i < ring.length; i += 2) {
    const ax = ring[i - 2], az = ring[i - 1], dx = ring[i] - ax, dz = ring[i + 1] - az;
    const lengthSq = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    distance = Math.min(distance, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return distance;
}
export function centralLibraryLampConflictAt(x, z) {
  const b = CENTRAL_LIBRARY_SITE.bounds;
  if (x < b.minX - 1 || x > b.maxX + 1 || z < b.minZ - 1 || z > b.maxZ + 1) return false;
  if (pointInFlatRing(CENTRAL_LIBRARY_BUILDING_SITE.ring, x, z) || distanceToRing(CENTRAL_LIBRARY_BUILDING_SITE.ring, x, z) < .55) return true;
  if (pointInFlatRing(CENTRAL_LIBRARY_ARRIVAL_SITE.ring, x, z) || distanceToRing(CENTRAL_LIBRARY_ARRIVAL_SITE.ring, x, z) < .55) return true;
  return pointInFlatRing(CENTRAL_LIBRARY_FOUNTAIN_SITE.ring, x, z) || distanceToRing(CENTRAL_LIBRARY_FOUNTAIN_SITE.ring, x, z) < .55;
}

// Reserve the whole outer civic site in legacy generic-lot mode, including lots which straddle a ring.
export function centralLibraryGenericLotConflict(lot) {
  const b = CENTRAL_LIBRARY_SITE.bounds, margin = 1;
  if (lot.x + lot.w * .5 < b.minX - margin || lot.x - lot.w * .5 > b.maxX + margin || lot.z + lot.d * .5 < b.minZ - margin || lot.z - lot.d * .5 > b.maxZ + margin) return false;
  const cs = Math.cos(lot.ry || 0), sn = Math.sin(lot.ry || 0), hx = lot.w * .5, hz = lot.d * .5;
  for (const u of [-hx, hx]) for (const v of [-hz, hz]) {
    const x = lot.x + cs * u + sn * v, z = lot.z - sn * u + cs * v;
    if (pointInFlatRing(CENTRAL_LIBRARY_SITE.ring, x, z)) return true;
  }
  for (let i = 0; i < CENTRAL_LIBRARY_SITE.ring.length; i += 2) {
    const dx = CENTRAL_LIBRARY_SITE.ring[i] - lot.x, dz = CENTRAL_LIBRARY_SITE.ring[i + 1] - lot.z;
    const u = cs * dx - sn * dz, v = sn * dx + cs * dz;
    if (Math.abs(u) <= hx && Math.abs(v) <= hz) return true;
  }
  return pointInFlatRing(CENTRAL_LIBRARY_SITE.ring, lot.x, lot.z);
}

export const CENTRAL_LIBRARY_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://www.hkpl.gov.hk/en/about-us/HKCL/intro.html', publisher: 'Hong Kong Public Libraries', evidence: 'Official introduction: opened in 2001, 12-storey Hong Kong Central Library, 9,400 m² site and 33,800 m² gross floor area; the Gate to Knowledge is the defining entrance feature.' }),
  Object.freeze({ url: 'https://www.hkpl.gov.hk/en/about-us/HKCL/floor-plan/Ground.html', publisher: 'Hong Kong Public Libraries — Ground Floor plan', evidence: 'Official ground-floor plan and visitor facilities guide the Causeway Road entrance, forecourt, foyer and circulation relationship; it is not a surveyed exterior elevation.' }),
  Object.freeze({ url: 'http://www.building.hk/feature/07_01centrally.htm', publisher: 'Building Journal — Hong Kong Central Library', evidence: 'Architectural feature records yellow GRC cladding, the triangular pediment and three Ionic columns on each side of the Gate to Knowledge, seventh-floor solid wall, rear Window of Hope, pale green glass, double entrance stairs, water feature and rotating globe. Architectural Services Department designed the building and China State Construction built it.' }),
  Object.freeze({ url: 'https://www.hkpl.gov.hk/en/about-us/HKCL/intro.html', publisher: 'HKPL / LCSD photographic and visitor material', evidence: 'Exterior photographs reviewed for the blue-green central glazing, beige GRC window grid, dark side roof wings, bilingual sign, fountain and flagpoles. Research images are not redistributed as textures or runtime assets.' }),
]);
