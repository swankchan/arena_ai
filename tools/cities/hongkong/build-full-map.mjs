// Build the overview-only, whole-Hong-Kong OSM atlas used by the M map. The detailed 3D core remains a separate
// build (build.mjs); this file contains real coastline, roads, parks and place nodes without generating 3D buildings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFrame } from '../../geo/frame.mjs';
import { bbox, dedupe, landWinding, pointInRing, rdp, rdpRing, ringArea } from '../../geo/geom.mjs';
import { buildParks } from '../../geo/parks.mjs';
import { zhName } from '../../geo/osm.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_DATA = path.resolve(HERE, '../../data/hongkong/full-map-cache');
const DEFAULT_OUT = path.resolve(HERE, '../../../js/hk-full-map-data.js');
const DEFAULT_MANIFEST = path.resolve(HERE, '../../data/hongkong/full-map-manifest.json');
const q = (value) => Math.round(value * 10) / 10;
const flat = (points) => points.flatMap(([x, z]) => [q(x), q(z)]);
const pointKey = ([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function worldBounds(bounds, frame) {
  const corners = [
    [bounds.west, bounds.south], [bounds.east, bounds.south],
    [bounds.west, bounds.north], [bounds.east, bounds.north]
  ].map(([lon, lat]) => frame.toWorld(lon, lat));
  const bb = bbox(corners);
  return { minX: bb.x0, maxX: bb.x1, minZ: bb.z0, maxZ: bb.z1 };
}

// OSM coastline ways share exact end nodes. Assemble those ways first, then close the few extract-boundary chains
// along the nearest download edge. This avoids turning towns into water through a coarse raster flood fill.
export function assembleLandRings(elements, toWorld, bounds) {
  const ways = elements
    .filter((element) => element.type === 'way' && element.geometry?.length > 1)
    .map((element) => ({ id: element.id, points: element.geometry.map((node) => toWorld(node.lon, node.lat)) }));
  const endpoints = new Map();
  for (let index = 0; index < ways.length; index++) {
    for (const end of [0, 1]) {
      const point = end ? ways[index].points.at(-1) : ways[index].points[0];
      const key = pointKey(point);
      let list = endpoints.get(key);
      if (!list) endpoints.set(key, list = []);
      list.push({ way: index, end });
    }
  }

  const used = new Uint8Array(ways.length);
  const rings = [];
  const open = [];
  for (let start = 0; start < ways.length; start++) {
    if (used[start]) continue;
    const way = ways[start];
    if (pointKey(way.points[0]) === pointKey(way.points.at(-1))) {
      used[start] = 1;
      rings.push(way.points.slice(0, -1));
      continue;
    }
    const points = way.points.slice();
    used[start] = 1;
    while (true) {
      const candidates = (endpoints.get(pointKey(points.at(-1))) || []).filter((entry) => !used[entry.way]);
      if (!candidates.length) break;
      const next = candidates[0];
      const nextWay = ways[next.way];
      used[next.way] = 1;
      const oriented = next.end === 0 ? nextWay.points : nextWay.points.slice().reverse();
      points.push(...oriented.slice(1));
      if (pointKey(points[0]) === pointKey(points.at(-1))) break;
    }
    if (pointKey(points[0]) === pointKey(points.at(-1))) rings.push(points.slice(0, -1));
    else open.push(points);
  }

  // A first pass can begin in the middle of a chain. Join the remaining fragments at either end before closing them.
  const pool = open.slice();
  const chains = [];
  while (pool.length) {
    let line = pool.shift();
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < pool.length; i++) {
        const other = pool[i];
        let next = null;
        if (pointKey(line.at(-1)) === pointKey(other[0])) next = line.concat(other.slice(1));
        else if (pointKey(line.at(-1)) === pointKey(other.at(-1))) next = line.concat(other.slice(0, -1).reverse());
        else if (pointKey(line[0]) === pointKey(other.at(-1))) next = other.slice(0, -1).concat(line);
        else if (pointKey(line[0]) === pointKey(other[0])) next = other.slice(1).reverse().concat(line);
        if (!next) continue;
        line = next;
        pool.splice(i, 1);
        changed = true;
        break;
      }
    }
    chains.push(line);
  }

  for (const line of chains) {
    const a = line[0], b = line.at(-1);
    const side = [
      { id: 'n', score: Math.abs(a[1] - bounds.minZ) + Math.abs(b[1] - bounds.minZ) },
      { id: 's', score: Math.abs(a[1] - bounds.maxZ) + Math.abs(b[1] - bounds.maxZ) },
      { id: 'w', score: Math.abs(a[0] - bounds.minX) + Math.abs(b[0] - bounds.minX) },
      { id: 'e', score: Math.abs(a[0] - bounds.maxX) + Math.abs(b[0] - bounds.maxX) }
    ].sort((x, y) => x.score - y.score)[0].id;
    if (side === 'n') rings.push(line.concat([[b[0], bounds.minZ], [a[0], bounds.minZ]]));
    else if (side === 's') rings.push(line.concat([[b[0], bounds.maxZ], [a[0], bounds.maxZ]]));
    else if (side === 'w') rings.push(line.concat([[bounds.minX, b[1]], [bounds.minX, a[1]]]));
    else rings.push(line.concat([[bounds.maxX, b[1]], [bounds.maxX, a[1]]]));
  }

  return rings
    .map((ring) => landWinding(rdpRing(ring, 4)))
    .filter((ring) => ring.length >= 4 && Math.abs(ringArea(ring)) >= 2000)
    .sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)));
}

function roadClass(tags) {
  const highway = tags.highway || '';
  if (/^(motorway|trunk)/.test(highway)) return 0;
  if (/^primary/.test(highway)) return 1;
  if (/^secondary/.test(highway)) return 2;
  if (/^tertiary/.test(highway)) return 3;
  if (/^(unclassified|residential|living_street|service|pedestrian)$/.test(highway)) return 4;
  return -1;
}

function buildOverviewRoads(elements, toWorld) {
  const roads = [];
  for (const element of elements) {
    if (element.type !== 'way' || !element.geometry || element.tags?.area === 'yes') continue;
    const cls = roadClass(element.tags || {});
    if (cls < 0) continue;
    const name = zhName(element.tags);
    if (cls === 4 && element.tags.highway === 'service' && !name) continue;
    const points = dedupe(element.geometry.map((node) => toWorld(node.lon, node.lat)), 0.2);
    if (points.length < 2) continue;
    roads.push([cls, name, flat(rdp(points, cls <= 2 ? 6 : 10))]);
  }
  return roads;
}

function buildOverviewPlaces(placeElements, coastlineElements, toWorld) {
  const rankFor = (place) => {
    if (place === 'city' || place === 'town' || place === 'island') return 0;
    if (place === 'suburb' || place === 'quarter' || place === 'archipelago') return 1;
    if (place === 'village') return 2;
    return 3;
  };
  const places = [];
  for (const element of placeElements) {
    let x, z;
    if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) {
      [x, z] = toWorld(element.lon, element.lat);
    } else {
      const points = (element.members || []).flatMap((member) => member.geometry || [])
        .map((node) => toWorld(node.lon, node.lat));
      if (!points.length) continue;
      const bb = bbox(points);
      x = (bb.x0 + bb.x1) * 0.5;
      z = (bb.z0 + bb.z1) * 0.5;
    }
    const name = zhName(element.tags);
    if (name) places.push([name, q(x), q(z), rankFor(element.tags.place)]);
  }

  // Most named islands are coastline ways rather than place nodes in this extract.
  for (const element of coastlineElements) {
    if (element.type !== 'way' || !element.geometry?.length || !element.tags?.name) continue;
    if (!['island', 'islet'].includes(element.tags.place)) continue;
    const points = element.geometry.map((node) => toWorld(node.lon, node.lat));
    const center = points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]).map((v) => v / points.length);
    places.push([zhName(element.tags), q(center[0]), q(center[1]), element.tags.place === 'island' ? 0 : 2]);
  }

  // Keep the most important label when duplicate OSM objects describe the same place.
  const kept = [];
  for (const place of places.sort((a, b) => a[3] - b[3])) {
    if (kept.some((other) => other[0] === place[0] && Math.hypot(other[1] - place[1], other[2] - place[2]) < (other[3] === 0 || place[3] === 0 ? 6000 : 500))) continue;
    kept.push(place);
  }
  return kept;
}

export async function buildHongKongFullMap({ dataDir = DEFAULT_DATA, outFile = DEFAULT_OUT, manifestFile = DEFAULT_MANIFEST } = {}) {
  const { default: cfg } = await import('./config.mjs');
  const frame = makeFrame(cfg.frame);
  const bounds = worldBounds(cfg.fullMapBounds, frame);
  const coastline = readJson(path.join(dataDir, 'coastline.json'));
  const parksOsm = readJson(path.join(dataDir, 'parks.json'));
  const placesOsm = readJson(path.join(dataDir, 'places.json'));
  const roadFiles = ['roads_major.json', 'roads_minor_sw.json', 'roads_minor_se.json', 'roads_minor_nw.json', 'roads_minor_ne.json'];
  const seen = new Set();
  const roadElements = [];
  for (const file of roadFiles) {
    for (const element of readJson(path.join(dataDir, file)).elements) {
      const key = `${element.type}/${element.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      roadElements.push(element);
    }
  }

  const landRings = assembleLandRings(coastline.elements, frame.toWorld, bounds);
  for (const check of cfg.fullMapLandChecks) {
    const [x, z] = frame.toWorld(check.lon, check.lat);
    if (!landRings.some((ring) => pointInRing(ring, x, z))) {
      throw new Error(`Full-map land check "${check.name}" fell outside every OSM coastline ring`);
    }
  }
  for (const check of cfg.fullMapWaterChecks) {
    const [x, z] = frame.toWorld(check.lon, check.lat);
    if (landRings.some((ring) => pointInRing(ring, x, z))) {
      throw new Error(`Full-map water check "${check.name}" was flooded by an OSM coastline ring`);
    }
  }

  const roads = buildOverviewRoads(roadElements, frame.toWorld);
  const parks = [];
  for (const park of buildParks(parksOsm.elements, frame.toWorld, { minArea: 20000, maxArea: Infinity })) {
    const cat = ['forest', 'wood', 'scrub'].includes(park.cat) ? 1 : 0;
    for (const ring of park.rings) {
      const points = [];
      for (let i = 0; i + 1 < ring.length; i += 2) points.push([ring[i], ring[i + 1]]);
      const simplified = rdpRing(points, 12);
      if (simplified.length >= 4) parks.push([cat, park.name, flat(simplified)]);
    }
  }
  const places = buildOverviewPlaces(placesOsm.elements, coastline.elements, frame.toWorld);
  const roundedBounds = Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, q(value)]));
  const data = {
    version: 1,
    city: 'hongkong',
    source: {
      ...coastline.source,
      bounds: cfg.fullMapBounds,
      note: 'Overview atlas only; the detailed 3D playable core is unchanged. Surrounding coastline is retained for context.'
    },
    bounds: roundedBounds,
    land: landRings.map(flat),
    roads,
    parks,
    places
  };
  const output = `// Generated by tools/cities/hongkong/build-full-map.mjs.\n// © OpenStreetMap contributors, ODbL 1.0. Source: ${data.source.sourceTimestamp} Geofabrik Hong Kong extract.\nexport const HK_FULL_MAP = ${JSON.stringify(data)};\n`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, output);
  const manifest = {
    dataset: data.source.dataset,
    downloadUrl: data.source.downloadUrl,
    sha256: data.source.sha256,
    sourceTimestamp: data.source.sourceTimestamp,
    attribution: data.source.attribution,
    license: data.source.license,
    bounds: cfg.fullMapBounds,
    output: path.relative(process.cwd(), outFile),
    bytes: Buffer.byteLength(output),
    counts: {
      landRings: data.land.length,
      roads: data.roads.length,
      namedRoads: data.roads.filter((road) => road[1]).length,
      parks: data.parks.length,
      places: data.places.length
    },
    validation: {
      landChecks: cfg.fullMapLandChecks.length,
      waterChecks: cfg.fullMapWaterChecks.length
    }
  };
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[hk-full-map] ${data.land.length} land rings, ${roads.length} roads, ${parks.length} parks, ${places.length} places`);
  console.log(`[hk-full-map] ${outFile} (${manifest.bytes} bytes)`);
  return data;
}

function cliValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildHongKongFullMap({
    dataDir: path.resolve(cliValue('--data', DEFAULT_DATA)),
    outFile: path.resolve(cliValue('--out', DEFAULT_OUT)),
    manifestFile: path.resolve(cliValue('--manifest', DEFAULT_MANIFEST))
  });
}
