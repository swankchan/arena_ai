// Hong Kong International Airport, Chek Lap Kok: renderer-independent provenance and geometry.
// OSM rings are simplified source geometry for real-time use; upper architecture is photo-directed procedural work.
import {
  authoredOsmSource, makeAuthoredSite, makePhotoDirectedSite, projectHongKongLonLat,
  flatRingArea,
} from './authored-landmark-site.js';
import { pointInFlatRing } from './landmark-site.js';
import { harbourCityPointInRoadCorridor } from './harbour-city-architecture.js';

export const AIRPORT_ID = 'HK-ISL-CHEK-LAP-KOK';
export const AIRPORT_RETRIEVED = '2026-11-06';
const lonLat = (pairs) => pairs.map(([lon, lat]) => ({ lon, lat }));
function source(id, tags, pairs, threshold, evidence) {
  return authoredOsmSource({
    type: 'way', id, tags, geometry: lonLat(pairs),
    evidence: `${evidence} Nominatim polygon_threshold=${threshold}; OSM way identity is preserved for real-time rendering, not represented as a surveyed architectural drawing.`,
  });
}

const T1_SOURCE = source(772085062, {
  aeroway: 'terminal', building: 'transportation', 'building:levels': '6', 'building:levels:underground': '2',
  'roof:shape': 'round', 'roof:colour': 'silver', usage: 'main', start_date: '1998-07-06',
}, [
  [113.9229624,22.3149086],[113.9265737,22.313273],[113.9268987,22.3123769],[113.9253783,22.3094165],
  [113.9259876,22.3096251],[113.9277156,22.3129419],[113.9332472,22.3147132],[113.9331537,22.3145624],
  [113.9344914,22.3139342],[113.9345809,22.3140987],[113.9352597,22.3122702],[113.9357136,22.3124189],
  [113.9351474,22.3139379],[113.9365951,22.3143999],[113.9354731,22.3174935],[113.9340071,22.317016],
  [113.9335363,22.3183111],[113.9330591,22.3181652],[113.9337604,22.3162986],[113.9335842,22.3163859],
  [113.932956,22.3152258],[113.9331345,22.3150864],[113.9277745,22.3133581],[113.9275836,22.3133024],
  [113.9235847,22.3151091],[113.9229624,22.3149086],
], 0.00005, 'Terminal 1 source outline; Y-concourse and processor researched through NAPCO, HKIE and exterior/interior photographs.');

const T2_SOURCE = source(1204348925, {
  aeroway: 'terminal', building: 'transportation', start_date: '2026-05-27', ref: 'T2',
}, [
  [113.9370355,22.3176859],[113.937161,22.3173394],[113.9379945,22.3150465],[113.9380751,22.3148279],
  [113.9382905,22.3148969],[113.9385465,22.314979],[113.9399928,22.3154362],[113.9396742,22.3162926],
  [113.9396548,22.3163449],[113.9396351,22.3163977],[113.9389358,22.3182779],[113.9372289,22.3177471],
  [113.9370355,22.3176859],
], 0, 'Expanded Terminal 2 source outline; feather roof, skylights and tree columns researched through Aedas/AECOM and current exterior photographs.');

const MIDFIELD_SOURCE = source(393009711, {
  aeroway: 'terminal', building: 'transportation', 'building:levels': '4', 'building:levels:underground': '3',
  'roof:shape': 'round', usage: 'branch', ref: 'T1',
}, [
  [113.9164254,22.313096],[113.9174377,22.3103396],[113.9173955,22.310238],[113.9171126,22.3100572],
  [113.9171409,22.3099563],[113.917232,22.309925],[113.9173405,22.3095964],[113.9172899,22.30956],
  [113.9173438,22.3094399],[113.9176362,22.3094604],[113.9177802,22.3093878],[113.9185884,22.3072442],
  [113.9190839,22.3071349],[113.9181637,22.3096092],[113.9182999,22.3097378],[113.9181007,22.3102859],
  [113.9178719,22.3103524],[113.9168965,22.3130154],[113.9164254,22.313096],
], 0.00003, 'T1 Midfield Concourse source outline; glazing, rooflights and inclined mega-columns researched through Aedas photographs.');

const SATELLITE_SOURCE = source(155502514, {
  aeroway: 'terminal', building: 'transportation', 'building:levels': '2', 'roof:shape': 'wave', usage: 'branch', ref: 'T1',
}, [
  [113.9296359,22.3175963],[113.9300271,22.3165837],[113.930808,22.3168393],[113.9304169,22.3178545],
  [113.9296359,22.3175963],
], 0.00002, 'T1 Satellite Concourse source outline; wave roof and Sky Bridge relationship researched from current airport sources.');

const SOUTH_TOWER_SOURCE = source(393439479, {
  man_made: 'tower', service: 'aircraft_control', building: 'office',
}, [
  [113.9212438,22.3106466],[113.9212494,22.3106189],[113.9212646,22.3105944],[113.9213161,22.3105657],
  [113.9213757,22.310573],[113.9214163,22.3106113],[113.9214247,22.3106374],[113.9214133,22.31069],
  [113.9213698,22.3107255],[113.9213412,22.3107318],[113.9212851,22.3107185],[113.9212627,22.3106993],
  [113.9212484,22.3106744],[113.9212438,22.3106466],
], 0.000005, 'South Air Traffic Control Tower source footprint; shaft and green glazed cab are photo-directed.');

export const AIRPORT_TERMINAL_ONE_SITE = makeAuthoredSite(
  'airportT1', '香港國際機場一號客運大樓', 'Hong Kong International Airport Terminal 1', T1_SOURCE,
  { height: 45, levels: 6, roadIds: [30544,30727,30871,31184,32178,33069,33070,33071,33072,33074,33081,33266,33267,33269,33311,33483,33484,33504,33505,33506,35159,35160,35161,35162], evidence: '45 m presentation height is photo-directed; OSM supplies six above-ground levels, not an engineering roof elevation.' },
);
export const AIRPORT_TERMINAL_TWO_SITE = makeAuthoredSite(
  'airportT2', '香港國際機場二號客運大樓', 'Hong Kong International Airport Terminal 2', T2_SOURCE,
  { height: 42, levels: 6, roadIds: [35195,35301], evidence: 'Feather-roof presentation height is photo-directed; current expanded-terminal identity and opening are cross-checked with AAHK.' },
);
export const AIRPORT_MIDFIELD_SITE = makeAuthoredSite(
  'airportMidfield', '一號客運大樓中場客運廊', 'T1 Midfield Concourse', MIDFIELD_SOURCE,
  { height: 32, levels: 4, roadIds: [33249,33251,33252,33253,33509,33510,34493], evidence: 'Four above-ground levels follow OSM; curved roof and mega-column proportions are photo-directed.' },
);
export const AIRPORT_SATELLITE_SITE = makeAuthoredSite(
  'airportSatellite', '一號客運大樓衛星客運廊', 'T1 Satellite Concourse', SATELLITE_SOURCE,
  { height: 24, levels: 2, roadIds: [33141,33271,33272], evidence: 'Two levels and wave-roof identity follow OSM; roof profile is photo-directed.' },
);
export const AIRPORT_SOUTH_TOWER_SITE = makeAuthoredSite(
  'airportSouthTower', '機場南航空交通控制塔', 'South Air Traffic Control Tower', SOUTH_TOWER_SOURCE,
  { height: 86, levels: null, evidence: '86 m is a photo-directed presentation height, not a surveyed tower elevation.' },
);

// T1's source OBB is almost exactly parallel to all three runways and the Midfield, so it is the shared airport frame.
export const AIRPORT_FRAME = Object.freeze({
  x: AIRPORT_TERMINAL_ONE_SITE.x, z: AIRPORT_TERMINAL_ONE_SITE.z, ry: AIRPORT_TERMINAL_ONE_SITE.ry,
});
export function airportWorldToLocal(x, z) {
  const dx = x - AIRPORT_FRAME.x, dz = z - AIRPORT_FRAME.z, cs = Math.cos(AIRPORT_FRAME.ry), sn = Math.sin(AIRPORT_FRAME.ry);
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export function airportLocalToWorld(x, z) {
  const cs = Math.cos(AIRPORT_FRAME.ry), sn = Math.sin(AIRPORT_FRAME.ry);
  return { x: AIRPORT_FRAME.x + x * cs + z * sn, z: AIRPORT_FRAME.z - x * sn + z * cs };
}
export function airportLocalRing(points, close = true) {
  const ring = points.flatMap(([x, z]) => { const p = airportLocalToWorld(x, z); return [p.x, p.z]; });
  if (close && ring.length >= 4 && (ring[0] !== ring.at(-2) || ring[1] !== ring.at(-1))) ring.push(ring[0], ring[1]);
  return Object.freeze(ring);
}

// CAD verifies 102 m and the NAT's T2-Concourse context. No exact public OSM tower ring was found, so the base is
// explicitly photo-directed beside the northern end of the source T2 Concourse rather than masquerading as OSM geometry.
export const AIRPORT_NAT_SITE = makePhotoDirectedSite(
  'airportNAT', '機場新航空交通控制塔',
  airportLocalRing([[-557,-2007],[-523,-2007],[-523,-1973],[-557,-1973],[-557,-2007]]),
  '102 m height: CAD 2024–25 report. Position/base: photo-directed beside the northern end of T2 Concourse (OSM way 775198090 context); no exact OSM NAT footprint is claimed.',
  { height: 102, role: 'tower' },
);

export const AIRPORT_BUILDING_SITES = Object.freeze([
  AIRPORT_TERMINAL_ONE_SITE, AIRPORT_TERMINAL_TWO_SITE, AIRPORT_MIDFIELD_SITE,
  AIRPORT_SATELLITE_SITE, AIRPORT_SOUTH_TOWER_SITE, AIRPORT_NAT_SITE,
]);
export const AIRPORT_TERRAIN_SITES = AIRPORT_BUILDING_SITES;

export function airportTerrainHeightAt(sites, padHeights, x, z, rawHeight) {
  let height = rawHeight;
  for (const site of sites) {
    const b = site.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ || !pointInFlatRing(site.ring, x, z)) continue;
    if (harbourCityPointInRoadCorridor(site, x, z)) continue;
    height = Math.max(height, padHeights[site.key] ?? rawHeight);
  }
  return height;
}

export const AIRPORT_T1_VAULT_LAYOUT = Object.freeze({
  processor: 72, central: 21, northwestArm: 18, southwestArm: 18, total: 129,
  evidence: 'HKIE verifies 129 parallel barrel vaults. 72/21/18/18 is a visual module distribution, not original structural BIM.',
});
export const AIRPORT_T1_VOLUMES = Object.freeze({
  processor: Object.freeze({ minX: 338, maxX: 656, minZ: -345, maxZ: 345 }),
  central: Object.freeze({ minX: -270, maxX: 338, minZ: -23, maxZ: 23 }),
  northwestArm: Object.freeze({ from: [-270, 0], to: [-625, -315], width: 94 }),
  southwestArm: Object.freeze({ from: [-270, 0], to: [-625, 315], width: 94 }),
});

function runway(id, name, aLon, aLat, bLon, bLat, extra = {}) {
  const aw = projectHongKongLonLat(aLon, aLat), bw = projectHongKongLonLat(bLon, bLat);
  const sourceA = airportWorldToLocal(...aw), sourceB = airportWorldToLocal(...bw);
  const dx = sourceB.x - sourceA.x, dz = sourceB.z - sourceA.z, sourceLength = Math.hypot(dx, dz);
  const cx = (sourceA.x + sourceB.x) * .5, cz = (sourceA.z + sourceB.z) * .5, ux = dx / sourceLength, uz = dz / sourceLength;
  // AirportGuide endpoints establish position/heading; AAHK's official 3,800 m dimension resolves endpoint rounding.
  const a = { x: cx - ux * 1900, z: cz - uz * 1900 }, b = { x: cx + ux * 1900, z: cz + uz * 1900 };
  const aWorld = airportLocalToWorld(a.x, a.z), bWorld = airportLocalToWorld(b.x, b.z);
  return Object.freeze({
    id, name, a, b, aWorld, bWorld, sourceA, sourceB, sourceLength,
    width: 60, officialLength: 3800, length: 3800,
    sourceUrl: 'https://airportguide.com/airport/info/HKG', ...extra,
  });
}
export const AIRPORT_RUNWAYS = Object.freeze([
  runway('07L-25R', 'North Runway 07L/25R', 113.880692,22.321074, 113.915558,22.332306, { thresholds: ['07L','25R'], alignment: 74 }),
  runway('07C-25C', 'Centre Runway 07C/25C', 113.89600372314,22.31040000915, 113.93099975585,22.32159996032, { thresholds: ['07C','25C'], alignment: 71, displaced: [565,580] }),
  runway('07R-25L', 'South Runway 07R/25L', 113.898003,22.2962, 113.932819,22.307431, { thresholds: ['07R','25L'], alignment: 71, displaced: [525,0] }),
]);

// Principal visual taxiway geometry in the shared runway frame. This is not an operational ground-movement chart.
export const AIRPORT_TAXIWAYS = Object.freeze([
  { id: 'centre-terminal', points: [[-3700,-520],[360,-520]], width: 38 },
  { id: 'centre-north', points: [[-3700,-1010],[360,-1010]], width: 38 },
  { id: 'south-terminal', points: [[-3700,520],[300,520]], width: 38 },
  { id: 'south-outer', points: [[-3700,1030],[300,1030]], width: 38 },
  { id: 'north-inner', points: [[-4500,-2190],[-760,-2190]], width: 38 },
  { id: 'north-outer', points: [[-4500,-2640],[-760,-2640]], width: 38 },
  { id: 'centre-west-link', points: [[-3445,-774],[-3300,-680],[-3150,-520]], width: 34 },
  { id: 'centre-east-link', points: [[370,-774],[220,-680],[80,-520]], width: 34 },
  { id: 'south-west-link', points: [[-3765,770],[-3500,650],[-3300,520]], width: 34 },
  { id: 'south-east-link', points: [[33,770],[-150,650],[-300,520]], width: 34 },
  { id: 'north-west-link', points: [[-4549,-2417],[-4300,-2300],[-4100,-2190]], width: 34 },
  { id: 'north-east-link', points: [[-746,-2416],[-900,-2300],[-1080,-2190]], width: 34 },
  { id: 'midfield-link', points: [[-1500,-520],[-1500,-300],[-1500,300],[-1500,520]], width: 32 },
  { id: 't1-satellite-link', points: [[130,-520],[130,-410],[250,-220],[340,0],[340,520]], width: 32 },
]);
export const AIRPORT_APRON_RECTS = Object.freeze([
  { id: 't1-apron', minX: -720, maxX: 650, minZ: -555, maxZ: 555 },
  { id: 'midfield-apron', minX: -1760, maxX: -950, minZ: -360, maxZ: 360 },
  { id: 't2-apron', minX: 690, maxX: 1100, minZ: -300, maxZ: 300 },
]);
export const AIRPORT_SURFACE_OFFSETS = Object.freeze({ apron: .012, taxiway: .032, runway: .045, marking: .075 });

function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
}
export function airportSurfaceAtLocal(x, z) {
  for (const runway of AIRPORT_RUNWAYS) {
    if (segmentDistance(x, z, [runway.a.x,runway.a.z], [runway.b.x,runway.b.z]) <= runway.width * .5) return 'runway';
  }
  for (const taxiway of AIRPORT_TAXIWAYS) for (let i = 1; i < taxiway.points.length; i++) {
    if (segmentDistance(x, z, taxiway.points[i - 1], taxiway.points[i]) <= taxiway.width * .5) return 'taxiway';
  }
  for (const rect of AIRPORT_APRON_RECTS) if (x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ) return 'apron';
  return null;
}
export function airportSurfaceHeightAt(x, z, groundHeight) {
  const local = airportWorldToLocal(x, z), surface = airportSurfaceAtLocal(local.x, local.z);
  return surface ? groundHeight + AIRPORT_SURFACE_OFFSETS[surface] : groundHeight;
}

// Gate heading is in the airport-local frame: model nose is local -z. All positions are visual stand placements.
const gates = [];
for (const x of [-210,-105,0,105,210]) for (const side of [-1,1]) {
  gates.push({ id: `T1-${x}-${side < 0 ? 'N' : 'S'}`, terminal: 'T1', axis: 'z', x, z: side * 82, heading: side < 0 ? Math.PI : 0, terminalEdge: side * 24 });
}
// The Midfield source is perpendicular to the runways: its gates line the east/west edges, not the runway-facing edges.
for (const z of [-290,-170,-50,70,190,290]) for (const side of [-1,1]) {
  gates.push({ id: `Midfield-${z}-${side < 0 ? 'W' : 'E'}`, terminal: 'Midfield', axis: 'x', x: side < 0 ? -1490 : -1205, z,
    heading: side < 0 ? -Math.PI / 2 : Math.PI / 2, terminalEdge: side < 0 ? -1402 : -1315 });
}
gates.push({ id: 'Satellite-N', terminal: 'Satellite', axis: 'z', x: 135, z: -460, heading: Math.PI, terminalEdge: -402 });
export const AIRPORT_GATES = Object.freeze(gates.map(Object.freeze));

export const AIRPORT_RESEARCH = Object.freeze({
  attribution: '© OpenStreetMap contributors, ODbL 1.0; AAHK; CAD; HKIE; Aedas; AECOM; AirportGuide.',
  sourceConvention: 'OSM/source coordinates locate the airport and buildings. Roofs, facades, gates, taxiways and NAT base are explicitly procedural/photo-directed. DTM heights are not surveyed engineering elevations.',
  noPhotoTextures: true,
});
export { flatRingArea };
