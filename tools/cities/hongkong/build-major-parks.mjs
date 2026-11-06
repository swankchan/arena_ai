import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import polygonClipping from 'polygon-clipping';
import earcut from 'earcut';
import { HK_FULL_ROADS } from '../../../js/hk-full-roads-data.js';

// Reproducible, renderer-independent source extraction for the three authored major parks.
// Site and facility polygons come from the checked-in Geofabrik extract. A small set of
// missing named facilities was read from the OSM/Nominatim API on 2026-11-06 and is kept
// below as lon/lat source geometry so no screenshot or hand-drawn footprint becomes "OSM".
const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
const round = (value, places = 3) => Number(value.toFixed(places));
const ringArea = (ring) => {
  let area = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
  return area * .5;
};
const bounds = (ring) => {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < ring.length; i += 2) {
    b.minX = Math.min(b.minX, ring[i]); b.maxX = Math.max(b.maxX, ring[i]);
    b.minZ = Math.min(b.minZ, ring[i + 1]); b.maxZ = Math.max(b.maxZ, ring[i + 1]);
  }
  return b;
};
const centre = (ring) => {
  let area = 0, x = 0, z = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) {
    const cross = ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
    area += cross; x += (ring[i] + ring[i + 2]) * cross; z += (ring[i + 1] + ring[i + 3]) * cross;
  }
  return { x: x / (3 * area), z: z / (3 * area) };
};
const polygonRing = (ring) => {
  const points = [];
  for (let i = 0; i < ring.length; i += 2) points.push([ring[i], ring[i + 1]]);
  if (points[0][0] !== points.at(-1)[0] || points[0][1] !== points.at(-1)[1]) points.push([...points[0]]);
  return points;
};
const flatRing = (points) => points.flatMap(([x, z]) => [round(x), round(z)]);
const pointInside = (ring, x, z) => {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
function pointSegment(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
const cross = (ax, az, bx, bz) => ax * bz - az * bx;
function intersects(ax, az, bx, bz, cx, cz, dx, dz) {
  const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz, denominator = cross(rx, rz, sx, sz);
  if (Math.abs(denominator) < 1e-9) return false;
  const qx = cx - ax, qz = cz - az, t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}
function segmentRingDistance(ax, az, bx, bz, ring) {
  let distance = Math.min(pointSegment(ax, az, bx, bz, ring[0], ring[1], ring[2], ring[3]), pointSegment(bx, bz, ax, az, ring[0], ring[1], ring[2], ring[3]));
  for (let i = 2; i < ring.length; i += 2) {
    const cx = ring[i - 2], cz = ring[i - 1], dx = ring[i], dz = ring[i + 1];
    if (intersects(ax, az, bx, bz, cx, cz, dx, dz)) return 0;
    distance = Math.min(distance, pointSegment(ax, az, cx, cz, dx, dz), pointSegment(bx, bz, cx, cz, dx, dz), pointSegment(cx, cz, ax, az, bx, bz), pointSegment(dx, dz, ax, az, bx, bz));
  }
  return distance;
}

const PARK_SPECS = [
  { key: 'hongkong', id: 42255430, name: '香港公園 Hong Kong Park', englishName: 'Hong Kong Park', grid: 6, officialArea: 81600, officialAreaSource: 'https://hkp.lcsd.gov.hk/en/facilities' },
  { key: 'kowloon', id: 4977404, name: '九龍公園 Kowloon Park', englishName: 'Kowloon Park', grid: 8, officialArea: 133000, officialAreaSource: 'https://www.lcsd.gov.hk/dept/annualrpt/2014-15/en/leisure/facilities.html' },
  { key: 'victoria', id: 4182605, version: 36, name: '維多利亞公園 Victoria Park', englishName: 'Victoria Park', grid: 10, officialArea: 190000, officialAreaSource: 'https://www.lcsd.gov.hk/en/parks/vp/' }
];
const CACHE_FEATURES = {
  hongkong: [
    [42255475, 'heritage'], [114282497, 'heritage'], [114282501, 'conservatory'], [533177818, 'vantage'],
    [114282534, 'garden'], [636809962, 'playground'], [1430785113, 'woods'], [1430785119, 'woods']
  ],
  kowloon: [
    [725140779, 'chineseGarden'], [605220665, 'maze'], [677659680, 'garden'], [529210194, 'playground'],
    [99149483, 'soccer'], [184706096, 'heritage'], [725144299, 'lawn'], [725144300, 'lawn']
  ],
  victoria: [
    [149401985, 'bandstand'], [243449187, 'poolBuilding'], [263769050, 'centralLawn'],
    [100508225, 'bowls'], [563832386, 'bowls'], [263766426, 'soccer'], [263766428, 'soccer'],
    [263766430, 'soccer'], [263766432, 'soccer'], [263766434, 'soccer'], [263766436, 'soccer'],
    [263766437, 'basketball'], [263766438, 'basketball'], [263766439, 'basketball'], [263766440, 'basketball'],
    [100508265, 'tennis'], [149401984, 'tennis'], [149401988, 'tennis'], [263769034, 'tennis'],
    [263769035, 'tennis'], [263769036, 'tennis'], [263769037, 'tennis'], [263769039, 'tennis'],
    [263769040, 'tennis'], [263769042, 'tennis'], [263769044, 'tennis'], [263769045, 'tennis'],
    [263769047, 'tennis'], [263769048, 'tennis'], [505318770, 'roller'], [505318771, 'roller'],
    [505318772, 'handball'], [1046852050, 'tableTennis'], [266110062, 'playground'],
    [545020313, 'playground'], [715532682, 'playground'], [1046852051, 'playground']
  ]
};
// Exact API geometry, expressed once in source coordinates. Missing versions are null rather than invented.
const SUPPLEMENTAL = {
  hongkong: [
    { id: 114282518, kind: 'aviary', name: '尤德觀鳥園 Edward Youde Aviary', version: 12, ring: [[114.1602257,22.2766306],[114.1602481,22.2766002],[114.1602682,22.2765738],[114.160294,22.2765401],[114.1604758,22.2763054],[114.1605573,22.2762277],[114.1606617,22.276158],[114.1607782,22.276124],[114.160941,22.2760923],[114.1609785,22.2760821],[114.1610197,22.2761101],[114.1610858,22.2762271],[114.1610329,22.2764357],[114.1609287,22.276486],[114.1608318,22.2765909],[114.1608019,22.2768251],[114.1606171,22.2768452],[114.1604069,22.2767983],[114.1602257,22.2766306]] },
    { id: 636809959, kind: 'olympic', name: '奧林匹克廣場 Olympic Square', version: null, ring: [[114.1610849,22.2769979],[114.1610982,22.276936],[114.1611325,22.2768814],[114.1611841,22.2768401],[114.1612473,22.2768165],[114.1613155,22.2768132],[114.1613811,22.2768306],[114.161437,22.2768668],[114.1614772,22.2769177],[114.1614974,22.2769781],[114.1614953,22.2770412],[114.1614712,22.2771002],[114.1614276,22.2771488],[114.1613694,22.2771817],[114.1613028,22.2771953],[114.161235,22.2771882],[114.1611734,22.277161],[114.1611246,22.2771169],[114.161094,22.2770605],[114.1610849,22.2769979]] }
  ],
  kowloon: [
    { id: 205702220, kind: 'birdLake', name: '鳥湖 Bird Lake', version: null, ring: [[114.1693422,22.2999543],[114.169361,22.2999072],[114.1693958,22.2998873],[114.1693851,22.2998402],[114.1694227,22.2998501],[114.1694629,22.2998104],[114.1695058,22.2997732],[114.1695434,22.2997756],[114.1695541,22.2998104],[114.1695273,22.299865],[114.1695058,22.2998873],[114.1695755,22.2998972],[114.169605,22.2998948],[114.1696587,22.2998625],[114.1697204,22.299865],[114.1697713,22.2998824],[114.1697767,22.2999245],[114.1697848,22.2999518],[114.1698438,22.2999742],[114.1698733,22.2999568],[114.1698733,22.299927],[114.1698518,22.2998948],[114.1698464,22.29986],[114.1698733,22.2998129],[114.1699135,22.2997806],[114.1699591,22.2997881],[114.1699591,22.2998327],[114.169994,22.2998799],[114.1700664,22.299932],[114.17012,22.2999419],[114.1701656,22.2999171],[114.1701683,22.2998799],[114.1701978,22.2998774],[114.1701898,22.2999841],[114.170112,22.3000387],[114.1700235,22.3000734],[114.1699537,22.3000784],[114.1698733,22.3000461],[114.1697955,22.3000263],[114.1697177,22.3000114],[114.1696319,22.3000288],[114.1695729,22.3000635],[114.1695192,22.3000486],[114.1694709,22.3000288],[114.1694066,22.3000263],[114.169369,22.300004],[114.1693422,22.2999543]] },
    { id: 99149401, kind: 'sportsCentre', name: '九龍公園體育館 Kowloon Park Sports Centre', version: null, ring: [[114.1692579,22.301869],[114.1692778,22.3015579],[114.1700466,22.3016001],[114.1700425,22.3016094],[114.1700082,22.3021472],[114.1700027,22.3022332],[114.1697708,22.3022205],[114.1697914,22.3018982],[114.1692579,22.301869]] },
    { id: 184706095, kind: 'poolComplex', name: '九龍公園游泳池 Kowloon Park Swimming Pool', version: null, ring: [[114.1702277,22.3015469],[114.1702394,22.301331],[114.1702598,22.3013169],[114.1702836,22.3012909],[114.1702956,22.3012654],[114.1702991,22.3012325],[114.1702887,22.3011987],[114.1702739,22.3011743],[114.1702472,22.3011475],[114.1702649,22.3008969],[114.1703059,22.3008825],[114.1705354,22.3009223],[114.1705532,22.3009681],[114.1708569,22.3009827],[114.1709344,22.3009773],[114.1713878,22.3007955],[114.1714091,22.3007918],[114.1714302,22.3007987],[114.1714457,22.3008123],[114.1714495,22.3008348],[114.171426,22.3011623],[114.1709279,22.3011351],[114.1708833,22.3011327],[114.170833,22.3011491],[114.1707961,22.3011772],[114.1707721,22.3012125],[114.1707592,22.3012573],[114.1707562,22.3012972],[114.1707665,22.3013375],[114.1707922,22.3013791],[114.1708308,22.3014094],[114.1708957,22.3014289],[114.1711177,22.3015043],[114.17115,22.3015171],[114.1711745,22.3015399],[114.17119,22.3015662],[114.171187,22.3016482],[114.1712076,22.301649],[114.1713074,22.3016527],[114.1713175,22.3016531],[114.1713133,22.3017282],[114.1712986,22.3019963],[114.171292,22.3021165],[114.1712339,22.3021145],[114.1712311,22.3021736],[114.1704673,22.3021329],[114.1704951,22.3017163],[114.1702962,22.3017062],[114.1703036,22.301605],[114.1703056,22.301578],[114.170307,22.3015496],[114.1702277,22.3015469]] }
  ],
  victoria: [
    { id: 962060334, kind: 'centreCourt', name: '維多利亞公園中央網球場 Victoria Park Centre Court', version: null, ring: [[114.1892615,22.2830019],[114.1892828,22.2829747],[114.1893116,22.282938],[114.1895283,22.2826617],[114.1897172,22.2824211],[114.1897734,22.2824585],[114.189824,22.2824921],[114.1898437,22.2824668],[114.1900092,22.2825778],[114.1899901,22.2826023],[114.1900271,22.2826269],[114.1900394,22.2826351],[114.1900923,22.2826702],[114.1900774,22.2826894],[114.1898671,22.2829608],[114.1896462,22.2832458],[114.1896374,22.2832572],[114.1896053,22.2832354],[114.1892738,22.2830102],[114.1892615,22.2830019]] },
    { id: 584942761, kind: 'fountainPlaza', name: '噴水池廣場 Water Fountain Plaza', version: null, ring: [[114.187033,22.2809757],[114.1870344,22.2809296],[114.1870463,22.2808849],[114.1871309,22.2806564],[114.1872953,22.2804478],[114.1875109,22.2805933],[114.1875603,22.2806267],[114.1876074,22.2806584],[114.1875904,22.2806801],[114.1875246,22.2807636],[114.1874629,22.280842],[114.1874785,22.2808653],[114.1874952,22.2809093],[114.1875013,22.2809557],[114.1874967,22.2810022],[114.1874813,22.2810466],[114.1874563,22.2810869],[114.1874225,22.2811212],[114.1873816,22.2811481],[114.1873355,22.2811664],[114.1872862,22.2811752],[114.187236,22.281174],[114.1871872,22.281163],[114.1871421,22.2811427],[114.1871129,22.2811226],[114.1870873,22.2810986],[114.1870661,22.2810712],[114.1870498,22.2810411],[114.1870386,22.281009],[114.187033,22.2809757]] }
  ]
};

function sourceFeature(element, kind, source) {
  const geometry = element.geometry.map(({ lon, lat }) => project(lon, lat));
  const ring = flatRing(geometry);
  return {
    id: element.id, kind, name: element.tags?.name || element.tags?.['name:en'] || `${kind} ${element.id}`,
    ring, bounds: bounds(ring), area: Math.abs(ringArea(ring)), centre: centre(ring), tags: element.tags || {},
    source: { type: 'way', id: element.id, version: null, sourceTimestamp: source.sourceTimestamp, sourceUrl: `https://www.openstreetmap.org/way/${element.id}`, attribution: source.attribution, license: source.license, cacheSha256: source.sha256 }
  };
}
function supplementalFeature(spec) {
  const ring = flatRing(spec.ring.map(([lon, lat]) => project(lon, lat)));
  return {
    id: spec.id, kind: spec.kind, name: spec.name, ring, bounds: bounds(ring), area: Math.abs(ringArea(ring)), centre: centre(ring), tags: {},
    source: { type: 'way', id: spec.id, version: spec.version, sourceTimestamp: null, retrieved: '2026-11-06', sourceUrl: `https://www.openstreetmap.org/api/0.6/way/${spec.id}/full.json`, attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0' }
  };
}
function roadQuad(ax, az, bx, bz, width) {
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
  if (length < 1e-6) return null;
  const nx = dz / length * width * .5, nz = -dx / length * width * .5;
  return [[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz], [ax + nx, az + nz]];
}
function joinDisc(x, z, radius) {
  const ring = [];
  for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4; ring.push([x + Math.sin(a) * radius, z + Math.cos(a) * radius]); }
  return ring;
}
function roadDataForSite(siteRing) {
  const b = bounds(siteRing), ways = [], corridors = [], clearance = .75;
  for (const [id, road] of HK_FULL_ROADS.roads.entries()) {
    const [name, width, dir, lanes, flags, flat] = road;
    const rb = bounds(flat), margin = width * .5 + clearance + 1;
    if (rb.maxX < b.minX - margin || rb.minX > b.maxX + margin || rb.maxZ < b.minZ - margin || rb.minZ > b.maxZ + margin) continue;
    const segments = [];
    for (let i = 2; i < flat.length; i += 2) {
      const ax = flat[i - 2], az = flat[i - 1], bx = flat[i], bz = flat[i + 1];
      if (Math.hypot(bx - ax, bz - az) < 1e-6) continue;
      if (Math.max(ax, bx) < b.minX - margin || Math.min(ax, bx) > b.maxX + margin || Math.max(az, bz) < b.minZ - margin || Math.min(az, bz) > b.maxZ + margin) continue;
      const inside = pointInside(siteRing, ax, az) || pointInside(siteRing, bx, bz);
      if (!inside && segmentRingDistance(ax, az, bx, bz, siteRing) > width * .5 + clearance) continue;
      segments.push([ax, az, bx, bz]);
      const corridorWidth = width + clearance * 2;
      const quad = roadQuad(ax, az, bx, bz, corridorWidth);
      if (quad) corridors.push([quad]);
      corridors.push([joinDisc(ax, az, corridorWidth * .5)], [joinDisc(bx, bz, corridorWidth * .5)]);
    }
    if (segments.length) ways.push({ id, name, width, dir, lanes, flags, segments });
  }
  return { ways, corridors };
}
function triangulateBase(siteRing, corridors, grid) {
  const site = [polygonRing(siteRing)];
  const cleared = corridors.length ? polygonClipping.difference(site, ...corridors) : [site];
  const triangles = [];
  for (const polygon of cleared) {
    const all = polygon.flat(), xs = all.map((p) => p[0]), zs = all.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    for (let x = Math.floor(minX / grid) * grid; x < maxX; x += grid) for (let z = Math.floor(minZ / grid) * grid; z < maxZ; z += grid) {
      const cell = [[[x, z], [x + grid, z], [x + grid, z + grid], [x, z + grid], [x, z]]];
      let pieces;
      try { pieces = polygonClipping.intersection([polygon], [cell]); } catch { continue; }
      for (const piece of pieces) {
        const flat = [], holes = [];
        for (const ring of piece) {
          if (holes.length || flat.length) holes.push(flat.length / 2);
          for (let i = 0; i < ring.length - 1; i++) flat.push(ring[i][0], ring[i][1]);
        }
        if (flat.length < 6) continue;
        const indices = earcut(flat, holes, 2);
        for (let i = 0; i < indices.length; i += 3) {
          for (const index of [indices[i], indices[i + 1], indices[i + 2]]) triangles.push(round(flat[index * 2]), round(flat[index * 2 + 1]));
        }
      }
    }
  }
  let area = 0;
  for (let i = 0; i < triangles.length; i += 6) area += Math.abs((triangles[i + 2] - triangles[i]) * (triangles[i + 5] - triangles[i + 1]) - (triangles[i + 4] - triangles[i]) * (triangles[i + 3] - triangles[i + 1])) * .5;
  return { triangles, area, polygons: cleared.length };
}

export async function buildMajorParks({ outFile = fileURLToPath(new URL('../../../js/hk-major-parks-data.js', import.meta.url)) } = {}) {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const parksCache = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/parks.json'), 'utf8'));
  const landmarkCache = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/hongkong/landmarks.json'), 'utf8'));
  const cacheElements = [...parksCache.elements, ...landmarkCache.elements];
  const byId = new Map(cacheElements.map((element) => [element.id, element]));
  const output = { version: 1, generatedBy: 'tools/cities/hongkong/build-major-parks.mjs', roadClearance: .75, parks: [] };
  for (const spec of PARK_SPECS) {
    const siteElement = byId.get(spec.id);
    if (!siteElement) throw new Error(`Missing park site ${spec.id}`);
    const site = sourceFeature(siteElement, 'park', parksCache.source);
    if (spec.version) site.source = { ...site.source, version: spec.version, versionEvidence: 'OSM/Nominatim lookup on 2026-11-06; cache geometry retained unchanged.' };
    const features = CACHE_FEATURES[spec.key].map(([id, kind]) => {
      const element = byId.get(id); if (!element) throw new Error(`Missing ${spec.key} feature ${id}`);
      return sourceFeature(element, kind, parksCache.source);
    });
    features.push(...SUPPLEMENTAL[spec.key].map(supplementalFeature));
    const roads = roadDataForSite(site.ring);
    const base = triangulateBase(site.ring, roads.corridors, spec.grid);
    output.parks.push({
      key: spec.key, id: spec.id, name: spec.name, englishName: spec.englishName,
      ring: site.ring, bounds: site.bounds, area: site.area, centre: site.centre, source: site.source,
      officialArea: spec.officialArea, officialAreaSource: spec.officialAreaSource,
      grid: spec.grid, baseTriangles: base.triangles, baseArea: base.area, basePolygons: base.polygons,
      roads: roads.ways, features
    });
    console.log(`${spec.englishName}: site ${site.area.toFixed(1)} m², road-cleared base ${base.area.toFixed(1)} m², ${base.triangles.length / 6} triangles, ${features.length} features, ${roads.ways.length} road ways`);
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `// Generated by tools/cities/hongkong/build-major-parks.mjs. Exact OSM site/facility rings; road-cleared terrain triangles.\nexport const HK_MAJOR_PARKS = ${JSON.stringify(output)};\n`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildMajorParks();
