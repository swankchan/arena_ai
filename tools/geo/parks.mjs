// OSM leisure/landuse polygons -> the parks layer.
import { ringArea, landWinding, rdpRing } from './geom.mjs';
import { elementRings, zhName } from './osm.mjs';

const CATS = new Set(['park', 'garden', 'playground', 'pitch', 'recreation_ground', 'grass', 'forest', 'wood', 'nature_reserve']);

export function buildParks(elements, toWorld, { minArea = 1200, maxArea = 4_000_000 } = {}) {
  const parks = [];
  for (const element of elements) {
    const tags = element.tags || {};
    const cat = tags.leisure || tags.landuse || tags.natural;
    if (!CATS.has(cat)) continue;
    const rings = [];
    for (const raw of elementRings(element, toWorld)) {
      const ring = landWinding(rdpRing(raw, 0.8));
      const area = Math.abs(ringArea(ring));
      if (area < minArea || area > maxArea) continue;
      rings.push({ ring, area });
    }
    if (!rings.length) continue;
    const name = zhName(tags);
    parks.push({
      name,
      cat,
      acres: Math.round(rings.reduce((total, r) => total + r.area, 0) / 4046.86),
      rings: rings.map((r) => r.ring.flatMap(([x, z]) => [x, z]))
    });
  }
  parks.sort((a, b) => b.acres - a.acres);
  return parks;
}
