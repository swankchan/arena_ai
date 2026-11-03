// Pure track-chainage maths shared by the rendered tramway and deterministic tests. World frame: metres, x east, z south.
export const TRAM_MAX_SPEED = 5.2;
export const TRAM_ACCELERATION = 0.72;
export const TRAM_BRAKE = 1.35;
export const TRAM_STOP_DWELL = 1.8;
export const TRAM_TERMINUS_DWELL = 5.0;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const moveToward = (value, target, amount) => value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

export function createTramPath(track) {
  const points = track.points, distances = [0];
  for (let i = 3; i < points.length; i += 3) {
    distances.push(distances[distances.length - 1] + Math.hypot(points[i] - points[i - 3], points[i + 2] - points[i - 1]));
  }
  const stops = track.stops.map((stop) => [...stop]).sort((a, b) => a[3] - b[3]);
  return { id: track.id, points, distances, stops, length: distances.at(-1) };
}

export function sampleTramPath(path, chainage) {
  const { points, distances } = path;
  const s = clamp(chainage, 0, path.length);
  let low = 0, high = distances.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (distances[middle] <= s) low = middle;
    else high = middle;
  }
  const next = Math.min(points.length / 3 - 1, low + 1);
  const a = low * 3, b = next * 3;
  const span = Math.max(1e-8, distances[next] - distances[low]);
  const t = clamp((s - distances[low]) / span, 0, 1);
  const dx = points[b] - points[a], dz = points[b + 2] - points[a + 2];
  const horizontal = Math.hypot(dx, dz) || 1;
  return {
    x: points[a] + dx * t,
    y: points[a + 1] + (points[b + 1] - points[a + 1]) * t,
    z: points[a + 2] + dz * t,
    dx: dx / horizontal,
    dz: dz / horizontal,
    heading: Math.atan2(dx, dz),
    grade: (points[b + 1] - points[a + 1]) / horizontal
  };
}

function stopIndexAfter(path, s, direction) {
  if (direction > 0) {
    const index = path.stops.findIndex((stop) => stop[3] > s + 0.08);
    return index < 0 ? path.stops.length : index;
  }
  for (let index = path.stops.length - 1; index >= 0; index--) if (path.stops[index][3] < s - 0.08) return index;
  return -1;
}

export function sampleTramTrolleyContact(path, s, direction, contactHeight = 6, setback = 2.8) {
  const point = sampleTramPath(path, s - (direction < 0 ? -setback : setback));
  return { x: point.x, y: point.y + contactHeight, z: point.z, railY: point.y, contactHeight };
}

export function createTramMotion(path, s, direction = 1) {
  const state = {
    s: clamp(s, 0, path.length), dir: direction < 0 ? -1 : 1,
    speed: 0, dwell: 0, nextStop: -1, stoppedAt: null, reversals: 0
  };
  state.nextStop = stopIndexAfter(path, state.s, state.dir);
  return state;
}

export function advanceTramMotion(state, path, dt) {
  const step = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
  if (state.dwell > 0) {
    state.dwell = Math.max(0, state.dwell - step);
    state.speed = 0;
    if (state.dwell === 0) { state.stoppedAt = null; state.nextStop = stopIndexAfter(path, state.s, state.dir); }
    return state;
  }
  const stop = path.stops[state.nextStop];
  const target = stop ? stop[3] : (state.dir > 0 ? path.length : 0);
  const remaining = Math.max(0, (target - state.s) * state.dir);
  const brakingSpeed = Math.sqrt(2 * 0.92 * Math.max(0, remaining - 0.08)) + 0.08;
  const targetSpeed = remaining < 38 ? Math.min(TRAM_MAX_SPEED, brakingSpeed) : TRAM_MAX_SPEED;
  state.speed = moveToward(state.speed, targetSpeed, (targetSpeed < state.speed ? TRAM_BRAKE : TRAM_ACCELERATION) * step);
  let next = state.s + state.dir * state.speed * step;
  const reached = state.dir > 0 ? next >= target : next <= target;
  if (!reached) { state.s = clamp(next, 0, path.length); return state; }

  state.s = target;
  state.speed = 0;
  const terminus = !stop;
  state.dwell = terminus ? TRAM_TERMINUS_DWELL : TRAM_STOP_DWELL;
  state.stoppedAt = stop?.[0] || (state.dir > 0 ? 'east-end' : 'west-end');
  if (terminus) {
    state.dir *= -1;
    state.reversals++;
    state.nextStop = stopIndexAfter(path, state.s, state.dir);
  } else {
    state.nextStop += state.dir;
  }
  return state;
}
