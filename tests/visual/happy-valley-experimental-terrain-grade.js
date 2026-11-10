// Experimental local grading helper, based on the provisional track, not surveyed terrain.
import { HAPPY_VALLEY_SITE as site,HAPPY_VALLEY_TRACK as track,happyValleyTrackPoint } from '../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import {pointInFlatRing} from '../../js/cities/hongkong/landmark-site.js';
const c=Math.cos(site.ry),s=Math.sin(site.ry), world=p=>({x:site.x+c*p.x+s*p.z,z:site.z-s*p.x+c*p.z});
const points=Array.from({length:360},(_,i)=>world(happyValleyTrackPoint(i/360,-track.width/2)));
const clamp=x=>Math.max(0,Math.min(1,x));const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function distance(x,z,a,b) {const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?clamp(((x-a.x)*dx+(z-a.z)*dz)/l):0;return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)}
export function happyValleyTrackTerrainGrade(x,z,height,trackHeight) {
 const bounds=site.bounds;if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ||height<=trackHeight||!pointInFlatRing(site.ring,x,z))return height;
 let d=Infinity;for(let i=0;i<points.length;i++)d=Math.min(d,distance(x,z,points[i],points[(i+1)%points.length]));
 if(d>track.width/2+20)return height;
 let boundary=Infinity;for(let i=0;i+3<site.ring.length;i+=2)boundary=Math.min(boundary,distance(x,z,{x:site.ring[i],z:site.ring[i+1]},{x:site.ring[i+2],z:site.ring[i+3]}));
 const w=(1-smooth((d-track.width/2-2)/18))*smooth(boundary/8);
 return height+(trackHeight-height)*w;
}
