import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
export const WINDSOR_MALL_SOURCE=authoredOsmSource({id:171882809,version:6,sourceTimestamp:'2026-07-29T06:26:02Z',tags:{building:'yes','building:levels':'5',shop:'mall',name:'皇室堡 Windsor House'},geometry:[
[114.1861039,22.2805415],[114.1860866,22.2805349],[114.1860166,22.2805123],[114.1860216,22.2804997],[114.1861664,22.2801090],[114.1862023,22.2800071],[114.1866065,22.2801320],[114.1869201,22.2802304],[114.1868939,22.2803016],[114.1867639,22.2806688],[114.1866600,22.2807157],[114.1864152,22.2806396],[114.1862633,22.2805923],[114.1862005,22.2805725],[114.1861337,22.2805505],[114.1861039,22.2805415]
].map(([lon,lat])=>({lon,lat}))});
export const WINDSOR_TOWER_SOURCE=authoredOsmSource({id:149401356,version:8,sourceTimestamp:'2024-11-17T21:19:24Z',tags:{building:'office','building:levels':'42',height:'140',name:'皇室大廈安達人壽大樓 Chubb Tower, Windsor House'},geometry:[
[114.1862005,22.2805725],[114.1863204,22.2802422],[114.1863983,22.2802676],[114.1865838,22.2801906],[114.1866065,22.2801320],[114.1869201,22.2802304],[114.1868939,22.2803016],[114.1862633,22.2805923],[114.1862005,22.2805725]
].map(([lon,lat])=>({lon,lat}))});
export const WINDSOR_MALL=makeAuthoredSite('windsorMall','皇室堡','Windsor House',WINDSOR_MALL_SOURCE,{height:26,levels:5});
export const WINDSOR_TOWER=makeAuthoredSite('windsorTower','皇室大廈','Chubb Tower',WINDSOR_TOWER_SOURCE,{height:140,levels:42});
