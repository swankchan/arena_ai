// 中國工商銀行大廈（ICBC Tower, 33-35 Des Voeux Road Central, Central, 1993）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Way 107497693.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 33-35 Des Voeux Road Central, Central, Hong Kong (香港中環德輔道中33-35號).
// Completed: 1993.
// Height: 167.0m (40 storeys).
// Developer: ICBC Asia (中國工商銀行亞洲).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Way: 107497693.
// Key Architectural Highlights:
// - 167-metre, 40-storey office tower in Central, slender rectangular form.
// - Reflective glass curtain wall with horizontal silver spandrel bands and vertical mullions.
// - Stone-clad podium with grand entrance lobby fronting Des Voeux Road Central.
// - Crown parapet with mechanical plant tier and rooftop aviation obstacle beacons.

export const ICBC_TOWER_HERITAGE = Object.freeze({
  address: '香港中環德輔道中33-35號 33-35 Des Voeux Road Central, Central, Hong Kong',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1993,
  currentName: 'ICBC Tower (中國工商銀行大廈)',
  developer: 'ICBC Asia (中國工商銀行亞洲)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Late-Modernist Glass Office Tower (晚期現代主義玻璃辦公摩天大樓)',
  osmWay: 107497693,
  height: 167.0,
  storeys: 40
});

export const ICBC_TOWER_OSM_SOURCE = authoredOsmSource({
  id: 107497693,
  type: 'way',
  version: 4,
  tags: {
    building: 'office',
    'building:levels': '40',
    height: '167',
    name: '中國工商銀行大廈 ICBC Tower',
    'name:en': 'ICBC Tower',
    'name:zh': '中國工商銀行大廈',
    office: 'yes'
  },
  geometry: [
    { lat: 22.27842, lon: 114.1608057 },
    { lat: 22.2781332, lon: 114.1607454 },
    { lat: 22.2781367, lon: 114.1608611 },
    { lat: 22.2780917, lon: 114.1608752 },
    { lat: 22.2780963, lon: 114.1609261 },
    { lat: 22.2781198, lon: 114.1609816 },
    { lat: 22.2782501, lon: 114.1611204 },
    { lat: 22.2783944, lon: 114.1611952 },
    { lat: 22.278553, lon: 114.1611465 },
    { lat: 22.278701, lon: 114.1611062 },
    { lat: 22.27842, lon: 114.1608057 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const ICBC_TOWER_RING = Object.freeze(
  ICBC_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(ICBC_TOWER_RING);
export const ICBC_TOWER_BOUNDS = Object.freeze(flatRingBounds(ICBC_TOWER_RING));

let signedArea = 0;
for (let i = 0; i + 3 < ICBC_TOWER_RING.length; i += 2) {
  signedArea += ICBC_TOWER_RING[i] * ICBC_TOWER_RING[i + 3] -
    ICBC_TOWER_RING[i + 2] * ICBC_TOWER_RING[i + 1];
}
export const ICBC_TOWER_RING_AREA = Math.abs(signedArea * 0.5);

export const ICBC_TOWER_SITE = makeAuthoredSite('icbc-tower', '中國工商銀行大廈', 'ICBC Tower', ICBC_TOWER_OSM_SOURCE, {
  height: 167.0,
  levels: 40
});

export function icbcTowerLocalToWorld(lx, lz) {
  const site = ICBC_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function icbcTowerWorldToLocal(wx, wz) {
  const site = ICBC_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const ICBC_TOWER_LOCAL_RING = Object.freeze(
  ICBC_TOWER_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = icbcTowerWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
