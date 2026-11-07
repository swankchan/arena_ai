import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// © OpenStreetMap contributors, ODbL. OSM API checked 2026-11-07.
// Retain the named commercial outline and separately mapped office/roof parts.
const makeSource=(id,version,coords,tags)=>authoredOsmSource({id,version,sourceTimestamp:'2024-05-19T03:11:03Z',geometry:coords.map(([lat,lon])=>({lat,lon})),tags,evidence:'OpenStreetMap building/part outline, not a surveyed architectural plan.'});
export const ENTERTAINMENT_PODIUM_SOURCE=makeSource(233135905,6,[
 [22.2813667,114.1565741],[22.2812892,114.1565126],[22.2812132,114.1564523],[22.2812534,114.1564188],
 [22.2812566,114.1564161],[22.2812598,114.1564135],[22.2812630,114.1564108],[22.2813165,114.1563663],
 [22.2814865,114.1562248],[22.2814896,114.1562291],[22.2815088,114.1562561],[22.2815632,114.1563324],
 [22.2815981,114.1563814],[22.2815716,114.1566028],[22.2814691,114.1565885],[22.2813667,114.1565741],
],{building:'commercial',name:'娛樂行 Entertainment Building','addr:housenumber':'30','addr:street':"Queen's Road Central"});
export const ENTERTAINMENT_TOWER_SOURCE=makeSource(233135920,5,[
 [22.2814896,114.1562291],[22.2815088,114.1562561],[22.2814839,114.1562768],[22.2814658,114.1563024],
 [22.2814620,114.1563342],[22.2814734,114.1563639],[22.2815981,114.1563814],[22.2815716,114.1566028],
 [22.2814691,114.1565885],[22.2813667,114.1565741],[22.2813828,114.1564393],[22.2813592,114.1564198],
 [22.2813297,114.1564157],[22.2813023,114.1564280],[22.2812773,114.1564488],[22.2812581,114.1564218],
 [22.2814896,114.1562291],
],{'building:part':'office',height:'145','building:material':'stone'});
export const ENTERTAINMENT_SETBACK_SOURCE=makeSource(1284550012,1,[
 [22.2815716,114.1566028],[22.2814691,114.1565885],[22.2813667,114.1565741],
 [22.2813828,114.1564393],[22.2813932,114.1563527],[22.2814734,114.1563639],
 [22.2815981,114.1563814],[22.2815716,114.1566028],
],{'building:part':'office',height:'160',min_height:'145'});
export const ENTERTAINMENT_UPPER_SOURCE=makeSource(1284550013,1,[
 [22.2815599,114.1565864],[22.2813818,114.1565615],[22.2814049,114.1563691],[22.2815830,114.1563940],[22.2815599,114.1565864],
],{'building:part':'office',height:'165',min_height:'160'});
export const ENTERTAINMENT_CAP_SOURCE=makeSource(1284550018,1,[
 [22.2814998,114.1565022],[22.2814598,114.1564966],[22.2814650,114.1564533],[22.2815050,114.1564589],[22.2814998,114.1565022],
],{'building:part':'yes',height:'185',min_height:'180'});
export const ENTERTAINMENT_PODIUM=makeAuthoredSite('entertainmentPodium','娛樂行','Entertainment Building',ENTERTAINMENT_PODIUM_SOURCE,{height:15});
export const ENTERTAINMENT_TOWER=makeAuthoredSite('entertainmentTower','娛樂行','Entertainment Building',ENTERTAINMENT_TOWER_SOURCE,{height:145});
export const ENTERTAINMENT_SETBACK=makeAuthoredSite('entertainmentSetback','娛樂行','Entertainment Building',ENTERTAINMENT_SETBACK_SOURCE,{height:160});
export const ENTERTAINMENT_UPPER=makeAuthoredSite('entertainmentUpper','娛樂行','Entertainment Building',ENTERTAINMENT_UPPER_SOURCE,{height:165});
export const ENTERTAINMENT_CAP=makeAuthoredSite('entertainmentCap','娛樂行','Entertainment Building',ENTERTAINMENT_CAP_SOURCE,{height:185});
export const ENTERTAINMENT_HEIGHT=186.5; // CTBUH, confirmed height including crown.
export const ENTERTAINMENT_MAIN_ENTRANCE_NODE=9189030010; // vertices between podium edges 13 and 14
export const ENTERTAINMENT_SOURCE_ENTRANCE_NODES=Object.freeze([9189030008,9189030006,9189030010]);
