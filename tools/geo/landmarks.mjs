// OSM tall/named buildings -> landmark footprints. Same shape as the Manhattan landmark layer:
// { x, z, w, d, h, area, ring } with a simplified real outline in world metres.
import { bbox, centroid, landWinding, rdpRing, ringArea } from './geom.mjs';
import { elementRings, zhName } from './osm.mjs';

export function buildLandmarks(elements, toWorld, { minHeight = 45, minArea = 800, limit = 160 } = {}) {
  const candidates = [];
  for (const element of elements) {
    const tags = element.tags || {};
    const name = zhName(tags);
    if (!name) continue;
    const rings = elementRings(element, toWorld);
    if (!rings.length) continue;
    let ring = rings[0];
    for (const r of rings) if (Math.abs(ringArea(r)) > Math.abs(ringArea(ring))) ring = r;
    const area = Math.abs(ringArea(ring));
    if (area < minArea) continue;
    const levels = parseFloat(tags['building:levels']);
    const height = parseFloat(tags.height);
    const h = Number.isFinite(height) ? height : Number.isFinite(levels) ? levels * 3.2 : null;
    if (h != null && h < minHeight && area < 4000) continue;
    const simplified = landWinding(rdpRing(ring, 0.4));
    const b = bbox(simplified);
    const [cx, cz] = centroid(simplified);
    candidates.push({
      name,
      landmark: {
        x: Math.round(((b.x0 + b.x1) / 2) * 10) / 10,
        z: Math.round(((b.z0 + b.z1) / 2) * 10) / 10,
        w: Math.round((b.x1 - b.x0) * 10) / 10,
        d: Math.round((b.z1 - b.z0) * 10) / 10,
        h: h != null ? Math.round(h * 10) / 10 : null,
        area: Math.round(area),
        ring: simplified.flatMap(([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10])
      },
      score: (h || 20) * Math.sqrt(area) + (b.x1 - b.x0) * 2
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  const landmarks = {};
  for (const c of candidates) {
    if (Object.keys(landmarks).length >= limit) break;
    if (!landmarks[c.name]) landmarks[c.name] = c.landmark;
  }
  console.log(`[landmarks] ${Object.keys(landmarks).length} footprints from ${elements.length} named buildings`);
  return landmarks;
}
