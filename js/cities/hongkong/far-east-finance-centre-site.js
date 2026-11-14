// 遠東金融中心（Far East Finance Centre, 16-20 Des Voeux Road Central, Central, 1978）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Way 107336261.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 16-20 Des Voeux Road Central, Central, Hong Kong (香港中環德輔道中16-20號).
// Completed: 1978.
// Height: 176.0m (approx. 44 storeys).
// Developer: Far East Consortium (遠東發展).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Way: 107336261.
// Key Architectural Highlights:
// - 176-metre office tower in Central, slender rectangular form.
// - Reflective glass curtain wall with horizontal silver spandrel bands.
// - Stone-clad podium with grand entrance lobby fronting Des Voeux Road Central.
// - Simple crown parapet with mechanical plant and rooftop aviation obstacle lighting.

export const FAR_EAST_FINANCE_CENTRE_HERITAGE = Object.freeze({
  address: '香港中環德輔道中16-20號 16-20 Des Voeux Road Central, Central, Hong Kong',
  district: '中西區中環 (Central, Central and Western District)',
  completionYear: 1978,
  currentName: 'Far East Finance Centre (遠東金融中心)',
  developer: 'Far East Consortium (遠東發展)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'Modernist Glass Office Tower (現代主義玻璃辦公摩天大樓)',
  osmWay: 107336261,
  height: 176.0,
  storeys: 44
});

export const FAR_EAST_FINANCE_CENTRE_OSM_SOURCE = authoredOsmSource({
  id: 107336261,
  type: 'way',
  version: 5,
  tags: {
    building: 'office',
    height: '176',
    name: '遠東金融中心 Far East Finance Centre',
    'name:en': 'Far East Finance Centre',
    'name:zh': '遠東金融中心',
    office: 'yes'
  },
  geometry: [
    { lat: 22.2802312, lon: 114.1639136 },
    { lat: 22.2801714, lon: 114.1639923 },
    { lat: 22.2800163, lon: 114.1641961 },
    { lat: 22.2798524, lon: 114.1640505 },
    { lat: 22.2800674, lon: 114.163768 },
    { lat: 22.2801756, lon: 114.1638642 },
    { lat: 22.2802312, lon: 114.1639136 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const FAR_EAST_FINANCE_CENTRE_RING = Object.freeze(
  FAR_EAST_FINANCE_CENTRE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(FAR_EAST_FINANCE_CENTRE_RING);
export const FAR_EAST_FINANCE_CENTRE_BOUNDS = Object.freeze(flatRingBounds(FAR_EAST_FINANCE_CENTRE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < FAR_EAST_FINANCE_CENTRE_RING.length; i += 2) {
  signedArea += FAR_EAST_FINANCE_CENTRE_RING[i] * FAR_EAST_FINANCE_CENTRE_RING[i + 3] -
    FAR_EAST_FINANCE_CENTRE_RING[i + 2] * FAR_EAST_FINANCE_CENTRE_RING[i + 1];
}
export const FAR_EAST_FINANCE_CENTRE_RING_AREA = Math.abs(signedArea * 0.5);

export const FAR_EAST_FINANCE_CENTRE_SITE = makeAuthoredSite('farEastFinance', '遠東金融中心', 'Far East Finance Centre', FAR_EAST_FINANCE_CENTRE_OSM_SOURCE, {
  height: 176.0,
  levels: 44
});

export function farEastFinanceLocalToWorld(lx, lz) {
  const site = FAR_EAST_FINANCE_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function farEastFinanceWorldToLocal(wx, wz) {
  const site = FAR_EAST_FINANCE_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const FAR_EAST_FINANCE_CENTRE_LOCAL_RING = Object.freeze(
  FAR_EAST_FINANCE_CENTRE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = farEastFinanceWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
