import { CROSSING_ROUTES } from './crossings.js';
import { sampleCrossingRoute } from './tsing-ma-architecture.js';
import { isTerritoryLand } from './full-meta.js';

export const CROSS_BAY_ID = 'cross-bay-link';
export const CROSS_BAY_ARCH = Object.freeze({
  center: 0.54, span: 200, rise: 40, lean: 4, ribThickness: 2.6, girderDepth: 5,
  hangersPerArch: 20, segments: 48
});
const WATER_BOTTOM = -3.2;
const LAND_BOTTOM = -0.08;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

function routes() {
  const pair = CROSSING_ROUTES.filter((route) => route.crossingId === CROSS_BAY_ID);
  if (pair.length !== 2) throw new Error('Cross Bay Link architecture requires both carriageways');
  return pair;
}

function surfaceSample(route, fraction) {
  const s = clamp01(fraction) * route.length;
  let i = 1;
  while (i < route.points.length - 1 && route.points[i].s < s) i++;
  const a = route.points[i - 1], b = route.points[i], t = (s - a.s) / Math.max(1e-9, b.s - a.s);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    width: Math.max(a.width, b.width),
    heading: Math.atan2(b.x - a.x, b.z - a.z)
  };
}

export function sampleCrossBayPair(fraction) {
  const pair = routes(), f = clamp01(fraction);
  const a = sampleCrossingRoute(pair[0], f), b = sampleCrossingRoute(pair[1], 1 - f);
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
    z: (a.z + b.z) * 0.5,
    heading: a.heading,
    normalX: Math.cos(a.heading),
    normalZ: -Math.sin(a.heading)
  };
}

export function crossBayOuterEdge(fraction, side, inset = 0) {
  const pair = routes(), f = clamp01(fraction), frame = sampleCrossBayPair(f), direction = side < 0 ? -1 : 1;
  const candidates = [surfaceSample(pair[0], f), surfaceSample(pair[1], 1 - f)];
  let selected = candidates[0], selectedSide = -Infinity;
  for (const candidate of candidates) {
    const signed = ((candidate.x - frame.x) * frame.normalX + (candidate.z - frame.z) * frame.normalZ) * direction;
    if (signed > selectedSide) { selected = candidate; selectedSide = signed; }
  }
  const nx = Math.cos(selected.heading), nz = -Math.sin(selected.heading);
  const outwardSign = (nx * frame.normalX + nz * frame.normalZ) * direction >= 0 ? 1 : -1;
  const outwardX = nx * outwardSign, outwardZ = nz * outwardSign;
  return {
    x: selected.x + outwardX * (selected.width * 0.5 - inset),
    y: selected.y,
    z: selected.z + outwardZ * (selected.width * 0.5 - inset),
    heading: selected.heading,
    outwardX,
    outwardZ,
    width: selected.width
  };
}

export function crossBayArchFractions() {
  const length = routes()[0].length, center = length * CROSS_BAY_ARCH.center;
  return [(center - CROSS_BAY_ARCH.span * 0.5) / length, (center + CROSS_BAY_ARCH.span * 0.5) / length];
}

function archPoint(side, t) {
  const [start, end] = crossBayArchFractions(), fraction = start + (end - start) * t;
  const edge = crossBayOuterEdge(fraction, side), shape = 4 * t * (1 - t);
  return {
    x: edge.x + edge.outwardX * CROSS_BAY_ARCH.lean * shape,
    y: edge.y + CROSS_BAY_ARCH.rise * shape,
    z: edge.z + edge.outwardZ * CROSS_BAY_ARCH.lean * shape,
    edge,
    fraction
  };
}

function baseElevation(x, z) {
  return isTerritoryLand(x, z) ? LAND_BOTTOM : WATER_BOTTOM;
}

function buildPiers(archStart, archEnd) {
  const length = routes()[0].length, stations = [archStart * length, archEnd * length];
  for (let s = 140; s < length - 120; s += 140) {
    const fraction = s / length, frame = sampleCrossBayPair(fraction);
    if (frame.y < 8 || (fraction > archStart - 0.02 && fraction < archEnd + 0.02)) continue;
    stations.push(s);
  }
  stations.sort((a, b) => a - b);
  return stations.map((s) => {
    const fraction = s / length, frame = sampleCrossBayPair(fraction);
    const main = fraction >= archStart - 1e-6 && fraction <= archEnd + 1e-6;
    const before = sampleCrossBayPair((s - 10) / length), after = sampleCrossBayPair((s + 10) / length);
    const bottom = baseElevation(frame.x, frame.z), topY = frame.y - (main ? 3 : 0.85);
    const left = crossBayOuterEdge(fraction, -1), right = crossBayOuterEdge(fraction, 1);
    return {
      bottom,
      legs: [
        { a: { x: frame.x, y: bottom + 1.1, z: frame.z }, b: { x: before.x, y: topY, z: before.z } },
        { a: { x: frame.x, y: bottom + 1.1, z: frame.z }, b: { x: after.x, y: topY, z: after.z } }
      ],
      crossbeam: {
        a: { x: left.x, y: topY, z: left.z },
        b: { x: right.x, y: topY, z: right.z }
      },
      footing: { x: frame.x, y: bottom + 1, z: frame.z, heading: frame.heading, sx: 22, sy: 2, sz: 12 },
      main
    };
  });
}

function buildLamps() {
  const length = routes()[0].length, lamps = [];
  for (let s = 17.5; s < length; s += 35) {
    for (const side of [-1, 1]) {
      const base = crossBayOuterEdge(s / length, side, 0.22);
      lamps.push({
        base,
        arm: { x: base.x - base.outwardX * 0.7, y: base.y + 4.92, z: base.z - base.outwardZ * 0.7, heading: base.heading },
        light: { x: base.x - base.outwardX * 1.35, y: base.y + 4.78, z: base.z - base.outwardZ * 1.35, heading: base.heading }
      });
    }
  }
  return lamps;
}

export function isCrossBayMainSpan(crossingId, fraction) {
  if (crossingId !== CROSS_BAY_ID) return false;
  const [start, end] = crossBayArchFractions();
  return fraction >= start && fraction <= end;
}

export function buildCrossBayPlan() {
  const arches = [], hangers = [];
  for (const side of [-1, 1]) {
    const segments = [];
    for (let i = 0; i < CROSS_BAY_ARCH.segments; i++) {
      const a = archPoint(side, i / CROSS_BAY_ARCH.segments), b = archPoint(side, (i + 1) / CROSS_BAY_ARCH.segments);
      segments.push({ a, b });
    }
    arches.push({ side, segments });
    for (let i = 1; i <= CROSS_BAY_ARCH.hangersPerArch; i++) {
      const top = archPoint(side, i / (CROSS_BAY_ARCH.hangersPerArch + 1));
      hangers.push({ a: top, b: { x: top.edge.x, y: top.edge.y + 0.35, z: top.edge.z }, side });
    }
  }

  const [archStart, archEnd] = crossBayArchFractions(), edgeGirders = [], crossFrames = [], bottomPanels = [];
  const deckStations = 20;
  for (let i = 0; i <= deckStations; i++) {
    const fraction = archStart + (archEnd - archStart) * i / deckStations;
    const left = crossBayOuterEdge(fraction, -1), right = crossBayOuterEdge(fraction, 1);
    left.lowerY = left.y - CROSS_BAY_ARCH.girderDepth;
    right.lowerY = right.y - CROSS_BAY_ARCH.girderDepth;
    crossFrames.push({
      a: { x: left.x, y: left.y - CROSS_BAY_ARCH.girderDepth * 0.5, z: left.z },
      b: { x: right.x, y: right.y - CROSS_BAY_ARCH.girderDepth * 0.5, z: right.z }
    });
    bottomPanels.push({ left, right });
    if (i === 0) continue;
    for (const [side, previousSide] of [[left, bottomPanels[i - 1].left], [right, bottomPanels[i - 1].right]]) {
      edgeGirders.push({
        a: { x: previousSide.x, y: previousSide.y - CROSS_BAY_ARCH.girderDepth * 0.5, z: previousSide.z },
        b: { x: side.x, y: side.y - CROSS_BAY_ARCH.girderDepth * 0.5, z: side.z }
      });
    }
  }

  const piers = buildPiers(archStart, archEnd), lamps = buildLamps();
  return {
    id: CROSS_BAY_ID, arches, hangers, piers, lamps, edgeGirders, crossFrames, bottomPanels,
    stats: {
      crossBayArches: arches.length,
      crossBayHangers: hangers.length,
      crossBayVPiers: piers.length,
      crossBayLamps: lamps.length
    }
  };
}
