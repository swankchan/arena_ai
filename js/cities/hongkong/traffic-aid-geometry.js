// Pure geometry for Hong Kong's surveyed traffic aids. No Three.js or DOM dependency, so the exact source-to-mesh
// rules are testable in Node. Official positions/extents arrive in GEO.trafficAids; only the paint cross-sections,
// dash modules, closed-stripe triangulation and coincident signal assemblies are derived here.

export const PAINT_HEIGHT = Object.freeze({ crossing: 0.010, yellowBox: 0.012, yellowBorder: 0.014, roadMark: 0.016 });
export const WHITE = 0xe6e2d6;
export const YELLOW = 0xe8bd24;

// CT174/51 standard-marking dimensions. The publisher surveys a run, not each dash, so a module is applied in the
// source part's digitised direction. `broken` is left/right of THAT direction, never east/west in the world frame.
// RM1006/1007/1049/1107 use the equal mark/gap module shown by their standard-drawing geometry; the other modules
// and widths are transcribed from the CT174/51 rows. No OSM centreline or road-width inference is permitted here.
export const ROAD_MARK_STYLES = Object.freeze({
  RM1001: { width: 0.15, lines: 2, spacing: 0.10 },
  RM1002: { width: 0.15, lines: 2, spacing: 0.10, mark: 1.0, gap: 5.0, broken: 'right' },
  RM1003: { width: 0.15, lines: 2, spacing: 0.10, mark: 1.0, gap: 5.0, broken: 'left' },
  RM1006: { width: 0.20 },
  RM1007: { width: 0.20, mark: 1.0, gap: 1.0 },
  RM1011: { width: 0.20 },
  RM1012: { width: 0.20, lines: 2, spacing: 0.30 },
  RM1013: { width: 0.20, lines: 2, spacing: 0.20, mark: 0.6, gap: 0.3 },
  RM1035: { width: 0.15, chevronWidth: 0.9 },
  RM1036: { width: 0.15, chevronWidth: 0.9 },
  RM1037: { width: 0.15 },
  RM1049: { width: 0.20, mark: 1.0, gap: 1.0, color: YELLOW },
  RM1101: { width: 0.10, mark: 1.0, gap: 5.0 },
  RM1102: { width: 0.10, mark: 2.0, gap: 7.0 },
  RM1103: { width: 0.10, mark: 3.0, gap: 5.0 },
  RM1104: { width: 0.10, mark: 4.0, gap: 2.0 },
  RM1105: { width: 0.10, mark: 6.0, gap: 3.0 },
  RM1107: { width: 0.10, mark: 1.0, gap: 1.0 },
  RM1108: { width: 0.10 },
  RM1109: { width: 0.10 },
  ZIGZAGL: { width: 0.10 },
  ZIGZAGR: { width: 0.10 }
});

const CROSSING_TYPES = new Set(['SOLID', 'NONE', 'RM1076', 'ZEBRA4']);
const ZEBRA_TYPES = new Set(['ZEBRA4']);
const ZIGZAG_TYPES = new Set(['ZIGZAGL', 'ZIGZAGR']);
const EPS = 1e-7;
const cleanTolerance = 0.004;

function linear(hex) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [channel((hex >> 16) & 255), channel((hex >> 8) & 255), channel(hex & 255)];
}

function pointsOf(flat) {
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
}

function cleanPoints(flat, closedOK = false) {
  const source = pointsOf(flat);
  const points = [];
  for (const point of source) {
    if (!point.every(Number.isFinite)) continue;
    if (!points.length || Math.hypot(point[0] - points.at(-1)[0], point[1] - points.at(-1)[1]) > cleanTolerance) {
      points.push(point);
    }
  }
  const closed = closedOK && points.length > 2 &&
    Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]) <= 0.02;
  if (closed) points.pop();
  return { points, closed };
}

function ringArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area * 0.5;
}

class PaintBuffer {
  constructor() {
    this.position = [];
    this.side = [];
    this.paint = [];
    this.color = [];
    this.normal = [];
    this.index = [];
  }

  vertex(x, y, z, sx, sz, chainage, period, duty, rgb) {
    const i = this.position.length / 3;
    this.position.push(x, y, z);
    this.normal.push(0, 1, 0);
    this.side.push(sx, sz);
    this.paint.push(chainage, period, duty);
    this.color.push(...rgb);
    return i;
  }

  strip(flat, { width, offset = 0, mark = null, gap = null, color = WHITE, height = PAINT_HEIGHT.roadMark }) {
    const { points, closed } = cleanPoints(flat, true);
    if (points.length < 2 || !(width > 0)) return false;
    const segmentCount = closed ? points.length : points.length - 1;
    const lengths = [];
    const normals = [];
    let total = 0;
    for (let i = 0; i < segmentCount; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const length = Math.hypot(dx, dz);
      if (length < cleanTolerance) return false;
      lengths.push(length);
      normals.push([-dz / length, dx / length]); // right of the digitised direction
      total += length;
    }
    if (total < 0.02) return false;

    const period = mark == null ? 1 : mark + gap;
    const duty = mark == null ? 1 : mark / period;
    const rgb = linear(color);
    const base = this.position.length / 3;
    let chainage = 0;
    const vertexCount = closed ? points.length + 1 : points.length;
    for (let i = 0; i < vertexCount; i++) {
      const index = i % points.length;
      if (i > 0) chainage += lengths[i - 1];
      const previous = normals[(index + normals.length - 1) % normals.length];
      const next = normals[index % normals.length];
      let mx, mz, scale = 1;
      if (!closed && i === 0) [mx, mz] = normals[0];
      else if (!closed && i === vertexCount - 1) [mx, mz] = normals.at(-1);
      else {
        mx = previous[0] + next[0]; mz = previous[1] + next[1];
        const length = Math.hypot(mx, mz);
        if (length < EPS) [mx, mz] = next;
        else {
          mx /= length; mz /= length;
          scale = Math.min(4, 1 / Math.max(0.25, mx * next[0] + mz * next[1]));
        }
      }
      const point = points[index];
      for (const sign of [-1, 1]) {
        const across = (offset + sign * width * 0.5) * scale;
        const sx = mx * sign * width * 0.5 * scale;
        const sz = mz * sign * width * 0.5 * scale;
        this.vertex(point[0] + mx * across, height, point[1] + mz * across, sx, sz,
          chainage, period, duty, rgb);
      }
    }
    for (let i = 0; i < vertexCount - 1; i++) {
      const a = base + i * 2;
      this.index.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    return true;
  }

  segments(flat, options) {
    const { points } = cleanPoints(flat);
    let drawn = false;
    for (let i = 0; i + 1 < points.length; i++) {
      drawn = this.strip([...points[i], ...points[i + 1]], options) || drawn;
    }
    return drawn;
  }

  polygon(points, { color = WHITE, height = PAINT_HEIGHT.crossing }) {
    if (points.length < 3) return false;
    let ring = points.map((p) => [...p]);
    if (ringArea(ring) > 0) ring.reverse(); // negative x/z area gives a +Y normal
    const centre = ring.reduce((sum, p) => [sum[0] + p[0] / ring.length, sum[1] + p[1] / ring.length], [0, 0]);
    const base = this.position.length / 3;
    const rgb = linear(color);
    for (const [x, z] of ring) this.vertex(x, height, z, x - centre[0], z - centre[1], 0, 1, 1, rgb);
    for (let i = 1; i + 1 < ring.length; i++) this.index.push(base, base + i, base + i + 1);
    return true;
  }
}

function isConvex(ring) {
  let sign = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[(i + ring.length - 1) % ring.length], b = ring[i], c = ring[(i + 1) % ring.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < 1e-8) continue;
    const next = Math.sign(cross);
    if (sign && next !== sign) return false;
    sign = next;
  }
  return Boolean(sign);
}

function minimumRectSides(ring) {
  let best = [Infinity, Infinity], bestArea = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    if (length < EPS) continue;
    const ux = dx / length, uz = dz / length;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of ring) {
      const u = p[0] * ux + p[1] * uz, v = -p[0] * uz + p[1] * ux;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const sides = [u1 - u0, v1 - v0].sort((x, y) => x - y);
    const area = sides[0] * sides[1];
    if (area < bestArea) { bestArea = area; best = sides; }
  }
  return best;
}

// Closed rings are already individual surveyed stripes. Loose edges are only accepted when they join back into a
// closed face; this never floods a crossing outline and never fills the ladder gaps between stripes.
export function crossingFaces(parts) {
  const faces = [];
  const nodes = new Map();
  const edges = [];
  const key = (p) => `${Math.round(p[0] * 10000)},${Math.round(p[1] * 10000)}`;
  const node = (p) => {
    const k = key(p);
    if (!nodes.has(k)) nodes.set(k, { point: p, edges: [] });
    return k;
  };
  for (const flat of parts) {
    const { points, closed } = cleanPoints(flat, true);
    if (closed) {
      if (Math.abs(ringArea(points)) > 0.001) faces.push(points);
      continue;
    }
    for (let i = 0; i + 1 < points.length; i++) {
      const a = node(points[i]), b = node(points[i + 1]);
      if (a === b) continue;
      const id = edges.length;
      edges.push({ a, b, used: false });
      nodes.get(a).edges.push(id); nodes.get(b).edges.push(id);
    }
  }
  for (const edge of edges) {
    if (edge.used) continue;
    const start = edge.a;
    let current = start, previous = null;
    const ring = [];
    for (let guard = 0; guard <= edges.length; guard++) {
      const candidates = nodes.get(current).edges.filter((id) => !edges[id].used);
      if (!candidates.length) break;
      const id = candidates[0];
      const nextEdge = edges[id];
      nextEdge.used = true;
      const next = nextEdge.a === current ? nextEdge.b : nextEdge.a;
      ring.push(nodes.get(current).point);
      previous = current; current = next;
      if (current === start) break;
      if (previous === current) break;
    }
    if (current === start && ring.length >= 3 && Math.abs(ringArea(ring)) > 0.001) faces.push(ring);
  }

  const owners = new Map();
  let touching = 0;
  for (let i = 0; i < faces.length; i++) {
    const ring = faces[i];
    for (let j = 0; j < ring.length; j++) {
      const a = key(ring[j]), b = key(ring[(j + 1) % ring.length]);
      const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (owners.has(edgeKey) && owners.get(edgeKey) !== i) touching++;
      else owners.set(edgeKey, i);
    }
  }
  return { faces, touching };
}

function pointSegmentDistance(point, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length2)) : 0;
  return Math.hypot(point[0] - a[0] - dx * t, point[1] - a[1] - dz * t);
}

function segmentsDistance(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (((abC <= 0 && abD >= 0) || (abC >= 0 && abD <= 0)) &&
      ((cdA <= 0 && cdB >= 0) || (cdA >= 0 && cdB <= 0))) {
    const denominator = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(denominator) > EPS) return 0;
  }
  return Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b));
}

function polylinesDistance(a, b) {
  let best = Infinity;
  for (let i = 0; i + 1 < a.length; i++) {
    for (let j = 0; j + 1 < b.length; j++) {
      best = Math.min(best, segmentsDistance(a[i], a[i + 1], b[j], b[j + 1]));
      if (best < 0.001) return 0;
    }
  }
  return best;
}

function crossingIsZebra(crossing, zigzags) {
  if (ZEBRA_TYPES.has(crossing.type)) return true;
  const own = crossing.parts.map(pointsOf);
  for (const zigzag of zigzags) {
    for (const part of zigzag.parts) {
      const other = pointsOf(part);
      for (const line of own) if (polylinesDistance(line, other) <= 10) return true;
    }
  }
  return false;
}

function chevronWidth(part, style) {
  if (!style.chevronWidth) return style.width;
  const { points } = cleanPoints(part);
  if (points.length !== 3) return style.width;
  const a = points[0], b = points[1], c = points[2];
  const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
  const cosine = (u[0] * v[0] + u[1] * v[1]) / Math.max(EPS, Math.hypot(...u) * Math.hypot(...v));
  const turn = 180 - Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
  return turn > 20 ? style.chevronWidth : style.width;
}

export function buildTrafficAidPaint(aids) {
  const buffer = new PaintBuffer();
  const stats = {
    sourceRoadMarkFeatures: aids.marks.length,
    renderedRoadMarkFeatures: 0,
    skippedRoadMarkFeatures: 0,
    skippedRoadMarkTypes: {},
    sourceCrossingFeatures: aids.crossings.length,
    renderedCrossingFeatures: 0,
    crossingStripes: 0,
    zebraCrossings: 0,
    signalCrossings: 0,
    refusedCrossingTypes: 0,
    openCrossingParts: 0,
    touchingCrossingFaces: 0,
    yellowBoxFeatures: 0,
    yellowBoxParts: 0,
    yellowBoxPolygons: aids.yellowBoxPolygons.length,
    paintVertices: 0,
    paintTriangles: 0
  };
  const zigzags = aids.marks.filter((mark) => ZIGZAG_TYPES.has(mark.type));

  for (const mark of aids.marks) {
    if (mark.elevation != null) { stats.skippedRoadMarkFeatures++; continue; }
    const style = ROAD_MARK_STYLES[mark.type];
    if (!style) {
      stats.skippedRoadMarkFeatures++;
      stats.skippedRoadMarkTypes[mark.type] = (stats.skippedRoadMarkTypes[mark.type] || 0) + 1;
      continue;
    }
    let drawn = false;
    for (const part of mark.parts) {
      const lines = style.lines || 1;
      const pitch = style.width + (style.spacing || 0);
      for (let line = 0; line < lines; line++) {
        const side = lines === 1 ? null : line === 0 ? 'left' : 'right';
        const broken = style.mark != null && (!style.broken || style.broken === side);
        drawn = buffer.strip(part, {
          ...style,
          width: chevronWidth(part, style),
          offset: (line - (lines - 1) * 0.5) * pitch,
          mark: broken ? style.mark : null,
          gap: broken ? style.gap : null,
          color: style.color || WHITE
        }) || drawn;
      }
    }
    if (drawn) stats.renderedRoadMarkFeatures++;
    else { stats.skippedRoadMarkFeatures++; stats.skippedRoadMarkTypes[mark.type] = (stats.skippedRoadMarkTypes[mark.type] || 0) + 1; }
  }

  for (const crossing of aids.crossings) {
    if (!CROSSING_TYPES.has(crossing.type)) { stats.refusedCrossingTypes++; continue; }
    const { faces, touching } = crossingFaces(crossing.parts);
    stats.touchingCrossingFaces += touching;
    stats.openCrossingParts += crossing.parts.filter((part) => !cleanPoints(part, true).closed).length;
    const zebra = crossingIsZebra(crossing, zigzags);
    let stripes = 0;
    for (const face of faces) {
      const sides = minimumRectSides(face);
      if (!(sides[0] <= 1.4) || !isConvex(face)) continue;
      if (buffer.polygon(face, { color: zebra ? WHITE : YELLOW })) stripes++;
    }
    if (stripes) {
      stats.renderedCrossingFeatures++;
      stats.crossingStripes += stripes;
      if (zebra) stats.zebraCrossings++;
      else stats.signalCrossings++;
    }
  }

  for (const box of aids.yellowBoxes) {
    let drawn = 0;
    for (const part of box.parts) {
      const { closed } = cleanPoints(part, true);
      const options = {
        width: closed ? 0.30 : 0.10,
        color: YELLOW,
        height: closed ? PAINT_HEIGHT.yellowBorder : PAINT_HEIGHT.yellowBox
      };
      // Some yellow-box hatch runs contain digitised backtracking and repeated vertices. Independent source
      // segments avoid a miter turning into a bow-tie; no segment or hatch is invented between the published runs.
      if ((closed ? buffer.strip(part, options) : buffer.segments(part, options))) drawn++;
    }
    if (drawn) { stats.yellowBoxFeatures++; stats.yellowBoxParts += drawn; }
  }

  stats.paintVertices = buffer.position.length / 3;
  stats.paintTriangles = buffer.index.length / 3;
  return { ...buffer, stats };
}

// REFNAME is only used as a head/not-head gate: P or S + digits + optional L/R. Coincident features become one
// assembly, not an invented vertical stack of different aspects. Original IDs/codes/angles stay on each assembly.
export function clusterSignalPoints(signals, mergeM = 0.75) {
  const admitted = signals.filter((signal) => signal.elevation == null && /^[PS]\d+(?:[LR])?$/.test(signal.code));
  const unseen = new Set(admitted.map((_, index) => index));
  const assemblies = [];
  while (unseen.size) {
    const first = unseen.values().next().value;
    unseen.delete(first);
    const stack = [first], members = [];
    while (stack.length) {
      const index = stack.pop();
      members.push(index);
      for (const other of [...unseen]) {
        if (Math.hypot(admitted[index].x - admitted[other].x, admitted[index].z - admitted[other].z) <= mergeM) {
          unseen.delete(other); stack.push(other);
        }
      }
    }
    members.sort((a, b) => admitted[a].id - admitted[b].id);
    const points = members.map((index) => admitted[index]);
    assemblies.push({
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
      ids: points.map((point) => point.id),
      codes: points.map((point) => point.code),
      angles: points.map((point) => point.angle),
      sourceCount: points.length
    });
  }
  assemblies.sort((a, b) => a.x - b.x || a.z - b.z || a.ids[0] - b.ids[0]);
  return {
    assemblies,
    stats: {
      sourceSignalPoints: signals.length,
      admittedSignalPoints: admitted.length,
      refusedSignalPoints: signals.length - admitted.length,
      signalAssemblies: assemblies.length,
      collapsedSignalPoints: admitted.length - assemblies.length
    }
  };
}
