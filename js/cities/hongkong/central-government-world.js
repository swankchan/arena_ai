import * as THREE from 'three/webgpu';
import {
  CGO_SITE, CGO_WEST_SITE, CGO_EAST_SITE, CGO_CONFERENCE_SITE, CGO_PODIUM_SITE,
  CGO_OPEN_DOOR_SITE, CGO_WEST_INNER_LOCAL_RING, CGO_OPEN_DOOR_ENTRANCE, CGO_PODIUM_OPEN_DOOR_EDGE,
  CEO_SITE, CEO_MAIN_ENTRANCE, LEGCO_SITE, LEGCO_MAIN_ENTRANCE,
  CGO_OFFICE_HEIGHT, CGO_LOW_BLOCK_HEIGHT, CGO_GROUND_SOFFIT, CGO_OPEN_DOOR_SOFFIT,
  CGO_OFFICE_VISUAL_COURSES, LEGCO_HEIGHT, LEGCO_LOW_BLOCK_HEIGHT, CEO_HEIGHT,
  centralGovernmentTerrainHeightAt,
} from './central-government-architecture.js';
import {
  harbourCityRingColliders, harbourCityLocalCollider, harbourCityEdgeOutward,
} from './harbour-city-architecture.js';
import {
  store, quad, merged, meshStore, box, beam, cylinder, edgeBox, point, ringBand, roofGeometry,
  harbourCityPalette, warmWindowEmission, createStreetLevel, hash, mix, addEdgeSign, addEntranceCanopy,
} from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry } from './tst-hotel-world-utils.js';
import { pointInFlatRing } from './landmark-site.js';

const lerp = (a, b, t) => a + (b - a) * t;
const absolute = (colliders, base) => colliders.map((collider) => ({ ...collider, minY: collider.minY + base, maxY: collider.maxY + base }));
function localBoxSite(site, cx, cz, w, d, key) {
  return Object.freeze({ ...site, key, osmId: null, osmType: null, source: null, photoDirected: true,
    localRing: Object.freeze([cx - w / 2, cz - d / 2, cx + w / 2, cz - d / 2, cx + w / 2, cz + d / 2, cx - w / 2, cz + d / 2, cx - w / 2, cz - d / 2]) });
}

// Actual panel geometry, continuous double-skin fins and transoms follow every source edge. There is no window texture.
function createCurtainWall(site, rings, options) {
  const glass = store(), spandrel = store(), backing = store(), frames = [], deepFins = [];
  let panels = 0, fins = 0;
  for (const ring of rings) {
    const ringSite = ring === site.localRing ? site : { ...site, localRing: ring };
    for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
      const length = harbourCityEdgeOutward(ring, edge).length;
      if (length < 0.08) continue;
      const bays = Math.max(1, Math.round(length / (options.bayWidth ?? 1.85)));
      const p = (t, y, o = 0.04) => point(ringSite, edge, t, y, o);
      quad(backing, p(0, options.y0, -0.18), p(1, options.y0, -0.18), p(1, options.y1, -0.18), p(0, options.y1, -0.18), options.backingTint ?? [0.055, 0.065, 0.078]);
      for (let floor = 0; floor < options.courses; floor++) {
        const low = lerp(options.y0, options.y1, floor / options.courses);
        const high = lerp(options.y0, options.y1, (floor + 1) / options.courses);
        const spandrelHeight = Math.min(options.spandrel ?? 0.72, (high - low) * 0.28);
        quad(spandrel, p(0, low + 0.04, 0.025), p(1, low + 0.04, 0.025), p(1, low + spandrelHeight, 0.025), p(0, low + spandrelHeight, 0.025), options.spandrelTint ?? [0.20, 0.23, 0.25]);
        for (let bay = 0; bay < bays; bay++) {
          const t0 = bay / bays + 0.00035, t1 = (bay + 1) / bays - 0.00035;
          const variation = hash(edge + (site.osmId ?? 17), floor + 29, bay + 47, options.seed ?? 0);
          const tint = mix(options.glassA ?? [0.055, 0.075, 0.105], options.glassB ?? [0.19, 0.23, 0.28], variation * 0.78);
          const lit = variation > (options.litThreshold ?? 0.87) ? 0.05 + hash(floor, bay, edge, 811) * 0.20 : 0;
          quad(glass, p(t0, low + spandrelHeight + 0.08), p(t1, low + spandrelHeight + 0.08), p(t1, high - 0.12), p(t0, high - 0.12), tint, lit);
          panels++;
        }
        edgeBox(frames, ringSite, edge, 0.5, low + 0.03, 0.11, length + 0.035, 0.105, 0.20);
      }
      for (let bay = 0; bay <= bays; bay++) {
        const t = bay / bays, q = p(t, (options.y0 + options.y1) * 0.5, 0.17);
        box(bay % 4 === 0 ? deepFins : frames, q, [bay % 4 === 0 ? 0.12 : 0.065, options.y1 - options.y0, bay % 4 === 0 ? 0.52 : 0.24], harbourCityEdgeOutward(ring, edge).ry);
        fins++;
      }
    }
  }
  return { glass, spandrel, backing, frames, deepFins, panels, fins };
}

function addCurtainWall(group, site, rings, options, materials, name) {
  const facade = createCurtainWall(site, rings, options);
  meshStore(group, facade.backing, materials.interior, `${name} — recessed backing`);
  meshStore(group, facade.spandrel, materials.interior, `${name} — spandrel panels`);
  meshStore(group, facade.glass, materials.glazing, `${name} — individual vision glass panels`);
  merged(group, facade.frames, materials.metal, `${name} — transoms and vertical double-skin fins`);
  merged(group, facade.deepFins, materials.paleStone, `${name} — deep pale structural fins`);
  return facade;
}

function addRoof(group, site, y, materials, name, options = {}) {
  meshFromGeometry(group, roofGeometry(site.localRing, y + 0.025), materials.roof, `${name} — roof deck`);
  const parapet = [], louvres = [], rails = [];
  ringBand(parapet, site, y + 0.52, 1.04, 0.03, 0.18);
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length;
    const count = Math.max(1, Math.floor(length / 2.4));
    for (let i = 0; i <= count; i++) {
      const p = point(site, edge, i / count, y + 1.35, 0.02);
      box(rails, p, [0.055, 0.72, 0.055]);
    }
    edgeBox(rails, site, edge, 0.5, y + 1.72, 0.02, length, 0.055, 0.055);
  }
  for (let x = -(options.plantWidth ?? 12) / 2; x <= (options.plantWidth ?? 12) / 2; x += 1.1) {
    box(louvres, [x + (options.plantX ?? 0), y + 0.75, options.plantZ ?? 0], [0.32, 1.5, options.plantDepth ?? 5]);
  }
  merged(group, parapet, materials.paleStone, `${name} — thick roof parapet`);
  merged(group, rails, materials.metal, `${name} — roof railing posts and top rails`);
  merged(group, louvres, materials.metal, `${name} — roof plant louvres`);
}

function addOpenDoorSoffit(group, materials) {
  const site = CGO_OPEN_DOOR_SITE, y = CGO_OPEN_DOOR_SOFFIT;
  meshFromGeometry(group, roofGeometry(site.localRing, y), materials.paleStone, 'CGC Open Door — pale coffered soffit over a real void');
  const grid = [], ring = site.localRing;
  for (let edge = 0; edge < 4; edge++) {
    const opposite = (edge + 2) % 4;
    for (let sample = 1; sample < 8; sample++) {
      const t = sample / 8;
      beam(grid, point(site, edge, t, y - 0.15, -0.05), point(site, opposite, 1 - t, y - 0.15, -0.05), 0.12, 0.18);
    }
    const length = harbourCityEdgeOutward(ring, edge).length;
    edgeBox(grid, site, edge, 0.5, y - 0.65, 0.15, length, 1.3, 0.65);
  }
  merged(group, grid, materials.paleStone, 'CGC Open Door — deep reveals and soffit coffer ribs');
  addEdgeSign(group, site, CGO_OPEN_DOOR_ENTRANCE.sourceEdge, '政府總部', 'CENTRAL GOVERNMENT OFFICES', 8.8, 15, 2.25, 0.42,
    { background: '#e2e4df', foreground: '#28343a', accent: '#7d8b8e' });
}

function addDoorPaving(group, materials) {
  const site = CGO_OPEN_DOOR_SITE, bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < site.localRing.length; i += 2) {
    bounds.minX = Math.min(bounds.minX, site.localRing[i]); bounds.maxX = Math.max(bounds.maxX, site.localRing[i]);
    bounds.minZ = Math.min(bounds.minZ, site.localRing[i + 1]); bounds.maxZ = Math.max(bounds.maxZ, site.localRing[i + 1]);
  }
  const tiles = [];
  for (let x = bounds.minX + 1; x < bounds.maxX; x += 2) for (let z = bounds.minZ + 1; z < bounds.maxZ; z += 2) {
    if (!pointInFlatRing(site.localRing, x, z)) continue;
    box(tiles, [x, 0.035, z], [1.94, 0.07, 1.94]);
  }
  merged(group, tiles, materials.stone, 'CGC Open Door — walkable stone paving below the open breezeway', false);
}

function buildCgo(root, base, materials) {
  const groups = {};
  for (const [key, site] of [['west', CGO_WEST_SITE], ['east', CGO_EAST_SITE], ['conference', CGO_CONFERENCE_SITE], ['podium', CGO_PODIUM_SITE]]) {
    const group = new THREE.Group(); group.name = `Central Government Complex — ${key}`; group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group); groups[key] = group;
  }
  const street = createStreetLevel(CGO_PODIUM_SITE, { soffit: CGO_GROUND_SOFFIT, customEdges: [CGO_PODIUM_OPEN_DOOR_EDGE], bayWidth: 3.8,
    glassA: [0.055, 0.10, 0.12], glassB: [0.19, 0.28, 0.30], stoneTint: [0.46, 0.48, 0.47] });
  meshStore(groups.podium, street.backing, materials.interior, 'CGC podium — recessed ground lobby outside roads');
  meshStore(groups.podium, street.glass, materials.glazing, 'CGC podium — road-safe ground glazing and open civic entrance');
  meshStore(groups.podium, street.stone, materials.interior, 'CGC podium — stone spandrels');
  merged(groups.podium, street.frames, materials.metal, 'CGC podium — preserved-road lintels');
  merged(groups.podium, street.columns, materials.paleStone, 'CGC podium — road-safe columns');

  const west = addCurtainWall(groups.west, CGO_WEST_SITE, [CGO_WEST_SITE.localRing], {
    y0: CGO_LOW_BLOCK_HEIGHT, y1: CGO_OFFICE_HEIGHT, courses: CGO_OFFICE_VISUAL_COURSES, bayWidth: 1.8, seed: 11,
    glassA: [0.045, 0.052, 0.077], glassB: [0.16, 0.17, 0.22], spandrelTint: [0.16, 0.17, 0.20],
  }, materials, 'CGC West Wing exact outer relation ring');
  const westReveal = addCurtainWall(groups.west, CGO_WEST_SITE, [CGO_WEST_INNER_LOCAL_RING], {
    y0: CGO_LOW_BLOCK_HEIGHT, y1: CGO_OPEN_DOOR_SOFFIT, courses: 16, bayWidth: 1.8, seed: 12,
    glassA: [0.045, 0.055, 0.075], glassB: [0.18, 0.20, 0.24], spandrelTint: [0.19, 0.20, 0.22],
  }, materials, 'CGC West Wing source void below the link');
  const link = addCurtainWall(groups.west, CGO_WEST_SITE, [CGO_WEST_INNER_LOCAL_RING], {
    y0: CGO_OPEN_DOOR_SOFFIT, y1: CGO_OFFICE_HEIGHT, courses: 3, bayWidth: 1.8, seed: 13, spandrel: 1.25,
    glassA: [0.055, 0.07, 0.09], glassB: [0.20, 0.23, 0.27], spandrelTint: [0.26, 0.28, 0.30],
  }, materials, 'CGC three-level elevated link above the Open Door');
  addOpenDoorSoffit(groups.west, materials); addDoorPaving(groups.west, materials); addRoof(groups.west, CGO_WEST_SITE, CGO_OFFICE_HEIGHT, materials, 'CGC West Wing and high link', { plantWidth: 18, plantDepth: 6 });

  const east = addCurtainWall(groups.east, CGO_EAST_SITE, [CGO_EAST_SITE.localRing], {
    y0: CGO_GROUND_SOFFIT, y1: CGO_OFFICE_HEIGHT, courses: 27, bayWidth: 1.8, seed: 21,
    glassA: [0.045, 0.055, 0.078], glassB: [0.17, 0.19, 0.24], spandrelTint: [0.17, 0.18, 0.21],
  }, materials, 'CGC East Wing exact angled office ring');
  addRoof(groups.east, CGO_EAST_SITE, CGO_OFFICE_HEIGHT, materials, 'CGC East Wing', { plantWidth: 15, plantDepth: 5 });

  const conference = addCurtainWall(groups.conference, CGO_CONFERENCE_SITE, [CGO_CONFERENCE_SITE.localRing], {
    y0: CGO_GROUND_SOFFIT, y1: CGO_LOW_BLOCK_HEIGHT, courses: 4, bayWidth: 2.15, seed: 31, spandrel: 0.55,
    glassA: [0.07, 0.13, 0.15], glassB: [0.26, 0.36, 0.37], spandrelTint: [0.42, 0.44, 0.43], litThreshold: 0.72,
  }, materials, 'CGC Conference Hall four-level low block');
  addRoof(groups.conference, CGO_CONFERENCE_SITE, CGO_LOW_BLOCK_HEIGHT, materials, 'CGC Conference Hall', { plantWidth: 10, plantDepth: 4 });

  const colliders = [
    ...absolute(street.colliders, base),
    ...harbourCityRingColliders(CGO_WEST_SITE, base + CGO_LOW_BLOCK_HEIGHT, base + CGO_OFFICE_HEIGHT, 0.48),
    ...harbourCityRingColliders(CGO_OPEN_DOOR_SITE, base + CGO_LOW_BLOCK_HEIGHT, base + CGO_OPEN_DOOR_SOFFIT, 0.48),
    ...harbourCityRingColliders(CGO_OPEN_DOOR_SITE, base + CGO_OPEN_DOOR_SOFFIT, base + CGO_OFFICE_HEIGHT, 0.48),
    ...harbourCityRingColliders(CGO_EAST_SITE, base + CGO_GROUND_SOFFIT, base + CGO_OFFICE_HEIGHT, 0.48),
    ...harbourCityRingColliders(CGO_CONFERENCE_SITE, base + CGO_GROUND_SOFFIT, base + CGO_LOW_BLOCK_HEIGHT, 0.48),
  ];
  return { groups, colliders, panels: west.panels + westReveal.panels + link.panels + east.panels + conference.panels,
    fins: west.fins + westReveal.fins + link.fins + east.fins + conference.fins, openRoadBays: street.openRoadBays, closedRoadBays: street.closedBays };
}

function buildChiefExecutiveOffice(root, base, materials) {
  const group = new THREE.Group(); group.name = 'Chief Executive’s Office — exact four-storey government building'; group.position.set(CEO_SITE.x, base, CEO_SITE.z); group.rotation.y = CEO_SITE.ry; root.add(group);
  const street = createStreetLevel(CEO_SITE, { soffit: CGO_GROUND_SOFFIT, customEdges: [CEO_MAIN_ENTRANCE.sourceEdge], bayWidth: 3.4,
    glassA: [0.06, 0.11, 0.13], glassB: [0.22, 0.30, 0.31] });
  meshStore(group, street.backing, materials.interior, 'CEO — ground-floor backing outside the access way');
  meshStore(group, street.glass, materials.glazing, 'CEO — road-safe ground glazing'); merged(group, street.frames, materials.metal, 'CEO — ground lintels'); merged(group, street.columns, materials.paleStone, 'CEO — ground columns');
  const upper = addCurtainWall(group, CEO_SITE, [CEO_SITE.localRing], { y0: CGO_GROUND_SOFFIT, y1: CEO_HEIGHT, courses: 3, bayWidth: 2.2, spandrel: 1.5, seed: 41,
    glassA: [0.08, 0.13, 0.15], glassB: [0.28, 0.34, 0.35], spandrelTint: [0.54, 0.55, 0.52] }, materials, 'CEO — three upper office courses above the ground floor');
  addRoof(group, CEO_SITE, CEO_HEIGHT, materials, 'Chief Executive’s Office', { plantWidth: 16, plantDepth: 6 });
  addEntranceCanopy(group, CEO_SITE, CEO_MAIN_ENTRANCE.sourceEdge, materials, { name: 'CEO — Tim Wa Avenue framed entrance canopy', width: 18, projection: 4.2, y: 4.8 });
  addEdgeSign(group, CEO_SITE, CEO_MAIN_ENTRANCE.sourceEdge, '行政長官辦公室', 'CHIEF EXECUTIVE’S OFFICE', 7.4, 18, 2.4, 0.4,
    { background: '#e5e3dc', foreground: '#303a3b', accent: '#7b8987' });
  return { group, colliders: [...absolute(street.colliders, base), ...harbourCityRingColliders(CEO_SITE, base + CGO_GROUND_SOFFIT, base + CEO_HEIGHT, 0.46)], panels: upper.panels };
}

function buildLegCo(root, base, materials) {
  const group = new THREE.Group(); group.name = 'Legislative Council Complex — curved chamber, disc roof and high block'; group.position.set(LEGCO_SITE.x, base, LEGCO_SITE.z); group.rotation.y = LEGCO_SITE.ry; root.add(group);
  const street = createStreetLevel(LEGCO_SITE, { soffit: CGO_GROUND_SOFFIT, customEdges: [LEGCO_MAIN_ENTRANCE.sourceEdge], bayWidth: 3.5,
    glassA: [0.055, 0.12, 0.14], glassB: [0.22, 0.34, 0.35] });
  meshStore(group, street.backing, materials.interior, 'LegCo — ground backing outside access corridors'); meshStore(group, street.glass, materials.glazing, 'LegCo — road-safe public lobby glazing');
  merged(group, street.frames, materials.metal, 'LegCo — ground lintels'); merged(group, street.columns, materials.paleStone, 'LegCo — public lobby columns');
  const lower = addCurtainWall(group, LEGCO_SITE, [LEGCO_SITE.localRing], { y0: CGO_GROUND_SOFFIT, y1: LEGCO_LOW_BLOCK_HEIGHT, courses: 6, bayWidth: 2.0, seed: 51,
    glassA: [0.06, 0.13, 0.16], glassB: [0.24, 0.37, 0.38], spandrelTint: [0.32, 0.36, 0.37], litThreshold: 0.78 }, materials, 'LegCo — exact curved low-block curtain wall');
  addRoof(group, LEGCO_SITE, LEGCO_LOW_BLOCK_HEIGHT, materials, 'LegCo low block', { plantWidth: 12, plantDepth: 4, plantX: 20 });

  const highSite = localBoxSite(LEGCO_SITE, 10, 0, 40, 32, 'legcoPhotoDirectedHighBlock');
  meshFromGeometry(group, ringShellGeometry(highSite.localRing, LEGCO_LOW_BLOCK_HEIGHT - 0.1, LEGCO_HEIGHT), materials.dark, 'LegCo high block — recessed dark upper volume');
  const high = addCurtainWall(group, highSite, [highSite.localRing], { y0: LEGCO_LOW_BLOCK_HEIGHT, y1: LEGCO_HEIGHT, courses: 4, bayWidth: 1.9, seed: 52,
    glassA: [0.035, 0.045, 0.065], glassB: [0.13, 0.15, 0.20], spandrelTint: [0.12, 0.13, 0.16] }, materials, 'LegCo ten-storey high-block upper crown');
  addRoof(group, highSite, LEGCO_HEIGHT, materials, 'LegCo high block', { plantWidth: 14, plantDepth: 6 });

  const chamber = [], chamberFrames = [], disc = [], discRails = [];
  const cx = -32, cz = -2, rx = 19, rz = 15;
  const drum = new THREE.CylinderGeometry(1, 1, 25.5, 64, 1, true); drum.scale(rx, 1, rz); drum.translate(cx, 15.4, cz); chamber.push(drum);
  for (let i = 0; i < 48; i++) {
    const angle = i / 48 * Math.PI * 2, x = cx + Math.cos(angle) * (rx + 0.08), z = cz + Math.sin(angle) * (rz + 0.08);
    box(chamberFrames, [x, 15.4, z], [0.11, 25.5, 0.24], -angle);
  }
  for (const y of [5.2, 10.4, 15.6, 20.8, 26.0]) {
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2, b = (i + 1) / 48 * Math.PI * 2;
      beam(chamberFrames, [cx + Math.cos(a) * (rx + 0.11), y, cz + Math.sin(a) * (rz + 0.11)], [cx + Math.cos(b) * (rx + 0.11), y, cz + Math.sin(b) * (rz + 0.11)], 0.10, 0.12);
    }
  }
  const canopy = new THREE.CylinderGeometry(1, 1, 1.15, 80); canopy.scale(24, 1, 18.5); canopy.translate(cx, 31.0, cz); disc.push(canopy);
  for (let i = 0; i < 64; i++) {
    const angle = i / 64 * Math.PI * 2;
    box(discRails, [cx + Math.cos(angle) * 23.4, 32.0, cz + Math.sin(angle) * 18.0], [0.07, 0.85, 0.07]);
  }
  const chamberGlass = new THREE.MeshStandardMaterial({ color: 0x31545d, roughness: 0.24, metalness: 0.34, side: THREE.DoubleSide });
  merged(group, chamber, chamberGlass, 'LegCo — curved glass council chamber drum');
  merged(group, chamberFrames, materials.metal, 'LegCo — chamber vertical mullions and horizontal transoms');
  merged(group, disc, materials.paleStone, 'LegCo — projecting oval disc roof above the council chamber');
  merged(group, discRails, materials.metal, 'LegCo — disc-roof perimeter railing');
  addEntranceCanopy(group, LEGCO_SITE, LEGCO_MAIN_ENTRANCE.sourceEdge, materials, { name: 'LegCo — public entrance canopy', width: 21, projection: 4.8, y: 4.9 });
  addEdgeSign(group, LEGCO_SITE, LEGCO_MAIN_ENTRANCE.sourceEdge, '立法會綜合大樓', 'LEGISLATIVE COUNCIL COMPLEX', 8.0, 21, 2.5, 0.42,
    { background: '#e2e4df', foreground: '#293538', accent: '#7c8b8c' });
  return { group, panels: lower.panels + high.panels,
    colliders: [...absolute(street.colliders, base), ...harbourCityRingColliders(LEGCO_SITE, base + CGO_GROUND_SOFFIT, base + LEGCO_LOW_BLOCK_HEIGHT, 0.46),
      ...harbourCityRingColliders(highSite, base + LEGCO_LOW_BLOCK_HEIGHT, base + LEGCO_HEIGHT, 0.46),
      harbourCityLocalCollider(LEGCO_SITE, cx, cz, rx * 1.55, rz * 1.55, base + 2.6, base + 28.5)] };
}

export function buildCentralGovernmentComplex(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group(); root.name = 'Tamar Central Government Complex — authored Open Door, CEO and LegCo'; scene.add(root);
  const materials = harbourCityPalette({ stone: [0.48, 0.49, 0.47], paleStone: [0.72, 0.74, 0.72], metal: [0.42, 0.46, 0.48], roof: [0.32, 0.35, 0.35], roughness: 0.24, metalness: 0.38 });
  materials.dark.color.set(0x151a23); warmWindowEmission(materials.glazing, [1.0, 0.79, 0.52], 0.64);
  const cgo = buildCgo(root, groundOffset, materials), ceo = buildChiefExecutiveOffice(root, groundOffset, materials), legco = buildLegCo(root, groundOffset, materials);
  const colliders = [...cgo.colliders, ...ceo.colliders, ...legco.colliders];
  const landmarks = [CGO_SITE, CEO_SITE, LEGCO_SITE].map((site) => ({
    name: site.name, englishName: site.englishName, x: site.x, z: site.z, w: site.w, d: site.d,
    h: site === CGO_SITE ? CGO_OFFICE_HEIGHT : site.height, bounds: { ...site.bounds }, ring: site.ring, osmId: site.osmId,
    heightEvidence: site === CGO_SITE ? 'Gammon / Building Journal 120 m CGC' : site === CEO_SITE ? 'OSM height=37' : 'Building Journal 52.3 m LegCo',
  }));
  return {
    root, groups: { ...cgo.groups, ceo: ceo.group, legco: legco.group }, colliders, landmarks, groundOffset,
    sites: { cgo: CGO_SITE, west: CGO_WEST_SITE, east: CGO_EAST_SITE, ceo: CEO_SITE, legco: LEGCO_SITE },
    groundHeightAt: (x, z, ground) => centralGovernmentTerrainHeightAt(x, z, ground, groundOffset),
    stats: {
      centralGovernmentSourceBuildings: 5, centralGovernmentSourceRelations: 1, centralGovernmentOfficeHeight: CGO_OFFICE_HEIGHT,
      centralGovernmentLowBlockHeight: CGO_LOW_BLOCK_HEIGHT, centralGovernmentOpenDoorSoffit: CGO_OPEN_DOOR_SOFFIT,
      centralGovernmentOpenDoorSourceVoid: true, centralGovernmentLinkLevels: 3, centralGovernmentCurtainPanels: cgo.panels + ceo.panels + legco.panels,
      centralGovernmentDoubleSkinFins: cgo.fins, centralGovernmentOpenRoadBays: cgo.openRoadBays,
      chiefExecutiveOfficeHeight: CEO_HEIGHT, legislativeCouncilHeight: LEGCO_HEIGHT, centralGovernmentColliders: colliders.length,
    },
  };
}
