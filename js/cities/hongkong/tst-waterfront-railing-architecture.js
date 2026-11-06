import { GEO } from '../../hk-geodata.js';
import { pointInFlatRing } from './landmark-site.js';

// Tsim Sha Tsui Star Ferry Pier -> Tsim Sha Tsui East, following the existing OSM-derived land boundary rather than
// a new invented shoreline. Vertex indices refer to the canonical GEO.land Kowloon ring used by the rendered city.
export const TST_WATERFRONT_RAILING_SOURCE = Object.freeze({
  id: 'HK-TST-WATERFRONT-RAILING',
  landRing: 0,
  firstVertex: 346,
  lastVertex: 373,
  start: 'Tsim Sha Tsui Star Ferry Pier / Clock Tower waterfront',
  end: 'Tsim Sha Tsui East waterfront',
  coastlineEvidence: 'Existing hk-geodata.js OSM-derived land ring; the source coastline is not moved.',
  designEvidence: 'https://www.greening.gov.hk/en/greening-landscape/landscape-corner/index_id_6.html',
  designNote: 'Official GLTMS describes the wide bio-based wood substitute handrail and the undulating wave-like promenade balustrade. No photograph is used as a texture.',
});

export const TST_WATERFRONT_RAILING_STYLE = Object.freeze({
  landwardOffset: 1.25,
  waveAmplitude: .16,
  waveLength: 14,
  sampleSpacing: .65,
  handrailHeight: 1.12,
  handrailWidth: .28,
  balustradeHeight: 1.02,
});

function normalise(x, z) {
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

function inside(ring, x, z) {
  return pointInFlatRing(ring, x, z);
}

// Return a continuous, landward-offset, gently undulating railing centreline. Every sample carries its inland normal
// so the renderer can lean the steel balusters seaward without guessing which side is the harbour.
export function tstWaterfrontRailingPath(options = {}) {
  const style = { ...TST_WATERFRONT_RAILING_STYLE, ...options };
  const source = TST_WATERFRONT_RAILING_SOURCE, ring = GEO.land[source.landRing];
  const vertices = [];
  for (let index = source.firstVertex; index <= source.lastVertex; index++) vertices.push({ x: ring[index * 2], z: ring[index * 2 + 1] });
  const segmentNormals = [];
  for (let index = 0; index < vertices.length - 1; index++) {
    const a = vertices[index], b = vertices[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz) || 1;
    segmentNormals.push({ x: -dz / length, z: dx / length });
  }
  const first = vertices[0], next = vertices[1], normal = segmentNormals[0];
  const mx = (first.x + next.x) * .5, mz = (first.z + next.z) * .5;
  const landSign = inside(ring, mx + normal.x * 2, mz + normal.z * 2) ? 1 : -1;
  for (const n of segmentNormals) { n.x *= landSign; n.z *= landSign; }

  const base = [], vertexNormals = [];
  for (let index = 0; index < vertices.length; index++) {
    const previous = segmentNormals[Math.max(0, index - 1)], following = segmentNormals[Math.min(segmentNormals.length - 1, index)];
    const bisector = normalise(previous.x + following.x, previous.z + following.z);
    const dot = Math.max(.36, bisector.x * following.x + bisector.z * following.z);
    const distance = Math.min(style.landwardOffset * 2.8, style.landwardOffset / dot);
    const origin = vertices[index];
    let candidate = null;
    for (const [nx, nz, scale] of [
      [bisector.x, bisector.z, distance], [following.x, following.z, style.landwardOffset],
      [previous.x, previous.z, style.landwardOffset], [bisector.x, bisector.z, style.landwardOffset * 2],
      [bisector.x, bisector.z, style.landwardOffset * 3.2],
    ]) {
      const x = origin.x + nx * scale, z = origin.z + nz * scale;
      if (inside(ring, x, z)) { candidate = { x, z }; break; }
    }
    if (!candidate) throw new Error(`TST waterfront railing left the source land at vertex ${source.firstVertex + index}`);
    base.push(candidate); vertexNormals.push(bisector);
  }

  const samples = [];
  let distance = 0;
  for (let index = 0; index < base.length - 1; index++) {
    const a = base[index], b = base[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    if (length < .001) continue;
    const steps = Math.max(1, Math.ceil(length / style.sampleSpacing));
    for (let step = 0; step <= steps; step++) {
      if (index > 0 && step === 0) continue;
      const t = step / steps, s = distance + length * t;
      const n = normalise(vertexNormals[index].x + (vertexNormals[index + 1].x - vertexNormals[index].x) * t,
        vertexNormals[index].z + (vertexNormals[index + 1].z - vertexNormals[index].z) * t);
      const baseX = a.x + dx * t, baseZ = a.z + dz * t, wave = Math.sin(s / style.waveLength * Math.PI * 2) * style.waveAmplitude;
      let x = baseX + n.x * wave, z = baseZ + n.z * wave;
      // A tight concave source corner must not be pushed into the harbour by the decorative wave.
      if (!inside(ring, x, z)) { x = baseX; z = baseZ; }
      if (!inside(ring, x, z)) throw new Error(`TST waterfront railing sample ${samples.length} left the source land`);
      samples.push({ x, z, nx: n.x, nz: n.z, s });
    }
    distance += length;
  }
  return samples;
}
