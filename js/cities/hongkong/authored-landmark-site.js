// Renderer-independent provenance, georeferencing and road-safe ground rules for authored Hong Kong landmarks.
// Source rings are preserved independently from photo-directed upper volumes and landscape aprons.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
import {
  harbourCityWorldToLocal, harbourCityLocalToWorld, harbourCityPointInRoadCorridor,
} from './harbour-city-architecture.js';

export const AUTHORED_OSM_RETRIEVED = '2026-11-06';
export const HK_METRES_PER_LON = 103056.81753522092;
export const HK_METRES_PER_LAT = 110734.09626824585;
export const projectHongKongLonLat = (lon, lat) => [
  (lon - 114.1596) * HK_METRES_PER_LON,
  -(lat - 22.2819) * HK_METRES_PER_LAT,
];

export function authoredOsmSource(value) {
  const type = value.type ?? 'way';
  return Object.freeze({
    attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: AUTHORED_OSM_RETRIEVED,
    sourceUrl: `https://www.openstreetmap.org/${type}/${value.id}`,
    type, id: value.id, version: value.version ?? null, sourceTimestamp: value.sourceTimestamp ?? null,
    tags: Object.freeze({ ...value.tags }),
    geometry: Object.freeze(value.geometry.map((point) => Object.freeze({ ...point }))),
    innerGeometry: value.innerGeometry
      ? Object.freeze(value.innerGeometry.map((ring) => Object.freeze(ring.map((point) => Object.freeze({ ...point })))))
      : undefined,
    evidence: value.evidence ?? 'OSM source geometry; no surveyed architectural drawing is implied.',
  });
}

export function flatRingArea(ring) {
  let area = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
  return area * 0.5;
}

export function worldRingFromGeometry(geometry) {
  return Object.freeze(geometry.flatMap(({ lon, lat }) => projectHongKongLonLat(lon, lat)));
}

export function localRingFromWorld(site, ring) {
  return Object.freeze(ring.flatMap((value, index, array) => {
    if (index % 2) return [];
    const point = harbourCityWorldToLocal(site, value, array[index + 1]);
    return [point.x, point.z];
  }));
}

export function makeAuthoredSite(key, name, englishName, source, options = {}) {
  const ring = worldRingFromGeometry(source.geometry);
  const base = {
    key, name, englishName, source, osmType: source.type, osmId: source.id,
    ring, bounds: flatRingBounds(ring), ringArea: Math.abs(flatRingArea(ring)),
    ...minimumAreaObb(ring), height: options.height ?? null, levels: options.levels ?? null,
    minHeight: options.minHeight ?? 0, roadIds: Object.freeze([...(options.roadIds ?? [])]),
    role: options.role ?? 'building', evidence: options.evidence ?? source.evidence,
  };
  return Object.freeze({ ...base, localRing: localRingFromWorld(base, ring) });
}

export function makePhotoDirectedSite(key, name, ring, evidence, options = {}) {
  const frozen = Object.freeze([...ring]);
  const base = {
    key, name, englishName: name, osmType: null, osmId: null, source: null, photoDirected: true,
    ring: frozen, bounds: flatRingBounds(frozen), ringArea: Math.abs(flatRingArea(frozen)),
    ...minimumAreaObb(frozen), height: options.height ?? null, levels: options.levels ?? null,
    minHeight: 0, roadIds: Object.freeze([...(options.roadIds ?? [])]), role: options.role ?? 'apron', evidence,
  };
  return Object.freeze({ ...base, localRing: localRingFromWorld(base, frozen) });
}

export function authoredTerrainHeightAt(sites, x, z, rawHeight, padHeight) {
  let found = false;
  for (const site of sites) {
    const bounds = site.bounds;
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ || !pointInFlatRing(site.ring, x, z)) continue;
    if (!harbourCityPointInRoadCorridor(site, x, z)) found = true;
  }
  return found ? Math.max(rawHeight, padHeight) : rawHeight;
}

export function authoredHighestRawDatum(sites, rawHeightAt) {
  let height = -Infinity;
  for (const site of sites) {
    height = Math.max(height, rawHeightAt(site.x, site.z));
    for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHeightAt(site.ring[i], site.ring[i + 1]));
  }
  return height;
}

export { harbourCityWorldToLocal as authoredWorldToLocal, harbourCityLocalToWorld as authoredLocalToWorld };
