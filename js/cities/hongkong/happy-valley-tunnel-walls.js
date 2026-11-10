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
function insideRect(r,x,z,margin=0) {
  const dx=x-r.cx,dz=z-r.cz;
  return Math.abs(dx*r.ux+dz*r.uz)<r.hx+margin && Math.abs(-dx*r.uz+dz*r.ux)<r.hz+margin;
}
function local(x,z) {
  const dx=x-site.x,dz=z-site.z,c=Math.cos(site.ry),s=Math.sin(site.ry);
  return [c*dx-s*dz,s*dx+c*dz];
}
export function buildHappyValleyTunnelWalls(parent,groundOffset) {
  if(own.length!==ids.size) return {mesh:null,segments:0};
  const walls=store();let segments=0;
  for(const r of opening) {
    const id=Number(r.routeId.split(':')[1]),way=own.find(w=>w.id===id);
    const N=Math.max(1,Math.ceil(2*r.hx/.8));
    for(const side of [-1,1]) for(let i=0;i<N;i++) {
      const world=t=>({x:r.cx+r.ux*(2*t-1)*r.hx-r.uz*side*r.hz,z:r.cz+r.uz*(2*t-1)*r.hx+r.ux*side*r.hz});
      const a=world(i/N),b=world((i+1)/N),m=world((i+.5)/N);
      // Omit interior union boundaries and all places where a different road
      // approaches the wall, including a different-height layer.
      if(![a,b,m].every(p=>pointInFlatRing(site.ring,p.x,p.z)))continue;
      if(opening.some(o=>o!==r && insideRect(o,m.x,m.z,.04)))continue;
      if([a,b,m].some(p=>roads.some(other=>other.id!==id && projection(other,p.x,p.z)?.distance<other.width/2+.8)))continue;
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
  const material=new THREE.MeshStandardMaterial({color:0xaaa99f,roughness:.9,side:THREE.DoubleSide});
  return {mesh:meshStore(parent,walls,material,'HappyValleyTunnelRetainingWalls',false),segments};
}
