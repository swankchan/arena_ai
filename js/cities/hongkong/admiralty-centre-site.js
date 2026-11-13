// 海富中心（Admiralty Centre Tower 1 & Tower 2, 18 Harcourt Road, 1980）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 18 Harcourt Road, Admiralty, Hong Kong (香港金鐘夏慤道18號).
// Completed: 1980.
// Developers: Cheung Kong (Holdings) & MTR Corporation (長江實業及地鐵公司).
// Heights: Tower 1 is 126.0m (32 storeys); Tower 2 is 104.0m (28 storeys).
// OSM Ways: Tower 1 (107336262), Tower 2 (107336259).
// Key Architectural Highlights:
// - Chamfered octagonal twin tower geometry oriented along Harcourt Road.
// - Amber-bronze reflective glass curtain wall with bronze-anodized horizontal spandrel bands.
// - 3-storey commercial podium (Hoi Fu Shopping Centre) directly over MTR Admiralty Station (Exits A & E).
// - Comprehensive pedestrian skybridge hub connecting Tamar Government Complex, Far East Finance Centre, and United Centre.
// - Rooftop mechanical penthouses with acoustic louvres and aviation warning beacons.

export const ADMIRALTY_CENTRE_HERITAGE = Object.freeze({
  address: '香港金鐘夏慤道18號 (18 Harcourt Road, Admiralty, Hong Kong)',
  district: '中西區金鐘 (Admiralty, Central and Western District)',
  completionYear: 1980,
  currentName: 'Admiralty Centre (海富中心)',
  developers: 'Cheung Kong (Holdings) & MTR Corporation (長江實業與地鐵公司)',
  style: 'Late Modernist Amber-Bronze Curtain Wall Twin Towers (晚期現代主義古銅琥珀玻璃雙子塔)',
  osmWayTower1: 107336262,
  osmWayTower2: 107336259,
  heightTower1: 126.0,
  storeysTower1: 32,
  heightTower2: 104.0,
  storeysTower2: 28
});

export const ADMIRALTY_CENTRE_T1_OSM_SOURCE = authoredOsmSource({
  id: 107336262,
  type: 'way',
  version: 8,
  tags: {
    building: 'commercial',
    'building:levels': '36',
    height: '126',
    'addr:street': '夏慤道 Harcourt Road',
    'addr:housenumber': '18',
    name: '海富中心一座 Admiralty Centre Tower 1',
    'name:en': 'Admiralty Centre Tower 1',
    'name:zh': '海富中心一座'
  },
  geometry: [
    { lon: 114.1647955, lat: 22.2797233 },
    { lon: 114.1645619, lat: 22.2793979 },
    { lon: 114.1648581, lat: 22.2792154 },
    { lon: 114.164895, lat: 22.2791927 },
    { lon: 114.1649186, lat: 22.2791782 },
    { lon: 114.1649421, lat: 22.2792108 },
    { lon: 114.1651523, lat: 22.2795037 },
    { lon: 114.1651121, lat: 22.2795285 },
    { lon: 114.1647955, lat: 22.2797233 }
  ]
});

export const ADMIRALTY_CENTRE_T2_OSM_SOURCE = authoredOsmSource({
  id: 107336259,
  type: 'way',
  version: 8,
  tags: {
    building: 'commercial',
    'building:levels': '29',
    height: '104',
    'addr:street': '夏慤道 Harcourt Road',
    'addr:housenumber': '18',
    name: '海富中心二座 Admiralty Centre Tower 2',
    'name:en': 'Admiralty Centre Tower 2',
    'name:zh': '海富中心二座'
  },
  geometry: [
    { lon: 114.1657623, lat: 22.2792125 },
    { lon: 114.1656766, lat: 22.2790934 },
    { lon: 114.1655992, lat: 22.2789857 },
    { lon: 114.1655423, lat: 22.2790208 },
    { lon: 114.1653538, lat: 22.2791366 },
    { lon: 114.1655017, lat: 22.2793425 },
    { lon: 114.1655169, lat: 22.2793636 },
    { lon: 114.1657623, lat: 22.2792125 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const ADMIRALTY_CENTRE_T1_RING = Object.freeze(
  ADMIRALTY_CENTRE_T1_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);
export const ADMIRALTY_CENTRE_T2_RING = Object.freeze(
  ADMIRALTY_CENTRE_T2_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const fpT1 = minimumAreaObb(ADMIRALTY_CENTRE_T1_RING);
const fpT2 = minimumAreaObb(ADMIRALTY_CENTRE_T2_RING);

export const ADMIRALTY_CENTRE_SITE = Object.freeze({
  name: '海富中心 Admiralty Centre',
  englishName: 'Admiralty Centre',
  address: '金鐘夏慤道18號 18 Harcourt Road',
  // Tower 1 (West High Block)
  t1: {
    ...fpT1,
    height: 126.0,
    storeys: 32,
    podiumHeight: 14.0,
    shaftHeight: 100.0,
    crownHeight: 12.0
  },
  // Tower 2 (East Low Block)
  t2: {
    ...fpT2,
    height: 104.0,
    storeys: 28,
    podiumHeight: 14.0,
    shaftHeight: 80.0,
    crownHeight: 10.0
  },
  // Complex Center (for landmark marker)
  x: (fpT1.x + fpT2.x) * 0.5,
  z: (fpT1.z + fpT2.z) * 0.5,
  height: 126.0
});
