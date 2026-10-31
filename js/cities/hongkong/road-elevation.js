import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { HK_TERRAIN, hongKongTerrainHeight } from './terrain.js';

export const ROAD_SURFACE_OFFSET = 0.025;
const tunnelData = HK_TERRAIN.tunnel;
const tunnelBytes = new Uint8Array(atob(tunnelData.heights).split('').map((character) => character.charCodeAt(0)));
const tunnelHeights = new Int16Array(tunnelBytes.buffer);
const tunnelWays = new Map();
let tunnelVertexCount = 0;

for (const [wayId, road] of HK_FULL_ROADS.roads.entries()) {
  if (!(road[4] & 4)) continue;
  const count = road[5].length / 2;
  tunnelWays.set(wayId, { offset: tunnelVertexCount, count });
  tunnelVertexCount += count;
}
if (tunnelVertexCount !== tunnelHeights.length || tunnelWays.size !== tunnelData.wayCount) {
  throw new Error('Hong Kong tunnel elevation data does not match the OSM road ways');
}

export function surfaceRoadHeight(x, z) {
  return hongKongTerrainHeight(x, z) + ROAD_SURFACE_OFFSET;
}

// segmentIndex is the zero-based pair of original OSM vertices. Surface and elevated ways sample the DTM directly;
// tunnel ways use the generated portal-connected profile stored in the same original vertex order.
export function roadHeightAtSegment(wayId, segmentIndex, t, x, z) {
  const tunnel = tunnelWays.get(wayId);
  if (!tunnel) return surfaceRoadHeight(x, z);
  const a = tunnelHeights[tunnel.offset + segmentIndex] / tunnelData.scale;
  const b = tunnelHeights[tunnel.offset + segmentIndex + 1] / tunnelData.scale;
  return a + (b - a) * t;
}

export function roadHeightAtVertex(wayId, vertexIndex, x, z) {
  const tunnel = tunnelWays.get(wayId);
  return tunnel ? tunnelHeights[tunnel.offset + vertexIndex] / tunnelData.scale : surfaceRoadHeight(x, z);
}

export function isTunnelRoad(wayOrId) {
  const wayId = typeof wayOrId === 'number' ? wayOrId : wayOrId?.id;
  return tunnelWays.has(wayId);
}

export const TERRAIN_TUNNEL_OPENING_RECTS = HK_TERRAIN.tunnel.openingRects;
