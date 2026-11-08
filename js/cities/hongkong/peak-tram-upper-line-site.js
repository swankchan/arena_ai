import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
import {LOOP_END,loopPoint} from './peak-tram-passing-loop-site.js';
import {hongKongTerrainHeight} from './terrain.js';

const route=PEAK_TRAM_PROFILE.routes.A;
export const UPPER_LINE_START=LOOP_END;
export const UPPER_LINE_END=route.find(p=>p.id==='n9628742368').s;
export function upperLinePoint(s){
 const d=Math.max(UPPER_LINE_START,Math.min(UPPER_LINE_END,s));let i=route.findIndex(p=>p.s>=d);i=Math.max(1,i);const a=route[i-1],b=route[i],t=(d-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);
 return {s:d,x:a.x+dx*t,y:a.y+(b.y-a.y)*t,z:a.z+dz*t,ux:dx/l,uz:dz/l,nx:-dz/l,nz:dx/l};
}
export const UPPER_LINE_POINTS=Object.freeze([upperLinePoint(UPPER_LINE_START),...route.filter(p=>p.s>UPPER_LINE_START&&p.s<UPPER_LINE_END).map(p=>upperLinePoint(p.s)),upperLinePoint(UPPER_LINE_END)]);
const beginA=upperLinePoint(UPPER_LINE_START),beginB=loopPoint('B',UPPER_LINE_START);
export const INITIAL_BRANCH_OFFSET=(beginB.x-beginA.x)*beginA.nx+(beginB.z-beginA.z)*beginA.nz;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// OSM branch separation is not accurate enough to be used as a gauge. On the
// historic upper section infer a shared central rail from the published 3-rail
// layout, then return to 2 rails before the upper curve. Not a surveyed switch.
export function upperBranchOffset(s){
 if(s<=675)return INITIAL_BRANCH_OFFSET+(1.524-INITIAL_BRANCH_OFFSET)*smooth((s-UPPER_LINE_START)/30);
 if(s<820)return 1.524;
 if(s<840)return 1.524*(1-smooth((s-820)/20));
 return 0;
}
export function upperLineCuts(){
 const rects=[];
 for(let i=1;i<UPPER_LINE_POINTS.length;i++){
  const a=UPPER_LINE_POINTS[i-1],b=UPPER_LINE_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,nx=-uz,nz=ux;
  const off=Math.max(upperBranchOffset(a.s),upperBranchOffset(b.s)),shift=off/2,hz=1.65+off/2,hx=l/2+.12,cx=(a.x+b.x)/2+nx*shift,cz=(a.z+b.z)/2+nz*shift;
  let intrudes=false;for(const t of [0,.5,1])for(const f of [-1,0,1]){const x=a.x+dx*t+nx*(shift+hz*f),z=a.z+dz*t+nz*(shift+hz*f),y=a.y+(b.y-a.y)*t;if(hongKongTerrainHeight(x,z)-.08>y-.27)intrudes=true;}
  if(!intrudes)continue;
  const ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  rects.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-upper-line'});
 }
 return rects;
}
