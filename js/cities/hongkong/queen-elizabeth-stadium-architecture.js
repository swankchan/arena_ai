// HK-B0103: 伊利沙伯體育館 Queen Elizabeth Stadium, 18 Oi Kwan Road, Wan Chai (Morrison Hill).
//
// The source footprint is the exact OSM `leisure=sports_hall` way 260868015, and its shape is not a plain
// rectangle: the east side is set back 4 m over a 31 m length (the service / ramp passage in the 2025 photographs)
// and the west side steps in three places with a chamfered south-west corner. Those real edges drive the massing.
//
// Appearance is taken from the Commons photographs of the exterior and the 2011 frontage: a full-height
// green-tinted glass curtain wall on the ground floor, a thin projecting white entrance canopy carrying the black
// "QUEEN ELIZABETH STADIUM 伊利沙伯體育館" lettering, a band of small clerestory windows above the glass, and then
// the building's signature: a deep white facade of closely-spaced horizontal ribs (louvre-like flutes) that wraps
// the hall, with flat cream-grey rendered piers and panels between, over a rendered podium of the same cream-grey.
// Everything below is a reproducible construction datum, not a surveyed engineering level.
import {
  makeAuthoredSite, authoredOsmSource, authoredTerrainHeightAt, AUTHORED_OSM_RETRIEVED,
} from './authored-landmark-site.js';

// OSM way 260868015 v9 (Kovoschiz, 2026-07-13), 17 distinct nodes in way order.
const QE_STADIUM_RING_GEOMETRY = Object.freeze([
  { lat: 22.2749303, lon: 114.1791478 }, { lat: 22.2749301, lon: 114.1791146 }, { lat: 22.2749212, lon: 114.1791146 },
  { lat: 22.2749148, lon: 114.1790492 }, { lat: 22.2749271, lon: 114.1788747 }, { lat: 22.2749504, lon: 114.1788604 },
  { lat: 22.2749527, lon: 114.1787813 }, { lat: 22.2749952, lon: 114.1786159 }, { lat: 22.2753954, lon: 114.1786244 },
  { lat: 22.2753934, lon: 114.1787525 }, { lat: 22.2753577, lon: 114.1787518 }, { lat: 22.2753531, lon: 114.1790575 },
  { lat: 22.2753888, lon: 114.1790582 }, { lat: 22.2753870, lon: 114.1791826 }, { lat: 22.2751607, lon: 114.1791787 },
  { lat: 22.2749361, lon: 114.1791743 }, { lat: 22.2749366, lon: 114.1791479 }, { lat: 22.2749303, lon: 114.1791478 },
]);

const QE_STADIUM_RING_NODE_IDS = Object.freeze([
  2664531220, 2664531405, 2664531364, 2664531356, 2664531344, 2664531315, 2664531337, 2664531348, 2664531397,
  2664531415, 2664531308, 2664531240, 2664531403, 2664531234, 2664531399, 2664531251, 2664531239, 2664531220,
]);

export const QE_STADIUM_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 260868015, version: 9,
  tags: {
    'addr:housenumber': '18', 'addr:street': '愛群道 Oi Kwan Road', building: 'yes', leisure: 'sports_hall',
    name: '伊利沙伯體育館 Queen Elizabeth Stadium', 'name:en': 'Queen Elizabeth Stadium',
    'name:zh': '伊利沙伯體育館', wikidata: 'Q631386',
    wikimedia_commons: 'Category:Queen Elizabeth Stadium', wikipedia: 'en:Queen Elizabeth Stadium',
  },
  geometry: QE_STADIUM_RING_GEOMETRY,
  sourceTimestamp: '2026-07-13T17:22:58Z',
  evidence: `OSM way 260868015 v9 (${AUTHORED_OSM_RETRIEVED}): 17 distinct nodes (18 ring positions) tagged `
    + 'leisure=sports_hall, 18 愛群道 Oi Kwan Road. The ring is stepped, not rectangular: a 4 m east setback between '
    + 'lz -15.6 and +16.0, three steps down the west side and a chamfer across the south-west corner. The node ids '
    + 'are recorded in QE_STADIUM_RING_NODE_IDS so the outline can be re-fetched and checked.',
});

export const QE_STADIUM_SITE = makeAuthoredSite(
  'queenElizabethStadium', '伊利沙伯體育館', 'Queen Elizabeth Stadium', QE_STADIUM_OSM_SOURCE,
  {
    height: 33, levels: null, roadIds: [],
    evidence: 'Exact OSM sports_hall block on Morrison Hill; the hall is modelled inside that outline, so the '
      + 'Oi Kwan Road frontage and the recessed east service bay sit on the real edges.',
  },
);

// --- the hall ------------------------------------------------------------------
// The arena is a 3,500-seat indoor hall; published floor area of the arena itself is 590 m². The modelled massing
// is measured off the OSM ring, not invented: the front is the 50 m north edge onto Oi Kwan Road.
export const QE_STADIUM_CAPACITY = 3500;
export const QE_STADIUM_ARENA_FLOOR_SQUARE_METRES = 590;
export const QE_STADIUM_OPENED = '1980-08-27';
export const QE_STADIUM_FOUNDATION_STONE = '1977-12-21';
export const QE_STADIUM_OPENED_BY = 'Governor Sir Murray MacLehose';
export const QE_STADIUM_BUILDER = 'Urban Council';
export const QE_STADIUM_MANAGER = 'Leisure and Cultural Services Department';

export const QE_STADIUM_MASSING = Object.freeze({
  hallHeight: 28.2,          // rendered parapet level above the site datum
  plantHeight: 33.0,         // roof plant / louvre screens, the tallest point
  glazingHeight: 9.2,        // full-height ground-floor glass curtain wall
  glazingSetback: 1.1,       // glass sits this far behind the rendered pier line
  clerestoryTop: 11.6,       // band of small windows between glass and the fluted facade
  ribBase: 11.6,
  ribTop: 27.4,
  ribPitch: 1.35,
  ribCount: 12,              // (27.4 - 11.6) / 1.35
  ribProjection: 0.55,
  canopyBase: 9.55,
  canopyThickness: 0.85,
  canopyDepth: 3.6,
  canopySpan: 27.0,
  pierWidth: 2.6,
  parapet: 0.8,
  eastRecessDepth: 4.0,      // real OSM setback, used as the service / ramp bay
});

export const QE_STADIUM_COLOURS = Object.freeze({
  rib: [0.94, 0.935, 0.915],          // white fluted bands
  render: [0.755, 0.725, 0.695],      // cream-grey rendered piers and panels
  renderShadow: [0.665, 0.635, 0.605],
  glass: [0.50, 0.62, 0.565],         // green-tinted curtain wall
  glassDark: [0.20, 0.27, 0.25],      // lobby seen through the glass
  mullion: [0.74, 0.75, 0.745],       // stainless mullions and transoms
  canopy: [0.95, 0.95, 0.935],        // white canopy soffit and fascia
  windowBand: [0.17, 0.20, 0.20],     // dark clerestory strip
  plinth: [0.44, 0.43, 0.42],         // granite kerb and plinth
  paving: [0.62, 0.61, 0.585],        // Oi Kwan Road footway
  shutter: [0.52, 0.53, 0.52],        // service-bay roller shutters
  leaf: [0.20, 0.36, 0.17],
  trunk: [0.32, 0.27, 0.21],
});

export const QE_STADIUM_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://commons.wikimedia.org/wiki/File:Hong_Kong_Queen_Elizabeth_Stadium_2011_01_23.JPG',
    evidence: '2011 frontage: full-height green-tinted glass curtain wall with slim stainless mullions, a thin '
      + 'projecting white canopy carrying black "QUEEN ELIZABETH STADIUM 伊利沙伯體育館" lettering, a dark clerestory '
      + 'window strip above the glass, and a deep white horizontally-fluted upper facade over cream-grey piers.',
  },
  {
    url: 'https://hkmytravel.com/tc/旅遊景點/香港島/灣仔/伊利沙伯體育館/',
    evidence: 'Upward front elevation: the white ribs are ~1.3 m apart and project as deep shadow-casting flutes '
      + 'over the whole upper wall; the cream-grey end piers are plain render with no ribs.',
  },
  {
    url: 'https://crystalyard.com/blog/queen-elizabeth-stadium',
    evidence: 'Side/rear elevation: large independently-framed white ribbed pods stand proud of cream-grey wall '
      + 'panels, with a narrow strip of small punched windows serving the stair and plant between them.',
  },
  {
    url: 'https://fpf.ccidahk.gov.hk/tc/location/detail.php?id=42',
    evidence: '3,500 seats and a 590 m² arena floor; facilities include the arena, a multi-purpose practice hall, '
      + 'badminton and squash courts, table tennis, gymnasium and function rooms.',
  },
  {
    url: 'https://en.wikipedia.org/wiki/Queen_Elizabeth_Stadium',
    evidence: 'Built by the Urban Council; foundation stone laid 21 December 1977 by Acting Governor Sir Denys '
      + 'Roberts; opened 27 August 1980 by Governor Sir Murray MacLehose; hosted the 1983 Asian Basketball '
      + 'Championship; first concerts by Kenji Sawada (Dec 1980) and Teresa Teng (1982).',
  },
]);

// Reproducible construction datum: the highest raw DTM sample anywhere on the exact OSM ring.
export function queenElizabethStadiumTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([QE_STADIUM_SITE], x, z, rawHeight, padHeight);
}
