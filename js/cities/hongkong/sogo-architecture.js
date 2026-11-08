// East Point Centre / SOGO Causeway Bay. © OpenStreetMap contributors, ODbL 1.0.
import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
const source = (id, version, tags, coords) => authoredOsmSource({ id, version, tags,
  geometry: coords.map(([lon,lat]) => ({lon,lat})),
  evidence: 'OSM mapped outline; floor heights and facade treatment are photo-directed approximations, not surveyed plans.' });
export const SOGO_OUTLINE_SOURCE = source(294141091, 8, {building:'commercial','building:levels':'23',name:'東角中心 East Point Centre','addr:housenumber':'555','addr:street':'軒尼詩道 Hennessy Road'}, [
[114.1847546,22.2802914],[114.1847711,22.2803143],[114.1847598,22.2803449],[114.1846607,22.2806128],[114.1845538,22.2806090],[114.1842425,22.2805978],[114.1837900,22.2805789],[114.1837970,22.2804347],[114.1838227,22.2804363],[114.1838306,22.2802563],[114.1839427,22.2802605],[114.1842570,22.2802725],[114.1846588,22.2802878],[114.1847142,22.2802899],[114.1847546,22.2802914]]);
export const SOGO_TOWER_SOURCE = source(198586269,6,{'building:part':'retail','building:levels':'23','building:min_level':'4',fixme:'check min level'},[
[114.1839213,22.2805136],[114.1839291,22.2802759],[114.1839427,22.2802605],[114.1842570,22.2802725],[114.1846588,22.2802878],[114.1846863,22.2803175],[114.1846742,22.2804856],[114.1846651,22.2804933],[114.1846471,22.2805085],[114.1844292,22.2805007],[114.1842672,22.2804948],[114.1842376,22.2804639],[114.1842400,22.2803961],[114.1842003,22.2803944],[114.1841912,22.2805241],[114.1839213,22.2805136]]);
export const SOGO_REAR_SOURCE = source(220977125,3,{'building:part':'retail','building:levels':'15','building:min_level':'4',fixme:'check min level'},[
[114.1844292,22.2805007],[114.1844277,22.2805522],[114.1844480,22.2805706],[114.1846419,22.2805770],[114.1846636,22.2805599],[114.1846651,22.2804933],[114.1846471,22.2805085],[114.1844292,22.2805007]]);
export const SOGO_SITE = makeAuthoredSite('sogoCausewayBay','崇光百貨','SOGO Causeway Bay',SOGO_OUTLINE_SOURCE,{height:78,levels:23});
export const SOGO_TOWER = makeAuthoredSite('eastPointTower','東角中心','East Point Centre',SOGO_TOWER_SOURCE,{height:78,levels:23});
export const SOGO_REAR = makeAuthoredSite('eastPointRear','東角中心後翼','East Point Centre rear wing',SOGO_REAR_SOURCE,{height:54,levels:15});
// Surface door nodes, OSM way 294141091. D1 / D2 are separate metro escalator entrances.
export const SOGO_ENTRANCES = Object.freeze([
  Object.freeze({id:7060166416,lon:114.1847142,lat:22.2802899,kind:'main'}),
  Object.freeze({id:14352183520,lon:114.1847598,lat:22.2803449,kind:'main'}),
  Object.freeze({id:7060166415,lon:114.1845538,lat:22.2806090,kind:'secondary'}),
]);
