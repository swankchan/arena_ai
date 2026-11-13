import { authoredOsmSource, makeAuthoredSite, authoredTerrainHeightAt } from './authored-landmark-site.js';

// © OpenStreetMap contributors, way 56752303 version 13, ODbL 1.0.
// Hong Kong Science Museum (HKScM), 2 Science Museum Road, Tsim Sha Tsui East.
// Opened 18 April 1991. The museum is renowned for its 22-metre-high Energy Machine (能量穿梭機),
// the largest twin-tower kinetic ball sculpture of its kind in the world, housed in the central glass atrium tower.
export const SCIENCE_MUSEUM_ROWS = Object.freeze([
  [22.3014000, 114.1777927], [22.3011300, 114.1780547], [22.3005879, 114.1774017], [22.3008579, 114.1771397],
  [22.3010037, 114.1773153], [22.3012108, 114.1775650], [22.3013824, 114.1777719], [22.3014000, 114.1777927],
]);

export const SCIENCE_MUSEUM_OSM_SOURCE = authoredOsmSource({
  id: 56752303,
  version: 13,
  tags: {
    'addr:housenumber': '2',
    'addr:street': '科學館道 Science Museum Road',
    'addr:street:en': 'Science Museum Road',
    'addr:street:zh': '科學館道',
    building: 'yes',
    museum: 'science',
    name: '香港科學館 Hong Kong Science Museum',
    'name:en': 'Hong Kong Science Museum',
    'name:zh': '香港科學館',
    operator: '康樂及文化事務署 Leisure and Cultural Services Department',
    'operator:en': 'Leisure and Cultural Services Department',
    'operator:zh': '康樂及文化事務署',
    tourism: 'museum',
    wikidata: 'Q836319',
    wikipedia: 'en:Hong Kong Science Museum',
  },
  geometry: SCIENCE_MUSEUM_ROWS.map(([lat, lon]) => ({ lat, lon })),
  evidence: 'OSM way 56752303 (version 13). Surveyed footprint at 2 Science Museum Road, Tsim Sha Tsui East.',
});

export const SCIENCE_MUSEUM_SITE = makeAuthoredSite(
  'scienceMuseum', '香港科學館', 'Hong Kong Science Museum', SCIENCE_MUSEUM_OSM_SOURCE,
  { levels: 4, height: 24, role: 'museum', evidence: 'Surveyed OSM footprint in Tsim Sha Tsui East. 4 gallery floors, central glass Energy Machine atrium tower, and roof pyramid skylights.' },
);

export const SCIENCE_MUSEUM_PAD_HEIGHT = 6.6;
export const SCIENCE_MUSEUM_ROOF_HEIGHT = 20.5;
export const SCIENCE_MUSEUM_ATRIUM_TOWER_HEIGHT = 25.2;
export const SCIENCE_MUSEUM_ENERGY_MACHINE_HEIGHT = 22.0;

export const SCIENCE_MUSEUM_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({
    url: 'https://hk.science.museum/en/web/scm/aboutus/introduction.html',
    publisher: 'Hong Kong Science Museum / LCSD',
    evidence: 'Official museum introduction: opened in April 1991, four-storey permanent exhibition galleries, and the centerpiece 22-metre-high Energy Machine spanning four levels.',
  }),
  Object.freeze({
    url: 'https://hk.science.museum/en/web/scm/exhibition/energymachine.html',
    publisher: 'Hong Kong Science Museum — Energy Machine',
    evidence: 'Energy Machine description: designed and built by Dennis Puleston / Bob Kramer; a 22 m high kinetic sculpture with twin towers, chutes, gears, and rolling bowling balls demonstrating potential and kinetic energy.',
  }),
]);

export function scienceMuseumTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([SCIENCE_MUSEUM_SITE], x, z, rawHeight, padHeight);
}
