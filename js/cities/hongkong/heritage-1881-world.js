import * as THREE from 'three/webgpu';
import {
  HERITAGE_1881_COMPOUND, HERITAGE_1881_MALL, FWD_HOUSE_1881, FWD_HOUSE_1881_INNER_RING,
  ROUND_HOUSE_1881, HERITAGE_1881_HEIGHTS, HERITAGE_1881_MAIN_STAIR, ROUND_HOUSE_CURVED_STAIR,
  HERITAGE_1881_COURTYARD_RING, heritage1881TerrainHeightAt, heritage1881GroundHeightAt,
} from './heritage-1881-architecture.js';
import {
  harbourCityEdgeOutward, harbourCityRingColliders, harbourCitySegmentCollider, harbourCityLocalCollider,
  harbourCityWorldToLocal,
} from './harbour-city-architecture.js';
import {
  merged, meshStore, box, beam, cylinder, sphere, edgeBox, point, ringBand, harbourCityPalette,
  scaledRing, featureGroup, signMesh, nightAmount,
} from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry, archPanelGeometry, placeFacadeGeometry } from './tst-hotel-world-utils.js';
import { color } from 'three/tsl';

function ringSlabGeometry(outer, holes, y, thickness = 0.24) {
  const shape = new THREE.Shape();
  for (let i = 0; i < outer.length - 2; i += 2) {
    if (i === 0) shape.moveTo(outer[i], outer[i + 1]); else shape.lineTo(outer[i], outer[i + 1]);
  }
  shape.closePath();
  for (const ring of holes) {
    const hole = new THREE.Path();
    for (let i = 0; i < ring.length - 2; i += 2) {
      if (i === 0) hole.moveTo(ring[i], ring[i + 1]); else hole.lineTo(ring[i], ring[i + 1]);
    }
    hole.closePath(); shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
  geometry.rotateX(Math.PI / 2); geometry.translate(0, y, 0); geometry.computeVertexNormals(); return geometry;
}

function hipRoofGeometry(cx, cz, width, depth, eaveY, rise) {
  const x0 = cx - width / 2, x1 = cx + width / 2, z0 = cz - depth / 2, z1 = cz + depth / 2;
  const ridge = Math.max(0, (width - depth) * 0.42), positions = [
    x0,eaveY,z0, x1,eaveY,z0, x1,eaveY,z1, x0,eaveY,z1,
    cx-ridge,eaveY+rise,cz, cx+ridge,eaveY+rise,cz,
  ], indices = [0,4,5, 0,5,1, 3,2,5, 3,5,4, 0,3,4, 1,5,2, 0,1,2, 0,2,3];
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function arcStepGeometry(inner, outer, a0, a1, topY, rise) {
  const shape = new THREE.Shape(); shape.absarc(0, 0, outer, a0, a1, false);
  shape.lineTo(Math.cos(a1) * inner, Math.sin(a1) * inner); shape.absarc(0, 0, inner, a1, a0, true); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: rise, bevelEnabled: false, curveSegments: 2 });
  geometry.rotateX(Math.PI / 2); geometry.translate(0, topY, 0); return geometry;
}

// Real arch panels, curved voussoir beams, jambs, capitals and balusters follow every irregular source edge.
function createArcade(site, options) {
  const glass = [], piers = [], arches = [], rails = [];
  let archCount = 0, balusters = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length; if (length < 0.45) continue;
    const bays = Math.max(1, Math.round(length / (options.bayWidth ?? 3.6)));
    for (let level = 0; level < options.levels; level++) {
      const base = options.y0 + level * options.floorHeight, height = options.floorHeight - 0.52;
      for (let bay = 0; bay < bays; bay++) {
        const middle = (bay + 0.5) / bays;
        if (options.skip?.(edge, level, middle)) continue;
        const portal = options.portal?.(edge, level, middle);
        const rectangular = options.rectangular?.(edge, level, middle);
        const openGallery = options.openGallery?.(edge, level, middle);
        const width = Math.min(length / bays * 0.74, options.maxOpening ?? 3.1), radius = width / 2;
        if (!portal && !openGallery) placeFacadeGeometry(glass, archPanelGeometry(width, height), site, edge, middle, 0.035).translate(0, base + 0.16, 0);
        const shoulder = height - radius;
        for (const side of [-1, 1]) edgeBox(piers, site, edge, middle + side * radius / length,
          base + 0.16 + shoulder * 0.5, 0.11, 0.17, shoulder, 0.28);
        if (rectangular) {
          edgeBox(arches, site, edge, middle, base + height + 0.05, 0.13, width, 0.22, 0.25);
        } else for (let segment = 0; segment < 12; segment++) {
          const a = segment / 12 * Math.PI, b = (segment + 1) / 12 * Math.PI;
          const pa = point(site, edge, middle + Math.cos(a) * radius / length, base + 0.16 + shoulder + Math.sin(a) * radius, 0.13);
          const pb = point(site, edge, middle + Math.cos(b) * radius / length, base + 0.16 + shoulder + Math.sin(b) * radius, 0.13);
          beam(arches, pa, pb, 0.19, 0.25);
        }
        if (!rectangular) edgeBox(arches, site, edge, middle, base + 0.16 + height + 0.06, 0.15, 0.30, 0.30, 0.34);
        archCount++;
        if (options.balustrades && (level > 0 || options.groundBalustrades)) {
          edgeBox(rails, site, edge, middle, base + 0.24, 0.32, length / bays * 0.82, 0.13, 0.22);
          edgeBox(rails, site, edge, middle, base + 1.02, 0.32, length / bays * 0.86, 0.15, 0.24);
          for (let item = 1; item <= 5; item++) {
            const p = point(site, edge, bay / bays + item / 6 / bays, base + 0.63, 0.32);
            cylinder(rails, p, 0.065, 0.68, 8); balusters++;
          }
        }
      }
      for (let bay = 0; bay <= bays; bay++) {
        const t = bay / bays;
        edgeBox(piers, site, edge, t, base + options.floorHeight * 0.5, 0.02, 0.34, options.floorHeight, 0.46);
        edgeBox(piers, site, edge, t, base + options.floorHeight - 0.22, 0.04, 0.58, 0.20, 0.62);
      }
    }
  }
  return { glass, piers, arches, rails, archCount, balusters };
}

function addArcade(group, site, options, materials, name) {
  const arcade = createArcade(site, options);
  merged(group, arcade.glass, materials.archDark, `${name} — recessed arched glazing and open portals`);
  merged(group, arcade.piers, materials.paleStone, `${name} — classical piers, jambs and capitals`);
  merged(group, arcade.arches, materials.paleStone, `${name} — twelve-piece curved arch voussoirs and keystones`);
  merged(group, arcade.rails, materials.paleStone, `${name} — individual verandah balusters and handrails`);
  return arcade;
}

function buildMainBuilding(root, base, materials) {
  const site = FWD_HOUSE_1881, group = new THREE.Group(); group.name = 'FWD House 1881 — three current verandah galleries and source courtyard';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const inner = [];
  for (let i = 0; i < FWD_HOUSE_1881_INNER_RING.length; i += 2) {
    const p = harbourCityWorldToLocal(site, FWD_HOUSE_1881_INNER_RING[i], FWD_HOUSE_1881_INNER_RING[i + 1]); inner.push(p.x, p.z);
  }
  const innerSite = { ...site, localRing: Object.freeze(inner) };
  for (const y of [12, 16, 20, 24]) meshFromGeometry(group, ringSlabGeometry(site.localRing, [inner], y), materials.paleStone,
    `Main Building — continuous verandah floor and source courtyard at ${y} m`);
  // Upper recessed walls leave a genuine verandah depth; the central ground portal remains physically and visually open.
  meshFromGeometry(group, ringShellGeometry(scaledRing(site.localRing, 0.91), 16, 24, false), materials.dark,
    'Main Building — recessed upper hotel walls behind the outer verandahs');
  meshFromGeometry(group, ringShellGeometry(scaledRing(inner, 1.10), 16, 24, false), materials.dark,
    'Main Building — recessed upper walls around the real inner courtyard');
  const outer = addArcade(group, site, { y0: 12, levels: 3, floorHeight: 4, bayWidth: 3.55, balustrades: true,
    portal: (edge, level, middle) => edge === 9 && level === 0 && Math.abs(middle - 0.5) < 0.08,
    rectangular: (edge, level) => edge === 9 && level > 0,
    openGallery: (edge, level) => edge === 9 && level > 0 }, materials, 'Main Building outer three-gallery verandah');
  const courtyard = addArcade(group, innerSite, { y0: 12, levels: 3, floorHeight: 4, bayWidth: 3.35, balustrades: true }, materials, 'Main Building inner courtyard verandah');
  // Warm lights illuminate the south verandah without making the whole stone shell emissive.
  const galleryLights = [], frontLength = harbourCityEdgeOutward(site.localRing, 9).length;
  const count = Math.max(1, Math.round(frontLength / 3.55));
  for (let level = 0; level < 3; level++) for (let i = 0; i < count; i++) {
    edgeBox(galleryLights, site, 9, (i + 0.5) / count, 15.85 + level * 4, -0.32, 0.36, 0.08, 0.22);
  }
  merged(group, galleryLights, materials.warmLight, 'Main Building — warm south verandah downlights', false);
  const cornices = []; ringBand(cornices, site, 24.35, 0.36, 0.26, 0.42); ringBand(cornices, site, 25.55, 0.52, 0.30, 0.48);
  ringBand(cornices, innerSite, 24.35, 0.36, 0.20, 0.34); merged(group, cornices, materials.paleStone, 'Main Building — layered entablature and 26 m parapet datum');
  const quoins = [];
  for (const vertex of [0, 9, 10, 17, 18, 23]) for (let row = 0; row < 19; row++) {
    const x = site.localRing[vertex * 2], z = site.localRing[vertex * 2 + 1];
    box(quoins, [x, 12.34 + row * 0.64, z], [row % 2 ? 0.62 : 0.86, 0.42, row % 2 ? 0.86 : 0.62]);
  }
  merged(group, quoins, materials.paleStone, 'Main Building — dressed quoins at the south-west and south-east pavilions');
  meshFromGeometry(group, hipRoofGeometry(0, 17.7, 31.0, 15.0, 24.15, 1.75), materials.roof, 'Main Building — dark hipped slate roof behind the south parapet');
  const roofSeams = [];
  for (let z = 11; z <= 24; z += 1.15) box(roofSeams, [0, 24.20 + (1 - Math.abs(z - 17.7) / 7.5) * 1.75, z], [29.5, 0.055, 0.065]);
  merged(group, roofSeams, materials.metal, 'Main Building — raised slate roof seams');
  addArcadeSign(group, site, materials);
  const colliders = [
    ...harbourCityRingColliders(site, base + 16, base + 26, 0.44),
    ...harbourCityRingColliders(innerSite, base + 12, base + 26, 0.40),
    harbourCitySegmentCollider(site, 9, 0, 0.46, base + 12, base + 16, 0.44),
    harbourCitySegmentCollider(site, 9, 0.54, 1, base + 12, base + 16, 0.44),
  ];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) if (edge !== 9) colliders.push(harbourCitySegmentCollider(site, edge, 0, 1, base + 12, base + 16, 0.44));
  return { group, colliders, arches: outer.archCount + courtyard.archCount, balusters: outer.balusters + courtyard.balusters };
}

function addArcadeSign(group, site, materials) {
  const frame = featureGroup(site, 9, '1881 Heritage — south entrance stone lettering'); group.add(frame);
  const sign = signMesh('1881', 'HERITAGE · 前水警總部', 6.8, 1.45, { background: '#e8e3d7', foreground: '#5d4b32', accent: '#a88b57' });
  sign.position.set(0, 15.0, 0.48); frame.add(sign);
  const lamps = []; for (const x of [-4.1, 4.1]) { box(lamps, [x, 14.7, 0.42], [0.16, 0.55, 0.22]); sphere(lamps, [x, 15.05, 0.46], 0.15, 10); }
  merged(frame, lamps, materials.warmLight, '1881 Heritage — warm entrance lanterns', false);
}

function buildRetailTerraces(root, base, materials) {
  const site = HERITAGE_1881_MALL, group = new THREE.Group(); group.name = '1881 Heritage — layered retail arcades and open grand-stair void';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const courtyard = [];
  for (let i = 0; i < HERITAGE_1881_COURTYARD_RING.length; i += 2) {
    const p = harbourCityWorldToLocal(site, HERITAGE_1881_COURTYARD_RING[i], HERITAGE_1881_COURTYARD_RING[i + 1]); courtyard.push(p.x, p.z);
  }
  for (const y of [4, 8, 12]) meshFromGeometry(group, ringSlabGeometry(site.localRing, [courtyard], y), materials.stone,
    `Retail terraces — source-ring floor with open central stair well at ${y} m`);
  const stairPortalEdges = new Set([14, 15, 16, 17, 18]);
  const arcade = addArcade(group, site, { y0: 0, levels: 3, floorHeight: 4, bayWidth: 3.5, groundBalustrades: false,
    skip: (edge) => stairPortalEdges.has(edge) }, materials, '1881 three-level retail arcade');
  const bands = []; ringBand(bands, site, 3.92, 0.22, 0.18, 0.30, (edge) => !stairPortalEdges.has(edge));
  ringBand(bands, site, 7.92, 0.22, 0.18, 0.30, (edge) => !stairPortalEdges.has(edge));
  ringBand(bands, site, 11.72, 0.38, 0.25, 0.40, (edge) => !stairPortalEdges.has(edge));
  merged(group, bands, materials.paleStone, 'Retail terraces — continuous stone string courses interrupted only by the grand-stair portal');
  const colliders = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) if (!stairPortalEdges.has(edge)) colliders.push(harbourCitySegmentCollider(site, edge, 0, 1, base, base + 12, 0.44));
  return { group, colliders, arches: arcade.archCount };
}

function buildGrandStair(root, base, materials) {
  const stair = HERITAGE_1881_MAIN_STAIR, site = stair.site;
  // featureGroup uses source-local coordinates. It must be parented to the Main Building's
  // world transform; adding it directly to root stranded the whole staircase near Hong Kong Island.
  const siteFrame = new THREE.Group(); siteFrame.name = '1881 Heritage — Main Building world frame for grand stair';
  siteFrame.position.set(site.x, base, site.z); siteFrame.rotation.y = site.ry; root.add(siteFrame);
  const group = featureGroup(site, stair.sourceEdge, '1881 Heritage — 36-step central ceremonial staircase');
  siteFrame.add(group);
  const steps = [], rails = [], length = stair.bottomZ - stair.topZ, localStart = 25.62;
  // featureGroup originates on source edge 9; positive local z points down the photographed southern stair axis.
  for (let i = 0; i < stair.steps; i++) {
    const tread = length / stair.steps, top = stair.rise * (1 - i / stair.steps);
    box(steps, [0, top - 0.16, (i + 0.5) * tread], [stair.width, 0.32, tread + 0.025]);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, z = t * length, y = stair.rise * (1 - t);
      box(rails, [side * (stair.width * 0.5 + 0.18), y + 0.55, z], [0.16, 1.1, 0.16]);
    }
    beam(rails, [side * (stair.width * 0.5 + 0.18), stair.rise + 1.08, 0], [side * (stair.width * 0.5 + 0.18), 1.08, length], 0.14, 0.18);
  }
  merged(group, steps, materials.stone, '1881 Heritage — individual stone stair treads'); merged(group, rails, materials.paleStone, '1881 Heritage — grand-stair balustrade and sloping handrails');
  const sign = signMesh('1881 HERITAGE', 'FORMER MARINE POLICE HEADQUARTERS', 10.8, 1.25, { background: '#ddd8cb', foreground: '#4d4538', accent: '#9a8054' });
  sign.position.set(0, 1.65, length + 0.7); group.add(sign);
  return { group, steps: stair.steps, localStart };
}

function buildRoundHouse(root, base, materials) {
  const group = new THREE.Group(); group.name = '1881 Round House — time ball, oculi, curved stair and typhoon mast'; group.position.set(1040, base, -1450); root.add(group);
  const bastion = [], bands = [], arches = [], piers = [];
  cylinder(bastion, [0, 6, 0], 5.2, 12, 64);
  for (let y = 0.65; y < 11.8; y += 0.72) cylinder(bands, [0, y, 0], 5.225, 0.055, 64);
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2, nx = Math.cos(angle), nz = Math.sin(angle), ry = Math.atan2(nx, nz);
    const panel = archPanelGeometry(1.55, 3.15); panel.rotateY(ry); panel.translate(nx * 5.235, 0.35, nz * 5.235); arches.push(panel);
    box(piers, [Math.cos(angle + Math.PI / 16) * 5.24, 1.9, Math.sin(angle + Math.PI / 16) * 5.24], [0.32, 3.8, 0.32]);
  }
  merged(group, bastion, materials.stone, 'Round House — twelve-metre stone bastion'); merged(group, bands, materials.paleStone, 'Round House — horizontal dressed-stone courses');
  merged(group, arches, materials.archDark, 'Round House bastion — sixteen arched retail recesses'); merged(group, piers, materials.paleStone, 'Round House bastion — arcade piers');
  const body = [], cornice = [], dark = [], frames = [];
  cylinder(body, [0, 16.2, 0], 3.50, 8.4, 64, 3.25);
  cylinder(cornice, [0, 20.35, 0], 3.78, 0.34, 64); cylinder(cornice, [0, 20.68, 0], 3.48, 0.30, 64);
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; box(cornice, [Math.cos(a) * 3.47, 20.03, Math.sin(a) * 3.47], [0.22, 0.54, 0.28], -a); }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, nx = Math.cos(a), nz = Math.sin(a), ry = Math.atan2(nx, nz);
    const oculus = new THREE.CircleGeometry(0.53, 28); oculus.rotateY(ry); oculus.translate(nx * 3.34, 17.25, nz * 3.34); dark.push(oculus);
    const rim = new THREE.TorusGeometry(0.62, 0.105, 8, 28); rim.rotateY(ry); rim.translate(nx * 3.39, 17.25, nz * 3.39); frames.push(rim);
    box(frames, [nx * 3.43, 17.98, nz * 3.43], [0.26, 0.30, 0.20], ry);
  }
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + Math.PI / 4, nx = Math.cos(a), nz = Math.sin(a);
    const door = archPanelGeometry(1.08, 2.75); door.rotateY(Math.atan2(nx, nz)); door.translate(nx * 3.47, 12.35, nz * 3.47); dark.push(door);
  }
  const dome = new THREE.SphereGeometry(3.42, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.20, 1); dome.translate(0, 20.72, 0); body.push(dome);
  merged(group, body, materials.paleStone, 'Round House — tapered white tower and shallow roof dome'); merged(group, cornice, materials.paleStone, 'Round House — corbelled circular cornice');
  merged(group, dark, materials.archDark, 'Round House — eight oculi and four arched openings'); merged(group, frames, materials.paleStone, 'Round House — projecting oculus rims and keystones');
  const metal = [], ball = []; cylinder(metal, [0, 22.7, 0], 0.085, 4.2, 12); sphere(ball, [0, 24.15, 0], HERITAGE_1881_HEIGHTS.timeBallDiameter / 2, 28);
  merged(group, metal, materials.metal, 'Round House — time-ball mast'); merged(group, ball, materials.ballMetal, 'Round House — 1.83 m hollow-copper time ball');
  const balustrade = [];
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2, b = (i + 1) / 48 * Math.PI * 2;
    cylinder(balustrade, [Math.cos(a) * 4.96, 12.58, Math.sin(a) * 4.96], 0.065, 1.05, 8);
    beam(balustrade, [Math.cos(a) * 4.96, 13.10, Math.sin(a) * 4.96], [Math.cos(b) * 4.96, 13.10, Math.sin(b) * 4.96], 0.12, 0.14);
  }
  merged(group, balustrade, materials.paleStone, 'Round House — circular platform balustrade');
  const stairs = [], stairRails = [], curved = ROUND_HOUSE_CURVED_STAIR;
  for (let i = 0; i < curved.steps; i++) {
    const a0 = curved.startAngle + curved.sweep * i / curved.steps, a1 = curved.startAngle + curved.sweep * (i + 1) / curved.steps;
    const top = curved.rise * (i + 1) / curved.steps, rise = curved.rise / curved.steps + 0.025;
    const geometry = arcStepGeometry(curved.innerRadius, curved.outerRadius, a0, a1, top, rise); stairs.push(geometry);
    if (i % 3 === 0) for (const radius of [curved.innerRadius + 0.08, curved.outerRadius - 0.08]) {
      const a = (a0 + a1) / 2; cylinder(stairRails, [Math.cos(a) * radius, top + 0.52, Math.sin(a) * radius], 0.045, 1.04, 7);
    }
    for (const radius of [curved.innerRadius + 0.08, curved.outerRadius - 0.08]) beam(stairRails,
      [Math.cos(a0) * radius, top + 1.02, Math.sin(a0) * radius], [Math.cos(a1) * radius, top + 1.02, Math.sin(a1) * radius], 0.07, 0.08);
  }
  merged(group, stairs, materials.stone, 'Round House — 72 individual curved stone stair treads'); merged(group, stairRails, materials.metal, 'Round House — curved-stair posts and continuous handrails');
  const mast = [], rigging = []; cylinder(mast, [4.55, 22.4, 0], 0.15, 20.8, 14);
  beam(mast, [0.8, 28.6, 0], [8.0, 28.6, 0], 0.14, 0.14); beam(mast, [1.7, 25.7, 0], [7.1, 25.7, 0], 0.11, 0.11);
  for (const [x,z] of [[-3,-3],[-3,3],[3,-3],[3,3]]) beam(rigging, [4.55,31.4,0], [x,12.2,z], 0.025, 0.025);
  merged(group, mast, materials.metal, 'Round House — adjacent typhoon mast and yards'); merged(group, rigging, materials.metal, 'Round House — typhoon-mast standing rigging', false);
  const colliders = [
    ...harbourCityRingColliders(ROUND_HOUSE_1881, base, base + 11.4, 0.34),
    harbourCityLocalCollider(ROUND_HOUSE_1881, 0, 0, 7.0, 7.0, base + 12, base + 22),
  ];
  return { group, colliders, curvedSteps: curved.steps, oculi: 8 };
}

function buildCourtyardFountain(root, base, materials) {
  const group = new THREE.Group(); group.name = '1881 Heritage — courtyard stone fountain and water jets'; group.position.set(1082, base, -1440); root.add(group);
  const stone = [], water = [], jets = []; cylinder(stone, [0, 0.38, 0], 5.5, 0.76, 64); cylinder(stone, [0, 0.79, 0], 4.95, 0.18, 64);
  cylinder(water, [0, 0.91, 0], 4.55, 0.08, 64); cylinder(stone, [0, 1.15, 0], 1.15, 0.65, 40); cylinder(water, [0, 1.52, 0], 0.93, 0.08, 40);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; cylinder(jets, [Math.cos(a) * 3.45, 1.55, Math.sin(a) * 3.45], 0.035, 1.35 + (i % 3) * 0.28, 7); }
  cylinder(jets, [0, 2.25, 0], 0.055, 1.5, 8);
  merged(group, stone, materials.stone, '1881 courtyard — circular granite fountain basin'); merged(group, water, materials.water, '1881 courtyard — actual water surfaces', false);
  merged(group, jets, materials.waterJet, '1881 courtyard — sixteen perimeter jets and central jet', false);
  const colliderSite = { x: 1082, z: -1440, ry: 0 };
  return { group, colliders: [harbourCityLocalCollider(colliderSite, 0, 0, 10.8, 10.8, base, base + 1.15)], jets: 17 };
}

export function buildHeritage1881(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group(); root.name = '1881 Heritage — authored Former Marine Police Headquarters Compound'; scene.add(root);
  const materials = harbourCityPalette({ stone: [0.67, 0.64, 0.56], paleStone: [0.88, 0.86, 0.78], metal: [0.24, 0.28, 0.28], roof: [0.20, 0.23, 0.24] });
  materials.warmLight = new THREE.MeshStandardNodeMaterial({ color: 0xe0c7a1, roughness: 0.5 });
  materials.warmLight.emissiveNode = color(1, 0.64, 0.28).mul(nightAmount()).mul(0.65);
  materials.archDark = new THREE.MeshStandardNodeMaterial({ color: 0x263334, roughness: 0.34, metalness: 0.22, side: THREE.DoubleSide });
  materials.archDark.emissiveNode = color(0.72, 0.51, 0.27).mul(nightAmount()).mul(0.18);
  materials.ballMetal = new THREE.MeshStandardMaterial({ color: 0xb9c1bd, roughness: 0.26, metalness: 0.82 });
  materials.water = new THREE.MeshStandardMaterial({ color: 0x4f8f98, roughness: 0.16, metalness: 0.30, transparent: true, opacity: 0.82 });
  materials.waterJet = new THREE.MeshStandardMaterial({ color: 0xa9d7d7, roughness: 0.22, metalness: 0.05, transparent: true, opacity: 0.68 });
  const main = buildMainBuilding(root, groundOffset, materials), retail = buildRetailTerraces(root, groundOffset, materials);
  const stair = buildGrandStair(root, groundOffset, materials), roundHouse = buildRoundHouse(root, groundOffset, materials), fountain = buildCourtyardFountain(root, groundOffset, materials);
  const colliders = [...main.colliders, ...retail.colliders, ...roundHouse.colliders, ...fountain.colliders];
  const landmarks = [HERITAGE_1881_COMPOUND, FWD_HOUSE_1881, ROUND_HOUSE_1881].map((site) => ({
    name: site.name, englishName: site.englishName, x: site.x, z: site.z, w: site.w, d: site.d,
    h: site === HERITAGE_1881_COMPOUND ? 26 : site.height, bounds: { ...site.bounds }, ring: site.ring, osmId: site.osmId,
    heightEvidence: site === FWD_HOUSE_1881 ? 'OSM height=26 retained as overall scene datum; AMO/photos confirm three current storeys' : site.photoDirected ? 'Photo-directed Round House and 1.83 m time ball' : 'Compound label; not a building height measurement',
  }));
  return {
    root, groups: { main: main.group, retail: retail.group, stair: stair.group, roundHouse: roundHouse.group, fountain: fountain.group },
    colliders, landmarks, groundOffset, sites: { compound: HERITAGE_1881_COMPOUND, mall: HERITAGE_1881_MALL, main: FWD_HOUSE_1881, roundHouse: ROUND_HOUSE_1881 },
    groundHeightAt: (x, z, ground) => heritage1881GroundHeightAt(x, z, heritage1881TerrainHeightAt(x, z, ground, groundOffset), groundOffset),
    stats: {
      heritage1881SourceCompound: true, heritage1881SourceMallLevels: 3, heritage1881SourceHotelLevelsTag: 2,
      heritage1881CurrentMainGalleries: 3, heritage1881Arches: main.arches + retail.arches + 16,
      heritage1881Balusters: main.balusters + 48, heritage1881MainStairSteps: stair.steps,
      heritage1881RoundHouseCurvedSteps: roundHouse.curvedSteps, heritage1881RoundHouseOculi: roundHouse.oculi,
      heritage1881TimeBallDiameter: HERITAGE_1881_HEIGHTS.timeBallDiameter, heritage1881FountainJets: fountain.jets,
      heritage1881Colliders: colliders.length,
    },
  };
}
