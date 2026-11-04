import * as THREE from 'three/webgpu';
import {
  STAR_HOUSE_SITE, STAR_HOUSE_MAIN_ENTRANCE, harbourCityRingColliders, harbourCitySegmentCollider,
  harbourCityGroundHeightAt, harbourCityRoadRecords
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import {
  store, quad, meshStore, merged, box, point, edgeBox, roofGeometry,
  harbourCityPalette, createStreetLevel, ringBand, addEdgeSign, hash, warmWindowEmission
} from './harbour-city-world-utils.js';

export const STAR_HOUSE_HEIGHT = 55;
export const STAR_HOUSE_RETAIL_LEVELS = 4;
export const STAR_HOUSE_RETAIL_TOP = 12;
export const STAR_HOUSE_OFFICE_FLOORS = 14;
export const STAR_HOUSE_OFFICE_FLOOR_HEIGHT = (STAR_HOUSE_HEIGHT - STAR_HOUSE_RETAIL_TOP) / STAR_HOUSE_OFFICE_FLOORS;
export const STAR_HOUSE_COMPLETION_YEAR = 1967;
export const STAR_HOUSE_SECONDARY_FLOOR_COUNT = 19;
export const STAR_HOUSE_GROUND_SOFFIT = 4.2;
export const STAR_HOUSE_ROOFTOP_SIGN_TOP = 58.75;
const absolute = (colliders, base) => colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base }));

function addRetailPodium(group, site, materials) {
  const panels = store(), glass = store(), backing = store(), bands = [], piers = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const bays = Math.max(1, Math.ceil(length / 4.4)), p = (t, y, o = 0) => point(site, edge, t, y, o);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, v = hash(edge, bay, 55254);
      quad(panels, p(t0, 4.2, -.08), p(t1, 4.2, -.08), p(t1, 12, -.08), p(t0, 12, -.08), [.69 + v * .04, .68 + v * .04, .62 + v * .04]);
      quad(backing, p(t0 + .012, 4.65, -.04), p(t1 - .012, 4.65, -.04), p(t1 - .012, 11.45, -.04), p(t0 + .012, 11.45, -.04), [.12, .14, .13]);
      for (const [y0, y1] of [[4.65, 7.55], [8.55, 11.45]]) quad(glass, p(t0 + .025, y0, .02), p(t1 - .025, y0, .02), p(t1 - .025, y1, .02), p(t0 + .025, y1, .02), [.13 + v * .05, .18 + v * .05, .18 + v * .04], .04 + v * .22);
      edgeBox(piers, site, edge, t0, 8.1, .08, .2, 7.8, .38);
    }
    for (const [y, h] of [[4.2, .32], [8.1, .38], [11.82, .36]]) edgeBox(bands, site, edge, .5, y, .1, length + .05, h, .45);
  }
  meshStore(group, panels, materials.interior, 'Star House pale retail podium panels'); meshStore(group, backing, materials.interior, 'Star House recessed retail backing'); meshStore(group, glass, materials.glazing, 'Star Annex two-storey shopfront glazing');
  merged(group, bands, materials.paleStone, 'Star House retail floor fascia bands'); merged(group, piers, materials.paleStone, 'Star House retail podium piers');
}

function addOfficeLattice(group, site, materials) {
  const glass = store(), backing = store(), concrete = [], mullions = [], vents = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const bays = Math.max(1, Math.ceil(length / 3.05)), p = (t, y, o = 0) => point(site, edge, t, y, o);
    for (let floor = 0; floor < STAR_HOUSE_OFFICE_FLOORS; floor++) {
      const y0 = STAR_HOUSE_RETAIL_TOP + floor * STAR_HOUSE_OFFICE_FLOOR_HEIGHT, y1 = y0 + STAR_HOUSE_OFFICE_FLOOR_HEIGHT;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays, t1 = (bay + 1) / bays, v = hash(edge, floor, bay, 55254), inset = .075 / bays;
        quad(backing, p(t0, y0, -.34), p(t1, y0, -.34), p(t1, y1, -.34), p(t0, y1, -.34), [.095, .105, .095]);
        if (v < .91) quad(glass, p(t0 + inset, y0 + .38, -.25), p(t1 - inset, y0 + .38, -.25), p(t1 - inset, y1 - .35, -.25), p(t0 + inset, y1 - .35, -.25), [.15 + v * .055, .18 + v * .05, .17 + v * .045], v > .76 ? .12 + v * .38 : 0);
        edgeBox(mullions, site, edge, (t0 + t1) * .5, (y0 + y1) * .5, -.19, .055, y1 - y0 - .65, .09);
        if (v > .955) edgeBox(vents, site, edge, (t0 + t1) * .5, y0 + .65, -.02, .82, .42, .42);
      }
      edgeBox(concrete, site, edge, .5, y0 + .13, .02, length + .06, .26, .86);
    }
    for (let bay = 0; bay <= bays; bay++) edgeBox(concrete, site, edge, bay / bays, 33.5, .02, .2, 43, .86);
    edgeBox(concrete, site, edge, .5, 54.82, .02, length + .08, .36, .86);
  }
  meshStore(group, backing, materials.interior, 'Star House deeply recessed office window backing'); meshStore(group, glass, materials.glazing, 'Star House fourteen recessed office window floors');
  merged(group, concrete, materials.paleStone, 'Star House photographed pale concrete lattice and deep reveals'); merged(group, mullions, materials.metal, 'Star House recessed window centre mullions'); merged(group, vents, materials.roof, 'Star House sparse window ventilation units');
}

function addSalisburyEntrance(group, site, materials) {
  const edge = STAR_HOUSE_MAIN_ENTRANCE.sourceEdge, length = STAR_HOUSE_MAIN_ENTRANCE.length;
  const glass = store(), backing = store(), frames = [], canopy = [], luminous = [], carpet = [], p = (t, y, o = .03) => point(site, edge, t, y, o);
  for (const [t0, t1] of [[0, .43], [.43, .47], [.53, .57], [.57, 1]]) {
    quad(backing, p(t0, .12, -.28), p(t1, .12, -.28), p(t1, 4.05, -.28), p(t0, 4.05, -.28), [.10, .12, .11], .16);
    quad(glass, p(t0, .16), p(t1, .16), p(t1, 4.02), p(t0, 4.02), [.12, .19, .18], .14);
  }
  for (const t of [0, .43, .47, .53, .57, 1]) edgeBox(frames, site, edge, t, 2.1, .08, .12, 4.2, .22);
  edgeBox(frames, site, edge, .5, 4.08, .12, length, .18, .3);
  edgeBox(canopy, site, edge, .5, 4.28, 1.5, 24, .24, 3.4); edgeBox(canopy, site, edge, .5, 4.62, 3.12, 24, .8, .22);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) edgeBox(luminous, site, edge, .5 + (i - 3.5) * 2.75 / length, 4.135, .62 + j * .93, 2.35, .055, .72);
  edgeBox(carpet, site, edge, .5, .035, 1.05, 5.2, .07, 7.6);
  meshStore(group, backing, materials.interior, 'Star House entrance and shop interior backing'); meshStore(group, glass, materials.glazing, 'Star House Salisbury Road glazed shopfronts and doors');
  merged(group, frames, materials.metal, 'Star House stainless entrance door frames'); merged(group, canopy, materials.dark, 'Star House dark entrance canopy fascia'); merged(group, luminous, materials.warmLight, 'Star House illuminated rectangular canopy soffit');
  merged(group, carpet, new THREE.MeshStandardMaterial({ color: 0x7d1822, roughness: .96 }), 'Star House red entrance carpet', false);
  addEdgeSign(group, site, edge, 'STAR HOUSE  星光行', null, 4.64, 21.5, .72, 3.25, { background: '#202524', foreground: '#d8d9d2', accent: false });
  addEdgeSign(group, site, edge, 'STAR ANNEX', '@ STAR HOUSE  ·  星光行', 9.55, 27, 1.45, .32, { background: '#dedbd2', foreground: '#283332', accent: false });
}

export function buildStarHouse(scene, { groundOffset } = {}) {
  const site = STAR_HOUSE_SITE, base = groundOffset ?? harbourCityPadHeight(site.key), root = new THREE.Group(); root.name = 'Harbour City — Star House and Star Annex';
  const group = new THREE.Group(); group.name = 'Star House local frame'; group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const materials = harbourCityPalette({ stone: [.62, .60, .54], paleStone: [.79, .78, .71], metal: [.30, .33, .31], roof: [.40, .41, .37] }); materials.glazing.side = THREE.DoubleSide; warmWindowEmission(materials.glazing, [1, .79, .48], .72);
  const street = createStreetLevel(site, { soffit: STAR_HOUSE_GROUND_SOFFIT, customEdges: [STAR_HOUSE_MAIN_ENTRANCE.sourceEdge], glassA: [.07, .12, .11], glassB: [.17, .23, .20], stoneTint: [.65, .62, .55] });
  meshStore(group, street.backing, materials.interior, 'Star House ground-floor interior backing'); meshStore(group, street.glass, materials.glazing, 'Star House ground-floor shopfront glazing'); meshStore(group, street.stone, materials.interior, 'Star House ground-floor stone panels');
  merged(group, street.frames, materials.paleStone, 'Star House ground-floor lintels'); merged(group, street.columns, materials.paleStone, 'Star House ground-floor columns');
  const colliders = absolute(street.colliders, base); addRetailPodium(group, site, materials); addOfficeLattice(group, site, materials); addSalisburyEntrance(group, site, materials);
  colliders.push(harbourCitySegmentCollider(site, STAR_HOUSE_MAIN_ENTRANCE.sourceEdge, 0, .47, base, base + STAR_HOUSE_GROUND_SOFFIT)); colliders.push(harbourCitySegmentCollider(site, STAR_HOUSE_MAIN_ENTRANCE.sourceEdge, .53, 1, base, base + STAR_HOUSE_GROUND_SOFFIT)); colliders.push(...harbourCityRingColliders(site, base + STAR_HOUSE_GROUND_SOFFIT, base + STAR_HOUSE_HEIGHT));
  const roof = new THREE.Mesh(roofGeometry(site.localRing, STAR_HOUSE_HEIGHT), materials.roof); roof.name = 'Star House flat roof on the exact OSM footprint'; roof.receiveShadow = true; group.add(roof);
  const parapet = [], plant = [], dark = [], signSupports = []; ringBand(parapet, site, 55.43, .86, .02, .24);
  box(plant, [-18, 56.35, -7], [18, 2.7, 10]); box(plant, [16, 56.05, -5], [11, 2.1, 8]);
  for (let i = 0; i < 8; i++) { const x = -30 + i * 8; box(plant, [x, 55.65, 7], [3.2, 1.3, 2.4]); box(dark, [x, 56.33, 7], [2.3, .06, 1.6]); }
  for (const t of [.31, .5, .69]) edgeBox(signSupports, site, STAR_HOUSE_MAIN_ENTRANCE.sourceEdge, t, 56.65, -.72, .16, 3.8, .18);
  merged(group, parapet, materials.paleStone, 'Star House roof parapet'); merged(group, plant, materials.roof, 'Star House roof plant and lift overruns'); merged(group, dark, materials.dark, 'Star House roof ventilation grilles'); merged(group, signSupports, materials.metal, 'Star House rooftop sign steel supports');
  const rooftopSign = addEdgeSign(group, site, STAR_HOUSE_MAIN_ENTRANCE.sourceEdge, '保誠保險', null, 57.1, 42, 3.3, -.55, { background: '#d9d6ca', foreground: '#9e2935', accent: false }); rooftopSign.name = 'Star House photographed rooftop Prudential sign';
  scene.add(root);
  const landmark = { id: 'star-house', name: site.name, position: { x: site.x, y: base, z: site.z }, radius: 68, height: STAR_HOUSE_HEIGHT };
  return { root, group, colliders, landmarks: [landmark], groundOffset: base, site, roads: harbourCityRoadRecords(site),
    stats: { starHouseSourceVertices: site.ring.length / 2 - 1, starHouseRingArea: site.ringArea, starHouseHeight: STAR_HOUSE_HEIGHT, starHouseOsmLevels: site.levels, starHouseSecondaryFloorCount: STAR_HOUSE_SECONDARY_FLOOR_COUNT, starHouseRetailLevels: STAR_HOUSE_RETAIL_LEVELS, starHouseOfficeFloors: STAR_HOUSE_OFFICE_FLOORS, starHouseCompletionYear: STAR_HOUSE_COMPLETION_YEAR, starHouseRoadCrossings: site.roadIds.length, starHouseGroundSoffit: STAR_HOUSE_GROUND_SOFFIT, starHouseRooftopSignTop: STAR_HOUSE_ROOFTOP_SIGN_TOP, starHouseClosedGroundBays: street.closedBays },
    groundHeightAt: (x, z, ground) => harbourCityGroundHeightAt(site, x, z, ground, { deck: base + .12 }) };
}
