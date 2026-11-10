// Provisional retaining edges for the two generated infield-road portal cuts.
// They follow modelled roads, not surveyed tunnel structure or clearance.
import * as THREE from 'three/webgpu';
import { TERRAIN_TUNNEL_OPENING_RECTS, roadRibbonHeightAtSegment } from './road-elevation.js';
import { fullRoadWaysNear } from './full-meta.js';
import { pointInFlatRing } from './landmark-site.js';
import { HAPPY_VALLEY_SITE as site } from './happy-valley-racecourse-architecture.js';
import { store, quad, meshStore } from './harbour-city-world-utils.js';

const ids=new Set([41116,43020]);
const expected=new Map([
  [41116,[2144.8,826.8,2153.1,831.9,2158.8,831.7,2183.3,810.9,2198.1,803.3,2213,798.5]],
  [43020,[2145.1,856,2144.8,826.8,2110.7,802.3]],
]);
// Generated road IDs are indices; disable this specific detail if the snapshot changes.
const roads=fullRoadWaysNear(2150,835,130);
const own=roads.filter(r=>ids.has(r.id) && r.flat.length===expected.get(r.id).length && r.width===5.5 && (r.flags&4) && expected.get(r.id).every((v,i)=>r.flat[i]===v));
const opening=TERRAIN_TUNNEL_OPENING_RECTS.filter(r=>ids.has(Number(r.routeId.split(':')[1])) && r.routeId.startsWith('osm-tunnel:'));

function projection(way,x,z) {
  let best=null;
  for(let i=2;i<way.flat.length;i+=2) {
    const ax=way.flat[i-2],az=way.flat[i-1],dx=way.flat[i]-ax,dz=way.flat[i+1]-az,d2=dx*dx+dz*dz;
    if(d2<.0025)continue;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/d2));
    const px=ax+dx*t,pz=az+dz*t,distance=Math.hypot(x-px,z-pz);
    if(!best||distance<best.distance) best={distance,t,index:i/2-1,x:px,z:pz};
  }
  return best;
}
// Split an edge exactly at every neighbouring rectangle boundary, rather than
// dropping whole 0.8 m cells at bends. Only the exterior of the union remains.
export function happyValleyOutsideOpeningIntervals(a,b,rects) {
  let intervals=[[0,1]];
  for(const r of rects) {
    let lo=0,hi=1;
    for(const [nx,nz,limit] of [[r.ux,r.uz,r.hx],[-r.ux,-r.uz,r.hx],[-r.uz,r.ux,r.hz],[r.uz,-r.ux,r.hz]]) {
      const d0=nx*(a.x-r.cx)+nz*(a.z-r.cz)-limit;
      const dv=nx*(b.x-a.x)+nz*(b.z-a.z);
      if(Math.abs(dv)<1e-10) { if(d0>0) {lo=1;hi=0;break;} continue; }
      const t=-d0/dv;
      if(dv>0)hi=Math.min(hi,t);else lo=Math.max(lo,t);
    }
    if(lo>=hi || hi<=0 || lo>=1) continue;
    lo=Math.max(0,lo);hi=Math.min(1,hi);
    intervals=intervals.flatMap(([x,y])=>hi<=x||lo>=y?[[x,y]]:
      [...(lo>x?[[x,lo]]:[]),...(hi<y?[[hi,y]]:[])]);
  }
  return intervals.filter(([a,b])=>b-a>1e-6);
}
function corners(r) {
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>({
    x:r.cx+r.ux*r.hx*u-r.uz*r.hz*v, z:r.cz+r.uz*r.hx*u+r.ux*r.hz*v,
  }));
}
function local(x,z) {
  const dx=x-site.x,dz=z-site.z,c=Math.cos(site.ry),s=Math.sin(site.ry);
  return [c*dx-s*dz,s*dx+c*dz];
}
export function buildHappyValleyTunnelWalls(parent,groundOffset) {
  if(own.length!==ids.size) return {mesh:null,segments:0};
  const walls=store();let segments=0;
  for(const r of opening) {
    const id=Number(r.routeId.split(':')[1]),way=own.find(w=>w.id===id), vertices=corners(r);
    for(let edge=0;edge<4;edge++) {
      const p=vertices[edge],q=vertices[(edge+1)%4],lerp=t=>({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t});
      for(const [from,to] of happyValleyOutsideOpeningIntervals(p,q,opening.filter(o=>o!==r))) {
        const len=Math.hypot(q.x-p.x,q.z-p.z)*(to-from),N=Math.max(1,Math.ceil(len/.5));
        for(let i=0;i<N;i++) {
          const a=lerp(from+(to-from)*i/N),b=lerp(from+(to-from)*(i+1)/N),m=lerp(from+(to-from)*(i+.5)/N);
          if(![a,b,m].every(p=>pointInFlatRing(site.ring,p.x,p.z)))continue;
          // Never build across any mapped road, even if the road is on a
          // different elevation layer; this also keeps both mouths open.
          if([a,b,m].some(p=>roads.some(other=>projection(other,p.x,p.z)?.distance<other.width/2+.65)))continue;
          const pa=projection(way,a.x,a.z),pb=projection(way,b.x,b.z);
          if(!pa||!pb)continue;
          const ya=roadRibbonHeightAtSegment(id,pa.index,pa.t,pa.x,pa.z)-groundOffset-.12;
          const yb=roadRibbonHeightAtSegment(id,pb.index,pb.t,pb.x,pb.z)-groundOffset-.12;
          const top=-.03;
          if(ya>=top && yb>=top)continue;
          const [ax,az]=local(a.x,a.z),[bx,bz]=local(b.x,b.z);
          quad(walls,[ax,Math.min(ya,top),az],[bx,Math.min(yb,top),bz],[bx,top,bz],[ax,top,az],[.54,.55,.53]);segments++;
        }
      }
    }
  }
  const material=new THREE.MeshStandardMaterial({color:0xaaa99f,roughness:.9,side:THREE.DoubleSide});
  return {mesh:meshStore(parent,walls,material,'HappyValleyTunnelRetainingWalls',false),segments};
}
