import {MURRAY_GALLERY as G,buildMurrayGallery,murrayGalleryGroundHeight} from './murray-gallery.js';
import {buildMurrayRooftop} from './murray-rooftop.js';
import * as THREE from 'three/webgpu';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {MURRAY_LOBBY as L} from './murray-lobby-site.js';
import {authoredWorldToLocal,authoredLocalToWorld} from './authored-landmark-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,cylinder,merged} from './harbour-city-world-utils.js';
import {makeCanvasSign} from './tst-hotel-world-utils.js';

// This single simulated car is an approximate gameplay feature, not a surveyed lift bank.
export const MURRAY_LIFT=Object.freeze({x0:-1.6,x1:1.6,z0:-11.3,z1:-7.9,lobby:L.floor,gallery:G.floor,roof:88.3,speed:6,wait:2});
const E=MURRAY_LIFT, centerZ=(E.z0+E.z1)/2;
export function isMurrayLiftPoint(x,z){return x>E.x0+.18&&x<E.x1-.18&&z>E.z0+.18&&z<E.z1-.18;}
export function createMurrayLiftMotion(){return {y:E.lobby,target:E.lobby,wait:0,armed:true,moving:false,direction:1};}
export function advanceMurrayLiftMotion(s,dt,inside,callAt=null){
 const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
 if(s.moving){const diff=s.target-s.y;s.y+=Math.sign(diff)*Math.min(Math.abs(diff),E.speed*step);if(Math.abs(s.target-s.y)<1e-7){s.y=s.target;s.moving=false;s.armed=false;s.wait=0;}return s;}
 if(!inside){s.armed=true;if((callAt===E.lobby||callAt===E.gallery||callAt===E.roof)&&s.y!==callAt){s.wait+=step;if(s.wait>=E.wait){s.target=callAt;s.moving=true;s.wait=0;}}else s.wait=0;return s;}
 // At the intermediate landing an occupant may stay aboard; after five seconds
 // the journey continues in the same direction. At the end landings they must exit.
 if(!s.armed&&s.y===E.gallery){s.wait+=step;if(s.wait>=5){s.target=s.direction>0?E.roof:E.lobby;s.moving=true;s.wait=0;}return s;}
 if(s.armed){s.wait+=step;if(s.wait>=E.wait){if(s.y===E.lobby)s.direction=1;else if(s.y===E.roof)s.direction=-1;s.target=s.y===E.gallery?(s.direction>0?E.roof:E.lobby):E.gallery;s.moving=true;s.wait=0;}}
 return s;
}
export function murrayRoofHeight(x,z,current,ref,datum,lift){
 const p=authoredWorldToLocal(SITE,x,z),roof=datum+E.roof,car=datum+lift.y;
 if(isMurrayLiftPoint(p.x,p.z)&&Math.abs(lift.y-E.gallery)>.05&&Math.abs(ref-(datum+E.gallery))<.12)return datum+E.gallery;
 if(isMurrayLiftPoint(p.x,p.z)&&lift.y<E.roof-.05&&Math.abs(ref-roof)<.12)return roof;
 if(isMurrayLiftPoint(p.x,p.z)&&Math.abs(ref-car)<2.5)return car;
 if(Math.abs(p.x)<14.5&&Math.abs(p.z)<25.4&&Math.abs(ref-roof)<2.5)return roof;
 return murrayGalleryGroundHeight(x,z,current,ref,datum);
}
export function buildMurrayLift(root,datum,colliders){
 const shaft=[],jambs=[],carParts=[],carTrim=[],roof=[],rails=[],parapet=[],tables=[],legs=[],chairs=[];
 const dark=new THREE.MeshStandardMaterial({color:0x373e3d,roughness:.65}),stone=new THREE.MeshStandardMaterial({color:0x747b75,roughness:.89}),metal=new THREE.MeshStandardMaterial({color:0x93856b,roughness:.4,metalness:.6}),wood=new THREE.MeshStandardMaterial({color:0x61564a,roughness:.8});
 const h=E.roof-E.lobby+3,cy=(E.roof+E.lobby+3)/2;
 for(const x of [E.x0,E.x1]){box(shaft,[x,cy,centerZ],[.16,h,E.z1-E.z0]);colliders.push(harbourCityLocalCollider(SITE,x,centerZ,.16,E.z1-E.z0,datum+E.lobby-.2,datum+E.roof+3));}
 box(shaft,[0,cy,E.z1],[E.x1-E.x0,h,.16]);colliders.push(harbourCityLocalCollider(SITE,0,E.z1,E.x1-E.x0,.16,datum+E.lobby-.2,datum+E.roof+3));
 for(const y of [E.lobby,E.gallery,E.roof]){for(const x of [E.x0,E.x1])box(jambs,[x,y+1.5,E.z0],[.12,3,.16]);box(jambs,[0,y+3,E.z0],[3.3,.13,.16]);}
 merged(root,shaft,dark,'The Murray lift shaft');merged(root,jambs,metal,'The Murray lift landing frames',false);
 for(const [x,z,w,d] of [[(-14.6+E.x0)/2,0,E.x0+14.6,51],[(14.6+E.x1)/2,0,14.6-E.x1,51],[0,(-25.5+E.z0)/2,E.x1-E.x0,E.z0+25.5],[0,(25.5+E.z1)/2,E.x1-E.x0,25.5-E.z1]])box(roof,[x,E.roof-.25,z],[w,.5,d]);
 for(const z of [-25.1,25.1]){box(parapet,[0,E.roof+.36,z],[29,.72,.22]);box(rails,[0,E.roof+1,z],[29,.08,.08]);for(let x=-14;x<=14;x+=2)box(rails,[x,E.roof+.5,z],[.06,1,.06]);colliders.push(harbourCityLocalCollider(SITE,0,z,29,.12,datum+E.roof,datum+E.roof+1.1));}
 for(const x of [-14.2,14.2]){box(parapet,[x,E.roof+.36,0],[.22,.72,50]);box(rails,[x,E.roof+1,0],[.08,.08,50]);for(let z=-24;z<=24;z+=2)box(rails,[x,E.roof+.5,z],[.06,1,.06]);colliders.push(harbourCityLocalCollider(SITE,x,0,.12,50,datum+E.roof,datum+E.roof+1.1));}
 for(const x of [-9.8,9.8])for(const z of [2,10,18]){cylinder(tables,[x,E.roof+.73,z],.55,.08,16);cylinder(legs,[x,E.roof+.35,z],.06,.7,12);for(const dz of [-.9,.9]){box(chairs,[x,E.roof+.42,z+dz],[.62,.1,.58]);box(chairs,[x,E.roof+.74,z+dz+Math.sign(dz)*.25],[.62,.65,.08]);}colliders.push(harbourCityLocalCollider(SITE,x,z,1.25,2.6,datum+E.roof,datum+E.roof+1));}
 merged(root,roof,stone,'The Murray rooftop terrace floor');merged(root,rails,metal,'The Murray rooftop terrace guardrails',false);merged(root,parapet,stone,'The Murray rooftop terrace parapet');merged(root,tables,wood,'The Murray rooftop outdoor tables');merged(root,chairs,dark,'The Murray rooftop outdoor chairs');merged(root,legs,metal,'The Murray rooftop outdoor seating frames',false);
 buildMurrayRooftop(root,datum,E.roof,colliders);
 buildMurrayGallery(root,datum,colliders);
 const car=new THREE.Group();car.name='The Murray moving lift car';root.add(car);
 box(carParts,[0,-.1,centerZ],[3,.2,3.2]);box(carParts,[0,3,centerZ],[3,.14,3.2]);for(const x of [-1.46,1.46])box(carParts,[x,1.5,centerZ],[.08,3,3.2]);box(carParts,[0,1.5,E.z1-.08],[3,3,.08]);for(const x of [-1.4,1.4])box(carTrim,[x,1.4,E.z0+.08],[.08,2.8,.08]);merged(car,carParts,wood,'The Murray lift car interior');merged(car,carTrim,metal,'The Murray lift car door frame',false);
 for(const landing of [E.lobby,E.gallery,E.roof]){const sign=makeCanvasSign(3,.65,(ctx,c)=>{ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#eee2c5';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${Math.floor(c.height*.25)}px sans-serif`;ctx.fillText('WAIT HERE TO CALL',c.width/2,c.height*.32,c.width-16);ctx.fillText('WAIT INSIDE FOR NEXT FLOOR',c.width/2,c.height*.72,c.width-16);},{transparent:true,canvasWidth:768,canvasHeight:160});sign.rotation.y=Math.PI;sign.position.set(0,landing+3.45,E.z0-.15);sign.name='The Murray lift instructions';root.add(sign);}
 const cover=new THREE.Mesh(new THREE.BoxGeometry(3.2,.08,3.4),stone);cover.name='The Murray lift roof safety cover';cover.position.set(0,E.roof-.04,centerZ);root.add(cover);
 const galleryCover=new THREE.Mesh(new THREE.BoxGeometry(3.2,.08,3.4),stone);galleryCover.name='The Murray lift gallery safety cover';galleryCover.position.set(0,E.gallery-.04,centerZ);root.add(galleryCover);
 const state=createMurrayLiftMotion();car.position.y=state.y;let rider=null;
 return {group:car,state,groundHeightAt:(x,z,current,ref)=>murrayRoofHeight(x,z,current,ref,datum,state),update(dt,manager){
  const person=manager?.activeMode==='person'?manager.entities.person:null,p=person?authoredWorldToLocal(SITE,person.position.x,person.position.z):null;
  const inside=!!person&&isMurrayLiftPoint(p.x,p.z)&&Math.abs(person.position.y-(datum+state.y))<1.2;
  const near=!!person&&p.x>E.x0&&p.x<E.x1&&p.z>=E.z0-2&&p.z<=E.z0;
  const callAt=near&&Math.abs(person.position.y-(datum+E.lobby))<1?E.lobby:near&&Math.abs(person.position.y-(datum+E.gallery))<1?E.gallery:near&&Math.abs(person.position.y-(datum+E.roof))<1?E.roof:null;
  const wasMoving=state.moving;
  // Keep the passenger in the car throughout a journey, but never pull a player back
  // after switching mode or teleporting away. Empty recalls do not acquire passengers.
  if(rider&&(person!==rider||!p||Math.hypot(p.x,p.z-centerZ)>5||Math.abs(person.position.y-(datum+state.y))>3))rider=null;
  advanceMurrayLiftMotion(state,dt,inside,callAt);
  if(!wasMoving&&state.moving&&inside)rider=person;
  car.position.y=state.y;cover.visible=state.y<E.roof-.05;galleryCover.visible=Math.abs(state.y-E.gallery)>.05;
  if(rider){const w=authoredLocalToWorld(SITE,0,centerZ);rider.position.set(w.x,datum+state.y,w.z);rider.verticalVel=0;rider.speed=0;if(rider.mesh)rider.mesh.position.copy(rider.position);}
  if(wasMoving&&!state.moving)rider=null;
 }};
}
