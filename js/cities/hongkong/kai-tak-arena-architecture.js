// HK-B0105: 啟德體藝館 Kai Tak Arena — the 10,000-seat indoor hall of 啟德體育園 Kai Tak Sports Park.
//
// The footprint is OSM way 1339751141 (`leisure=sports_centre`, "Kai Tak Arena", 38 Kai Tak Sports Avenue), a
// 275 m long, 137 m deep block on the Kai Tak runway apron: the arena hall and the retail/podium wing that runs with
// it. The modelled building is inset inside that outline, so the surveyed edge stays the authority.
//
// Appearance comes from the exterior photographs: a dark charcoal fascia band wrapping the whole roofline, under
// which the facades are a colour field of tall vertical panels — lime, sage and olive greens over most of the
// building, with a gold/amber patchwork at one end and a few white and silver strips — above a dark glazed base.
// The corners are rounded, the roof carries a forest of slim telecom masts, and a silver gymnast statue stands on
// the plaza. White "啟德體育園 KAI TAK ARENA" lettering sits on the charcoal band.
import {
  makeAuthoredSite, authoredOsmSource, authoredTerrainHeightAt, AUTHORED_OSM_RETRIEVED,
} from './authored-landmark-site.js';

// OSM way 1339751141, 60 ring positions (35 m resolution on the long edge).
export const KAI_TAK_ARENA_RING_GEOMETRY = Object.freeze([
  { lon: 114.1961738, lat: 22.3267886 }, { lon: 114.1961765, lat: 22.3267252 }, { lon: 114.1961792, lat: 22.3266641 },
  { lon: 114.1961820, lat: 22.3266005 }, { lon: 114.1961868, lat: 22.3264992 }, { lon: 114.1961879, lat: 22.3264655 },
  { lon: 114.1961886, lat: 22.3264437 }, { lon: 114.1961900, lat: 22.3264024 }, { lon: 114.1961913, lat: 22.3263630 },
  { lon: 114.1962119, lat: 22.3259003 }, { lon: 114.1962124, lat: 22.3258883 }, { lon: 114.1962144, lat: 22.3258442 },
  { lon: 114.1962162, lat: 22.3258030 }, { lon: 114.1962172, lat: 22.3257733 }, { lon: 114.1962216, lat: 22.3256736 },
  { lon: 114.1962527, lat: 22.3249674 }, { lon: 114.1962572, lat: 22.3248653 }, { lon: 114.1962577, lat: 22.3248556 },
  { lon: 114.1962666, lat: 22.3246516 }, { lon: 114.1962678, lat: 22.3246241 }, { lon: 114.1962715, lat: 22.3245379 },
  { lon: 114.1962729, lat: 22.3245323 }, { lon: 114.1962755, lat: 22.3245286 }, { lon: 114.1962804, lat: 22.3245268 },
  { lon: 114.1962865, lat: 22.3245269 }, { lon: 114.1964675, lat: 22.3245733 }, { lon: 114.1964776, lat: 22.3245737 },
  { lon: 114.1964843, lat: 22.3245685 }, { lon: 114.1964854, lat: 22.3245594 }, { lon: 114.1964843, lat: 22.3245484 },
  { lon: 114.1964875, lat: 22.3245387 }, { lon: 114.1964967, lat: 22.3245329 }, { lon: 114.1965066, lat: 22.3245320 },
  { lon: 114.1965184, lat: 22.3245309 }, { lon: 114.1965249, lat: 22.3245307 }, { lon: 114.1965296, lat: 22.3245271 },
  { lon: 114.1965451, lat: 22.3245041 }, { lon: 114.1965992, lat: 22.3245212 }, { lon: 114.1975649, lat: 22.3248379 },
  { lon: 114.1975594, lat: 22.3248521 }, { lon: 114.1975236, lat: 22.3249438 }, { lon: 114.1973362, lat: 22.3254245 },
  { lon: 114.1971906, lat: 22.3257978 }, { lon: 114.1971543, lat: 22.3258900 }, { lon: 114.1970691, lat: 22.3260779 },
  { lon: 114.1969240, lat: 22.3263979 }, { lon: 114.1968835, lat: 22.3264861 }, { lon: 114.1968189, lat: 22.3266269 },
  { lon: 114.1967884, lat: 22.3266927 }, { lon: 114.1967714, lat: 22.3267294 }, { lon: 114.1966022, lat: 22.3270943 },
  { lon: 114.1965841, lat: 22.3271188 }, { lon: 114.1965592, lat: 22.3271308 }, { lon: 114.1965290, lat: 22.3271318 },
  { lon: 114.1965072, lat: 22.3271259 }, { lon: 114.1964871, lat: 22.3271168 }, { lon: 114.1963535, lat: 22.3269912 },
  { lon: 114.1961921, lat: 22.3268394 }, { lon: 114.1961827, lat: 22.3268223 }, { lon: 114.1961775, lat: 22.3268086 },
]);

export const KAI_TAK_ARENA_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 1339751141, version: 1,
  tags: {
    leisure: 'sports_centre', name: 'Kai Tak Arena',
    'addr:housenumber': '38', 'addr:street': 'Kai Tak Sports Avenue',
  },
  geometry: KAI_TAK_ARENA_RING_GEOMETRY,
  sourceTimestamp: '2026-07-29T06:46:20Z',
  evidence: `OSM way 1339751141 (${AUTHORED_OSM_RETRIEVED}): 60 ring positions describing the arena block, tagged `
    + 'leisure=sports_centre at 38 Kai Tak Sports Avenue inside Kai Tak Sports Park. The block includes the '
    + 'retail/podium wing that runs with the hall, so only the inset building volume is modelled inside it.',
});

export const KAI_TAK_ARENA_SITE = makeAuthoredSite(
  'kaiTakArena', '啟德體藝館', 'Kai Tak Arena', KAI_TAK_ARENA_OSM_SOURCE,
  {
    height: 38, levels: null, roadIds: [],
    evidence: 'Exact OSM sports_centre block; the hall, the podium wing and the statue plaza are all kept inside it.',
  },
);

export const KAI_TAK_ARENA_CAPACITY = 10000;
export const KAI_TAK_ARENA_SECONDARY_SEATS = 500;          // 習藝坊, the 500-seat practice hall
export const KAI_TAK_ARENA_MAIN_HALL_SQUARE_METRES = 7066; // main arena floor
export const KAI_TAK_ARENA_CEILING_HEIGHT = 12.5;
export const KAI_TAK_ARENA_RETRACTABLE_SHARE = 0.8;        // ~80% of seats retract or move
export const KAI_TAK_ARENA_OPENED = '2025-03-01';
export const KAI_TAK_ARENA_SPORTS = Object.freeze([
  'badminton', 'basketball', 'handball', 'gymnastics', 'tennis', 'volleyball', 'futsal', 'table tennis',
]);
export const KAI_TAK_ARENA_ARCHITECTS = 'Populous; 關善明建築師事務所 Simon Kwan & Associates';

export const KAI_TAK_ARENA_MASSING = Object.freeze({
  inset: 4.0,               // the modelled building sits 4 m inside the surveyed block
  podiumHeight: 22.0,       // colour-field facade up to the charcoal band
  bandHeight: 6.2,          // dark charcoal fascia band around the roofline
  bandProjection: 1.1,
  glazingHeight: 6.0,       // dark glazed base
  panelPitch: 1.5,          // vertical colour-field panel width
  roofHeight: 28.2,         // top of the charcoal band / roof parapet
  hallHeight: 40.0,         // the arena hall drum, clearly taller than the 28 m podium wing
  hallLength: 96.0,
  hallWidth: 74.0,
  masts: 16,                // slim telecom masts on the roof
  mastHeight: 9.5,
  statueHeight: 9.0,
});

export const KAI_TAK_ARENA_COLOURS = Object.freeze({
  // The photographed colour field: greens over most of the frontage, gold/amber at the east end, white and silver
  // strips scattered through it.
  greens: [[0.55, 0.78, 0.34], [0.42, 0.62, 0.30], [0.30, 0.46, 0.24], [0.66, 0.84, 0.45], [0.48, 0.70, 0.36]],
  gold: [[0.88, 0.62, 0.14], [0.80, 0.50, 0.12], [0.93, 0.74, 0.28]],
  white: [0.90, 0.91, 0.88],
  silver: [0.78, 0.80, 0.80],
  band: [0.13, 0.14, 0.15],          // charcoal fascia
  bandEdge: [0.20, 0.21, 0.22],
  glazing: [0.16, 0.19, 0.20],
  mullion: [0.55, 0.57, 0.58],
  roof: [0.30, 0.31, 0.32],
  mast: [0.72, 0.73, 0.74],
  statue: [0.78, 0.79, 0.80],
  paving: [0.66, 0.65, 0.62],
  sign: [0.94, 0.94, 0.92],
});

export const KAI_TAK_ARENA_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://commons.wikimedia.org/wiki/File:KAI_TAK_ARENA.jpg',
    evidence: 'Exterior: a dark charcoal fascia band wraps the curved roofline over a facade of tall vertical panels '
      + 'in lime, sage and olive green with scattered white and silver strips, and a gold/amber patchwork at the far '
      + 'end; white "啟德體育園 KAI TAK ARENA" lettering sits on the band, above a dark glazed base and a paved plaza '
      + 'with a silver gymnast statue.',
  },
  {
    url: 'https://zh.wikipedia.org/zh-hans/啟德體藝館',
    evidence: '10,000 seats with about 80% retractable or movable, pillar-free design, three-side stage in the main '
      + '"競技場" arena and a 500-seat "習藝坊" secondary hall; opened 1 March 2025 with the rest of the park; '
      + 'architects Populous and Simon Kwan & Associates; address 38-39 承啟道 Shing Kai Road.',
  },
  {
    url: 'https://stadiumseatingplan.com/hong-kong/kai-tak-arena-seating-plan/',
    evidence: 'Main hall floor of 7,066 m² with a 12.5 m ceiling, configured for badminton, basketball, gymnastics, '
      + 'tennis, table tennis and concerts.',
  },
  {
    url: 'https://zh.wikipedia.org/zh-hk/啟德體育園',
    evidence: 'The park holds a 50,000-seat stadium, this 10,000-seat indoor arena and a 5,000-seat youth sports '
      + 'ground; construction began 23 April 2019 and the whole park opened on 1 March 2025.',
  },
]);

export function kaiTakArenaTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([KAI_TAK_ARENA_SITE], x, z, rawHeight, padHeight);
}
