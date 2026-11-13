import { authoredOsmSource, makeAuthoredSite, authoredTerrainHeightAt } from './authored-landmark-site.js';

// © OpenStreetMap contributors, way 37664699 version 19 (outline of relation 12523044), ODbL 1.0.
// Hong Kong Museum of Art (HKMoA), 10 Salisbury Road, Tsim Sha Tsui waterfront.
// Established 1962 at City Hall; relocated to Tsim Sha Tsui in 1991; major expansion and facade redesign
// completed November 2019 (Architectural Services Department / Rocco Design Architects).
export const ART_MUSEUM_ROWS = Object.freeze([
  [22.2933279, 114.1722776], [22.2932963, 114.1717903], [22.2932825, 114.1717914], [22.2932592, 114.1714107],
  [22.2934649, 114.1713139], [22.2936362, 114.1713582], [22.2936568, 114.1716762], [22.2937015, 114.1716728],
  [22.2937273, 114.1720712], [22.2936691, 114.1720756], [22.2936859, 114.1721052], [22.2937089, 114.1721459],
  [22.2938142, 114.1723318], [22.2935594, 114.1726864], [22.2935191, 114.1726152], [22.2933524, 114.1723210],
  [22.2933279, 114.1722776],
]);

export const ART_MUSEUM_OSM_SOURCE = authoredOsmSource({
  id: 37664699,
  version: 19,
  tags: {
    'addr:housenumber': '10',
    'addr:street': '梳士巴利道 Salisbury Road',
    'addr:street:en': 'Salisbury Road',
    'addr:street:zh': '梳士巴利道',
    building: 'museum',
    name: '香港藝術館 Hong Kong Museum of Art',
    'name:en': 'Hong Kong Museum of Art',
    'name:zh': '香港藝術館',
    operator: '康樂及文化事務署 Leisure and Cultural Services Department',
    'operator:en': 'Leisure and Cultural Services Department',
    'operator:zh': '康樂及文化事務署',
    tourism: 'museum',
    wikidata: 'Q908216',
    wikipedia: 'en:Hong Kong Museum of Art',
  },
  geometry: ART_MUSEUM_ROWS.map(([lat, lon]) => ({ lat, lon })),
  evidence: 'OSM way 37664699 (version 19), outline of relation 12523044 (Hong Kong Art Museum). Exact 16-segment surveyed waterfront footprint.',
});

// Authored site: 5 levels above ground, plus the 2019 expanded top-floor glass pavilion box (The Belvedere / Harbour Gallery).
export const ART_MUSEUM_SITE = makeAuthoredSite(
  'artMuseum', '香港藝術館', 'Hong Kong Museum of Art', ART_MUSEUM_OSM_SOURCE,
  { levels: 5, height: 32, role: 'museum', evidence: 'Surveyed OSM waterfront footprint on Salisbury Road. Heights and 2019 wavy facade details are photo-directed estimates.' },
);

export const ART_MUSEUM_PAD_HEIGHT = 4.2;
export const ART_MUSEUM_MAIN_ROOF_HEIGHT = 24.5;
export const ART_MUSEUM_TOP_BOX_HEIGHT = 31.8;
export const ART_MUSEUM_PLINTH_HEIGHT = 4.8;

export const ART_MUSEUM_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({
    url: 'https://hk.art.museum/en/web/ma/about-the-museum1.html',
    publisher: 'Hong Kong Museum of Art / LCSD',
    evidence: 'Official museum history: opened at City Hall in 1962, relocated to 10 Salisbury Road in 1991, reopened November 2019 after a 4-year major expansion and transformation.',
  }),
  Object.freeze({
    url: 'https://www.archsd.gov.hk/en/projects/expansion-and-renovation-of-the-hong-kong-museum-of-art.html',
    publisher: 'Architectural Services Department (ArchSD)',
    evidence: 'ArchSD project summary: added a new top floor (The Hall / Harbour Gallery) with 270-degree panoramic glass walls, a new wing, undulating multi-dimensional cement-panel facade inspired by Victoria Harbour ripples, and transparent ground-floor entrances.',
  }),
]);

export function artMuseumTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([ART_MUSEUM_SITE], x, z, rawHeight, padHeight);
}
