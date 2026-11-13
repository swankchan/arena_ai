import { authoredOsmSource, makeAuthoredSite, authoredTerrainHeightAt } from './authored-landmark-site.js';

// © OpenStreetMap contributors, way 99148524 version 16, ODbL 1.0.
// Hong Kong Museum of History (HKMH), 100 Chatham Road South, Tsim Sha Tsui East.
// Opened in 1998 at its current dedicated complex adjacent to the Hong Kong Science Museum.
// Renowned for its comprehensive 'Hong Kong Story' permanent exhibition, stepped terracotta
// ceramic volumes, monumental curved barrel vaults, and amphitheatre piazza.
export const HISTORY_MUSEUM_ROWS = Object.freeze([
  [22.3015748, 114.1769371],
  [22.3015984, 114.1769670],
  [22.3017132, 114.1768792],
  [22.3017941, 114.1769176],
  [22.3018579, 114.1769882],
  [22.3018709, 114.1769768],
  [22.3018876, 114.1769904],
  [22.3019224, 114.1769929],
  [22.3019566, 114.1770033],
  [22.3019890, 114.1770206],
  [22.3020174, 114.1770405],
  [22.3020453, 114.1770670],
  [22.3020657, 114.1770955],
  [22.3020782, 114.1770831],
  [22.3021120, 114.1770945],
  [22.3021464, 114.1771072],
  [22.3021780, 114.1771243],
  [22.3022109, 114.1771458],
  [22.3022395, 114.1771723],
  [22.3022655, 114.1772021],
  [22.3022837, 114.1771944],
  [22.3023262, 114.1772089],
  [22.3023657, 114.1772285],
  [22.3024022, 114.1772529],
  [22.3024352, 114.1772813],
  [22.3024662, 114.1773156],
  [22.3024973, 114.1773608],
  [22.3025221, 114.1774111],
  [22.3025398, 114.1774654],
  [22.3025385, 114.1775143],
  [22.3023896, 114.1776568],
  [22.3024120, 114.1776982],
  [22.3024148, 114.1777226],
  [22.3024114, 114.1777468],
  [22.3024022, 114.1777692],
  [22.3023877, 114.1777881],
  [22.3023683, 114.1778026],
  [22.3023459, 114.1778107],
  [22.3023223, 114.1778117],
  [22.3022994, 114.1778055],
  [22.3022594, 114.1777877],
  [22.3021843, 114.1778511],
  [22.3021576, 114.1778136],
  [22.3021414, 114.1778397],
  [22.3018761, 114.1778241],
  [22.3018187, 114.1778775],
  [22.3016662, 114.1780260],
  [22.3015367, 114.1778701],
  [22.3014216, 114.1777442],
  [22.3017189, 114.1774552],
  [22.3015553, 114.1772647],
  [22.3013204, 114.1769700],
  [22.3014465, 114.1768541],
  [22.3015229, 114.1769520],
  [22.3015460, 114.1769279],
  [22.3015392, 114.1769218],
  [22.3015320, 114.1769043],
  [22.3015327, 114.1768852],
  [22.3015412, 114.1768684],
  [22.3015558, 114.1768574],
  [22.3015731, 114.1768546],
  [22.3015897, 114.1768603],
  [22.3016024, 114.1768733],
  [22.3016085, 114.1768910],
  [22.3016073, 114.1769081],
  [22.3015999, 114.1769232],
  [22.3015874, 114.1769339],
  [22.3015748, 114.1769371],
]);

export const HISTORY_MUSEUM_OSM_SOURCE = authoredOsmSource({
  id: 99148524,
  version: 16,
  tags: {
    'addr:housename': '香港歷史博物館 Hong Kong Museum of History',
    'addr:housenumber': '100',
    'addr:street': '漆咸道南 Chatham Road South',
    'addr:street:en': 'Chatham Road South',
    'addr:street:zh': '漆咸道南',
    building: 'yes',
    museum: 'history',
    name: '香港歷史博物館 Hong Kong Museum of History',
    'name:en': 'Hong Kong Museum of History',
    'name:zh': '香港歷史博物館',
    operator: '康樂及文化事務署 Leisure and Cultural Services Department',
    'operator:en': 'Leisure and Cultural Services Department',
    'operator:zh': '康樂及文化事務署',
    tourism: 'museum',
    wikidata: 'Q1626931',
    wikipedia: 'zh:香港歷史博物館',
  },
  geometry: HISTORY_MUSEUM_ROWS.map(([lat, lon]) => ({ lat, lon })),
  evidence: 'OSM way 99148524 (version 16). Surveyed 68-node perimeter at 100 Chatham Road South, Tsim Sha Tsui East.',
});

export const HISTORY_MUSEUM_SITE = makeAuthoredSite(
  'historyMuseum', '香港歷史博物館', 'Hong Kong Museum of History', HISTORY_MUSEUM_OSM_SOURCE,
  { levels: 4, height: 22, role: 'museum', evidence: 'Surveyed 68-node perimeter in Tsim Sha Tsui East. Postmodern terracotta stepped blocks, curved barrel vaults, and amphitheatre piazza.' },
);

export const HISTORY_MUSEUM_PAD_HEIGHT = 6.2;
export const HISTORY_MUSEUM_ROOF_HEIGHT = 18.5;
export const HISTORY_MUSEUM_VAULT_HEIGHT = 22.8;

export const HISTORY_MUSEUM_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({
    url: 'https://hk.history.museum/en/web/mh/about-us/introduction.html',
    publisher: 'Hong Kong Museum of History / LCSD',
    evidence: 'Official museum overview: established in 1975, moved to current Chatham Road South building in 1998, 17,500 sq m complex housing "The Hong Kong Story" and special exhibition galleries.',
  }),
  Object.freeze({
    url: 'https://www.lcsd.gov.hk/en/mo/aboutus/facilities/hkmh.html',
    publisher: 'Leisure and Cultural Services Department',
    evidence: 'Facility description: stepped terracotta-and-pink tiled masonry, central outdoor amphitheatre courtyard connecting with Science Museum, and monumental curved barrel-vault roofs.',
  }),
]);

export function historyMuseumTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([HISTORY_MUSEUM_SITE], x, z, rawHeight, padHeight);
}
