import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HK_FULL_MAP } from '../../hk-full-map-data.js';
import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { GEO } from '../../hk-geodata.js';
import { createRoadSurfaceMaterial } from '../../tsl-materials.js';
import { createHongKongHarbourWaterMaterial } from './harbour-water.js';
import { segmentWall, isDataBoundarySegment } from './colliders.js';
import { FULL_BOUNDS, isDetailedCore, isTerritoryRoad } from './full-meta.js';

// Territory-wide, flat street-level presentation. The detailed港九 core keeps its original blocks and buildings;
// outside it, real OSM roads are rendered in cullable 2 km chunks over real coastline and park shapes.
const ROAD_TOP = 0.025;
const LAND_TOP = -0.08;
const PARK_TOP = -0.045;
const CHUNK = 2000;

function shapeForRing(flat) {
  const shape = new THREE.Shape();
  shape.moveTo(flat[0], -flat[1]);
  for (let i = 2; i + 1 < flat.length; i += 2) shape.lineTo(flat[i], -flat[i + 1]);
  shape.closePath();
  return shape;
}

function shapeGeometry(flat, y) {
  const geometry = new THREE.ShapeGeometry(shapeForRing(flat));
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}

function mergedRings(rings, y) {
  const geometries = rings.map((ring) => shapeGeometry(ring, y));
  const merged = geometries.length ? mergeGeometries(geometries, false) : null;
  for (const geometry of geometries) geometry.dispose();
  return merged;
}

function addRoadQuad(positions, normals, x1, z1, x2, z2, width) {
  let dx = x2 - x1, dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  if (length < 0.05) return;
  dx /= length; dz /= length;
  // A small overlap closes polygon cracks at simplified bends and junctions without adding a separate disk mesh.
  const extension = Math.min(1.2, width * 0.12);
  const ax = x1 - dx * extension, az = z1 - dz * extension;
  const bx = x2 + dx * extension, bz = z2 + dz * extension;
  const nx = dz * width * 0.5, nz = -dx * width * 0.5;
  const a0 = [ax + nx, az + nz], a1 = [ax - nx, az - nz];
  const b0 = [bx + nx, bz + nz], b1 = [bx - nx, bz - nz];
  positions.push(
    a0[0], ROAD_TOP, a0[1], b1[0], ROAD_TOP, b1[1], b0[0], ROAD_TOP, b0[1],
    a0[0], ROAD_TOP, a0[1], a1[0], ROAD_TOP, a1[1], b1[0], ROAD_TOP, b1[1]
  );
  for (let i = 0; i < 6; i++) normals.push(0, 1, 0);
}

function addRoadJoin(positions, normals, px, pz, x, z, qx, qz, width) {
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
  positions.push(x, ROAD_TOP, z, p1[0], ROAD_TOP, p1[1], p2[0], ROAD_TOP, p2[1]);
  normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  return true;
}

function createRoadChunks(root) {
  const chunks = new Map();
  const chunkAt = (x, z) => {
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    let chunk = chunks.get(key);
    if (!chunk) chunks.set(key, (chunk = { positions: [], normals: [] }));
    return chunk;
  };
  let segments = 0, joins = 0;
  for (const [, width, , , , flat] of HK_FULL_ROADS.roads) {
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const x1 = flat[i - 2], z1 = flat[i - 1], x2 = flat[i], z2 = flat[i + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const cuts = [0, 1];
      // Split at the detailed-core rectangle instead of discarding a whole long way segment by its midpoint.
      if (Math.abs(dx) > 1e-9) {
        cuts.push((GEO.bounds.minX - x1) / dx, (GEO.bounds.maxX - x1) / dx);
      }
      if (Math.abs(dz) > 1e-9) {
        cuts.push((GEO.bounds.minZ - z1) / dz, (GEO.bounds.maxZ - z1) / dz);
      }
      cuts.sort((a, b) => a - b);
      for (let c = 0; c + 1 < cuts.length; c++) {
        const ta = Math.max(0, cuts[c]), tb = Math.min(1, cuts[c + 1]);
        if (tb - ta < 1e-7 || cuts[c + 1] <= 0 || cuts[c] >= 1) continue;
        const mx = x1 + dx * (ta + tb) * 0.5, mz = z1 + dz * (ta + tb) * 0.5;
        if (isDetailedCore(mx, mz)) continue;
        const chunk = chunkAt(mx, mz);
        addRoadQuad(chunk.positions, chunk.normals, x1 + dx * ta, z1 + dz * ta, x1 + dx * tb, z1 + dz * tb, width);
        segments++;
      }
    }
    for (let i = 2; i + 3 < flat.length; i += 2) {
      const x = flat[i], z = flat[i + 1];
      if (isDetailedCore(x, z)) continue;
      const chunk = chunkAt(x, z);
      if (addRoadJoin(chunk.positions, chunk.normals, flat[i - 2], flat[i - 1], x, z, flat[i + 2], flat[i + 3], width)) joins++;
    }
  }
  const material = createRoadSurfaceMaterial();
  let meshes = 0;
  for (const [key, chunk] of chunks) {
    if (!chunk.positions.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(chunk.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(chunk.normals, 3));
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
  return { segments, meshes, joins };
}

function createSeawalls(root, waterLevel) {
  const positions = [];
  const colliders = [];
  for (const ring of HK_FULL_MAP.land) {
    for (let i = 2; i + 1 < ring.length; i += 2) {
      const x1 = ring[i - 2], z1 = ring[i - 1], x2 = ring[i], z2 = ring[i + 1];
      const mx = (x1 + x2) * 0.5, mz = (z1 + z2) * 0.5;
      if (isDetailedCore(mx, mz) || isDataBoundarySegment(x1, z1, x2, z2, FULL_BOUNDS)) continue;
      positions.push(
        x1, LAND_TOP, z1, x2, LAND_TOP, z2, x2, waterLevel - 1.2, z2,
        x1, LAND_TOP, z1, x2, waterLevel - 1.2, z2, x1, waterLevel - 1.2, z1
      );
      // Roads and bridges need a real opening through the coastal safety wall; do not trap their arrival points.
      if (!isTerritoryRoad(mx, mz, 9)) {
        const wall = segmentWall(x1, z1, x2, z2);
        if (wall) colliders.push(wall);
      }
    }
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
  return colliders;
}

export function buildFullHongKongWorld(root, { waterLevel = -2.2 } = {}) {
  const waterCentre = [
    (FULL_BOUNDS.minX + FULL_BOUNDS.maxX) * 0.5,
    (FULL_BOUNDS.minZ + FULL_BOUNDS.maxZ) * 0.5
  ];
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(90000, 90000, 96, 96),
    createHongKongHarbourWaterMaterial({ centre: waterCentre })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(waterCentre[0], waterLevel - 0.06, waterCentre[1]);
  water.userData.meanWaterLevel = waterLevel - 0.06;
  water.name = 'HongKongTerritorialWater';
  root.add(water);

  const landGeometry = mergedRings(HK_FULL_MAP.land, LAND_TOP);
  if (landGeometry) {
    const land = new THREE.Mesh(landGeometry, new THREE.MeshStandardMaterial({ color: 0x4b5145, roughness: 1, metalness: 0 }));
    land.name = 'HongKongTerritoryLand';
    land.receiveShadow = true;
    root.add(land);
  }

  for (const cat of [0, 1]) {
    const rings = HK_FULL_MAP.parks.filter((park) => park[0] === cat).map((park) => park[2]);
    const geometry = mergedRings(rings, PARK_TOP);
    if (!geometry) continue;
    const parks = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: cat === 1 ? 0x294c32 : 0x3c633d, roughness: 1, metalness: 0
    }));
    parks.name = cat === 1 ? 'HongKongTerritoryWoods' : 'HongKongTerritoryParks';
    parks.receiveShadow = true;
    root.add(parks);
  }

  const roads = createRoadChunks(root);
  const colliders = createSeawalls(root, waterLevel);
  return {
    bounds: FULL_BOUNDS,
    colliders,
    stats: {
      fullRoadWays: HK_FULL_ROADS.roads.length,
      fullRoadSegments: roads.segments,
      fullRoadJoins: roads.joins,
      fullRoadChunks: roads.meshes,
      fullLandRings: HK_FULL_MAP.land.length,
      fullParks: HK_FULL_MAP.parks.length,
      fullSeawallColliders: colliders.length
    }
  };
}

export const FULL_WORLD_HEIGHT = Object.freeze({ road: ROAD_TOP, land: LAND_TOP, park: PARK_TOP });
