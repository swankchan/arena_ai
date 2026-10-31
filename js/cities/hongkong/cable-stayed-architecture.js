import { CROSSING_ROUTES } from './crossings.js';
import { sampleCrossingRoute } from './tsing-ma-architecture.js';
import { isTerritoryLand } from './full-meta.js';

const WATER_BOTTOM = -3.2;
const LAND_BOTTOM = -0.08;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

// Dimensions come from the published structural descriptions; OSM supplies the drivable alignment. Heights remain
// presentation geometry and do not alter the already-tested road profile.
export const CABLE_STAYED_DEFINITIONS = Object.freeze({
  'ting-kau': Object.freeze({
    towers: Object.freeze([
      Object.freeze({ fraction: 0.13, height: 170 }),
      Object.freeze({ fraction: 0.52, height: 194 }),
      Object.freeze({ fraction: 0.89, height: 158 })
    ]),
    clearSpan: Object.freeze([0.13, 0.89]), fanCables: 16, fanReach: 216
  }),
  'kap-shui-mun': Object.freeze({
    towers: Object.freeze([
      Object.freeze({ fraction: 0.21, height: 150 }),
      Object.freeze({ fraction: 0.79, height: 150 })
    ]),
    clearSpan: Object.freeze([0.21, 0.79]), fanCables: 22, mainSpacing: 8.7, sideSpacing: 6.1
  })
});

function routesFor(crossingId) {
  const routes = CROSSING_ROUTES.filter((route) => route.crossingId === crossingId);
  if (routes.length !== 2) throw new Error(`${crossingId} architecture requires both carriageways`);
  return routes;
}

function sampleSurfaceRoute(route, fraction) {
  const s = Math.max(0, Math.min(route.length, route.length * clamp01(fraction)));
  let i = 1;
  while (i < route.points.length - 1 && route.points[i].s < s) i++;
  const a = route.points[i - 1], b = route.points[i], t = (s - a.s) / Math.max(1e-9, b.s - a.s);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    // The road quad and spatial query both use the wider end for the whole segment.
    width: Math.max(a.width, b.width),
    heading: Math.atan2(b.x - a.x, b.z - a.z)
  };
}

export function sampleCableStayedPair(crossingId, fraction) {
  const routes = routesFor(crossingId), f = clamp01(fraction);
  const a = sampleCrossingRoute(routes[0], f), b = sampleCrossingRoute(routes[1], 1 - f);
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
    z: (a.z + b.z) * 0.5,
    heading: a.heading,
    normalX: Math.cos(a.heading),
    normalZ: -Math.sin(a.heading),
    separation: Math.hypot(a.x - b.x, a.z - b.z)
  };
}

function edgeFromSample(sample, side, inset = 0) {
  const nx = Math.cos(sample.heading), nz = -Math.sin(sample.heading);
  return {
    x: sample.x + nx * side * (sample.width * 0.5 - inset),
    y: sample.y,
    z: sample.z + nz * side * (sample.width * 0.5 - inset),
    heading: sample.heading,
    width: sample.width
  };
}

export function cableStayedRouteEdge(crossingId, routeIndex, fraction, side, inset = 0) {
  const route = routesFor(crossingId)[routeIndex];
  const routeFraction = clamp01(routeIndex === 0 ? fraction : 1 - fraction);
  return edgeFromSample(sampleSurfaceRoute(route, routeFraction), side, inset);
}

export function cableStayedOuterEdge(crossingId, fraction, side, inset = 0) {
  const routes = routesFor(crossingId), f = clamp01(fraction), frame = sampleCableStayedPair(crossingId, f);
  const direction = side < 0 ? -1 : 1;
  const candidates = [sampleSurfaceRoute(routes[0], f), sampleSurfaceRoute(routes[1], 1 - f)];
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

function routeEdgeAtDistance(route, fraction, direction, distance, side) {
  const s = Math.max(0, Math.min(route.length, fraction * route.length + direction * distance));
  return edgeFromSample(sampleSurfaceRoute(route, s / route.length), side);
}

function innerEdge(crossingId, routeIndex, fraction) {
  const routes = routesFor(crossingId), route = routes[routeIndex];
  const routeFraction = clamp01(routeIndex === 0 ? fraction : 1 - fraction);
  const sample = sampleSurfaceRoute(route, routeFraction), frame = sampleCableStayedPair(crossingId, fraction);
  const nx = Math.cos(sample.heading), nz = -Math.sin(sample.heading);
  const side = (frame.x - sample.x) * nx + (frame.z - sample.z) * nz >= 0 ? 1 : -1;
  return edgeFromSample(sample, side);
}

function baseElevation(x, z) {
  return isTerritoryLand(x, z) ? LAND_BOTTOM : WATER_BOTTOM;
}

function buildLamps(crossingId, spacing = 30) {
  const length = routesFor(crossingId)[0].length, lamps = [];
  for (let s = spacing * 0.5; s < length; s += spacing) {
    for (const side of [-1, 1]) {
      const base = cableStayedOuterEdge(crossingId, s / length, side, 0.22);
      lamps.push({
        base,
        arm: { x: base.x - base.outwardX * 0.7, y: base.y + 4.92, z: base.z - base.outwardZ * 0.7, heading: base.heading },
        light: { x: base.x - base.outwardX * 1.35, y: base.y + 4.78, z: base.z - base.outwardZ * 1.35, heading: base.heading }
      });
    }
  }
  return lamps;
}

function buildEdgeGirders(crossingId) {
  const girders = [];
  for (const [routeIndex, route] of routesFor(crossingId).entries()) {
    for (let i = 1; i < route.points.length; i++) {
      const width = Math.max(route.points[i - 1].width, route.points[i].width);
      for (const side of [-1, 1]) {
        const a = edgeFromSample({ ...route.points[i - 1], width }, side);
        const b = edgeFromSample({ ...route.points[i], width }, side);
        a.y -= 0.68; b.y -= 0.68;
        girders.push({ a, b, routeIndex, side });
      }
    }
  }
  return girders;
}

function buildTingKau() {
  const crossingId = 'ting-kau', definition = CABLE_STAYED_DEFINITIONS[crossingId], routes = routesFor(crossingId);
  const towers = definition.towers.map((entry, index) => {
    const frame = sampleCableStayedPair(crossingId, entry.fraction), bottom = baseElevation(frame.x, frame.z);
    return { ...entry, index, kind: 'single', frame, bottom, topY: bottom + entry.height };
  });
  const stays = [];
  for (const tower of towers) {
    for (let routeIndex = 0; routeIndex < 2; routeIndex++) {
      const route = routes[routeIndex], routeFraction = routeIndex === 0 ? tower.fraction : 1 - tower.fraction;
      const towerStations = definition.towers.map((entry) => routeIndex === 0 ? entry.fraction : 1 - entry.fraction);
      for (const edgeSign of [-1, 1]) {
        for (const direction of [-1, 1]) {
          const neighbours = towerStations.filter((station) => direction > 0 ? station > routeFraction : station < routeFraction);
          const target = direction > 0 ? Math.min(1, ...neighbours) : Math.max(0, ...neighbours);
          const available = Math.abs(target - routeFraction) * route.length;
          const reach = Math.max(30, Math.min(definition.fanReach, available - 4));
          for (let i = 0; i < definition.fanCables; i++) {
            const anchor = routeEdgeAtDistance(route, routeFraction, direction, reach * (i + 1) / definition.fanCables, edgeSign);
            stays.push({
              a: { x: tower.frame.x, y: tower.topY - i * 0.28, z: tower.frame.z },
              b: { x: anchor.x, y: anchor.y + 0.42, z: anchor.z },
              towerIndex: tower.index, routeIndex, edgeSign
            });
          }
        }
      }
    }
  }

  const longitudinalStabilizers = [], central = towers[1];
  for (const tower of [towers[0], towers[2]]) {
    for (let routeIndex = 0; routeIndex < 2; routeIndex++) {
      for (const edgeSign of [-1, 1]) {
        const anchor = cableStayedRouteEdge(crossingId, routeIndex, tower.fraction, edgeSign);
        longitudinalStabilizers.push({
          a: { x: central.frame.x, y: central.topY - 3, z: central.frame.z },
          b: { x: anchor.x, y: anchor.y + 0.65, z: anchor.z }
        });
      }
    }
  }
  const transverseStabilizers = [];
  for (const tower of towers) {
    for (const side of [-1, 1]) {
      for (const delta of [-0.018, 0.018]) {
        const anchor = cableStayedOuterEdge(crossingId, tower.fraction + delta, side);
        transverseStabilizers.push({
          a: { x: tower.frame.x, y: tower.frame.y + (tower.topY - tower.frame.y) * 0.42, z: tower.frame.z },
          b: { x: anchor.x, y: anchor.y + 0.6, z: anchor.z }
        });
      }
    }
  }

  const crossGirders = [], length = routes[0].length;
  for (let s = 0; s <= length; s += 13.5) {
    const fraction = s / length, a = innerEdge(crossingId, 0, fraction), b = innerEdge(crossingId, 1, fraction);
    a.y -= 1.05; b.y -= 1.05;
    crossGirders.push({ a, b });
  }
  const lamps = buildLamps(crossingId), edgeGirders = buildEdgeGirders(crossingId);
  return {
    id: crossingId, towers, stays, longitudinalStabilizers, transverseStabilizers, crossGirders, lamps, edgeGirders,
    stats: {
      tingKauTowers: towers.length,
      tingKauStayCables: stays.length,
      tingKauLongitudinalStabilizers: longitudinalStabilizers.length,
      tingKauTransverseStabilizers: transverseStabilizers.length,
      tingKauCrossGirders: crossGirders.length,
      tingKauLamps: lamps.length
    }
  };
}

function legPointAtY(leg, y) {
  const segment = y <= leg.mid.y ? [leg.base, leg.mid] : [leg.mid, leg.top];
  const t = Math.max(0, Math.min(1, (y - segment[0].y) / Math.max(1e-9, segment[1].y - segment[0].y)));
  return {
    x: segment[0].x + (segment[1].x - segment[0].x) * t,
    y,
    z: segment[0].z + (segment[1].z - segment[0].z) * t
  };
}

function buildKapShuiMun() {
  const crossingId = 'kap-shui-mun', definition = CABLE_STAYED_DEFINITIONS[crossingId], routes = routesFor(crossingId);
  const towers = definition.towers.map((entry, index) => {
    const frame = sampleCableStayedPair(crossingId, entry.fraction), bottom = baseElevation(frame.x, frame.z);
    const topY = bottom + entry.height;
    const legs = [-1, 1].map((side) => {
      const edge = cableStayedOuterEdge(crossingId, entry.fraction, side), bottom = baseElevation(edge.x, edge.z);
      return {
        side,
        base: { x: edge.x + edge.outwardX * 3.2, y: bottom, z: edge.z + edge.outwardZ * 3.2 },
        mid: { x: edge.x + edge.outwardX * 1.2, y: frame.y + 24, z: edge.z + edge.outwardZ * 1.2 },
        top: { x: edge.x + edge.outwardX * 1.2, y: topY, z: edge.z + edge.outwardZ * 1.2 }
      };
    });
    const crossbeams = [frame.y + 8, frame.y + 35, topY - 3].map((y) => ({
      a: legPointAtY(legs[0], y), b: legPointAtY(legs[1], y)
    }));
    return { ...entry, index, kind: 'h', frame, bottom, topY, legs, crossbeams };
  });

  const stays = [], length = routes[0].length;
  for (const tower of towers) {
    for (const direction of [-1, 1]) {
      const hasMainSpan = direction < 0 ? tower.index > 0 : tower.index < towers.length - 1;
      const spacing = hasMainSpan ? definition.mainSpacing : definition.sideSpacing;
      for (const side of [-1, 1]) {
        const leg = tower.legs.find((candidate) => candidate.side === side);
        for (let i = 0; i < definition.fanCables; i++) {
          const fraction = tower.fraction + direction * spacing * (i + 1) / length;
          const anchor = cableStayedOuterEdge(crossingId, fraction, side);
          stays.push({
            a: { x: leg.top.x, y: tower.topY - i * 1.5, z: leg.top.z },
            b: { x: anchor.x, y: anchor.y + 0.45, z: anchor.z },
            towerIndex: tower.index, side
          });
        }
      }
    }
  }

  const lowerDeckFrames = [];
  for (let s = 0; s <= length + 0.01; s += definition.mainSpacing) {
    const fraction = Math.min(1, s / length), frame = sampleCableStayedPair(crossingId, fraction);
    const left = cableStayedOuterEdge(crossingId, fraction, -1), right = cableStayedOuterEdge(crossingId, fraction, 1);
    for (const edge of [left, right]) { edge.lowerY = frame.y - 7.3; edge.upperY = frame.y - 0.65; }
    lowerDeckFrames.push({ left, right, lowerY: frame.y - 7.3, upperY: frame.y - 0.65 });
  }
  const lamps = buildLamps(crossingId), edgeGirders = buildEdgeGirders(crossingId);
  return {
    id: crossingId, towers, stays, lowerDeckFrames, lamps, edgeGirders,
    stats: {
      kapShuiMunTowers: towers.length,
      kapShuiMunStayCables: stays.length,
      kapShuiMunLowerDeckFrames: lowerDeckFrames.length,
      kapShuiMunLamps: lamps.length
    }
  };
}

export function isCableStayedMainSpan(crossingId, fraction) {
  const clear = CABLE_STAYED_DEFINITIONS[crossingId]?.clearSpan;
  return Boolean(clear && fraction >= clear[0] && fraction <= clear[1]);
}

export function buildCableStayedPlan() {
  const bridges = [buildTingKau(), buildKapShuiMun()];
  const stats = Object.assign({}, ...bridges.map((bridge) => bridge.stats));
  stats.cableStayedBridges = bridges.length;
  return { bridges, stats };
}
