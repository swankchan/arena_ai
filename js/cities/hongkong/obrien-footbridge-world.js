import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import { box, beam, merged, nightAmount } from './harbour-city-world-utils.js';
import { segmentWall } from './colliders.js';
import { hongKongTerrainHeight } from './terrain.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';
import { OBRIEN_ROUTE as route, OBRIEN_STAIR as stair, OBRIEN_WIDTH as width, OBRIEN_DECK_HEIGHT as deck, OBRIEN_SLAB as slab, OBRIEN_STAIR_WIDTH as stairWidth, obrienFootbridgeGroundHeight, CENTRAL_PLAZA_LINK as plazaLink, WANCHAI_A5_APPROACH as a5 } from './obrien-footbridge-architecture.js';

export function buildObrienFootbridge(scene){
 const group=new THREE.Group();group.name="O'Brien Road Footbridge HF95";scene.add(group);
 const decks=[],roofs=[],rails=[],posts=[],lights=[],tactile=[],piers=[],steps=[],joints=[],stairRoof=[],stairNosing=[],stairLights=[],colliders=[];
 const stone=new THREE.MeshStandardMaterial({color:0x727873,roughness:.88,metalness:.06});
 const roofMat=new THREE.MeshStandardMaterial({color:0xaaaead,roughness:.75,metalness:.16});
 const steel=new THREE.MeshStandardMaterial({color:0x606b68,roughness:.4,metalness:.65});
 const seam=new THREE.MeshStandardMaterial({color:0x3a403d,roughness:.9});
 const yellow=new THREE.MeshStandardMaterial({color:0xa89961,roughness:.8});
 const lamp=new THREE.MeshStandardNodeMaterial({color:0xc8c8bc,roughness:.65});lamp.emissiveNode=color(0xffe6bb).mul(nightAmount()).mul(.95);
 function line(a,b,w=width,withRoof=true,placePiers=true){
  const dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,nx=-uz,nz=ux,rot=Math.atan2(-dz,dx),mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
  box(decks,[mid.x,deck-slab/2,mid.z],[L+.05,slab,w],rot);
  if(withRoof){
   // Thin dark paving joints and periodic dark accent bands, not a flat white sheet.
   const tileCount=Math.max(1,Math.round(L/.85));
   for(let i=0;i<=tileCount;i++){const t=i/tileCount,x=a.x+dx*t,z=a.z+dz*t;beam(joints,[x-nx*w/2,deck+.016,z-nz*w/2],[x+nx*w/2,deck+.016,z+nz*w/2],.025,.025);}
   for(let offset=-w/2+.85;offset<w/2;offset+=.85)beam(joints,[a.x+nx*offset,deck+.016,a.z+nz*offset],[b.x+nx*offset,deck+.016,b.z+nz*offset],.025,.025);
  }
  if(withRoof){box(roofs,[mid.x,deck+3.55,mid.z],[L+.05,.22,w],rot);
   const num=Math.max(1,Math.floor(L/7));for(let k=0;k<num;k++){let t=(k+.5)/num,x=a.x+dx*t,z=a.z+dz*t;box(lights,[x,deck+3.42,z],[1.2,.04,.35],rot);}
  }
  // Side rails stop at the stair junction to avoid a false wall across the access.
  const n=Math.ceil(L/.8);
  for(const side of [-1,1]){
   for(let i=0;i<n;i++){
    let t=(i+.5)/n,x=a.x+dx*t+nx*side*w/2,z=a.z+dz*t+nz*side*w/2;
    const junction=Math.hypot(x-stair.junction.x,z-stair.junction.z)<4.8;
    if(junction)continue;
    beam(rails,[x,deck,z],[x,deck+1.15,z],.05);
   }
   // Short beam pieces likewise leave the branch opening, not just the vertical bars.
   for(let i=0;i<n;i++){
    let t=(i+.5)/n,x=a.x+dx*t+nx*side*w/2,z=a.z+dz*t+nz*side*w/2;
    if(Math.hypot(x-stair.junction.x,z-stair.junction.z)<4.8)continue;
    const t0=i/n,t1=(i+1)/n;for(const y of [deck+.16,deck+1.15])beam(rails,[a.x+dx*t0+nx*side*w/2,y,a.z+dz*t0+nz*side*w/2],[a.x+dx*t1+nx*side*w/2,y,a.z+dz*t1+nz*side*w/2],.065);
    const c=segmentWall(a.x+dx*t0+nx*side*w/2,a.z+dz*t0+nz*side*w/2,a.x+dx*t1+nx*side*w/2,a.z+dz*t1+nz*side*w/2,{thickness:.07,base:deck,maxY:deck+1.2,top:deck+1.2});if(c)colliders.push(c);
   }
  }
  if(withRoof){
   box(tactile,[mid.x+nx*(w/2-.7),deck+.012,mid.z+nz*(w/2-.7)],[L,.025,.16],rot);
   const nSupports=Math.max(1,Math.ceil(L/12));for(let i=0;i<nSupports;i++){
    const t=(i+.5)/nSupports,x=a.x+dx*t,z=a.z+dz*t;
    for(const side of [-1,1]){const sx=x+nx*side*(w/2-.15),sz=z+nz*side*(w/2-.15);beam(posts,[sx,deck,sz],[sx,deck+3.5,sz],.12);}
    const ground=hongKongTerrainHeight(x,z);
    // Never place ground piers on carriageways, including inferred widths + buffer.
    if(placePiers && !fullRoadSurfaceAt(x,z,1.1,ground) && ground<deck-slab-1){
     box(piers,[x,(ground+deck-slab)/2,z],[.7,deck-slab-ground,.7]);
     const c=segmentWall(x-.3,z,x+.3,z,{thickness:.35,base:ground,top:deck-slab});if(c)colliders.push(c);
    }
   }
  }
 }
 for(let i=0;i<route.length-1;i++)line(route[i],route[i+1]);
 // A5 upper approach. The unmapped underground concourse and escalator are
 // intentionally blocked off; do not let the player fall through the deck.
 line(a5.start,a5.end,width,true,false);
 const adx=a5.end.x-a5.start.x,adz=a5.end.z-a5.start.z,al=Math.hypot(adx,adz),anx=-adz/al,anz=adx/al;
 const terminal=[];
 for(let i=0;i<=12;i++){const o=(i/12-.5)*width,x=a5.end.x+anx*o,z=a5.end.z+anz*o;beam(terminal,[x,deck,z],[x,deck+1.15,z],.05);}
 for(const y of [deck+.16,deck+1.15])beam(terminal,[a5.end.x-anx*width/2,y,a5.end.z-anz*width/2],[a5.end.x+anx*width/2,y,a5.end.z+anz*width/2],.07);
 const endGuard=segmentWall(a5.end.x-anx*width/2,a5.end.z-anz*width/2,a5.end.x+anx*width/2,a5.end.z+anz*width/2,{thickness:.07,base:deck,top:deck+1.2});if(endGuard)colliders.push(endGuard);
 merged(group,terminal,steel,'Wan Chai A5 provisional end barrier');
 const a5Sign=makeCanvasSign(5.2,.8,(ctx,c)=>{ctx.fillStyle='#222728';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#e1e3db';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 105px sans-serif';ctx.fillText('灣仔站  Wan Chai Station   A5',c.width/2,c.height/2,c.width*.94);});
 a5Sign.position.set(a5.end.x,deck+2.85,a5.end.z);a5Sign.rotation.y=Math.atan2(-adx,-adz);a5Sign.name='Wan Chai A5 upper landing sign';group.add(a5Sign);
 // Covered link is OSM way 40491215, supported at the buildings rather than
 // inventing ground piers across the service access below.
 line(plazaLink.start,plazaLink.end,plazaLink.width,true,false);
 // Narrow uncovered connector between main bridge and the surveyed stair way.
 line(stair.top,stair.junction,stairWidth,false);
 const ground=hongKongTerrainHeight(stair.bottom.x,stair.bottom.z),dx=stair.top.x-stair.bottom.x,dz=stair.top.z-stair.bottom.z,L=Math.hypot(dx,dz),rot=Math.atan2(-dz,dx),nx=-dz/L,nz=dx/L;
 const count=Math.ceil((deck-ground)/.17),stepRun=L/count;
 for(let i=0;i<count;i++){
  const t=(i+.5)/count,y=ground+(deck-ground)*(i+1)/count;
  box(steps,[stair.bottom.x+dx*t,y-.08,stair.bottom.z+dz*t],[stepRun+.02,.16,stairWidth],rot);
  const end=(i+1)/count,x=stair.bottom.x+dx*end,z=stair.bottom.z+dz*end;
  beam(stairNosing,[x-nx*(stairWidth/2-.03),y+.008,z-nz*(stairWidth/2-.03)],[x+nx*(stairWidth/2-.03),y+.008,z+nz*(stairWidth/2-.03)],.025,.035);
 }
 // OSM 148858993 is covered. Exact roof profile and the adjacent escalator's
 // position are not surveyed: this simple pitched canopy follows the stair.
 const rise=deck-ground,slope=Math.atan2(rise,L),slopeLength=Math.hypot(L,rise);
 const roof=new THREE.BoxGeometry(slopeLength+.05,.18,stairWidth+.3);
 roof.rotateZ(slope);roof.rotateY(rot);roof.translate((stair.bottom.x+stair.top.x)/2,(ground+deck)/2+3.45,(stair.bottom.z+stair.top.z)/2);stairRoof.push(roof);
 for(let t=.1;t<1;t+=.2){
  const x=stair.bottom.x+dx*t,z=stair.bottom.z+dz*t,y=ground+rise*t;
  for(const side of [-1,1])beam(posts,[x+nx*side*(stairWidth/2-.08),y,z+nz*side*(stairWidth/2-.08)],[x+nx*side*(stairWidth/2-.08),y+3.35,z+nz*side*(stairWidth/2-.08)],.08);
  box(stairLights,[x,y+3.32,z],[.6,.035,.24],rot);
 }
 for(const side of [-1,1]){
  const a=[stair.bottom.x+nx*side*stairWidth/2,ground+1,stair.bottom.z+nz*side*stairWidth/2];
  const b=[stair.top.x+nx*side*stairWidth/2,deck+1,stair.top.z+nz*side*stairWidth/2];beam(rails,a,b,.07);
  for(let i=0;i<=count;i+=3){let t=i/count;beam(rails,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-1,a[2]+(b[2]-a[2])*t],[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],.05);}
  const n=Math.ceil(L/1.2);
  for(let i=0;i<n;i++){
   const t=i/n,u=(i+1)/n,x0=a[0]+(b[0]-a[0])*t,z0=a[2]+(b[2]-a[2])*t,x1=a[0]+(b[0]-a[0])*u,z1=a[2]+(b[2]-a[2])*u;
   const c=segmentWall(x0,z0,x1,z1,{thickness:.045,base:ground+(deck-ground)*t,top:ground+(deck-ground)*u+1.1});if(c)colliders.push(c);
  }
 }
 merged(group,decks,stone,'HF95 concrete deck');merged(group,roofs,roofMat,'HF95 covered canopy');merged(group,stairRoof,roofMat,'HF95 stair canopy');merged(group,rails,steel,'HF95 balustrades');merged(group,posts,steel,'HF95 canopy supports');
 merged(group,joints,seam,'HF95 paving joints',false);merged(group,stairNosing,seam,'HF95 stair nosings',false);merged(group,stairLights,lamp,'HF95 stair night lights',false);merged(group,lights,lamp,'HF95 night ceiling luminaires',false);merged(group,tactile,yellow,'HF95 tactile guidance strips',false);merged(group,piers,stone,'HF95 road-safe piers');merged(group,steps,stone,'HF95 OSM access stairs');
 return {group,colliders,landmarks:[],groundHeightAt:(x,z,current,ref)=>obrienFootbridgeGroundHeight(x,z,current,ref,ground),stats:{obrienFootbridgeSegments:route.length-1,obrienFootbridgeStairSteps:count}};
}
