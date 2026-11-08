import * as THREE from 'three/webgpu';
import {beam,box,merged,quad,store,meshStore} from './harbour-city-world-utils.js';
import {hongKongTerrainHeight} from './terrain.js';
import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';

// Kennedy Road bridge: short active scene section, not a continuous railway.
// Uses the experimental, non-surveyed vertical alignment. The OSM bridge is
// between n990120464 and n990120648; extended ends provide conceptual abutments.
const route=PEAK_TRAM_PROFILE.routes.A;
const start=route.findIndex(p=>p.id==='n990120464');
const end=route.findIndex(p=>p.id==='n990120648')+3;
export const KENNEDY_BRIDGE_POINTS=Object.freeze(route.slice(start,end+1).map(p=>Object.freeze({...p})));
export function kennedyBridgeFrame(p,q){
 const dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz);return {nx:-dz/l,nz:dx/l};
}
export function buildPeakTramKennedyBridge(scene){
 const group=new THREE.Group();group.name='Peak Tram Kennedy Road steel bridge';scene.add(group);
 const rail=[],sleepers=[],metal=[],posts=[],footings=[],deck=store(),walkway=store(),colliders=[];
 const points=KENNEDY_BRIDGE_POINTS;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],{nx,nz}=kennedyBridgeFrame(a,b);
  const lateral=(p,n,y)=>[p.x+nx*n,p.y+y,p.z+nz*n];
  for(const z of [-.762,.762])beam(rail,lateral(a,z,0),lateral(b,z,0),.075,.075);
  for(let t=0,n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.7));t<n;t++){
   const f=t/n,p={x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,y:a.y+(b.y-a.y)*f};
   beam(sleepers,lateral(p,-1.08,-.11),lateral(p,1.08,-.11),.12,.13);
  }
  quad(deck,lateral(a,-1.35,-.27),lateral(b,-1.35,-.27),lateral(b,1.35,-.27),lateral(a,1.35,-.27),[.27,.29,.28]);
  for(const side of [-1,1]){
   const inner=side*1.38,outer=side*2.05;
   quad(walkway,lateral(a,inner,-.26),lateral(b,inner,-.26),lateral(b,outer,-.26),lateral(a,outer,-.26),[.24,.27,.26]);
   // Lower and upper chords with diagonals evoke the black steel through truss.
   for(const y of [-.34,1.05])beam(metal,lateral(a,outer,y),lateral(b,outer,y),.14,.14);
   beam(metal,lateral(a,outer,(i%2)?-.34:1.05),lateral(b,outer,(i%2)?1.05:-.34),.11,.11);
   beam(metal,lateral(a,outer,-.34),lateral(a,outer,1.05),.10,.10);
  }
 }
 // Four narrow estimated supports are outside the road ribbon; no surface road
 // geometry is moved. Their clearances are tested against sampled road heights.
 for(const index of [0,points.length-1]){
  const p=points[index],q=points[index===0?1:index-1],frame=index===0?kennedyBridgeFrame(p,q):kennedyBridgeFrame(q,p);
  for(const side of [-1,1]){
   const x=p.x+side*2.05*frame.nx,z=p.z+side*2.05*frame.nz,ground=hongKongTerrainHeight(x,z),top=p.y-.36,h=Math.max(.1,top-ground);
   box(posts,[x,ground+h/2,z],[.38,h,.38]);box(footings,[x,ground+.04,z],[.70,.15,.70]);
   colliders.push({minX:x-.35,maxX:x+.35,minZ:z-.35,maxZ:z+.35,minY:ground-.05,maxY:top});
  }
 }
 const steel=new THREE.MeshStandardMaterial({color:0x303c3c,roughness:.59,metalness:.64});
 const railmat=new THREE.MeshStandardMaterial({color:0x93958d,roughness:.36,metalness:.7});
 const sleeperMat=new THREE.MeshStandardMaterial({color:0x514b40,roughness:.88});
 const grating=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76,metalness:.45,side:THREE.DoubleSide});
 merged(group,metal,steel,'Kennedy bridge steel side trusses');merged(group,posts,steel,'Kennedy bridge end supports');merged(group,footings,steel,'Kennedy bridge support pads');
 merged(group,rail,railmat,'Kennedy bridge paired rails');merged(group,sleepers,sleeperMat,'Kennedy bridge sleepers');meshStore(group,deck,grating,'Kennedy bridge dark track decking');meshStore(group,walkway,grating,'Kennedy bridge side walkways');
 return {group,points,colliders,stats:{peakTramKennedyBridgeSegments:points.length-1}};
}
