// 舊中國銀行大廈（Bank of China Building, 2A Des Voeux Road Central）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing } from './landmark-site.js';

// Historical and heritage provenance:
// Address: 2A Des Voeux Road Central, Central, Hong Kong (香港中環德輔道中2A號)
// Built: 1950-1951, officially opened 1952. Grade I Historic Building (香港一級歷史建築).
// Architects: Palmer & Turner (巴馬丹拿) & Luke Him Sau (陸謙受).
// Contractor: George Wimpey & Co.
// Height: 17 storeys, ~70 metres tall (tallest building in Hong Kong at completion, surpassing 3rd-gen HSBC).
// Style: Streamline Art Deco fused with traditional Chinese decorative motifs.
// Signature features:
// - Finely dressed Hong Kong granite ashlar masonry with horizontal rustication on podium.
// - Symmetrical stepped Art Deco massing with vertical strip windows and fluted stone piers.
// - Monumental triple-bay north entrance portal with revolving door and bronze inscriptions: 「中國銀行」 & "BANK OF CHINA".
// - Pair of authentic Chinese guardian stone lions (守門石獅: 雄獅踏球、雌獅撫幼) flanking the entrance flight of steps.
// - China Club (中國會, 13F-15F) penthouse with Chinese balustraded open-air terrace and veranda.
// - Crowned with an iconic Chinese hip-and-gable glazed emerald tile roof (綠琉璃歇山頂/四角攢尖頂) with flying eaves and golden finial spire (寶頂).
// - Nighttime architectural floodlighting grazing the vertical granite piers and illuminating the Chinese tile roof.

// Ground-truth site boundary in world metres, strictly verified against surrounding road networks:
// North: Des Voeux Road Central (德輔道中, ways 88695246 & 88695241, road edge z <= 164.5)
// West: Bank Street (銀行街, way 155738157, road edge x <= 39.8 at north, x <= 30.6 at south)
// East: Jackson Road / Chater Garden concourse (x >= 61.5)
// South: Queen's Road Central (皇后大道中, way 32592532, road edge z >= 210.6)
export const OLD_BANK_OF_CHINA_RING = Object.freeze([
  41.5, 167.5, // NW corner (Des Voeux Rd / Bank St sidewalk junction)
  60.5, 167.5, // NE corner (Des Voeux Rd / Chater Garden walkway junction)
  60.5, 207.5, // SE corner (Queen's Rd Central / Chater Garden junction)
  41.5, 207.5, // SW corner (Queen's Rd Central / Bank St junction)
  41.5, 167.5  // NW corner (closed ring)
]);

// Convert world coordinates back to WGS84 for OSM provenance
const geometry = Object.freeze(
  [
    [41.5, 167.5],
    [60.5, 167.5],
    [60.5, 207.5],
    [41.5, 207.5],
    [41.5, 167.5]
  ].map(([x, z]) => Object.freeze({
    lon: 114.1596 + x / HK_METRES_PER_LON,
    lat: 22.2819 - z / HK_METRES_PER_LAT
  }))
);

export const OLD_BANK_OF_CHINA_OSM_SOURCE = authoredOsmSource({
  id: 4856089, // Matching Wikidata Q4856089: Bank of China Building (Hong Kong)
  version: 1,
  tags: {
    name: '舊中國銀行大廈 Bank of China Building',
    'name:zh': '舊中國銀行大廈',
    'name:en': 'Bank of China Building',
    'addr:housenumber': '2A',
    'addr:street': '德輔道中 Des Voeux Road Central',
    building: 'commercial',
    'building:levels': '17',
    height: '70',
    heritage: '1',
    'heritage:operator': 'Antiquities and Monuments Office',
    protection_title: '一級歷史建築 Grade I Historic Building',
    start_date: '1951',
    architect: 'Palmer & Turner; Luke Him Sau',
    wikidata: 'Q4856089',
    wikipedia: 'zh:中國銀行大廈 (香港)'
  },
  geometry
});

export const OLD_BANK_OF_CHINA_SITE = makeAuthoredSite(
  'old-bank-of-china',
  '舊中國銀行大廈',
  'Bank of China Building',
  OLD_BANK_OF_CHINA_OSM_SOURCE,
  {
    levels: 17,
    height: 70.0,
    role: 'building',
    evidence: 'Historical 1951 Palmer & Turner/Luke Him Sau Grade I heritage landmark at 2A Des Voeux Road Central.'
  }
);

// Architectural dimensions & levels
export const OLD_BOC_HEIGHT = 70.0;
export const OLD_BOC_ROOF_TOP = 77.2;
export const OLD_BOC_STOREYS = 17;
export const OLD_BOC_BASE_Y = 8.4; // Ground floor lobby datum
export const OLD_BOC_FOUNDATION_Y = 5.0; // Foundation plinth reaching below lowest local ground (7.06m)
export const OLD_BOC_PODIUM_HEIGHT = 14.0; // Floors G-3 (up to y = 22.4m)
export const OLD_BOC_TOWER_HEIGHT = 36.0; // Floors 4-13 (up to y = 58.4m)
export const OLD_BOC_ATTIC_HEIGHT = 12.0; // Floors 14-17 (China Club penthouse, up to y = 70.4m)
export const OLD_BOC_CROWN_ROOF_HEIGHT = 6.8; // Glazed Chinese hip-and-gable roof & finial (up to y = 77.2m)

// Bounding parameters for each architectural section
export const OLD_BOC_PODIUM_BOUNDS = Object.freeze({
  minX: 41.5,
  maxX: 60.5,
  minZ: 170.5,
  maxZ: 205.5,
  width: 19.0,
  depth: 35.0,
  centerX: 51.0,
  centerZ: 188.0,
  baseY: 8.4,
  topY: 22.4
});

export const OLD_BOC_TOWER_BOUNDS = Object.freeze({
  minX: 42.0,
  maxX: 60.0,
  minZ: 171.5,
  maxZ: 204.5,
  width: 18.0,
  depth: 33.0,
  centerX: 51.0,
  centerZ: 188.0,
  baseY: 22.4,
  topY: 58.4
});

export const OLD_BOC_ATTIC_LOWER_BOUNDS = Object.freeze({
  minX: 43.0,
  maxX: 59.0,
  minZ: 174.0,
  maxZ: 202.0,
  width: 16.0,
  depth: 28.0,
  centerX: 51.0,
  centerZ: 188.0,
  baseY: 58.4,
  topY: 64.8
});

export const OLD_BOC_ATTIC_UPPER_BOUNDS = Object.freeze({
  minX: 44.0,
  maxX: 58.0,
  minZ: 176.5,
  maxZ: 199.5,
  width: 14.0,
  depth: 23.0,
  centerX: 51.0,
  centerZ: 188.0,
  baseY: 64.8,
  topY: 70.4
});

export const OLD_BOC_ROOF_BOUNDS = Object.freeze({
  minX: 43.5,
  maxX: 58.5,
  minZ: 175.5,
  maxZ: 200.5,
  centerX: 51.0,
  centerZ: 188.0,
  baseY: 70.4,
  apexY: 77.2,
  eavesOutset: 1.8
});

// Historical metadata
export const OLD_BOC_HERITAGE = Object.freeze({
  officialName: '舊中國銀行大廈 Bank of China Building',
  cantoneseName: '舊中國銀行大廈',
  address: '香港中環德輔道中2A號 2A Des Voeux Road Central',
  grade: '一級歷史建築 Grade I Historic Building',
  completionYear: 1951,
  openingYear: 1952,
  architects: 'Palmer & Turner (巴馬丹拿) & Luke Him Sau (陸謙受)',
  contractor: 'George Wimpey & Co.',
  architecturalStyle: 'Art Deco with traditional Chinese motifs (裝飾藝術與中式傳統紋樣結合)',
  originalUse: 'Bank of China Hong Kong Headquarters (1951-1990)',
  subsequentUse: 'Sin Hua Bank Headquarters (1991-2001); BOCHK Central Branch (2001-present)',
  penthouseTenant: 'China Club (中國會, founded 1991 by Sir David Tang)'
});

// Guardian stone lions specifications
export const OLD_BOC_LIONS = Object.freeze({
  count: 2,
  material: '精雕花崗岩 Carved Granite',
  pedestalStyle: '須彌座蓮花基座 Tiered Xumizuo Lotus Pedestal',
  east: Object.freeze({
    gender: 'male',
    symbolism: '雄獅踏球 (Right paw resting on brocade embroidered ball)',
    x: 55.2,
    z: 168.5,
    y: 7.2
  }),
  west: Object.freeze({
    gender: 'female',
    symbolism: '雌獅撫幼 (Left paw sheltering playful cub)',
    x: 42.8,
    z: 168.5,
    y: 7.2
  }),
  pedestalWidth: 1.4,
  pedestalDepth: 1.9,
  pedestalHeight: 1.0,
  lionHeight: 1.4
});

// China Club metadata
export const OLD_BOC_CHINA_CLUB = Object.freeze({
  floors: '13F-15F',
  founder: 'Sir David Tang (鄧永鏘)',
  foundedYear: 1991,
  style: '1930s Shanghai Art Deco nostalgic dining club, tea house & Long March Bar'
});

// Local to world coordinate helpers
export function oldBocLocalToWorld(lx, lz) {
  return {
    x: OLD_BOC_PODIUM_BOUNDS.centerX + lx,
    z: OLD_BOC_PODIUM_BOUNDS.centerZ + lz
  };
}

export function oldBocWorldToLocal(wx, wz) {
  return {
    x: wx - OLD_BOC_PODIUM_BOUNDS.centerX,
    z: wz - OLD_BOC_PODIUM_BOUNDS.centerZ
  };
}

export function isOldBankOfChinaPoint(x, z) {
  return pointInFlatRing(OLD_BANK_OF_CHINA_RING, x, z);
}

export function oldBankOfChinaGroundHeightAt(x, z, ground) {
  if (!isOldBankOfChinaPoint(x, z)) return ground;
  const P = OLD_BOC_PODIUM_BOUNDS;
  if (x >= P.minX && x <= P.maxX && z >= P.minZ && z <= P.maxZ) {
    return P.baseY;
  }
  // North entrance steps transition
  if (x >= 43.0 && x <= 55.0 && z >= 167.5 && z < P.minZ) {
    const t = (z - 167.5) / (P.minZ - 167.5);
    return ground + t * (P.baseY - ground);
  }
  // South entrance steps transition
  if (x >= 43.5 && x <= 54.5 && z > P.maxZ && z <= 207.5) {
    const t = (207.5 - z) / (207.5 - P.maxZ);
    return ground + t * (P.baseY - ground);
  }
  return ground;
}
