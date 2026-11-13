import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CENTRAL_CARNIVAL_SOURCE, CENTRAL_CARNIVAL_CONFIG
} from './central-carnival-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { FULL_WORLD_HEIGHT } from './full-world.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, beam, cylinder, sphere, merged, nightAmount } from './harbour-city-world-utils.js';

const boxColliderAt = (x, z, w, d, minY, maxY, ry = 0) =>
  harbourCityLocalCollider({ x: 0, z: 0, ry: 0 }, x, z, w, d, minY, maxY, ry);

// 中環海濱活動空間、幸福摩天輪與嘉年華遊樂場
// Central Harbourfront Event Space, Hong Kong Observation Wheel & AIA Carnival
export function buildCentralCarnival(scene, {
  groundHeightAt = (x, z) => hongKongTerrainHeight(x, z) + FULL_WORLD_HEIGHT.land,
} = {}) {
  const root = new THREE.Group();
  root.name = '中環海濱活動空間與幸福摩天輪遊樂場 Central Harbourfront Event Space & Observation Wheel';
  root.userData.source = CENTRAL_CARNIVAL_SOURCE;
  scene.add(root);

  // --- Materials ---
  const steelWhite = new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.35, metalness: 0.65 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x333638, roughness: 0.45, metalness: 0.72 });
  const foundationConcrete = new THREE.MeshStandardMaterial({ color: 0x8a8c88, roughness: 0.88 });

  const gondolaRed = new THREE.MeshStandardMaterial({ color: 0xcc292b, roughness: 0.42, metalness: 0.15 });
  const gondolaWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38 });
  const gondolaGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.32, metalness: 0.75 });
  const gondolaGlass = new THREE.MeshStandardMaterial({
    color: 0x8eb9c2, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.45, depthWrite: false
  });

  const timberDeck = new THREE.MeshStandardMaterial({ color: 0x9b7853, roughness: 0.78 });
  const plazaPaver = new THREE.MeshStandardMaterial({ color: 0xbfb6a4, roughness: 0.82 });
  const grassTurf = new THREE.MeshStandardMaterial({ color: 0x4a7c42, roughness: 0.92 });
  const safetyRail = new THREE.MeshStandardMaterial({ color: 0xabb5b8, roughness: 0.28, metalness: 0.82 });

  const carouselRed = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.48 });
  const carouselGold = new THREE.MeshStandardMaterial({ color: 0xe0a926, roughness: 0.35, metalness: 0.72 });
  const carouselCream = new THREE.MeshStandardMaterial({ color: 0xfbf8ee, roughness: 0.55 });
  const carouselMirror = new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.12, metalness: 0.88 });

  const festiveBlue = new THREE.MeshStandardMaterial({ color: 0x0077b6, roughness: 0.45 });
  const festiveYellow = new THREE.MeshStandardMaterial({ color: 0xfcbf49, roughness: 0.48 });
  const festiveGreen = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.52 });
  const festivePurple = new THREE.MeshStandardMaterial({ color: 0x7209b7, roughness: 0.48 });
  const tentStripes = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.65 });
  const tentWhite = new THREE.MeshStandardMaterial({ color: 0xf1faee, roughness: 0.65 });

  const rubberBumper = new THREE.MeshStandardMaterial({ color: 0x1c1e1f, roughness: 0.92 });
  const carBody = new THREE.MeshStandardMaterial({ color: 0xff0054, roughness: 0.35, metalness: 0.32 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.88 });

  // WebGPU TSL Night-illuminated materials
  const wheelLedMat = new THREE.MeshStandardNodeMaterial({ color: 0x00f5d4, roughness: 0.28 });
  wheelLedMat.emissiveNode = color(0x00f5d4).mul(nightAmount()).mul(2.2);

  const warmBulbMat = new THREE.MeshStandardNodeMaterial({ color: 0xffd166, roughness: 0.38 });
  warmBulbMat.emissiveNode = color(0xffd598).mul(nightAmount()).mul(2.0);

  const neonMat = new THREE.MeshStandardNodeMaterial({ color: 0xff006e, roughness: 0.25 });
  neonMat.emissiveNode = color(0xff2a85).mul(nightAmount()).mul(2.4);

  // Component geometry arrays
  const pavers = [], turf = [], planters = [], foliage = [];
  const foundations = [], wheelTowers = [], wheelHub = [], wheelRims = [], wheelSpokes = [];
  const gondolaBodies = [], gondolaRoofs = [], gondolaGlasses = [], gondolaHangers = [], vipGondolas = [];
  const stationFloors = [], stationCanopies = [], stationRails = [], ticketBooths = [];
  const carouselDecks = [], carouselPillars = [], carouselRoofs = [], carouselHorses = [];
  const waveTower = [], waveCanopy = [], waveChairs = [];
  const bumperFloor = [], bumperRoof = [], bumperCarsGeo = [], rubberBumpers = [];
  const tentCanvasRed = [], tentCanvasWhite = [], tentMasts = [], tentFlags = [];
  const boothWalls = [], boothAwnings = [], boothPrizes = [];
  const foodCounters = [], foodAwnings = [], picnicTables = [];
  const archPillars = [], archSigns = [], fences = [];
  const wheelLeds = [], warmBulbs = [], neonSigns = [];
  const colliders = [];

  // --- 1. Plaza Paving & Festive Ground ---
  const bounds = CENTRAL_CARNIVAL_CONFIG.bounds;
  const step = 4.0;
  let plazaTileCount = 0;

  for (let x = bounds.minX; x < bounds.maxX; x += step) {
    for (let z = bounds.minZ; z < bounds.maxZ; z += step) {
      const cx = x + step * 0.5, cz = z + step * 0.5;
      const cy = groundHeightAt(cx, cz);
      const road = fullRoadSurfaceAt(cx, cz, 1.2, cy);
      if (road) continue;

      // Checkerboard/interlocking paver tiles with turf accents
      const isTurf = ((Math.floor(x / step) + Math.floor(z / step)) % 5 === 0);
      if (isTurf) {
        box(turf, [cx, cy + 0.02, cz], [step - 0.12, 0.04, step - 0.12]);
      } else {
        box(pavers, [cx, cy + 0.02, cz], [step - 0.08, 0.04, step - 0.08]);
      }
      plazaTileCount++;
    }
  }

  // Boundary decorative planters with palms along fairground perimeter
  for (let x = bounds.minX + 2; x <= bounds.maxX - 2; x += 8) {
    for (const z of [bounds.minZ + 1.2, bounds.maxZ - 1.2]) {
      const y = groundHeightAt(x, z);
      box(planters, [x, y + 0.35, z], [2.4, 0.7, 0.8]);
      cylinder(foliage, [x, y + 1.8, z], 0.12, 2.2, 6);
      sphere(foliage, [x, y + 2.8, z], 0.95, 8);
      colliders.push(boxColliderAt(x, z, 2.4, 0.8, y, y + 1.2));
    }
  }

  // --- 2. Hong Kong Observation Wheel (幸福摩天輪 / 香港摩天輪) ---
  const w = CENTRAL_CARNIVAL_CONFIG.wheel;
  const wx = w.x, wz = w.z, wy = groundHeightAt(wx, wz);
  const hubY = wy + w.hubHeight;

  // Concrete foundation anchor pads
  for (const dx of [-w.legSpanX * 0.5, w.legSpanX * 0.5]) {
    for (const dz of [-w.legSpanZ * 0.5, w.legSpanZ * 0.5]) {
      box(foundations, [wx + dx, wy + 0.5, wz + dz], [4.2, 1.0, 4.2]);
      colliders.push(boxColliderAt(wx + dx, wz + dz, 4.2, 4.2, wy, wy + 1.2));
    }
  }

  // Four massive white steel tubular lattice A-frame support legs
  for (const dx of [-w.legSpanX * 0.5, w.legSpanX * 0.5]) {
    for (const dz of [-w.legSpanZ * 0.5, w.legSpanZ * 0.5]) {
      const topX = wx + (dx > 0 ? 1.6 : -1.6);
      const topZ = wz + (dz > 0 ? 1.8 : -1.8);
      beam(wheelTowers, [wx + dx, wy + 1.0, wz + dz], [topX, hubY, topZ], 0.72, 0.72);

      // Mid-height cross struts
      const midT = 0.45;
      const mx = (wx + dx) * (1 - midT) + topX * midT;
      const mz = (wz + dz) * (1 - midT) + topZ * midT;
      const my = (wy + 1.0) * (1 - midT) + hubY * midT;
      const oppZ = wz + (dz > 0 ? -1 : 1) * Math.abs(dz) * (1 - midT) + (dz > 0 ? -1.8 : 1.8) * midT;
      beam(wheelTowers, [mx, my, mz], [mx, my, oppZ], 0.38, 0.38);

      colliders.push(boxColliderAt(wx + dx, wz + dz, 1.8, 1.8, wy, wy + 8.0));
    }
  }

  // Central heavy steel axle hub
  cylinder(wheelHub, [wx, hubY, wz], 1.4, 4.8, 16, 1.4);
  cylinder(wheelHub, [wx - 1.2, hubY, wz], 1.9, 0.45, 16, 1.9);
  cylinder(wheelHub, [wx + 1.2, hubY, wz], 1.9, 0.45, 16, 1.9);

  // Dual concentric circular rims & radial spoke trusses
  const rimRadius = w.radius; // 27.0m
  const innerRadius = w.rimInnerRadius; // 24.2m
  const rimPlanes = [-1.4, 1.4]; // Front and rear wheel planes along Z
  const segments = 42;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;

    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    for (const rz of rimPlanes) {
      // Outer rim tubular beam
      beam(wheelRims,
        [wx + cos0 * rimRadius, hubY + sin0 * rimRadius, wz + rz],
        [wx + cos1 * rimRadius, hubY + sin1 * rimRadius, wz + rz],
        0.55, 0.55);

      // Inner rim tubular beam
      beam(wheelRims,
        [wx + cos0 * innerRadius, hubY + sin0 * innerRadius, wz + rz],
        [wx + cos1 * innerRadius, hubY + sin1 * innerRadius, wz + rz],
        0.42, 0.42);

      // Radial lattice struts connecting outer to inner rim
      beam(wheelRims,
        [wx + cos0 * innerRadius, hubY + sin0 * innerRadius, wz + rz],
        [wx + cos0 * rimRadius, hubY + sin0 * rimRadius, wz + rz],
        0.32, 0.32);

      // Diamond diagonal cross-brace
      beam(wheelRims,
        [wx + cos0 * innerRadius, hubY + sin0 * innerRadius, wz + rz],
        [wx + cos1 * rimRadius, hubY + sin1 * rimRadius, wz + rz],
        0.24, 0.24);

      // Radial spoke connecting hub to inner rim
      if (i % 2 === 0) {
        beam(wheelSpokes,
          [wx + (rz > 0 ? 0.9 : -0.9), hubY, wz + rz * 0.6],
          [wx + cos0 * innerRadius, hubY + sin0 * innerRadius, wz + rz],
          0.22, 0.22);
      }
    }

    // Transverse struts connecting front and rear rims
    beam(wheelRims,
      [wx + cos0 * rimRadius, hubY + sin0 * rimRadius, wz + rimPlanes[0]],
      [wx + cos0 * rimRadius, hubY + sin0 * rimRadius, wz + rimPlanes[1]],
      0.35, 0.35);

    // Dynamic WebGPU TSL Night LED light point along outer rim
    box(wheelLeds,
      [wx + cos0 * (rimRadius + 0.35), hubY + sin0 * (rimRadius + 0.35), wz],
      [0.45, 0.45, 3.2]);

    // 42 Modern aerodynamic passenger observation gondolas
    const gx = wx + cos0 * rimRadius;
    const gy = hubY + sin0 * rimRadius;
    const isVip = (i === 0);

    // Gondola pivot hanger arm (keeping cabin upright)
    beam(gondolaHangers, [gx, gy, wz], [gx, gy - 1.2, wz], 0.28, 0.28);

    // Gondola body capsule
    const cyGondola = gy - 2.4;
    const bodyMat = isVip ? vipGondolas : gondolaBodies;
    box(bodyMat, [gx, cyGondola, wz], [2.4, 1.1, 2.0]);
    // White aerodynamic roof
    box(gondolaRoofs, [gx, cyGondola + 1.2, wz], [2.45, 0.42, 2.05]);
    // Panoramic tinted glass windows
    box(gondolaGlasses, [gx, cyGondola + 0.58, wz], [2.35, 0.82, 1.95]);
  }

  // Boarding station & passenger platform
  const st = w.station;
  const stY = wy + st.height;
  box(stationFloors, [wx, wy + st.height * 0.5, wz], [st.width, st.height, st.length]);
  colliders.push(boxColliderAt(wx, wz, st.width, st.length, wy, stY));

  // Station safety balustrades and boarding queues
  for (const side of [-1, 1]) {
    beam(stationRails,
      [wx - st.width * 0.5, stY + 0.55, wz + side * (st.length * 0.5 - 0.2)],
      [wx + st.width * 0.5, stY + 0.55, wz + side * (st.length * 0.5 - 0.2)],
      0.08, 1.1);
  }

  // Boarding station tension fabric shade canopy
  box(stationCanopies, [wx, stY + st.canopyHeight, wz], [st.width + 1.2, 0.24, st.length + 0.8]);
  for (const dx of [-st.width * 0.45, st.width * 0.45]) {
    for (const dz of [-st.length * 0.45, st.length * 0.45]) {
      cylinder(stationRails, [wx + dx, stY + st.canopyHeight * 0.5, wz + dz], 0.12, st.canopyHeight, 8);
    }
  }

  // Wheel ticket office and operator cabin
  const tb = w.ticketBooth;
  box(ticketBooths, [wx - 11.2, wy + tb.height * 0.5, wz], [tb.width, tb.height, tb.length]);
  box(gondolaGlasses, [wx - 11.2, wy + tb.height * 0.65, wz + tb.length * 0.51], [tb.width * 0.7, 1.1, 0.1]);
  colliders.push(boxColliderAt(wx - 11.2, wz, tb.width, tb.length, wy, wy + tb.height));

  // --- 3. AIA Vitality Park Classic Carousel (歐陸復古旋轉木馬) ---
  const car = CENTRAL_CARNIVAL_CONFIG.carousel;
  const cx = car.x, cz = car.z, cy = groundHeightAt(cx, cz);

  // Stepped circular wooden deck
  cylinder(carouselDecks, [cx, cy + car.deckHeight * 0.5, cz], car.radius, car.deckHeight, 24, car.radius);
  cylinder(carouselDecks, [cx, cy + car.deckHeight * 0.25, cz], car.radius + 0.6, car.deckHeight * 0.5, 24, car.radius + 0.6);
  colliders.push(boxColliderAt(cx, cz, car.diameter + 0.8, car.diameter + 0.8, cy, cy + car.height));

  // Ornate central mirrored octagonal pillar
  cylinder(carouselPillars, [cx, cy + car.height * 0.42, cz], 1.6, car.height * 0.72, 8, 1.6);
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    box(carouselPillars,
      [cx + Math.cos(ang) * 1.5, cy + car.height * 0.42, cz + Math.sin(ang) * 1.5],
      [0.24, car.height * 0.68, 0.24]);
  }

  // Two-tier scalloped crimson and cream fabric canopy roof
  cylinder(carouselRoofs, [cx, cy + car.height - 0.4, cz], car.radius + 0.4, 0.8, 24, car.radius * 0.6);
  cylinder(carouselDecks, [cx, cy + car.height + 0.35, cz], car.radius * 0.65, 0.9, 16, 0.2); // Golden peak
  sphere(carouselPillars, [cx, cy + car.height + 0.9, cz], 0.38, 12); // Top finial

  // Warm bulb ring around carousel perimeter fascia
  for (let b = 0; b < 24; b++) {
    const ang = (b / 24) * Math.PI * 2;
    box(warmBulbs,
      [cx + Math.cos(ang) * (car.radius + 0.32), cy + car.height - 0.7, cz + Math.sin(ang) * (car.radius + 0.32)],
      [0.22, 0.22, 0.22]);
  }

  // 16 Carved carousel horses on brass poles
  for (let h = 0; h < car.horses; h++) {
    const ang = (h / car.horses) * Math.PI * 2;
    const rHorse = (h % 2 === 0) ? car.radius * 0.72 : car.radius * 0.48;
    const hx = cx + Math.cos(ang) * rHorse, hz = cz + Math.sin(ang) * rHorse;

    // Brass support pole
    cylinder(stationRails, [hx, cy + car.height * 0.45, hz], 0.045, car.height * 0.75, 6);
    // Carousel horse body likeness
    box(carouselHorses, [hx, cy + 1.25 + (h % 3) * 0.22, hz], [0.42, 0.55, 0.95]);
    box(carouselPillars, [hx, cy + 1.62 + (h % 3) * 0.22, hz + 0.35], [0.28, 0.42, 0.32]); // head
  }

  // --- 4. Wave Swinger / Flying Chairs (波浪飛天椅) ---
  const ws = CENTRAL_CARNIVAL_CONFIG.waveSwinger;
  const wsX = ws.x, wsZ = ws.z, wsY = groundHeightAt(wsX, wsZ);

  // Central decorative machinery tower
  cylinder(waveTower, [wsX, wsY + ws.height * 0.45, wsZ], ws.towerRadius, ws.height * 0.85, 12, ws.towerRadius * 0.8);
  cylinder(stationFloors, [wsX, wsY + 0.25, wsZ], ws.towerRadius + 0.8, 0.5, 16);

  // Cantilevered umbrella canopy
  cylinder(waveCanopy, [wsX, wsY + ws.height - 0.5, wsZ], ws.canopyRadius, 0.9, 16, ws.canopyRadius * 0.4);
  cylinder(waveTower, [wsX, wsY + ws.height + 0.2, wsZ], ws.canopyRadius * 0.45, 0.6, 12, 0.2);

  // Warm bulb ring on canopy edge
  for (let b = 0; b < 16; b++) {
    const ang = (b / 16) * Math.PI * 2;
    box(warmBulbs,
      [wsX + Math.cos(ang) * (ws.canopyRadius + 0.15), wsY + ws.height - 0.8, wsZ + Math.sin(ang) * (ws.canopyRadius + 0.15)],
      [0.22, 0.22, 0.22]);

    // Suspended swing chairs
    const chairR = ws.canopyRadius * 0.88;
    const chX = wsX + Math.cos(ang) * chairR;
    const chZ = wsZ + Math.sin(ang) * chairR;
    // Twin suspension chains
    beam(stationRails, [chX, wsY + ws.height - 0.6, chZ], [chX, wsY + 1.8, chZ], 0.025, 0.025);
    // Swing seat
    box(waveChairs, [chX, wsY + 1.6, chZ], [0.65, 0.45, 0.55]);
  }

  // Perimeter safety railing
  for (let r = 0; r < 24; r++) {
    const a0 = (r / 24) * Math.PI * 2, a1 = ((r + 1) / 24) * Math.PI * 2;
    const pr = ws.canopyRadius + 1.8;
    beam(fences,
      [wsX + Math.cos(a0) * pr, wsY + 0.55, wsZ + Math.sin(a0) * pr],
      [wsX + Math.cos(a1) * pr, wsY + 0.55, wsZ + Math.sin(a1) * pr],
      0.06, 1.1);
  }
  colliders.push(boxColliderAt(wsX, wsZ, (ws.canopyRadius + 1.8) * 2, (ws.canopyRadius + 1.8) * 2, wsY, wsY + ws.height));

  // --- 5. Bumper Cars Pavilion (碰碰車樂園) ---
  const bc = CENTRAL_CARNIVAL_CONFIG.bumperCars;
  const bcX = bc.x, bcZ = bc.z, bcY = groundHeightAt(bcX, bcZ);

  // Metallic conductive floor and rubber perimeter buffer
  box(bumperFloor, [bcX, bcY + 0.12, bcZ], [bc.width, 0.24, bc.depth]);
  for (const side of [-1, 1]) {
    box(rubberBumpers, [bcX, bcY + 0.45, bcZ + side * (bc.depth * 0.5 - 0.25)], [bc.width, 0.45, 0.45]);
    box(rubberBumpers, [bcX + side * (bc.width * 0.5 - 0.25), bcY + 0.45, bcZ], [0.45, 0.45, bc.depth]);
  }

  // Steel canopy roof with electrified ceiling mesh
  box(bumperRoof, [bcX, bcY + bc.height, bcZ], [bc.width + 0.8, 0.35, bc.depth + 0.8]);
  box(stationRails, [bcX, bcY + bc.height - 0.15, bcZ], [bc.width - 0.8, 0.08, bc.depth - 0.8]); // mesh grid

  // Support columns at 4 corners
  for (const dx of [-bc.width * 0.48, bc.width * 0.48]) {
    for (const dz of [-bc.depth * 0.48, bc.depth * 0.48]) {
      box(stationRails, [bcX + dx, bcY + bc.height * 0.5, bcZ + dz], [0.35, bc.height, 0.35]);
      colliders.push(boxColliderAt(bcX + dx, bcZ + dz, 0.5, 0.5, bcY, bcY + bc.height));
    }
  }

  // Bumper Cars neon sign
  box(neonSigns, [bcX, bcY + bc.height + 0.8, bcZ + bc.depth * 0.5 + 0.2], [4.8, 1.1, 0.25]);

  // 8 Bumper cars on track
  const carOffsets = [
    [-4.5, -2.5, 0.3], [-1.5, -2.5, -0.4], [1.8, -2.5, 1.2], [4.5, -2.5, -0.8],
    [-4.2, 2.4, -0.5], [-1.2, 2.4, 0.6], [2.0, 2.4, -0.2], [4.4, 2.4, 0.8]
  ];
  for (const [ox, oz, rot] of carOffsets) {
    box(bumperCarsGeo, [bcX + ox, bcY + 0.45, bcZ + oz], [1.4, 0.55, 1.9], rot);
    cylinder(rubberBumpers, [bcX + ox, bcY + 0.28, bcZ + oz], 0.95, 0.24, 12);
    // Vertical power pole touching ceiling
    cylinder(stationRails, [bcX + ox - 0.4, bcY + bc.height * 0.5, bcZ + oz], 0.025, bc.height - 0.4, 6);
  }
  colliders.push(boxColliderAt(bcX, bcZ, bc.width, bc.depth, bcY, bcY + bc.height));

  // --- 6. Circus Big Top / Grand Event Marquee (歐陸雜技團馬戲大帳篷) ---
  const bt = CENTRAL_CARNIVAL_CONFIG.circusBigTop;
  const btX = bt.x, btZ = bt.z, btY = groundHeightAt(btX, btZ);

  // Twin peaks red and white marquee canvas
  const mastOffsets = [-bt.length * 0.25, bt.length * 0.25];
  for (const mx of mastOffsets) {
    cylinder(tentCanvasRed, [btX + mx, btY + bt.wallHeight + (bt.peakHeight - bt.wallHeight) * 0.5, btZ],
      bt.width * 0.48, bt.peakHeight - bt.wallHeight, 16, 0.2);
    cylinder(tentMasts, [btX + mx, btY + bt.peakHeight * 0.55, btZ], 0.18, bt.peakHeight * 1.1, 8);
    // Top festive flag
    box(tentFlags, [btX + mx + 0.6, btY + bt.peakHeight + 0.6, btZ], [1.2, 0.55, 0.06]);
  }

  // Side perimeter walls with striped canvas panels
  box(tentCanvasWhite, [btX, btY + bt.wallHeight * 0.5, btZ], [bt.length, bt.wallHeight, bt.width]);

  // Arched entrance foyer with warm lights
  box(tentCanvasRed, [btX, btY + 2.2, btZ + bt.width * 0.5 + 0.8], [4.5, 3.4, 1.6]);
  box(warmBulbs, [btX, btY + 3.8, btZ + bt.width * 0.5 + 1.2], [4.2, 0.22, 0.22]);

  colliders.push(boxColliderAt(btX, btZ, bt.length + 1.0, bt.width + 1.0, btY, btY + bt.peakHeight));

  // --- 7. Carnival Game Booths (經典嘉年華攤位遊戲區) ---
  for (const booth of CENTRAL_CARNIVAL_CONFIG.gameBooths) {
    const gy = groundHeightAt(booth.x, booth.z);
    // Wooden stall structure
    box(boothWalls, [booth.x, gy + 1.6, booth.z], [booth.width, 3.2, booth.depth]);
    box(boothWalls, [booth.x, gy + 0.9, booth.z + booth.depth * 0.35], [booth.width, 0.12, 1.2]); // counter

    // Slanted striped awning roof
    box(boothAwnings, [booth.x, gy + 3.3, booth.z], [booth.width + 0.4, 0.22, booth.depth + 0.6]);

    // Back wall prize shelves and giant plush toys
    for (let py = 1.4; py <= 2.6; py += 0.6) {
      box(boothWalls, [booth.x, gy + py, booth.z - booth.depth * 0.45], [booth.width * 0.85, 0.08, 0.35]);
      for (let px = -booth.width * 0.32; px <= booth.width * 0.32; px += 0.65) {
        sphere(boothPrizes, [booth.x + px, gy + py + 0.22, booth.z - booth.depth * 0.45], 0.18, 8);
      }
    }

    // Overhead stall light
    box(warmBulbs, [booth.x, gy + 3.0, booth.z + booth.depth * 0.35], [booth.width * 0.7, 0.12, 0.12]);

    colliders.push(boxColliderAt(booth.x, booth.z, booth.width, booth.depth, gy, gy + 3.5));
  }

  // --- 8. Food & Beverage Village (嘉年華美食小食街) ---
  for (const stall of CENTRAL_CARNIVAL_CONFIG.foodStalls) {
    const sy = groundHeightAt(stall.x, stall.z);
    // Kiosk body and serving counter
    box(foodCounters, [stall.x, sy + 1.5, stall.z], [stall.width, 3.0, stall.depth]);
    box(foodAwnings, [stall.x, sy + 3.1, stall.z], [stall.width + 0.4, 0.24, stall.depth + 0.5]);
    box(warmBulbs, [stall.x, sy + 2.8, stall.z + stall.depth * 0.4], [stall.width * 0.65, 0.1, 0.1]);

    colliders.push(boxColliderAt(stall.x, stall.z, stall.width, stall.depth, sy, sy + 3.3));
  }

  // Outdoor picnic tables with striped canvas sun umbrellas
  for (const pt of CENTRAL_CARNIVAL_CONFIG.picnicTables) {
    const py = groundHeightAt(pt.x, pt.z);
    // Table and benches
    box(picnicTables, [pt.x, py + 0.75, pt.z], [1.8, 0.08, 0.85]);
    box(picnicTables, [pt.x, py + 0.45, pt.z - 0.65], [1.8, 0.08, 0.32]);
    box(picnicTables, [pt.x, py + 0.45, pt.z + 0.65], [1.8, 0.08, 0.32]);

    // Central sun umbrella
    cylinder(stationRails, [pt.x, py + 1.3, pt.z], 0.04, 2.6, 6);
    cylinder(tentCanvasRed, [pt.x, py + 2.3, pt.z], 1.25, 0.45, 12, 0.1);

    colliders.push(boxColliderAt(pt.x, pt.z, 2.0, 1.8, py, py + 2.5));
  }

  // --- 9. Grand Entrance Archways (遊樂場迎賓拱門) ---
  for (const arch of CENTRAL_CARNIVAL_CONFIG.entranceArches) {
    const ay = groundHeightAt(arch.x, arch.z);
    const halfW = arch.width * 0.5;
    const isX = Math.abs(arch.facing) > 0.1;

    // Dual decorative gateway pillars
    for (const s of [-halfW + 0.6, halfW - 0.6]) {
      const px = isX ? arch.x : arch.x + s;
      const pz = isX ? arch.z + s : arch.z;
      box(archPillars, [px, ay + arch.height * 0.5, pz], [0.95, arch.height, 0.95]);
      sphere(archPillars, [px, ay + arch.height + 0.45, pz], 0.45, 8);
      colliders.push(boxColliderAt(px, pz, 1.2, 1.2, ay, ay + arch.height + 0.8));
    }

    // Overhead arched festival truss beam and signboard
    box(archSigns, [arch.x, ay + arch.height - 0.2, arch.z],
      isX ? [arch.depth, 1.1, arch.width] : [arch.width, 1.1, arch.depth]);

    // Warm festival entrance lights
    box(warmBulbs, [arch.x, ay + arch.height + 0.4, arch.z],
      isX ? [arch.depth, 0.18, arch.width - 1.2] : [arch.width - 1.2, 0.18, arch.depth]);
  }

  // --- 10. Festoon String Lights Criss-Crossing the Plaza ---
  const lightPosts = [
    [202, -400], [220, -400], [238, -400], [256, -400],
    [202, -370], [220, -370], [238, -370], [256, -370]
  ];
  for (const [lx, lz] of lightPosts) {
    const ly = groundHeightAt(lx, lz);
    cylinder(stationRails, [lx, ly + 2.8, lz], 0.08, 5.6, 8);
    sphere(warmBulbs, [lx, ly + 5.7, lz], 0.22, 8);
    colliders.push(boxColliderAt(lx, lz, 0.35, 0.35, ly, ly + 5.8));
  }

  // Connecting festoon cable strings
  for (let i = 0; i < lightPosts.length - 1; i++) {
    const [x0, z0] = lightPosts[i], [x1, z1] = lightPosts[i + 1];
    if (Math.hypot(x1 - x0, z1 - z0) > 22) continue;
    const y0 = groundHeightAt(x0, z0) + 5.5, y1 = groundHeightAt(x1, z1) + 5.5;
    beam(warmBulbs, [x0, y0, z0], [x1, y1, z1], 0.06, 0.06);
  }

  // --- Merge All Geometries into Root Group ---
  merged(root, pavers, plazaPaver, 'Central Carnival decorative interlocking pavers');
  merged(root, turf, grassTurf, 'Central Carnival festive grass turf squares');
  merged(root, planters, plazaPaver, 'Central Carnival perimeter decorative planters');
  merged(root, foliage, foliageMat, 'Central Carnival tropical palms and shrubs');

  merged(root, foundations, foundationConcrete, 'Hong Kong Observation Wheel foundation pads');
  merged(root, wheelTowers, steelWhite, 'Hong Kong Observation Wheel white steel A-frame towers');
  merged(root, wheelHub, steelDark, 'Hong Kong Observation Wheel central axle and hub');
  merged(root, wheelRims, steelWhite, 'Hong Kong Observation Wheel dual concentric circular rims');
  merged(root, wheelSpokes, steelWhite, 'Hong Kong Observation Wheel tension spoke trusses');

  merged(root, gondolaBodies, gondolaRed, 'Hong Kong Observation Wheel passenger gondola capsules');
  merged(root, gondolaRoofs, gondolaWhite, 'Hong Kong Observation Wheel gondola aerodynamic roofs');
  merged(root, gondolaGlasses, gondolaGlass, 'Hong Kong Observation Wheel panoramic tinted windows');
  merged(root, gondolaHangers, steelDark, 'Hong Kong Observation Wheel gondola pivot hanger arms');
  merged(root, vipGondolas, gondolaGold, 'Hong Kong Observation Wheel VIP golden gondola');

  merged(root, stationFloors, timberDeck, 'Observation Wheel boarding station deck and ramps');
  merged(root, stationCanopies, festiveBlue, 'Observation Wheel boarding canopy');
  merged(root, stationRails, safetyRail, 'Observation Wheel stainless safety handrails');
  merged(root, ticketBooths, steelWhite, 'Observation Wheel ticket office and control cabin');

  merged(root, carouselDecks, carouselGold, 'AIA Vitality Park Carousel stepped deck and finials');
  merged(root, carouselPillars, carouselCream, 'AIA Vitality Park Carousel mirrored baroque pillars');
  merged(root, carouselRoofs, carouselRed, 'AIA Vitality Park Carousel scalloped fabric canopy');
  merged(root, carouselHorses, carouselCream, 'AIA Vitality Park Carousel carved horses and carriages');

  merged(root, waveTower, carouselGold, 'Wave Swinger flying chairs ornate central tower');
  merged(root, waveCanopy, festiveYellow, 'Wave Swinger flying chairs cantilevered canopy');
  merged(root, waveChairs, carouselRed, 'Wave Swinger flying chairs suspended swing seats');

  merged(root, bumperFloor, steelDark, 'Bumper cars metallic driving floor and bumpers');
  merged(root, bumperRoof, festiveBlue, 'Bumper cars pavilion steel truss canopy');
  merged(root, bumperCarsGeo, carBody, 'Bumper cars colourful cars on track');
  merged(root, rubberBumpers, rubberBumper, 'Bumper cars thick rubber impact barriers');

  merged(root, tentCanvasRed, tentStripes, 'Circus Big Top red striped marquee canvas');
  merged(root, tentCanvasWhite, tentWhite, 'Circus Big Top white canvas walls');
  merged(root, tentMasts, steelDark, 'Circus Big Top structural masts');
  merged(root, tentFlags, festiveYellow, 'Circus Big Top festive peak flags');

  merged(root, boothWalls, timberDeck, 'Carnival game booths timber counters and shelves');
  merged(root, boothAwnings, carouselRed, 'Carnival game booths striped canvas awnings');
  merged(root, boothPrizes, festivePurple, 'Carnival game booths plush toys and prize wall');

  merged(root, foodCounters, timberDeck, 'Food Village snack kiosks counters');
  merged(root, foodAwnings, festiveYellow, 'Food Village kiosks striped awnings');
  merged(root, picnicTables, timberDeck, 'Food Village outdoor picnic tables and umbrellas');

  merged(root, archPillars, carouselRed, 'Carnival grand entrance archway pillars');
  merged(root, archSigns, carouselGold, 'Carnival grand entrance archway signboards');
  merged(root, fences, safetyRail, 'Carnival crowd control safety perimeter fences');

  merged(root, wheelLeds, wheelLedMat, 'Hong Kong Observation Wheel dynamic night LED light rim', false);
  merged(root, warmBulbs, warmBulbMat, 'Central Carnival warm festival bulb lights and festoons', false);
  merged(root, neonSigns, neonMat, 'Central Carnival neon pavilion signs and marquees', false);

  return {
    root,
    colliders,
    stats: {
      centralCarnivalAreaM2: CENTRAL_CARNIVAL_SOURCE.eventSpaceAreaSquareMetres,
      centralCarnivalPlazaTiles: plazaTileCount,
      observationWheelHeightM: CENTRAL_CARNIVAL_CONFIG.wheel.topHeight,
      observationWheelDiameterM: CENTRAL_CARNIVAL_CONFIG.wheel.diameter,
      observationWheelGondolas: CENTRAL_CARNIVAL_CONFIG.wheel.gondolas,
      carouselDiameterM: CENTRAL_CARNIVAL_CONFIG.carousel.diameter,
      carouselHorses: CENTRAL_CARNIVAL_CONFIG.carousel.horses,
      waveSwingerChairs: CENTRAL_CARNIVAL_CONFIG.waveSwinger.chairs,
      bumperCarsCount: CENTRAL_CARNIVAL_CONFIG.bumperCars.cars,
      gameBoothsCount: CENTRAL_CARNIVAL_CONFIG.gameBooths.length,
      foodStallsCount: CENTRAL_CARNIVAL_CONFIG.foodStalls.length,
      entranceArchesCount: CENTRAL_CARNIVAL_CONFIG.entranceArches.length,
      centralCarnivalColliders: colliders.length,
      centralCarnivalPhotoTextures: 0
    },
    landmarks: [
      {
        id: 'hong-kong-observation-wheel',
        name: '香港摩天輪（幸福摩天輪）Hong Kong Observation Wheel',
        nameEn: 'Hong Kong Observation Wheel',
        x: CENTRAL_CARNIVAL_CONFIG.wheel.x,
        z: CENTRAL_CARNIVAL_CONFIG.wheel.z,
        y: wy,
        height: CENTRAL_CARNIVAL_CONFIG.wheel.topHeight,
        type: 'attraction'
      },
      {
        id: 'central-harbourfront-event-space',
        name: '中環海濱活動空間與友邦嘉年華 Central Harbourfront Event Space & Carnival',
        nameEn: 'Central Harbourfront Event Space & Carnival',
        x: (bounds.minX + bounds.maxX) * 0.5,
        z: (bounds.minZ + bounds.maxZ) * 0.5,
        y: wy,
        height: 12.0,
        type: 'event-space'
      }
    ]
  };
}
