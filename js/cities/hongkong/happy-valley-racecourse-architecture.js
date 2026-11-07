// HK-B0107: 跑馬地馬場 Happy Valley Racecourse — Hong Kong's first racecourse, opened 1846.
//
// The venue footprint is OSM relation 8049451 (`leisure=stadium`, `sport=horse_racing`,
// "跑馬地馬場 Happy Valley Racecourse", multipolygon). Its outer ways form the fence round the whole course,
// 653 x 378 m, and they follow 黃泥涌道 Wong Nai Chung Road and 禮頓道 / 摩理臣山道 on the landward sides.
//
// The racing surface is modelled as a discorectangle of the published dimensions — 310 m straights, a 30.5 m wide
// grass track, and a 1,417 m A-course lap. Fitting that circuit 1:1 inside the surveyed fence is impossible: the
// fence clips its south-east corner, so the surface is placed by the fit recorded in HAPPY_VALLEY_TRACK_FIT
// (scale 0.90, rotation -14°, centre offset -8 / -19 m from the site origin) which keeps at least 8.2 m of apron
// between the outer running rail and the fence everywhere. The fitted lap is therefore 1,269 m against the
// published 1,417 m; the shortfall is recorded here rather than hidden, because the boundary itself is the survey.
//
// Identity from the photographs and the published record: a single 30 m grass track (the 1995 rebuild merged the
// old outer grass and inner sand tracks), white running rails, a sand-coloured infield with the club's green
// branding boards and a large video screen facing the stand, the long white multi-tier grandstand of 1969 with
// the 香港賽馬博物館 Hong Kong Racing Museum in its complex, the members' stand and clubhouse, and the floodlit
// night meetings run here every Wednesday since 1973.
import {
  makeAuthoredSite, authoredOsmSource, authoredTerrainHeightAt, AUTHORED_OSM_RETRIEVED,
} from './authored-landmark-site.js';

// OSM relation 8049451, outer ways 23766488 + 563842038 + 524353365 + 563648701 (63 ring positions).
export const HAPPY_VALLEY_RING_GEOMETRY = Object.freeze([
  { lon: 114.1796051, lat: 22.2738704 }, { lon: 114.1796613, lat: 22.2736664 }, { lon: 114.1796873, lat: 22.2735913 },
  { lon: 114.1796960, lat: 22.2735663 }, { lon: 114.1797047, lat: 22.2735412 }, { lon: 114.1799465, lat: 22.2729410 },
  { lon: 114.1799660, lat: 22.2728867 }, { lon: 114.1800981, lat: 22.2725182 }, { lon: 114.1803771, lat: 22.2719048 },
  { lon: 114.1804115, lat: 22.2718310 }, { lon: 114.1804600, lat: 22.2717616 }, { lon: 114.1805209, lat: 22.2717036 },
  { lon: 114.1805817, lat: 22.2716456 }, { lon: 114.1806835, lat: 22.2715719 }, { lon: 114.1808483, lat: 22.2714606 },
  { lon: 114.1809110, lat: 22.2714183 }, { lon: 114.1812508, lat: 22.2711818 }, { lon: 114.1814225, lat: 22.2710667 },
  { lon: 114.1816960, lat: 22.2709105 }, { lon: 114.1817679, lat: 22.2708710 }, { lon: 114.1818888, lat: 22.2708184 },
  { lon: 114.1820143, lat: 22.2709395 }, { lon: 114.1820248, lat: 22.2709497 }, { lon: 114.1820440, lat: 22.2709685 },
  { lon: 114.1823936, lat: 22.2706195 }, { lon: 114.1831154, lat: 22.2700631 }, { lon: 114.1832904, lat: 22.2699699 },
  { lon: 114.1834239, lat: 22.2699255 }, { lon: 114.1834351, lat: 22.2699361 }, { lon: 114.1834619, lat: 22.2699616 },
  { lon: 114.1834204, lat: 22.2699990 }, { lon: 114.1835461, lat: 22.2701186 }, { lon: 114.1836790, lat: 22.2701327 },
  { lon: 114.1838488, lat: 22.2701664 }, { lon: 114.1840678, lat: 22.2702450 }, { lon: 114.1842497, lat: 22.2703571 },
  { lon: 114.1844276, lat: 22.2705283 }, { lon: 114.1845169, lat: 22.2706265 }, { lon: 114.1846173, lat: 22.2708287 },
  { lon: 114.1846731, lat: 22.2709908 }, { lon: 114.1846866, lat: 22.2711458 }, { lon: 114.1846863, lat: 22.2714043 },
  { lon: 114.1844923, lat: 22.2718250 }, { lon: 114.1828146, lat: 22.2750433 }, { lon: 114.1826565, lat: 22.2752426 },
  { lon: 114.1823473, lat: 22.2751232 }, { lon: 114.1805203, lat: 22.2751479 }, { lon: 114.1802825, lat: 22.2750564 },
  { lon: 114.1801684, lat: 22.2750121 }, { lon: 114.1800999, lat: 22.2749442 }, { lon: 114.1801032, lat: 22.2749225 },
  { lon: 114.1801073, lat: 22.2748967 }, { lon: 114.1801115, lat: 22.2748692 }, { lon: 114.1799983, lat: 22.2747349 },
  { lon: 114.1799317, lat: 22.2746833 }, { lon: 114.1798940, lat: 22.2745452 }, { lon: 114.1798682, lat: 22.2745001 },
  { lon: 114.1798103, lat: 22.2743769 }, { lon: 114.1797811, lat: 22.2743027 }, { lon: 114.1797630, lat: 22.2742566 },
  { lon: 114.1797277, lat: 22.2740862 }, { lon: 114.1796497, lat: 22.2740880 }, { lon: 114.1796067, lat: 22.2739067 },
]);

export const HAPPY_VALLEY_OSM_SOURCE = authoredOsmSource({
  type: 'relation', id: 8049451, version: 5,
  tags: {
    leisure: 'stadium', sport: 'horse_racing', type: 'multipolygon', layer: '-1',
    name: '跑馬地馬場 Happy Valley Racecourse', 'name:en': 'Happy Valley Racecourse', 'name:zh': '跑馬地馬場',
    wikipedia: 'en:Happy Valley Racecourse', wikidata: 'Q837662',
  },
  geometry: HAPPY_VALLEY_RING_GEOMETRY,
  sourceTimestamp: '2022-04-26T10:08:45Z',
  evidence: `OSM relation 8049451 (${AUTHORED_OSM_RETRIEVED}): a multipolygon tagged leisure=stadium and `
    + 'sport=horse_racing. The outer ways 23766488, 563842038, 524353365 and 563648701 ring the whole course and '
    + 'follow 黃泥涌道 Wong Nai Chung Road; the inner members are the barrier=wall/gate lines of the Members '
    + 'Entrance, not a hole in the course.',
});

export const HAPPY_VALLEY_SITE = makeAuthoredSite(
  'happyValleyRacecourse', '跑馬地馬場', 'Happy Valley Racecourse', HAPPY_VALLEY_OSM_SOURCE,
  {
    height: 34, levels: null, roadIds: [], role: 'apron',
    evidence: 'The surveyed fence round the course: the track, infield, stands and parade areas all sit inside it.',
  },
);

// The published circuit, from the racecourse record.
export const HAPPY_VALLEY_TRACK_PUBLISHED = Object.freeze({
  lapMetres: 1417, widthMetres: 30.5, straightMetres: 310,
  surface: 'grass', races: Object.freeze([1000, 1200, 1650, 1800, 2200]),
});

// The fit of that circuit inside the surveyed fence. Verified by sampling the outer running rail every degree
// against the fence ring: 0.90 scale, -14 degrees, centre offset -8 / -19 m, minimum apron 8.2 m, mean apron 39 m.
export const HAPPY_VALLEY_TRACK_FIT = Object.freeze({
  scale: 0.9, rotation: -14,
  centreX: -8, centreZ: -19,
  straight: 310 * 0.9,
  outerRadius: (126.815 + 15.25) * 0.9,
  width: 30.5,
  apronToFenceMetres: 8.2,
});

// The racing surface: a discorectangle laid out from the fit above.
export const HAPPY_VALLEY_TRACK = Object.freeze({
  ...HAPPY_VALLEY_TRACK_FIT,
  innerRadius: (126.815 + 15.25) * 0.9 - 30.5,
  centreRadius: (126.815 + 15.25) * 0.9 - 15.25,
  lapMetres: 2 * 310 * 0.9 + 2 * Math.PI * ((126.815 + 15.25) * 0.9 - 15.25),
  railHeight: 1.15,
});

export const HAPPY_VALLEY_CAPACITY = 20000;
export const HAPPY_VALLEY_OPENED = '1846-12-17';
export const HAPPY_VALLEY_NIGHT_RACING_SINCE = 1973;

// The 1969 stand: the present grandstand, white, seven decks deep, on the home straight side.
export const HAPPY_VALLEY_MAIN_STAND = Object.freeze({
  t: 0.02, length: 191, depth: 34, behind: 12, tiers: 12, tierRise: 0.92, tierTread: 2.6,
  podiumHeight: 6.5, canopyHeight: 26.5, centreX: 269, centreZ: -70, rotation: 83.3,
});

export const HAPPY_VALLEY_CLUBHOUSE = Object.freeze({ length: 74, depth: 26, height: 27, floors: 7 });

// OSM node 12552529862, "The Hong Kong Racing Museum", surveyed at lon 114.1799407 / lat 22.2741908.
export const HAPPY_VALLEY_MUSEUM_NODE = Object.freeze({ id: 12552529862, lon: 114.1799407, lat: 22.2741908 });

export const HAPPY_VALLEY_COLOURS = Object.freeze({
  grass: [0.30, 0.53, 0.20],
  grassStripe: [0.24, 0.45, 0.17],
  sand: [0.52, 0.42, 0.30],
  infield: [0.29, 0.45, 0.17],
  rail: [0.94, 0.95, 0.94],
  apron: [0.32, 0.45, 0.22],
  standWhite: [0.93, 0.93, 0.91],
  standShade: [0.78, 0.79, 0.78],
  seat: [0.16, 0.34, 0.62],
  seatAlt: [0.80, 0.82, 0.84],
  clubGreen: [0.07, 0.36, 0.24],
  screen: [0.10, 0.55, 0.62],
  roof: [0.86, 0.87, 0.86],
  glass: [0.20, 0.26, 0.28],
});

export const HAPPY_VALLEY_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://zh.wikipedia.org/zh-hk/跑馬地馬場',
    evidence: 'Opened 1846 (first recorded meeting 17 December 1846) on land drained from the Wong Nai Chung '
      + 'marsh; capacity about 20,000; the 1995 rebuild merged the outer grass track and inner sand track into '
      + 'one 30 m grass track and rebuilt the stands, the Hong Kong Racing Museum and the club headquarters.',
  },
  {
    url: 'https://www.wpstud.com/translation/racecourse/Happy_Valley.htm',
    evidence: 'Grass track: 1,417 m lap, 30.5 m wide, 310 m home straight; permanent three-tier stand 1931, '
      + 'extended to seven tiers in 1957 and again in 1969 — the present grandstand.',
  },
  {
    url: 'https://zh.wikipedia.org/wiki/跑馬地馬場大火',
    evidence: 'The 26 February 1918 馬棚大火: the collapsed bamboo stand caught fire during the Derby meeting, '
      + 'killing about 600 people; the 戊午馬棚遇難中西士女公墓 and 馬棚先難友紀念碑 at 咖啡園墳場 record it.',
  },
  {
    url: 'https://www.discoverhongkong.com/eng/place-to-go/travel.guide-happy-valley-racecourse.html',
    evidence: 'Night meetings every Wednesday under floodlights (racing under lights since 1973); the course is '
      + 'the only city-centre racecourse of its kind, ringed by 跑馬地 and 銅鑼灣.',
  },
]);

// The main stand sits on the widest arc of the surveyed fence: rail at t = 0.02, 12 m of apron behind it, then a
// 191 x 34 m block rotated 83.3 degrees to the rail tangent. Verified to stay inside the fence ring.
export function happyValleyTrackPoint(t, offset = 0) {
  const fit = HAPPY_VALLEY_TRACK_FIT;
  const angle = t * Math.PI * 2;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const radius = ((126.815 + 15.25) * fit.scale) + offset;
  const px = Math.sign(cos || 1) * (fit.straight / 2) + cos * radius;
  const pz = sin * radius;
  const theta = (fit.rotation * Math.PI) / 180;
  const cs = Math.cos(theta), sn = Math.sin(theta);
  return { x: fit.centreX + px * cs - pz * sn, z: fit.centreZ + px * sn + pz * cs };
}

export function happyValleyTrackFrame(t, offset = 0) {
  const point = happyValleyTrackPoint(t, offset);
  const next = happyValleyTrackPoint(t + 0.0005, offset);
  const dx = next.x - point.x, dz = next.z - point.z;
  const length = Math.hypot(dx, dz) || 1;
  const tanX = dx / length, tanZ = dz / length;
  return { x: point.x, z: point.z, tanX, tanZ, normalX: tanZ, normalZ: -tanX, ry: Math.atan2(tanZ, tanX) };
}

export function happyValleyTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([HAPPY_VALLEY_SITE], x, z, rawHeight, padHeight);
}
