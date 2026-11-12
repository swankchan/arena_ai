// Shared carriageway probe for the rebuilt grandstands.
// The Grandstand footprint overlaps 黃泥涌道 because that carriageway is stored as a
// two-point chord across a curve; the road is real, so the stands give way to it rather
// than the other way round. Same convention as the racecourse perimeter, which already
// leaves gaps where a road crosses the venue boundary.
import * as THREE from 'three/webgpu';
import { fullRoadWaysNear } from './full-meta.js';
import { roadRibbonHeightAtSegment } from './road-elevation.js';
import { HONG_KONG_TERRAIN_META as meta } from './terrain.js';

export const STAND_ROAD_MARGIN = 1.0;
// The carriageway beside the stands follows the hillside and rises a few metres above the racecourse datum; a fixed
// tolerance around that datum therefore stops recognising the street at all. Same-level means "the street surface this
// player drives on", excluding tunnels and flyovers, with a generous allowance for that natural rise.
export const SAME_LEVEL_ROAD_TOLERANCE = 6;

// True when (x, z) lies over a carriageway a player actually drives, i.e. a surface
// street rather than a tunnel far below the stand or a flyover above it.
export function standOverSameLevelRoad(x, z, margin = STAND_ROAD_MARGIN) {
  for (const way of fullRoadWaysNear(x, z, 12)) {
    for (let k = 2; k < way.flat.length; k += 2) {
      const ax = way.flat[k - 2], az = way.flat[k - 1];
      const vx = way.flat[k] - ax, vz = way.flat[k + 1] - az;
      const length = vx * vx + vz * vz;
      if (length < 0.0025) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / length));
      const px = ax + t * vx, pz = az + t * vz;
      if (Math.hypot(x - px, z - pz) > way.width / 2 + margin) continue;
      const height = roadRibbonHeightAtSegment(way.id, k / 2 - 1, t, px, pz);
      if (way.flags & 6) continue;
      if (Math.abs(height - meta.happyValleyPadHeight) < SAME_LEVEL_ROAD_TOLERANCE) return true;
    }
  }
  return false;
}

// Split a footprint edge into the sub-ranges that stay clear of same-level carriageways.
// `insets` is every lateral offset the stand actually builds inwards from this edge, so a
// balcony or terrace that overhangs the kerb is caught as well as the wall line itself.
// Returns [t0, t1] pairs in edge parameter space; an empty list means the whole edge is
// over a road and receives neither wall nor collider.
export function clearEdgeRanges(at, insets = [0], step = 0.01) {
  const offsets = [...new Set(insets.length ? insets : [0])];
  const ranges = [];
  let start = null;
  for (let t = 0; t <= 1 + 1e-9; t = Math.min(1, t + step)) {
    const clear = offsets.every((inset) => {
      const [x, , z] = at(t, 0, inset);
      return !standOverSameLevelRoad(x, z);
    });
    if (clear && start === null) start = t;
    if (!clear && start !== null) { ranges.push([start, t]); start = null; }
    if (t === 1) break;
  }
  if (start !== null) ranges.push([start, 1]);
  return ranges;
}

// Final geometry keep-out. Operates on finished world-space vertices, so it cannot be
// defeated by local/world coordinate mix-ups: any triangle that lands on a same-level
// carriageway is dropped, leaving the same kind of opening the racecourse perimeter uses.
// Returns how many triangles were removed for reporting.
export function clipTrianglesOverRoads(root) {
  let removed = 0;
  // Update from the topmost ancestor: the stand is already parented to the venue group, and
  // updating only the stand would leave the venue transform out of matrixWorld.
  let top = root;
  while (top.parent) top = top.parent;
  top.updateMatrixWorld(true);
  const vertex = new THREE.Vector3();
  root.traverse((object) => {
    if (!object.isMesh || !object.geometry?.attributes?.position) return;
    const position = object.geometry.attributes.position;
    const color = object.geometry.attributes.color;
    const lit = object.geometry.attributes.aLit;
    const keepPositions = [], keepColors = [], keepLit = [];
    const overRoad = (index) => {
      vertex.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
      return standOverSameLevelRoad(vertex.x, vertex.z);
    };
    for (let i = 0; i + 2 < position.count; i += 3) {
      // Conservative: a triangle touching a carriageway at any corner is removed.
      if (overRoad(i) || overRoad(i + 1) || overRoad(i + 2)) { removed++; continue; }
      for (let k = 0; k < 3; k++) {
        const n = i + k;
        keepPositions.push(position.getX(n), position.getY(n), position.getZ(n));
        if (color) keepColors.push(color.getX(n), color.getY(n), color.getZ(n));
        if (lit) keepLit.push(lit.getX(n));
      }
    }
    if (keepPositions.length === position.count * 3) return;
    const rebuilt = new THREE.BufferGeometry();
    rebuilt.setAttribute('position', new THREE.Float32BufferAttribute(keepPositions, 3));
    if (color) rebuilt.setAttribute('color', new THREE.Float32BufferAttribute(keepColors, 3));
    if (lit) rebuilt.setAttribute('aLit', new THREE.Float32BufferAttribute(keepLit, 1));
    rebuilt.computeVertexNormals();
    object.geometry.dispose();
    object.geometry = rebuilt;
  });
  return removed;
}

// Drop whole colliders whose footprint still overlaps a same-level carriageway.
// Used after the wall-level ranges, because a collider spans a segment's full length and
// can still reach the kerb where the wall itself already stopped short.
export function dropCollidersOverRoads(colliders) {
  const kept = [];
  let removed = 0;
  for (const collider of colliders) {
    if (collider.minX === undefined || collider.maxX === undefined) { kept.push(collider); continue; }
    let hit = false;
    for (let x = collider.minX; x <= collider.maxX && !hit; x += 0.4) {
      for (let z = collider.minZ; z <= collider.maxZ; z += 0.4) {
        if (standOverSameLevelRoad(x, z)) { hit = true; break; }
      }
    }
    // Sampling can miss a thin overlap; also test the four corners and centre.
    if (!hit) {
      const cx = (collider.minX + collider.maxX) / 2, cz = (collider.minZ + collider.maxZ) / 2;
      hit = standOverSameLevelRoad(cx, cz)
        || standOverSameLevelRoad(collider.minX, collider.minZ)
        || standOverSameLevelRoad(collider.maxX, collider.minZ)
        || standOverSameLevelRoad(collider.minX, collider.maxZ)
        || standOverSameLevelRoad(collider.maxX, collider.maxZ);
    }
    if (hit) removed++; else kept.push(collider);
  }
  return { colliders: kept, removed };
}
