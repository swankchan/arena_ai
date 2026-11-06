// Kowloon Shangri-La: exact OSM podium / arrival roads and an explicitly photo-derived inset bay-window tower.
// The source has 16 levels and layer=2 but no height or hotel-name tags; 62 m is scene massing, not a surveyed height.
import {
  tstHotelOsmSource, makeTstHotelSite, makePhotoDirectedGroundRing, tstHotelTerrainHeightAt,
  tstHotelRoadRecords, tstHotelWorldToLocal, tstHotelLocalToWorld,
} from './tst-hotel-site.js';
import { harbourCityEdgeFrame, harbourCityEdgeOutward } from './harbour-city-architecture.js';

export const KOWLOON_SHANGRI_LA_OSM_SOURCE = tstHotelOsmSource({
  id: 29403978, version: 7, sourceTimestamp: '2022-12-06T13:39:55Z',
  tags: { building: 'yes', 'building:levels': '16', layer: '2' },
  nodes: [323906401, 323906404, 323906407, 2441357636, 323906410, 323906413, 323906417, 323906423, 323906430, 6720241280, 323906401],
  geometry: [
    { lat: 22.2970199, lon: 114.1765704 }, { lat: 22.2966603, lon: 114.1769224 },
    { lat: 22.2971244, lon: 114.1774763 }, { lat: 22.2973925, lon: 114.1772138 },
    { lat: 22.2973986, lon: 114.1772078 }, { lat: 22.2972637, lon: 114.1770469 },
    { lat: 22.2971513, lon: 114.1771570 }, { lat: 22.2969555, lon: 114.1769234 },
    { lat: 22.2971534, lon: 114.1767297 }, { lat: 22.2970889, lon: 114.1766528 },
    { lat: 22.2970199, lon: 114.1765704 },
  ],
});
export const KOWLOON_SHANGRI_LA_SOURCE_ENTRANCE_NODE = Object.freeze({
  id: 2441357636, lat: 22.2973925, lon: 114.1772138,
  tags: Object.freeze({ entrance: 'yes', exit: 'yes' }),
});

export const KOWLOON_SHANGRI_LA_MODEL_HEIGHT = 62;
export const KOWLOON_SHANGRI_LA_OSM_LEVELS = 16;
export const KOWLOON_SHANGRI_LA_PODIUM_HEIGHT = 9.2;
export const KOWLOON_SHANGRI_LA_ROAD_SOFFIT = 5.6;
export const KOWLOON_SHANGRI_LA_GUESTROOM_ROWS = 14;
export const KOWLOON_SHANGRI_LA_GUESTROOM_FLOOR_HEIGHT = 3.6;
export const KOWLOON_SHANGRI_LA_COMPLETION_YEAR = 1981;
export const KOWLOON_SHANGRI_LA_SITE = makeTstHotelSite(
  'kowloonShangriLa', '九龍香格里拉 Kowloon Shangri-La, Hong Kong', 'Kowloon Shangri-La, Hong Kong',
  KOWLOON_SHANGRI_LA_OSM_SOURCE, null, KOWLOON_SHANGRI_LA_OSM_LEVELS, [44185, 44186],
);
export const KOWLOON_SHANGRI_LA_GROUND_SITES = Object.freeze([KOWLOON_SHANGRI_LA_SITE]);
export const KOWLOON_SHANGRI_LA_GROUND_RINGS = Object.freeze([KOWLOON_SHANGRI_LA_SITE.ring]);

// Only the upper visual volume omits the sub-metre source jog at vertex 4 before a 1.35 m inward offset.
// The exact ten-vertex podium and its source entrance node are never simplified or moved.
function photoDirectedInsetRing(sourceRing, distance, omitVertex) {
  const ring = sourceRing.slice(0, -2); ring.splice(omitVertex * 2, 2); ring.push(ring[0], ring[1]);
  const result = [], count = ring.length / 2 - 1;
  for (let vertex = 0; vertex < count; vertex++) {
    const lines = [(vertex + count - 1) % count, vertex].map((edge) => {
      const i = edge * 2, outward = harbourCityEdgeOutward(ring, edge);
      return {
        x: ring[i] - outward.nx * distance, z: ring[i + 1] - outward.nz * distance,
        dx: ring[i + 2] - ring[i], dz: ring[i + 3] - ring[i + 1],
      };
    });
    const [a, b] = lines, denominator = a.dx * b.dz - a.dz * b.dx;
    if (Math.abs(denominator) < 1e-8) throw new Error('Parallel Kowloon Shangri-La inset edges');
    const t = ((b.x - a.x) * b.dz - (b.z - a.z) * b.dx) / denominator;
    const x = a.x + a.dx * t, z = a.z + a.dz * t;
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error('Invalid Kowloon Shangri-La inset');
    result.push(x, z);
  }
  result.push(result[0], result[1]); return Object.freeze(result);
}
export const KOWLOON_SHANGRI_LA_TOWER_INSET = 1.35;
export const KOWLOON_SHANGRI_LA_BAY_PROJECTION = 0.78;
export const KOWLOON_SHANGRI_LA_TOWER_LOCAL_RING = photoDirectedInsetRing(
  KOWLOON_SHANGRI_LA_SITE.localRing, KOWLOON_SHANGRI_LA_TOWER_INSET, 4,
);
export const KOWLOON_SHANGRI_LA_TOWER_SITE = Object.freeze({
  ...KOWLOON_SHANGRI_LA_SITE, key: 'kowloonShangriLaPhotoTower',
  name: 'Kowloon Shangri-La photo-derived inset bay-window tower', englishName: 'Kowloon Shangri-La photo-derived upper tower',
  osmType: null, osmId: null, source: null, ring: null, bounds: null, ringArea: null,
  photoDirected: true, localRing: KOWLOON_SHANGRI_LA_TOWER_LOCAL_RING,
  height: KOWLOON_SHANGRI_LA_MODEL_HEIGHT, levels: KOWLOON_SHANGRI_LA_GUESTROOM_ROWS,
  evidence: 'Photo-derived upper volume inset 1.35 m from the exact OSM podium; the sub-metre vertex-4 jog is omitted only in this upper visual ring. No surveyed height or separate OSM tower/part footprint is claimed.',
});

export const KOWLOON_SHANGRI_LA_MAIN_ENTRANCE = harbourCityEdgeFrame(
  KOWLOON_SHANGRI_LA_SITE, 6, 'Kowloon Shangri-La Mody Road arrival-court entrance',
  'Photo-directed hotel lobby and porte-cochere on concave source edge 6 facing the Mody Road arrival court; distinct from the exact OSM entrance/exit node 2441357636 at source vertex 3.', 0.5,
);
export const KOWLOON_SHANGRI_LA_SOURCE_ENTRANCE = Object.freeze({
  ...harbourCityEdgeFrame(
    KOWLOON_SHANGRI_LA_SITE, 2, 'Kowloon Shangri-La OSM entrance / exit',
    'Exact source node 2441357636 with entrance=yes and exit=yes at vertex 3; this source access is not relabelled as the photo-directed main lobby.', 1,
  ), sourceNodeId: KOWLOON_SHANGRI_LA_SOURCE_ENTRANCE_NODE.id,
});
export const KOWLOON_SHANGRI_LA_CANOPY_WIDTH = 18;
export const KOWLOON_SHANGRI_LA_CANOPY_DEPTH = 5.2;
export const KOWLOON_SHANGRI_LA_CANOPY_SOFFIT = 4.8;
const entranceOutward = harbourCityEdgeOutward(KOWLOON_SHANGRI_LA_SITE.localRing, KOWLOON_SHANGRI_LA_MAIN_ENTRANCE.sourceEdge);
const entranceTangent = { x: entranceOutward.nz, z: -entranceOutward.nx };
const canopyCentre = {
  x: KOWLOON_SHANGRI_LA_MAIN_ENTRANCE.localX + entranceOutward.nx * KOWLOON_SHANGRI_LA_CANOPY_DEPTH * 0.5,
  z: KOWLOON_SHANGRI_LA_MAIN_ENTRANCE.localZ + entranceOutward.nz * KOWLOON_SHANGRI_LA_CANOPY_DEPTH * 0.5,
};
const canopyRing = [];
for (const [side, depth] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]) {
  const p = tstHotelLocalToWorld(KOWLOON_SHANGRI_LA_SITE,
    canopyCentre.x + entranceTangent.x * side * KOWLOON_SHANGRI_LA_CANOPY_WIDTH * 0.5 + entranceOutward.nx * depth * KOWLOON_SHANGRI_LA_CANOPY_DEPTH * 0.5,
    canopyCentre.z + entranceTangent.z * side * KOWLOON_SHANGRI_LA_CANOPY_WIDTH * 0.5 + entranceOutward.nz * depth * KOWLOON_SHANGRI_LA_CANOPY_DEPTH * 0.5);
  canopyRing.push(p.x, p.z);
}
export const KOWLOON_SHANGRI_LA_CANOPY_CLEARANCE_SITE = makePhotoDirectedGroundRing(
  'kowloonShangriLaCanopyClearance', 'Kowloon Shangri-La photo-directed arrival-canopy clearance', canopyRing,
  'Visual entrance-canopy clearance only; not an OSM entrance polygon or an additional terrain pad.',
);

export const KOWLOON_SHANGRI_LA_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({
    url: 'https://www.shangri-la.com/hongkong/kowloonshangrila/', publisher: 'Kowloon Shangri-La official site',
    evidence: 'Official current Kowloon Shangri-La identity, 64 Mody Road address, Tsim Sha Tsui waterfront setting and 688 current guestrooms / suites. This is not the separate Island Shangri-La in Admiralty.',
  }),
  Object.freeze({
    url: 'https://www.wongouyang.com/projects/kowloon-shangri-la-hotel/', publisher: 'Wong & Ouyang project architect',
    evidence: 'The 1981 project description states 14 guestroom floors, two podium floors, four basements and a 16-storey tower / podium. These floor conventions are retained; no overall height is published here.',
  }),
  Object.freeze({
    url: 'https://www.tripadvisor.com/LocationPhotoDirectLink-g294217-d302133-i129690340-Kowloon_Shangri_La_Hong_Kong-Hong_Kong.html',
    publisher: 'Tripadvisor — reviewed Kowloon Shangri-La exterior photograph',
    evidence: 'Reviewed exterior photography directs the dark bronze podium, gold Shangri-La lettering, flagpoles, reflective glass and repeated projecting bay-window grid. Images are visual direction only and are not redistributed or measured.',
  }),
  Object.freeze({
    url: 'https://www.hotelplanner.com/Hotels/319848/Reservations-Kowloon-Shangri-La-Hong-Kong-Kowloon-64-Mody-Rd-',
    publisher: 'HotelPlanner — supplementary reviewed exterior photograph',
    evidence: 'Supplementary reviewed frontage photography directs the recessed arrival court, warm glazed lobby, dark porte-cochere and the stepped / sawtooth bay-window silhouette. Unrelated interior and other-hotel search images were rejected.',
  }),
  Object.freeze({
    url: 'https://www.openstreetmap.org/api/0.6/way/29403978/full.json', publisher: 'OpenStreetMap contributors',
    evidence: 'Way 29403978 v7 supplies the exact ten-vertex building ring, building:levels=16, layer=2 and source node 2441357636 with entrance=yes / exit=yes. It has no height or hotel-name tags; landuse way 236062121 is not substituted for this building.',
  }),
]);

export function kowloonShangriLaTerrainHeightAt(x, z, rawHeight, padHeight) {
  return tstHotelTerrainHeightAt(KOWLOON_SHANGRI_LA_GROUND_SITES, x, z, rawHeight, padHeight);
}
export function kowloonShangriLaGroundHeightAt(x, z, ground, padHeight) {
  return kowloonShangriLaTerrainHeightAt(x, z, ground, padHeight);
}
export function kowloonShangriLaRoadRecords(site = KOWLOON_SHANGRI_LA_SITE) { return tstHotelRoadRecords(site); }
export { tstHotelWorldToLocal as kowloonShangriLaWorldToLocal, tstHotelLocalToWorld as kowloonShangriLaLocalToWorld };
