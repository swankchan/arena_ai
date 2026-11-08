import * as THREE from 'three/webgpu';
import { attribute, color, texture } from 'three/tsl';
import {
  SHERATON_SITE, SHERATON_UPPER_SITE, SHERATON_REAR_WING_SITE, SHERATON_REAR_WING_HEIGHT, SHERATON_REAR_WING_ROWS, SHERATON_MODEL_HEIGHT, SHERATON_PODIUM_HEIGHT,
  SHERATON_VISIBLE_ROOM_ROWS, SHERATON_JACUZZI_COUNT, SHERATON_MAIN_ENTRANCE,
  SHERATON_CANOPY_WIDTH, SHERATON_CANOPY_DEPTH, SHERATON_CANOPY_SOFFIT,
  sheratonWorldToLocal, sheratonRoadRecords, sheratonTerrainHeightAt,
} from './sheraton-hotel-architecture.js';
import {
  harbourCityRingColliders, harbourCitySegmentCollider, harbourCityLocalCollider, harbourCityEdgeOutward,
} from './harbour-city-architecture.js';
import {
  merged, box, cylinder, beam, edgeBox, ringBand, meshStore, harbourCityPalette, nightAmount,
} from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry, createRingWindowRows, makeCanvasSign } from './tst-hotel-world-utils.js';

// Shared palette uses ordinary materials with renderer-time node properties. Use true
// NodeMaterials here so Three.js JSON can serialize the shader graph as well.
function sheratonNodePalette(options) {
  const palette = harbourCityPalette(options);
  for (const key of ['glazing', 'interior', 'stone', 'paleStone', 'white']) {
    const source = palette[key];
    const material = new THREE.MeshStandardNodeMaterial({
      color: source.color, roughness: source.roughness, metalness: source.metalness,
      side: source.side, vertexColors: source.vertexColors
    });
    material.colorNode = source.colorNode;
    material.emissiveNode = source.emissiveNode;
    source.dispose();
    palette[key] = material;
  }
  // Hotel rooms read as warm-lit interiors at dusk, not emissive blue-green glass.
  // Individual occupancy is illustrative, not a measured operating pattern.
  palette.glazing.emissiveNode = color(0xffd39b).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(2.8);
  return palette;
}

function illuminateSheratonSign(sign) {
  const old = sign.material;
  const node = new THREE.MeshStandardNodeMaterial({
    map: old.map, transparent: old.transparent, alphaTest: old.alphaTest,
    side: old.side, roughness: old.roughness, metalness: old.metalness
  });
  node.emissiveNode = texture(old.map).rgb.mul(nightAmount()).mul(0.8);
  sign.material = node;
  old.dispose();
}

function siteGroup(root, base, name) {
  const group = new THREE.Group(); group.name = name; group.position.set(SHERATON_SITE.x, base, SHERATON_SITE.z);
  group.rotation.y = SHERATON_SITE.ry; root.add(group); return group;
}
function entranceFrame() {
  const outward = harbourCityEdgeOutward(SHERATON_SITE.localRing, SHERATON_MAIN_ENTRANCE.sourceEdge);
  return { outward, tangent: { x: outward.nz, z: -outward.nx }, rotation: Math.atan2(outward.nx, outward.nz) };
}
function entrancePoint(x, z) {
  const { outward, tangent } = entranceFrame(), e = SHERATON_MAIN_ENTRANCE;
  return { x: e.localX + tangent.x * x + outward.nx * z, z: e.localZ + tangent.z * x + outward.nz * z };
}

function buildEntrance(group, base, materials) {
  const e = SHERATON_MAIN_ENTRANCE, { rotation } = entranceFrame();
  const portal = new THREE.Group(); portal.name = 'Sheraton recessed Nathan Road lobby doors and warm porte-cochere';
  portal.position.set(e.localX, 0, e.localZ); portal.rotation.y = rotation; group.add(portal);
  const glass = [], frames = [], canopy = [], lights = [], columns = [], bollards = [];
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 1.75;
    box(glass, [x, 2.35, 0.08], [1.62, 4.55, 0.13]);
    box(frames, [x - 0.86, 2.38, 0.17], [0.07, 4.75, 0.10]);
    box(frames, [x, 2.15, 0.23], [0.055, 0.85, 0.07]);
  }
  box(frames, [0, 4.72, 0.15], [11.1, 0.15, 0.12]);
  box(canopy, [0, SHERATON_CANOPY_SOFFIT + 0.25, SHERATON_CANOPY_DEPTH * 0.5], [SHERATON_CANOPY_WIDTH, 0.50, SHERATON_CANOPY_DEPTH]);
  box(canopy, [0, SHERATON_CANOPY_SOFFIT + 0.04, SHERATON_CANOPY_DEPTH - 0.10], [SHERATON_CANOPY_WIDTH, 0.72, 0.20]);
  for (const x of [-5.9, 5.9]) {
    box(columns, [x, SHERATON_CANOPY_SOFFIT * 0.5, SHERATON_CANOPY_DEPTH - 0.65], [0.30, SHERATON_CANOPY_SOFFIT, 0.30]);
    for (const z of [1.2, 3.3]) { cylinder(bollards, [x, 0.48, z], 0.11, 0.96, 10); cylinder(bollards, [x, 0.98, z], 0.14, 0.08, 10); }
  }
  for (const x of [-4.2, 0, 4.2]) for (const z of [1.4, 3.7]) box(lights, [x, SHERATON_CANOPY_SOFFIT - 0.035, z], [0.28, 0.06, 0.28]);
  merged(portal, glass, materials.dark, 'Sheraton bronze-framed entrance glazing');
  merged(portal, frames, materials.metal, 'Sheraton entrance mullions and door pulls');
  merged(portal, canopy, materials.paleStone, 'Sheraton stone and metal entrance canopy');
  merged(portal, columns, materials.paleStone, 'Sheraton porte-cochere columns outside the central path');
  merged(portal, bollards, materials.metal, 'Sheraton arrival bollards');
  const downlight = new THREE.MeshStandardNodeMaterial({ color: 0xffe0a3, roughness: 0.45 });
  downlight.emissiveNode = color(1, 0.67, 0.30).mul(nightAmount()).mul(1.2);
  merged(portal, lights, downlight, 'Warm Sheraton canopy downlights', false);
  const sign = makeCanvasSign(10.2, 0.72, (ctx, canvas) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#eee7d6';
    ctx.font = '600 108px Arial, sans-serif'; ctx.fillText('S H E R A T O N', canvas.width / 2, canvas.height / 2, 1450);
  }, { emissive: true, canvasWidth: 1536, canvasHeight: 160 });
  illuminateSheratonSign(sign);
  sign.position.set(0, SHERATON_CANOPY_SOFFIT + 0.05, SHERATON_CANOPY_DEPTH + 0.015); portal.add(sign);
  const colliders = [];
  for (const x of [-5.9, 5.9]) {
    const p = entrancePoint(x, SHERATON_CANOPY_DEPTH - 0.65);
    colliders.push(harbourCityLocalCollider(SHERATON_SITE, p.x, p.z, 0.34, 0.34, base, base + SHERATON_CANOPY_SOFFIT));
  }
  return colliders;
}

function buildPodium(group, base, materials) {
  const site = SHERATON_SITE;
  meshFromGeometry(group, ringShellGeometry(site.localRing, 5.8, SHERATON_PODIUM_HEIGHT), materials.stone,
    'Exact irregular OSM Sheraton podium above the open lobby line');
  const windows = createRingWindowRows(site, {
    y0: 0, rowCount: 1, floorHeight: 5.8, sill: 0.42, windowHeight: 4.55, targetBayWidth: 4,
    windowRatio: 0.88, jambWidth: 0.10, frameDepth: 0.16, lintels: false,
    tintA: [0.025, 0.055, 0.052], tintB: [0.16, 0.23, 0.20], litThreshold: 0.42,
    skip: (edge, row, bay, bays) => edge === SHERATON_MAIN_ENTRANCE.sourceEdge && Math.abs((bay + 0.5) / bays - 0.5) < 0.18,
  });
  meshStore(group, windows.glass, materials.glazing, 'Sheraton ground-floor lobby and retail glazing');
  merged(group, windows.frames, materials.metal, 'Sheraton bronze lobby mullions');
  const piers = [], colliders = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, bays = Math.max(1, Math.round(length / 4));
    for (let bay = 0; bay < bays; bay++) {
      const middle = (bay + 0.5) / bays, opening = edge === SHERATON_MAIN_ENTRANCE.sourceEdge && Math.abs(middle - 0.5) < 0.18;
      if (!opening) colliders.push(harbourCitySegmentCollider(site, edge, bay / bays, (bay + 1) / bays, base, base + 5.8, 0.42));
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays;
      if (edge === SHERATON_MAIN_ENTRANCE.sourceEdge && t > 0.30 && t < 0.70) continue;
      edgeBox(piers, site, edge, t, 2.9, -0.02, 0.58, 5.8, 0.54);
    }
    colliders.push(harbourCitySegmentCollider(site, edge, 0, 1, base + 5.8, base + SHERATON_PODIUM_HEIGHT, 0.44));
  }
  merged(group, piers, materials.paleStone, 'Sheraton ground-floor stone piers with open hotel entrance');
  // Large pale stone panels with thin joints and intermittent illuminated strips,
  // not a second storey of generic identical windows.
  const joints = [], sconces = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length;
    if (length < 1) continue;
    const bays = Math.max(1, Math.round(length / 2.1));
    for (let i = 0; i <= bays; i++) edgeBox(joints, site, edge, i / bays, 9.15, .05, .035, 6.45, .045);
    for (let y = 6.2; y < 12.3; y += 1.1) edgeBox(joints, site, edge, .5, y, .05, length, .035, .045);
    for (let i = 0; i < Math.floor(length / 7); i++) edgeBox(sconces, site, edge, (i + .5) / Math.floor(length / 7), 11.0, .10, .14, 2.4, .08);
  }
  const jointMat = new THREE.MeshStandardMaterial({color: 0x77746f, roughness: .82});
  const sconceMat = new THREE.MeshStandardNodeMaterial({color: 0xd2a86b, roughness: .65});
  sconceMat.emissiveNode = color(0xffb95b).mul(nightAmount()).mul(1.2);
  merged(group, joints, jointMat, 'Sheraton podium stone panel joints');
  merged(group, sconces, sconceMat, 'Sheraton warm vertical podium lights', false);
  const bands = [];
  ringBand(bands, site, 5.82, 0.30, 0.24, 0.30); ringBand(bands, site, 9.0, 0.20, 0.16, 0.22);
  ringBand(bands, site, 12.35, 0.30, 0.30, 0.36);
  merged(group, bands, materials.paleStone, 'Sheraton podium horizontal stone courses');
  colliders.push(...buildEntrance(group, base, materials));
  return { colliders, windows: windows.panels };
}

function buildUpperSlab(group, base, materials) {
  const site = SHERATON_UPPER_SITE;
  meshFromGeometry(group, ringShellGeometry(site.localRing, SHERATON_PODIUM_HEIGHT, SHERATON_MODEL_HEIGHT), materials.stone,
    'Photo-directed long Sheraton guestroom slab inside the exact podium footprint');
  const windows = createRingWindowRows(site, {
    y0: 13.15, rowCount: SHERATON_VISIBLE_ROOM_ROWS, floorHeight: 3.45, sill: 0.52, windowHeight: 2.32,
    targetBayWidth: 4.05, windowRatio: 0.71, jambWidth: 0.22, frameDepth: 0.30,
    sillHeight: 0.22, lintels: false, tintA: [0.025, 0.060, 0.058], tintB: [0.19, 0.26, 0.23], litThreshold: 0.73,
  });
  meshStore(group, windows.glass, materials.glazing, 'Sheraton individual dark guestroom glazing panels');
  merged(group, windows.frames, materials.paleStone, 'Sheraton projecting beige concrete room grid');
  merged(group, windows.sills, materials.ochre, 'Sheraton projecting warm ochre room sills');
  const bands = [];
  for (let row = 0; row <= SHERATON_VISIBLE_ROOM_ROWS; row++) ringBand(bands, site, 12.85 + row * 3.45, 0.15, 0.15, 0.19);
  ringBand(bands, site, SHERATON_MODEL_HEIGHT - 0.35, 0.55, 0.30, 0.36);
  merged(group, bands, materials.paleStone, 'Sheraton continuous floor edges and roof parapet');

  // The identifying west-end lift blade faces Nathan Road, not the harbour.
  const blade = new THREE.Group(); blade.name = 'Sheraton west-end twin lift blade';
  blade.position.set(-42.12, 0, 25); blade.rotation.y = -Math.PI / 2; group.add(blade);
  const shell = [], recess = [], guides = [], cars = [];
  box(shell, [0, 38.2, 0], [8.6, 51.4, .65]);
  for (const x of [-1.25, 1.25]) {
    box(recess, [x, 38.0, .36], [1.9, 43.6, .12]);
    box(guides, [x, 38.0, .44], [.08, 43.6, .08]);
    box(cars, [x, 52.5 - (x > 0 ? 3.4 : 0), .51], [1.45, 2.2, .18]);
  }
  merged(blade, shell, materials.paleStone, 'Sheraton tall west-end service and sign blade');
  merged(blade, recess, materials.dark, 'Sheraton dark recessed twin lift strips');
  merged(blade, guides, materials.metal, 'Sheraton lift guide rails');
  merged(blade, cars, materials.ochre, 'Sheraton lift cars — illustrative position');
  const disc = makeCanvasSign(4.7, 4.7, (ctx, canvas) => {
    ctx.strokeStyle = '#ddd1b3'; ctx.lineWidth = 20; ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, 245, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ddd1b3'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 340px Georgia, serif';
    ctx.fillText('S', canvas.width / 2, canvas.height / 2 + 15);
  }, { emissive: true, canvasWidth: 768, canvasHeight: 768 });
  illuminateSheratonSign(disc);
  disc.name = 'Sheraton circular S emblem'; disc.position.set(0, SHERATON_MODEL_HEIGHT - 3.6, .40); blade.add(disc);
  const roofSign = makeCanvasSign(31, 2.0, (ctx, canvas) => {
    ctx.fillStyle = '#ede7d7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 116px Arial, sans-serif';
    ctx.fillText('SHERATON', canvas.width / 2, canvas.height / 2, 1430);
  }, { emissive: true, canvasWidth: 1536, canvasHeight: 180 });
  illuminateSheratonSign(roofSign);
  roofSign.name = 'SHERATON upper long-facade lettering'; roofSign.position.set(10, SHERATON_MODEL_HEIGHT - 1.6, 32.28); group.add(roofSign);
  return { windows: windows.panels, colliders: harbourCityRingColliders(site, base + SHERATON_PODIUM_HEIGHT, base + SHERATON_MODEL_HEIGHT, 0.42) };
}


function buildRearWing(group, base, materials) {
  const site = SHERATON_REAR_WING_SITE;
  meshFromGeometry(group, ringShellGeometry(site.localRing, SHERATON_PODIUM_HEIGHT, SHERATON_REAR_WING_HEIGHT), materials.stone,
    'Photo-directed lower north wing around recessed court');
  const windows = createRingWindowRows(site, {
    y0: 13.15, rowCount: SHERATON_REAR_WING_ROWS, floorHeight: 3.45, sill: .52, windowHeight: 2.32,
    targetBayWidth: 4.05, windowRatio: .71, jambWidth: .22, frameDepth: .30, sillHeight: .22, lintels: false,
    tintA: [.025, .06, .058], tintB: [.19, .26, .23], litThreshold: .73, seed: 124697432,
  });
  meshStore(group, windows.glass, materials.glazing, 'Rear wing individual guestroom glazing');
  merged(group, windows.frames, materials.paleStone, 'Rear wing pale vertical room fins');
  merged(group, windows.sills, materials.ochre, 'Rear wing projecting ochre sills');
  const parapet = []; ringBand(parapet, site, SHERATON_REAR_WING_HEIGHT - .28, .5, .2, .3);
  merged(group, parapet, materials.paleStone, 'Rear wing roof parapet');
  return {windows: windows.panels, colliders: harbourCityRingColliders(site, base + SHERATON_PODIUM_HEIGHT, base + SHERATON_REAR_WING_HEIGHT, .42)};
}
function buildBillboard(group, materials) {
  // The actual advertising varies over time; a dark unbranded face avoids inventing an advert.
  const support = [], screen = [], frame = [], y = SHERATON_MODEL_HEIGHT;
  box(screen, [2, y + 5.3, 30.55], [66, 9.4, .20]);
  for (const x of [-31, -20, -9, 2, 13, 24, 35]) {
    beam(support, [x, y, 29.7], [x, y + 10.1, 30.4], .16);
    beam(support, [x, y, 26.2], [x, y + 10.1, 30.4], .14);
    beam(support, [x, y + .6, 29.7], [x, y + 5.2, 28.3], .09);
  }
  for (const h of [y + .6, y + 10]) beam(frame, [-31, h, 30.55], [35, h, 30.55], .12);
  merged(group, screen, materials.dark, 'Sheraton roof billboard unbranded screen');
  merged(group, support, materials.metal, 'Sheraton roof billboard triangular trusses');
  merged(group, frame, materials.metal, 'Sheraton roof billboard frame');
}

function buildRoofAmenities(group, materials) {
  const roof = new THREE.Group(); roof.name = 'Sheraton official Level 18 rooftop pool and three Jacuzzis — visual placement only'; group.add(roof);
  const deck = [], loungers = [], rails = [], rims = [], parasolPosts = [], parasols = [];
  box(deck, [7, SHERATON_MODEL_HEIGHT + 0.09, 25], [55, 0.18, 11.6]);
  const water = new THREE.MeshStandardNodeMaterial({ color: 0x3b8b9b, roughness: 0.16, metalness: 0.16, transparent: true, opacity: 0.84 });
  water.emissiveNode = color(0.10, 0.28, 0.33).mul(nightAmount()).mul(0.22);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(21, 0.20, 5.4), water); pool.name = 'Level 18 outdoor temperature-controlled pool'; pool.position.set(15, SHERATON_MODEL_HEIGHT + 0.23, 25); roof.add(pool);
  for (let i = 0; i < SHERATON_JACUZZI_COUNT; i++) {
    const jacuzzi = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.30, 24), water);
    jacuzzi.name = `Heated rooftop Jacuzzi ${i + 1}`; jacuzzi.position.set(-8 + i * 3.1, SHERATON_MODEL_HEIGHT + 0.28, 25); roof.add(jacuzzi);
    const rim = new THREE.TorusGeometry(1.22, .12, 8, 24); rim.rotateX(Math.PI / 2); rim.translate(-8 + i * 3.1, SHERATON_MODEL_HEIGHT + .4, 25); rims.push(rim);
  }
  for (let i = 0; i < 8; i++) {
    const x = -15 + i * 6.1;
    box(loungers, [x, SHERATON_MODEL_HEIGHT + 0.40, 20.4], [2.0, 0.20, 0.68]);
    box(loungers, [x - 0.78, SHERATON_MODEL_HEIGHT + 0.70, 20.4], [0.55, 0.65, 0.68]);
  }
  for (const x of [-12, 0, 12, 24]) {
    cylinder(parasolPosts, [x, SHERATON_MODEL_HEIGHT + 1.45, 20.5], .045, 2.7, 8);
    const umbrella = new THREE.ConeGeometry(1.35, .38, 8, 1, false);
    umbrella.translate(x, SHERATON_MODEL_HEIGHT + 2.85, 20.5); parasols.push(umbrella);
  }
  for (const z of [19.15, 30.85]) {
    beam(rails, [-21, SHERATON_MODEL_HEIGHT + 1.15, z], [35, SHERATON_MODEL_HEIGHT + 1.15, z], 0.065);
    for (let x = -21; x <= 35; x += 4) beam(rails, [x, SHERATON_MODEL_HEIGHT + 0.15, z], [x, SHERATON_MODEL_HEIGHT + 1.15, z], 0.055);
  }
  const furniture = new THREE.MeshStandardMaterial({color: 0x33332f, roughness: .8});
  const parasol = new THREE.MeshStandardMaterial({color: 0x766d5f, roughness: .9, side: THREE.DoubleSide});
  merged(roof, deck, materials.paleStone, 'Photo-directed rooftop sundeck'); merged(roof, loungers, furniture, 'Rooftop sundeck lounge chairs');
  merged(roof, rims, materials.metal, 'Rooftop Jacuzzi rims');
  merged(roof, parasolPosts, materials.metal, 'Rooftop parasol poles');
  merged(roof, parasols, parasol, 'Rooftop taupe parasols');
  merged(roof, rails, materials.metal, 'Rooftop pool safety rails');
}

export function buildSheratonHotel(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group(); root.name = 'Sheraton Hong Kong Hotel & Towers — exact podium and authored upper slab'; scene.add(root);
  const materials = sheratonNodePalette({ stone: [0.58, 0.55, 0.47], paleStone: [0.78, 0.75, 0.66], metal: [0.30, 0.27, 0.20], roof: [0.30, 0.32, 0.30], roughness: 0.31 });
  materials.ochre = new THREE.MeshStandardMaterial({color: 0xb68d5c, roughness: .78, metalness: .04});
  const group = siteGroup(root, groundOffset, 'Sheraton Nathan Road podium, guestroom slab and rooftop amenities');
  const podium = buildPodium(group, groundOffset, materials), upper = buildUpperSlab(group, groundOffset, materials), rear = buildRearWing(group, groundOffset, materials); buildRoofAmenities(group, materials); buildBillboard(group, materials);
  const colliders = [...podium.colliders, ...upper.colliders, ...rear.colliders];
  const landmark = { name: SHERATON_SITE.name, englishName: SHERATON_SITE.englishName,
    x: SHERATON_SITE.x, z: SHERATON_SITE.z, w: SHERATON_SITE.w, d: SHERATON_SITE.d, h: SHERATON_MODEL_HEIGHT,
    bounds: { ...SHERATON_SITE.bounds }, ring: SHERATON_SITE.ring, osmId: SHERATON_SITE.osmId, heightEvidence: 'photo-directed scene convention' };
  return { root, group, colliders, landmarks: [landmark], groundOffset, site: SHERATON_SITE, upperSite: SHERATON_UPPER_SITE,
    roads: sheratonRoadRecords(), groundHeightAt: (x, z, ground) => sheratonTerrainHeightAt(x, z, ground, groundOffset),
    stats: { sheratonSourceBuildings: 1, sheratonSourceVertices: 15, sheratonRingArea: SHERATON_SITE.ringArea,
      sheratonOsmLevels: 17, sheratonVisibleRoomRows: SHERATON_VISIBLE_ROOM_ROWS, sheratonModelHeight: SHERATON_MODEL_HEIGHT,
      sheratonUpperPhotoDirected: 1, sheratonWindows: podium.windows + upper.windows + rear.windows, sheratonRooftopJacuzzis: SHERATON_JACUZZI_COUNT,
      sheratonRoadCrossings: 0, sheratonColliders: colliders.length } };
}
