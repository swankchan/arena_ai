// 力寶中心一期同二期（Lippo Centre Towers 1 & 2, 89 Queensway, 1988）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing } from './landmark-site.js';

// Historical and heritage provenance:
// Address: 89 Queensway, Admiralty, Hong Kong (香港金鐘金鐘道89號).
// Completed: 1987-1988, officially opened 1988.
// Original Name: Bond Centre (奔達中心), acquired by Lippo Group in 1988 and renamed Lippo Centre (力寶中心).
// Architects: Paul Rudolph (保羅·魯道夫 - 世界著名後現代/粗獷主義建築宗師) in association with Wong & Ouyang (王歐陽).
// Famous Nickname: "The Koala Tree" (樹熊大廈 / 無尾熊樹) due to its cantilevered extruded geometric octagonal bay-window pods resembling koalas clutching/climbing up tree trunks!
// Architectural Style: Late Modernist / Sculptural Brutalist / High-Tech Postmodernism.
// Key Architectural Highlights:
// - Twin octagonal glazed towers clad in dark reflective cyan-blue glass and dark bronze-anodized aluminium mullions.
// - Tower 1 (第一座 / 一期, 45 storeys, 172m, top crown 178.5m, Wikidata Q27847068, OSM way 107336260).
// - Tower 2 (第二座 / 二期, 48 storeys, 186m, top crown 192.5m, Wikidata Q27847063, OSM way 107336263).
// - Twin towers positioned diagonally on a shared 4-storey sculptural podium, with Tower 2 rotated by ~51.8° relative to Tower 1.
// - Signature Paul Rudolph cantilevered faceted bay-window "koala" pods projecting dramatically outward in alternating vertical tiers.
// - Multi-level sculptural podium on monumental pilotis columns with public shopping atrium, vehicle drop-off loop, and elevated pedestrian bridges connecting Admiralty MTR, Queensway Plaza, High Court, and Far East Finance Centre.

export const LIPPO_CENTRE_HERITAGE = Object.freeze({
  address: '香港金鐘金鐘道89號 (89 Queensway, Admiralty, Hong Kong)',
  district: '中西區金鐘 (Admiralty, Central and Western District)',
  architects: 'Paul Rudolph (保羅·魯道夫) & Wong & Ouyang (王歐陽)',
  completionYear: 1988,
  openingYear: 1988,
  originalName: 'Bond Centre (奔達中心)',
  currentName: 'Lippo Centre (力寶中心)',
  nickname: 'The Koala Tree (樹熊大廈 / 無尾熊樹)',
  style: 'Late Modernist / Sculptural Brutalist / High-Tech Postmodernism (晚期現代主義／雕塑粗獷主義)',
  wikidata: 'Q1544778',
  wikidataTower1: 'Q27847068',
  wikidataTower2: 'Q27847063',
  osmWayTower1: 107336260,
  osmWayTower2: 107336263
});

// Tower 1 (一座 / 一期): 45 storeys, 172.0m, ry ~ 0.0628 rad (~3.6°)
export const LIPPO_TOWER_ONE_RING = Object.freeze([
  429.75, 277.22,
  411.15, 278.39,
  399.14, 293.45,
  401.20, 310.39,
  413.70, 319.94,
  432.22, 318.69,
  442.63, 305.18,
  441.50, 286.58,
  429.75, 277.22
]);

export const LIPPO_TOWER_ONE_DATA = Object.freeze({
  id: 'lippo-centre-tower-one',
  name: '力寶中心第一座',
  englishName: 'Lippo Centre Tower 1',
  center: Object.freeze({ x: 420.88, z: 298.58 }),
  ry: 0.0628,
  height: 172.0,
  crownTop: 178.5,
  levels: 45,
  width: 42.7,
  depth: 41.6,
  ring: LIPPO_TOWER_ONE_RING
});

// Tower 2 (二座 / 二期): 48 storeys, 186.0m, ry ~ 0.9041 rad (~51.8° rotated)
export const LIPPO_TOWER_TWO_RING = Object.freeze([
  390.79, 245.50,
  372.76, 246.72,
  360.96, 261.33,
  363.38, 279.16,
  375.23, 288.35,
  392.85, 287.58,
  404.70, 272.52,
  403.16, 255.35,
  390.79, 245.50
]);

export const LIPPO_TOWER_TWO_DATA = Object.freeze({
  id: 'lippo-centre-tower-two',
  name: '力寶中心第二座',
  englishName: 'Lippo Centre Tower 2',
  center: Object.freeze({ x: 382.83, z: 266.93 }),
  ry: 0.9041,
  height: 186.0,
  crownTop: 192.5,
  levels: 48,
  width: 43.4,
  depth: 41.3,
  ring: LIPPO_TOWER_TWO_RING
});

// Common Podium Data: 4 storeys connecting both towers
export const LIPPO_PODIUM_DATA = Object.freeze({
  baseY: 6.50,
  foundationY: 4.00,
  height: 18.0,
  topY: 24.50,
  center: Object.freeze({ x: 401.86, z: 282.75 }),
  minX: 362.0,
  maxX: 442.0,
  minZ: 246.0,
  maxZ: 319.0
});

// Combined Outer Boundary Ring enclosing both towers and podium
export const LIPPO_CENTRE_RING = Object.freeze([
  388.0, 244.0, // NW near Cotton Tree Drive / Drake St
  438.0, 268.0, // NE towards Tamar / Admiralty Centre
  443.0, 312.0, // SE towards Queensway / High Court
  408.0, 321.0, // S near Queensway
  362.0, 282.0, // SW near Cotton Tree Drive
  361.0, 258.0, // W along Cotton Tree Drive
  388.0, 244.0  // Closed ring
]);

// Convert world coordinates to WGS84 for OSM provenance
const geometry1 = Object.freeze(
  [
    [429.75, 277.22],
    [411.15, 278.39],
    [399.14, 293.45],
    [401.20, 310.39],
    [413.70, 319.94],
    [432.22, 318.69],
    [442.63, 305.18],
    [441.50, 286.58],
    [429.75, 277.22]
  ].map(([x, z]) => Object.freeze({
    lon: 114.1596 + x / HK_METRES_PER_LON,
    lat: 22.2819 - z / HK_METRES_PER_LAT
  }))
);

const geometry2 = Object.freeze(
  [
    [390.79, 245.50],
    [372.76, 246.72],
    [360.96, 261.33],
    [363.38, 279.16],
    [375.23, 288.35],
    [392.85, 287.58],
    [404.70, 272.52],
    [403.16, 255.35],
    [390.79, 245.50]
  ].map(([x, z]) => Object.freeze({
    lon: 114.1596 + x / HK_METRES_PER_LON,
    lat: 22.2819 - z / HK_METRES_PER_LAT
  }))
);

export const LIPPO_TOWER_ONE_OSM_SOURCE = authoredOsmSource({
  id: 107336260,
  version: 1,
  tags: {
    name: '力寶中心第一座 Lippo Centre Tower 1',
    'name:zh': '力寶中心第一座',
    'name:en': 'Lippo Centre Tower 1',
    'addr:housename': '力寶中心 Lippo Centre',
    'addr:housenumber': '89',
    'addr:street': '金鐘道 Queensway',
    'addr:unit': '1',
    building: 'commercial',
    'building:levels': '45',
    'building:material': 'glass',
    height: '172',
    wikidata: 'Q27847068'
  },
  geometry: geometry1
});

export const LIPPO_TOWER_TWO_OSM_SOURCE = authoredOsmSource({
  id: 107336263,
  version: 1,
  tags: {
    name: '力寶中心第二座 Lippo Centre Tower 2',
    'name:zh': '力寶中心第二座',
    'name:en': 'Lippo Centre Tower 2',
    'addr:housename': '力寶中心 Lippo Centre',
    'addr:housenumber': '89',
    'addr:street': '金鐘道 Queensway',
    'addr:unit': '2',
    building: 'commercial',
    'building:levels': '48',
    'building:material': 'glass',
    height: '186',
    wikidata: 'Q27847063'
  },
  geometry: geometry2
});

export const LIPPO_TOWER_ONE_SITE = makeAuthoredSite(
  'lippo-centre-tower-one',
  '力寶中心第一座',
  'Lippo Centre Tower 1',
  LIPPO_TOWER_ONE_OSM_SOURCE,
  {
    levels: 45,
    height: 172.0,
    role: 'office',
    evidence: 'OSM way 107336260, Paul Rudolph 1988, 172m, 45 storeys.'
  }
);

export const LIPPO_TOWER_TWO_SITE = makeAuthoredSite(
  'lippo-centre-tower-two',
  '力寶中心第二座',
  'Lippo Centre Tower 2',
  LIPPO_TOWER_TWO_OSM_SOURCE,
  {
    levels: 48,
    height: 186.0,
    role: 'office',
    evidence: 'OSM way 107336263, Paul Rudolph 1988, 186m, 48 storeys.'
  }
);

// Combined Complex Site
export const LIPPO_CENTRE_SITE = Object.freeze({
  key: 'lippo-centre',
  name: '力寶中心一期及二期',
  englishName: 'Lippo Centre Towers 1 & 2',
  levels: 48,
  height: 186.0,
  x: LIPPO_PODIUM_DATA.center.x,
  z: LIPPO_PODIUM_DATA.center.z,
  ring: LIPPO_CENTRE_RING,
  tower1: LIPPO_TOWER_ONE_SITE,
  tower2: LIPPO_TOWER_TWO_SITE,
  heritage: LIPPO_CENTRE_HERITAGE
});

export function isLippoCentrePoint(x, z) {
  return pointInFlatRing(LIPPO_CENTRE_RING, x, z) ||
         pointInFlatRing(LIPPO_TOWER_ONE_RING, x, z) ||
         pointInFlatRing(LIPPO_TOWER_TWO_RING, x, z);
}

export function lippoCentreGroundHeightAt(x, z, ground) {
  if (!isLippoCentrePoint(x, z)) return ground;
  return LIPPO_PODIUM_DATA.baseY;
}
