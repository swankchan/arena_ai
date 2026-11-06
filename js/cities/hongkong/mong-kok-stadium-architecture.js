// HK-B0101: Mong Kok Stadium (旺角大球場), 37 Flower Market Road, Mong Kok.
// The source footprint is the exact OSM `leisure=stadium` way, together with the five tagged stadium entrance
// nodes that sit on it. The rebuilt (2012) stadium is a single-tier bowl with seven white tensile sail canopies
// over the Flower Market Road main stand, orange/dark-blue seat rows, a tall twin-boom floodlight at each corner
// and a large LED screen at the southern end. Everything below is a reproducible construction datum, not a
// surveyed engineering level.
import {
  makeAuthoredSite, authoredOsmSource, authoredTerrainHeightAt, projectHongKongLonLat, AUTHORED_OSM_RETRIEVED,
} from './authored-landmark-site.js';

const MONG_KOK_RING_GEOMETRY = Object.freeze([
  { lat: 22.3254172, lon: 114.1719261 }, { lat: 22.3256613, lon: 114.1718758 }, { lat: 22.3257820, lon: 114.1717381 },
  { lat: 22.3260461, lon: 114.1720088 }, { lat: 22.3265516, lon: 114.1725267 }, { lat: 22.3265559, lon: 114.1726457 },
  { lat: 22.3265584, lon: 114.1727136 }, { lat: 22.3266112, lon: 114.1731750 }, { lat: 22.3266147, lon: 114.1732692 },
  { lat: 22.3266447, lon: 114.1740894 }, { lat: 22.3265192, lon: 114.1740251 }, { lat: 22.3261904, lon: 114.1738566 },
  { lat: 22.3255288, lon: 114.1735176 }, { lat: 22.3254795, lon: 114.1732385 }, { lat: 22.3254456, lon: 114.1730463 },
  { lat: 22.3253642, lon: 114.1725851 }, { lat: 22.3253004, lon: 114.1722234 }, { lat: 22.3252512, lon: 114.1719448 },
  { lat: 22.3252284, lon: 114.1718155 }, { lat: 22.3252242, lon: 114.1717919 }, { lat: 22.3254172, lon: 114.1719261 },
]);

const MONG_KOK_RING_NODE_IDS = Object.freeze([
  6680789889, 6680777579, 6680777580, 6680777578, 12031365029, 12031364508, 12031365035, 12031365030, 12031364507,
  1293266344, 1293266115, 12031365128, 12031365154, 12031364509, 12031365152, 12031365153, 12031364510, 1293266253,
  12031364934, 6680789891, 6680789889,
]);

// The five OSM-tagged stadium entrances. They are kept as exact nodes so the gate and turnstile frontage can be
// placed on real doorways instead of an invented facade centre.
const MONG_KOK_ENTRANCE_SOURCE = Object.freeze([
  { id: 6680777578, lat: 22.3260461, lon: 114.1720088 },
  { id: 12031364507, lat: 22.3266147, lon: 114.1732692 },
  { id: 12031364508, lat: 22.3265559, lon: 114.1726457 },
  { id: 12031364509, lat: 22.3254795, lon: 114.1732385 },
  { id: 12031364510, lat: 22.3253004, lon: 114.1722234 },
]);

export const MONG_KOK_STADIUM_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 114127110, version: 9,
  tags: {
    'addr:city': 'Kowloon', 'addr:housenumber': '37', 'addr:street': '花墟道 Flower Market Road',
    leisure: 'stadium', name: '旺角大球場 Mong Kok Stadium', 'name:en': 'Mong Kok Stadium', 'name:zh': '旺角大球場',
    sport: 'multi', wikidata: 'Q838937', wikimedia_commons: 'Category:Mong Kok Stadium',
    wikipedia: 'en:Mong Kok Stadium',
  },
  geometry: MONG_KOK_RING_GEOMETRY,
  sourceTimestamp: '2024-07-03T14:19:49Z',
  evidence: `OSM way 114127110 v9 (${AUTHORED_OSM_RETRIEVED}): 21 nodes forming the stadium block; `
    + 'five of them carry entrance=yes and are used as the real gate positions.',
});

export const MONG_KOK_STADIUM_SITE = makeAuthoredSite(
  'mongKokStadium', '旺角大球場', 'Mong Kok Stadium', MONG_KOK_STADIUM_OSM_SOURCE,
  {
    height: 20, levels: null, roadIds: [],
    evidence: 'Exact OSM leisure=stadium block; the bowl is modelled inside it, not over the surrounding streets.',
  },
);

export const MONG_KOK_ENTRANCES = Object.freeze(MONG_KOK_ENTRANCE_SOURCE.map(({ id, lat, lon }) => {
  const [x, z] = projectHongKongLonLat(lon, lat);
  return Object.freeze({ id, x, z, nodeId: `https://www.openstreetmap.org/node/${id}` });
}));

// --- pitch and bowl ---------------------------------------------------------
// FIFA-standard 105 x 68 m artificial pitch; Mong Kok Stadium is football-only, so no running track is modelled.
export const MONG_KOK_PITCH_LENGTH = 105, MONG_KOK_PITCH_WIDTH = 68;
export const MONG_KOK_APRON = 6.5;                     // rubberised perimeter in front of the first row
export const MONG_KOK_BOWL = Object.freeze({
  north: { rows: 16, tread: 0.85, rise: 0.52, frontWall: 2.2 },   // main stand, Flower Market Road side
  south: { rows: 12, tread: 0.85, rise: 0.52, frontWall: 2.0 },
  east: { rows: 10, tread: 0.85, rise: 0.50, frontWall: 2.0 },
  west: { rows: 10, tread: 0.85, rise: 0.50, frontWall: 2.0 },
});
export const MONG_KOK_BOWL_HALF_LENGTH = MONG_KOK_PITCH_LENGTH / 2 + MONG_KOK_APRON;   // 59.0
export const MONG_KOK_BOWL_HALF_WIDTH = MONG_KOK_PITCH_WIDTH / 2 + MONG_KOK_APRON;     // 40.5
export const MONG_KOK_MAIN_STAND_DEPTH = MONG_KOK_BOWL.north.rows * MONG_KOK_BOWL.north.tread;   // 13.6
export const MONG_KOK_MAIN_STAND_TOP = MONG_KOK_BOWL.north.frontWall
  + MONG_KOK_BOWL.north.rows * MONG_KOK_BOWL.north.rise;                                          // 10.5
export const MONG_KOK_SIDE_STAND_DEPTH = MONG_KOK_BOWL.east.rows * MONG_KOK_BOWL.east.tread;     // 8.5
export const MONG_KOK_SIDE_STAND_TOP = MONG_KOK_BOWL.east.frontWall
  + MONG_KOK_BOWL.east.rows * MONG_KOK_BOWL.east.rise;                                            // 7.0
export const MONG_KOK_SOUTH_STAND_DEPTH = MONG_KOK_BOWL.south.rows * MONG_KOK_BOWL.south.tread;  // 10.2
export const MONG_KOK_SOUTH_STAND_TOP = MONG_KOK_BOWL.south.frontWall
  + MONG_KOK_BOWL.south.rows * MONG_KOK_BOWL.south.rise;

// Seven tensile sails over the main stand, as photographed after the 2012 rebuild.
export const MONG_KOK_SAIL_COUNT = 7;
export const MONG_KOK_SAIL_SPAN = 16.5;               // along the stand
export const MONG_KOK_SAIL_DEPTH = 16.0;              // across the stand, incl. the 2.4 m front overhang
export const MONG_KOK_SAIL_PEAK = 17.2;               // mast-top height above the pitch datum
export const MONG_KOK_SAIL_RIM = 11.6;                // canopy eaves above the pitch datum
export const MONG_KOK_FLOODLIGHT_HEIGHT = 26;
export const MONG_KOK_FLOODLIGHT_COUNT = 4;
export const MONG_KOK_SCREEN_WIDTH = 12.5, MONG_KOK_SCREEN_HEIGHT = 5.6, MONG_KOK_SCREEN_BASE = 4.4;
export const MONG_KOK_SEATS = 6700;                   // capacity after the 2012 reconstruction
export const MONG_KOK_RECONSTRUCTION_YEAR = 2012;
export const MONG_KOK_ORIGINAL_YEAR = 1961;
export const MONG_KOK_PITCH_SURFACE = 'artificial turf';

export const MONG_KOK_COLOURS = Object.freeze({
  sail: [0.92, 0.92, 0.89],          // off-white PTFE tensile membrane
  mast: [0.90, 0.91, 0.89],          // painted white steel masts and cables
  seatOrange: [0.78, 0.33, 0.09],    // orange seat shells
  seatBlue: [0.10, 0.18, 0.31],      // dark-blue seat shells
  concourse: [0.86, 0.86, 0.83],     // white concourse face
  plinth: [0.42, 0.44, 0.44],        // dark grey plinth under the concourse
  deck: [0.62, 0.63, 0.61],          // concrete treads
  turf: [0.24, 0.47, 0.18],
  turfStripe: [0.28, 0.52, 0.20],
  kerb: [0.55, 0.55, 0.53],
});

export const MONG_KOK_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://fpf.ccidahk.gov.hk/en/location/detail.php?id=1704',
    evidence: 'Pitch-side photograph: seven off-white tensile sails on white masts and cables over the long main '
      + 'stand, orange and dark-blue seat rows, white concourse face above a dark grey plinth, artificial green turf.',
  },
  {
    url: 'https://en.wikipedia.org/wiki/Mong_Kok_Stadium',
    evidence: 'Rebuilt 2012 as a 6,700-seat single-tier football bowl on the 1961 stadium site at 37 Flower Market Road.',
  },
  {
    url: 'https://zh-yue.wikipedia.org/wiki/旺角大球場',
    evidence: 'Night photograph: sail canopies lit from below, tall floodlight pylons at the corners, LED screen '
      + 'behind the southern goal.',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Category:Mong_Kok_Stadium',
    evidence: 'Aerial view: the bowl fills the block between Flower Market Road and the surrounding tenements; '
      + 'the sails run along the Flower Market Road long stand.',
  },
]);

// Reproducible construction datum: the highest raw DTM sample anywhere on the exact OSM ring.
export function mongKokStadiumTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([MONG_KOK_STADIUM_SITE], x, z, rawHeight, padHeight);
}
