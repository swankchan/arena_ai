// The Peninsula Hong Kong: exact heritage / tower OSM building rings and a photo-directed forecourt.
// OSM's 115 m tower tag and CTBUH's 117.7 m architectural / helipad convention are kept separate.
import {
  tstHotelOsmSource, makeTstHotelSite, makePhotoDirectedGroundRing, tstHotelTerrainHeightAt,
  tstHotelRoadRecords, tstHotelWorldToLocal, tstHotelLocalToWorld,
} from './tst-hotel-site.js';
import { harbourCityEdgeFrame } from './harbour-city-architecture.js';

export const PENINSULA_IDENTITY_OSM_SOURCE = tstHotelOsmSource({ id: 709674355, version: 6, sourceTimestamp: '2023-10-21T07:19:49Z',
  tags: { 'addr:housenumber': '22', 'addr:street': '梳士巴利道 Salisbury Road', 'addr:street:en': 'Salisbury Road', 'addr:street:wikidata': 'Q4035576', 'addr:street:zh': '梳士巴利道', landuse: 'commercial', name: '香港半島酒店 The Peninsula Hong Kong', 'name:en': 'The Peninsula Hong Kong', 'name:ko': '페닌슐라 홍콩', 'name:zh': '香港半島酒店', tourism: 'hotel', wikidata: 'Q1757744', wikimedia_commons: 'Category:The Peninsula Hong Kong', wikipedia: 'en:The Peninsula Hong Kong' },
  nodes: [1353893721, 1353893717, 10875906016, 6670380230, 10875906051, 10875906050, 6680004894, 1353893700, 11264962679, 1353893723, 1353893721],
  geometry: [{ lat: 22.2954593, lon: 114.1713522 }, { lat: 22.2948711, lon: 114.1714031 }, { lat: 22.2948455, lon: 114.1714053 }, { lat: 22.2948222, lon: 114.1714074 }, { lat: 22.2948484, lon: 114.1717596 }, { lat: 22.2948558, lon: 114.1718601 }, { lat: 22.2948816, lon: 114.1722074 }, { lat: 22.2949305, lon: 114.1722032 }, { lat: 22.2952014, lon: 114.1721797 }, { lat: 22.2955186, lon: 114.1721522 }, { lat: 22.2954593, lon: 114.1713522 }] });

export const PENINSULA_HERITAGE_OSM_SOURCE = tstHotelOsmSource({ id: 120833435, version: 12, sourceTimestamp: '2023-10-15T16:42:39Z',
  tags: { building: 'hotel', 'building:levels': '7', height: '40' },
  nodes: [1353893717, 10875906017, 10875882598, 10875906058, 10875906059, 10875906060, 10875882584, 10875882585, 10875882565, 1353893700, 11264962679, 1353893723, 1353893721, 1353893717],
  geometry: [{ lat: 22.2948711, lon: 114.1714031 }, { lat: 22.2948761, lon: 114.1714702 }, { lat: 22.2948788, lon: 114.1715068 }, { lat: 22.2948837, lon: 114.1715725 }, { lat: 22.2951136, lon: 114.1715526 }, { lat: 22.2951478, lon: 114.1720139 }, { lat: 22.2949179, lon: 114.1720338 }, { lat: 22.2949228, lon: 114.1720995 }, { lat: 22.2949255, lon: 114.1721362 }, { lat: 22.2949305, lon: 114.1722032 }, { lat: 22.2952014, lon: 114.1721797 }, { lat: 22.2955186, lon: 114.1721522 }, { lat: 22.2954593, lon: 114.1713522 }, { lat: 22.2948711, lon: 114.1714031 }] });

export const PENINSULA_TOWER_OSM_SOURCE = tstHotelOsmSource({ id: 152073879, version: 4, sourceTimestamp: '2023-05-07T14:06:22Z',
  tags: { building: 'hotel', 'building:levels': '28', height: '115', layer: '1' },
  nodes: [1649047747, 1649047761, 6670380337, 1649047749, 1649047730, 1649047733, 6670380342, 6670380343, 1649047763, 1649047758, 6670380341, 1649047760, 1649047747],
  geometry: [{ lat: 22.2954614, lon: 114.1715224 }, { lat: 22.2954324, lon: 114.1715249 }, { lat: 22.2954288, lon: 114.1714766 }, { lat: 22.2953044, lon: 114.1714873 }, { lat: 22.2953096, lon: 114.1715575 }, { lat: 22.2952775, lon: 114.1715603 }, { lat: 22.2953085, lon: 114.1719781 }, { lat: 22.2953406, lon: 114.1719753 }, { lat: 22.2953458, lon: 114.1720455 }, { lat: 22.2954702, lon: 114.1720347 }, { lat: 22.2954666, lon: 114.1719863 }, { lat: 22.2954956, lon: 114.1719838 }, { lat: 22.2954614, lon: 114.1715224 }] });

export const PENINSULA_HERITAGE_SITE = makeTstHotelSite('peninsulaHeritage', '香港半島酒店舊翼 The Peninsula Hong Kong Heritage Building', 'The Peninsula Hong Kong Heritage Building', PENINSULA_HERITAGE_OSM_SOURCE, 40, 7);
export const PENINSULA_TOWER_SITE = makeTstHotelSite('peninsulaTower', '香港半島酒店新塔 The Peninsula Tower', 'The Peninsula Tower', PENINSULA_TOWER_OSM_SOURCE, 115, 28);

// The forecourt is the open notch of the exact U-shaped heritage ring, not another claimed OSM building polygon.
const heritageRing = PENINSULA_HERITAGE_SITE.ring;
const vertex = (index) => [heritageRing[index * 2], heritageRing[index * 2 + 1]];
export const PENINSULA_FORECOURT_ACCESS_ROAD_IDS = Object.freeze([44092, 44093, 44094, 44096, 44097]);
export const PENINSULA_FORECOURT_SITE = makePhotoDirectedGroundRing('peninsulaForecourt', '香港半島酒店前庭 The Peninsula Forecourt', [
  ...vertex(3), ...vertex(6), ...vertex(5), ...vertex(4), ...vertex(3),
], 'Photo-directed hotel forecourt contained by heritage-ring vertices 3, 6, 5 and 4. No precise OSM fountain or driveway footprint is claimed. Five existing unnamed access-road centrelines are preserved and excluded from terrain flattening.', PENINSULA_FORECOURT_ACCESS_ROAD_IDS);
export const PENINSULA_GROUND_SITES = Object.freeze([PENINSULA_HERITAGE_SITE, PENINSULA_TOWER_SITE, PENINSULA_FORECOURT_SITE]);
export const PENINSULA_GROUND_RINGS = Object.freeze(PENINSULA_GROUND_SITES.map((site) => site.ring));
export const PENINSULA_BUILDING_SITES = Object.freeze([PENINSULA_HERITAGE_SITE, PENINSULA_TOWER_SITE]);

export const PENINSULA_OPENING_DATE = '1928-12-11';
export const PENINSULA_TOWER_COMPLETION_YEAR = 1994;
export const PENINSULA_HERITAGE_HEIGHT = 40;
export const PENINSULA_TOWER_OSM_HEIGHT = 115;
export const PENINSULA_TOWER_HEIGHT = 117.7;
export const PENINSULA_TOWER_CTBUH_LEVELS = 33;
export const PENINSULA_TOWER_VISIBLE_ROOM_ROWS = 24;
export const PENINSULA_LOBBY_ARCH_HEIGHT = 7.2;
export const PENINSULA_MAIN_ENTRANCE = harbourCityEdgeFrame(PENINSULA_HERITAGE_SITE, 4,
  'The Peninsula main hotel entrance', 'Photo-directed central lobby doors at the back of the U-shaped forecourt, source edge 4; not represented as an OSM entrance node.', .5);
export const PENINSULA_ARCADE_ENTRANCE_NODE = Object.freeze({ type: 'node', id: 11264962679, version: 1,
  sourceTimestamp: '2023-10-15T16:42:39Z', sourceUrl: 'https://www.openstreetmap.org/api/0.6/node/11264962679.json',
  lon: 114.1721797, lat: 22.2952014, tags: Object.freeze({ entrance: 'yes', name: 'The Peninsula Arcade', shop: 'mall' }) });
export const PENINSULA_ARCADE_ENTRANCE = Object.freeze({
  ...harbourCityEdgeFrame(PENINSULA_HERITAGE_SITE, 9, 'The Peninsula Arcade entrance',
    'Exact OSM entrance=yes node 11264962679 at the end of heritage-building edge 9; the shopping arcade entrance is distinct from the photo-directed hotel lobby.', 1),
  sourceNodeId: PENINSULA_ARCADE_ENTRANCE_NODE.id, sourceNode: PENINSULA_ARCADE_ENTRANCE_NODE,
});
// Photo-directed island position: between the preserved arrival lane and the lobby, not at the driveway-crossing polygon centroid.
export const PENINSULA_FOUNTAIN_CENTER = Object.freeze({
  x: PENINSULA_MAIN_ENTRANCE.x + PENINSULA_MAIN_ENTRANCE.nx * 6.7,
  z: PENINSULA_MAIN_ENTRANCE.z + PENINSULA_MAIN_ENTRANCE.nz * 6.7,
  evidence: 'Photo-directed fountain island 6.7 m outward from the lobby edge; positioned clear of the five preserved access-road corridors, not claimed as an OSM fountain survey.',
});
export const PENINSULA_FOUNTAIN_RADII = Object.freeze({ x: 6.25, z: 4.15 });

export const PENINSULA_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://www.peninsula.com/en/hong-kong/5-star-luxury-hotel-kowloon', publisher: 'The Peninsula Hong Kong', evidence: 'Official hotel history and identity: the Tsim Sha Tsui flagship opened on 11 December 1928 and overlooks Victoria Harbour; official address is used with the separate OSM building sources.' }),
  Object.freeze({ url: 'https://www.peninsula.com/-/media/01-hong-kong-property/final_the-peninsula-hong-kong-_-meeting-_-event--fact-sheet-_may-2022_acc-(1).pdf', publisher: 'The Peninsula Hong Kong official fact sheet', evidence: 'Officially identifies the heritage building and tower building, 297 rooms including 53 suites, the forecourt fountain and the rooftop helipad. The exterior photograph supports the pale classical facade and courtyard composition, not measured facade drawings.' }),
  Object.freeze({ url: 'https://www.skyscrapercenter.com/building/the-peninsula/35525', publisher: 'CTBUH — The Peninsula', evidence: '1994 tower, 33 floors and 117.7 m architectural / helipad height. This is retained separately from OSM way 152073879 height=115 and building:levels=28 rather than averaged or silently substituted.' }),
  Object.freeze({ url: 'https://en.wikipedia.org/wiki/The_Peninsula_Hong_Kong', publisher: 'Secondary expansion history cross-check', evidence: 'The 1994 expansion added a 30-storey tower while retaining the historic facade, forecourt and lobby; this floor-count convention differs from CTBUH and OSM and is not used as a surveyed window-row count.' }),
  Object.freeze({ url: 'https://www.businessinsider.com/the-peninsula-hong-kong-luxury-hotel-tour-2024-4', publisher: 'Business Insider 2024 exterior photographs', evidence: 'Supplementary exterior-photo search reference. The reviewed frontal reference set shows the U-shaped off-white heritage facade, ground-floor arches, small dark rectangular windows, green-and-white striped awnings, THE PENINSULA lettering, central fountain, dark vertical tower glazing and stepped crown; visual direction only, with no dimensional or asset reuse.' }),
  Object.freeze({ url: 'https://www.lartisien.com/hotel/peninsula-hong-kong', publisher: 'Lartisien hotel exterior photograph', evidence: 'Supplementary frontal exterior-photo search reference for the curved central heritage bays, balcony balustrades, broad cornices, striped canopy line and fountain-centred arrival court; reviewed as visual direction only, not as a measured drawing or redistributed asset.' }),
]);

export function peninsulaTerrainHeightAt(x, z, rawHeight, padHeight) {
  return tstHotelTerrainHeightAt(PENINSULA_GROUND_SITES, x, z, rawHeight, padHeight);
}
export function peninsulaGroundHeightAt(x, z, ground, padHeight) { return peninsulaTerrainHeightAt(x, z, ground, padHeight); }
export function peninsulaRoadRecords(site) { return tstHotelRoadRecords(site); }
export { tstHotelWorldToLocal as peninsulaWorldToLocal, tstHotelLocalToWorld as peninsulaLocalToWorld };
