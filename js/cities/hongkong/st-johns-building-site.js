import {authoredOsmSource,makeAuthoredSite} from './authored-landmark-site.js';
// © OpenStreetMap contributors, way 179091496 version 4, ODbL 1.0.
const rows=[[1894286392,114.1593508,22.2778168],[13329898996,114.1593853,22.2777463],[1894286389,114.1594042,22.2777076],[1894286384,114.1591290,22.2775922],[13329898997,114.1591095,22.2776321],[1894286387,114.1590756,22.2777013],[1894286392,114.1593508,22.2778168]];
export const ST_JOHNS_SOURCE=authoredOsmSource({id:179091496,version:4,sourceTimestamp:'2025-11-25T08:39:57Z',tags:{building:'office',name:"St. John's Building",'building:levels':'23'},geometry:rows.map(([id,lon,lat])=>({id,lon,lat}))});
export const ST_JOHNS_SITE=makeAuthoredSite('st-johns',"聖約翰大廈", "St. John's Building",ST_JOHNS_SOURCE,{levels:22});
// Estimated from 21 repeated office courses, not a published surveyed height.
export const ST_JOHNS_OFFICE_FLOORS=21, ST_JOHNS_PILOTIS_HEIGHT=8.3, ST_JOHNS_FLOOR_HEIGHT=3.15, ST_JOHNS_CROWN_HEIGHT=4.0;
export const ST_JOHNS_HEIGHT=ST_JOHNS_PILOTIS_HEIGHT+ST_JOHNS_OFFICE_FLOORS*ST_JOHNS_FLOOR_HEIGHT+ST_JOHNS_CROWN_HEIGHT;
