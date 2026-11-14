// iSQUARE 國際廣場, 63 Nathan Road, Tsim Sha Tsui (retail podium, 130m).
//
// iSQUARE is a retail and office development on Nathan Road in Tsim Sha Tsui,
// comprising a 22-level retail/office podium block with glass curtain wall.
// Note: preliminary road-collision scan detected 1 service-road vertex inside
// the OSM ring (road id 777727201). Zero-collision constraint applies before
// proceeding to world.js; see road-collision scan output.
//
// OSM Relation: 15829461 (outer way 777727202, 130m, 22 levels).
// WARNING: OSM relation 15829461 is a multipolygon, not a single way.
import {
  authoredOsmSource, makeAuthoredSite, projectHongKongLonLat,
  HK_METRES_PER_LON, HK_METRES_PER_LAT
} from './authored-landmark-site.js';
import { pointInFlatRing, minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Historical and architectural provenance:
// Address: 63 Nathan Road, Tsim Sha Tsui, Kowloon, Hong Kong (香港尖沙咀彌敦道63號).
// Height: 130.0m (22 levels, incl. 3 underground per OSM tags).
// OSM Relation: 15829461 (multipolygon; outer way 777727202).
// Wikidata: Q3010006.
// Key Architectural Highlights:
// - Retail podium fronting Nathan Road with glass curtain wall.
// - 22-level commercial block integrated with adjacent hotel and residential towers.
// - Prominent waterfront-adjacent position near Star Ferry and Harbour City.
//
// NOTE: geometry below is the outer way 777727202 ring extracted from OSM relation
// 15829461. This is a relation (multipolygon), not a standalone way; the site key
// uses the relation ID as osmId for provenance tracking.

export const I_SQUARE_HERITAGE = Object.freeze({
  address: '香港尖沙咀彌敦道63號 (63 Nathan Road, Tsim Sha Tsui, Kowloon, Hong Kong)',
  district: '油尖旺區尖沙咀 (Tsim Sha Tsui, Yau Tsim Mong District)',
  completionYear: null,
  currentName: 'iSQUARE (國際廣場 iSQUARE)',
  architect: null,
  developer: null,
  style: 'Contemporary Retail Podium (當代零售裙樓)',
  osmRelation: 15829461,
  osmWay: 777727202,
  wikidata: 'Q3010006',
  height: 130.0,
  storeys: 22
});

export const I_SQUARE_OSM_SOURCE = authoredOsmSource({
  id: 15829461,
  type: 'relation',
  version: null,
  tags: {
    building: 'retail',
    'building:levels': '22',
    'building:levels:underground': '3',
    'building:material': 'glass',
    height: '130',
    'addr:housename': 'iSQUARE',
    'addr:housename:en': 'iSQUARE',
    'addr:housename:zh': 'iSQUARE',
    'addr:housenumber': '63',
    'addr:street': '彌敦道 Nathan Road',
    'addr:street:en': 'Nathan Road',
    'addr:street:wikidata': 'Q2188138',
    'addr:street:zh': '彌敦道',
    mall: 'separate',
    name: 'iSQUARE',
    'name:en': 'iSQUARE',
    'name:zh': 'iSQUARE',
    'official_name': '國際廣場 iSQUARE',
    'official_name:en': 'iSQUARE',
    'official_name:zh': '國際廣場',
    type: 'multipolygon',
    website: 'https://www.isquare.hk/',
    wikidata: 'Q3010006',
    wikimedia_commons: 'Category:ISQUARE',
    wikipedia: 'en:ISQUARE'
  },
  geometry: [
    { lon: 114.1716222, lat: 22.2973934 },
    { lon: 114.1720291, lat: 22.297417 },
    { lon: 114.1720349, lat: 22.2973326 },
    { lon: 114.1720366, lat: 22.2973076 },
    { lon: 114.1720383, lat: 22.2972825 },
    { lon: 114.1720493, lat: 22.2971199 },
    { lon: 114.172057, lat: 22.2970063 },
    { lon: 114.1720633, lat: 22.2969137 },
    { lon: 114.172071, lat: 22.2968 },
    { lon: 114.1720724, lat: 22.2967793 },
    { lon: 114.1720738, lat: 22.2967585 },
    { lon: 114.1720843, lat: 22.2966037 },
    { lon: 114.1719486, lat: 22.2965958 },
    { lon: 114.1716773, lat: 22.29658 },
    { lon: 114.1716563, lat: 22.2968901 },
    { lon: 114.1716507, lat: 22.2969728 },
    { lon: 114.1716394, lat: 22.2971397 },
    { lon: 114.1716362, lat: 22.297191 },
    { lon: 114.1716222, lat: 22.2973934 }
  ]
});

const KX = HK_METRES_PER_LON, KY = HK_METRES_PER_LAT;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];

export const I_SQUARE_RING = Object.freeze(
  I_SQUARE_OSM_SOURCE.geometry.flatMap(({ lon, lat }) => project(lon, lat))
);

const footprint = minimumAreaObb(I_SQUARE_RING);
export const I_SQUARE_BOUNDS = Object.freeze(flatRingBounds(I_SQUARE_RING));

let signedArea = 0;
for (let i = 0; i + 3 < I_SQUARE_RING.length; i += 2) {
  signedArea += I_SQUARE_RING[i] * I_SQUARE_RING[i + 3] -
    I_SQUARE_RING[i + 2] * I_SQUARE_RING[i + 1];
}
export const I_SQUARE_RING_AREA = Math.abs(signedArea * 0.5);

export const I_SQUARE_SITE = Object.freeze({
  ...makeAuthoredSite('iSquare', 'iSQUARE', 'iSQUARE', I_SQUARE_OSM_SOURCE, {
    height: 130.0,
    levels: 22
  }),
  podiumHeight: null,
  shaftHeight: null,
  crownHeight: null
});

export function iSquareLocalToWorld(lx, lz) {
  const site = I_SQUARE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return {
    x: site.x + cs * lx + sn * lz,
    z: site.z - sn * lx + cs * lz
  };
}

export function iSquareWorldToLocal(wx, wz) {
  const site = I_SQUARE_SITE;
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const dx = wx - site.x, dz = wz - site.z;
  return {
    x: dx * cs - dz * sn,
    z: dx * sn + dz * cs
  };
}

export const I_SQUARE_LOCAL_RING = Object.freeze(
  I_SQUARE_RING.flatMap((val, idx, arr) => {
    if (idx % 2) return [];
    const pt = iSquareWorldToLocal(val, arr[idx + 1]);
    return [pt.x, pt.z];
  })
);
