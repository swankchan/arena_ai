import * as THREE from 'three/webgpu';
import { color, attribute, texture } from 'three/tsl';
import {
  SALISBURY_SITE, SALISBURY_TOWER_SITES, SALISBURY_CONNECTOR_SITE, SALISBURY_PODIUM_HEIGHT,
  SALISBURY_TOWER_MODEL_HEIGHTS, SALISBURY_TOWER_VISIBLE_ROWS, SALISBURY_CONNECTOR_HEIGHT,
  SALISBURY_MAIN_ENTRANCE, SALISBURY_CANOPY_WIDTH, SALISBURY_CANOPY_DEPTH, SALISBURY_CANOPY_SOFFIT,
  salisburyRoadRecords, salisburyTerrainHeightAt,
} from './salisbury-ymca-architecture.js';
import {
  harbourCityRingColliders, harbourCitySegmentCollider, harbourCityLocalCollider, harbourCityEdgeOutward,
} from './harbour-city-architecture.js';
import {
  merged, box, cylinder, sphere, beam, edgeBox, ringBand, meshStore, harbourCityPalette, nightAmount, point,
} from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry, createRingWindowRows, makeCanvasSign } from './tst-hotel-world-utils.js';


// A locally drawn tile pattern, not a photograph. Ring UVs are in metres so the
// tile scale stays consistent across the long walls and faceted rounded ends.
function tileMaterial(base, light, dark) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = dark; ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 5; col++) {
      const variation = (row * 17 + col * 31 + 200) % 7;
      ctx.fillStyle = variation === 0 ? light : base;
      ctx.fillRect(col * 64 + (row % 2) * 32 + 1, row * 32 + 1, 62, 29);
    }
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  return new THREE.MeshStandardNodeMaterial({ map, color: 0xffffff, roughness: .84, metalness: .02 });
}
function illuminatedSign(sign) {
  const old = sign.material;
  const material = new THREE.MeshStandardNodeMaterial({ map: old.map, transparent: old.transparent, alphaTest: old.alphaTest,
    side: old.side, roughness: old.roughness, metalness: old.metalness });
  material.emissiveNode = texture(old.map).rgb.mul(nightAmount()).mul(.7);
  sign.material = material; old.dispose();
}
function facadeMullions(site, {y0, rows, floorHeight, sill, windowHeight, bayWidth, ratio}) {
  const parts = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length;
    if (length < 1.5) continue;
    const bays = Math.max(1, Math.round(length / bayWidth));
    for (let row = 0; row < rows; row++) for (let bay = 0; bay < bays; bay++) {
      const t = (bay + .5) / bays;
      edgeBox(parts, site, edge, t, y0 + row * floorHeight + sill + windowHeight / 2, .19, .045, windowHeight, .08);
      if (length / bays > 2.4) edgeBox(parts, site, edge, t + ratio / (bays * 4), y0 + row * floorHeight + sill + windowHeight / 2, .19, .035, windowHeight, .08);
    }
  }
  return parts;
}

function frame(site = SALISBURY_SITE, edge = SALISBURY_MAIN_ENTRANCE.sourceEdge) {
  const outward = harbourCityEdgeOutward(site.localRing, edge);
  return { outward, tangent: { x: outward.nz, z: -outward.nx }, rotation: Math.atan2(outward.nx, outward.nz) };
}
function entrancePoint(x, z) {
  const { outward, tangent } = frame(), e = SALISBURY_MAIN_ENTRANCE;
  return { x: e.localX + tangent.x * x + outward.nx * z, z: e.localZ + tangent.z * x + outward.nz * z };
}
function buildEntrance(group, base, materials) {
  const e = SALISBURY_MAIN_ENTRANCE, portal = new THREE.Group(); portal.name = 'The Salisbury photo-directed Salisbury Road entrance';
  portal.position.set(e.localX, 0, e.localZ); portal.rotation.y = frame().rotation; group.add(portal);
  const glass = [], frames = [], canopy = [], columns = [], lights = [];
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 1.65;
    box(glass, [x, 2.15, 0.08], [1.52, 4.15, 0.12]); box(frames, [x - 0.81, 2.2, 0.16], [0.07, 4.4, 0.10]);
    box(frames, [x, 2.0, 0.22], [0.05, 0.72, 0.07]);
  }
  box(canopy, [0, SALISBURY_CANOPY_SOFFIT + 0.20, SALISBURY_CANOPY_DEPTH * 0.5], [SALISBURY_CANOPY_WIDTH, 0.40, SALISBURY_CANOPY_DEPTH]);
  box(canopy, [0, SALISBURY_CANOPY_SOFFIT + 0.05, SALISBURY_CANOPY_DEPTH - 0.08], [SALISBURY_CANOPY_WIDTH, 0.55, 0.16]);
  for (const x of [-5.1, 5.1]) {
    box(columns, [x, SALISBURY_CANOPY_SOFFIT * 0.5, SALISBURY_CANOPY_DEPTH - 0.45], [0.26, SALISBURY_CANOPY_SOFFIT, 0.26]);
    for (const z of [1.0, 2.4]) cylinder(columns, [x, 0.45, z], 0.10, 0.90, 10);
  }
  for (const x of [-3.6, 0, 3.6]) box(lights, [x, SALISBURY_CANOPY_SOFFIT - 0.035, 1.65], [0.26, 0.06, 0.26]);
  merged(portal, glass, materials.dark, 'The Salisbury recessed entrance glazing');
  merged(portal, frames, materials.metal, 'The Salisbury bronze door frames and pulls');
  merged(portal, canopy, materials.metal, 'The Salisbury slim metal entrance canopy');
  merged(portal, columns, materials.metal, 'The Salisbury canopy columns and arrival bollards');
  const downlight = new THREE.MeshStandardNodeMaterial({ color: 0xffdfac, roughness: 0.45 });
  downlight.emissiveNode = color(1, 0.68, 0.34).mul(nightAmount()).mul(1.0);
  merged(portal, lights, downlight, 'Warm Salisbury entrance downlights', false);
  const sign = makeCanvasSign(9.5, 0.70, (ctx, canvas) => {
    ctx.fillStyle = '#f0e9db'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 106px Arial, sans-serif';
    ctx.fillText('THE SALISBURY  ·  YMCA', canvas.width / 2, canvas.height / 2, 1460);
  }, { emissive: true, canvasWidth: 1536, canvasHeight: 150 });
  illuminatedSign(sign);
  sign.position.set(0, SALISBURY_CANOPY_SOFFIT + 0.04, SALISBURY_CANOPY_DEPTH + 0.02); portal.add(sign);
  const colliders = [];
  for (const x of [-5.1, 5.1]) {
    const p = entrancePoint(x, SALISBURY_CANOPY_DEPTH - 0.45);
    colliders.push(harbourCityLocalCollider(SALISBURY_SITE, p.x, p.z, 0.30, 0.30, base, base + SALISBURY_CANOPY_SOFFIT));
  }
  return colliders;
}

// Photo-directed dark tiled podium; detailed bay locations are approximations, not architectural survey.
function podiumOpening(edge, t) {
  return (edge === SALISBURY_MAIN_ENTRANCE.sourceEdge || edge === 3) && Math.abs(t - .5) < .20;
}
function buildMiddleRoadEntrance(group, materials) {
  const e = harbourCityEdgeOutward(SALISBURY_SITE.localRing, 3);
  const pos = point(SALISBURY_SITE, 3, .5, 0, -.02);
  const portal = new THREE.Group(); portal.name = 'Middle Road entrance — approximate position';
  portal.position.set(...pos); portal.rotation.y = Math.atan2(e.nx, e.nz); group.add(portal);
  const glazing = [], frames = [];
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 1.65;
    box(glazing, [x, 2.1, .05], [1.53, 4.1, .09]);
    box(frames, [x - .81, 2.15, .14], [.08, 4.3, .08]);
  }
  box(frames, [0, 4.35, .14], [10.1, .12, .08]);
  merged(portal, glazing, materials.dark, 'Middle Road entrance glazing');
  merged(portal, frames, materials.metal, 'Middle Road door mullions');
}

function buildPodium(group, base, materials) {
  const site = SALISBURY_SITE;
  const precast = materials.podiumTile;
  const shopfront = new THREE.MeshStandardMaterial({ color: 0x333d46, roughness: 0.66, metalness: 0.14 });
  meshFromGeometry(group, ringShellGeometry(site.localRing, 4.8, SALISBURY_PODIUM_HEIGHT), precast,
    'Charcoal tiled YMCA podium on the OSM footprint');
  const groundWalls = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length;
    const bays = Math.max(1, Math.round(length / 3.8));
    for (let bay = 0; bay < bays; bay++) {
      const t = (bay + .5) / bays;
      if (podiumOpening(edge, t)) continue;
      edgeBox(groundWalls, site, edge, t, 2.4, -.10, length / bays + .01, 4.8, .18);
    }
  }
  merged(group, groundWalls, materials.podiumTile, 'Charcoal tiled ground level walls');
  const ground = createRingWindowRows(site, {
    y0: 0, rowCount: 1, floorHeight: 4.8, sill: 0.35, windowHeight: 3.85, targetBayWidth: 3.8,
    windowRatio: 0.84, jambWidth: 0.10, frameDepth: 0.16, lintels: false,
    tintA: [0.025, 0.045, 0.045], tintB: [0.13, 0.19, 0.17], litThreshold: 0.45,
    skip: (edge, row, bay, bays) => podiumOpening(edge, (bay + .5) / bays) || (edge !== SALISBURY_MAIN_ENTRANCE.sourceEdge && bay % 3 !== 0),
  });
  meshStore(group, ground.glass, materials.glazing, 'The Salisbury ground-floor glazing'); merged(group, ground.frames, materials.metal, 'The Salisbury ground-floor mullions');
  const windows = createRingWindowRows(site, {
    y0: 5.1, rowCount: 3, floorHeight: 3.0, sill: 0.45, windowHeight: 1.9,
    targetBayWidth: 4.8, windowRatio: 0.72, jambWidth: 0.14, frameDepth: 0.18,
    tintA: [0.025, 0.040, 0.042], tintB: [0.12, 0.16, 0.16], litThreshold: 0.77,
  });
  meshStore(group, windows.glass, materials.glazing, 'Charcoal podium glazed bands');
  merged(group, windows.frames, materials.metal, 'Podium window surrounds'); merged(group, windows.sills, materials.metal, 'Podium window sills and lintels');
  merged(group, facadeMullions(site, {y0: 5.1, rows: 3, floorHeight: 3, sill: .45, windowHeight: 1.9, bayWidth: 4.8, ratio: .72}), materials.metal, 'Podium window grid mullions');
  const piers = [], bands = [], colliders = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, bays = Math.max(1, Math.round(length / 3.8));
    for (let bay = 0; bay < bays; bay++) {
      const middle = (bay + 0.5) / bays, opening = podiumOpening(edge, middle);
      if (!opening) colliders.push(harbourCitySegmentCollider(site, edge, bay / bays, (bay + 1) / bays, base, base + 4.8, 0.44));
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays; if (podiumOpening(edge, t)) continue;
      edgeBox(piers, site, edge, t, 2.4, -0.02, 0.56, 4.8, 0.54);
    }
    colliders.push(harbourCitySegmentCollider(site, edge, 0, 1, base + 4.8, base + SALISBURY_PODIUM_HEIGHT, 0.46));
  }
  ringBand(bands, site, 4.82, 0.26, 0.18, 0.25); ringBand(bands, site, 14.65, 0.35, 0.30, 0.34);
  // Subdued dark fascia and piers at the street-level base.
  const fascia = [];
  let fasciaSegments = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, bays = Math.max(1, Math.round(length / 3.8));
    for (let bay = 0; bay < bays; bay++) {
      const middle = (bay + 0.5) / bays;
      if (podiumOpening(edge, middle)) continue;
      edgeBox(fascia, site, edge, middle, 4.58, 0.17, length / bays * 0.94, 0.62, 0.34); fasciaSegments++;
    }
  }
  merged(group, piers, shopfront, 'The Salisbury dark blue-grey shopfront piers');
  merged(group, fascia, shopfront, 'The Salisbury dark shopfront fascia band above the street-level glazing');
  merged(group, bands, precast, 'The Salisbury dark tiled podium courses');
  colliders.push(...buildEntrance(group, base, materials));
  buildMiddleRoadEntrance(group, materials);

  const branding = makeCanvasSign(15.5, 3.9, (ctx, canvas) => {
    ctx.fillStyle = '#b82032'; ctx.beginPath(); ctx.moveTo(80, 72); ctx.lineTo(360, 72); ctx.lineTo(220, 330); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f5eee2'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(155, 135); ctx.lineTo(220, 215); ctx.lineTo(285, 135); ctx.moveTo(220, 215); ctx.lineTo(220, 285); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f0ece2'; ctx.font = '700 168px Arial, sans-serif'; ctx.fillText('YMCA', 440, 155, 1000);
    ctx.font = '500 65px Arial, sans-serif'; ctx.fillText('THE SALISBURY  ·  YMCA OF HONG KONG', 445, 290, 1030);
  }, { emissive: true, canvasWidth: 1536, canvasHeight: 384 });
  branding.name = 'Red YMCA emblem and The Salisbury identity on the dark podium';
  const p = point(site, SALISBURY_MAIN_ENTRANCE.sourceEdge, 0.5, 11.25, 0.40);
  illuminatedSign(branding);
  branding.position.set(...p); branding.rotation.y = frame().rotation; group.add(branding);
  return { colliders, windows: ground.panels + windows.panels, fasciaSegments };
}


// The photographs show a terrace between the wings. Its exact fittings and dimensions
// are not surveyed; all of this reconstruction stays above and inside the podium ring.
function buildGarden(group, materials) {
  const paving = [], planters = [], foliage = [], pergola = [], slats = [], rail = [], posts = [], canopyEdges = [];
  const y = SALISBURY_PODIUM_HEIGHT;
  box(paving, [0, y + .055, 7.3], [23.5, .11, 22.8]);
  for (const x of [-10.6, 10.6]) {
    box(planters, [x, y + .36, 7], [1.2, .72, 20]);
    for (let z = -1; z <= 15; z += 2) sphere(foliage, [x, y + 1.0, z], .65, 8);
  }
  box(planters, [0, y + .36, 17.4], [19, .72, 1]);
  for (let x = -8; x <= 8; x += 2) sphere(foliage, [x, y + 1.0, 17.4], .65, 8);
  // Frames, closely spaced wooden slats and a pair of sail peaks, directed by the garden views.
  for (const x of [-7.5, 7.5]) for (const z of [1, 10]) cylinder(posts, [x, y + 1.65, z], .13, 3.3, 10);
  for (const z of [1, 10]) box(pergola, [0, y + 3.25, z], [15.3, .22, .22]);
  for (let x = -7.5; x <= 7.5; x += .55) box(slats, [x, y + 3.4, 5.5], [.12, .12, 9.2]);
  // Tensioned four triangular panels, visibly pitched rather than a flat white box.
  const vertices = [], corners = [[-7.4,y+3.55,1.1],[7.4,y+3.55,1.1],[7.4,y+3.55,9.9],[-7.4,y+3.55,9.9]], peak = [0,y+5.1,5.5];
  for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i+1)%4]; vertices.push(...a, ...peak, ...b); beam(canopyEdges, a, b, .08); beam(canopyEdges, a, peak, .06); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.computeVertexNormals();
  const fabric = new THREE.MeshStandardMaterial({color: 0xc9c5b9, roughness: .9, side: THREE.DoubleSide});
  meshFromGeometry(group, g, fabric, 'Terrace tensile sail canopy', false);
  for (const x of [-11.7, 11.7]) for (let z = -3; z <= 18; z += 2.5) cylinder(rail, [x, y + .65, z], .035, 1.3, 6);
  for (let x = -10; x <= 10; x += 2.5) cylinder(rail, [x, y + .65, 18.6], .035, 1.3, 6);
  for (const x of [-11.7,11.7]) box(rail,[x,y+1.25,7.7],[.07,.07,21.8]);
  box(rail,[0,y+1.25,18.6],[23.4,.07,.07]);
  merged(group, paving, materials.terracePaving, 'Podium garden tiled paving');
  merged(group, planters, materials.terracePaving, 'Podium garden perimeter planters');
  merged(group, foliage, materials.lawn, 'Podium garden shrubs');
  merged(group, posts, materials.white, 'Podium garden canopy posts');
  merged(group, pergola, materials.white, 'Podium garden pergola frame');
  const wood = new THREE.MeshStandardMaterial({color: 0x8c704c, roughness: .9});
  merged(group, slats, wood, 'Podium garden wooden pergola slats');
  merged(group, canopyEdges, materials.metal, 'Terrace sail tension frame');
  merged(group, rail, materials.metal, 'Podium garden edge railings');
}

function buildTower(group, base, materials, site, rows, index) {
  const height = SALISBURY_TOWER_MODEL_HEIGHTS[index];
  meshFromGeometry(group, ringShellGeometry(site.localRing, SALISBURY_PODIUM_HEIGHT, height), materials.upperTile,
    `Photo-derived light warm-grey rounded Salisbury tower ${index + 1}`);
  const darkPanels = [];
  for (const edge of [5, 17]) if (edge < site.localRing.length / 2 - 1) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length;
    if (length > 4) edgeBox(darkPanels, site, edge, .5, 32.6, .025, length * .46, 17, .04);
  }
  merged(group, darkPanels, materials.darkTile, `Tower ${index + 1} charcoal accent panels`);
  const windows = createRingWindowRows(site, {
    offset: .08, y0: 15.4, rowCount: rows, floorHeight: 3.15, sill: 0.63, windowHeight: 1.84,
    targetBayWidth: 2.65, windowRatio: 0.75, jambWidth: 0.11, frameDepth: 0.17,
    tintA: [0.035, 0.060, 0.065], tintB: [0.20, 0.25, 0.25], litThreshold: 0.78,
  });
  meshStore(group, windows.glass, materials.glazing, `Tower ${index + 1} individual square and curved-corner windows`);
  merged(group, windows.frames, materials.white, `Tower ${index + 1} white window jambs`); merged(group, windows.sills, materials.white, `Tower ${index + 1} white sills and lintels`);
  merged(group, facadeMullions(site, {y0: 15.4, rows, floorHeight: 3.15, sill: .63, windowHeight: 1.84, bayWidth: 2.65, ratio: .75}), materials.metal, `Tower ${index + 1} room window mullions`);
  const bands = [];
  for (let row = 0; row <= rows; row++) ringBand(bands, site, 15.08 + row * 3.15, 0.09, 0.09, 0.09);
  ringBand(bands, site, height - 0.35, 0.55, 0.32, 0.34);
  merged(group, bands, materials.upperTile, `Tower ${index + 1} rounded tiled floor bands`);
  return { windows: windows.panels, colliders: harbourCityRingColliders(site, base + SALISBURY_PODIUM_HEIGHT, base + height, 0.40) };
}
function buildConnector(group, base, materials) {
  const site = SALISBURY_CONNECTOR_SITE;
  meshFromGeometry(group, ringShellGeometry(site.localRing, SALISBURY_PODIUM_HEIGHT, SALISBURY_CONNECTOR_HEIGHT), materials.upperTile,
    'Lower central connector between the two unequal Salisbury towers');
  const windows = createRingWindowRows(site, {
    y0: 15.4, rowCount: 8, floorHeight: 3.15, sill: 0.68, windowHeight: 1.72,
    targetBayWidth: 3.0, windowRatio: 0.54, jambWidth: 0.13, frameDepth: 0.18,
    tintA: [0.035, 0.055, 0.060], tintB: [0.18, 0.23, 0.23], litThreshold: 0.80,
  });
  meshStore(group, windows.glass, materials.glazing, 'Lower central connector square windows'); merged(group, windows.frames, materials.white, 'Central connector white frames');
  merged(group, windows.sills, materials.white, 'Central connector sills and lintels');
  return { windows: windows.panels, colliders: harbourCityRingColliders(site, base + SALISBURY_PODIUM_HEIGHT, base + SALISBURY_CONNECTOR_HEIGHT, 0.40) };
}

export function buildSalisburyYMCA(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group(); root.name = 'The Salisbury – YMCA of Hong Kong — exact podium and photo-derived twin towers'; scene.add(root);
  const group = new THREE.Group(); group.name = 'The Salisbury dark podium, unequal rounded towers and central link';
  group.position.set(SALISBURY_SITE.x, groundOffset, SALISBURY_SITE.z); group.rotation.y = SALISBURY_SITE.ry; root.add(group);
  // Photo-directed warm grey cladding and darker facade accents; colours are not measured reflectance.
  const materials = harbourCityPalette({ stone: [0.46, 0.45, 0.42], paleStone: [0.57, 0.56, 0.51], metal: [0.27, 0.29, 0.28], roughness: 0.62 });
  materials.podiumTile = tileMaterial('#444b50', '#737c7f', '#31373b');
  materials.darkTile = tileMaterial('#4b5051', '#777a78', '#393e40');
  materials.upperTile = tileMaterial('#a19c96', '#b6b0a8', '#898581');
  materials.terracePaving = tileMaterial('#8c8580', '#aaa39b', '#69625d');
  materials.glazing.dispose();
  materials.glazing = new THREE.MeshStandardNodeMaterial({vertexColors: true, roughness: .4, metalness: .18});
  materials.glazing.colorNode = attribute('color').rgb;
  materials.glazing.emissiveNode = color(0xffd39b).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(2.8);
  const podium = buildPodium(group, groundOffset, materials), connector = buildConnector(group, groundOffset, materials);
  buildGarden(group, materials);
  const towers = SALISBURY_TOWER_SITES.map((site, index) => buildTower(group, groundOffset, materials, site, SALISBURY_TOWER_VISIBLE_ROWS[index], index));
  const colliders = [...podium.colliders, ...connector.colliders, ...towers.flatMap((tower) => tower.colliders)];
  const landmark = { name: SALISBURY_SITE.name, englishName: SALISBURY_SITE.englishName,
    x: SALISBURY_SITE.x, z: SALISBURY_SITE.z, w: SALISBURY_SITE.w, d: SALISBURY_SITE.d, h: Math.max(...SALISBURY_TOWER_MODEL_HEIGHTS),
    bounds: { ...SALISBURY_SITE.bounds }, ring: SALISBURY_SITE.ring, osmId: SALISBURY_SITE.osmId, heightEvidence: 'photo-derived upper massing' };
  return { root, group, colliders, landmarks: [landmark], groundOffset, site: SALISBURY_SITE, towerSites: SALISBURY_TOWER_SITES,
    roads: salisburyRoadRecords(), groundHeightAt: (x, z, ground) => salisburyTerrainHeightAt(x, z, ground, groundOffset),
    stats: { salisburySourceBuildings: 1, salisburySourceVertices: 13, salisburyRingArea: SALISBURY_SITE.ringArea,
      salisburyOsmHeight: SALISBURY_PODIUM_HEIGHT, salisburyOsmLevels: 4, salisburyPhotoDerivedTowers: 2,
      salisburyTowerOneModelHeight: SALISBURY_TOWER_MODEL_HEIGHTS[0], salisburyTowerTwoModelHeight: SALISBURY_TOWER_MODEL_HEIGHTS[1],
      salisburyWindows: podium.windows + connector.windows + towers.reduce((sum, tower) => sum + tower.windows, 0),
      salisburyShopfrontFasciaSegments: podium.fasciaSegments, salisburyTowerTone: 'warm grey tiled facade with charcoal accents',
      salisburyRoadCrossings: 0, salisburyColliders: colliders.length } };
}
