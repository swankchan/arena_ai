// 中環街市（Central Market, 80 Des Voeux Road Central, 1939）3D 建築模型
// 忠實重現香港三級歷史建築與市建局保育活化地標：
// 包含包浩斯／現代流線型（Bauhaus / Streamline Moderne）四層水平長窗與挑檐遮陽板、流線型圓角轉角、
// 壯麗中央採光中庭（Atrium）與綠化廣場、何藩（Fan Ho）經典水磨石大樓梯（Terrazzo Grand Staircase）、
// 保育活化傳統街市檔位（經典紅燈罩鮮肉檔、海鮮魚檔、生果檔等）、半山行人扶手電梯空中天橋連接口、
// 以及復古雙語入口招牌（「中環街市」／"CENTRAL MARKET"）與 1939 年復古時鐘。
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  CENTRAL_MARKET_CENTER,
  CENTRAL_MARKET_BOUNDS,
  CENTRAL_MARKET_HEIGHTS,
  CENTRAL_MARKET_ATRIUM,
  CENTRAL_MARKET_STAIRCASE,
  CENTRAL_MARKET_FOOTBRIDGE,
  CENTRAL_MARKET_HERITAGE,
  CENTRAL_MARKET_STALLS,
  CENTRAL_MARKET_SITE,
  CENTRAL_MARKET_OSM_SOURCE,
  centralMarketLocalToWorld,
  centralMarketWorldToLocal,
  centralMarketGroundHeightAt
} from './central-market-site.js';

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
  if (!geo) throw new Error(`Central Market could not merge ${name}`);
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

function makeObbCollider(name, lx, lz, w, d, minY, maxY) {
  const p = centralMarketLocalToWorld(lx, lz);
  const ry = CENTRAL_MARKET_CENTER.ry;
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const hx = w * 0.5, hz = d * 0.5;
  return {
    name,
    shape: 'box',
    x: p.x,
    z: p.z,
    w,
    d,
    ry,
    minY,
    maxY,
    minX: p.x - (Math.abs(cs) * hx + Math.abs(sn) * hz),
    maxX: p.x + (Math.abs(cs) * hx + Math.abs(sn) * hz),
    minZ: p.z - (Math.abs(sn) * hx + Math.abs(cs) * hz),
    maxZ: p.z + (Math.abs(sn) * hx + Math.abs(cs) * hz),
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn }
  };
}

export function buildCentralMarket(scene) {
  const root = new THREE.Group();
  root.name = '中環街市 Central Market (80 Des Voeux Road Central)';
  scene.add(root);

  // 本地坐標建築群（自帶中心坐標與對齊周邊道路之旋轉角）
  const buildingGroup = new THREE.Group();
  buildingGroup.name = 'Central Market Local Group';
  buildingGroup.position.set(CENTRAL_MARKET_CENTER.x, 0, CENTRAL_MARKET_CENTER.z);
  buildingGroup.rotation.y = CENTRAL_MARKET_CENTER.ry;
  root.add(buildingGroup);

  const B = CENTRAL_MARKET_BOUNDS;
  const H = CENTRAL_MARKET_HEIGHTS;
  const A = CENTRAL_MARKET_ATRIUM;

  // --- 1. 材質調色盤（包浩斯米白抹灰、混凝土流線型挑檐、水磨石、紅燈罩與復古古銅）---
  const stuccoMat = new THREE.MeshStandardMaterial({
    color: 0xe8e4dc, // Streamline Bauhaus warm off-white stucco
    roughness: 0.72,
    metalness: 0.05
  });

  const finMat = new THREE.MeshStandardMaterial({
    color: 0xdedad2, // Cantilevered horizontal concrete sunshade louvers / fins
    roughness: 0.65,
    metalness: 0.08
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0x8a867e, // Granite ashlar plinth skirting
    roughness: 0.88,
    metalness: 0.02
  });

  const glassMat = new THREE.MeshStandardNodeMaterial({
    color: 0x425664, // Architectural ribbon window glazing
    roughness: 0.15,
    metalness: 0.82
  });
  glassMat.emissiveNode = color(0xffdfa8).mul(nightAmount().mul(0.35));

  const mullionMat = new THREE.MeshStandardMaterial({
    color: 0x282a2b, // Dark steel ribbon window mullions and transom frames
    roughness: 0.45,
    metalness: 0.55
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x5e6366, // Roof deck membrane & standing seam monitor roof
    roughness: 0.8,
    metalness: 0.2
  });

  const atriumPlazaMat = new THREE.MeshStandardMaterial({
    color: 0xc2beb5, // Light granite courtyard pavers
    roughness: 0.82,
    metalness: 0.04
  });

  const atriumLawnMat = new THREE.MeshStandardMaterial({
    color: 0x3d6b38, // Lush synthetic community green lawn ("Playground for All")
    roughness: 0.92,
    metalness: 0.0
  });

  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x8c5a38, // Teak communal tables, bench slats & staircase handrails
    roughness: 0.58,
    metalness: 0.05
  });

  const terrazzoGreenMat = new THREE.MeshStandardMaterial({
    color: 0x1e3d2f, // Historic Fan Ho Hong Kong deep green polished terrazzo
    roughness: 0.32,
    metalness: 0.12
  });

  const terrazzoRedMat = new THREE.MeshStandardMaterial({
    color: 0x7a382c, // Oxblood red / terracotta polished terrazzo landings & borders
    roughness: 0.34,
    metalness: 0.1
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xb59a57, // Brushed brass stair nosing strips & balustrade brackets
    roughness: 0.35,
    metalness: 0.82
  });

  const marketTileMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f2, // White glazed ceramic subway tile stall counters
    roughness: 0.22,
    metalness: 0.05
  });

  const porkLampMat = new THREE.MeshStandardNodeMaterial({
    color: 0xd8261c, // Iconic Hong Kong wet-market red lampshade pendants (紅色雞蛋燈罩)
    roughness: 0.35,
    metalness: 0.1
  });
  porkLampMat.emissiveNode = color(0xff3322).mul(nightAmount().mul(0.65).add(0.35));

  const footbridgeMat = new THREE.MeshStandardMaterial({
    color: 0xdcd8d0, // Streamlined aluminium composite footbridge panels
    roughness: 0.48,
    metalness: 0.42
  });

  const clockDialMat = new THREE.MeshStandardNodeMaterial({
    color: 0xfaf7f0, // Vintage retro clock dial with illuminated night backlight
    roughness: 0.4,
    metalness: 0.1
  });
  clockDialMat.emissiveNode = color(0xfffaed).mul(nightAmount().mul(0.45));

  const goldSignMat = new THREE.MeshStandardNodeMaterial({
    color: 0xd4af37, // Polished golden bilingual lettering: 「中環街市」 / "CENTRAL MARKET"
    roughness: 0.28,
    metalness: 0.88
  });
  goldSignMat.emissiveNode = color(0xffdf77).mul(nightAmount().mul(0.4));

  // 收集各幾何體部件清單
  const parts = {
    foundation: [],
    stucco: [],
    fins: [],
    glass: [],
    mullions: [],
    atrium: [],
    lawn: [],
    timber: [],
    terrazzoGreen: [],
    terrazzoRed: [],
    brass: [],
    marketTiles: [],
    porkLamps: [],
    footbridge: [],
    roof: [],
    clocks: [],
    signs: []
  };

  // --- 2. 地基與花崗岩護壁（Substructure & Granite Plinth Skirt）---
  // 順應德輔道中（Y~5.5m）至皇后大道中（Y~8.34m）之地勢坡度，延伸至 3.50m 封閉地形
  const skirtH = H.baseY - H.foundationY;
  box(parts.foundation, [0, H.foundationY + skirtH * 0.5, 0], [B.width + 0.4, skirtH, B.depth + 0.4]);

  // 南面（皇后大道中）台階廣場銜接基座
  box(parts.foundation, [0, 7.0, 34.0], [B.width + 0.2, 3.0, 5.0]);
  for (let s = 0; s < 6; s++) {
    const stepY = 7.0 + s * 0.22;
    box(parts.foundation, [0, stepY, 36.5 + s * 0.4], [18.0, 0.22, 0.4]);
  }

  // --- 3. 四面現代流線型立面與圓弧轉角（Streamline Bauhaus Facades & Curved Corners）---
  const R = B.cornerRadius; // 2.8m 圓弧半徑
  const innerW = B.halfWidth - R; // 19.5 - 2.8 = 16.7m
  const innerD = B.halfDepth - R; // 36.0 - 2.8 = 33.2m

  // 樓層層高參數
  // G/F: 5.50 - 10.00 (h=4.5)
  // 1/F: 10.00 - 14.20 (h=4.2)
  // 2/F: 14.20 - 18.40 (h=4.2)
  // Parapet: 18.40 - 19.60 (h=1.2)
  const floorLevels = [
    { y0: H.baseY, y1: H.groundFloorTop },
    { y0: H.groundFloorTop, y1: H.firstFloorTop },
    { y0: H.firstFloorTop, y1: H.secondFloorTop }
  ];

  // 四個圓弧轉角中心點與柱面方位角（NW, NE, SE, SW）
  const cornerSpecs = [
    { name: 'NW', cx: -innerW, cz: -innerD, thetaStart: Math.PI, thetaLength: Math.PI * 0.5 },
    { name: 'NE', cx: innerW, cz: -innerD, thetaStart: Math.PI * 0.5, thetaLength: Math.PI * 0.5 },
    { name: 'SE', cx: innerW, cz: innerD, thetaStart: 0, thetaLength: Math.PI * 0.5 },
    { name: 'SW', cx: -innerW, cz: innerD, thetaStart: -Math.PI * 0.5, thetaLength: Math.PI * 0.5 }
  ];

  // 生成四個圓弧轉角牆體
  for (const c of cornerSpecs) {
    const wallH = H.roofParapetTop - H.baseY;
    cylinder(parts.stucco, [c.cx, H.baseY + wallH * 0.5, c.cz], R, wallH, 12, R, false, c.thetaStart, c.thetaLength);
  }

  // 筆直外牆段：
  // 北立面（德輔道中，lz = -36.0）：X in [-innerW, innerW]，中間預留 10m 主門廊
  box(parts.stucco, [-11.0, (H.baseY + H.roofParapetTop) * 0.5, -B.halfDepth], [11.4, H.roofParapetTop - H.baseY, 0.4]);
  box(parts.stucco, [11.0, (H.baseY + H.roofParapetTop) * 0.5, -B.halfDepth], [11.4, H.roofParapetTop - H.baseY, 0.4]);
  // 北立面門廊上方牆樑
  box(parts.stucco, [0, 11.5, -B.halfDepth], [10.6, 3.0, 0.4]);
  box(parts.stucco, [0, 16.5, -B.halfDepth], [10.6, 3.0, 0.4]);
  box(parts.stucco, [0, 19.0, -B.halfDepth], [10.6, 1.2, 0.4]);

  // 南立面（皇后大道中，lz = +36.0）：X in [-innerW, innerW]，中間預留 10m 主門廊
  box(parts.stucco, [-11.0, (H.baseY + H.roofParapetTop) * 0.5, B.halfDepth], [11.4, H.roofParapetTop - H.baseY, 0.4]);
  box(parts.stucco, [11.0, (H.baseY + H.roofParapetTop) * 0.5, B.halfDepth], [11.4, H.roofParapetTop - H.baseY, 0.4]);
  // 南立面門廊上方牆樑
  box(parts.stucco, [0, 11.5, B.halfDepth], [10.6, 3.0, 0.4]);
  box(parts.stucco, [0, 16.5, B.halfDepth], [10.6, 3.0, 0.4]);
  box(parts.stucco, [0, 19.0, B.halfDepth], [10.6, 1.2, 0.4]);

  // 西立面（租庇利街，lx = -19.5）與 東立面（域多利皇后街，lx = +19.5）
  // 經典包浩斯水平橫帶長窗與窗間實牆交替
  for (const sideX of [-B.halfWidth, B.halfWidth]) {
    // 窗台牆胸（Spandrels）於各層地板線
    box(parts.stucco, [sideX, (H.baseY + 6.6) * 0.5, 0], [0.4, 6.6 - H.baseY, innerD * 2]);
    box(parts.stucco, [sideX, (10.0 + 11.0) * 0.5, 0], [0.4, 1.0, innerD * 2]);
    box(parts.stucco, [sideX, (13.6 + 15.0) * 0.5, 0], [0.4, 1.4, innerD * 2]);
    box(parts.stucco, [sideX, (17.6 + H.roofParapetTop) * 0.5, 0], [0.4, H.roofParapetTop - 17.6, innerD * 2]);

    // 垂直柱墩（Piers）間隔
    for (let pz = -innerD + 3.0; pz <= innerD - 3.0; pz += 6.4) {
      box(parts.stucco, [sideX, (H.baseY + H.roofParapetTop) * 0.5, pz], [0.45, H.roofParapetTop - H.baseY, 0.8]);
    }
  }

  // --- 4. 標誌性橫向流線型混凝土挑檐遮陽板（Continuous Horizontal Streamline Cantilever Fins）---
  // 貫穿四面包浩斯橫向線條，各層設置突出 0.5m 的流線型線腳挑檐
  const finElevations = [9.80, 14.00, 18.20, 19.60];
  const finThick = 0.22;
  const finProtrusion = 0.52;

  for (const fy of finElevations) {
    // 北、南兩側橫向遮陽板
    box(parts.fins, [0, fy, -B.halfDepth - finProtrusion * 0.5], [innerW * 2 + 0.1, finThick, finProtrusion + 0.1]);
    box(parts.fins, [0, fy, B.halfDepth + finProtrusion * 0.5], [innerW * 2 + 0.1, finThick, finProtrusion + 0.1]);

    // 東、西兩側橫向遮陽板
    box(parts.fins, [-B.halfWidth - finProtrusion * 0.5, fy, 0], [finProtrusion + 0.1, finThick, innerD * 2 + 0.1]);
    box(parts.fins, [B.halfWidth + finProtrusion * 0.5, fy, 0], [finProtrusion + 0.1, finThick, innerD * 2 + 0.1]);

    // 四個圓角的弧形挑檐銜接
    for (const c of cornerSpecs) {
      cylinder(
        parts.fins,
        [c.cx, fy, c.cz],
        R + finProtrusion,
        finThick,
        12,
        R + finProtrusion,
        false,
        c.thetaStart,
        c.thetaLength
      );
    }
  }

  // --- 5. 水平長帶鋼窗與反光玻璃（Continuous Ribbon Band Windows & Steel Mullions）---
  // 1/F 與 2/F 東西兩側長帶窗
  const windowBands = [
    { yMin: 11.0, yMax: 13.6 }, // 1/F ribbon window
    { yMin: 15.0, yMax: 17.6 }  // 2/F ribbon window
  ];

  for (const band of windowBands) {
    const bandH = band.yMax - band.yMin;
    const bandMidY = (band.yMin + band.yMax) * 0.5;

    // 東西長帶窗玻璃
    box(parts.glass, [-B.halfWidth + 0.05, bandMidY, 0], [0.08, bandH - 0.1, innerD * 2]);
    box(parts.glass, [B.halfWidth - 0.05, bandMidY, 0], [0.08, bandH - 0.1, innerD * 2]);

    // 鋼製窗框豎櫺（Mullions）
    for (let wz = -innerD; wz <= innerD; wz += 1.6) {
      box(parts.mullions, [-B.halfWidth, bandMidY, wz], [0.18, bandH, 0.08]);
      box(parts.mullions, [B.halfWidth, bandMidY, wz], [0.18, bandH, 0.08]);
    }
    // 橫櫺（Transoms）
    box(parts.mullions, [-B.halfWidth, bandMidY, 0], [0.15, 0.08, innerD * 2]);
    box(parts.mullions, [B.halfWidth, bandMidY, 0], [0.15, 0.08, innerD * 2]);

    // 南北兩端立面落地條窗
    box(parts.glass, [-11.0, bandMidY, -B.halfDepth + 0.05], [9.0, bandH - 0.1, 0.08]);
    box(parts.glass, [11.0, bandMidY, -B.halfDepth + 0.05], [9.0, bandH - 0.1, 0.08]);
    box(parts.glass, [-11.0, bandMidY, B.halfDepth - 0.05], [9.0, bandH - 0.1, 0.08]);
    box(parts.glass, [11.0, bandMidY, B.halfDepth - 0.05], [9.0, bandH - 0.1, 0.08]);
  }

  // --- 6. 南北兩大主入口門廊與次入口（Monumental Entrance Portals & Porticos）---
  // 北門廊（德輔道中 Des Voeux Road Central Entrance, lz = -36.0）
  // 雄偉雙層挑高內縮門廊，帶雨棚與深邃入口大堂
  box(parts.stucco, [0, 7.8, -B.halfDepth + 1.2], [10.0, 4.6, 2.2]);
  box(parts.fins, [0, 9.5, -B.halfDepth - 1.2], [10.8, 0.35, 2.4]); // 門廊水平出挑大雨棚
  box(parts.glass, [0, 7.5, -B.halfDepth + 0.2], [8.8, 3.8, 0.1]); // 玻璃自動旋轉門與門斗
  box(parts.mullions, [0, 7.5, -B.halfDepth + 0.2], [9.0, 3.8, 0.15]);

  // 南門廊（皇后大道中 Queen's Road Central Entrance, lz = +36.0）
  // 順應半山地勢直通 1/F 樓層
  box(parts.stucco, [0, 11.2, B.halfDepth - 1.2], [10.0, 4.2, 2.2]);
  box(parts.fins, [0, 13.8, B.halfDepth + 1.2], [10.8, 0.35, 2.4]); // 南雨棚
  box(parts.glass, [0, 11.2, B.halfDepth - 0.2], [8.8, 3.8, 0.1]);
  box(parts.mullions, [0, 11.2, B.halfDepth - 0.2], [9.0, 3.8, 0.15]);

  // 東西側巷人行次入口（Jubilee St & Queen Victoria St Pedestrian Gates）
  for (const sideX of [-B.halfWidth, B.halfWidth]) {
    box(parts.fins, [sideX + (sideX > 0 ? 0.6 : -0.6), 8.8, 0], [1.2, 0.2, 4.8]);
    box(parts.glass, [sideX, 7.2, 0], [0.1, 3.2, 4.2]);
  }

  // --- 7. 中央採光中庭與空中綠化廣場（Central Lightwell Atrium & Courtyard Plaza）---
  // 中庭開口：X in [-9.0, 9.0]，Z in [-14.0, 14.0]，縱貫 G/F 至採光天窗
  // 地下層花崗岩鋪面與中央人造草坪（"Playground for All" 綠化休閒核心）
  box(parts.atrium, [0, A.groundLawnY, 0], [A.width + 2.0, 0.1, A.depth + 2.0]);
  box(parts.lawn, [0, A.groundLawnY + 0.02, 0], [12.0, 0.04, 18.0]);

  // 中庭休閒原木桌椅（Communal Tables & Timber Benches）
  for (const tz of [-6.0, 0, 6.0]) {
    for (const tx of [-3.5, 3.5]) {
      box(parts.timber, [tx, A.groundLawnY + 0.75, tz], [1.2, 0.1, 2.4]); // 桌面
      box(parts.mullions, [tx, A.groundLawnY + 0.38, tz], [0.1, 0.7, 2.2]); // 鋼腳
      box(parts.timber, [tx - 0.8, A.groundLawnY + 0.45, tz], [0.4, 0.08, 2.4]); // 長椅
      box(parts.timber, [tx + 0.8, A.groundLawnY + 0.45, tz], [0.4, 0.08, 2.4]);
    }
  }

  // 1/F 與 2/F 環形挑空迴廊與流線型安全欄杆（Cantilevered Gallery Walkways）
  const galleryLevels = [H.groundFloorTop, H.firstFloorTop];
  for (const gy of galleryLevels) {
    // 迴廊挑檐樓板
    box(parts.atrium, [0, gy, -A.maxZ - A.balconyWidth * 0.5], [A.width + 4.0, 0.3, A.balconyWidth]);
    box(parts.atrium, [0, gy, A.maxZ + A.balconyWidth * 0.5], [A.width + 4.0, 0.3, A.balconyWidth]);
    box(parts.atrium, [-A.maxX - A.balconyWidth * 0.5, gy, 0], [A.balconyWidth, 0.3, A.depth]);
    box(parts.atrium, [A.maxX + A.balconyWidth * 0.5, gy, 0], [A.balconyWidth, 0.3, A.depth]);

    // 水平鋼管流線型安全護欄（Streamline Balustrades）
    const railY = gy + 0.55;
    box(parts.mullions, [0, railY, -A.maxZ], [A.width, 1.05, 0.08]);
    box(parts.mullions, [0, railY, A.maxZ], [A.width, 1.05, 0.08]);
    box(parts.mullions, [-A.maxX, railY, 0], [0.08, 1.05, A.depth]);
    box(parts.mullions, [A.maxX, railY, 0], [0.08, 1.05, A.depth]);
    // 柚木扶手面管（Teak Cap Rail）
    box(parts.timber, [0, gy + 1.1, -A.maxZ], [A.width, 0.08, 0.15]);
    box(parts.timber, [0, gy + 1.1, A.maxZ], [A.width, 0.08, 0.15]);
    box(parts.timber, [-A.maxX, gy + 1.1, 0], [0.15, 0.08, A.depth]);
    box(parts.timber, [A.maxX, gy + 1.1, 0], [0.15, 0.08, A.depth]);
  }

  // 中庭現代透光玻璃觀光升降機塔（Modern Transparent Panoramic Glass Lift Tower）
  const liftX = -6.5, liftZ = -10.5;
  const liftH = H.secondFloorTop - H.baseY + 1.0;
  box(parts.mullions, [liftX, H.baseY + liftH * 0.5, liftZ], [2.4, liftH, 2.4]);
  box(parts.glass, [liftX, H.baseY + liftH * 0.5, liftZ], [2.2, liftH - 0.2, 2.2]);
  // 升降機轎廂（Elevator Cab）
  box(parts.timber, [liftX, H.groundFloorTop + 1.2, liftZ], [1.9, 2.4, 1.9]);

  // --- 8. 何藩攝影特展・經典水磨石大樓梯（Fan Ho Iconic Terrazzo Grand Staircases）---
  // 位於北面玄關連接 G/F 至 1/F 及 2/F 的經典紅綠水磨石大樓梯，再現 1950 年代香港經典光影
  const S = CENTRAL_MARKET_STAIRCASE;
  const stairW = S.maxX - S.minX; // 16.0m
  const stairSteps = S.steps;
  const stairRise = (H.groundFloorTop - H.baseY) / stairSteps; // ~0.1875m
  const stairTread = (S.maxZ - S.minZ) / stairSteps; // ~0.416m

  for (let st = 0; st < stairSteps; st++) {
    const curY = H.baseY + st * stairRise;
    const curZ = S.minZ + st * stairTread;

    // 踏步（深綠色水磨石 Treads）
    box(parts.terrazzoGreen, [0, curY + stairRise * 0.5, curZ], [stairW, stairRise, stairTread + 0.04]);
    // 踏步前端銅質防滑收邊壓條（Brushed Brass Nosing Strip）
    box(parts.brass, [0, curY + stairRise, curZ - stairTread * 0.5], [stairW, 0.03, 0.04]);

    // 每 8 階設紅赭水磨石休息平台轉折（Oxblood Red Terrazzo Landings）
    if (st % 8 === 7) {
      box(parts.terrazzoRed, [0, curY + stairRise * 0.5, curZ], [stairW, stairRise, stairTread * 2.0]);
    }
  }

  // 大樓梯兩側流線型水磨石實心圓角欄杆矮牆
  const stairWallH = 1.1;
  for (const bx of [S.minX - 0.3, S.maxX + 0.3]) {
    box(parts.terrazzoRed, [bx, (H.baseY + H.groundFloorTop) * 0.5 + stairWallH * 0.5, (S.minZ + S.maxZ) * 0.5], [0.4, H.groundFloorTop - H.baseY + stairWallH, S.maxZ - S.minZ]);
    box(parts.brass, [bx, (H.baseY + H.groundFloorTop) * 0.5 + stairWallH, (S.minZ + S.maxZ) * 0.5], [0.44, 0.06, S.maxZ - S.minZ]);
  }

  // 西側斜向遮陽傾斜隔板（Angled Light Louvers - 營造何藩經典「靠近陰影」斜向陽光光束）
  for (let ly = H.baseY + 1.0; ly <= H.groundFloorTop + 2.0; ly += 0.9) {
    box(parts.fins, [S.minX - 2.5, ly, (S.minZ + S.maxZ) * 0.5], [0.1, 0.35, S.maxZ - S.minZ], 0.45);
  }

  // 何藩攝影紀念牌匾（Fan Ho Memorial Heritage Plaque）
  box(parts.brass, [0, H.baseY + 2.4, S.maxZ + 0.2], [2.4, 1.2, 0.06]);
  box(parts.timber, [0, H.baseY + 2.4, S.maxZ + 0.18], [2.5, 1.3, 0.04]);

  // --- 9. 保育活化傳統街市檔位（Preserved Heritage Market Stalls & Red Lampshades）---
  // 經典紅燈罩鮮肉檔、海鮮魚檔、家禽檔、蔬果檔與文創手作市集
  const stallSpecs = [
    // G/F 傳統濕街市（經典紅燈罩肉檔、海鮮檔）
    { floorY: H.baseY, zPos: -6.0, type: 'pork', hasLamps: true },
    { floorY: H.baseY, zPos: 0.0, type: 'fish', hasLamps: true },
    { floorY: H.baseY, zPos: 6.0, type: 'poultry', hasLamps: false },
    // 1/F 生果蔬菜檔與本土特產檔口
    { floorY: H.groundFloorTop, zPos: -6.0, type: 'fruit', hasLamps: true },
    { floorY: H.groundFloorTop, zPos: 0.0, type: 'veggie', hasLamps: true },
    { floorY: H.groundFloorTop, zPos: 6.0, type: 'tea', hasLamps: false }
  ];

  for (const st of stallSpecs) {
    for (const sx of [-13.5, 13.5]) {
      const counterH = 0.95;
      const counterW = 3.6;
      const counterD = 2.2;
      const counterY = st.floorY + counterH * 0.5;

      // 白色釉面小方磚檔台主體（Subway Tile Counter Body）
      box(parts.marketTiles, [sx, counterY, st.zPos], [counterW, counterH, counterD]);
      // 砧板與原木展示檯面（Teak Butcher Block / Display Board）
      box(parts.timber, [sx, st.floorY + counterH + 0.04, st.zPos], [counterW + 0.1, 0.08, counterD + 0.1]);

      // 經典紅色雞蛋燈罩吊燈（Suspended Hong Kong Wet-Market Red Lampshades）
      if (st.hasLamps) {
        for (const lampOffset of [-1.0, 1.0]) {
          const lampX = sx + lampOffset;
          const lampY = st.floorY + 2.4;
          // 細鋼索吊線（Suspension Cord）
          cylinder(parts.mullions, [lampX, lampY + 0.6, st.zPos], 0.015, 1.2, 6);
          // 紅色倒錐形燈罩（Classic Red Lamp Dome）
          cylinder(parts.porkLamps, [lampX, lampY, st.zPos], 0.28, 0.22, 12, 0.08);
          // 內嵌發光暖白燈泡（Emissive Bulb Core）
          sphere(parts.clocks, [lampX, lampY - 0.08, st.zPos], 0.09, 8);
        }
      }
    }
  }

  // --- 10. 半山行人扶手電梯空中天橋連接口（Mid-Levels Escalator Pedestrian Footbridge Spine）---
  // 位於 2/F（Y = 14.20m）的 24 小時公眾行人走廊通道
  // 北連德輔道中過街天橋（通往恒生銀行總行／IFC），南連皇后大道中過街天橋（直達閣麟街半山電梯起點）
  const FB = CENTRAL_MARKET_FOOTBRIDGE;
  const bridgeFloorY = FB.deckY;
  const bridgeCeilY = FB.ceilingY;
  const bridgeH = bridgeCeilY - bridgeFloorY;

  // 北跨天橋延伸段（North Bridge Stub over Des Voeux Road, Z: -36.0 to -42.0）
  const nBridgeLen = Math.abs(FB.northExtensionZ - (-B.halfDepth)); // 6.0m
  const nBridgeMidZ = (-B.halfDepth + FB.northExtensionZ) * 0.5;
  box(parts.footbridge, [0, bridgeFloorY - 0.2, nBridgeMidZ], [FB.width, 0.4, nBridgeLen]); // 橋面底板
  box(parts.footbridge, [0, bridgeCeilY + 0.2, nBridgeMidZ], [FB.width + 0.2, 0.4, nBridgeLen]); // 頂棚
  box(parts.glass, [-FB.width * 0.5, bridgeFloorY + bridgeH * 0.5, nBridgeMidZ], [0.1, bridgeH - 0.2, nBridgeLen]); // 兩側玻璃幕牆
  box(parts.glass, [FB.width * 0.5, bridgeFloorY + bridgeH * 0.5, nBridgeMidZ], [0.1, bridgeH - 0.2, nBridgeLen]);
  box(parts.mullions, [-FB.width * 0.5, bridgeFloorY + bridgeH * 0.5, nBridgeMidZ], [0.15, bridgeH, nBridgeLen]);
  box(parts.mullions, [FB.width * 0.5, bridgeFloorY + bridgeH * 0.5, nBridgeMidZ], [0.15, bridgeH, nBridgeLen]);

  // 南跨天橋延伸段（South Bridge Stub over Queen's Road, Z: 36.0 to 42.0）
  const sBridgeLen = FB.southExtensionZ - B.halfDepth; // 6.0m
  const sBridgeMidZ = (B.halfDepth + FB.southExtensionZ) * 0.5;
  box(parts.footbridge, [0, bridgeFloorY - 0.2, sBridgeMidZ], [FB.width, 0.4, sBridgeLen]);
  box(parts.footbridge, [0, bridgeCeilY + 0.2, sBridgeMidZ], [FB.width + 0.2, 0.4, sBridgeLen]);
  box(parts.glass, [-FB.width * 0.5, bridgeFloorY + bridgeH * 0.5, sBridgeMidZ], [0.1, bridgeH - 0.2, sBridgeLen]);
  box(parts.glass, [FB.width * 0.5, bridgeFloorY + bridgeH * 0.5, sBridgeMidZ], [0.1, bridgeH - 0.2, sBridgeLen]);
  box(parts.mullions, [-FB.width * 0.5, bridgeFloorY + bridgeH * 0.5, sBridgeMidZ], [0.15, bridgeH, sBridgeLen]);
  box(parts.mullions, [FB.width * 0.5, bridgeFloorY + bridgeH * 0.5, sBridgeMidZ], [0.15, bridgeH, sBridgeLen]);

  // 天橋內部行人指示標誌牌（Pedestrian Directional Wayfinding Signage）
  box(parts.timber, [0, bridgeCeilY - 0.35, nBridgeMidZ], [3.2, 0.45, 0.08]);
  box(parts.timber, [0, bridgeCeilY - 0.35, sBridgeMidZ], [3.2, 0.45, 0.08]);

  // --- 11. 屋頂構造與中央採光天窗監視樓（Roof Deck, Parapet & Central Skylight Clerestory Monitor）---
  // 主屋面平頂（Roof Flat Slab at Y = 18.40m）
  box(parts.roof, [0, H.secondFloorTop + 0.15, 0], [B.width - 0.2, 0.3, B.depth - 0.2]);

  // 外圈護欄胸牆（Roof Parapet Walls）
  const parH = H.roofParapetTop - H.secondFloorTop; // 1.2m
  const parY = H.secondFloorTop + parH * 0.5;
  box(parts.stucco, [0, parY, -B.halfDepth + 0.25], [innerW * 2, parH, 0.5]);
  box(parts.stucco, [0, parY, B.halfDepth - 0.25], [innerW * 2, parH, 0.5]);
  box(parts.stucco, [-B.halfWidth + 0.25, parY, 0], [0.5, parH, innerD * 2]);
  box(parts.stucco, [B.halfWidth - 0.25, parY, 0], [0.5, parH, innerD * 2]);

  // 中庭上方包浩斯通風採光天窗監視樓（Clerestory Skylight Monitor Roof, 18.4m -> 23.5m）
  const monBaseY = H.secondFloorTop;
  const monH = H.monitorRoofTop - monBaseY; // 5.1m
  // 監視樓側壁與水平百葉
  box(parts.stucco, [0, monBaseY + monH * 0.5, -A.maxZ], [A.width + 1.0, monH, 0.4]);
  box(parts.stucco, [0, monBaseY + monH * 0.5, A.maxZ], [A.width + 1.0, monH, 0.4]);
  box(parts.stucco, [-A.maxX, monBaseY + monH * 0.5, 0], [0.4, monH, A.depth + 1.0]);
  box(parts.stucco, [A.maxX, monBaseY + monH * 0.5, 0], [0.4, monH, A.depth + 1.0]);
  // 監視樓頂部折板採光坡屋頂（Slanted Monitor Glass Skylight Roof）
  box(parts.roof, [0, H.monitorRoofTop, 0], [A.width + 1.6, 0.4, A.depth + 1.6]);
  box(parts.glass, [0, H.monitorRoofTop - 0.2, 0], [A.width - 0.2, 0.1, A.depth - 0.2]);

  // 屋頂現代環保設施（HVAC 機房隔音屏障與太陽能光伏板陣列）
  for (const rx of [-12.0, 12.0]) {
    for (const rz of [-24.0, 24.0]) {
      // 冷卻塔與通風機房方盒
      box(parts.roof, [rx, monBaseY + 1.4, rz], [4.2, 2.8, 5.0]);
      // 百葉格柵
      box(parts.mullions, [rx, monBaseY + 1.4, rz], [4.4, 2.8, 5.2]);
    }
    // 太陽能光伏電池板（Photovoltaic Solar Panels）
    box(parts.glass, [rx, monBaseY + 0.45, 0], [4.8, 0.15, 12.0], 0.15);
  }

  // --- 12. 復古指針時鐘與門廊雙語招牌（Vintage Mechanical Clocks & Heritage Signage）---
  // 北入口時鐘（德輔道中，Z = -36.25, Y = 11.2m）
  const clockR = 1.1;
  cylinder(parts.brass, [0, 11.2, -B.halfDepth - 0.22], clockR + 0.12, 0.2, 24, clockR + 0.12, false, 0, Math.PI * 2);
  cylinder(parts.clocks, [0, 11.2, -B.halfDepth - 0.25], clockR, 0.15, 24, clockR, false, 0, Math.PI * 2);
  // 時針與分針（指向 10:10 經典迎客時刻）
  box(parts.mullions, [0.22, 11.35, -B.halfDepth - 0.35], [0.08, 0.55, 0.04], 0.5);
  box(parts.mullions, [-0.28, 11.45, -B.halfDepth - 0.35], [0.06, 0.75, 0.04], -0.6);

  // 南入口時鐘（皇后大道中，Z = +36.25, Y = 15.2m）
  cylinder(parts.brass, [0, 15.2, B.halfDepth + 0.22], clockR + 0.12, 0.2, 24, clockR + 0.12, false, 0, Math.PI * 2);
  cylinder(parts.clocks, [0, 15.2, B.halfDepth + 0.25], clockR, 0.15, 24, clockR, false, 0, Math.PI * 2);
  box(parts.mullions, [0.22, 15.35, B.halfDepth + 0.35], [0.08, 0.55, 0.04], 0.5);
  box(parts.mullions, [-0.28, 15.45, B.halfDepth + 0.35], [0.06, 0.75, 0.04], -0.6);

  // 雙語立體金字招牌（Bilingual Raised Lettering Plaques）
  // 北面招牌：「中 環 街 市」 & "CENTRAL MARKET"
  box(parts.signs, [0, 12.8, -B.halfDepth - 0.12], [8.0, 0.95, 0.12]);
  box(parts.signs, [0, 10.3, -B.halfDepth - 0.12], [7.2, 0.45, 0.12]);
  // 南面招牌
  box(parts.signs, [0, 16.8, B.halfDepth + 0.12], [8.0, 0.95, 0.12]);
  box(parts.signs, [0, 14.3, B.halfDepth + 0.12], [7.2, 0.45, 0.12]);

  // --- 13. 合併幾何體並加入建築群（Merge Geometries into Three.js Mesh Group）---
  safeMerged(buildingGroup, parts.foundation, foundationMat, '中環街市花崗岩地基基座 Central Market Foundation');
  safeMerged(buildingGroup, parts.stucco, stuccoMat, '中環街市包浩斯米白立面 Central Market Bauhaus Stucco');
  safeMerged(buildingGroup, parts.fins, finMat, '中環街市流線型橫向挑檐遮陽板 Central Market Cantilever Fins');
  safeMerged(buildingGroup, parts.glass, glassMat, '中環街市水平長帶窗玻璃 Central Market Ribbon Windows');
  safeMerged(buildingGroup, parts.mullions, mullionMat, '中環街市鋼窗櫺與金屬框 Central Market Steel Mullions');
  safeMerged(buildingGroup, parts.atrium, atriumPlazaMat, '中環街市採光中庭與迴廊 Central Market Atrium & Galleries');
  safeMerged(buildingGroup, parts.lawn, atriumLawnMat, '中環街市中庭綠茵廣場 Central Market Community Lawn');
  safeMerged(buildingGroup, parts.timber, timberMat, '中環街市原木桌椅與扶手 Central Market Timber Benches & Rails');
  safeMerged(buildingGroup, parts.terrazzoGreen, terrazzoGreenMat, '中環街市何藩經典綠水磨石大樓梯 Central Market Fan Ho Green Terrazzo');
  safeMerged(buildingGroup, parts.terrazzoRed, terrazzoRedMat, '中環街市紅水磨石平台踏面 Central Market Red Terrazzo');
  safeMerged(buildingGroup, parts.brass, brassMat, '中環街市純銅防滑條與紀念牌匾 Central Market Brass Trim & Plaque');
  safeMerged(buildingGroup, parts.marketTiles, marketTileMat, '中環街市傳統瓷磚檔位 Central Market Subway Tile Stalls');
  safeMerged(buildingGroup, parts.porkLamps, porkLampMat, '中環街市經典紅色雞蛋燈罩吊燈 Central Market Red Pork Lamps');
  safeMerged(buildingGroup, parts.footbridge, footbridgeMat, '中環街市半山電梯天橋接口 Central Market Mid-Levels Footbridge');
  safeMerged(buildingGroup, parts.roof, roofMat, '中環街市平屋面與通風採光天窗 Central Market Roof & Monitor');
  safeMerged(buildingGroup, parts.clocks, clockDialMat, '中環街市復古機械指針時鐘 Central Market Vintage Clocks');
  safeMerged(buildingGroup, parts.signs, goldSignMat, '中環街市雙語燙金門額招牌 Central Market Gold Signage');

  // --- 14. 碰撞體清單（精確對齊並維持與四面包圍路網零衝突之安全淨空）---
  // 保持北、南大門廊通行暢通，便於玩家自由走入大堂、水磨石大樓梯與二樓半山行人天橋
  const colliders = [
    makeObbCollider('中環街市西外牆 West Wall', -19.25, 0, 0.5, 66.0, H.baseY, H.roofParapetTop),
    makeObbCollider('中環街市東外牆 East Wall', 19.25, 0, 0.5, 66.0, H.baseY, H.roofParapetTop),
    makeObbCollider('中環街市北外牆西段 North Wall West', -11.0, -35.75, 11.0, 0.5, H.baseY, H.roofParapetTop),
    makeObbCollider('中環街市北外牆東段 North Wall East', 11.0, -35.75, 11.0, 0.5, H.baseY, H.roofParapetTop),
    makeObbCollider('中環街市南外牆西段 South Wall West', -11.0, 35.75, 11.0, 0.5, H.baseY, H.roofParapetTop),
    makeObbCollider('中環街市南外牆東段 South Wall East', 11.0, 35.75, 11.0, 0.5, H.baseY, H.roofParapetTop),
    makeObbCollider('中環街市水磨石大樓梯 Terrazzo Grand Staircase', 0, -23.0, 16.0, 10.0, H.baseY, H.groundFloorTop),
    makeObbCollider('中環街市中庭升降機塔 Atrium Panoramic Lift', -6.5, -10.5, 2.5, 2.5, H.baseY, H.secondFloorTop),
    makeObbCollider('中環街市中庭東側檔口區 East Stalls Corridor', 13.5, 0, 3.8, 20.0, H.baseY, H.baseY + 1.2),
    makeObbCollider('中環街市中庭西側檔口區 West Stalls Corridor', -13.5, 0, 3.8, 20.0, H.baseY, H.baseY + 1.2),
    makeObbCollider('中環街市北面天橋側欄 North Bridge Parapet West', -2.8, -39.0, 0.4, 6.0, FB.deckY, FB.ceilingY),
    makeObbCollider('中環街市北面天橋側欄 North Bridge Parapet East', 2.8, -39.0, 0.4, 6.0, FB.deckY, FB.ceilingY),
    makeObbCollider('中環街市南面天橋側欄 South Bridge Parapet West', -2.8, 39.0, 0.4, 6.0, FB.deckY, FB.ceilingY),
    makeObbCollider('中環街市南面天橋側欄 South Bridge Parapet East', 2.8, 39.0, 0.4, 6.0, FB.deckY, FB.ceilingY)
  ];

  // --- 15. 地標資訊註冊與統計數據（Landmark Registry & Statistics）---
  const landmark = {
    id: 'central-market',
    name: CENTRAL_MARKET_SITE.name,
    englishName: CENTRAL_MARKET_SITE.englishName,
    position: {
      x: CENTRAL_MARKET_CENTER.x,
      y: H.baseY,
      z: CENTRAL_MARKET_CENTER.z
    },
    radius: 42.0,
    height: H.monitorRoofTop
  };

  const stats = {
    centralMarketLandmarks: 1,
    centralMarketOsmRelation: CENTRAL_MARKET_HERITAGE.osmRelation,
    centralMarketWikidata: CENTRAL_MARKET_HERITAGE.wikidata,
    centralMarketStoreys: CENTRAL_MARKET_SITE.levels,
    centralMarketHeight: H.buildingHeight,
    centralMarketRoofTop: H.monitorRoofTop,
    centralMarketBaseY: H.baseY,
    centralMarketColliders: colliders.length,
    centralMarketCompletionYear: CENTRAL_MARKET_HERITAGE.completionYear,
    centralMarketReopeningYear: CENTRAL_MARKET_HERITAGE.reopeningYear,
    centralMarketHeritageGrade: CENTRAL_MARKET_HERITAGE.grade,
    centralMarketStyle: CENTRAL_MARKET_HERITAGE.architecturalStyle,
    centralMarketStalls: CENTRAL_MARKET_STALLS.stallCount
  };

  root.userData.stats = stats;

  return {
    group: root,
    colliders,
    landmarks: [landmark],
    stats,
    site: CENTRAL_MARKET_SITE,
    groundHeightAt: (x, z, ground) => centralMarketGroundHeightAt(x, z, ground)
  };
}
