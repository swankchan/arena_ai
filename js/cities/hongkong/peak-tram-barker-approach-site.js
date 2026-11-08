import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
import {UPPER_LINE_END} from './peak-tram-upper-line-site.js';
import {hongKongTerrainHeight} from './terrain.js';

const route=PEAK_TRAM_PROFILE.routes.A;
export const BARKER_APPROACH_START=UPPER_LINE_END;
export const BARKER_APPROACH_END=1070;
export function barkerApproachPoint(s){
 const d=Math.max(BARKER_APPROACH_START,Math.min(BARKER_APPROACH_END,s));let i=route.findIndex(p=>p.s>=d);i=Math.max(1,i);const a=route[i-1],b=route[i],t=(d-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);
 return {s:d,x:a.x+dx*t,y:a.y+(b.y-a.y)*t,z:a.z+dz*t,ux:dx/l,uz:dz/l,nx:-dz/l,nz:dx/l};
}
export const BARKER_APPROACH_POINTS=Object.freeze([barkerApproachPoint(BARKER_APPROACH_START),...route.filter(p=>p.s>BARKER_APPROACH_START&&p.s<BARKER_APPROACH_END).map(p=>barkerApproachPoint(p.s)),barkerApproachPoint(BARKER_APPROACH_END)]);
export function barkerApproachBranchOffset(){return 0;}
export function barkerApproachCuts(){
 const rects=[];
 for(let i=1;i<BARKER_APPROACH_POINTS.length;i++){
  const a=BARKER_APPROACH_POINTS[i-1],b=BARKER_APPROACH_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,nx=-uz,nz=ux;
  const off=Math.max(barkerApproachBranchOffset(a.s),barkerApproachBranchOffset(b.s)),shift=off/2,hz=1.65+off/2,hx=l/2+.12,cx=(a.x+b.x)/2+nx*shift,cz=(a.z+b.z)/2+nz*shift;
  let intrudes=false;for(const t of [0,.5,1])for(const f of [-1,0,1]){const x=a.x+dx*t+nx*(shift+hz*f),z=a.z+dz*t+nz*(shift+hz*f),y=a.y+(b.y-a.y)*t;if(hongKongTerrainHeight(x,z)-.08>y-.27)intrudes=true;}
  if(!intrudes)continue;
  const ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  rects.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-barker-approach'});
 }
 return rects;
}
