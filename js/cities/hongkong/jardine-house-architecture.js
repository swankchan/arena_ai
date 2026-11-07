import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// OSM way 42293714 v12, © OpenStreetMap contributors, ODbL.
export const JARDINE_HOUSE_SOURCE=authoredOsmSource({
  "type": "way",
  "id": 42293714,
  "tags": {
    "addr:city": "香港 Hong Kong",
    "addr:district": "Central",
    "addr:housenumber": "1",
    "addr:street": "康樂廣場 Connaught Place",
    "architect": "Palmer $ Turner",
    "building": "commercial",
    "building:levels": "53",
    "height": "178.54",
    "landmark": "motor_vehicle",
    "name": "怡和大廈 Jardine House",
    "name:en": "Jardine House",
    "name:zh": "怡和大廈",
    "wikidata": "Q6130456",
    "wikimedia_commons": "Category:Jardine House",
    "wikipedia": "en:Jardine House",
    "window": "yes",
    "window:shape": "circle"
  },
  "geometry": [
    {
      "lat": 22.2829878,
      "lon": 114.1588518
    },
    {
      "lat": 22.2827485,
      "lon": 114.1592681
    },
    {
      "lat": 22.282749,
      "lon": 114.1592968
    },
    {
      "lat": 22.2829379,
      "lon": 114.1594228
    },
    {
      "lat": 22.2829937,
      "lon": 114.15946
    },
    {
      "lat": 22.2830115,
      "lon": 114.159454
    },
    {
      "lat": 22.2831085,
      "lon": 114.1592882
    },
    {
      "lat": 22.2831152,
      "lon": 114.1592768
    },
    {
      "lat": 22.2831546,
      "lon": 114.1592096
    },
    {
      "lat": 22.2831595,
      "lon": 114.1592013
    },
    {
      "lat": 22.2832583,
      "lon": 114.1590324
    },
    {
      "lat": 22.2832516,
      "lon": 114.1590139
    },
    {
      "lat": 22.283072,
      "lon": 114.1588913
    },
    {
      "lat": 22.2830164,
      "lon": 114.1588529
    },
    {
      "lat": 22.2829878,
      "lon": 114.1588518
    }
  ],
  "version": 12,
  "sourceTimestamp": "2026-10-01T12:55:32Z"
});
export const JARDINE_HOUSE=makeAuthoredSite('jardineHouse','怡和大廈','Jardine House',JARDINE_HOUSE_SOURCE,{height:178.54,levels:53});
export const JARDINE_FACES=Object.freeze([{from:0,to:1,columns:11},{from:2,to:4,columns:7},{from:5,to:10,columns:11},{from:11,to:13,columns:7}]);
