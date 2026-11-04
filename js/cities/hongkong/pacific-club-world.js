import * as THREE from 'three/webgpu';
import {
  PACIFIC_CLUB_SITE, PACIFIC_CLUB_PIER_SITE, PACIFIC_CLUB_MAIN_ENTRANCE,
  harbourCityRingColliders, harbourCitySegmentCollider, harbourCityGroundHeightAt, harbourCityRoadRecords,
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import {
  store, quad, meshStore, merged, box, cylinder, sphere, beam, point, edgeBox, roofGeometry,
  harbourCityPalette, ringBand, ringFrame, addEdgeSign, signMesh,
} from './harbour-city-world-utils.js';

export const PACIFIC_CLUB_HEIGHT = 15;
export const PACIFIC_CLUB_OPENING_YEAR = 1990;
export const PACIFIC_CLUB_DECK_HEIGHT = 0.18;
export const PACIFIC_CLUB_BARREL_SPRING = 12.05;
export const PACIFIC_CLUB_BARREL_RISE = PACIFIC_CLUB_HEIGHT - PACIFIC_CLUB_BARREL_SPRING;
export const PACIFIC_CLUB_BARREL_START_X = -104;
export const PACIFIC_CLUB_BARREL_END_X = -40;

function facadeGroup(parent, site, edge, name) {
  const frame = ringFrame(site, edge), group = new THREE.Group(); group.name = name;
  group.position.set(frame.x, 0, frame.z); group.rotation.y = Math.atan2(frame.nx, frame.nz); parent.add(group); return group;
}

function railing(parts, site, edge, baseY, height = 1.05, spacing = 3) {
  const length = ringFrame(site, edge).length;
  for (const y of [baseY + 0.25, baseY + height * 0.62, baseY + height]) edgeBox(parts, site, edge, 0.5, y, 0, length, 0.065, 0.075);
  const count = Math.ceil(length / spacing);
  for (let i = 0; i <= count; i += 1) edgeBox(parts, site, edge, i / count, baseY + height * 0.5, 0, 0.075, height, 0.075);
}

function archGlazing(width, rectHeight) {
  const r = width / 2, shape = new THREE.Shape(); shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, rectHeight);
  shape.absarc(0, rectHeight, r, 0, Math.PI, false); shape.lineTo(-r, 0); return new THREE.ShapeGeometry(shape, 20);
}

function archTracery(parts, x, y, width, rectHeight, z = 0.12) {
  const r = width / 2;
  for (const dx of [-r, -r * 0.42, 0, r * 0.42, r]) box(parts, [x + dx, y + rectHeight * 0.5, z], [0.075, rectHeight, 0.09]);
  box(parts, [x, y + rectHeight, z], [width, 0.075, 0.09]);
  for (const radius of [r, r * 0.62]) for (let i = 0; i < 20; i += 1) {
    const a = i / 20 * Math.PI, b = (i + 1) / 20 * Math.PI;
    beam(parts, [x + Math.cos(a) * radius, y + rectHeight + Math.sin(a) * radius, z], [x + Math.cos(b) * radius, y + rectHeight + Math.sin(b) * radius, z], 0.075, 0.09);
  }
  for (const angle of [Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75]) beam(parts, [x, y + rectHeight, z], [x + Math.cos(angle) * r, y + rectHeight + Math.sin(angle) * r, z], 0.065, 0.08);
}

function barrelGeometry() {
  const positions = [], indices = [], segments = 32;
  for (const x of [PACIFIC_CLUB_BARREL_START_X, PACIFIC_CLUB_BARREL_END_X]) for (let i = 0; i <= segments; i += 1) {
    const theta = -Math.PI / 2 + i / segments * Math.PI;
    positions.push(x, PACIFIC_CLUB_BARREL_SPRING + Math.cos(theta) * PACIFIC_CLUB_BARREL_RISE, Math.sin(theta) * 8.65);
  }
  for (let i = 0; i < segments; i += 1) { const a = i, b = i + 1, c = segments + 1 + i, d = c + 1; indices.push(a, c, b, b, c, d); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function barrelEnd(x) {
  const positions = [x, PACIFIC_CLUB_BARREL_SPRING, 0], indices = [], segments = 32;
  for (let i = 0; i <= segments; i += 1) { const theta = -Math.PI / 2 + i / segments * Math.PI; positions.push(x, PACIFIC_CLUB_BARREL_SPRING + Math.cos(theta) * PACIFIC_CLUB_BARREL_RISE, Math.sin(theta) * 8.65); }
  for (let i = 0; i < segments; i += 1) indices.push(0, i + 1, i + 2);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function buildPacificClub(scene, { groundOffset } = {}) {
  const site = PACIFIC_CLUB_SITE, pier = PACIFIC_CLUB_PIER_SITE, base = groundOffset ?? harbourCityPadHeight(site.key);
  const root = new THREE.Group(); root.name = 'Harbour City — Pacific Club and its exact piled pier';
  const pierGroup = new THREE.Group(); pierGroup.name = 'Pacific Club exact OSM piled pier'; pierGroup.position.set(pier.x, base, pier.z); pierGroup.rotation.y = pier.ry; root.add(pierGroup);
  const group = new THREE.Group(); group.name = 'Pacific Club exact OSM clubhouse'; group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const materials = harbourCityPalette({ stone: [0.79, 0.79, 0.75], paleStone: [0.91, 0.9, 0.85], metal: [0.42, 0.62, 0.59], roof: [0.77, 0.78, 0.73], roughness: 0.32, metalness: 0.18 });
  materials.interior.side = THREE.DoubleSide;
  const clubGlass = new THREE.MeshStandardMaterial({ color: 0x1b6264, roughness: 0.2, metalness: 0.32, emissive: 0x082629, emissiveIntensity: 0.22, side: THREE.DoubleSide });
  const greenFrame = new THREE.MeshStandardMaterial({ color: 0x507e78, roughness: 0.36, metalness: 0.42 });
  const railGreen = new THREE.MeshStandardMaterial({ color: 0x8ab8ad, roughness: 0.4, metalness: 0.35 });
  const redCore = new THREE.MeshStandardMaterial({ color: 0x714238, roughness: 0.72, metalness: 0.03 });
  const shrub = new THREE.MeshStandardMaterial({ color: 0x315540, roughness: 0.95 });
  const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d9ce, roughness: 0.66, metalness: 0.08, side: THREE.DoubleSide });

  const pierDeck = new THREE.Mesh(roofGeometry(pier.localRing, PACIFIC_CLUB_DECK_HEIGHT), materials.roof); pierDeck.name = 'Pacific Club pier exact deck surface'; pierDeck.receiveShadow = true; pierGroup.add(pierDeck);
  const pierFascia = [], piles = [], pierRails = [];
  ringBand(pierFascia, pier, -0.16, 0.68, 0, 0.38);
  for (let x = -98; x <= 98; x += 14) for (const z of [-9, 9]) cylinder(piles, [x, -1.75, z], 0.43, 3.8, 10);
  for (const edge of [4, 5, 6]) railing(pierRails, pier, edge, PACIFIC_CLUB_DECK_HEIGHT, 1.05, 3.2);
  merged(pierGroup, pierFascia, materials.paleStone, 'Pacific Club white open-face wharf fascia');
  merged(pierGroup, piles, materials.stone, 'Pacific Club individual concrete pier piles');
  merged(pierGroup, pierRails, railGreen, 'Pacific Club pale-green waterside promenade railings');

  const walls = store();
  for (let edge = 0; edge < 4; edge += 1) {
    const p = (t, y, o = 0) => point(site, edge, t, y, o);
    quad(walls, p(0, PACIFIC_CLUB_DECK_HEIGHT), p(1, PACIFIC_CLUB_DECK_HEIGHT), p(1, 11.68), p(0, 11.68), [0.82, 0.82, 0.78], 0.015);
  }
  meshStore(group, walls, materials.interior, 'Pacific Club long white stucco clubhouse walls');

  for (const edge of [0, 2]) {
    const facade = facadeGroup(group, site, edge, `Pacific Club long elevation ${edge}`);
    const rectangular = [], circles = [], circleFrames = [], frames = [], vents = [], rails = [], planters = [], shrubs = [];
    for (let i = 0; i < 29; i += 1) {
      const x = -100.8 + i * 7.2;
      const lower = new THREE.PlaneGeometry(4.5, 3.25); lower.translate(x, 2.15, 0.055); rectangular.push(lower);
      const middle = new THREE.PlaneGeometry(4.35, 2.45); middle.translate(x, 5.9, 0.055); rectangular.push(middle);
      for (const dx of [-2.25, 0, 2.25]) box(frames, [x + dx, 2.15, 0.11], [0.09, 3.35, 0.12]);
      for (const dx of [-2.18, -0.73, 0.73, 2.18]) box(frames, [x + dx, 5.9, 0.11], [0.075, 2.55, 0.12]);
      for (const y of [0.52, 3.78, 4.68, 7.13]) box(frames, [x, y, 0.11], [4.55, 0.085, 0.12]);
      box(vents, [x, 7.72, 0.07], [3.7, 0.36, 0.1]);
      for (const dx of [-1.4, -0.7, 0, 0.7, 1.4]) box(frames, [x + dx, 7.72, 0.14], [0.055, 0.38, 0.08]);
      if (i % 4 === 3) {
        const loggia = new THREE.PlaneGeometry(4.4, 1.9); loggia.translate(x, 9.35, 0.06); rectangular.push(loggia);
        for (const y of [8.35, 8.68, 10.35]) box(rails, [x, y, 0.32], [5.1, 0.07, 0.08]);
        for (const dx of [-2.5, 0, 2.5]) box(rails, [x + dx, 9.35, 0.32], [0.07, 2, 0.08]);
      } else {
        const circle = new THREE.CircleGeometry(0.77, 24); circle.translate(x, 9.45, 0.065); circles.push(circle);
        const ring = new THREE.TorusGeometry(0.82, 0.075, 6, 24); ring.translate(x, 9.45, 0.12); circleFrames.push(ring);
      }
      if (i % 2 === 0) {
        box(planters, [x, 0.48, 1.55], [2.3, 0.6, 0.75]); sphere(shrubs, [x, 1.03, 1.55], 0.68, 10);
      }
    }
    merged(facade, rectangular, clubGlass, 'Pacific Club green rectangular windows and upper loggia glazing');
    merged(facade, circles, clubGlass, 'Pacific Club circular upper windows');
    merged(facade, circleFrames, greenFrame, 'Pacific Club circular window rings');
    merged(facade, frames, materials.paleStone, 'Pacific Club white window mullions and transoms');
    merged(facade, vents, greenFrame, 'Pacific Club narrow ventilation strips');
    merged(facade, rails, railGreen, 'Pacific Club upper loggia pale-green rails');
    merged(facade, planters, materials.roof, 'Pacific Club promenade planters'); merged(facade, shrubs, shrub, 'Pacific Club promenade shrubs');
  }

  const seaward = facadeGroup(group, site, 1, 'Pacific Club seaward arched-window elevation');
  const arches = [], archFrames = [], seawardGlass = [], seawardRails = [];
  for (let i = 0; i < 5; i += 1) {
    const x = -7.6 + i * 3.8, width = 3.15, rectHeight = 2.75, y = 0.48, geometry = archGlazing(width, rectHeight); geometry.translate(x, y, 0.07); arches.push(geometry); archTracery(archFrames, x, y, width, rectHeight);
  }
  const upper = new THREE.PlaneGeometry(17.2, 2.15); upper.translate(0, 9.25, 0.07); seawardGlass.push(upper);
  for (const y of [7.95, 8.3, 10.4]) box(seawardRails, [0, y, 0.35], [18.2, 0.075, 0.09]);
  for (let x = -9; x <= 9; x += 3) box(seawardRails, [x, 9.15, 0.35], [0.075, 2.4, 0.09]);
  merged(seaward, arches, clubGlass, 'Pacific Club five tall arched seaward windows');
  merged(seaward, archFrames, materials.paleStone, 'Pacific Club white fanlight arch tracery');
  merged(seaward, seawardGlass, clubGlass, 'Pacific Club seaward upper terrace glazing'); merged(seaward, seawardRails, railGreen, 'Pacific Club seaward terrace railings');
  addEdgeSign(group, site, 1, 'PACIFIC CLUB', 'HARBOUR CITY  ·  1990', 11.25, 12, 1.35, 0.24, { background: '#efeee7', foreground: '#267493', subForeground: '#53757d', accent: false });

  const landward = facadeGroup(group, site, 3, 'Pacific Club landward members entrance');
  const core = [], entranceGlass = [], entranceFrames = [], canopy = [];
  box(core, [-6.7, 5.9, 0.08], [3.1, 11.4, 0.18]);
  const doors = new THREE.PlaneGeometry(7.2, 3.8); doors.translate(1.4, 2.15, 0.09); entranceGlass.push(doors);
  for (const x of [-2.2, -0.4, 1.4, 3.2, 5]) box(entranceFrames, [x, 2.15, 0.15], [0.1, 3.9, 0.12]);
  box(canopy, [1.4, 4.35, 1.4], [9.2, 0.24, 3]);
  merged(landward, core, redCore, 'Pacific Club restrained red-brown landward service core');
  merged(landward, entranceGlass, clubGlass, 'Pacific Club green members entrance glazing');
  merged(landward, entranceFrames, greenFrame, 'Pacific Club members entrance door frames'); merged(landward, canopy, materials.paleStone, 'Pacific Club landward entrance canopy');
  addEdgeSign(group, site, 3, 'PACIFIC CLUB', "MEMBERS' ENTRANCE", 6.2, 10, 1.2, 0.3, { background: '#efeee7', foreground: '#267493', accent: false });
  const crest = signMesh('PC', 'PACIFIC CLUB', 3.4, 2.2, { background: '#efeee7', foreground: '#285c7b', accent: '#b49a52' });
  crest.position.set(84, 9.55, 0.17); group.children.filter((o) => o.name === 'Pacific Club long elevation 0')[0]?.add(crest);

  const roof = new THREE.Mesh(roofGeometry(site.localRing, 11.68), materials.roof); roof.name = 'Pacific Club flat roof terrace around barrel vault'; roof.receiveShadow = true; group.add(roof);
  const fascia = [], roofRails = []; ringBand(fascia, site, 11.9, 0.52, 0.06, 0.28);
  for (let edge = 0; edge < 4; edge += 1) railing(roofRails, site, edge, 12.08, 1.0, 3.4);
  merged(group, fascia, materials.paleStone, 'Pacific Club deep white roof fascia'); merged(group, roofRails, railGreen, 'Pacific Club roof-terrace pale-green railings');
  const barrel = new THREE.Mesh(barrelGeometry(), barrelMaterial); barrel.name = 'Pacific Club seaward barrel-vault roof'; barrel.castShadow = true; barrel.receiveShadow = true; group.add(barrel);
  const barrelEnds = [barrelEnd(PACIFIC_CLUB_BARREL_START_X), barrelEnd(PACIFIC_CLUB_BARREL_END_X)]; merged(group, barrelEnds, barrelMaterial, 'Pacific Club barrel-vault end walls');
  const seams = [];
  for (let x = PACIFIC_CLUB_BARREL_START_X + 2; x < PACIFIC_CLUB_BARREL_END_X; x += 5) {
    const points = []; for (let i = 0; i <= 32; i += 1) { const theta = -Math.PI / 2 + i / 32 * Math.PI; points.push(new THREE.Vector3(x, PACIFIC_CLUB_BARREL_SPRING + Math.cos(theta) * (PACIFIC_CLUB_BARREL_RISE + 0.025), Math.sin(theta) * 8.66)); }
    seams.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.045, 5, false));
  }
  merged(group, seams, materials.paleStone, 'Pacific Club barrel-vault standing seams');

  const colliders = [];
  for (const edge of [0, 1, 2]) colliders.push(harbourCitySegmentCollider(site, edge, 0, 1, base + PACIFIC_CLUB_DECK_HEIGHT, base + 11.68));
  for (const [t0, t1] of [[0, 0.32], [0.68, 1]]) colliders.push(harbourCitySegmentCollider(site, 3, t0, t1, base + PACIFIC_CLUB_DECK_HEIGHT, base + 11.68));
  colliders.push(harbourCitySegmentCollider(site, 3, 0, 1, base + 4.55, base + 11.68));
  for (const edge of [4, 5, 6]) colliders.push(harbourCitySegmentCollider(pier, edge, 0, 1, base + PACIFIC_CLUB_DECK_HEIGHT, base + 1.25, 0.18));
  scene.add(root);
  const landmark = { id: 'pacific-club', name: site.name, position: { x: site.x, y: base, z: site.z }, radius: 120, height: PACIFIC_CLUB_HEIGHT };
  return {
    root, group, pierGroup, colliders, landmarks: [landmark], groundOffset: base, site, pier,
    roads: [...harbourCityRoadRecords(site), ...harbourCityRoadRecords(pier)],
    stats: {
      pacificClubSourceVertices: 4, pacificClubRingArea: site.ringArea, pacificClubPierSourceVertices: 7, pacificClubPierRingArea: pier.ringArea,
      pacificClubHeight: PACIFIC_CLUB_HEIGHT, pacificClubOpeningYear: PACIFIC_CLUB_OPENING_YEAR,
      pacificClubBarrelRise: PACIFIC_CLUB_BARREL_RISE, pacificClubArchedSeawardWindows: 5,
      pacificClubPierType: 'piled', pacificClubBerthing: 'restricted', pacificClubRoadCrossings: 0,
    },
    groundHeightAt: (x, z, ground) => harbourCityGroundHeightAt(pier, x, z, ground, { deck: base + PACIFIC_CLUB_DECK_HEIGHT }),
  };
}
