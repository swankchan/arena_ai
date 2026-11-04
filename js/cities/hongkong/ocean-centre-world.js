import * as THREE from 'three/webgpu';
import {
  OCEAN_CENTRE_SITE, OCEAN_CENTRE_MAIN_ENTRANCE, harbourCityRingColliders, harbourCitySegmentCollider,
  harbourCityGroundHeightAt, harbourCityRoadRecords, HARBOUR_CITY_ROAD_LINTEL_DEPTH
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import {
  store, quad, meshStore, merged, box, point, edgeBox, roofGeometry,
  harbourCityPalette, createStreetLevel, ringBand, addEdgeSign, hash
} from './harbour-city-world-utils.js';

export const OCEAN_CENTRE_HEIGHT = 55;
export const OCEAN_CENTRE_MALL_LEVELS = 5;
export const OCEAN_CENTRE_MALL_TOP = 15;
export const OCEAN_CENTRE_OFFICE_FLOORS = 13;
export const OCEAN_CENTRE_OFFICE_FLOOR_HEIGHT = (OCEAN_CENTRE_HEIGHT - OCEAN_CENTRE_MALL_TOP) / OCEAN_CENTRE_OFFICE_FLOORS;
export const OCEAN_CENTRE_OFFICE_TYPICAL_FLOOR_SQFT = 48000;
export const OCEAN_CENTRE_OFFICE_CLEAR_HEIGHT = 2.44;
export const OCEAN_CENTRE_COMPLETION_YEAR = 1977;
export const OCEAN_CENTRE_ROAD_SOFFIT = 6;
const absolute = (colliders, base) => colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base }));

function addMallPanels(group, site, materials) {
  const glass = store(), panels = store(), frames = [], louvres = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    if (edge === OCEAN_CENTRE_MAIN_ENTRANCE.sourceEdge) continue;
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const bays = Math.max(1, Math.ceil(length / 5.6)), p = (t, y, o = .04) => point(site, edge, t, y, o);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, v = hash(edge, bay, 3403);
      quad(panels, p(t0, 6, -.04), p(t1, 6, -.04), p(t1, 15, -.04), p(t0, 15, -.04), [.63 + v * .07, .65 + v * .06, .63 + v * .06]);
      if ((bay + edge) % 4 !== 0) quad(glass, p(t0 + .025, 6.6, .04), p(t1 - .025, 6.6, .04), p(t1 - .025, 12.8, .04), p(t0 + .025, 12.8, .04), [.10 + v * .06, .19 + v * .07, .21 + v * .07], .04 + v * .13);
      edgeBox(frames, site, edge, t0, 10.5, .14, .16, 9, .32);
      if ((bay + edge) % 4 === 0) for (let j = 0; j < 14; j++) edgeBox(louvres, site, edge, (t0 + t1) * .5, 7 + j * .39, .12, length / bays * .82, .08, .18);
    }
    edgeBox(frames, site, edge, .5, 14.75, .18, length + .05, .5, .4);
  }
  meshStore(group, panels, materials.interior, 'Ocean Centre white panelized mall podium'); meshStore(group, glass, materials.glazing, 'Ocean Centre mall glazing');
  merged(group, frames, materials.white, 'Ocean Centre mall panel joints'); merged(group, louvres, materials.metal, 'Ocean Centre mall horizontal louvres');
}
function addOfficeRibbons(group, site, materials) {
  const glass = store(), backing = store(), bands = [], mullions = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const bays = Math.max(1, Math.ceil(length / 2.65)), p = (t, y, o = 0) => point(site, edge, t, y, o);
    for (let floor = 0; floor < OCEAN_CENTRE_OFFICE_FLOORS; floor++) {
      const y0 = OCEAN_CENTRE_MALL_TOP + floor * OCEAN_CENTRE_OFFICE_FLOOR_HEIGHT, y1 = y0 + OCEAN_CENTRE_OFFICE_FLOOR_HEIGHT;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays, t1 = (bay + 1) / bays, v = hash(edge, floor, bay, 3403);
        quad(backing, p(t0, y0, -.14), p(t1, y0, -.14), p(t1, y1, -.14), p(t0, y1, -.14), [.08, .12, .13], .04 + v * .14);
        quad(glass, p(t0, y0 + .58, .01), p(t1, y0 + .58, .01), p(t1, y1 - .26, .01), p(t0, y1 - .26, .01), [.09 + v * .055, .17 + v * .065, .20 + v * .07], .05 + v * .32);
      }
      edgeBox(bands, site, edge, .5, y0 + .18, .22, length + .06, .36, .52);
      edgeBox(bands, site, edge, .5, y0 + .53, .17, length + .05, .11, .38);
    }
    for (let bay = 0; bay <= bays; bay++) edgeBox(mullions, site, edge, bay / bays, 35, .04, .075, 40, .15);
    edgeBox(bands, site, edge, .5, 54.72, .22, length + .08, .56, .52);
  }
  meshStore(group, backing, materials.interior, 'Ocean Centre office ribbon backing'); meshStore(group, glass, materials.glazing, 'Thirteen continuous office glazing ribbons');
  merged(group, bands, materials.white, 'Ocean Centre deep horizontal white facade bands'); merged(group, mullions, materials.metal, 'Ocean Centre fine ribbon-window mullions');
}
function addEntrance(group, site, materials) {
  const edge = OCEAN_CENTRE_MAIN_ENTRANCE.sourceEdge, glass = store(), panels = store(), frames = [], louvres = [];
  const p = (t, y, o = .08) => point(site, edge, t, y, o);
  for (const [t0, t1] of [[0, .34], [.68, 1]]) quad(panels, p(t0, 0), p(t1, 0), p(t1, 15), p(t0, 15), [.67, .68, .64]);
  quad(glass, p(.34, .15, .02), p(.68, .15, .02), p(.68, 14.5, .02), p(.34, 14.5, .02), [.12, .23, .25], .16);
  for (let i = 0; i <= 8; i++) edgeBox(frames, site, edge, .34 + i * .0425, 7.3, .15, .15, 14.6, .26);
  for (let i = 0; i < 30; i++) edgeBox(louvres, site, edge, .51, 5.8 + i * .28, .16, 29.5, .065, .18);
  // Three white entrance portals and the permanent Harbour City identity seen on the actual Canton Road frontage.
  for (const t of [.40, .51, .62]) {
    edgeBox(frames, site, edge, t - .042, 2.4, .55, .28, 4.8, .55); edgeBox(frames, site, edge, t + .042, 2.4, .55, .28, 4.8, .55);
    edgeBox(frames, site, edge, t, 4.7, .55, 7.6, .28, .55);
  }
  meshStore(group, panels, materials.interior, 'Ocean Centre entrance stone side panels'); meshStore(group, glass, materials.glazing, 'Ocean Centre tall glazed Canton Road atrium');
  merged(group, frames, materials.white, 'Ocean Centre atrium mullions and three entry portals'); merged(group, louvres, materials.metal, 'Ocean Centre atrium horizontal sunshades');
  addEdgeSign(group, site, edge, 'HARBOUR CITY  海港城', 'OCEAN CENTRE  ·  海洋中心', 4.95, 25, 1.75, .72, { background: '#e6e7e2', foreground: '#354143', accent: false });
  addEdgeSign(group, site, edge, 'OCEAN CENTRE', '海洋中心  ·  HARBOUR CITY', 13.25, 20, 1.9, .25, { background: '#dde1de', foreground: '#334143', accent: false });
}

export function buildOceanCentre(scene, { groundOffset } = {}) {
  const site = OCEAN_CENTRE_SITE, base = groundOffset ?? harbourCityPadHeight(site.key), root = new THREE.Group(); root.name = 'Harbour City — Ocean Centre';
  const group = new THREE.Group(); group.name = 'Ocean Centre local frame'; group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const materials = harbourCityPalette({ stone: [.63, .65, .62], paleStone: [.83, .84, .80], metal: [.30, .35, .36], roof: [.40, .42, .41] }); materials.glazing.side = THREE.DoubleSide;
  const street = createStreetLevel(site, { soffit: OCEAN_CENTRE_ROAD_SOFFIT, customEdges: [OCEAN_CENTRE_MAIN_ENTRANCE.sourceEdge], glassA: [.06, .13, .15], glassB: [.16, .26, .28], stoneTint: [.62, .64, .60] });
  meshStore(group, street.backing, materials.interior, 'Ocean Centre ground-floor backing'); meshStore(group, street.glass, materials.glazing, 'Ocean Centre ground-floor shopfronts'); meshStore(group, street.stone, materials.interior, 'Ocean Centre ground-floor panels');
  merged(group, street.frames, materials.white, 'Ocean Centre road-safe ground lintels'); merged(group, street.columns, materials.white, 'Ocean Centre road-safe columns');
  const colliders = absolute(street.colliders, base); addMallPanels(group, site, materials); addOfficeRibbons(group, site, materials); addEntrance(group, site, materials);
  colliders.push(harbourCitySegmentCollider(site, OCEAN_CENTRE_MAIN_ENTRANCE.sourceEdge, 0, .34, base, base + 6),
    harbourCitySegmentCollider(site, OCEAN_CENTRE_MAIN_ENTRANCE.sourceEdge, .68, 1, base, base + 6));
  colliders.push(...harbourCityRingColliders(site, base + OCEAN_CENTRE_ROAD_SOFFIT, base + OCEAN_CENTRE_HEIGHT));
  const roof = new THREE.Mesh(roofGeometry(site.localRing, 55), materials.roof); roof.name = 'Ocean Centre roof on the exact OSM footprint'; roof.receiveShadow = true; group.add(roof);
  const parapet = [], plant = [], dark = []; ringBand(parapet, site, 55.5, 1, .03, .25);
  box(plant, [-23, 56.8, -8], [22, 3.6, 16]); box(plant, [18, 56.2, 18], [15, 2.4, 12]);
  for (let i = 0; i < 12; i++) { const x = -36 + i * 6.3; box(plant, [x, 55.75, 31], [3.1, 1.5, 2.5]); box(dark, [x, 56.53, 31], [2.1, .06, 1.7]); }
  merged(group, parapet, materials.white, 'Ocean Centre roof parapet'); merged(group, plant, materials.roof, 'Ocean Centre roof plant'); merged(group, dark, materials.dark, 'Ocean Centre roof ventilation grilles');
  scene.add(root);
  const landmark = { id: 'ocean-centre', name: site.name, position: { x: site.x, y: base, z: site.z }, radius: 78, height: 55 };
  return {
    root, group, colliders, landmarks: [landmark], groundOffset: base, site, roads: harbourCityRoadRecords(site),
    stats: { oceanCentreSourceVertices: site.ring.length / 2 - 1, oceanCentreRingArea: site.ringArea, oceanCentreHeight: 55,
      oceanCentreOsmLevels: site.levels, oceanCentreMallLevels: OCEAN_CENTRE_MALL_LEVELS, oceanCentreOfficeFloors: OCEAN_CENTRE_OFFICE_FLOORS,
      oceanCentreOfficeTypicalFloorSqft: OCEAN_CENTRE_OFFICE_TYPICAL_FLOOR_SQFT, oceanCentreOfficeClearHeight: OCEAN_CENTRE_OFFICE_CLEAR_HEIGHT,
      oceanCentreCompletionYear: OCEAN_CENTRE_COMPLETION_YEAR, oceanCentreRoadCrossings: site.roadIds.length,
      oceanCentreOpenRoadBays: street.openRoadBays, oceanCentreRoadSoffit: OCEAN_CENTRE_ROAD_SOFFIT, oceanCentreRoadLintelDepth: HARBOUR_CITY_ROAD_LINTEL_DEPTH },
    groundHeightAt: (x, z, ground) => harbourCityGroundHeightAt(site, x, z, ground, { deck: base + .12 })
  };
}
