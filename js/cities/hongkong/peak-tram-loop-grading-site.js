import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
import {hongKongTerrainHeight} from './terrain.js';
// Experimental grading around the loop, away from sampled road corridors.
// This is a local scene fit to the provisional track, not surveyed earthworks.
export const LOOP_GRADE_START=515,LOOP_GRADE_END=730,LOOP_GRADE_HALF_WIDTH=16;
const route=PEAK_TRAM_PROFILE.routes.A;
function sample(s){let i=route.findIndex(p=>p.s>=s);if(i<1)i=1;const a=route[i-1],b=route[i],t=(s-a.s)/(b.s-a.s);return {s,x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t};}
export const LOOP_GRADE_POINTS=Object.freeze([sample(LOOP_GRADE_START),...route.filter(p=>p.s>LOOP_GRADE_START&&p.s<LOOP_GRADE_END),sample(LOOP_GRADE_END)]);
export function loopGradeRects(){
 const out=[];for(let i=1;i<LOOP_GRADE_POINTS.length;i++){
  const a=LOOP_GRADE_POINTS[i-1],b=LOOP_GRADE_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,hx=l/2+.12,hz=LOOP_GRADE_HALF_WIDTH,cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  out.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-loop-grading'});
 }return out;
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const box={minX:Math.min(...LOOP_GRADE_POINTS.map(p=>p.x))-17,maxX:Math.max(...LOOP_GRADE_POINTS.map(p=>p.x))+17,minZ:Math.min(...LOOP_GRADE_POINTS.map(p=>p.z))-17,maxZ:Math.max(...LOOP_GRADE_POINTS.map(p=>p.z))+17};
export function peakTramLoopGrade(x,z,original=hongKongTerrainHeight(x,z)){
 if(x<box.minX||x>box.maxX||z<box.minZ||z>box.maxZ)return original;
 let nearest=null;
 for(let i=1;i<LOOP_GRADE_POINTS.length;i++){
  const a=LOOP_GRADE_POINTS[i-1],b=LOOP_GRADE_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l2)),ex=x-a.x-dx*t,ez=z-a.z-dz*t,d=Math.hypot(ex,ez);
  if(!nearest||d<nearest.d)nearest={d,s:a.s+(b.s-a.s)*t,y:a.y+(b.y-a.y)*t};
 }
 if(!nearest||nearest.d>=LOOP_GRADE_HALF_WIDTH)return original;
 const first=LOOP_GRADE_POINTS[0],second=LOOP_GRADE_POINTS[1],last=LOOP_GRADE_POINTS.at(-1),before=LOOP_GRADE_POINTS.at(-2);
 if((x-first.x)*(second.x-first.x)+(z-first.z)*(second.z-first.z)<-.15 || (x-last.x)*(last.x-before.x)+(z-last.z)*(last.z-before.z)>.15)return original;
 // Both lower-loop tracks and median fit inside the first 7m to one side;
 // grading extends equally on both sides and fades into unmodified DTM.
 const expand=smooth((nearest.s-LOOP_GRADE_START)/15);
 const inner=1.65+5.35*expand,outer=2+14*expand;
 const across=1-smooth((nearest.d-inner)/(outer-inner));
 const target=Math.min(original,nearest.y-.32);
 return original+(target-original)*across;
}
