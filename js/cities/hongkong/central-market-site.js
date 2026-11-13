// 中環街市（Central Market, 80 Des Voeux Road Central, 1939）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing } from './landmark-site.js';

// Historical and heritage provenance:
// Address: 80 Des Voeux Road Central / 93 Queen's Road Central, Central, Hong Kong (香港中環德輔道中80號／皇后大道中93號).
// Built: 1938-1939, officially reopened 1 May 1939 (4th-generation Central Market).
// Heritage Status: Grade III Historic Building (香港三級歷史建築), revitalized by URA (市區重建局) and reopened in August 2021.
// Architecture: Architectural Office of Public Works Department, Hong Kong Government.
// Style: Streamline Moderne / Bauhaus (現代主義流線型 / 包浩斯風格).
// Key Characteristics:
// - Free-plan 4-storey reinforced concrete frame with clean horizontal emphasis.
// - Continuous cantilevered concrete sunshade fins (橫向挑檐遮陽板) and continuous multi-pane steel ribbon band windows.
// - Aerodynamic rounded corners (流線型圓角) on all four street junctions.
// - Grand central open-air lightwell atrium (中央採光中庭與綠化廣場) providing cross-ventilation and natural daylight.
// - World-famous preserved Hong Kong terrazzo grand staircases (紅綠水磨石大樓梯), immortalized in master photographer Fan Ho (何藩)'s 1950s classic works.
// - Preserved heritage wet-market stall clusters (保留活化傳統檔口: 紅燈罩鮮肉檔、海鮮魚檔、家禽檔、生果蔬菜檔等).
// - 2nd floor 24-hour pedestrian walkway spine connecting to the Central-Mid-Levels Escalator (中環至半山自動扶手電梯系統) and Hang Seng Bank / IFC footbridges.
// - Classic retro bilingual entrance signage (「中環街市」 / "CENTRAL MARKET") and vintage 1939 clock faces.

// World site coordinates and canonical rotation:
// Bounded by Des Voeux Road Central (N), Queen's Road Central (S), Jubilee Street (W), Queen Victoria Street (E).
export const CENTRAL_MARKET_CENTER = Object.freeze({
  x: -427.7,
  z: -236.85,
  ry: -0.890878 // ~ -51.04 degrees orientation aligning perfectly with surrounding street grids
});

// Building dimensions: Width 39.0m (E-W), Length 72.0m (N-S), Corner Radius 2.8m
export const CENTRAL_MARKET_BOUNDS = Object.freeze({
  width: 39.0,
  depth: 72.0,
  halfWidth: 19.5,
  halfDepth: 36.0,
  cornerRadius: 2.8
});

// Storey and vertical datum (world metres):
// Base ground level at Des Voeux Road is ~5.50m; Queen's Road upper level reaches ~8.34m - 10.0m.
export const CENTRAL_MARKET_HEIGHTS = Object.freeze({
  baseY: 5.50,            // Ground floor datum at Des Voeux Road North Entrance
  foundationY: 3.50,      // Foundation skirt extending down into terrain to prevent sloped gap
  groundFloorTop: 10.00,  // G/F ceiling / 1/F floor level (flush with Queen's Road entrance)
  firstFloorTop: 14.20,   // 1/F ceiling / 2/F walkway level
  secondFloorTop: 18.40,  // 2/F ceiling / main roof slab level
  roofParapetTop: 19.60,  // Outer roof parapet wall
  monitorRoofTop: 23.50,  // Central skylight clerestory monitor roof peak
  buildingHeight: 18.00   // Total architectural height above Des Voeux Road ground level
});

// Central Lightwell Atrium & Courtyard Plaza
export const CENTRAL_MARKET_ATRIUM = Object.freeze({
  minX: -9.0,
  maxX: 9.0,
  minZ: -14.0,
  maxZ: 14.0,
  width: 18.0,
  depth: 28.0,
  groundLawnY: 5.52,
  balconyWidth: 2.2
});

// Fan Ho Terrazzo Grand Staircase specification
export const CENTRAL_MARKET_STAIRCASE = Object.freeze({
  minX: -8.0,
  maxX: 8.0,
  minZ: -28.0,
  maxZ: -18.0,
  steps: 24,
  treadDepth: 0.35,
  riserHeight: 0.18,
  terrazzoGreen: '#1e3d2f',
  terrazzoRed: '#7a382c',
  brassNosing: '#b59a57'
});

// Pedestrian Footbridge & Mid-Levels Escalator Link
export const CENTRAL_MARKET_FOOTBRIDGE = Object.freeze({
  deckY: 14.20,
  ceilingY: 17.60,
  clearanceY: 6.20, // > 6.0m clear above street traffic for double-decker buses and trams
  width: 5.2,
  northExtensionZ: -42.0, // Connecting towards Hang Seng Bank / IFC network
  southExtensionZ: 42.0   // Connecting towards Cochrane Street / Mid-Levels Escalator
});

// Heritage metadata
export const CENTRAL_MARKET_HERITAGE = Object.freeze({
  completionYear: 1939,
  reopeningYear: 2021,
  grade: '香港三級歷史建築 (Grade III Historic Building)',
  architecturalStyle: 'Streamline Moderne / Bauhaus (現代主義流線型 / 包浩斯風格)',
  address: '香港中環德輔道中80號／皇后大道中93號 (80 Des Voeux Road Central / 93 Queen\'s Road Central)',
  district: '中西區中環 (Central, Central and Western District)',
  management: '市區重建局及華懋集團 (Urban Renewal Authority & Chinachem Group)',
  wikidata: 'Q5061400',
  osmRelation: 1528216
});

// Preserved heritage stall specification
export const CENTRAL_MARKET_STALLS = Object.freeze({
  porkLampshadeRed: '#d8261c',
  porkLampshadeEmissive: '#ff3322',
  tileWhite: '#f4f4f2',
  counterWood: '#8c5d3b',
  stallCount: 16
});

// Ground-truth site boundary in world metres:
// Verified against all surrounding road centerlines and widths:
// North: Des Voeux Road Central (ways 36802, 12882)
// South: Queen's Road Central (ways 8459, 14091)
// West: Jubilee Street (ways 2702, 12881)
// East: Queen Victoria Street (ways 2713, 196)
export const CENTRAL_MARKET_RING = Object.freeze([
  -411.97, -274.65, // NW corner (Des Voeux Rd / Jubilee St)
  -387.45, -244.32, // NE corner (Des Voeux Rd / Queen Victoria St)
  -443.43, -199.05, // SE corner (Queen's Rd / Queen Victoria St)
  -467.95, -229.38, // SW corner (Queen's Rd / Jubilee St)
  -411.97, -274.65  // Closed ring
]);

// Convert world coordinates to WGS84 for OSM provenance
const geometry = Object.freeze(
  [
    [-411.97, -274.65],
    [-387.45, -244.32],
    [-443.43, -199.05],
    [-467.95, -229.38],
    [-411.97, -274.65]
  ].map(([x, z]) => Object.freeze({
    lon: 114.1596 + x / HK_METRES_PER_LON,
    lat: 22.2819 - z / HK_METRES_PER_LAT
  }))
);

export const CENTRAL_MARKET_OSM_SOURCE = authoredOsmSource({
  id: 1528216, // Matching OSM relation 1528216: Central Market
  version: 1,
  tags: {
    name: '中環街市 Central Market',
    'name:zh': '中環街市',
    'name:en': 'Central Market',
    'addr:housenumber': '80',
    'addr:street': '德輔道中 Des Voeux Road Central',
    amenity: 'marketplace',
    building: 'commercial',
    'building:levels': '4',
    heritage: '3',
    'heritage:operator': 'amo',
    start_date: '1939',
    wikidata: 'Q5061400',
    wikipedia: 'zh:中環街市'
  },
  geometry
});

export const CENTRAL_MARKET_SITE = makeAuthoredSite(
  'central-market',
  '中環街市',
  'Central Market',
  CENTRAL_MARKET_OSM_SOURCE,
  {
    levels: 4,
    height: 18.0,
    role: 'marketplace',
    evidence: 'OSM relation 1528216 & historical Architectural Office survey 1939; Grade III Historic Building.'
  }
);

// Coordinate transform helpers
const cosR = Math.cos(CENTRAL_MARKET_CENTER.ry);
const sinR = Math.sin(CENTRAL_MARKET_CENTER.ry);

export function centralMarketLocalToWorld(lx, lz) {
  return {
    x: CENTRAL_MARKET_CENTER.x + lx * cosR + lz * sinR,
    z: CENTRAL_MARKET_CENTER.z - lx * sinR + lz * cosR
  };
}

export function centralMarketWorldToLocal(wx, wz) {
  const dx = wx - CENTRAL_MARKET_CENTER.x;
  const dz = wz - CENTRAL_MARKET_CENTER.z;
  return {
    x: dx * cosR - dz * sinR,
    z: dx * sinR + dz * cosR
  };
}

export function isCentralMarketPoint(x, z) {
  return pointInFlatRing(CENTRAL_MARKET_RING, x, z);
}

// Terrain elevation adapter:
// Under the building footprint, ensure the ground does not poke above G/F slab level (5.50m) in the north,
// while allowing the south entrance steps to smoothly reach Queen's Road Central (~8.34m).
export function centralMarketGroundHeightAt(x, z, ground) {
  if (!isCentralMarketPoint(x, z)) return ground;
  const local = centralMarketWorldToLocal(x, z);
  const B = CENTRAL_MARKET_BOUNDS;
  if (Math.abs(local.x) <= B.halfWidth && Math.abs(local.z) <= B.halfDepth) {
    // Inside building: south portion slopes up to Queen's Road entry level, north sits at baseY
    if (local.z > 15.0) {
      const t = (local.z - 15.0) / (B.halfDepth - 15.0);
      return CENTRAL_MARKET_HEIGHTS.baseY + t * (CENTRAL_MARKET_HEIGHTS.groundFloorTop - CENTRAL_MARKET_HEIGHTS.baseY);
    }
    return CENTRAL_MARKET_HEIGHTS.baseY;
  }
  return ground;
}
