// HISTORICAL RECONSTRUCTION — 荔園遊樂場 Lai Chi Kok Amusement Park (Lai Yuen), 1949-04-16 to 1997-03-31.
//
// This is the only landmark in the city that is deliberately NOT on an OSM footprint: the park was demolished in
// 1997 and its ground is now 荔欣苑 Lai Yan Court (OSM way 386780290), 華荔邨 Wah Lai Estate (way 386780597) and
// 盈暉臺 Nob Hill (way 386777993). The modelled outline below is therefore photo/history directed, and it is kept
// strictly outside every retained modern carriageway (verified by tests/stonecutters-lai-yuen.test.cjs).
//
// Everything that follows is documented from the sources listed in LAI_YUEN_RESEARCH_SOURCES: the 1949 opening with
// three spring-fed pools and a bathing beach, the 1961 purchase by 邱德根 Deacon Chiu, 宋城 Sung City (opened 1979
// with the 中國歷代帝皇先賢蠟像院 wax museum), the rides (摩天輪 ferris wheel, 旋轉木馬 carousel, 咖啡杯 coffee cups,
// 小飛象 Dumbo, 八爪魚 octopus, 碰碰車 bumper cars, 過山飛龍 roller coaster), the real-snow ice rink, the zoo with
// 天奴 Tino the Burmese elephant (arrived 1958, died 1989-02-03), and the 1997 closure.
import { makePhotoDirectedSite } from './authored-landmark-site.js';
import { pointInFlatRing } from './landmark-site.js';

// Historical park core, drawn to the two-estate block and clipped off the modern Lai King Hill Road corridor.
const LAI_YUEN_HISTORICAL_RING = Object.freeze([
  -2430, -6800, -2330, -6800, -2330, -6734, -2246, -6734, -2246, -6654, -2430, -6654, -2430, -6800,
]);

export const LAI_YUEN_SITE = makePhotoDirectedSite(
  'laiYuen', '荔園遊樂場', LAI_YUEN_HISTORICAL_RING,
  'Historical reconstruction. The 1949-1997 park stood on the ground now occupied by Lai Yan Court (OSM way '
  + '386780290), Wah Lai Estate (way 386780597) and Nob Hill (way 386777993). No OSM footprint of the park exists; '
  + 'this outline is drawn between those estates and outside every retained modern carriageway. It is a presentation '
  + 'datum, not a surveyed or reconstructed survey boundary.',
  { height: 32, role: 'historical-park' },
);

export const LAI_YUEN_HISTORICAL = Object.freeze({
  historicalReconstruction: true,
  opened: '1949-04-16', closed: '1997-03-31',
  originalName: '荔枝園 Lai Chi Kok Gardens',
  documentedAreaSquareFeet: 1600000,
  documentedAreaSquareMetres: 148645,
  presentUse: '荔欣苑 Lai Yan Court, 華荔邨 Wah Lai Estate, 盈暉臺 Nob Hill',
  presentOsmWays: Object.freeze([386780290, 386780597, 386777993]),
  note: 'Only the park core between the estates is modelled; the 160萬平方呎 total also covered the Lai Chi Kok Bay '
    + 'beach, the hillside and the later reclamation, which are not reconstructed.',
});

export const LAI_YUEN_ATTENDANCE = Object.freeze({ finalDay: 30000, finalWeekDaily: 5000, finalEvening: 20000 });
export const LAI_YUEN_TICKETS = Object.freeze({ adult: 10, child: 5, sungCityEntry: 0.5 });

// --- the entrance -----------------------------------------------------------
// The 1960s photograph shows twin ribbed festival towers flanking a deep portal, decorative round emblems on the
// tower faces, the roller-coaster track showing above the roofline behind, and a large branded sign board on the
// right-hand kiosk. Height and span are read off that photograph against the people standing at the turnstiles.
export const LAI_YUEN_ENTRANCE = Object.freeze({
  x: -2290, z: -6662, facing: 0,
  width: 26, depth: 12, towerHeight: 14.5, towerWidth: 4.2, portalClear: 7.2,
});
export const LAI_YUEN_TICKET_BOOTHS = Object.freeze([{ x: -2305, z: -6664 }, { x: -2275, z: -6664 }]);

// --- rides ------------------------------------------------------------------
export const LAI_YUEN_FERRIS_WHEEL = Object.freeze({ x: -2352, z: -6718, radius: 17, hubHeight: 19, gondolas: 16 });
export const LAI_YUEN_CAROUSEL = Object.freeze({ x: -2330, z: -6692, radius: 7.6, horses: 16 });
export const LAI_YUEN_COFFEE_CUPS = Object.freeze({ x: -2352, z: -6684, radius: 8 });
export const LAI_YUEN_DUMBO = Object.freeze({ x: -2330, z: -6668, radius: 9 });
export const LAI_YUEN_OCTOPUS = Object.freeze({ x: -2352, z: -6660, radius: 10 });
export const LAI_YUEN_BUMPER_CARS = Object.freeze({ x: -2318, z: -6728, width: 22, depth: 16, height: 7.5 });
export const LAI_YUEN_ROLLER_COASTER = Object.freeze({ x: -2400, z: -6772, length: 58, width: 34, peak: 16 });
export const LAI_YUEN_ICE_RINK = Object.freeze({ x: -2398, z: -6746, width: 26, depth: 18, height: 9 });

// --- water ------------------------------------------------------------------
export const LAI_YUEN_LAKE = Object.freeze({ x: -2352, z: -6770, radius: 16 });
export const LAI_YUEN_BOAT_PAVILION = Object.freeze({ x: -2352, z: -6770, length: 22, width: 8, height: 9 });
export const LAI_YUEN_POOLS = Object.freeze({ x: -2402, z: -6700, widths: Object.freeze([18, 18, 18]), depth: 22, gap: 2.4 });

// --- zoo --------------------------------------------------------------------
// Tino's cage was notoriously small (under 500 sq ft); it is modelled at its documented size and not enlarged.
export const LAI_YUEN_TINO_CAGE = Object.freeze({ x: -2418, z: -6672, width: 6.4, depth: 5.6 });
export const LAI_YUEN_TINO = Object.freeze({ name: '天奴 Tino', species: 'Burmese elephant', arrived: 1958, died: '1989-02-03' });
export const LAI_YUEN_ZOO_ROWS = Object.freeze({ x: -2422, z0: -6698, z1: -6658, cageWidth: 5, cageDepth: 4.6, cages: 5 });
export const LAI_YUEN_ZOO_CLOSED = '1993-07-31';

// --- 宋城 Sung City ----------------------------------------------------------
export const LAI_YUEN_SUNG_CITY = Object.freeze({
  x: -2276, z: -6704, width: 52, depth: 50, wallHeight: 6.5, wallThickness: 1.4,
  gateHeight: 11.5, pagodaTiers: 5, pagodaHeight: 24, opened: 1979, waxMuseumSquareFeet: 6000,
  hallCount: 3, admission: 0.5,
});

export const LAI_YUEN_ROAD_IDS = Object.freeze([]);

export const LAI_YUEN_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://zh.wikipedia.org/zh-hk/荔園',
    evidence: 'Opened 1949-04-16 as 荔枝園 with three spring-fed swimming pools and a bathing beach; total area '
      + '160萬平方呎; purchased by 邱德根 in 1961 with 宋城 added (admission 5 jiao); closed 1997-03-31 with over '
      + '30,000 visitors on the final day and 20,000 that evening; rides listed as 摩天輪, 碰碰車, 旋轉木馬, 哈哈鏡, '
      + '搖搖船, 咖啡杯, 小飛象, 八爪魚, 過山飛龍, 恐龍屋 and 鬼屋, plus the only real-snow ice rink in Hong Kong.',
  },
  {
    url: 'https://hkgpao.com/articles/1661',
    evidence: 'The 1952 zoo held leopard, black bear, giraffe and tiger; Tino the elephant was the park mascot; the '
      + 'zoo closed 1993-07-31 and over 100 animals went to Shenzhen Safari Park.',
  },
  {
    url: 'https://gwulo.com/node/7376/photos',
    evidence: '1960s entrance photograph: twin ribbed festival towers flanking a deep portal with round emblems, '
      + 'roller-coaster track visible above the roofline and a branded sign board; 1950s lake photograph: a boat-'
      + 'shaped pavilion on the water with a white modernist pavilion and flagpole on the shore.',
  },
  {
    url: 'https://zh.wikipedia.org/wiki/宋城',
    evidence: '宋城 opened in 1979 as a walled Song-dynasty streetscape beside 荔園, and the 中國歷代帝皇先賢蠟像院 '
      + 'wax museum (6,000+ sq ft, 1979-06 to 1997-03-31) stood inside it.',
  },
]);

// The park was levelled flat: inside the outline the ground is the pad itself rather than max(raw, pad), and the
// last LAI_YUEN_EDGE_BLEND metres outside the boundary ramp from the pad back to the natural ground, so the park
// meets the streets and the hillside on a graded bank instead of a step.
export const LAI_YUEN_EDGE_BLEND = 12;

function distanceToRing(ring, x, z) {
  let best = Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    const ax = ring[i], az = ring[i + 1];
    const bx = ring[(i + 2) % ring.length], bz = ring[(i + 3) % ring.length];
    const dx = bx - ax, dz = bz - az;
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared < 1e-9) { best = Math.min(best, Math.hypot(x - ax, z - az)); continue; }
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSquared));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

export function laiYuenTerrainHeightAt(x, z, rawHeight, padHeight) {
  const ring = LAI_YUEN_SITE.ring;
  const bounds = LAI_YUEN_SITE.bounds;
  const outside = x < bounds.minX - LAI_YUEN_EDGE_BLEND || x > bounds.maxX + LAI_YUEN_EDGE_BLEND
    || z < bounds.minZ - LAI_YUEN_EDGE_BLEND || z > bounds.maxZ + LAI_YUEN_EDGE_BLEND;
  if (outside) return rawHeight;
  if (pointInFlatRing(ring, x, z)) return padHeight;
  const distance = distanceToRing(ring, x, z);
  if (distance >= LAI_YUEN_EDGE_BLEND) return rawHeight;
  const t = distance / LAI_YUEN_EDGE_BLEND;
  return padHeight * (1 - t) + rawHeight * t;
}
