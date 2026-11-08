import * as THREE from 'three/webgpu';
import {attribute} from 'three/tsl';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {MURRAY_RAMP as R,murrayRampLocalHeight} from './murray-ramp.js';
import {authoredWorldToLocal} from './authored-landmark-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {beam,merged,store,quad,meshStore} from './harbour-city-world-utils.js';

// The plan identifies a ramp entering from the +z end, continuing along the
// -x side, turning at -z and returning along +x. Exact heights and alignment
// here are estimates: the published drawing has no surveyed elevations.
const x0=(R.x0+R.x1)/2,y0=murrayRampLocalHeight(R.z1),grade=.1;
const points=[[x0,23],[10,23.6],[-8,23.6],[-8,-19.5],[8,-19.5],[8,19.5]];
const widths=1.5,segments=[];let h=y0;
for(let i=0;i<points.length-1;i++){
 const a=points[i],b=points[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),dy=i<4?len*grade:0;
 segments.push({a,b,len,h0:h,h1:h+dy});h+=dy;
}
function normal(s){return [-(s.b[1]-s.a[1])/s.len,(s.b[0]-s.a[0])/s.len];}
function offset(i){
 if(i===0)return normal(segments[0]).map(v=>v*widths);
 if(i===points.length-1)return normal(segments[i-1]).map(v=>v*widths);
 const n0=normal(segments[i-1]),n1=normal(segments[i]),sum=[n0[0]+n1[0],n0[1]+n1[1]],scale=widths/(sum[0]*n1[0]+sum[1]*n1[1]);return sum.map(v=>v*scale);
}
const edges=points.map((p,i)=>{const n=offset(i);return [[p[0]+n[0],p[1]+n[1]],[p[0]-n[0],p[1]-n[1]]];});
export const MURRAY_WRAPPED_RAMP=Object.freeze({points:points.map(p=>Object.freeze([...p])),halfWidth:widths,heights:Object.freeze([y0,...segments.map(s=>s.h1)])});
// Interpolate the exact triangulated surface, including the mitred corners.
function triangleHeight(x,z,a,b,c){
 const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-9)return null;
 const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(z-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(z-c[1]))/den,w=1-u-v;
 return u>=-1e-7&&v>=-1e-7&&w>=-1e-7?u*a[2]+v*b[2]+w*c[2]:null;
}
export function murrayWrappedRampLocalHeight(x,z){
 for(let i=0;i<segments.length;i++){
  const s=segments[i],a=[...edges[i][0],s.h0],b=[...edges[i][1],s.h0],c=[...edges[i+1][1],s.h1],d=[...edges[i+1][0],s.h1];
  const value=triangleHeight(x,z,a,b,c)??triangleHeight(x,z,a,c,d);if(value!==null)return value;
 }return null;
}
export function murrayWrappedRampGroundHeight(x,z,current,ref,datum){
 const p=authoredWorldToLocal(SITE,x,z),local=murrayWrappedRampLocalHeight(p.x,p.z);if(local===null)return current;
 const y=datum+local;return ref>=y-.35&&ref<=y+2.5?y:current;
}
export function buildMurrayWrappedRamp(root,datum,colliders){
 const deck=store(),fascia=store(),top=[],joints=[];
 const mat=new THREE.MeshStandardNodeMaterial({roughness:.86,side:THREE.DoubleSide});mat.colorNode=attribute('color');
 const bronze=new THREE.MeshStandardMaterial({color:0x918064,metalness:.6,roughness:.4});
 for(let i=0;i<segments.length;i++){
  const s=segments[i],e0=edges[i],e1=edges[i+1],n=Math.ceil(s.len);
  quad(deck,[e0[0][0],s.h0,e0[0][1]],[e0[1][0],s.h0,e0[1][1]],[e1[1][0],s.h1,e1[1][1]],[e1[0][0],s.h1,e1[0][1]],[.36,.36,.345]);
  for(let j=0;j<n;j++){
   const t0=j/n,t1=(j+1)/n,lerp=(a,b,t)=>a+(b-a)*t;
   const point=(side,t)=>[lerp(e0[side][0],e1[side][0],t),lerp(s.h0,s.h1,t),lerp(e0[side][1],e1[side][1],t)];
   const a=point(0,t0),b=point(1,t0);
   // Skip edges at the ramp's start and end: they meet adjacent surfaces.
   for(let side=0;side<2;side++){
    if(i===0)continue; // Transition merges into the narrower existing ramp.
    if(i===1&&side===1&&j>=n-8&&j<=n-2)continue; // Opening for the curved exterior approach.
    const p=point(side,t0),q=point(side,t1),dx=q[0]-p[0],dz=q[2]-p[2],length=Math.hypot(dx,dz);
    quad(fascia,[p[0],p[1]-.15,p[2]],[q[0],q[1]-.15,q[2]],[q[0],q[1]+.95,q[2]],[p[0],p[1]+.95,p[2]],[.57,.58,.55]);
    beam(top,[p[0],p[1]+.98,p[2]],[q[0],q[1]+.98,q[2]],.05,.05);
    colliders.push(harbourCityLocalCollider(SITE,(p[0]+q[0])/2,(p[2]+q[2])/2,length,.1,datum+Math.min(p[1],q[1])-.15,datum+Math.max(p[1],q[1])+1.05,SITE.ry+Math.atan2(-dz,dx)));
   }
   if(j%2===0)beam(joints,[a[0],a[1]+.012,a[2]],[b[0],b[1]+.012,b[2]],.018,.018);
  }
 }
 // The upper end is not yet connected to the landscape; guard the drop.
 const last=segments[segments.length-1],end=edges[edges.length-1],a=end[0],b=end[1];
 quad(fascia,[a[0],last.h1-.15,a[1]],[b[0],last.h1-.15,b[1]],[b[0],last.h1+.95,b[1]],[a[0],last.h1+.95,a[1]],[.57,.58,.55]);
 beam(top,[a[0],last.h1+.98,a[1]],[b[0],last.h1+.98,b[1]],.05,.05);
 colliders.push(harbourCityLocalCollider(SITE,(a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1]),.1,datum+last.h1-.15,datum+last.h1+1.05,SITE.ry+Math.atan2(-(b[1]-a[1]),b[0]-a[0])));
 meshStore(root,deck,mat,'The Murray wrapped ramp paving',false);meshStore(root,fascia,mat,'The Murray wrapped ramp parapets',false);
 merged(root,top,bronze,'The Murray wrapped ramp handrails',false);merged(root,joints,bronze,'The Murray wrapped ramp paving joints',false);
 return {segments:segments.length};
}
