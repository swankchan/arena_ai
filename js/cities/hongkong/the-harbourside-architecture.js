// The Harbourside, 1 Austin Road West, Union Square / Kowloon Station.
// Three 74-storey, 255 m undulating residential towers connected at high levels by sky corridors facing Victoria Harbour.
import {
  authoredOsmSource, makeAuthoredSite, authoredTerrainHeightAt, worldRingFromGeometry,
} from './authored-landmark-site.js';

export const HARBOURSIDE_ID = 'HK-KLN-HARBOURSIDE';
export const HARBOURSIDE_NAME = '君臨天下 The Harbourside';
export const HARBOURSIDE_HEIGHT = 255;
export const HARBOURSIDE_LEVELS = 74;
export const HARBOURSIDE_MIN_HEIGHT = 20;
export const HARBOURSIDE_PODIUM_HEIGHT = 20;
export const HARBOURSIDE_GROUND_SOFFIT = 6.8;
export const HARBOURSIDE_VISUAL_COURSES = 70;
export const HARBOURSIDE_CROWN_HEIGHT = 12;
export const HARBOURSIDE_VEHICLE_CLEARANCE = 4.7;

export const HARBOURSIDE_RESEARCH = Object.freeze({
  estateSummary: 'https://www.hanglung.com/en-us/properties/residential/the-harbourside',
  architect: 'P & T Architects & Engineers Ltd (巴馬丹拿)',
  completionYear: 2004,
  developer: 'Hang Lung Properties & MTR Corporation (Union Square Phase 4)',
  photographicEvidence: 'Inspected harbour-facing exterior and podium drop-off photographs: three interconnected wave-like residential towers, champagne-gold and bronze spandrels, panoramic curved bay windows, aquamarine reflective glazing, multi-storey glass sky corridors linking Towers 1-2 and Towers 2-3 at levels 42-65 framing grand sky voids, and aerodynamic swept crown fins up to 255 m.',
  sourceConvention: 'OSM ways 1047822854, 1047822853 and 1047822852 supply exact tower footprints, height 255 m, 74 levels, min_height 20 m. High-level sky corridors and podium drop-off are photo-directed and stay strictly within source height limits.',
});

const points = (values) => values.map(([lon, lat]) => ({ lon, lat }));

// OSM Way 1047822854 — 第1座 Tower 1
const tower1Geometry = points([
  [114.1623024,22.3030085],[114.1623111,22.3029462],[114.1621846,22.302931],
  [114.1621872,22.3028976],[114.162015,22.3028862],[114.1620124,22.3029197],
  [114.1618795,22.3029176],[114.1618821,22.3029804],[114.1619881,22.3029822],
  [114.1619899,22.3030406],[114.1618846,22.3030389],[114.1618874,22.3031064],
  [114.162087,22.3031095],[114.1622849,22.3031332],[114.1622943,22.3030664],
  [114.1621938,22.3030544],[114.1621991,22.3029962],[114.1623024,22.3030085],
]);

// OSM Way 1047822853 — 第2座 Tower 2
const tower2Geometry = points([
  [114.1618821,22.3029804],[114.1618795,22.3029176],[114.161741,22.3029297],
  [114.1617355,22.3028966],[114.1615649,22.3029209],[114.1615704,22.3029541],
  [114.1614401,22.3029791],[114.161458,22.3030402],[114.1615617,22.30302],
  [114.1615775,22.3030766],[114.1614744,22.3030967],[114.1614934,22.3031619],
  [114.1616887,22.3031239],[114.1618874,22.3031064],[114.1618846,22.3030389],
  [114.1617796,22.3030481],[114.1617707,22.3029902],[114.1618821,22.3029804],
]);

// OSM Way 1047822852 — 第3座 Tower 3
const tower3Geometry = points([
  [114.161458,22.3030402],[114.1614401,22.3029791],[114.161415,22.3029868],
  [114.1613084,22.3030198],[114.1613082,22.3030194],[114.161295,22.3029886],
  [114.1611345,22.3030473],[114.1611478,22.3030785],[114.1610376,22.3031253],
  [114.1610659,22.3031825],[114.1611551,22.3031446],[114.1611841,22.3031966],
  [114.1610922,22.3032356],[114.1611224,22.3032969],[114.1613038,22.3032198],
  [114.1614934,22.3031619],[114.1614744,22.3030967],[114.1613743,22.3031273],
  [114.1613518,22.3030727],[114.161458,22.3030402],
]);

// Podium & Estate footprint enclosing all 3 towers and Austin Road West entrance driveway
const podiumGeometry = points([
  [114.16238,22.30282],[114.16238,22.30318],[114.16188,22.30322],[114.16148,22.30326],
  [114.16100,22.30335],[114.16096,22.30306],[114.16144,22.30288],[114.16188,22.30282],
  [114.16238,22.30282],
]);

export const HARBOURSIDE_PODIUM_ROAD_IDS = Object.freeze([39405, 42619, 47297]);

export const HARBOURSIDE_T1_SOURCE = authoredOsmSource({
  id: 1047822854,
  tags: {
    name: '第1座 Tower 1', 'name:en': 'Tower 1', 'name:zh': '第1座',
    'addr:housename': '君臨天下 The Harbourside', 'addr:unit': '第1座 Tower 1', ref: 'T1',
    building: 'apartments', 'building:levels': '74', 'building:min_level': '4',
    height: '255', min_height: '20', location: 'podium', podium: 'bulk', start_date: '2004',
  },
  geometry: tower1Geometry,
  evidence: 'OSM way 1047822854, 74 storeys, 255 m height, min_height 20 m.',
});

export const HARBOURSIDE_T2_SOURCE = authoredOsmSource({
  id: 1047822853,
  tags: {
    name: '第2座 Tower 2', 'name:en': 'Tower 2', 'name:zh': '第2座',
    'addr:housename': '君臨天下 The Harbourside', 'addr:unit': '第2座 Tower 2', ref: 'T2',
    building: 'apartments', 'building:levels': '74', 'building:min_level': '4',
    height: '255', min_height: '20', location: 'podium', podium: 'bulk', start_date: '2004',
  },
  geometry: tower2Geometry,
  evidence: 'OSM way 1047822853, 74 storeys, 255 m height, min_height 20 m.',
});

export const HARBOURSIDE_T3_SOURCE = authoredOsmSource({
  id: 1047822852,
  tags: {
    name: '第3座 Tower 3', 'name:en': 'Tower 3', 'name:zh': '第3座',
    'addr:housename': '君臨天下 The Harbourside', 'addr:unit': '第3座 Tower 3', ref: 'T3',
    building: 'apartments', 'building:levels': '74', 'building:min_level': '4',
    height: '255', min_height: '20', location: 'podium', podium: 'bulk', start_date: '2004',
  },
  geometry: tower3Geometry,
  evidence: 'OSM way 1047822852, 74 storeys, 255 m height, min_height 20 m.',
});

export const HARBOURSIDE_PODIUM_SOURCE = authoredOsmSource({
  id: 104782285001,
  tags: {
    name: '君臨天下 基座 The Harbourside Podium',
    'addr:housename': '君臨天下 The Harbourside',
    building: 'retail', 'building:levels': '4', height: '20', location: 'ground',
  },
  geometry: podiumGeometry,
  evidence: 'Photo-directed four-level podium and arrival driveway on Austin Road West matching Union Square podium height.',
});

export const HARBOURSIDE_SITE = makeAuthoredSite('the-harbourside', HARBOURSIDE_NAME, 'The Harbourside', HARBOURSIDE_PODIUM_SOURCE, {
  height: HARBOURSIDE_HEIGHT, levels: HARBOURSIDE_LEVELS, minHeight: 0, role: 'estate', roadIds: HARBOURSIDE_PODIUM_ROAD_IDS,
});

export const HARBOURSIDE_PODIUM_SITE = makeAuthoredSite('the-harbourside-podium', '君臨天下 基座', 'The Harbourside Podium', HARBOURSIDE_PODIUM_SOURCE, {
  height: HARBOURSIDE_PODIUM_HEIGHT, levels: 4, minHeight: 0, role: 'podium', roadIds: HARBOURSIDE_PODIUM_ROAD_IDS,
});

export const HARBOURSIDE_T1_SITE = makeAuthoredSite('the-harbourside-t1', '君臨天下 第1座', 'The Harbourside Tower 1', HARBOURSIDE_T1_SOURCE, {
  height: HARBOURSIDE_HEIGHT, levels: HARBOURSIDE_LEVELS, minHeight: HARBOURSIDE_MIN_HEIGHT, role: 'residential-tower', roadIds: [],
});

export const HARBOURSIDE_T2_SITE = makeAuthoredSite('the-harbourside-t2', '君臨天下 第2座', 'The Harbourside Tower 2', HARBOURSIDE_T2_SOURCE, {
  height: HARBOURSIDE_HEIGHT, levels: HARBOURSIDE_LEVELS, minHeight: HARBOURSIDE_MIN_HEIGHT, role: 'residential-tower', roadIds: [],
});

export const HARBOURSIDE_T3_SITE = makeAuthoredSite('the-harbourside-t3', '君臨天下 第3座', 'The Harbourside Tower 3', HARBOURSIDE_T3_SOURCE, {
  height: HARBOURSIDE_HEIGHT, levels: HARBOURSIDE_LEVELS, minHeight: HARBOURSIDE_MIN_HEIGHT, role: 'residential-tower', roadIds: [],
});

export const HARBOURSIDE_TOWER_SITES = Object.freeze([
  HARBOURSIDE_T1_SITE, HARBOURSIDE_T2_SITE, HARBOURSIDE_T3_SITE,
]);

export const HARBOURSIDE_GROUND_SITES = Object.freeze([
  HARBOURSIDE_SITE, HARBOURSIDE_PODIUM_SITE, ...HARBOURSIDE_TOWER_SITES,
]);

export const HARBOURSIDE_GROUND_RINGS = Object.freeze(
  HARBOURSIDE_GROUND_SITES.map((site) => site.ring)
);

// High-level sky corridor link dimensions connecting the towers
export const HARBOURSIDE_SKY_LINKS = Object.freeze([
  Object.freeze({
    id: 'link-1-2',
    name: 'Tower 1 – Tower 2 Sky Corridor',
    // Midpoint between T1 and T2
    x: (HARBOURSIDE_T1_SITE.x + HARBOURSIDE_T2_SITE.x) / 2,
    z: (HARBOURSIDE_T1_SITE.z + HARBOURSIDE_T2_SITE.z) / 2,
    width: 14, depth: 16,
    soffit: 148, top: 218, courses: 20,
  }),
  Object.freeze({
    id: 'link-2-3',
    name: 'Tower 2 – Tower 3 Sky Corridor',
    // Midpoint between T2 and T3
    x: (HARBOURSIDE_T2_SITE.x + HARBOURSIDE_T3_SITE.x) / 2,
    z: (HARBOURSIDE_T2_SITE.z + HARBOURSIDE_T3_SITE.z) / 2,
    width: 14, depth: 16,
    soffit: 148, top: 218, courses: 20,
  }),
]);

export const HARBOURSIDE_MAIN_ENTRANCE = Object.freeze({
  x: (HARBOURSIDE_T1_SITE.x + HARBOURSIDE_T3_SITE.x) / 2,
  z: HARBOURSIDE_SITE.bounds.maxZ,
  width: 22, projection: 6.2,
});

export function theHarboursideTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt(HARBOURSIDE_GROUND_SITES, x, z, rawHeight, padHeight);
}
