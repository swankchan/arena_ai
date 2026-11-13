import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';

// 遮打花園 Chater Garden (Central, Hong Kong)
// © OpenStreetMap contributors, ODbL 1.0. API way version 8, checked 2026-11-07.
export const CHATER_GARDEN_SOURCE = authoredOsmSource({
  "type": "way",
  "id": 148784038,
  "tags": {
    "access": "yes",
    "garden": "municipal",
    "garden:area": "district",
    "garden:style": "urban",
    "importance": "national",
    "leisure": "garden",
    "name": "遮打花園 Chater Garden",
    "name:en": "Chater Garden",
    "name:zh": "遮打花園",
    "name:zh-Hans": "遮打花园",
    "name:zh-Hant": "遮打花園",
    "operation": "government",
    "ownership": "government",
    "wikidata": "Q5087587",
    "wikimedia_commons": "Category:Chater Garden",
    "wikipedia": "en:Chater Garden"
  },
  "geometry": [
    { "lat": 22.281113, "lon": 114.1608828 },
    { "lat": 22.2803857, "lon": 114.1606595 },
    { "lat": 22.2803298, "lon": 114.1606602 },
    { "lat": 22.2802746, "lon": 114.1606864 },
    { "lat": 22.2802336, "lon": 114.1607152 },
    { "lat": 22.2802101, "lon": 114.160734 },
    { "lat": 22.2801741, "lon": 114.1607776 },
    { "lat": 22.2800841, "lon": 114.1611229 },
    { "lat": 22.2799627, "lon": 114.161589 },
    { "lat": 22.2799642, "lon": 114.1616067 },
    { "lat": 22.2799684, "lon": 114.1616276 },
    { "lat": 22.2799724, "lon": 114.1616461 },
    { "lat": 22.279983, "lon": 114.1616721 },
    { "lat": 22.2799991, "lon": 114.1616882 },
    { "lat": 22.2805935, "lon": 114.161854 },
    { "lat": 22.2807145, "lon": 114.1618873 },
    { "lat": 22.2807654, "lon": 114.1618947 },
    { "lat": 22.2807945, "lon": 114.1618893 },
    { "lat": 22.2808249, "lon": 114.1618699 },
    { "lat": 22.2808423, "lon": 114.1618364 },
    { "lat": 22.2808636, "lon": 114.1617831 },
    { "lat": 22.2810733, "lon": 114.1610208 },
    { "lat": 22.281113, "lon": 114.1608828 }
  ],
  "version": 8,
  "sourceTimestamp": "2025-01-19T11:52:34Z",
  "evidence": "OSM municipal garden boundary; interior paths, planting and water features are photo-directed approximations."
});

export const CHATER_GARDEN = makeAuthoredSite('chaterGarden', '遮打花園', 'Chater Garden', CHATER_GARDEN_SOURCE, { role: 'garden' });

export const CHATER_GARDEN_OPENED = '1978-10-20';
export const CHATER_GARDEN_PREDECESSOR = 'Hong Kong Cricket Club (1851–1975)';
export const CHATER_GARDEN_MTR_PORTAL = 'Central Station Exit J2';
export const CHATER_GARDEN_TREE_WALK = 'LCSD Central and Western District Tree Walk — Chater Garden Section';

export const CHATER_GARDEN_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://www.openstreetmap.org/way/148784038',
    evidence: 'OSM way 148784038 version 8: municipal garden boundary tagged leisure=garden, garden=municipal, Q5087587.'
  },
  {
    url: 'https://zh.wikipedia.org/zh-hk/%E9%81%AE%E6%89%93%E8%8A%B1%E5%9C%92',
    evidence: 'Opened 20 October 1978; former Hong Kong Cricket Club grounds (1851–1975); underneath is MTR Central Station and Island Line tunnel; features waterfall pool, pavilions, tree walk, and Exit J2.'
  },
  {
    url: 'https://en.wikipedia.org/wiki/Chater_Garden',
    evidence: 'Named after Sir Catchick Paul Chater; located between Chater Road, Jackson Road, Queensway, and Murray Road.'
  },
  {
    url: 'https://www.lcsd.gov.hk/en/green/treewalk/cw.html',
    evidence: 'Central and Western District Tree Walk includes mature trees and palms in Chater Garden such as Ficus microcarpa, Roystonea regia, and Bombax ceiba.'
  }
]);
