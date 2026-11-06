// Sheraton Hong Kong Hotel & Towers: exact OSM podium footprint with explicitly photo-directed upper-slab proportions.
// No reliable published architectural height was found; the 72 m scene height is not presented as an official fact.
import {
  tstHotelOsmSource, makeTstHotelSite, makePhotoDirectedGroundRing, tstHotelTerrainHeightAt,
  tstHotelRoadRecords, tstHotelWorldToLocal, tstHotelLocalToWorld,
} from './tst-hotel-site.js';
import { harbourCityEdgeFrame, harbourCityEdgeOutward } from './harbour-city-architecture.js';

export const SHERATON_OSM_SOURCE = tstHotelOsmSource({ id: 124697432, version: 9, sourceTimestamp: '2026-04-06T06:18:34Z',
  tags: { 'addr:housenumber': '20', 'addr:street': '彌敦道 Nathan Road', 'addr:street:en': 'Nathan Road', 'addr:street:zh': '彌敦道', building: 'yes', 'building:levels': '17', name: '香港喜來登酒店 Sheraton Hong Kong Hotel & Towers', start_date: '1974-02-18' },
  nodes: [1387112154, 1387112150, 1387112146, 1387112147, 1387112140, 1387112139, 1387112136, 8974745438, 1387112137, 1387112144, 8582747131, 8582747132, 1387112141, 1387112148, 1387112149, 1387112154],
  geometry: [{ lat: 22.2955327, lon: 114.1729244 }, { lat: 22.2955040, lon: 114.1724991 }, { lat: 22.2953631, lon: 114.1725102 }, { lat: 22.2953708, lon: 114.1726244 }, { lat: 22.2950597, lon: 114.1726490 }, { lat: 22.2950519, lon: 114.1725348 }, { lat: 22.2949058, lon: 114.1725463 }, { lat: 22.2949088, lon: 114.1725900 }, { lat: 22.2949675, lon: 114.1734596 }, { lat: 22.2951364, lon: 114.1734463 }, { lat: 22.2951309, lon: 114.1733655 }, { lat: 22.2951085, lon: 114.1733672 }, { lat: 22.2950710, lon: 114.1728129 }, { lat: 22.2953895, lon: 114.1727878 }, { lat: 22.2953994, lon: 114.1729349 }, { lat: 22.2955327, lon: 114.1729244 }] });

export const SHERATON_MODEL_HEIGHT = 72;
export const SHERATON_OSM_LEVELS = 17;
export const SHERATON_VISIBLE_ROOM_ROWS = 16;
export const SHERATON_PODIUM_HEIGHT = 12.5;
export const SHERATON_POOL_LEVEL = 18;
export const SHERATON_JACUZZI_COUNT = 3;
export const SHERATON_SITE = makeTstHotelSite('sheraton', '香港喜來登酒店 Sheraton Hong Kong Hotel & Towers', 'Sheraton Hong Kong Hotel & Towers', SHERATON_OSM_SOURCE, SHERATON_MODEL_HEIGHT, SHERATON_OSM_LEVELS);
export const SHERATON_GROUND_SITES = Object.freeze([SHERATON_SITE]);
export const SHERATON_GROUND_RINGS = Object.freeze([SHERATON_SITE.ring]);

// The upper long slab is a photo-directed volume inside the exact irregular podium ring, not a second OSM building way.
export const SHERATON_UPPER_LOCAL_RING = Object.freeze([-42, 18, 42, 18, 42, 32, -42, 32, -42, 18]);
export const SHERATON_UPPER_SITE = Object.freeze({
  ...SHERATON_SITE, key: 'sheratonUpperSlab', name: 'Sheraton photo-directed upper guestroom slab',
  osmType: null, osmId: null, source: null, photoDirected: true, localRing: SHERATON_UPPER_LOCAL_RING,
  w: 84, d: 14, height: SHERATON_MODEL_HEIGHT,
  evidence: 'Long upper slab proportion and placement derived from reviewed exterior photographs; contained by the exact OSM podium ring and not claimed as a surveyed upper-floor plan.',
});

export const SHERATON_MAIN_ENTRANCE = harbourCityEdgeFrame(SHERATON_SITE, 3,
  'Sheraton Nathan Road hotel entrance', 'Photo-directed recessed Nathan Road lobby and canopy on source edge 3; it is not the railway=subway_entrance J4 node elsewhere on the footprint.', 0.5);
export const SHERATON_SUBWAY_J4_NODE = Object.freeze({ type: 'node', id: 8974745438, version: 3,
  sourceTimestamp: '2026-04-06T06:18:34Z', lon: 114.1725900, lat: 22.2949088,
  tags: Object.freeze({ railway: 'subway_entrance', ref: 'J4' }),
  sourceUrl: 'https://www.openstreetmap.org/api/0.6/node/8974745438.json',
  evidence: 'MTR J4 is retained as source context only and is never relabelled as the Sheraton hotel entrance.' });

export const SHERATON_CANOPY_WIDTH = 14;
export const SHERATON_CANOPY_DEPTH = 5.2;
export const SHERATON_CANOPY_SOFFIT = 5.2;
const canopyOutward = harbourCityEdgeOutward(SHERATON_SITE.localRing, SHERATON_MAIN_ENTRANCE.sourceEdge);
const canopyTangent = { x: canopyOutward.nz, z: -canopyOutward.nx };
const canopyCenter = { x: SHERATON_MAIN_ENTRANCE.localX + canopyOutward.nx * SHERATON_CANOPY_DEPTH * 0.5,
  z: SHERATON_MAIN_ENTRANCE.localZ + canopyOutward.nz * SHERATON_CANOPY_DEPTH * 0.5 };
const canopyWorldRing = [];
for (const [side, depth] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]) {
  const localX = canopyCenter.x + canopyTangent.x * side * SHERATON_CANOPY_WIDTH * 0.5 + canopyOutward.nx * depth * SHERATON_CANOPY_DEPTH * 0.5;
  const localZ = canopyCenter.z + canopyTangent.z * side * SHERATON_CANOPY_WIDTH * 0.5 + canopyOutward.nz * depth * SHERATON_CANOPY_DEPTH * 0.5;
  const p = tstHotelLocalToWorld(SHERATON_SITE, localX, localZ); canopyWorldRing.push(p.x, p.z);
}
export const SHERATON_CANOPY_CLEARANCE_SITE = makePhotoDirectedGroundRing('sheratonCanopyClearance', 'Sheraton photo-directed entrance canopy clearance', canopyWorldRing,
  'Clearance polygon for the visual canopy only; not a surveyed entrance footprint or an additional terrain pad.');

export const SHERATON_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://www.marriott.com/en-us/hotels/hkgsi-sheraton-hong-kong-hotel-and-towers/overview/', publisher: 'Marriott — Sheraton Hong Kong Hotel & Towers', evidence: 'Official Tsim Sha Tsui identity and 20 Nathan Road address; official rooftop-pool amenity is separate from unverified building-height claims.' }),
  Object.freeze({ url: 'https://www.marriott.com/en-us/hotels/hkgsi-sheraton-hong-kong-hotel-and-towers/experiences/', publisher: 'Marriott — official experiences', evidence: 'Level 18 outdoor temperature-controlled pool facing the harbour, three heated Jacuzzis and a sundeck. These official amenities guide roof geometry without claiming a surveyed pool location.' }),
  Object.freeze({ url: 'https://marriott.com/hotels/hotel-photos/hkgsi-sheraton-hong-kong-hotel-and-towers', publisher: 'Marriott — official photo gallery', evidence: 'Official exterior and amenity gallery. Reviewed exterior references direct the long beige-concrete / dark-glass guestroom grid, projecting vertical service and sign blade, circular S emblem, SHERATON lettering, warm podium and entrance canopy; photos are not redistributed or treated as measured elevations.' }),
  Object.freeze({ url: 'https://www.openstreetmap.org/api/0.6/way/124697432/full.json', publisher: 'OpenStreetMap contributors', evidence: 'Current way 124697432 v9 supplies the exact 15-vertex closed building ring, 17-level tag, address and 1974-02-18 start_date. It has no height tag; 72 m is only the documented visual scene convention.' }),
]);

export function sheratonTerrainHeightAt(x, z, rawHeight, padHeight) { return tstHotelTerrainHeightAt(SHERATON_GROUND_SITES, x, z, rawHeight, padHeight); }
export function sheratonGroundHeightAt(x, z, ground, padHeight) { return sheratonTerrainHeightAt(x, z, ground, padHeight); }
export function sheratonRoadRecords(site = SHERATON_SITE) { return tstHotelRoadRecords(site); }
export { tstHotelWorldToLocal as sheratonWorldToLocal, tstHotelLocalToWorld as sheratonLocalToWorld };
