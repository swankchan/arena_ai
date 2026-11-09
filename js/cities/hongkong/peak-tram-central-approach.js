import * as THREE from 'three/webgpu';
import {beam,box,merged,quad,store,meshStore} from './harbour-city-world-utils.js';
import {hongKongTerrainHeight} from './terrain.js';
import {fullRoadSurfaceAt} from './full-meta.js';
import {CENTRAL_APPROACH_POINTS as P} from './peak-tram-central-approach-site.js';
export function buildPeakTramCentralApproach(scene){
 const group=new THREE.Group();group.name='Peak Tram Central to Kennedy approach';scene.add(group);let rails=[],ties=[],supports=[],colliders=[],bed=store(),walls=store();
 for(let i=1;i<P.length;i++){
  let a=P[i-1],b=P[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l,at=(p,o,h)=>[p.x+nx*o,p.y+h,p.z+nz*o];
  for(let o of [-.762,.762])beam(rails,at(a,o,0),at(b,o,0),.075,.075);
  for(let j=0,n=Math.ceil(l/.7);j<n;j++){let t=j/n,p={x:a.x+dx*t,z:a.z+dz*t,y:a.y+(b.y-a.y)*t};beam(ties,at(p,-1.08,-.11),at(p,1.08,-.11),.12,.13);}
  quad(bed,at(a,-1.65,-.28),at(b,-1.65,-.28),at(b,1.65,-.28),at(a,1.65,-.28),[.28,.29,.27]);
  if(i>12)for(const side of [-1,1]){let A=at(a,side*1.65,-.28),B=at(b,side*1.65,-.28),top=p=>{let y=hongKongTerrainHeight(p[0],p[2])-.08,r=fullRoadSurfaceAt(p[0],p[2],.5,y);return Math.max(p[1],Math.min(y,r?r.height-.65:Infinity));};let ya=top(A),yb=top(B);if(ya>A[1]||yb>B[1])quad(walls,A,B,[B[0],yb,B[2]],[A[0],ya,A[2]],[.37,.38,.35]);}
  if(i%4===0){let ground=hongKongTerrainHeight(b.x,b.z),height=b.y-.28-ground,road=fullRoadSurfaceAt(b.x,b.z,1.2,ground);if(height>.8&&!road){box(supports,[b.x,ground+height/2,b.z],[.55,height,.55]);colliders.push({minX:b.x-.275,maxX:b.x+.275,minZ:b.z-.275,maxZ:b.z+.275,minY:ground,maxY:b.y-.28});}}
 }
 const steel=new THREE.MeshStandardMaterial({color:0x979993,metalness:.65,roughness:.4}),wood=new THREE.MeshStandardMaterial({color:0x514b40,roughness:.9}),stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,side:THREE.DoubleSide}),concrete=new THREE.MeshStandardMaterial({color:0x737871,roughness:.9});
 merged(group,rails,steel,'Central approach rails');merged(group,ties,wood,'Central approach sleepers');meshStore(group,bed,stone,'Central approach bed');meshStore(group,walls,stone,'Central approach retaining faces');merged(group,supports,concrete,'Central approach provisional supports');return {group,colliders,stats:{peakTramCentralApproachSections:P.length-1}};
}
