// Shared, renderer-independent provenance and georeferencing for authored Tsim Sha Tsui hotels.
// Exact OSM building rings remain distinct from photo-directed forecourts, facade rows and roof proportions.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
import {
  harbourCityWorldToLocal, harbourCityLocalToWorld, harbourCityRoadRecords,
  harbourCityPointInRoadCorridor,
} from './harbour-city-architecture.js';

export const TST_HOTEL_OSM_RETRIEVED = '2026-11-06';
export const TST_HOTEL_KX = 103056.81753522092;
export const TST_HOTEL_KY = 110734.09626824585;
export const tstHotelProject = (lon, lat) => [
  (lon - 114.1596) * TST_HOTEL_KX, -(lat - 22.2819) * TST_HOTEL_KY,
];

export function tstHotelOsmSource(value) {
  return Object.freeze({
    attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: TST_HOTEL_OSM_RETRIEVED,
    sourceUrl: `https://www.openstreetmap.org/api/0.6/way/${value.id}/full.json`,
    type: 'way', id: value.id, version: value.version, sourceTimestamp: value.sourceTimestamp,
    tags: Object.freeze({ ...value.tags }),
    nodes: value.nodes ? Object.freeze([...value.nodes]) : undefined,
    geometry: Object.freeze(value.geometry.map((point) => Object.freeze({ ...point }))),
  });
}

export function flatRingArea(ring) {
  let area = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
  return area * 0.5;
}

export function makeTstHotelSite(key, name, englishName, source, height, levels, roadIds = []) {
  const ring = Object.freeze(source.geometry.flatMap(({ lon, lat }) => tstHotelProject(lon, lat)));
  const base = {
    key, name, englishName, source, osmType: 'way', osmId: source.id,
    ring, bounds: flatRingBounds(ring), ringArea: Math.abs(flatRingArea(ring)),
    ...minimumAreaObb(ring), height, levels, minHeight: 0, roadIds: Object.freeze([...roadIds]),
  };
  const localRing = Object.freeze(ring.flatMap((value, index, array) => {
    if (index % 2) return [];
    const p = harbourCityWorldToLocal(base, value, array[index + 1]);
    return [p.x, p.z];
  }));
  return Object.freeze({ ...base, localRing });
}

export function makePhotoDirectedGroundRing(key, name, ring, evidence, roadIds = []) {
  const frozen = Object.freeze([...ring]);
  return Object.freeze({
    key, name, englishName: name, osmType: null, osmId: null, source: null, photoDirected: true,
    ring: frozen, bounds: flatRingBounds(frozen), ringArea: Math.abs(flatRingArea(frozen)),
    ...minimumAreaObb(frozen), height: null, levels: null, minHeight: 0, roadIds: Object.freeze([...roadIds]), evidence,
  });
}

export function tstHotelTerrainHeightAt(sites, x, z, rawHeight, padHeight) {
  let found = false;
  for (const site of sites) {
    const b = site.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ || !pointInFlatRing(site.ring, x, z)) continue;
    if (!harbourCityPointInRoadCorridor(site, x, z)) found = true;
  }
  return found ? Math.max(rawHeight, padHeight) : rawHeight;
}

export function tstHotelHighestRawDatum(sites, rawHeightAt) {
  let height = -Infinity;
  for (const site of sites) {
    height = Math.max(height, rawHeightAt(site.x, site.z));
    for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHeightAt(site.ring[i], site.ring[i + 1]));
  }
  return height;
}

export {
  harbourCityWorldToLocal as tstHotelWorldToLocal,
  harbourCityLocalToWorld as tstHotelLocalToWorld,
  harbourCityRoadRecords as tstHotelRoadRecords,
};
