// 鷹君中心（Great Eagle Centre, 23 Harbour Road, Wan Chai, 1979）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Relation 18183385 (outer member Way 40491165).
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 23 Harbour Road, Wan Chai, Hong Kong (香港灣仔港灣道23號).
// Completed: 1979.
// Height: 146.0m (35 storeys).
// Developer: Great Eagle Holdings (鷹君集團).
// Architect: P&T Group (巴馬丹拿集團).
// OSM Relation: 18183385 (outer Way 40491165).
// Key Architectural Highlights:
// - 146-metre, 35-storey office tower in Wan Chai, rectangular glass curtain-wall block.
// - Dark grey-green reflective glass facade (OSM building:colour #303030) with horizontal spandrel bands.
// - Stone-and-glass podium with grand entrance canopy on Harbour Road.
// - Mechanical plant crown with parapet coping and rooftop aviation obstacle beacons.

export const GREAT_EAGLE_CENTRE_HERITAGE = Object.freeze({
  address: '香港灣仔港灣道23號 23 Harbour Road, Wan Chai, Hong Kong',
  district: '灣仔 (Wan Chai)',
  completionYear: 1979,
  currentName: 'Great Eagle Centre (鷹君中心)',
  developer: 'Great Eagle Holdings (鷹君集團)',
  architect: 'P&T Group (巴馬丹拿集團)',
  style: 'International Style Glass Office Tower (國際主義玻璃辦公摩天大樓)',
  osmRelation: 18183385,
  height: 146.0,
  storeys: 35
});

export const GREAT_EAGLE_CENTRE_OSM_SOURCE = authoredOsmSource({
  id: 18183385,
  type: 'relation',
  version: 1,
  tags: {
    building: 'office',
    'building:colour': '#303030',
    'building:levels': '35',
    height: '146',
    name: '鷹君中心 Great Eagle Centre',
    'name:en': 'Great Eagle Centre',
    'name:zh': '鷹君中心',
    office: 'yes',
    wikidata: 'Q5599086',
    wikipedia: 'en:Great Eagle Centre'
  },
  geometry: [
    { lat: 22.281164, lon: 114.1746542 },
    { lat: 22.2811551, lon: 114.174655 },
    { lat: 22.2811461, lon: 114.1746558 },
    { lat: 22.2810607, lon: 114.1746634 },
    { lat: 22.2810518, lon: 114.1746642 },
    { lat: 22.2809709, lon: 114.1746715 },
    { lat: 22.2809619, lon: 114.1746723 },
    { lat: 22.2808765, lon: 114.1746799 },
    { lat: 22.2808676, lon: 114.1746807 },
    { lat: 22.2808586, lon: 114.1746815 },
    { lat: 22.2808594, lon: 114.1746912 },
    { lat: 22.2808601, lon: 114.1747009 },
    { lat: 22.2808672, lon: 114.174794 },
    { lat: 22.280868, lon: 114.1748036 },
    { lat: 22.2808747, lon: 114.1748919 },
    { lat: 22.2808755, lon: 114.1749016 },
    { lat: 22.2808822, lon: 114.1749898 },
    { lat: 22.280883, lon: 114.1749995 },
    { lat: 22.2808901, lon: 114.1750926 },
    { lat: 22.2808908, lon: 114.1751022 },
    { lat: 22.2808916, lon: 114.1751119 },
    { lat: 22.2809005, lon: 114.1751111 },
    { lat: 22.2809095, lon: 114.1751103 },
    { lat: 22.2809949, lon: 114.1751027 },
    { lat: 22.2810038, lon: 114.1751019 },
    { lat: 22.2810848, lon: 114.1750946 },
    { lat: 22.2810937, lon: 114.1750938 },
    { lat: 22.2811791, lon: 114.1750862 },
    { lat: 22.281188, lon: 114.1750854 },
    { lat: 22.281197, lon: 114.1750846 },
    { lat: 22.2811963, lon: 114.1750749 },
    { lat: 22.2811955, lon: 114.1750652 },
    { lat: 22.2811884, lon: 114.1749721 },
    { lat: 22.2811876, lon: 114.1749625 },
    { lat: 22.2811843, lon: 114.1749185 },
    { lat: 22.2811809, lon: 114.1748742 },
    { lat: 22.2811801, lon: 114.1748645 },
    { lat: 22.2811734, lon: 114.1747763 },
    { lat: 22.2811726, lon: 114.1747666 },
    { lat: 22.2811655, lon: 114.1746735 },
    { lat: 22.2811648, lon: 114.1746639 },
    { lat: 22.281164, lon: 114.1746542 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const GREAT_EAGLE_CENTRE_RING = Object.freeze(
  GREAT_EAGLE_CENTRE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(GREAT_EAGLE_CENTRE_RING);
export const GREAT_EAGLE_CENTRE_BOUNDS = Object.freeze(flatRingBounds(GREAT_EAGLE_CENTRE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < GREAT_EAGLE_CENTRE_RING.length; i += 2) {
  signedArea += GREAT_EAGLE_CENTRE_RING[i] * GREAT_EAGLE_CENTRE_RING[i + 3] -
    GREAT_EAGLE_CENTRE_RING[i + 2] * GREAT_EAGLE_CENTRE_RING[i + 1];
}
export const GREAT_EAGLE_CENTRE_RING_AREA = Math.abs(signedArea * 0.5);

export const GREAT_EAGLE_CENTRE_SITE = makeAuthoredSite('great-eagle-centre', '鷹君中心', 'Great Eagle Centre', GREAT_EAGLE_CENTRE_OSM_SOURCE, {
  height: 146.0,
  levels: 35
});

export function greatEagleCentreLocalToWorld(lx, lz) {
  const site = GREAT_EAGLE_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function greatEagleCentreWorldToLocal(wx, wz) {
  const site = GREAT_EAGLE_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const GREAT_EAGLE_CENTRE_LOCAL_RING = Object.freeze(
  GREAT_EAGLE_CENTRE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = greatEagleCentreWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
