// 力寶中心第一座（Lippo Centre Tower 1, 48-64 Queensway, Admiralty, 1988）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Way 107336260.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 48-64 Queensway, Admiralty, Hong Kong (香港金鐘道48-64號).
// Completed: 1988.
// Height: 172.0m (45 storeys).
// Developer: Lippo Limited (力寶有限公司).
// Architect: Paul Rudolph (保羅魯道夫) / P&T Group.
// OSM Way: 107336260.
// Key Architectural Highlights:
// - 172-metre, 45-storey office tower in Admiralty, distinctive stepped pyramidal form.
// - Reflective glass curtain wall with horizontal silver spandrel bands.
// - Stone-and-glass podium with grand entrance canopy fronting Queensway.
// - Terraced crown with mechanical plant and rooftop aviation obstacle lighting.

export const LIPPO_CENTRE_TOWER_1_HERITAGE = Object.freeze({
  address: '香港金鐘道48-64號 48-64 Queensway, Admiralty, Hong Kong',
  district: '灣仔區金鐘 (Admiralty, Wan Chai)',
  completionYear: 1988,
  currentName: 'Lippo Centre Tower 1 (力寶中心第一座)',
  developer: 'Lippo Limited (力寶有限公司)',
  architect: 'Paul Rudolph / P&T Group (保羅魯道夫 / 巴馬丹拿集團)',
  style: 'Post-Modernist Stepped Glass Office Tower (後現代主義梯級玻璃辦公摩天大樓)',
  osmWay: 107336260,
  height: 172.0,
  storeys: 45
});

export const LIPPO_CENTRE_TOWER_1_OSM_SOURCE = authoredOsmSource({
  id: 107336260,
  type: 'way',
  version: 5,
  tags: {
    building: 'office',
    'building:levels': '45',
    height: '172',
    name: '力寶中心第一座 Lippo Centre Tower 1',
    'name:en': 'Lippo Centre Tower 1',
    'name:zh': '力寶中心第一座',
    office: 'yes'
  },
  geometry: [
    { lat: 22.2793965, lon: 114.16377 },
    { lat: 22.279386, lon: 114.1635895 },
    { lat: 22.27925, lon: 114.163473 },
    { lat: 22.279097, lon: 114.163493 },
    { lat: 22.2790107, lon: 114.1636143 },
    { lat: 22.279022, lon: 114.163794 },
    { lat: 22.279144, lon: 114.163895 },
    { lat: 22.279312, lon: 114.163884 },
    { lat: 22.2793965, lon: 114.16377 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const LIPPO_CENTRE_TOWER_1_RING = Object.freeze(
  LIPPO_CENTRE_TOWER_1_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(LIPPO_CENTRE_TOWER_1_RING);
export const LIPPO_CENTRE_TOWER_1_BOUNDS = Object.freeze(flatRingBounds(LIPPO_CENTRE_TOWER_1_RING));

let signedArea = 0;
for (let i = 0; i + 3 < LIPPO_CENTRE_TOWER_1_RING.length; i += 2) {
  signedArea += LIPPO_CENTRE_TOWER_1_RING[i] * LIPPO_CENTRE_TOWER_1_RING[i + 3] -
    LIPPO_CENTRE_TOWER_1_RING[i + 2] * LIPPO_CENTRE_TOWER_1_RING[i + 1];
}
export const LIPPO_CENTRE_TOWER_1_RING_AREA = Math.abs(signedArea * 0.5);

export const LIPPO_CENTRE_TOWER_1_SITE = makeAuthoredSite('lippo-centre-tower-1', '力寶中心第一座', 'Lippo Centre Tower 1', LIPPO_CENTRE_TOWER_1_OSM_SOURCE, {
  height: 172.0,
  levels: 45
});

export function lippoCentreTower1LocalToWorld(lx, lz) {
  const site = LIPPO_CENTRE_TOWER_1_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function lippoCentreTower1WorldToLocal(wx, wz) {
  const site = LIPPO_CENTRE_TOWER_1_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const LIPPO_CENTRE_TOWER_1_LOCAL_RING = Object.freeze(
  LIPPO_CENTRE_TOWER_1_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = lippoCentreTower1WorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
