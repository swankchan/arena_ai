import * as THREE from 'three/webgpu';
import {attribute} from 'three/tsl';
import {MURRAY_SITE as SITE, MURRAY_CASSIA as TREE} from './murray-architecture.js';
import {authoredLocalToWorld, authoredWorldToLocal, projectHongKongLonLat} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {fullRoadSurfaceAt} from './full-meta.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {store,quad,meshStore,beam,merged} from './harbour-city-world-utils.js';

export const MURRAY_TREE_WORLD=Object.freeze(projectHongKongLonLat(TREE.lon,TREE.lat));
export const MURRAY_TREE_LOCAL=Object.freeze(authoredWorldToLocal(SITE,...MURRAY_TREE_WORLD));
const {x:TX,z:TZ}=MURRAY_TREE_LOCAL;
// The tree position is mapped. Forecourt boundary and paving are photo-directed, not surveyed.
export function buildMurrayCourtyard(root,datum,colliders){
 const ground=(x,z)=>{const p=authoredLocalToWorld(SITE,x,z);return hongKongTerrainHeight(p.x,p.z)-datum;};
 const base=ground(TX,TZ),roadFree=(x,z,margin=0)=>{const p=authoredLocalToWorld(SITE,x,z);return !fullRoadSurfaceAt(p.x,p.z,margin,ground(x,z)+datum);};
 const paving=store(),planter=store(),soil=store(),trunk=[],foliage=[],blossoms=[];
 let cells=0;
 // Gently terrain-following paving links the arcade edge to the mapped tree. Road ribbons are
 // excluded including a safety margin. The cells' shared height function avoids visual steps.
 for(let x=14.8;x<36.8;x++)for(let z=-23;z<-3;z++){
  const cx=x+.5,cz=z+.5;if(Math.hypot(cx-TX,cz-TZ)<2.9||!roadFree(cx,cz,1.1))continue;
  const v=(a,b)=>[a,ground(a,b)+.035,b],shade=(Math.floor(x+z)%5===0)?.43:.46;
  quad(paving,v(x,z),v(x+1,z),v(x+1,z+1),v(x,z+1),[shade,shade*.99,shade*.94]);cells++;
 }
 const n=48,rad=2.65;
 for(let i=0;i<n;i++){
  const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n,x1=TX+Math.cos(a)*rad,z1=TZ+Math.sin(a)*rad,x2=TX+Math.cos(b)*rad,z2=TZ+Math.sin(b)*rad;
  const h1=ground(x1,z1),h2=ground(x2,z2);
  quad(planter,[x1,h1-.1,z1],[x2,h2-.1,z2],[x2,h2+.32,z2],[x1,h1+.32,z1],[.38,.39,.36]);
  quad(soil,[TX,base+.18,TZ],[x1,h1+.18,z1],[x2,h2+.18,z2],[TX,base+.18,TZ],[.22,.23,.17]);
 }
 const vertex=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.94});vertex.colorNode=attribute('color');
 meshStore(root,paving,vertex,'The Murray Cassia forecourt paving',false);meshStore(root,planter,vertex,'The Murray Cassia circular planter',false);meshStore(root,soil,vertex,'The Murray Cassia planter soil',false);
 const bark=new THREE.MeshStandardMaterial({color:0x514a3c,roughness:1}),leaf=new THREE.MeshStandardMaterial({color:0x3d6245,roughness:1}),flower=new THREE.MeshStandardMaterial({color:0xd999a9,roughness:1});
 const radius=TREE.circumference/(2*Math.PI);
 const trunkGeo=new THREE.CylinderGeometry(radius*.68,radius,7.5,10);trunkGeo.translate(TX,base+3.75,TZ);trunk.push(trunkGeo);
 // Photograph-directed branch and canopy approximation. Real tree form and present condition vary.
 for(let k=0;k<11;k++){
  const a=k*Math.PI*2/11,dist=3.0+(k%3)*.75,by=base+9.8+(k%4)*.7,ex=TX+Math.cos(a)*dist,ez=TZ+Math.sin(a)*dist;
  beam(trunk,[TX,base+5.5+(k%3)*.4,TZ],[ex,by,ez],.20,.20);
  const g=new THREE.SphereGeometry(1,12,8);g.scale(2.3,1.55,2.1);g.translate(ex,by+.65,ez);foliage.push(g);
  for(let j=0;j<3;j++){const q=new THREE.SphereGeometry(.20+(j%2)*.06,7,5);q.translate(ex+Math.cos(a+j*1.6)*1.7,by+.5+j*.35,ez+Math.sin(a+j*1.6)*1.7);blossoms.push(q);}
 }
 const crown=new THREE.SphereGeometry(1,14,9);crown.scale(3.4,2.1,3.1);crown.translate(TX,base+14.4,TZ);foliage.push(crown);
 merged(root,trunk,bark,'The Murray mapped Cassia tree trunk and branches');merged(root,foliage,leaf,'The Murray Cassia green canopy');merged(root,blossoms,flower,'The Murray Cassia illustrative blossoms',false);
 // The raised planter is a solid obstruction. A slightly inset box approximates its circular edge.
 colliders.push(harbourCityLocalCollider(SITE,TX,TZ,3.5,3.5,datum+base-.3,datum+base+.4));
 return {treeLocal:MURRAY_TREE_LOCAL,treeWorld:MURRAY_TREE_WORLD,cells};
}
