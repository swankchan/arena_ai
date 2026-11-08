import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
import {PEAK_UPPER_STATION as ST} from './peak-upper-station-site.js';
import {PEAK_TOWER_SITE as SITE} from './peak-tower-architecture.js';
import {authoredLocalToWorld} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';

const route=PEAK_TRAM_PROFILE.routes.A;
const endpoint=route.find(p=>p.id==='n2525250104'), target=authoredLocalToWorld(SITE,ST.x1,ST.trackZ);
export const SUMMIT_APPROACH_START=1116;
export const SUMMIT_APPROACH_END=route.find(p=>p.id==='n2525250104').s;
export function summitApproachPoint(s){
 const d=Math.max(SUMMIT_APPROACH_START,Math.min(SUMMIT_APPROACH_END,s));let i=route.findIndex(p=>p.s>=d);i=Math.max(1,i);const a=route[i-1],b=route[i],t=(d-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);
 const blend=Math.max(0,Math.min(1,(d-1217)/(SUMMIT_APPROACH_END-1217)));
 return {s:d,x:a.x+dx*t+(target.x-endpoint.x)*blend,y:a.y+(b.y-a.y)*t,z:a.z+dz*t+(target.z-endpoint.z)*blend,ux:dx/l,uz:dz/l,nx:-dz/l,nz:dx/l};
}
export const SUMMIT_APPROACH_POINTS=Object.freeze([summitApproachPoint(SUMMIT_APPROACH_START),...route.filter(p=>p.s>SUMMIT_APPROACH_START&&p.s<SUMMIT_APPROACH_END).map(p=>summitApproachPoint(p.s)),summitApproachPoint(SUMMIT_APPROACH_END)]);
export function summitApproachBranchOffset(){return 0;}
export function summitApproachCuts(){
 const rects=[];
 for(let i=1;i<SUMMIT_APPROACH_POINTS.length;i++){
  const a=SUMMIT_APPROACH_POINTS[i-1],b=SUMMIT_APPROACH_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,nx=-uz,nz=ux;
  const off=Math.max(summitApproachBranchOffset(a.s),summitApproachBranchOffset(b.s)),shift=off/2,hz=1.65+off/2,hx=l/2+.12,cx=(a.x+b.x)/2+nx*shift,cz=(a.z+b.z)/2+nz*shift;
  let intrudes=false;for(const t of [0,.5,1])for(const f of [-1,0,1]){const x=a.x+dx*t+nx*(shift+hz*f),z=a.z+dz*t+nz*(shift+hz*f),y=a.y+(b.y-a.y)*t;if(hongKongTerrainHeight(x,z)-.08>y-.27)intrudes=true;}
  if(!intrudes)continue;
  const ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  rects.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-summit-approach'});
 }
 return rects;
}
