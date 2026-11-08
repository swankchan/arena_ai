import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
import {KENNEDY_BRIDGE_POINTS} from './peak-tram-kennedy-bridge.js';
import {hongKongTerrainHeight} from './terrain.js';
// Experimental vertical alignment, not surveyed. Extends beyond MacDonnell stop to the next mapped node.
const route=PEAK_TRAM_PROFILE.routes.A;
const begin=route.findIndex(p=>p.id===KENNEDY_BRIDGE_POINTS.at(-1).id);
const end=route.findIndex(p=>p.id==='e13329898979-26412146-20-39');
if(begin<0||end<=begin)throw Error('Kennedy approach endpoints missing');
export const KENNEDY_APPROACH_POINTS=Object.freeze(route.slice(begin,end+1));
// Approximate platform footprint at the uphill end of the current approach.
// The OSM stop node is its uphill end for this provisional design, not a survey.
export const MACDONNELL_PLATFORM_START=KENNEDY_APPROACH_POINTS.find(p=>p.s>=247).s;
export const MACDONNELL_PLATFORM_END=KENNEDY_APPROACH_POINTS.find(p=>p.id==='n988059698').s;
export function isMacDonnellPlatformSegment(a,b){return a.s>=MACDONNELL_PLATFORM_START && b.s<=MACDONNELL_PLATFORM_END;}
// Only the fully road-covered core is modelled as a stone vault. Portal edges
// and dimensions are estimated from the scene, not an engineering survey.
export function isMacDonnellBridgeSegment(a,b){return a.s>=220 && b.s<=226.1;}
export function isMagazineGapBridgeSegment(a,b){return a.s>=333.8 && b.s<=339.9;}
export function kennedyApproachCuts(){
 const rects=[];
 for(let i=1;i<KENNEDY_APPROACH_POINTS.length;i++){
  const a=KENNEDY_APPROACH_POINTS[i-1],b=KENNEDY_APPROACH_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,nx=-uz,nz=ux;
  // A corridor is only removed where terrain would intrude on the track deck;
  // elevated portions retain their ordinary ground underneath.
  let intrudes=false;
  for(const t of [0,.5,1])for(const off of [-1.6,0,1.6]){
   const x=a.x+dx*t+nx*off,z=a.z+dz*t+nz*off,y=a.y+(b.y-a.y)*t;
   if(hongKongTerrainHeight(x,z)-.08>y-.30)intrudes=true;
  }
  if(!intrudes)continue;
  const station=isMacDonnellPlatformSegment(a,b),shift=station?1.2:0;
  const cx=(a.x+b.x)/2+nx*shift,cz=(a.z+b.z)/2+nz*shift,hx=l/2+.08,hz=station?2.8:(isMacDonnellBridgeSegment(a,b)||isMagazineGapBridgeSegment(a,b))?1.85:1.6,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  rects.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-kennedy-approach'});
 }
 return rects;
}
