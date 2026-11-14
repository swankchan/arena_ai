// 華潤大廈（China Resources Building, 26 Harbour Road, Wan Chai, 1982）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Way 107497701.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 26 Harbour Road, Wan Chai, Hong Kong (香港灣仔港灣道26號).
// Completed: 1982.
// Height: 178.0m (49 storeys).
// Developer: China Resources Holdings (中國華潤).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Way: 107497701.
// Key Architectural Highlights:
// - 178-metre, 49-storey Grade-A office tower in Wan Chai, distinctive curved triangular podium.
// - Silver-blue reflective glass curtain wall with horizontal spandrel bands.
// - Stone-clad podium with grand entrance lobby fronting Harbour Road.
// - Mechanical plant crown with parapet coping and rooftop aviation obstacle beacons.

export const CHINA_RESOURCES_BUILDING_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道26號 26 Harbour Road, Wan Chai, Hong Kong',
  district: '灣仔區 (Wan Chai)',
  completionYear: 1982,
  currentName: 'China Resources Building (華潤大廈)',
  developer: 'China Resources Holdings (中國華潤)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Late-Modernist Reflective Glass Office Tower (晚期現代主義反光玻璃辦公摩天大樓)',
  osmWay: 107497701,
  height: 178.0,
  storeys: 49
});

export const CHINA_RESOURCES_BUILDING_OSM_SOURCE = authoredOsmSource({
  id: 107497701,
  type: 'way',
  version: 8,
  tags: {
    building: 'office',
    'building:levels': '49',
    height: '178',
    name: '華潤大廈 China Resources Building',
    'name:en': 'China Resources Building',
    'name:zh': '華潤大廈',
    office: 'yes'
  },
  geometry: [
    { lat: 22.2801663, lon: 114.1751816 },
    { lat: 22.2801528, lon: 114.1751827 },
    { lat: 22.2801429, lon: 114.1751835 },
    { lat: 22.2801298, lon: 114.1751845 },
    { lat: 22.2801253, lon: 114.1751849 },
    { lat: 22.2801045, lon: 114.1751866 },
    { lat: 22.2801, lon: 114.1751869 },
    { lat: 22.2800792, lon: 114.1751886 },
    { lat: 22.2800747, lon: 114.175189 },
    { lat: 22.2800539, lon: 114.1751906 },
    { lat: 22.2800494, lon: 114.175191 },
    { lat: 22.2800286, lon: 114.1751927 },
    { lat: 22.2800241, lon: 114.175193 },
    { lat: 22.2800033, lon: 114.1751947 },
    { lat: 22.2799988, lon: 114.1751951 },
    { lat: 22.279978, lon: 114.1751968 },
    { lat: 22.2799735, lon: 114.1751971 },
    { lat: 22.2799527, lon: 114.1751988 },
    { lat: 22.2799482, lon: 114.1751992 },
    { lat: 22.2799273, lon: 114.1752008 },
    { lat: 22.2799229, lon: 114.1752012 },
    { lat: 22.279902, lon: 114.1752029 },
    { lat: 22.2798976, lon: 114.1752032 },
    { lat: 22.2798767, lon: 114.1752049 },
    { lat: 22.2798723, lon: 114.1752053 },
    { lat: 22.2798521, lon: 114.1752069 },
    { lat: 22.2798492, lon: 114.1752071 },
    { lat: 22.2798358, lon: 114.1752082 },
    { lat: 22.2798368, lon: 114.1752227 },
    { lat: 22.2798386, lon: 114.1752495 },
    { lat: 22.2798389, lon: 114.1752543 },
    { lat: 22.2798406, lon: 114.1752786 },
    { lat: 22.279841, lon: 114.1752835 },
    { lat: 22.2798426, lon: 114.1753078 },
    { lat: 22.279843, lon: 114.1753126 },
    { lat: 22.2798446, lon: 114.175337 },
    { lat: 22.279845, lon: 114.1753418 },
    { lat: 22.2798467, lon: 114.1753661 },
    { lat: 22.279847, lon: 114.175371 },
    { lat: 22.2798487, lon: 114.1753953 },
    { lat: 22.279849, lon: 114.1754001 },
    { lat: 22.2798507, lon: 114.1754244 },
    { lat: 22.279851, lon: 114.1754293 },
    { lat: 22.2798527, lon: 114.1754536 },
    { lat: 22.279853, lon: 114.1754584 },
    { lat: 22.2798547, lon: 114.1754828 },
    { lat: 22.279855, lon: 114.1754876 },
    { lat: 22.2798567, lon: 114.1755119 },
    { lat: 22.2798571, lon: 114.1755168 },
    { lat: 22.2798587, lon: 114.1755411 },
    { lat: 22.2798591, lon: 114.1755459 },
    { lat: 22.2798607, lon: 114.1755702 },
    { lat: 22.2798611, lon: 114.1755751 },
    { lat: 22.2798628, lon: 114.1755994 },
    { lat: 22.2798631, lon: 114.1756042 },
    { lat: 22.2798648, lon: 114.1756286 },
    { lat: 22.2798651, lon: 114.1756334 },
    { lat: 22.2798668, lon: 114.1756577 },
    { lat: 22.2798671, lon: 114.1756626 },
    { lat: 22.2798688, lon: 114.1756869 },
    { lat: 22.2798691, lon: 114.1756917 },
    { lat: 22.2798708, lon: 114.175716 },
    { lat: 22.2798711, lon: 114.1757209 },
    { lat: 22.279873, lon: 114.1757476 },
    { lat: 22.279874, lon: 114.1757621 },
    { lat: 22.2798874, lon: 114.175761 },
    { lat: 22.2798896, lon: 114.1757609 },
    { lat: 22.2799105, lon: 114.1757592 },
    { lat: 22.279915, lon: 114.1757588 },
    { lat: 22.2799358, lon: 114.1757571 },
    { lat: 22.2799403, lon: 114.1757568 },
    { lat: 22.2799611, lon: 114.1757551 },
    { lat: 22.2799656, lon: 114.1757547 },
    { lat: 22.2799864, lon: 114.1757531 },
    { lat: 22.2799909, lon: 114.1757527 },
    { lat: 22.2800117, lon: 114.175751 },
    { lat: 22.2800162, lon: 114.1757507 },
    { lat: 22.280037, lon: 114.175749 },
    { lat: 22.2800415, lon: 114.1757486 },
    { lat: 22.2800623, lon: 114.175747 },
    { lat: 22.2800668, lon: 114.1757466 },
    { lat: 22.2800876, lon: 114.1757449 },
    { lat: 22.2800921, lon: 114.1757446 },
    { lat: 22.2801129, lon: 114.1757429 },
    { lat: 22.2801174, lon: 114.1757425 },
    { lat: 22.2801382, lon: 114.1757408 },
    { lat: 22.2801427, lon: 114.1757405 },
    { lat: 22.2801635, lon: 114.1757388 },
    { lat: 22.280168, lon: 114.1757384 },
    { lat: 22.280185, lon: 114.1757371 },
    { lat: 22.2801911, lon: 114.1757366 },
    { lat: 22.2802045, lon: 114.1757355 },
    { lat: 22.2802035, lon: 114.175721 },
    { lat: 22.2802017, lon: 114.1756942 },
    { lat: 22.2802013, lon: 114.1756894 },
    { lat: 22.2801996, lon: 114.1756651 },
    { lat: 22.2801993, lon: 114.1756602 },
    { lat: 22.2801976, lon: 114.1756359 },
    { lat: 22.2801973, lon: 114.1756311 },
    { lat: 22.2801956, lon: 114.1756068 },
    { lat: 22.2801953, lon: 114.1756019 },
    { lat: 22.2801936, lon: 114.1755776 },
    { lat: 22.2801933, lon: 114.1755728 },
    { lat: 22.2801916, lon: 114.1755484 },
    { lat: 22.2801913, lon: 114.1755436 },
    { lat: 22.2801896, lon: 114.1755193 },
    { lat: 22.2801893, lon: 114.1755144 },
    { lat: 22.2801876, lon: 114.1754901 },
    { lat: 22.2801872, lon: 114.1754853 },
    { lat: 22.2801856, lon: 114.175461 },
    { lat: 22.2801854, lon: 114.1754585 },
    { lat: 22.2801852, lon: 114.1754561 },
    { lat: 22.2801835, lon: 114.1754318 },
    { lat: 22.2801832, lon: 114.175427 },
    { lat: 22.2801815, lon: 114.1754026 },
    { lat: 22.2801812, lon: 114.1753978 },
    { lat: 22.2801795, lon: 114.1753735 },
    { lat: 22.2801792, lon: 114.1753686 },
    { lat: 22.2801775, lon: 114.1753443 },
    { lat: 22.2801772, lon: 114.1753395 },
    { lat: 22.2801755, lon: 114.1753152 },
    { lat: 22.2801752, lon: 114.1753103 },
    { lat: 22.2801735, lon: 114.175286 },
    { lat: 22.2801732, lon: 114.1752812 },
    { lat: 22.2801715, lon: 114.1752568 },
    { lat: 22.2801711, lon: 114.175252 },
    { lat: 22.2801695, lon: 114.1752277 },
    { lat: 22.2801691, lon: 114.1752228 },
    { lat: 22.2801673, lon: 114.1751961 },
    { lat: 22.2801663, lon: 114.1751816 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const CHINA_RESOURCES_BUILDING_RING = Object.freeze(
  CHINA_RESOURCES_BUILDING_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(CHINA_RESOURCES_BUILDING_RING);
export const CHINA_RESOURCES_BUILDING_BOUNDS = Object.freeze(flatRingBounds(CHINA_RESOURCES_BUILDING_RING));

let signedArea = 0;
for (let i = 0; i + 3 < CHINA_RESOURCES_BUILDING_RING.length; i += 2) {
  signedArea += CHINA_RESOURCES_BUILDING_RING[i] * CHINA_RESOURCES_BUILDING_RING[i + 3] -
    CHINA_RESOURCES_BUILDING_RING[i + 2] * CHINA_RESOURCES_BUILDING_RING[i + 1];
}
export const CHINA_RESOURCES_BUILDING_RING_AREA = Math.abs(signedArea * 0.5);

export const CHINA_RESOURCES_BUILDING_SITE = makeAuthoredSite('chinaResources', '華潤大廈', 'China Resources Building', CHINA_RESOURCES_BUILDING_OSM_SOURCE, {
  height: 178.0,
  levels: 49
});

export function chinaResourcesLocalToWorld(lx, lz) {
  const site = CHINA_RESOURCES_BUILDING_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function chinaResourcesWorldToLocal(wx, wz) {
  const site = CHINA_RESOURCES_BUILDING_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const CHINA_RESOURCES_BUILDING_LOCAL_RING = Object.freeze(
  CHINA_RESOURCES_BUILDING_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = chinaResourcesWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
