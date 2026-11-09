import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
// Provisional platform under the Cotton Tree Drive viaduct, following the
// unsurveyed shared profile from its OSM stop to the first bridge node.
const route=PEAK_TRAM_PROFILE.routes.A;
export const CENTRAL_PLATFORM_START=0;
export const CENTRAL_PLATFORM_END=route.find(p=>p.id==='n2525250108').s;
export const CENTRAL_PLATFORM_POINTS=Object.freeze(route.filter(p=>p.s<=CENTRAL_PLATFORM_END));
export const CENTRAL_PLATFORM_HALF_WIDTH=4.9;
export function centralPlatformPoint(s){
 s=Math.max(0,Math.min(CENTRAL_PLATFORM_END,s));let i=route.findIndex(p=>p.s>=s);i=Math.max(1,i);let a=route[i-1],b=route[i],t=(s-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);return {s,x:a.x+dx*t,z:a.z+dz*t,y:a.y+(b.y-a.y)*t,ux:dx/l,uz:dz/l,nx:-dz/l,nz:dx/l};
}
export function centralPlatformTerrainCut(){
 const a=centralPlatformPoint(0),b=centralPlatformPoint(CENTRAL_PLATFORM_END),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,hx=l/2,hz=CENTRAL_PLATFORM_HALF_WIDTH,cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
 return {cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'peak-tram-central-platform'};
}
export function centralPlatformGroundHeight(x,z,current,referenceY){
 const a=centralPlatformPoint(0),dx=x-a.x,dz=z-a.z,s=dx*a.ux+dz*a.uz,offset=dx*a.nx+dz*a.nz;
 if(s<0||s>CENTRAL_PLATFORM_END||Math.abs(offset)>CENTRAL_PLATFORM_HALF_WIDTH)return current;
 const p=centralPlatformPoint(s),y=p.y+(Math.abs(offset)<1.65?-.28:.57);
 return Math.abs(referenceY-y)<2.5?y:current;
}
