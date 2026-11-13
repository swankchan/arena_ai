import * as THREE from 'three/webgpu';
import {
  HARBOURSIDE_SITE, HARBOURSIDE_PODIUM_SITE, HARBOURSIDE_TOWER_SITES,
  HARBOURSIDE_T1_SITE, HARBOURSIDE_T2_SITE, HARBOURSIDE_T3_SITE,
  HARBOURSIDE_HEIGHT, HARBOURSIDE_MIN_HEIGHT, HARBOURSIDE_GROUND_SOFFIT,
  HARBOURSIDE_VISUAL_COURSES, HARBOURSIDE_CROWN_HEIGHT, HARBOURSIDE_SKY_LINKS,
  HARBOURSIDE_MAIN_ENTRANCE, theHarboursideTerrainHeightAt,
} from './the-harbourside-architecture.js';
import {
  harbourCityEdgeOutward, harbourCityRingColliders, harbourCityLocalCollider,
} from './harbour-city-architecture.js';
import {
  store, quad, merged, meshStore, box, edgeBox, point, ringBand, roofGeometry,
  harbourCityPalette, warmWindowEmission, createStreetLevel, hash, mix,
  addEntranceCanopy, addEdgeSign,
} from './harbour-city-world-utils.js';
import { meshFromGeometry } from './tst-hotel-world-utils.js';

const lerp = (a, b, t) => a + (b - a) * t;

// Individual sliding-door panes, champagne-gold spandrels, balcony slabs, railings and pale structural fins.
function createResidentialFacade(site, options) {
  const glass = store(), spandrel = store(), backing = store(), frames = [], fins = [], balconies = [];
  let panels = 0, finCount = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length; if (length < 0.08) continue;
    const bays = Math.max(1, Math.round(length / (options.bayWidth ?? 1.52)));
    const p = (t, y, o = 0.04) => point(site, edge, t, y, o);
    quad(backing, p(0, options.y0, -0.18), p(1, options.y0, -0.18), p(1, options.y1, -0.18), p(0, options.y1, -0.18), [0.04,0.062,0.065]);
    for (let floor = 0; floor < options.courses; floor++) {
      const low = lerp(options.y0, options.y1, floor / options.courses), high = lerp(options.y0, options.y1, (floor + 1) / options.courses);
      const band = Math.min(options.spandrel ?? 0.68, (high - low) * 0.28);
      quad(spandrel, p(0, low + 0.03, 0.045), p(1, low + 0.03, 0.045), p(1, low + band, 0.045), p(0, low + band, 0.045),
        options.spandrelTint ?? [0.46,0.28,0.16]);
      if (options.balconies) {
        edgeBox(balconies, site, edge, 0.5, low + 0.08, 0.28, length + 0.025, 0.14, 0.68);
        edgeBox(balconies, site, edge, 0.5, low + 0.82, 0.48, length + 0.02, 0.065, 0.075);
      }
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0004, t1 = (bay + 1) / bays - 0.0004;
        const variation = hash(edge + (site.osmId ?? 27), floor + 43, bay + 59, options.seed ?? 0);
        const tint = mix(options.glassA ?? [0.045,0.115,0.125], options.glassB ?? [0.18,0.32,0.31], 0.12 + variation * 0.74);
        const lit = variation > (options.litThreshold ?? 0.86) ? 0.05 + hash(floor, bay, edge, 1031) * 0.24 : 0;
        quad(glass, p(t0, low + band + 0.06), p(t1, low + band + 0.06), p(t1, high - 0.12), p(t0, high - 0.12), tint, lit);
        if (options.balconies) edgeBox(frames, site, edge, (bay + 0.5) / bays, low + (band + high - low) * 0.5, 0.11, 0.04, high - low - band - 0.16, 0.11);
        panels++;
      }
      edgeBox(frames, site, edge, 0.5, low + 0.03, 0.10, length + 0.03, 0.085, 0.18);
    }
    for (let bay = 0; bay <= bays; bay++) {
      const structural = bay % 3 === 0, q = p(bay / bays, (options.y0 + options.y1) * 0.5, structural ? 0.22 : 0.12);
      box(structural ? fins : frames, q, [structural ? 0.15 : 0.06, options.y1 - options.y0, structural ? 0.62 : 0.24], harbourCityEdgeOutward(site.localRing, edge).ry);
      if (structural) finCount++;
      if (options.balconies) for (let floor = 0; floor < options.courses; floor++) {
        const y = lerp(options.y0, options.y1, floor / options.courses);
        edgeBox(balconies, site, edge, bay / bays, y + 0.45, 0.50, 0.04, 0.72, 0.07);
      }
    }
  }
  return { glass, spandrel, backing, frames, fins, balconies, panels, finCount };
}

function addResidentialFacade(group, site, options, materials, name) {
  const facade = createResidentialFacade(site, options);
  meshStore(group, facade.backing, materials.interior, `${name} — recessed dark backing`);
  meshStore(group, facade.spandrel, materials.interior, `${name} — champagne-bronze spandrel panels`);
  meshStore(group, facade.glass, materials.glazing, `${name} — individual aquamarine sliding-door panes`);
  merged(group, facade.frames, materials.metal, `${name} — window mullions and transoms`);
  merged(group, facade.fins, materials.paleStone, `${name} — full-height pale structural vertical fins`);
  merged(group, facade.balconies, materials.bronze, `${name} — projecting balcony slabs and open railings`);
  return facade;
}

function addTowerRoofAndCrown(group, site, materials, name) {
  const bodyTop = HARBOURSIDE_HEIGHT - HARBOURSIDE_CROWN_HEIGHT;
  meshFromGeometry(group, roofGeometry(site.localRing, bodyTop), materials.roof, `${name} — dark roof deck`);
  const frame = [], plant = []; ringBand(frame, site, bodyTop + 0.2, 0.45, 0.18, 0.28);
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, count = Math.max(1, Math.round(length / 4.8));
    for (let i = 0; i <= count; i++) {
      // Sweeping crown parapet fins extending up to 255 m
      edgeBox(frame, site, edge, i / count, bodyTop + HARBOURSIDE_CROWN_HEIGHT * 0.5, 0.14, 0.18, HARBOURSIDE_CROWN_HEIGHT, 0.32);
    }
  }
  for (let x = -4; x <= 4; x += 1.2) box(plant, [x, bodyTop + 2.5, 0], [0.38, 2.2, 5.0]);
  merged(group, frame, materials.paleStone, `${name} — aerodynamic sweeping crown fins up to 255 m`);
  merged(group, plant, materials.metal, `${name} — recessed roof plant louvres`);
}

function buildTowers(root, base, materials) {
  const groups = {}, colliders = []; let panels = 0, fins = 0;
  for (const [index, site] of HARBOURSIDE_TOWER_SITES.entries()) {
    const group = new THREE.Group(); group.name = `${site.englishName} — exact OSM ring, 255 m wave tower and champagne glazing`;
    group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group); groups[site.key] = group;
    const bodyTop = HARBOURSIDE_HEIGHT - HARBOURSIDE_CROWN_HEIGHT;
    const facade = addResidentialFacade(group, site, {
      y0: HARBOURSIDE_MIN_HEIGHT, y1: bodyTop, courses: HARBOURSIDE_VISUAL_COURSES,
      bayWidth: 1.52, balconies: true, seed: 19 + index * 13,
      glassA: [0.045,0.115,0.125], glassB: [0.18,0.32,0.31], spandrelTint: [0.46,0.28,0.16],
    }, materials, site.englishName);
    addTowerRoofAndCrown(group, site, materials, site.englishName);
    colliders.push(...harbourCityRingColliders(site, base + HARBOURSIDE_MIN_HEIGHT, base + HARBOURSIDE_HEIGHT, 0.42));
    panels += facade.panels; fins += facade.finCount;
  }
  return { groups, colliders, panels, fins };
}

function buildSkyCorridors(root, base, materials) {
  const group = new THREE.Group(); group.name = 'The Harbourside — high-level connecting sky corridors';
  root.add(group);
  const colliders = [];
  const glass = store(), frames = [], slabs = [];
  let corridorPanels = 0;

  for (const link of HARBOURSIDE_SKY_LINKS) {
    const linkGroup = new THREE.Group();
    linkGroup.position.set(link.x, base, link.z);
    group.add(linkGroup);

    const hw = link.width * 0.5, hd = link.depth * 0.5;
    const y0 = link.soffit, y1 = link.top, dy = y1 - y0;

    // Floor and ceiling slabs
    box(slabs, [0, y0 - 0.4, 0], [link.width, 0.8, link.depth]);
    box(slabs, [0, y1 + 0.4, 0], [link.width, 0.8, link.depth]);

    // Structural sky corridor floors and glass viewing facades
    for (let c = 0; c < link.courses; c++) {
      const cy0 = lerp(y0, y1, c / link.courses), cy1 = lerp(y0, y1, (c + 1) / link.courses);
      box(slabs, [0, cy0 + 0.1, 0], [link.width, 0.22, link.depth]);

      // North and south viewing glass
      for (const side of [-1, 1]) {
        const z = side * (hd - 0.05);
        quad(glass, [-hw + 0.1, cy0 + 0.35, z], [hw - 0.1, cy0 + 0.35, z], [hw - 0.1, cy1 - 0.1, z], [-hw + 0.1, cy1 - 0.1, z],
          [0.18, 0.34, 0.32], 0.35);
        corridorPanels++;
      }
    }

    // Corner structural columns
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        box(frames, [sx * (hw - 0.25), (y0 + y1) * 0.5, sz * (hd - 0.25)], [0.5, dy, 0.5]);
      }
    }

    colliders.push({
      x: link.x, z: link.z, w: link.width, d: link.depth,
      minX: link.x - hw, maxX: link.x + hw, minZ: link.z - hd, maxZ: link.z + hd,
      minY: base + y0, maxY: base + y1,
      obb: { cx: link.x, cz: link.z, hx: hw, hz: hd, cs: 1, sn: 0 },
    });
  }

  meshStore(group, glass, materials.glazing, 'The Harbourside — sky corridor illuminated viewing glazing');
  merged(group, slabs, materials.paleStone, 'The Harbourside — sky corridor structural floor slabs and soffits');
  merged(group, frames, materials.metal, 'The Harbourside — sky corridor structural framing trusses');

  return { group, colliders, panels: corridorPanels };
}

function buildPodium(root, base, materials) {
  const site = HARBOURSIDE_PODIUM_SITE, group = new THREE.Group();
  group.name = 'The Harbourside — four-level podium and Austin Road West drop-off';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);

  const street = createStreetLevel(site, {
    soffit: HARBOURSIDE_GROUND_SOFFIT, bayWidth: 4.2,
    glassA: [0.05,0.12,0.13], glassB: [0.19,0.31,0.30], stoneTint: [0.46,0.26,0.16],
  });
  meshStore(group, street.backing, materials.interior, 'The Harbourside podium — recessed lobby backing');
  meshStore(group, street.glass, materials.glazing, 'The Harbourside podium — ground floor lobby glazing');
  meshStore(group, street.stone, materials.interior, 'The Harbourside podium — warm bronze ground spandrels');
  merged(group, street.frames, materials.metal, 'The Harbourside podium — preserved entrance lintels');
  merged(group, street.columns, materials.paleStone, 'The Harbourside podium — grand entrance columns');

  const upper = addResidentialFacade(group, site, {
    y0: HARBOURSIDE_GROUND_SOFFIT, y1: HARBOURSIDE_MIN_HEIGHT, courses: 3,
    bayWidth: 2.2, balconies: false, spandrel: 1.15, seed: 93,
    glassA: [0.05,0.125,0.135], glassB: [0.20,0.33,0.31], spandrelTint: [0.48,0.26,0.15], litThreshold: 0.75,
  }, materials, 'The Harbourside three upper podium courses');

  meshFromGeometry(group, roofGeometry(site.localRing, HARBOURSIDE_MIN_HEIGHT), materials.roof, 'The Harbourside podium — 20 m tower datum roof');

  // Entrance canopy and signage facing Austin Road West
  const entranceEdge = 0;
  addEntranceCanopy(group, site, entranceEdge, materials, {
    name: 'The Harbourside — Austin Road West entrance canopy', width: 22, projection: 5.6, y: 5.5,
  });
  addEdgeSign(group, site, entranceEdge, '君臨天下', 'THE HARBOURSIDE · 1 AUSTIN ROAD WEST', 11.5, 18, 2.2, 0.52, {
    background: '#4a2c1d', foreground: '#f4e4c8', accent: '#d4a259',
  });

  const colliders = [
    ...street.colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base })),
    ...harbourCityRingColliders(site, base + HARBOURSIDE_GROUND_SOFFIT, base + HARBOURSIDE_MIN_HEIGHT, 0.44),
  ];

  return { group, colliders, openRoadBays: street.openRoadBays, entranceBays: street.entranceBays, panels: upper.panels };
}

export function buildTheHarbourside(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group();
  root.name = 'The Harbourside — three 255 m wave towers, high-level sky corridors and podium';
  scene.add(root);

  const materials = harbourCityPalette({
    stone: [0.46,0.28,0.18], paleStone: [0.74,0.70,0.58], metal: [0.38,0.25,0.18],
    roof: [0.22,0.26,0.25], roughness: 0.26, metalness: 0.35,
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
  materials.bronze = new THREE.MeshStandardMaterial({ color: 0x8a543b, roughness: 0.44, metalness: 0.45 });
  warmWindowEmission(materials.glazing, [1.0,0.79,0.50], 2.8);

  const podium = buildPodium(root, groundOffset, materials);
  const towers = buildTowers(root, groundOffset, materials);
  const skyLinks = buildSkyCorridors(root, groundOffset, materials);

  const colliders = [...podium.colliders, ...towers.colliders, ...skyLinks.colliders];

  const landmarks = [HARBOURSIDE_SITE, ...HARBOURSIDE_TOWER_SITES].map((site) => ({
    name: site.name, englishName: site.englishName, x: site.x, z: site.z, w: site.w, d: site.d,
    h: site === HARBOURSIDE_SITE ? HARBOURSIDE_HEIGHT : site.height, bounds: { ...site.bounds }, ring: site.ring, osmId: site.osmId,
    heightEvidence: site === HARBOURSIDE_SITE ? 'Estate label; three OSM towers are each 255 m / 74 levels / min_height 20 m' : 'OSM height=255, building:levels=74, min_height=20',
  }));

  return {
    root,
    groups: { podium: podium.group, ...towers.groups, skyLinks: skyLinks.group },
    colliders, landmarks, groundOffset,
    sites: {
      estate: HARBOURSIDE_SITE, podium: HARBOURSIDE_PODIUM_SITE,
      t1: HARBOURSIDE_T1_SITE, t2: HARBOURSIDE_T2_SITE, t3: HARBOURSIDE_T3_SITE,
    },
    groundHeightAt: (x, z, ground) => theHarboursideTerrainHeightAt(x, z, ground, groundOffset),
    stats: {
      theHarboursideSourceTowers: 3, theHarboursideHeight: HARBOURSIDE_HEIGHT, theHarboursideSourceLevels: 74,
      theHarboursideMinHeight: HARBOURSIDE_MIN_HEIGHT, theHarboursideVisualCoursesPerTower: HARBOURSIDE_VISUAL_COURSES,
      theHarboursideResidentialPanels: towers.panels + podium.panels + skyLinks.panels,
      theHarboursideStructuralFins: towers.fins, theHarboursideSkyLinks: HARBOURSIDE_SKY_LINKS.length,
      theHarboursideColliders: colliders.length,
    },
  };
}
