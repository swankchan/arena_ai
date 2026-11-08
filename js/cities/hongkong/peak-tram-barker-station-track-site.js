import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
import {BARKER_APPROACH_END} from './peak-tram-barker-approach-site.js';
import {hongKongTerrainHeight} from './terrain.js';

const route=PEAK_TRAM_PROFILE.routes.A;
export const BARKER_STATION_TRACK_START=BARKER_APPROACH_END;
export const BARKER_STATION_TRACK_END=1116;
export function barkerStationTrackPoint(s){
 const d=Math.max(BARKER_STATION_TRACK_START,Math.min(BARKER_STATION_TRACK_END,s));let i=route.findIndex(p=>p.s>=d);i=Math.max(1,i);const a=route[i-1],b=route[i],t=(d-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);
 return {s:d,x:a.x+dx*t,y:a.y+(b.y-a.y)*t,z:a.z+dz*t,ux:dx/l,uz:dz/l,nx:-dz/l,nz:dx/l};
}
export const BARKER_STATION_TRACK_POINTS=Object.freeze([barkerStationTrackPoint(BARKER_STATION_TRACK_START),...route.filter(p=>p.s>BARKER_STATION_TRACK_START&&p.s<BARKER_STATION_TRACK_END).map(p=>barkerStationTrackPoint(p.s)),barkerStationTrackPoint(1098),barkerStationTrackPoint(BARKER_STATION_TRACK_END)].sort((a,b)=>a.s-b.s));
export function barkerStationTrackBranchOffset(){return 0;}
export function barkerStationTrackCuts(){
 const rects=[];
 for(let i=1;i<BARKER_STATION_TRACK_POINTS.length;i++){
  const a=BARKER_STATION_TRACK_POINTS[i-1],b=BARKER_STATION_TRACK_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,nx=-uz,nz=ux;
  const off=Math.max(barkerStationTrackBranchOffset(a.s),barkerStationTrackBranchOffset(b.s)),shift=off/2,hz=1.65+off/2,hx=l/2+.12,cx=(a.x+b.x)/2+nx*shift,cz=(a.z+b.z)/2+nz*shift;
  let intrudes=false;for(const t of [0,.5,1])for(const f of [-1,0,1]){const x=a.x+dx*t+nx*(shift+hz*f),z=a.z+dz*t+nz*(shift+hz*f),y=a.y+(b.y-a.y)*t;if(hongKongTerrainHeight(x,z)-.08>y-.27)intrudes=true;}
  if(!intrudes)continue;
  const ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  rects.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-barker-station-track'});
 }
 return rects;
}
