import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { surfaceRoadHeight } from './road-elevation.js';

// First-stage, drivable crossing profiles. Heights are deliberately procedural presentation levels, not surveyed
// engineering elevations. Every route is resampled before profiling so long two-node OSM ways still form real ramps.
export const CROSSING_BASE_HEIGHT = 0.025;
export const CROSSING_DEFINITIONS = Object.freeze([
  { id: 'cross-harbour', name: '海底隧道（紅磡）', kind: 'tunnel', level: -22, ramp: 260, routes: [[19157], [19159]] },
  { id: 'eastern-harbour', name: '東區海底隧道', kind: 'tunnel', level: -22, ramp: 280, routes: [[13375], [5964]] },
  { id: 'western-harbour', name: '西區海底隧道', kind: 'tunnel', level: -22, ramp: 280, curveAmplitude: 42, routes: [[24471], [24472]] },
  { id: 'ting-kau', name: '汀九橋', kind: 'bridge', level: 28, ramp: 300, routes: [[23987, 5996, 23979, 23981, 23980], [23976, 23982, 23978, 23977, 9534, 24022, 24027, 24026]] },
  { id: 'tsing-ma', name: '青馬大橋', kind: 'bridge', level: 32, ramp: 340, routes: [[23961], [11841]] },
  { id: 'kap-shui-mun', name: '汲水門大橋', kind: 'bridge', level: 28, ramp: 300, routes: [[17446], [17447]] },
  {
    id: 'cross-bay-link', name: '將藍公路（跨灣大橋）', kind: 'bridge', level: 20, ramp: 220,
    routes: [
      [22715, 22712, 12470, 22809, 22810, 22807, 22811, 22813, 22812, 12485, 12492, 12493, 22548, 22821, 22545, 12495, 12508, 22562],
      [22561, 12471, 12509, 22546, 22822, 22547, 22820, 12496, 22819, 12491, 12490, 22806, 22805, 17039, 12484, 22713, 22714]
    ]
  }
]);

function profileHeight(s, length, definition, startHeight, endHeight, ramp) {
  const edge = Math.min(s, length - s);
  const t = Math.max(0, Math.min(1, edge / ramp));
  const smooth = t * t * (3 - 2 * t);
  const endpointHeight = s <= length * 0.5 ? startHeight : endHeight;
  return endpointHeight + (definition.level - endpointHeight) * smooth;
}

function curveOffset(definition, s, length, ramp) {
  if (!definition.curveAmplitude) return 0;
  // A smooth S lives wholly inside the deep submerged section. Portals and their road openings keep the OSM positions.
  const start = ramp, end = length - ramp;
  if (s <= start || s >= end) return 0;
  const u = (s - start) / (end - start);
  return definition.curveAmplitude * Math.sin(Math.PI * 2 * u) * Math.sin(Math.PI * u);
}

function rawRoute(definition, wayIds) {
  const points = [];
  for (const wayId of wayIds) {
    const way = HK_FULL_ROADS.roads[wayId];
    if (!way) throw new Error(`Missing OSM way ${wayId} for ${definition.name}`);
    const flat = way[5];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const point = { x: flat[i], z: flat[i + 1], width: way[1], wayId, s: 0 };
      const previous = points[points.length - 1];
      if (previous) {
        const gap = Math.hypot(point.x - previous.x, point.z - previous.z);
        if (i === 0 && gap > 2) throw new Error(`Disconnected ${definition.name} way ${wayId}: ${gap.toFixed(2)} m`);
        if (gap < 0.05) {
          previous.width = point.width;
          previous.wayId = wayId;
          continue;
        }
        point.s = previous.s + gap;
      }
      points.push(point);
    }
  }
  return points;
}

function buildRoute(definition, wayIds, direction) {
  const raw = rawRoute(definition, wayIds);
  const length = raw[raw.length - 1]?.s || 0;
  if (length < 100) throw new Error(`Crossing route too short: ${definition.name}`);
  const startHeight = surfaceRoadHeight(raw[0].x, raw[0].z);
  const endHeight = surfaceRoadHeight(raw[raw.length - 1].x, raw[raw.length - 1].z);
  // Smoothstep's greatest grade is 1.5 * height difference / ramp. Allow up to roughly
  // 2.5 m per 20 m sample on high DTM approaches instead of introducing a sudden vertical jump.
  const heightDifference = Math.max(Math.abs(definition.level - startHeight), Math.abs(definition.level - endHeight));
  const ramp = Math.min(length * 0.45, Math.max(definition.ramp, heightDifference * 12));
  let curveFrame = null;
  if (definition.curveAmplitude) {
    // Both carriageways use one world-space reference axis. At a given station they receive exactly the same displacement,
    // so the two tubes bend together instead of driving their walls through one another.
    const reference = rawRoute(definition, definition.routes[0]);
    const first = reference[0], last = reference[reference.length - 1];
    const dx = last.x - first.x, dz = last.z - first.z, referenceLength = Math.hypot(dx, dz);
    curveFrame = { x: first.x, z: first.z, ux: dx / referenceLength, uz: dz / referenceLength, length: referenceLength };
  }
  const points = [];
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1], b = raw[i];
    const segmentLength = b.s - a.s;
    const steps = Math.max(1, Math.ceil(segmentLength / 20));
    for (let step = 0; step < steps; step++) {
      const t = step / steps, s = a.s + segmentLength * t;
      const rawX = a.x + (b.x - a.x) * t, rawZ = a.z + (b.z - a.z) * t;
      const station = curveFrame ? (rawX - curveFrame.x) * curveFrame.ux + (rawZ - curveFrame.z) * curveFrame.uz : 0;
      const offset = curveFrame ? curveOffset(definition, station, curveFrame.length, ramp) : 0;
      points.push({
        x: rawX + (curveFrame?.uz || 0) * offset,
        z: rawZ - (curveFrame?.ux || 0) * offset,
        y: profileHeight(s, length, definition, startHeight, endHeight, ramp),
        width: a.width,
        wayId: a.wayId,
        s
      });
    }
  }
  const last = raw[raw.length - 1];
  points.push({ x: last.x, z: last.z, y: endHeight, width: last.width, wayId: last.wayId, s: length });
  // Store true arc length after bending so following, lighting and end-of-route checks use the same geometry.
  let curvedLength = 0;
  for (let i = 1; i < points.length; i++) {
    curvedLength += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    points[i].s = curvedLength;
  }
  return {
    id: `${definition.id}:${direction}`,
    crossingId: definition.id,
    name: definition.name,
    kind: definition.kind,
    level: definition.level,
    ramp,
    startHeight,
    endHeight,
    heightSource: 'DTM-connected portals; existing procedural main-span / submerged level retained',
    direction,
    wayIds: [...wayIds],
    length: curvedLength,
    points
  };
}

export const CROSSING_ROUTES = Object.freeze(CROSSING_DEFINITIONS.flatMap((definition) =>
  definition.routes.map((wayIds, direction) => buildRoute(definition, wayIds, direction))
));
export const CROSSING_WAY_IDS = new Set(CROSSING_ROUTES.flatMap((route) => route.wayIds));
// The Lantau Link lower-deck/service carriageways overlap the modelled upper decks. They are not extra routes in this
// first phase, but must not remain as flat ribbons across the sea beside the two bridges.
export const CROSSING_FLAT_EXCLUSION_IDS = new Set([...CROSSING_WAY_IDS, 32210, 32211, 35268, 35269]);

const CELL = 100;
const cells = new Map();
const segments = [];
for (const route of CROSSING_ROUTES) {
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i];
    const segment = { a, b, route, width: Math.max(a.width, b.width) };
    const index = segments.length;
    segments.push(segment);
    const margin = segment.width * 0.5 + 8;
    for (let x = Math.floor((Math.min(a.x, b.x) - margin) / CELL); x <= Math.floor((Math.max(a.x, b.x) + margin) / CELL); x++) {
      for (let z = Math.floor((Math.min(a.z, b.z) - margin) / CELL); z <= Math.floor((Math.max(a.z, b.z) + margin) / CELL); z++) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(index);
      }
    }
  }
}

export function crossingSurfaceAt(x, z, margin = 0.35) {
  const candidates = cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) || [];
  let best = null;
  for (const index of candidates) {
    const segment = segments[index];
    const { a, b, route, width } = segment;
    const dx = b.x - a.x, dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq)) : 0;
    const px = a.x + dx * t, pz = a.z + dz * t;
    const distance = Math.hypot(x - px, z - pz);
    if (distance > width * 0.5 + margin || (best && distance >= best.distance)) continue;
    best = {
      x: px, z: pz, height: a.y + (b.y - a.y) * t, distance, width,
      kind: route.kind, crossingId: route.crossingId, routeId: route.id, name: route.name,
      heading: Math.atan2(dx, dz), route
    };
  }
  return best;
}

// Capture a ramp when the entity is at its current level, without pulling surface traffic into a deep tunnel or
// dropping cars from a high bridge. Water has no alternative driving surface, so its crossing always wins.
export function selectCrossingGround(baseHeight, hit, referenceY = 0, waterLevel = -2.2) {
  if (!hit) return baseHeight;
  if (baseHeight <= waterLevel + 0.001) return hit.height;
  if (hit.kind === 'bridge' && referenceY >= hit.height - 1.1) return hit.height;
  if (hit.kind === 'tunnel' && referenceY <= hit.height + 1.1) return hit.height;
  return baseHeight;
}
