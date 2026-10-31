import { CROSSING_ROUTES } from './crossings.js';

const routes = CROSSING_ROUTES.filter((route) => route.crossingId === 'tsing-ma');
if (routes.length !== 2) throw new Error('Tsing Ma architecture requires both carriageway routes');

// Presentation geometry follows the two OSM carriageways. Tower height and cable sag are procedural visual proportions,
// not surveyed structural dimensions; the already-tested driving profile remains unchanged.
export const TSING_MA_TOWER_FRACTIONS = Object.freeze([0.22, 0.82]);
export const TSING_MA_TOWER_RISE = 82;

export function sampleCrossingRoute(route, fraction) {
  const s = Math.max(0, Math.min(route.length, route.length * fraction));
  let i = 1;
  while (i < route.points.length - 1 && route.points[i].s < s) i++;
  const a = route.points[i - 1], b = route.points[i];
  const t = (s - a.s) / Math.max(1e-9, b.s - a.s);
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    y: a.y + (b.y - a.y) * t,
    width: a.width + (b.width - a.width) * t,
    heading: Math.atan2(b.x - a.x, b.z - a.z),
    s
  };
}

export function sampleTsingMa(fraction) {
  const a = sampleCrossingRoute(routes[0], fraction);
  const b = sampleCrossingRoute(routes[1], 1 - fraction);
  const separation = Math.hypot(a.x - b.x, a.z - b.z);
  const halfDeck = separation * 0.5 + Math.max(a.width, b.width) * 0.5;
  return {
    x: (a.x + b.x) * 0.5,
    z: (a.z + b.z) * 0.5,
    y: (a.y + b.y) * 0.5,
    heading: a.heading,
    normalX: Math.cos(a.heading),
    normalZ: -Math.sin(a.heading),
    separation,
    halfDeck
  };
}

export const TSING_MA_LAMP_EDGE_INSET = 0.22;

// Resolve the actual outer edge of whichever directional carriageway is on the requested side. Using the combined
// deck's approximate width here used to leave the cables and lamps hovering beyond the real road geometry.
export function tsingMaDeckEdgePoint(fraction, side) {
  const frame = sampleTsingMa(fraction), direction = side < 0 ? -1 : 1;
  const candidates = [sampleCrossingRoute(routes[0], fraction), sampleCrossingRoute(routes[1], 1 - fraction)];
  let selected = candidates[0], selectedSide = -Infinity;
  for (const candidate of candidates) {
    const signed = ((candidate.x - frame.x) * frame.normalX + (candidate.z - frame.z) * frame.normalZ) * direction;
    if (signed > selectedSide) { selected = candidate; selectedSide = signed; }
  }
  const nx = Math.cos(selected.heading), nz = -Math.sin(selected.heading);
  const outwardSign = (nx * frame.normalX + nz * frame.normalZ) * direction >= 0 ? 1 : -1;
  const outwardX = nx * outwardSign, outwardZ = nz * outwardSign;
  return {
    x: selected.x + outwardX * selected.width * 0.5,
    y: selected.y,
    z: selected.z + outwardZ * selected.width * 0.5,
    heading: selected.heading,
    outwardX,
    outwardZ
  };
}

export function tsingMaLampBasePoint(fraction, side) {
  const edge = tsingMaDeckEdgePoint(fraction, side);
  return {
    ...edge,
    x: edge.x - edge.outwardX * TSING_MA_LAMP_EDGE_INSET,
    z: edge.z - edge.outwardZ * TSING_MA_LAMP_EDGE_INSET
  };
}

export const TSING_MA_TOWERS = Object.freeze(TSING_MA_TOWER_FRACTIONS.map((fraction) => {
  const frame = sampleTsingMa(fraction);
  return Object.freeze({ fraction, frame, topY: frame.y + TSING_MA_TOWER_RISE });
}));

const cableSpans = [
  { from: 0, to: TSING_MA_TOWERS[0].fraction, y0: sampleTsingMa(0).y + 5, y1: TSING_MA_TOWERS[0].topY, sag: 8 },
  {
    from: TSING_MA_TOWERS[0].fraction, to: TSING_MA_TOWERS[1].fraction,
    y0: TSING_MA_TOWERS[0].topY, y1: TSING_MA_TOWERS[1].topY,
    sag: (TSING_MA_TOWERS[0].topY + TSING_MA_TOWERS[1].topY) * 0.5 - (sampleTsingMa(0.52).y + 14)
  },
  { from: TSING_MA_TOWERS[1].fraction, to: 1, y0: TSING_MA_TOWERS[1].topY, y1: sampleTsingMa(1).y + 5, sag: 8 }
];

export function tsingMaCableHeight(fraction) {
  const f = Math.max(0, Math.min(1, fraction));
  const span = cableSpans.find((candidate) => f >= candidate.from && f <= candidate.to) || cableSpans.at(-1);
  const t = (f - span.from) / Math.max(1e-9, span.to - span.from);
  return span.y0 + (span.y1 - span.y0) * t - span.sag * 4 * t * (1 - t);
}

export function tsingMaCablePoint(fraction, side) {
  const edge = tsingMaDeckEdgePoint(fraction, side);
  return { x: edge.x, y: tsingMaCableHeight(fraction), z: edge.z };
}
