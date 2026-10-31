import { minimumAreaObb } from './hsbc-headquarters-architecture.js';

// Standard Chartered Bank Building, 4–4A Des Voeux Road Central. The generated core geodata query only retains named
// buildings with a height/level tag, so this authored landmark keeps the complete OSM way 85320719 outline here rather
// than silently substituting a road-block rectangle. Coordinates use the same Statue Square tangent-plane frame as GEO.
// Source: OpenStreetMap contributors, ODbL 1.0; geometry retrieved 31 October 2026.
export const SCB_OSM_RING = Object.freeze([
  -80.7, 198, -76, 199.3, -53.7, 205.5, -53.5, 205, -51.1, 196.3,
  -43.5, 169, -37.7, 148.2, -35.3, 139.6, -37.3, 139, -56.4, 133.3,
  -58.1, 132.8, -60.7, 134.3, -63.3, 135.7, -63.8, 137.5, -64.9, 141.1,
  -66.3, 146.2, -67.8, 151.6, -69.3, 157, -69.8, 158.8, -70.1, 159.8,
  -70.3, 160.8, -70.8, 162.6, -72.3, 168, -73.9, 173.4, -75.3, 178.5,
  -76.3, 182.1, -76.8, 183.9
]);

const rawFootprint = minimumAreaObb(SCB_OSM_RING);
// minimumAreaObb quite correctly selected the long axis as local x. Turn it into a narrow street facade / long lot so
// local -z always faces Des Voeux Road Central, matching the supplied north-elevation photograph.
const footprint = rawFootprint.w > rawFootprint.d
  ? { ...rawFootprint, w: rawFootprint.d, d: rawFootprint.w, ry: rawFootprint.ry - Math.PI / 2 }
  : rawFootprint;

let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (let i = 0; i < SCB_OSM_RING.length; i += 2) {
  minX = Math.min(minX, SCB_OSM_RING[i]); maxX = Math.max(maxX, SCB_OSM_RING[i]);
  minZ = Math.min(minZ, SCB_OSM_RING[i + 1]); maxZ = Math.max(maxZ, SCB_OSM_RING[i + 1]);
}

export const SCB_SITE = Object.freeze({
  name: '渣打銀行大廈',
  englishName: 'Standard Chartered Bank Building',
  address: '德輔道中4–4A號 4–4A Des Voeux Road Central',
  osmType: 'way',
  osmId: 85320719,
  source: Object.freeze({ type: 'way', id: 85320719, ring: SCB_OSM_RING }),
  ring: SCB_OSM_RING,
  bounds: Object.freeze({ minX, maxX, minZ, maxZ }),
  h: 191,
  ...footprint
});

export const SCB_HEIGHT = 191;
export const SCB_FLOORS = 42;
export const SCB_BASE_Y = 0.72;
// The main lobby sits above the street at the head of the long ceremonial flight. Keep the structural tower base
// separate: raising the whole building would create an unsupported undercroft around the side and rear elevations.
export const SCB_ENTRANCE_BASE_Y = 4.2;
export const SCB_PODIUM_HEIGHT = 27;
export const SCB_FLOOR_HEIGHT = 4.05;
export const SCB_OFFICE_ROWS = 37;
export const SCB_MAIN_ROOF_Y = SCB_PODIUM_HEIGHT + SCB_OFFICE_ROWS * SCB_FLOOR_HEIGHT;
export const SCB_WIDTH = Math.min(27.2, SCB_SITE.w - 0.7);

// The supplied Des Voeux Road elevation belongs to the tallest north tier. Lower tiers step down towards Queen's Road
// Central; this is the sculptural stepped silhouette visible in the side / rear photographs, not a generic extruded box.
const tierDepth = SCB_SITE.d / 3;
export const SCB_TIERS = Object.freeze([
  Object.freeze({ id: 'north', z: -tierDepth, depth: tierDepth, roofY: SCB_MAIN_ROOF_Y, rows: 37 }),
  Object.freeze({ id: 'central', z: 0, depth: tierDepth, roofY: SCB_PODIUM_HEIGHT + 31 * SCB_FLOOR_HEIGHT, rows: 31 }),
  Object.freeze({ id: 'south', z: tierDepth, depth: tierDepth, roofY: SCB_PODIUM_HEIGHT + 25 * SCB_FLOOR_HEIGHT, rows: 25 })
]);
export const SCB_FRONT_Z = SCB_TIERS[0].z - SCB_TIERS[0].depth * 0.5;

export const SCB_FRONT_PIER_WIDTH = 5.4;
export const SCB_FRONT_GLASS_WIDTH = (SCB_WIDTH - 3 * SCB_FRONT_PIER_WIDTH) / 2;
export const SCB_FRONT_PIER_X = Object.freeze([
  -SCB_WIDTH * 0.5 + SCB_FRONT_PIER_WIDTH * 0.5,
  0,
  SCB_WIDTH * 0.5 - SCB_FRONT_PIER_WIDTH * 0.5
]);
export const SCB_FRONT_GLASS_X = Object.freeze([
  -(SCB_FRONT_PIER_WIDTH + SCB_FRONT_GLASS_WIDTH) * 0.5,
  (SCB_FRONT_PIER_WIDTH + SCB_FRONT_GLASS_WIDTH) * 0.5
]);
export const SCB_OCTAGON_Y = 20.5;
export const SCB_ENTRANCE_HEIGHT = 14.4;
export const SCB_SIGN_FIN = Object.freeze({
  x: 0, z: SCB_FRONT_Z + 3, w: 11.8, d: 5.4,
  baseY: SCB_MAIN_ROOF_Y, topY: SCB_HEIGHT
});

// One long, shallow flight crosses the frontage obliquely: low at the screen-right end, high at the screen-left
// entrance landing. Thirty broad treads fit the real frontage without pushing the bottom of the flight into the road.
export const SCB_STAIR_COUNT = 30;
export const SCB_STAIR_WIDTH = 3.8;
export const SCB_STAIR_BOTTOM = Object.freeze({ x: -9, z: SCB_FRONT_Z - 3.8 });
export const SCB_STAIR_TOP = Object.freeze({ x: 9, z: SCB_FRONT_Z - 1.4 });
const stairDX = SCB_STAIR_TOP.x - SCB_STAIR_BOTTOM.x;
const stairDZ = SCB_STAIR_TOP.z - SCB_STAIR_BOTTOM.z;
export const SCB_STAIR_RUN = Math.hypot(stairDX, stairDZ);
export const SCB_STAIR_TREAD = SCB_STAIR_RUN / SCB_STAIR_COUNT;
export const SCB_STAIR_RISE = SCB_ENTRANCE_BASE_Y / SCB_STAIR_COUNT;
export const SCB_STAIR_HEADING = Math.atan2(stairDX, stairDZ);
export const SCB_STAIR_DIRECTION = Object.freeze({ x: stairDX / SCB_STAIR_RUN, z: stairDZ / SCB_STAIR_RUN });
export const SCB_STAIR_TOP_LANDING_DEPTH = 1.6;
export const SCB_ENTRANCE_LANDING = Object.freeze({
  x: 0,
  z: (SCB_STAIR_TOP.z + SCB_FRONT_Z + 0.05) * 0.5,
  w: SCB_WIDTH + 1.1,
  d: SCB_FRONT_Z + 0.05 - SCB_STAIR_TOP.z
});

function scbStairCoordinates(x, z, origin = SCB_STAIR_BOTTOM) {
  const dx = x - origin.x, dz = z - origin.z;
  return {
    along: dx * SCB_STAIR_DIRECTION.x + dz * SCB_STAIR_DIRECTION.z,
    across: dx * SCB_STAIR_DIRECTION.z - dz * SCB_STAIR_DIRECTION.x
  };
}

export function scbLocalToWorld(x, z) {
  const cs = Math.cos(SCB_SITE.ry), sn = Math.sin(SCB_SITE.ry);
  return { x: SCB_SITE.x + cs * x + sn * z, z: SCB_SITE.z - sn * x + cs * z };
}

export function scbWorldToLocal(x, z) {
  const cs = Math.cos(SCB_SITE.ry), sn = Math.sin(SCB_SITE.ry);
  const dx = x - SCB_SITE.x, dz = z - SCB_SITE.z;
  return { x: dx * cs - dz * sn, z: dx * sn + dz * cs };
}

// Ground-height field for exactly the same diagonal stair and two landing footprints as the rendered meshes. Each
// tread is sampled independently, so a pedestrian climbs thirty 0.14 m risers rather than sliding up an invisible ramp.
export function scbEntranceGroundHeight(x, z, ground = 0) {
  const local = scbWorldToLocal(x, z);
  let height = ground;
  const stair = scbStairCoordinates(local.x, local.z);
  if (stair.along >= 0 && stair.along < SCB_STAIR_RUN && Math.abs(stair.across) <= SCB_STAIR_WIDTH * 0.5) {
    const step = Math.min(SCB_STAIR_COUNT - 1, Math.floor(stair.along / SCB_STAIR_TREAD));
    height = Math.max(height, (step + 1) * SCB_STAIR_RISE);
  }
  const topLanding = scbStairCoordinates(local.x, local.z, SCB_STAIR_TOP);
  if (topLanding.along >= 0 && topLanding.along <= SCB_STAIR_TOP_LANDING_DEPTH
    && Math.abs(topLanding.across) <= SCB_STAIR_WIDTH * 0.5) {
    height = Math.max(height, SCB_ENTRANCE_BASE_Y);
  }
  if (Math.abs(local.x - SCB_ENTRANCE_LANDING.x) <= SCB_ENTRANCE_LANDING.w * 0.5
    && Math.abs(local.z - SCB_ENTRANCE_LANDING.z) <= SCB_ENTRANCE_LANDING.d * 0.5) {
    height = Math.max(height, SCB_ENTRANCE_BASE_Y);
  }
  return height;
}

export function scbLocalCollider({ x, z, w, d, minY, maxY, heading = 0 }) {
  const centre = scbLocalToWorld(x, z), cs = Math.cos(SCB_SITE.ry + heading), sn = Math.sin(SCB_SITE.ry + heading);
  const hx = w * 0.5, hz = d * 0.5;
  return {
    minX: centre.x - Math.abs(cs) * hx - Math.abs(sn) * hz,
    maxX: centre.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: centre.z - Math.abs(sn) * hx - Math.abs(cs) * hz,
    maxZ: centre.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    minY, maxY,
    obb: { cx: centre.x, cz: centre.z, hx, hz, cs, sn }
  };
}
