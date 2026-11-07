// 荔園 detail pass: the park as it was actually used — gardens and flower beds, lamp posts and benches, the
// hawker kiosks, bunting over the promenade, the 馬戲棚 circus marquee, the 大舞台 variety stage, the miniature
// railway, crowds of visitors, and 天奴 Tino the elephant properly modelled in his paddock.
//
// All coordinates are in the park's local frame (site origin at the park centre, +x east, +z south), the same
// frame as lai-yuen-world.js. Provenance for the elephant, the marquee and the railway is in
// LAI_YUEN_DETAIL_SOURCES below.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { LAI_YUEN_SITE, LAI_YUEN_TINO, LAI_YUEN_ENTRANCE } from './lai-yuen-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, hash,
} from './harbour-city-world-utils.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

export const LAI_YUEN_DETAIL = Object.freeze({
  // 天奴's paddock sits in the zoo corner, beside the older cage rows, where the photographs put the elephant.
  elephantPaddock: Object.freeze({ x: -73, z: 54, width: 9.5, depth: 10.5 }),
  tinoHeight: 3.1,
  // The circus marquee and the variety stage go in the open ground east of the entrance promenade, south of 宋城 —
  // the one large clear block inside the reconstructed ring.
  circusTent: Object.freeze({ x: -56, z: 23, radius: 9, wallHeight: 4.2, peak: 12 }),
  bandstand: Object.freeze({ x: 74, z: 61, width: 12, depth: 7 }),
  // 遊園小火車: a closed loop round the lake, station where the loop meets the cross promenade.
  railway: Object.freeze({ x: -14, z: -43, rx: 19, rz: 13, stationAngle: -Math.PI / 2 }),
  kiosks: Object.freeze([
    Object.freeze({ x: -36, z: 16, name: '汽水' }),
    Object.freeze({ x: -42, z: 16, name: '雪糕' }),
    Object.freeze({ x: -36, z: 30, name: '棉花糖' }),
    Object.freeze({ x: 26, z: 20, name: '紀念品' }),
    Object.freeze({ x: 30, z: 12, name: '小食' }),
  ]),
});

export const LAI_YUEN_DETAIL_SOURCES = Object.freeze([
  {
    note: '天奴 Tino, the park\'s Burmese elephant, was the mascot of 荔園 from 1958 until he died on 1989-02-03; he '
      + 'was kept in the zoo corner and was the animal generations of Hong Kong children went to see. The model is '
      + 'posed on the paddock floor, trunk raised, at a shoulder height of about three metres.',
  },
  {
    note: 'The park ran a circus marquee and an open variety stage with nightly shows, and a miniature railway that '
      + 'ran round the grounds — the fairground furniture (bunting, bulb strings, hawker kiosks, benches) is what the '
      + 'photographs of the promenade show.',
  },
]);

function localX(x) { return x - LAI_YUEN_SITE.x; }
function localZ(z) { return z - LAI_YUEN_SITE.z; }

function makeDetailMaterials(materials) {
  const palette = harbourCityPalette();
  const bunting = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  bunting.colorNode = attribute('color');
  return {
    hide: new THREE.MeshStandardMaterial({ color: 0x8b8478, roughness: 0.92 }),
    hideShade: new THREE.MeshStandardMaterial({ color: 0x746e63, roughness: 0.94 }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xe8e2cf, roughness: 0.6 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.5 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xc4b494, roughness: 0.98 }),
    leafA: new THREE.MeshStandardMaterial({ color: 0x3f6b35, roughness: 0.9 }),
    leafB: new THREE.MeshStandardMaterial({ color: 0x50803c, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6b5744, roughness: 0.95 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x35602f, roughness: 0.95 }),
    flowerRed: new THREE.MeshStandardMaterial({ color: 0xb8433f, roughness: 0.85 }),
    flowerYellow: new THREE.MeshStandardMaterial({ color: 0xd8b24a, roughness: 0.85 }),
    tentRed: new THREE.MeshStandardMaterial({ color: 0xb03232, roughness: 0.78, side: THREE.DoubleSide }),
    tentCream: new THREE.MeshStandardMaterial({ color: 0xf0e9d6, roughness: 0.78, side: THREE.DoubleSide }),
    bench: new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.86 }),
    kiosk: new THREE.MeshStandardMaterial({ color: 0xdfd6bd, roughness: 0.8 }),
    railSteel: new THREE.MeshStandardMaterial({ color: 0x8e938f, roughness: 0.4, metalness: 0.6 }),
    loco: new THREE.MeshStandardMaterial({ color: 0x274a63, roughness: 0.5, metalness: 0.35 }),
    lamp: materials.lamp,
    white: palette.white,
    bunting,
  };
}

// -------------------------------------------------------------------------------------------------------------
// 天奴 Tino — the elephant. Body, head, ears, tusks, four legs, a curling trunk and a raised tail, on the sand.
// -------------------------------------------------------------------------------------------------------------
function elephantParts(parts, x, z, facing = 0) {
  const cos = Math.cos(facing), sin = Math.sin(facing);
  const place = (lx, ly, lz) => [x + lx * cos - lz * sin, ly, z + lx * sin + lz * cos];
  const body = new THREE.SphereGeometry(1, 18, 14);
  body.scale(1.62, 1.18, 1.08); body.translate(...place(0, 1.95, 0)); parts.body.push(body);
  const shoulder = new THREE.SphereGeometry(1, 14, 12);
  shoulder.scale(0.95, 1.02, 0.98); shoulder.translate(...place(1.05, 2.12, 0)); parts.body.push(shoulder);
  const head = new THREE.SphereGeometry(0.86, 16, 12);
  head.scale(1.02, 1.0, 0.92); head.translate(...place(1.86, 2.5, 0)); parts.head.push(head);
  // Ears: broad, thin, angled back from the head.
  for (const side of [-1, 1]) {
    const ear = new THREE.SphereGeometry(1, 12, 10);
    ear.scale(0.12, 0.86, 0.62);
    ear.rotateY(side * 0.32);
    ear.translate(...place(1.72, 2.6, side * 0.78)); parts.ears.push(ear);
  }
  // Trunk: a tube curving down from the head and curling forward at the tip.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(...place(2.42, 2.62, 0)),
    new THREE.Vector3(...place(2.78, 2.16, 0)),
    new THREE.Vector3(...place(2.94, 1.55, 0)),
    new THREE.Vector3(...place(3.02, 1.02, 0)),
    new THREE.Vector3(...place(3.28, 0.72, 0)),
  ]);
  parts.trunk.push(new THREE.TubeGeometry(curve, 16, 0.27, 8, false));
  // Tusks.
  for (const side of [-1, 1]) {
    const tusk = new THREE.ConeGeometry(0.1, 0.78, 8);
    tusk.rotateZ(-Math.PI / 2.6);
    tusk.translate(...place(2.5, 1.92, side * 0.34)); parts.tusks.push(tusk);
  }
  // Legs, slightly splayed.
  for (const [lx, lz] of [[0.95, 0.55], [0.95, -0.55], [-0.95, 0.55], [-0.95, -0.55]]) {
    const leg = new THREE.CylinderGeometry(0.36, 0.42, 1.5, 10);
    leg.translate(...place(lx, 0.75, lz)); parts.legs.push(leg);
  }
  // Tail with a small tuft.
  const tail = new THREE.CylinderGeometry(0.07, 0.05, 1.1, 6);
  tail.rotateZ(0.5); tail.translate(...place(-1.6, 1.6, 0.12)); parts.tail.push(tail);
  for (const side of [-1, 1]) {
    const eye = new THREE.SphereGeometry(0.09, 8, 6);
    eye.translate(...place(2.42, 2.72, side * 0.52)); parts.eyes.push(eye);
  }
}

function buildTino(group, materials, mats, stats) {
  const pen = new THREE.Group();
  pen.name = 'LaiYuenTinoPaddock';
  group.add(pen);
  const p = LAI_YUEN_DETAIL.elephantPaddock;
  const hw = p.width / 2, hd = p.depth / 2;
  const walls = [], rails = [], posts = [], floor = store();
  // Sand floor and a low paddock wall with a rail on top — the photographed enclosure, not a barred cage.
  quad(floor, [p.x - hw, 0.08, p.z - hd], [p.x + hw, 0.08, p.z - hd],
    [p.x + hw, 0.08, p.z + hd], [p.x - hw, 0.08, p.z + hd], [0.76, 0.70, 0.56]);
  for (const [px, pz, w, d] of [[0, -hd, p.width, 0.5], [0, hd, p.width, 0.5], [-hw, 0, 0.5, p.depth], [hw, 0, 0.5, p.depth]]) {
    box(walls, [p.x + px, 0.45, p.z + pz], [w, 0.9, d]);
  }
  for (const [px, pz, w, d] of [[0, -hd, p.width, 0.12], [0, hd, p.width, 0.12], [-hw, 0, 0.12, p.depth], [hw, 0, 0.12, p.depth]]) {
    box(rails, [p.x + px, 1.35, p.z + pz], [w, 0.12, d]);
  }
  for (const [px, pz] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) {
    cylinder(posts, [p.x + px, 0.95, p.z + pz], 0.14, 1.9, 8);
  }
  // Shade canopy over the back of the paddock and a shallow drinking trough.
  box(posts, [p.x - 2.4, 3.4, p.z - hd + 2.0], [5.4, 0.22, 3.6]);
  for (const [px, pz] of [[-4.9, -hd + 0.4], [0.1, -hd + 0.4], [-4.9, -hd + 3.6], [0.1, -hd + 3.6]]) {
    cylinder(posts, [p.x + px, 1.7, p.z + pz], 0.1, 3.4, 6);
  }
  box(walls, [p.x + 4.6, 0.28, p.z + 1.6], [2.0, 0.5, 1.2]);
  // Tino himself, facing the promenade.
  const parts = { body: [], head: [], ears: [], trunk: [], tusks: [], legs: [], tail: [], eyes: [] };
  elephantParts(parts, p.x + 0.6, p.z + 1.4, 0);
  meshStore(pen, floor, mats.sand, 'LaiYuenTinoPaddockSand', false);
  merged(pen, walls, materials.gateCream, 'LaiYuenTinoPaddockWall');
  merged(pen, rails, materials.metal, 'LaiYuenTinoPaddockRail');
  merged(pen, posts, materials.gateWhite, 'LaiYuenTinoPaddockCanopy');
  merged(pen, parts.body, mats.hide, 'LaiYuenTinoTheElephant');
  merged(pen, parts.head, mats.hide, 'LaiYuenTinoHead');
  merged(pen, parts.ears, mats.hideShade, 'LaiYuenTinoEars');
  merged(pen, parts.trunk, mats.hide, 'LaiYuenTinoTrunk');
  merged(pen, parts.tusks, mats.ivory, 'LaiYuenTinoTusks');
  merged(pen, parts.legs, mats.hideShade, 'LaiYuenTinoLegs');
  merged(pen, parts.tail, mats.hideShade, 'LaiYuenTinoTail');
  merged(pen, parts.eyes, mats.eye, 'LaiYuenTinoEyes');
  // Name board over the paddock gate.
  const sign = makeCanvasSign(5.4, 1.35, (ctx, canvas) => {
    ctx.fillStyle = '#f3ecda'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#8c2a24'; ctx.lineWidth = 10; ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.fillStyle = '#8c2a24'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 118px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
    ctx.fillText('大象 天奴', canvas.width / 2, canvas.height * 0.38, canvas.width - 40);
    ctx.font = '600 54px Arial, sans-serif'; ctx.fillStyle = '#2b3a52';
    ctx.fillText('TINO THE ELEPHANT · 1958 – 1989', canvas.width / 2, canvas.height * 0.76, canvas.width - 60);
  }, { transparent: false, canvasWidth: 1024, canvasHeight: 256 });
  sign.name = 'LaiYuenTinoSign';
  sign.position.set(p.x, 4.35, p.z + hd + 0.1);
  pen.add(sign);
  for (const side of [-2.4, 2.4]) cylinder(posts, [p.x + side, 3.1, p.z + hd], 0.09, 3.2, 6);
  stats.laiYuenTinoHeight = LAI_YUEN_DETAIL.tinoHeight;
  stats.laiYuenTinoPose = 'trunk raised, facing the promenade';
  return {
    colliders: [
      harbourCityLocalCollider(LAI_YUEN_SITE, p.x, p.z, p.width, p.depth, 0, 1.9),
    ],
  };
}

// -------------------------------------------------------------------------------------------------------------
// Gardens: lawn islands under the rides, flower beds, hedges, and a lot of trees.
// -------------------------------------------------------------------------------------------------------------
function buildGardens(group, materials, mats, stats) {
  const gardens = new THREE.Group();
  gardens.name = 'LaiYuenGardens';
  group.add(gardens);
  const beds = store(), hedges = [], trunks = [], leavesA = [], leavesB = [];
  const flowerA = store(), flowerB = store();
  const lawns = store();
  // Rounded lawn islands around the free-standing rides.
  const islands = [[-14, 9, 19], [8, 35, 10], [16, 43, 10], [8, 59, 11], [14, 67, 12], [-14, -43, 20], [-62, -45, 32]];
  for (const [cx, cz, r] of islands) {
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 1) / 28) * Math.PI * 2;
      quad(lawns, [cx, 0.07, cz],
        [cx + Math.cos(a0) * r, 0.07, cz + Math.sin(a0) * r],
        [cx + Math.cos(a1) * r, 0.07, cz + Math.sin(a1) * r], [cx, 0.07, cz], [0.31, 0.46, 0.24]);
    }
  }
  // Flower beds along the promenade edges.
  for (const [x0, z0, x1, z1] of [[-26, 49, 18, 52.5], [26, 36, 46, 39], [-70, 40, -44, 43], [-88, 18, -74, 34]]) {
    quad(beds, [x0, 0.14, z0], [x1, 0.14, z0], [x1, 0.14, z1], [x0, 0.14, z1], [0.36, 0.30, 0.22]);
    for (let i = 0; i < 12; i++) {
      const fx = x0 + (i + 0.5) * (x1 - x0) / 12;
      quad(i % 2 ? flowerA : flowerB, [fx - 0.5, 0.3, z0 + 0.4], [fx + 0.5, 0.3, z0 + 0.4],
        [fx + 0.5, 0.3, z1 - 0.4], [fx - 0.5, 0.3, z1 - 0.4], i % 2 ? [0.72, 0.24, 0.22] : [0.86, 0.70, 0.24]);
    }
  }
  // Clipped hedges framing the main promenade.
  for (const [x0, z0, x1, z1] of [[-30, 53.6, 20, 54.6], [24, 38.4, 46, 39.4], [-90, 44, -90.6, 70]]) {
    box(hedges, [(x0 + x1) / 2, 0.5, (z0 + z1) / 2], [Math.abs(x1 - x0), 1.0, Math.abs(z1 - z0)]);
  }
  // Trees: deterministic scatter over the lawn islands and the boundary margins, avoiding the rides.
  const avoid = [[-14, 9, 18], [8, 35, 9], [16, 43, 9], [8, 59, 10], [14, 67, 11], [-58, 58, 13], [-73, 54, 8],
    [-56, 23, 11], [74, 61, 8], [-14, -43, 21], [-36, 16, 5], [26, 20, 5]];
  let planted = 0;
  for (let i = 0; i < 260 && planted < 64; i++) {
    const tx = -88 + hash(i, 1, 7) * 176;
    const tz = -70 + hash(i, 2, 11) * 140;
    if (Math.abs(tx) > 88 || tz < -68 || tz > 70) continue;
    if (avoid.some(([ax, az, ar]) => Math.hypot(tx - ax, tz - az) < ar)) continue;
    if (Math.abs(tx - 48) < 16 && Math.abs(tz - 62) < 10) continue;      // keep the entrance forecourt clear
    if (tx > 8 && tz < -4) continue;                                     // outside the L-shaped block
    if (tx > 54 && tz < -8) continue;                                    // outside the park's east edge
    if (Math.abs(tx + 39) < 5 && tz > 12 && tz < 34) continue;           // kiosk corner
    const scale = 0.75 + hash(i, 3, 5) * 0.6;
    cylinder(trunks, [tx, 0.9 * scale, tz], 0.16 * scale, 1.8 * scale, 6);
    const canopy = new THREE.SphereGeometry(1.5 * scale, 10, 8);
    canopy.scale(1.0, 0.9, 1.0); canopy.translate(tx, 2.5 * scale, tz);
    (i % 2 ? leavesA : leavesB).push(canopy);
    const crown = new THREE.SphereGeometry(1.05 * scale, 8, 6);
    crown.translate(tx + 0.3 * scale, 3.4 * scale, tz - 0.2 * scale);
    (i % 2 ? leavesB : leavesA).push(crown);
    planted++;
  }
  meshStore(gardens, lawns, materials.lawn, 'LaiYuenLawnIslands', false);
  meshStore(gardens, beds, mats.flowerRed, 'LaiYuenFlowerBedBorders', false);
  meshStore(gardens, flowerA, mats.flowerRed, 'LaiYuenFlowerBedReds', false);
  meshStore(gardens, flowerB, mats.flowerYellow, 'LaiYuenFlowerBedYellows', false);
  merged(gardens, hedges, mats.hedge, 'LaiYuenHedges');
  merged(gardens, trunks, mats.trunk, 'LaiYuenTreeTrunks');
  merged(gardens, leavesA, mats.leafA, 'LaiYuenTreeCanopiesA');
  merged(gardens, leavesB, mats.leafB, 'LaiYuenTreeCanopiesB');
  stats.laiYuenTrees = planted;
  stats.laiYuenLawnIslands = islands.length;
}

// -------------------------------------------------------------------------------------------------------------
// Street life: lamp posts, benches, bins, hawker kiosks, bunting, signposts and the crowd.
// -------------------------------------------------------------------------------------------------------------
function buildStreetLife(group, materials, mats, stats) {
  const life = new THREE.Group();
  life.name = 'LaiYuenStreetLife';
  group.add(life);
  const poles = [], globes = [], benches = [], bins = [], kiosks = [], awnings = [], signs = [], bunting = store();
  // Lamp posts down the promenades.
  const lampLines = [];
  for (let i = 0; i < 9; i++) lampLines.push([-28 + i * 9, 50]);
  for (let i = 0; i < 7; i++) lampLines.push([44, 48 - i * 9]);
  for (let i = 0; i < 8; i++) lampLines.push([-82 + i * 10, -30]);
  for (const [lx, lz] of lampLines) {
    cylinder(poles, [lx, 1.7, lz], 0.09, 3.4, 6);
    const globe = new THREE.SphereGeometry(0.28, 10, 8);
    globe.translate(lx, 3.55, lz); globes.push(globe);
    box(poles, [lx, 0.12, lz], [0.42, 0.24, 0.42]);
  }
  // Bunting strung between the lamp posts at the entrance end of the promenade.
  for (let i = 0; i < 8; i++) {
    const x0 = -28 + i * 9, x1 = x0 + 9;
    for (let f = 0; f < 5; f++) {
      const t0 = f / 5, t1 = (f + 0.6) / 5;
      const sag = (t) => 3.1 - Math.sin(t * Math.PI) * 0.45;
      quad(bunting, [x0 + (x1 - x0) * t0, sag(t0), 50], [x0 + (x1 - x0) * t1, sag(t1), 50],
        [x0 + (x1 - x0) * (t0 + t1) / 2, sag((t0 + t1) / 2) - 0.55, 50],
        [x0 + (x1 - x0) * t0, sag(t0), 50], f % 2 ? [0.78, 0.22, 0.20] : [0.92, 0.82, 0.36]);
    }
  }
  // Benches and bins facing the promenade.
  const benchSpots = [];
  for (let i = 0; i < 7; i++) benchSpots.push([-24 + i * 11, 56]);
  for (let i = 0; i < 5; i++) benchSpots.push([-40 + i * 12, 30]);
  for (const [bx, bz] of benchSpots) {
    box(benches, [bx, 0.45, bz], [1.8, 0.1, 0.5]);
    box(benches, [bx, 0.75, bz - 0.22], [1.8, 0.5, 0.1]);
    for (const dx of [-0.75, 0.75]) box(benches, [bx + dx, 0.22, bz], [0.1, 0.45, 0.45]);
  }
  for (let i = 0; i < 10; i++) {
    const bx = -30 + i * 12, bz = i % 2 ? 52 : 44;
    cylinder(bins, [bx, 0.42, bz], 0.28, 0.84, 10);
  }
  // Hawker kiosks with striped awnings and a name board each.
  for (const kiosk of LAI_YUEN_DETAIL.kiosks) {
    box(kiosks, [kiosk.x, 1.45, kiosk.z], [3.0, 2.9, 2.4]);
    box(awnings, [kiosk.x, 3.05, kiosk.z + 0.4], [3.6, 0.16, 3.2]);
    const board = makeCanvasSign(2.2, 0.62, (ctx, canvas) => {
      ctx.fillStyle = '#f2ead3'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8c2a24'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 84px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
      ctx.fillText(kiosk.name, canvas.width / 2, canvas.height * 0.52, canvas.width - 24);
    }, { transparent: false, canvasWidth: 512, canvasHeight: 144 });
    board.position.set(kiosk.x, 3.75, kiosk.z + 1.24);
    life.add(board);
    signs.push(board);
    cylinder(poles, [kiosk.x - 1.7, 3.4, kiosk.z + 1.2], 0.06, 0.8, 6);
  }
  // Crowd: visitors standing at the rides and walking the promenade.
  const crowdA = [], crowdB = [], crowdC = [], heads = [];
  for (let i = 0; i < 190; i++) {
    const onPromenade = i % 3 !== 2;
    const cx = onPromenade ? -80 + hash(i, 11, 3) * 150 : -60 + hash(i, 13, 7) * 120;
    const cz = onPromenade ? 46 + hash(i, 17, 5) * 8 : -30 + hash(i, 19, 9) * 96;
    if (cx > 8 && cz < -4) continue;
    if (Math.hypot(cx - 48, cz - 62) < 14) continue;          // the forecourt stays open
    if (cx > 54 && cz < -8) continue;                          // outside the park's east edge
    if (Math.abs(cx + 36) < 6 && cz > 12 && cz < 34) continue; // kiosk corner
    if (Math.hypot(cx - 74, cz - 61) < 9) continue;            // the bandstand
    const height = 1.55 + hash(i, 23, 11) * 0.3;
    const body = new THREE.CylinderGeometry(0.19, 0.23, height * 0.62, 6);
    body.translate(cx, height * 0.31 + 0.7, cz);
    const pick = i % 3;
    (pick === 0 ? crowdA : pick === 1 ? crowdB : crowdC).push(body);
    const head = new THREE.SphereGeometry(0.15, 8, 6);
    head.translate(cx, height * 0.62 + 0.82, cz); heads.push(head);
  }
  merged(life, poles, materials.metal, 'LaiYuenLampPosts');
  merged(life, globes, mats.lamp, 'LaiYuenLampGlobes', false);
  merged(life, benches, mats.bench, 'LaiYuenBenches');
  merged(life, bins, materials.metal, 'LaiYuenLitterBins');
  merged(life, kiosks, mats.kiosk, 'LaiYuenKiosks');
  merged(life, awnings, materials.gateRed, 'LaiYuenKioskAwnings');
  meshStore(life, bunting, mats.bunting, 'LaiYuenBunting', false);
  merged(life, crowdA, materials.gateRed, 'LaiYuenCrowdA');
  merged(life, crowdB, materials.gateWhite, 'LaiYuenCrowdB');
  merged(life, crowdC, mats.loco, 'LaiYuenCrowdC');
  merged(life, heads, mats.sand, 'LaiYuenCrowdHeads');
  stats.laiYuenLampPosts = lampLines.length;
  stats.laiYuenBenches = benchSpots.length;
  stats.laiYuenKiosks = LAI_YUEN_DETAIL.kiosks.length;
  stats.laiYuenCrowd = crowdA.length + crowdB.length + crowdC.length;
  return { colliders: LAI_YUEN_DETAIL.kiosks.map((kiosk) => harbourCityLocalCollider(LAI_YUEN_SITE, kiosk.x, kiosk.z, 3.2, 2.6, 0, 3.1)) };
}

// -------------------------------------------------------------------------------------------------------------
// 馬戲棚 circus marquee and 大舞台 variety stage.
// -------------------------------------------------------------------------------------------------------------
function buildShowground(group, materials, mats, stats) {
  const shows = new THREE.Group();
  shows.name = 'LaiYuenShowground';
  group.add(shows);
  const t = LAI_YUEN_DETAIL.circusTent;
  const flagPole = [], masts = [], wallBoxes = [], seatRows = [];
  const redWalls = store(), creamWalls = store();
  const redRoof = store(), creamRoof = store();
  const redWallsBuf = store();
  const segments = 24;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2, a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = t.x + Math.cos(a0) * t.radius, z0 = t.z + Math.sin(a0) * t.radius;
    const x1 = t.x + Math.cos(a1) * t.radius, z1 = t.z + Math.sin(a1) * t.radius;
    // Striped wall band.
    quad(i % 2 ? redWalls : creamWalls, [x0, 0.1, z0], [x1, 0.1, z1], [x1, t.wallHeight, z1], [x0, t.wallHeight, z0],
      i % 2 ? [0.69, 0.20, 0.20] : [0.94, 0.91, 0.84]);
    // Cone roof, striped the same way.
    quad(i % 2 ? redRoof : creamRoof, [x0, t.wallHeight, z0], [x1, t.wallHeight, z1], [t.x, t.peak, t.z], [t.x, t.peak, t.z],
      i % 2 ? [0.69, 0.20, 0.20] : [0.94, 0.91, 0.84]);
    if (i % 4 === 0) cylinder(masts, [x0, t.wallHeight / 2, z0], 0.1, t.wallHeight, 6);
  }
  // Entrance porch and a flag on the peak.
  box(wallBoxes, [t.x, 1.7, t.z + t.radius + 1.6], [6.4, 3.4, 3.2]);
  box(wallBoxes, [t.x, 3.6, t.z + t.radius + 1.6], [7.2, 0.3, 4.0]);
  cylinder(flagPole, [t.x, t.peak + 2.2, t.z], 0.09, 4.4, 6);
  quad(redWallsBuf, [t.x, t.peak + 4.2, t.z], [t.x - 2.4, t.peak + 3.6, t.z], [t.x - 2.4, t.peak + 2.6, t.z], [t.x, t.peak + 3.2, t.z], [0.72, 0.20, 0.18]);
  // The open variety stage: a raised platform, a proscenium frame and rows of seats.
  const b = LAI_YUEN_DETAIL.bandstand;
  box(wallBoxes, [b.x, 0.55, b.z], [b.width, 1.1, b.depth]);
  box(wallBoxes, [b.x, 3.4, b.z - b.depth / 2 + 0.4], [b.width, 5.6, 0.6]);
  for (const side of [-1, 1]) box(masts, [b.x + side * (b.width / 2 - 0.3), 3.6, b.z], [0.4, 6.4, b.depth]);
  box(wallBoxes, [b.x, 7.0, b.z], [b.width + 1.2, 0.4, b.depth + 1.2]);
  for (let row = 0; row < 5; row++) {
    for (let seat = 0; seat < 10; seat++) {
      const sx = b.x - b.width / 2 + 1.2 + seat * 1.1;
      const sz = b.z + b.depth / 2 + 1.6 + row * 1.1;
      box(seatRows, [sx, 0.45 + row * 0.12, sz], [0.7, 0.12, 0.7]);
    }
  }
  meshStore(shows, redWalls, materials.gateRed, 'LaiYuenCircusRedStripes', false);
  meshStore(shows, creamWalls, materials.gateWhite, 'LaiYuenCircusCreamStripes', false);
  merged(shows, wallBoxes, materials.gateCream, 'LaiYuenCircusPorchAndStage');
  meshStore(shows, redRoof, materials.gateRed, 'LaiYuenCircusRedRoofPanels', false);
  meshStore(shows, creamRoof, materials.gateWhite, 'LaiYuenCircusCreamRoofPanels', false);
  meshStore(shows, redWallsBuf, materials.gateRed, 'LaiYuenCircusPeakFlag', false);
  merged(shows, masts, materials.metal, 'LaiYuenCircusMasts');
  merged(shows, flagPole, materials.metal, 'LaiYuenCircusFlagpole');
  merged(shows, seatRows, mats.bench, 'LaiYuenBandstandSeating');
  stats.laiYuenCircusTentDiameter = t.radius * 2;
  stats.laiYuenCircusPeak = t.peak;
  stats.laiYuenBandstandSeats = 50;
  return {
    colliders: [
      harbourCityLocalCollider(LAI_YUEN_SITE, t.x, t.z, t.radius * 2, t.radius * 2, 0, t.wallHeight + 4),
      harbourCityLocalCollider(LAI_YUEN_SITE, b.x, b.z, b.width, b.depth + 6, 0, 7.4),
    ],
  };
}

// -------------------------------------------------------------------------------------------------------------
// 遊園小火車 — the miniature railway that ran round the grounds, with its little station.
// -------------------------------------------------------------------------------------------------------------
function buildRailway(group, materials, mats, stats) {
  const rail = new THREE.Group();
  rail.name = 'LaiYuenMiniatureRailway';
  group.add(rail);
  const r = LAI_YUEN_DETAIL.railway;
  const rails = [], sleepers = [], platforms = [], trainCars = [], wheels = [], canopy = [];
  // A closed oval round the lake: the train is the way round the middle of the park, so it follows the water.
  const samples = 96;
  const point = (i) => {
    const a = (i / samples) * Math.PI * 2;
    return { x: r.x + Math.cos(a) * r.rx, z: r.z + Math.sin(a) * r.rz };
  };
  const gauge = 0.62;
  for (let i = 0; i < samples; i++) {
    const a = point(i), b = point(i + 1);
    const dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz) || 1;
    const nx = dz / length, nz = -dx / length;
    for (const side of [-1, 1]) {
      beam(rails, [a.x + nx * gauge * side / 2, 0.24, a.z + nz * gauge * side / 2],
        [b.x + nx * gauge * side / 2, 0.24, b.z + nz * gauge * side / 2], 0.09, 0.1);
    }
    box(sleepers, [a.x, 0.16, a.z], [1.05, 0.09, 0.3]);
  }
  // Station on the north side, where the loop meets the cross promenade.
  const sa = r.stationAngle;
  const stationX = r.x + Math.cos(sa) * r.rx;
  const stationZ = r.z + Math.sin(sa) * r.rz;
  box(platforms, [stationX, 0.55, stationZ + 2.2], [13, 1.1, 2.6]);
  box(platforms, [stationX, 0.9, stationZ + 2.2], [12.4, 0.12, 2.2]);
  for (const dx of [-5, 0, 5]) cylinder(platforms, [stationX + dx, 2.0, stationZ + 3.2], 0.1, 4.0, 6);
  box(canopy, [stationX, 4.1, stationZ + 2.5], [13, 0.2, 3.0]);
  const board = makeCanvasSign(4.6, 1.0, (ctx, canvas) => {
    ctx.fillStyle = '#f2ead3'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#274a63'; ctx.lineWidth = 8; ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    ctx.fillStyle = '#274a63'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 74px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
    ctx.fillText('遊園小火車', canvas.width / 2, canvas.height * 0.38, canvas.width - 30);
    ctx.font = '600 40px Arial, sans-serif';
    ctx.fillText('MINIATURE RAILWAY', canvas.width / 2, canvas.height * 0.76, canvas.width - 40);
  }, { transparent: false, canvasWidth: 768, canvasHeight: 168 });
  board.name = 'LaiYuenMiniatureRailwaySign';
  board.position.set(stationX, 4.55, stationZ + 3.4);
  rail.add(board);
  // The train itself: a locomotive and two open coaches, standing at the platform.
  const train = [
    { x: stationX - 4.4, z: stationZ + 1.0, loco: true },
    { x: stationX - 1.2, z: stationZ + 1.0 },
    { x: stationX + 2.0, z: stationZ + 1.0 },
  ];
  for (const car of train) {
    box(trainCars, [car.x, car.loco ? 1.15 : 0.95, car.z], [car.loco ? 2.6 : 2.2, car.loco ? 1.5 : 0.9, 1.35]);
    if (car.loco) {
      cylinder(trainCars, [car.x - 1.1, 1.5, car.z], 0.28, 1.2, 8);
      box(trainCars, [car.x + 1.1, 0.75, car.z], [0.5, 0.5, 1.1]);
    } else {
      for (let s = 0; s < 3; s++) box(trainCars, [car.x - 0.7 + s * 0.7, 1.45, car.z], [0.6, 0.2, 1.3]);
    }
    for (const dx of [-0.8, 0.8]) for (const dz of [-0.62, 0.62]) {
      const wheel = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10);
      wheel.rotateX(Math.PI / 2); wheel.translate(car.x + dx, 0.34, car.z + dz); wheels.push(wheel);
    }
  }
  merged(rail, rails, mats.railSteel, 'LaiYuenMiniatureRailRails');
  merged(rail, sleepers, materials.metal, 'LaiYuenMiniatureRailSleepers');
  merged(rail, platforms, materials.gateWhite, 'LaiYuenMiniatureRailStation');
  merged(rail, canopy, materials.roofMetal, 'LaiYuenMiniatureRailStationCanopy');
  merged(rail, trainCars, mats.loco, 'LaiYuenMiniatureRailTrain');
  merged(rail, wheels, materials.metal, 'LaiYuenMiniatureRailWheels');
  // Ramanujan's approximation of the ellipse perimeter.
  const perimeter = Math.PI * (3 * (r.rx + r.rz) - Math.sqrt((3 * r.rx + r.rz) * (r.rx + 3 * r.rz)));
  stats.laiYuenRailwayMetres = Math.round(perimeter);
  stats.laiYuenRailwayCars = train.length;
  return { colliders: [harbourCityLocalCollider(LAI_YUEN_SITE, stationX, stationZ + 2.2, 13.4, 3.0, 0, 4.3)] };
}

// -------------------------------------------------------------------------------------------------------------
// Paving and the park road: a tiled plaza over the whole park floor so it does not read as one grey plate, plus a
// ring road just inside the boundary carrying visitors between the gate and the far rides.
// -------------------------------------------------------------------------------------------------------------
function buildPavingDetail(group, materials, stats) {
  const pave = new THREE.Group();
  pave.name = 'LaiYuenPavingDetail';
  group.add(pave);
  const ring = LAI_YUEN_SITE.localRing;
  const tiles = [store(), store(), store(), store()];
  const tile = 6;
  let laid = 0;
  for (let x = -92; x < 92; x += tile) {
    for (let z = -72; z < 72; z += tile) {
      const corners = [[x, z], [x + tile, z], [x + tile, z + tile], [x, z + tile]];
      if (!corners.every(([cx, cz]) => pointInFlatRing(ring, cx, cz))) continue;
      const pick = (Math.abs(Math.floor(x / tile) + Math.floor(z / tile)) % 2) + (hash(Math.floor(x / tile), Math.floor(z / tile), 3) > 0.7 ? 2 : 0);
      quad(tiles[pick], [x + 0.12, 0.045, z + 0.12], [x + tile - 0.12, 0.045, z + 0.12],
        [x + tile - 0.12, 0.045, z + tile - 0.12], [x + 0.12, 0.045, z + tile - 0.12],
        pick === 0 ? [0.707, 0.667, 0.573] : pick === 1 ? [0.678, 0.639, 0.549] : pick === 2 ? [0.735, 0.694, 0.596] : [0.655, 0.618, 0.533]);
      laid++;
    }
  }
  // Park road: a 7 m asphalt ring inset from the boundary, with kerbs on both sides.
  const roads = store(), kerbs = [];
  const offset = 5.5;
  const cornersPts = [];
  for (let i = 0; i < ring.length; i += 2) cornersPts.push([ring[i], ring[i + 1]]);
  const inner = cornersPts.map(([x, z]) => {
    const length = Math.hypot(x, z) || 1;
    return [x - (x / length) * offset, z - (z / length) * offset];
  });
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i], b = inner[(i + 1) % inner.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.5) continue;
    const nx = dz / length, nz = -dx / length;
    const width = 7;
    quad(roads, [a[0], 0.04, a[1]], [b[0], 0.04, b[1]],
      [b[0] + nx * width, 0.04, b[1] + nz * width], [a[0] + nx * width, 0.04, a[1] + nz * width], [0.34, 0.34, 0.36]);
    for (const side of [0, width]) {
      beam(kerbs, [a[0] + nx * side, 0.12, a[1] + nz * side], [b[0] + nx * side, 0.12, b[1] + nz * side], 0.34, 0.20);
    }
  }
  // Grass verge between the road and the boundary bank.
  const verge = store();
  const outerPts = cornersPts.map(([x, z]) => {
    const length = Math.hypot(x, z) || 1;
    return [x - (x / length) * 1.5, z - (z / length) * 1.5];
  });
  for (let i = 0; i < outerPts.length; i++) {
    const a = outerPts[i], b = outerPts[(i + 1) % outerPts.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.5) continue;
    const nx = dz / length, nz = -dx / length;
    quad(verge, [a[0], 0.05, a[1]], [b[0], 0.05, b[1]],
      [b[0] + nx * 4, 0.05, b[1] + nz * 4], [a[0] + nx * 4, 0.05, a[1] + nz * 4], [0.33, 0.47, 0.26]);
  }
  meshStore(pave, verge, materials.lawn, 'LaiYuenBoundaryVerge', false);
  meshStore(pave, tiles[0], materials.path, 'LaiYuenPlazaTilesA', false);
  meshStore(pave, tiles[1], materials.gateCream, 'LaiYuenPlazaTilesB', false);
  meshStore(pave, tiles[2], materials.gateWhite, 'LaiYuenPlazaTilesC', false);
  meshStore(pave, tiles[3], materials.paving, 'LaiYuenPlazaTilesD', false);
  meshStore(pave, roads, materials.path, 'LaiYuenParkRoad', false);
  merged(pave, kerbs, materials.gateCream, 'LaiYuenParkRoadKerbs');
  stats.laiYuenPlazaTiles = laid;
  stats.laiYuenParkRoadMetres = Math.round(inner.reduce((total, p, i) => {
    const q = inner[(i + 1) % inner.length];
    return total + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0));
}

// -------------------------------------------------------------------------------------------------------------
// The forecourt outside the gate, and a grass bank so the levelled park meets the street without a step.
// -------------------------------------------------------------------------------------------------------------
function buildForecourt(group, materials, mats, stats) {
  const fore = new THREE.Group();
  fore.name = 'LaiYuenForecourt';
  group.add(fore);
  const paving = store(), kerbs = [], flagpoles = [], flags = store(), queueRails = [];
  const ring = LAI_YUEN_SITE.localRing;
  const gateX = LAI_YUEN_ENTRANCE.x - LAI_YUEN_SITE.x;
  const gateZ = LAI_YUEN_ENTRANCE.z - LAI_YUEN_SITE.z;
  // The forecourt lies inside the park wall, between the turnstiles and the boundary: visitors pass the ticket
  // booths, then queue across this apron. Everything is clipped to the ring so nothing overhangs the bank.
  for (let x = gateX - 18; x < gateX + 18; x += 3) {
    for (let z = gateZ + 1; z < gateZ + 8; z += 2.2) {
      if (!pointInFlatRing(ring, x + 1.5, z + 1.1) || !pointInFlatRing(ring, x + 0.2, z + 0.2)
        || !pointInFlatRing(ring, x + 2.8, z + 2.0)) continue;
      quad(paving, [x, 0.055, z], [x + 3, 0.055, z], [x + 3, 0.055, z + 2.2], [x, 0.055, z + 2.2],
        ((Math.round(x) + Math.round(z)) % 2) ? [0.745, 0.712, 0.634] : [0.706, 0.674, 0.596]);
    }
  }
  // Kerb along the inner edge of the apron, where it meets the promenade.
  beam(kerbs, [gateX - 18, 0.13, gateZ + 1], [gateX + 18, 0.13, gateZ + 1], 0.36, 0.2);
  // Flagpoles flanking the approach, with the park's red and cream banners.
  for (const side of [-1, 1]) {
    const fx = gateX + side * 9.5;
    cylinder(flagpoles, [fx, 3.0, gateZ + 6.5], 0.11, 6.0, 8);
    quad(flags, [fx, 5.85, gateZ + 6.5], [fx + side * 1.9, 5.5, gateZ + 6.5], [fx + side * 1.9, 4.6, gateZ + 6.5],
      [fx, 4.95, gateZ + 6.5], side > 0 ? [0.70, 0.21, 0.20] : [0.93, 0.90, 0.82]);
  }
  // Queue rails guiding visitors from the apron to the turnstiles.
  for (let i = 0; i < 3; i++) {
    const qz = gateZ + 2.4 + i * 1.7;
    beam(queueRails, [gateX - 5.4, 0.95, qz], [gateX + 5.4, 0.95, qz], 0.08, 0.08);
    for (const side of [-1, 1]) cylinder(queueRails, [gateX + side * 5.4, 0.5, qz], 0.07, 1.0, 6);
  }
  meshStore(fore, paving, materials.path, 'LaiYuenForecourtPaving', false);
  meshStore(fore, flags, mats.bunting, 'LaiYuenForecourtFlags', false);
  merged(fore, kerbs, materials.gateCream, 'LaiYuenForecourtKerbs');
  merged(fore, flagpoles, materials.metal, 'LaiYuenForecourtFlagpoles');
  merged(fore, queueRails, materials.metal, 'LaiYuenForecourtQueueRails');
  stats.laiYuenForecourt = true;
  return { colliders: [] };
}

// The bank that takes the levelled park down to the surrounding ground: a ring of graded triangles, sampled from
// the terrain function so it always meets the hillside and the street exactly.
export function buildParkBank(group, materials, terrainHeightAt, groundOffset) {
  const bank = new THREE.Group();
  bank.name = 'LaiYuenParkBank';
  group.add(bank);
  const ring = LAI_YUEN_SITE.localRing;
  const store1 = store();
  const inner = [], outer = [];
  for (let i = 0; i < ring.length; i += 2) {
    inner.push([ring[i], ring[i + 1]]);
  }
  for (const [x, z] of inner) {
    const length = Math.hypot(x, z) || 1;
    outer.push([x + (x / length) * 13, z + (z / length) * 13]);
  }
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i], b = inner[(i + 1) % inner.length];
    const ao = outer[i], bo = outer[(i + 1) % inner.length];
    // Outer height comes from the terrain sampler itself, so the bank never floats or cuts into the hillside.
    const ha = terrainHeightAt(LAI_YUEN_SITE.x + ao[0], LAI_YUEN_SITE.z + ao[1]) - groundOffset;
    const hb = terrainHeightAt(LAI_YUEN_SITE.x + bo[0], LAI_YUEN_SITE.z + bo[1]) - groundOffset;
    quad(store1, [a[0], 0.02, a[1]], [b[0], 0.02, b[1]], [bo[0], hb, bo[1]], [ao[0], ha, ao[1]], [0.33, 0.45, 0.25]);
  }
  meshStore(bank, store1, materials.lawn, 'LaiYuenParkBanks', false);
  return bank;
}

export function buildLaiYuenDetail(group, materials, stats, { groundOffset = 0, terrainHeightAt } = {}) {
  const mats = makeDetailMaterials(materials);
  const tino = buildTino(group, materials, mats, stats);
  buildGardens(group, materials, mats, stats);
  const life = buildStreetLife(group, materials, mats, stats);
  const shows = buildShowground(group, materials, mats, stats);
  const railway = buildRailway(group, materials, mats, stats);
  buildPavingDetail(group, materials, stats);
  buildForecourt(group, materials, mats, stats);
  buildParkBank(group, materials, terrainHeightAt ?? hongKongTerrainHeight, groundOffset);
  const colliders = [...tino.colliders, ...life.colliders, ...shows.colliders, ...railway.colliders];
  stats.laiYuenDetailSources = LAI_YUEN_DETAIL_SOURCES.length;
  return { colliders };
}
