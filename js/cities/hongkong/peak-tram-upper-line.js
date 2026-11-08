import * as THREE from 'three/webgpu';
import {beam,box,merged,quad,store,meshStore} from './harbour-city-world-utils.js';
import {hongKongTerrainHeight} from './terrain.js';
import {peakTramLoopGrade} from './peak-tram-loop-grading-site.js';
import {UPPER_LINE_POINTS,upperBranchOffset,UPPER_LINE_START} from './peak-tram-upper-line-site.js';

// Scene-fit approximation: transition from four rails to a shared middle rail,
// then back to two. Track profiles and switch positions are not surveyed.
export function buildPeakTramUpperLine(scene){
 const group=new THREE.Group();group.name='Peak Tram upper hillside track';scene.add(group);
 const rails=[],ties=[],piers=[],feet=[],bed=store(),walls=store(),colliders=[];
 for(let i=1;i<UPPER_LINE_POINTS.length;i++){
  const a=UPPER_LINE_POINTS[i-1],b=UPPER_LINE_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l,oa=upperBranchOffset(a.s),ob=upperBranchOffset(b.s);
  const at=(p,off,dy=0)=>[p.x+nx*off,p.y+dy,p.z+nz*off];
  for(const off of [-.762,.762])beam(rails,at(a,off),at(b,off),.075,.075);
  if(a.s<840){beam(rails,at(a,oa+.762),at(b,ob+.762),.075,.075);if(a.s<675)beam(rails,at(a,oa-.762),at(b,ob-.762),.075,.075);}
  for(let j=0,n=Math.max(1,Math.ceil(l/.7));j<n;j++){
   const t=j/n,p={x:a.x+dx*t,z:a.z+dz*t,y:a.y+(b.y-a.y)*t},o=oa+(ob-oa)*t;
   beam(ties,at(p,-1.08,-.11),at(p,Math.max(1.08,o+1.08),-.11),.12,.13);
  }
  const leftA=at(a,-1.65,-.27),leftB=at(b,-1.65,-.27),rightA=at(a,oa+1.65,-.27),rightB=at(b,ob+1.65,-.27);
  quad(bed,leftA,leftB,rightB,rightA,[.31,.30,.27]);
  for(const [p,q] of [[leftA,leftB],[rightA,rightB]]){
   const ga=Math.max(p[1],peakTramLoopGrade(p[0],p[2])-.08),gb=Math.max(q[1],peakTramLoopGrade(q[0],q[2])-.08);
   if(ga>p[1]||gb>q[1])quad(walls,p,q,[q[0],gb,q[2]],[p[0],ga,p[2]],[.42,.42,.38]);
  }
  if(i%4===0){
   const x=b.x+nx*ob/2,z=b.z+nz*ob/2,ground=hongKongTerrainHeight(x,z),top=b.y-.32,h=top-ground;
   if(h>.6){box(piers,[x,ground+h/2,z],[.5,h,.5]);box(feet,[x,ground+.04,z],[.85,.16,.85]);colliders.push({minX:x-.425,maxX:x+.425,minZ:z-.425,maxZ:z+.425,minY:ground-.05,maxY:top});}
  }
 }
 const steel=new THREE.MeshStandardMaterial({color:0x93958d,roughness:.36,metalness:.7}),wood=new THREE.MeshStandardMaterial({color:0x514b40,roughness:.88}),stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),concrete=new THREE.MeshStandardMaterial({color:0x737871,roughness:.9});
 merged(group,rails,steel,'Peak Tram upper line rails');merged(group,ties,wood,'Peak Tram upper line sleepers');meshStore(group,bed,stone,'Peak Tram upper line bed');meshStore(group,walls,stone,'Peak Tram upper line retaining faces');merged(group,piers,concrete,'Peak Tram upper line piers');merged(group,feet,concrete,'Peak Tram upper line pier footings');
 return {group,colliders,stats:{peakTramUpperLineSections:UPPER_LINE_POINTS.length-1}};
}
