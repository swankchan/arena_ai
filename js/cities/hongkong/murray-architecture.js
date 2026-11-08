import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// OSM way 85320844 v14, © OpenStreetMap contributors, ODbL 1.0.
export const MURRAY_SOURCE=authoredOsmSource({id:85320844,version:14,sourceTimestamp:'2025-01-19T11:52:34Z',tags:{building:'yes',name:'美利尼依格羅酒店 The Murray',tourism:'hotel',rooms:'336'},geometry:[
 [22.2778044,114.1600711],[22.2779787,114.1598500],[22.2783317,114.1601748],[22.2781732,114.1603815],[22.2781600,114.1603937],[22.2778044,114.1600711]
].map(([lat,lon])=>({lat,lon}))});
// Foster + Partners project data: height 93.83m, 51.5 x 31.5m; floor count varies by source.
export const MURRAY_SITE=makeAuthoredSite('murray','美利大廈','The Murray',MURRAY_SOURCE,{height:93.83,levels:25});
// OSM node 12718892293 v3, © OpenStreetMap contributors, ODbL 1.0. The recorded height
// is a map tag, not a current field measurement. Crown and planter dimensions are estimates.
export const MURRAY_CASSIA = Object.freeze({osmId:12718892293,version:3,lat:22.2779993,lon:114.1604069,height:17,circumference:1.13,source:'https://www.openstreetmap.org/node/12718892293'});
