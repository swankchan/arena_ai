import * as THREE from 'three/webgpu';
import {beam,box,merged,quad,store,meshStore} from './harbour-city-world-utils.js';
import {hongKongTerrainHeight} from './terrain.js';
import {BARKER_STATION_TRACK_POINTS,barkerStationTrackBranchOffset,barkerStationTrackPoint} from './peak-tram-barker-station-track-site.js';

// Estimated station track and road crossing; no piers inside the road envelope.
export function buildPeakTramBarkerStationTrack(scene){
 const group=new THREE.Group();group.name='Peak Tram Barker station track';scene.add(group);
 const rails=[],ties=[],piers=[],feet=[],bed=store(),walls=store(),bridge=store(),colliders=[];
 for(let i=1;i<BARKER_STATION_TRACK_POINTS.length;i++){
  const a=BARKER_STATION_TRACK_POINTS[i-1],b=BARKER_STATION_TRACK_POINTS[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l,oa=barkerStationTrackBranchOffset(a.s),ob=barkerStationTrackBranchOffset(b.s);
  const at=(p,off,dy=0)=>[p.x+nx*off,p.y+dy,p.z+nz*off];
  for(const off of [-.762,.762])beam(rails,at(a,off),at(b,off),.075,.075);
  for(let j=0,n=Math.max(1,Math.ceil(l/.7));j<n;j++){
   const t=j/n,p={x:a.x+dx*t,z:a.z+dz*t,y:a.y+(b.y-a.y)*t},o=oa+(ob-oa)*t;
   beam(ties,at(p,-1.08,-.11),at(p,Math.max(1.08,o+1.08),-.11),.12,.13);
  }
  const leftA=at(a,-1.65,-.27),leftB=at(b,-1.65,-.27),rightA=at(a,oa+1.65,-.27),rightB=at(b,ob+1.65,-.27);
  quad(bed,leftA,leftB,rightB,rightA,[.31,.30,.27]);
  // Approximate deck only: the skew road and tunnel openings stay unobstructed.
  if(a.s>=1098){
   const la=at(a,-1.65,-.65),lb=at(b,-1.65,-.65),ra=at(a,1.65,-.65),rb=at(b,1.65,-.65);
   quad(bridge,la,ra,rb,lb,[.38,.38,.35]);
   quad(bridge,la,lb,leftB,leftA,[.43,.42,.39]);quad(bridge,ra,rightA,rightB,rb,[.43,.42,.39]);
  }
  for(const [p,q] of [[leftA,leftB],[rightA,rightB]]){
   const ga=Math.max(p[1],hongKongTerrainHeight(p[0],p[2])-.08),gb=Math.max(q[1],hongKongTerrainHeight(q[0],q[2])-.08);
   if(ga>p[1]||gb>q[1])quad(walls,p,q,[q[0],gb,q[2]],[p[0],ga,p[2]],[.42,.42,.38]);
  }
  if(i%4===0 && b.s<1096){
   const x=b.x+nx*ob/2,z=b.z+nz*ob/2,ground=hongKongTerrainHeight(x,z),top=b.y-.32,h=top-ground;
   if(h>.6){box(piers,[x,ground+h/2,z],[.5,h,.5]);box(feet,[x,ground+.04,z],[.85,.16,.85]);colliders.push({minX:x-.425,maxX:x+.425,minZ:z-.425,maxZ:z+.425,minY:ground-.05,maxY:top});}
  }
 }
 // Supports are deliberately placed outside the sampled skew road footprint.
 for(const s of [1097,1116])for(const off of [-1.4,1.4]){
  const p=barkerStationTrackPoint(s),x=p.x+p.nx*off,z=p.z+p.nz*off,ground=hongKongTerrainHeight(x,z),top=p.y-.65,h=top-ground;
  if(h>0){box(piers,[x,ground+h/2,z],[.6,h,.6]);box(feet,[x,ground+.04,z],[.8,.14,.8]);colliders.push({minX:x-.4,maxX:x+.4,minZ:z-.4,maxZ:z+.4,minY:ground-.05,maxY:top});}
 }
 const steel=new THREE.MeshStandardMaterial({color:0x93958d,roughness:.36,metalness:.7}),wood=new THREE.MeshStandardMaterial({color:0x514b40,roughness:.88}),stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),concrete=new THREE.MeshStandardMaterial({color:0x737871,roughness:.9});
 meshStore(group,bridge,stone,'Barker Road crossing deck');merged(group,rails,steel,'Peak Tram Barker station track rails');merged(group,ties,wood,'Peak Tram Barker station track sleepers');meshStore(group,bed,stone,'Peak Tram Barker station track bed');meshStore(group,walls,stone,'Peak Tram Barker station track retaining faces');merged(group,piers,concrete,'Peak Tram Barker station track piers');merged(group,feet,concrete,'Peak Tram Barker station track pier footings');
 return {group,colliders,stats:{peakTramBarkerStationTrackSections:BARKER_STATION_TRACK_POINTS.length-1}};
}
