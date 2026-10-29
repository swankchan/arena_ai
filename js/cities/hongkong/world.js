import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GEO } from '../../hk-geodata.js';
import {
  createRoadSurfaceMaterial,
  createSidewalkMaterial,
  createParkLawnMaterial,
  createCurtainWallMaterial,
  createPreWarBuildingMaterial,
  createFacadeBoxes,
  WALL_KINDS
} from '../../tsl-materials.js';
import { createTreeField } from '../../trees.js';
import { segmentWall, lotObb } from './colliders.js';
import { AREA_LABELS } from './meta.js';
import { createHongKongTrafficAids } from './traffic-aids.js';

// The Hong Kong static world: real land, blocks, lots, parks and landmark sites from OpenStreetMap, with every
// building generated procedurally inside its real lot. No OSM building footprint is used for ordinary buildings.
//
// World frame: 1 unit = 1 m, x east, z south, y up. The origin is Statue Square, Central.

const SIDEWALK_TOP = 0.14;
const PARK_TOP = 0.17;
const WATER_LEVEL = -2.2;

const hash = (x, z, seed = 0) => {
  const v = Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const DISTRICT_HEIGHT = new Map([
  ['中環', 210], ['金鐘', 190], ['灣仔', 165], ['銅鑼灣', 150], ['北角', 145], ['上環', 115],
  ['西營盤', 110], ['尖沙咀', 140], ['佐敦', 115], ['油麻地', 105], ['旺角', 100], ['紅磡', 105],
  ['九龍城', 85]
]);
const DISTRICT_GLASS = new Map([
  ['中環', 0.82], ['金鐘', 0.8], ['灣仔', 0.68], ['銅鑼灣', 0.6], ['北角', 0.5], ['上環', 0.52],
  ['西營盤', 0.42], ['尖沙咀', 0.62], ['佐敦', 0.4], ['油麻地', 0.34], ['旺角', 0.36], ['紅磡', 0.45],
  ['九龍城', 0.32]
]);

function districtFor(x, z) {
  let best = '香港', bestDist = Infinity;
  for (const [name, ax, az, rank] of AREA_LABELS) {
    if (rank !== 0) continue;
    const d = Math.hypot(ax - x, az - z);
    if (d < bestDist) { best = name; bestDist = d; }
  }
  return best;
}

function pointInRing(flat, x, z) {
  let inside = false;
  for (let i = 0, j = flat.length - 2; i < flat.length; j = i, i += 2) {
    const xi = flat[i], zi = flat[i + 1], xj = flat[j], zj = flat[j + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function ringBounds(flat) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    minX = Math.min(minX, flat[i]); maxX = Math.max(maxX, flat[i]);
    minZ = Math.min(minZ, flat[i + 1]); maxZ = Math.max(maxZ, flat[i + 1]);
  }
  return { minX, maxX, minZ, maxZ };
}

function shapeForRing(flat) {
  const shape = new THREE.Shape();
  shape.moveTo(flat[0], -flat[1]);
  for (let i = 2; i + 1 < flat.length; i += 2) shape.lineTo(flat[i], -flat[i + 1]);
  shape.closePath();
  return shape;
}

function shapeGeometry(flat, y, holes = []) {
  const shape = shapeForRing(flat);
  for (const hole of holes) shape.holes.push(shapeForRing(hole));
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}

function mergeAt(list, y, holesFor = null) {
  const geometries = [];
  for (const item of list) {
    const ring = Array.isArray(item) ? item : item.ring;
    const holes = holesFor ? holesFor(item) : [];
    geometries.push(shapeGeometry(ring, y, holes));
  }
  return geometries.length ? mergeGeometries(geometries, false) : null;
}

// Frame transform used by the block generator: lot rects are authored in a frame that turns with the street.
function framePoint(th, px, pz, u, v) {
  const cs = Math.cos(th), sn = Math.sin(th);
  return [px + (u - px) * cs + (v - pz) * sn, pz - (u - px) * sn + (v - pz) * cs];
}

function frameBox(th, px, pz, rect) {
  const [u0, u1, v0, v1] = rect;
  const corners = [
    framePoint(th, px, pz, u0, v0), framePoint(th, px, pz, u1, v0),
    framePoint(th, px, pz, u1, v1), framePoint(th, px, pz, u0, v1)
  ];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of corners) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const [x, z] = framePoint(th, px, pz, (u0 + u1) / 2, (v0 + v1) / 2);
  return { x, z, w: u1 - u0, d: v1 - v0, ry: th, bounds: { minX, maxX, minZ, maxZ } };
}

function createSeawallGeometry() {
  const positions = [];
  for (const ring of GEO.land) {
    for (let i = 0; i + 3 < ring.length; i += 2) {
      const x1 = ring[i], z1 = ring[i + 1], x2 = ring[i + 2], z2 = ring[i + 3];
      positions.push(
        x1, 0, z1, x2, 0, z2, x2, WATER_LEVEL - 1.2, z2,
        x1, 0, z1, x2, WATER_LEVEL - 1.2, z2, x1, WATER_LEVEL - 1.2, z1
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}


function createHarbourWaterMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  // Seamless wave trains: whole numbers of cycles per tile, so the repeat never draws a grid across the harbour.
  const TAU = (Math.PI * 2) / 256;
  const height = (x, y) =>
    Math.sin((x * 3 + y * 1) * TAU + 0.4) * 0.5 +
    Math.sin((x * 1 - y * 4) * TAU + 1.7) * 0.32 +
    Math.sin((x * 7 + y * 5) * TAU + 2.2) * 0.12 +
    Math.sin((x * 11 - y * 9) * TAU + 0.9) * 0.06;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const dx = height(x + 1, y) - height(x - 1, y);
      const dy = height(x, y + 1) - height(x, y - 1);
      const nx = -dx * 1.9, ny = -dy * 1.9, nz = 1;
      const length = Math.hypot(nx, ny, nz);
      const o = (y * 256 + x) * 4;
      image.data[o] = Math.round((nx / length * 0.5 + 0.5) * 255);
      image.data[o + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      image.data[o + 2] = Math.round((nz / length * 0.5 + 0.5) * 255);
      image.data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const normalMap = new THREE.CanvasTexture(canvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(56, 56);
  normalMap.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    color: 0x10444f,
    roughness: 0.46,
    metalness: 0.02,
    normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32)
  });
  material.userData.waterNormal = normalMap;
  return material;
}

function makeFacadeStyles() {
  return [
    {
      boxes: [], glass: true,
      material: createCurtainWallMaterial({
        glassTint: 0x17364a, frameTint: 0x314653, windowWidth: 3.0, floorHeight: 3.9,
        litProbability: 0.46, warmth: 0.6, reflectivity: 0.92, seed: 21.3, boxLocal: true
      })
    },
    {
      boxes: [], glass: true,
      material: createCurtainWallMaterial({
        glassTint: 0x2b241f, frameTint: 0x65533e, windowWidth: 2.8, floorHeight: 3.7,
        litProbability: 0.42, warmth: 0.72, reflectivity: 0.84, seed: 8.7, boxLocal: true
      })
    },
    {
      boxes: [], glass: true,
      material: createCurtainWallMaterial({
        glassTint: 0x334d59, frameTint: 0x9aa5a8, windowWidth: 2.6, floorHeight: 3.8,
        litProbability: 0.4, warmth: 0.55, reflectivity: 0.9, seed: 34.1, boxLocal: true
      })
    },
    {
      boxes: [], glass: false,
      material: createPreWarBuildingMaterial({
        stoneColor: 0xb9b2a4, trimColor: 0xd9d1c2, windowGlassColor: 0x18262e, windowWidth: 2.4,
        floorHeight: 3.4, litProbability: 0.5, warmth: 0.82, seed: 3.9, boxLocal: true
      })
    },
    {
      boxes: [], glass: false,
      material: createPreWarBuildingMaterial({
        stoneColor: 0xcab7a8, trimColor: 0xe3d8c9, windowGlassColor: 0x1c2930, windowWidth: 2.3,
        floorHeight: 3.3, litProbability: 0.52, warmth: 0.86, seed: 12.8, boxLocal: true
      })
    },
    {
      boxes: [], glass: false,
      material: createPreWarBuildingMaterial({
        stoneColor: 0x9eaf9f, trimColor: 0xd4d9c9, windowGlassColor: 0x17262a, windowWidth: 2.2,
        floorHeight: 3.2, litProbability: 0.48, warmth: 0.78, seed: 26.4, boxLocal: true
      })
    }
  ];
}

function styleFor(styleList, glass, h, x, z) {
  if (!glass) return styleList[3 + Math.min(2, Math.floor(hash(x, z, 3.1) * 3))];
  const r = hash(x, z, 5.7);
  if (h > 130 && r < 0.45) return styleList[2];
  if (r < 0.62) return styleList[0];
  if (r < 0.83) return styleList[1];
  return styleList[2];
}

function createStreetProps(root, lampSamples) {
  // Lamps: a dark pole with a warm head. Instanced, one draw call per part.
  if (lampSamples.length) {
    const pole = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.11, 0.16, 8.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x2d3439, metalness: 0.75, roughness: 0.45 }),
      lampSamples.length
    );
    const arm = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.7, 0.16, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x2d3439, metalness: 0.7, roughness: 0.5 }),
      lampSamples.length
    );
    const head = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.7, 0.28, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x3a3b39, emissive: 0xffd39a, emissiveIntensity: 1.5, roughness: 0.4 }),
      lampSamples.length
    );
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    lampSamples.forEach((lamp, index) => {
      const [x, z, angle] = lamp;
      quat.setFromAxisAngle(up, angle);
      matrix.compose(new THREE.Vector3(x, 4.15, z), quat, one);
      pole.setMatrixAt(index, matrix);
      const fx = Math.sin(angle), fz = Math.cos(angle);
      matrix.compose(new THREE.Vector3(x + fx * 0.75, 8.18, z + fz * 0.75), quat, one);
      arm.setMatrixAt(index, matrix);
      matrix.compose(new THREE.Vector3(x + fx * 1.55, 8.16, z + fz * 1.55), quat, one);
      head.setMatrixAt(index, matrix);
    });
    for (const mesh of [pole, arm, head]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      root.add(mesh);
    }
  }

  // Surveyed TIS_16 paint is added by createHongKongTrafficAids(). Do not synthesise centre/lane lines from OSM
  // carriageway widths here: doing so puts plausible but unlocated markings over the official road layout.
}

// Hong Kong blade signs: coloured panels with vertical Chinese lettering. One canvas per palette keeps the whole
// sign field at six instanced draw calls.
const SIGN_PALETTE = [
  { glow: 0xff5a4a, base: 0x3d0b08, text: '大押' },
  { glow: 0xffb020, base: 0x3a2002, text: '茶餐廳' },
  { glow: 0x35e0ff, base: 0x05313b, text: '藥房' },
  { glow: 0xff4fa8, base: 0x360a21, text: '夜總會' },
  { glow: 0x9aff5a, base: 0x173105, text: '麻雀' },
  { glow: 0xffffff, base: 0x2b2b2b, text: '酒家' }
];

function createSignTexture({ glow, base, text }) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const glowCss = `#${glow.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = `#${base.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 128, 384);
  ctx.strokeStyle = glowCss;
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 118, 374);
  ctx.fillStyle = glowCss;
  ctx.shadowColor = glowCss;
  ctx.shadowBlur = 16;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 54px "Microsoft JhengHei", "Noto Sans CJK TC", "PingFang HK", sans-serif';
  const chars = [...text];
  const step = 264 / Math.max(1, chars.length);
  chars.forEach((char, index) => ctx.fillText(char, 64, 36 + step * (index + 0.5)));
  ctx.shadowBlur = 0;
  ctx.font = '700 17px "JetBrains Mono", monospace';
  ctx.fillText('24 HRS', 64, 350);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createNeonSigns(root, signs) {
  if (!signs.length) return;
  const geometry = new THREE.BoxGeometry(2.1, 6.4, 0.22);
  for (let p = 0; p < SIGN_PALETTE.length; p++) {
    const group = signs.filter((sign) => sign.palette === p);
    if (!group.length) continue;
    const texture = createSignTexture(SIGN_PALETTE[p]);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: 0xffffff,
      emissiveIntensity: 1.25,
      roughness: 0.55,
      metalness: 0.0
    });
    const mesh = new THREE.InstancedMesh(geometry, material, group.length);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    group.forEach((sign, index) => {
      quat.setFromAxisAngle(up, sign.ry);
      matrix.compose(new THREE.Vector3(sign.x, sign.y, sign.z), quat, new THREE.Vector3(sign.s, sign.h / 6.4, 1));
      mesh.setMatrixAt(index, matrix);
    });
    mesh.frustumCulled = false;
    mesh.name = 'HongKongNeonSigns';
    root.add(mesh);
  }
}

export function buildHongKongWorld(scene, { setStatus = () => {} } = {}) {
  setStatus('Building Victoria Harbour, Central & Kowloon...');
  const root = new THREE.Group();
  root.name = 'HongKongWorld';
  scene.add(root);
  const colliders = [];
  const blockShapes = [];
  const blockCells = new Map();
  const CELL = 160;

  // -------------------------------------------------------------------------------------------------------------------
  // 1. Land, water, seawalls
  // -------------------------------------------------------------------------------------------------------------------
  const waterMaterial = createHarbourWaterMaterial();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(
    (GEO.bounds.minX + GEO.bounds.maxX) / 2,
    WATER_LEVEL,
    (GEO.bounds.minZ + GEO.bounds.maxZ) / 2
  );
  water.receiveShadow = true;
  water.name = 'VictoriaHarbourWater';
  root.add(water);

  const landGeometry = mergeGeometries(GEO.land.map((ring) => shapeGeometry(ring, 0)), false);
  const land = new THREE.Mesh(landGeometry, createRoadSurfaceMaterial());
  land.receiveShadow = true;
  land.name = 'HongKongLand';
  root.add(land);

  const seawall = new THREE.Mesh(
    createSeawallGeometry(),
    new THREE.MeshStandardMaterial({ color: 0x6b706e, roughness: 0.92, metalness: 0.02 })
  );
  seawall.receiveShadow = true;
  seawall.name = 'HongKongSeawall';
  root.add(seawall);

  // Invisible low walls keep pedestrians and cars out of the harbour without narrowing the flight envelope.
  // Each one is a thin oriented wall along its coastline segment: axis-aligned bounds around a diagonal segment
  // would cover the inland rectangle behind it and block roads far from the water.
  for (const ring of GEO.land) {
    for (let i = 0; i + 3 < ring.length; i += 2) {
      const wall = segmentWall(ring[i], ring[i + 1], ring[i + 2], ring[i + 3]);
      if (wall) colliders.push(wall);
    }
  }

  // -------------------------------------------------------------------------------------------------------------------
  // 2. Blocks: raised sidewalks and the block spatial index used by the player's ground.
  // -------------------------------------------------------------------------------------------------------------------
  setStatus('Paving 1,647 real Hong Kong blocks...');
  for (let b = 0; b < GEO.blocks.length; b++) {
    const outline = GEO.blocks[b][0];
    if (!outline || outline.length < 6) continue;
    const bounds = ringBounds(outline);
    const index = { outline, bounds };
    blockShapes.push(index);
    for (let ix = Math.floor(bounds.minX / CELL); ix <= Math.floor(bounds.maxX / CELL); ix++) {
      for (let iz = Math.floor(bounds.minZ / CELL); iz <= Math.floor(bounds.maxZ / CELL); iz++) {
        const key = ix * 100003 + iz;
        let list = blockCells.get(key);
        if (!list) blockCells.set(key, (list = []));
        list.push(index);
      }
    }
  }
  const sidewalkGeometry = mergeGeometries(blockShapes.map((block) => shapeGeometry(block.outline, SIDEWALK_TOP)), false);
  const sidewalks = new THREE.Mesh(sidewalkGeometry, createSidewalkMaterial());
  sidewalks.receiveShadow = true;
  sidewalks.name = 'HongKongSidewalks';
  root.add(sidewalks);

  // -------------------------------------------------------------------------------------------------------------------
  // 3. Parks and gardens
  // -------------------------------------------------------------------------------------------------------------------
  setStatus('Planting Hong Kong Park, Kowloon Park & Victoria Park...');
  const parkGeometries = [];
  const parkBounds = [];
  for (const park of GEO.parks) {
    if (!park.rings.length) continue;
    const outer = park.rings[0];
    if (!outer || outer.length < 6) continue;
    const holes = park.rings.slice(1).filter((ring) => ring.length >= 6);
    parkGeometries.push(shapeGeometry(outer, PARK_TOP, holes));
    parkBounds.push({ ring: outer, holes, park });
  }
  if (parkGeometries.length) {
    const parks = new THREE.Mesh(mergeGeometries(parkGeometries, false), createParkLawnMaterial(false));
    parks.receiveShadow = true;
    parks.name = 'HongKongParks';
    root.add(parks);
  }

  const parkAt = (x, z) => {
    for (const entry of parkBounds) {
      const b = ringBounds(entry.ring);
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (!pointInRing(entry.ring, x, z)) continue;
      if (entry.holes.some((hole) => pointInRing(hole, x, z))) continue;
      return entry.park;
    }
    return null;
  };

  // -------------------------------------------------------------------------------------------------------------------
  // 4. Buildings: every ordinary building is generated inside a real lot. Landmark sites reserve their real place and
  //    height, but their massing is still a procedural box rather than an imported footprint.
  // -------------------------------------------------------------------------------------------------------------------
  setStatus('Raising Central, Tsim Sha Tsui & Mong Kok...');
  const styleList = makeFacadeStyles();
  const landmarks = [];
  for (const [name, landmark] of Object.entries(GEO.landmarks)) {
    if (!Number.isFinite(landmark.h) || landmark.h < 4) continue;
    const w = Math.max(4, landmark.w || 0, Math.sqrt(landmark.area || 0));
    const d = Math.max(4, landmark.d || 0, Math.sqrt(landmark.area || 0));
    landmarks.push({
      name, x: landmark.x, z: landmark.z, w, d, h: landmark.h,
      bounds: {
        minX: landmark.x - w / 2, maxX: landmark.x + w / 2,
        minZ: landmark.z - d / 2, maxZ: landmark.z + d / 2
      }
    });
  }
  const landmarkAt = (x, z) => {
    for (const landmark of landmarks) {
      const b = landmark.bounds;
      if (x >= b.minX - 2 && x <= b.maxX + 2 && z >= b.minZ - 2 && z <= b.maxZ + 2) return landmark;
    }
    return null;
  };

  // Landmark boxes, in two facade families.
  const glassLandmarkBoxes = [];
  const stoneLandmarkBoxes = [];
  const masts = [];
  for (const landmark of landmarks) {
    const glass = landmark.h >= 75 || hash(landmark.x, landmark.z, 9.2) > 0.55;
    const faces = [WALL_KINDS.shop, WALL_KINDS.shop, WALL_KINDS.shop, WALL_KINDS.shop];
    const box = {
      x: landmark.x, y: SIDEWALK_TOP + landmark.h / 2, z: landmark.z,
      w: landmark.w, d: landmark.d, h: landmark.h, faces,
      tone: 0.35 + hash(landmark.x, landmark.z, 2.2) * 0.4
    };
    (glass ? glassLandmarkBoxes : stoneLandmarkBoxes).push(box);
    if (landmark.h > 175) {
      masts.push({ x: landmark.x, z: landmark.z, base: SIDEWALK_TOP + landmark.h, h: 6 + Math.min(34, landmark.h * 0.07) });
    }
    colliders.push({
      minX: landmark.bounds.minX, maxX: landmark.bounds.maxX,
      minZ: landmark.bounds.minZ, maxZ: landmark.bounds.maxZ,
      minY: 0, maxY: landmark.h + SIDEWALK_TOP
    });
  }

  const genericLots = [];
  const signs = [];
  let lotCount = 0;
  let buildingCount = 0;
  let skippedLots = 0;

  // Named street segments on a 48 m grid. Blade signs are only hung on the wall whose sidewalk actually faces a named
  // street, so they never float inside a block or clip the neighbouring building.
  const SIGN_CELL = 48;
  const signRoadSegments = [];
  const signRoadCells = new Map();
  for (const [name, , , , , flat] of GEO.roads) {
    if (!name || !flat) continue;
    for (let i = 0; i + 3 < flat.length; i += 2) {
      const x1 = flat[i], z1 = flat[i + 1], x2 = flat[i + 2], z2 = flat[i + 3];
      const id = signRoadSegments.length;
      signRoadSegments.push({ x1, z1, x2, z2 });
      const i0 = Math.floor(Math.min(x1, x2) / SIGN_CELL), i1 = Math.floor(Math.max(x1, x2) / SIGN_CELL);
      const j0 = Math.floor(Math.min(z1, z2) / SIGN_CELL), j1 = Math.floor(Math.max(z1, z2) / SIGN_CELL);
      for (let ix = i0; ix <= i1; ix++) {
        for (let iz = j0; iz <= j1; iz++) {
          const key = ix * 100003 + iz;
          let list = signRoadCells.get(key);
          if (!list) signRoadCells.set(key, (list = []));
          list.push(id);
        }
      }
    }
  }
  const namedRoadDistance = (x, z) => {
    const ix = Math.floor(x / SIGN_CELL), iz = Math.floor(z / SIGN_CELL);
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = signRoadCells.get((ix + dx) * 100003 + (iz + dz));
        if (!list) continue;
        for (const id of list) {
          const segment = signRoadSegments[id];
          const sx = segment.x2 - segment.x1, sz = segment.z2 - segment.z1;
          const lengthSq = sx * sx + sz * sz;
          const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - segment.x1) * sx + (z - segment.z1) * sz) / lengthSq)) : 0;
          const distance = Math.hypot(x - (segment.x1 + sx * t), z - (segment.z1 + sz * t));
          if (distance < best) best = distance;
        }
      }
    }
    return best;
  };

  const addNeonSigns = (lot, x, z, h, district) => {
    const dense = district === '旺角' || district === '油麻地' || district === '尖沙咀' || district === '銅鑼灣';
    if (!dense && district !== '佐敦' && district !== '灣仔') return;
    if (h < 13 || hash(x, z, 6.9) > (dense ? 0.82 : 0.34)) return;
    const count = dense ? 2 + Math.floor(hash(x, z, 11.1) * 3) : 1;
    const cs = Math.cos(lot.ry), sn = Math.sin(lot.ry);
    // Four walls: the two wide frontages (±v, panels face along the street) and the two narrow ends (±u).
    const sides = [
      { nx: sn, nz: cs, half: lot.d / 2, ry: lot.ry - Math.PI / 2, along: lot.w, ux: cs, uz: -sn },
      { nx: -sn, nz: -cs, half: lot.d / 2, ry: lot.ry - Math.PI / 2, along: lot.w, ux: cs, uz: -sn },
      { nx: cs, nz: -sn, half: lot.w / 2, ry: lot.ry, along: lot.d, ux: sn, uz: cs },
      { nx: -cs, nz: sn, half: lot.w / 2, ry: lot.ry, along: lot.d, ux: sn, uz: cs }
    ];
    const distance = sides.map((side) => namedRoadDistance(
      x + side.nx * (side.half + 1.2),
      z + side.nz * (side.half + 1.2)
    ));
    let side = null, bestDistance = 30;
    for (let i = 0; i < sides.length; i++) {
      if (distance[i] < bestDistance) { bestDistance = distance[i]; side = sides[i]; }
    }
    if (!side) return;
    for (let i = 0; i < count; i++) {
      const width = 1.8 + hash(x + i, z, 19.1) * 1.7;
      const height = 3.2 + hash(x, z + i, 21.7) * 4.4;
      const along = (hash(x + i, z, 25.1) - 0.5) * Math.max(0, side.along - width - 1.2);
      const gap = 0.3;
      const out = side.half + gap + width / 2;
      const bottom = SIDEWALK_TOP + 4.6 + hash(x, z + i, 17.3) * 11;
      const center = Math.min(bottom + height / 2, SIDEWALK_TOP + h - 1.4 - height / 2);
      signs.push({
        x: x + side.nx * out + side.ux * along,
        z: z + side.nz * out + side.uz * along,
        y: center,
        ry: side.ry,
        s: width / 2.1,
        h: height,
        palette: Math.floor(hash(x + i, z, 23.9) * 6)
      });
    }
  };

  const addGeneric = (frame, rect, blockPark) => {
    const lot = frameBox(frame[0], frame[1], frame[2], rect);
    const area = lot.w * lot.d;
    if (area < 30) return;
    const x = lot.x, z = lot.z;
    if (landmarkAt(x, z)) { skippedLots++; return; }
    if (blockPark > 0.6) { skippedLots++; return; }
    lotCount++;

    const district = districtFor(x, z);
    const glassChance = DISTRICT_GLASS.get(district) ?? 0.42;
    const areaCap = 12 + Math.sqrt(area) * 5.4;
    const districtCap = DISTRICT_HEIGHT.get(district) ?? 72;
    const r = hash(x, z, 1.3);
    let h = 9 + Math.pow(r, 1.7) * Math.min(areaCap, districtCap);
    const glass = h > 42 && hash(x, z, 4.1) < glassChance;
    const style = styleFor(styleList, glass, h, x, z);
    const tone = 0.25 + hash(x, z, 8.3) * 0.64;
    const faces = h < 70
      ? [WALL_KINDS.shop, WALL_KINDS.shop, WALL_KINDS.shop, WALL_KINDS.shop]
      : [WALL_KINDS.entry, WALL_KINDS.entry, WALL_KINDS.entry, WALL_KINDS.entry];

    // A setback crown on the taller lots gives the skyline Hong Kong's stepped silhouette without a second footprint.
    if (h > 78) {
      const baseH = h * 0.76;
      style.boxes.push({
        x, y: SIDEWALK_TOP + baseH / 2, z, w: lot.w, d: lot.d, h: baseH, ry: lot.ry, faces, tone
      });
      style.boxes.push({
        x, y: SIDEWALK_TOP + baseH + (h - baseH) / 2, z,
        w: lot.w * 0.78, d: lot.d * 0.78, h: h - baseH, ry: lot.ry, faces, tone
      });
    } else {
      style.boxes.push({ x, y: SIDEWALK_TOP + h / 2, z, w: lot.w, d: lot.d, h, ry: lot.ry, faces, tone });
    }
    buildingCount++;
    genericLots.push({ x, z, w: lot.w, d: lot.d, ry: lot.ry, h });
    colliders.push({
      minX: lot.bounds.minX, maxX: lot.bounds.maxX, minZ: lot.bounds.minZ, maxZ: lot.bounds.maxZ,
      minY: 0, maxY: h + SIDEWALK_TOP,
      // Rotated lots must collide as their true footprint, not their axis-aligned bounds.
      obb: lotObb(lot)
    });

    // Projecting neon signs, the visual signature of Mong Kok, Yau Ma Tei and Tsim Sha Tsui, hung on the street wall.
    addNeonSigns(lot, x, z, h, district);
  };

  for (const block of GEO.blocks) {
    const frames = block[5] || [[0, 0, 0, block[1]]];
    for (const frame of frames) {
      for (const rect of frame[3]) addGeneric(frame, rect, block[2] || 0);
    }
  }

  for (const style of styleList) {
    if (style.glass) continue;
    // Landmark stone boxes join the tallest stone style.
    style.boxes.push(...stoneLandmarkBoxes);
    break;
  }
  const glassStyle = styleList.find((style) => style.glass);
  glassStyle.boxes.push(...glassLandmarkBoxes);

  for (const style of styleList) {
    if (!style.boxes.length) continue;
    const mesh = createFacadeBoxes(style.material, style.boxes);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = style.glass ? 'HongKongGlassTowers' : 'HongKongStoneBlocks';
    mesh.computeBoundingSphere();
    root.add(mesh);
  }

  if (masts.length) {
    const mastMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.18, 0.34, 1, 5),
      new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.8, roughness: 0.3 }),
      masts.length
    );
    const matrix = new THREE.Matrix4();
    masts.forEach((mast, index) => {
      matrix.makeScale(1, mast.h, 1).setPosition(mast.x, mast.base + mast.h / 2, mast.z);
      mastMesh.setMatrixAt(index, matrix);
    });
    mastMesh.frustumCulled = false;
    root.add(mastMesh);
  }

  createNeonSigns(root, signs);

  // -------------------------------------------------------------------------------------------------------------------
  // 5. Street lamps & centre lines
  // -------------------------------------------------------------------------------------------------------------------
  setStatus('Lighting the streets...');
  const roadSamples = [];
  const lampSamples = [];
  for (const [name, width, , , , flat] of GEO.roads) {
    if (!flat || flat.length < 4) continue;
    roadSamples.push({ name, width, flat });
    if (width < 9 || !name) continue;
    let carry = 24 + hash(flat[0], flat[1], 3.1) * 30;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const x1 = flat[i - 2], z1 = flat[i - 1], x2 = flat[i], z2 = flat[i + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      if (length < 0.01) continue;
      const nx = dz / length, nz = -dx / length;
      const side = hash(x2, z2, 4.4) < 0.5 ? 1 : -1;
      let dist = carry;
      while (dist < length) {
        const x = x1 + (dx * dist) / length + nx * (width * 0.5 + 1.15) * side;
        const z = z1 + (dz * dist) / length + nz * (width * 0.5 + 1.15) * side;
        lampSamples.push([x, z, Math.atan2(dx, dz)]);
        dist += 46;
      }
      carry = dist - length;
    }
  }
  createStreetProps(root, lampSamples);

  // -------------------------------------------------------------------------------------------------------------------
  // 6. Trees: park groves and street trees
  // -------------------------------------------------------------------------------------------------------------------
  setStatus('Planting banyans, palms & street trees...');
  const treeSites = [];
  for (const entry of parkBounds) {
    const b = ringBounds(entry.ring);
    const target = clamp(Math.round((entry.park.acres || 1) * 5), 4, 45);
    let placed = 0;
    for (let attempt = 0; attempt < target * 7 && placed < target; attempt++) {
      const x = b.minX + hash(b.minX + attempt, b.minZ, 1.7) * (b.maxX - b.minX);
      const z = b.minZ + hash(b.minZ, b.maxZ + attempt, 2.9) * (b.maxZ - b.minZ);
      if (!pointInRing(entry.ring, x, z)) continue;
      if (entry.holes.some((hole) => pointInRing(hole, x, z))) continue;
      treeSites.push({ x, z, y: PARK_TOP, scale: 0.85 + hash(x, z, 3.3) * 0.55, species: Math.floor(hash(x, z, 8.1) * 4), tier: 1 });
      placed++;
    }
  }
  let streetTrees = 0;
  for (let i = 0; i < roadSamples.length && streetTrees < 1400; i++) {
    const road = roadSamples[i];
    if (road.width < 12 || !road.name) continue;
    const flat = road.flat;
    for (let p = 2; p + 1 < flat.length; p += 2) {
      const x1 = flat[p - 2], z1 = flat[p - 1], x2 = flat[p], z2 = flat[p + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      if (length < 1) continue;
      if (hash(x2, z2, 7.7) > 0.22) continue;
      const nx = dz / length, nz = -dx / length;
      const side = hash(x2, z2, 9.3) < 0.5 ? 1 : -1;
      treeSites.push({
        x: x1 + nx * (road.width * 0.5 + 1.9) * side,
        z: z1 + nz * (road.width * 0.5 + 1.9) * side,
        y: SIDEWALK_TOP, scale: 0.7 + hash(x2, z2, 12.1) * 0.45,
        species: Math.floor(hash(x2, z2, 15.5) * 4), tier: 2
      });
      streetTrees++;
      if (streetTrees >= 1400) break;
    }
  }
  const treeField = createTreeField(scene, treeSites, colliders);
  treeField.group.name = 'HongKongTrees';
  root.add(treeField.group);

  // -------------------------------------------------------------------------------------------------------------------
  // 7. Player ground queries & a safe Statue Square spawn
  // -------------------------------------------------------------------------------------------------------------------
  const blocksAt = (x, z) => {
    const list = blockCells.get(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL));
    if (!list) return null;
    for (const block of list) {
      const b = block.bounds;
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (pointInRing(block.outline, x, z)) return block;
    }
    return null;
  };
  const isPointOnSidewalk = (x, z) => Boolean(blocksAt(x, z)) || Boolean(parkAt(x, z));
  const landBounds = GEO.land.map((ring) => ({ ring, bounds: ringBounds(ring) }));
  const isPointOnLand = (x, z) => {
    for (const entry of landBounds) {
      const b = entry.bounds;
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (pointInRing(entry.ring, x, z)) return true;
    }
    return false;
  };

  function getGroundHeight(x, z, mode) {
    if (mode === 'helicopter') return 0;
    if (isPointOnSidewalk(x, z)) return SIDEWALK_TOP;
    if (isPointOnLand(x, z)) return 0;
    return WATER_LEVEL;
  }

  const trafficAids = createHongKongTrafficAids(root, { getGroundHeight });

  // The spawn must be on the sidewalk, clear of every generated lot, close to Statue Square.
  let personSpawn = { x: 0, z: 8, heading: 2.4 };
  let bestSpawn = Infinity;
  for (let ring = 0; ring < 300; ring++) {
    for (let step = 0; step < Math.max(1, ring * 8); step++) {
      const angle = (step / Math.max(1, ring * 8)) * Math.PI * 2;
      const x = Math.cos(angle) * ring * 2.2;
      const z = Math.sin(angle) * ring * 2.2;
      if (!isPointOnSidewalk(x, z)) continue;
      let blocked = false;
      for (const landmark of landmarks) {
        const b = landmark.bounds;
        if (x > b.minX - 1 && x < b.maxX + 1 && z > b.minZ - 1 && z < b.maxZ + 1) { blocked = true; break; }
      }
      if (blocked) continue;
      for (const lot of genericLots) {
        const dx = Math.abs(x - lot.x), dz = Math.abs(z - lot.z);
        if (dx < lot.w / 2 + 1 && dz < lot.d / 2 + 1) { blocked = true; break; }
      }
      if (blocked) continue;
      const score = Math.hypot(x, z);
      if (score < bestSpawn) {
        bestSpawn = score;
        personSpawn = { x, z, heading: 2.4 };
      }
    }
    if (bestSpawn < 160) break;
  }

  const stats = {
    landMeshes: GEO.land.length,
    blocks: blockShapes.length,
    parks: parkBounds.length,
    landmarks: landmarks.length,
    lots: lotCount,
    buildings: buildingCount,
    skippedLots,
    lamps: lampSamples.length,
    trees: treeField.stats.trees,
    signs: signs.length,
    trafficAids: trafficAids.stats
  };
  console.info('[hongkong] static world', stats);

  function update(dt, elapsed, { cameraSystem }) {
    waterMaterial.userData.waterNormal.offset.set(elapsed * 0.0045, elapsed * 0.0026);
    treeField.update(cameraSystem.currentPos);
  }

  return {
    root,
    colliders,
    bounds: GEO.bounds,
    stats,
    personSpawn,
    isPointOnLand,
    isPointOnSidewalk,
    getGroundHeight,
    update,
    treeField,
    landmarks,
    trafficAids
  };
}
