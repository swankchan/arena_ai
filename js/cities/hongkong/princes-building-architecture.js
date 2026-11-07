import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';

export const PRINCES_TOWER_SOURCE = authoredOsmSource({
  "type": "way",
  "id": 107324768,
  "tags": {
    "addr:housename": "置地廣場 LANDMARK",
    "addr:housename:en": "LANDMARK",
    "addr:housename:zh": "置地廣場",
    "addr:housenumber": "10",
    "addr:street": "遮打道 Chater Road",
    "addr:street:en": "Chater Road",
    "addr:street:zh": "遮打道",
    "addr:unit": "太子大廈 Prince's Building",
    "addr:unit:en": "Prince's Building",
    "addr:unit:zh": "太子大廈",
    "building": "office",
    "building:colour": "white",
    "building:function": "tower",
    "building:levels": "29",
    "building:material": "concrete",
    "building:min_level": "5",
    "location": "podium",
    "name": "太子大廈 Prince's Building",
    "name:en": "Prince's Building",
    "name:zh": "太子大廈",
    "roof:material": "concrete",
    "wikidata": "Q7243728",
    "wikimedia_commons": "Category:Prince's Building",
    "wikipedia": "zh:太子大廈"
  },
  "geometry": [
    {
      "lat": 22.2813853,
      "lon": 114.1594139
    },
    {
      "lat": 22.2814458,
      "lon": 114.1594323
    },
    {
      "lat": 22.2815376,
      "lon": 114.159079
    },
    {
      "lat": 22.2814771,
      "lon": 114.1590606
    },
    {
      "lat": 22.2814832,
      "lon": 114.1590372
    },
    {
      "lat": 22.2810654,
      "lon": 114.1589104
    },
    {
      "lat": 22.2810593,
      "lon": 114.1589338
    },
    {
      "lat": 22.2810025,
      "lon": 114.1589166
    },
    {
      "lat": 22.2809107,
      "lon": 114.1592699
    },
    {
      "lat": 22.2809675,
      "lon": 114.1592871
    },
    {
      "lat": 22.2809615,
      "lon": 114.1593105
    },
    {
      "lat": 22.2813792,
      "lon": 114.1594373
    },
    {
      "lat": 22.2813853,
      "lon": 114.1594139
    }
  ],
  "sourceTimestamp": "2026-10-29T21:21:26Z",
  "evidence": "Geofabrik Hong Kong OSM footprint; facade and dimensions are photo-directed."
});
export const PRINCES_PODIUM_SOURCE = authoredOsmSource({
  "type": "way",
  "id": 42293788,
  "tags": {
    "addr:housename": "置地廣場 LANDMARK",
    "addr:housename:en": "LANDMARK",
    "addr:housename:zh": "置地廣場",
    "addr:housenumber": "10",
    "addr:street": "遮打道 Chater Road",
    "addr:street:en": "Chater Road",
    "addr:street:zh": "遮打道",
    "addr:unit": "置地太子 LANDMARK PRINCE'S",
    "addr:unit:en": "LANDMARK PRINCE'S",
    "addr:unit:zh": "置地太子",
    "building": "retail",
    "building:colour": "#DDD5CC",
    "building:levels": "5",
    "building:levels:underground": "1",
    "building:material": "concrete",
    "layer": "1",
    "mall": "part",
    "name": "置地太子 LANDMARK PRINCE'S",
    "name:en": "LANDMARK PRINCE'S",
    "name:zh": "置地太子",
    "name:zh-Hans": "置地太子",
    "name:zh-Hant": "置地太子",
    "roof:material": "grass",
    "shop": "mall",
    "wikidata": "Q7243728",
    "wikimedia_commons": "Category:Prince's Building",
    "wikipedia": "zh:太子大廈"
  },
  "geometry": [
    {
      "lat": 22.2809821,
      "lon": 114.1588272
    },
    {
      "lat": 22.280914,
      "lon": 114.1590893
    },
    {
      "lat": 22.2808502,
      "lon": 114.1593347
    },
    {
      "lat": 22.2808998,
      "lon": 114.1593497
    },
    {
      "lat": 22.2811835,
      "lon": 114.1594358
    },
    {
      "lat": 22.2814625,
      "lon": 114.1595205
    },
    {
      "lat": 22.2815944,
      "lon": 114.159013
    },
    {
      "lat": 22.2813175,
      "lon": 114.158929
    },
    {
      "lat": 22.2812343,
      "lon": 114.1589037
    },
    {
      "lat": 22.2809821,
      "lon": 114.1588272
    }
  ],
  "sourceTimestamp": "2026-10-29T21:21:26Z",
  "evidence": "Geofabrik Hong Kong OSM footprint; facade and dimensions are photo-directed."
});
export const PRINCES_TOWER = makeAuthoredSite('princesTower','太子大廈',"Prince's Building",PRINCES_TOWER_SOURCE,{height:110,levels:29});
export const PRINCES_PODIUM = makeAuthoredSite('princesPodium','置地太子',"LANDMARK PRINCE'S",PRINCES_PODIUM_SOURCE,{height:20,levels:5});
export const PRINCES_HEIGHT_ESTIMATE = 110; // CTBUH estimate, not a surveyed height.
export const PRINCES_OFFICE_COURSES = 24; // photo-directed, floor numbering differs across sources.
