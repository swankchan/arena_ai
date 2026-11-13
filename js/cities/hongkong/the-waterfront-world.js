import * as THREE from 'three/webgpu';
import {
  WATERFRONT_SITE, WATERFRONT_PODIUM_SITE, WATERFRONT_TOWER_SITES,
  WATERFRONT_T1_SITE, WATERFRONT_T2_SITE, WATERFRONT_T3_SITE,
  WATERFRONT_T5_SITE, WATERFRONT_T6_SITE, WATERFRONT_T7_SITE,
  WATERFRONT_HEIGHT, WATERFRONT_MIN_HEIGHT, WATERFRONT_GROUND_SOFFIT,
  WATERFRONT_VISUAL_COURSES, WATERFRONT_CROWN_HEIGHT, theWaterfrontTerrainHeightAt,
} from './the-waterfront-architecture.js';
import {
  harbourCityEdgeOutward, harbourCityRingColliders,
} from './harbour-city-architecture.js';
import {
  store, quad, merged, meshStore, box, edgeBox, point, ringBand, roofGeometry,
  harbourCityPalette, warmWindowEmission, createStreetLevel, hash, mix,
  addEntranceCanopy, addEdgeSign,
} from './harbour-city-world-utils.js';
import { meshFromGeometry } from './tst-hotel-world-utils.js';

const lerp = (a, b, t) => a + (b - a) * t;

// Postmodern European residential facade: warm terracotta ceramic tiles, white precast concrete bay frames and pilasters.
function createWaterfrontFacade(site, options) {
  const glass = store(), spandrel = store(), backing = store(), frames = [], pilasters = [], balconies = [];
  let panels = 0, pilasterCount = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length; if (length < 0.08) continue;
    const bays = Math.max(1, Math.round(length / (options.bayWidth ?? 1.55)));
    const p = (t, y, o = 0.04) => point(site, edge, t, y, o);
    quad(backing, p(0, options.y0, -0.16), p(1, options.y0, -0.16), p(1, options.y1, -0.16), p(0, options.y1, -0.16), [0.05,0.065,0.068]);
    for (let floor = 0; floor < options.courses; floor++) {
      const low = lerp(options.y0, options.y1, floor / options.courses), high = lerp(options.y0, options.y1, (floor + 1) / options.courses);
      const band = Math.min(options.spandrel ?? 0.72, (high - low) * 0.32);
      // Terracotta ceramic tile spandrel
      quad(spandrel, p(0, low + 0.025, 0.04), p(1, low + 0.025, 0.04), p(1, low + band, 0.04), p(0, low + band, 0.04),
        options.spandrelTint ?? [0.62,0.38,0.28]);
      if (options.balconies) {
        edgeBox(balconies, site, edge, 0.5, low + 0.08, 0.26, length + 0.02, 0.13, 0.62);
        edgeBox(balconies, site, edge, 0.5, low + 0.78, 0.44, length + 0.015, 0.06, 0.07);
      }
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0004, t1 = (bay + 1) / bays - 0.0004;
        const variation = hash(edge + (site.osmId ?? 31), floor + 47, bay + 53, options.seed ?? 0);
        const tint = mix(options.glassA ?? [0.06,0.15,0.17], options.glassB ?? [0.20,0.36,0.34], 0.15 + variation * 0.70);
        const lit = variation > (options.litThreshold ?? 0.88) ? 0.05 + hash(floor, bay, edge, 1049) * 0.22 : 0;
        quad(glass, p(t0, low + band + 0.06), p(t1, low + band + 0.06), p(t1, high - 0.12), p(t0, high - 0.12), tint, lit);
        if (options.balconies) edgeBox(frames, site, edge, (bay + 0.5) / bays, low + (band + high - low) * 0.5, 0.10, 0.04, high - low - band - 0.15, 0.10);
        panels++;
      }
      // White precast horizontal floor band
      edgeBox(frames, site, edge, 0.5, low + 0.03, 0.10, length + 0.028, 0.08, 0.18);
    }
    for (let bay = 0; bay <= bays; bay++) {
      const isPilaster = bay % 3 === 0, q = p(bay / bays, (options.y0 + options.y1) * 0.5, isPilaster ? 0.22 : 0.12);
      box(isPilaster ? pilasters : frames, q, [isPilaster ? 0.16 : 0.06, options.y1 - options.y0, isPilaster ? 0.58 : 0.22], harbourCityEdgeOutward(site.localRing, edge).ry);
      if (isPilaster) pilasterCount++;
      if (options.balconies) for (let floor = 0; floor < options.courses; floor++) {
        const y = lerp(options.y0, options.y1, floor / options.courses);
        edgeBox(balconies, site, edge, bay / bays, y + 0.42, 0.46, 0.04, 0.68, 0.065);
      }
    }
  }
  return { glass, spandrel, backing, frames, pilasters, balconies, panels, pilasterCount };
}

function addWaterfrontFacade(group, site, options, materials, name) {
  const facade = createWaterfrontFacade(site, options);
  meshStore(group, facade.backing, materials.interior, `${name} — recessed dark backing`);
  meshStore(group, facade.spandrel, materials.interior, `${name} — warm terracotta ceramic spandrel tiles`);
  meshStore(group, facade.glass, materials.glazing, `${name} — individual azure residential window panes`);
  merged(group, facade.frames, materials.white, `${name} — white precast concrete window frames and cornices`);
  merged(group, facade.pilasters, materials.paleStone, `${name} — full-height white vertical pilasters`);
  merged(group, facade.balconies, materials.metal, `${name} — recessed balconies and open railings`);
  return facade;
}

function addTowerPyramidalCrown(group, site, materials, name) {
  const bodyTop = WATERFRONT_HEIGHT - WATERFRONT_CROWN_HEIGHT;
  meshFromGeometry(group, roofGeometry(site.localRing, bodyTop), materials.roof, `${name} — roof deck below crown`);

  const crownWalls = store(), cornices = [], plant = [];
  // Decorative classical white cornice ring around tower roofline
  ringBand(cornices, site, bodyTop + 0.35, 0.65, 0.24, 0.38);

  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length; if (length < 0.1) continue;
    const p = (t, y, o = 0.04) => point(site, edge, t, y, o);
    // Stepped parapet attic wall
    quad(crownWalls, p(0, bodyTop), p(1, bodyTop), p(1, bodyTop + WATERFRONT_CROWN_HEIGHT * 0.6), p(0, bodyTop + WATERFRONT_CROWN_HEIGHT * 0.6),
      [0.64, 0.40, 0.30]);
    // Upper white cornice
    edgeBox(cornices, site, edge, 0.5, bodyTop + WATERFRONT_CROWN_HEIGHT * 0.62, 0.16, length + 0.04, 0.32, 0.26);
  }

  // Central hipped / pyramidal mechanical penthouse
  for (let x = -3.5; x <= 3.5; x += 1.1) {
    box(plant, [x, bodyTop + WATERFRONT_CROWN_HEIGHT * 0.5, 0], [0.35, WATERFRONT_CROWN_HEIGHT * 0.8, 4.5]);
  }

  meshStore(group, crownWalls, materials.interior, `${name} — stepped terracotta attic walls`);
  merged(group, cornices, materials.white, `${name} — stepped decorative white pediment cornices`);
  merged(group, plant, materials.metal, `${name} — central roof penthouse louvres`);
}

function buildTowers(root, base, materials) {
  const groups = {}, colliders = []; let panels = 0, pilasters = 0;
  for (const [index, site] of WATERFRONT_TOWER_SITES.entries()) {
    const group = new THREE.Group(); group.name = `${site.englishName} — exact OSM ring, 142 m terracotta facade and pyramidal crown`;
    group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group); groups[site.key] = group;
    const bodyTop = WATERFRONT_HEIGHT - WATERFRONT_CROWN_HEIGHT;
    const facade = addWaterfrontFacade(group, site, {
      y0: WATERFRONT_MIN_HEIGHT, y1: bodyTop, courses: WATERFRONT_VISUAL_COURSES,
      bayWidth: 1.55, balconies: true, seed: 23 + index * 17,
      glassA: [0.06,0.15,0.17], glassB: [0.20,0.36,0.34], spandrelTint: [0.62,0.38,0.28],
    }, materials, site.englishName);
    addTowerPyramidalCrown(group, site, materials, site.englishName);
    colliders.push(...harbourCityRingColliders(site, base + WATERFRONT_MIN_HEIGHT, base + WATERFRONT_HEIGHT, 0.42));
    panels += facade.panels; pilasters += facade.pilasterCount;
  }
  return { groups, colliders, panels, pilasters };
}

function buildPodium(root, base, materials) {
  const site = WATERFRONT_PODIUM_SITE, group = new THREE.Group();
  group.name = 'The Waterfront — four-level podium and private landscaped garden deck';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);

  const street = createStreetLevel(site, {
    soffit: WATERFRONT_GROUND_SOFFIT, bayWidth: 4.4,
    glassA: [0.06,0.14,0.16], glassB: [0.18,0.32,0.31], stoneTint: [0.58,0.36,0.28],
  });
  meshStore(group, street.backing, materials.interior, 'The Waterfront podium — recessed lobby backing');
  meshStore(group, street.glass, materials.glazing, 'The Waterfront podium — ground station access glazing');
  meshStore(group, street.stone, materials.interior, 'The Waterfront podium — terracotta ground spandrels');
  merged(group, street.frames, materials.metal, 'The Waterfront podium — preserved road lintels');
  merged(group, street.columns, materials.paleStone, 'The Waterfront podium — podium columns');

  const upper = addWaterfrontFacade(group, site, {
    y0: WATERFRONT_GROUND_SOFFIT, y1: WATERFRONT_MIN_HEIGHT, courses: 3,
    bayWidth: 2.4, balconies: false, spandrel: 1.20, seed: 87,
    glassA: [0.06,0.145,0.165], glassB: [0.19,0.34,0.32], spandrelTint: [0.60,0.37,0.28], litThreshold: 0.78,
  }, materials, 'The Waterfront three upper podium courses');

  meshFromGeometry(group, roofGeometry(site.localRing, WATERFRONT_MIN_HEIGHT), materials.roof, 'The Waterfront podium — 20 m garden deck roof');

  // Entrance portal and signage facing station perimeter
  const entranceEdge = 0;
  addEntranceCanopy(group, site, entranceEdge, materials, {
    name: 'The Waterfront — residential entrance canopy', width: 20, projection: 5.2, y: 5.4,
  });
  addEdgeSign(group, site, entranceEdge, '漾日居', 'THE WATERFRONT · 1 AUSTIN ROAD WEST', 10.5, 16, 2.0, 0.48, {
    background: '#5a2e22', foreground: '#f8ebe2', accent: '#d88b68',
  });

  const colliders = [
    ...street.colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base })),
    ...harbourCityRingColliders(site, base + WATERFRONT_GROUND_SOFFIT, base + WATERFRONT_MIN_HEIGHT, 0.44),
  ];

  return { group, colliders, openRoadBays: street.openRoadBays, entranceBays: street.entranceBays, panels: upper.panels };
}

export function buildTheWaterfront(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group();
  root.name = 'The Waterfront — six 142 m residential towers, podium and garden deck';
  scene.add(root);

  const materials = harbourCityPalette({
    stone: [0.60,0.38,0.28], paleStone: [0.78,0.76,0.72], metal: [0.34,0.28,0.24],
    roof: [0.24,0.28,0.26], roughness: 0.28, metalness: 0.32,
  });
  for (const key of ['glazing', 'interior', 'stone', 'paleStone', 'white']) {
    const source = materials[key];
    const node = new THREE.MeshStandardNodeMaterial({
      color: source.color, roughness: source.roughness, metalness: source.metalness,
      vertexColors: source.vertexColors, side: source.side,
    });
    node.colorNode = source.colorNode; node.emissiveNode = source.emissiveNode; source.dispose(); materials[key] = node;
  }
  materials.glazing.side = THREE.DoubleSide;
  materials.white = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.38, metalness: 0.20 });
  warmWindowEmission(materials.glazing, [1.0,0.82,0.54], 2.6);

  const podium = buildPodium(root, groundOffset, materials);
  const towers = buildTowers(root, groundOffset, materials);

  const colliders = [...podium.colliders, ...towers.colliders];

  const landmarks = [WATERFRONT_SITE, ...WATERFRONT_TOWER_SITES].map((site) => ({
    name: site.name, englishName: site.englishName, x: site.x, z: site.z, w: site.w, d: site.d,
    h: site === WATERFRONT_SITE ? WATERFRONT_HEIGHT : site.height, bounds: { ...site.bounds }, ring: site.ring, osmId: site.osmId,
    heightEvidence: site === WATERFRONT_SITE ? 'Estate label; six OSM towers are each 142.46 m / 46 levels / min_height 20 m' : 'OSM height=142.46, building:levels=46, min_height=20',
  }));

  return {
    root,
    groups: { podium: podium.group, ...towers.groups },
    colliders, landmarks, groundOffset,
    sites: {
      estate: WATERFRONT_SITE, podium: WATERFRONT_PODIUM_SITE,
      t1: WATERFRONT_T1_SITE, t2: WATERFRONT_T2_SITE, t3: WATERFRONT_T3_SITE,
      t5: WATERFRONT_T5_SITE, t6: WATERFRONT_T6_SITE, t7: WATERFRONT_T7_SITE,
    },
    groundHeightAt: (x, z, ground) => theWaterfrontTerrainHeightAt(x, z, ground, groundOffset),
    stats: {
      theWaterfrontSourceTowers: 6, theWaterfrontHeight: WATERFRONT_HEIGHT, theWaterfrontSourceLevels: 46,
      theWaterfrontMinHeight: WATERFRONT_MIN_HEIGHT, theWaterfrontVisualCoursesPerTower: WATERFRONT_VISUAL_COURSES,
      theWaterfrontResidentialPanels: towers.panels + podium.panels,
      theWaterfrontPilasters: towers.pilasters, theWaterfrontColliders: colliders.length,
    },
  };
}
