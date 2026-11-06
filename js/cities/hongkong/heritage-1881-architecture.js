// 1881 Heritage / Former Marine Police Headquarters Compound, 2A Canton Road.
// OSM supplies the compound, layered retail podium and hotel main-building rings.
// The Round House, typhoon mast, courtyard fittings and verandah detail are photo-directed.
import {
  authoredOsmSource, makeAuthoredSite, makePhotoDirectedSite, worldRingFromGeometry,
  authoredTerrainHeightAt, authoredWorldToLocal, authoredLocalToWorld,
} from './authored-landmark-site.js';
import { pointInFlatRing } from './landmark-site.js';

export const HERITAGE_1881_ID = 'HK-TST-1881';
export const HERITAGE_1881_NAME = '1881 Heritage／前水警總部';
export const HERITAGE_1881_RESEARCH = Object.freeze({
  monument: 'https://www.amo.gov.hk/en/historic-buildings/monuments/kowloon/monuments_51/index.html',
  architecture: 'https://fpf.ccidahk.gov.hk/en/location/detail.php?id=1546',
  timeBall: 'https://www.cityintime.hk/en/article/tsim-sha-tsui-kowloon-park-drive-ca-1900/',
  photographicEvidence: 'Daylight main facade, courtyard terraces and Round House photographs were inspected; no photograph is used as a texture.',
  currentMainBuilding: 'The Antiquities and Monuments Office records that the original two-storey Main Building gained a third storey in the 1920s. Three galleries are therefore authored despite the stale OSM building:levels=2 tag.',
  signalTower: 'The Round House is at the south-west of the compound. Its independent surveyed OSM footprint was not available; the small ring below is explicitly photo/site-directed and kept inside the source compound.',
});

const points = (values) => values.map(([lon, lat]) => ({ lon, lat }));
const compoundGeometry = points([
  [114.1694145,22.295828],[114.1694544,22.2956259],[114.169563,22.2950749],
  [114.169577,22.2950036],[114.16959,22.2949377],[114.1696075,22.2948493],
  [114.1696172,22.2948001],[114.169656,22.2946031],[114.1700812,22.2946772],
  [114.170105,22.2946814],[114.1701961,22.2946973],[114.1702391,22.2947048],
  [114.1703587,22.2947256],[114.1703928,22.2947374],[114.1704233,22.2947557],
  [114.1704488,22.2947797],[114.170468,22.2948082],[114.1704802,22.2948399],
  [114.1704846,22.2948733],[114.1704811,22.2949068],[114.1704395,22.2950557],
  [114.1704759,22.2950644],[114.1702114,22.2959101],[114.1697384,22.2958614],
  [114.1695239,22.2958393],[114.1694145,22.295828],
]);
const mallGeometry = points([
  [114.1694145,22.295828],[114.1694262,22.2957687],[114.169563,22.2950749],
  [114.1695678,22.2950704],[114.1695819,22.2950619],[114.169602,22.2950557],
  [114.1696231,22.2950549],[114.16965,22.2950845],[114.169703,22.2951294],
  [114.1697392,22.2951528],[114.1697618,22.2951676],[114.1698255,22.2951984],
  [114.1698835,22.295217],[114.1699006,22.2952439],[114.1699241,22.2952663],
  [114.1699526,22.2952829],[114.1699847,22.2952927],[114.1700183,22.2952951],
  [114.1700516,22.2952901],[114.1700827,22.2952779],[114.1701097,22.2952592],
  [114.1701311,22.2952351],[114.1701773,22.295228],[114.1702273,22.2952149],
  [114.1702313,22.2951928],[114.1702424,22.2951729],[114.1702595,22.2951572],
  [114.1702803,22.2951472],[114.1703034,22.2951435],[114.1703267,22.2951462],
  [114.170348,22.2951553],[114.1704255,22.2950725],[114.1704405,22.2950849],
  [114.1704441,22.2950907],[114.1704456,22.2950972],[114.1704451,22.2951038],
  [114.1704425,22.29511],[114.1703986,22.295155],[114.1704113,22.2951792],
  [114.1704173,22.2952056],[114.1704161,22.2952325],[114.1704061,22.2952619],
  [114.1703876,22.2952876],[114.1703622,22.2953075],[114.1703317,22.2953201],
  [114.1702987,22.2953244],[114.1702492,22.2956962],[114.1702415,22.2957085],
  [114.1702289,22.2957072],[114.1702165,22.295706],[114.1701864,22.2959075],
  [114.1697384,22.2958614],[114.1695239,22.2958393],[114.1694145,22.295828],
]);
const hotelOuterGeometry = points([
  [114.1697126,22.295725],[114.169744,22.295443],[114.1697625,22.2954448],
  [114.169766,22.2954128],[114.1697361,22.29541],[114.1697428,22.2953498],
  [114.1697727,22.2953526],[114.1697757,22.2953262],[114.1698395,22.2953323],
  [114.1698366,22.2953587],[114.1701376,22.2953875],[114.1701405,22.295361],
  [114.1702044,22.2953671],[114.1702014,22.2953936],[114.1702314,22.2953964],
  [114.1702246,22.2954566],[114.1701947,22.2954537],[114.1701858,22.2955341],
  [114.1701518,22.2958393],[114.1700091,22.2958256],[114.1700045,22.2958668],
  [114.1698612,22.2958531],[114.1698657,22.295812],[114.1697231,22.2957983],
  [114.1697311,22.2957267],[114.1697126,22.295725],
]);
const hotelInnerGeometry = points([
  [114.1698361,22.2957323],[114.1700557,22.2957533],[114.1700711,22.2956157],
  [114.1700302,22.2956118],[114.1700404,22.2955202],[114.1699025,22.2955071],
  [114.1698923,22.2955986],[114.1698514,22.2955947],[114.1698361,22.2957323],
]);

export const HERITAGE_1881_COMPOUND_SOURCE = authoredOsmSource({
  type: 'way', id: 184553178, geometry: compoundGeometry,
  tags: {
    tourism: 'attraction', area: 'yes', heritage: '2', name: '1881 Heritage',
    'name:en': '1881 Heritage', 'name:zh': '1881',
    'alt_name:en': 'Former Marine Police Headquarters Compound',
    website: 'https://www.1881heritage.com/', wikidata: 'Q5470101', wikipedia: 'zh:1881',
  },
  evidence: 'OSM compound boundary; not a building footprint and not proof of a surveyed internal level datum.',
});
export const HERITAGE_1881_MALL_SOURCE = authoredOsmSource({
  type: 'way', id: 184553177, geometry: mallGeometry,
  tags: { shop: 'mall', name: '1881 Heritage', building: 'yes', 'building:levels': '3', height: '12', layer: '2' },
  evidence: 'OSM layered retail podium footprint. layer=2 is stacking order, never an elevation in metres.',
});
export const FWD_HOUSE_1881_SOURCE = authoredOsmSource({
  type: 'relation', id: 2460795, geometry: hotelOuterGeometry, innerGeometry: [hotelInnerGeometry],
  tags: {
    tourism: 'hotel', name: '富衛1881公館 FWD House 1881', 'name:en': 'FWD House 1881',
    'name:zh': '富衛1881公館', building: 'hotel', 'building:levels': '2', height: '26', layer: '3',
    'addr:housenumber': '2A', 'addr:street': 'Canton Road', wikidata: 'Q115967234',
  },
  evidence: 'OSM multipolygon outer and inner courtyard rings. The current three-storey condition is independently supported by AMO and photographs.',
});

export const HERITAGE_1881_COMPOUND = makeAuthoredSite(
  'heritage-1881-compound', HERITAGE_1881_NAME, '1881 Heritage Compound', HERITAGE_1881_COMPOUND_SOURCE,
  { role: 'compound' },
);
export const HERITAGE_1881_MALL = makeAuthoredSite(
  'heritage-1881-mall', '1881商場平台', '1881 Heritage Retail Terraces', HERITAGE_1881_MALL_SOURCE,
  { height: 12, levels: 3, role: 'retail-podium' },
);
export const FWD_HOUSE_1881 = makeAuthoredSite(
  'fwd-house-1881', '富衛1881公館主樓', 'FWD House 1881 Main Building', FWD_HOUSE_1881_SOURCE,
  { height: 26, levels: 2, role: 'heritage-main-building' },
);
export const FWD_HOUSE_1881_INNER_RING = worldRingFromGeometry(FWD_HOUSE_1881_SOURCE.innerGeometry[0]);

export const HERITAGE_1881_HEIGHTS = Object.freeze({
  sourceMallHeight: 12,
  sourceHotelHeightTag: 26,
  sourceHotelLevelsTag: 2,
  currentMainGalleries: 3,
  podiumSoffit: 3.65,
  terraceDatum: 12,
  mainRoofDatum: 26,
  signalTowerBase: 12,
  signalTowerBodyHeight: 8.4,
  timeBallDiameter: 1.83,
  note: 'The 26 m source tag is retained as the overall main-building scene datum above the shared construction pad, not added to the 12 m podium. This is an explicit modelling convention, not a surveyed OSM elevation.',
});

const roundHouseRing = [];
for (let i = 0; i <= 40; i++) {
  const angle = i / 40 * Math.PI * 2;
  roundHouseRing.push(1040 + Math.cos(angle) * 5.2, -1450 + Math.sin(angle) * 5.2);
}
export const ROUND_HOUSE_1881 = makePhotoDirectedSite(
  '1881-round-house', '大包米訊號塔 Round House', roundHouseRing,
  'Photo/site-directed south-west Round House platform inside way 184553178; no independent surveyed OSM tower footprint is claimed.',
  { height: 25.1, levels: 2, role: 'signal-tower' },
);
export const HERITAGE_1881_MAIN_STAIR = Object.freeze({
  site: FWD_HOUSE_1881, sourceEdge: 9, width: 14, topZ: 25.55, bottomZ: 44.6,
  rise: 12, steps: 36, evidence: 'Photo-directed central courtyard staircase on the Main Building south axis.',
});
export const ROUND_HOUSE_CURVED_STAIR = Object.freeze({
  x: 1040, z: -1450, innerRadius: 5.35, outerRadius: 8, startAngle: Math.PI * 0.15,
  sweep: Math.PI * 1.5, rise: 12, steps: 72,
  evidence: 'Photo-directed curved exterior stair around the Round House bastion; entirely contained by the compound ring.',
});
export const HERITAGE_1881_COURTYARD_RING = Object.freeze((() => {
  const ring = [];
  for (const [x, z] of [[-7,26.5],[7,26.5],[7,33.5],[-7,33.5],[-7,26.5]]) {
    const point = authoredLocalToWorld(FWD_HOUSE_1881, x, z); ring.push(point.x, point.z);
  }
  return ring;
})());

// No retained HK_FULL_ROADS centre vertex intersects the compound, mall or Main Building. These are record indices, not OSM IDs.
export const HERITAGE_1881_GROUND_SITES = Object.freeze([HERITAGE_1881_COMPOUND, HERITAGE_1881_MALL, FWD_HOUSE_1881]);

export const HERITAGE_1881_TERRAIN_RULE = Object.freeze({
  datum: 'DTM-derived shared compound construction pad; road corridors retain their original road-aware ground.',
  padMethod: 'rawHongKongTerrainHeight(x,z) sampled at source centres and vertices; no engineering survey claim',
  verticalConvention: HERITAGE_1881_HEIGHTS.note,
});

export function heritage1881TerrainHeightAt(x, z, ground, padHeight) {
  return authoredTerrainHeightAt(HERITAGE_1881_GROUND_SITES, x, z, ground, padHeight);
}

// Walkable ground follows the actual central steps, upper retail terraces, Main Building courtyard and curved Round House stair.
// The simple-world caller keeps this entire query road-priority; there are no retained carriageway vertices inside these rings.
export function heritage1881GroundHeightAt(x, z, ground, padHeight) {
  const local = authoredWorldToLocal(FWD_HOUSE_1881, x, z), stair = HERITAGE_1881_MAIN_STAIR;
  if (Math.abs(local.x) <= stair.width * 0.5 + 1e-6 && local.z >= stair.topZ - 1e-6 && local.z <= stair.bottomZ + 1e-6) {
    const t = Math.max(0, Math.min(1, (local.z - stair.topZ) / (stair.bottomZ - stair.topZ)));
    const step = Math.min(stair.steps - 1, Math.floor(t * stair.steps));
    return padHeight + stair.rise * (1 - step / stair.steps);
  }
  const curved = ROUND_HOUSE_CURVED_STAIR, dx = x - curved.x, dz = z - curved.z, radius = Math.hypot(dx, dz);
  if (radius < curved.innerRadius) return padHeight + curved.rise;
  if (radius <= curved.outerRadius) {
    let angle = Math.atan2(dz, dx); if (angle < 0) angle += Math.PI * 2;
    const rawProgress = (angle - curved.startAngle) / curved.sweep;
    if (rawProgress >= -1e-9 && rawProgress <= 1 + 1e-9) {
      const progress = Math.max(0, Math.min(1, rawProgress));
      const step = Math.min(curved.steps - 1, Math.floor(progress * curved.steps));
      return padHeight + curved.rise * (step + 1) / curved.steps;
    }
  }
  if (pointInFlatRing(FWD_HOUSE_1881_INNER_RING, x, z)) return padHeight + HERITAGE_1881_HEIGHTS.terraceDatum;
  if (pointInFlatRing(HERITAGE_1881_MALL.ring, x, z)
    && !pointInFlatRing(FWD_HOUSE_1881.ring, x, z)
    && !pointInFlatRing(HERITAGE_1881_COURTYARD_RING, x, z)) return padHeight + HERITAGE_1881_HEIGHTS.terraceDatum;
  return ground;
}
