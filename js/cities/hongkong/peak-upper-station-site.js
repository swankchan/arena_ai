import {PEAK_TOWER_SITE as SITE,PEAK_TOWER_BASE as BASE} from './peak-tower-architecture.js';
import {PEAK_TRAM_NODES} from './peak-tram-route.js';
import {authoredLocalToWorld,authoredWorldToLocal} from './authored-landmark-site.js';

// OSM route 3264047's upper end and approach, © OpenStreetMap contributors ODbL.
// Platform width, elevation and barriers are approximate; no surveyed station plan is available.
const end=authoredWorldToLocal(SITE,...PEAK_TRAM_NODES.upperEnd.world);
const approach=authoredWorldToLocal(SITE,...PEAK_TRAM_NODES.n11.world);
export const PEAK_UPPER_STATION=Object.freeze({x0:end.x,x1:approach.x,z0:9.65,z1:16.55,trackZ:(end.z+approach.z)/2,platformY:BASE,trackY:BASE-.55,gauge:1.524});
export function peakUpperStationTerrainCut(){
 const s=PEAK_UPPER_STATION,mid=authoredLocalToWorld(SITE,(s.x0+s.x1)/2,(s.z0+s.z1)/2),ux=Math.cos(SITE.ry),uz=-Math.sin(SITE.ry),hx=(s.x1-s.x0)/2,hz=(s.z1-s.z0)/2;
 const ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
 return {cx:mid.x,cz:mid.z,ux,uz,hx,hz,minX:mid.x-ex,maxX:mid.x+ex,minZ:mid.z-ez,maxZ:mid.z+ez,routeId:'peak-upper-station'};
}
export function peakUpperStationGroundHeight(x,z,current,referenceY){
 const p=authoredWorldToLocal(SITE,x,z),s=PEAK_UPPER_STATION;
 if(p.x<s.x0 || p.x>s.x1 || p.z<s.z0 || p.z>s.z1)return current;
 if(Math.abs(referenceY-s.platformY)>2)return current;
 return Math.abs(p.z-s.trackZ)<1.25 ? BASE-.58 : s.platformY;
}
