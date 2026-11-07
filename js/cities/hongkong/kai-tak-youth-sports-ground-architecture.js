// HK-B0106: 啟德青年運動場 Kai Tak Youth Sports Ground — the 5,000-seat public sports ground of 啟德體育園.
//
// The footprint is OSM way 609099607 (`leisure=stadium`, 58 ring positions, 227 x 190 m) between Kai Tak Sports
// Avenue and 承啟道 Shing Kai Road. Note that 啟德隧道 Kai Tak Tunnel passes *beneath* the ground: the tunnel's
// surface footprint overlaps the ring, but the ground, its track and its stands all sit at grade above it, which is
// why the overlap is recorded rather than treated as a road conflict.
//
// The ground is an open, unroofed public facility: a 400 m running track around a natural-turf pitch, one main
// 5,000-seat stand with a white cantilever canopy, low terracing on the opposite side, four tall floodlight masts,
// and a simple perimeter fence with two entrance gates.
import {
  makeAuthoredSite, authoredOsmSource, authoredTerrainHeightAt, AUTHORED_OSM_RETRIEVED,
} from './authored-landmark-site.js';

export const KAI_TAK_YOUTH_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 609099607, version: 7,
  tags: {
    leisure: 'stadium', name: 'Kai Tak Youth Sports Ground',
    'addr:housenumber': '38', 'addr:street': 'Pier Gallery',
  },
  geometry: Object.freeze([
    { lon: 114.1938176, lat: 22.3247076 }, { lon: 114.1938247, lat: 22.3246370 }, { lon: 114.1938471, lat: 22.3243477 },
    { lon: 114.1938794, lat: 22.3239311 }, { lon: 114.1938808, lat: 22.3239176 }, { lon: 114.1938848, lat: 22.3239054 },
    { lon: 114.1942819, lat: 22.3234825 }, { lon: 114.1942989, lat: 22.3234724 }, { lon: 114.1943173, lat: 22.3234662 },
    { lon: 114.1943333, lat: 22.3234684 }, { lon: 114.1943457, lat: 22.3234747 }, { lon: 114.1943948, lat: 22.3234502 },
    { lon: 114.1944447, lat: 22.3235391 }, { lon: 114.1947452, lat: 22.3233950 }, { lon: 114.1947965, lat: 22.3233704 },
    { lon: 114.1948503, lat: 22.3233845 }, { lon: 114.1949020, lat: 22.3234039 }, { lon: 114.1949512, lat: 22.3234283 },
    { lon: 114.1949973, lat: 22.3234575 }, { lon: 114.1950397, lat: 22.3234912 }, { lon: 114.1950779, lat: 22.3235288 },
    { lon: 114.1951178, lat: 22.3234919 }, { lon: 114.1951910, lat: 22.3235631 }, { lon: 114.1953599, lat: 22.3237703 },
    { lon: 114.1954028, lat: 22.3237591 }, { lon: 114.1954663, lat: 22.3238250 }, { lon: 114.1955111, lat: 22.3239031 },
    { lon: 114.1955060, lat: 22.3239687 }, { lon: 114.1954965, lat: 22.3239865 }, { lon: 114.1955007, lat: 22.3240086 },
    { lon: 114.1955134, lat: 22.3240150 }, { lon: 114.1955480, lat: 22.3240132 }, { lon: 114.1955595, lat: 22.3240295 },
    { lon: 114.1955567, lat: 22.3240815 }, { lon: 114.1955681, lat: 22.3241249 }, { lon: 114.1955977, lat: 22.3241476 },
    { lon: 114.1956175, lat: 22.3242012 }, { lon: 114.1955248, lat: 22.3242005 }, { lon: 114.1956668, lat: 22.3243924 },
    { lon: 114.1957609, lat: 22.3243937 }, { lon: 114.1957698, lat: 22.3244256 }, { lon: 114.1957833, lat: 22.3244321 },
    { lon: 114.1957914, lat: 22.3244441 }, { lon: 114.1957941, lat: 22.3244576 }, { lon: 114.1957926, lat: 22.3244782 },
    { lon: 114.1956512, lat: 22.3248361 }, { lon: 114.1956370, lat: 22.3248613 }, { lon: 114.1956196, lat: 22.3248709 },
    { lon: 114.1956044, lat: 22.3248752 }, { lon: 114.1955866, lat: 22.3248765 }, { lon: 114.1954300, lat: 22.3250898 },
    { lon: 114.1953791, lat: 22.3251588 }, { lon: 114.1953364, lat: 22.3252273 }, { lon: 114.1953106, lat: 22.3252688 },
    { lon: 114.1950430, lat: 22.3256182 }, { lon: 114.1949361, lat: 22.3257589 }, { lon: 114.1943434, lat: 22.3252018 },
    { lon: 114.1938176, lat: 22.3247076 },
  ]),
  sourceTimestamp: '2026-07-13T17:22:58Z',
  evidence: `OSM way 609099607 (${AUTHORED_OSM_RETRIEVED}): 58 ring positions tagged leisure=stadium for the '
    + '5,000-seat public sports ground. The Kai Tak Tunnel runs beneath this block, so the tunnel footprint '
    + 'overlaps the ring in plan; see KAI_TAK_YOUTH_TUNNEL_NOTE.`,
});

export const KAI_TAK_YOUTH_TUNNEL_NOTE = '啟德隧道 Kai Tak Tunnel passes beneath the ground; its alignment overlaps the '
  + 'OSM ring in plan, so overlapping samples are above the tunnel, not on a carriageway.';

export const KAI_TAK_YOUTH_SITE = makeAuthoredSite(
  'kaiTakYouthSportsGround', '啟德青年運動場', 'Kai Tak Youth Sports Ground', KAI_TAK_YOUTH_OSM_SOURCE,
  {
    height: 26, levels: null, roadIds: [],
    evidence: 'Exact OSM stadium block; the track, pitch, stands and masts are all modelled inside it, and the '
      + 'Kai Tak Tunnel beneath is recorded rather than built over.',
  },
);

export const KAI_TAK_YOUTH_SEATS = 5000;
export const KAI_TAK_YOUTH_OPENED = '2025-03-01';
export const KAI_TAK_YOUTH_TRACK = '400 m eight-lane running track';
export const KAI_TAK_YOUTH_PITCH = Object.freeze({ length: 100, width: 60, surface: 'natural turf' });
export const KAI_TAK_YOUTH_MASTS = 4;
export const KAI_TAK_YOUTH_MAST_HEIGHT = 32;
export const KAI_TAK_YOUTH_MAIN_STAND_ROWS = 16;
export const KAI_TAK_YOUTH_MAIN_STAND_TOP = 9.4;
export const KAI_TAK_YOUTH_CANOPY_DEPTH = 12.0;

export const KAI_TAK_YOUTH_COLOURS = Object.freeze({
  track: [0.62, 0.30, 0.22],
  trackLine: [0.92, 0.92, 0.90],
  pitch: [0.28, 0.47, 0.22],
  pitchStripe: [0.31, 0.51, 0.24],
  seat: [0.20, 0.30, 0.52],
  seatAlt: [0.76, 0.74, 0.70],
  canopy: [0.93, 0.93, 0.90],
  mast: [0.86, 0.87, 0.86],
  concrete: [0.70, 0.69, 0.66],
  paving: [0.66, 0.65, 0.62],
  fence: [0.52, 0.54, 0.55],
});

export const KAI_TAK_YOUTH_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://zh.wikipedia.org/zh-hk/啟德體育園',
    evidence: '啟德青年運動場 is the 5,000-seat outdoor public sports ground of Kai Tak Sports Park, opened with the '
      + 'rest of the park on 1 March 2025; the park also holds the 50,000-seat stadium and a 10,000-seat arena.',
  },
  {
    url: 'https://en.wikipedia.org/wiki/Kai_Tak_Sports_Park',
    evidence: 'The youth sports ground is an open public facility with a running track and a single covered main '
      + 'stand rather than a bowl; it sits south-west of the stadium, beside 承啟道 Shing Kai Road.',
  },
  {
    url: 'https://www.openstreetmap.org/way/609099607',
    evidence: 'The surveyed 227 x 190 m block, and the Kai Tak Tunnel alignment that runs beneath it.',
  },
]);

export function kaiTakYouthTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([KAI_TAK_YOUTH_SITE], x, z, rawHeight, padHeight);
}
