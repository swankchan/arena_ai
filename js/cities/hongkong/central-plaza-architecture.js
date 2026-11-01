import { GEO } from '../../hk-geodata.js';
import { flatRingBounds, minimumAreaObb, pointInFlatRing } from './landmark-site.js';

const source = GEO.landmarks['中環廣場'];
if (!source?.ring) throw new Error('The OSM Central Plaza footprint is required');
// The generated landmark cache stores an open ring; close it before minimum-area OBB edge analysis.
const ring = Object.freeze([...source.ring, source.ring[0], source.ring[1]]);
const footprint = minimumAreaObb(ring);
export const CENTRAL_PLAZA_SITE = Object.freeze({
  name: '中環廣場', englishName: 'Central Plaza', address: '港灣道十八號 18 Harbour Road',
  osmType: 'way', osmId: 27087018, source, ring, bounds: flatRingBounds(ring), ...footprint
});

// OSM describes the 309 m roof and 78 levels. The architectural mast height is a separate external convention.
export const CENTRAL_PLAZA_OSM_ROOF_HEIGHT = 309;
export const CENTRAL_PLAZA_OSM_LEVELS = 78;
export const CENTRAL_PLAZA_HEIGHT = 373.9;
export const CENTRAL_PLAZA_OFFICIAL_ROUNDED_HEIGHT = 374;
export const CENTRAL_PLAZA_OFFICIAL_OFFICE_LEVELS = 75;
export const CENTRAL_PLAZA_MAST_HEIGHT = 102; // Includes the part concealed inside the tower top.
export const CENTRAL_PLAZA_PLAZA_TOP = 0.12;
export const CENTRAL_PLAZA_PODIUM_HEIGHT = 30.5;
export const CENTRAL_PLAZA_BODY_HEIGHT = 235.4;
export const CENTRAL_PLAZA_BODY_TOP = CENTRAL_PLAZA_PODIUM_HEIGHT + CENTRAL_PLAZA_BODY_HEIGHT;
export const CENTRAL_PLAZA_FLOOR_HEIGHT = 3.6;
export const CENTRAL_PLAZA_BAY_WIDTH = 1.53;
export const CENTRAL_PLAZA_STRUCTURE_BAY = 4.6;
export const CENTRAL_PLAZA_COLUMN_DIAMETER = 2;
export const CENTRAL_PLAZA_COLUMN_SPACING = 8.6;
export const CENTRAL_PLAZA_CROWN_PLANT_FLOORS = 6;
export const CENTRAL_PLAZA_PYRAMID_TOP = 338;
export const CENTRAL_PLAZA_LIGHTIME_BAND_LEVELS = Object.freeze([337, 342, 347, 352]);
export const CENTRAL_PLAZA_FRAME_BOTTOM = 276;
export const CENTRAL_PLAZA_FRAME_TOP = 309;
if (source.h !== CENTRAL_PLAZA_OSM_ROOF_HEIGHT) throw new Error('Central Plaza OSM roof metadata has changed');

export const CENTRAL_PLAZA_LOCAL_RING = Object.freeze((() => {
  const cs = Math.cos(CENTRAL_PLAZA_SITE.ry), sn = Math.sin(CENTRAL_PLAZA_SITE.ry), local = [];
  for (let i = 0; i + 1 < ring.length; i += 2) {
    const dx = ring[i] - CENTRAL_PLAZA_SITE.x, dz = ring[i + 1] - CENTRAL_PLAZA_SITE.z;
    local.push(dx * cs - dz * sn, dx * sn + dz * cs);
  }
  return local;
})());

export function centralPlazaPlanAt(y) {
  let scale = 1;
  if (y >= CENTRAL_PLAZA_BODY_TOP && y <= CENTRAL_PLAZA_OSM_ROOF_HEIGHT) {
    scale = 0.92;
  } else if (y > CENTRAL_PLAZA_OSM_ROOF_HEIGHT) {
    scale = Math.max(0.025, 0.78 * (1 - (y - CENTRAL_PLAZA_OSM_ROOF_HEIGHT)
      / (CENTRAL_PLAZA_PYRAMID_TOP - CENTRAL_PLAZA_OSM_ROOF_HEIGHT)));
  }
  return CENTRAL_PLAZA_LOCAL_RING.map((value) => value * scale);
}

export function centralPlazaLocalToWorld(x, z) {
  const cs = Math.cos(CENTRAL_PLAZA_SITE.ry), sn = Math.sin(CENTRAL_PLAZA_SITE.ry);
  return { x: CENTRAL_PLAZA_SITE.x + cs * x + sn * z, z: CENTRAL_PLAZA_SITE.z - sn * x + cs * z };
}
export function centralPlazaWorldToLocal(x, z) {
  const cs = Math.cos(CENTRAL_PLAZA_SITE.ry), sn = Math.sin(CENTRAL_PLAZA_SITE.ry);
  const dx = x - CENTRAL_PLAZA_SITE.x, dz = z - CENTRAL_PLAZA_SITE.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}
export function isCentralPlazaPlazaPoint(x, z) { return pointInFlatRing(CENTRAL_PLAZA_SITE.ring, x, z); }
export function centralPlazaLocalCollider({ x = 0, z = 0, w, d, minY, maxY }) {
  const centre = centralPlazaLocalToWorld(x, z), cs = Math.cos(CENTRAL_PLAZA_SITE.ry), sn = Math.sin(CENTRAL_PLAZA_SITE.ry);
  const hx = w * 0.5, hz = d * 0.5;
  return {
    minX: centre.x - Math.abs(cs) * hx - Math.abs(sn) * hz,
    maxX: centre.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: centre.z - Math.abs(sn) * hx - Math.abs(cs) * hz,
    maxZ: centre.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY, obb: { cx: centre.x, cz: centre.z, hx, hz, cs, sn }
  };
}

// Local Hong Kong time implementation of the published four-band / quarter-hour rule. This is deliberately not
// described as a live Hong Kong Observatory network feed. Palette index 0 at 18:00 and 1 at 19:00 also preserves
// the published 18:30 example: two lower red bands and two upper white bands. The other four colours and the
// short blink below are clearly visual approximations, not a claimed transcription of the official sequence/timing.
export const CENTRAL_PLAZA_LIGHTIME_PALETTE = Object.freeze([
  Object.freeze({ name: 'white', hex: 0xf2eee0 }),
  Object.freeze({ name: 'red', hex: 0xff3438 }),
  Object.freeze({ name: 'yellow', hex: 0xffca45 }),
  Object.freeze({ name: 'green', hex: 0x48e08c }),
  Object.freeze({ name: 'blue', hex: 0x4c8fff }),
  Object.freeze({ name: 'violet', hex: 0xd66cff })
]);
export function centralPlazaLightimeState(timestamp = Date.now()) {
  const date = new Date(timestamp + 8 * 3600000);
  const hour = date.getUTCHours(), minute = date.getUTCMinutes(), second = date.getUTCSeconds();
  const quarter = Math.floor(minute / 15);
  const current = CENTRAL_PLAZA_LIGHTIME_PALETTE[hour % 6];
  const next = CENTRAL_PLAZA_LIGHTIME_PALETTE[(hour + 1) % 6];
  return {
    hour, minute, quarter,
    bands: Array.from({ length: 4 }, (_, index) => index < quarter ? next : current),
    blink: second < 2 && Math.floor(timestamp / 500) % 2 === 0
  };
}
