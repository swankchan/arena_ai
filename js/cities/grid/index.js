import * as THREE from 'three/webgpu';

// Grid City: a procedurally generated downtown demo. No external map data — every block, tower,
// sidewalk, tree and street name is created here so the city picker has a second, fully playable world.

const BLOCK = 92;
const ROAD = 26;
const N = 7;
const ZERO_X = 0;
const ZERO_Z = 200;
const PERIOD = ROAD + BLOCK;
const TOTAL = N * BLOCK + (N + 1) * ROAD;
const X0 = ZERO_X - TOTAL / 2;
const Z0 = ZERO_Z - TOTAL / 2;
const SIDEWALK_TOP = 0.12;
const LOT_INSET = 8;

const roadX = (i) => X0 + ROAD / 2 + i * PERIOD;
const roadZ = (k) => Z0 + ROAD / 2 + k * PERIOD;
const blockStartX = (j) => X0 + ROAD + j * PERIOD;
const blockStartZ = (m) => Z0 + ROAD + m * PERIOD;
const blockCenterX = (j) => blockStartX(j) + BLOCK / 2;
const blockCenterZ = (m) => blockStartZ(m) + BLOCK / 2;

const AVENUES = Array.from({ length: N + 1 }, (_, i) => `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Ave`);
const STREETS = Array.from({ length: N + 1 }, (_, k) => `${k + 1}${k === 0 ? 'st' : k === 1 ? 'nd' : k === 2 ? 'rd' : 'th'} St`);

const PLAZA_BLOCK = { j: 3, m: 3 };
const TOWER_BLOCK = { j: 3, m: 4 };

const BOUNDS = { minX: X0 - 60, maxX: X0 + TOTAL + 60, minZ: Z0 - 60, maxZ: Z0 + TOTAL + 60 };

// Deterministic layout so the city looks the same on every visit.
let seed = 0x5eed;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length) % list.length];

function facadeTextures(glass) {
  const size = 128;
  const cols = 8;
  const rows = 8;
  const w = size / cols;
  const h = size / rows;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');
  ctx.fillStyle = glass ? '#cfdce8' : '#efe9e0';
  ctx.fillRect(0, 0, size, size);

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = emissiveCanvas.height = size;
  const glow = emissiveCanvas.getContext('2d');
  glow.fillStyle = '#000000';
  glow.fillRect(0, 0, size, size);

  // Glass towers get larger panes; masonry gets punched windows with more wall between them.
  const mx = glass ? 2 : 3.5;
  const my = glass ? 3 : 4;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = rand() < 0.1;
      ctx.fillStyle = lit
        ? (glass ? '#ffe3b5' : '#ffe0ac')
        : (glass ? (rand() < 0.5 ? '#8aa6be' : '#9db7cc') : (rand() < 0.4 ? '#7b8794' : '#6b737d'));
      ctx.fillRect(x * w + mx, y * h + my, w - mx * 2, h - my * 2);
      if (lit) {
        // Only the warm windows emit, so daylight facades stay matte while night keeps a lit grid.
        glow.fillStyle = glass ? '#ffbf73' : '#ffb264';
        glow.fillRect(x * w + mx, y * h + my, w - mx * 2, h - my * 2);
      }
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  for (const texture of [map, emissiveMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }
  return { map, emissiveMap };
}

const PALETTES = [
  { color: 0xd9c9b4, glass: false, metalness: 0.05, roughness: 0.85 },
  { color: 0xc4b7a6, glass: false, metalness: 0.05, roughness: 0.9 },
  { color: 0xbfcfdd, glass: true, metalness: 0.55, roughness: 0.28 },
  { color: 0xa9bccd, glass: true, metalness: 0.65, roughness: 0.2 },
  { color: 0xe4ded2, glass: false, metalness: 0.04, roughness: 0.8 }
];

const facadeCache = new Map();
function facadeFor(glass, width, height) {
  const key = glass ? 'glass' : 'stone';
  if (!facadeCache.has(key)) facadeCache.set(key, facadeTextures(glass));
  const base = facadeCache.get(key);
  const map = base.map.clone();
  const emissiveMap = base.emissiveMap.clone();
  map.needsUpdate = emissiveMap.needsUpdate = true;
  const repeatX = Math.max(2, Math.round(width / 9));
  const repeatY = Math.max(3, Math.round(height / 12));
  map.repeat.set(repeatX, repeatY);
  emissiveMap.repeat.set(repeatX, repeatY);
  // Offset the window grid per tower so a street of same-style buildings doesn't look tiled.
  const offsetX = rand();
  const offsetY = rand();
  for (const texture of [map, emissiveMap]) {
    texture.offset.set(offsetX, offsetY);
    texture.needsUpdate = true;
  }
  return { map, emissiveMap };
}

function box(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildTower(scene, colliders, x, z, width, depth, height, palette) {
  const { map, emissiveMap } = facadeFor(palette.glass, Math.max(width, depth), height);
  const material = new THREE.MeshStandardMaterial({
    color: palette.color,
    map,
    emissiveMap,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    metalness: palette.metalness,
    roughness: palette.roughness
  });

  const tower = box(width, height, depth, material, x, 0, z);
  scene.add(tower);

  // A recessed crown and rooftop plant give the skyline more than plain slabs.
  const crownHeight = Math.max(4, height * 0.045);
  const crown = box(width * 0.72, crownHeight, depth * 0.72, material, x, height, z);
  scene.add(crown);
  if (height > 90) {
    const mastHeight = Math.max(8, height * 0.09);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, mastHeight, 6),
      new THREE.MeshStandardMaterial({ color: 0x6d737b, metalness: 0.6, roughness: 0.4 })
    );
    mast.position.set(x, height + crownHeight + mastHeight / 2, z);
    mast.castShadow = true;
    scene.add(mast);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3b2f })
    );
    beacon.position.set(x, height + crownHeight + mastHeight, z);
    beacon.name = 'GridCityBeacon';
    scene.add(beacon);
  }

  colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    minY: 0,
    maxY: height + crownHeight
  });
}

function addTrees(scene, positions) {
  const trunkGeo = new THREE.CylinderGeometry(0.38, 0.5, 5.2, 6);
  const leafGeo = new THREE.IcosahedronGeometry(4.4, 1);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d6b3a, roughness: 0.85 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach(([x, z, scale], index) => {
    matrix.makeTranslation(x, 2.6 * scale, z);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    trunks.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, 7.4 * scale, z);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    leaves.setMatrixAt(index, matrix);
  });
  trunks.castShadow = leaves.castShadow = true;
  scene.add(trunks, leaves);
}

function addStreetLamps(scene, positions) {
  const poleGeo = new THREE.CylinderGeometry(0.16, 0.22, 7.4, 6);
  const headGeo = new THREE.BoxGeometry(1.5, 0.4, 0.7);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x30343a, metalness: 0.7, roughness: 0.5 });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x2a2d31,
    emissive: 0xffd9a3,
    emissiveIntensity: 1.6,
    roughness: 0.4
  });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, positions.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach(([x, z], index) => {
    matrix.makeTranslation(x, 3.7, z);
    poles.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, 7.6, z);
    heads.setMatrixAt(index, matrix);
  });
  poles.castShadow = true;
  scene.add(poles, heads);
}

export const city = {
  id: 'grid',
  name: 'Grid City',
  short: 'GRID',
  storageKey: 'slop-grid-player-state',
  cameraPresets: ['chase', 'action', 'pov'],
  defaultMode: 'car',

  build({ scene, setStatus }) {
    setStatus('Generating Grid City blocks & streets...');
    const root = new THREE.Group();
    root.name = 'GridCity';
    scene.add(root);

    const colliders = [];
    const sidewalkRects = [];

    // Ground: one asphalt slab for the whole district, then raised sidewalks under every block.
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(TOTAL + 4, TOTAL + 4),
      new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.92, metalness: 0.02 })
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(ZERO_X, 0, ZERO_Z);
    asphalt.receiveShadow = true;
    root.add(asphalt);

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x8f8b82, roughness: 0.9 });
    const laneMat = new THREE.MeshStandardMaterial({ color: 0xd8cfa8, roughness: 0.7, emissive: 0x1a1710, emissiveIntensity: 0.2 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4c7a3f, roughness: 0.95 });

    const trees = [];
    const lamps = [];

    for (let j = 0; j < N; j++) {
      for (let m = 0; m < N; m++) {
        const startX = blockStartX(j);
        const startZ = blockStartZ(m);
        const cx = blockCenterX(j);
        const cz = blockCenterZ(m);
        const isPlaza = j === PLAZA_BLOCK.j && m === PLAZA_BLOCK.m;

        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, 0.24, BLOCK), isPlaza ? grassMat : curbMat);
        sidewalk.position.set(cx, SIDEWALK_TOP - 0.12, cz);
        sidewalk.receiveShadow = true;
        root.add(sidewalk);
        sidewalkRects.push({
          minX: startX,
          maxX: startX + BLOCK,
          minZ: startZ,
          maxZ: startZ + BLOCK
        });

        if (isPlaza) {
          // Central Plaza: lawn, fountain and a ring of trees.
          const water = new THREE.Mesh(
            new THREE.CylinderGeometry(9, 9, 0.5, 32),
            new THREE.MeshStandardMaterial({ color: 0x2f6d86, roughness: 0.15, metalness: 0.4 })
          );
          water.position.set(cx, SIDEWALK_TOP + 0.3, cz);
          water.receiveShadow = true;
          root.add(water);
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(9.4, 0.55, 8, 32),
            new THREE.MeshStandardMaterial({ color: 0xb8b2a5, roughness: 0.8 })
          );
          rim.rotation.x = Math.PI / 2;
          rim.position.set(cx, SIDEWALK_TOP + 0.55, cz);
          rim.castShadow = true;
          root.add(rim);
          for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            trees.push([cx + Math.cos(angle) * 30, cz + Math.sin(angle) * 30, 0.8 + rand() * 0.4]);
          }
          continue;
        }

        // One to four buildings per lot, inset from the sidewalk.
        const split = rand();
        const lots = split < 0.32 ? 1 : split < 0.72 ? 2 : 4;
        const lotSize = (BLOCK - LOT_INSET * 2) / (lots === 4 ? 2 : lots);
        const tall = j === TOWER_BLOCK.j && m === TOWER_BLOCK.m;
        for (let b = 0; b < lots; b++) {
          const alongX = lots === 4 ? b % 2 : b;
          const alongZ = lots === 4 ? Math.floor(b / 2) : 0;
          const width = lotSize - (lots > 1 ? 3 : 0);
          const depth = lots === 4 ? lotSize - 3 : BLOCK - LOT_INSET * 2;
          const x = startX + LOT_INSET + alongX * lotSize + width / 2;
          const z = startZ + LOT_INSET + alongZ * lotSize + depth / 2;
          const base = tall ? 120 : 24;
          const height = tall ? base + rand() * 60 : base + Math.pow(rand(), 1.6) * 78;
          const palette = pick(PALETTES);
          buildTower(root, colliders, x, z, width, depth, Math.round(height), palette);
        }

        // Street trees along two sides of each block.
        for (let t = 0; t < 3; t++) {
          const offset = 14 + t * 28;
          trees.push([startX + offset, startZ + 5.5, 0.75 + rand() * 0.3]);
          trees.push([startX + BLOCK - 5.5, startZ + offset, 0.75 + rand() * 0.3]);
        }
      }
    }

    // Sidewalk trees + lamps on the block corners.
    for (let j = 0; j < N; j++) {
      for (let k = 0; k < N; k++) {
        const x0 = blockStartX(j);
        const z0 = blockStartZ(k);
        lamps.push([x0 + 4.5, z0 + 4.5]);
        lamps.push([x0 + BLOCK - 4.5, z0 + BLOCK - 4.5]);
      }
    }

    // Dashed centre lines on every avenue and street.
    const dashGeo = new THREE.BoxGeometry(0.28, 0.02, 3.2);
    const dashes = [];
    for (let i = 0; i <= N; i++) {
      for (let z = Z0 + ROAD; z < Z0 + TOTAL - ROAD; z += 11) dashes.push([roadX(i), z + 1.6, 0]);
    }
    for (let k = 0; k <= N; k++) {
      for (let x = X0 + ROAD; x < X0 + TOTAL - ROAD; x += 11) dashes.push([x + 1.6, roadZ(k), Math.PI / 2]);
    }
    const dashMesh = new THREE.InstancedMesh(dashGeo, laneMat, dashes.length);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    dashes.forEach(([x, z, rot], index) => {
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
      matrix.compose(new THREE.Vector3(x, 0.035, z), quat, one);
      dashMesh.setMatrixAt(index, matrix);
    });
    dashMesh.receiveShadow = true;
    root.add(dashMesh);

    addTrees(root, trees);
    addStreetLamps(root, lamps);

    const sidewalkAt = (x, z) => sidewalkRects.some((r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ);
    const locationLabel = (x, z) => {
      let bestAve = 0;
      let bestAveDist = Infinity;
      let bestSt = 0;
      let bestStDist = Infinity;
      for (let i = 0; i <= N; i++) {
        const d = Math.abs(x - roadX(i));
        if (d < bestAveDist) { bestAveDist = d; bestAve = i; }
      }
      for (let k = 0; k <= N; k++) {
        const d = Math.abs(z - roadZ(k));
        if (d < bestStDist) { bestStDist = d; bestSt = k; }
      }
      const onAve = bestAveDist <= ROAD / 2;
      const onSt = bestStDist <= ROAD / 2;
      if (onAve && onSt) return `Grid City · ${AVENUES[bestAve]} & ${STREETS[bestSt]}`;
      if (onAve) return `Grid City · ${AVENUES[bestAve]}`;
      if (onSt) return `Grid City · ${STREETS[bestSt]}`;
      const plazaMinX = blockStartX(PLAZA_BLOCK.j);
      const plazaMinZ = blockStartZ(PLAZA_BLOCK.m);
      if (x > plazaMinX && x < plazaMinX + BLOCK && z > plazaMinZ && z < plazaMinZ + BLOCK) return 'Central Plaza';
      return `Grid City · near ${AVENUES[bestAve]}`;
    };

    const spawnX = roadX(4);
    const spawnZ = roadZ(4);
    const teleports = [
      { id: 'plaza', name: 'Central Plaza', sub: 'Fountain & lawn', x: blockCenterX(PLAZA_BLOCK.j), z: roadZ(PLAZA_BLOCK.m + 1), heading: Math.PI },
      { id: 'north', name: 'North Gate', sub: `${AVENUES[4]} & ${STREETS[0]}`, x: spawnX, z: roadZ(0), heading: 0 },
      { id: 'south', name: 'South Gate', sub: `${AVENUES[4]} & ${STREETS[N]}`, x: spawnX, z: roadZ(N), heading: Math.PI },
      { id: 'tower', name: 'Tower Plaza', sub: 'The 120 m landmark', x: roadX(TOWER_BLOCK.j), z: blockCenterZ(TOWER_BLOCK.m), heading: Math.PI / 2 }
    ];

    return {
      colliders,
      dynamicRoots: [],
      cameraPresets: city.cameraPresets,
      teleports,
      locationLabel,
      roadNames: new Set([...AVENUES, ...STREETS]),
      placeNames: new Set(['Grid City', 'Central Plaza']),
      entityLabels: {
        person: 'Pedestrian',
        car: 'Grid City Cab',
        cyclist: 'Grid City Cyclist',
        helicopter: 'Sightseeing Helicopter'
      },
      player: {
        bounds: BOUNDS,
        isPointOnSidewalk: sidewalkAt,
        getGroundHeight(x, z, mode) {
          return mode === 'person' && sidewalkAt(x, z) ? SIDEWALK_TOP : 0;
        }
      },
      spawn(mode) {
        return {
          x: spawnX + (mode === 'person' ? -4 : mode === 'cyclist' ? 4 : 0),
          z: spawnZ + 6,
          heading: 0
        };
      },
      update() {},
      createMap: null,
      createAudio: null
    };
  }
};
