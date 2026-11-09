import {CENTRAL_APPROACH_POINTS as route} from './peak-tram-central-approach-site.js';
import {hongKongTerrainHeight} from './terrain.js';
// Inferred, road-sampled regrade immediately above the Central platform. The
// rest of the approach retains its narrow cut and bridge/support treatment.
export const CENTRAL_GRADE_POINTS=Object.freeze(route.slice(0,13));
export const CENTRAL_GRADE_HALF_WIDTH=4.9;
export function centralGradeRects(){const out=[];for(let i=1;i<CENTRAL_GRADE_POINTS.length;i++){
 const a=CENTRAL_GRADE_POINTS[i-1],b=CENTRAL_GRADE_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,hx=l/2+.02,hz=CENTRAL_GRADE_HALF_WIDTH,cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
 out.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-central-earthworks'});
 }return out;}
const gradeRects=centralGradeRects();
const bounds={minX:Math.min(...gradeRects.map(r=>r.minX))-.001,maxX:Math.max(...gradeRects.map(r=>r.maxX))+.001,minZ:Math.min(...gradeRects.map(r=>r.minZ))-.001,maxZ:Math.max(...gradeRects.map(r=>r.maxZ))+.001};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
export function centralApproachGrade(x,z,original=hongKongTerrainHeight(x,z)){
 if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return original;
 if(!gradeRects.some(r=>{const dx=x-r.cx,dz=z-r.cz;return Math.abs(dx*r.ux+dz*r.uz)<=r.hx+.001&&Math.abs(-dx*r.uz+dz*r.ux)<=r.hz+.001}))return original;
 const path=CENTRAL_GRADE_POINTS,first=path[0],last=path.at(-1),next=path[1],prev=path.at(-2);
 if(((x-first.x)*(next.x-first.x)+(z-first.z)*(next.z-first.z))/Math.hypot(next.x-first.x,next.z-first.z)<-.1||((x-last.x)*(last.x-prev.x)+(z-last.z)*(last.z-prev.z))/Math.hypot(last.x-prev.x,last.z-prev.z)>.1)return original;
 let best=null;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l2)),d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);if(!best||d<best.d)best={d,y:a.y+(b.y-a.y)*t};}
 if(!best||best.d>=CENTRAL_GRADE_HALF_WIDTH)return original;
 const weight=1-smooth((best.d-1.65)/(CENTRAL_GRADE_HALF_WIDTH-1.65)),target=Math.min(original,best.y-.32);
 return original+(target-original)*weight;
}
