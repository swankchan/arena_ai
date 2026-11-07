// HK-B0108: 沙田馬場 Sha Tin Racecourse — the Jockey Club's second course, opened 1978-10-07.
//
// Provenance. The venue footprint is OSM relation 3726256 (`leisure=stadium` + `sport=horse_racing`,
// "沙田馬場 Sha Tin Racecourse", multipolygon; outer way 1068023550, 40 ring positions). That fence encloses the
// whole 71.7 hectare property — course, both grandstands, the parade ring, the stabling and 馬場站.
// The infield is OSM way 163970357, mapped as 彭福公園 Penfold Park (54 ring positions, 96,541 m²): the park named
// after 彭福將軍 Sir Douglas Penfold, the club's first general manager.
//
// The course is derived from the surveyed infield instead of being invented. On the park frame that outline is a
// stadium 588 m by 182 m — 406 m straights and 91 m end radii, a 1,384 m inner rail against the 1,367 m measured
// round the digitised hedge. Laying the tracks outside that rail by 2πw makes the published dimensions fall out of
// the survey:
//   1,384 m  inner running rail (the surveyed infield edge)
//   +27.6 m  sand apron and service strip
//   +24 m   全天候跑道 All Weather Track; modelled centre line 1,633 m against the published 1,650 m
//   +30.5 m 草地跑道 turf course; modelled outer rail 1,900 m against the published 1,900 m lap
// Racing is clockwise in the English style, as at Sha Tin.
//
// Identity. The grandstands are on the north-west side of the survey, where the fence leaves the widest apron: a
// long white multi-tier stand with a cantilevered roof and floodlights, the members' club block beside it, and the
// 香港賽馬博物館 Hong Kong Racing Museum at the position OSM records for it (node 12552529862). In the infield, the
// club's green branding boards and the big video screen face the stand, and the 馬匹亮相圈 parade ring sits behind
// the public concourse, as it does at Sha Tin.
import {
  makeAuthoredSite, authoredOsmSource, authoredTerrainHeightAt, AUTHORED_OSM_RETRIEVED,
  worldRingFromGeometry, localRingFromWorld, flatRingArea,
} from './authored-landmark-site.js';

// OSM way 1068023550 (outer member of relation 3726256, 40 positions).
export const SHA_TIN_RING_GEOMETRY = Object.freeze([
  { lon: 114.2127313, lat: 22.4032621 }, { lon: 114.2095126, lat: 22.4059861 }, { lon: 114.2091652, lat: 22.4057767 },
  { lon: 114.2091103, lat: 22.4057451 }, { lon: 114.2090785, lat: 22.4057268 }, { lon: 114.2089639, lat: 22.4056608 },
  { lon: 114.2088818, lat: 22.4056136 }, { lon: 114.2087832, lat: 22.4055569 }, { lon: 114.2086920, lat: 22.4055044 },
  { lon: 114.2085871, lat: 22.4054383 }, { lon: 114.2061934, lat: 22.4038052 }, { lon: 114.2057725, lat: 22.4034081 },
  { lon: 114.2042941, lat: 22.4018168 }, { lon: 114.2038961, lat: 22.4012741 }, { lon: 114.2035171, lat: 22.4007217 },
  { lon: 114.2032745, lat: 22.4003320 }, { lon: 114.2028137, lat: 22.3995345 }, { lon: 114.2026122, lat: 22.3991166 },
  { lon: 114.2025343, lat: 22.3991534 }, { lon: 114.2021521, lat: 22.3985536 }, { lon: 114.2021999, lat: 22.3985195 },
  { lon: 114.2019024, lat: 22.3981141 }, { lon: 114.2009316, lat: 22.3966267 }, { lon: 114.2009786, lat: 22.3965876 },
  { lon: 114.2007953, lat: 22.3963942 }, { lon: 114.1998173, lat: 22.3948739 }, { lon: 114.1997995, lat: 22.3948466 },
  { lon: 114.1997316, lat: 22.3947373 }, { lon: 114.2007516, lat: 22.3939273 }, { lon: 114.2023292, lat: 22.3956159 },
  { lon: 114.2023356, lat: 22.3956228 }, { lon: 114.2025899, lat: 22.3958950 }, { lon: 114.2034256, lat: 22.3953062 },
  { lon: 114.2034889, lat: 22.3940588 }, { lon: 114.2037523, lat: 22.3938341 }, { lon: 114.2059050, lat: 22.3960061 },
  { lon: 114.2056905, lat: 22.3958710 }, { lon: 114.2126635, lat: 22.4031617 }, { lon: 114.2127313, lat: 22.4032621 },
]);

// OSM way 163970357, the infield, mapped as 彭福公園 Penfold Park — 54 positions.
export const SHA_TIN_INFIELD_GEOMETRY = Object.freeze([
  { lon: 114.2047025, lat: 22.3981877 }, { lon: 114.2047039, lat: 22.3980460 }, { lon: 114.2047105, lat: 22.3979685 },
  { lon: 114.2047316, lat: 22.3978901 }, { lon: 114.2047855, lat: 22.3977814 }, { lon: 114.2048289, lat: 22.3977067 },
  { lon: 114.2049431, lat: 22.3975636 }, { lon: 114.2050300, lat: 22.3974911 }, { lon: 114.2051316, lat: 22.3974369 },
  { lon: 114.2052399, lat: 22.3973886 }, { lon: 114.2053627, lat: 22.3973550 }, { lon: 114.2054776, lat: 22.3973419 },
  { lon: 114.2055938, lat: 22.3973463 }, { lon: 114.2056745, lat: 22.3973637 }, { lon: 114.2057526, lat: 22.3973902 },
  { lon: 114.2058929, lat: 22.3974493 }, { lon: 114.2060126, lat: 22.3975323 }, { lon: 114.2060608, lat: 22.3975726 },
  { lon: 114.2063836, lat: 22.3978949 }, { lon: 114.2087111, lat: 22.4003760 }, { lon: 114.2087739, lat: 22.4004904 },
  { lon: 114.2088521, lat: 22.4006653 }, { lon: 114.2088782, lat: 22.4007451 }, { lon: 114.2088997, lat: 22.4008425 },
  { lon: 114.2089084, lat: 22.4009520 }, { lon: 114.2089045, lat: 22.4010908 }, { lon: 114.2088922, lat: 22.4011651 },
  { lon: 114.2088769, lat: 22.4012414 }, { lon: 114.2088592, lat: 22.4012879 }, { lon: 114.2088417, lat: 22.4013336 },
  { lon: 114.2088036, lat: 22.4014201 }, { lon: 114.2087536, lat: 22.4014937 }, { lon: 114.2087207, lat: 22.4015390 },
  { lon: 114.2086736, lat: 22.4015798 }, { lon: 114.2085974, lat: 22.4016299 }, { lon: 114.2085248, lat: 22.4016624 },
  { lon: 114.2084605, lat: 22.4016874 }, { lon: 114.2083970, lat: 22.4017017 }, { lon: 114.2083491, lat: 22.4017066 },
  { lon: 114.2082478, lat: 22.4017172 }, { lon: 114.2080721, lat: 22.4017186 }, { lon: 114.2079373, lat: 22.4016938 },
  { lon: 114.2077676, lat: 22.4016548 }, { lon: 114.2077480, lat: 22.4016609 }, { lon: 114.2076853, lat: 22.4016383 },
  { lon: 114.2076256, lat: 22.4016135 }, { lon: 114.2075701, lat: 22.4015798 }, { lon: 114.2074557, lat: 22.4015033 },
  { lon: 114.2047791, lat: 22.3986230 }, { lon: 114.2047815, lat: 22.3985614 }, { lon: 114.2047815, lat: 22.3984968 },
  { lon: 114.2047535, lat: 22.3984142 }, { lon: 114.2047157, lat: 22.3982958 }, { lon: 114.2047025, lat: 22.3981877 },
]);

export const SHA_TIN_OSM_SOURCE = authoredOsmSource({
  type: 'relation', id: 3726256, version: 13,
  tags: {
    leisure: 'stadium', sport: 'horse_racing', type: 'multipolygon',
    name: '沙田馬場 Sha Tin Racecourse', 'name:en': 'Sha Tin Racecourse', 'name:zh': '沙田馬場',
    'addr:street': '大埔公路－沙田段 Tai Po Road – Sha Tin', 'addr:town': '沙田 Sha Tin',
    wikipedia: 'en:Sha Tin Racecourse', wikidata: 'Q3244588',
  },
  geometry: SHA_TIN_RING_GEOMETRY,
  innerGeometry: [SHA_TIN_INFIELD_GEOMETRY],
  sourceTimestamp: '2026-10-01T12:55:32Z',
  evidence: `OSM relation 3726256 (${AUTHORED_OSM_RETRIEVED}): a multipolygon tagged leisure=stadium and `
    + 'sport=horse_racing covering 71.7 hectares. Outer way 1068023550 rings the whole property; the inner member '
    + 'is way 163970357, the infield, mapped as 彭福公園 Penfold Park.',
});

export const SHA_TIN_SITE = makeAuthoredSite(
  'shaTinRacecourse', '沙田馬場', 'Sha Tin Racecourse', SHA_TIN_OSM_SOURCE,
  {
    height: 42, levels: null, roadIds: [], role: 'apron',
    evidence: 'The surveyed property fence: the course, the grandstands, the parade ring, the stabling and 馬場站 '
      + 'all sit inside it.',
  },
);

const worldInfield = worldRingFromGeometry(SHA_TIN_INFIELD_GEOMETRY);
export const SHA_TIN_INFIELD_LOCAL = localRingFromWorld(SHA_TIN_SITE, worldInfield);
export const SHA_TIN_INFIELD_AREA = Math.abs(flatRingArea(SHA_TIN_INFIELD_LOCAL));

// The published course record.
export const SHA_TIN_COURSE_PUBLISHED = Object.freeze({
  opened: '1978-10-07',
  turf: Object.freeze({ widthMetres: 30.5, lapMetres: 1900, surface: 'grass' }),
  allWeather: Object.freeze({ widthMetres: 24, lapMetres: 1650, surface: 'sand' }),
  direction: 'clockwise',
  capacity: 85000,
  stands: Object.freeze({ first: 1978, second: 1985, seatedAfter1985: 70000 }),
  paradeRingRetractableRoof: 'the first in the world',
  screen: "the world's widest outdoor screen",
});

// The course, measured outwards from the surveyed infield rail. See the module header for the arithmetic.
export const SHA_TIN_TRACK = Object.freeze({
  centreX: 103.9, centreZ: 83.8, rotation: 0,
  straight: 406,
  innerRadius: 91,
  apronMetres: 27.6,
  allWeatherMetres: 24,
  turfMetres: 30.5,
  allWeatherInnerRadius: 91 + 27.6,
  allWeatherOuterRadius: 91 + 27.6 + 24,
  turfInnerRadius: 91 + 27.6 + 24,
  turfOuterRadius: 91 + 27.6 + 24 + 30.5,
  railHeight: 1.15,
  direction: 'clockwise',
});

export const SHA_TIN_TRACK_BAND = Object.freeze({
  apronMetres: SHA_TIN_TRACK.apronMetres,
  allWeatherMetres: SHA_TIN_TRACK.allWeatherMetres,
  turfMetres: SHA_TIN_TRACK.turfMetres,
  totalMetres: SHA_TIN_TRACK.turfOuterRadius - SHA_TIN_TRACK.innerRadius,
});

const stadiumLap = (radius) => 2 * SHA_TIN_TRACK.straight + 2 * Math.PI * radius;

export const SHA_TIN_LAPS = Object.freeze({
  innerRailMetres: Math.round(stadiumLap(SHA_TIN_TRACK.innerRadius)),
  allWeatherInnerMetres: Math.round(stadiumLap(SHA_TIN_TRACK.allWeatherInnerRadius)),
  allWeatherCentreMetres: Math.round(stadiumLap((SHA_TIN_TRACK.allWeatherInnerRadius
    + SHA_TIN_TRACK.allWeatherOuterRadius) / 2)),
  allWeatherOuterMetres: Math.round(stadiumLap(SHA_TIN_TRACK.allWeatherOuterRadius)),
  turfInnerMetres: Math.round(stadiumLap(SHA_TIN_TRACK.turfInnerRadius)),
  turfCentreMetres: Math.round(stadiumLap((SHA_TIN_TRACK.turfInnerRadius + SHA_TIN_TRACK.turfOuterRadius) / 2)),
  turfOuterMetres: Math.round(stadiumLap(SHA_TIN_TRACK.turfOuterRadius)),
  publishedTurfMetres: SHA_TIN_COURSE_PUBLISHED.turf.lapMetres,
  publishedAllWeatherMetres: SHA_TIN_COURSE_PUBLISHED.allWeather.lapMetres,
});

export const SHA_TIN_COLOURS = Object.freeze({
  turf: [0.33, 0.58, 0.21],
  turfStripe: [0.26, 0.48, 0.17],
  allWeather: [0.56, 0.50, 0.40],
  sand: [0.62, 0.55, 0.42],
  infieldLawn: [0.29, 0.47, 0.19],
  parkLawn: [0.29, 0.47, 0.19],   // the park reads as the infield lawn; no decorative patchwork
  rail: [0.94, 0.95, 0.94],
  apron: [0.33, 0.46, 0.22],
  standWhite: [0.93, 0.93, 0.90],
  standShade: [0.79, 0.80, 0.79],
  seatBlue: [0.15, 0.33, 0.60],
  seatGrey: [0.78, 0.80, 0.81],
  clubGreen: [0.07, 0.36, 0.24],
  clubRed: [0.68, 0.16, 0.16],
  glass: [0.18, 0.24, 0.27],
  screen: [0.10, 0.55, 0.62],
  roof: [0.86, 0.87, 0.86],
});

// The stands, placed on the widest arc of the surveyed fence. Each has a footprint verified to sit inside the
// fence and clear of the outer running rail.
export const SHA_TIN_GRANDSTANDS = Object.freeze([
  Object.freeze({
    key: 'grandstandOne', name: '沙田馬場主看台', englishName: 'Sha Tin Racecourse Grandstand I',
    x: 220, z: -155, rotation: -10, lengthMetres: 191, depthMetres: 34, height: 42,
    tiers: 12, tierRise: 0.92, tierTread: 2.6, podiumHeight: 6.5, canopyHeight: 26.5, roofOverhang: 6,
    osmWay: 775258668,
    note: 'The 1978 grandstand, placed on its OSM building centre: a twelve-tier terrace bowl, seven public decks '
      + 'and a long cantilevered white roof with the floodlights along its edge.',
  }),
  Object.freeze({
    key: 'grandstandTwo', name: '沙田馬場會員看台', englishName: "Sha Tin Racecourse Members' Stand",
    x: -37, z: -175, rotation: -6, lengthMetres: 120, depthMetres: 28, height: 34,
    tiers: 9, tierRise: 0.9, tierTread: 2.5, podiumHeight: 7, canopyHeight: 22, roofOverhang: 5,
    osmWay: 775258661,
    note: 'The 1985 members\' stand, on its own surveyed centre, with the clubhouse floors above the members\' lawn.',
  }),
]);

export const SHA_TIN_CLUBHOUSE = Object.freeze({
  x: 60, z: -148, rotation: -8, length: 58, depth: 26, floors: 7, floorHeight: 4.3, height: 32,
  note: '香港賽馬會沙田會所: the club building between the two stands, dining floors facing the course.',
});

// 馬匹亮相圈 the parade ring, in the concourse between the stands and the outer running rail.
export const SHA_TIN_PARADE_RING = Object.freeze({
  x: 138, z: -120, radius: 24, railHeight: 1.2, saddlingLength: 44, saddlingDepth: 12,
  note: 'The saddling enclosure and parade ring; Sha Tin\'s ring was the first in the world with a retractable roof.',
});

// The big screen, mounted in the infield and facing the stands across the home straight.
export const SHA_TIN_BIG_SCREEN = Object.freeze({
  x: 170, z: 6, width: 42, height: 15, mastHeight: 26, facing: -Math.PI / 2,
  note: 'The widest outdoor screen in the world, facing the stands from the infield.',
});

// Stabling: 23 stables for 1,260 horses by 2003. Rows are laid out in the freight-yard corner of the site.
export const SHA_TIN_STABLES = Object.freeze({
  originX: 470, originZ: -200, rows: 4, perRow: 3, blockLength: 46, blockDepth: 20, spacingX: 70, spacingZ: 62,
  height: 9,
  note: 'Stable blocks with their walking rings and horse walks, in the corner of the property away from the course.',
});

export const SHA_TIN_RACECOURSE_STATION_PLATFORM = Object.freeze({
  x: 330, z: -258, length: 180, width: 14, rotation: 0, canopyHeight: 9,
});

export const SHA_TIN_RACECOURSE_STATION = Object.freeze({
  name: '馬場站', englishName: 'Racecourse Station', line: 'East Rail Line', openedWithCourse: 1978,
  note: 'Platforms open only on race days; the station sits inside the OSM fence on the north-east boundary.',
});

export const SHA_TIN_INFIELD_PARK = Object.freeze({
  name: '彭福公園', englishName: 'Penfold Park', namedAfter: '彭福將軍 Sir Douglas Penfold',
  areaSquareMetres: Math.round(SHA_TIN_INFIELD_AREA), olympicCrossCountry2008: true,
});

export const SHA_TIN_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://zh.wikipedia.org/wiki/沙田馬場',
    evidence: 'Opened 7 October 1978 by Governor MacLehose; 35,000 capacity at opening; the second stand was '
      + 'completed in November 1985, taking the two stands to 70,000; by 2003 there were 23 stables housing '
      + '1,260 horses.',
  },
  {
    url: 'https://www.hkjc.com/racing/',
    evidence: 'Grass course 30.5 m wide with a lap of about 1,900 m, plus a 1,650 m all-weather track; racing is '
      + 'clockwise in the English style; Penfold Park occupies the infield.',
  },
  {
    url: 'https://en.wikipedia.org/wiki/Sha_Tin_Racecourse',
    evidence: 'Capacity 85,000; the world\'s first retractable-roof parade ring and the widest outdoor screen; the '
      + '2008 Olympic equestrian cross-country course ran through the infield.',
  },
]);

// --- ring maths and course geometry ---------------------------------------------------------------------------

export function ringCentroid(ring) {
  let x = 0, z = 0, count = 0;
  for (let i = 0; i + 1 < ring.length; i += 2) { x += ring[i]; z += ring[i + 1]; count++; }
  return { x: x / count, z: z / count };
}

export function ringPerimeter(ring) {
  let total = 0;
  const n = ring.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = ring[i * 2], az = ring[i * 2 + 1];
    const bx = ring[((i + 1) % n) * 2], bz = ring[((i + 1) % n) * 2 + 1];
    total += Math.hypot(bx - ax, bz - az);
  }
  return total;
}

// A point on the course: t runs round the discorectangle from the south-west end of the home straight; offset is
// measured outwards from the inner running rail.
export function shaTinTrackPoint(t, offset = 0) {
  const track = SHA_TIN_TRACK;
  const angle = t * Math.PI * 2;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const radius = track.innerRadius + offset;
  const half = track.straight / 2;
  const px = Math.sign(cos || 1) * half + cos * radius;
  const pz = sin * radius;
  const theta = (track.rotation * Math.PI) / 180;
  const cs = Math.cos(theta), sn = Math.sin(theta);
  return { x: track.centreX + px * cs - pz * sn, z: track.centreZ + px * sn + pz * cs };
}

export function shaTinTrackFrame(t, offset = 0) {
  const point = shaTinTrackPoint(t, offset);
  const next = shaTinTrackPoint(t + 0.0005, offset);
  const dx = next.x - point.x, dz = next.z - point.z;
  const length = Math.hypot(dx, dz) || 1;
  const tanX = dx / length, tanZ = dz / length;
  return { x: point.x, z: point.z, tanX, tanZ, normalX: tanZ, normalZ: -tanX, ry: Math.atan2(tanZ, tanX) };
}

// Inside the inner running rail, i.e. on the infield.
export function shaTinOnInfield(x, z, margin = 0) {
  const track = SHA_TIN_TRACK;
  const px = x - track.centreX, pz = z - track.centreZ;
  const inner = Math.abs(px) - track.straight / 2;
  const distance = inner <= 0 ? Math.abs(pz) : Math.hypot(inner, pz);
  return distance <= track.innerRadius - margin;
}

export function shaTinTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([SHA_TIN_SITE], x, z, rawHeight, padHeight);
}
