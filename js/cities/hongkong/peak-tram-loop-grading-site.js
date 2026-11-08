import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
import {hongKongTerrainHeight} from './terrain.js';
// Provisional terrain fits to the existing unsurveyed rail profile. The ranges
// stop short of sampled roads; bridges retain their existing openings.
export const LOOP_GRADE_START=484,LOOP_GRADE_END=730,LOOP_GRADE_HALF_WIDTH=16;
export const PEAK_TRAM_GRADE_RANGES=Object.freeze([[155,216],[310,323],[346,358],[395,460],[LOOP_GRADE_START,LOOP_GRADE_END]]);
const route=PEAK_TRAM_PROFILE.routes.A;
function sample(s){let i=route.findIndex(p=>p.s>=s);if(i<1)i=1;const a=route[i-1],b=route[i],t=(s-a.s)/(b.s-a.s);return {s,x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t};}
function points(start,end){return [sample(start),...route.filter(p=>p.s>start&&p.s<end),sample(end)];}
export const LOOP_GRADE_POINTS=Object.freeze(points(LOOP_GRADE_START,LOOP_GRADE_END));
export const PEAK_TRAM_GRADE_PATHS=Object.freeze(PEAK_TRAM_GRADE_RANGES.map(([start,end])=>points(start,end)));
export function loopGradeRects(){
 const out=[];for(const path of PEAK_TRAM_GRADE_PATHS)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,hx=l/2+.12,hz=LOOP_GRADE_HALF_WIDTH,cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  out.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-loop-grading'});
 }return out;
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const paths=PEAK_TRAM_GRADE_PATHS.map(path=>({path,box:{minX:Math.min(...path.map(p=>p.x))-17,maxX:Math.max(...path.map(p=>p.x))+17,minZ:Math.min(...path.map(p=>p.z))-17,maxZ:Math.max(...path.map(p=>p.z))+17}}));
export function peakTramLoopGrade(x,z,original=hongKongTerrainHeight(x,z)){
 let nearest=null;
 for(const {path,box} of paths){
  if(x<box.minX||x>box.maxX||z<box.minZ||z>box.maxZ)continue;
  const first=path[0],second=path[1],last=path.at(-1),before=path.at(-2);
  if((x-first.x)*(second.x-first.x)+(z-first.z)*(second.z-first.z)<-.15 || (x-last.x)*(last.x-before.x)+(z-last.z)*(last.z-before.z)>.15)continue;
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i];if(x<Math.min(a.x,b.x)-17||x>Math.max(a.x,b.x)+17||z<Math.min(a.z,b.z)-17||z>Math.max(a.z,b.z)+17)continue;
   const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l2)),ex=x-a.x-dx*t,ez=z-a.z-dz*t,d=Math.hypot(ex,ez);
   if(!nearest||d<nearest.d)nearest={d,s:a.s+(b.s-a.s)*t,y:a.y+(b.y-a.y)*t,start:first.s,end:last.s};
  }
 }
 if(!nearest||nearest.d>=LOOP_GRADE_HALF_WIDTH)return original;
 // At the two ends return to the original narrow track cut; the May Road
 // platform requires 4 m of clear ground on its positive side.
 const startWidth=nearest.start===LOOP_GRADE_START?4.1:1.65;
 const expand=Math.min(smooth((nearest.s-nearest.start)/15),smooth((nearest.end-nearest.s)/15));
 const inner=startWidth+(7-startWidth)*expand,outer=startWidth+.35+(16-startWidth-.35)*expand;
 const across=1-smooth((nearest.d-inner)/(outer-inner));
 const target=Math.min(original,nearest.y-.32);
 return original+(target-original)*across;
}
