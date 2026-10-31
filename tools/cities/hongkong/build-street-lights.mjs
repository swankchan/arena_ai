import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { HK_FULL_ROADS } from '../../../js/hk-full-roads-data.js';
import { makeFrame } from '../../geo/frame.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_INPUT = path.resolve(HERE, '../../data/hongkong/lamppost_en.csv');
const DEFAULT_OUT = path.resolve(HERE, '../../../js/hk-street-light-data.js');
const DEFAULT_MANIFEST = path.resolve(HERE, '../../data/hongkong/street-lights-manifest.json');
const ROAD_CELL = 80;
const ROAD_RADIUS = 55;
const q = (value, scale = 1000) => Math.round(value * scale) / scale;

// The supplied CSV has quoted location text, so splitting on commas would corrupt rows containing addresses.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') {
      row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function segmentHit(x, z, segment) {
  const { ax, az, dx, dz, lengthSq } = segment;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
  const px = ax + dx * t, pz = az + dz * t;
  return { x: px, z: pz, distance: Math.hypot(x - px, z - pz), segment };
}

// Index individual simplified road segments rather than whole-way bounds: long territory roads must not become
// candidates for every lamp in a several-kilometre rectangle.
function buildRoadIndex(roads) {
  const cells = new Map();
  let segmentCount = 0;
  for (let wayId = 0; wayId < roads.length; wayId++) {
    const road = roads[wayId], flat = road[5];
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const ax = flat[i - 2], az = flat[i - 1], bx = flat[i], bz = flat[i + 1];
      const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
      if (lengthSq < 0.0001) continue;
      const length = Math.sqrt(lengthSq);
      const segment = {
        ax, az, dx, dz, lengthSq, ux: dx / length, uz: dz / length,
        wayId, width: road[1], dir: road[2], flags: road[4], stamp: 0
      };
      segmentCount++;
      for (let ix = Math.floor(Math.min(ax, bx) / ROAD_CELL); ix <= Math.floor(Math.max(ax, bx) / ROAD_CELL); ix++) {
        for (let iz = Math.floor(Math.min(az, bz) / ROAD_CELL); iz <= Math.floor(Math.max(az, bz) / ROAD_CELL); iz++) {
          const key = `${ix},${iz}`;
          let list = cells.get(key);
          if (!list) cells.set(key, (list = []));
          list.push(segment);
        }
      }
    }
  }
  return { cells, segmentCount };
}

let queryStamp = 0;
function nearbyRoads(index, x, z, radius = ROAD_RADIUS) {
  queryStamp++;
  if (queryStamp >= Number.MAX_SAFE_INTEGER) {
    queryStamp = 1;
    for (const list of index.cells.values()) for (const segment of list) segment.stamp = 0;
  }
  const byWay = new Map();
  for (let ix = Math.floor((x - radius) / ROAD_CELL); ix <= Math.floor((x + radius) / ROAD_CELL); ix++) {
    for (let iz = Math.floor((z - radius) / ROAD_CELL); iz <= Math.floor((z + radius) / ROAD_CELL); iz++) {
      for (const segment of index.cells.get(`${ix},${iz}`) || []) {
        if (segment.stamp === queryStamp) continue;
        segment.stamp = queryStamp;
        const hit = segmentHit(x, z, segment);
        if (hit.distance > radius) continue;
        const current = byWay.get(segment.wayId);
        if (!current || hit.distance < current.distance) byWay.set(segment.wayId, hit);
      }
    }
  }
  return [...byWay.values()].sort((a, b) => a.distance - b.distance);
}

// The source has no arm-style column. A single arm is the safe default. A second arm is derived only for a central
// pole on a wide two-way road, or where a parallel carriageway exists on the opposite side of the pole.
function placementFor(x, z, index) {
  const hits = nearbyRoads(index, x, z);
  const nearest = hits[0];
  if (!nearest) return { x: q(x), z: q(z), heading: 0, arms: 1, matched: false, doubleReason: null };
  const { segment } = nearest;
  let fx = nearest.x - x, fz = nearest.z - z;
  const forwardDistance = Math.hypot(fx, fz);
  if (forwardDistance > 0.15) { fx /= forwardDistance; fz /= forwardDistance; }
  else { fx = segment.uz; fz = -segment.ux; }
  let arms = 1, doubleReason = null;
  if (nearest.distance < 1.6 && segment.width >= 13 && segment.dir === 0) {
    arms = 2;
    doubleReason = 'central-pole-wide-two-way-road';
  } else if (nearest.distance <= 28 && segment.width >= 6) {
    for (let i = 1; i < hits.length; i++) {
      const other = hits[i], otherSegment = other.segment;
      if (other.distance > 28 || other.distance < 0.15 || otherSegment.width < 6) continue;
      const parallel = Math.abs(segment.ux * otherSegment.ux + segment.uz * otherSegment.uz);
      if (parallel < 0.78) continue;
      const ox = (other.x - x) / other.distance, oz = (other.z - z) / other.distance;
      if (fx * ox + fz * oz >= -0.45) continue;
      arms = 2;
      doubleReason = 'opposite-parallel-carriageway';
      break;
    }
  }
  return { x: q(x), z: q(z), heading: q(Math.atan2(fx, fz), 10000), arms, matched: true, doubleReason };
}

export async function buildHongKongStreetLights({
  inputFile = DEFAULT_INPUT,
  outFile = DEFAULT_OUT,
  manifestFile = DEFAULT_MANIFEST,
  roads = HK_FULL_ROADS.roads
} = {}) {
  const { default: config } = await import('./config.mjs');
  const frame = makeFrame(config.frame);
  const sourceBytes = fs.readFileSync(inputFile);
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
  const rows = parseCsv(sourceBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const header = rows.shift();
  const columns = new Map(header.map((name, index) => [name, index]));
  for (const name of ['Lamp Post Number', 'District', 'Location', 'Latitude', 'Longitude']) {
    if (!columns.has(name)) throw new Error(`Missing lamp CSV column: ${name}`);
  }
  if (!rows.length) throw new Error('Lamp CSV has no records');
  const index = buildRoadIndex(roads), lamps = [], districts = {}, doubleReasons = {};
  const ids = new Set(), coordinateIds = new Map();
  let duplicateCoordinates = 0, orientationFallbacks = 0, singleArm = 0, doubleArm = 0;
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const row of rows) {
    const id = row[columns.get('Lamp Post Number')]?.trim();
    const district = row[columns.get('District')]?.trim() || 'Unknown';
    const lat = Number(row[columns.get('Latitude')]), lon = Number(row[columns.get('Longitude')]);
    if (!id || ids.has(id)) throw new Error(`Missing or duplicate lamp post number: ${id || '(blank)'}`);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 22.1 || lat > 22.6 || lon < 113.8 || lon > 114.5) {
      throw new Error(`Invalid coordinates for lamp ${id}: ${lat}, ${lon}`);
    }
    ids.add(id);
    const coordinateKey = `${lat},${lon}`;
    if (coordinateIds.has(coordinateKey)) duplicateCoordinates++;
    else coordinateIds.set(coordinateKey, id);
    districts[district] = (districts[district] || 0) + 1;
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    const [x, z] = frame.toWorld(lon, lat), placement = placementFor(x, z, index);
    lamps.push([placement.x, placement.z, placement.heading, placement.arms]);
    if (placement.matched) {
      if (placement.arms === 2) {
        doubleArm++;
        doubleReasons[placement.doubleReason] = (doubleReasons[placement.doubleReason] || 0) + 1;
      } else singleArm++;
    } else { orientationFallbacks++; singleArm++; }
  }
  const data = {
    version: 1,
    source: {
      file: path.basename(inputFile), sha256: sourceSha256, records: lamps.length,
      armStyles: 'derived-from-road-geometry-not-supplied-by-csv'
    },
    lamps
  };
  const output = `// Generated by tools/cities/hongkong/build-street-lights.mjs.\n// Positions: user-supplied lamppost_en.csv. Arms: geometric derivation; the CSV has no arm-style field.\nexport const HK_STREET_LIGHTS = ${JSON.stringify(data)};\n`;
  const manifest = {
    dataset: 'Hong Kong lamp-post positions',
    source: {
      file: path.basename(inputFile), sha256: sourceSha256, bytes: sourceBytes.length,
      records: rows.length, uniqueLampPostNumbers: ids.size,
      upstreamMetadataSupplied: false,
      fields: header,
      bounds: { south: minLat, north: maxLat, west: minLon, east: maxLon },
      duplicateCoordinates,
      duplicateCoordinatePolicy: 'preserve every uniquely numbered source record'
    },
    position: {
      frame: config.frame,
      precisionM: 0.001,
      order: 'source CSV row order; runtime array index does not replace the source Lamp Post Number'
    },
    derivation: {
      roadSourceSha256: HK_FULL_ROADS.source.sha256,
      roadSourceTimestamp: HK_FULL_ROADS.source.sourceTimestamp,
      roadSegments: index.segmentCount,
      nearestRoadRadiusM: ROAD_RADIUS,
      singleArmDefault: true,
      doubleArmRules: [
        'central pole within 1.6 m of a two-way drivable centreline at least 13 m wide',
        'parallel drivable carriageway on the opposite side, both within 28 m and at least 6 m wide'
      ],
      armStyleFieldInSource: false,
      orientationFallbacks,
      doubleReasons
    },
    counts: {
      lamps: lamps.length,
      singleArm,
      doubleArm,
      luminaireHeads: singleArm + doubleArm * 2,
      districts: Object.fromEntries(Object.entries(districts).sort(([a], [b]) => a.localeCompare(b)))
    },
    output: path.relative(process.cwd(), outFile),
    bytes: Buffer.byteLength(output)
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(outFile, output);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[hk-street-lights] ${lamps.length} lamps: ${singleArm} single-arm, ${doubleArm} double-arm; ${orientationFallbacks} orientation fallbacks`);
  console.log(`[hk-street-lights] ${outFile} (${manifest.bytes} bytes)`);
  return { data, manifest };
}

function cliValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildHongKongStreetLights({
    inputFile: path.resolve(cliValue('--input', DEFAULT_INPUT)),
    outFile: path.resolve(cliValue('--out', DEFAULT_OUT)),
    manifestFile: path.resolve(cliValue('--manifest', DEFAULT_MANIFEST))
  });
}
