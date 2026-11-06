import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
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
  merged, box, cylinder, edgeBox, ringBand, meshStore, harbourCityPalette, nightAmount, point,
} from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry, createRingWindowRows, makeCanvasSign } from './tst-hotel-world-utils.js';

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
  const downlight = new THREE.MeshStandardMaterial({ color: 0xffdfac, roughness: 0.45 });
  downlight.emissiveNode = color(1, 0.68, 0.34).mul(nightAmount()).mul(1.0);
  merged(portal, lights, downlight, 'Warm Salisbury entrance downlights', false);
  const sign = makeCanvasSign(9.5, 0.70, (ctx, canvas) => {
    ctx.fillStyle = '#f0e9db'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 106px Arial, sans-serif';
    ctx.fillText('THE SALISBURY  ·  YMCA', canvas.width / 2, canvas.height / 2, 1460);
  }, { emissive: true, canvasWidth: 1536, canvasHeight: 150 });
  sign.position.set(0, SALISBURY_CANOPY_SOFFIT + 0.04, SALISBURY_CANOPY_DEPTH + 0.02); portal.add(sign);
  const colliders = [];
  for (const x of [-5.1, 5.1]) {
    const p = entrancePoint(x, SALISBURY_CANOPY_DEPTH - 0.45);
    colliders.push(harbourCityLocalCollider(SALISBURY_SITE, p.x, p.z, 0.30, 0.30, base, base + SALISBURY_CANOPY_SOFFIT));
  }
  return colliders;
}

function buildPodium(group, base, materials) {
  const site = SALISBURY_SITE, cladding = new THREE.MeshStandardMaterial({ color: 0x5f6361, roughness: 0.84, metalness: 0.04 });
  meshFromGeometry(group, ringShellGeometry(site.localRing, 4.8, SALISBURY_PODIUM_HEIGHT), cladding,
    'Exact OSM four-level dark-grey Salisbury podium above the open ground floor');
  const ground = createRingWindowRows(site, {
    y0: 0, rowCount: 1, floorHeight: 4.8, sill: 0.35, windowHeight: 3.85, targetBayWidth: 3.8,
    windowRatio: 0.84, jambWidth: 0.10, frameDepth: 0.16, lintels: false,
    tintA: [0.025, 0.045, 0.045], tintB: [0.13, 0.19, 0.17], litThreshold: 0.45,
    skip: (edge, row, bay, bays) => edge === SALISBURY_MAIN_ENTRANCE.sourceEdge && Math.abs((bay + 0.5) / bays - 0.5) < 0.20,
  });
  meshStore(group, ground.glass, materials.glazing, 'The Salisbury ground-floor glazing'); merged(group, ground.frames, materials.metal, 'The Salisbury ground-floor mullions');
  const windows = createRingWindowRows(site, {
    y0: 5.1, rowCount: 3, floorHeight: 2.85, sill: 0.60, windowHeight: 1.22,
    targetBayWidth: 3.2, windowRatio: 0.31, jambWidth: 0.14, frameDepth: 0.18,
    tintA: [0.025, 0.040, 0.042], tintB: [0.12, 0.16, 0.16], litThreshold: 0.77,
  });
  meshStore(group, windows.glass, materials.glazing, 'Small square Salisbury podium windows');
  merged(group, windows.frames, cladding, 'Dark podium window surrounds'); merged(group, windows.sills, cladding, 'Dark podium window sills and lintels');
  const piers = [], bands = [], colliders = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, bays = Math.max(1, Math.round(length / 3.8));
    for (let bay = 0; bay < bays; bay++) {
      const middle = (bay + 0.5) / bays, opening = edge === SALISBURY_MAIN_ENTRANCE.sourceEdge && Math.abs(middle - 0.5) < 0.20;
      if (!opening) colliders.push(harbourCitySegmentCollider(site, edge, bay / bays, (bay + 1) / bays, base, base + 4.8, 0.44));
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays; if (edge === SALISBURY_MAIN_ENTRANCE.sourceEdge && t > 0.28 && t < 0.72) continue;
      edgeBox(piers, site, edge, t, 2.4, -0.02, 0.56, 4.8, 0.54);
    }
    colliders.push(harbourCitySegmentCollider(site, edge, 0, 1, base + 4.8, base + SALISBURY_PODIUM_HEIGHT, 0.46));
  }
  ringBand(bands, site, 4.82, 0.26, 0.18, 0.25); ringBand(bands, site, 14.65, 0.35, 0.30, 0.34);
  merged(group, piers, cladding, 'The Salisbury ground-floor dark stone piers'); merged(group, bands, cladding, 'The Salisbury podium stone courses');
  colliders.push(...buildEntrance(group, base, materials));

  const branding = makeCanvasSign(15.5, 3.9, (ctx, canvas) => {
    ctx.fillStyle = '#b82032'; ctx.beginPath(); ctx.moveTo(80, 72); ctx.lineTo(360, 72); ctx.lineTo(220, 330); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f5eee2'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(155, 135); ctx.lineTo(220, 215); ctx.lineTo(285, 135); ctx.moveTo(220, 215); ctx.lineTo(220, 285); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f0ece2'; ctx.font = '700 168px Arial, sans-serif'; ctx.fillText('YMCA', 440, 155, 1000);
    ctx.font = '500 65px Arial, sans-serif'; ctx.fillText('THE SALISBURY  ·  YMCA OF HONG KONG', 445, 290, 1030);
  }, { emissive: true, canvasWidth: 1536, canvasHeight: 384 });
  branding.name = 'Red YMCA emblem and The Salisbury identity on the dark podium';
  const p = point(site, SALISBURY_MAIN_ENTRANCE.sourceEdge, 0.5, 11.25, 0.40);
  branding.position.set(...p); branding.rotation.y = frame().rotation; group.add(branding);
  return { colliders, windows: ground.panels + windows.panels };
}

function buildTower(group, base, materials, site, rows, index) {
  const height = SALISBURY_TOWER_MODEL_HEIGHTS[index];
  meshFromGeometry(group, ringShellGeometry(site.localRing, SALISBURY_PODIUM_HEIGHT, height), materials.paleStone,
    `Photo-derived white rounded Salisbury tower ${index + 1}`);
  const windows = createRingWindowRows(site, {
    y0: 15.4, rowCount: rows, floorHeight: 3.15, sill: 0.63, windowHeight: 1.84,
    targetBayWidth: 2.65, windowRatio: 0.75, jambWidth: 0.11, frameDepth: 0.17,
    tintA: [0.035, 0.060, 0.065], tintB: [0.20, 0.25, 0.25], litThreshold: 0.78,
  });
  meshStore(group, windows.glass, materials.glazing, `Tower ${index + 1} individual square and curved-corner windows`);
  merged(group, windows.frames, materials.white, `Tower ${index + 1} white window jambs`); merged(group, windows.sills, materials.white, `Tower ${index + 1} white sills and lintels`);
  const bands = [];
  for (let row = 0; row <= rows; row++) ringBand(bands, site, 15.08 + row * 3.15, 0.20, 0.18, 0.20);
  ringBand(bands, site, height - 0.35, 0.55, 0.32, 0.34);
  merged(group, bands, materials.white, `Tower ${index + 1} continuous rounded horizontal white window bands`);
  return { windows: windows.panels, colliders: harbourCityRingColliders(site, base + SALISBURY_PODIUM_HEIGHT, base + height, 0.40) };
}
function buildConnector(group, base, materials) {
  const site = SALISBURY_CONNECTOR_SITE;
  meshFromGeometry(group, ringShellGeometry(site.localRing, SALISBURY_PODIUM_HEIGHT, SALISBURY_CONNECTOR_HEIGHT), materials.paleStone,
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
  const materials = harbourCityPalette({ stone: [0.68, 0.69, 0.65], paleStone: [0.84, 0.85, 0.80], metal: [0.27, 0.29, 0.28], roughness: 0.34 });
  const podium = buildPodium(group, groundOffset, materials), connector = buildConnector(group, groundOffset, materials);
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
      salisburyRoadCrossings: 0, salisburyColliders: colliders.length } };
}
