// 力寶中心一期同二期（Lippo Centre Towers 1 & 2, 89 Queensway, 1988）3D 建築模型
// 忠實重現保羅·魯道夫（Paul Rudolph）世界著名後現代建築傑作：
// 包含八角形雙塔樓（一座高 172 米／二座高 186 米）、對角旋轉佈局（二座相對一座旋轉約 51.8°）、
// 標誌性「樹熊爬樹」（The Koala Tree）懸臂折面外凸八角凸窗艙體（Cantilevered Faceted Bay-Window Pods）、
// 貫通全塔的巨型對角結構柱墩與設備豎井、空中退台與挑空轉換層、
// 四層架空巨柱雕塑基座（Monumental Pilotis Podium）、地面車道落客環道、
// 橫跨金鐘道與紅棉路的立體行人天橋網絡、八角退台塔冠、通信天線桅杆與夜間建築燈效。
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  LIPPO_CENTRE_SITE,
  LIPPO_TOWER_ONE_SITE,
  LIPPO_TOWER_TWO_SITE,
  LIPPO_TOWER_ONE_DATA,
  LIPPO_TOWER_TWO_DATA,
  LIPPO_PODIUM_DATA,
  LIPPO_CENTRE_HERITAGE,
  lippoCentreGroundHeightAt
} from './lippo-centre-site.js';

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
  if (!geo) throw new Error(`Lippo Centre could not merge ${name}`);
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

function cylinder(parts, center, radius, height, segments = 16, radiusTop = radius, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) {
  const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments, 1, openEnded, thetaStart, thetaLength);
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

function makeObbCollider(name, cx, cz, ry, w, d, minY, maxY) {
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const hx = w * 0.5, hz = d * 0.5;
  return {
    name,
    shape: 'box',
    x: cx,
    z: cz,
    w,
    d,
    ry,
    minY,
    maxY,
    minX: cx - (Math.abs(cs) * hx + Math.abs(sn) * hz),
    maxX: cx + (Math.abs(cs) * hx + Math.abs(sn) * hz),
    minZ: cz - (Math.abs(sn) * hx + Math.abs(cs) * hz),
    maxZ: cz + (Math.abs(sn) * hx + Math.abs(cs) * hz),
    obb: { cx, cz, hx, hz, cs, sn }
  };
}

export function buildLippoCentre(scene) {
  const root = new THREE.Group();
  root.name = '力寶中心一期同二期 Lippo Centre Towers 1 & 2 (89 Queensway)';
  scene.add(root);

  const T1 = LIPPO_TOWER_ONE_DATA;
  const T2 = LIPPO_TOWER_TWO_DATA;
  const P = LIPPO_PODIUM_DATA;

  // --- 1. 材質調色盤（反光深藍玻璃幕牆、深古銅陽極氧化鋁、粗獷主義混凝土巨柱、夜間暖光）---
  const glassTowerMat = new THREE.MeshStandardNodeMaterial({
    color: 0x1a3344, // Paul Rudolph's signature dark reflective cyan-blue curtain glass
    roughness: 0.12,
    metalness: 0.85
  });
  glassTowerMat.emissiveNode = color(0xffdfa8).mul(nightAmount().mul(0.38));

  const spandrelMat = new THREE.MeshStandardMaterial({
    color: 0x1c2024, // Anodized dark charcoal / bronze-black aluminium spandrels
    roughness: 0.35,
    metalness: 0.65
  });

  const mullionMat = new THREE.MeshStandardMaterial({
    color: 0x141618, // Dark bronze vertical mullion frames & chamfered edge beads
    roughness: 0.4,
    metalness: 0.7
  });

  const podFrameMat = new THREE.MeshStandardMaterial({
    color: 0x22262a, // Sculptural "Koala" pod beveled cantilever brackets & soffits
    roughness: 0.38,
    metalness: 0.62
  });

  const podiumColumnMat = new THREE.MeshStandardMaterial({
    color: 0x7a7e80, // Dressed architectural grey granite & brutalist concrete pilotis
    roughness: 0.75,
    metalness: 0.1
  });

  const podiumSlabMat = new THREE.MeshStandardMaterial({
    color: 0x8a8e91, // Multi-level podium floor slabs, skybridges & plaza deck
    roughness: 0.7,
    metalness: 0.12
  });

  const mechanicalLouverMat = new THREE.MeshStandardMaterial({
    color: 0x16181a, // Dark acoustic ventilation louvers for mechanical / sky-lobby bands
    roughness: 0.8,
    metalness: 0.3
  });

  const spireMetalMat = new THREE.MeshStandardMaterial({
    color: 0xa8b0b5, // Galvanized structural steel antenna spires & BMU roof tracks
    roughness: 0.25,
    metalness: 0.85
  });

  const beaconRedMat = new THREE.MeshStandardNodeMaterial({
    color: 0xff1100, // Aviation obstruction warning beacons
    roughness: 0.2,
    metalness: 0.1
  });
  beaconRedMat.emissiveNode = color(0xff1100).mul(0.9);

  const signageGoldMat = new THREE.MeshStandardNodeMaterial({
    color: 0xd4af37, // Polished golden bilingual lettering: 「力寶中心」 / "LIPPO CENTRE"
    roughness: 0.28,
    metalness: 0.88
  });
  signageGoldMat.emissiveNode = color(0xffdf77).mul(nightAmount().mul(0.4));

  // 幾何體部件收集隊列
  const parts = {
    glass: [],
    spandrels: [],
    mullions: [],
    podFrames: [],
    columns: [],
    slabs: [],
    louvers: [],
    spires: [],
    beacons: [],
    signs: []
  };

  // --- 2. 構建雙塔樓（一座 172 米／二座 186 米）---
  const towers = [
    { data: T1, label: '一座 Tower 1', podTiers: [ { y0: 28, y1: 64 }, { y0: 78, y1: 114 }, { y0: 128, y1: 164 } ] },
    { data: T2, label: '二座 Tower 2', podTiers: [ { y0: 28, y1: 68 }, { y0: 82, y1: 124 }, { y0: 138, y1: 178 } ] }
  ];

  for (const tower of towers) {
    const td = tower.data;
    const cx = td.center.x, cz = td.center.z, ry = td.ry;
    const towerH = td.height;
    const shaftRadius = 21.0; // 八角形核心外接半徑（對邊距 ~38.8m）
    const shaftH = towerH - P.topY;
    const shaftMidY = P.topY + shaftH * 0.5;

    // A. 八角形核心主塔身（Octagonal Glazed Shaft）
    // 8 邊稜柱圓柱幾何體，旋轉 ry + PI/8 形成正八邊形平面
    cylinder(parts.glass, [cx, shaftMidY, cz], shaftRadius, shaftH, 8, shaftRadius, false, ry + Math.PI / 8, Math.PI * 2);

    // 水平層間窗帶飾條（Spandrel Bands）每 3.8m 一層
    for (let y = P.topY + 3.8; y < towerH - 2.0; y += 3.8) {
      cylinder(parts.spandrels, [cx, y, cz], shaftRadius + 0.08, 0.45, 8, shaftRadius + 0.08, false, ry + Math.PI / 8, Math.PI * 2);
    }

    // B. 四角巨型八角結構柱墩與設備豎井（Vertical Structural Corner Columns & Service Shafts）
    // 位於八角形四個對角折角處，縱貫全塔，強化垂直立體骨骼感
    const colDist = 20.8;
    const colRadius = 1.9;
    const diagAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];

    for (const da of diagAngles) {
      const worldA = ry + da;
      const colX = cx + colDist * Math.cos(worldA);
      const colZ = cz + colDist * Math.sin(worldA);
      cylinder(parts.columns, [colX, (P.baseY + towerH + 2.0) * 0.5, colZ], colRadius, towerH - P.baseY + 2.0, 8, colRadius);
      // 柱身垂直凹槽金屬收邊裝飾
      cylinder(parts.mullions, [colX, (P.baseY + towerH + 2.0) * 0.5, colZ], colRadius + 0.06, towerH - P.baseY + 2.0, 8, colRadius + 0.06, true);
    }

    // C. 標誌性「樹熊爬樹」懸臂外凸八角凸窗艙體（"The Koala Tree" Cantilevered Faceted Bay-Window Pods）
    // 保羅·魯道夫最具代表性的空間雕塑手法：外凸 2.8 米的 C 形折面八角凸窗組，
    // 在不同高度階梯狀錯落交替攀附於八面塔身，打破摩天大樓單調平滑，創造極致光影立體感！
    const faceAngles = [
      0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75,
      Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75
    ];

    tower.podTiers.forEach((tier, tierIdx) => {
      const tierH = tier.y1 - tier.y0;
      const tierMidY = (tier.y0 + tier.y1) * 0.5;

      // 每個高度層在交錯的立面上設置樹熊艙體
      faceAngles.forEach((fa, faIdx) => {
        // 交錯節奏：某些立面外凸，某些立面內凹露出核心，如同樹熊錯落抱樹攀登
        if ((faIdx + tierIdx) % 2 === 0) {
          const worldA = ry + fa;
          const podDist = shaftRadius * Math.cos(Math.PI / 8) + 1.4; // 貼合八角平面並外挑
          const podX = cx + podDist * Math.cos(worldA);
          const podZ = cz + podDist * Math.sin(worldA);
          const podW = 14.5;
          const podD = 2.8;

          // 懸臂基座厚重倒角挑檐托架（Cantilevered Base Bracket & Soffit）
          box(parts.podFrames, [podX, tier.y0 + 0.4, podZ], [podW, 0.8, podD], -worldA + Math.PI / 2);
          // 凸窗主體深藍反光玻璃（Glazed Faceted Bay Window Body）
          box(parts.glass, [podX, tierMidY, podZ], [podW - 0.2, tierH - 1.6, podD - 0.2], -worldA + Math.PI / 2);
          // 凸窗頂部懸挑退台收口頂蓋（Cantilevered Roof Soffit）
          box(parts.podFrames, [podX, tier.y1 - 0.4, podZ], [podW, 0.8, podD], -worldA + Math.PI / 2);

          // 凸窗內部層間深色金屬窗飾帶
          for (let py = tier.y0 + 3.8; py < tier.y1 - 1.0; py += 3.8) {
            box(parts.spandrels, [podX, py, podZ], [podW + 0.1, 0.5, podD + 0.1], -worldA + Math.PI / 2);
          }
          // 兩側 45 度倒角斜切邊框（Faceted Chamfer Returns）
          box(parts.mullions, [podX, tierMidY, podZ], [podW + 0.12, tierH, 0.1], -worldA + Math.PI / 2);
        }
      });
    });

    // D. 空中退台與雙層挑空轉換設備層（Sculptural Cutaways & Sky Lobbies）
    // 約 1/3 及 2/3 高度處設深邃陰影帶、深色聲學通風百葉與外挑維護露台
    const skyLobbyY = [P.topY + shaftH * 0.34, P.topY + shaftH * 0.68];
    for (const sy of skyLobbyY) {
      // 內凹八角轉換核心
      cylinder(parts.louvers, [cx, sy, cz], shaftRadius - 0.8, 3.6, 8, shaftRadius - 0.8, false, ry + Math.PI / 8, Math.PI * 2);
      // 外挑景觀平台樓板與金屬格柵
      cylinder(parts.slabs, [cx, sy - 1.8, cz], shaftRadius + 1.2, 0.4, 8, shaftRadius + 1.2, false, ry + Math.PI / 8, Math.PI * 2);
      cylinder(parts.mullions, [cx, sy - 1.0, cz], shaftRadius + 1.15, 1.1, 8, shaftRadius + 1.15, true, ry + Math.PI / 8, Math.PI * 2);
    }

    // E. 雕塑感八角折面退台塔冠（Setback Sculptural Octagonal Crown）
    const crownBaseY = towerH;
    const crownH = 5.2;
    // 退台八角機房層
    cylinder(parts.spandrels, [cx, crownBaseY + crownH * 0.5, cz], shaftRadius - 3.2, crownH, 8, shaftRadius - 3.2, false, ry + Math.PI / 8, Math.PI * 2);
    cylinder(parts.louvers, [cx, crownBaseY + crownH * 0.5, cz], shaftRadius - 3.0, crownH - 0.4, 8, shaftRadius - 3.0, true, ry + Math.PI / 8, Math.PI * 2);
    // 屋面洗窗機 BMU 環形軌道平台
    cylinder(parts.slabs, [cx, crownBaseY + crownH, cz], shaftRadius - 2.8, 0.5, 8, shaftRadius - 2.8, false, ry + Math.PI / 8, Math.PI * 2);

    // F. 頂冠鋼結構通信天線桅杆與航空障礙紅燈（Telecommunications Mast Spire & Beacons）
    const spireH = td.crownTop - (crownBaseY + crownH);
    const spireMidY = crownBaseY + crownH + spireH * 0.5;
    cylinder(parts.spires, [cx, spireMidY, cz], 0.35, spireH, 8, 0.12);
    // 避雷針頂尖與閃爍紅色航空障礙燈
    sphere(parts.beacons, [cx, td.crownTop, cz], 0.45, 8);
  }

  // --- 3. 四層架空巨柱雕塑基座（Monumental Pilotis Commercial Podium）---
  // 銜接雙塔樓之四層大型商業基座（Y = 6.5m 至 Y = 24.5m，總高 18m）
  const podCenter = P.center;
  const podW = P.maxX - P.minX; // ~80m
  const podD = P.maxZ - P.minZ; // ~73m
  const podMidY = (P.baseY + P.topY) * 0.5;

  // A. 地下封閉護壁（Granite Foundation Skirt extending down to 4.0m）
  box(parts.columns, [podCenter.x, (P.baseY + P.foundationY) * 0.5, podCenter.z], [podW - 2.0, P.baseY - P.foundationY, podD - 2.0]);

  // B. 巨型粗獷主義圓形架空支承柱廊（Monumental Pilotis Columns lifting towers & podium）
  // 直徑 2.4 米、高 12 米的巨型混凝土柱，將整座建築群架空，底層形成開敞通透之落客廣場與人行步道
  const pilotisGrid = [
    [375, 255], [395, 252], [415, 260], [432, 275],
    [370, 275], [388, 280], [410, 288], [435, 295],
    [380, 298], [402, 305], [422, 312], [438, 310]
  ];

  for (const [px, pz] of pilotisGrid) {
    cylinder(parts.columns, [px, P.baseY + 6.0, pz], 1.2, 12.0, 16);
    // 柱頂八角托座（Capital Brackets）
    cylinder(parts.podFrames, [px, P.baseY + 11.8, pz], 1.5, 0.8, 8);
  }

  // C. 基座二樓至四樓商場與銀行大堂主體（Podium Upper Retail & Banking Concourse）
  box(parts.glass, [podCenter.x, P.baseY + 12.5, podCenter.z], [podW - 4.0, 11.0, podD - 4.0]);
  box(parts.spandrels, [podCenter.x, P.baseY + 12.5, podCenter.z], [podW - 3.6, 11.4, podD - 3.6]);
  // 頂部屋頂花園平台樓板（Podium Roof Garden Deck at Y = 24.5m）
  box(parts.slabs, [podCenter.x, P.topY - 0.25, podCenter.z], [podW - 1.0, 0.5, podD - 1.0]);

  // D. 雙塔間中央透光玻璃採光中庭（Central Glazed Skylight Atrium）
  cylinder(parts.glass, [podCenter.x, P.topY + 1.2, podCenter.z], 14.0, 2.4, 12, 12.0);
  cylinder(parts.mullions, [podCenter.x, P.topY + 1.2, podCenter.z], 14.1, 2.4, 12, 12.1, true);

  // --- 4. 立體行人天橋網絡（Elevated Pedestrian Footbridge Network）---
  // 橋面標高 Y = 12.5m（下部路面淨空高度 > 6.0 米，雙層巴士與各型車輛畅通無阻）
  const bridgeDeckY = 12.5;
  const bridgeH = 3.6;

  // 東側金鐘道行人天橋（East Bridge over Queensway towards Admiralty MTR & Queensway Plaza）
  box(parts.slabs, [438.0, bridgeDeckY, 328.0], [5.2, 0.4, 18.0]); // 橋面板
  box(parts.glass, [440.5, bridgeDeckY + bridgeH * 0.5, 328.0], [0.1, bridgeH - 0.4, 18.0]); // 兩側玻璃幕牆
  box(parts.glass, [435.5, bridgeDeckY + bridgeH * 0.5, 328.0], [0.1, bridgeH - 0.4, 18.0]);
  box(parts.slabs, [438.0, bridgeDeckY + bridgeH, 328.0], [5.4, 0.4, 18.0]); // 遮陽頂棚

  // 西側紅棉路／德立街行人天橋（West Bridge towards Far East Finance Centre & Tamar）
  box(parts.slabs, [356.0, bridgeDeckY, 260.0], [14.0, 0.4, 5.0]);
  box(parts.glass, [356.0, bridgeDeckY + bridgeH * 0.5, 262.4], [14.0, bridgeH - 0.4, 0.1]);
  box(parts.glass, [356.0, bridgeDeckY + bridgeH * 0.5, 257.6], [14.0, bridgeH - 0.4, 0.1]);
  box(parts.slabs, [356.0, bridgeDeckY + bridgeH, 260.0], [14.0, 0.4, 5.2]);

  // --- 5. 門廊金色雙語題字招牌（Gold Bilingual Entrance Signage）---
  // 東面金鐘道正門招牌：「力 寶 中 心」 / "LIPPO CENTRE"
  box(parts.signs, [432.0, 11.5, 316.5], [8.0, 0.8, 0.12]);
  box(parts.signs, [432.0, 9.8, 316.5], [7.2, 0.45, 0.12]);

  // --- 6. 合併幾何體並加入主群（Merge Geometries into Three.js Mesh Group）---
  safeMerged(root, parts.glass, glassTowerMat, '力寶中心深藍反光玻璃幕牆 Lippo Centre Reflective Glass');
  safeMerged(root, parts.spandrels, spandrelMat, '力寶中心深色層間飾帶 Lippo Centre Spandrel Bands');
  safeMerged(root, parts.mullions, mullionMat, '力寶中心深古銅豎向窗櫺 Lippo Centre Vertical Mullions');
  safeMerged(root, parts.podFrames, podFrameMat, '力寶中心樹熊八角外凸艙體托架 Lippo Centre Koala Pod Brackets');
  safeMerged(root, parts.columns, podiumColumnMat, '力寶中心巨型支承柱廊與豎井 Lippo Centre Pilotis & Corner Shafts');
  safeMerged(root, parts.slabs, podiumSlabMat, '力寶中心四層基座樓板與天橋 Lippo Centre Podium & Skybridges');
  safeMerged(root, parts.louvers, mechanicalLouverMat, '力寶中心空中退台聲學通風百葉 Lippo Centre Sky Lobby Louvers');
  safeMerged(root, parts.spires, spireMetalMat, '力寶中心雙塔鋼結構通信天線桅杆 Lippo Centre Antenna Spires');
  safeMerged(root, parts.beacons, beaconRedMat, '力寶中心頂冠航空障礙信號燈 Lippo Centre Aviation Beacons');
  safeMerged(root, parts.signs, signageGoldMat, '力寶中心門額燙金字招牌 Lippo Centre Gold Signage');

  // --- 7. 碰撞體清單（精確貼合八角形與架空基座，嚴格維持與周邊路網零衝突）---
  // 為每座八角形塔樓配置正交雙十字定向盒（Cross OBBs），精確覆蓋八角平面內部而不突出八角斜角，
  // 完美避免與周邊紅棉路、金鐘道、德立街車道發生碰撞！
  const colliders = [
    // Tower 1 核心雙十字八角定向盒
    makeObbCollider('力寶中心第一座八角塔身橫向盒 Lippo Tower 1 Core A', T1.center.x, T1.center.z, T1.ry, 38.0, 26.0, P.baseY, T1.height),
    makeObbCollider('力寶中心第一座八角塔身縱向盒 Lippo Tower 1 Core B', T1.center.x, T1.center.z, T1.ry, 26.0, 38.0, P.baseY, T1.height),

    // Tower 2 核心雙十字八角定向盒
    makeObbCollider('力寶中心第二座八角塔身橫向盒 Lippo Tower 2 Core A', T2.center.x, T2.center.z, T2.ry, 34.0, 24.0, P.baseY, T2.height),
    makeObbCollider('力寶中心第二座八角塔身縱向盒 Lippo Tower 2 Core B', T2.center.x, T2.center.z, T2.ry, 24.0, 34.0, P.baseY, T2.height),

    // 基座中央主體核心（設於二樓以上商場，地面保持架空車道與人行淨空）
    makeObbCollider('力寶中心基座中央商場大堂 Lippo Centre Podium Core', podCenter.x, podCenter.z, 0, 38.0, 34.0, 12.0, P.topY),

    // 東側天橋欄杆（高架於地面車道之上）
    makeObbCollider('力寶中心金鐘道天橋側欄東段 East Skybridge Parapet North', 440.5, 328.0, 0, 0.4, 18.0, bridgeDeckY, bridgeDeckY + bridgeH),
    makeObbCollider('力寶中心金鐘道天橋側欄西段 East Skybridge Parapet South', 435.5, 328.0, 0, 0.4, 18.0, bridgeDeckY, bridgeDeckY + bridgeH),

    // 西側天橋欄杆
    makeObbCollider('力寶中心紅棉路天橋側欄北段 West Skybridge Parapet North', 356.0, 262.4, 0, 14.0, 0.4, bridgeDeckY, bridgeDeckY + bridgeH),
    makeObbCollider('力寶中心紅棉路天橋側欄南段 West Skybridge Parapet South', 356.0, 257.6, 0, 14.0, 0.4, bridgeDeckY, bridgeDeckY + bridgeH)
  ];

  // --- 8. 地標資訊註冊與統計數據（Landmark Registry & Statistics）---
  const landmarkTower1 = {
    id: 'lippo-centre-tower-one',
    name: T1.name,
    englishName: T1.englishName,
    position: {
      x: T1.center.x,
      y: P.baseY,
      z: T1.center.z
    },
    radius: 36.0,
    height: T1.crownTop
  };

  const landmarkTower2 = {
    id: 'lippo-centre-tower-two',
    name: T2.name,
    englishName: T2.englishName,
    position: {
      x: T2.center.x,
      y: P.baseY,
      z: T2.center.z
    },
    radius: 36.0,
    height: T2.crownTop
  };

  const stats = {
    lippoCentreLandmarks: 2,
    lippoCentreTowerOneHeight: T1.height,
    lippoCentreTowerOneCrownTop: T1.crownTop,
    lippoCentreTowerOneStoreys: T1.levels,
    lippoCentreTowerTwoHeight: T2.height,
    lippoCentreTowerTwoCrownTop: T2.crownTop,
    lippoCentreTowerTwoStoreys: T2.levels,
    lippoCentrePodiumHeight: P.height,
    lippoCentreBaseY: P.baseY,
    lippoCentreColliders: colliders.length,
    lippoCentreArchitect: LIPPO_CENTRE_HERITAGE.architects,
    lippoCentreCompletionYear: LIPPO_CENTRE_HERITAGE.completionYear,
    lippoCentreNickname: LIPPO_CENTRE_HERITAGE.nickname,
    lippoCentreStyle: LIPPO_CENTRE_HERITAGE.style
  };

  root.userData.stats = stats;

  return {
    group: root,
    colliders,
    landmarks: [landmarkTower1, landmarkTower2],
    towerOne: landmarkTower1,
    towerTwo: landmarkTower2,
    stats,
    site: LIPPO_CENTRE_SITE,
    groundHeightAt: (x, z, ground) => lippoCentreGroundHeightAt(x, z, ground)
  };
}
