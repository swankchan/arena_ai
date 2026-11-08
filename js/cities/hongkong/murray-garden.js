import * as THREE from 'three/webgpu';
import {MURRAY_GALLERY as G,MURRAY_GARDEN as R} from './murray-gallery.js';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,cylinder,merged} from './harbour-city-world-utils.js';

// Garden Lounge inspired by published interiors; position and furniture layout
// are provisional and not a reconstruction of the actual surveyed plan.
export function buildMurrayGarden(root,datum,colliders){
 const y=G.floor,slabs=[],carpet=[],frames=[],glass=[],tables=[],chairs=[],legs=[],lamps=[],lights=[],screens=[];
 const black=new THREE.MeshStandardMaterial({color:0x292e2c,metalness:.08,roughness:.3});
 const rug=new THREE.MeshStandardMaterial({color:0x9e9b8e,roughness:.96});
 const cream=new THREE.MeshStandardMaterial({color:0xc0bdb0,roughness:.92});
 const top=new THREE.MeshStandardMaterial({color:0xc3bfb3,roughness:.45});
 const metal=new THREE.MeshStandardMaterial({color:0x897451,metalness:.62,roughness:.4});
 const pane=new THREE.MeshStandardMaterial({color:0x849b92,transparent:true,opacity:.16,metalness:.08,roughness:.2,depthWrite:false,side:THREE.DoubleSide});
 const glow=new THREE.MeshStandardMaterial({color:0xd8b980,emissive:0xd4ad70,emissiveIntensity:.4,roughness:.45});
 box(slabs,[0,y-.15,(R.z0+R.z1)/2],[R.x1-R.x0,.3,R.z1-R.z0]);
 for(const x of [-3.25,3.25])box(carpet,[x,y+.008,6.5],[3.8,.016,21]);
 // Dark slatted ceiling and luminous square frames, both visible in reference photos.
 box(slabs,[0,y+4.25,6.5],[11,.18,23]);
 for(let z=R.z0+.2;z<R.z1;z+=.24)box(frames,[0,y+4.12,z],[10.8,.07,.04]);
 for(const z of [-2,4,10,16])for(const x of [-3.1,3.1]){
  for(const dx of [-.65,.65])box(lights,[x+dx,y+3.85,z],[.035,.04,1.3]);
  for(const dz of [-.65,.65])box(lights,[x,y+3.85,z+dz],[1.3,.04,.035]);
  for(const dx of [-.55,.55])box(frames,[x+dx,y+4,z],[.015,.3,.015]);
 }
 // Transparent screens and bronze mullions; the east opening is a real doorway.
 for(const [x,a,b] of [[R.x0,R.z0,R.z1],[R.x1,R.z0,R.door0],[R.x1,R.door1,R.z1]]){
  box(glass,[x,y+2,(a+b)/2],[.035,4,b-a]);
  for(let z=a;z<b;z+=2.2)box(frames,[x,y+2,z],[.07,4,.07]);
  box(frames,[x,y+4,(a+b)/2],[.07,.08,b-a]);
  colliders.push(harbourCityLocalCollider(SITE,x,(a+b)/2,.08,b-a,datum+y,datum+y+4));
 }
 for(const z of [R.z0,R.z1]){
  box(glass,[0,y+2,z],[11,4,.035]);
  for(let x=-5.5;x<=5.5;x+=2.2)box(frames,[x,y+2,z],[.07,4,.07]);
  colliders.push(harbourCityLocalCollider(SITE,0,z,11,.08,datum+y,datum+y+4));
 }
 // Low table clusters leave the central circulation aisle and entrance clear.
 for(const x of [-3.25,3.25])for(const z of [0,8,15]){
  cylinder(tables,[x,y+.73,z],.68,.08,24);cylinder(legs,[x,y+.35,z],.08,.7,12);
  for(const dz of [-1.05,1.05]){
   box(chairs,[x,y+.45,z+dz],[.72,.14,.68]);
   box(chairs,[x,y+.79,z+dz+Math.sign(dz)*.27],[.72,.7,.14]);
   for(const dx of [-.27,.27])for(const dzz of [-.22,.22])box(legs,[x+dx,y+.2,z+dz+dzz],[.05,.4,.05]);
  }
  cylinder(lamps,[x,y+.82,z],.13,.12,12);
  colliders.push(harbourCityLocalCollider(SITE,x,z,1.5,2.9,datum+y,datum+y+1.2));
 }
 // A faceted, perforated-looking screen evokes the handmade glass partitions.
 for(const x of [-4.7,4.7])for(let z=R.z0+.4;z<R.z0+1.6;z+=.3)for(let h=0;h<8;h++)box(screens,[x,y+.25+h*.45,z],[.12,.26,.12]);
 merged(root,slabs,black,'The Murray Garden Lounge floor and ceiling');merged(root,carpet,rug,'The Murray Garden Lounge carpets');
 merged(root,glass,pane,'The Murray Garden Lounge glazing',false);merged(root,frames,metal,'The Murray Garden Lounge bronze framing',false);
 merged(root,tables,top,'The Murray Garden Lounge tables');merged(root,chairs,cream,'The Murray Garden Lounge cream seating');merged(root,legs,black,'The Murray Garden Lounge furniture bases');
 merged(root,lights,glow,'The Murray Garden Lounge square pendant lights',false);merged(root,lamps,glow,'The Murray Garden Lounge table lights',false);merged(root,screens,metal,'The Murray Garden Lounge decorative screens',false);
 return {floor:datum+y};
}
