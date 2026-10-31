// Build a Hong Kong terrain grid in the app's tangent-plane frame and terrain-relative OSM tunnel profiles.
// Input: Lands Department 5 m DTM, resampled to 70 m in HK1980 grid by the attributed source snapshot.
// Output is fully local: the runtime does not download elevation data or need a projection library.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';
import { makeFrame } from '../../geo/frame.mjs';
import cfg from './config.mjs';
import { HK_FULL_ROADS } from '../../../js/hk-full-roads-data.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = path.resolve(HERE, '../../data/hongkong/terrain');
const DEFAULT_OUT = path.resolve(HERE, '../../../js/hk-terrain-data.js');
const DEFAULT_MANIFEST = path.join(DATA_DIR, 'manifest.json');
const CELL = 70;
const SCALE = 4; // 0.25 m quantisation; the source itself is only accurate to about +/-5 m.
const ROAD_TOP = 0.025;
const TUNNEL_COVER = 4;
const TUNNEL_TUBE_HEIGHT = 5.5;
const SOURCE_REPO_COMMIT = '5777bc98fb354c369ee6234d08c64a38279e3a27';

proj4.defs('EPSG:2326', '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs');
const toHk1980 = proj4('EPSG:4326', 'EPSG:2326');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const keyFor = (x, z) => `${(Math.round(x * 10) / 10).toFixed(1)},${(Math.round(z * 10) / 10).toFixed(1)}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function sourceSampler(source, georef) {
  const at = (col, row) => source.elev[row * source.w + col] || 0;
  return (easting, northing) => {
    const col = (easting - georef.bE) / georef.aE;
    const row = (northing - georef.bN) / georef.aN;
    if (col < 0 || row < 0 || col > source.w - 1 || row > source.h - 1) return 0;
    const x0 = Math.floor(col), y0 = Math.floor(row);
    const x1 = Math.min(source.w - 1, x0 + 1), y1 = Math.min(source.h - 1, y0 + 1);
    const tx = col - x0, ty = row - y0;
    return at(x0, y0) * (1 - tx) * (1 - ty) + at(x1, y0) * tx * (1 - ty)
      + at(x0, y1) * (1 - tx) * ty + at(x1, y1) * tx * ty;
  };
}

class MinHeap {
  constructor() { this.items = []; }
  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= item[0]) break;
      a[i] = a[p]; i = p;
    }
    a[i] = item;
  }
  pop() {
    const a = this.items;
    if (!a.length) return null;
    const root = a[0], tail = a.pop();
    if (a.length) {
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= a.length) break;
        if (child + 1 < a.length && a[child + 1][0] < a[child][0]) child++;
        if (a[child][0] >= tail[0]) break;
        a[i] = a[child]; i = child;
      }
      a[i] = tail;
    }
    return root;
  }
  get length() { return this.items.length; }
}

function buildTunnelProfiles(roads, terrainAt) {
  const nodes = [], nodeByKey = new Map(), surfaceKeys = new Set(), ways = [];
  const nodeAt = (x, z) => {
    const key = keyFor(x, z);
    let id = nodeByKey.get(key);
    if (id === undefined) {
      id = nodes.length;
      nodeByKey.set(key, id);
      nodes.push({ id, key, x, z, edges: [], height: 0, portal: false });
    }
    return id;
  };
  for (const road of roads) {
    const flat = road[5];
    if (!(road[4] & 4)) {
      for (let i = 0; i + 1 < flat.length; i += 2) surfaceKeys.add(keyFor(flat[i], flat[i + 1]));
    }
  }
  for (const [wayId, road] of roads.entries()) {
    if (!(road[4] & 4)) continue;
    const flat = road[5], ids = [];
    for (let i = 0; i + 1 < flat.length; i += 2) ids.push(nodeAt(flat[i], flat[i + 1]));
    const way = { wayId, width: road[1], ids };
    ways.push(way);
    for (let i = 1; i < ids.length; i++) {
      const a = ids[i - 1], b = ids[i];
      if (a === b) continue;
      const length = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
      if (length < 0.01) continue;
      nodes[a].edges.push({ to: b, length });
      nodes[b].edges.push({ to: a, length });
    }
  }

  const unseen = new Set(nodes.map((node) => node.id));
  let componentCount = 0;
  while (unseen.size) {
    const first = unseen.values().next().value;
    unseen.delete(first);
    const stack = [first], component = [];
    while (stack.length) {
      const id = stack.pop();
      component.push(id);
      for (const edge of nodes[id].edges) {
        if (!unseen.has(edge.to)) continue;
        unseen.delete(edge.to);
        stack.push(edge.to);
      }
    }
    componentCount++;
    const portals = component.filter((id) => surfaceKeys.has(nodes[id].key) || nodes[id].edges.length <= 1);
    if (!portals.length) throw new Error(`Tunnel component ${componentCount} has no surface portal`);
    for (const id of component) nodes[id].portal = portals.includes(id);
    const distances = new Map();
    for (const portal of portals) {
      const dist = new Map([[portal, 0]]), heap = new MinHeap();
      heap.push([0, portal]);
      while (heap.length) {
        const [current, id] = heap.pop();
        if (current !== dist.get(id)) continue;
        for (const edge of nodes[id].edges) {
          const next = current + edge.length;
          if (next >= (dist.get(edge.to) ?? Infinity)) continue;
          dist.set(edge.to, next);
          heap.push([next, edge.to]);
        }
      }
      distances.set(portal, dist);
      nodes[portal].height = terrainAt(nodes[portal].x, nodes[portal].z) + ROAD_TOP;
    }
    for (const id of component) {
      const node = nodes[id];
      if (node.portal) continue;
      let weighted = 0, weights = 0;
      for (const portal of portals) {
        const distance = distances.get(portal).get(id);
        if (!Number.isFinite(distance)) continue;
        const weight = 1 / Math.max(20, distance) ** 2;
        weighted += nodes[portal].height * weight;
        weights += weight;
      }
      if (!weights) throw new Error(`Disconnected tunnel node ${node.key}`);
      node.height = Math.min(weighted / weights, terrainAt(node.x, node.z) + ROAD_TOP - TUNNEL_COVER);
    }
  }

  const openingRects = [];
  let minHeight = Infinity, maxHeight = -Infinity;
  const profiles = ways.map((way) => {
    const heights = way.ids.map((id) => nodes[id].height);
    for (const height of heights) { minHeight = Math.min(minHeight, height); maxHeight = Math.max(maxHeight, height); }
    for (let i = 1; i < way.ids.length; i++) {
      const a = nodes[way.ids[i - 1]], b = nodes[way.ids[i]];
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      if (length < 0.01) continue;
      const steps = Math.max(1, Math.ceil(length / 20));
      for (let step = 0; step < steps; step++) {
        const t0 = step / steps, t1 = (step + 1) / steps;
        const ax = a.x + dx * t0, az = a.z + dz * t0, bx = a.x + dx * t1, bz = a.z + dz * t1;
        const ay = heights[i - 1] + (heights[i] - heights[i - 1]) * t0;
        const by = heights[i - 1] + (heights[i] - heights[i - 1]) * t1;
        const cx = (ax + bx) * 0.5, cz = (az + bz) * 0.5;
        const surface = terrainAt(cx, cz) + ROAD_TOP;
        if (Math.max(ay, by) + TUNNEL_TUBE_HEIGHT <= surface + 0.05 || Math.min(ay, by) >= surface + 0.5) continue;
        const partLength = length / steps, ux = dx / length, uz = dz / length;
        const hx = partLength * 0.5 + 0.35, hz = way.width * 0.5 + 0.75;
        const ex = Math.abs(ux) * hx + Math.abs(uz) * hz;
        const ez = Math.abs(uz) * hx + Math.abs(ux) * hz;
        openingRects.push({
          cx, cz, ux, uz, hx, hz, routeId: `osm-tunnel:${way.wayId}`,
          minX: cx - ex, maxX: cx + ex, minZ: cz - ez, maxZ: cz + ez
        });
      }
    }
    return heights;
  });
  return { profiles, openingRects, stats: {
    tunnelWays: ways.length, tunnelNodes: nodes.length, tunnelComponents: componentCount,
    tunnelPortals: nodes.filter((node) => node.portal).length,
    tunnelOpeningRects: openingRects.length,
    tunnelMinHeight: minHeight, tunnelMaxHeight: maxHeight,
    tunnelProfile: 'procedural portal-distance blend with 4 m minimum DTM-relative cover; not surveyed engineering depth'
  } };
}

export async function buildHongKongTerrain({ outFile = DEFAULT_OUT, manifestFile = DEFAULT_MANIFEST } = {}) {
  const sourceFile = path.join(DATA_DIR, 'hk-dtm5m.json');
  const georefFile = path.join(DATA_DIR, 'hk-georef.json');
  const source = readJson(sourceFile), georef = readJson(georefFile);
  if (source.w * source.h !== source.elev.length) throw new Error('DTM dimensions do not match elevation count');
  const sampleSource = sourceSampler(source, georef);
  const frame = makeFrame(cfg.frame);
  if (cfg.frame.bearingDeg || cfg.frame.origin.lat !== cfg.frame.lat0 || cfg.frame.origin.lon !== cfg.frame.lon0) {
    throw new Error('The terrain builder currently requires the canonical unrotated Hong Kong frame');
  }
  const bounds = HK_FULL_ROADS.bounds;
  const minX = Math.floor((bounds.minX - CELL) / CELL) * CELL;
  const maxX = Math.ceil((bounds.maxX + CELL) / CELL) * CELL;
  const minZ = Math.floor((bounds.minZ - CELL) / CELL) * CELL;
  const maxZ = Math.ceil((bounds.maxZ + CELL) / CELL) * CELL;
  const w = Math.round((maxX - minX) / CELL) + 1, h = Math.round((maxZ - minZ) / CELL) + 1;
  const elevationBytes = Buffer.alloc(w * h * 2);
  let minElevation = Infinity, maxElevation = -Infinity;
  for (let row = 0; row < h; row++) {
    const z = minZ + row * CELL;
    const lat = cfg.frame.lat0 - z / frame.KY;
    for (let col = 0; col < w; col++) {
      const x = minX + col * CELL;
      const lon = cfg.frame.lon0 + x / frame.KX;
      const [easting, northing] = toHk1980.forward([lon, lat]);
      const elevation = sampleSource(easting, northing);
      minElevation = Math.min(minElevation, elevation); maxElevation = Math.max(maxElevation, elevation);
      elevationBytes.writeUInt16LE(Math.round(clamp(elevation, 0, 10000) * SCALE), (row * w + col) * 2);
    }
  }
  const outputAt = (x, z) => {
    const col = clamp((x - minX) / CELL, 0, w - 1), row = clamp((z - minZ) / CELL, 0, h - 1);
    const x0 = Math.floor(col), y0 = Math.floor(row), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
    const tx = col - x0, ty = row - y0;
    const at = (xx, yy) => elevationBytes.readUInt16LE((yy * w + xx) * 2) / SCALE;
    const a = at(x0, y0), b = at(x1, y0), c = at(x0, y1), d = at(x1, y1);
    // Match the exact two triangles used by the runtime terrain mesh (a,d,b) and (b,d,e).
    return tx + ty <= 1 ? a + tx * (b - a) + ty * (c - a)
      : d * (tx + ty - 1) + b * (1 - ty) + c * (1 - tx);
  };
  const tunnels = buildTunnelProfiles(HK_FULL_ROADS.roads, outputAt);
  const tunnelBytes = Buffer.alloc(tunnels.profiles.reduce((sum, profile) => sum + profile.length, 0) * 2);
  let offset = 0;
  for (const profile of tunnels.profiles) for (const height of profile) {
    tunnelBytes.writeInt16LE(Math.round(height * SCALE), offset);
    offset += 2;
  }
  const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
  const data = {
    version: 1,
    city: 'hongkong',
    source: {
      dataset: 'Hong Kong Lands Department 5 m Digital Terrain Model (DTM)',
      officialDataset: 'https://data.gov.hk/en-data/dataset/hk-landsd-openmap-5m-grid-dtm',
      officialDownload: 'https://www.landsd.gov.hk/landsd_psi_data/SMO/data/Whole_HK_DTM_5m.zip',
      attribution: 'Survey and Mapping Office, Lands Department, Government of the HKSAR; DATA.GOV.HK terms',
      accuracy: '5 m source raster, approximately +/-5 m; includes vegetation and some non-ground elevated structures',
      processedSnapshot: `https://github.com/wiiiimm/hongkong-sandbox/blob/${SOURCE_REPO_COMMIT}/3d-viewer/data/hk-dtm5m.json`,
      processedSnapshotSha256: sourceSha256,
      sourceGrid: 'HK1980 Grid / EPSG:2326, 70 m resampling of the official 5 m DTM',
      outputGrid: 'Application local tangent plane, 70 m reprojection, triangle-matched sampling, 0.25 m quantisation'
    },
    grid: { w, h, cell: CELL, minX, minZ, maxX, maxZ, scale: SCALE, minElevation, maxElevation },
    elevations: elevationBytes.toString('base64'),
    tunnel: { wayCount: tunnels.profiles.length, scale: SCALE, heights: tunnelBytes.toString('base64'), openingRects: tunnels.openingRects },
    stats: tunnels.stats
  };
  const output = `// Generated by tools/cities/hongkong/build-terrain.mjs. Do not hand-edit.\n// Hong Kong Lands Department DTM; see tools/data/hongkong/terrain/SOURCE.md for attribution and limits.\nexport const HK_TERRAIN = ${JSON.stringify(data)};\n`;
  fs.writeFileSync(outFile, output);
  const checks = [
    { name: '大帽山 Tai Mo Shan', lon: 114.12476, lat: 22.41036, min: 900, max: 1000 },
    { name: '太平山 Victoria Peak', lon: 114.14587, lat: 22.27635, min: 500, max: 560 },
    { name: '鳳凰山 Lantau Peak', lon: 113.91974, lat: 22.24897, min: 850, max: 950 },
    { name: '中環 Central', lon: 114.1596, lat: 22.2819, min: 0, max: 100 }
  ].map((check) => {
    const [x, z] = frame.toWorld(check.lon, check.lat);
    const elevation = outputAt(x, z);
    if (elevation < check.min || elevation > check.max) throw new Error(`${check.name} elevation ${elevation} outside ${check.min}..${check.max}`);
    return { name: check.name, x, z, elevation };
  });
  const manifest = {
    ...data.source,
    output: path.relative(process.cwd(), outFile), bytes: Buffer.byteLength(output),
    grid: data.grid, stats: data.stats, checks,
    sourceFiles: [path.relative(process.cwd(), sourceFile), path.relative(process.cwd(), georefFile)]
  };
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[hk-terrain] ${w}x${h} grid, ${minElevation.toFixed(2)}..${maxElevation.toFixed(2)} m, ${manifest.bytes} bytes`);
  console.log(`[hk-terrain] ${tunnels.stats.tunnelWays} tunnel ways / ${tunnels.stats.tunnelComponents} components / ${tunnels.stats.tunnelOpeningRects} opening rects`);
  console.log(`[hk-terrain] ${checks.map((check) => `${check.name} ${check.elevation.toFixed(2)}m`).join(', ')}`);
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildHongKongTerrain();
}
