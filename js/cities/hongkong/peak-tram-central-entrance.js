import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {CENTRAL_LIFT_LOCAL as L} from './peak-tram-central-concourse-site.js';
import {ST_JOHNS_SITE as S} from './st-johns-building-site.js';
import {authoredLocalToWorld} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,beam,cylinder,merged,store,quad,meshStore,nightAmount,hash} from './harbour-city-world-utils.js';

// Approximate position on the downhill short end of the OSM office footprint.
// Neither the artwork's surveyed location nor interior plans are available.
export const CENTRAL_ENTRANCE=Object.freeze({poolX:22.7,poolZ:0,poolRadiusX:3.2,poolRadiusZ:4.1,entryX:15.65});
export function centralEntranceGround(x,z){const p=authoredLocalToWorld(S,x,z);return hongKongTerrainHeight(p.x,p.z);}
export function buildPeakTramCentralEntrance(scene){
 const root=new THREE.Group();root.name='Peak Tram Central entrance and forecourt';root.position.set(S.x,0,S.z);root.rotation.y=S.ry;scene.add(root);
 const {poolX:cx,poolZ:cz}=CENTRAL_ENTRANCE,y=centralEntranceGround(cx-3.2,cz)+.04,base=centralEntranceGround(15.5,0)+.08,colliders=[];
 const stone=new THREE.MeshStandardMaterial({color:0x646b69,roughness:.94}),edge=new THREE.MeshStandardMaterial({color:0x9aaba9,roughness:.78}),red=new THREE.MeshStandardMaterial({color:0x8c3931,roughness:.8}),dark=new THREE.MeshStandardMaterial({color:0x21282a,roughness:.73}),steel=new THREE.MeshStandardMaterial({color:0xa4aaa5,metalness:.7,roughness:.3});
 const warm=new THREE.MeshStandardNodeMaterial({color:0xf2c685});warm.emissiveNode=color(0xffc270).mul(nightAmount()).mul(1.5);
 const bronze=new THREE.MeshStandardMaterial({color:0x12191a,metalness:.72,roughness:.34});
 const walls=[],trim=[],frames=[],lights=[],barriers=[],ceiling=[],ticket=[],floor=store(),hallFloor=store();
 // Oval shallow reflective pool, with its high rim clear of the sampled road.
 const water=new THREE.Mesh(new THREE.CircleGeometry(1,80),new THREE.MeshStandardMaterial({color:0x141e20,roughness:.13,metalness:.48}));water.rotation.x=-Math.PI/2;water.scale.set(3.0,3.9,1);water.position.set(cx,y+.09,cz);water.name='Eye of Infinity reflecting pool';root.add(water);
 const rim=new THREE.Mesh(new THREE.RingGeometry(.94,1,80),edge);rim.rotation.x=-Math.PI/2;rim.scale.set(3.35,4.25,1);rim.position.set(cx,y+.11,cz);rim.name='Reflecting pool stone rim';root.add(rim);
 const footing=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.3,80),stone);footing.scale.set(3.35,1,4.25);footing.position.set(cx,y-.07,cz);footing.name='Raised pool stone edge';root.add(footing);
 // Elongated torus, intentionally simplified: the light specks stand in for
 // the real thousands of perforations, not physical holes in the bronze.
 const eye=new THREE.Mesh(new THREE.TorusGeometry(1.35,.87,32,112),bronze);eye.scale.set(1,2.23,.75);eye.rotation.y=Math.PI/2;eye.position.set(cx,y+4.95,cz);eye.name='Eye of Infinity bronze sculpture';eye.castShadow=true;root.add(eye);
 const pin=[];for(let i=0;i<440;i++){let a=hash(i,2,71)*Math.PI*2,b=hash(i,8,19)*Math.PI*2,R=1.35+.876*Math.cos(b),z=R*Math.cos(a),yy=R*Math.sin(a)*2.23,x=.876*Math.sin(b)*.75;let g=new THREE.SphereGeometry(.018,5,4);g.translate(cx+x,y+4.95+yy,cz-z);pin.push(g);}merged(root,pin,warm,'Eye of Infinity illuminated perforation accents',false);
 colliders.push(harbourCityLocalCollider(S,cx,cz,2.0,4.5,y,y+10));
 // Rectangular threshold with actual open entry, flanked by stone panels.
 for(const z of [-5.25,5.25]){box(walls,[15.55,base+2.15,z],[.45,4.3,2.15]);colliders.push(harbourCityLocalCollider(S,15.55,z,.5,2.2,base,base+4.3));}
 box(walls,[15.55,base+4.15,0],[.5,.85,12.7]);box(trim,[15.86,base+3.67,0],[.08,.09,8.35]);
 for(const z of [-3.9,3.9]){box(frames,[15.35,base+1.8,z],[.18,3.6,.15]);colliders.push(harbourCityLocalCollider(S,15.35,z,.3,.25,base,base+3.6));}
 box(lights,[15.4,base+3.60,0],[.18,.08,7.5]);
 // Recessed red reveals and an open, unconnected waiting hall. The platform
 // connection is intentionally not represented as completed or walkable.
 for(const z of [-5.25,5.25]){box(walls,[10.9,base+2.0,z],[8.8,4,.25]);colliders.push(harbourCityLocalCollider(S,10.9,z,8.8,.25,base,base+4));box(trim,[15.05,base+1.8,z*.72],[.12,3.6,.25]);}
 box(ceiling,[10.95,base+4.08,0],[9.1,.16,10.25]);
 // An estimated ticket desk leaves the centre path open; the larger waiting
 // hall and its actual circulation still require a surveyed site fit.
 box(ticket,[8.1,base+.63,-3.65],[1.0,1.26,2.0]);
 colliders.push(harbourCityLocalCollider(S,8.1,-3.65,1.0,2.0,base,base+1.26));
 box(lights,[8.1,base+1.30,-3.65],[1.04,.06,2.04]);
 box(lights,[10.9,base+3.86,-2],[7.5,.08,.10]);box(lights,[10.9,base+3.86,2],[7.5,.08,.10]);
 for(let x=9;x<14;x+=1.8)for(const z of [-2.9,2.9]){cylinder(barriers,[x,base+.55,z],.038,1.1,8);}
 for(let z of [-2.9,2.9])beam(barriers,[9,base+1.1,z],[14.4,base+1.1,z],.035,.035);
 // Small red/grey paved approach drapes the terrain rather than moving roads.
 for(let x=15.9;x<27.9;x+=.6)for(let z=-6;z<6;z+=.6){let X=Math.min(x+.6,27.9),Z=Math.min(z+.6,6);let p=(a,b)=>[a,centralEntranceGround(a,b)+.035,b];quad(floor,p(x,z),p(x,Z),p(X,Z),p(X,z),[.45,.30,.27]);}
 for(let x=6.6;x<15.9;x+=.6)for(let z=-5;z<5;z+=.6){if(x+.3>L.x0&&x+.3<L.x1&&z+.3>L.z0&&z+.3<L.z1)continue;let X=Math.min(x+.6,15.9),Z=Math.min(z+.6,5),p=(a,b)=>[a,centralEntranceGround(a,b)+.045,b];quad(hallFloor,p(x,z),p(x,Z),p(X,Z),p(X,z),[.28,.28,.25]);}
 const pavement=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1});meshStore(root,floor,pavement,'Central forecourt red paving',false);meshStore(root,hallFloor,pavement,'Central entrance waiting hall floor',false);
 merged(root,ceiling,dark,'Central entrance ceiling');merged(root,ticket,red,'Central provisional ticket counter');merged(root,walls,stone,'Central station grey stone entrance');merged(root,trim,red,'Central entrance red reveals');merged(root,frames,steel,'Central entrance door frames');merged(root,lights,warm,'Central entrance and waiting room night lights',false);merged(root,barriers,steel,'Central waiting queue rails',false);
 // Canvas label is visual signage, not a substitute for physical door openings.
 if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#5c6665';ctx.fillRect(0,0,1024,192);ctx.fillStyle='#eee3c9';ctx.textAlign='center';ctx.font='bold 65px serif';ctx.fillText('THE PEAK TRAM   山頂纜車',512,123);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshStandardMaterial({map:t,side:THREE.DoubleSide,roughness:.9});const sign=new THREE.Mesh(new THREE.PlaneGeometry(7.5,1.4),m);sign.rotation.y=Math.PI/2;sign.position.set(15.84,base+4.18,0);sign.name='The Peak Tram entrance sign';root.add(sign);}}
 return {group:root,colliders,stats:{peakTramCentralEntrance:1,peakTramEyeLightPoints:440}};
}
