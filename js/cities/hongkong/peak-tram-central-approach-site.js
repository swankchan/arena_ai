import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
import {KENNEDY_BRIDGE_POINTS} from './peak-tram-kennedy-bridge.js';
import {CENTRAL_PLATFORM_END} from './peak-tram-central-platform-site.js';
import {hongKongTerrainHeight} from './terrain.js';
const route=PEAK_TRAM_PROFILE.routes.A;
export const CENTRAL_APPROACH_POINTS=Object.freeze(route.filter(p=>p.s>=CENTRAL_PLATFORM_END&&p.s<=KENNEDY_BRIDGE_POINTS[0].s));
export function centralApproachCuts(){const out=[];for(let i=1;i<CENTRAL_APPROACH_POINTS.length;i++){
 const a=CENTRAL_APPROACH_POINTS[i-1],b=CENTRAL_APPROACH_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,nx=-uz,nz=ux;let hit=false;
 for(let t of [0,.5,1])for(let off of [-1.65,0,1.65]){let x=a.x+dx*t+nx*off,z=a.z+dz*t+nz*off,y=a.y+(b.y-a.y)*t;if(hongKongTerrainHeight(x,z)-.08>y-.28)hit=true;}
 if(!hit)continue;const cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,hx=l/2+.06,hz=1.65,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
 out.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-central-approach'});
 }return out;}
