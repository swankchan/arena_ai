// 美國銀行中心（Bank of America Tower, 12 Harcourt Road, Admiralty, 1977）地盤與建築規範
// Renderer-independent geometry, georeferencing and historical architectural data.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 12 Harcourt Road, Admiralty, Hong Kong (香港金鐘夏慤道12號).
// Completed: 1977.
// Height: 146.0m (38 storeys), roof crown 146m.
// OSM relation: 17045256 (outer way 107328020).
// Wikidata: Q4856046.
// Key Architectural Highlights:
// - Parallelogram/trapezoidal plan oriented along Harcourt Road and Lambeth Walk.
// - Bronze-tinted reflective curtain wall with dark bronze/champagne anodized aluminium spandrels and vertical mullions.
// - 4-storey commercial podium with retail banking hall and elevated pedestrian skybridge connections linking Cheung Kong Center II, Lippo Centre, and Far East Finance Centre.
// - 34 office floor tiers with warm scattered interior office illumination at night.
// - Rooftop mechanical penthouse crown with illuminated "Bank of America" corporate logo sign facing Victoria Harbour.

export const BANK_OF_AMERICA_TOWER_HERITAGE = Object.freeze({
  address: '香港金鐘夏慤道12號 (12 Harcourt Road, Admiralty, Hong Kong)',
  district: '中西區金鐘 (Admiralty, Central and Western District)',
  completionYear: 1977,
  currentName: 'Bank of America Tower (美國銀行中心)',
  style: 'Late Modernist Commercial Landmark (晚期現代主義商業大廈)',
  osmRelation: 17045256,
  osmWay: 107328020,
  wikidata: 'Q4856046',
  height: 146.0,
  storeys: 38
});

export const BANK_OF_AMERICA_TOWER_OSM_SOURCE = authoredOsmSource({
  id: 107328020,
  type: 'way',
  version: 8,
  tags: {
    building: 'commercial',
    'building:levels': '38',
    height: '146',
    'addr:street': '夏慤道 Harcourt Road',
    'addr:housenumber': '12',
    name: '美國銀行中心 Bank of America Tower',
    'name:en': 'Bank of America Tower',
    'name:zh': '美國銀行中心',
    'name:zh-Hans': '美国银行中心',
    'name:zh-Hant': '美國銀行中心',
    wikidata: 'Q4856046',
    wikimedia_commons: 'Category:Bank of America Tower (Hong Kong)'
  },
  geometry: [
    { lon: 114.1627241, lat: 22.2804801 },
    { lon: 114.1631902, lat: 22.2803533 },
    { lon: 114.1633327, lat: 22.2808277 },
    { lon: 114.1632106, lat: 22.2808608 },
    { lon: 114.1632411, lat: 22.2809649 },
    { lon: 114.1628702, lat: 22.2810609 },
    { lon: 114.1627905, lat: 22.2807941 },
    { lon: 114.1627068, lat: 22.2805135 },
    { lon: 114.1627241, lat: 22.2804801 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const BANK_OF_AMERICA_TOWER_RING = Object.freeze(
  BANK_OF_AMERICA_TOWER_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(BANK_OF_AMERICA_TOWER_RING);
export const BANK_OF_AMERICA_TOWER_BOUNDS = Object.freeze(flatRingBounds(BANK_OF_AMERICA_TOWER_RING));

let signedArea = 0;
for (let i = 0; i + 3 < BANK_OF_AMERICA_TOWER_RING.length; i += 2) {
  signedArea += BANK_OF_AMERICA_TOWER_RING[i] * BANK_OF_AMERICA_TOWER_RING[i + 3] -
    BANK_OF_AMERICA_TOWER_RING[i + 2] * BANK_OF_AMERICA_TOWER_RING[i + 1];
}
export const BANK_OF_AMERICA_TOWER_RING_AREA = Math.abs(signedArea * 0.5);

export const BANK_OF_AMERICA_TOWER_SITE = Object.freeze({
  name: '美國銀行中心 Bank of America Tower',
  englishName: 'Bank of America Tower',
  address: '金鐘夏慤道12號 12 Harcourt Road',
  osmType: 'relation',
  osmId: 17045256,
  source: BANK_OF_AMERICA_TOWER_OSM_SOURCE,
  ring: BANK_OF_AMERICA_TOWER_RING,
  bounds: BANK_OF_AMERICA_TOWER_BOUNDS,
  ...footprint,
  height: 146.0,
  storeys: 38,
  podiumHeight: 16.0,
  shaftHeight: 118.0,
  crownHeight: 12.0
});

export function bankOfAmericaTowerLocalToWorld(lx, lz) {
  const site = BANK_OF_AMERICA_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function bankOfAmericaTowerWorldToLocal(wx, wz) {
  const site = BANK_OF_AMERICA_TOWER_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const BANK_OF_AMERICA_TOWER_LOCAL_RING = Object.freeze(
  BANK_OF_AMERICA_TOWER_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = bankOfAmericaTowerWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
