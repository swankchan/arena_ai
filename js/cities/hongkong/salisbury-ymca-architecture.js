// The Salisbury – YMCA of Hong Kong: exact OSM podium and explicitly photo-derived twin rounded towers.
// OSM's 15 m / four-level tag is retained for the podium; no surveyed overall tower height or upper-floor plan is claimed.
import {
  tstHotelOsmSource, makeTstHotelSite, makePhotoDirectedGroundRing, tstHotelTerrainHeightAt,
  tstHotelRoadRecords, tstHotelWorldToLocal, tstHotelLocalToWorld,
} from './tst-hotel-site.js';
import { harbourCityEdgeFrame, harbourCityEdgeOutward } from './harbour-city-architecture.js';

export const SALISBURY_OSM_SOURCE = tstHotelOsmSource({ id: 152073872, version: 5, sourceTimestamp: '2026-07-29T06:24:03Z',
  tags: { 'addr:housenumber': '41', 'addr:street': '梳士巴利道 Salisbury Road', building: 'hotel', 'building:levels': '4', height: '15', name: '港青酒店 The Salisbury', 'name:en': 'The Salisbury', 'name:zh': '港青酒店', tourism: 'hotel', 'was:name': '香港基督教青年會賓館 YMCA of Hong Kong', 'was:name:en': 'YMCA of Hong Kong', 'was:name:zh': '香港基督教青年會賓館', wikidata: 'Q11116058' },
  nodes: [10875906096, 10875906095, 1649047741, 10875906098, 10875906099, 1649047743, 10875906086, 10875906081, 10875906061, 10875906075, 10875906074, 10875906062, 10875906069, 10875906096],
  geometry: [{ lat: 22.2952906, lon: 114.1707987 }, { lat: 22.2953804, lon: 114.1707912 }, { lat: 22.2954073, lon: 114.1707890 }, { lat: 22.2954094, lon: 114.1708180 }, { lat: 22.2954326, lon: 114.1711440 }, { lat: 22.2954346, lon: 114.1711730 }, { lat: 22.2954078, lon: 114.1711753 }, { lat: 22.2948401, lon: 114.1712225 }, { lat: 22.2948132, lon: 114.1712247 }, { lat: 22.2948112, lon: 114.1711957 }, { lat: 22.2947879, lon: 114.1708697 }, { lat: 22.2947859, lon: 114.1708407 }, { lat: 22.2948127, lon: 114.1708385 }, { lat: 22.2952906, lon: 114.1707987 }] });

export const SALISBURY_PODIUM_HEIGHT = 15;
export const SALISBURY_OSM_LEVELS = 4;
export const SALISBURY_TOWER_MODEL_HEIGHTS = Object.freeze([68, 61]);
export const SALISBURY_TOWER_VISIBLE_ROWS = Object.freeze([16, 14]);
export const SALISBURY_SITE = makeTstHotelSite('salisburyYMCA', '港青酒店 The Salisbury – YMCA of Hong Kong', 'The Salisbury – YMCA of Hong Kong', SALISBURY_OSM_SOURCE, SALISBURY_PODIUM_HEIGHT, SALISBURY_OSM_LEVELS);
export const SALISBURY_GROUND_SITES = Object.freeze([SALISBURY_SITE]);
export const SALISBURY_GROUND_RINGS = Object.freeze([SALISBURY_SITE.ring]);

export function salisburyRoundedRectangle(cx, cz, width, depth, radius, segments = 5) {
  const ring = [], corners = [
    [cx + width / 2 - radius, cz - depth / 2 + radius, -Math.PI / 2],
    [cx + width / 2 - radius, cz + depth / 2 - radius, 0],
    [cx - width / 2 + radius, cz + depth / 2 - radius, Math.PI / 2],
    [cx - width / 2 + radius, cz - depth / 2 + radius, Math.PI],
  ];
  for (const [x, z, start] of corners) for (let i = 0; i <= segments; i++) {
    const angle = start + i / segments * Math.PI / 2; ring.push(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
  }
  ring.push(ring[0], ring[1]); return Object.freeze(ring);
}
function photoTowerSite(key, name, localRing, height) {
  return Object.freeze({ ...SALISBURY_SITE, key, name, englishName: name, osmType: null, osmId: null, source: null,
    ring: null, bounds: null, ringArea: null, photoDirected: true, localRing, height,
    evidence: 'Photo-derived upper massing contained by the exact OSM podium; no separate OSM tower/part way or surveyed height is claimed.' });
}
export const SALISBURY_TOWER_SITES = Object.freeze([-19, 19].map((x, index) => photoTowerSite(
  `salisburyTower${index + 1}`, `The Salisbury photo-derived rounded tower ${index + 1}`,
  salisburyRoundedRectangle(x, 0, 18, 23, 4.2, 5), SALISBURY_TOWER_MODEL_HEIGHTS[index])));
export const SALISBURY_CONNECTOR_LOCAL_RING = Object.freeze([-10, -11, 10, -11, 10, 11, -10, 11, -10, -11]);
export const SALISBURY_CONNECTOR_HEIGHT = 43;
export const SALISBURY_CONNECTOR_SITE = photoTowerSite('salisburyCentralConnector', 'The Salisbury lower central connector', SALISBURY_CONNECTOR_LOCAL_RING, SALISBURY_CONNECTOR_HEIGHT);

export const SALISBURY_MAIN_ENTRANCE = harbourCityEdgeFrame(SALISBURY_SITE, 9,
  'The Salisbury – YMCA of Hong Kong main entrance', 'Photo-directed Salisbury Road lobby entrance and canopy on source edge 9, the frontage nearest the named Salisbury Road carriageway; no exact OSM hotel entrance node is claimed.', 0.5);
export const SALISBURY_CANOPY_WIDTH = 12;
export const SALISBURY_CANOPY_DEPTH = 3.0;
export const SALISBURY_CANOPY_SOFFIT = 4.6;
const outward = harbourCityEdgeOutward(SALISBURY_SITE.localRing, SALISBURY_MAIN_ENTRANCE.sourceEdge), tangent = { x: outward.nz, z: -outward.nx };
const centre = { x: SALISBURY_MAIN_ENTRANCE.localX + outward.nx * SALISBURY_CANOPY_DEPTH * 0.5,
  z: SALISBURY_MAIN_ENTRANCE.localZ + outward.nz * SALISBURY_CANOPY_DEPTH * 0.5 };
const canopyRing = [];
for (const [side, depth] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]) {
  const p = tstHotelLocalToWorld(SALISBURY_SITE,
    centre.x + tangent.x * side * SALISBURY_CANOPY_WIDTH * 0.5 + outward.nx * depth * SALISBURY_CANOPY_DEPTH * 0.5,
    centre.z + tangent.z * side * SALISBURY_CANOPY_WIDTH * 0.5 + outward.nz * depth * SALISBURY_CANOPY_DEPTH * 0.5);
  canopyRing.push(p.x, p.z);
}
export const SALISBURY_CANOPY_CLEARANCE_SITE = makePhotoDirectedGroundRing('salisburyCanopyClearance', 'The Salisbury photo-directed canopy clearance', canopyRing,
  'Visual entrance-canopy clearance only; not an OSM entrance polygon or an additional terrain pad.');

export const SALISBURY_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://www.ymcahk.org.hk/thesalisbury/en/accommodation/index.html', publisher: 'The Salisbury – YMCA of Hong Kong official site', evidence: 'Official current hotel identity in Tsim Sha Tsui, Victoria Harbour setting and YMCA of Hong Kong operator. This is not confused with the separate Chinese YMCA of Hong Kong organisation.' }),
  Object.freeze({ url: 'https://www.ymcahk.org.hk/main/en/about_us/location/index.html', publisher: 'YMCA of Hong Kong official location page', evidence: 'Official headquarters and The Salisbury hotel services at 41 Salisbury Road, Tsimshatsui, Kowloon.' }),
  Object.freeze({ url: 'https://www.oyster.com/hong-kong/hotels/the-salisbury-ymca-of-hong-kong/', publisher: 'Oyster — The Salisbury exterior reference', evidence: 'Supplementary reviewed exterior photographs direct the red YMCA emblem, two unequal rounded towers, lower central connector, square windows and continuous curved horizontal window bands. Images are visual direction only and are not redistributed or measured.' }),
  Object.freeze({ url: 'https://hotelthesalisburyymcaofhongkong.all-hotels.com/', publisher: 'The Salisbury exterior photograph set', evidence: 'The reviewed street-corner photograph (Salisbury Road / Chatham Road corner, clear daylight, no coloured lighting) shows light warm-grey precast concrete towers with white banded window surrounds, a pale grey four-storey podium with white surrounds, a dark blue-grey shopfront band across the ground floor and a red painted wall on the west return. The earlier "dark podium / white towers" reading came from lower-quality listing images and is corrected here; tones are still presentation values, not measured reflectance.' }),
  Object.freeze({ url: 'https://en.wikipedia.org/wiki/YMCA_of_Hong_Kong', publisher: 'Secondary history cross-check', evidence: 'Auxiliary account says the Salisbury was rebuilt in July 1989 as a 16-storey building. This is not treated as a surveyed height or proof of separate OSM tower footprints; the two scene tower heights remain explicitly photo-derived.' }),
  Object.freeze({ url: 'https://www.openstreetmap.org/api/0.6/way/152073872/full.json', publisher: 'OpenStreetMap contributors', evidence: 'Current way 152073872 v5 supplies the exact 13-vertex ring, height=15 and building:levels=4 plus current and former names. Overpass checks found no separate tower building/part ways, so upper volumes are photo-derived rather than falsely OSM-certified.' }),
]);

export function salisburyTerrainHeightAt(x, z, rawHeight, padHeight) { return tstHotelTerrainHeightAt(SALISBURY_GROUND_SITES, x, z, rawHeight, padHeight); }
export function salisburyGroundHeightAt(x, z, ground, padHeight) { return salisburyTerrainHeightAt(x, z, ground, padHeight); }
export function salisburyRoadRecords(site = SALISBURY_SITE) { return tstHotelRoadRecords(site); }
export { tstHotelWorldToLocal as salisburyWorldToLocal, tstHotelLocalToWorld as salisburyLocalToWorld };
