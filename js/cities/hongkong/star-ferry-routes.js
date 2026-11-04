import { STAR_FERRY_TERMINAL_BY_ID, starFerryLocalToWorld } from './star-ferry-data.js';

// The two franchised passenger services in current operation. Berth offsets are presentation placements beside the
// preserved OSM terminal outlines, not surveyed manoeuvring instructions. Both direct centre-water paths are checked
// against the territory coast in the regression tests.
export const STAR_FERRY_SERVICE_SOURCE = 'https://www.starferry.com.hk/en/service';

function berth(siteId, x, z, heading) {
  const site = STAR_FERRY_TERMINAL_BY_ID[siteId];
  const point = starFerryLocalToWorld(site, x, z);
  return Object.freeze({ siteId, localX: x, localZ: z, x: point.x, z: point.z, heading });
}

function makeRoute(id, name, nameEn, a, b, vesselName) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  return Object.freeze({
    id, name, nameEn, a, b, vesselName, length,
    heading: Math.atan2(dx, dz),
    points: Object.freeze([[a.x, a.z], [b.x, b.z]]),
    turnDistance: Math.min(165, length * 0.18),
    maxSpeed: 7.4,
    acceleration: 0.42,
    deceleration: 0.65,
    dwellTime: 9
  });
}

const tst = STAR_FERRY_TERMINAL_BY_ID['tsim-sha-tsui'];
const central = STAR_FERRY_TERMINAL_BY_ID.central;
const wanChai = STAR_FERRY_TERMINAL_BY_ID['wan-chai'];

export const STAR_FERRY_ROUTES = Object.freeze([
  makeRoute(
    'tst-central', '尖沙咀 ↔ 中環', 'Tsim Sha Tsui ↔ Central',
    berth(tst.id, -54, 4, tst.ry),
    berth(central.id, 8, 20.5, central.ry + Math.PI / 2),
    'MORNING STAR'
  ),
  makeRoute(
    'tst-wan-chai', '尖沙咀 ↔ 灣仔', 'Tsim Sha Tsui ↔ Wan Chai',
    berth(tst.id, 58, 4, tst.ry),
    berth(wanChai.id, -8, 20.5, wanChai.ry + Math.PI / 2),
    'CELESTIAL STAR'
  )
]);

export function alignStarFerryHeading(angle, reference) {
  // A double-ended vessel's body orientation is π-periodic: either end may be the leading end.
  let result = angle;
  while (result - reference > Math.PI / 2) result -= Math.PI;
  while (result - reference < -Math.PI / 2) result += Math.PI;
  return result;
}

export function starFerryHeadingError(a, b) {
  return Math.abs(alignStarFerryHeading(a, b) - b);
}

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function sampleStarFerryRoute(route, s) {
  const chainage = Math.max(0, Math.min(route.length, s));
  const t = chainage / route.length;
  const base = route.heading;
  let heading = base;
  if (chainage < route.turnDistance) {
    const start = alignStarFerryHeading(route.a.heading, base);
    const blend = smoothstep(chainage / route.turnDistance);
    heading = start + (alignStarFerryHeading(base, start) - start) * blend;
  } else if (chainage > route.length - route.turnDistance) {
    const end = alignStarFerryHeading(route.b.heading, base);
    const blend = smoothstep((chainage - (route.length - route.turnDistance)) / route.turnDistance);
    heading = base + (alignStarFerryHeading(end, base) - base) * blend;
  }
  return {
    x: route.a.x + (route.b.x - route.a.x) * t,
    z: route.a.z + (route.b.z - route.a.z) * t,
    heading,
    t: chainage / route.length
  };
}

export function createStarFerryMotion(route, s = 0, dir = 1) {
  return {
    s: Math.max(0, Math.min(route.length, s)),
    dir: dir < 0 ? -1 : 1,
    speed: 0,
    dwell: 0,
    reversals: 0
  };
}

export function advanceStarFerryMotion(state, route, dt) {
  let remainingTime = Math.max(0, Math.min(30, Number.isFinite(dt) ? dt : 0));
  let iterations = 0;
  while (remainingTime > 1e-8 && iterations++ < 12) {
    if (state.dwell > 0) {
      const paused = Math.min(state.dwell, remainingTime);
      state.dwell -= paused;
      remainingTime -= paused;
      state.speed = 0;
      continue;
    }
    const remainingDistance = state.dir > 0 ? route.length - state.s : state.s;
    if (remainingDistance <= 1e-6) {
      state.s = state.dir > 0 ? route.length : 0;
      state.speed = 0;
      state.dir *= -1;
      state.reversals++;
      state.dwell = route.dwellTime;
      continue;
    }
    const step = Math.min(remainingTime, 0.1);
    const brakingSpeed = Math.sqrt(2 * route.deceleration * Math.max(0, remainingDistance - 0.02));
    const target = Math.min(route.maxSpeed, brakingSpeed);
    const rate = target < state.speed ? route.deceleration : route.acceleration;
    state.speed += Math.max(-rate * step, Math.min(rate * step, target - state.speed));
    const distance = Math.min(remainingDistance, Math.max(0, state.speed * step));
    state.s += state.dir * distance;
    remainingTime -= step;
    if (distance >= remainingDistance - 1e-6) {
      state.s = state.dir > 0 ? route.length : 0;
      state.speed = 0;
      state.dir *= -1;
      state.reversals++;
      state.dwell = route.dwellTime;
    }
  }
  return state;
}
