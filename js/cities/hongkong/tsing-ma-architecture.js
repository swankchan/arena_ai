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
  const frame = sampleTsingMa(fraction), offset = (frame.halfDeck + 0.9) * side;
  return {
    x: frame.x + frame.normalX * offset,
    y: tsingMaCableHeight(fraction),
    z: frame.z + frame.normalZ * offset
  };
}
