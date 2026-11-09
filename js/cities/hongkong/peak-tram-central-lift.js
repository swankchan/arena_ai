import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {makeCanvasSign} from './tst-hotel-world-utils.js';
import {ST_JOHNS_SITE as S} from './st-johns-building-site.js';
import {authoredLocalToWorld,authoredWorldToLocal} from './authored-landmark-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {CENTRAL_CONCOURSE as C,CENTRAL_LIFT_LOCAL as L} from './peak-tram-central-concourse-site.js';
import {box,merged,nightAmount} from './harbour-city-world-utils.js';
const isInside=p=>p.x>L.x0+.17&&p.x<L.x1-.17&&p.z>L.z0+.17&&p.z<L.z1-.17;
export function createCentralLiftState(){return {y:C.upper,target:C.upper,moving:false,wait:0,armed:true};}
export function advanceCentralLift(s,dt,inside,call){const d=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
 if(s.moving){s.y+=Math.sign(s.target-s.y)*Math.min(Math.abs(s.target-s.y),d*1.4);if(Math.abs(s.y-s.target)<1e-7){s.y=s.target;s.moving=false;s.armed=false;s.wait=0;}return;}
 if(!inside){s.armed=true;if((call===C.upper||call===C.low)&&call!==s.y){s.wait+=d;if(s.wait>=1){s.target=call;s.moving=true;s.wait=0;}}else s.wait=0;return;}
 if(s.armed){s.wait+=d;if(s.wait>=2){s.target=s.y===C.upper?C.low:C.upper;s.wait=0;s.moving=true;}}
}
export function buildCentralLift(scene){
 const root=new THREE.Group();root.name='Central inferred entrance lift';root.position.set(S.x,0,S.z);root.rotation.y=S.ry;scene.add(root);const colliders=[],shaft=[],trim=[],carParts=[],steel=new THREE.MeshStandardMaterial({color:0x75827e,roughness:.4,metalness:.55}),stone=new THREE.MeshStandardMaterial({color:0x544f48,roughness:.84});
 const h=C.upper-C.low+3,mid=(C.upper+C.low+3)/2;for(const z of [L.z0,L.z1]){box(shaft,[L.x,mid,z],[3,h,.12]);colliders.push(harbourCityLocalCollider(S,L.x,z,3,.12,C.low-.2,C.upper+3));}
 box(shaft,[L.x0,(C.low+2.4+C.upper+3)/2,L.z],[.12,C.upper+3-C.low-2.4,3]);colliders.push(harbourCityLocalCollider(S,L.x0,L.z,.12,3,C.low+2.4,C.upper+3));
 for(const x of [L.x0,L.x1])for(const z of [L.z0,L.z1])box(trim,[x,mid,z],[.1,h,.1]);
 merged(root,shaft,stone,'Central lift shaft side walls');merged(root,trim,steel,'Central lift jambs');const car=new THREE.Group();car.name='Central entrance lift car';root.add(car);box(carParts,[L.x,-.1,L.z],[2.85,.2,2.85]);box(carParts,[L.x,2.8,L.z],[2.85,.12,2.85]);for(const z of [L.z0+.08,L.z1-.08])box(carParts,[L.x,1.4,z],[2.85,2.8,.08]);merged(car,carParts,steel,'Central lift car panels');const lampParts=[];for(const z of [L.z-.85,L.z+.85])box(lampParts,[L.x,2.72,z],[2.3,.035,.08]);const lamp=new THREE.MeshStandardNodeMaterial({color:0xffe0b5});lamp.emissiveNode=color(0xffc885).mul(nightAmount()).mul(1.3);merged(car,lampParts,lamp,'Central lift ceiling lights',false);const carLight=new THREE.PointLight(0xffddad,4,7,2);carLight.position.set(L.x,2.0,L.z);car.add(carLight);
 if(typeof document!=='undefined'){const sign=makeCanvasSign(2.65,.55,(ctx,c)=>{ctx.fillStyle='#343c39';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#f3e9d4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${Math.floor(c.height*.25)}px sans-serif`;ctx.fillText('LIFT TO PLATFORM',c.width/2,c.height*.32);ctx.fillText('WAIT INSIDE  •  等候升降機',c.width/2,c.height*.72);},{transparent:false,canvasWidth:768,canvasHeight:160});sign.position.set(L.x1+.075,C.upper+2.65,L.z);sign.rotation.y=Math.PI/2;sign.name='Central lift instructions';root.add(sign);}
 const cover=new THREE.Mesh(new THREE.BoxGeometry(3,.08,3),stone);cover.position.set(L.x,C.upper-.05,L.z);cover.name='Central lift upper safety cover';root.add(cover);const lowerCover=new THREE.Mesh(new THREE.BoxGeometry(3,.08,3),stone);lowerCover.position.set(L.x,C.low-.05,L.z);lowerCover.name='Central lift lower safety cover';root.add(lowerCover);
 const state=createCentralLiftState();car.position.y=state.y;let rider=null;
 return {root,colliders,state,groundHeightAt(x,z,current,ref){const p=authoredWorldToLocal(S,x,z);if(!isInside(p))return current;if(Math.abs(ref-state.y)<1.2)return state.y;if(Math.abs(ref-C.upper)<.25)return C.upper;if(Math.abs(ref-C.low)<.25)return C.low;return current;},update(dt,manager){
  const person=manager?.activeMode==='person'?manager.entities.person:null,p=person?authoredWorldToLocal(S,person.position.x,person.position.z):null,inside=!!person&&isInside(p)&&Math.abs(person.position.y-state.y)<1.1;
  const near=!!person&&p.z>L.z0&&p.z<L.z1&&p.x>L.x0-1.8&&p.x<L.x1+1.8;const call=near&&Math.abs(person.position.y-C.upper)<.6?C.upper:near&&Math.abs(person.position.y-C.low)<.6?C.low:null;
  if(rider&&(rider!==person||!p||Math.hypot(p.x-L.x,p.z-L.z)>4||Math.abs(person.position.y-state.y)>3))rider=null;
  const moving=state.moving;advanceCentralLift(state,dt,inside,call);if(!moving&&state.moving&&inside)rider=person;car.position.y=state.y;car.updateMatrixWorld(true);cover.visible=Math.abs(state.y-C.upper)>.05;lowerCover.visible=Math.abs(state.y-C.low)>.05;
  if(rider){const w=authoredLocalToWorld(S,L.x,L.z);rider.position.set(w.x,state.y,w.z);rider.verticalVel=0;rider.speed=0;rider.mesh?.position.copy(rider.position);}if(moving&&!state.moving)rider=null;
 }};
}
