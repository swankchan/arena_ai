import * as THREE from 'three/webgpu';
import {
  MARCO_POLO_HONGKONG_SITE, MARCO_POLO_MAIN_ENTRANCE,
  harbourCityRingColliders, harbourCityGroundHeightAt, harbourCityRoadRecords,
  HARBOUR_CITY_ROAD_LINTEL_DEPTH
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import {
  store, quad, meshStore, merged, box, beam, point, edgeBox, roofGeometry,
  harbourCityPalette, warmWindowEmission, createStreetLevel, ringBand, addEdgeSign, hash
} from './harbour-city-world-utils.js';

export const MARCO_POLO_PODIUM_TOP = 13;
export const MARCO_POLO_ROOM_FLOORS = 14;
export const MARCO_POLO_ROOM_FLOOR_HEIGHT = 3;
export const MARCO_POLO_HEIGHT = 55;
export const MARCO_POLO_ROAD_SOFFIT = 6;
const absolute = (colliders, base) => colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base }));

function horseMark() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 512, 512); ctx.fillStyle = '#b99a58'; ctx.strokeStyle = '#b99a58'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // A small authored rearing-horse device, drawn as geometry on a transparent canvas rather than copying a photo logo.
  ctx.beginPath(); ctx.ellipse(244, 282, 82, 55, -.22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(278, 250); ctx.lineTo(302, 142); ctx.lineTo(348, 91); ctx.lineTo(381, 111); ctx.lineTo(354, 137); ctx.lineTo(337, 205); ctx.lineTo(314, 274); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(340, 94); ctx.lineTo(348, 52); ctx.lineTo(365, 91); ctx.fill();
  ctx.lineWidth = 25; ctx.beginPath(); ctx.moveTo(199, 303); ctx.lineTo(144, 391); ctx.lineTo(107, 409); ctx.moveTo(237, 321); ctx.lineTo(218, 418); ctx.lineTo(181, 441); ctx.moveTo(293, 306); ctx.lineTo(357, 373); ctx.lineTo(390, 367); ctx.moveTo(306, 268); ctx.lineTo(390, 271); ctx.lineTo(417, 243); ctx.stroke();
  ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(176, 263); ctx.bezierCurveTo(98, 228, 103, 330, 54, 326); ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: .38, metalness: .65, side: THREE.DoubleSide, emissive: 0x5c431b, emissiveIntensity: .18 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), material); mesh.name = 'Marco Polo gold rearing-horse device'; return mesh;
}
function addPodium(group, site, materials) {
  const glass = store(), panels = store(), frames = [], louvres = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    if (edge === MARCO_POLO_MAIN_ENTRANCE.sourceEdge) continue;
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const bays = Math.max(1, Math.ceil(length / 5.2)), p = (t, y, o = .04) => point(site, edge, t, y, o);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, v = hash(edge, bay, 85);
      quad(panels, p(t0, 6, .09), p(t1, 6, .09), p(t1, 13, .09), p(t0, 13, .09), [.43 + v * .05, .42 + v * .05, .38 + v * .05]);
      quad(glass, p(t0 + .02, 6.6, .13), p(t1 - .02, 6.6, .13), p(t1 - .02, 11.9, .13), p(t0 + .02, 11.9, .13), [.10 + v * .05, .20 + v * .06, .22 + v * .06], .06 + v * .12);
      edgeBox(frames, site, edge, t0, 9.5, .2, .16, 7, .34);
    }
    edgeBox(frames, site, edge, .5, 12.8, .18, length + .05, .4, .42);
    if (edge === 12 || edge === 17) for (let i = 0; i < Math.ceil(length / .65); i++) edgeBox(louvres, site, edge, (i + .5) / Math.ceil(length / .65), 9.4, .22, .12, 4.8, .16);
  }
  meshStore(group, panels, materials.interior, 'Marco Polo warm stone mall podium'); meshStore(group, glass, materials.glazing, 'Marco Polo podium shopfront glazing');
  merged(group, frames, materials.paleStone, 'Marco Polo podium frames'); merged(group, louvres, materials.metal, 'Marco Polo podium ventilation louvres');
}
function addHotelRooms(group, site, materials) {
  const glass = store(), stone = store(), fins = [], bands = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);
    const bays = Math.max(1, Math.ceil(length / 3.65)), p = (t, y, o = 0) => point(site, edge, t, y, o);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, q = p(t0, (13 + 55) * .5, .18);
      box(fins, q, [.24, 42, .52]);
      for (let floor = 0; floor < MARCO_POLO_ROOM_FLOORS; floor++) {
        const y0 = 13 + floor * 3, v = hash(edge, bay, floor, 3382), darkSlot = bay % 9 === 0;
        quad(stone, p(t0, y0, -.08), p(t1, y0, -.08), p(t1, y0 + 3, -.08), p(t0, y0 + 3, -.08), [.64 + v * .055, .63 + v * .05, .57 + v * .045]);
        quad(glass, p(t0 + .18 / length * bays, y0 + .62, .02), p(t1 - .18 / length * bays, y0 + .62, .02), p(t1 - .18 / length * bays, y0 + 2.62, .02), p(t0 + .18 / length * bays, y0 + 2.62, .02),
          darkSlot ? [.035, .055, .055] : [.11 + v * .07, .17 + v * .06, .18 + v * .06], darkSlot ? .02 : .12 + v * .65);
        edgeBox(bands, site, edge, (t0 + t1) * .5, y0 + .18, .16, length / bays + .02, .36, .4);
      }
    }
  }
  meshStore(group, stone, materials.interior, 'Fourteen floors of warm concrete hotel room bays'); meshStore(group, glass, materials.glazing, 'Recessed Marco Polo guest-room windows');
  merged(group, fins, materials.paleStone, 'Full-height hotel facade fins'); merged(group, bands, materials.paleStone, 'Hotel room horizontal spandrels');
}
function addEntrance(group, site, materials) {
  const edge = MARCO_POLO_MAIN_ENTRANCE.sourceEdge, wall = store(), glass = store(), frames = [], canopyGlass = [], lights = [];
  const p = (t, y, o = .1) => point(site, edge, t, y, o);
  // The long Canton Road wall has a real central opening; its stone sign band and gold device are not a generic mall label.
  for (const [t0, t1] of [[0, .31], [.69, 1]]) {
    quad(wall, p(t0, 0), p(t1, 0), p(t1, 13), p(t0, 13), [.40, .39, .35]);
  }
  quad(wall, p(.31, 5.2), p(.69, 5.2), p(.69, 13), p(.31, 13), [.40, .39, .35]);
  for (let i = 0; i < 6; i++) {
    const t0 = .33 + i * .057, t1 = t0 + .052;
    quad(glass, p(t0, .15, .02), p(t1, .15, .02), p(t1, 4.8, .02), p(t0, 4.8, .02), [.15, .23, .22], .32);
    edgeBox(frames, site, edge, t0, 2.5, .16, .12, 5, .2);
  }
  for (const t of [.31, .69]) edgeBox(frames, site, edge, t, 2.6, .22, .65, 5.2, .65);
  const length = MARCO_POLO_MAIN_ENTRANCE.length;
  edgeBox(frames, site, edge, .5, 5.35, .1, 39, .18, .14);
  edgeBox(frames, site, edge, .5, 5.35, 4.85, 39, .18, .14);
  for (let i = 0; i < 12; i++) edgeBox(frames, site, edge, .16 + i * .062, 5.18, 2.4, .11, .22, 5.1);
  edgeBox(canopyGlass, site, edge, .5, 5.31, 2.4, 38.6, .055, 4.85);
  for (let i = 0; i < 14; i++) edgeBox(lights, site, edge, .18 + i * .049, 5.15, 4.2, .12, .05, .12);
  meshStore(group, wall, materials.interior, 'Canton Road warm stone entrance wall'); meshStore(group, glass, materials.glazing, 'Hotel entrance glazed doors');
  merged(group, frames, materials.metal, 'Hotel glass-canopy ribs and entrance columns');
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x9fc6c1, transparent: true, opacity: .38, roughness: .13, metalness: .18, depthWrite: false });
  merged(group, canopyGlass, glassMaterial, 'Transparent Canton Road entrance canopy', false); merged(group, lights, materials.warmLight, 'Entrance canopy downlights', false);
  const sign = addEdgeSign(group, site, edge, 'THE MARCO POLO HONGKONG HOTEL', '馬哥孛羅香港酒店  ·  HARBOUR CITY', 7.6, 35, 2.65, .28, { background: '#666157', foreground: '#d3b675', subForeground: '#c6b384', accent: false });
  const horse = horseMark(), frame = MARCO_POLO_MAIN_ENTRANCE;
  // Convert the source-directed world frame back to the same local edge used by the model.
  const localMid = p(.5, 10.6, .31); horse.position.set(localMid[0], localMid[1], localMid[2]); horse.rotation.y = sign.rotation.y; group.add(horse);
  return { sign, horse };
}

export function buildMarcoPoloHongkongHotel(scene, { groundOffset } = {}) {
  const site = MARCO_POLO_HONGKONG_SITE, base = groundOffset ?? harbourCityPadHeight(site.key), root = new THREE.Group(); root.name = 'Harbour City — Marco Polo Hongkong Hotel';
  const group = new THREE.Group(); group.position.set(site.x, base, site.z); group.rotation.y = site.ry; group.name = 'Marco Polo Hongkong Hotel local frame'; root.add(group);
  const materials = harbourCityPalette({ stone: [.49, .47, .42], paleStone: [.72, .70, .63], metal: [.28, .30, .29], roof: [.39, .40, .38] }); materials.glazing.side = THREE.DoubleSide; warmWindowEmission(materials.glazing, [1, .73, .39], 1.05);
  const street = createStreetLevel(site, { soffit: MARCO_POLO_ROAD_SOFFIT, customEdges: [MARCO_POLO_MAIN_ENTRANCE.sourceEdge], glassA: [.08, .15, .15], glassB: [.19, .27, .25], stoneTint: [.43, .41, .37] });
  meshStore(group, street.backing, materials.interior, 'Marco Polo ground-floor interior'); meshStore(group, street.glass, materials.glazing, 'Marco Polo ground-floor glazing'); meshStore(group, street.stone, materials.interior, 'Marco Polo ground-floor stone');
  merged(group, street.frames, materials.paleStone, 'Marco Polo road-safe ground lintels'); merged(group, street.columns, materials.paleStone, 'Marco Polo road-safe ground columns');
  const colliders = absolute(street.colliders, base); addPodium(group, site, materials); addHotelRooms(group, site, materials); addEntrance(group, site, materials);
  colliders.push(...harbourCityRingColliders(site, base + MARCO_POLO_ROAD_SOFFIT, base + MARCO_POLO_HEIGHT));
  const roof = new THREE.Mesh(roofGeometry(site.localRing, MARCO_POLO_HEIGHT), materials.roof); roof.name = 'Marco Polo exact-footprint roof'; roof.receiveShadow = true; group.add(roof);
  const parapet = [], plant = [], dark = []; ringBand(parapet, site, 55.55, 1.1, .02, .28);
  box(plant, [-17, 56.5, 9], [18, 3, 13]); box(plant, [14, 56.1, -12], [12, 2.2, 9]);
  for (let i = 0; i < 10; i++) { const x = -25 + i * 5.2; box(plant, [x, 55.65, 21], [2.6, 1.3, 2.4]); box(dark, [x, 56.33, 21], [1.8, .06, 1.8]); }
  merged(group, parapet, materials.paleStone, 'Marco Polo roof parapet'); merged(group, plant, materials.roof, 'Marco Polo roof plant and lift overruns'); merged(group, dark, materials.dark, 'Marco Polo roof fan grilles');
  addEdgeSign(group, site, 12, 'HARBOUR CITY', '馬哥孛羅香港酒店商場', 10.2, 19, 2.2, .4, { background: '#5d5b54', foreground: '#d0b57b', accent: false });
  scene.add(root);
  const landmark = { id: 'marco-polo-hongkong-hotel', name: site.name, position: { x: site.x, y: base, z: site.z }, radius: 64, height: MARCO_POLO_HEIGHT };
  return {
    root, group, colliders, landmarks: [landmark], groundOffset: base, site, roads: harbourCityRoadRecords(site),
    stats: { marcoPoloSourceVertices: site.ring.length / 2 - 1, marcoPoloRingArea: site.ringArea, marcoPoloHeight: MARCO_POLO_HEIGHT,
      marcoPoloOsmLevels: site.levels, marcoPoloRoomFloors: MARCO_POLO_ROOM_FLOORS, marcoPoloPodiumTop: MARCO_POLO_PODIUM_TOP,
      marcoPoloRoadCrossings: site.roadIds.length, marcoPoloOpenRoadBays: street.openRoadBays, marcoPoloRoadSoffit: MARCO_POLO_ROAD_SOFFIT,
      marcoPoloRoadLintelDepth: HARBOUR_CITY_ROAD_LINTEL_DEPTH, marcoPoloGoldHorse: true },
    groundHeightAt: (x, z, ground) => harbourCityGroundHeightAt(site, x, z, ground, { deck: base + .12 })
  };
}
