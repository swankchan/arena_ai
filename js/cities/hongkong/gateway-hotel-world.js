import * as THREE from 'three/webgpu';
import {
  GATEWAY_HOTEL_SITE, GATEWAY_HOTEL_MAIN_ENTRANCE, harbourCityRoadRecords, HARBOUR_CITY_ROAD_LINTEL_DEPTH,
} from './harbour-city-architecture.js';
import { harbourCityPadHeight } from './terrain.js';
import { buildHarbourCityHotel } from './harbour-city-hotel-world-utils.js';
import { store, quad, meshStore, merged, point, edgeBox, addEdgeSign } from './harbour-city-world-utils.js';

export const GATEWAY_HOTEL_HEIGHT = 55;
export const GATEWAY_HOTEL_PODIUM_LEVELS = 3;
export const GATEWAY_HOTEL_PODIUM_TOP = 12;
export const GATEWAY_HOTEL_ROOM_FLOORS = 13;
export const GATEWAY_HOTEL_ROOM_FLOOR_HEIGHT = (GATEWAY_HOTEL_HEIGHT - GATEWAY_HOTEL_PODIUM_TOP) / GATEWAY_HOTEL_ROOM_FLOORS;
export const GATEWAY_HOTEL_ROOMS = 400;
export const GATEWAY_HOTEL_RENOVATION_YEAR = 2012;
export const THREE_ON_CANTON_LEVEL = 3;

function addGatewayEntrance(group, site, materials, entrance) {
  const edge = entrance.sourceEdge, panels = store(), glass = store(), lobby = store(), frames = [], canopy = [], lights = [], art = [];
  const p = (t, y, o = 0.05) => point(site, edge, t, y, o);
  quad(lobby, p(0.18, 0, -4), p(0.82, 0, -4), p(0.82, 8.2, -4), p(0.18, 8.2, -4), [0.15, 0.12, 0.1]);
  for (const [t0, t1] of [[0, 0.18], [0.82, 1]]) quad(panels, p(t0, 0), p(t1, 0), p(t1, 12), p(t0, 12), [0.75, 0.73, 0.68]);
  quad(panels, p(0, 8.2, 0), p(1, 8.2, 0), p(1, 12, 0), p(0, 12, 0), [0.75, 0.73, 0.68]);
  quad(glass, p(0.18, 0.15, 0.03), p(0.82, 0.15, 0.03), p(0.82, 8.2, 0.03), p(0.18, 8.2, 0.03), [0.2, 0.36, 0.38], 0.1);
  const entranceGlass = new THREE.MeshPhysicalMaterial({ color: 0x7c9da0, roughness: 0.14, metalness: 0.08, transparent: true, opacity: 0.38, transmission: 0.12, side: THREE.DoubleSide });
  meshStore(group, panels, materials.interior, 'Gateway Hotel white entrance side panels and upper podium');
  meshStore(group, lobby, materials.interior, 'Gateway Hotel recessed warm lobby back wall');
  meshStore(group, glass, entranceGlass, 'Gateway Hotel transparent Canton Road entrance glazing', false);
  const redArt = new THREE.MeshStandardMaterial({ color: 0xa52c25, roughness: 0.58, metalness: 0.05, emissive: 0x310503, emissiveIntensity: 0.2 });
  for (const [t, y, w, h] of [[0.43, 2.6, 1.1, 3.8], [0.51, 2.9, 1.7, 4.4], [0.6, 2.45, 0.85, 3.5]]) edgeBox(art, site, edge, t, y, -0.08, w, h, 0.18);
  merged(group, art, redArt, 'Gateway Hotel red lobby art visible behind the glass');
  for (const t of [0.18, 0.34, 0.5, 0.66, 0.82]) edgeBox(frames, site, edge, t, 4.1, 0.24, 0.32, 8.2, 0.46);
  for (const t of [0.38, 0.5, 0.62]) edgeBox(frames, site, edge, t, 1.95, 0.18, 0.1, 3.9, 0.18);
  edgeBox(canopy, site, edge, 0.5, 4.35, 1.65, 24, 0.18, 3.5);
  for (const t of [0.28, 0.72]) edgeBox(canopy, site, edge, t, 2.1, 2.95, 0.24, 4.2, 0.24);
  for (const offset of [0.55, 1.25, 1.95, 2.65]) edgeBox(lights, site, edge, 0.5, 4.22, offset, 19, 0.055, 0.09);
  merged(group, frames, materials.paleStone, 'Gateway Hotel white entrance columns and door frames');
  merged(group, canopy, materials.paleStone, 'Gateway Hotel linear Canton Road entrance canopy');
  merged(group, lights, materials.warmLight, 'Gateway Hotel warm linear canopy lights');
  addEdgeSign(group, site, edge, 'GATEWAY', 'MARCO POLO HOTELS  ·  13 CANTON ROAD', 9.25, 20, 1.45, 0.42, { background: '#e5e2d9', foreground: '#354143', accent: false });
  addEdgeSign(group, site, edge, 'THREE ON CANTON', 'LEVEL 3', 11.05, 10, 0.75, 0.44, { background: '#e5e2d9', foreground: '#4a5050', accent: false });
}

export function buildGatewayHotel(scene, { groundOffset } = {}) {
  const result = buildHarbourCityHotel(scene, GATEWAY_HOTEL_SITE, GATEWAY_HOTEL_MAIN_ENTRANCE, {
    groundOffset: groundOffset ?? harbourCityPadHeight(GATEWAY_HOTEL_SITE.key), landmarkId: 'gateway-hotel',
    podiumLevels: GATEWAY_HOTEL_PODIUM_LEVELS, podiumTop: GATEWAY_HOTEL_PODIUM_TOP,
    roomFloors: GATEWAY_HOTEL_ROOM_FLOORS, rooms: GATEWAY_HOTEL_ROOMS, frameStyle: 'projecting',
    stone: [0.72, 0.7, 0.66], paleStone: [0.86, 0.85, 0.8], stoneTint: [0.72, 0.7, 0.66],
    glassA: [0.06, 0.12, 0.14], glassB: [0.15, 0.25, 0.27], windowTint: (v) => [0.08 + v * 0.04, 0.16 + v * 0.05, 0.18 + v * 0.05],
    addEntrance: addGatewayEntrance, entranceOpening: [0.36, 0.64],
  });
  result.roads = harbourCityRoadRecords(GATEWAY_HOTEL_SITE);
  result.stats.gatewayHotelRenovationYear = GATEWAY_HOTEL_RENOVATION_YEAR;
  result.stats.gatewayHotelThreeOnCantonLevel = THREE_ON_CANTON_LEVEL;
  result.stats.gatewayHotelRoadLintelDepth = HARBOUR_CITY_ROAD_LINTEL_DEPTH;
  return result;
}
