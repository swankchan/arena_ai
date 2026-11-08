import * as THREE from 'three/webgpu';
import {MURRAY_LIFT as E} from './murray-lift.js';
import {MURRAY_LOBBY as L} from './murray-lobby-site.js';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,sphere,merged,store,quad,meshStore} from './harbour-city-world-utils.js';

// Generated textures avoid copying photographs; their veining is illustrative.
function marbleTexture(dark){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.fillStyle=dark?'#252827':'#bbbcb5';ctx.fillRect(0,0,canvas.width,canvas.height);
 let seed=dark?893:431;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<(dark?115:85);i++){
  let x=rand()*1024,y=rand()*512,dx=25+rand()*120,dy=dark?(-20+rand()*40):(45+rand()*120);
  ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<7;j++){x+=dx/7+(rand()-.5)*4;y+=dy/7+(rand()-.5)*4;ctx.lineTo(x,y);}
  ctx.strokeStyle=dark?`rgba(211,216,205,${.08+rand()*.25})`:`rgba(86,91,89,${.04+rand()*.12})`;ctx.lineWidth=.35+rand()*.8;ctx.stroke();
 }
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;return tex;
}
// Photo-directed interpretation of the lower lobby: marble, bronze slatted ceiling, lounge seating.
// Furniture and dimensions are schematic; the rest of the hotel is not yet accessible.
export function buildMurrayLobby(root,datum,colliders){
 const floor=[],lines=[],wallJoints=[],screens=[],ceiling=store(),slats=[],walls=[],furniture=[],legs=[],counter=[],countertops=[],sculpture=[];
 const black=new THREE.MeshStandardMaterial({color:0x292d2c,roughness:.3,metalness:.1});
 const marbleFloor=new THREE.MeshStandardMaterial({map:marbleTexture(true),roughness:.28,metalness:.07});
 const charcoal=new THREE.MeshStandardMaterial({color:0x252624,roughness:.95});
 const bronze=new THREE.MeshStandardMaterial({color:0x8e7450,roughness:.38,metalness:.6});
 const lightStone=new THREE.MeshStandardMaterial({map:marbleTexture(false),roughness:.75});
 const upholstery=new THREE.MeshStandardMaterial({color:0x817e75,roughness:.95});
 const w=L.halfWidth*2,d=L.z1-L.z0,cz=(L.z0+L.z1)/2,y=L.floor;
 box(floor,[0,y-.12,cz],[w,.24,d]);
 // Fine joints and bronze inlay break up the polished dark floor, matching the reference photographs.
 for(let x=-10;x<=10;x+=2)box(lines,[x,y+.008,cz],[.018,.016,d-.1]);
 for(let z=L.z0+2;z<L.z1;z+=2)box(lines,[0,y+.009,z],[w-.1,.018,.018]);
 for(const x of [-8,8])box(lines,[x,y+.02,cz],[.045,.02,d-2]);
 for(const z of [L.z0+1,L.z1-1])box(lines,[0,y+.02,z],[16,.02,.045]);
 // Window screens deliberately stop at the tree-facing entrance.
 for(let z=L.z0+.18;z<L.z1;z+=.23)if(z<L.doorMin||z>L.doorMax){const top=2+(z-L.z0)*.10;box(screens,[L.halfWidth-.15,(y+top)/2,z],[.045,top-y,.045]);}
 // The underside of the old ramp is expressed as a gently inclined bronze ceiling.
 for(let z=L.z0;z<L.z1;z+=.5){const height=2.0+(z-L.z0)*.10;if(z>=E.z0&&z<=E.z1){box(slats,[(-L.halfWidth+E.x0)/2,height,z],[E.x0+L.halfWidth-.25,.12,.11]);box(slats,[(L.halfWidth+E.x1)/2,height,z],[L.halfWidth-E.x1-.25,.12,.11]);}else box(slats,[0,height,z],[w-.5,.12,.11]);}
 const ceilingY=z=>2.12+(z-L.z0)*.10;
 for(const [x0,x1,z0,z1] of [[-L.halfWidth+.15,L.halfWidth-.15,L.z0,E.z0],[-L.halfWidth+.15,E.x0,E.z0,E.z1],[E.x1,L.halfWidth-.15,E.z0,E.z1],[-L.halfWidth+.15,L.halfWidth-.15,E.z1,L.z1]])quad(ceiling,[x0,ceilingY(z0),z0],[x1,ceilingY(z0),z0],[x1,ceilingY(z1),z1],[x0,ceilingY(z1),z1],[.18,.17,.15]);
 // A light stone screen separates this first lobby room from the unmodelled interior beyond.
 box(walls,[0,-.9,L.z1],[w,8.2,.2]);
 colliders.push(harbourCityLocalCollider(SITE,0,L.z1,w,.2,datum+y-.2,datum+4));
 for(let x=-10;x<=10;x+=2.5)box(wallJoints,[x,-.9,L.z1-.11],[.025,8.1,.018]);
 for(const z of [cz-1.3,cz+1.3]){box(counter,[-8,y+.53,z],[1.2,1.06,2.1]);box(countertops,[-8,y+1.09,z],[1.6,.12,2.3]);box(lines,[-8,y+1.02,z],[1.65,.06,2.35]);}
 for(const z of [cz-4,cz+4]){box(furniture,[-5.8,y+.47,z],[2,.42,.85]);box(furniture,[-5.8,y+.83,z-.37],[2,.75,.12]);for(const x of [-6.7,-4.9]){box(furniture,[x,y+.70,z],[.16,.50,.85]);for(const zz of [-.3,.3])box(legs,[x,y+.19,z+zz],[.06,.38,.06]);}}
 // Decorative beaded form, not a literal reconstruction of the commissioned artwork.
 for(let i=0;i<9;i++){const x=-9.8+(i%3)*.22,z=L.z0+1.4+Math.floor(i/3)*.23;box(legs,[x,-.2,z],[.012,3.7,.012]);for(let j=0;j<7;j++)sphere(sculpture,[x,-1.9+j*.40,z],.045+(j%2)*.018,8);}

 for(const z of [cz-4,cz+4]){
  box(furniture,[-3.8,y+.36,z],[.9,.72,.9]);
  box(legs,[-3.8,y+.16,z],[.5,.32,.5]);
 }
 for(const [x,z,sx,sz] of [[-8,cz,2.8,5.5],[-5.8,cz-4,2,1],[-5.8,cz+4,2,1],[-3.8,cz-4,.9,.9],[-3.8,cz+4,.9,.9]])
  colliders.push(harbourCityLocalCollider(SITE,x,z,sx,sz,datum+y,datum+y+2.6));
 merged(root,floor,marbleFloor,'The Murray lobby polished dark stone floor');merged(root,lines,bronze,'The Murray lobby marble joints and bronze inlay',false);merged(root,wallJoints,bronze,'The Murray lobby marble panel joints',false);merged(root,screens,bronze,'The Murray lobby vertical bronze window screens',false);
 const ceilingMaterial=new THREE.MeshStandardMaterial({color:0x514a3d,roughness:.9,side:THREE.DoubleSide});
 meshStore(root,ceiling,ceilingMaterial,'The Murray lobby ceiling');merged(root,slats,bronze,'The Murray lobby bronze slatted ceiling',false);
 merged(root,walls,lightStone,'The Murray lobby stone reception and partition');merged(root,counter,black,'The Murray lobby reception counter supports');merged(root,countertops,lightStone,'The Murray lobby reception marble tops');merged(root,sculpture,charcoal,'The Murray lobby suspended charcoal inspired sculpture',false);merged(root,furniture,upholstery,'The Murray lobby lounge furniture');merged(root,legs,bronze,'The Murray lobby furniture bases');
 return {floor:datum+y};
}
