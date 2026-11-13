// The Arch, 1 Austin Road West, Union Square / Kowloon Station.
// Exact OSM tower rings and source height conventions are independent of the photo-directed arch void and crown frame.
import {
  authoredOsmSource, makeAuthoredSite, makePhotoDirectedSite, authoredTerrainHeightAt,
} from './authored-landmark-site.js';
import { harbourCityExtremeEdge, harbourCityEdgeFrame } from './harbour-city-architecture.js';

export const THE_ARCH_ID = 'HK-KLN-ARCH';
export const THE_ARCH_NAME = '凱旋門 The Arch';
export const THE_ARCH_HEIGHT = 231;
export const THE_ARCH_MIN_HEIGHT = 20;
export const THE_ARCH_LEVELS = 64;
export const THE_ARCH_RESEARCH = Object.freeze({
  design: 'https://skyscraperpage.com/cities/?buildingID=7288',
  construction: 'https://cementaid.com/project/the-arch-kowloon-station/',
  photographicEvidence: 'Inspected low-angle podium/facade and harbour-facing whole-building photographs: bronze-red residential grids, green-blue glazing, pale fins, the tall rectangular arch void, elevated clubhouse and small near-top circular opening.',
  floorEvidence: 'OSM consistently tags each tower 231 m / 64 levels / min_height=20 / building:min_level=4. Secondary descriptions differ on the joining floor (62nd versus 69th); the scene link is therefore explicitly photo-directed, not presented as a surveyed floor.',
});
const points = (values) => values.map(([lon, lat]) => ({ lon, lat }));
const siteGeometry = points([
  [114.1622756,22.3041167],[114.1630799,22.3038446],[114.1629768,22.3035832],
  [114.1625892,22.3033936],[114.1626042,22.3032975],[114.1625646,22.3032072],
  [114.1624674,22.3031577],[114.1623969,22.3031436],[114.1624035,22.3028973],
  [114.1628524,22.302911],[114.1633605,22.302935],[114.1633899,22.3029413],
  [114.1634195,22.3029547],[114.16344,22.3029714],[114.1634495,22.3029829],
  [114.1634581,22.3029935],[114.1634703,22.3030189],[114.1634757,22.3030458],
  [114.1634817,22.3033555],[114.1634893,22.3037524],[114.1634924,22.3039142],
  [114.162374,22.3043283],[114.1623068,22.304186],[114.1622756,22.3041167],
]);
const sunGeometry = points([
  [114.162847,22.3030691],[114.1628486,22.3030339],[114.1628807,22.3030352],
  [114.1629038,22.3030095],[114.1628744,22.3029868],[114.1628988,22.3029597],
  [114.1629238,22.3029319],[114.1629648,22.3029635],[114.1630221,22.3030077],
  [114.1630098,22.3030214],[114.1630945,22.3030867],[114.1630847,22.3030975],
  [114.1631033,22.3031119],[114.1631922,22.3031805],[114.1631601,22.303216],
  [114.1631363,22.3031976],[114.1631144,22.3032218],[114.1630494,22.3031716],
  [114.1630272,22.3031965],[114.163092,22.3032466],[114.163073,22.3032677],
  [114.1631019,22.30329],[114.1630655,22.3033223],[114.162976,22.3032531],
  [114.1629677,22.3032624],[114.1628594,22.3031789],[114.1629245,22.3031067],
  [114.1628772,22.3030703],[114.162847,22.3030691],
]);
const moonGeometry = points([
  [114.1630655,22.3033223],[114.1631019,22.30329],[114.1631203,22.3033122],
  [114.1631439,22.3032955],[114.1631952,22.3033577],[114.163223,22.3033381],
  [114.1631716,22.3032759],[114.1631987,22.3032568],[114.1631798,22.3032339],
  [114.1632195,22.3032058],[114.1632898,22.3032909],[114.1633045,22.3033087],
  [114.1633166,22.3033001],[114.1633835,22.3033812],[114.1633988,22.3033704],
  [114.1634765,22.3034645],[114.1634151,22.3035078],[114.1633918,22.3034797],
  [114.1633631,22.3034999],[114.1633631,22.3035296],[114.1633251,22.3035295],
  [114.1633251,22.3035016],[114.1632878,22.3034564],[114.163207,22.3035135],
  [114.1631214,22.3034098],[114.1631318,22.3034025],[114.1630655,22.3033223],
]);
const skyGeometry = points([
  [114.1625152,22.3030487],[114.1625178,22.3029914],[114.1627234,22.3029994],
  [114.16285,22.3030043],[114.1628486,22.3030339],[114.162847,22.3030691],
  [114.1627631,22.3030658],[114.1627564,22.3032147],[114.1625646,22.3032072],
  [114.1625717,22.3030508],[114.1625152,22.3030487],
]);
const starGeometry = points([
  [114.163164,22.3038822],[114.1631641,22.3036072],[114.1633251,22.3036072],
  [114.1633251,22.3035295],[114.1633631,22.3035296],[114.1633952,22.3035295],
  [114.1633951,22.3038371],[114.1633332,22.3038371],[114.1633332,22.3037848],
  [114.1632418,22.3037848],[114.1632418,22.3038822],[114.163164,22.3038822],
]);

export const THE_ARCH_SITE_SOURCE = authoredOsmSource({
  type: 'way', id: 25608819, geometry: siteGeometry,
  tags: {
    landuse: 'residential', name: '凱旋門 The Arch', 'name:en': 'The Arch', 'name:zh': '凱旋門',
    residence: 'estate', residential: 'apartments', apartments: 'terraced', start_date: '2006',
    'addr:housenumber': '1', 'addr:street:en': 'Austin Road West', 'addr:street:zh': '柯士甸道西',
    wikidata: 'Q2743773', wikipedia: 'zh:凱旋門 (香港)', location: 'podium', podium: 'bulk',
  },
  evidence: 'OSM residential estate boundary, not a surveyed podium building footprint.',
});
function towerSource(id, geometry, name, englishName) {
  return authoredOsmSource({
    type: 'way', id, geometry,
    tags: {
      building: 'apartments', name, 'name:en': englishName, 'addr:housename': '凱旋門 The Arch',
      'addr:housenumber': '1', 'addr:street:en': 'Austin Road West', height: '231', min_height: '20',
      'building:levels': '64', 'building:min_level': '4', 'building:function': 'tower', location: 'podium', podium: 'bulk',
    },
    evidence: 'Exact current OSM apartment-tower ring. Height and floor tags are retained separately from the visual arch and crown.',
  });
}
export const THE_ARCH_SUN_SOURCE = towerSource(294457120, sunGeometry, '朝日閣 Suntower', 'Suntower');
export const THE_ARCH_MOON_SOURCE = towerSource(294457121, moonGeometry, '映月閣 Moontower', 'Moontower');
export const THE_ARCH_SKY_SOURCE = towerSource(1047822851, skyGeometry, '摩天閣 Skytower', 'Skytower');
export const THE_ARCH_STAR_SOURCE = towerSource(1047822850, starGeometry, '觀星閣 Startower', 'Startower');

export const THE_ARCH_ESTATE_ROAD_IDS = Object.freeze([41226, 42618, 47295, 50428, 50726, 50727, 50730, 50731, 51124, 51125, 51126, 51127]);
export const THE_ARCH_SITE = makeAuthoredSite('the-arch-estate', THE_ARCH_NAME, 'The Arch Estate', THE_ARCH_SITE_SOURCE, { role: 'estate', roadIds: THE_ARCH_ESTATE_ROAD_IDS });
export const THE_ARCH_SKY_SITE = makeAuthoredSite('the-arch-sky', '凱旋門 摩天閣', 'The Arch Skytower', THE_ARCH_SKY_SOURCE, { height: 231, levels: 64, minHeight: 20, role: 'residential-tower', roadIds: [51127] });
export const THE_ARCH_SUN_SITE = makeAuthoredSite('the-arch-sun', '凱旋門 朝日閣', 'The Arch Suntower', THE_ARCH_SUN_SOURCE, { height: 231, levels: 64, minHeight: 20, role: 'residential-tower', roadIds: [47295, 51124, 51125, 51126] });
export const THE_ARCH_MOON_SITE = makeAuthoredSite('the-arch-moon', '凱旋門 映月閣', 'The Arch Moon Tower', THE_ARCH_MOON_SOURCE, { height: 231, levels: 64, minHeight: 20, role: 'residential-tower', roadIds: [47295] });
export const THE_ARCH_STAR_SITE = makeAuthoredSite('the-arch-star', '凱旋門 觀星閣', 'The Arch Startower', THE_ARCH_STAR_SOURCE, { height: 231, levels: 64, minHeight: 20, role: 'residential-tower', roadIds: [47295, 50428, 50727] });
export const THE_ARCH_TOWER_SITES = Object.freeze([THE_ARCH_SKY_SITE, THE_ARCH_SUN_SITE, THE_ARCH_MOON_SITE, THE_ARCH_STAR_SITE]);
export const THE_ARCH_PODIUM_SITE = makePhotoDirectedSite(
  'the-arch-podium', '凱旋門基座', THE_ARCH_SITE.ring,
  'Photo/site-directed podium inside residential way 25608819; the land-use ring itself is not mislabeled as an OSM building footprint.',
  { height: 20, levels: 4, role: 'podium', roadIds: THE_ARCH_ESTATE_ROAD_IDS },
);
export const THE_ARCH_GROUND_SOFFIT = 7.2;
export const THE_ARCH_VEHICLE_CLEARANCE = 4.7;
export const THE_ARCH_VISUAL_COURSES = 60;
export const THE_ARCH_LINK = Object.freeze({
  soffit: 174, top: 188, visualLevels: 4, upperBridgeTop: 207,
  crownOculusY: 216, crownOculusRadius: 3.2, crownTop: 231,
  evidence: 'Photo-directed elevated clubhouse and crown proportions. Secondary sources disagree on the exact joining floor; no surveyed floor claim.',
});
const linkRing = (() => {
  const cx = (THE_ARCH_SUN_SITE.x + THE_ARCH_MOON_SITE.x) / 2, cz = (THE_ARCH_SUN_SITE.z + THE_ARCH_MOON_SITE.z) / 2;
  const dx = THE_ARCH_MOON_SITE.x - THE_ARCH_SUN_SITE.x, dz = THE_ARCH_MOON_SITE.z - THE_ARCH_SUN_SITE.z;
  const length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length, vx = -uz, vz = ux, ring = [];
  for (const [u, v] of [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]) ring.push(cx + ux * u * 31 + vx * v * 11, cz + uz * u * 31 + vz * v * 11);
  return Object.freeze(ring);
})();
export const THE_ARCH_LINK_SITE = makePhotoDirectedSite(
  'the-arch-elevated-clubhouse', '凱旋門空中會所', linkRing,
  'Photo-directed 62 x 22 m elevated Sun–Moon clubhouse/crown envelope inside the estate; not an independent OSM building footprint.',
  { minHeight: 174, role: 'elevated-link' },
);
export const THE_ARCH_VOID_SAMPLE = Object.freeze({
  x: (THE_ARCH_SUN_SITE.x + THE_ARCH_MOON_SITE.x) / 2,
  z: (THE_ARCH_SUN_SITE.z + THE_ARCH_MOON_SITE.z) / 2,
});
export const THE_ARCH_MAIN_ENTRANCE = harbourCityEdgeFrame(
  THE_ARCH_PODIUM_SITE, harbourCityExtremeEdge(THE_ARCH_PODIUM_SITE, 'z', 1),
  'The Arch Austin Road West entrance', 'Photo/site-directed southern podium entrance; no invented OSM entrance node.', 0.5,
);
// Record indices are assigned only after scanning retained road geometry; they are never OSM way IDs.
export const THE_ARCH_GROUND_SITES = Object.freeze([THE_ARCH_SITE]);
export const THE_ARCH_GROUND_RINGS = Object.freeze([THE_ARCH_SITE.ring]);
export const THE_ARCH_TERRAIN_RULE = Object.freeze({
  datum: 'Highest raw DTM sample on the exact estate centre and vertices; one reproducible construction pad, not an engineering elevation.',
  roads: 'Road corridors and road-aware ground remain prioritary; building footprints are never moved to fit a carriageway.',
});
export function theArchTerrainHeightAt(x, z, ground, padHeight) {
  return authoredTerrainHeightAt(THE_ARCH_GROUND_SITES, x, z, ground, padHeight);
}
