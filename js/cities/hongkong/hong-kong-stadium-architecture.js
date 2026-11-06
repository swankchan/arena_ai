// HK-B0102: Hong Kong Stadium (香港大球場), 55 Eastern Hospital Road, So Kon Po.
// The source footprint is the exact OSM `leisure=stadium` way 230843881 (45 nodes). The rebuilt 1994 stadium is a
// single continuous bowl with two enormous white fabric roofs — one over each long stand — each carried by a pair
// of white tubular arches whose legs land outside the seating, with the two ends left open. That twin-arch / twin
// membrane silhouette is the identifying feature and is modelled here rather than a generic domed bowl.
import {
  makeAuthoredSite, authoredOsmSource, authoredTerrainHeightAt, AUTHORED_OSM_RETRIEVED,
} from './authored-landmark-site.js';

// Node order is the way's own node sequence; coordinates are the OSM node positions.
const HKS_NODES = Object.freeze([
  [2392799628, 22.2740858, 114.1876406], [2392799571, 22.2739739, 114.1877160],
  [2392799556, 22.2737655, 114.1878259], [2392799767, 22.2735670, 114.1878685],
  [2392799607, 22.2734850, 114.1878608], [2392799699, 22.2731873, 114.1877799],
  [2392799570, 22.2729117, 114.1877425], [2392799596, 22.2726263, 114.1877667],
  [2392799586, 22.2724426, 114.1878041], [2392799788, 22.2722892, 114.1878389],
  [2392799608, 22.2721008, 114.1879375], [2392799555, 22.2719639, 114.1880726],
  [2392799565, 22.2718383, 114.1882198], [2392799748, 22.2717649, 114.1884616],
  [2392799593, 22.2717326, 114.1887030], [2392799690, 22.2717799, 114.1888984],
  [2392799553, 22.2718909, 114.1891405], [2392799654, 22.2720331, 114.1893168],
  [2392799650, 22.2722563, 114.1894272], [2392799658, 22.2724996, 114.1895104],
  [2392799631, 22.2726411, 114.1895426], [2392799671, 22.2728992, 114.1895613],
  [2392799714, 22.2730978, 114.1895426], [2392799710, 22.2733013, 114.1894889],
  [2392799630, 22.2735495, 114.1894084], [2392799576, 22.2737655, 114.1894433],
  [2392799557, 22.2739193, 114.1894433], [2392799758, 22.2739947, 114.1902081],
  [2392799746, 22.2740361, 114.1902529], [2392799590, 22.2746267, 114.1897889],
  [2392799592, 22.2742818, 114.1893222], [2392799707, 22.2741801, 114.1891774],
  [2392799724, 22.2741154, 114.1890437], [2392799581, 22.2740659, 114.1888475],
  [2392799641, 22.2740585, 114.1887348], [2520298395, 22.2740637, 114.1886566],
  [2392799662, 22.2740684, 114.1885846], [2392799722, 22.2741129, 114.1884053],
  [2392799649, 22.2742297, 114.1881420], [2392799783, 22.2742470, 114.1881103],
  [2392799760, 22.2743984, 114.1878957], [2392799648, 22.2743985, 114.1878363],
  [2392799764, 22.2743116, 114.1877559], [2392799786, 22.2742023, 114.1877294],
  [2392799628, 22.2740858, 114.1876406],
]);

export const HONG_KONG_STADIUM_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 230843881, version: 6,
  tags: {
    'addr:housename': '香港大球場', 'addr:housename:en': 'Hong Kong Stadium', 'addr:housename:zh': '香港大球場',
    'addr:housenumber': '55', 'addr:street': '東院道 Eastern Hospital Road', 'addr:suburb': '掃桿埔 So Kon Po',
    leisure: 'stadium', name: '香港大球場 Hong Kong Stadium', 'name:en': 'Hong Kong Stadium',
    'name:zh': '香港大球場', wikidata: 'Q992697',
  },
  geometry: HKS_NODES.map(([, lat, lon]) => ({ lat, lon })),
  sourceTimestamp: '2026-07-29T06:17:04Z',
  evidence: `OSM way 230843881 v6 (${AUTHORED_OSM_RETRIEVED}): 45-node stadium bowl outline at 55 Eastern Hospital Road.`,
});

export const HONG_KONG_STADIUM_SITE = makeAuthoredSite(
  'hongKongStadium', '香港大球場', 'Hong Kong Stadium', HONG_KONG_STADIUM_OSM_SOURCE,
  {
    height: 40, roadIds: [],
    evidence: 'Exact OSM stadium bowl outline; the stands are modelled inside it, never over Eastern Hospital Road.',
  },
);

// --- bowl ------------------------------------------------------------------
export const HKS_PITCH_LENGTH = 105, HKS_PITCH_WIDTH = 68;
export const HKS_APRON = 6.5;
export const HKS_BOWL_ROWS = 36;
export const HKS_ROW_TREAD = 0.80;
export const HKS_ROW_RISE = 0.50;
export const HKS_FRONT_WALL = 2.4;
export const HKS_SEAT_PITCH = 0.48;
export const HKS_INNER_HALF_LENGTH = HKS_PITCH_LENGTH / 2 + HKS_APRON;   // 59.0
export const HKS_INNER_HALF_WIDTH = HKS_PITCH_WIDTH / 2 + HKS_APRON;     // 40.5
export const HKS_STAND_DEPTH = HKS_BOWL_ROWS * HKS_ROW_TREAD;            // 28.8
export const HKS_TIER_TOP = HKS_FRONT_WALL + HKS_BOWL_ROWS * HKS_ROW_RISE;
export const HKS_OUTER_HALF_LENGTH = HKS_INNER_HALF_LENGTH + HKS_STAND_DEPTH;
export const HKS_OUTER_HALF_WIDTH = HKS_INNER_HALF_WIDTH + HKS_STAND_DEPTH;

// The two fabric roofs: one over each long stand, springing from outside the back wall and cantilevered over the
// pitch edge, carried by two tubular arches each.
export const HKS_ROOF_COUNT = 2;
export const HKS_ARCHES_PER_ROOF = 2;
export const HKS_ROOF_APEX = 46.5;
export const HKS_ROOF_SPRING = 24.0;
export const HKS_ROOF_CANTILEVER = 9.0;          // how far the membrane oversails the front row
export const HKS_ARCH_LEG_OFFSET = 6.0;          // arch legs land this far outside the back wall
export const HKS_SEATS = 40000;
export const HKS_REBUILD_YEAR = 1994, HKS_ORIGINAL_YEAR = 1953;
export const HKS_PITCH_SURFACE = 'natural grass';
export const HKS_FLOODLIGHT_HEIGHT = 52;

export const HKS_COLOURS = Object.freeze({
  membrane: [0.93, 0.93, 0.90],
  arch: [0.90, 0.91, 0.89],
  seatGreen: [0.13, 0.32, 0.22],
  seatRed: [0.55, 0.13, 0.15],
  concrete: [0.80, 0.80, 0.77],
  plinth: [0.33, 0.34, 0.34],
  deck: [0.55, 0.55, 0.53],
  grass: [0.24, 0.44, 0.16],
  grassStripe: [0.27, 0.48, 0.18],
  kerb: [0.52, 0.52, 0.50],
});

export const HKS_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://tensinet.com/index.php/projects-database/projects?id=3916&view=project',
    evidence: 'TensiNet record and photographs of the 1994 roof: two large white tensile membrane roofs, one over '
      + 'each long stand, each carried by a pair of white tubular lattice arches whose legs land outside the seating; '
      + 'the two ends of the bowl stay open.',
  },
  {
    url: 'https://en.wikipedia.org/wiki/Hong_Kong_Stadium',
    evidence: 'So Kon Po stadium on the 1953 site, rebuilt in 1994 for ~40,000 spectators with a natural grass pitch.',
  },
  {
    url: 'https://commons.wikimedia.org/wiki/Category:Hong_Kong_Stadium',
    evidence: 'Aerial views: continuous single-tier bowl wrapping the pitch, deep stands, twin membrane roofs over '
      + 'the long sides only.',
  },
]);

export function hongKongStadiumTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([HONG_KONG_STADIUM_SITE], x, z, rawHeight, padHeight);
}
