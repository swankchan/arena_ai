import * as THREE from 'three/webgpu';
import {beam,merged,quad,store,meshStore} from './harbour-city-world-utils.js';
import {hongKongTerrainHeight} from './terrain.js';
import {peakTramLoopGrade} from './peak-tram-loop-grading-site.js';
import {loopBranch,loopPoint} from './peak-tram-passing-loop-site.js';

// Preliminary lower portion of the two-branch OSM trace. No moving switches,
// cables, train clearance certification or passenger operation is implied.
export function buildPeakTramPassingLoop(scene){
 const group=new THREE.Group();group.name='Peak Tram passing loop lower portion';scene.add(group);
 const rail=[],ties=[],bed=store(),walls=store(),a=loopBranch('A');
 for(const branch of ['A','B']){
  const path=loopBranch(branch);
  for(let i=1;i<path.length;i++){
   const p=path[i-1],q=path[i],dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l;
   const other=loopPoint(branch==='A'?'B':'A',(p.s+q.s)/2);
   const separation=Math.hypot(other.x-(p.x+q.x)/2,other.z-(p.z+q.z)/2);
   if(branch==='B'&&separation<.05)continue;
   for(const off of [-.762,.762])beam(rail,[p.x+nx*off,p.y,p.z+nz*off],[q.x+nx*off,q.y,q.z+nz*off],.075,.075);
   for(let j=0,n=Math.max(1,Math.ceil(l/.7));j<n;j++){const t=j/n,x=p.x+dx*t,z=p.z+dz*t,y=p.y+(q.y-p.y)*t-.11;beam(ties,[x-nx*1.08,y,z-nz*1.08],[x+nx*1.08,y,z+nz*1.08],.12,.13);}
  }
 }
 for(let i=1;i<a.length;i++){
  const p=a[i-1],q=a[i],b=loopPoint('B',p.s),c=loopPoint('B',q.s),dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l;
  const signed=((b.x+c.x-p.x-q.x)*nx+(b.z+c.z-p.z-q.z)*nz)/2,sign=signed>=0?1:-1;
  const ap=[p.x-nx*sign*1.65,p.y-.27,p.z-nz*sign*1.65],aq=[q.x-nx*sign*1.65,q.y-.27,q.z-nz*sign*1.65];
  const bp=[b.x+nx*sign*1.65,b.y-.27,b.z+nz*sign*1.65],bq=[c.x+nx*sign*1.65,c.y-.27,c.z+nz*sign*1.65];
  quad(bed,ap,aq,bq,bp,[.31,.30,.27]);
  for(const [v,w] of [[ap,aq],[bp,bq]]){
   const va=Math.max(v[1],peakTramLoopGrade(v[0],v[2])-.08),wb=Math.max(w[1],peakTramLoopGrade(w[0],w[2])-.08);
   if(va>v[1]||wb>w[1])quad(walls,v,w,[w[0],wb,w[2]],[v[0],va,v[2]],[.42,.42,.38]);
  }
 }
 const steel=new THREE.MeshStandardMaterial({color:0x93958d,roughness:.36,metalness:.7}),wood=new THREE.MeshStandardMaterial({color:0x514b40,roughness:.88}),stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});
 merged(group,rail,steel,'Peak Tram loop rails');merged(group,ties,wood,'Peak Tram loop sleepers');meshStore(group,bed,stone,'Peak Tram loop bed');meshStore(group,walls,stone,'Peak Tram loop retaining faces');
 return {group,stats:{peakTramLoopSections:a.length-1}};
}
