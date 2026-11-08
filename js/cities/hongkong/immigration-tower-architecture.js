import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// OpenStreetMap way 510722228 v8, © OpenStreetMap contributors, ODbL 1.0.
// Its wikipedia/Commons tags are incorrectly for Court of Final Appeal.
export const IMMIGRATION_TOWER_SOURCE=authoredOsmSource({id:510722228,version:8,sourceTimestamp:'2026-10-01T12:55:32Z',tags:{building:'civic','building:material':'glass','building:levels':'50',height:'180',name:'入境事務大樓 Immigration Tower'},geometry:[
 [114.1727298,22.2799502],[114.1727438,22.2797796],[114.1727578,22.2796090],[114.1727794,22.2795904],[114.1730054,22.2796062],[114.1732314,22.2796220],[114.1732498,22.2796434],[114.1732218,22.2799846],[114.1732002,22.2800032],[114.1727482,22.2799716],[114.1727298,22.2799502]
].map(([lon,lat])=>({lon,lat})),evidence:'OSM v8 footprint/180m; CTBUH 180.8m, 49 floors. OSM entrance node 5382735659 lies at shared edges 0 and 1.'});
export const IMMIGRATION_TOWER_HEIGHT=180.8;
export const IMMIGRATION_TOWER_SITE=makeAuthoredSite('immigrationTower','入境事務大樓','Immigration Tower',IMMIGRATION_TOWER_SOURCE,{height:IMMIGRATION_TOWER_HEIGHT,levels:49});
