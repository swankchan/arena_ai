// Hong Kong Cultural Centre, Tsim Sha Tsui: exact OSM civic-building ring and photo-directed sail profiles.
// OSM supplies the footprint, not a surveyed roof height. The two sail peaks and administration roof are visual modelling values.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
import {
  harbourCityLocalToWorld, harbourCityWorldToLocal, harbourCityRoadRecords,
  harbourCityPointInRoadCorridor, harbourCityEdgeFrame, harbourCityEdgeOutward,
} from './harbour-city-architecture.js';

const source = (value) => Object.freeze({
  attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-04',
  sourceUrl: `https://www.openstreetmap.org/api/0.6/way/${value.id}/full.json`, type: 'way', id: value.id,
  version: value.version, sourceTimestamp: value.sourceTimestamp, tags: Object.freeze(value.tags),
  geometry: Object.freeze(value.geometry.map((point) => Object.freeze(point))),
});

export const CULTURAL_CENTRE_OSM_SOURCE = source({"id":37664345,"version":27,"sourceTimestamp":"2025-11-23T09:38:29Z","tags":{"addr:street":"梳士巴利道 Salisbury Road","addr:street:en":"Salisbury Road","addr:street:wikidata":"Q4035576","addr:street:zh":"梳士巴利道","amenity":"arts_centre","building":"civic","name":"香港文化中心 Hong Kong Cultural Centre","name:de":"Hong Kong Cultural Centre","name:en":"Hong Kong Cultural Centre","name:fr":"Centre culturel de Hong Kong","name:he":"מרכז התרבות של הונג קונג","name:ja":"香港文化中心","name:ja-Hira":"ホンコンぶんかちゅうしん","name:ko":"홍콩문화센터","name:ru":"Гонконгский культурный центр","name:zh":"香港文化中心","name:zh-Latn-pinyin":"Xiānggǎng Wénhuà Zhōngxīn","phone":"+852 2734 2009","start_date":"1989","tourism":"yes","website":"https://www.lcsd.gov.hk/en/hkcc/index.html","wikidata":"Q598086","wikimedia_commons":"Category:Hong Kong Cultural Centre","wikipedia":"en:Hong Kong Cultural Centre"},"geometry":[{"lat":22.2941700,"lon":114.1695700},{"lat":22.2938800,"lon":114.1695900},{"lat":22.2938100,"lon":114.1699000},{"lat":22.2937820,"lon":114.1699920},{"lat":22.2937430,"lon":114.1700730},{"lat":22.2937000,"lon":114.1701390},{"lat":22.2936550,"lon":114.1701900},{"lat":22.2936090,"lon":114.1702290},{"lat":22.2935600,"lon":114.1702600},{"lat":22.2932010,"lon":114.1704500},{"lat":22.2932350,"lon":114.1708550},{"lat":22.2940410,"lon":114.1707850},{"lat":22.2942480,"lon":114.1706120},{"lat":22.2941700,"lon":114.1695700}]});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
function flatRingArea(ring) { let area = 0; for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return area * .5; }
const ring = Object.freeze(CULTURAL_CENTRE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
const baseSite = {
  key: 'culturalCentre', name: '香港文化中心 Hong Kong Cultural Centre', englishName: 'Hong Kong Cultural Centre',
  source: CULTURAL_CENTRE_OSM_SOURCE, osmType: 'way', osmId: CULTURAL_CENTRE_OSM_SOURCE.id,
  ring, bounds: flatRingBounds(ring), ringArea: Math.abs(flatRingArea(ring)), ...minimumAreaObb(ring),
  height: null, levels: null, minHeight: 0, roadIds: Object.freeze([]),
};
const localRing = Object.freeze(ring.flatMap((value, index, array) => {
  if (index % 2) return [];
  const p = harbourCityWorldToLocal(baseSite, value, array[index + 1]); return [p.x, p.z];
}));
export const CULTURAL_CENTRE_SITE = Object.freeze({ ...baseSite, localRing });

// Edges 0–9 are the harbour / piazza sail chain. A photo-directed internal line from source edge 10
// back to vertex 0 reserves the lower Salisbury Road / administration strip without altering the source ring.
const pointAt = (ring, index) => [ring[index * 2], ring[index * 2 + 1]];
export const CULTURAL_CENTRE_PARTITION_T = .64;
const partitionPoint = [localRing[20] + (localRing[22] - localRing[20]) * CULTURAL_CENTRE_PARTITION_T,
  localRing[21] + (localRing[23] - localRing[21]) * CULTURAL_CENTRE_PARTITION_T];
export const CULTURAL_CENTRE_PARTITION_POINT = Object.freeze(partitionPoint);
export const CULTURAL_CENTRE_MAIN_RING = Object.freeze([...localRing.slice(0, 22), ...partitionPoint, ...pointAt(localRing, 0)]);
export const CULTURAL_CENTRE_ADMIN_RING = Object.freeze([...pointAt(localRing, 0), ...partitionPoint, ...pointAt(localRing, 11), ...pointAt(localRing, 12), ...pointAt(localRing, 0)]);
export const CULTURAL_CENTRE_MAIN_RING_AREA = Math.abs(flatRingArea(CULTURAL_CENTRE_MAIN_RING));
export const CULTURAL_CENTRE_ADMIN_RING_AREA = Math.abs(flatRingArea(CULTURAL_CENTRE_ADMIN_RING));
export const CULTURAL_CENTRE_HARBOUR_CHAIN_EDGES = Object.freeze(Array.from({ length: 10 }, (_, index) => index));
const chainLengths = CULTURAL_CENTRE_HARBOUR_CHAIN_EDGES.map((edge) => harbourCityEdgeOutward(localRing, edge).length);
const chainStarts = chainLengths.map((_, index) => chainLengths.slice(0, index).reduce((sum, length) => sum + length, 0));
export const CULTURAL_CENTRE_VALLEY_DISTANCE = chainStarts[6];
export const CULTURAL_CENTRE_CHAIN_LENGTH = chainLengths.reduce((sum, length) => sum + length, 0);

export const CULTURAL_CENTRE_OPENING_YEAR = 1989;
export const CULTURAL_CENTRE_OPENING_DATE = '1989-11-08';
export const CULTURAL_CENTRE_SITE_HECTARES = 5.2;
export const CULTURAL_CENTRE_GROSS_FLOOR_AREA = 82231;
// Photo-directed proportions only; these are deliberately not labelled as OSM / official surveyed heights.
export const CULTURAL_CENTRE_WEST_PEAK_HEIGHT = 33;
export const CULTURAL_CENTRE_EAST_PEAK_HEIGHT = 35;
export const CULTURAL_CENTRE_VALLEY_HEIGHT = 16;
export const CULTURAL_CENTRE_ADMIN_HEIGHT = 16.5;
export const CULTURAL_CENTRE_SAIL_BASE_HEIGHT = 5.5;

export function culturalCentreSailHeightAtDistance(distance) {
  const s = Math.max(0, Math.min(CULTURAL_CENTRE_CHAIN_LENGTH, distance));
  if (s <= CULTURAL_CENTRE_VALLEY_DISTANCE) {
    const t = 1 - s / CULTURAL_CENTRE_VALLEY_DISTANCE;
    return CULTURAL_CENTRE_VALLEY_HEIGHT + (CULTURAL_CENTRE_WEST_PEAK_HEIGHT - CULTURAL_CENTRE_VALLEY_HEIGHT) * (1 - Math.cos(t * Math.PI * .5));
  }
  const t = (s - CULTURAL_CENTRE_VALLEY_DISTANCE) / (CULTURAL_CENTRE_CHAIN_LENGTH - CULTURAL_CENTRE_VALLEY_DISTANCE);
  return CULTURAL_CENTRE_VALLEY_HEIGHT + (CULTURAL_CENTRE_EAST_PEAK_HEIGHT - CULTURAL_CENTRE_VALLEY_HEIGHT) * (1 - Math.cos(t * Math.PI * .5));
}

export function culturalCentreChainNearest(x, z) {
  let best = { distanceSq: Infinity, s: 0, x: localRing[0], z: localRing[1], edge: 0, t: 0 };
  for (const edge of CULTURAL_CENTRE_HARBOUR_CHAIN_EDGES) {
    const i = edge * 2, ax = localRing[i], az = localRing[i + 1], dx = localRing[i + 2] - ax, dz = localRing[i + 3] - az;
    const lengthSq = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    const px = ax + dx * t, pz = az + dz * t, distanceSq = (x - px) ** 2 + (z - pz) ** 2;
    if (distanceSq < best.distanceSq) best = { distanceSq, s: chainStarts[edge] + chainLengths[edge] * t, x: px, z: pz, edge, t };
  }
  return { ...best, height: culturalCentreSailHeightAtDistance(best.s) };
}

export function culturalCentreChainFrameAtDistance(distance) {
  const s = Math.max(0, Math.min(CULTURAL_CENTRE_CHAIN_LENGTH, distance));
  let edge = CULTURAL_CENTRE_HARBOUR_CHAIN_EDGES.length - 1;
  for (let i = 0; i < chainLengths.length; i += 1) if (s <= chainStarts[i] + chainLengths[i]) { edge = i; break; }
  return { edge, t: Math.max(0, Math.min(1, (s - chainStarts[edge]) / chainLengths[edge])), s };
}

export const CULTURAL_CENTRE_MAIN_ENTRANCE = harbourCityEdgeFrame(
  CULTURAL_CENTRE_SITE, 12, 'Hong Kong Cultural Centre Salisbury Road entrance',
  'Photo- and official-access-directed Salisbury Road / administration foyer on source edge 12; no OSM entrance node is claimed.', .52,
);

export const CULTURAL_CENTRE_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://www.lcsd.gov.hk/en/hkcc/index.html', publisher: 'Hong Kong Cultural Centre / LCSD', evidence: 'Official complex information: opened on 8 November 1989, a 5.2-hectare waterfront site and 82,231 sq m gross floor area, with Concert Hall, Grand Theatre, Studio Theatre, Exhibition Gallery and Piazza.' }),
  Object.freeze({ url: 'https://fpf.ccidahk.gov.hk/en/location/detail.php?id=27', publisher: 'HKSAR Film Promotion and Facilitation Section', evidence: 'Official location description calls the plain exterior a vast winged chute. Visually checked government photographs show the dusty-pink small-tile sails, narrow glazed slit, horizontal administration ribbons, deep covered foyer and direct Cultural Centre lettering.' }),
  Object.freeze({ url: 'https://fpf.ccidahk.gov.hk/en/location/detail.php?id=945', publisher: 'HKSAR Film Promotion and Facilitation Section — Cultural Centre Piazza', evidence: 'Official Piazza description identifies the open spaces east and west of the Grand Theatre. Visually checked photographs show the inward-sloping lower wall, repeated tiled fins and dark recesses, palm rows, benches and the curved low-point / high-end sail silhouette.' }),
  Object.freeze({ url: 'https://www.lcsd.gov.hk/en/hkcc/aboutus/services/barrierfree.html', publisher: 'Hong Kong Cultural Centre / LCSD', evidence: 'Official access information identifies automatic doors at the Auditoria Building and Administration Building foyers and a vehicle drop-off facing Salisbury Road; used with photographs for the north arrival, not represented as an OSM door node.' }),
  Object.freeze({ url: 'https://www.lcsd.gov.hk/en/hkcc/aboutus/openinghours.html', publisher: 'Hong Kong Cultural Centre / LCSD night photograph', evidence: 'Visually checked official night view retains dark roof planes with restrained cool light on the tall tiled walls; the entire sail is not treated as an emissive surface.' }),
  Object.freeze({ url: 'https://www.dreamstime.com/photos-images/hong-kong-cultural-centre.html', publisher: 'Dreamstime editorial night photographs', evidence: 'Visually checked night photographs show warm repeated canopy downlights, illuminated covered foyer / columns and dark ribbon glazing; visual direction only, not dimensions or an asset source.' }),
]);

export function culturalCentreTerrainHeightAt(x, z, rawHeight, padHeight) {
  const b = CULTURAL_CENTRE_SITE.bounds;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ || !pointInFlatRing(CULTURAL_CENTRE_SITE.ring, x, z)) return rawHeight;
  return harbourCityPointInRoadCorridor(CULTURAL_CENTRE_SITE, x, z) ? rawHeight : Math.max(rawHeight, padHeight);
}
export function culturalCentreGroundHeightAt(x, z, ground, padHeight) { return culturalCentreTerrainHeightAt(x, z, ground, padHeight); }
export function culturalCentreRoadRecords(site) { return harbourCityRoadRecords(site); }
export { harbourCityLocalToWorld, harbourCityWorldToLocal };
