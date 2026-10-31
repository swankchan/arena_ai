import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';

// First-stage, drivable crossing profiles. Heights are deliberately procedural presentation levels, not surveyed
// engineering elevations. Every route is resampled before profiling so long two-node OSM ways still form real ramps.
export const CROSSING_BASE_HEIGHT = 0.025;
export const CROSSING_DEFINITIONS = Object.freeze([
  { id: 'cross-harbour', name: '海底隧道（紅磡）', kind: 'tunnel', level: -22, ramp: 260, routes: [[19157], [19159]] },
  { id: 'eastern-harbour', name: '東區海底隧道', kind: 'tunnel', level: -22, ramp: 280, routes: [[13375], [5964]] },
  { id: 'western-harbour', name: '西區海底隧道', kind: 'tunnel', level: -22, ramp: 280, routes: [[24471], [24472]] },
  { id: 'ting-kau', name: '汀九橋', kind: 'bridge', level: 28, ramp: 300, routes: [[23987, 5996, 23979, 23981, 23980], [23976, 23982, 23978, 23977, 9534, 24022, 24027, 24026]] },
  { id: 'tsing-ma', name: '青馬大橋', kind: 'bridge', level: 32, ramp: 340, routes: [[23961], [11841]] },
  { id: 'kap-shui-mun', name: '汲水門大橋', kind: 'bridge', level: 28, ramp: 300, routes: [[17446], [17447]] }
]);

function profileHeight(s, length, definition) {
  const edge = Math.min(s, length - s);
  const t = Math.max(0, Math.min(1, edge / definition.ramp));
  const smooth = t * t * (3 - 2 * t);
  return CROSSING_BASE_HEIGHT + (definition.level - CROSSING_BASE_HEIGHT) * smooth;
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
  const points = [];
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1], b = raw[i];
    const segmentLength = b.s - a.s;
    const steps = Math.max(1, Math.ceil(segmentLength / 20));
    for (let step = 0; step < steps; step++) {
      const t = step / steps, s = a.s + segmentLength * t;
      points.push({
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        y: profileHeight(s, length, definition),
        width: a.width,
        wayId: a.wayId,
        s
      });
    }
  }
  const last = raw[raw.length - 1];
  points.push({ x: last.x, z: last.z, y: CROSSING_BASE_HEIGHT, width: last.width, wayId: last.wayId, s: length });
  return {
    id: `${definition.id}:${direction}`,
    crossingId: definition.id,
    name: definition.name,
    kind: definition.kind,
    level: definition.level,
    direction,
    wayIds: [...wayIds],
    length,
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
