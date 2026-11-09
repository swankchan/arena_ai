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
