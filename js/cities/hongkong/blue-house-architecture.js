import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// Source: OSM way 405793051 v5, © OpenStreetMap contributors, ODbL.
export const BLUE_HOUSE_SOURCE=authoredOsmSource({
  "type": "way",
  "id": 405793051,
  "tags": {
    "addr:housenumber": "72-74",
    "addr:street": "石水渠街 Stone Nullah Lane",
    "building": "residential",
    "building:levels": "4",
    "name": "藍屋 Blue House",
    "name:en": "Blue House",
    "name:zh": "藍屋",
    "wikidata": "Q4929255",
    "wikimedia_commons": "Category:Blue House, Hong Kong",
    "wikipedia": "en:Blue House (Hong Kong)"
  },
  "geometry": [
    {
      "lat": 22.2739801,
      "lon": 114.1742659
    },
    {
      "lat": 22.2739428,
      "lon": 114.1742467
    },
    {
      "lat": 22.2739441,
      "lon": 114.1742083
    },
    {
      "lat": 22.2739267,
      "lon": 114.1742012
    },
    {
      "lat": 22.2739103,
      "lon": 114.1741944
    },
    {
      "lat": 22.2739026,
      "lon": 114.1742163
    },
    {
      "lat": 22.2738834,
      "lon": 114.1742084
    },
    {
      "lat": 22.273886,
      "lon": 114.1742011
    },
    {
      "lat": 22.2738925,
      "lon": 114.1741827
    },
    {
      "lat": 22.2738685,
      "lon": 114.1741728
    },
    {
      "lat": 22.2738622,
      "lon": 114.1741907
    },
    {
      "lat": 22.2738593,
      "lon": 114.1741988
    },
    {
      "lat": 22.2738224,
      "lon": 114.1741835
    },
    {
      "lat": 22.2738312,
      "lon": 114.1741584
    },
    {
      "lat": 22.2738169,
      "lon": 114.1741524
    },
    {
      "lat": 22.2738054,
      "lon": 114.1741477
    },
    {
      "lat": 22.2738385,
      "lon": 114.174054
    },
    {
      "lat": 22.2739805,
      "lon": 114.1741127
    },
    {
      "lat": 22.2739801,
      "lon": 114.1742659
    }
  ],
  "version": 5,
  "sourceTimestamp": "2023-10-21T07:19:49Z"
});
export const BLUE_HOUSE=makeAuthoredSite('blueHouse','藍屋','Blue House',BLUE_HOUSE_SOURCE,{height:15.2,levels:4});
export const BLUE_HOUSE_FRONT_EDGE=16; // Stone Nullah Lane, established from OSM and street photos
