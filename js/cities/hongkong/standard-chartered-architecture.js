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
export const SCB_ENTRANCE_BASE_Y = 3.6;
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
export const SCB_ENTRANCE_DOOR_WIDTH = 4.5;
// With the camera outside local -z looking towards +z, the left-hand entrance is the positive-local-x door.
export const SCB_LEFT_ENTRANCE_X = SCB_FRONT_PIER_X[SCB_FRONT_PIER_X.length - 1];
export const SCB_SIGN_FIN = Object.freeze({
  x: 0, z: SCB_FRONT_Z + 3, w: 11.8, d: 5.4,
  baseY: SCB_MAIN_ROOF_Y, topY: SCB_HEIGHT
});

// The flight itself, not a platform added afterwards, has the right-triangle-like plan requested by the user. Its road
// frame stays independent of the 35-degree architectural frame. The bottom matches the facade's road-facing projected
// width; every higher tread contracts linearly until its top matches the left-hand door's projected width.
export const SCB_STAIR_COUNT = 30;
export const SCB_STAIR_RUN = 13.5;
export const SCB_STAIR_TREAD = SCB_STAIR_RUN / SCB_STAIR_COUNT;
export const SCB_STAIR_RISE = SCB_ENTRANCE_BASE_Y / SCB_STAIR_COUNT;
export const SCB_HSBC_FACING_ANGLE = 35 * Math.PI / 180;
export const SCB_BUILDING_HEADING = SCB_SITE.ry - SCB_HSBC_FACING_ANGLE;
const siteFrameCs = Math.cos(SCB_SITE.ry), siteFrameSn = Math.sin(SCB_SITE.ry);
const modelFrameCs = Math.cos(SCB_BUILDING_HEADING), modelFrameSn = Math.sin(SCB_BUILDING_HEADING);
const roadTangentLength = Math.hypot(18, 5.2);
const roadWorldX = 18 / roadTangentLength, roadWorldZ = 5.2 / roadTangentLength;
const roadLocalX = roadWorldX * modelFrameCs - roadWorldZ * modelFrameSn;
const roadLocalZ = roadWorldX * modelFrameSn + roadWorldZ * modelFrameCs;
export const SCB_STAIR_ROAD_HEADING = Math.atan2(-roadLocalZ, roadLocalX);
export const SCB_FACADE_STAIR_ANGLE = Math.abs(SCB_STAIR_ROAD_HEADING);
const facingCos = Math.cos(SCB_FACADE_STAIR_ANGLE), facingSin = Math.sin(SCB_FACADE_STAIR_ANGLE);
export const SCB_STAIR_WIDTH = SCB_WIDTH * facingCos;
export const SCB_STAIR_TOP_WIDTH = SCB_ENTRANCE_DOOR_WIDTH * facingCos;
export const SCB_STAIR_TOP_CENTER_U = SCB_LEFT_ENTRANCE_X * facingCos;
export const SCB_STAIR_BOTTOM_RIGHT_U = -SCB_STAIR_WIDTH * 0.5;
export const SCB_STAIR_BOTTOM_LEFT_U = SCB_STAIR_WIDTH * 0.5;
export const SCB_STAIR_TOP_RIGHT_U = SCB_STAIR_TOP_CENTER_U - SCB_STAIR_TOP_WIDTH * 0.5;
export const SCB_STAIR_TOP_LEFT_U = SCB_STAIR_TOP_CENTER_U + SCB_STAIR_TOP_WIDTH * 0.5;
export const SCB_STAIR_DOOR_CLEARANCE = 1;
export const SCB_STAIR_TOP_LANDING_DEPTH = SCB_ENTRANCE_DOOR_WIDTH * facingSin
  + SCB_STAIR_DOOR_CLEARANCE + 0.25;

// Keep the established kerbside origin, but position the tower from the required left-door / top-tread relationship.
// This replaces the old connector-corner anchor, which produced a large flat triangle instead of triangular stairs.
const oldStairBottomZ = SCB_FRONT_Z - 7.2;
export const SCB_STAIR_BOTTOM_WORLD = Object.freeze({
  x: SCB_SITE.x + siteFrameSn * oldStairBottomZ,
  z: SCB_SITE.z + siteFrameCs * oldStairBottomZ
});
const doorCenterV = SCB_STAIR_RUN + SCB_ENTRANCE_DOOR_WIDTH * facingSin * 0.5 + SCB_STAIR_DOOR_CLEARANCE;
const leftDoorWorld = {
  x: SCB_STAIR_BOTTOM_WORLD.x + roadWorldX * SCB_STAIR_TOP_CENTER_U - roadWorldZ * doorCenterV,
  z: SCB_STAIR_BOTTOM_WORLD.z + roadWorldZ * SCB_STAIR_TOP_CENTER_U + roadWorldX * doorCenterV
};
export const SCB_MODEL_ORIGIN = Object.freeze({
  x: leftDoorWorld.x - modelFrameCs * SCB_LEFT_ENTRANCE_X - modelFrameSn * SCB_FRONT_Z,
  z: leftDoorWorld.z + modelFrameSn * SCB_LEFT_ENTRANCE_X - modelFrameCs * SCB_FRONT_Z
});
export const SCB_FRONT_CENTER = Object.freeze({
  x: SCB_MODEL_ORIGIN.x + modelFrameSn * SCB_FRONT_Z,
  z: SCB_MODEL_ORIGIN.z + modelFrameCs * SCB_FRONT_Z
});
export const SCB_MAP_SITE = Object.freeze({
  ...SCB_SITE,
  x: SCB_MODEL_ORIGIN.x,
  z: SCB_MODEL_ORIGIN.z,
  ry: SCB_BUILDING_HEADING
});
const stairBottomDX = SCB_STAIR_BOTTOM_WORLD.x - SCB_MODEL_ORIGIN.x;
const stairBottomDZ = SCB_STAIR_BOTTOM_WORLD.z - SCB_MODEL_ORIGIN.z;
export const SCB_STAIR_BOTTOM = Object.freeze({
  x: stairBottomDX * modelFrameCs - stairBottomDZ * modelFrameSn,
  z: stairBottomDX * modelFrameSn + stairBottomDZ * modelFrameCs
});

export function scbStairEdgesAt(t) {
  if (t === 0) return { right: SCB_STAIR_BOTTOM_RIGHT_U, left: SCB_STAIR_BOTTOM_LEFT_U };
  if (t === 1) return { right: SCB_STAIR_TOP_RIGHT_U, left: SCB_STAIR_TOP_LEFT_U };
  return {
    right: SCB_STAIR_BOTTOM_RIGHT_U + (SCB_STAIR_TOP_RIGHT_U - SCB_STAIR_BOTTOM_RIGHT_U) * t,
    left: SCB_STAIR_BOTTOM_LEFT_U + (SCB_STAIR_TOP_LEFT_U - SCB_STAIR_BOTTOM_LEFT_U) * t
  };
}

export function scbStairRoadToLocal(u, v) {
  const cs = Math.cos(SCB_STAIR_ROAD_HEADING), sn = Math.sin(SCB_STAIR_ROAD_HEADING);
  return {
    x: SCB_STAIR_BOTTOM.x + cs * u + sn * v,
    z: SCB_STAIR_BOTTOM.z - sn * u + cs * v
  };
}

export function scbStairLocalToRoad(x, z) {
  const cs = Math.cos(SCB_STAIR_ROAD_HEADING), sn = Math.sin(SCB_STAIR_ROAD_HEADING);
  const dx = x - SCB_STAIR_BOTTOM.x, dz = z - SCB_STAIR_BOTTOM.z;
  return { u: dx * cs - dz * sn, v: dx * sn + dz * cs };
}

export function scbLocalToWorld(x, z) {
  return {
    x: SCB_MODEL_ORIGIN.x + modelFrameCs * x + modelFrameSn * z,
    z: SCB_MODEL_ORIGIN.z - modelFrameSn * x + modelFrameCs * z
  };
}

export function scbWorldToLocal(x, z) {
  const dx = x - SCB_MODEL_ORIGIN.x, dz = z - SCB_MODEL_ORIGIN.z;
  return { x: dx * modelFrameCs - dz * modelFrameSn, z: dx * modelFrameSn + dz * modelFrameCs };
}

// The unrotated OSM frame remains available for validating the authored source ring; it is not the tower heading.
export function scbSiteWorldToLocal(x, z) {
  const dx = x - SCB_SITE.x, dz = z - SCB_SITE.z;
  return { x: dx * siteFrameCs - dz * siteFrameSn, z: dx * siteFrameSn + dz * siteFrameCs };
}

// Ground-height field for exactly the same tapering tread footprints and small left-door landing as the rendered
// meshes. There is no rectangular or triangular filler platform hidden outside those footprints.
export function scbEntranceGroundHeight(x, z, ground = 0) {
  const local = scbWorldToLocal(x, z);
  const road = scbStairLocalToRoad(local.x, local.z);
  let height = ground;
  if (road.v >= 0 && road.v < SCB_STAIR_RUN) {
    const step = Math.min(SCB_STAIR_COUNT - 1, Math.floor(road.v / SCB_STAIR_TREAD));
    const edges = scbStairEdgesAt(road.v / SCB_STAIR_RUN);
    if (road.u >= edges.right && road.u <= edges.left) height = Math.max(height, (step + 1) * SCB_STAIR_RISE);
  }
  if (road.v >= SCB_STAIR_RUN && road.v <= SCB_STAIR_RUN + SCB_STAIR_TOP_LANDING_DEPTH
    && road.u >= SCB_STAIR_TOP_RIGHT_U && road.u <= SCB_STAIR_TOP_LEFT_U) {
    height = Math.max(height, SCB_ENTRANCE_BASE_Y);
  }
  return height;
}

export function scbLocalCollider({ x, z, w, d, minY, maxY, heading = 0 }) {
  const centre = scbLocalToWorld(x, z);
  const cs = Math.cos(SCB_BUILDING_HEADING + heading), sn = Math.sin(SCB_BUILDING_HEADING + heading);
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
