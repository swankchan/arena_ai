// Planar, tangent-continuous junction geometry for Hong Kong's left-hand traffic.
export function wrapTrafficAngle(angle) {
  return angle - Math.round(angle / (Math.PI * 2)) * Math.PI * 2;
}

const cross = (ax, az, bx, bz) => ax * bz - az * bx;

export function buildCircularTurn({
  fromPoint, fromDirection, fromTotal,
  toPoint, toDirection, toTotal,
  radius, minimumRadius = 3, earliestStart = 0
}) {
  const fx = fromDirection.x, fz = fromDirection.z;
  const tx = toDirection.x, tz = toDirection.z;
  const denominator = cross(fx, fz, tx, tz);
  if (Math.abs(denominator) < 1e-7) return null;
  const fromHeading = Math.atan2(fx, fz), toHeading = Math.atan2(tx, tz);
  const angle = wrapTrafficAngle(toHeading - fromHeading);
  const angleMagnitude = Math.abs(angle);
  if (angleMagnitude < 0.055 || angleMagnitude > Math.PI * 0.86) return null;

  const qx = toPoint.x - fromPoint.x, qz = toPoint.z - fromPoint.z;
  const fromIntersection = cross(qx, qz, tx, tz) / denominator;
  const toIntersection = cross(qx, qz, fx, fz) / denominator;
  const tangentScale = Math.tan(angleMagnitude * 0.5);
  if (tangentScale < 1e-5) return null;
  const lowerRadius = Math.max(0, fromIntersection, -toIntersection) / tangentScale;
  const upperRadius = Math.min(
    (fromTotal + fromIntersection - earliestStart) / tangentScale,
    (toTotal - toIntersection) / tangentScale
  );
  if (!(upperRadius >= Math.max(lowerRadius, minimumRadius))) return null;
  const actualRadius = Math.max(lowerRadius, Math.min(radius, upperRadius));
  const tangentDistance = actualRadius * tangentScale;
  const startTravelS = fromTotal + fromIntersection - tangentDistance;
  const endTravelS = toIntersection + tangentDistance;
  const epsilon = 0.02;
  if (startTravelS < earliestStart - epsilon || startTravelS > fromTotal + epsilon || endTravelS < -epsilon || endTravelS > toTotal + epsilon) return null;

  const startX = fromPoint.x + fx * (startTravelS - fromTotal);
  const startZ = fromPoint.z + fz * (startTravelS - fromTotal);
  const sign = angle > 0 ? 1 : -1;
  const leftX = fz, leftZ = -fx;
  const centreX = startX + leftX * actualRadius * sign;
  const centreZ = startZ + leftZ * actualRadius * sign;
  const endHeading = fromHeading + angle;
  const endX = centreX - sign * Math.cos(endHeading) * actualRadius;
  const endZ = centreZ + sign * Math.sin(endHeading) * actualRadius;
  const expectedEndX = toPoint.x + tx * endTravelS, expectedEndZ = toPoint.z + tz * endTravelS;
  if (Math.hypot(endX - expectedEndX, endZ - expectedEndZ) > 0.03) return null;

  return {
    fromHeading, toHeading: endHeading, angle, sign,
    radius: actualRadius, length: actualRadius * angleMagnitude,
    centreX, centreZ, startX, startZ, endX: expectedEndX, endZ: expectedEndZ,
    startTravelS: Math.max(0, startTravelS), endTravelS: Math.max(0, endTravelS),
    speed: Math.sqrt(2.2 * actualRadius),
    blink: angle > 0 ? -1 : 1
  };
}

function makeCubicTurn({ startX, startZ, endX, endZ, fx, fz, tx, tz,
  fromHeading, toHeading, startTravelS, endTravelS, handle }) {
  const angle = wrapTrafficAngle(toHeading - fromHeading);
  const c1x = startX + fx * handle, c1z = startZ + fz * handle;
  const c2x = endX - tx * handle, c2z = endZ - tz * handle;
  const samples = [], cumulative = [0];
  let minimumRadius = Infinity, previous = null;
  for (let i = 0; i <= 96; i++) {
    const t = i / 96, u = 1 - t;
    const x = u ** 3 * startX + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * endX;
    const z = u ** 3 * startZ + 3 * u * u * t * c1z + 3 * u * t * t * c2z + t ** 3 * endZ;
    const dx = 3 * u * u * (c1x - startX) + 6 * u * t * (c2x - c1x) + 3 * t * t * (endX - c2x);
    const dz = 3 * u * u * (c1z - startZ) + 6 * u * t * (c2z - c1z) + 3 * t * t * (endZ - c2z);
    const ddx = 6 * u * (c2x - 2 * c1x + startX) + 6 * t * (endX - 2 * c2x + c1x);
    const ddz = 6 * u * (c2z - 2 * c1z + startZ) + 6 * t * (endZ - 2 * c2z + c1z);
    const derivativeLength = Math.hypot(dx, dz);
    const curvature = derivativeLength > 1e-7 ? Math.abs(dx * ddz - dz * ddx) / derivativeLength ** 3 : Infinity;
    if (curvature > 1e-8) minimumRadius = Math.min(minimumRadius, 1 / curvature);
    const heading = Math.atan2(dx, dz);
    if (previous) cumulative.push(cumulative.at(-1) + Math.hypot(x - previous.x, z - previous.z));
    samples.push({ x, z, heading });
    previous = { x, z };
  }
  if (!Number.isFinite(minimumRadius) || cumulative.at(-1) < 0.02) return null;
  return {
    kind: 'cubic', samples, cumulative, fromHeading, toHeading, angle,
    sign: angle >= 0 ? 1 : -1, radius: minimumRadius, length: cumulative.at(-1),
    startX, startZ, endX, endZ, startTravelS, endTravelS,
    speed: Math.sqrt(2.2 * minimumRadius), blink: angle >= 0 ? -1 : 1
  };
}

// Exact endpoints and tangents on curved OSM polylines; the next link resumes without a position or heading jump.
export function buildCubicBetween({ startPoint, startDirection, startTravelS, endPoint, endDirection, endTravelS, radius }) {
  const fx = startDirection.x, fz = startDirection.z, tx = endDirection.x, tz = endDirection.z;
  const fromHeading = Math.atan2(fx, fz), toHeading = Math.atan2(tx, tz);
  const chord = Math.hypot(endPoint.x - startPoint.x, endPoint.z - startPoint.z);
  const handle = Math.max(0.1, Math.min(radius * 0.55, chord * 0.55));
  return makeCubicTurn({
    startX: startPoint.x, startZ: startPoint.z, endX: endPoint.x, endZ: endPoint.z,
    fx, fz, tx, tz, fromHeading, toHeading, startTravelS, endTravelS, handle
  });
}

export function buildCubicTurn({
  fromPoint, fromDirection, fromTotal,
  toPoint, toDirection, toTotal,
  radius, earliestStart = 0
}) {
  const fx = fromDirection.x, fz = fromDirection.z, tx = toDirection.x, tz = toDirection.z;
  const fromHeading = Math.atan2(fx, fz), toHeading = Math.atan2(tx, tz);
  const angle = wrapTrafficAngle(toHeading - fromHeading);
  if (Math.abs(angle) < 0.055) return null;
  const tangentDistance = Math.min(Math.max(8, radius * 1.5), fromTotal * 0.45, toTotal * 0.45,
    Math.max(0, fromTotal - earliestStart));
  if (tangentDistance < 0.35) return null;
  const startTravelS = fromTotal - tangentDistance, endTravelS = tangentDistance;
  const startX = fromPoint.x - fx * tangentDistance, startZ = fromPoint.z - fz * tangentDistance;
  const endX = toPoint.x + tx * tangentDistance, endZ = toPoint.z + tz * tangentDistance;
  const handle = Math.max(2, Math.min(8, Math.hypot(endX - startX, endZ - startZ)));
  return makeCubicTurn({ startX, startZ, endX, endZ, fx, fz, tx, tz,
    fromHeading, toHeading, startTravelS, endTravelS, handle });
}

export function buildSemicircularUturn({ fromPoint, fromDirection, toPoint, startTravelS }) {
  const fx = fromDirection.x, fz = fromDirection.z;
  const chordX = toPoint.x - fromPoint.x, chordZ = toPoint.z - fromPoint.z;
  const radius = Math.hypot(chordX, chordZ) * 0.5;
  if (radius < 0.8 || Math.abs(chordX * fx + chordZ * fz) > 0.15) return null;
  const centreX = fromPoint.x + chordX * 0.5, centreZ = fromPoint.z + chordZ * 0.5;
  const fromHeading = Math.atan2(fx, fz);
  const leftDot = (centreX - fromPoint.x) * fz + (centreZ - fromPoint.z) * -fx;
  const sign = leftDot >= 0 ? 1 : -1;
  return {
    fromHeading, toHeading: fromHeading + sign * Math.PI, angle: sign * Math.PI, sign,
    radius, length: Math.PI * radius, centreX, centreZ,
    startX: fromPoint.x, startZ: fromPoint.z, endX: toPoint.x, endZ: toPoint.z,
    startTravelS, endTravelS: 0, speed: Math.sqrt(2.2 * radius), blink: sign > 0 ? -1 : 1
  };
}

export function sampleCubicTurn(turn, distance) {
  const s = Math.max(0, Math.min(turn.length, distance));
  let low = 0, high = turn.cumulative.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (turn.cumulative[middle] <= s) low = middle;
    else high = middle;
  }
  const span = Math.max(1e-8, turn.cumulative[high] - turn.cumulative[low]);
  const t = (s - turn.cumulative[low]) / span, a = turn.samples[low], b = turn.samples[high];
  const heading = a.heading + wrapTrafficAngle(b.heading - a.heading) * t;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    dx: Math.sin(heading), dz: Math.cos(heading), heading };
}

export function samplePlannedTurn(turn, distance) {
  return turn.kind === 'cubic' ? sampleCubicTurn(turn, distance) : sampleCircularTurn(turn, distance);
}

export function sampleCircularTurn(turn, distance) {
  const s = Math.max(0, Math.min(turn.length, distance));
  const heading = turn.fromHeading + turn.sign * s / turn.radius;
  return {
    x: turn.centreX - turn.sign * Math.cos(heading) * turn.radius,
    z: turn.centreZ + turn.sign * Math.sin(heading) * turn.radius,
    dx: Math.sin(heading), dz: Math.cos(heading), heading
  };
}
