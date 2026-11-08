import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
// OSM way 143716612 v11, © OpenStreetMap contributors, ODbL 1.0.
export const PEAK_TOWER_SOURCE=authoredOsmSource({id:143716612,version:11,sourceTimestamp:'2024-09-11T05:12:54Z',tags:{building:'yes',name:'凌霄閣 Peak Tower',shop:'mall'},geometry:[
 [22.2713542,114.1503306],[22.2710968,114.1503037],[22.2711560,114.1496411],[22.2714134,114.1496679],[22.2713542,114.1503306]
].map(([lat,lon])=>({lat,lon}))});
export const PEAK_TOWER_SITE=makeAuthoredSite('peakTower','凌霄閣','Peak Tower',PEAK_TOWER_SOURCE,{height:32,levels:7});
// The operator publishes 396m at the site and 428m at Sky Terrace 428. The detailed dimensions
// and distribution of levels below are photo-directed estimates, not a survey.
export const PEAK_TOWER_BASE=396, PEAK_TOWER_DECK=428;
export const PEAK_TOWER_CORE={halfWidth:22,halfDepth:9.5};
export function peakTowerShellBottom(x) { const t=Math.min(1,Math.abs(x)/34.1);return 17.8+13.4*t*t; }
