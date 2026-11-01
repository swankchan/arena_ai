const assert = require('node:assert/strict');
const test = require('node:test');

let boc;
let roads;
let lamps;
let clearance;

test.before(async () => {
  boc = await import('../js/cities/hongkong/bank-of-china-architecture.js');
  roads = (await import('../js/hk-full-roads-data.js')).HK_FULL_ROADS.roads;
  lamps = (await import('../js/hk-street-light-data.js')).HK_STREET_LIGHTS.lamps;
  clearance = (await import('../js/hk-street-light-clearance-data.js')).HK_STREET_LIGHT_CLEARANCE;
});

function inside(x, z) {
  const ring = boc.BANK_OF_CHINA_SITE.ring;
  let value = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) value = !value;
  }
  return value;
}
function pointSegmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function cross(ax, az, bx, bz) { return ax * bz - az * bx; }
function segmentsIntersect(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1];
  const denominator = cross(rx, rz, sx, sz), qx = c[0] - a[0], qz = c[1] - a[1];
  if (Math.abs(denominator) < 1e-9) return false;
  const t = cross(qx, qz, sx, sz) / denominator, u = cross(qx, qz, rx, rz) / denominator;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
}
function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(pointSegmentDistance(...a, c, d), pointSegmentDistance(...b, c, d),
    pointSegmentDistance(...c, a, b), pointSegmentDistance(...d, a, b));
}

test('Bank of China keeps all formal roads outside its footprint and entrance furniture', () => {
  const conflicts = [];
  for (const [wayId, road] of roads.entries()) {
    const [name, width, , , flags, flat] = road;
    for (let i = 2; i + 1 < flat.length; i += 2) {
      const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]];
      const margin = width * 0.5 + 1;
      if (Math.max(a[0], b[0]) < boc.BANK_OF_CHINA_SITE.bounds.minX - margin
        || Math.min(a[0], b[0]) > boc.BANK_OF_CHINA_SITE.bounds.maxX + margin
        || Math.max(a[1], b[1]) < boc.BANK_OF_CHINA_SITE.bounds.minZ - margin
        || Math.min(a[1], b[1]) > boc.BANK_OF_CHINA_SITE.bounds.maxZ + margin) continue;
      let conflict = inside(...a) || inside(...b);
      for (let j = 0; j < boc.BANK_OF_CHINA_SITE.ring.length && !conflict; j += 2) {
        const next = (j + 2) % boc.BANK_OF_CHINA_SITE.ring.length;
        const c = [boc.BANK_OF_CHINA_SITE.ring[j], boc.BANK_OF_CHINA_SITE.ring[j + 1]];
        const d = [boc.BANK_OF_CHINA_SITE.ring[next], boc.BANK_OF_CHINA_SITE.ring[next + 1]];
        conflict = segmentDistance(a, b, c, d) < width * 0.5 - 1e-6;
      }
      if (conflict) conflicts.push({ wayId, name, width, flags, segment: i / 2 - 1 });
    }
  }
  assert.deepEqual(conflicts, []);

  const hz = boc.BANK_OF_CHINA_SITE.d * 0.5;
  const furniture = [-9.2, 9.2].map((x) => ({ ...boc.bankOfChinaLocalToWorld(x, -hz - 2), clearance: 0.75 }));
  for (const x of [-6.2, 6.2]) for (const z of [-hz - 3.05, -hz + 0.15]) {
    furniture.push({ ...boc.bankOfChinaLocalToWorld(x, z), clearance: 0.2 });
  }
  for (const item of furniture) {
    let nearest = Infinity;
    for (const road of roads) {
      const [width, flat] = [road[1], road[5]];
      for (let i = 2; i + 1 < flat.length; i += 2) {
        const a = [flat[i - 2], flat[i - 1]], b = [flat[i], flat[i + 1]];
        if (Math.max(a[0], b[0]) < item.x - 30 || Math.min(a[0], b[0]) > item.x + 30
          || Math.max(a[1], b[1]) < item.z - 30 || Math.min(a[1], b[1]) > item.z + 30) continue;
        nearest = Math.min(nearest, pointSegmentDistance(item.x, item.z, a, b) - width * 0.5);
      }
    }
    assert.ok(nearest > item.clearance, `entrance furniture encroaches on a formal carriageway: ${nearest}`);
  }
});

test('Bank of China footprint contains no rendered street lamp', () => {
  const overrides = new Map(clearance.overrides.map((row) => [row[0], row]));
  const suppressed = new Set(clearance.suppressed), conflicts = [];
  for (let index = 0; index < lamps.length; index++) {
    if (suppressed.has(index)) continue;
    const lamp = lamps[index], override = overrides.get(index);
    const x = lamp[0] + (override?.[1] || 0) / 100, z = lamp[1] + (override?.[2] || 0) / 100;
    if (inside(x, z)) conflicts.push(index);
  }
  assert.deepEqual(conflicts, []);
});
