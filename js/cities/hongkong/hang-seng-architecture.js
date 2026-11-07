// HK-B0059. Source: Geofabrik Hong Kong OSM extract, 2026-10-29.
import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
export const HANG_SENG_SOURCE = authoredOsmSource({
  "id": 28825127,
  "type": "way",
  "tags": {
    "addr": "housename",
    "addr:housename": "恒生銀行總行大廈 Hang Seng Bank Headquarters Building",
    "addr:housename:en": "Hang Seng Bank Headquarters Building",
    "addr:housename:zh": "恒生銀行總行大廈",
    "addr:housenumber": "83",
    "addr:street": "德輔道中 Des Voeux Road Central",
    "addr:street:en": "Des Voeux Road Central",
    "addr:street:zh": "德輔道中",
    "building": "commercial",
    "building:levels": "25",
    "building:min_level": "4",
    "height": "137",
    "layer": "1",
    "name": "恒生銀行總行大廈 Hang Seng Bank Headquarters",
    "name:en": "Hang Seng Bank Headquarters",
    "name:zh": "恒生銀行總行大廈",
    "nohousenumber": "separate",
    "wikidata": "Q11072956",
    "wikimedia_commons": "Category:Hang Seng Bank New Headquarters Building",
    "wikipedia": "en:Hang Seng Bank Headquarters Building"
  },
  "geometry": [
    {
      "lat": 22.2848231,
      "lon": 114.1562561
    },
    {
      "lat": 22.2847824,
      "lon": 114.1562889
    },
    {
      "lat": 22.2846238,
      "lon": 114.156422
    },
    {
      "lat": 22.2845776,
      "lon": 114.1564594
    },
    {
      "lat": 22.2845611,
      "lon": 114.1564656
    },
    {
      "lat": 22.2845444,
      "lon": 114.1564649
    },
    {
      "lat": 22.2845284,
      "lon": 114.1564591
    },
    {
      "lat": 22.2845147,
      "lon": 114.1564486
    },
    {
      "lat": 22.2843979,
      "lon": 114.1562861
    },
    {
      "lat": 22.284389,
      "lon": 114.1562677
    },
    {
      "lat": 22.2843881,
      "lon": 114.156247
    },
    {
      "lat": 22.2843943,
      "lon": 114.1562296
    },
    {
      "lat": 22.2844049,
      "lon": 114.1562159
    },
    {
      "lat": 22.2846505,
      "lon": 114.1560125
    },
    {
      "lat": 22.2846645,
      "lon": 114.1560074
    },
    {
      "lat": 22.2846787,
      "lon": 114.1560079
    },
    {
      "lat": 22.2846917,
      "lon": 114.1560123
    },
    {
      "lat": 22.2847032,
      "lon": 114.15602
    },
    {
      "lat": 22.2848253,
      "lon": 114.1561899
    },
    {
      "lat": 22.2848316,
      "lon": 114.1562072
    },
    {
      "lat": 22.2848326,
      "lon": 114.1562258
    },
    {
      "lat": 22.2848291,
      "lon": 114.1562417
    },
    {
      "lat": 22.2848231,
      "lon": 114.1562561
    }
  ],
  "sourceTimestamp": "2026-10-29T21:21:26Z",
  "evidence": "OSM tower footprint; podium and facade details based on photographs, not surveyed."
});
export const HANG_SENG_SITE = makeAuthoredSite('hangSeng','恒生銀行總行大廈','Hang Seng Bank Headquarters',HANG_SENG_SOURCE,{height:137});
export const HANG_SENG_HEIGHT = 137;
export const HANG_SENG_LEVELS = 27; // Published building data; OSM separately records 25.
export const HANG_SENG_GLASS_EDGES = Object.freeze([0,1,2,12]);
export const HANG_SENG_ENTRANCE_EDGE = 12;
export const HANG_SENG_SOURCES = Object.freeze([
 'https://en.wikipedia.org/wiki/Hang_Seng_Bank_Headquarters_Building',
 'https://www.emporis.com/buildings/120572/hang-seng-bank-building-hong-kong-china',
 'https://commons.wikimedia.org/wiki/File:Hang_Seng_Bank_Headquarters_Building_after_Typhoon_Mangkhut.jpg',
]);
