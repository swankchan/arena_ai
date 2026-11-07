import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
export const REVENUE_TOWER_SOURCE=authoredOsmSource({id:27087037,version:12,sourceTimestamp:'2024-11-21T15:45:40Z',tags:{building:'civic','building:material':'glass','building:levels':'50',height:'180',name:'稅務大樓 Revenue Tower'},geometry:[
 [114.1720416,22.2799656],[114.1720560,22.2797906],[114.1720704,22.2796156],[114.1720520,22.2795942],[114.1718320,22.2795788],[114.1716120,22.2795634],[114.1715904,22.2795820],[114.1715616,22.2799320],[114.1715800,22.2799534],[114.1720200,22.2799842],[114.1720416,22.2799656]
].map(([lon,lat])=>({lon,lat})),evidence:'OSM v12 footprint and 180 m; published roof 181 m, 49 floors.'});
export const REVENUE_TOWER_HEIGHT=181;
export const REVENUE_TOWER_SITE=makeAuthoredSite('revenueTower','稅務大樓','Revenue Tower',REVENUE_TOWER_SOURCE,{height:REVENUE_TOWER_HEIGHT,levels:49});
