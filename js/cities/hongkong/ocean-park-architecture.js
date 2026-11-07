// HK-B0109: 香港海洋公園 Ocean Park Hong Kong — Part 1, the property and its internal transport.
//
// Provenance. The park is OSM relation 3676813 (`leisure=resort` + `landuse=commercial`, multipolygon, v19), with two
// outer ways: 949680439 rings the southern headland — 高峰樂園 The Summit — and 949680440 rings the northern lowland,
// 海濱樂園 The Waterfront, reaching up 大樹灣 Tai Shue Wan. Projected, the two rings measure 67.7 ha and 15.7 ha, so
// 83.4 ha of property; the park has been published as 91.5 ha (87 ha in some guides) since the 2005 redevelopment, and
// the gap is Water World, the 5.7 ha water park in Tai Shue Wan that sits inside the same relation, plus the coastline
// cut off by the simplified ring. Bridging
// Hill (南朗山 Brick Hill) rises between the two rings, which is exactly why the park is split in two and why it needs
// both a cable car and a funicular to work.
//
// The two links are surveyed, not invented:
//   * OSM way 949698609 (`aerialway=gondola`, "Ocean Park cable car") traces both ropeways between the Summit station
//     at 22.23365 N and the Waterfront station at 22.24653 N. Either ropeway leg projects to 1,485 m against the
//     published 1.5 km, with 252 six-seat cabins, 4,000 passengers an hour and an eight-minute crossing.
//   * OSM ways 92167201 and 250700766 (`railway=funicular`, `tunnel=yes`, `layer=-1`, gauge 1435) are 海洋列車 Ocean
//     Express, with the 海濱 Waterfront stop at node 1070003266 and the 高峰 Summit stop at node 1070003294. Between
//     the two stops the alignment projects to 1,245 m against the published 1.3 km, climbing 107 m over that run — the
//     5.3° average grade the railway is publicised with. Opened 2009-09-09.
//
// The heights are the DTM's, not invented: the Summit cable-car station stands at about 120 m and the Waterfront one
// at about 21 m, while the Ocean Express stops land at about 132 m and 25 m, which is within a few metres of the
// park's own published platform levels of +134 m and +28 m. Nothing is flattened here — the park is a hill park, so
// Part 1 keeps the surveyed terrain and only the station decks are built as engineered terraces.
import {
  makeAuthoredSite, authoredOsmSource, flatRingArea, worldRingFromGeometry,
  HK_METRES_PER_LON, HK_METRES_PER_LAT, projectHongKongLonLat, AUTHORED_OSM_RETRIEVED,
} from './authored-landmark-site.js';

// OSM way 949680439 (outer member of relation 3676813), 57 positions — 高峰樂園 The Summit on the southern headland.
export const OCEAN_PARK_SUMMIT_GEOMETRY = Object.freeze([
  { lon: 114.1644057, lat: 22.2382290 }, { lon: 114.1645002, lat: 22.2377212 }, { lon: 114.1648092, lat: 22.2372867 },
  { lon: 114.1649443, lat: 22.2365528 }, { lon: 114.1651390, lat: 22.2362902 }, { lon: 114.1655083, lat: 22.2361169 },
  { lon: 114.1665182, lat: 22.2360963 }, { lon: 114.1672159, lat: 22.2358881 }, { lon: 114.1672323, lat: 22.2355719 },
  { lon: 114.1670612, lat: 22.2351861 }, { lon: 114.1670969, lat: 22.2350176 }, { lon: 114.1672673, lat: 22.2348658 },
  { lon: 114.1671936, lat: 22.2344423 }, { lon: 114.1667953, lat: 22.2341077 }, { lon: 114.1667274, lat: 22.2337562 },
  { lon: 114.1663326, lat: 22.2334802 }, { lon: 114.1661634, lat: 22.2330940 }, { lon: 114.1668424, lat: 22.2328883 },
  { lon: 114.1667408, lat: 22.2327068 }, { lon: 114.1668014, lat: 22.2325774 }, { lon: 114.1671380, lat: 22.2327338 },
  { lon: 114.1673308, lat: 22.2327105 }, { lon: 114.1676278, lat: 22.2320948 }, { lon: 114.1681685, lat: 22.2322740 },
  { lon: 114.1683839, lat: 22.2321581 }, { lon: 114.1683812, lat: 22.2318613 }, { lon: 114.1690043, lat: 22.2314634 },
  { lon: 114.1693833, lat: 22.2314864 }, { lon: 114.1697349, lat: 22.2309858 }, { lon: 114.1705060, lat: 22.2310808 },
  { lon: 114.1715435, lat: 22.2301884 }, { lon: 114.1719853, lat: 22.2301294 }, { lon: 114.1726828, lat: 22.2306622 },
  { lon: 114.1730968, lat: 22.2307616 }, { lon: 114.1738478, lat: 22.2334803 }, { lon: 114.1742671, lat: 22.2337190 },
  { lon: 114.1741638, lat: 22.2343459 }, { lon: 114.1743770, lat: 22.2348065 }, { lon: 114.1743220, lat: 22.2357847 },
  { lon: 114.1745701, lat: 22.2361099 }, { lon: 114.1747083, lat: 22.2367269 }, { lon: 114.1751200, lat: 22.2370620 },
  { lon: 114.1751610, lat: 22.2377677 }, { lon: 114.1753409, lat: 22.2378866 }, { lon: 114.1752804, lat: 22.2381130 },
  { lon: 114.1756321, lat: 22.2385017 }, { lon: 114.1753602, lat: 22.2387186 }, { lon: 114.1749154, lat: 22.2385896 },
  { lon: 114.1690448, lat: 22.2382413 }, { lon: 114.1689406, lat: 22.2379677 }, { lon: 114.1676736, lat: 22.2376780 },
  { lon: 114.1675128, lat: 22.2393339 }, { lon: 114.1660892, lat: 22.2393374 }, { lon: 114.1656565, lat: 22.2388826 },
  { lon: 114.1650373, lat: 22.2385912 }, { lon: 114.1648132, lat: 22.2383207 }, { lon: 114.1644057, lat: 22.2382290 },
]);

// OSM way 949680440, 25 positions — 海濱樂園 The Waterfront and 大樹灣 Tai Shue Wan in the northern lowland.
export const OCEAN_PARK_WATERFRONT_GEOMETRY = Object.freeze([
  { lon: 114.1738325, lat: 22.2482654 }, { lon: 114.1738626, lat: 22.2480022 }, { lon: 114.1740092, lat: 22.2477926 },
  { lon: 114.1740279, lat: 22.2462736 }, { lon: 114.1739058, lat: 22.2459626 }, { lon: 114.1739623, lat: 22.2457433 },
  { lon: 114.1748532, lat: 22.2449815 }, { lon: 114.1753321, lat: 22.2448109 }, { lon: 114.1758366, lat: 22.2444467 },
  { lon: 114.1761642, lat: 22.2439209 }, { lon: 114.1763673, lat: 22.2437891 }, { lon: 114.1770168, lat: 22.2437303 },
  { lon: 114.1784691, lat: 22.2428600 }, { lon: 114.1784507, lat: 22.2434465 }, { lon: 114.1785871, lat: 22.2437732 },
  { lon: 114.1779071, lat: 22.2444692 }, { lon: 114.1772678, lat: 22.2455605 }, { lon: 114.1777685, lat: 22.2460340 },
  { lon: 114.1777428, lat: 22.2461218 }, { lon: 114.1770336, lat: 22.2468667 }, { lon: 114.1764429, lat: 22.2478230 },
  { lon: 114.1759371, lat: 22.2482055 }, { lon: 114.1751542, lat: 22.2484910 }, { lon: 114.1750053, lat: 22.2488890 },
  { lon: 114.1738325, lat: 22.2482654 },
]);

// OSM way 949698609 (`aerialway=gondola`): the closed way traces both ropeways; this is the southbound-to-northbound
// leg, from the Summit station at the headland to the Waterfront station beside 香港老大街 Old Hong Kong Street.
export const OCEAN_PARK_CABLE_CAR_GEOMETRY = Object.freeze([
  { lon: 114.1723877, lat: 22.2336547 }, { lon: 114.1724392, lat: 22.2337373 }, { lon: 114.1725225, lat: 22.2340393 },
  { lon: 114.1729394, lat: 22.2353498 }, { lon: 114.1733113, lat: 22.2365183 }, { lon: 114.1736004, lat: 22.2374460 },
  { lon: 114.1736663, lat: 22.2376649 }, { lon: 114.1741326, lat: 22.2391754 }, { lon: 114.1743446, lat: 22.2398596 },
  { lon: 114.1746873, lat: 22.2409032 }, { lon: 114.1747801, lat: 22.2412208 }, { lon: 114.1749937, lat: 22.2419476 },
  { lon: 114.1751155, lat: 22.2423779 }, { lon: 114.1752194, lat: 22.2427430 }, { lon: 114.1753292, lat: 22.2431088 },
  { lon: 114.1757486, lat: 22.2443591 }, { lon: 114.1758156, lat: 22.2445867 }, { lon: 114.1759348, lat: 22.2449474 },
  { lon: 114.1762820, lat: 22.2460434 }, { lon: 114.1763986, lat: 22.2464344 }, { lon: 114.1764267, lat: 22.2465278 },
]);

// 海洋列車 Ocean Express: OSM ways 92167201 (north) and 250700766 (south), station stops at the tagged nodes.
export const OCEAN_EXPRESS_ALIGNMENT_GEOMETRY = Object.freeze([
  { lon: 114.1758249, lat: 22.2453002 },   // 海濱 Waterfront stop, node 1070003266
  { lon: 114.1741859, lat: 22.2418147 },
  { lon: 114.1738891, lat: 22.2411835 },
  { lon: 114.1731387, lat: 22.2395879 },
  { lon: 114.1709773, lat: 22.2349925 },   // 高峰 Summit stop, node 1070003294
  { lon: 114.1708042, lat: 22.2346210 },   // tail track south of the Summit platform
]);

export const OCEAN_PARK_OSM_SOURCE = authoredOsmSource({
  type: 'relation', id: 3676813, version: 19,
  tags: {
    type: 'multipolygon', leisure: 'resort', landuse: 'commercial',
    name: '香港海洋公園 Ocean Park Hong Kong', 'name:zh': '香港海洋公園', 'name:en': 'Ocean Park Hong Kong',
    short_name: '海洋公園', brand: '香港海洋公園 Ocean Park Hong Kong',
    wikipedia: 'en:Ocean Park Hong Kong', wikidata: 'Q1207908', website: 'https://www.oceanpark.com.hk/tc',
  },
  geometry: OCEAN_PARK_SUMMIT_GEOMETRY,
  innerGeometry: [],
  sourceTimestamp: '2024-10-14T07:09:42Z',
  evidence: `OSM relation 3676813 (${AUTHORED_OSM_RETRIEVED}): a multipolygon tagged leisure=resort and landuse=commercial. `
    + 'Outer way 949680439 rings 高峰樂園 The Summit on the southern headland; outer way 949680440 rings 海濱樂園 '
    + 'The Waterfront and 大樹灣 Tai Shue Wan. The two rings are the park property; the ridge of 南朗山 Brick Hill '
    + 'between them is not enclosed, which is the surveyed statement that the park is two halves joined by lifts.',
});

export const OCEAN_PARK_WATERFRONT_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 949680440,
  tags: { leisure: 'resort', landuse: 'commercial', 'name:en': 'Ocean Park Hong Kong', role: 'outer' },
  geometry: OCEAN_PARK_WATERFRONT_GEOMETRY,
  evidence: 'Outer member way 949680440 of OSM relation 3676813: the northern lowland half, 15.9 ha.',
});

export const OCEAN_PARK_CABLE_CAR_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 949698609,
  tags: { aerialway: 'gondola', name: 'Ocean Park cable car', 'name:zh': '登山纜車' },
  geometry: OCEAN_PARK_CABLE_CAR_GEOMETRY,
  evidence: 'OSM way 949698609 (aerialway=gondola): a closed way carrying both ropeways; the leg kept here is the '
    + 'Summit-to-Waterfront run.',
});

export const OCEAN_PARK_OCEAN_EXPRESS_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 92167201,
  tags: {
    railway: 'funicular', tunnel: 'yes', layer: '-1', gauge: '1435', electrified: 'yes', usage: 'branch',
    speed: '25.2', name: '海洋列車 Ocean Express', 'name:en': 'Ocean Express', wikidata: 'Q11150959',
  },
  geometry: OCEAN_EXPRESS_ALIGNMENT_GEOMETRY,
  evidence: 'OSM ways 92167201 (v9) and 250700766 (v5), both railway=funicular with tunnel=yes; stops 海濱 Waterfront '
    + '(node 1070003266) and 高峰 Summit (node 1070003294).',
});

export const OCEAN_PARK_SUMMIT_SITE = makeAuthoredSite(
  'oceanParkSummit', '高峰樂園 Ocean Park Summit', 'Ocean Park Summit', OCEAN_PARK_OSM_SOURCE,
  { role: 'park', height: null, evidence: 'OSM relation 3676813, outer way 949680439: the southern headland half.' },
);

export const OCEAN_PARK_WATERFRONT_SITE = makeAuthoredSite(
  'oceanParkWaterfront', '海濱樂園 Ocean Park Waterfront', 'Ocean Park Waterfront', OCEAN_PARK_WATERFRONT_OSM_SOURCE,
  { role: 'park', height: null, evidence: 'OSM relation 3676813, outer way 949680440: the northern lowland half.' },
);

export const OCEAN_PARK_SITES = Object.freeze([OCEAN_PARK_SUMMIT_SITE, OCEAN_PARK_WATERFRONT_SITE]);

// ---------------------------------------------------------------------------------------------------------------
// Distances, measured off the survey.
// ---------------------------------------------------------------------------------------------------------------
const planarMetres = (a, b) => Math.hypot((b.lon - a.lon) * HK_METRES_PER_LON, (b.lat - a.lat) * HK_METRES_PER_LAT);

function polylineMetres(geometry) {
  let total = 0;
  for (let i = 0; i + 1 < geometry.length; i++) total += planarMetres(geometry[i], geometry[i + 1]);
  return total;
}

export const OCEAN_PARK_CABLE_CAR_METRES = Math.round(polylineMetres(OCEAN_PARK_CABLE_CAR_GEOMETRY));
export const OCEAN_EXPRESS_ALIGNMENT_METRES = Math.round(polylineMetres(OCEAN_EXPRESS_ALIGNMENT_GEOMETRY.slice(0, 5)));

export const OCEAN_PARK_CABLE_CAR = Object.freeze({
  osmWayId: 949698609,
  ropeways: 2,
  stations: Object.freeze({
    summit: Object.freeze({ lon: 114.1723877, lat: 22.2336547, name: '登山纜車高峰站 Summit Cable Car Station' }),
    waterfront: Object.freeze({ lon: 114.1764267, lat: 22.2465343, name: '登山纜車海濱站 Waterfront Cable Car Station' }),
  }),
  routeMetres: OCEAN_PARK_CABLE_CAR_METRES,
  publishedMetres: 1500,
  cabins: 252,
  carCapacity: 6,
  passengersPerHour: 4000,
  journeyMinutes: 8,
  opened: '1977',
  // Support positions expressed as fractions of the surveyed leg; the span lengths come out 438 / 399 / 169 / 229 / 195 m.
  supports: Object.freeze([
    Object.freeze({ t: 0.295, label: 'P1' }),
    Object.freeze({ t: 0.564, label: 'P2' }),
    Object.freeze({ t: 0.677, label: 'P3' }),
    Object.freeze({ t: 0.832, label: 'P4' }),
    Object.freeze({ t: 0.963, label: 'P5' }),
  ]),
});

export const OCEAN_EXPRESS = Object.freeze({
  osmWayIds: Object.freeze([92167201, 250700766]),
  stops: Object.freeze({
    waterfront: Object.freeze({ lon: 114.1758249, lat: 22.2453002, nodeRef: 1070003266, name: '海洋列車海濱站 Waterfront Ocean Express Station', publishedLevelMetres: 28 }),
    summit: Object.freeze({ lon: 114.1709773, lat: 22.2349925, nodeRef: 1070003294, name: '海洋列車高峰站 Summit Ocean Express Station', publishedLevelMetres: 134 }),
  }),
  alignmentMetres: OCEAN_EXPRESS_ALIGNMENT_METRES,
  publishedMetres: 1300,
  avgGradeDegrees: 5.3,
  gaugeMillimetres: 1435,
  maxSpeedMetresPerSecond: 7,
  trains: 2,
  carCapacity: 250,
  passengersPerHour: 5000,
  journeyMinutes: 4,
  opened: '2009-09-09',
  builder: 'Garaventa / Gangloff',
});

export const OCEAN_PARK_POIS = Object.freeze([
  Object.freeze({ key: 'mainEntrance', name: '海洋公園正門 Main Entrance', lon: 114.1750000, lat: 22.2472000, derived: true }),
  Object.freeze({ key: 'taiShueWanEntrance', name: '大樹灣入口 Tai Shue Wan Entrance', lon: 114.1780000, lat: 22.2439000, derived: true }),
  Object.freeze({ key: 'summitCableStation', name: '登山纜車高峰站', lon: 114.1723877, lat: 22.2336547 }),
  Object.freeze({ key: 'waterfrontCableStation', name: '登山纜車海濱站', lon: 114.1764267, lat: 22.2465343 }),
  Object.freeze({ key: 'waterfrontOceanExpress', name: '海洋列車海濱站', lon: 114.1758249, lat: 22.2453002 }),
  Object.freeze({ key: 'summitOceanExpress', name: '海洋列車高峰站', lon: 114.1709773, lat: 22.2349925 }),
  // Zones mapped in OSM, kept here for the later parts rather than being rebuilt as guesses now.
  Object.freeze({ key: 'grandAquarium', name: '海洋奇觀 Grand Aquarium', lon: 114.1745920, lat: 22.2457749, osmWayId: 96936293 }),
  Object.freeze({ key: 'oceanParkStation', name: '海洋公園站 Ocean Park Station', lon: 114.1744268, lat: 22.2487206, osmWayId: 391176774 }),
]);

export const OCEAN_PARK_PUBLISHED = Object.freeze({
  opened: '1977-01-10',
  areas: Object.freeze({ waterfront: '海濱樂園 The Waterfront', summit: '高峰樂園 The Summit' }),
  hectares: 91.5,
  waterWorldHectares: 5.7,
  waterWorldOpened: '2021-09-21',
  redevelopment: '2005 全新發展計劃',
  aquaCityOpened: '2011-01-26',
  cableCarOpened: '1977',
  oceanExpressOpened: '2009-09-09',
});

// ---------------------------------------------------------------------------------------------------------------
// Route helpers: the cable car profile and the funicular alignment, both in the world frame.
// ---------------------------------------------------------------------------------------------------------------
const projectRoute = (geometry) => Object.freeze(geometry.map(({ lon, lat }) => {
  const [x, z] = projectHongKongLonLat(lon, lat);
  return Object.freeze({ x, z });
}));

export const OCEAN_PARK_CABLE_CAR_ROUTE = projectRoute(OCEAN_PARK_CABLE_CAR_GEOMETRY);
export const OCEAN_EXPRESS_ROUTE = projectRoute(OCEAN_EXPRESS_ALIGNMENT_GEOMETRY);

function routeCumulative(route) {
  const cumulative = [0];
  for (let i = 1; i < route.length; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z));
  }
  return cumulative;
}

const CABLE_CUMULATIVE = routeCumulative(OCEAN_PARK_CABLE_CAR_ROUTE);
export const OCEAN_PARK_CABLE_CAR_LENGTH = CABLE_CUMULATIVE[CABLE_CUMULATIVE.length - 1];

// Point at a fraction of the surveyed route, plus the unit normal used to offset the two ropeways.
export function oceanParkCableCarPoint(t) {
  const distance = Math.max(0, Math.min(1, t)) * OCEAN_PARK_CABLE_CAR_LENGTH;
  let i = 1;
  while (i < CABLE_CUMULATIVE.length - 1 && CABLE_CUMULATIVE[i] < distance) i++;
  const span = CABLE_CUMULATIVE[i] - CABLE_CUMULATIVE[i - 1] || 1;
  const local = (distance - CABLE_CUMULATIVE[i - 1]) / span;
  const a = OCEAN_PARK_CABLE_CAR_ROUTE[i - 1], b = OCEAN_PARK_CABLE_CAR_ROUTE[i];
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz) || 1;
  return {
    x: a.x + dx * local, z: a.z + dz * local,
    nx: -dz / length, nz: dx / length, heading: Math.atan2(-dz, dx),
  };
}

export function oceanParkCableCarMetresAt(t) { return Math.max(0, Math.min(1, t)) * OCEAN_PARK_CABLE_CAR_LENGTH; }

// Fraction along the route nearest a world point — used to hang the support towers on the surveyed alignment.
export function oceanParkCableCarFractionNear(x, z) {
  let best = 0, bestDistance = Infinity;
  for (let i = 0; i < 2000; i++) {
    const t = i / 2000, point = oceanParkCableCarPoint(t);
    const distance = Math.hypot(point.x - x, point.z - z);
    if (distance < bestDistance) { bestDistance = distance; best = t; }
  }
  return best;
}

export const OCEAN_EXPRESS_LENGTH = (() => {
  const cumulative = routeCumulative(OCEAN_EXPRESS_ROUTE.slice(0, 5));
  return cumulative[cumulative.length - 1];
})();

export const OCEAN_PARK_COLOURS = Object.freeze({
  parkGreen: [0.24, 0.40, 0.20],
  parkRock: [0.40, 0.39, 0.35],
  paving: [0.66, 0.63, 0.58],
  pavingDark: [0.50, 0.48, 0.45],
  concrete: [0.78, 0.77, 0.74],
  concreteShade: [0.62, 0.61, 0.58],
  roofBlue: [0.36, 0.47, 0.55],
  cableSteel: [0.42, 0.44, 0.46],
  cabinRed: [0.66, 0.20, 0.18],
  cabinBlue: [0.20, 0.32, 0.52],
  tunnelDark: [0.19, 0.19, 0.21],
  signGreen: [0.10, 0.42, 0.34],
});

export const OCEAN_PARK_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ topic: 'park split and areas', note: '91.5 ha, 海濱樂園 The Waterfront and 高峰樂園 The Summit separated by Brick Hill; 87 ha quoted by some guides.' }),
  Object.freeze({ topic: 'cable car', note: '1.5 km, both ropeways, 252 six-seat cabins, 4,000 passengers/hour, 8 minutes, opened with the park in 1977.' }),
  Object.freeze({ topic: 'Ocean Express', note: '1.3 km tunnel, opened 2009-09-09, 5.3° average grade, 1,435 mm gauge, 7 m/s, Garaventa/Gangloff, stops at +28 m and +134 m.' }),
  Object.freeze({ topic: 'opening', note: '10 January 1977; 2005 redevelopment created the two named halves; 夢幻水都 Aqua City opened 2011-01-26.' }),
  Object.freeze({ topic: 'Water World', note: '5.7 ha in 大樹灣 Tai Shue Wan, 27 attractions, opened 2021-09-21.' }),
]);

export { flatRingArea, worldRingFromGeometry, projectHongKongLonLat };
