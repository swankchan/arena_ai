import { minimumAreaObb, flatRingBounds } from './landmark-site.js';

// Current Star Ferry terminal outlines, preserved independently from the authored architectural details.
// Coordinates are WGS84 [lon, lat], retrieved through Nominatim / the OSM API on 2026-11-04.
// OSM attribution: © OpenStreetMap contributors, ODbL 1.0.
const KX = 103056.81753522092, KY = 110734.09626824585;
const geometry = (points) => Object.freeze(points.map(([lon, lat]) => Object.freeze({ lon, lat })));
const tags = (values) => Object.freeze(values);

export const STAR_FERRY_OSM_SOURCES = Object.freeze({
  tsimShaTsui: Object.freeze({
    attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-04',
    sourceUrl: 'https://www.openstreetmap.org/api/0.6/relation/14941145/full.json',
    type: 'relation', id: 14941145, version: 3, timestamp: '2022-12-01T12:41:46Z', changeset: 129602437,
    tags: tags({
      building: 'transportation', 'building:levels': '2', ferry: 'yes', 'roof:levels': '1', 'roof:shape': 'flat',
      name: '尖沙咀天星碼頭 Tsim Sha Tsui Star Ferry Pier', 'name:en': 'Tsim Sha Tsui Star Ferry Pier',
      official_name: '尖沙咀渡輪碼頭 Tsim Sha Tsui Ferry Pier'
    }),
    geometry: geometry([
      [114.1678945, 22.2935323], [114.1678955, 22.2935214], [114.1678978, 22.2935065],
      [114.1679032, 22.2934922], [114.1679166, 22.2934764], [114.1679273, 22.2934668],
      [114.1679391, 22.2934625], [114.1679501, 22.2934597], [114.1679612, 22.2934578],
      [114.1679719, 22.2934578], [114.1679836, 22.2934590], [114.1679954, 22.2934618],
      [114.1680071, 22.2934671], [114.1680229, 22.2934832], [114.1680514, 22.2935140],
      [114.1681517, 22.2936298], [114.1683594, 22.2938828], [114.1684481, 22.2939322],
      [114.1685983, 22.2937587], [114.1686944, 22.2936420], [114.1687505, 22.2935856],
      [114.1687799, 22.2935560], [114.1687577, 22.2934666], [114.1685497, 22.2932188],
      [114.1684329, 22.2930783], [114.1684222, 22.2930654], [114.1684111, 22.2930489],
      [114.1684071, 22.2930347], [114.1684071, 22.2930195], [114.1684084, 22.2930067],
      [114.1684135, 22.2929971], [114.1684272, 22.2929773], [114.1684356, 22.2929705],
      [114.1684483, 22.2929633], [114.1684641, 22.2929593], [114.1684792, 22.2929593],
      [114.1684956, 22.2929602], [114.1685107, 22.2929652], [114.1685322, 22.2929835],
      [114.1685482, 22.2930017], [114.1688700, 22.2933858], [114.1689500, 22.2934271],
      [114.1689530, 22.2934242], [114.1689558, 22.2934214], [114.1689664, 22.2934227],
      [114.1690565, 22.2934352], [114.1690046, 22.2934789], [114.1689651, 22.2935109],
      [114.1688838, 22.2935738], [114.1688344, 22.2936119], [114.1688330, 22.2936512],
      [114.1687347, 22.2937655], [114.1686874, 22.2937677], [114.1686709, 22.2937858],
      [114.1686527, 22.2938058], [114.1686599, 22.2938530], [114.1685570, 22.2939669],
      [114.1685151, 22.2939814], [114.1685023, 22.2939718], [114.1684847, 22.2939921],
      [114.1684616, 22.2940186], [114.1684353, 22.2940483], [114.1684022, 22.2940846],
      [114.1683776, 22.2941101], [114.1683581, 22.2941331], [114.1683152, 22.2940992],
      [114.1683209, 22.2940915], [114.1682971, 22.2940699], [114.1682440, 22.2939608],
      [114.1680375, 22.2937155], [114.1679299, 22.2935880], [114.1679069, 22.2935608],
      [114.1678988, 22.2935456], [114.1678945, 22.2935323]
    ])
  }),
  central: Object.freeze({
    attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-04',
    sourceUrl: 'https://www.openstreetmap.org/api/0.6/way/1483823682/full.json',
    type: 'way', id: 1483823682, version: 2, timestamp: '2026-02-27T19:21:36Z', changeset: 179146031,
    tags: tags({
      building: 'transportation', 'building:levels': '3', ferry: 'yes', height: '14', loc_ref: '7',
      pier: 'piled', 'roof:colour': '#93d7de', 'roof:height': '4', 'roof:levels': '1', 'roof:shape': 'gabled',
      name: '中環天星碼頭 Central Star Ferry Pier', 'name:en': 'Central Star Ferry Pier',
      official_name: '中環7號碼頭 Central Pier Number 7'
    }),
    geometry: geometry([
      [114.1609395, 22.2867951], [114.1609976, 22.2867730], [114.1610193, 22.2867648],
      [114.1610581, 22.2867498], [114.1610851, 22.2867394], [114.1611043, 22.2867327],
      [114.1611235, 22.2867255], [114.1611821, 22.2867032], [114.1612060, 22.2867573],
      [114.1613140, 22.2870013], [114.1613259, 22.2870283], [114.1613378, 22.2870553],
      [114.1614697, 22.2873533], [114.1612271, 22.2874452], [114.1610953, 22.2871471],
      [114.1610833, 22.2871201], [114.1610714, 22.2870931], [114.1609634, 22.2868492],
      [114.1609395, 22.2867951]
    ])
  }),
  wanChai: Object.freeze({
    attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-04',
    sourceUrl: 'https://www.openstreetmap.org/api/0.6/relation/14953850/full.json',
    type: 'relation', id: 14953850, version: 5, timestamp: '2023-03-01T09:21:59Z', changeset: 133163404,
    tags: tags({
      building: 'transportation', 'building:levels': '2', ferry: 'yes', retail: 'yes',
      'note:roof:access': 'yes', viewpoint: 'separate',
      name: '灣仔碼頭 Wan Chai Pier', 'name:en': 'Wan Chai Pier',
      official_name: '灣仔渡輪碼頭 Wan Chai Ferry Pier'
    }),
    geometry: geometry([
      [114.1760595, 22.2836822], [114.1761297, 22.2830547], [114.1761719, 22.2830940],
      [114.1762231, 22.2830985], [114.1762663, 22.2831024], [114.1763520, 22.2831100],
      [114.1763894, 22.2830806], [114.1763179, 22.2837080], [114.1763158, 22.2837156],
      [114.1763126, 22.2837203], [114.1763090, 22.2837242], [114.1763044, 22.2837271],
      [114.1762984, 22.2837298], [114.1762912, 22.2837312], [114.1762835, 22.2837308],
      [114.1760879, 22.2837119], [114.1760811, 22.2837106], [114.1760750, 22.2837087],
      [114.1760700, 22.2837059], [114.1760658, 22.2837023], [114.1760629, 22.2836981],
      [114.1760610, 22.2836935], [114.1760596, 22.2836877], [114.1760595, 22.2836822]
    ])
  })
});

function projectRing(source) {
  return Object.freeze(source.geometry.flatMap(({ lon, lat }) => [
    (lon - 114.1596) * KX, -(lat - 22.2819) * KY
  ]));
}

function localRing(site) {
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry), result = [];
  // The repeated closure vertex is not needed by THREE.Shape; retaining it would create zero-length detail edges.
  for (let i = 0; i + 3 < site.ring.length; i += 2) {
    const dx = site.ring[i] - site.x, dz = site.ring[i + 1] - site.z;
    result.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return Object.freeze(result);
}

function makeSite(id, name, nameEn, source) {
  const ring = projectRing(source), footprint = minimumAreaObb(ring);
  const base = Object.freeze({
    id, name, nameEn, osmType: source.type, osmId: source.id, source,
    ring, bounds: flatRingBounds(ring), ...footprint
  });
  return Object.freeze({ ...base, localRing: localRing(base) });
}

export const STAR_FERRY_TERMINALS = Object.freeze([
  makeSite('tsim-sha-tsui', '尖沙咀天星碼頭', 'Tsim Sha Tsui Star Ferry Pier', STAR_FERRY_OSM_SOURCES.tsimShaTsui),
  makeSite('central', '中環7號碼頭', 'Central Pier 7 · Star Ferry', STAR_FERRY_OSM_SOURCES.central),
  makeSite('wan-chai', '灣仔渡輪碼頭', 'Wan Chai Ferry Pier', STAR_FERRY_OSM_SOURCES.wanChai)
]);

export const STAR_FERRY_TERMINAL_BY_ID = Object.freeze(Object.fromEntries(
  STAR_FERRY_TERMINALS.map((site) => [site.id, site])
));

export function starFerryLocalToWorld(site, x, z) {
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z };
}

export function starFerryWorldToLocal(site, x, z) {
  const cs = Math.cos(site.ry), sn = Math.sin(site.ry), dx = x - site.x, dz = z - site.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}

// Ordinary service-vessel reference, not the longer World Star harbour-tour vessel.
export const STAR_FERRY_VESSEL_REFERENCE = Object.freeze({
  name: 'Morning Star', length: 35.61, beam: 8.57, capacity: 399, built: 1965, electricRetrofit: 2020,
  sourceUrl: 'https://www.epd.gov.hk/epd/sites/default/files/epd/english/environmentinhk/air/prob_solutions/files/0236_SF_DEP_6mthIR_ES_Eng.pdf'
});
