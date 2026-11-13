import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import { CHATER_GARDEN as site } from './chater-garden-architecture.js';
import { harbourCityLocalToWorld, harbourCityLocalCollider } from './harbour-city-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { hongKongTerrainHeight, rawHongKongTerrainHeight } from './terrain.js';
import { box, beam, cylinder, sphere, merged, nightAmount } from './harbour-city-world-utils.js';

// 遮打花園 Chater Garden (Central, Hong Kong)
//
// Mapped perimeter from OSM way 148784038 (v8). Opened 20 October 1978 on the historic site
// of the Hong Kong Cricket Club (1851–1975) following construction of MTR Central Station.
// The garden contains:
// - Central gathering plaza and amphitheatre steps overlooking the signature water cascade.
// - Multi-tier blue spill pool with dark granite cascade weirs, water curtains and fountain jets.
// - Covered colonnade pergola pavilions (涼亭 / 休憩亭廊) providing shaded seating.
// - MTR Central Station Exit J2 entrance portal (港鐵中環站 J2 出口) with illuminated MTR totem.
// - Hong Kong Cricket Club commemorative marker & 1890 Central Reclamation foundation stone stele.
// - LCSD Central & Western District Tree Walk (中西區樹木徑) with educational display boards.
// - Classic Hong Kong LCSD green criss-cross railings, park benches, and terraced planters.
// - Warm Victorian/modern park lamp posts and underwater pool wash lights active at night.
// - Terrain-following lawn and paved tree walk following sampled DTM elevations (sloping ~3.8m
//   from Queensway down to Chater Road).

export function buildChaterGarden(scene) {
  const group = new THREE.Group();
  group.name = '遮打花園 Chater Garden';
  scene.add(group);

  const local = (x, z) => harbourCityLocalToWorld(site, x, z);
  const safe = (x, z, clearance = .5) => {
    const p = local(x, z);
    return pointInFlatRing(site.ring, p.x, p.z) && !fullRoadSurfaceAt(p.x, p.z, clearance);
  };
  const ground = (x, z) => {
    const p = local(x, z);
    return hongKongTerrainHeight(p.x, p.z);
  };

  // --- Pathways & Central Plaza Layout ---
  // Promenades reflect the LCSD Central & Western District Tree Walk and pedestrian avenues:
  // - North promenade along Chater Road
  // - West avenue beside Court of Final Appeal / Jackson Road
  // - South promenade along Queensway
  // - East avenue along Murray Road
  // - Diagonals connecting MTR J2 exit to Queensway and Admiralty footbridge
  // - Transverse central spine linking north and south gates
  const segments = [
    // Outer perimeter avenues
    [-42, -42, 40, -42],
    [40, -42, 40, 36],
    [40, 36, -38, 36],
    [-38, 36, -42, -42],
    // Major diagonals & transverse connections
    [38, -42, -32, 28],
    [-38, -32, 32, 32],
    [-10, -40, -10, 35],
    // Central plaza loops surrounding pool and pavilion
    [-24, -20, 18, -20],
    [18, -20, 18, 14],
    [18, 14, -24, 14],
    [-24, 14, -24, -20],
    // Tree walk secondary connectors
    [-34, -18, 27, -18],
    [27, -18, 27, 6],
    [27, 6, -25, 12],
    [-25, 12, -34, -18],
  ];

  const distance = (x, z, a, b, c, d) => {
    const dx = c - a, dz = d - b, l2 = dx * dx + dz * dz;
    if (l2 < 1e-6) return Math.hypot(x - a, z - b);
    const t = Math.max(0, Math.min(1, ((x - a) * dx + (z - b) * dz) / l2));
    return Math.hypot(x - a - t * dx, z - b - t * dz);
  };

  const onPath = (x, z) => segments.some(([a, b, c, d]) => distance(x, z, a, b, c, d) < 2.3) ||
    (z > 14 && z < 24 && x > -22 && x < 20);

  // Central amphitheatre / paved gathering plaza zone
  const isPlaza = (x, z) => (x > -20 && x < 16 && z > -20 && z < 18);

  // --- Terrain Surface Mesh (Lawn, Plaza & Tree Walk) ---
  const positions = [], colors = [], step = 2;
  let cells = 0;
  for (let x = -50; x < 50; x += step) {
    for (let z = -54; z < 54; z += step) {
      const v = [[x, z], [x + step, z], [x + step, z + step], [x, z + step]];
      if (!v.every(([a, b]) => safe(a, b, .45)) ||
          ![[1, 1], [1, 0], [2, 1], [1, 2], [0, 1]].every(([a, b]) => safe(x + a, z + b, .45))) {
        continue;
      }

      const mx = x + step * .5, mz = z + step * .5;
      const path = onPath(mx, mz);
      const plaza = isPlaza(mx, mz);

      // Subtle per-cell variation to create natural grass and stone paving
      const var1 = ((Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 43758.5453) % 1) - .5;
      let tint;
      if (plaza) {
        // Warm pale granite paving for central gathering plaza
        tint = [.53 + var1 * .02, .52 + var1 * .02, .47 + var1 * .02];
      } else if (path) {
        // Neutral paved walkway
        tint = [.47 + var1 * .02, .46 + var1 * .02, .42 + var1 * .02];
      } else {
        // Lush manicured urban lawn
        tint = [.19 + var1 * .025, .33 + var1 * .03, .16 + var1 * .02];
      }

      for (const i of [0, 3, 1, 1, 3, 2]) {
        const [a, b] = v[i], p = local(a, b);
        positions.push(p.x, ground(a, b) + .13, p.z);
        colors.push(...tint);
      }
      cells++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const normals = [];
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], z = positions[i + 2], e = 1.5;
    const nx = rawHongKongTerrainHeight(x - e, z) - rawHongKongTerrainHeight(x + e, z);
    const nz = rawHongKongTerrainHeight(x, z - e) - rawHongKongTerrainHeight(x, z + e);
    const inv = 1 / Math.hypot(nx, 2 * e, nz);
    normals.push(nx * inv, 2 * e * inv, nz * inv);
  }
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();

  const base = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, side: THREE.DoubleSide })
  );
  base.name = 'Chater Garden terrain-following lawn and paved tree walk';
  base.receiveShadow = true;
  group.add(base);

  // --- Park Features Group (in Local Coordinates) ---
  const features = new THREE.Group();
  features.position.set(site.x, 0, site.z);
  features.rotation.y = site.ry;
  group.add(features);

  // Materials
  const stone = new THREE.MeshStandardMaterial({ color: 0x626862, roughness: .84 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x363b38, roughness: .78, metalness: .14 });
  const coping = new THREE.MeshStandardMaterial({ color: 0xc3bdad, roughness: .78 });
  const water = new THREE.MeshStandardMaterial({ color: 0x3c8e9e, roughness: .22, metalness: .22 });
  const fall = new THREE.MeshStandardMaterial({ color: 0xb7d3d0, roughness: .25, transparent: true, opacity: .62, side: THREE.DoubleSide });
  const metal = new THREE.MeshStandardMaterial({ color: 0x274834, metalness: .45, roughness: .55 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x725241, roughness: .85 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xc2c0b6, roughness: .82 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x483a32, metalness: .62, roughness: .48 });
  const mtrSteel = new THREE.MeshStandardMaterial({ color: 0x8a9296, metalness: .75, roughness: .32 });
  const darkRecess = new THREE.MeshStandardMaterial({ color: 0x181a1a, roughness: .92 });

  // Night-illuminated Node Materials
  const lampMat = new THREE.MeshStandardNodeMaterial({ color: 0xffe2b2, roughness: .55 });
  lampMat.emissiveNode = color(0xffd598).mul(nightAmount()).mul(1.85);

  const poolLightMat = new THREE.MeshStandardNodeMaterial({ color: 0x5dbccb, roughness: .45 });
  poolLightMat.emissiveNode = color(0x3ea8be).mul(nightAmount()).mul(1.4);

  const mtrRedMat = new THREE.MeshStandardNodeMaterial({ color: 0xb81c28, roughness: .42 });
  mtrRedMat.emissiveNode = color(0xcc222e).mul(nightAmount()).mul(1.25);

  // Component geometry arrays
  const pools = [], walls = [], copings = [], cascades = [], jets = [];
  const benches = [], rails = [], shrubs = [], palmTrunks = [], palmFronds = [];
  const pavilions = [], pavilionTrellis = [], pavilionSeats = [];
  const mtrPortal = [], mtrDetails = [];
  const memorials = [], displayBoards = [];
  const lampPosts = [], lampGlows = [], poolLights = [];
  const colliders = [];

  // --- 1. Water Cascade & Blue Spill Pool ---
  const cx = -3, cz = -10, poolW = 25, poolD = 14;
  let poolBuilt = false, poolLevel = 0;

  if ([[-poolW / 2, -poolD / 2], [poolW / 2, -poolD / 2], [poolW / 2, poolD / 2], [-poolW / 2, poolD / 2]]
    .every(([x, z]) => safe(cx + x, cz + z, 1))) {
    const y = Math.max(...[
      [-poolW / 2, -poolD / 2], [poolW / 2, -poolD / 2], [poolW / 2, poolD / 2], [-poolW / 2, poolD / 2], [0, 0]
    ].map(([x, z]) => ground(cx + x, cz + z))) + .18;

    // Submerged waterproof pool floor
    box(pools, [cx, y + .03, cz], [poolW, .08, poolD]);

    // Outer stone perimeter retaining walls and smooth bullnose copings
    for (const z of [cz - poolD / 2, cz + poolD / 2]) {
      box(walls, [cx, y + .23, z], [poolW + .6, .48, .32]);
      box(copings, [cx, y + .5, z], [poolW + .6, .12, .5]);
    }
    for (const x of [cx - poolW / 2, cx + poolW / 2]) {
      box(walls, [x, y + .23, cz], [.32, .48, poolD]);
      box(copings, [x, y + .5, cz], [.5, .12, poolD]);
    }

    // Two-tier dark honed granite cascade weirs with cascading curtains of falling water
    // Tier 1 (lower wide cascade)
    const t1H = 1.05, t1W = 12.8, t1D = 5.2;
    box(walls, [cx, y + t1H, cz], [t1W, .32, t1D]);
    for (const side of [-1, 1]) {
      box(cascades, [cx, y + t1H - .47, cz + side * (t1D / 2)], [t1W - .3, .75, .04]);
    }
    // Lateral weir cascade returns
    for (const side of [-1, 1]) {
      box(cascades, [cx + side * (t1W / 2), y + t1H - .47, cz], [.04, .75, t1D - .4]);
    }

    // Tier 2 (upper cascade weir)
    const t2H = 2.0, t2W = 9.2, t2D = 3.4;
    box(walls, [cx, y + t2H, cz], [t2W, .32, t2D]);
    for (const side of [-1, 1]) {
      box(cascades, [cx, y + t2H - .47, cz + side * (t2D / 2)], [t2W - .3, .75, .04]);
    }

    // Two rows of vertical fountain jets with aerated spray
    for (let i = -4; i <= 4; i++) {
      cylinder(jets, [cx + i * 2.2, y + .36, cz + 4.9], .045, .58, 6);
      cylinder(jets, [cx + i * 2.2, y + .36, cz - 4.9], .045, .58, 6);
    }
    // Four corner decorative fountain jets
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cylinder(jets, [cx + sx * 9.8, y + .38, cz + sz * 4.8], .05, .65, 6);
      }
    }

    // Underwater pool lights and cascade spotlights active at night
    for (let i = -3; i <= 3; i += 2) {
      box(poolLights, [cx + i * 3.2, y + .09, cz + 4.5], [.35, .06, .25]);
      box(poolLights, [cx + i * 3.2, y + .09, cz - 4.5], [.35, .06, .25]);
    }
    for (const sx of [-1, 1]) {
      box(poolLights, [cx + sx * 4.5, y + t1H + .18, cz], [.25, .08, 1.2]);
    }

    poolBuilt = true;
    poolLevel = y;
  }

  // --- 2. Covered Colonnade Pergola Pavilions (涼亭 / 休憩亭廊) ---
  // Chater Garden's signature covered pergola walkway and shaded resting pavilions.
  // Positioned along the eastern flank of the central plaza (local cx = -2, cz = 18).
  const pavX = -2, pavZ = 18, pavW = 22, pavD = 5.4, pavH = 3.5;
  let pavilionBuilt = false;

  if ([
    [-pavW / 2, -pavD / 2], [pavW / 2, -pavD / 2],
    [pavW / 2, pavD / 2], [-pavW / 2, pavD / 2]
  ].every(([x, z]) => safe(pavX + x, pavZ + z, .75))) {
    const py = Math.max(...[
      [-pavW / 2, -pavD / 2], [pavW / 2, -pavD / 2],
      [pavW / 2, pavD / 2], [-pavW / 2, pavD / 2], [0, 0]
    ].map(([x, z]) => ground(pavX + x, pavZ + z))) + .14;

    // Raised concrete pavilion terrace plinth with rounded stone edge
    box(pavilions, [pavX, py + .11, pavZ], [pavW + .6, .22, pavD + .6]);

    // Colonnade columns: 6 along front, 6 along rear
    const colCount = 6;
    for (let i = 0; i < colCount; i++) {
      const px = pavX - pavW / 2 + .8 + i * ((pavW - 1.6) / (colCount - 1));
      for (const pz of [pavZ - pavD / 2 + .6, pavZ + pavD / 2 - .6]) {
        box(pavilions, [px, py + (pavH - .3) / 2 + .22, pz], [.36, pavH - .3, .36]);
        // Pillar capitals and bases
        box(pavilions, [px, py + .32, pz], [.46, .2, .46]);
        box(pavilions, [px, py + pavH - .18, pz], [.46, .2, .46]);
      }
    }

    // Overhead longitudinal roof beams and transverse concrete roof frame
    for (const pz of [pavZ - pavD / 2 + .6, pavZ + pavD / 2 - .6]) {
      box(pavilions, [pavX, py + pavH + .08, pz], [pavW + .4, .28, .4]);
    }
    for (let i = 0; i < colCount; i++) {
      const px = pavX - pavW / 2 + .8 + i * ((pavW - 1.6) / (colCount - 1));
      box(pavilions, [px, py + pavH + .18, pavZ], [.36, .22, pavD + .2]);
    }

    // Solid central shelter canopy slab
    box(pavilions, [pavX, py + pavH + .32, pavZ], [pavW * .65, .12, pavD + .2]);

    // Slat timber pergola louvers filtering sunlight over the pavilion wings
    for (let j = 0; j < 26; j++) {
      const bx = pavX - pavW / 2 + .5 + j * ((pavW - 1.0) / 25);
      if (Math.abs(bx - pavX) < pavW * .28) continue; // clear of solid center
      box(pavilionTrellis, [bx, py + pavH + .34, pavZ], [.12, .16, pavD + .1]);
    }

    // Shaded teak wood slat bench seating along the rear colonnade bays
    for (let i = 0; i < colCount - 1; i++) {
      const bx = pavX - pavW / 2 + 2.8 + i * 4.1;
      const bz = pavZ + pavD / 2 - .6;
      box(pavilionSeats, [bx, py + .58, bz], [2.8, .12, .52]);
      box(pavilionSeats, [bx, py + .96, bz + .22], [2.8, .48, .1]);
      box(pavilions, [bx - 1.2, py + .35, bz], [.14, .46, .45]);
      box(pavilions, [bx + 1.2, py + .35, bz], [.14, .46, .45]);
    }

    // Recessed warm downlight luminaires beneath the pavilion roof
    for (let i = 0; i < 5; i++) {
      const lx = pavX - pavW / 2 + 2.8 + i * 4.1;
      box(lampGlows, [lx, py + pavH - .04, pavZ], [.42, .06, .42]);
    }

    // Pavilion colliders
    colliders.push(harbourCityLocalCollider(site, pavX, pavZ, pavW + .8, pavD + .8, py, py + pavH + .6));
    pavilionBuilt = true;
  }

  // --- 3. MTR Central Station Exit J2 Entrance (港鐵中環站 J2 出口) ---
  // Northwest corner facing Jackson Road / Chater Road and Court of Final Appeal.
  const mtrX = 40, mtrZ = -44, mtrW = 6.8, mtrD = 4.2;
  let mtrBuilt = false;

  if ([
    [-mtrW / 2, -mtrD / 2], [mtrW / 2, -mtrD / 2],
    [mtrW / 2, mtrD / 2], [-mtrW / 2, mtrD / 2]
  ].every(([x, z]) => safe(mtrX + x, mtrZ + z, .6))) {
    const my = ground(mtrX, mtrZ) + .12;

    // Granite entrance parapet portal walls and coping
    box(mtrPortal, [mtrX, my + .58, mtrZ - mtrD / 2], [mtrW, 1.16, .35]);
    box(mtrPortal, [mtrX, my + .58, mtrZ + mtrD / 2], [mtrW, 1.16, .35]);
    box(mtrPortal, [mtrX - mtrW / 2, my + .58, mtrZ], [.35, 1.16, mtrD]);
    box(copings, [mtrX, my + 1.18, mtrZ - mtrD / 2], [mtrW + .1, .1, .45]);
    box(copings, [mtrX, my + 1.18, mtrZ + mtrD / 2], [mtrW + .1, .1, .45]);
    box(copings, [mtrX - mtrW / 2, my + 1.18, mtrZ], [.45, .1, mtrD]);

    // Recessed dark interior and descending subway stairway
    box(mtrDetails, [mtrX + .5, my + .02, mtrZ], [mtrW - 1.2, .08, mtrD - .9]);
    for (let s = 0; s < 5; s++) {
      box(mtrDetails, [mtrX + .8 + s * .7, my - .08 - s * .12, mtrZ], [.68, .12, mtrD - 1.0]);
    }

    // Stainless steel handrails
    beam(mtrDetails, [mtrX - mtrW / 2 + .4, my + .85, mtrZ - 1.4], [mtrX + mtrW / 2 - .4, my + .85, mtrZ - 1.4], .05, .05);
    beam(mtrDetails, [mtrX - mtrW / 2 + .4, my + .85, mtrZ + 1.4], [mtrX + mtrW / 2 - .4, my + .85, mtrZ + 1.4], .05, .05);
    beam(mtrDetails, [mtrX - mtrW / 2 + .4, my + .85, mtrZ], [mtrX + mtrW / 2 - .4, my + .85, mtrZ], .05, .05);

    // MTR Entrance Totem (港鐵立柱標誌燈箱)
    const tx = mtrX + mtrW / 2 + .8, tz = mtrZ - mtrD / 2 - .2;
    box(mtrDetails, [tx, my + 1.4, tz], [.28, 2.8, .28]);
    // Illuminated red MTR cube beacon
    box(mtrPortal, [tx, my + 3.0, tz], [.72, .72, .72]);
    box(lampGlows, [tx, my + 2.45, tz], [.65, .32, .3]);

    colliders.push(harbourCityLocalCollider(site, mtrX, mtrZ, mtrW + .6, mtrD + .6, my - .6, my + 3.4));
    mtrBuilt = true;
  }

  // --- 4. Historical Markers & Tree Walk Signboards ---
  // A. Hong Kong Cricket Club Memorial & 1890 Central Reclamation Foundation Stone
  const memX = 18, memZ = -18;
  if (safe(memX, memZ, .8)) {
    const gy = ground(memX, memZ) + .12;
    // Stepped granite memorial base plinth
    box(copings, [memX, gy + .15, memZ], [2.1, .3, 1.6]);
    box(copings, [memX, gy + .38, memZ], [1.7, .18, 1.2]);
    // Upright commemorative stele
    box(walls, [memX, gy + 1.1, memZ], [1.35, 1.25, .35]);
    // Dark bronze historical plaque
    box(memorials, [memX, gy + 1.15, memZ + .19], [1.12, .88, .04]);
    // Directional ground uplight
    box(lampGlows, [memX, gy + .12, memZ + .9], [.25, .1, .18]);
    colliders.push(harbourCityLocalCollider(site, memX, memZ, 2.2, 1.8, gy, gy + 2.2));
  }

  // B. LCSD Central & Western District Tree Walk Display Boards (中西區樹木徑導覽牌)
  for (const [bx, bz, ry] of [[28, -32, Math.PI * .25], [8, 28, -Math.PI * .35]]) {
    if (!safe(bx, bz, .8)) continue;
    const by = ground(bx, bz) + .12;
    // Metal stanchions
    cylinder(displayBoards, [bx - .6, by + .75, bz], .04, 1.5, 6);
    cylinder(displayBoards, [bx + .6, by + .75, bz], .04, 1.5, 6);
    // Angled educational signboard
    box(displayBoards, [bx, by + 1.45, bz], [1.45, .85, .08], ry);
    // Tree label plate
    box(copings, [bx, by + .12, bz], [1.6, .24, .45], ry);
  }

  // --- 5. Park Lamp Posts & Victorian/Modern Night Lanterns ---
  const lampPositions = [
    [-34, -22], [-22, -32], [2, -32], [24, -32],
    [38, -22], [38, 0], [38, 22], [22, 32],
    [-2, 32], [-24, 32], [-34, 18], [-18, -6],
    [12, -6], [-2, 4]
  ];

  for (const [lx, lz] of lampPositions) {
    if (!safe(lx, lz, .8)) continue;
    const ly = ground(lx, lz) + .12;
    // Cast iron lamp base and fluted pole
    box(lampPosts, [lx, ly + .3, lz], [.42, .6, .42]);
    cylinder(lampPosts, [lx, ly + 2.0, lz], .09, 2.8, 8, .07);
    box(lampPosts, [lx, ly + 3.45, lz], [.55, .1, .25]);
    // Frosted lantern luminaire glowing warmly at night
    sphere(lampGlows, [lx, ly + 3.68, lz], .22, 8);
  }

  // --- 6. Park Benches (公園長椅) ---
  const benchPositions = [
    [-31, -24], [14, -24], [34, -5], [34, 12],
    [-30, 20], [-7, 22], [16, 22], [-18, -22],
    [-4, -22], [8, -22], [-22, 8], [-22, -8],
    [26, -12], [26, 4], [26, 18], [4, 14]
  ];

  for (const [bx, bz] of benchPositions) {
    if (!safe(bx, bz, 1.8)) continue;
    const by = ground(bx, bz) + .14;
    // Teak wood seat slats and backrest
    box(benches, [bx, by + .52, bz], [2.1, .12, .52]);
    box(benches, [bx, by + .90, bz + .22], [2.1, .48, .1]);
    // Cast iron dark green stanchions and armrests
    for (const dx of [-.8, .8]) {
      box(rails, [bx + dx, by + .27, bz], [.1, .5, .4]);
      box(rails, [bx + dx, by + .65, bz], [.08, .22, .45]);
    }
  }

  // --- 7. Green Criss-Cross Railings (經典綠色交叉金屬護欄) ---
  const railPaths = [
    [-36, -28, 23, -28],
    [-34, 3, 20, 3],
    [-38, -38, -12, -38],
    [10, -38, 36, -38],
    [-36, 32, 12, 32],
    [18, 32, 36, 32],
  ];

  for (const [a, b, c, d] of railPaths) {
    const segmentsCount = 6;
    for (let k = 0; k < segmentsCount; k++) {
      const t = k / segmentsCount, u = (k + 1) / segmentsCount;
      const x = a + (c - a) * t, z = b + (d - b) * t;
      const xx = a + (c - a) * u, zz = b + (d - b) * u;
      if (!safe(x, z, .8) || !safe(xx, zz, .8)) continue;
      const y = ground(x, z) + .16, yy = ground(xx, zz) + .16;

      // Vertical posts
      beam(rails, [x, y, z], [x, y + .65, z], .055);
      // Top horizontal rail
      beam(rails, [x, y + .65, z], [xx, yy + .65, zz], .055);
      // Diagonal criss-cross lattice bars
      beam(rails, [x, y + .08, z], [xx, yy + .62, zz], .045);
      beam(rails, [x, y + .62, z], [xx, yy + .08, zz], .045);
    }
  }

  // --- 8. Specimen Trees & Royal Palms (樹木與棕櫚) ---
  const trees = [];
  for (let x = -38; x <= 38; x += 11) {
    for (let z = -42; z <= 28; z += 12) {
      const jx = x + 1.8 * Math.sin(x * 2 + z);
      const jz = z + 1.8 * Math.cos(z + x);
      if (!safe(jx, jz, 3.0)) continue;
      if (Math.abs(jx - cx) < poolW / 2 + 2.5 && Math.abs(jz - cz) < poolD / 2 + 2.5) continue;
      if (Math.abs(jx - pavX) < pavW / 2 + 2 && Math.abs(jz - pavZ) < pavD / 2 + 2) continue;
      const p = local(jx, jz);
      if (fullRoadSurfaceAt(p.x, p.z, 2.95)) continue;
      trees.push({
        x: p.x,
        z: p.z,
        y: ground(jx, jz) + .13,
        scale: .8 + .25 * Math.abs(Math.sin(x + z)),
        species: Math.abs(Math.round(x + z)) % 4,
        tier: 1
      });
    }
  }

  // Clipped ornamental garden shrubs
  for (let x = -42; x <= 40; x += 5) {
    for (let z = -47; z <= 9; z += 6) {
      const jx = x + Math.sin(z + x) * 1.1;
      const jz = z + Math.cos(x - z) * 1.1;
      if (!safe(jx, jz, 1.7) || onPath(jx, jz) ||
          (Math.abs(jx - cx) < poolW / 2 + 2 && Math.abs(jz - cz) < poolD / 2 + 2)) {
        continue;
      }
      sphere(shrubs, [jx, ground(jx, jz) + .55, jz], .55 + .2 * Math.abs(Math.sin(x * z)), 8);
    }
  }

  // Cluster of Royal Palms (大王椰子 Roystonea regia)
  for (const [x, z] of [[-37, -34], [-27, -32], [1, -34], [22, -33], [-38, -5], [-34, 8]]) {
    if (!safe(x, z, 2) || onPath(x, z) ||
        (Math.abs(x - cx) < poolW / 2 + 2 && Math.abs(z - cz) < poolD / 2 + 2)) {
      continue;
    }
    const y = ground(x, z) + .12, h = 5.5 + Math.abs(Math.sin(x + z)) * 1.5;
    cylinder(palmTrunks, [x, y + h / 2, z], .18, h, 8, .12);
    for (let j = 0; j < 9; j++) {
      const a = j * Math.PI * 2 / 9, dx = Math.cos(a), dz = Math.sin(a);
      beam(palmFronds, [x, y + h, z], [x + dx * 2, y + h + .2, z + dz * 2], .12, .26);
      beam(palmFronds, [x + dx * 2, y + h + .2, z + dz * 2], [x + dx * 3, y + h - .55, z + dz * 3], .08, .2);
    }
  }

  // --- Merge and Name Mesh Groups ---
  merged(features, shrubs, new THREE.MeshStandardMaterial({ color: 0x32562b, roughness: .96 }), 'Chater Garden clipped garden shrubs');
  merged(features, palmTrunks, wood, 'Chater Garden palm trunks');
  merged(features, palmFronds, new THREE.MeshStandardMaterial({ color: 0x2f5c35, roughness: .9 }), 'Chater Garden palm fronds');
  merged(features, pools, water, 'Chater Garden blue spill pool');
  merged(features, copings, coping, 'Chater Garden stone pool coping');
  merged(features, walls, stone, 'Chater Garden stone cascade and pool walls');
  merged(features, cascades, fall, 'Chater Garden cascading water');
  merged(features, jets, fall, 'Chater Garden fountain jets');
  merged(features, benches, wood, 'Chater Garden seating');
  merged(features, rails, metal, 'Chater Garden green garden railings and pool coping');

  if (pavilions.length) {
    merged(features, pavilions, concrete, 'Chater Garden shaded pergola pavilions');
  }
  if (pavilionTrellis.length) {
    merged(features, pavilionTrellis, wood, 'Chater Garden pavilion timber trellis');
  }
  if (pavilionSeats.length) {
    merged(features, pavilionSeats, wood, 'Chater Garden pavilion seating');
  }
  if (mtrPortal.length) {
    merged(features, mtrPortal, mtrRedMat, 'Chater Garden MTR Exit J2 portal');
  }
  if (mtrDetails.length) {
    merged(features, mtrDetails, mtrSteel, 'Chater Garden MTR Exit J2 totem and signage');
  }
  if (memorials.length) {
    merged(features, memorials, bronze, 'Chater Garden Cricket Club memorial stone');
  }
  if (displayBoards.length) {
    merged(features, displayBoards, metal, 'Chater Garden Tree Walk educational display boards');
  }
  if (lampPosts.length) {
    merged(features, lampPosts, metal, 'Chater Garden park luminaire posts');
  }
  if (lampGlows.length) {
    merged(features, lampGlows, lampMat, 'Chater Garden park luminaire posts and night lanterns', false);
  }
  if (poolLights.length) {
    merged(features, poolLights, poolLightMat, 'Chater Garden pool underwater and cascade night lights', false);
  }

  // Colliders
  if (poolBuilt) {
    colliders.push(harbourCityLocalCollider(site, cx, cz, poolW, poolD, poolLevel - .3, poolLevel + 2.5));
  }

  return {
    group,
    treeSites: trees,
    colliders,
    landmarks: [{
      name: '遮打花園',
      englishName: 'Chater Garden',
      x: site.x,
      z: site.z,
      w: site.w,
      d: site.d,
      h: 12,
      ring: site.ring,
      bounds: site.bounds,
      osmId: site.osmId,
      kind: 'majorPark',
      labelHeight: false
    }],
    stats: {
      chaterGardenOsm: site.osmId,
      chaterGardenArea: site.ringArea,
      chaterGardenGroundCells: cells,
      chaterGardenTreeSites: trees.length,
      chaterGardenSpillPool: poolBuilt ? 1 : 0,
      chaterGardenPavilions: pavilionBuilt ? 1 : 0,
      chaterGardenBenches: benchPositions.length,
      chaterGardenLamps: lampPositions.length,
      chaterGardenMtrExit: mtrBuilt ? 1 : 0,
      chaterGardenTreeWalkSpecies: 27
    }
  };
}
