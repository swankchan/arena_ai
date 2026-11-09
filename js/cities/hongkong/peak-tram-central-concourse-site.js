import {ST_JOHNS_SITE} from './st-johns-building-site.js';
import {authoredLocalToWorld} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {centralPlatformPoint,centralPlatformFloor} from './peak-tram-central-platform-site.js';

// Scene-fit, not a surveyed plan.  Arup describes a ~40m inclined moving
// walkway: the entrance bay, lower hall and lift position are inferred.
const a=authoredLocalToWorld(ST_JOHNS_SITE,8.1,.1),p=centralPlatformPoint(0);
const b={x:p.x+p.nx*3.3,z:p.z+p.nz*3.3},dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
const upper=hongKongTerrainHeight(a.x,a.z)+.045,low=upper-2.8,top=centralPlatformFloor(0,3.3),runStart=len-40,transition=low+1.1;
export const CENTRAL_CONCOURSE=Object.freeze({x:a.x,z:a.z,ux:dx/len,uz:dz/len,nx:-dz/len,nz:dx/len,length:len,runStart,halfWidth:4,upper,low,transition,top});
const C=CENTRAL_CONCOURSE;
export function centralConcoursePoint(s,offset=0){
 s=Math.max(0,Math.min(C.length,s));let y=s<C.runStart?C.low+(C.transition-C.low)*s/C.runStart:C.transition+(C.top-C.transition)*(s-C.runStart)/(C.length-C.runStart);
 // Ease the last six metres across the width into the angled platform portal.
 // The two centrelines are not parallel, so one flat end height left a step at
 // either side after the platform regrade. This remains a scene-fit transition.
 if(s>C.length-6&&offset!==0){const endX=C.x+C.ux*C.length+C.nx*offset,endZ=C.z+C.uz*C.length+C.nz*offset,p=centralPlatformPoint(0),dx=endX-p.x,dz=endZ-p.z,platformS=dx*p.ux+dz*p.uz,platformOffset=dx*p.nx+dz*p.nz;
  y+=(centralPlatformFloor(Math.max(0,platformS),platformOffset)-C.top)*(s-(C.length-6))/6;
 }
 return {x:C.x+C.ux*s+C.nx*offset,z:C.z+C.uz*s+C.nz*offset,y};
}
export function centralConcourseCoordinates(x,z){const dx=x-C.x,dz=z-C.z;return {s:dx*C.ux+dz*C.uz,o:dx*C.nx+dz*C.nz};}
export function centralConcourseHalfWidth(s){return s>C.length-6?1.4+2.6*Math.max(0,(C.length-s)/6):4;}
export function centralConcourseGroundHeight(x,z,current,ref){const {s,o}=centralConcourseCoordinates(x,z);if(s<0||s>C.length||Math.abs(o)>centralConcourseHalfWidth(s))return current;let y=centralConcoursePoint(s,o).y;return Math.abs(ref-y)<1.0?y:current;}

// Entrance lift footprint aligned to the existing .6m paving grid.
export const CENTRAL_LIFT_LOCAL=Object.freeze({x0:6.6,x1:9.6,z0:-1.4,z1:1.6,x:8.1,z:.1});
export function centralLiftTerrainCut(){const L=CENTRAL_LIFT_LOCAL,p=authoredLocalToWorld(ST_JOHNS_SITE,L.x,L.z),ux=Math.cos(ST_JOHNS_SITE.ry),uz=-Math.sin(ST_JOHNS_SITE.ry),hx=1.5,hz=1.5,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;return {cx:p.x,cz:p.z,ux,uz,hx,hz,minX:p.x-ex,maxX:p.x+ex,minZ:p.z-ez,maxZ:p.z+ez,routeId:'peak-tram-central-lift'};}

export function centralConcourseUnderRoad(x,z,mode,ref,roadHeight){if(mode!=='person'||!Number.isFinite(ref)||!Number.isFinite(roadHeight))return false;const y=centralConcourseGroundHeight(x,z,null,ref);return y!==null&&Math.abs(ref-y)+.5<Math.abs(ref-roadHeight);}
