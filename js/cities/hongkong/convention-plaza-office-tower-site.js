// 會展廣場辦公大樓（Convention Plaza Office Tower, 1 Harbour Road, Wan Chai, 1990）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Way 107497689.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1 Harbour Road, Wan Chai, Hong Kong (香港灣仔港灣道1號).
// Completed: 1990.
// Height: 181.0m (51 storeys).
// Developer: Hopewell Holdings (合和實業).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Way: 107497689.
// Key Architectural Highlights:
// - 181-metre, 51-storey Grade-A office tower in Wan Chai, part of the Convention Plaza complex.
// - Distinctive triangular / sail-shaped plan with curved glass curtain wall.
// - Silver-blue reflective glazing with horizontal spandrel bands and vertical mullions.
// - Stone-and-glass podium with grand entrance lobby fronting Harbour Road.
// - Mechanical plant crown with parapet coping and rooftop aviation obstacle beacons.

export const CONVENTION_PLAZA_OFFICE_TOWER_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道1號 1 Harbour Road, Wan Chai, Hong Kong',
  district: '灣仔區 (Wan Chai)',
  completionYear: 1990,
  currentName: 'Convention Plaza Office Tower (會展廣場辦公大樓)',
  developer: 'Hopewell Holdings (合和實業)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Late-Modernist Curved Glass Office Tower (晚期現代主義彎曲玻璃辦公摩天大樓)',
  osmWay: 107497689,
  height: 181.0,
  storeys: 51
});

export const CONVENTION_PLAZA_OFFICE_TOWER_OSM_SOURCE = authoredOsmSource({
  id: 107497689,
  type: 'way',
  version: 7,
  tags: {
    building: 'office',
    'building:levels': '51',
    height: '181',
    name: '會展廣場辦公大樓 Convention Plaza Office Tower',
    'name:en': 'Convention Plaza Office Tower',
    'name:zh': '會展廣場辦公大樓',
    office: 'yes'
  },
  geometry: [
    { lat: 22.2812026, lon: 114.1737832 },
    { lat: 22.2811883, lon: 114.173784 },
    { lat: 22.2809585, lon: 114.1735616 },
    { lat: 22.2807313, lon: 114.1735866 },
    { lat: 22.2807411, lon: 114.1737293 },
    { lat: 22.2807473, lon: 114.17382 },
    { lat: 22.280908, lon: 114.1739665 },
    { lat: 22.2809754, lon: 114.173961 },
    { lat: 22.2812178, lon: 114.173941 },
    { lat: 22.2812102, lon: 114.1738621 },
    { lat: 22.2812026, lon: 114.1737832 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const CONVENTION_PLAZA_OFFICE_TOWER_RING = Object.freeze(
  CONVENTION_PLAZA_OFFICE_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(CONVENTION_PLAZA_OFFICE_TOWER_RING);
export const CONVENTION_PLAZA_OFFICE_TOWER_BOUNDS = Object.freeze(flatRingBounds(CONVENTION_PLAZA_OFFICE_TOWER_RING));

let signedArea = 0;
for (let i = 0; i + 3 < CONVENTION_PLAZA_OFFICE_TOWER_RING.length; i += 2) {
  signedArea += CONVENTION_PLAZA_OFFICE_TOWER_RING[i] * CONVENTION_PLAZA_OFFICE_TOWER_RING[i + 3] -
    CONVENTION_PLAZA_OFFICE_TOWER_RING[i + 2] * CONVENTION_PLAZA_OFFICE_TOWER_RING[i + 1];
}
export const CONVENTION_PLAZA_OFFICE_TOWER_RING_AREA = Math.abs(signedArea * 0.5);

export const CONVENTION_PLAZA_OFFICE_TOWER_SITE = makeAuthoredSite('conventionPlazaOffice', '會展廣場辦公大樓', 'Convention Plaza Office Tower', CONVENTION_PLAZA_OFFICE_TOWER_OSM_SOURCE, {
  height: 181.0,
  levels: 51
});

export function conventionPlazaOfficeLocalToWorld(lx, lz) {
  const site = CONVENTION_PLAZA_OFFICE_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function conventionPlazaOfficeWorldToLocal(wx, wz) {
  const site = CONVENTION_PLAZA_OFFICE_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const CONVENTION_PLAZA_OFFICE_TOWER_LOCAL_RING = Object.freeze(
  CONVENTION_PLAZA_OFFICE_TOWER_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = conventionPlazaOfficeWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
