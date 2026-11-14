// 力寶中心第二座（Lippo Centre Tower 2, 48-64 Queensway, Admiralty, 1989）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Way 107336263.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 48-64 Queensway, Admiralty, Hong Kong (香港金鐘道48-64號).
// Completed: 1989.
// Height: 186.0m (48 storeys).
// Developer: Lippo Limited (力寶有限公司).
// Architect: Paul Rudolph (保羅魯道夫) / P&T Group.
// OSM Way: 107336263.
// Key Architectural Highlights:
// - 186-metre, 48-storey office tower in Admiralty, distinctive stepped pyramidal form.
// - Reflective glass curtain wall with horizontal silver spandrel bands.
// - Stone-and-glass podium with grand entrance canopy fronting Queensway.
// - Terraced crown with mechanical plant and rooftop aviation obstacle lighting.

export const LIPPO_CENTRE_TOWER_2_HERITAGE = Object.freeze({
  address: '香港金鐘道48-64號 48-64 Queensway, Admiralty, Hong Kong',
  district: '灣仔區金鐘 (Admiralty, Wan Chai)',
  completionYear: 1989,
  currentName: 'Lippo Centre Tower 2 (力寶中心第二座)',
  developer: 'Lippo Limited (力寶有限公司)',
  architect: 'Paul Rudolph / P&T Group (保羅魯道夫 / 巴馬丹拿集團)',
  style: 'Post-Modernist Stepped Glass Office Tower (後現代主義梯級玻璃辦公摩天大樓)',
  osmWay: 107336263,
  height: 186.0,
  storeys: 48
});

export const LIPPO_CENTRE_TOWER_2_OSM_SOURCE = authoredOsmSource({
  id: 107336263,
  type: 'way',
  version: 5,
  tags: {
    building: 'office',
    'building:levels': '48',
    height: '186',
    name: '力寶中心第二座 Lippo Centre Tower 2',
    'name:en': 'Lippo Centre Tower 2',
    'name:zh': '力寶中心第二座',
    office: 'yes'
  },
  geometry: [
    { lat: 22.279683, lon: 114.163392 },
    { lat: 22.279672, lon: 114.163217 },
    { lat: 22.27954, lon: 114.1631025 },
    { lat: 22.279379, lon: 114.163126 },
    { lat: 22.279296, lon: 114.163241 },
    { lat: 22.279303, lon: 114.163412 },
    { lat: 22.279439, lon: 114.163527 },
    { lat: 22.279594, lon: 114.163512 },
    { lat: 22.279683, lon: 114.163392 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const LIPPO_CENTRE_TOWER_2_RING = Object.freeze(
  LIPPO_CENTRE_TOWER_2_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(LIPPO_CENTRE_TOWER_2_RING);
export const LIPPO_CENTRE_TOWER_2_BOUNDS = Object.freeze(flatRingBounds(LIPPO_CENTRE_TOWER_2_RING));

let signedArea = 0;
for (let i = 0; i + 3 < LIPPO_CENTRE_TOWER_2_RING.length; i += 2) {
  signedArea += LIPPO_CENTRE_TOWER_2_RING[i] * LIPPO_CENTRE_TOWER_2_RING[i + 3] -
    LIPPO_CENTRE_TOWER_2_RING[i + 2] * LIPPO_CENTRE_TOWER_2_RING[i + 1];
}
export const LIPPO_CENTRE_TOWER_2_RING_AREA = Math.abs(signedArea * 0.5);

export const LIPPO_CENTRE_TOWER_2_SITE = makeAuthoredSite('lippo-centre-tower-2', '力寶中心第二座', 'Lippo Centre Tower 2', LIPPO_CENTRE_TOWER_2_OSM_SOURCE, {
  height: 186.0,
  levels: 48
});

export function lippoCentreTower2LocalToWorld(lx, lz) {
  const site = LIPPO_CENTRE_TOWER_2_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function lippoCentreTower2WorldToLocal(wx, wz) {
  const site = LIPPO_CENTRE_TOWER_2_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const LIPPO_CENTRE_TOWER_2_LOCAL_RING = Object.freeze(
  LIPPO_CENTRE_TOWER_2_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = lippoCentreTower2WorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
