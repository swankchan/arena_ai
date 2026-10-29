// Lightweight New York metadata shared by the city pack and its tests (no three.js imports).
import { ROADS, NYC_LANDMARKS, TELEPORT_LOCATIONS, getLocationLabel } from '../../city-config.js';

const LABELS = {
  empire: ['Empire State Building', '5th Ave · Midtown'],
  timessq: ['Times Square', '7th Ave · Theater District'],
  chrysler: ['Chrysler Building', 'Lexington Ave · Midtown East'],
  grandcentral: ['Grand Central Terminal', 'Park Ave · Midtown East'],
  bryant: ['Bryant Park', '6th Ave · Midtown'],
  flatiron: ['Flatiron Building', '5th Ave · Flatiron District'],
  centralpark: ['Central Park', '6th Ave · Central Park South'],
  owtc: ['One World Trade Center', 'Vesey St · Financial District']
};

export const TELEPORTS = Object.entries(TELEPORT_LOCATIONS).map(([id, point]) => {
  const [name, sub] = LABELS[id] || [id, ''];
  return { id, name, sub, x: point.x, z: point.z, heading: point.heading };
});

export const ROAD_NAMES = new Set(ROADS.map((road) => road.name));
export const PLACE_NAMES = new Set(NYC_LANDMARKS.map((landmark) => landmark.name));

export { getLocationLabel };
