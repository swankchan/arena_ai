import * as THREE from 'three/webgpu';
import {MURRAY_LOBBY as L} from './murray-lobby-site.js';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {authoredWorldToLocal} from './authored-landmark-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,beam,merged,store,quad,meshStore} from './harbour-city-world-utils.js';
import {attribute} from 'three/tsl';

// A single accessible section of the former car ramp, fitted approximately behind the eastern arcade.
// Endpoints and elevations are not surveyed. The full ramp wraps the building; this is not that full circuit.
export const MURRAY_RAMP=Object.freeze({x0:11.8,x1:13.35,z0:-23,z1:23,y0:-5.98,grade:.125});
export function murrayRampLocalHeight(z){return MURRAY_RAMP.y0+(z-MURRAY_RAMP.z0)*MURRAY_RAMP.grade;}
export function murrayRampGroundHeight(x,z,current,referenceY,datum){
 const p=authoredWorldToLocal(SITE,x,z),r=MURRAY_RAMP;
 if(p.x<r.x0 || p.x>r.x1 || p.z<r.z0 || p.z>r.z1)return current;
 const y=datum+murrayRampLocalHeight(p.z);
 // Do not snap a player well above the ramp down onto it or pull a distant lower layer up.
 if(referenceY<y-1.0 || referenceY>y+3.0)return current;
 return Math.max(current,y);
}
export function buildMurrayRamp(root,datum,colliders){
 const r=MURRAY_RAMP,tiles=store(),panel=store(),trim=[],lines=[];
 const material=new THREE.MeshStandardNodeMaterial({roughness:.9,side:THREE.DoubleSide});material.colorNode=attribute('color');
 const metal=new THREE.MeshStandardMaterial({color:0x8b765a,metalness:.55,roughness:.43});
 for(let z=r.z0;z<r.z1;z+=1){
  const z1=Math.min(z+1,r.z1),y=murrayRampLocalHeight(z),y1=murrayRampLocalHeight(z1);
  const shade=(z%4===0)?.34:.37;
  quad(tiles,[r.x0,y,z],[r.x1,y,z],[r.x1,y1,z1],[r.x0,y1,z1],[shade,shade*.99,shade*.94]);
  // Leave a 3.6 m access opening to the tree-facing lobby.
  if(z<L.doorMax && z1>L.doorMin)continue;
  // Panelled white parapet and thin bronze edge recall the converted ramp, not surveyed details.
  quad(panel,[r.x1,y-.16,z],[r.x1,y1-.16,z1],[r.x1,y1+.95,z1],[r.x1,y+.95,z],[.62,.63,.60]);
  beam(trim,[r.x1,y+.96,z],[r.x1,y1+.96,z1],.055,.055);
  if(z%2===0)beam(lines,[r.x1+.01,y+.03,z],[r.x1+.01,y+.94,z],.025,.025);
  colliders.push(harbourCityLocalCollider(SITE,r.x1,z+.5,.12,z1-z,datum+Math.min(y,y1)-.2,datum+Math.max(y,y1)+1));
 }
 meshStore(root,tiles,material,'The Murray former car ramp walkable paving',false);
 meshStore(root,panel,material,'The Murray former car ramp parapet',false);
 merged(root,trim,metal,'The Murray former car ramp bronze handrail',false);
 merged(root,lines,metal,'The Murray former car ramp panel joints',false);
 return {segments:r.z1-r.z0};
}
