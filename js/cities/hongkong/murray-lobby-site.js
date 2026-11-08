import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {authoredLocalToWorld,authoredWorldToLocal} from './authored-landmark-site.js';

// The lobby, doorway and its construction elevation are photo-directed estimates, not measured plans.
export const MURRAY_LOBBY=Object.freeze({halfWidth:11.6,z0:-22.5,z1:-7.5,floor:-5,doorMin:-16.3,doorMax:-12.7,wallX:11.6});
export function isMurrayLobbyLocal(x,z){const l=MURRAY_LOBBY;return Math.abs(x)<=l.halfWidth && z>=l.z0 && z<=l.z1;}
export function murrayLobbyGroundHeight(x,z,current,referenceY,datum){
 const p=authoredWorldToLocal(SITE,x,z),floor=datum+MURRAY_LOBBY.floor;
 if(!isMurrayLobbyLocal(p.x,p.z) || referenceY<floor-1 || referenceY>floor+2.5)return current;
 return floor;
}
// Excise DTM only under the small room; a raised/level interior by itself would be buried in terrain.
// The clipping rectangle is slightly inset from the glass to avoid affecting the outside ramp or roads.
export function murrayLobbyTerrainCut(){
 const l=MURRAY_LOBBY,p=authoredLocalToWorld(SITE,0,(l.z0+l.z1)/2),ux=Math.cos(SITE.ry),uz=-Math.sin(SITE.ry),hx=l.halfWidth-.1,hz=(l.z1-l.z0)/2-.05;
 const ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
 return {cx:p.x,cz:p.z,ux,uz,hx,hz,minX:p.x-ex,maxX:p.x+ex,minZ:p.z-ez,maxZ:p.z+ez,routeId:'murray-lobby'};
}
