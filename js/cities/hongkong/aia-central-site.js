// 友邦金融中心（AIA Central, 1 Connaught Road Central, 2005）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 1 Connaught Road Central, Central, Hong Kong (香港中環干諾道中1號).
// Completed: 2005.
// Original Name: AIG Tower, renamed AIA Central in 2009.
// Architects: Skidmore, Owings & Merrill (SOM) & Aedas.
// Architectural Concept: Inspired by the billowing sails of traditional Chinese junk boats gliding in Victoria Harbour (中式風帆造型).
// Height: 185.0m (35 storeys, 40 structural levels), roof crown 185m.
// OSM way: 107324767.
// Wikidata: Q841968.
// Key Architectural Highlights:
// - Aerodynamic curved junk-sail profile with dramatic sloping prow crown.
// - Silver-blue reflective high-performance curtain wall with horizontal sunshade louvres and vertical stainless steel pinstripes.
// - 3-storey high-transparency glass lobby facing Chater Garden, Statue Square, and Victoria Harbour.
// - Integrated covered vehicle drop-off loop and porte-cochère.
// - Illuminated sloping prow crown and red aviation obstruction warning beacons.

export const AIA_CENTRAL_HERITAGE = Object.freeze({
  address: '香港中環干諾道中1號 (1 Connaught Road Central, Central, Hong Kong)',
  district: '中西區中環 (Central, Central and Western District)',
  architects: 'Skidmore, Owings & Merrill (SOM) & Aedas',
  completionYear: 2005,
  originalName: 'AIG Tower (友邦保險大廈)',
  currentName: 'AIA Central (友邦金融中心)',
  concept: 'Chinese Junk Sail (中式古帆船風帆造型)',
  style: 'Late Modernist Aerodynamic Skyscraper (晚期現代流線型摩天大樓)',
  wikidata: 'Q841968',
  osmWay: 107324767,
  height: 185.0,
  storeys: 35,
  levels: 40
});

export const AIA_CENTRAL_OSM_SOURCE = authoredOsmSource({
  id: 107324767,
  type: 'way',
  version: 8,
  tags: {
    building: 'yes',
    'building:levels': '40',
    height: '185',
    layer: '1',
    name: '友邦金融中心 AIA Central',
    'name:en': 'AIA Central',
    'name:zh': '友邦金融中心',
    'name:zh-Hans': '友邦金融中心',
    'name:zh-Hant': '友邦金融中心',
    wikidata: 'Q841968',
    wikimedia_commons: 'Category:AIA Central',
    wikipedia: 'en:AIA Central'
  },
  geometry: [
    { lon: 114.16198, lat: 22.2811095 },
    { lon: 114.1619605, lat: 22.2811147 },
    { lon: 114.1619507, lat: 22.2810838 },
    { lon: 114.1619216, lat: 22.2810916 },
    { lon: 114.1615825, lat: 22.2811833 },
    { lon: 114.1616897, lat: 22.2815227 },
    { lon: 114.1617461, lat: 22.2815075 },
    { lon: 114.1617518, lat: 22.2815253 },
    { lon: 114.1620635, lat: 22.2814411 },
    { lon: 114.162083, lat: 22.2814358 },
    { lon: 114.16198, lat: 22.2811095 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const AIA_CENTRAL_RING = Object.freeze(
  AIA_CENTRAL_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(AIA_CENTRAL_RING);
export const AIA_CENTRAL_BOUNDS = Object.freeze(flatRingBounds(AIA_CENTRAL_RING));

let signedArea = 0;
for (let i = 0; i + 3 < AIA_CENTRAL_RING.length; i += 2) {
  signedArea += AIA_CENTRAL_RING[i] * AIA_CENTRAL_RING[i + 3] -
    AIA_CENTRAL_RING[i + 2] * AIA_CENTRAL_RING[i + 1];
}
export const AIA_CENTRAL_RING_AREA = Math.abs(signedArea * 0.5);

export const AIA_CENTRAL_SITE = Object.freeze({
  name: '友邦金融中心 AIA Central',
  englishName: 'AIA Central',
  address: '中環干諾道中1號 1 Connaught Road Central',
  osmType: 'way',
  osmId: AIA_CENTRAL_OSM_SOURCE.id,
  source: AIA_CENTRAL_OSM_SOURCE,
  ring: AIA_CENTRAL_RING,
  bounds: AIA_CENTRAL_BOUNDS,
  ...footprint,
  height: 185.0,
  storeys: 35,
  levels: 40,
  lobbyHeight: 14.0,
  crownHeight: 25.0
});

export function aiaCentralLocalToWorld(lx, lz) {
  const site = AIA_CENTRAL_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function aiaCentralWorldToLocal(wx, wz) {
  const site = AIA_CENTRAL_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const AIA_CENTRAL_LOCAL_RING = Object.freeze(
  AIA_CENTRAL_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = aiaCentralWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
