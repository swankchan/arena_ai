import * as THREE from 'three/webgpu';
import {
  PRINCE_HOTEL_SITE, PRINCE_HOTEL_MAIN_ENTRANCE, harbourCityRoadRecords, HARBOUR_CITY_ROAD_LINTEL_DEPTH,
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import { buildHarbourCityHotel } from './harbour-city-hotel-world-utils.js';
import { store, quad, meshStore, merged, point, edgeBox, addEdgeSign } from './harbour-city-world-utils.js';

export const PRINCE_HOTEL_HEIGHT = 55;
export const PRINCE_HOTEL_PODIUM_LEVELS = 3;
export const PRINCE_HOTEL_PODIUM_TOP = 12;
export const PRINCE_HOTEL_ROOM_FLOORS = 13;
export const PRINCE_HOTEL_ROOM_FLOOR_HEIGHT = (PRINCE_HOTEL_HEIGHT - PRINCE_HOTEL_PODIUM_TOP) / PRINCE_HOTEL_ROOM_FLOORS;
export const PRINCE_HOTEL_ROOMS = 394;
export const PRINCE_HOTEL_REOPENING_DATE = '2023-08-01';
export const PRINCE_HOTEL_CORE_BAYS = Object.freeze([5, 6, 7]);

function addPrinceEntrance(group, site, materials, entrance) {
  const edge = entrance.sourceEdge, panels = store(), glass = store(), backing = store(), lobby = store();
  const frames = [], stoneColumns = [], canopy = [], darkCanopy = [], lights = [];
  const p = (t, y, o = 0.05) => point(site, edge, t, y, o);
  for (const [t0, t1] of [[0, 0.15], [0.85, 1]]) quad(panels, p(t0, 0), p(t1, 0), p(t1, 12), p(t0, 12), [0.68, 0.66, 0.61]);
  quad(panels, p(0, 11.2, 0.04), p(1, 11.2, 0.04), p(1, 12, 0.04), p(0, 12, 0.04), [0.68, 0.66, 0.61]);
  quad(backing, p(0.15, 4.8, -0.18), p(0.85, 4.8, -0.18), p(0.85, 11.2, -0.18), p(0.15, 11.2, -0.18), [0.07, 0.1, 0.11]);
  quad(glass, p(0.15, 4.8, 0.03), p(0.85, 4.8, 0.03), p(0.85, 11.2, 0.03), p(0.15, 11.2, 0.03), [0.12, 0.2, 0.22], 0.08);
  quad(lobby, p(0.18, 0, -4.2), p(0.82, 0, -4.2), p(0.82, 4.5, -4.2), p(0.18, 4.5, -4.2), [0.31, 0.25, 0.18]);
  quad(glass, p(0.25, 0.15, -3.85), p(0.75, 0.15, -3.85), p(0.75, 4.35, -3.85), p(0.25, 4.35, -3.85), [0.18, 0.22, 0.21], 0.1);
  const glazing = new THREE.MeshPhysicalMaterial({ color: 0x66848a, roughness: 0.16, metalness: 0.12, transparent: true, opacity: 0.48, transmission: 0.08, side: THREE.DoubleSide });
  meshStore(group, panels, materials.interior, 'Prince Hotel pale stone podium side panels');
  meshStore(group, backing, materials.interior, 'Prince Hotel dark retail backing');
  meshStore(group, lobby, materials.interior, 'Prince Hotel warm recessed lobby wall');
  meshStore(group, glass, glazing, 'Prince Hotel upper retail glazing and recessed lobby doors', false);
  for (const t of [0.15, 0.35, 0.5, 0.65, 0.85]) edgeBox(frames, site, edge, t, 8, 0.14, 0.13, 6.4, 0.22);
  for (const t of [0.25, 0.4, 0.5, 0.6, 0.75]) edgeBox(frames, site, edge, t, 2.2, -3.72, 0.12, 4.4, 0.18);
  for (const [t, offset] of [[0.18, 2.5], [0.82, 2.5], [0.28, 0.2], [0.72, 0.2]]) edgeBox(stoneColumns, site, edge, t, 2.3, offset, 0.78, 4.6, 0.78);
  edgeBox(canopy, site, edge, 0.5, 4.75, 2.55, 27, 0.32, 5.5);
  edgeBox(darkCanopy, site, edge, 0.5, 4.54, 2.55, 25.5, 0.09, 4.9);
  for (const offset of [0.65, 1.65, 2.65, 3.65, 4.65]) edgeBox(lights, site, edge, 0.5, 4.47, offset, 21, 0.055, 0.1);
  merged(group, frames, materials.metal, 'Prince Hotel dark bronze retail mullions and recessed door frames');
  merged(group, stoneColumns, materials.paleStone, 'Prince Hotel broad rectangular porte-cochere columns');
  merged(group, canopy, materials.paleStone, 'Prince Hotel deep Canton Road porte-cochere slab');
  merged(group, darkCanopy, materials.dark, 'Prince Hotel dark metal and glass canopy underside');
  merged(group, lights, materials.warmLight, 'Prince Hotel porte-cochere warm linear downlights');
  addEdgeSign(group, site, edge, 'THE PRINCE HOTEL', 'MARCO POLO HOTELS  ·  23 CANTON ROAD', 9.25, 18, 1.6, 0.5, { background: '#334449', foreground: '#f4f0df', subForeground: '#d8d5ca', accent: false });
  addEdgeSign(group, site, edge, 'PRINCE', 'HOTEL ENTRANCE', 3.75, 8, 0.85, -3.62, { background: '#3b3430', foreground: '#eee5d4', accent: false });
}

export function buildPrinceHotel(scene, { groundOffset } = {}) {
  const result = buildHarbourCityHotel(scene, PRINCE_HOTEL_SITE, PRINCE_HOTEL_MAIN_ENTRANCE, {
    groundOffset: groundOffset ?? harbourCityPadHeight(PRINCE_HOTEL_SITE.key), landmarkId: 'prince-hotel',
    podiumLevels: PRINCE_HOTEL_PODIUM_LEVELS, podiumTop: PRINCE_HOTEL_PODIUM_TOP,
    roomFloors: PRINCE_HOTEL_ROOM_FLOORS, rooms: PRINCE_HOTEL_ROOMS, frameStyle: 'vertical',
    stone: [0.65, 0.64, 0.6], paleStone: [0.8, 0.79, 0.74], stoneTint: [0.65, 0.64, 0.6], coreTint: [0.57, 0.58, 0.56],
    glassA: [0.025, 0.05, 0.06], glassB: [0.09, 0.14, 0.16], windowTint: (v) => [0.025 + v * 0.02, 0.05 + v * 0.03, 0.065 + v * 0.03],
    corePanel: (edge, bay) => edge === 61 && PRINCE_HOTEL_CORE_BAYS.includes(bay),
    addEntrance: addPrinceEntrance, entranceOpening: [0.34, 0.66],
  });
  result.roads = harbourCityRoadRecords(PRINCE_HOTEL_SITE);
  result.stats.princeHotelReopeningDate = PRINCE_HOTEL_REOPENING_DATE;
  result.stats.princeHotelRoadLintelDepth = HARBOUR_CITY_ROAD_LINTEL_DEPTH;
  return result;
}
