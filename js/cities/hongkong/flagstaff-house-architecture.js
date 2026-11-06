// Flagstaff House / 茶具文物館 — HK-B0093.
// The park's inherited heritage builder is intentionally not used for this building.  The
// source ring, two OSM entrance nodes and the photographic architectural evidence are kept
// separate so that a colonial-looking generic box cannot silently stand in for the monument.
import { HONG_KONG_PARK, majorParkFeature } from './major-parks-architecture.js';
import { authoredOsmSource, projectHongKongLonLat } from './authored-landmark-site.js';
import { harbourCityEdgeFrame, harbourCityEdgeOutward, harbourCityWorldToLocal } from './harbour-city-architecture.js';

export const FLAGSTAFF_HOUSE_FEATURE = majorParkFeature(HONG_KONG_PARK, 'heritage', 42255475);
export const FLAGSTAFF_HOUSE_SITE = FLAGSTAFF_HOUSE_FEATURE.site;

// Direct OSM API way/42255475/full.json, retrieved 2026-11-06.  Version 15 adds the two
// entrance nodes to the same outline; collinear source vertices are not simplified away.
export const FLAGSTAFF_HOUSE_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 42255475, version: 15, sourceTimestamp: '2025-12-20T03:18:40Z',
  tags: {
    building: 'yes', 'building:levels': '2', construction_date: '1846',
    name: '茶具文物館 Flagstaff House Museum of Tea Ware',
    'name:en': 'Flagstaff House Museum of Tea Ware', heritage: '3',
    protection_title: '法定古蹟 Declared Monument', tourism: 'museum',
  },
  geometry: [
    { lon: 114.1623101, lat: 22.2784172 },
    { lon: 114.1624334, lat: 22.2783959 },
    { lon: 114.1625267, lat: 22.2783797 },
    { lon: 114.1625477, lat: 22.2783761 },
    { lon: 114.1624838, lat: 22.2780962 },
    { lon: 114.1624322, lat: 22.2781059 },
    { lon: 114.1624047, lat: 22.2779809 },
    { lon: 114.1625784, lat: 22.2779481 },
    { lon: 114.1626060, lat: 22.2780732 },
    { lon: 114.1625257, lat: 22.2780883 },
    { lon: 114.1625546, lat: 22.2782157 },
    { lon: 114.1626408, lat: 22.2781991 },
    { lon: 114.1626542, lat: 22.2782583 },
    { lon: 114.1625724, lat: 22.2782741 },
    { lon: 114.1625935, lat: 22.2783681 },
    { lon: 114.1626398, lat: 22.2783601 },
    { lon: 114.1626858, lat: 22.2785581 },
    { lon: 114.1623594, lat: 22.2786245 },
    { lon: 114.1623101, lat: 22.2784172 },
  ],
  evidence: 'Direct OSM way 42255475 v15; exact footprint and entrance-node geometry, not a measured architectural survey.',
});

export const FLAGSTAFF_HOUSE_RESEARCH = Object.freeze([
  { url: 'https://hk.art.museum/en/web/ma/about-the-museum1.html', evidence: 'Hong Kong Museum of Art: Flagstaff House, 1844–1846, Greek Revival, two storeys and declared-monument history.' },
  { url: 'https://hkp.lcsd.gov.hk/en/facilities/heritage', evidence: 'LCSD Hong Kong Park heritage facility identity and official visitor information.' },
  { url: 'https://www.openstreetmap.org/api/0.6/way/42255475/full.json', evidence: 'Direct OSM v15 outline and entrance=main / entrance=yes nodes 13389904935 and 13389904936.' },
  { url: 'https://commons.wikimedia.org/wiki/Category:Flagstaff_House', evidence: 'Photo direction: white classical mouldings, dark timber windows and shutters, columned verandas, central arched upper opening, red-brown hipped tile roof and chimneys. Photographs are not loaded as runtime assets.' },
]);

const entranceNode = (nodeId, lon, lat, edge, t, name) => {
  const [x, z] = projectHongKongLonLat(lon, lat);
  const local = harbourCityWorldToLocal(FLAGSTAFF_HOUSE_SITE, x, z);
  const frame = harbourCityEdgeFrame(FLAGSTAFF_HOUSE_SITE, edge, name, `OSM entrance node ${nodeId}; door centre is fixed to this source vertex.`, t);
  return Object.freeze({ ...frame, nodeId, lon, lat, sourceX: x, sourceZ: z, localX: local.x, localZ: local.z });
};

// Both nodes occur on source edge 1.  At a shared vertex the opening is continued onto the
// adjoining edge by the world builder; a door must not be blocked by the next wall segment.
export const FLAGSTAFF_HOUSE_MAIN_ENTRANCE = entranceNode(13389904935, 114.1624334, 22.2783959, 1, 0, 'Flagstaff House main OSM entrance');
export const FLAGSTAFF_HOUSE_SECOND_ENTRANCE = entranceNode(13389904936, 114.1625267, 22.2783797, 1, 1, 'Flagstaff House second OSM entrance');
export const FLAGSTAFF_HOUSE_ENTRANCES = Object.freeze([FLAGSTAFF_HOUSE_MAIN_ENTRANCE, FLAGSTAFF_HOUSE_SECOND_ENTRANCE]);
export const FLAGSTAFF_HOUSE_MAIN_DOOR_WIDTH = 2.4;
export const FLAGSTAFF_HOUSE_SECOND_DOOR_WIDTH = 2.0;
export const FLAGSTAFF_HOUSE_WALL_HEIGHT = 6.3;

export function flagstaffHouseSourceRingError() {
  const expected = FLAGSTAFF_HOUSE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => projectHongKongLonLat(lon, lat));
  const actual = FLAGSTAFF_HOUSE_FEATURE.ring;
  if (expected.length !== actual.length) return Infinity;
  let error = 0;
  for (let i = 0; i < expected.length; i++) error = Math.max(error, Math.abs(expected[i] - actual[i]));
  return error;
}

export function flagstaffHouseEntranceGapWidth(entrance) {
  return entrance === FLAGSTAFF_HOUSE_MAIN_ENTRANCE ? FLAGSTAFF_HOUSE_MAIN_DOOR_WIDTH : FLAGSTAFF_HOUSE_SECOND_DOOR_WIDTH;
}

export function flagstaffHouseEdgeLength(edge) {
  return harbourCityEdgeOutward(FLAGSTAFF_HOUSE_SITE.localRing, edge).length;
}
