import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// © OpenStreetMap contributors, way 107497695 version 4, ODbL 1.0.
// St. John's Cathedral, 4-8 Garden Road: Anglican, consecrated 1849, extended 1873, Declared Monument since 1996.
const CATHEDRAL_ROWS = [
  [22.2788195, 114.1597862], [22.2787263, 114.1599041], [22.2785584, 114.1597491], [22.2787417, 114.1595172],
  [22.2787708, 114.1595441], [22.2788478, 114.1594466], [22.2788768, 114.1594733], [22.2789230, 114.1594149],
  [22.2789748, 114.1594627], [22.2789320, 114.1595168], [22.2789619, 114.1595445], [22.2788807, 114.1596472],
  [22.2789370, 114.1596992], [22.2788727, 114.1597805], [22.2788477, 114.1598122], [22.2788195, 114.1597862],
];

export const ST_JOHNS_CATHEDRAL_SOURCE = authoredOsmSource({
  id: 107497695,
  version: 4,
  tags: {
    'addr:housenumber': '4-8',
    'addr:street': '花園道 Garden Road',
    amenity: 'place_of_worship',
    building: 'yes',
    'building:levels': '3',
    construction_date: '1849',
    denomination: 'anglican',
    heritage: '3',
    name: "聖約翰座堂 St. John's Cathedral",
    'name:en': "St. John's Cathedral",
    'name:zh': '聖約翰座堂',
    protection_title: '法定古蹟 Declared Monument',
    religion: 'christian',
    wikidata: 'Q2942473',
    wikipedia: "en:St John's Cathedral (Hong Kong)",
  },
  geometry: CATHEDRAL_ROWS.map(([lat, lon]) => ({ lat, lon })),
});

// The OSM way traces the whole precinct outline: nave, the 1873 south extension and the north transept. It is the
// ground truth for where the building stands. Each volume below is placed inside it from the published plan and
// photographs and is an estimate, not a surveyed drawing.
export const ST_JOHNS_CATHEDRAL_SITE = makeAuthoredSite(
  'st-johns-cathedral', '聖約翰座堂', "St. John's Cathedral", ST_JOHNS_CATHEDRAL_SOURCE,
  { levels: 1, role: 'place-of-worship' },
);

// Presentation dimensions. The published sources state a single storey of three levels and no surveyed height, so
// every number here is an estimate drawn to photographs. Nothing here claims a measured elevation.
export const ST_JOHNS_CATHEDRAL = Object.freeze({
  // The nave runs along the precinct's long axis, which is 36.9 degrees off +x in game space.
  rotation: (36.9 * Math.PI) / 180,
  naveLength: 30.0, naveWidth: 12.6, naveWallHeight: 8.4, naveRidgeHeight: 13.2,
  aisleWidth: 4.2, aisleHeight: 6.4,
  transeptLength: 8.6, transeptWidth: 11.0,
  chancelLength: 8.4, chancelWidth: 11.4, chancelHeight: 9.6,
  // West tower: square, four corner pinnacles, "VR" on the west face; 1849 walls with the 1850 bell stage above.
  towerWidth: 6.6, towerHeight: 17.6, towerPinnacleHeight: 3.4,
  porchWidth: 5.2, porchHeight: 4.6,
  // Lancet spacing along the nave and the buttress rhythm between them.
  bayWidth: 3.4, buttressDepth: 0.75,
});

// 長江公園 Cheung Kong Park: OSM way 295407287, `leisure=park` with `level=3` because the garden is laid out over the
// terraced third level of the Cheung Kong Center podium (1999, Cesar Pelli). The OSM ring is the park boundary as
// mapped; it is a hillside garden of ponds, cascades and winding paths, NOT a single flat deck, so no levelling datum is
// applied to it — the ground keeps the DTM and the planting sits on the natural terraces.
const CHEUNG_KONG_PARK_ROWS = [
  [22.2791272, 114.1598881], [22.2788729, 114.1602054], [22.2790782, 114.1604130], [22.2793790, 114.1600712],
];

export const CHEUNG_KONG_PARK_SOURCE = authoredOsmSource({
  id: 295407287,
  version: null,
  tags: {
    leisure: 'park',
    level: '3',
    name: '長江公園 Cheung Kong Park',
    'name:en': 'Cheung Kong Park',
    'name:zh': '長江公園',
    wikidata: 'Q5094250',
    wikimedia_commons: 'Category:Cheung Kong Park',
    wikipedia: 'en:Cheung Kong Park',
  },
  geometry: CHEUNG_KONG_PARK_ROWS.map(([lat, lon]) => ({ lat, lon })),
});

export const CHEUNG_KONG_PARK_SITE = makeAuthoredSite(
  'cheung-kong-park', '長江公園', 'Cheung Kong Park', CHEUNG_KONG_PARK_SOURCE,
  { levels: 0, role: 'park' },
);

// Park features. The published descriptions agree on ponds and cascades, a rock waterfall and rockery, winding shaded
// paths with benches, dense tree canopy, and retained colonial stone steps and railings. Their exact positions are not
// published, so every position below is an estimate placed inside the OSM ring — never presented as surveyed.
export const CHEUNG_KONG_PARK = Object.freeze({
  pathWidth: 2.2,
  terraceCount: 3,
  pondRadius: 5.4,
  waterfallDrop: 3.6,
  rockeryHeight: 4.8,
  benchCount: 9,
  stairWidth: 2.0,
});

// The garden the sources describe: small, terraced, on the slope between Garden Road and Cheung Kong Park. The terrace
// surface is kept level so an 1849 building does not straddle a 10 m fall; the boundary is presentation, not survey.
export const ST_JOHNS_GARDEN = Object.freeze({
  pathWidth: 2.6,
  wallHeight: 1.35,
  hedgeHeight: 1.9,
  // Ground cover inside the precinct, drawn only where it does not touch the building ring.
  lawnInset: 3.4,
});
