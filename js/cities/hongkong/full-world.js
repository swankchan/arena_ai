import * as THREE from 'three/webgpu';
import { HK_FULL_MAP } from '../../hk-full-map-data.js';
import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { GEO } from '../../hk-geodata.js';
import { createHongKongRoadSurfaceMaterial } from '../../tsl-materials.js';
import { createHongKongHarbourWaterMaterial } from './harbour-water.js';
import { buildTerritoryCoastColliders } from './coast-colliders.js';
import { CROSSING_FLAT_EXCLUSION_IDS, CROSSING_ROUTES } from './crossings.js';
import { buildTunnelOpeningRects, subtractTunnelOpenings } from './tunnel-openings.js';
import { FULL_BOUNDS, isDetailedCore, isTerritoryLand, territoryParkAt } from './full-meta.js';
import { HONG_KONG_TERRAIN_META, hongKongTerrainHeight } from './terrain.js';
import { roadHeightAtSegment, roadHeightAtVertex, TERRAIN_TUNNEL_OPENING_RECTS } from './road-elevation.js';

// Territory-wide DTM terrain with roads, players and furniture sharing the same triangle-matched height field.
// The legacy detailed builder can exclude its original core; unified mode includes every road and all terrain.
const ROAD_TOP = 0.025;
const LAND_TOP = -0.08;
const PARK_TOP = -0.045;
const CHUNK = 2000;
const TERRAIN_CHUNK = 4000;
const ROAD_STEP = 20;
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

function addRoadQuad(positions, x1, z1, y1, x2, z2, y2, width) {
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
  positions.push(
    a0[0], y1, a0[1], b1[0], y2, b1[1], b0[0], y2, b0[1],
    a0[0], y1, a0[1], a1[0], y1, a1[1], b1[0], y2, b1[1]
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

function createRoadChunks(root, includeCore) {
  const chunks = new Map();
  const chunkAt = (x, z) => {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    let chunk = chunks.get(key);
    if (!chunk) chunks.set(key, (chunk = { positions: [] }));
    return chunk;
  };
  let segments = 0, sourceSegments = 0, joins = 0;
  for (const [wayId, road] of HK_FULL_ROADS.roads.entries()) {
    if (CROSSING_FLAT_EXCLUSION_IDS.has(wayId)) continue;
    const [, width, , , , flat] = road;
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
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) * (tb - ta) / ROAD_STEP));
        for (let step = 0; step < steps; step++) {
          const t0 = ta + (tb - ta) * step / steps, t1 = ta + (tb - ta) * (step + 1) / steps;
          const ax = x1 + dx * t0, az = z1 + dz * t0, bx = x1 + dx * t1, bz = z1 + dz * t1;
          const ay = roadHeightAtSegment(wayId, segmentIndex, t0, ax, az);
          const by = roadHeightAtSegment(wayId, segmentIndex, t1, bx, bz);
          const chunk = chunkAt((ax + bx) * 0.5, (az + bz) * 0.5);
          addRoadQuad(chunk.positions, ax, az, ay, bx, bz, by, width);
          segments++;
        }
      }
    }
    for (let i = 2; i + 3 < flat.length; i += 2) {
      const x = flat[i], z = flat[i + 1];
      if (!includeCore && isDetailedCore(x, z)) continue;
      const chunk = chunkAt(x, z), y = roadHeightAtVertex(wayId, i / 2, x, z);
      const heightAt = (hx, hz) => roadHeightAtVertex(wayId, i / 2, hx, hz);
      if (addRoadJoin(chunk.positions, flat[i - 2], flat[i - 1], x, z, flat[i + 2], flat[i + 3], width, y, heightAt)) joins++;
    }
  }
  const material = createHongKongRoadSurfaceMaterial();
  let meshes = 0;
  for (const [key, chunk] of chunks) {
    if (!chunk.positions.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(chunk.positions, 3));
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
  return { segments, sourceSegments, meshes, joins };
}

const TERRAIN_COLOURS = {
  land: new THREE.Color(0x4b5145),
  park: new THREE.Color(0x3c633d),
  woods: new THREE.Color(0x294c32)
};

function createTerrainChunks(root, includeCore) {
  const grid = HONG_KONG_TERRAIN_META.grid;
  const chunks = new Map();
  const landMask = new Uint8Array(grid.w * grid.h);
  const parkMask = new Uint8Array((grid.w - 1) * (grid.h - 1));
  // Coast and land-use polygons are much more expensive than the DTM lookup. Cache them once
  // per source vertex / cell instead of repeating identical point-in-polygon work after clipping.
  for (let row = 0; row < grid.h; row++) {
    for (let col = 0; col < grid.w; col++) {
      const x = grid.minX + col * grid.cell, z = grid.minZ + row * grid.cell;
      landMask[row * grid.w + col] = isTerritoryLand(x, z) ? 1 : 0;
      if (row < grid.h - 1 && col < grid.w - 1) {
        const park = territoryParkAt(x + grid.cell * 0.5, z + grid.cell * 0.5);
        parkMask[row * (grid.w - 1) + col] = park ? park.cat + 1 : 0;
      }
    }
  }
  const chunkRects = new Map();
  for (const rect of TUNNEL_OPENING_RECTS) {
    const minCol = Math.floor(rect.minX / TERRAIN_CHUNK), maxCol = Math.floor(rect.maxX / TERRAIN_CHUNK);
    const minRow = Math.floor(rect.minZ / TERRAIN_CHUNK), maxRow = Math.floor(rect.maxZ / TERRAIN_CHUNK);
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const key = `${col},${row}`;
      if (!chunkRects.has(key)) chunkRects.set(key, []);
      chunkRects.get(key).push(rect);
    }
  }
  let sourceTriangles = 0;
  const append = (points, ids) => {
    const cx = (points[0][0] + points[1][0] + points[2][0]) / 3;
    const cz = (points[0][1] + points[1][1] + points[2][1]) / 3;
    if (!includeCore && isDetailedCore(cx, cz)) return;
    if (landMask[ids[0]] + landMask[ids[1]] + landMask[ids[2]] === 0) return;
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
  for (let row = 0; row < grid.h - 1; row++) {
    const z0 = grid.minZ + row * grid.cell, z1 = z0 + grid.cell;
    for (let col = 0; col < grid.w - 1; col++) {
      const x0 = grid.minX + col * grid.cell, x1 = x0 + grid.cell;
      const a = [x0, z0], b = [x1, z0], d = [x0, z1], e = [x1, z1];
      const ia = row * grid.w + col, ib = ia + 1, id = ia + grid.w, ie = id + 1;
      append([a, d, b], [ia, id, ib]);
      append([b, d, e], [ib, id, ie]);
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
    for (let i = 0; i + 2 < position.count; i += 3) {
      const cx = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
      const cz = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
      const col = Math.max(0, Math.min(grid.w - 2, Math.floor((cx - grid.minX) / grid.cell)));
      const row = Math.max(0, Math.min(grid.h - 2, Math.floor((cz - grid.minZ) / grid.cell)));
      const park = parkMask[row * (grid.w - 1) + col];
      const colour = park === 2 ? TERRAIN_COLOURS.woods : park ? TERRAIN_COLOURS.park : TERRAIN_COLOURS.land;
      for (let vertex = 0; vertex < 3; vertex++) colors.push(colour.r, colour.g, colour.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
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
      terrainMaxElevation: HONG_KONG_TERRAIN_META.grid.maxElevation
    }
  };
}

// Compatibility constants are now offsets from the sampled DTM, not a claim that the territory is flat.
export const FULL_WORLD_HEIGHT = Object.freeze({ road: ROAD_TOP, land: LAND_TOP, park: PARK_TOP });
