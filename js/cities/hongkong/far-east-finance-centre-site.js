// 遠東金融中心（Far East Finance Centre, 16 Harcourt Road, Admiralty, 1982）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 16 Harcourt Road, Admiralty, Hong Kong (香港金鐘夏慤道16號).
// Completed: 1982.
// Architect: Wong & Ouyang (HK) Ltd. (王歐陽建築師事務所).
// Famous Nickname: "The Gold Bar Building" (金條大廈) due to its dazzling 24-karat gold reflective mirrored glass curtain wall.
// Height: 176.0m (41 storeys, 49 structural levels), roof crown 176m.
// OSM way: 107336261.
// Wikidata: Q11642127.
// Key Architectural Highlights:
// - Clad in 100% 24-karat gold reflective mirrored glass curtain wall (黃金反射鏡面幕牆), creating a dazzling shimmering landmark on Harcourt Road.
// - Chamfered rectangular tower geometry (八角切角棱鏡體量) with faceted corner bays.
// - 4-storey commercial retail podium with black polished granite colonnade, high-ceiling banking hall, and elevated pedestrian skybridge portals connecting to Lippo Centre, Admiralty MTR, and Queensway Plaza.
// - 37 office floor tiers with alternating golden ribbon vision glazing, metallic spandrels, and vertical gold anodized extruded mullions.
// - Stepped mechanical penthouse crown with golden acoustic louvres and illuminated building rooftop signage ("FAR EAST FINANCE CENTRE" / "遠東金融中心").

export const FAR_EAST_FINANCE_CENTRE_HERITAGE = Object.freeze({
  address: '香港金鐘夏慤道16號 (16 Harcourt Road, Admiralty, Hong Kong)',
  district: '中西區金鐘 (Admiralty, Central and Western District)',
  architects: 'Wong & Ouyang (HK) Ltd. (王歐陽建築師事務所)',
  completionYear: 1982,
  nickname: 'The Gold Bar Building (金條大廈)',
  style: 'Late Modernist Commercial High-Rise with 24K Gold Mirror Curtain Wall (晚期現代主義黃金幕牆摩天大廈)',
  wikidata: 'Q11642127',
  osmWay: 107336261,
  height: 176.0,
  storeys: 41,
  levels: 49
});

export const FAR_EAST_FINANCE_CENTRE_OSM_SOURCE = authoredOsmSource({
  id: 107336261,
  type: 'way',
  version: 8,
  tags: {
    building: 'commercial',
    'building:material': 'glass',
    'building:part:levels': '49',
    height: '176',
    layer: '1',
    name: '遠東金融中心 Far East Finance Centre',
    'name:en': 'Far East Finance Centre',
    'name:zh': '遠東金融中心',
    'name:zh-Hans': '远东金融中心',
    'name:zh-Hant': '遠東金融中心',
    wikidata: 'Q11642127',
    wikimedia_commons: 'Category:Far East Finance Centre'
  },
  geometry: [
    { lon: 114.1639136, lat: 22.2802312 },
    { lon: 114.1639923, lat: 22.2801714 },
    { lon: 114.1641961, lat: 22.2800163 },
    { lon: 114.1640505, lat: 22.2798524 },
    { lon: 114.163768, lat: 22.2800674 },
    { lon: 114.1638642, lat: 22.2801756 },
    { lon: 114.1639136, lat: 22.2802312 }
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

export const FAR_EAST_FINANCE_CENTRE_SITE = Object.freeze({
  name: '遠東金融中心 Far East Finance Centre',
  englishName: 'Far East Finance Centre',
  address: '金鐘夏慤道16號 16 Harcourt Road',
  osmType: 'way',
  osmId: FAR_EAST_FINANCE_CENTRE_OSM_SOURCE.id,
  source: FAR_EAST_FINANCE_CENTRE_OSM_SOURCE,
  ring: FAR_EAST_FINANCE_CENTRE_RING,
  bounds: FAR_EAST_FINANCE_CENTRE_BOUNDS,
  ...footprint,
  height: 176.0,
  storeys: 41,
  levels: 49,
  podiumHeight: 18.0,
  shaftHeight: 144.0,
  crownHeight: 14.0,
});

export function farEastFinanceCentreLocalToWorld(lx, lz) {
  const site = FAR_EAST_FINANCE_CENTRE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function farEastFinanceCentreWorldToLocal(wx, wz) {
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
    const pt = farEastFinanceCentreWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
