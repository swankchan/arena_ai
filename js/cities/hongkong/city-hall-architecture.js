// Hong Kong City Hall, Central: separately preserved OSM building, garden and site rings.
// The high and low blocks are not inferred from the large City Hall landuse polygon.  All upper
// elevations and landscape pieces below are photo-directed modelling controls, not surveyed drawings.
import {
  authoredOsmSource, makeAuthoredSite, makePhotoDirectedSite, authoredTerrainHeightAt,
  authoredLocalToWorld, authoredWorldToLocal,
} from './authored-landmark-site.js';
import {
  harbourCityEdgeFrame, harbourCityRoadRecords, harbourCityPointInRoadCorridor,
  harbourCityLocalCollider, harbourCitySegmentCollider,
} from './harbour-city-architecture.js';
import { pointInFlatRing } from './landmark-site.js';

const ll = (points) => points.map(([lon, lat, id]) => ({ lon, lat, ...(id ? { id } : {}) }));
const source = (value) => authoredOsmSource({
  ...value,
  evidence: value.evidence || 'Current OSM way geometry and tags retrieved from the OSM API; not a surveyed architectural drawing.',
});

export const CITY_HALL_HIGH_OSM_SOURCE = source({
  id: 25608273, version: 16, sourceTimestamp: '2025-01-22T03:29:37Z',
  tags: {
    'addr:housename': '香港大會堂 Hong Kong City Hall', 'addr:housename:en': 'Hong Kong City Hall', 'addr:housename:zh': '香港大會堂',
    'addr:housenumber': '5', 'addr:street': '愛丁堡廣場 Edinburgh Square', 'addr:street:en': 'Edinburgh Square', 'addr:street:zh': '愛丁堡廣場',
    'addr:unit': '高座 High Block', 'addr:unit:en': 'High Block', 'addr:unit:zh': '高座', building: 'civic', 'building:levels': '12',
    height: '57.7', historic: 'yes', name: '高座 High Block', 'name:en': 'High Block', 'name:zh': '高座', 'name:zh-Hans': '高座', 'name:zh-Hant': '高座',
  },
  geometry: ll([
    [114.1606236, 22.2821131, 279119397], [114.1606781, 22.2822964, 279119387], [114.1607901, 22.2822679, 1905582234],
    [114.1608141, 22.2822618, 11774406411], [114.1608186, 22.2822602, 11774406428], [114.1608400, 22.2822547, 1177097365],
    [114.1608845, 22.2822435, 11774406431], [114.1609942, 22.2822159, 279119388], [114.1609764, 22.2821527, 1177096444],
    [114.1609503, 22.2820653, 1177098178], [114.1609397, 22.2820326, 279119389], [114.1607597, 22.2820784, 11774406410],
    [114.1606236, 22.2821131, 279119397],
  ]),
});

export const CITY_HALL_LOW_OSM_SOURCE = source({
  id: 101959153, version: 8, sourceTimestamp: '2024-11-15T11:06:21Z',
  tags: {
    'addr:housename': '香港大會堂 Hong Kong City Hall', 'addr:housename:en': 'Hong Kong City Hall', 'addr:housename:zh': '香港大會堂',
    'addr:housenumber': '5', 'addr:street': '愛丁堡廣場 Edinburgh Square', 'addr:street:en': 'Edinburgh Square', 'addr:street:zh': '愛丁堡廣場',
    'addr:unit': '低座 Low Block', 'addr:unit:en': 'Low Block', 'addr:unit:zh': '低座', building: 'civic', 'building:levels': '3',
    height: '21.9', historic: 'yes', name: '低座 Low Block', 'name:en': 'Low Block', 'name:zh': '低座',
  },
  geometry: ll([
    [114.1613800, 22.2823916, 1177099484], [114.1614373, 22.2825819, 279119391], [114.1614455, 22.2826092, 11774406423],
    [114.1614696, 22.2826894, 1177099839], [114.1617197, 22.2826250, 11774418675], [114.1619652, 22.2825618, 1177096605],
    [114.1619509, 22.2825142, 1177099809], [114.1623576, 22.2824094, 279119392], [114.1622859, 22.2821715, 279119393],
    [114.1618201, 22.2822916, 11774406419], [114.1618043, 22.2822392, 279119394], [114.1617574, 22.2822513, 11774406420],
    [114.1617372, 22.2821807, 6481253422], [114.1617070, 22.2820746, 279119395], [114.1616460, 22.2820903, 1177096892],
    [114.1616126, 22.2819885, 11774406418], [114.1616055, 22.2819903, 1177096341], [114.1613300, 22.2820613, 279119390],
    [114.1614259, 22.2823798, 1177098226], [114.1613800, 22.2823916, 1177099484],
  ]),
});

// This is a separate unnamed one-storey service annexe, not the Low Block.  Keeping its own ring
// avoids the common error of inflating the low block or replacing the whole City Hall site with one box.
export const CITY_HALL_ANNEX_OSM_SOURCE = source({
  id: 101959243, version: 4, sourceTimestamp: '2024-10-11T03:43:57Z',
  tags: { building: 'yes', historic: 'yes' },
  geometry: ll([
    [114.1616055, 22.2819903, 1177096341], [114.1615800, 22.2819046, 1177099689], [114.1609503, 22.2820653, 1177098178],
    [114.1609764, 22.2821527, 1177096444], [114.1613300, 22.2820613, 279119390], [114.1616055, 22.2819903, 1177096341],
  ]),
  evidence: 'OSM way 101959243 is an unnamed historic building ring between the high and low blocks; modelled as the single-storey service annexe described in the heritage assessment, not as the Low Block.',
});

export const CITY_HALL_MEMORIAL_GARDEN_OSM_SOURCE = source({
  id: 46870356, version: 10, sourceTimestamp: '2026-07-29T06:26:24Z',
  tags: {
    'alt_name': '大會堂紀念花園 City Hall Memorial Garden', 'alt_name:en': 'City Hall Memorial Garden', 'alt_name:zh': '大會堂紀念花園',
    historic: 'yes', leisure: 'garden', name: '紀念花園 Memorial Garden', 'name:en': 'Memorial Garden', 'name:zh': '紀念花園',
    opening_hours: 'Mo-Su 07:30-22:30', wikidata: 'Q15914379',
  },
  geometry: ll([
    [114.1608498, 22.2822886, 1177098220], [114.1610121, 22.2828266, 10187790272], [114.1614192, 22.2827229, 598450380],
    [114.1613887, 22.2826178, 11774406436], [114.1613822, 22.2825955, 10187790270], [114.1614373, 22.2825819, 279119391],
    [114.1613800, 22.2823916, 1177099484], [114.1614259, 22.2823798, 1177098226], [114.1613300, 22.2820613, 279119390],
    [114.1609764, 22.2821527, 1177096444], [114.1609942, 22.2822159, 279119388], [114.1608845, 22.2822435, 11774406431],
    [114.1608400, 22.2822547, 1177097365], [114.1608498, 22.2822886, 1177098220],
  ]),
});

export const CITY_HALL_SITE_OSM_SOURCE = source({
  id: 101959040, version: 13, sourceTimestamp: '2026-10-01T12:55:32Z',
  tags: {
    'addr:housename': '香港大會堂 Hong Kong City Hall', 'addr:housename:en': 'Hong Kong City Hall', 'addr:housename:zh': '香港大會堂',
    'addr:housenumber': '5', 'addr:street': '愛丁堡廣場 Edinburgh Square', 'addr:street:en': 'Edinburgh Square', 'addr:street:zh': '愛丁堡廣場',
    alt_name: '大會堂 City Hall', 'alt_name:en': 'City Hall', 'alt_name:zh': '大會堂', amenity: 'arts_centre', heritage: '2', 'heritage:ref': '132',
    historic: 'yes', landmark: 'motor_vehicle', name: '香港大會堂 Hong Kong City Hall', 'name:en': 'Hong Kong City Hall', 'name:zh': '香港大會堂',
    operator: '康樂及文化事務署 Leisure and Cultural Services Department', 'operator:en': 'Leisure and Cultural Services Department',
    'operator:type': 'government', 'operator:wikidata': 'Q2353346', 'operator:zh': '康樂及文化事務署', protection_title: '法定古蹟 Declared Monument',
    'protection_title:en': 'Declared Monument', 'protection_title:wikidata': 'Q1939635', 'protection_title:zh': '法定古蹟', 'ref:hk': '132',
    'target:name': '香港 Hong Kong', 'target:name:en': 'Hong Kong', 'target:name:zh': '香港', 'target:place': 'state',
    website: 'https://www.lcsd.gov.hk/en/hkch/index.html', 'website:en': 'https://www.lcsd.gov.hk/en/hkch/index.html', 'website:zh': 'https://www.lcsd.gov.hk/tc/hkch/index.html',
  },
  geometry: ll([
    [114.1609745, 22.2828843, 1177097140], [114.1608305, 22.2824028, 1177096520], [114.1607901, 22.2822679, 1905582234],
    [114.1606781, 22.2822964, 279119387], [114.1606236, 22.2821131, 279119397], [114.1609397, 22.2820326, 279119389],
    [114.1609503, 22.2820653, 1177098178], [114.1615800, 22.2819046, 1177099689], [114.1616862, 22.2818627, 11774418670],
    [114.1617543, 22.2818465, 11889285865], [114.1618204, 22.2818298, 1177098067], [114.1621826, 22.2817375, 1177096957],
    [114.1622128, 22.2817281, 1177097017], [114.1623523, 22.2821350, 11889285867], [114.1623200, 22.2821447, 1177099411],
    [114.1622819, 22.2821549, 11774418671], [114.1622859, 22.2821715, 279119393], [114.1623576, 22.2824094, 279119392],
    [114.1619509, 22.2825142, 1177099809], [114.1619652, 22.2825618, 1177096605], [114.1619749, 22.2825953, 9093772113],
    [114.1619586, 22.2825995, 11774406467], [114.1619698, 22.2826359, 1177097401], [114.1618896, 22.2826560, 11774418679],
    [114.1618169, 22.2826742, 11777974364], [114.1618229, 22.2826951, 11889285860], [114.1618395, 22.2827531, 11777974363],
    [114.1616948, 22.2827894, 11777974362], [114.1616780, 22.2827311, 11889285859], [114.1616718, 22.2827093, 11777974361],
    [114.1614580, 22.2827620, 10187790273], [114.1609745, 22.2828843, 1177097140],
  ]),
});

// The overall site contains small service ways.  They remain road-priority even though the civic
// construction pad is shared by the buildings and garden.  No carriageway is moved to fit a landmark.
export const CITY_HALL_SITE_ROAD_IDS = Object.freeze([
  38490, 39207, 43721, 43722, 43723, 43724, 43725, 43726, 43727, 43728,
  43729, 43730, 43731, 43732, 43733, 43734, 50058, 50059,
]);

export const CITY_HALL_SITE = makeAuthoredSite(
  'cityHall', '香港大會堂 Hong Kong City Hall', 'Hong Kong City Hall', CITY_HALL_SITE_OSM_SOURCE,
  { role: 'site', roadIds: CITY_HALL_SITE_ROAD_IDS, evidence: 'Overall City Hall site way 101959040 is used for the civic ground/plaza audit only; it is not a single building footprint.' },
);
export const CITY_HALL_HIGH_SITE = makeAuthoredSite(
  'cityHallHighBlock', '香港大會堂高座 High Block', 'Hong Kong City Hall High Block', CITY_HALL_HIGH_OSM_SOURCE,
  { height: 57.7, levels: 12, role: 'building', evidence: 'Exact OSM way 25608273 High Block ring; 57.7 m and 12 levels are source tags. Facade bays, roof plant and external stair are photo-directed.' },
);
export const CITY_HALL_LOW_SITE = makeAuthoredSite(
  'cityHallLowBlock', '香港大會堂低座 Low Block', 'Hong Kong City Hall Low Block', CITY_HALL_LOW_OSM_SOURCE,
  { height: 21.9, levels: 3, role: 'building', evidence: 'Exact OSM way 101959153 Low Block L-shaped ring; 21.9 m and 3 levels are source tags. Granite, glass bands and diamond-screen details are photo-directed.' },
);
export const CITY_HALL_ANNEX_SITE = makeAuthoredSite(
  'cityHallServiceAnnex', '大會堂附屬建築 City Hall Service Annexe', 'Hong Kong City Hall Service Annexe', CITY_HALL_ANNEX_OSM_SOURCE,
  { height: 4.2, levels: 1, role: 'building', evidence: 'Exact unnamed OSM way 101959243; one-storey service-annexe height and vents are visual estimates, not OSM height tags.' },
);
export const CITY_HALL_MEMORIAL_GARDEN_SITE = makeAuthoredSite(
  'cityHallMemorialGarden', '紀念花園 Memorial Garden', 'City Hall Memorial Garden', CITY_HALL_MEMORIAL_GARDEN_OSM_SOURCE,
  { role: 'garden', evidence: 'Exact OSM way 46870356 Memorial Garden ring; lawn, paths, sculpture and shrine placement are photo-directed within the garden.' },
);

export const CITY_HALL_BUILDING_SITES = Object.freeze([CITY_HALL_HIGH_SITE, CITY_HALL_LOW_SITE, CITY_HALL_ANNEX_SITE]);
export const CITY_HALL_GROUND_SITES = Object.freeze([CITY_HALL_SITE]);
export const CITY_HALL_GROUND_RINGS = Object.freeze([CITY_HALL_SITE.ring]);
export const CITY_HALL_HIGH_HEIGHT = 57.7, CITY_HALL_LOW_HEIGHT = 21.9, CITY_HALL_ANNEX_HEIGHT = 4.2;
export const CITY_HALL_HIGH_LEVELS = 12, CITY_HALL_LOW_LEVELS = 3;
export const CITY_HALL_OPENING_DATE = '1962-03-02', CITY_HALL_DECLARED_MONUMENT_YEAR = 2022;
export const CITY_HALL_MEMORIAL_SHRINE_SIDES = 12, CITY_HALL_MEMORIAL_SHRINE_HEIGHT = 4.8;

function sourceEntrance(site, nodeId, name, evidence) {
  const index = site.source.geometry.findIndex((point) => point.id === nodeId);
  if (index < 0 || index >= site.localRing.length / 2 - 1) throw new Error(`Missing ${name} source node ${nodeId}`);
  return harbourCityEdgeFrame(site, index, name, evidence, 0);
}
export const CITY_HALL_HIGH_MAIN_ENTRANCE = sourceEntrance(
  CITY_HALL_HIGH_SITE, 11774406410, 'City Hall High Block Edinburgh Square entrance',
  'OSM node 11774406410 is tagged entrance=yes on High Block way 25608273; the canopy and stair are photo-directed around this real source node.',
);
export const CITY_HALL_HIGH_SECOND_ENTRANCE = sourceEntrance(
  CITY_HALL_HIGH_SITE, 11774406411, 'City Hall High Block garden-side entrance',
  'OSM node 11774406411 is also tagged entrance=yes on High Block way 25608273; its smaller doorway and canopy are photo-directed around the real source vertex.',
);
export const CITY_HALL_LOW_MAIN_ENTRANCE = sourceEntrance(
  CITY_HALL_LOW_SITE, 11774418675, 'City Hall Low Block garden-side entrance',
  'OSM node 11774418675 is tagged entrance=yes on Low Block way 101959153; the doorway, canopy and accessible arrival are photo-directed around this real source node.',
);
export const CITY_HALL_LOW_SECOND_ENTRANCE = sourceEntrance(
  CITY_HALL_LOW_SITE, 11774406423, 'City Hall Low Block memorial-garden entrance',
  'OSM node 11774406423 is tagged entrance=yes on the Low Block source ring; no additional invented OSM door is claimed.',
);
// These two link thresholds are photo-directed, not falsely promoted to OSM entrance=yes nodes.
// They lie on the facing High Block east and Low Block west source edges and define the covered link endpoints.
export const CITY_HALL_HIGH_GARDEN_LINK = harbourCityEdgeFrame(
  CITY_HALL_HIGH_SITE, 6, 'City Hall High Block covered-link threshold',
  'Photo-directed covered-walkway threshold on the source High Block east edge; no OSM entrance node is claimed.', .78,
);
export const CITY_HALL_LOW_GARDEN_LINK = harbourCityEdgeFrame(
  CITY_HALL_LOW_SITE, 17, 'City Hall Low Block covered-link threshold',
  'Photo-directed covered-walkway threshold on the source Low Block west edge; no OSM entrance node is claimed.', .55,
);

// The shrine is visible in the AMO/LCSD garden photographs.  Its centre is a deliberately labelled
// photo-directed placement (the OSM garden way has no shrine footprint), not a fabricated OSM node.
export const CITY_HALL_SHRINE_WORLD = Object.freeze({ x: 160.75, z: -60.05 });
const shrineRing = [];
for (let i = 0; i <= CITY_HALL_MEMORIAL_SHRINE_SIDES; i += 1) {
  const angle = Math.PI / 12 + i / CITY_HALL_MEMORIAL_SHRINE_SIDES * Math.PI * 2;
  shrineRing.push(CITY_HALL_SHRINE_WORLD.x + Math.cos(angle) * 3.048, CITY_HALL_SHRINE_WORLD.z + Math.sin(angle) * 3.048);
}
export const CITY_HALL_SHRINE_SITE = makePhotoDirectedSite(
  'cityHallMemorialShrine', '大會堂紀念神龕 City Hall Memorial Shrine', shrineRing,
  'Photo-directed twelve-sided Memorial Shrine within OSM Memorial Garden way 46870356; the garden source has no separate shrine footprint or surveyed centre. The 20-foot diameter is from the AMO heritage appraisal.',
  { height: CITY_HALL_MEMORIAL_SHRINE_HEIGHT, role: 'memorial' },
);

export function cityHallRoadRecords(site) { return harbourCityRoadRecords(site); }
export function cityHallPointInRoadCorridor(site, x, z, margin = .35) { return harbourCityPointInRoadCorridor(site, x, z, margin); }
export function cityHallTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt(CITY_HALL_GROUND_SITES, x, z, rawHeight, padHeight);
}
export function cityHallGroundHeightAt(x, z, ground, padHeight) { return cityHallTerrainHeightAt(x, z, ground, padHeight); }
export function cityHallLocalToWorld(site, x, z) { return authoredLocalToWorld(site, x, z); }
export function cityHallWorldToLocal(site, x, z) { return authoredWorldToLocal(site, x, z); }
export function cityHallLocalCollider(site, x, z, w, d, minY, maxY, ry = site.ry) {
  return harbourCityLocalCollider(site, x, z, w, d, minY, maxY, ry);
}
export function cityHallSegmentCollider(site, edge, t0, t1, minY, maxY, depth = .5) {
  return harbourCitySegmentCollider(site, edge, t0, t1, minY, maxY, depth);
}
export function cityHallRingColliders(site, minY, maxY, depth = .5) {
  const colliders = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) colliders.push(cityHallSegmentCollider(site, edge, 0, 1, minY, maxY, depth));
  return colliders;
}
function distanceToRing(ring, x, z) {
  let distance = Infinity;
  for (let i = 2; i < ring.length; i += 2) {
    const ax = ring[i - 2], az = ring[i - 1], dx = ring[i] - ax, dz = ring[i + 1] - az;
    const lengthSq = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    distance = Math.min(distance, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return distance;
}
export function cityHallLampConflictAt(x, z) {
  if (x < CITY_HALL_SITE.bounds.minX - 1 || x > CITY_HALL_SITE.bounds.maxX + 1 || z < CITY_HALL_SITE.bounds.minZ - 1 || z > CITY_HALL_SITE.bounds.maxZ + 1) return false;
  for (const site of CITY_HALL_BUILDING_SITES) if (pointInFlatRing(site.ring, x, z) || distanceToRing(site.ring, x, z) < .55) return true;
  return pointInFlatRing(CITY_HALL_SHRINE_SITE.ring, x, z) || distanceToRing(CITY_HALL_SHRINE_SITE.ring, x, z) < .55;
}

// Legacy generic-lot mode also reserves the complete civic site. Test both lot corners and source vertices so
// a large generated rectangle cannot straddle a source footprint merely because its centre is outside the ring.
export function cityHallGenericLotConflict(lot) {
  const b = CITY_HALL_SITE.bounds, margin = 1;
  if (lot.x + lot.w * .5 < b.minX - margin || lot.x - lot.w * .5 > b.maxX + margin || lot.z + lot.d * .5 < b.minZ - margin || lot.z - lot.d * .5 > b.maxZ + margin) return false;
  const cs = Math.cos(lot.ry || 0), sn = Math.sin(lot.ry || 0), hx = lot.w * .5, hz = lot.d * .5;
  for (const u of [-hx, hx]) for (const v of [-hz, hz]) {
    const x = lot.x + cs * u + sn * v, z = lot.z - sn * u + cs * v;
    if (pointInFlatRing(CITY_HALL_SITE.ring, x, z)) return true;
  }
  for (let i = 0; i < CITY_HALL_SITE.ring.length; i += 2) {
    const dx = CITY_HALL_SITE.ring[i] - lot.x, dz = CITY_HALL_SITE.ring[i + 1] - lot.z;
    const u = cs * dx - sn * dz, v = sn * dx + cs * dz;
    if (Math.abs(u) <= hx && Math.abs(v) <= hz) return true;
  }
  return pointInFlatRing(CITY_HALL_SITE.ring, lot.x, lot.z);
}

export const CITY_HALL_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://www.amo.gov.hk/en/historic-buildings/monuments/hong-kong-island/monuments_132/index.html', publisher: 'Antiquities and Monuments Office', evidence: 'Official monument overview: City Hall opened on 1962-03-02, was declared a monument in 2022, and comprises High Block, Low Block and Memorial Garden connected by covered walkways. The twelve-sided Memorial Shrine and modernist white/plaster, granite and glass character direct the model.' }),
  Object.freeze({ url: 'https://www.lcsd.gov.hk/en/hkch/aboutus/photogallery/asketchofthecityhall.html', publisher: 'Leisure and Cultural Services Department — City Hall photo gallery', evidence: 'Official aerial, High Block, Low Block, spiral-stair, covered-walkway and Memorial Garden photographs were reviewed for the white window grid, horizontal low-block mass, external stairs, lawn, paving, shrine and sculpture. Photographs are research references only and are not redistributed as textures.' }),
  Object.freeze({ url: 'https://www.legco.gov.hk/yr2022/english/brief/devbcho1bcr141_20220520-e.pdf', publisher: 'Legislative Council / Development Bureau heritage assessment', evidence: 'The assessment describes the L-shaped Low Block, granite cladding, north-facing window bands, west-facing diamond windows, modular High Block facade, whitewashed concrete and a single-storey service annexe. These details are separated from OSM footprint and height tags.' }),
  Object.freeze({ url: 'https://2024.bodwinthecity.com/en/design-spots/hong-kong-city-hall', publisher: 'BODW in the City', evidence: 'Design-spot research identifies Gordon Brown, Ron Phillips and Alan Fitch and describes granite, glass and whitewashed concrete; used as material corroboration, not as a measured facade schedule.' }),
]);
