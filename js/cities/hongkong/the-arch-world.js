import * as THREE from 'three/webgpu';
import {
  THE_ARCH_SITE, THE_ARCH_PODIUM_SITE, THE_ARCH_TOWER_SITES, THE_ARCH_SUN_SITE, THE_ARCH_MOON_SITE,
  THE_ARCH_LINK_SITE, THE_ARCH_LINK, THE_ARCH_MAIN_ENTRANCE, THE_ARCH_HEIGHT, THE_ARCH_MIN_HEIGHT,
  THE_ARCH_GROUND_SOFFIT, THE_ARCH_VISUAL_COURSES, theArchTerrainHeightAt,
} from './the-arch-architecture.js';
import {
  harbourCityEdgeOutward, harbourCityRingColliders, harbourCityLocalCollider,
} from './harbour-city-architecture.js';
import {
  store, quad, merged, meshStore, box, edgeBox, point, ringBand, roofGeometry, harbourCityPalette,
  warmWindowEmission, createStreetLevel, hash, mix, addEdgeSign, addEntranceCanopy,
} from './harbour-city-world-utils.js';
import { meshFromGeometry } from './tst-hotel-world-utils.js';

const lerp = (a, b, t) => a + (b - a) * t;
function localBoxSite(site, cx, cz, w, d, key) {
  return Object.freeze({ ...site, key, osmId: null, osmType: null, source: null, photoDirected: true,
    localRing: Object.freeze([cx-w/2,cz-d/2, cx+w/2,cz-d/2, cx+w/2,cz+d/2, cx-w/2,cz+d/2, cx-w/2,cz-d/2]) });
}

// Individual sliding-door panes, bronze spandrels, balcony slabs, railings and pale structural fins are geometry.
function createResidentialFacade(site, options) {
  const glass = store(), spandrel = store(), backing = store(), frames = [], fins = [], balconies = [];
  let panels = 0, finCount = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length; if (length < 0.08) continue;
    const bays = Math.max(1, Math.round(length / (options.bayWidth ?? 1.55)));
    const p = (t, y, o = 0.04) => point(site, edge, t, y, o);
    quad(backing, p(0, options.y0, -0.18), p(1, options.y0, -0.18), p(1, options.y1, -0.18), p(0, options.y1, -0.18), [0.045,0.065,0.068]);
    for (let floor = 0; floor < options.courses; floor++) {
      const low = lerp(options.y0, options.y1, floor / options.courses), high = lerp(options.y0, options.y1, (floor + 1) / options.courses);
      const band = Math.min(options.spandrel ?? 0.72, (high - low) * 0.30);
      quad(spandrel, p(0, low + 0.03, 0.045), p(1, low + 0.03, 0.045), p(1, low + band, 0.045), p(0, low + band, 0.045),
        options.spandrelTint ?? [0.40,0.19,0.12]);
      if (options.balconies) {
        edgeBox(balconies, site, edge, 0.5, low + 0.09, 0.31, length + 0.03, 0.16, 0.76);
        edgeBox(balconies, site, edge, 0.5, low + 0.88, 0.57, length + 0.03, 0.075, 0.085);
      }
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0004, t1 = (bay + 1) / bays - 0.0004;
        const variation = hash(edge + (site.osmId ?? 19), floor + 37, bay + 61, options.seed ?? 0);
        const tint = mix(options.glassA ?? [0.045,0.12,0.13], options.glassB ?? [0.20,0.34,0.32], 0.15 + variation * 0.72);
        const lit = variation > (options.litThreshold ?? 0.86) ? 0.04 + hash(floor,bay,edge,977) * 0.22 : 0;
        quad(glass, p(t0, low + band + 0.07), p(t1, low + band + 0.07), p(t1, high - 0.13), p(t0, high - 0.13), tint, lit);
        if (options.balconies) edgeBox(frames, site, edge, (bay + 0.5) / bays, low + (band + high - low) * 0.5, 0.12, 0.045, high - low - band - 0.18, 0.12);
        panels++;
      }
      edgeBox(frames, site, edge, 0.5, low + 0.03, 0.11, length + 0.035, 0.095, 0.20);
    }
    for (let bay = 0; bay <= bays; bay++) {
      const structural = bay % 4 === 0, q = p(bay / bays, (options.y0 + options.y1) * 0.5, structural ? 0.24 : 0.14);
      box(structural ? fins : frames, q, [structural ? 0.16 : 0.065, options.y1 - options.y0, structural ? 0.68 : 0.26], harbourCityEdgeOutward(site.localRing, edge).ry);
      if (structural) finCount++;
      if (options.balconies) for (let floor = 0; floor < options.courses; floor++) {
        const y = lerp(options.y0, options.y1, floor / options.courses);
        edgeBox(balconies, site, edge, bay / bays, y + 0.49, 0.56, 0.045, 0.78, 0.075);
      }
    }
  }
  return { glass, spandrel, backing, frames, fins, balconies, panels, finCount };
}

function addResidentialFacade(group, site, options, materials, name) {
  const facade = createResidentialFacade(site, options);
  meshStore(group, facade.backing, materials.interior, `${name} — recessed dark backing`);
  meshStore(group, facade.spandrel, materials.interior, `${name} — bronze-copper spandrel panels`);
  meshStore(group, facade.glass, materials.glazing, `${name} — individual green-blue sliding-door panes`);
  merged(group, facade.frames, materials.metal, `${name} — window mullions and transoms`);
  merged(group, facade.fins, materials.paleStone, `${name} — full-height pale structural fins`);
  merged(group, facade.balconies, materials.bronze, `${name} — projecting balcony slabs and open railings`);
  return facade;
}

function addTowerRoof(group, site, materials, name) {
  meshFromGeometry(group, roofGeometry(site.localRing, THE_ARCH_HEIGHT + 0.02), materials.roof, `${name} — dark roof deck`);
  const frame = [], plant = []; ringBand(frame, site, 230.55, 0.48, 0.18, 0.30);
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, count = Math.max(1, Math.round(length / 5));
    for (let i = 0; i <= count; i++) edgeBox(frame, site, edge, i / count, 228.2, 0.12, 0.16, 4.6, 0.28);
  }
  for (let x = -5; x <= 5; x += 1.1) box(plant, [x, 229.8, 0], [0.36, 1.4, 5.5]);
  merged(group, frame, materials.paleStone, `${name} — open rectangular crown frame below 231 m`);
  merged(group, plant, materials.metal, `${name} — recessed roof plant louvres`);
}

function buildTowers(root, base, materials) {
  const groups = {}, colliders = []; let panels = 0, fins = 0;
  for (const [index, site] of THE_ARCH_TOWER_SITES.entries()) {
    const group = new THREE.Group(); group.name = `${site.englishName} — exact OSM ring, bronze balconies and green glazing`;
    group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group); groups[site.key] = group;
    const facade = addResidentialFacade(group, site, { y0: THE_ARCH_MIN_HEIGHT, y1: THE_ARCH_HEIGHT,
      courses: THE_ARCH_VISUAL_COURSES, bayWidth: 1.48, balconies: true, seed: 17 + index * 11,
      glassA: [0.045,0.105,0.115], glassB: [0.19,0.30,0.29], spandrelTint: [0.42,0.205,0.135] }, materials, site.englishName);
    addTowerRoof(group, site, materials, site.englishName);
    colliders.push(...harbourCityRingColliders(site, base + THE_ARCH_MIN_HEIGHT, base + THE_ARCH_HEIGHT, 0.42));
    panels += facade.panels; fins += facade.finCount;
  }
  return { groups, colliders, panels, fins };
}

function buildPodium(root, base, materials) {
  const site = THE_ARCH_PODIUM_SITE, group = new THREE.Group(); group.name = 'The Arch — road-safe four-level copper and glass podium';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const street = createStreetLevel(site, { soffit: THE_ARCH_GROUND_SOFFIT, customEdges: [THE_ARCH_MAIN_ENTRANCE.sourceEdge], bayWidth: 4.1,
    glassA: [0.055,0.12,0.13], glassB: [0.20,0.31,0.30], stoneTint: [0.43,0.24,0.16] });
  meshStore(group, street.backing, materials.interior, 'The Arch podium — recessed lobby backing outside roads');
  meshStore(group, street.glass, materials.glazing, 'The Arch podium — road-safe ground glazing and open Austin Road entrance');
  meshStore(group, street.stone, materials.interior, 'The Arch podium — copper ground spandrels');
  merged(group, street.frames, materials.metal, 'The Arch podium — preserved-road lintels'); merged(group, street.columns, materials.paleStone, 'The Arch podium — road-safe columns');
  const upper = addResidentialFacade(group, site, { y0: THE_ARCH_GROUND_SOFFIT, y1: THE_ARCH_MIN_HEIGHT, courses: 3,
    bayWidth: 2.3, balconies: false, spandrel: 1.25, seed: 81, glassA: [0.055,0.13,0.14], glassB: [0.22,0.34,0.32],
    spandrelTint: [0.50,0.235,0.12], litThreshold: 0.76 }, materials, 'The Arch three upper podium courses');
  meshFromGeometry(group, roofGeometry(site.localRing, THE_ARCH_MIN_HEIGHT), materials.roof, 'The Arch podium — 20 m tower / road-safe datum roof');
  addEntranceCanopy(group, site, THE_ARCH_MAIN_ENTRANCE.sourceEdge, materials, { name: 'The Arch — Austin Road West entrance canopy', width: 25, projection: 5.8, y: 5.7 });
  addEdgeSign(group, site, THE_ARCH_MAIN_ENTRANCE.sourceEdge, '凱旋門', 'THE ARCH · 1 AUSTIN ROAD WEST', 12.2, 19, 2.3, 0.55,
    { background: '#5b3528', foreground: '#f1dfc2', accent: '#c89058' });
  const colliders = [...street.colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base })),
    ...harbourCityRingColliders(site, base + THE_ARCH_GROUND_SOFFIT, base + THE_ARCH_MIN_HEIGHT, 0.44)];
  return { group, colliders, openRoadBays: street.openRoadBays, entranceBays: street.entranceBays, panels: upper.panels };
}

function oculusPanelGeometry(z) {
  const shape = new THREE.Shape(); shape.moveTo(-9,-10); shape.lineTo(9,-10); shape.lineTo(9,10); shape.lineTo(-9,10); shape.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, THE_ARCH_LINK.crownOculusRadius, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: false, curveSegments: 32 });
  geometry.translate(0, THE_ARCH_LINK.crownOculusY, z); return geometry;
}

// The glazed Sky Club projects beyond the arch on each face. Its two faces differ in photographs;
// these curved bays and the dimensions are visual approximations, not surveyed facade geometry.
function addClubhouseBays(group, materials) {
  const glazing = store(), trim = [];
  for (const [side, halfWidth, projection] of [[-1, 11.5, 2.3], [1, 7.0, 1.4]]) {
    const segments = 16, bottom = THE_ARCH_LINK.soffit + 1.0, top = THE_ARCH_LINK.top - 0.8;
    const pos = (i, y) => {
      const x = -halfWidth + 2 * halfWidth * i / segments;
      const bulge = projection * (1 - (x / halfWidth) ** 2);
      return [x, y, side * (11.1 + bulge)];
    };
    for (let i = 0; i < segments; i++) {
      for (let row = 0; row < 4; row++) {
        const lo = lerp(bottom, top, row / 4), hi = lerp(bottom, top, (row + 1) / 4);
        quad(glazing, pos(i, lo + .08), pos(i + 1, lo + .08), pos(i + 1, hi - .08), pos(i, hi - .08), [0.20, 0.43, 0.40], .30);
      }
      const a = pos(i, bottom), b = pos(i + 1, bottom);
      for (let row = 0; row <= 4; row++) {
        const y = lerp(bottom, top, row / 4);
        const mid = [(a[0]+b[0])/2, y, (a[2]+b[2])/2];
        box(trim, mid, [Math.hypot(b[0]-a[0], b[2]-a[2]) + .04, .13, .15], Math.atan2(-(b[2]-a[2]), b[0]-a[0]));
      }
      box(trim, pos(i, (bottom + top) / 2), [.12, top-bottom, .18]);
    }
    box(trim, pos(segments, (bottom + top) / 2), [.12, top-bottom, .18]);
  }
  meshStore(group, glazing, materials.glazing, 'The Arch — projecting curved Sky Club glazing', false);
  merged(group, trim, materials.paleStone, 'The Arch — Sky Club glazed bay frames', false);
}

function buildElevatedArch(root, base, materials) {
  const site = THE_ARCH_LINK_SITE, group = new THREE.Group(); group.name = 'The Arch — genuine tall void, elevated clubhouse and circular crown opening';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const clubhouse = addResidentialFacade(group, site, { y0: THE_ARCH_LINK.soffit, y1: THE_ARCH_LINK.upperBridgeTop,
    courses: 10, bayWidth: 1.65, balconies: false, spandrel: 0.82, seed: 121,
    glassA: [0.045,0.15,0.16], glassB: [0.22,0.40,0.37], spandrelTint: [0.40,0.26,0.18], litThreshold: 0.70 }, materials, 'The Arch elevated clubhouse and upper bridge');
  addClubhouseBays(group, materials);
  meshFromGeometry(group, roofGeometry(site.localRing, THE_ARCH_LINK.soffit), materials.bronze, 'The Arch — deep bronze soffit over the real rectangular void');
  const soffitRibs = [];
  for (let x = -29; x <= 29; x += 2.0) box(soffitRibs, [x, THE_ARCH_LINK.soffit - 0.32, 0], [0.16, 0.62, 21.6]);
  merged(group, soffitRibs, materials.paleStone, 'The Arch — coffered arch soffit ribs');
  const left = localBoxSite(site, -20, 0, 22, 22, 'arch-crown-west'), right = localBoxSite(site, 20, 0, 22, 22, 'arch-crown-east');
  for (const [index, side] of [left,right].entries()) addResidentialFacade(group, side, { y0: THE_ARCH_LINK.upperBridgeTop, y1: THE_ARCH_HEIGHT,
    courses: 7, bayWidth: 1.6, balconies: true, seed: 141 + index, glassA: [0.05,0.13,0.14], glassB: [0.20,0.33,0.31],
    spandrelTint: [0.40,0.20,0.13] }, materials, `The Arch crown side ${index + 1}`);
  const crownGlass = new THREE.MeshStandardMaterial({ color: 0x315d58, roughness: 0.25, metalness: 0.38, side: THREE.DoubleSide });
  meshFromGeometry(group, oculusPanelGeometry(-11.18), crownGlass, 'The Arch crown — front panel with an actual circular hole');
  meshFromGeometry(group, oculusPanelGeometry(10.84), crownGlass, 'The Arch crown — rear panel with an actual circular hole');
  const crownFrames = [];
  for (const z of [-11.42, 11.42]) {
    const rim = new THREE.TorusGeometry(THE_ARCH_LINK.crownOculusRadius + 0.18, 0.20, 10, 48); rim.translate(0, THE_ARCH_LINK.crownOculusY, z); crownFrames.push(rim);
    for (const x of [-8.7,-5.6,5.6,8.7]) box(crownFrames, [x, THE_ARCH_LINK.crownOculusY, z], [0.16,20.0,0.20]);
    for (const y of [206.2,225.8]) box(crownFrames, [0,y,z], [18.4,0.22,0.24]);
  }
  for (const x of [-30.6,-9.2,9.2,30.6]) box(crownFrames, [x,219,0], [0.30,24,22.4]);
  box(crownFrames, [0,229,0], [62,4.0,22]);
  merged(group, crownFrames, materials.paleStone, 'The Arch — pale crown frame, circular rims and top beam');
  const colliders = [
    ...harbourCityRingColliders(site, base + THE_ARCH_LINK.soffit, base + THE_ARCH_LINK.upperBridgeTop, 0.42),
    ...harbourCityRingColliders(left, base + THE_ARCH_LINK.upperBridgeTop, base + THE_ARCH_HEIGHT, 0.42),
    ...harbourCityRingColliders(right, base + THE_ARCH_LINK.upperBridgeTop, base + THE_ARCH_HEIGHT, 0.42),
    harbourCityLocalCollider(site, 0, 0, 62, 22, base + 227, base + THE_ARCH_HEIGHT),
  ];
  return { group, colliders, panels: clubhouse.panels };
}

export function buildTheArch(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group(); root.name = 'The Arch — four authored towers and photo-directed elevated arch'; scene.add(root);
  const materials = harbourCityPalette({ stone: [0.45,0.28,0.20], paleStone: [0.73,0.69,0.57], metal: [0.36,0.24,0.18], roof: [0.24,0.28,0.27], roughness: 0.25, metalness: 0.34 });
  // Preserve node graphs for export; ring winding varies, so panes must be visible from outside.
  for (const key of ['glazing', 'interior', 'stone', 'paleStone', 'white']) {
    const source = materials[key];
    const node = new THREE.MeshStandardNodeMaterial({ color: source.color, roughness: source.roughness, metalness: source.metalness, vertexColors: source.vertexColors, side: source.side });
    node.colorNode = source.colorNode; node.emissiveNode = source.emissiveNode; source.dispose(); materials[key] = node;
  }
  materials.glazing.side = THREE.DoubleSide;
  materials.bronze = new THREE.MeshStandardMaterial({ color: 0x865038, roughness: 0.46, metalness: 0.42 });
  warmWindowEmission(materials.glazing, [1.0,0.78,0.49], 2.8);
  const podium = buildPodium(root, groundOffset, materials), towers = buildTowers(root, groundOffset, materials), arch = buildElevatedArch(root, groundOffset, materials);
  const colliders = [...podium.colliders, ...towers.colliders, ...arch.colliders];
  const landmarks = [THE_ARCH_SITE, ...THE_ARCH_TOWER_SITES].map((site) => ({
    name: site.name, englishName: site.englishName, x: site.x, z: site.z, w: site.w, d: site.d,
    h: site === THE_ARCH_SITE ? THE_ARCH_HEIGHT : site.height, bounds: { ...site.bounds }, ring: site.ring, osmId: site.osmId,
    heightEvidence: site === THE_ARCH_SITE ? 'Estate label; four OSM towers are each 231 m / 64 levels / min_height 20 m' : 'OSM height=231, building:levels=64, min_height=20',
  }));
  return {
    root, groups: { podium: podium.group, ...towers.groups, elevatedArch: arch.group }, colliders, landmarks, groundOffset,
    sites: { estate: THE_ARCH_SITE, podium: THE_ARCH_PODIUM_SITE, sun: THE_ARCH_SUN_SITE, moon: THE_ARCH_MOON_SITE, link: THE_ARCH_LINK_SITE },
    groundHeightAt: (x, z, ground) => theArchTerrainHeightAt(x, z, ground, groundOffset),
    stats: {
      theArchSourceTowers: 4, theArchHeight: THE_ARCH_HEIGHT, theArchSourceLevels: 64, theArchMinHeight: THE_ARCH_MIN_HEIGHT,
      theArchVisualCoursesPerTower: THE_ARCH_VISUAL_COURSES, theArchResidentialPanels: towers.panels + podium.panels + arch.panels,
      theArchStructuralFins: towers.fins, theArchOpenRoadBays: podium.openRoadBays, theArchEntranceBays: podium.entranceBays,
      theArchVoidSoffit: THE_ARCH_LINK.soffit, theArchElevatedClubhouseLevels: THE_ARCH_LINK.visualLevels,
      theArchActualCrownOculus: true, theArchCrownOculusRadius: THE_ARCH_LINK.crownOculusRadius, theArchColliders: colliders.length,
    },
  };
}
