// 舊中國銀行大廈（Bank of China Building, 2A Des Voeux Road Central, 1951）3D 建築模型
// 忠實重現巴馬丹拿（Palmer & Turner）與陸謙受設計之香港一級歷史建築：
// 包含花崗岩砌體基座、雄偉北面三聯式大門廊、旋轉門與古典銅飾、一對守門石獅（雄獅踏球、雌獅撫幼）、
// 豎向條窗與裝飾藝術石壁柱、中國會（China Club）觀景露台與中式石欄杆、以及標誌性中式綠琉璃歇山頂、飛檐起翹與金屬寶頂。
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  OLD_BANK_OF_CHINA_SITE,
  OLD_BANK_OF_CHINA_OSM_SOURCE,
  OLD_BOC_HEIGHT,
  OLD_BOC_ROOF_TOP,
  OLD_BOC_STOREYS,
  OLD_BOC_BASE_Y,
  OLD_BOC_FOUNDATION_Y,
  OLD_BOC_PODIUM_BOUNDS,
  OLD_BOC_TOWER_BOUNDS,
  OLD_BOC_ATTIC_LOWER_BOUNDS,
  OLD_BOC_ATTIC_UPPER_BOUNDS,
  OLD_BOC_ROOF_BOUNDS,
  OLD_BOC_HERITAGE,
  OLD_BOC_LIONS,
  OLD_BOC_CHINA_CLUB,
  oldBankOfChinaGroundHeightAt
} from './old-bank-of-china-site.js';

function nightAmount() {
  return smoothstep(0.55, 1.45, cityUniforms.uInteriorGlow);
}

// 幾何輔助函數
function safeMerged(group, parts, material, name, shadows = true) {
  if (!parts || !parts.length) return null;
  const normalized = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part;
    if (!g.getAttribute('uv')) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    }
    return g;
  });
  const geo = mergeGeometries(normalized, false);
  for (let i = 0; i < parts.length; i++) {
    if (normalized[i] !== parts[i]) normalized[i].dispose();
    parts[i].dispose();
  }
  if (!geo) throw new Error(`Old Bank of China could not merge ${name}`);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function box(parts, center, size, ry = 0) {
  const g = new THREE.BoxGeometry(...size);
  if (ry) g.rotateY(ry);
  g.translate(...center);
  parts.push(g);
  return g;
}

function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius) {
  const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments);
  g.translate(...center);
  parts.push(g);
  return g;
}

function sphere(parts, center, radius, segments = 12) {
  const g = new THREE.SphereGeometry(radius, segments, Math.max(6, segments >> 1));
  g.translate(...center);
  parts.push(g);
  return g;
}

function beam(parts, a, b, width = 0.1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start), length = direction.length();
  if (length < 0.001) return;
  const g = new THREE.BoxGeometry(width, length, depth);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(0.5).toArray());
  parts.push(g);
  return g;
}

export function buildOldBankOfChinaBuilding(scene) {
  const root = new THREE.Group();
  root.name = '舊中國銀行大廈 Bank of China Building (2A Des Voeux Road Central)';
  scene.add(root);

  // --- 1. 材質調色盤（高質感花崗岩、深古銅金屬、中式翡翠綠琉璃瓦與夜間立面投光）---
  const granitePodiumMat = new THREE.MeshStandardMaterial({
    color: 0x8a8780,
    roughness: 0.88,
    metalness: 0.05
  });

  const graniteShaftMat = new THREE.MeshStandardMaterial({
    color: 0x9c9992,
    roughness: 0.84,
    metalness: 0.04
  });

  const graniteTrimMat = new THREE.MeshStandardMaterial({
    color: 0x76736d,
    roughness: 0.90,
    metalness: 0.06
  });

  const granitePavingMat = new THREE.MeshStandardMaterial({
    color: 0x929088,
    roughness: 0.92,
    side: THREE.DoubleSide
  });

  const carvedLionMat = new THREE.MeshStandardMaterial({
    color: 0xb5b2aa,
    roughness: 0.78,
    metalness: 0.08
  });

  const bronzeMetalMat = new THREE.MeshStandardMaterial({
    color: 0x362f27,
    roughness: 0.40,
    metalness: 0.78
  });

  const goldLettersMat = new THREE.MeshStandardMaterial({
    color: 0xc9a04a,
    roughness: 0.30,
    metalness: 0.88
  });

  const glazedGreenTileMat = new THREE.MeshStandardNodeMaterial({
    color: 0x184a37,
    roughness: 0.35,
    metalness: 0.28,
    side: THREE.DoubleSide
  });
  glazedGreenTileMat.emissiveNode = color(0x28634e).mul(nightAmount()).mul(0.18);

  const roofRidgeBeastMat = new THREE.MeshStandardMaterial({
    color: 0x24553f,
    roughness: 0.45,
    metalness: 0.35
  });

  const spireGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd6b042,
    roughness: 0.25,
    metalness: 0.92
  });

  const chineseRedMat = new THREE.MeshStandardMaterial({
    color: 0x801e18,
    roughness: 0.62,
    metalness: 0.10
  });

  const windowGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x141f24,
    roughness: 0.20,
    metalness: 0.38,
    side: THREE.DoubleSide
  });

  const windowGlassLitMat = new THREE.MeshStandardNodeMaterial({
    color: 0x483e30,
    roughness: 0.30,
    metalness: 0.12,
    side: THREE.DoubleSide
  });
  windowGlassLitMat.emissiveNode = color(0xffd594).mul(nightAmount()).mul(0.42);

  const chinaClubGlassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x544028,
    roughness: 0.26,
    metalness: 0.10,
    side: THREE.DoubleSide
  });
  chinaClubGlassMat.emissiveNode = color(0xffc870).mul(nightAmount()).mul(0.68);

  const portalWarmGlowMat = new THREE.MeshStandardNodeMaterial({
    color: 0x5e482b,
    roughness: 0.35,
    metalness: 0.2
  });
  portalWarmGlowMat.emissiveNode = color(0xffdca0).mul(nightAmount()).mul(0.85);

  const floodLightMat = new THREE.MeshStandardNodeMaterial({
    color: 0xffe6b8,
    roughness: 0.4
  });
  floodLightMat.emissiveNode = color(0xffdfa0).mul(nightAmount()).mul(2.2);

  // 零件緩存容器
  const parts = {
    granitePodium: [],
    graniteShaft: [],
    graniteTrim: [],
    granitePaving: [],
    carvedLions: [],
    bronzeMetal: [],
    goldLetters: [],
    glazedGreenTiles: [],
    roofRidgeBeasts: [],
    spireGold: [],
    chineseRed: [],
    windowGlass: [],
    windowGlassLit: [],
    chinaClubGlass: [],
    portalWarmGlow: [],
    floodLights: []
  };

  const P = OLD_BOC_PODIUM_BOUNDS;
  const T = OLD_BOC_TOWER_BOUNDS;
  const A1 = OLD_BOC_ATTIC_LOWER_BOUNDS;
  const A2 = OLD_BOC_ATTIC_UPPER_BOUNDS;
  const R = OLD_BOC_ROOF_BOUNDS;

  // --- 2. 地下基礎牆體與基座地台（Foundation Skirt & Plinth Pavement）---
  // 基礎牆由 y = 5.0m 向上擠出至 y = 8.4m，徹底封閉斜坡地形高差，消除任何地底露空
  box(
    parts.graniteTrim,
    [P.centerX, (OLD_BOC_FOUNDATION_Y + OLD_BOC_BASE_Y) * 0.5, P.centerZ],
    [P.width + 0.4, OLD_BOC_BASE_Y - OLD_BOC_FOUNDATION_Y, P.depth + 0.4]
  );

  // 周邊石材鋪面圍護
  box(
    parts.granitePaving,
    [P.centerX, OLD_BOC_BASE_Y + 0.05, P.centerZ],
    [P.width + 1.2, 0.1, P.depth + 1.2]
  );

  // --- 3. 花崗岩基座部（Podium, Floors G–3, y: 8.4m ~ 22.4m, 高度 14m）---
  const podiumH = P.topY - P.baseY;
  const podiumMidY = (P.baseY + P.topY) * 0.5;

  // 基座花崗岩主牆體
  box(
    parts.granitePodium,
    [P.centerX, podiumMidY, P.centerZ],
    [P.width, podiumH, P.depth]
  );

  // 基座立面橫向線腳分格（Art Deco 橫向深溝槽線條）
  for (let y = P.baseY + 1.2; y < P.topY - 0.5; y += 1.2) {
    box(parts.graniteTrim, [P.centerX, y, P.minZ - 0.04], [P.width + 0.1, 0.1, 0.1]);
    box(parts.graniteTrim, [P.centerX, y, P.maxZ + 0.04], [P.width + 0.1, 0.1, 0.1]);
    box(parts.graniteTrim, [P.minX - 0.04, y, P.centerZ], [0.1, 0.1, P.depth + 0.1]);
    box(parts.graniteTrim, [P.maxX + 0.04, y, P.centerZ], [0.1, 0.1, P.depth + 0.1]);
  }

  // 基座頂部外凸檐口線腳（Podium Entablature & Cornice at y = 22.4m）
  box(parts.graniteTrim, [P.centerX, P.topY - 0.35, P.centerZ], [P.width + 0.7, 0.7, P.depth + 0.7]);
  box(parts.graniteTrim, [P.centerX, P.topY - 0.05, P.centerZ], [P.width + 0.9, 0.2, P.depth + 0.9]);

  // --- 4. 德輔道中北面大門（Monumental Triple-Bay North Entrance Portal）---
  // 寬 10.0m，高 7.6m，進深 1.5m 之雄偉石雕門廊壁龕
  const portalW = 10.0, portalH = 7.6, portalD = 1.5;
  const portalMidY = P.baseY + portalH * 0.5;
  const portalZ = P.minZ;

  // 門廊拱套花崗岩巨柱（巨型石壁柱）
  box(parts.graniteTrim, [P.centerX - portalW * 0.5 - 0.5, portalMidY, portalZ - 0.1], [1.0, portalH + 0.4, 0.5]);
  box(parts.graniteTrim, [P.centerX + portalW * 0.5 + 0.5, portalMidY, portalZ - 0.1], [1.0, portalH + 0.4, 0.5]);
  // 門頭巨型花崗岩梁枋與檐壁
  box(parts.graniteTrim, [P.centerX, P.baseY + portalH + 0.35, portalZ - 0.1], [portalW + 2.0, 0.8, 0.6]);

  // 門廊內部壁龕頂棚與溫暖夜間投光
  box(parts.portalWarmGlow, [P.centerX, P.baseY + portalH - 0.1, portalZ + portalD * 0.4], [portalW - 0.4, 0.2, portalD]);

  // 中央古典銅質旋轉門（Revolving Door Drum）
  cylinder(parts.bronzeMetal, [P.centerX, P.baseY + 1.8, portalZ + 0.6], 1.35, 3.4, 20);
  cylinder(parts.windowGlassMat ? parts.portalWarmGlow : parts.windowGlass, [P.centerX, P.baseY + 1.8, portalZ + 0.6], 1.30, 2.6, 20);
  // 旋轉門銅質隔翼十字轉軸
  box(parts.bronzeMetal, [P.centerX, P.baseY + 1.8, portalZ + 0.6], [2.5, 2.6, 0.08]);
  box(parts.bronzeMetal, [P.centerX, P.baseY + 1.8, portalZ + 0.6], [0.08, 2.6, 2.5]);

  // 兩側經典銅質雙開進出大門（Flanking Bronze Entrance Swing Doors）
  const sideDoorW = 2.0, sideDoorH = 3.2;
  for (const dx of [-3.2, 3.2]) {
    const doorX = P.centerX + dx;
    // 銅質門框
    box(parts.bronzeMetal, [doorX, P.baseY + sideDoorH * 0.5, portalZ + 0.6], [sideDoorW + 0.16, sideDoorH + 0.16, 0.12]);
    // 門扇玻璃與銅線腳
    box(parts.windowGlassLit, [doorX, P.baseY + sideDoorH * 0.5, portalZ + 0.6], [sideDoorW, sideDoorH, 0.08]);
    // 銅質橫挺、踢腳板與長拉手
    box(parts.bronzeMetal, [doorX, P.baseY + 0.4, portalZ + 0.55], [sideDoorW, 0.7, 0.1]);
    box(parts.bronzeMetal, [doorX - 0.3, P.baseY + 1.6, portalZ + 0.5], [0.06, 0.9, 0.06]);
    box(parts.bronzeMetal, [doorX + 0.3, P.baseY + 1.6, portalZ + 0.5], [0.06, 0.9, 0.06]);
  }

  // 門額 Art Deco 銅質幾何花格亮窗（Decorative Bronze Transom Grille）
  box(parts.bronzeMetal, [P.centerX, P.baseY + 5.0, portalZ + 0.6], [portalW - 0.6, 2.4, 0.1]);
  box(parts.portalWarmGlow, [P.centerX, P.baseY + 5.0, portalZ + 0.65], [portalW - 1.0, 2.2, 0.06]);

  // 門楣古典「中國銀行」與 "BANK OF CHINA" 燙金字匾額
  // 銘牌底座
  box(parts.bronzeMetal, [P.centerX, P.baseY + portalH + 0.35, portalZ - 0.42], [5.6, 0.65, 0.08]);
  // 「中國銀行」浮雕金字塊（4 個字方塊幾何組合）
  for (let i = 0; i < 4; i++) {
    const kx = P.centerX - 1.5 + i * 1.0;
    box(parts.goldLetters, [kx, P.baseY + portalH + 0.45, portalZ - 0.48], [0.45, 0.35, 0.06]);
  }
  // "BANK OF CHINA" 英文銅銘牌長條
  box(parts.goldLetters, [P.centerX, P.baseY + portalH + 0.18, portalZ - 0.48], [4.2, 0.14, 0.06]);

  // 門廊兩側古典銅製六角照壁燈（Art Deco Bronze Lantern Sconces）
  for (const dx of [-portalW * 0.5 - 0.3, portalW * 0.5 + 0.3]) {
    const lx = P.centerX + dx;
    box(parts.bronzeMetal, [lx, P.baseY + 3.6, portalZ - 0.3], [0.2, 0.3, 0.4]);
    cylinder(parts.bronzeMetal, [lx, P.baseY + 3.8, portalZ - 0.5], 0.22, 0.7, 6);
    sphere(parts.floodLights, [lx, P.baseY + 3.8, portalZ - 0.5], 0.16, 8);
  }

  // --- 5. 北面宏偉階梯與石獅子（Grand Flight of Stairs & Chinese Guardian Lions）---
  // 8 級寬大花崗岩石階，由 y = 8.4m 緩步降至德輔道中路面 y = 7.2m
  const stairSteps = 8;
  const stairTopZ = P.minZ;
  const stairBotZ = 167.5;
  const stairW = 11.6;
  for (let s = 0; s < stairSteps; s++) {
    const t = s / stairSteps;
    const stepZ = stairTopZ - t * (stairTopZ - stairBotZ);
    const stepY = P.baseY - (s + 1) * ((P.baseY - 7.2) / stairSteps);
    const stepDepth = (stairTopZ - stairBotZ) / stairSteps + 0.05;
    box(parts.graniteTrim, [P.centerX, stepY + 0.08, stepZ - stepDepth * 0.5], [stairW, 0.18, stepDepth]);
  }

  // 石階兩側護牆（Cheek Wall / Parapets）
  box(parts.graniteTrim, [P.centerX - stairW * 0.5 - 0.35, 7.8, (stairTopZ + stairBotZ) * 0.5], [0.7, 1.2, stairTopZ - stairBotZ]);
  box(parts.graniteTrim, [P.centerX + stairW * 0.5 + 0.35, 7.8, (stairTopZ + stairBotZ) * 0.5], [0.7, 1.2, stairTopZ - stairBotZ]);

  // 【一對守門石獅】（Guardian Stone Lions: 雄獅踏球、雌獅撫幼）
  // 嚴謹還原中環舊中銀大廈大門兩側著名石獅：
  // 東側為雄獅（踏繡球），西側為雌獅（護幼獅），端坐於雕花須彌座上
  const lionsData = [
    { gender: 'east', x: 55.2, z: 168.5, baseY: 7.2, ballOrCub: 'ball' },
    { gender: 'west', x: 42.8, z: 168.5, baseY: 7.2, ballOrCub: 'cub' }
  ];

  for (const lion of lionsData) {
    const lx = lion.x, lz = lion.z, ly = lion.baseY;

    // 1. 三層雕花須彌座（Tiered Xumizuo Granite Pedestal）
    // 下層基座（圭角與下枋）
    box(parts.carvedLions, [lx, ly + 0.15, lz], [1.4, 0.3, 1.9]);
    // 中層束腰（雕花面版）
    box(parts.carvedLions, [lx, ly + 0.45, lz], [1.16, 0.3, 1.66]);
    // 上層仰覆蓮花座（蓮瓣座）
    box(parts.carvedLions, [lx, ly + 0.75, lz], [1.32, 0.3, 1.82]);
    // 頂層座面托板
    box(parts.carvedLions, [lx, ly + 0.95, lz], [1.38, 0.1, 1.88]);

    // 2. 坐姿獅身（Seated Lion Body）
    const lionY = ly + 1.0;
    // 獅子下盤與後腿盤坐
    box(parts.carvedLions, [lx, lionY + 0.28, lz + 0.18], [0.88, 0.55, 0.98]);
    cylinder(parts.carvedLions, [lx - 0.32, lionY + 0.25, lz + 0.22], 0.24, 0.5, 12);
    cylinder(parts.carvedLions, [lx + 0.32, lionY + 0.25, lz + 0.22], 0.24, 0.5, 12);
    // 獅子強壯前胸與挺拔軀幹（前胸微傾傲立）
    box(parts.carvedLions, [lx, lionY + 0.62, lz - 0.05], [0.78, 0.65, 0.72]);

    // 3. 雙前肢（Front Paws）
    // 左前腿、右前腿
    cylinder(parts.carvedLions, [lx - 0.28, lionY + 0.38, lz - 0.42], 0.13, 0.75, 12);
    cylinder(parts.carvedLions, [lx + 0.28, lionY + 0.38, lz - 0.42], 0.13, 0.75, 12);

    // 4. 東側雄獅踏繡球 / 西側雌獅撫幼獅
    if (lion.ballOrCub === 'ball') {
      // 雄獅右爪踏繡球（Embroidered Ball under right paw）
      sphere(parts.carvedLions, [lx + 0.28, lionY + 0.22, lz - 0.48], 0.22, 14);
      // 繡球環形浮雕帶
      cylinder(parts.carvedLions, [lx + 0.28, lionY + 0.22, lz - 0.48], 0.23, 0.08, 12);
      // 右爪按在球頂
      box(parts.carvedLions, [lx + 0.28, lionY + 0.44, lz - 0.48], [0.22, 0.12, 0.22]);
      // 左爪著地
      box(parts.carvedLions, [lx - 0.28, lionY + 0.06, lz - 0.48], [0.24, 0.12, 0.26]);
    } else {
      // 雌獅左爪撫幼獅（Playful Lion Cub under left paw）
      box(parts.carvedLions, [lx - 0.28, lionY + 0.16, lz - 0.48], [0.24, 0.22, 0.26]);
      sphere(parts.carvedLions, [lx - 0.28, lionY + 0.25, lz - 0.48], 0.14, 10);
      // 左爪輕按幼獅頂
      box(parts.carvedLions, [lx - 0.28, lionY + 0.38, lz - 0.48], [0.22, 0.12, 0.22]);
      // 右爪著地
      box(parts.carvedLions, [lx + 0.28, lionY + 0.06, lz - 0.48], [0.24, 0.12, 0.26]);
    }

    // 5. 卷曲鬃毛（Curled Mane Curls around neck）
    cylinder(parts.carvedLions, [lx, lionY + 0.85, lz], 0.42, 0.38, 16);
    for (let c = 0; c < 8; c++) {
      const angle = (c / 8) * Math.PI * 2;
      sphere(parts.carvedLions, [lx + Math.sin(angle) * 0.38, lionY + 0.88, lz + Math.cos(angle) * 0.38], 0.14, 8);
    }

    // 6. 威嚴獅頭（Head, Roaring Mouth, Muzzle & Ears）
    const headY = lionY + 1.15;
    box(parts.carvedLions, [lx, headY, lz - 0.12], [0.68, 0.58, 0.62]);
    // 咧嘴怒吼（張口、利齒與舌頭）
    box(parts.carvedLions, [lx, headY - 0.12, lz - 0.44], [0.46, 0.22, 0.24]);
    box(parts.bronzeMetal, [lx, headY - 0.12, lz - 0.46], [0.38, 0.14, 0.16]); // 口腔深處陰影
    // 鼻額部與雙目隆起
    box(parts.carvedLions, [lx, headY + 0.08, lz - 0.42], [0.48, 0.24, 0.22]);
    sphere(parts.carvedLions, [lx - 0.18, headY + 0.08, lz - 0.44], 0.08, 8);
    sphere(parts.carvedLions, [lx + 0.18, headY + 0.08, lz - 0.44], 0.08, 8);
    // 雙耳
    cylinder(parts.carvedLions, [lx - 0.28, headY + 0.32, lz - 0.05], 0.08, 0.18, 8);
    cylinder(parts.carvedLions, [lx + 0.28, headY + 0.32, lz - 0.05], 0.08, 0.18, 8);
    // 獅尾上捲至腰背
    cylinder(parts.carvedLions, [lx, lionY + 0.55, lz + 0.48], 0.08, 0.55, 8);
    sphere(parts.carvedLions, [lx, lionY + 0.82, lz + 0.42], 0.14, 8);
  }

  // --- 6. 皇后大道中南面入口（Queen's Road Central South Entrance）---
  const southDoorW = 4.2, southDoorH = 3.6;
  const southZ = P.maxZ;
  box(parts.graniteTrim, [P.centerX, P.baseY + southDoorH * 0.5 + 0.2, southZ + 0.1], [southDoorW + 1.2, southDoorH + 1.0, 0.4]);
  box(parts.bronzeMetal, [P.centerX, P.baseY + southDoorH * 0.5, southZ + 0.1], [southDoorW, southDoorH, 0.15]);
  box(parts.windowGlassLit, [P.centerX, P.baseY + 1.8, southZ + 0.15], [southDoorW - 0.4, 2.2, 0.08]);
  box(parts.goldLetters, [P.centerX, P.baseY + southDoorH + 0.4, southZ + 0.32], [3.2, 0.35, 0.06]);
  // 南面踏步銜接皇后大道中（y = 8.4m 降至 y = 8.8m / 9.1m 地面）
  box(parts.graniteTrim, [P.centerX, P.baseY + 0.12, southZ + 1.0], [southDoorW + 2.0, 0.24, 1.8]);

  // --- 7. 基座層 2/F 與 3/F 豎向窗櫺（Podium Office Windows）---
  for (let f = 0; f < 2; f++) {
    const wy = P.baseY + 6.8 + f * 3.8;
    // 北面與南面
    for (const zSide of [P.minZ - 0.05, P.maxZ + 0.05]) {
      for (let b = 0; b < 6; b++) {
        const bx = P.minX + 2.2 + b * 2.6;
        box(parts.bronzeMetal, [bx, wy, zSide], [1.5, 2.4, 0.15]);
        box(parts.windowGlassLit, [bx, wy, zSide], [1.3, 2.2, 0.12]);
      }
    }
    // 東面與西面
    for (const xSide of [P.minX - 0.05, P.maxX + 0.05]) {
      for (let b = 0; b < 9; b++) {
        const bz = P.minZ + 3.0 + b * 3.4;
        box(parts.bronzeMetal, [xSide, wy, bz], [0.15, 2.4, 1.6]);
        box(parts.windowGlass, [xSide, wy, bz], [0.12, 2.2, 1.4]);
      }
    }
  }

  // --- 8. 主塔樓身（Tower Shaft, Floors 4–13, y: 22.4m ~ 58.4m, 高度 36m）---
  const towerH = T.topY - T.baseY;
  const towerMidY = (T.baseY + T.topY) * 0.5;

  // 塔樓核心體量
  box(
    parts.graniteShaft,
    [T.centerX, towerMidY, T.centerZ],
    [T.width, towerH, T.depth]
  );

  // Art Deco 經典豎向條窗與連續花崗岩凸壁柱（Continuous Vertical Granite Piers）
  // 北面與南面壁柱（6 根壁柱形成 5 個豎向窗間帶）
  const northSouthPiers = 6;
  for (let i = 0; i < northSouthPiers; i++) {
    const px = T.minX + 0.8 + i * ((T.width - 1.6) / (northSouthPiers - 1));
    box(parts.graniteShaft, [px, towerMidY, T.minZ - 0.22], [0.9, towerH + 0.2, 0.45]);
    box(parts.graniteShaft, [px, towerMidY, T.maxZ + 0.22], [0.9, towerH + 0.2, 0.45]);
  }

  // 東面與西面壁柱（10 根壁柱形成 9 個豎向窗間帶）
  const eastWestPiers = 10;
  for (let i = 0; i < eastWestPiers; i++) {
    const pz = T.minZ + 1.2 + i * ((T.depth - 2.4) / (eastWestPiers - 1));
    box(parts.graniteShaft, [T.minX - 0.22, towerMidY, pz], [0.45, towerH + 0.2, 0.9]);
    box(parts.graniteShaft, [T.maxX + 0.22, towerMidY, pz], [0.45, towerH + 0.2, 0.9]);
  }

  // 樓層間豎向條窗帶與深古銅色 Art Deco 幾何折線飾板（Spandrels & Windows）
  const officeFloors = 10;
  const floorH = towerH / officeFloors;
  for (let fl = 0; fl < officeFloors; fl++) {
    const fy = T.baseY + fl * floorH;
    const winY = fy + floorH * 0.55;
    const spandrelY = fy + floorH * 0.12;

    // 北面與南面窗帶
    for (const zSide of [T.minZ - 0.08, T.maxZ + 0.08]) {
      for (let b = 0; b < northSouthPiers - 1; b++) {
        const x0 = T.minX + 0.8 + b * ((T.width - 1.6) / (northSouthPiers - 1));
        const x1 = T.minX + 0.8 + (b + 1) * ((T.width - 1.6) / (northSouthPiers - 1));
        const cx = (x0 + x1) * 0.5, spanW = (x1 - x0) - 0.75;
        // 深色窗間飾板（Art Deco 橫豎紋浮雕）
        box(parts.bronzeMetal, [cx, spandrelY, zSide], [spanW, 0.8, 0.15]);
        // 辦公室條窗（夜間自然混和亮燈與暗燈）
        const isLit = (b + fl * 3) % 4 !== 0;
        box(isLit ? parts.windowGlassLit : parts.windowGlass, [cx, winY, zSide], [spanW, floorH - 1.0, 0.1]);
        // 窗框豎梃
        box(parts.bronzeMetal, [cx, winY, zSide], [0.08, floorH - 1.0, 0.14]);
      }
    }

    // 東面與西面窗帶
    for (const xSide of [T.minX - 0.08, T.maxX + 0.08]) {
      for (let b = 0; b < eastWestPiers - 1; b++) {
        const z0 = T.minZ + 1.2 + b * ((T.depth - 2.4) / (eastWestPiers - 1));
        const z1 = T.minZ + 1.2 + (b + 1) * ((T.depth - 2.4) / (eastWestPiers - 1));
        const cz = (z0 + z1) * 0.5, spanD = (z1 - z0) - 0.75;
        box(parts.bronzeMetal, [xSide, spandrelY, cz], [0.15, 0.8, spanD]);
        const isLit = (b * 2 + fl) % 3 === 0;
        box(isLit ? parts.windowGlassLit : parts.windowGlass, [xSide, winY, cz], [0.1, floorH - 1.0, spanD]);
        box(parts.bronzeMetal, [xSide, winY, cz], [0.14, floorH - 1.0, 0.08]);
      }
    }
  }

  // --- 9. 頂層階梯收進與中國會（Floors 14–17 / China Club Penthouse & Terraces）---
  // 第 14–15 層收進體量（A1, y: 58.4m ~ 64.8m, 高度 6.4m）
  const a1H = A1.topY - A1.baseY;
  const a1MidY = (A1.baseY + A1.topY) * 0.5;
  box(parts.graniteShaft, [A1.centerX, a1MidY, A1.centerZ], [A1.width, a1H, A1.depth]);

  // 第 14 層周邊觀景露台環形中式花崗岩雕花石欄杆（China Club Open Terrace Balustrade）
  const balustradeY = A1.baseY;
  const balustradeH = 1.05;

  // 露台外圍欄杆走線（沿 T.width 與 T.depth 邊緣）
  const bMinX = T.minX + 0.3, bMaxX = T.maxX - 0.3;
  const bMinZ = T.minZ + 0.3, bMaxZ = T.maxZ - 0.3;

  // 地栿（基石）與尋杖（扶手面）
  box(parts.graniteTrim, [(bMinX + bMaxX) * 0.5, balustradeY + 0.08, bMinZ], [bMaxX - bMinX, 0.16, 0.2]);
  box(parts.graniteTrim, [(bMinX + bMaxX) * 0.5, balustradeY + 0.08, bMaxZ], [bMaxX - bMinX, 0.16, 0.2]);
  box(parts.graniteTrim, [bMinX, balustradeY + 0.08, (bMinZ + bMaxZ) * 0.5], [0.2, 0.16, bMaxZ - bMinZ]);
  box(parts.graniteTrim, [bMaxX, balustradeY + 0.08, (bMinZ + bMaxZ) * 0.5], [0.2, 0.16, bMaxZ - bMinZ]);

  box(parts.graniteTrim, [(bMinX + bMaxX) * 0.5, balustradeY + balustradeH, bMinZ], [bMaxX - bMinX, 0.12, 0.22]);
  box(parts.graniteTrim, [(bMinX + bMaxX) * 0.5, balustradeY + balustradeH, bMaxZ], [bMaxX - bMinX, 0.12, 0.22]);
  box(parts.graniteTrim, [bMinX, balustradeY + balustradeH, (bMinZ + bMaxZ) * 0.5], [0.22, 0.12, bMaxZ - bMinZ]);
  box(parts.graniteTrim, [bMaxX, balustradeY + balustradeH, (bMinZ + bMaxZ) * 0.5], [0.22, 0.12, bMaxZ - bMinZ]);

  // 望柱與蓮瓣柱頭（Newel Posts with Lotus Finials）每 2.4m 設置一座
  for (let x = bMinX; x <= bMaxX + 0.1; x += 2.4) {
    for (const z of [bMinZ, bMaxZ]) {
      box(parts.graniteTrim, [x, balustradeY + balustradeH * 0.5, z], [0.22, balustradeH, 0.22]);
      sphere(parts.graniteTrim, [x, balustradeY + balustradeH + 0.12, z], 0.12, 8);
    }
  }
  for (let z = bMinZ + 2.4; z <= bMaxZ - 0.1; z += 2.4) {
    for (const x of [bMinX, bMaxX]) {
      box(parts.graniteTrim, [x, balustradeY + balustradeH * 0.5, z], [0.22, balustradeH, 0.22]);
      sphere(parts.graniteTrim, [x, balustradeY + balustradeH + 0.12, z], 0.12, 8);
    }
  }

  // 中國會（China Club）懷舊外廊立面、深紅漆立柱與溫暖落地全景窗
  // 圓形立柱與拱形門廊
  const clubPillarsX = 5;
  for (let i = 0; i < clubPillarsX; i++) {
    const px = A1.minX + 1.2 + i * ((A1.width - 2.4) / (clubPillarsX - 1));
    cylinder(parts.chineseRed, [px, a1MidY, A1.minZ - 0.1], 0.22, a1H - 0.4, 12);
    cylinder(parts.chineseRed, [px, a1MidY, A1.maxZ + 0.1], 0.22, a1H - 0.4, 12);
    // 柱頭雀替裝飾
    box(parts.chineseRed, [px, A1.topY - 0.4, A1.minZ - 0.1], [0.7, 0.3, 0.35]);
    box(parts.chineseRed, [px, A1.topY - 0.4, A1.maxZ + 0.1], [0.7, 0.3, 0.35]);
  }
  // 全景茶室落地窗（夜間散發濃厚老上海 1930s 暖金氛圍）
  box(parts.chinaClubGlass, [A1.centerX, a1MidY, A1.minZ - 0.02], [A1.width - 1.6, a1H - 1.2, 0.08]);
  box(parts.chinaClubGlass, [A1.centerX, a1MidY, A1.maxZ + 0.02], [A1.width - 1.6, a1H - 1.2, 0.08]);
  box(parts.chinaClubGlass, [A1.minX - 0.02, a1MidY, A1.centerZ], [0.08, a1H - 1.2, A1.depth - 2.0]);
  box(parts.chinaClubGlass, [A1.maxX + 0.02, a1MidY, A1.centerZ], [0.08, a1H - 1.2, A1.depth - 2.0]);

  // 第 16–17 層進一步收進閣樓（A2, y: 64.8m ~ 70.4m, 高度 5.6m）
  const a2H = A2.topY - A2.baseY;
  const a2MidY = (A2.baseY + A2.topY) * 0.5;
  box(parts.graniteShaft, [A2.centerX, a2MidY, A2.centerZ], [A2.width, a2H, A2.depth]);

  // 閣樓窗戶
  box(parts.chinaClubGlass, [A2.centerX, a2MidY, A2.minZ - 0.04], [A2.width - 2.0, a2H - 1.4, 0.1]);
  box(parts.chinaClubGlass, [A2.centerX, a2MidY, A2.maxZ + 0.04], [A2.width - 2.0, a2H - 1.4, 0.1]);

  // 頂層挑檐下簡化斗栱構造（Bracket Sets under Eaves）
  const bracketCountX = 7, bracketCountZ = 11;
  for (let i = 0; i < bracketCountX; i++) {
    const bx = A2.minX + 0.6 + i * ((A2.width - 1.2) / (bracketCountX - 1));
    box(parts.chineseRed, [bx, A2.topY - 0.3, A2.minZ - 0.3], [0.45, 0.35, 0.6]);
    box(parts.chineseRed, [bx, A2.topY - 0.3, A2.maxZ + 0.3], [0.45, 0.35, 0.6]);
  }
  for (let i = 0; i < bracketCountZ; i++) {
    const bz = A2.minZ + 0.6 + i * ((A2.depth - 1.2) / (bracketCountZ - 1));
    box(parts.chineseRed, [A2.minX - 0.3, A2.topY - 0.3, bz], [0.6, 0.35, 0.45]);
    box(parts.chineseRed, [A2.maxX + 0.3, A2.topY - 0.3, bz], [0.6, 0.35, 0.45]);
  }

  // --- 10. 標誌性中式翡翠綠琉璃瓦歇山頂／四角攢尖頂（Chinese Glazed Roof Crown）---
  // y: 70.4m ~ 77.2m，由巴馬丹拿與陸謙受特意融入的標誌性傳統中式大屋頂
  const eavesY = R.baseY;
  const eavesOut = R.eavesOutset; // 1.8m 飛檐出挑
  const roofMinX = A2.minX - eavesOut, roofMaxX = A2.maxX + eavesOut;
  const roofMinZ = A2.minZ - eavesOut, roofMaxZ = A2.maxZ + eavesOut;
  const roofW = roofMaxX - roofMinX, roofD = roofMaxZ - roofMinZ;

  // 1. 飛檐檐口木結構與起翹（Sweeping Flying Eaves Fascia & Soffit）
  box(parts.chineseRed, [R.centerX, eavesY + 0.15, R.centerZ], [roofW, 0.3, roofD]);

  // 四角起翹飛檐（Upturned Corner Rafters & Flying Tips）
  const cornerTips = [
    [roofMinX, roofMinZ],
    [roofMaxX, roofMinZ],
    [roofMinX, roofMaxZ],
    [roofMaxX, roofMaxZ]
  ];
  for (const [cx, cz] of cornerTips) {
    // 角梁起翹昂起
    box(parts.chineseRed, [cx, eavesY + 0.45, cz], [0.8, 0.4, 0.8]);
    // 翹起角獸吻端
    sphere(parts.roofRidgeBeasts, [cx, eavesY + 0.75, cz], 0.28, 8);
  }

  // 2. 綠色琉璃瓦斜面坡屋頂（Glazed Emerald Green Hip-and-Gable Pitches）
  // 以階梯化瓦壟及幾何坡面忠實呈現四面歇山坡度
  const roofTiers = 7;
  const roofApexY = 75.2;
  for (let r = 0; r < roofTiers; r++) {
    const t0 = r / roofTiers;
    const t1 = (r + 1) / roofTiers;
    const curY = eavesY + 0.3 + t0 * (roofApexY - eavesY);
    const tierH = (roofApexY - eavesY) / roofTiers + 0.12;
    const curW = roofW * (1.0 - t0 * 0.68);
    const curD = roofD * (1.0 - t0 * 0.68);
    box(parts.glazedGreenTiles, [R.centerX, curY + tierH * 0.5, R.centerZ], [curW, tierH, curD]);
  }

  // 3. 正脊與垂脊（Main Ridge, Hip Ridges & Mythical Roof Beasts）
  // 南北向主正脊（Main Ridge along z axis）
  const ridgeY = roofApexY;
  const ridgeL = (roofD * 0.32);
  box(parts.roofRidgeBeasts, [R.centerX, ridgeY + 0.3, R.centerZ], [0.8, 0.6, ridgeL]);
  // 正脊兩端鴟吻／大吻（Dragon Ridge-end Beasts）
  box(parts.roofRidgeBeasts, [R.centerX, ridgeY + 0.7, R.centerZ - ridgeL * 0.5], [0.9, 0.9, 0.8]);
  box(parts.roofRidgeBeasts, [R.centerX, ridgeY + 0.7, R.centerZ + ridgeL * 0.5], [0.9, 0.9, 0.8]);

  // 四條戧脊／垂脊向四角斜向伸展（Hip Ridges running down to four corners）
  beam(parts.roofRidgeBeasts, [R.centerX, ridgeY + 0.3, R.centerZ - ridgeL * 0.5], [roofMinX + 0.6, eavesY + 0.6, roofMinZ + 0.6], 0.45, 0.45);
  beam(parts.roofRidgeBeasts, [R.centerX, ridgeY + 0.3, R.centerZ - ridgeL * 0.5], [roofMaxX - 0.6, eavesY + 0.6, roofMinZ + 0.6], 0.45, 0.45);
  beam(parts.roofRidgeBeasts, [R.centerX, ridgeY + 0.3, R.centerZ + ridgeL * 0.5], [roofMinX + 0.6, eavesY + 0.6, roofMaxZ - 0.6], 0.45, 0.45);
  beam(parts.roofRidgeBeasts, [R.centerX, ridgeY + 0.3, R.centerZ + ridgeL * 0.5], [roofMaxX - 0.6, eavesY + 0.6, roofMaxZ - 0.6], 0.45, 0.45);

  // 4. 金屬寶頂（Tiered Golden Finial Spire reaching y = 77.2m）
  const finialBaseY = ridgeY + 0.6;
  // 雙層蓮花座
  cylinder(parts.spireGold, [R.centerX, finialBaseY + 0.2, R.centerZ], 0.9, 0.4, 16);
  cylinder(parts.spireGold, [R.centerX, finialBaseY + 0.5, R.centerZ], 0.7, 0.3, 16);
  // 鎏金寶珠（Central Orb Sphere）
  sphere(parts.spireGold, [R.centerX, finialBaseY + 0.95, R.centerZ], 0.45, 16);
  // 相輪節飾與尖頂長矛（Spear Finial Spire to y = 77.2m）
  cylinder(parts.spireGold, [R.centerX, finialBaseY + 1.45, R.centerZ], 0.25, 0.6, 12, 0.18);
  cylinder(parts.spireGold, [R.centerX, finialBaseY + 2.0, R.centerZ], 0.12, 0.8, 8, 0.02);

  // 露台雙旗桿（Flagpoles on North and South Decks）
  cylinder(parts.bronzeMetal, [R.centerX, A1.baseY + 3.5, A1.minZ - 1.2], 0.08, 7.0, 8);
  cylinder(parts.bronzeMetal, [R.centerX, A1.baseY + 3.5, A1.maxZ + 1.2], 0.08, 7.0, 8);

  // --- 11. 夜間外牆泛光投光燈組（Architectural Night Floodlighting）---
  // 基座頂部投光燈（照耀直聳花崗岩石壁柱）
  for (let i = 0; i < northSouthPiers; i++) {
    const px = T.minX + 0.8 + i * ((T.width - 1.6) / (northSouthPiers - 1));
    box(parts.floodLights, [px, P.topY + 0.15, T.minZ - 0.5], [0.35, 0.18, 0.35]);
    box(parts.floodLights, [px, P.topY + 0.15, T.maxZ + 0.5], [0.35, 0.18, 0.35]);
  }
  for (let i = 0; i < eastWestPiers; i++) {
    const pz = T.minZ + 1.2 + i * ((T.depth - 2.4) / (eastWestPiers - 1));
    box(parts.floodLights, [T.minX - 0.5, P.topY + 0.15, pz], [0.35, 0.18, 0.35]);
    box(parts.floodLights, [T.maxX + 0.5, P.topY + 0.15, pz], [0.35, 0.18, 0.35]);
  }

  // 頂部屋檐投光燈（洗亮綠琉璃歇山頂與飛檐起翹）
  for (const dx of [-4.5, 4.5]) {
    for (const dz of [-7.0, 7.0]) {
      box(parts.floodLights, [R.centerX + dx, eavesY - 0.2, R.centerZ + dz], [0.4, 0.2, 0.4]);
    }
  }

  // --- 12. 合併幾何體並加入場景（Merge Geometries into Three.js Scene）---
  safeMerged(root, parts.granitePodium, granitePodiumMat, '舊中國銀行大廈基座石牆 Old BOC Granite Podium');
  safeMerged(root, parts.graniteShaft, graniteShaftMat, '舊中國銀行大廈主塔樓石牆 Old BOC Granite Shaft');
  safeMerged(root, parts.graniteTrim, graniteTrimMat, '舊中國銀行大廈石材檐口與線腳 Old BOC Granite Cornice & Trims');
  safeMerged(root, parts.granitePaving, granitePavingMat, '舊中國銀行大廈周邊鋪面 Old BOC Granite Paving');
  safeMerged(root, parts.carvedLions, carvedLionMat, '舊中國銀行大廈一對守門石獅 Old BOC Guardian Stone Lions');
  safeMerged(root, parts.bronzeMetal, bronzeMetalMat, '舊中國銀行大廈古銅門廊與窗飾 Old BOC Bronze Doors & Screens');
  safeMerged(root, parts.goldLetters, goldLettersMat, '舊中國銀行大廈燙金字匾額 Old BOC Gold Inscription Plaques');
  safeMerged(root, parts.glazedGreenTiles, glazedGreenTileMat, '舊中國銀行大廈綠琉璃歇山頂 Old BOC Glazed Emerald Roof');
  safeMerged(root, parts.roofRidgeBeasts, roofRidgeBeastMat, '舊中國銀行大廈屋脊獸與戧脊 Old BOC Ridge Beasts');
  safeMerged(root, parts.spireGold, spireGoldMat, '舊中國銀行大廈頂冠鎏金寶頂 Old BOC Gold Pagoda Finial');
  safeMerged(root, parts.chineseRed, chineseRedMat, '舊中國銀行大廈中式紅漆柱與斗栱 Old BOC Chinese Lacquer Brackets');
  safeMerged(root, parts.windowGlass, windowGlassMat, '舊中國銀行大廈深色條窗玻璃 Old BOC Reflective Glass');
  safeMerged(root, parts.windowGlassLit, windowGlassLitMat, '舊中國銀行大廈夜間亮燈條窗 Old BOC Night Windows Lit');
  safeMerged(root, parts.chinaClubGlass, chinaClubGlassMat, '舊中國銀行大廈中國會全景窗 Old BOC China Club Windows');
  safeMerged(root, parts.portalWarmGlow, portalWarmGlowMat, '舊中國銀行大廈門廊夜間暖光 Old BOC Portal Glow');
  safeMerged(root, parts.floodLights, floodLightMat, '舊中國銀行大廈夜間外牆投光燈 Old BOC Facade Floodlights');

  // --- 13. 碰撞體清單（嚴格與周邊路網保持安全淨空）---
  const colliders = [
    {
      name: '舊中國銀行大廈基座 Old Bank of China Podium',
      minX: P.minX,
      maxX: P.maxX,
      minZ: P.minZ,
      maxZ: P.maxZ,
      minY: 6.8,
      maxY: P.topY
    },
    {
      name: '舊中國銀行大廈主塔樓 Old Bank of China Tower',
      minX: T.minX,
      maxX: T.maxX,
      minZ: T.minZ,
      maxZ: T.maxZ,
      minY: T.baseY,
      maxY: T.topY
    },
    {
      name: '舊中國銀行大廈頂冠 Old Bank of China Crown',
      minX: A1.minX,
      maxX: A1.maxX,
      minZ: A1.minZ,
      maxZ: A1.maxZ,
      minY: A1.baseY,
      maxY: OLD_BOC_ROOF_TOP
    },
    {
      name: '舊中國銀行大廈北門石階 North Entrance Stairs',
      minX: 43.0,
      maxX: 55.0,
      minZ: 167.5,
      maxZ: 170.5,
      minY: 7.0,
      maxY: 8.6
    },
    {
      name: '舊中國銀行大廈南門石階 South Entrance Stairs',
      minX: 43.5,
      maxX: 54.5,
      minZ: 205.5,
      maxZ: 207.5,
      minY: 8.2,
      maxY: 9.6
    },
    {
      name: '舊中國銀行大廈東側石獅（雄獅） East Guardian Lion',
      minX: 54.4,
      maxX: 56.0,
      minZ: 167.5,
      maxZ: 169.5,
      minY: 7.2,
      maxY: 9.6
    },
    {
      name: '舊中國銀行大廈西側石獅（雌獅） West Guardian Lion',
      minX: 42.0,
      maxX: 43.6,
      minZ: 167.5,
      maxZ: 169.5,
      minY: 7.2,
      maxY: 9.6
    }
  ];

  const landmark = {
    id: 'old-bank-of-china',
    name: OLD_BANK_OF_CHINA_SITE.name,
    englishName: OLD_BANK_OF_CHINA_SITE.englishName,
    position: {
      x: P.centerX,
      y: OLD_BOC_BASE_Y,
      z: P.centerZ
    },
    radius: 26,
    height: OLD_BOC_ROOF_TOP
  };

  const stats = {
    oldBankOfChinaLandmarks: 1,
    oldBankOfChinaOsmWay: OLD_BANK_OF_CHINA_OSM_SOURCE.id,
    oldBankOfChinaStoreys: OLD_BOC_STOREYS,
    oldBankOfChinaHeight: OLD_BOC_HEIGHT,
    oldBankOfChinaRoofTop: OLD_BOC_ROOF_TOP,
    oldBankOfChinaBaseY: OLD_BOC_BASE_Y,
    oldBankOfChinaLions: OLD_BOC_LIONS.count,
    oldBankOfChinaColliders: colliders.length,
    oldBankOfChinaCompletionYear: OLD_BOC_HERITAGE.completionYear,
    oldBankOfChinaOpeningYear: OLD_BOC_HERITAGE.openingYear,
    oldBankOfChinaArchitects: OLD_BOC_HERITAGE.architects,
    oldBankOfChinaHeritageGrade: OLD_BOC_HERITAGE.grade
  };

  root.userData.stats = stats;

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats,
    site: OLD_BANK_OF_CHINA_SITE,
    groundHeightAt: (x, z, ground) => oldBankOfChinaGroundHeightAt(x, z, ground)
  };
}
