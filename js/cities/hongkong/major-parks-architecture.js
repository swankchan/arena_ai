import { HK_MAJOR_PARKS } from '../../hk-major-parks-data.js';
import { minimumAreaObb, pointInFlatRing, flatRingBounds } from './landmark-site.js';
import { harbourCityLocalToWorld, harbourCityWorldToLocal } from './harbour-city-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';

// Renderer-independent geography, research and ground rules for the three authored parks.
// OSM rings are exact source geometry. Photo-directed objects are explicitly marked and never
// presented as surveyed boundaries. All heights are sampled from the same traceable DTM as the
// rest of Hong Kong; construction pads are scene datums, not engineering elevations.
export const MAJOR_PARK_RETRIEVED = '2026-11-06';
export const MAJOR_PARK_BASE_OFFSET = .055;
export const MAJOR_PARK_PATH_OFFSET = .09;
export const MAJOR_PARK_SURFACE_OFFSET = .105;
export const MAJOR_PARK_ROAD_CLEARANCE = HK_MAJOR_PARKS.roadClearance;
export const MAJOR_PARK_RESEARCH_SOURCES = Object.freeze([
  { park: 'hongkong', url: 'https://hkp.lcsd.gov.hk/en/facilities', evidence: 'LCSD identity and facilities; 8.16 ha, opened May 1991 on the former Victoria Barracks.' },
  { park: 'hongkong', url: 'https://hkp.lcsd.gov.hk/en/facilities/aviary', evidence: 'Four great arches, suspended stainless-steel mesh, about 3,000 m², 30 m above the valley floor, elevated canopy walkway and stream / pools / waterfall.' },
  { park: 'hongkong', url: 'https://hkp.lcsd.gov.hk/en/facilities/conservatory', evidence: '1,400 m² official facility area; Display, Dry and Humid Plant Houses. This is not the OSM projected footprint area.' },
  { park: 'hongkong', url: 'https://hkp.lcsd.gov.hk/en/facilities/artificial-lake', evidence: 'Official Artificial Lake area 2,200 m²; authored lake outline is photo-directed because the checked-in OSM cache has no lake ring.' },
  { park: 'hongkong', url: 'https://hkp.lcsd.gov.hk/en/facilities/olympic-square', evidence: 'Olympic Square official 1,100 m² and 880 seats; exact separate OSM way 636809959 supplies its projected boundary.' },
  { park: 'hongkong', url: 'https://hkp.lcsd.gov.hk/en/facilities/vantage-point', evidence: 'Vantage Point is an official 30 m tower with 105 steps; OSM way 533177818 also tags height=30 and step_count=105.' },
  { park: 'hongkong', url: 'https://hkp.lcsd.gov.hk/en/facilities/fountain-plaza', evidence: 'Central Garden gateway with grand column clusters, dancing fountains, tree-lined promenade and fountain pavilion.' },
  { park: 'kowloon', url: 'https://www.lcsd.gov.hk/dept/annualrpt/2014-15/en/leisure/facilities.html', evidence: 'Official 13.3 ha, hard-surface soccer, sports centre and pool, Sculpture Walk, 240 m Tree Walk and Bird Lake with flamingos.' },
  { park: 'kowloon', url: 'https://www.discoverhongkong.com/eng/place-to-go/travel.guide-kowloon-park.html', evidence: 'Photographic reference for the Chinese Garden, Bird Lake, flamingos and park planting.' },
  { park: 'victoria', url: 'https://www.lcsd.gov.hk/en/parks/vp/', evidence: 'Official Central Lawn, bandstand, sports facilities and park identity; photo references for Centre Court, soccer pitches and Central Lawn.' },
  { park: 'victoria', url: 'https://www.lcsd.gov.hk/clpss/en/webApp/Facility/Details.do?ftid=42&did=15', evidence: 'Thirteen tennis courts plus one Centre Court.' },
  { park: 'victoria', url: 'https://www.lcsd.gov.hk/clpss/en/webApp/Facility/Details.do?ftid=28&fcid=&did=15', evidence: 'Model Boat Pool official area 954 m² and depth 0.5 m; its scene outline and position are photo-directed, not claimed as an OSM ring.' },
  { park: 'victoria', url: 'https://visualisingchina.net/blog/2019/11/29/statue-and-symbol-queen-victoria-in-hong-kong/', evidence: 'Queen Victoria bronze seated on an ornate throne, photographic reference for the authored monument.' }
]);

const ringArea = (ring) => {
  let area = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
  return area * .5;
};
const ringCentroid = (ring) => {
  let area = 0, x = 0, z = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) {
    const cross = ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
    area += cross; x += (ring[i] + ring[i + 2]) * cross; z += (ring[i + 1] + ring[i + 3]) * cross;
  }
  return Math.abs(area) > 1e-9 ? { x: x / (3 * area), z: z / (3 * area) } : { x: ring[0], z: ring[1] };
};
export const majorParkPointInRing = pointInFlatRing;
export function distanceToRing(ring, x, z) {
  let minimum = Infinity;
  for (let i = 2; i < ring.length; i += 2) {
    const ax = ring[i - 2], az = ring[i - 1], bx = ring[i], bz = ring[i + 1];
    const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    minimum = Math.min(minimum, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return minimum;
}
export function nearestRingPoint(ring, x, z) {
  let best = null;
  for (let i = 2; i < ring.length; i += 2) {
    const ax = ring[i - 2], az = ring[i - 1], bx = ring[i], bz = ring[i + 1];
    const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    const px = ax + dx * t, pz = az + dz * t, distance = Math.hypot(x - px, z - pz);
    if (!best || distance < best.distance) best = { x: px, z: pz, distance, edge: i / 2 - 1, t };
  }
  return best;
}
function siteForFeature(park, feature) {
  const obb = minimumAreaObb(feature.ring);
  const site = {
    key: `${park.key}-${feature.kind}-${feature.id ?? 'photo'}`, name: feature.name, englishName: feature.name,
    osmType: feature.source?.type ?? null, osmId: feature.id, source: feature.source,
    ring: feature.ring, bounds: feature.bounds, ringArea: feature.area, ...obb,
    height: feature.tags?.height ? Number(feature.tags.height) : null,
    levels: feature.tags?.['building:levels'] ? Number(feature.tags['building:levels']) : null,
    photoDirected: Boolean(feature.photoDirected)
  };
  site.localRing = feature.ring.flatMap((value, index, array) => {
    if (index % 2) return [];
    const p = harbourCityWorldToLocal(site, value, array[index + 1]); return [p.x, p.z];
  });
  return site;
}
function decoratePark(raw) {
  const park = { ...raw, features: raw.features.map((feature) => ({ ...feature })) };
  park.site = siteForFeature(park, { ...park, kind: 'park' });
  for (const feature of park.features) feature.site = siteForFeature(park, feature);
  return park;
}
const parks = HK_MAJOR_PARKS.parks.map(decoratePark);
export const HONG_KONG_PARK = parks.find((park) => park.key === 'hongkong');
export const KOWLOON_PARK = parks.find((park) => park.key === 'kowloon');
export const VICTORIA_PARK = parks.find((park) => park.key === 'victoria');
// OSM way 149401988 is the playing rectangle nested inside the separately mapped Centre Court arena
// (way 962060334), not a fifteenth tennis venue. Keep its source ring but render it once with the arena.
const victoriaCentreInner = featureById(VICTORIA_PARK, 149401988);
victoriaCentreInner.kind = 'centreCourtInner';
victoriaCentreInner.name = '維多利亞公園中央網球場內球場 Victoria Park Centre Court playing rectangle';
victoriaCentreInner.evidence = 'Exact OSM tennis pitch nested in Centre Court way 962060334; rendered by the parent arena to avoid a duplicate court and competing ground pads.';
export const MAJOR_PARKS = [HONG_KONG_PARK, KOWLOON_PARK, VICTORIA_PARK];
export const majorParkFeature = (park, kind, id = null) => park.features.find((feature) => feature.kind === kind && (id === null || feature.id === id));

function ellipseRing(x, z, rx, rz, count = 32, ry = 0, variation = 0) {
  const ring = [], cs = Math.cos(ry), sn = Math.sin(ry);
  for (let i = 0; i <= count; i++) {
    const a = i / count * Math.PI * 2, scale = 1 + Math.sin(a * 3 + .7) * variation + Math.cos(a * 5) * variation * .45;
    const lx = Math.cos(a) * rx * scale, lz = Math.sin(a) * rz * scale;
    ring.push(x + cs * lx + sn * lz, z - sn * lx + cs * lz);
  }
  return ring;
}
function roundedRectRing(x, z, w, d, radius, ry = 0, segments = 7) {
  const points = [], cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5 - radius, hz = d * .5 - radius;
  for (const [cx, cz, start] of [[hx, hz, 0], [-hx, hz, Math.PI / 2], [-hx, -hz, Math.PI], [hx, -hz, Math.PI * 1.5]]) {
    for (let i = 0; i <= segments; i++) {
      const a = start + i / segments * Math.PI / 2, lx = cx + Math.cos(a) * radius, lz = cz + Math.sin(a) * radius;
      points.push([x + cs * lx + sn * lz, z - sn * lx + cs * lz]);
    }
  }
  points.push(points[0]); return points.flat();
}
function scaleRingToArea(ring, targetArea) {
  const c = ringCentroid(ring), scale = Math.sqrt(targetArea / Math.abs(ringArea(ring)));
  return ring.map((value, index) => c[index % 2 ? 'z' : 'x'] + (value - c[index % 2 ? 'z' : 'x']) * scale);
}
function addPhotoFeature(park, kind, name, ring, evidence, extra = {}) {
  const feature = {
    id: null, kind, name, ring, bounds: flatRingBounds(ring), area: Math.abs(ringArea(ring)), centre: ringCentroid(ring), tags: {},
    source: null, photoDirected: true, evidence, ...extra
  };
  feature.site = siteForFeature(park, feature); park.features.push(feature); return feature;
}

export const HONG_KONG_ARTIFICIAL_LAKE = addPhotoFeature(HONG_KONG_PARK, 'artificialLake', '人工湖 Artificial Lake',
  scaleRingToArea(ellipseRing(230, 451, 25, 28, 40, -.18, .09), 2200),
  'Photo-directed outline and position; official LCSD facility area is 2,200 m². No precise lake ring exists in the checked-in OSM cache.', { officialArea: 2200 });
export const HONG_KONG_FOUNTAIN_PLAZA = addPhotoFeature(HONG_KONG_PARK, 'fountainPlaza', '噴水池廣場 Fountain Plaza',
  ellipseRing(365, 500, 17, 25, 32, -.18), 'Photo-directed Central Garden fountain promenade from LCSD descriptions and photographs; not an OSM boundary.');
export const KOWLOON_FOUNTAIN = addPhotoFeature(KOWLOON_PARK, 'fountain', '九龍公園噴水池 Kowloon Park Fountain',
  ellipseRing(1100, -1875, 12, 12, 32), 'Photo-directed circular single-jet fountain pool seen in the researched Kowloon Park photographs.');
export const KOWLOON_SCULPTURE_POOL = addPhotoFeature(KOWLOON_PARK, 'sculpturePool', '雕塑廊水景 Sculpture Walk reflecting pool',
  roundedRectRing(1122, -1925, 15, 32, 4, -.12), 'Photo-directed dark reflecting pool and silver tubular sculpture; not an OSM water boundary.');
export const KOWLOON_CHINESE_PAVILION = addPhotoFeature(KOWLOON_PARK, 'pavilion', '中國花園涼亭 Chinese Garden pavilion',
  ellipseRing(1155, -2055, 7, 7, 16), 'Photo-directed pavilion within exact OSM Chinese Garden way 725140779.');
// Photos show a paved finger between the two areas of water. Its exact side,
// dimensions and orientation are not surveyed: this is a provisional layout.
function victoriaBoatPoolFootprint() {
  const x = 2833.856, z = -46.398, ry = .08, cs = Math.cos(ry), sn = Math.sin(ry);
  const hx = 45.55 * .5 - 7.5, hz = 22 * .5 - 7.5, points = [];
  for (const [cx, cz, start] of [[hx, hz, 0], [-hx, hz, Math.PI / 2], [-hx, -hz, Math.PI], [hx, -hz, Math.PI * 1.5]]) {
    for (let i = 0; i <= 7; i++) {
      const a = start + i / 7 * Math.PI / 2;
      points.push([cx + Math.cos(a) * 7.5, cz + Math.sin(a) * 7.5]);
    }
    if (start === 0) {
      // Rounded nose of the paved finger, with water remaining connected around it.
      points.push([3.0, 11], [3.0, 2.6]);
      for (let i = 1; i <= 12; i++) { const a = -Math.PI * i / 12; points.push([3 * Math.cos(a), 2.6 + 3 * Math.sin(a)]); }
      points.push([-3.0, 11]);
    }
  }
  points.push(points[0]);
  const flat = points.flat(), factor = Math.sqrt(954 / Math.abs(ringArea(flat)));
  const toWorld = ([a,b]) => [x + factor * (cs*a + sn*b), z + factor * (-sn*a + cs*b)];
  const ring = points.flatMap(toWorld);
  const finger = [[3,11], [3,2.6]];
  for (let i = 1; i <= 12; i++) { const a = -Math.PI * i / 12; finger.push([3*Math.cos(a),2.6+3*Math.sin(a)]); }
  finger.push([-3,11], [3,11]);
  return {ring, finger: finger.flatMap(toWorld)};
}
const victoriaBoatFootprint = victoriaBoatPoolFootprint();
export const VICTORIA_MODEL_BOAT_POOL = addPhotoFeature(VICTORIA_PARK, 'modelBoatPool', '模型船池 Model Boat Pool',
  victoriaBoatFootprint.ring,
  'Photo-directed shape with inferred dividing finger; approximate POI, official LCSD 954 m² and depth 0.5 m; geometry and orientation are not surveyed.',
  { officialArea: 954, officialDepth: .5, fingerRing: victoriaBoatFootprint.finger });
// A short, scene-estimated grade ties the finger to the surrounding DTM.  Both
// the rendered mesh and ground queries use these same local coordinates.
const boatFinger = VICTORIA_MODEL_BOAT_POOL.fingerRing;
const boatFingerA = {x: boatFinger[0], z: boatFinger[1]};
const boatFingerB = {x: boatFinger[boatFinger.length - 4], z: boatFinger[boatFinger.length - 3]};
const boatFingerWidth = Math.hypot(boatFingerA.x - boatFingerB.x, boatFingerA.z - boatFingerB.z);
export const VICTORIA_BOAT_RAMP = Object.freeze({
  x: (boatFingerA.x + boatFingerB.x) * .5, z: (boatFingerA.z + boatFingerB.z) * .5,
  ux: (boatFingerA.x - boatFingerB.x) / boatFingerWidth, uz: (boatFingerA.z - boatFingerB.z) / boatFingerWidth,
  halfFinger: boatFingerWidth * .5, sideBlend: 2, length: 4
});
export function victoriaBoatRampPoint(u, v) {
  const r = VICTORIA_BOAT_RAMP;
  return { x: r.x + r.ux * u - r.uz * v, z: r.z + r.uz * u + r.ux * v };
}
export function victoriaBoatRampHeight(x, z) {
  const r = VICTORIA_BOAT_RAMP, dx = x - r.x, dz = z - r.z;
  const u = dx * r.ux + dz * r.uz, v = -dx * r.uz + dz * r.ux;
  if (v < -.0005 || v > r.length + .0005 || Math.abs(u) > r.halfFinger + r.sideBlend + .0005) return null;
  const side = Math.max(0, Math.min(1, (r.halfFinger + r.sideBlend - Math.abs(u)) / r.sideBlend));
  const along = Math.max(0, Math.min(1, 1 - v / r.length));
  const weight = side * side * (3 - 2 * side) * along * along * (3 - 2 * along);
  const natural = hongKongTerrainHeight(x, z) + MAJOR_PARK_BASE_OFFSET;
  return natural + (majorParkPadHeight(VICTORIA_MODEL_BOAT_POOL, .03) + .14 - natural) * weight;
}
export const VICTORIA_QUEEN_STATUE = addPhotoFeature(VICTORIA_PARK, 'monument', '維多利亞女皇銅像 Statue of Queen Victoria',
  roundedRectRing(2845, 65, 5.2, 5.2, .35), 'Photo-directed monument position by the principal fountain / lawn approach; bronze statue and stone plinth follow reliable photographs.');

function accessPoint(feature, fromX, fromZ, offset = 3) {
  const nearest = nearestRingPoint(feature.ring, fromX, fromZ);
  let dx = fromX - nearest.x, dz = fromZ - nearest.z, length = Math.hypot(dx, dz);
  if (length < 1e-6) { dx = fromX - feature.site.x; dz = fromZ - feature.site.z; length = Math.hypot(dx, dz) || 1; }
  let candidate = [nearest.x + dx / length * offset, nearest.z + dz / length * offset];
  if (pointInFlatRing(feature.ring, ...candidate)) candidate = [nearest.x - dx / length * offset, nearest.z - dz / length * offset];
  return candidate;
}
function entrance(park, id, name, x, z, heading = 0) {
  const nearest = nearestRingPoint(park.ring, x, z), dx = park.site.x - nearest.x, dz = park.site.z - nearest.z, length = Math.hypot(dx, dz) || 1;
  let px = nearest.x, pz = nearest.z;
  for (const step of [4, 8, 12, 16, 24]) {
    const cx = nearest.x + dx / length * step, cz = nearest.z + dz / length * step;
    if (!pointInFlatRing(park.ring, cx, cz) || distanceToRing(park.ring, cx, cz) < 3.4) continue;
    px = cx; pz = cz; break;
  }
  return { id, name, x: px, z: pz, boundaryX: nearest.x, boundaryZ: nearest.z, heading, park: park.key };
}
function path(id, name, width, points) { return { id, name, width, points: points.flat() }; }
function featureById(park, id) { return park.features.find((feature) => feature.id === id); }

const hkCotton = entrance(HONG_KONG_PARK, 'hong-kong-park-cotton-tree', '香港公園 紅棉路入口', 320, 350, 2.8);
const hkKennedy = entrance(HONG_KONG_PARK, 'hong-kong-park-kennedy', '香港公園 堅尼地道入口', 50, 613, -.4);
const hkCourt = entrance(HONG_KONG_PARK, 'hong-kong-park-supreme-court', '香港公園 法院道入口', 441, 540, -1.3);
const hkOlympic = majorParkFeature(HONG_KONG_PARK, 'olympic'), hkAviary = majorParkFeature(HONG_KONG_PARK, 'aviary');
const hkConservatory = majorParkFeature(HONG_KONG_PARK, 'conservatory'), hkFlagstaff = featureById(HONG_KONG_PARK, 42255475);
HONG_KONG_PARK.entrances = [hkCotton, hkKennedy, hkCourt];
HONG_KONG_PARK.paths = [
  path('hk-main-promenade', 'Cotton Tree Drive – Olympic Square promenade', 4.2, [[hkCotton.x, hkCotton.z], [335, 390], [320, 440], [280, 475], accessPoint(hkOlympic, 230, 510)]),
  path('hk-lake-conservatory-walk', 'Artificial Lake and conservatory walk', 3.6, [[280, 475], accessPoint(HONG_KONG_ARTIFICIAL_LAKE, 280, 475), accessPoint(hkConservatory, 215, 490)]),
  path('hk-heritage-walk', 'Flagstaff House heritage approach', 3.4, [[335, 390], accessPoint(hkFlagstaff, 335, 390)]),
  path('hk-valley-walk', 'Olympic Square – Vantage Point – Aviary valley walk', 3.8, [accessPoint(hkOlympic, 115, 520), [112, 520], [108, 570], accessPoint(hkAviary, 108, 570), [hkKennedy.x, hkKennedy.z]]),
  path('hk-east-entry-walk', 'Supreme Court Road – Fountain Plaza – conservatory connection', 3.6, [[hkCourt.x, hkCourt.z], accessPoint(HONG_KONG_FOUNTAIN_PLAZA, hkCourt.x, hkCourt.z), accessPoint(hkConservatory, 420, 540), [280, 475]])
];

const kpHaiphong = entrance(KOWLOON_PARK, 'kowloon-park-haiphong', '九龍公園 海防道入口', 1055, -1795, 0);
const kpNathan = entrance(KOWLOON_PARK, 'kowloon-park-nathan', '九龍公園 彌敦道入口', 1265, -1840, -1.5);
const kpWest = entrance(KOWLOON_PARK, 'kowloon-park-drive', '九龍公園 九龍公園徑入口', 905, -2115, 1.5);
const kpAustin = entrance(KOWLOON_PARK, 'kowloon-park-austin', '九龍公園 柯士甸道入口', 1138, -2340, 3.1);
const kpLake = majorParkFeature(KOWLOON_PARK, 'birdLake'), kpChinese = majorParkFeature(KOWLOON_PARK, 'chineseGarden');
const kpSports = majorParkFeature(KOWLOON_PARK, 'sportsCentre'), kpPool = majorParkFeature(KOWLOON_PARK, 'poolComplex');
const kpMaze = majorParkFeature(KOWLOON_PARK, 'maze'), kpHealth = featureById(KOWLOON_PARK, 184706096);
KOWLOON_PARK.entrances = [kpHaiphong, kpNathan, kpWest, kpAustin];
KOWLOON_PARK.paths = [
  path('kp-tree-walk', 'Haiphong Road – Bird Lake – Sports Centre Tree Walk', 4, [[kpHaiphong.x, kpHaiphong.z], accessPoint(KOWLOON_FOUNTAIN, 1060, -1840), [1075, -1935], accessPoint(kpLake, 1075, -1935), [1015, -2070], accessPoint(kpSports, 1015, -2070), [kpWest.x, kpWest.z]]),
  path('kp-nathan-promenade', 'Nathan Road – Maze – Chinese Garden promenade', 4.2, [[kpNathan.x, kpNathan.z], accessPoint(kpHealth, 1260, -1840), accessPoint(kpMaze, 1240, -1920), accessPoint(kpChinese, 1240, -2020), accessPoint(kpPool, 1240, -2110), [kpAustin.x, kpAustin.z]]),
  path('kp-sculpture-walk', 'Fountain and Sculpture Walk', 3.6, [accessPoint(KOWLOON_FOUNTAIN, 1140, -1875), accessPoint(KOWLOON_SCULPTURE_POOL, 1140, -1900), accessPoint(kpChinese, 1110, -2010), accessPoint(kpLake, 1090, -1980)]),
  path('kp-southern-sports-walk', 'Austin Road sports and pool connection', 3.8, [[kpAustin.x, kpAustin.z], accessPoint(featureById(KOWLOON_PARK, 99149483), 1138, -2320), accessPoint(kpSports, 1100, -2260), accessPoint(kpPool, 1100, -2250)])
];

const vpCauseway = entrance(VICTORIA_PARK, 'victoria-park-causeway', '維多利亞公園 高士威道入口', 2850, 170, 0);
const vpHingFat = entrance(VICTORIA_PARK, 'victoria-park-hing-fat', '維多利亞公園 興發街入口', 3240, -80, -1.5);
const vpNorth = entrance(VICTORIA_PARK, 'victoria-park-north', '維多利亞公園 北入口', 3040, -270, 3.1);
const vpLawn = majorParkFeature(VICTORIA_PARK, 'centralLawn'), vpBandstand = majorParkFeature(VICTORIA_PARK, 'bandstand');
const vpPoolBuilding = majorParkFeature(VICTORIA_PARK, 'poolBuilding'), vpCentreCourt = majorParkFeature(VICTORIA_PARK, 'centreCourt');
const vpFountain = majorParkFeature(VICTORIA_PARK, 'fountainPlaza');
VICTORIA_PARK.entrances = [vpCauseway, vpHingFat, vpNorth];
VICTORIA_PARK.paths = [
  path('vp-main-promenade', 'Causeway Road – Fountain – Bandstand promenade', 4.4, [[vpCauseway.x, vpCauseway.z], accessPoint(vpFountain, 2850, 150), [2830, 110], [2830, -55], accessPoint(vpBandstand, 2830, -55), accessPoint(VICTORIA_MODEL_BOAT_POOL, 2840, -100)]),
  path('vp-central-lawn-walk', 'Central Lawn accessible perimeter walk', 3.2, [...accessPoint(vpLawn, 2840, 70), [2835, 15], accessPoint(vpLawn, 2840, -50), accessPoint(vpBandstand, 2910, -40)]),
  path('vp-tennis-walk', 'Centre Court and swimming pool walk', 4, [[vpHingFat.x, vpHingFat.z], accessPoint(vpPoolBuilding, 3240, -80), accessPoint(vpCentreCourt, 3200, -80), [3020, -170], accessPoint(VICTORIA_MODEL_BOAT_POOL, 3020, -170)]),
  path('vp-north-sports-walk', 'Northern sports ground connection', 3.8, [[vpNorth.x, vpNorth.z], [3020, -170], [3020, -120], accessPoint(vpLawn, 3020, -40)]),
  path('vp-monument-walk', 'Queen Victoria monument and lawn approach', 3.4, [accessPoint(vpFountain, 2860, 80), accessPoint(VICTORIA_QUEEN_STATUE, 2860, 80), accessPoint(vpLawn, 2860, 70)])
];

export function majorParkAt(x, z) {
  for (const park of MAJOR_PARKS) {
    const b = park.bounds;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && pointInFlatRing(park.ring, x, z)) return park;
  }
  return null;
}
export function majorParkRoadAt(park, x, z, margin = MAJOR_PARK_ROAD_CLEARANCE) {
  for (const road of park.roads) for (const [segmentIndex, [ax, az, bx, bz]] of road.segments.entries()) {
    const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    const px = ax + dx * t, pz = az + dz * t, distance = Math.hypot(x - px, z - pz);
    if (distance <= road.width * .5 + margin) return { road, x: px, z: pz, distance, dx, dz, segment: segmentIndex };
  }
  return null;
}
export function majorParkPathAt(park, x, z, margin = 0) {
  let best = null;
  for (const route of park.paths) for (let i = 2; i < route.points.length; i += 2) {
    const ax = route.points[i - 2], az = route.points[i - 1], bx = route.points[i], bz = route.points[i + 1];
    const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
    const px = ax + dx * t, pz = az + dz * t, distance = Math.hypot(x - px, z - pz);
    if (distance <= route.width * .5 + margin && (!best || distance < best.distance)) best = { route, x: px, z: pz, distance, segment: i / 2 - 1, t };
  }
  return best;
}
export function majorParkPadHeight(feature, offset = MAJOR_PARK_SURFACE_OFFSET) {
  let height = hongKongTerrainHeight(feature.site.x, feature.site.z);
  for (let i = 0; i < feature.ring.length; i += 2) height = Math.max(height, hongKongTerrainHeight(feature.ring[i], feature.ring[i + 1]));
  return height + offset;
}
export function majorParkMinimumTerrain(feature) {
  let height = hongKongTerrainHeight(feature.site.x, feature.site.z);
  for (let i = 0; i < feature.ring.length; i += 2) height = Math.min(height, hongKongTerrainHeight(feature.ring[i], feature.ring[i + 1]));
  return height - .16;
}
const FLAT_FEATURES = new Set(['heritage', 'vantage', 'playground', 'soccer', 'tennis', 'basketball', 'bowls', 'roller', 'handball', 'tableTennis', 'centreCourt', 'poolBuilding', 'sportsCentre', 'olympic', 'bandstand', 'fountainPlaza', 'centralLawn', 'artificialLake', 'birdLake', 'modelBoatPool', 'fountain', 'sculpturePool', 'pavilion', 'monument']);
const WATER_FEATURES = new Set(['artificialLake', 'birdLake', 'modelBoatPool', 'fountain', 'sculpturePool']);
export function majorParkGroundHeightAt(park, x, z, ground) {
  const b = park.bounds;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ || !pointInFlatRing(park.ring, x, z)) return ground;
  if (majorParkRoadAt(park, x, z)) return ground;
  if (park === VICTORIA_PARK && pointInFlatRing(VICTORIA_MODEL_BOAT_POOL.fingerRing, x, z)) return majorParkPadHeight(VICTORIA_MODEL_BOAT_POOL, .03) + .14;
  if (park === VICTORIA_PARK) { const ramp = victoriaBoatRampHeight(x, z); if (ramp !== null) return ramp; }
  for (const feature of park.features) {
    if (!FLAT_FEATURES.has(feature.kind) || !pointInFlatRing(feature.ring, x, z)) continue;
    const pad = majorParkPadHeight(feature);
    return WATER_FEATURES.has(feature.kind) ? pad - (feature.officialDepth ?? .42) : pad;
  }
  const base = hongKongTerrainHeight(x, z) + MAJOR_PARK_BASE_OFFSET;
  return majorParkPathAt(park, x, z) ? base + (MAJOR_PARK_PATH_OFFSET - MAJOR_PARK_BASE_OFFSET) : base;
}
const LAMP_OBSTACLES = new Set(['heritage', 'conservatory', 'vantage', 'playground', 'soccer', 'tennis', 'basketball', 'bowls', 'roller', 'handball', 'tableTennis', 'centreCourt', 'poolBuilding', 'sportsCentre', 'poolComplex', 'olympic', 'bandstand', 'artificialLake', 'birdLake', 'modelBoatPool', 'fountain', 'sculpturePool', 'pavilion', 'monument']);
export function majorParkLampConflictAt(x, z) {
  const park = majorParkAt(x, z);
  if (!park || majorParkRoadAt(park, x, z)) return false;
  if (park === VICTORIA_PARK && (pointInFlatRing(VICTORIA_MODEL_BOAT_POOL.fingerRing, x, z) || victoriaBoatRampHeight(x, z) !== null)) return true;
  for (const feature of park.features) {
    if (!LAMP_OBSTACLES.has(feature.kind)) continue;
    if (pointInFlatRing(feature.ring, x, z) || distanceToRing(feature.ring, x, z) < .55) return true;
  }
  return Boolean(majorParkPathAt(park, x, z, .15));
}
export function majorParkFurnitureConflictAt(park, x, z, margin = .55) {
  if (!pointInFlatRing(park.ring, x, z) || majorParkRoadAt(park, x, z, .35)) return true;
  if (park === VICTORIA_PARK && (pointInFlatRing(VICTORIA_MODEL_BOAT_POOL.fingerRing, x, z) || victoriaBoatRampHeight(x, z) !== null)) return true;
  for (const feature of park.features) {
    if (!LAMP_OBSTACLES.has(feature.kind)) continue;
    if (pointInFlatRing(feature.ring, x, z) || distanceToRing(feature.ring, x, z) < margin) return true;
  }
  return false;
}
const TREE_EXCLUSIONS = new Set(['heritage', 'conservatory', 'vantage', 'playground', 'soccer', 'tennis', 'basketball', 'bowls', 'roller', 'handball', 'tableTennis', 'centreCourt', 'poolBuilding', 'sportsCentre', 'poolComplex', 'olympic', 'bandstand', 'fountainPlaza', 'centralLawn', 'artificialLake', 'birdLake', 'modelBoatPool', 'fountain', 'sculpturePool', 'pavilion', 'monument', 'maze', 'chineseGarden']);
function hash(a, b, c) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return value - Math.floor(value); }
function treeClear(park, x, z, crown = 2.4) {
  if (!pointInFlatRing(park.ring, x, z) || majorParkRoadAt(park, x, z, 1.4) || majorParkPathAt(park, x, z, crown)) return false;
  if (park === VICTORIA_PARK && (pointInFlatRing(VICTORIA_MODEL_BOAT_POOL.fingerRing, x, z) || distanceToRing(VICTORIA_MODEL_BOAT_POOL.fingerRing, x, z) < crown || victoriaBoatRampHeight(x, z) !== null)) return false;
  for (const feature of park.features) {
    if (!TREE_EXCLUSIONS.has(feature.kind)) continue;
    if (pointInFlatRing(feature.ring, x, z) || distanceToRing(feature.ring, x, z) < crown) return false;
  }
  return true;
}
export function createMajorParkTreeSites(park, target = 80) {
  const sites = [], b = park.bounds, seed = park.id * .0001;
  // Authored avenue planting follows the path network; grove filling then favours the exact OSM woods polygons.
  for (const route of park.paths) for (let i = 2; i < route.points.length; i += 2) {
    const ax = route.points[i - 2], az = route.points[i - 1], bx = route.points[i], bz = route.points[i + 1];
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz); if (length < 1) continue;
    const nx = dz / length, nz = -dx / length;
    for (let d = 10; d < length; d += 19) for (const side of [-1, 1]) {
      if (hash(d, i, seed + side) < .34) continue;
      const offset = route.width * .5 + 3.1, x = ax + dx * d / length + nx * offset * side, z = az + dz * d / length + nz * offset * side;
      if (!treeClear(park, x, z, 2.1)) continue;
      sites.push({ x, z, y: hongKongTerrainHeight(x, z) + MAJOR_PARK_BASE_OFFSET, scale: .82 + hash(x, z, seed) * .3, species: Math.floor(hash(z, x, seed) * 4), tier: 1 });
    }
  }
  const woods = park.features.filter((feature) => feature.kind === 'woods');
  for (let attempt = 0; attempt < target * 45 && sites.length < target; attempt++) {
    let x, z;
    if (woods.length && attempt % 3 !== 0) {
      const feature = woods[attempt % woods.length], wb = feature.bounds;
      x = wb.minX + hash(attempt, seed, 1) * (wb.maxX - wb.minX); z = wb.minZ + hash(attempt, seed, 2) * (wb.maxZ - wb.minZ);
      if (!pointInFlatRing(feature.ring, x, z)) continue;
    } else {
      x = b.minX + hash(attempt, seed, 3) * (b.maxX - b.minX); z = b.minZ + hash(attempt, seed, 4) * (b.maxZ - b.minZ);
    }
    if (!treeClear(park, x, z, 2.5)) continue;
    sites.push({ x, z, y: hongKongTerrainHeight(x, z) + MAJOR_PARK_BASE_OFFSET, scale: .78 + hash(x, z, seed + 5) * .52, species: Math.floor(hash(z, x, seed + 6) * 4), tier: 1 });
  }
  return sites;
}
export function majorParkArrivalPoints(park) {
  return park.entrances.map((entry) => ({ ...entry, sub: `${park.name} · authored park entrance` }));
}

// Turn the researched entrance / facility waypoints into continuous walkable routes. The small
// deterministic A* pass keeps every centreline inside the exact site and out of road corridors,
// buildings, water and sports surfaces instead of drawing straight lines through them.
const PATH_BLOCKED = new Set(['heritage', 'conservatory', 'vantage', 'playground', 'soccer', 'tennis', 'basketball', 'bowls', 'roller', 'handball', 'tableTennis', 'centreCourt', 'poolBuilding', 'sportsCentre', 'poolComplex', 'olympic', 'bandstand', 'centralLawn', 'artificialLake', 'birdLake', 'modelBoatPool', 'fountain', 'sculpturePool', 'pavilion', 'monument', 'maze', 'garden']);
function safePathPoint(park, x, z) {
  if (!pointInFlatRing(park.ring, x, z) || distanceToRing(park.ring, x, z) < 2.8 || majorParkRoadAt(park, x, z, 1.6)) return false;
  for (const feature of park.features) {
    if (!PATH_BLOCKED.has(feature.kind)) continue;
    if (pointInFlatRing(feature.ring, x, z) || distanceToRing(feature.ring, x, z) < 2.2) return false;
  }
  return true;
}
function safeSegment(park, ax, az, bx, bz) {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
  for (let i = 0; i <= steps; i++) if (!safePathPoint(park, ax + (bx - ax) * i / steps, az + (bz - az) * i / steps)) return false;
  return true;
}
function routeGrid(park, start, goal) {
  const grid = 4, b = park.bounds, minX = Math.floor(b.minX / grid) * grid, minZ = Math.floor(b.minZ / grid) * grid;
  const cols = Math.ceil((b.maxX - minX) / grid) + 1, rows = Math.ceil((b.maxZ - minZ) / grid) + 1;
  const key = (cx, cz) => cz * cols + cx, coords = (index) => [index % cols, Math.floor(index / cols)];
  const world = (cx, cz) => [minX + cx * grid, minZ + cz * grid];
  const nearestFree = (x, z) => {
    const cx = Math.round((x - minX) / grid), cz = Math.round((z - minZ) / grid);
    let best = null;
    for (let radius = 0; radius <= 6 && !best; radius++) for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= cols || nz >= rows) continue;
      const [wx, wz] = world(nx, nz);
      if (safePathPoint(park, wx, wz)) { const score = Math.hypot(wx - x, wz - z); if (!best || score < best.score) best = { cx: nx, cz: nz, score }; }
    }
    return best;
  };
  const s = nearestFree(start[0], start[1]), g = nearestFree(goal[0], goal[1]);
  if (!s || !g) return [start, goal];
  const startKey = key(s.cx, s.cz), goalKey = key(g.cx, g.cz), open = new Set([startKey]), came = new Map(), cost = new Map([[startKey, 0]]), score = new Map([[startKey, Math.hypot(g.cx - s.cx, g.cz - s.cz)]]);
  const directions = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];
  let found = false, iterations = 0;
  while (open.size && iterations++ < 50000) {
    let current = null, best = Infinity;
    for (const index of open) { const value = score.get(index) ?? Infinity; if (value < best) { best = value; current = index; } }
    if (current === goalKey) { found = true; break; }
    open.delete(current); const [cx, cz] = coords(current), currentCost = cost.get(current);
    for (const [dx, dz, step] of directions) {
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= cols || nz >= rows) continue;
      const [wx, wz] = world(nx, nz); if (!safePathPoint(park, wx, wz)) continue;
      if (dx && dz) {
        const [ax, az] = world(cx + dx, cz), [bx, bz] = world(cx, cz + dz);
        if (!safePathPoint(park, ax, az) || !safePathPoint(park, bx, bz)) continue;
      }
      const next = key(nx, nz), nextCost = currentCost + step;
      if (nextCost >= (cost.get(next) ?? Infinity)) continue;
      came.set(next, current); cost.set(next, nextCost); score.set(next, nextCost + Math.hypot(g.cx - nx, g.cz - nz)); open.add(next);
    }
  }
  if (!found) return [start, goal];
  const cells = [goalKey]; let current = goalKey;
  while (current !== startKey) { current = came.get(current); cells.push(current); }
  cells.reverse();
  const points = cells.map((index) => { const [cx, cz] = coords(index); return world(cx, cz); });
  points[0] = safePathPoint(park, ...start) ? start : world(s.cx, s.cz);
  points[points.length - 1] = safePathPoint(park, ...goal) ? goal : world(g.cx, g.cz);
  const simplified = [points[0]]; let anchor = 0;
  while (anchor < points.length - 1) {
    let next = points.length - 1;
    for (; next > anchor + 1; next--) if (safeSegment(park, ...points[anchor], ...points[next])) break;
    simplified.push(points[next]); anchor = next;
  }
  return simplified;
}
for (const park of MAJOR_PARKS) {
  park.paths = park.paths.map((route) => {
    const points = [];
    for (let i = 2; i < route.points.length; i += 2) {
      const start = points.length ? points[points.length - 1] : [route.points[i - 2], route.points[i - 1]];
      const goal = [route.points[i], route.points[i + 1]], piece = routeGrid(park, start, goal);
      if (points.length) piece.shift(); points.push(...piece);
    }
    return { ...route, points: points.flat(), intendedPoints: route.points };
  });
}

export { harbourCityLocalToWorld as majorParkLocalToWorld, harbourCityWorldToLocal as majorParkWorldToLocal };
