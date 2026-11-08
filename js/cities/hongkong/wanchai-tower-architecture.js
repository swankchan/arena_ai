import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// OSM way 27087041 v14, © OpenStreetMap contributors, ODbL 1.0.
export const WANCHAI_TOWER_SOURCE=authoredOsmSource({id:27087041,version:14,sourceTimestamp:'2024-11-21T15:45:40Z',tags:{building:'civic','building:levels':'33',height:'137',name:'灣仔政府大樓 Wanchai Tower'},geometry:[
 [114.1721458,22.2802485],[114.1720958,22.2802450],[114.1721086,22.2800890],[114.1721586,22.2800925],[114.1721650,22.2800145],[114.1724180,22.2800322],[114.1726650,22.2800495],[114.1726586,22.2801275],[114.1727086,22.2801310],[114.1726958,22.2802870],[114.1726458,22.2802835],[114.1726405,22.2803485],[114.1723902,22.2803310],[114.1721405,22.2803135],[114.1721458,22.2802485]
].map(([lon,lat])=>({lon,lat})),evidence:'OSM outline and entrances, CTBUH 136.5 m / 32 storeys; photographic facade.'});
export const WANCHAI_TOWER_HEIGHT=136.5;
export const WANCHAI_TOWER_SITE=makeAuthoredSite('wanchaiTower','灣仔政府大樓','Wanchai Tower',WANCHAI_TOWER_SOURCE,{height:WANCHAI_TOWER_HEIGHT,levels:32});
