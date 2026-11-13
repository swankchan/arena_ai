import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  STATUE_SQUARE_SOUTH as south, STATUE_SQUARE_NORTH as north,
  SQUARE_WATER, SQUARE_SHELTERS, JACKSON_POSITION, CENOTAPH_RING, CENOTAPH_SOURCE
} from './statue-square-architecture.js';
import { pointInFlatRing, minimumAreaObb } from './landmark-site.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { hongKongTerrainHeight, rawHongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, beam, cylinder, sphere, merged, nightAmount } from './harbour-city-world-utils.js';

// 皇后像廣場與和平紀念碑（英軍陣亡紀念碑）精修工程
// Refined Statue Square & The Cenotaph (British War Memorial)
export function buildStatueSquare(scene) {
  const group = new THREE.Group();
  group.name = '皇后像廣場 Statue Square';
  scene.add(group);

  const ground = (x, z) => hongKongTerrainHeight(x, z);
  const road = (x, z, m = 0) => fullRoadSurfaceAt(x, z, m);
  const inside = (s, x, z) => pointInFlatRing(s.ring, x, z);
  const inAny = (rings, x, z) => rings.some((a) => pointInFlatRing(a.world, x, z));

  // --- Materials ---
  const mats = {
    paving: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ color: 0x579da6, roughness: 0.24, metalness: 0.14, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardMaterial({ color: 0x989991, roughness: 0.88 }),
    coping: new THREE.MeshStandardMaterial({ color: 0xc8c6b8, roughness: 0.80 }),
    cenotaphLimestone: new THREE.MeshStandardMaterial({ color: 0xd2cfc2, roughness: 0.82 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2e322f, roughness: 0.85 }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d6cc, roughness: 0.72, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: 0x687570, roughness: 0.38, metalness: 0.72 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x3d382b, metalness: 0.72, roughness: 0.45 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x2d522a, roughness: 0.94 }),
    poolblue: new THREE.MeshStandardMaterial({ color: 0x729fa7, roughness: 0.75 }),
    poppyRed: new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.42 }),
    flagUnion: new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.65 }),
    flagRed: new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.65 }),
    goldPlaque: new THREE.MeshStandardMaterial({ color: 0xb89047, metalness: 0.75, roughness: 0.35 }),
    mtrRed: new THREE.MeshStandardMaterial({ color: 0xba181b, roughness: 0.35 })
  };

  // WebGPU TSL Night-illuminated materials
  const warmLight = new THREE.MeshStandardNodeMaterial({ color: 0xffe2b2, roughness: 0.45 });
  warmLight.emissiveNode = color(0xffd598).mul(nightAmount()).mul(2.2);

  const waterGlow = new THREE.MeshStandardNodeMaterial({ color: 0x48cae4, roughness: 0.25 });
  waterGlow.emissiveNode = color(0x0077b6).mul(nightAmount()).mul(1.85);

  const mtrGlow = new THREE.MeshStandardNodeMaterial({ color: 0xe63946, roughness: 0.35 });
  mtrGlow.emissiveNode = color(0xd90429).mul(nightAmount()).mul(2.4);

  const colliders = [], treeSites = [], positions = [], colors = [];
  let cells = 0;

  // --- 1. Terrain-following Road-cleared Paving Grid ---
  for (const site of [south, north]) {
    const { minX, maxX, minZ, maxZ } = site.bounds, step = 1.6;
    for (let x = minX; x < maxX; x += step) {
      for (let z = minZ; z < maxZ; z += step) {
        const vertices = [[x, z], [x + step, z], [x + step, z + step], [x, z + step]];
        const samples = [...vertices, [x + step / 2, z + step / 2], [x + step / 2, z], [x + step, z + step / 2], [x + step / 2, z + step], [x, z + step / 2]];
        if (!samples.every(([a, b]) => inside(site, a, b) && !road(a, b, 0.4))) continue;
        const variation = ((Math.floor((x + 200) * 2) + Math.floor((z + 200) * 2)) % 5) * 0.009;
        for (const i of [0, 3, 1, 1, 3, 2]) {
          const [a, b] = vertices[i];
          positions.push(a, ground(a, b) + 0.14, b);
          colors.push(0.47 + variation, 0.46 + variation, 0.42 + variation);
        }
        cells++;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const uv = [];
  for (let i = 0; i < positions.length; i += 3) uv.push(positions[i] * 2, positions[i + 2] * 2);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));

  const pixels = new Uint8Array(16 * 16 * 4);
  for (let z = 0; z < 16; z++) {
    for (let x = 0; x < 16; x++) {
      const v = x === 0 || z === 0 ? 165 : 255, j = (z * 16 + x) * 4;
      pixels.set([v, v, v, 255], j);
    }
  }
  const tile = new THREE.DataTexture(pixels, 16, 16, THREE.RGBAFormat);
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.magFilter = THREE.LinearFilter;
  tile.minFilter = THREE.LinearMipmapLinearFilter;
  tile.generateMipmaps = true;
  tile.needsUpdate = true;
  mats.paving.map = tile;

  const normals = [];
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], z = positions[i + 2], e = 1.5;
    const nx = rawHongKongTerrainHeight(x - e, z) - rawHongKongTerrainHeight(x + e, z);
    const nz = rawHongKongTerrainHeight(x, z - e) - rawHongKongTerrainHeight(x, z + e);
    const inv = 1 / Math.hypot(nx, 2 * e, nz);
    normals.push(nx * inv, 2 * e * inv, nz * inv);
  }
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingSphere();

  const base = new THREE.Mesh(geo, mats.paving);
  base.name = 'Statue Square road-cleared terrain paving';
  base.receiveShadow = true;
  group.add(base);

  // Geometric collectors
  const copings = [], posts = [], roofTrim = [], benches = [], planters = [], foliage = [];
  const jets = [], poolLights = [], warmLamps = [], mtrSigns = [];
  const colliderAt = (x, z, w, d, y, h, ry = 0) => harbourCityLocalCollider({ x: 0, z: 0, ry: 0 }, x, z, w, d, y, y + h, ry);

  // --- 2. Mapped Reflecting Pools & Fountain Jets ---
  for (const feature of SQUARE_WATER) {
    const r = feature.world, pts = [];
    for (let i = 0; i < r.length - 2; i += 2) pts.push(new THREE.Vector2(r[i], r[i + 1]));
    const y = Math.max(...pts.map((p) => ground(p.x, p.y))) + 0.22;
    const shape = new THREE.Shape(pts);
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(Math.PI / 2);
    g.translate(0, y, 0);

    const mesh = new THREE.Mesh(g, mats.water);
    mesh.name = `Statue Square mapped pool ${feature.id}`;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Granite bullnose pool coping edging
    for (let i = 0; i < r.length - 2; i += 2) {
      const ax = r[i], az = r[i + 1], bx = r[i + 2], bz = r[i + 3];
      if (road((ax + bx) / 2, (az + bz) / 2, 0.2)) continue;
      beam(copings, [ax, y + 0.08, az], [bx, y + 0.08, bz], 0.28, 0.26);

      const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      if (len >= 0.2 && !road((ax + bx) / 2, (az + bz) / 2, 0.25)) {
        colliders.push(colliderAt((ax + bx) / 2, (az + bz) / 2, len, 0.32, y - 0.2, 0.65, Math.atan2(-dz, dx)));
      }
    }

    // Underwater submerged LED fountain lights
    const obb = minimumAreaObb(r);
    box(poolLights, [obb.x, y - 0.06, obb.z], [0.65, 0.08, 0.65]);
  }

  // --- 3. Alan Fitch Architectural Fountain Mosaic Relief Walls ---
  for (const [index, art] of [[0, 'dark'], [1, 'light']]) {
    const f = SQUARE_WATER[index], obb = minimumAreaObb(f.world);
    const x = obb.x, z = obb.z, y = ground(x, z) + 0.3, ry = obb.ry, w = Math.min(obb.w * 0.67, 12);

    const a = new THREE.Group();
    a.position.set(x, y, z);
    a.rotation.y = ry;
    group.add(a);

    const baseParts = [], details = [], colours = [];
    box(baseParts, [0, 1.15, 0], [w, 2.3, 0.23]);

    const count = Math.floor(w / 0.65);
    for (let j = 0; j < count; j++) {
      for (let row = 0; row < 4; row++) {
        const xx = -w / 2 + 0.32 + (j * (w - 0.64)) / Math.max(1, count - 1);
        const yy = 0.3 + row * 0.52;
        box(details, [xx, yy, 0.13], [0.08, 0.4, 0.06]);
        box(details, [xx, yy + 0.21, 0.13], [0.47, 0.055, 0.06]);
        if ((j + row) % 3 === 0) box(colours, [xx + 0.17, yy, 0.165], [0.2, 0.3, 0.04]);
      }
    }

    // Parabolic foaming fountain spray jets
    for (let j = -3; j <= 3; j++) {
      const px = (j * w) / 8;
      let prev = [px, 0.07, 1.1];
      for (let k = 1; k <= 12; k++) {
        const t = k / 12;
        const next = [px, 0.07 + 1.5 * 4 * t * (1 - t), 1.1 - 2.2 * t];
        beam(jets,
          [x + Math.cos(ry) * prev[0] + Math.sin(ry) * prev[2], y + prev[1], z - Math.sin(ry) * prev[0] + Math.cos(ry) * prev[2]],
          [x + Math.cos(ry) * next[0] + Math.sin(ry) * next[2], y + next[1], z - Math.sin(ry) * next[0] + Math.cos(ry) * next[2]],
          0.028, 0.028);
        prev = next;
      }
    }

    merged(a, baseParts, art === 'dark' ? mats.dark : mats.white, `Statue Square ${art} fountain artwork base`);
    merged(a, details, art === 'dark' ? mats.stone : mats.poolblue, `Statue Square ${art} fountain artwork relief`);
    merged(a, colours, art === 'dark' ? new THREE.MeshStandardMaterial({ color: 0x895b44, roughness: 0.8 }) : mats.coping, `Statue Square ${art} fountain artwork accents`);
  }

  // --- 4. Alan Fitch 1965 Folded Concrete Modernist Canopies ---
  const roofs = [];
  for (const feature of SQUARE_SHELTERS) {
    const r = feature.world, p = [];
    for (let i = 0; i < 8; i += 2) p.push({ x: r[i], z: r[i + 1] });
    let a = p[0], b = p[1], c = p[2], d = p[3];
    if (Math.hypot(b.x - a.x, b.z - a.z) < Math.hypot(d.x - a.x, d.z - a.z)) {
      [a, b, c, d] = [p[1], p[2], p[3], p[0]];
    }

    const y = Math.max(...p.map((q) => ground(q.x, q.z))) + 0.16, n = 4;
    const lerp = (v, w, t) => ({ x: v.x + (w.x - v.x) * t, z: v.z + (w.z - v.z) * t });
    const vp = [];

    for (let i = 0; i < n; i++) {
      const t = i / n, u = (i + 1) / n;
      const aa = lerp(a, d, t), bb = lerp(b, c, t), cc = lerp(a, d, u), dd = lerp(b, c, u);
      const h0 = y + 3.72 + (i % 2 ? 0.66 : 0), h1 = y + 3.72 + ((i + 1) % 2 ? 0.66 : 0);
      vp.push(aa.x, h0, aa.z, bb.x, h0, bb.z, cc.x, h1, cc.z, cc.x, h1, cc.z, bb.x, h0, bb.z, dd.x, h1, dd.z);
      beam(roofTrim, [aa.x, h0, aa.z], [bb.x, h0, bb.z], 0.12, 0.12);

      // Recessed warm ceiling night downlights under canopy folds
      const midX = (aa.x + bb.x + cc.x + dd.x) * 0.25;
      const midZ = (aa.z + bb.z + cc.z + dd.z) * 0.25;
      const midH = (h0 + h1) * 0.5 - 0.08;
      box(warmLamps, [midX, midH, midZ], [0.45, 0.06, 0.45]);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3));
    g.computeVertexNormals();

    const roof = new THREE.Mesh(g, mats.white);
    roof.name = `Statue Square folded canopy ${feature.id}`;
    roof.castShadow = true;
    group.add(roof);
    roofs.push(roof);

    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const nposts = Math.max(2, Math.ceil(len / 5));
    for (let i = 0; i <= nposts; i++) {
      for (const [u, v] of [[a, b], [d, c]]) {
        const q = lerp(u, v, i / nposts);
        if (road(q.x, q.z, 0.4)) continue;
        const py = ground(q.x, q.z) + 0.14;
        cylinder(posts, [q.x, (py + y + 3.72) / 2, q.z], 0.09, y + 3.72 - py, 10);
        colliders.push(colliderAt(q.x, q.z, 0.25, 0.25, py, 3.8));
      }
    }
  }

  // --- 5. Sir Thomas Jackson, Bart. Bronze Statue (昃臣爵士銅像) ---
  const [sx, sz] = JACKSON_POSITION, sy = ground(sx, sz) + 0.15;
  const statue = new THREE.Group();
  statue.name = 'Sir Thomas Jackson statue';
  statue.position.set(sx, sy, sz);
  statue.rotation.y = Math.PI / 2; // Facing east towards Court of Final Appeal
  group.add(statue);

  const plinth = [], body = [], skin = [], plaque = [], statueTrim = [];

  // Stepped polished granite pedestal with molded cornice and base
  box(plinth, [0, 0.18, 0], [2.6, 0.36, 2.3]);
  box(plinth, [0, 0.52, 0], [2.2, 0.32, 1.95]);
  box(plinth, [0, 1.15, 0], [1.9, 0.95, 1.7]);
  box(plinth, [0, 1.72, 0], [2.05, 0.18, 1.85]); // Molded capital cornice cap

  // Bronze dedication inscription plaque facing east
  box(plaque, [0, 1.12, 0.88], [1.42, 0.72, 0.04]);

  // Bronze figure likeness (Victorian gentleman's formal frock coat, waistcoat, cravat)
  box(body, [0, 2.47, 0], [0.58, 1.17, 0.36]);
  box(body, [0, 3.08, 0], [0.72, 0.77, 0.38]);
  box(body, [-0.22, 2.49, -0.12], [0.18, 1.06, 0.16]);
  box(body, [0.22, 2.49, -0.12], [0.18, 1.06, 0.16]);

  for (const xx of [-0.18, 0.18]) {
    beam(body, [xx, 1.68, 0], [xx, 2.26, 0], 0.22, 0.22);
    box(body, [xx, 1.71, 0.09], [0.23, 0.16, 0.38]);
  }

  beam(body, [-0.4, 3.32, 0], [-0.43, 2.57, 0.03], 0.18, 0.19);
  beam(body, [0.39, 3.31, 0], [0.55, 2.95, 0.06], 0.18, 0.19);
  beam(body, [0.55, 2.95, 0.06], [0.22, 3.03, 0.19], 0.16, 0.16);

  sphere(skin, [0.2, 3.03, 0.2], 0.09, 10);
  sphere(skin, [0, 3.63, 0.015], 0.21, 12);
  box(body, [0, 3.37, 0], [0.18, 0.17, 0.17]);
  box(body, [0, 3.03, 0.22], [0.045, 0.42, 0.035]);

  // Four corner protective bronze bollards with plinth uplight
  for (const bx of [-1.15, 1.15]) {
    for (const bz of [-1.0, 1.0]) {
      cylinder(statueTrim, [bx, 0.45, bz], 0.08, 0.9, 8);
      sphere(statueTrim, [bx, 0.94, bz], 0.11, 8);
    }
  }
  box(warmLamps, [0, 0.15, 1.25], [0.35, 0.08, 0.35]); // Statue ground uplight

  merged(statue, plinth, mats.stone, 'Jackson stone plinth');
  merged(statue, plaque, mats.bronze, 'Jackson dark plaque');
  merged(statue, body, mats.bronze, 'Jackson bronze coat and limbs');
  merged(statue, skin, mats.bronze, 'Jackson bronze head and hand');
  merged(statue, statueTrim, mats.bronze, 'Jackson pedestal corner bollards');
  colliders.push(colliderAt(sx, sz, 2.6, 2.3, sy, 4.2));

  // --- 6. The Cenotaph (和平紀念碑 / 英軍陣亡紀念碑) ---
  const obb = minimumAreaObb(CENOTAPH_RING);
  const cy = ground(obb.x, obb.z) + 0.14;
  const cen = new THREE.Group();
  cen.name = '和平紀念碑 The Cenotaph';
  cen.position.set(obb.x, cy, obb.z);
  cen.rotation.y = obb.ry;
  group.add(cen);

  const blocks = [], seams = [], poles = [], wreaths = [], flags = [], poppies = [];

  // A. Three-tier Stepped Granite Ceremonial Dais / Podium Base
  box(blocks, [0, 0.12, 0], [obb.w + 2.2, 0.24, obb.d + 2.2]);
  box(blocks, [0, 0.32, 0], [obb.w + 1.4, 0.20, obb.d + 1.4]);
  box(blocks, [0, 0.52, 0], [obb.w + 0.6, 0.20, obb.d + 0.6]);

  // B. Main Lutyens Pylon (Classical Setbacks Reaching 10.66m)
  box(blocks, [0, 0.85, 0], [obb.w, 0.46, obb.d]);
  box(blocks, [0, 1.35, 0], [obb.w * 0.9, 0.54, obb.d * 0.9]);
  box(blocks, [0, 4.15, 0], [obb.w * 0.78, 5.06, obb.d * 0.78]); // Main shaft
  box(blocks, [0, 7.15, 0], [obb.w * 0.70, 0.94, obb.d * 0.70]); // Upper shaft setback
  box(blocks, [0, 8.15, 0], [obb.w * 0.62, 1.06, obb.d * 0.62]); // Upper entablature
  box(blocks, [0, 9.15, 0], [obb.w * 0.56, 0.94, obb.d * 0.56]); // Frieze
  box(blocks, [0, 9.75, 0], [obb.w * 0.64, 0.26, obb.d * 0.64]); // Projecting molded cornice
  box(blocks, [0, 10.08, 0], [obb.w * 0.48, 0.40, obb.d * 0.48]); // Catafalque tomb chest
  box(blocks, [0, 10.45, 0], [obb.w * 0.38, 0.34, obb.d * 0.38]); // Stepped stone lid (top at 10.66m)

  // Subtle horizontal limestone ashlar courses / seams
  for (let y = 1.6; y < 8.2; y += 0.56) {
    for (const sign of [-1, 1]) {
      box(seams, [0, y, sign * obb.d * 0.381], [obb.w * 0.78, 0.018, 0.015]);
      box(seams, [sign * obb.w * 0.381, y, 0], [0.015, 0.018, obb.d * 0.78]);
    }
  }

  // C. Inscription Plaques:
  // North & South: "THE GLORIOUS DEAD" / "1914-1918 / 1939-1945"
  for (const sign of [-1, 1]) {
    box(seams, [0, 6.2, sign * (obb.d * 0.385)], [obb.w * 0.55, 0.45, 0.02]);
  }
  // East & West:「英靈不滅 浩氣長存」
  for (const sign of [-1, 1]) {
    box(seams, [sign * (obb.w * 0.385), 6.2, 0], [0.02, 0.45, obb.d * 0.55]);
  }

  // D. Four Sculpted Stone Laurel Wreaths (North, South, East, West)
  for (const sign of [-1, 1]) {
    // East/West wreaths
    const wreathEW = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.09, 8, 24), mats.coping);
    wreathEW.name = sign > 0 ? 'Cenotaph stone laurel wreath East' : 'Cenotaph stone laurel wreath West';
    wreathEW.position.set(sign * (obb.w * 0.35), 7.25, 0);
    wreathEW.rotation.y = Math.PI / 2;
    cen.add(wreathEW);

    // North/South wreaths
    const wreathNS = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.09, 8, 24), mats.coping);
    wreathNS.name = sign > 0 ? 'Cenotaph stone laurel wreath South' : 'Cenotaph stone laurel wreath North';
    wreathNS.position.set(0, 7.25, sign * (obb.d * 0.35));
    cen.add(wreathNS);
  }

  // E. Six Ceremonial Bronze Flagstaffs & Flying Standards
  for (const sign of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const px = i * 0.68, pz = sign * (obb.d * 0.42);
      // Bronze flagpole
      beam(poles, [px, 0.8, pz], [px, 6.8, pz], 0.045, 0.045);
      sphere(poles, [px, 6.88, pz], 0.075, 8); // Gold finial

      // Ceremonial heraldic flags hanging from masts
      const flagMat = (i === 0) ? mats.flagUnion : mats.flagRed;
      box(flags, [px + 0.38, 5.8, pz], [0.72, 1.4, 0.04]);
    }
  }

  // F. Scarlet Remembrance Day Poppy Floral Tributes at the Foot of Monument
  for (let p = -1.2; p <= 1.2; p += 0.6) {
    cylinder(poppies, [p, 0.72, obb.d * 0.52], 0.22, 0.12, 12);
  }

  // G. Solemn Night Monument Floodlights (4 Ground Uplights)
  for (const sx of [-obb.w * 0.65, obb.w * 0.65]) {
    for (const sz of [-obb.d * 0.65, obb.d * 0.65]) {
      box(warmLamps, [sx, 0.18, sz], [0.32, 0.08, 0.32]);
    }
  }

  merged(cen, blocks, mats.cenotaphLimestone, 'Cenotaph limestone stepped monument');
  merged(cen, seams, mats.dark, 'Cenotaph stone courses');
  merged(cen, poles, mats.metal, 'Cenotaph ceremonial flagpoles');
  merged(cen, flags, mats.flagUnion, 'Cenotaph ceremonial standard flags');
  merged(cen, poppies, mats.poppyRed, 'Cenotaph remembrance poppy tribute wreaths');
  colliders.push(colliderAt(obb.x, obb.z, obb.w + 2.2, obb.d + 2.2, cy, 10.7, obb.ry));

  // --- 7. Raised Planters, Royal Palms & Tree Sites ---
  for (const site of [south, north]) {
    for (let x = site.bounds.minX + 4; x < site.bounds.maxX - 4; x += 7) {
      for (let z = site.bounds.minZ + 4; z < site.bounds.maxZ - 4; z += 7) {
        const xx = x + Math.sin(z) * 0.7, zz = z + Math.cos(x) * 0.7;
        if (!inside(site, xx, zz) || road(xx, zz, 3) || inAny(SQUARE_WATER, xx, zz) || inAny(SQUARE_SHELTERS, xx, zz) || Math.hypot(xx - sx, zz - sz) < 5) continue;

        let nearEdge = false;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          if (!inside(site, xx + Math.cos(a) * 6, zz + Math.sin(a) * 6)) nearEdge = true;
        }
        if (!nearEdge) continue;

        if (![[-1.6, -1.6], [-1.6, 1.6], [1.6, -1.6], [1.6, 1.6]].every(([dx, dz]) => inside(site, xx + dx, zz + dz) && !road(xx + dx, zz + dz, 0.5) && !inAny(SQUARE_WATER, xx + dx, zz + dz) && !inAny(SQUARE_SHELTERS, xx + dx, zz + dz))) continue;

        const y = ground(xx, zz) + 0.14;
        box(planters, [xx, y + 0.12, zz], [3.2, 0.24, 3.2]);
        box(foliage, [xx, y + 0.29, zz], [2.85, 0.16, 2.85]);

        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2;
          sphere(foliage, [xx + Math.cos(a) * 1.1, y + 0.47, zz + Math.sin(a) * 1.1], 0.35, 8);
        }

        treeSites.push({
          x: xx, z: zz, y: y + 0.35,
          scale: 0.65 + 0.15 * Math.abs(Math.sin(xx + zz)),
          species: Math.abs(Math.round(xx + zz)) % 4,
          tier: 1
        });
      }
    }
  }

  // --- 8. Classical Cast-Iron Park Lamp Posts & Benches ---
  let lampCount = 0;
  for (const [x, z] of [
    [-2, 82], [-6, 100], [4, 111], [55, 91], [55, 70], [23, 22], [60, 19],
    [-8, 92], [12, 105], [48, 80], [32, 25], [52, 28]
  ]) {
    if (![south, north].some((s) => inside(s, x, z)) || road(x, z, 2) || inAny(SQUARE_WATER, x, z) || inAny(SQUARE_SHELTERS, x, z)) continue;

    const y = ground(x, z) + 0.14;

    // Solid teak wood park bench with dark green cast iron frame
    box(benches, [x, y + 0.48, z], [1.8, 0.12, 0.55]);
    box(benches, [x, y + 0.82, z + 0.24], [1.8, 0.57, 0.09]);
    for (const dx of [-0.7, 0.7]) box(posts, [x + dx, y + 0.23, z], [0.09, 0.46, 0.45]);
    colliders.push(colliderAt(x, z, 1.8, 0.55, y, 1));

    // Classical cast-iron lamp post
    if (lampCount < 8) {
      const lx = x + 1.8, lz = z - 0.4;
      if (!road(lx, lz, 1.2)) {
        cylinder(posts, [lx, y + 1.8, lz], 0.08, 3.6, 8);
        sphere(warmLamps, [lx, y + 3.75, lz], 0.22, 8);
        colliders.push(colliderAt(lx, lz, 0.25, 0.25, y, 3.8));
        lampCount++;
      }
    }
  }

  // --- 9. MTR Central Station Entrance K/L Portals ---
  for (const [mx, mz, facing] of [[-2.0, 64.0, 0], [24.0, 22.0, Math.PI * 0.5]]) {
    if ((inside(south, mx, mz) || inside(north, mx, mz)) && !road(mx, mz, 1.2)) {
      const my = ground(mx, mz) + 0.14;
      // Portal granite parapet and railings
      box(planters, [mx, my + 0.45, mz], [4.5, 0.9, 2.4], facing);
      // MTR red logo totem
      cylinder(mtrSigns, [mx - 1.8, my + 1.8, mz], 0.12, 3.6, 8);
      box(mtrSigns, [mx - 1.8, my + 3.4, mz], [0.45, 0.45, 0.45]);
      colliders.push(colliderAt(mx, mz, 4.8, 2.8, my, 2.2, facing));
    }
  }

  // --- Merge All Geometries ---
  merged(group, roofTrim, mats.white, 'Statue Square folded canopy edges');
  merged(group, jets, new THREE.MeshStandardMaterial({ color: 0xc7ded7, transparent: true, opacity: 0.72, roughness: 0.26 }), 'Statue Square fountain jets');
  merged(group, planters, mats.stone, 'Statue Square raised planting beds');
  merged(group, foliage, mats.hedge, 'Statue Square low planting');
  merged(group, copings, mats.coping, 'Statue Square pool edging');
  merged(group, posts, mats.metal, 'Statue Square canopy columns and trim');
  merged(group, benches, new THREE.MeshStandardMaterial({ color: 0x755d4b, roughness: 0.9 }), 'Statue Square timber seating');
  merged(group, poolLights, waterGlow, 'Statue Square underwater fountain night lights', false);
  merged(group, warmLamps, warmLight, 'Statue Square and Cenotaph warm night illumination', false);
  merged(group, mtrSigns, mtrGlow, 'Statue Square MTR entrance portal totems', false);

  const landmarks = [
    {
      name: '皇后像廣場',
      englishName: 'Statue Square',
      x: south.x,
      z: south.z,
      w: south.w,
      d: south.d,
      h: 8,
      ring: south.ring,
      bounds: south.bounds,
      osmId: 6970394,
      kind: 'majorPark',
      labelHeight: false
    },
    {
      name: '和平紀念碑（英軍陣亡紀念碑）',
      englishName: 'The Cenotaph',
      x: obb.x,
      z: obb.z,
      w: obb.w,
      d: obb.d,
      h: 10.66,
      osmId: 737551130,
      kind: 'monument',
      labelHeight: true
    }
  ];

  return {
    group,
    colliders,
    treeSites,
    landmarks,
    stats: {
      statueSquareGroundCells: cells,
      statueSquarePools: SQUARE_WATER.length,
      statueSquareCanopies: roofs.length,
      statueSquareTrees: treeSites.length,
      statueSquareCenotaph: 1,
      statueSquareCenotaphWreaths: 4,
      statueSquareCenotaphFlagstaffs: 6,
      statueSquareJackson: 1,
      statueSquareLamps: lampCount,
      statueSquareColliders: colliders.length
    }
  };
}
