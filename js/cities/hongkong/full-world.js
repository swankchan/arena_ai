import * as THREE from 'three/webgpu';
import { HK_FULL_MAP } from '../../hk-full-map-data.js';
import { HK_FULL_ROADS } from './building-priority-roads.js';
import { HK_VERIFIED_BRIDGES } from '../../hk-verified-bridge-data.js';
import { GEO } from '../../hk-geodata.js';
import { createHongKongRoadSurfaceMaterial } from '../../tsl-materials.js';
import { createHongKongHarbourWaterMaterial } from './harbour-water.js';
import { buildTerritoryCoastColliders } from './coast-colliders.js';
import { CROSSING_FLAT_EXCLUSION_IDS, CROSSING_ROUTES } from './crossings.js';
import { buildTunnelOpeningRects, subtractTunnelOpenings } from './tunnel-openings.js';
import {murrayLobbyTerrainCut} from './murray-lobby-site.js';
import { FULL_BOUNDS, isDetailedCore, isTerritoryLand, territoryParkAt } from './full-meta.js';
import { HK_TERRAIN, HONG_KONG_TERRAIN_META, hongKongTerrainCellLand, hongKongTerrainHeight, rawHongKongTerrainHeight } from './terrain.js';
import { roadRibbonHeightAtSegment, roadRibbonProfileAtSegment, verifiedBridgeProfileAtSegment, TERRAIN_TUNNEL_OPENING_RECTS } from './road-elevation.js';
import {
  DERIVED_ROAD_MARKINGS, DERIVED_ROAD_PAINT_POLICY, DERIVED_ROAD_PAINT_STATS,
  addDerivedPaintPolicyStations, derivedPaintAllowed, derivedPaintEdgeMask, signedRoadLaneCount
} from './derived-road-markings.js';

// Territory-wide DTM terrain with roads, players and furniture sharing the same triangle-matched height field.
// The legacy detailed builder can exclude its original core; unified mode includes every road and all terrain.
const ROAD_TOP = 0.025;
const LAND_TOP = -0.08;
const PARK_TOP = -0.045;
const CHUNK = 2000;
const TERRAIN_CHUNK = 4000;
const EXPLICIT_TUNNEL_RECTS = buildTunnelOpeningRects();
const GENERIC_TUNNEL_RECTS = TERRAIN_TUNNEL_OPENING_RECTS.filter((rect) =>
  !CROSSING_FLAT_EXCLUSION_IDS.has(Number(rect.routeId.split(':')[1])));
const TUNNEL_OPENING_RECTS = [...EXPLICIT_TUNNEL_RECTS, ...GENERIC_TUNNEL_RECTS];

function cutTunnelOpenings(geometry, yOrSampler, rects) {
  if (!geometry) return null;
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const attribute = source.getAttribute('position'), positions = [];
  const height = (x, z) => typeof yOrSampler === 'function' ? yOrSampler(x, z) : yOrSampler;
  // A dense urban chunk can contain hundreds of portal rectangles. Index them spatially so
  // every terrain triangle only tests nearby openings rather than the whole chunk.
  const cellSize = 256, buckets = rects.length >= 12 ? new Map() : null;
  if (buckets) rects.forEach((rect, index) => {
    const minCol = Math.floor(rect.minX / cellSize), maxCol = Math.floor(rect.maxX / cellSize);
    const minRow = Math.floor(rect.minZ / cellSize), maxRow = Math.floor(rect.maxZ / cellSize);
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const key = `${col},${row}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ rect, index });
    }
  });
  const marks = buckets ? new Uint32Array(rects.length) : null;
  let stamp = 0;
  for (let i = 0; i + 2 < attribute.count; i += 3) {
    const triangle = [
      [attribute.getX(i), attribute.getZ(i)],
      [attribute.getX(i + 1), attribute.getZ(i + 1)],
      [attribute.getX(i + 2), attribute.getZ(i + 2)]
    ];
    let nearby = rects;
    if (buckets) {
      nearby = [];
      stamp++;
      const xs = triangle.map((point) => point[0]), zs = triangle.map((point) => point[1]);
      const minCol = Math.floor(Math.min(...xs) / cellSize), maxCol = Math.floor(Math.max(...xs) / cellSize);
      const minRow = Math.floor(Math.min(...zs) / cellSize), maxRow = Math.floor(Math.max(...zs) / cellSize);
      for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
        for (const { rect, index } of buckets.get(`${col},${row}`) || []) {
          if (marks[index] === stamp) continue;
          marks[index] = stamp;
          nearby.push(rect);
        }
      }
    }
    for (const polygon of subtractTunnelOpenings(triangle, nearby)) {
      for (let j = 1; j + 1 < polygon.length; j++) {
        for (const point of [polygon[0], polygon[j], polygon[j + 1]]) positions.push(point[0], height(point[0], point[1]), point[1]);
      }
    }
  }
  if (source !== geometry) source.dispose();
  geometry.dispose();
  const cut = new THREE.BufferGeometry();
  cut.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return cut;
}

function addRoadQuad(positions, paint, edgePaint, indices, x1, z1, y1, x2, z2, y2, width, chainage, lanes, {
  paintAllowed = true, edgeMask = 3, extendStart = true, extendEnd = true
} = {}) {
  let dx = x2 - x1, dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  if (length < 0.05) return;
  dx /= length; dz /= length;
  const extension = Math.min(1.2, width * 0.12);
  const startExtension = extendStart ? extension : 0, endExtension = extendEnd ? extension : 0;
  const ax = x1 - dx * startExtension, az = z1 - dz * startExtension;
  const bx = x2 + dx * endExtension, bz = z2 + dz * endExtension;
  const nx = dz * width * 0.5, nz = -dx * width * 0.5;
  const a0 = [ax + nx, az + nz], a1 = [ax - nx, az - nz];
  const b0 = [bx + nx, bz + nz], b1 = [bx - nx, bz - nz];
  const base = positions.length / 3;
  positions.push(a0[0], y1, a0[1], a1[0], y1, a1[1], b0[0], y2, b0[1], b1[0], y2, b1[1]);
  indices.push(base, base + 3, base + 2, base, base + 1, base + 3);
  const half = width * 0.5, s0 = chainage - startExtension, s1 = chainage + length + endExtension;
  const paintLanes = paintAllowed ? lanes : 0, paintWidth = paintAllowed ? width : 0;
  // roadPaint = lateral metres, true chainage metres, signed lane count (negative = two-way), carriageway width.
  // Zero paint width is a clipped policy quad, not a zero-width road; its asphalt geometry remains untouched.
  paint.push(
    half, s0, paintLanes, paintWidth, -half, s0, paintLanes, paintWidth,
    half, s1, paintLanes, paintWidth, -half, s1, paintLanes, paintWidth
  );
  const negativeEdge = edgeMask & 1, positiveEdge = (edgeMask >> 1) & 1;
  edgePaint.push(
    negativeEdge, positiveEdge, negativeEdge, positiveEdge,
    negativeEdge, positiveEdge, negativeEdge, positiveEdge
  );
}

function addRoadJoin(positions, px, pz, x, z, qx, qz, width, y, heightAt) {
  let adx = x - px, adz = z - pz, bdx = qx - x, bdz = qz - z;
  const al = Math.hypot(adx, adz), bl = Math.hypot(bdx, bdz);
  if (al < 0.05 || bl < 0.05) return false;
  adx /= al; adz /= al; bdx /= bl; bdz /= bl;
  const turn = adx * bdz - adz * bdx;
  if (Math.abs(turn) < 0.015) return false;
  const sign = turn > 0 ? 1 : -1;
  const extension = Math.min(1.2, width * 0.12), half = width * 0.5;
  let p1 = [x + adx * extension + sign * adz * half, z + adz * extension - sign * adx * half];
  let p2 = [x - bdx * extension + sign * bdz * half, z - bdz * extension - sign * bdx * half];
  const normalY = (p1[1] - z) * (p2[0] - x) - (p1[0] - x) * (p2[1] - z);
  if (normalY < 0) [p1, p2] = [p2, p1];
  positions.push(x, y, z, p1[0], heightAt(p1[0], p1[1]), p1[1], p2[0], heightAt(p2[0], p2[1]), p2[1]);
  return true;
}

function pushQuad(positions, indices, a, b, c, d) {
  const base = positions.length / 3;
  positions.push(...a, ...b, ...c, ...d);
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

// Concrete depth and parapets are generated only for the small set of ways with independently verified OSM bridge tags.
// The asphalt top remains the original OSM centreline ribbon and the entity query uses the exact same profile.
function addVerifiedBridgeQuad(positions, indices, x1, z1, y1, x2, z2, y2, width) {
  let dx = x2 - x1, dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  if (length < 0.05) return;
  dx /= length; dz /= length;
  const extension = Math.min(1.2, width * 0.12);
  const ax = x1 - dx * extension, az = z1 - dz * extension;
  const bx = x2 + dx * extension, bz = z2 + dz * extension;
  const nx = dz * width * 0.5, nz = -dx * width * 0.5;
  const a0 = [ax + nx, az + nz], a1 = [ax - nx, az - nz];
  const b0 = [bx + nx, bz + nz], b1 = [bx - nx, bz - nz];
  const depth = 0.72, parapet = 0.68;
  pushQuad(positions, indices,
    [a0[0], y1 - depth, a0[1]], [b0[0], y2 - depth, b0[1]], [b1[0], y2 - depth, b1[1]], [a1[0], y1 - depth, a1[1]]);
  for (const [a, b] of [[a0, b0], [a1, b1]]) {
    pushQuad(positions, indices,
      [a[0], y1, a[1]], [b[0], y2, b[1]], [b[0], y2 - depth, b[1]], [a[0], y1 - depth, a[1]]);
    pushQuad(positions, indices,
      [a[0], y1 + 0.1, a[1]], [b[0], y2 + 0.1, b[1]], [b[0], y2 + parapet, b[1]], [a[0], y1 + parapet, a[1]]);
  }
}

function addBridgePier(positions, indices, x, z, bottom, top) {
  if (top - bottom < 1) return;
  const hx = 0.75, hz = 0.75, base = positions.length / 3;
  positions.push(
    x - hx, bottom, z - hz, x + hx, bottom, z - hz, x + hx, bottom, z + hz, x - hx, bottom, z + hz,
    x - hx, top, z - hz, x + hx, top, z - hz, x + hx, top, z + hz, x - hx, top, z + hz
  );
  indices.push(
    base, base + 2, base + 1, base, base + 3, base + 2,
    base + 4, base + 5, base + 6, base + 4, base + 6, base + 7,
    base, base + 1, base + 5, base, base + 5, base + 4,
    base + 1, base + 2, base + 6, base + 1, base + 6, base + 5,
    base + 2, base + 3, base + 7, base + 2, base + 7, base + 6,
    base + 3, base, base + 4, base + 3, base + 4, base + 7
  );
}

function addTunnelCoastStations(stations, x1, z1, dx, dz) {
  const length = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(length / 20));
  let previousT = 0, previousLand = isTerritoryLand(x1, z1);
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    const land = isTerritoryLand(x1 + dx * t, z1 + dz * t);
    if (land !== previousLand) {
      let low = previousT, high = t;
      for (let iteration = 0; iteration < 12; iteration++) {
        const middle = (low + high) * 0.5;
        if (isTerritoryLand(x1 + dx * middle, z1 + dz * middle) === previousLand) low = middle;
        else high = middle;
      }
      stations.push((low + high) * 0.5);
    }
    if (step < steps) stations.push(t);
    previousT = t; previousLand = land;
  }
}

function createRoadChunks(root, includeCore) {
  const chunks = new Map(), bridgeChunks = new Map();
  const chunkAt = (x, z) => {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    let chunk = chunks.get(key);
    if (!chunk) chunks.set(key, (chunk = { positions: [], paint: [], edgePaint: [], indices: [] }));
    return chunk;
  };
  const bridgeChunkAt = (x, z) => {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    let chunk = bridgeChunks.get(key);
    if (!chunk) bridgeChunks.set(key, (chunk = { positions: [], indices: [] }));
    return chunk;
  };
  let segments = 0, sourceSegments = 0, joins = 0, submergedTunnelSegments = 0, verifiedBridgeSegments = 0, verifiedBridgePiers = 0;
  let derivedPaintQuads = 0, derivedPaintSuppressedQuads = 0;
  for (const [wayId, road] of HK_FULL_ROADS.roads.entries()) {
    if (CROSSING_FLAT_EXCLUSION_IDS.has(wayId)) continue;
    const [, width, , , , flat] = road;
    const lanes = signedRoadLaneCount(road);
    let chainage = 0, nextPierChainage = 0;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const segmentIndex = i / 2 - 1;
      const x1 = flat[i - 2], z1 = flat[i - 1], x2 = flat[i], z2 = flat[i + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const cuts = [0, 1];
      if (!includeCore && Math.abs(dx) > 1e-9) cuts.push((GEO.bounds.minX - x1) / dx, (GEO.bounds.maxX - x1) / dx);
      if (!includeCore && Math.abs(dz) > 1e-9) cuts.push((GEO.bounds.minZ - z1) / dz, (GEO.bounds.maxZ - z1) / dz);
      cuts.sort((a, b) => a - b);
      for (let c = 0; c + 1 < cuts.length; c++) {
        const ta = Math.max(0, cuts[c]), tb = Math.min(1, cuts[c + 1]);
        if (tb - ta < 1e-7 || cuts[c + 1] <= 0 || cuts[c] >= 1) continue;
        const mx = x1 + dx * (ta + tb) * 0.5, mz = z1 + dz * (ta + tb) * 0.5;
        if (!includeCore && isDetailedCore(mx, mz)) continue;
        sourceSegments++;
        const profile = roadRibbonProfileAtSegment(wayId, segmentIndex);
        const verifiedBridge = verifiedBridgeProfileAtSegment(wayId, segmentIndex);
        const segmentLength = Math.hypot(dx, dz), segmentStart = chainage;
        const stations = [ta];
        for (const t of profile.ts) if (t > ta + 1e-7 && t < tb - 1e-7) stations.push(t);
        stations.push(tb);
        if (road[4] & 4) addTunnelCoastStations(stations, x1, z1, dx, dz);
        addDerivedPaintPolicyStations(stations, DERIVED_ROAD_PAINT_POLICY, wayId, segmentStart, segmentLength, ta, tb);
        stations.sort((a, b) => a - b);
        for (let i = stations.length - 1; i >= 0; i--) {
          if (stations[i] < ta - 1e-7 || stations[i] > tb + 1e-7) stations.splice(i, 1);
          else if (i > 0 && stations[i] - stations[i - 1] < 1e-7) stations.splice(i, 1);
        }
        for (let step = 0; step + 1 < stations.length; step++) {
          const t0 = stations[step], t1 = stations[step + 1];
          const ax = x1 + dx * t0, az = z1 + dz * t0, bx = x1 + dx * t1, bz = z1 + dz * t1;
          const mx = (ax + bx) * 0.5, mz = (az + bz) * 0.5;
          if ((road[4] & 4) && !isTerritoryLand(mx, mz)) { submergedTunnelSegments++; continue; }
          const ay = roadRibbonHeightAtSegment(wayId, segmentIndex, t0);
          const by = roadRibbonHeightAtSegment(wayId, segmentIndex, t1);
          const chunk = chunkAt(mx, mz);
          const paintChainage = segmentStart + segmentLength * (t0 + t1) * 0.5;
          const paintAllowed = derivedPaintAllowed(DERIVED_ROAD_PAINT_POLICY, wayId, segmentIndex, paintChainage);
          const edgeMask = derivedPaintEdgeMask(DERIVED_ROAD_PAINT_POLICY, wayId, paintChainage);
          addRoadQuad(chunk.positions, chunk.paint, chunk.edgePaint, chunk.indices, ax, az, ay, bx, bz, by, width,
            segmentStart + segmentLength * t0, lanes,
            { paintAllowed, edgeMask, extendStart: t0 <= 1e-7, extendEnd: t1 >= 1 - 1e-7 });
          if (paintAllowed) derivedPaintQuads++; else derivedPaintSuppressedQuads++;
          segments++;
          if (verifiedBridge) {
            const concrete = bridgeChunkAt(mx, mz);
            addVerifiedBridgeQuad(concrete.positions, concrete.indices, ax, az, ay, bx, bz, by, width);
            verifiedBridgeSegments++;
            const pierChainage = chainage + segmentLength * (t0 + t1) * 0.5;
            const ground = hongKongTerrainHeight(mx, mz);
            if (pierChainage >= nextPierChainage && isTerritoryLand(mx, mz) && (ay + by) * 0.5 - ground > 3.2) {
              addBridgePier(concrete.positions, concrete.indices, mx, mz, ground - 0.2, (ay + by) * 0.5 - 0.72);
              verifiedBridgePiers++;
              nextPierChainage = pierChainage + 45;
            }
          }
        }
      }
      chainage += Math.hypot(dx, dz);
    }
    for (let i = 2; i + 3 < flat.length; i += 2) {
      const x = flat[i], z = flat[i + 1];
      if (!includeCore && isDetailedCore(x, z)) continue;
      if ((road[4] & 4) && !isTerritoryLand(x, z)) continue;
      const chunk = chunkAt(x, z), vertex = i / 2;
      const y = Math.max(
        roadRibbonHeightAtSegment(wayId, vertex - 1, 1),
        roadRibbonHeightAtSegment(wayId, vertex, 0)
      );
      const base = chunk.positions.length / 3;
      if (addRoadJoin(chunk.positions, flat[i - 2], flat[i - 1], x, z, flat[i + 2], flat[i + 3], width, y, () => y)) {
        chunk.paint.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        chunk.edgePaint.push(0, 0, 0, 0, 0, 0);
        chunk.indices.push(base, base + 1, base + 2);
        joins++;
      }
    }
  }
  const material = createHongKongRoadSurfaceMaterial({ dry: true, derivedMarkings: DERIVED_ROAD_MARKINGS });
  let meshes = 0;
  for (const [key, chunk] of chunks) {
    if (!chunk.positions.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(chunk.positions, 3));
    geometry.setAttribute('roadPaint', new THREE.Float32BufferAttribute(chunk.paint, 4));
    geometry.setAttribute('roadPaintEdges', new THREE.Float32BufferAttribute(chunk.edgePaint, 2));
    geometry.setIndex(chunk.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `HongKongFullRoads:${key}`;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.frustumCulled = true;
    mesh.userData.territoryRoadChunk = true;
    root.add(mesh);
    meshes++;
  }
  const concreteMaterial = new THREE.MeshStandardMaterial({ color: 0x777b78, roughness: 0.93, metalness: 0, side: THREE.DoubleSide });
  let verifiedBridgeMeshes = 0;
  for (const [key, chunk] of bridgeChunks) {
    if (!chunk.positions.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(chunk.positions, 3));
    geometry.setIndex(chunk.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, concreteMaterial);
    mesh.name = `HongKongVerifiedBridge:${key}`;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData.verifiedBridgeChunk = true;
    root.add(mesh);
    verifiedBridgeMeshes++;
  }
  return {
    segments, sourceSegments, meshes, joins, submergedTunnelSegments, verifiedBridgeSegments, verifiedBridgePiers, verifiedBridgeMeshes,
    derivedPaintQuads, derivedPaintSuppressedQuads
  };
}

const TERRAIN_COLOURS = {
  land: new THREE.Color(0x4b5145),
  park: new THREE.Color(0x3c633d),
  woods: new THREE.Color(0x294c32)
};

function setTerrainSmoothNormals(geometry) {
  const position = geometry.getAttribute('position'), normals = [];
  const epsilon = 2;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    // Analytic DTM normals match at shared vertices and across chunk boundaries; the non-indexed
    // portal geometry therefore shades as one continuous hillside instead of flat 70 m facets.
    const nx = rawHongKongTerrainHeight(x - epsilon, z) - rawHongKongTerrainHeight(x + epsilon, z);
    const nz = rawHongKongTerrainHeight(x, z - epsilon) - rawHongKongTerrainHeight(x, z + epsilon);
    const inverse = 1 / Math.hypot(nx, epsilon * 2, nz);
    normals.push(nx * inverse, epsilon * 2 * inverse, nz * inverse);
  }
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
}

function createTerrainChunks(root, includeCore) {
  const grid = HONG_KONG_TERRAIN_META.grid;
  const chunks = new Map();
  const parkMask = new Uint8Array((grid.w - 1) * (grid.h - 1));
  for (let row = 0; row < grid.h - 1; row++) {
    for (let col = 0; col < grid.w - 1; col++) {
      const park = territoryParkAt(grid.minX + (col + 0.5) * grid.cell, grid.minZ + (row + 0.5) * grid.cell);
      parkMask[row * (grid.w - 1) + col] = park ? park.cat + 1 : 0;
    }
  }
  const chunkRects = new Map();
  // The Murray exists only in unified mode, not the legacy detailed builder.
  for (const rect of includeCore ? [...TUNNEL_OPENING_RECTS, murrayLobbyTerrainCut()] : TUNNEL_OPENING_RECTS) {
    const minCol = Math.floor(rect.minX / TERRAIN_CHUNK), maxCol = Math.floor(rect.maxX / TERRAIN_CHUNK);
    const minRow = Math.floor(rect.minZ / TERRAIN_CHUNK), maxRow = Math.floor(rect.maxZ / TERRAIN_CHUNK);
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const key = `${col},${row}`;
      if (!chunkRects.has(key)) chunkRects.set(key, []);
      chunkRects.get(key).push(rect);
    }
  }
  let sourceTriangles = 0;
  const append = (points) => {
    const cx = (points[0][0] + points[1][0] + points[2][0]) / 3;
    const cz = (points[0][1] + points[1][1] + points[2][1]) / 3;
    if (!includeCore && isDetailedCore(cx, cz)) return;
    const key = `${Math.floor(cx / TERRAIN_CHUNK)},${Math.floor(cz / TERRAIN_CHUNK)}`;
    let chunk = chunks.get(key);
    if (!chunk) chunks.set(key, (chunk = { positions: [], minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }));
    for (const [x, z] of points) {
      chunk.positions.push(x, hongKongTerrainHeight(x, z) + LAND_TOP, z);
      chunk.minX = Math.min(chunk.minX, x); chunk.maxX = Math.max(chunk.maxX, x);
      chunk.minZ = Math.min(chunk.minZ, z); chunk.maxZ = Math.max(chunk.maxZ, z);
    }
    sourceTriangles++;
  };
  const coastCells = HK_TERRAIN.coast.cells;
  for (let row = 0; row < grid.h - 1; row++) {
    const z0 = grid.minZ + row * grid.cell, z1 = z0 + grid.cell;
    for (let col = 0; col < grid.w - 1; col++) {
      const x0 = grid.minX + col * grid.cell, x1 = x0 + grid.cell;
      const cellIndex = row * (grid.w - 1) + col;
      const clipped = coastCells[cellIndex];
      if (clipped) {
        for (let i = 0; i + 5 < clipped.length; i += 6) {
          append([
            [x0 + clipped[i], z0 + clipped[i + 1]],
            [x0 + clipped[i + 2], z0 + clipped[i + 3]],
            [x0 + clipped[i + 4], z0 + clipped[i + 5]]
          ]);
        }
      } else if (hongKongTerrainCellLand(cellIndex)) {
        const a = [x0, z0], b = [x1, z0], d = [x0, z1], e = [x1, z1];
        append([a, d, b]);
        append([b, d, e]);
      }
    }
  }
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  let meshes = 0, triangles = 0;
  for (const [key, chunk] of chunks) {
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(chunk.positions, 3));
    const rects = chunkRects.get(key) || [];
    if (rects.length) geometry = cutTunnelOpenings(geometry, (x, z) => hongKongTerrainHeight(x, z) + LAND_TOP, rects);
    const position = geometry.getAttribute('position'), colors = [];
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      const col = Math.max(0, Math.min(grid.w - 2, Math.floor((x - grid.minX) / grid.cell)));
      const row = Math.max(0, Math.min(grid.h - 2, Math.floor((z - grid.minZ) / grid.cell)));
      const park = parkMask[row * (grid.w - 1) + col];
      const colour = park === 2 ? TERRAIN_COLOURS.woods : park ? TERRAIN_COLOURS.park : TERRAIN_COLOURS.land;
      colors.push(colour.r, colour.g, colour.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    setTerrainSmoothNormals(geometry);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `HongKongTerrain:${key}`;
    mesh.receiveShadow = true;
    mesh.userData.terrainChunk = true;
    root.add(mesh);
    meshes++;
    triangles += position.count / 3;
  }
  return { meshes, triangles, sourceTriangles };
}

function createSeawalls(root, waterLevel, includeCore) {
  const positions = [];
  const { wallSegments, colliders, openings } = buildTerritoryCoastColliders(includeCore);
  for (const [x1, z1, x2, z2] of wallSegments) {
    const y1 = hongKongTerrainHeight(x1, z1) + LAND_TOP;
    const y2 = hongKongTerrainHeight(x2, z2) + LAND_TOP;
    positions.push(
      x1, y1, z1, x2, y2, z2, x2, waterLevel - 1.2, z2,
      x1, y1, z1, x2, waterLevel - 1.2, z2, x1, waterLevel - 1.2, z1
    );
  }
  if (positions.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x626b67, roughness: 0.94 }));
    mesh.name = 'HongKongTerritorySeawalls';
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return { colliders, openings };
}

export function buildFullHongKongWorld(root, { waterLevel = -2.2, includeCore = false } = {}) {
  const waterCentre = [(FULL_BOUNDS.minX + FULL_BOUNDS.maxX) * 0.5, (FULL_BOUNDS.minZ + FULL_BOUNDS.maxZ) * 0.5];
  const waterY = waterLevel - 0.06;
  const waterOpeningRects = buildTunnelOpeningRects(CROSSING_ROUTES, waterY);
  const waterGeometry = new THREE.PlaneGeometry(90000, 90000, 96, 96);
  waterGeometry.rotateX(-Math.PI / 2);
  waterGeometry.translate(waterCentre[0], waterY, waterCentre[1]);
  const water = new THREE.Mesh(
    cutTunnelOpenings(waterGeometry, waterY, waterOpeningRects),
    createHongKongHarbourWaterMaterial({ centre: waterCentre, bakedWorld: true })
  );
  water.userData.meanWaterLevel = waterY;
  water.name = 'HongKongTerritorialWater';
  root.add(water);

  const terrain = createTerrainChunks(root, includeCore);
  const roads = createRoadChunks(root, includeCore);
  const seawalls = createSeawalls(root, waterLevel, includeCore);
  const colliders = seawalls.colliders;
  return {
    bounds: FULL_BOUNDS,
    colliders,
    stats: {
      fullRoadWays: HK_FULL_ROADS.roads.length,
      fullRoadSegments: roads.segments,
      fullRoadSourceSegments: roads.sourceSegments,
      fullRoadJoins: roads.joins,
      fullRoadChunks: roads.meshes,
      fullRoadDerivedPaint: 'in-asphalt-shader-with-junction-and-survey-clipping',
      fullRoadDerivedPaintExtraTriangles: 0,
      fullRoadDerivedPaintQuads: roads.derivedPaintQuads,
      fullRoadDerivedPaintSuppressedQuads: roads.derivedPaintSuppressedQuads,
      fullRoadDerivedPaintPolicy: DERIVED_ROAD_PAINT_STATS,
      fullSubmergedTunnelSegmentsHidden: roads.submergedTunnelSegments,
      verifiedBridgeWays: HK_VERIFIED_BRIDGES.ways.length,
      verifiedBridgeSegments: roads.verifiedBridgeSegments,
      verifiedBridgePiers: roads.verifiedBridgePiers,
      verifiedBridgeMeshes: roads.verifiedBridgeMeshes,
      verifiedBridgeHeightSource: 'OSM bridge/layer; procedural decks, not surveyed engineering elevations',
      fullLandRings: HK_FULL_MAP.land.length,
      fullParks: HK_FULL_MAP.parks.length,
      fullSeawallColliders: colliders.length,
      fullRoadCoastOpenings: seawalls.openings,
      fullTunnelOpeningRects: TUNNEL_OPENING_RECTS.length,
      fullWaterTunnelOpeningRects: waterOpeningRects.length,
      fullIncludesDetailedCore: includeCore,
      terrainMeshes: terrain.meshes,
      terrainTriangles: terrain.triangles,
      terrainSourceTriangles: terrain.sourceTriangles,
      terrainGridW: HONG_KONG_TERRAIN_META.grid.w,
      terrainGridH: HONG_KONG_TERRAIN_META.grid.h,
      terrainCoastCells: HK_TERRAIN.coast.mixedCells,
      terrainCoastTriangles: HK_TERRAIN.coast.triangleCount,
      terrainMaxElevation: HONG_KONG_TERRAIN_META.grid.maxElevation
    }
  };
}

// Compatibility constants are now offsets from the sampled DTM, not a claim that the territory is flat.
export const FULL_WORLD_HEIGHT = Object.freeze({ road: ROAD_TOP, land: LAND_TOP, park: PARK_TOP });
