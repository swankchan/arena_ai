import * as THREE from 'three/webgpu';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {authoredWorldToLocal} from './authored-landmark-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,beam,merged} from './harbour-city-world-utils.js';

// A 27-step connection, as described in the published visitor account. Position,
// elevation, width, and form are approximate; no as-built stair drawings are available.
export const MURRAY_STAIRS=Object.freeze({x0:-10.4,x1:-8.4,z0:-20,z1:-13,steps:27,bottom:-5,rise:.18});
export function isMurrayStairsLocal(x,z){const s=MURRAY_STAIRS;return x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1;}
export function murrayStairLocalHeight(z){const s=MURRAY_STAIRS,n=Math.max(0,Math.min(s.steps,Math.floor((z-s.z0)/(s.z1-s.z0)*s.steps)+1));return s.bottom+n*s.rise;}
export function murrayStairGroundHeight(x,z,current,ref,datum){
 const p=authoredWorldToLocal(SITE,x,z);if(!isMurrayStairsLocal(p.x,p.z))return current;
 const y=datum+murrayStairLocalHeight(p.z);return ref>=y-1&&ref<=y+2.5?y:current;
}
export function buildMurrayStairs(root,datum,colliders){
 const s=MURRAY_STAIRS,steps=[],rails=[],posts=[],joint=[],dz=(s.z1-s.z0)/s.steps;
 const stone=new THREE.MeshStandardMaterial({color:0x252a29,roughness:.42}),metal=new THREE.MeshStandardMaterial({color:0x988060,metalness:.56,roughness:.4});
 for(let i=0;i<s.steps;i++){
  const z=s.z0+i*dz,top=s.bottom+(i+1)*s.rise,h=top-s.bottom;
  box(steps,[(s.x0+s.x1)/2,s.bottom+h/2,z+dz/2],[s.x1-s.x0,h,dz+.001]);
  box(joint,[(s.x0+s.x1)/2,top+.005,z+dz-.015],[s.x1-s.x0-.05,.01,.025]);
 }
 for(const x of [s.x0,s.x1]){
  beam(rails,[x,s.bottom+1,s.z0],[x,s.bottom+s.steps*s.rise+1,s.z1],.065,.065);
  for(let i=0;i<=s.steps;i+=3){let z=s.z0+i*dz,y=s.bottom+i*s.rise;box(posts,[x,y+.5,z],[.06,1,.06]);}
  for(let i=0;i<s.steps;i++){let z=s.z0+(i+.5)*dz,low=s.bottom+i*s.rise;colliders.push(harbourCityLocalCollider(SITE,x,z,.09,dz,datum+low-.1,datum+low+s.rise+1));}
 }
 merged(root,steps,stone,'The Murray garden stair marble treads');merged(root,joint,metal,'The Murray garden stair bronze nosings',false);merged(root,rails,metal,'The Murray garden stair handrails',false);merged(root,posts,metal,'The Murray garden stair balusters',false);
 return {steps:s.steps};
}
