// Hong Kong Space Museum, Tsim Sha Tsui: two independently traceable OSM wings and shared georef.
// The 23 m value is the official INTERNAL theatre screen diameter, not the exterior dome diameter.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
import { harbourCityLocalToWorld, harbourCityWorldToLocal, harbourCityRoadRecords, harbourCityPointInRoadCorridor, harbourCityEdgeFrame } from './harbour-city-architecture.js';

const source = (value) => Object.freeze({ attribution: '© OpenStreetMap contributors', license: 'ODbL 1.0', retrieved: '2026-11-04',
  sourceUrl: `https://www.openstreetmap.org/api/0.6/way/${value.id}/full.json`, type: 'way', id: value.id,
  version: value.version, sourceTimestamp: value.sourceTimestamp, tags: Object.freeze(value.tags),
  geometry: Object.freeze(value.geometry.map((point) => Object.freeze(point))) });

export const SPACE_MUSEUM_EAST_OSM_SOURCE = source({"id":184731572,"version":13,"sourceTimestamp":"2025-05-22T10:46:32Z","tags":{"addr:housename":"香港太空館 Hong Kong Space Museum","addr:housename:en":"Hong Kong Space Museum","addr:housename:zh":"香港太空館","attraction":"yes","building":"museum","height":"25","loc_name":"菠蘿包","loc_name:etymology:wikidata":"Q1140567","loc_name:yue":"菠蘿包","name":"東翼 East Wing","name:en":"East Wing","name:zh":"東翼","roof:colour":"white","roof:levels":"4","roof:shape":"dome","tourism":"attraction"},"geometry":[{"lat":22.2943919,"lon":114.1718287},{"lat":22.294417,"lon":114.1718431},{"lat":22.2944305,"lon":114.1718552},{"lat":22.2944389,"lon":114.1718628},{"lat":22.2944565,"lon":114.1718868},{"lat":22.2944693,"lon":114.1719142},{"lat":22.2944768,"lon":114.1719439},{"lat":22.2944785,"lon":114.1719746},{"lat":22.2944744,"lon":114.172005},{"lat":22.2944636,"lon":114.1720417},{"lat":22.294449,"lon":114.1720768},{"lat":22.2944307,"lon":114.1721098},{"lat":22.294409,"lon":114.1721404},{"lat":22.2943842,"lon":114.172168},{"lat":22.2943566,"lon":114.1721924},{"lat":22.2943265,"lon":114.1722131},{"lat":22.2942945,"lon":114.1722299},{"lat":22.2942595,"lon":114.1722412},{"lat":22.2942231,"lon":114.1722448},{"lat":22.2941869,"lon":114.1722406},{"lat":22.294152,"lon":114.1722286},{"lat":22.2941201,"lon":114.1722095},{"lat":22.2940923,"lon":114.1721839},{"lat":22.2940697,"lon":114.1721529},{"lat":22.2940533,"lon":114.1721177},{"lat":22.2940436,"lon":114.1720797},{"lat":22.2940411,"lon":114.1720403},{"lat":22.2940458,"lon":114.1720012},{"lat":22.2940576,"lon":114.1719638},{"lat":22.2940759,"lon":114.1719298},{"lat":22.2941002,"lon":114.1719003},{"lat":22.2941161,"lon":114.1718857},{"lat":22.2941269,"lon":114.1718761},{"lat":22.2941561,"lon":114.1718556},{"lat":22.2941873,"lon":114.171839},{"lat":22.2942202,"lon":114.1718264},{"lat":22.2942542,"lon":114.1718181},{"lat":22.2942888,"lon":114.1718142},{"lat":22.2943022,"lon":114.1718144},{"lat":22.2943236,"lon":114.1718146},{"lat":22.2943582,"lon":114.1718195},{"lat":22.2943919,"lon":114.1718287}]});
export const SPACE_MUSEUM_WEST_OSM_SOURCE = source({"id":37664428,"version":17,"sourceTimestamp":"2026-04-29T14:24:38Z","tags":{"addr:housename":"香港太空館 Hong Kong Space Museum","addr:housename:en":"Hong Kong Space Museum","addr:housename:zh":"香港太空館","building":"museum","building:levels":"3","building:levels:underground":"1","name":"西翼 West Wing","name:en":"West Wing","name:zh":"西翼"},"geometry":[{"lat":22.2942729,"lon":114.1714179},{"lat":22.2942905,"lon":114.1716124},{"lat":22.2942973,"lon":114.1717176},{"lat":22.2943021,"lon":114.1717815},{"lat":22.2943022,"lon":114.1718144},{"lat":22.2942888,"lon":114.1718142},{"lat":22.2942542,"lon":114.1718181},{"lat":22.2942202,"lon":114.1718264},{"lat":22.2941873,"lon":114.171839},{"lat":22.2941561,"lon":114.1718556},{"lat":22.2941269,"lon":114.1718761},{"lat":22.2941161,"lon":114.1718857},{"lat":22.2941116,"lon":114.1718214},{"lat":22.2941107,"lon":114.1718136},{"lat":22.2940678,"lon":114.1717744},{"lat":22.2940587,"lon":114.1716482},{"lat":22.2940513,"lon":114.1716489},{"lat":22.29405,"lon":114.1716317},{"lat":22.2940358,"lon":114.1714383},{"lat":22.2942729,"lon":114.1714179}]});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
function flatRingArea(ring) { let area = 0; for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return area * .5; }
function makeSite(key, name, englishName, source, height, levels) {
  const ring = Object.freeze(source.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
  const site = { key, name, englishName, source, osmType: 'way', osmId: source.id, ring, bounds: flatRingBounds(ring),
    ringArea: Math.abs(flatRingArea(ring)), ...minimumAreaObb(ring), height, levels, minHeight: 0, roadIds: Object.freeze([]) };
  const localRing = Object.freeze(ring.flatMap((value, index, array) => { if (index % 2) return []; const p = harbourCityWorldToLocal(site, value, array[index + 1]); return [p.x, p.z]; }));
  return Object.freeze({ ...site, localRing });
}

export const SPACE_MUSEUM_EAST_SITE = makeSite('spaceMuseumEast', '香港太空館東翼 Hong Kong Space Museum East Wing', 'Hong Kong Space Museum East Wing', SPACE_MUSEUM_EAST_OSM_SOURCE, 25, 4);
export const SPACE_MUSEUM_WEST_SITE = makeSite('spaceMuseumWest', '香港太空館西翼 Hong Kong Space Museum West Wing', 'Hong Kong Space Museum West Wing', SPACE_MUSEUM_WEST_OSM_SOURCE, null, 3);
export const SPACE_MUSEUM_SITES = Object.freeze([SPACE_MUSEUM_EAST_SITE, SPACE_MUSEUM_WEST_SITE]);
export const SPACE_MUSEUM_SCREEN_DIAMETER = 23;
export const SPACE_MUSEUM_OPENING_YEAR = 1980;
export const SPACE_MUSEUM_DOME_HEIGHT = 25;
// Photo-directed exterior modelling values, deliberately not presented as surveyed or OSM heights.
export const SPACE_MUSEUM_WEST_WALL_HIGH = 24.5, SPACE_MUSEUM_WEST_WALL_LOW = 8.5;
export const SPACE_MUSEUM_EAST_BLADE_HEIGHT = 30, SPACE_MUSEUM_WEST_BLADE_HEIGHT = 27.5;
export const SPACE_MUSEUM_ENTRANCE_NODE = Object.freeze({ type: 'node', id: 7260839550, version: 5, sourceTimestamp: '2026-04-29T14:24:38Z',
  sourceUrl: 'https://www.openstreetmap.org/api/0.6/node/7260839550.json', lon: 114.1717176, lat: 22.2942973,
  tags: Object.freeze({ door: 'yes', entrance: 'yes' }) });
const entranceFrame = harbourCityEdgeFrame(SPACE_MUSEUM_WEST_SITE, 1, 'Hong Kong Space Museum north entrance', 'Exact OSM entrance=yes / door=yes node 7260839550 at the end of west-wing edge 1; the glazed arrival frontage spans the nearly collinear adjoining edges.', 1);
export const SPACE_MUSEUM_MAIN_ENTRANCE = Object.freeze({ ...entranceFrame, sourceNodeId: SPACE_MUSEUM_ENTRANCE_NODE.id, sourceNode: SPACE_MUSEUM_ENTRANCE_NODE });
export const SPACE_MUSEUM_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://hk.space.museum/en/web/spm/about-us.html', publisher: 'Hong Kong Space Museum / LCSD', evidence: 'Official history: construction began in 1977 and the museum opened in October 1980; chief architect Joseph Ming Gun LEE. The 8,000 sq m museum has separate east and west wings, an egg-shaped east-wing shell and a 23 m INTERNAL hemispherical Space Theatre screen.' }),
  Object.freeze({ url: 'https://www.info.gov.hk/gia/general/200412/28/1228188.htm', publisher: 'HKSAR Government press release', evidence: 'Official address 10 Salisbury Road, October 1980 opening, 8,000 sq m museum and 23 m projection dome; the interior screen is not reused as the OSM exterior footprint diameter.' }),
  Object.freeze({ url: 'https://www.gohk.gov.hk/en/spots/spot_detail.php?spot=Hong+Kong+Space+Museum', publisher: 'Hong Kong government visitor photograph', evidence: 'Visually checked exterior photograph shows the pale panelled egg dome, curved beige tiled west-wing wall, tall narrow blade walls, recessed entrance, direct wall lettering, shallow steps and stainless-steel ramp rails; visual direction only, not measured drawings.' }),
  Object.freeze({ url: 'https://www.dreamstime.com/photos-images/hong-kong-space-museum.html', publisher: 'Dreamstime editorial photographs', evidence: 'Visually checked Salisbury Road exterior shows diagonal dome panels, two tall narrow tiled blades flanking a high entablature and tall recessed glass atrium, with direct museum lettering and arrival steps; visual direction only.' }),
  Object.freeze({ url: 'https://pinterest.com/ideas/hong-kong-space-museum/931913666368', publisher: 'Third-party aerial photograph index', evidence: 'Visually checked historical aerial photographs show a low flat west-wing roof behind the sweeping street wall and a row of roof skylight monitors; used only to avoid substituting a solid sloping wedge, not for dimensions or official specifications.' }),
  Object.freeze({ url: 'https://www.gettyimages.com/photos/hong-kong-space-museum', publisher: 'Getty editorial night photograph', evidence: 'Visually checked night exterior shows restrained dome uplighting, warm recessed entrance light, beige tiled sweeping wall and illuminated ramp handrails; no assumption that the whole dome is emissive.' })
]);

export function spaceMuseumTerrainHeightAt(x, z, rawHeight, padHeight) {
  let found = false;
  for (const site of SPACE_MUSEUM_SITES) { const b = site.bounds; if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ || !pointInFlatRing(site.ring, x, z)) continue; if (!harbourCityPointInRoadCorridor(site, x, z)) found = true; }
  return found ? Math.max(rawHeight, padHeight) : rawHeight;
}
export function spaceMuseumGroundHeightAt(x, z, ground, padHeight) { return spaceMuseumTerrainHeightAt(x, z, ground, padHeight); }
export function spaceMuseumRoadRecords(site) { return harbourCityRoadRecords(site); }
export { harbourCityLocalToWorld, harbourCityWorldToLocal };
