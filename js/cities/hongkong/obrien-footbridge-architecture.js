import { projectHongKongLonLat } from './authored-landmark-site.js';
// OSM ways 148784104 v12, 963983432 v1 and 148858993 v2; © OSM contributors, ODbL.
// Deck and stair elevations/widths are photo- and vehicle-clearance estimates, not surveyed.
export const OBRIEN_SOURCE = Object.freeze({way:148784104,version:12,stair:148858993,stairVersion:2,link:963983432});
const ll = ([lat,lon]) => {const [x,z]=projectHongKongLonLat(lon,lat);return Object.freeze({x,z});};
export const OBRIEN_ROUTE = Object.freeze([
 [22.2773724,114.1732880],[22.2774447,114.1733117],[22.2779227,114.1732572],
 [22.2779536,114.1732532],[22.2783235,114.1732104],[22.2784753,114.1731911],
 [22.2785363,114.1731837],[22.2786983,114.1731642],[22.2790857,114.1731193],
 [22.2795153,114.1730680],[22.2795255,114.1730669],[22.2795369,114.1730657],
 [22.2795540,114.1730635],[22.2796098,114.1730563]
].map(ll));
export const OBRIEN_STAIR = Object.freeze({bottom:ll([22.2790600,114.1728600]),top:ll([22.2790825,114.1730874]),junction:OBRIEN_ROUTE[8]});
export const OBRIEN_DECK_HEIGHT = 12.5, OBRIEN_WIDTH=7.2, OBRIEN_SLAB=.55, OBRIEN_STAIR_WIDTH=2.4;
export function segmentProjection(p,a,b) {
 const dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len2));
 return {t,distance:Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)};
}
// Returns deck/stair surface only near that layer; users on the road underneath
// do not snap upstairs. Stairs interpolate from the local terrain-height datum.
export function obrienFootbridgeGroundHeight(x,z,current,referenceY,stairBottomHeight){
 const p={x,z},q=segmentProjection(p,OBRIEN_STAIR.bottom,OBRIEN_STAIR.top);
 if(q.distance<=OBRIEN_STAIR_WIDTH/2){const y=stairBottomHeight+(OBRIEN_DECK_HEIGHT-stairBottomHeight)*q.t;
  if(referenceY>=y-.8 && referenceY<=y+2.5)return y;
 }
 const segments=[...OBRIEN_ROUTE.slice(0,-1).map((a,i)=>[a,OBRIEN_ROUTE[i+1]]),[OBRIEN_STAIR.top,OBRIEN_STAIR.junction]];
 if(referenceY>=OBRIEN_DECK_HEIGHT-.8 && referenceY<=OBRIEN_DECK_HEIGHT+2.5 && segments.some(([a,b])=>segmentProjection(p,a,b).distance<=OBRIEN_WIDTH/2))return OBRIEN_DECK_HEIGHT;
 return current;
}
