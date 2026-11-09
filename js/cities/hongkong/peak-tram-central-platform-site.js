import {CENTRAL_PLATFORM_END, CENTRAL_PLATFORM_HALF_WIDTH, centralPlatformPoint} from './peak-tram-central-profile.js';
import {centralTrialDocking} from './peak-tram-central-docking.js';
export {CENTRAL_PLATFORM_START,CENTRAL_PLATFORM_END,CENTRAL_PLATFORM_POINTS,CENTRAL_PLATFORM_HALF_WIDTH,centralPlatformPoint} from './peak-tram-central-profile.js';

// Trial regrade: blend the rigid visual car's floor plane at the platform edge
// back to the existing outer edge. This is a visual/gameplay approximation, not
// a wheelchair design, measured railway profile or verified boarding interface.
const dock=centralTrialDocking().pose,origin=centralPlatformPoint(0);
const centreS=(dock.position.x-origin.x)*origin.ux+(dock.position.z-origin.z)*origin.uz;
export function centralPlatformFloor(s,offset) {
 const p=centralPlatformPoint(s),old=p.y+.57;
 const carFloor=dock.position.y+(s-centreS)*Math.tan(dock.pitch)+.75/Math.cos(dock.pitch);
 // Lift the outer edge where the existing roof allows it; reduce the lift
 // under the tight Cotton Tree Drive crossing (s 24 to the uphill end). A shallow local
 // recess there also preserves headroom at the outermost platform edge.
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const constraint=smooth((s-14)/11);
 const outer=old+Math.min(carFloor-old,.34)*(1-constraint)-.08*constraint;
 const blend=Math.max(0,Math.min(1,(CENTRAL_PLATFORM_HALF_WIDTH-Math.abs(offset))/(CENTRAL_PLATFORM_HALF_WIDTH-1.65)));
 return outer+(carFloor-outer)*blend;
}

export function centralPlatformTerrainCut(){
 const a=centralPlatformPoint(0),b=centralPlatformPoint(CENTRAL_PLATFORM_END),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,hx=l/2,hz=CENTRAL_PLATFORM_HALF_WIDTH,cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
 return {cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-central-platform'};
}
export function centralPlatformGroundHeight(x,z,current,referenceY){
 const a=centralPlatformPoint(0),dx=x-a.x,dz=z-a.z,s=dx*a.ux+dz*a.uz,offset=dx*a.nx+dz*a.nz;
 if(s<0||s>CENTRAL_PLATFORM_END||Math.abs(offset)>CENTRAL_PLATFORM_HALF_WIDTH)return current;
 const p=centralPlatformPoint(s),y=Math.abs(offset)<1.65?p.y-.28:centralPlatformFloor(s,offset);
 return Math.abs(referenceY-y)<2.5?y:current;
}

// Only a person already near the station floor may select it over a road.
// In particular, an untagged surface road can still pass overhead here.
// Other modes and the ordinary road-selection policy remain unchanged.
export function centralPlatformUnderRoad(x,z,mode,referenceY,roadHeight){
 if(mode!=='person'||!Number.isFinite(referenceY)||!Number.isFinite(roadHeight))return false;
 const station=centralPlatformGroundHeight(x,z,null,referenceY);
 return station!==null && Math.abs(referenceY-station)+0.5<Math.abs(referenceY-roadHeight);
}
