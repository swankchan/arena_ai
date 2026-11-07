import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// Source geometry is the existing 1976 post office, not the surrounding proposed development.
const geometry = [
 [114.1599687,22.2834452],[114.1598345,22.2832474],[114.1598104,22.2832120],
 [114.1597821,22.2832284],[114.1592915,22.2835136],[114.1591342,22.2836050],
 [114.1591587,22.2836412],[114.1592892,22.2838336],[114.1596753,22.2836130],
 [114.1599687,22.2834452]
].map(([lon,lat])=>({lon,lat}));
export const GPO_SOURCE=authoredOsmSource({id:16281866,version:17,sourceTimestamp:'2026-11-06T07:49:40Z',tags:{'building:levels':'5','building:material':'limestone','building:part':'office',height:'30.1'},geometry,evidence:'OSM office part of the 1976 General Post Office; elevations are tags, not survey.'});
export const GPO_SITE=makeAuthoredSite('generalPostOffice','郵政總局','General Post Office',GPO_SOURCE,{height:30.1,levels:5});
export const GPO_WING_SOURCE=authoredOsmSource({id:184767036,version:5,sourceTimestamp:'2024-10-11T03:43:57Z',tags:{'building:levels':'3','building:material':'limestone','building:part':'office'},geometry:[
 [114.1596753,22.2836130],[114.1597018,22.2836520],[114.1597284,22.2836913],
 [114.1593440,22.2839143],[114.1593158,22.2838728],[114.1592892,22.2838336],[114.1596753,22.2836130]
].map(([lon,lat])=>({lon,lat})),evidence:'OSM three-level office wing; its height is not tagged.'});
export const GPO_WING=makeAuthoredSite('generalPostOfficeWing','郵政總局翼樓','General Post Office wing',GPO_WING_SOURCE,{height:15,levels:3}); // estimated
