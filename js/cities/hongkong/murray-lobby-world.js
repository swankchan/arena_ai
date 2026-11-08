import * as THREE from 'three/webgpu';
import {MURRAY_LOBBY as L} from './murray-lobby-site.js';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,merged,store,quad,meshStore} from './harbour-city-world-utils.js';

// Photo-directed interpretation of the lower lobby: marble, bronze slatted ceiling, lounge seating.
// Furniture and dimensions are schematic; the rest of the hotel is not yet accessible.
export function buildMurrayLobby(root,datum,colliders){
 const floor=[],lines=[],ceiling=store(),slats=[],walls=[],furniture=[],legs=[];
 const black=new THREE.MeshStandardMaterial({color:0x292d2c,roughness:.3,metalness:.1});
 const bronze=new THREE.MeshStandardMaterial({color:0x8e7450,roughness:.38,metalness:.6});
 const lightStone=new THREE.MeshStandardMaterial({color:0xc5c2b5,roughness:.75});
 const upholstery=new THREE.MeshStandardMaterial({color:0x817e75,roughness:.95});
 const w=L.halfWidth*2,d=L.z1-L.z0,cz=(L.z0+L.z1)/2,y=L.floor;
 box(floor,[0,y-.12,cz],[w,.24,d]);
 // Fine joints and bronze inlay break up the polished dark floor, matching the reference photographs.
 for(let x=-10;x<=10;x+=2)box(lines,[x,y+.008,cz],[.018,.016,d-.1]);
 for(let z=L.z0+2;z<L.z1;z+=2)box(lines,[0,y+.009,z],[w-.1,.018,.018]);
 for(const x of [-8,8])box(lines,[x,y+.02,cz],[.045,.02,d-2]);
 for(const z of [L.z0+1,L.z1-1])box(lines,[0,y+.02,z],[16,.02,.045]);
 // The underside of the old ramp is expressed as a gently inclined bronze ceiling.
 for(let z=L.z0;z<L.z1;z+=.5){const height=2.0+(z-L.z0)*.10;box(slats,[0,height,z],[w-.5,.12,.11]);}
 quad(ceiling,[-L.halfWidth+.15,2.12,L.z0],[L.halfWidth-.15,2.12,L.z0],[L.halfWidth-.15,3.62,L.z1],[-L.halfWidth+.15,3.62,L.z1],[.18,.17,.15]);
 // A light stone screen separates this first lobby room from the unmodelled interior beyond.
 box(walls,[0,-.9,L.z1],[w,8.2,.2]);
 colliders.push(harbourCityLocalCollider(SITE,0,L.z1,w,.2,datum+y-.2,datum+4));
 // Reception and two lounge groupings, leaving a generous central path from the door.
 box(walls,[-8,y+1.3,cz],[2.8,2.6,5.5]);
 box(furniture,[-5.8,y+.55,cz-4],[2.0,1.1,1.0]);
 box(furniture,[-5.8,y+.55,cz+4],[2.0,1.1,1.0]);
 for(const z of [cz-4,cz+4]){
  box(furniture,[-3.8,y+.36,z],[.9,.72,.9]);
  box(legs,[-3.8,y+.16,z],[.5,.32,.5]);
 }
 for(const [x,z,sx,sz] of [[-8,cz,2.8,5.5],[-5.8,cz-4,2,1],[-5.8,cz+4,2,1],[-3.8,cz-4,.9,.9],[-3.8,cz+4,.9,.9]])
  colliders.push(harbourCityLocalCollider(SITE,x,z,sx,sz,datum+y,datum+y+2.6));
 merged(root,floor,black,'The Murray lobby polished dark stone floor');merged(root,lines,bronze,'The Murray lobby marble joints and bronze inlay',false);
 const ceilingMaterial=new THREE.MeshStandardMaterial({color:0x514a3d,roughness:.9,side:THREE.DoubleSide});
 meshStore(root,ceiling,ceilingMaterial,'The Murray lobby ceiling');merged(root,slats,bronze,'The Murray lobby bronze slatted ceiling',false);
 merged(root,walls,lightStone,'The Murray lobby stone reception and partition');merged(root,furniture,upholstery,'The Murray lobby lounge furniture');merged(root,legs,bronze,'The Murray lobby furniture bases');
 return {floor:datum+y};
}
