import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';

// Only the lower part of the long OSM branch pair. The remainder and switch
// mechanics are deliberately not installed until their geometry is checked.
export const LOOP_START=PEAK_TRAM_PROFILE.routes.A.find(p=>p.id==='n2715451261').s;
export const LOOP_END=645;
function sample(route,s){
 let i=route.findIndex(p=>p.s>=s);if(i<1)throw Error('passing-loop sample outside route');
 const a=route[i-1],b=route[i],t=(s-a.s)/(b.s-a.s);
 return {s,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
}
export function loopPoint(branch,s){return sample(PEAK_TRAM_PROFILE.routes[branch],s);}
export function loopBranch(branch){
 const r=PEAK_TRAM_PROFILE.routes[branch];return [r.find(p=>p.id==='n2715451261'),...r.filter(p=>p.s>LOOP_START&&p.s<LOOP_END),sample(r,LOOP_END)];
}
// Cut one broad corridor encompassing both track centres and the median. This
// avoids a strip of DTM blocking the space between converging branch tracks.
export function peakPassingLoopCuts(){
 const a=loopBranch('A'),rects=[];
 for(let i=1;i<a.length;i++){
  const p=a[i-1],q=a[i],b=loopPoint('B',(p.s+q.s)/2),dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,nx=-uz,nz=ux;
  const mx=(p.x+q.x)/2,mz=(p.z+q.z)/2,offset=(b.x-mx)*nx+(b.z-mz)*nz,shift=offset/2;
  const cx=mx+nx*shift,cz=mz+nz*shift,hx=l/2+.15,hz=1.65+Math.abs(offset)/2,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  rects.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-passing-loop'});
 }
 return rects;
}
