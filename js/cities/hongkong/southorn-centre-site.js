// 修頓中心（Southorn Centre, 130-150 Hennessy Road, Wan Chai, 1978）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
// Source: OSM Way 148858987.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 130-150 Hennessy Road, Wan Chai, Hong Kong (香港灣仔軒尼詩道130-150號).
// Completed: 1978.
// Height: 107.0m (30 storeys).
// Developer: Southorn Development.
// Architect: Rocco Design Architects Associates Limited (鄭中設計).
// OSM Way: 148858987.
// Key Architectural Highlights:
// - 107-metre, 30-storey office tower on Hennessy Road, Wan Chai.
// - Rectangular glass-and-concrete facade with regular window grid.
// - Stone podium and entrance canopy fronting Hennessy Road.
// - Simple flat roof with parapet and rooftop plant.

export const SOUTHORN_CENTRE_HERITAGE = Object.freeze({
  address: '香港灣仔軒尼詩道130-150號 130-150 Hennessy Road, Wan Chai, Hong Kong',
  district: '灣仔 (Wan Chai)',
  completionYear: 1978,
  currentName: 'Southorn Centre (修頓中心)',
  developer: 'Southorn Development',
  architect: 'Rocco Design Architects Associates Limited (鄭中設計有限公司)',
  style: 'Modernist Glass Office Tower (現代主義玻璃辦公摩天大樓)',
  osmWay: 148858987,
  height: 107.0,
  storeys: 30
});

export const SOUTHORN_CENTRE_OSM_SOURCE = authoredOsmSource({
  id: 148858987,
  type: 'way',
  version: 2,
  tags: {
    building: 'yes',
    'building:levels': '30',
    height: '107',
    name: '修頓中心 Southorn Centre',
    'name:en': 'Southorn Centre',
    'name:zh': '修頓中心',
    wikidata: 'Q10888125'
  },
  geometry: [
    { lat: 22.2772867, lon: 114.1726472 },
    { lat: 22.277335, lon: 114.1726411 },
    { lat: 22.2773599, lon: 114.1728965 },
    { lat: 22.2773138, lon: 114.1729014 },
    { lat: 22.2773155, lon: 114.172924 },
    { lat: 22.2769804, lon: 114.1729644 },
    { lat: 22.276978, lon: 114.1729401 },
    { lat: 22.2769573, lon: 114.1729426 },
    { lat: 22.2769372, lon: 114.1726877 },
    { lat: 22.2769537, lon: 114.172686 },
    { lat: 22.2769515, lon: 114.1726659 },
    { lat: 22.2772837, lon: 114.1726244 },
    { lat: 22.2772867, lon: 114.1726472 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const SOUTHORN_CENTRE_RING = Object.freeze(
  SOUTHORN_CENTRE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(SOUTHORN_CENTRE_RING);
export const SOUTHORN_CENTRE_BOUNDS = Object.freeze(flatRingBounds(SOUTHORN_CENTRE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < SOUTHORN_CENTRE_RING.length; i += 2) {
  signedArea += SOUTHORN_CENTRE_RING[i] * SOUTHORN_CENTRE_RING[i + 3] -
    SOUTHORN_CENTRE_RING[i + 2] * SOUTHORN_CENTRE_RING[i + 1];
}
export const SOUTHORN_CENTRE_RING_AREA = Math.abs(signedArea * 0.5);

export const SOUTHORN_CENTRE_SITE = makeAuthoredSite('southorn-centre', '修頓中心', 'Southorn Centre', SOUTHORN_CENTRE_OSM_SOURCE, {
  height: 107.0,
  levels: 30
});

export function southornCentreLocalToWorld(lx, lz) {
  const site = SOUTHORN_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function southornCentreWorldToLocal(wx, wz) {
  const site = SOUTHORN_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const SOUTHORN_CENTRE_LOCAL_RING = Object.freeze(
  SOUTHORN_CENTRE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = southornCentreWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
