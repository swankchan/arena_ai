import {buildMurrayLift} from './murray-lift.js';
import {MURRAY_LOBBY as L,isMurrayLobbyLocal,murrayLobbyGroundHeight} from './murray-lobby-site.js';
import {buildMurrayLobby} from './murray-lobby-world.js';
import {buildMurrayRamp,murrayRampGroundHeight} from './murray-ramp.js';
import {buildMurrayCourtyard} from './murray-courtyard.js';
import * as THREE from 'three/webgpu';
import {attribute} from 'three/tsl';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {authoredHighestRawDatum,authoredLocalToWorld} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {fullRoadSurfaceAt} from './full-meta.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,beam,merged,store,quad,meshStore} from './harbour-city-world-utils.js';
import {makeCanvasSign} from './tst-hotel-world-utils.js';

// Photo-directed dimensions; the DTM construction datum is not an engineering survey.
const W=29.2,D=51.0,ARCH_TOP=14.0,UPPER_TOP=87.8,ROWS=21;
export function buildMurray(scene){
 const datum=authoredHighestRawDatum([SITE],hongKongTerrainHeight),root=new THREE.Group();
 root.name='美利大廈 The Murray';root.position.set(SITE.x,datum,SITE.z);root.rotation.y=SITE.ry;scene.add(root);
 const concrete=store(),reveals=store(),glass=store(),arches=store(),archSoffit=store(),paving=store();
 const trims=[],roof=[],piers=[],frames=[],lobby=[],colliders=[];
 const material=(roughness,metalness=0)=>{const m=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness,metalness});m.colorNode=attribute('color');return m;};
 const stone=new THREE.MeshStandardMaterial({color:0xb5b5ab,roughness:.84,side:THREE.DoubleSide}),dark=new THREE.MeshStandardMaterial({color:0xa1b3ad,roughness:.28,metalness:.1,side:THREE.DoubleSide,transparent:true,opacity:.3,depthWrite:false}),bronze=new THREE.MeshStandardMaterial({color:0x826b4d,roughness:.42,metalness:.65}),black=new THREE.MeshStandardMaterial({color:0x394544,roughness:.72}),terrace=new THREE.MeshStandardMaterial({color:0x71766d,roughness:.92});
 // Four facades: u runs horizontally along the wall; depth points inwards.
 const faces=[
  {len:D,bays:15,archBays:7,at:(u,y,d=0)=>[W/2-d,y,u],axis:'x',side:1},
  {len:D,bays:15,archBays:7,at:(u,y,d=0)=>[-W/2+d,y,-u],axis:'x',side:-1},
  {len:W,bays:8,archBays:4,at:(u,y,d=0)=>[-u,y,D/2-d],axis:'z',side:1},
  {len:W,bays:8,archBays:4,at:(u,y,d=0)=>[u,y,-D/2+d],axis:'z',side:-1}
 ];
 let windows=0,arcades=0;
 for(const f of faces){
  const rise=(UPPER_TOP-ARCH_TOP)/ROWS, archStep=f.len/f.archBays;
  for(let j=0;j<f.archBays;j++){
   const left=-f.len/2+j*archStep,right=left+archStep,c=(left+right)/2,opening=archStep-1.0,r=opening/2,spring=ARCH_TOP-1.55-r;
   const P=f.at;
   // Semicircular arch is actual open geometry, with curved intrados and independent piers.
   for(let i=0;i<12;i++){
    const a=-r+2*r*i/12,b=-r+2*r*(i+1)/12,ya=spring+Math.sqrt(Math.max(0,r*r-a*a)),yb=spring+Math.sqrt(Math.max(0,r*r-b*b));
    quad(arches,P(c+a,ya),P(c+b,yb),P(c+b,ARCH_TOP),P(c+a,ARCH_TOP),[.69,.70,.67]);
    quad(arches,P(c+a,ya,1.15),P(c+b,yb,1.15),P(c+b,ARCH_TOP,1.15),P(c+a,ARCH_TOP,1.15),[.59,.61,.59]);
    quad(archSoffit,P(c+a,ya),P(c+b,yb),P(c+b,yb,1.15),P(c+a,ya,1.15),[.48,.50,.48]);
   }
   // Front pier follows the terrain at its foot; arcade floor stays on the existing ground mesh.
   const ul=left+.5,local=P(ul,0,.55),world=authoredLocalToWorld(SITE,local[0],local[2]);
   const foot=Math.min(-.12,hongKongTerrainHeight(world.x,world.z)-datum-.12),height=ARCH_TOP-foot;
   if(f.axis==='x'){
    box(piers,[local[0],foot+height/2,local[2]],[1.15,height,1.0]);
    colliders.push(harbourCityLocalCollider(SITE,local[0],local[2],1.15,1.0,datum+foot,datum+ARCH_TOP));
   }else{
    box(piers,[local[0],foot+height/2,local[2]],[1.0,height,1.15]);
    colliders.push(harbourCityLocalCollider(SITE,local[0],local[2],1.0,1.15,datum+foot,datum+ARCH_TOP));
   }
   arcades++;
  }
  const step=f.len/f.bays;
  for(let j=0;j<f.bays;j++){
   const left=-f.len/2+j*step,right=left+step,P=f.at;
   // Grid of genuinely recessed, skewed window planes and four return surfaces.
   for(let row=0;row<ROWS;row++){
    const y0=ARCH_TOP+row*rise,y1=y0+rise,il=left+.27,ir=right-.27,lo=y0+.28,hi=y1-.28;
    const C=[.69,.70,.67],R=[.43,.46,.44],RT=[.52,.54,.51],G=[.105+(row%3)*.008,.19+(j%3)*.012,.20+(row%3)*.008];
    quad(concrete,P(left,y0),P(il,y0),P(il,y1),P(left,y1),C);
    quad(concrete,P(ir,y0),P(right,y0),P(right,y1),P(ir,y1),C);
    quad(concrete,P(il,y0),P(ir,y0),P(ir,lo),P(il,lo),C);
    quad(concrete,P(il,hi),P(ir,hi),P(ir,y1),P(il,y1),C);
    // Deep edge alternates with facade direction only; windows are angled, not painted triangles.
    const dl=1.35,dr=.22;
    quad(reveals,P(il,lo),P(il,hi),P(il,hi,dl),P(il,lo,dl),R);
    quad(reveals,P(ir,hi),P(ir,lo),P(ir,lo,dr),P(ir,hi,dr),RT);
    quad(reveals,P(il,hi),P(ir,hi),P(ir,hi,dr),P(il,hi,dl),R);
    quad(reveals,P(ir,lo),P(il,lo),P(il,lo,dl),P(ir,lo,dr),RT);
    quad(glass,P(il,lo,dl),P(ir,lo,dr),P(ir,hi,dr),P(il,hi,dl),G);
    // Sloping concrete reveal spans half the opening: the photograph shows a deep diagonal
    // sunshade rather than a flat grid of glass. The other half retains the recessed glazing.
    quad(reveals,P(il,lo,.015),P(ir,lo,.015),P(il,hi,1.0),P(il,hi,1.0),[.56,.58,.55]);windows++;
   }
  }
 }
 meshStore(root,concrete,material(.86),'The Murray precast facade grid');meshStore(root,reveals,material(.92),'The Murray deep skewed window reveals');meshStore(root,glass,material(.3,.3),'The Murray recessed angled glazing');
 meshStore(root,arches,material(.87),'The Murray open arched arcade');meshStore(root,archSoffit,material(.91),'The Murray curved arch intrados');merged(root,piers,stone,'The Murray arcade piers');
 // The tree-facing east wall has a real opening, not a decorative door over a solid collider.
 for(const z of [-D/2+3,D/2-3]){
  box(lobby,[0,1.6,z],[L.halfWidth*2,16.8,.18]);for(let x=-L.halfWidth;x<=L.halfWidth;x+=2.6)box(frames,[x,1.6,z+Math.sign(z)*.12],[.07,16.8,.08]);
  box(frames,[0,5,z+Math.sign(z)*.12],[L.halfWidth*2,.09,.08]);
  colliders.push(harbourCityLocalCollider(SITE,0,z,L.halfWidth*2,.2,datum-7,datum+12));
 }
 for(const x of [-W/2+3,W/2-3]){
  if(x<0){box(lobby,[x,1.6,0],[.18,16.8,D-6]);colliders.push(harbourCityLocalCollider(SITE,x,0,.2,D-6,datum-7,datum+12));}
  else {
   const bounds=[[-(D-6)/2,L.doorMin],[L.doorMax,(D-6)/2]];
   for(const [a,b] of bounds){box(lobby,[x,1.6,(a+b)/2],[.18,16.8,b-a]);colliders.push(harbourCityLocalCollider(SITE,x,(a+b)/2,.2,b-a,datum-7,datum+12));}
   box(lobby,[x,3.9,(L.doorMin+L.doorMax)/2],[.18,12.2,L.doorMax-L.doorMin]);
   colliders.push(harbourCityLocalCollider(SITE,x,(L.doorMin+L.doorMax)/2,.2,L.doorMax-L.doorMin,datum-2.2,datum+12));
   for(const z of [L.doorMin,L.doorMax])box(frames,[x+.12,-3.6,z],[.12,3,.12]);
   box(frames,[x+.12,-2.1,(L.doorMin+L.doorMax)/2],[.12,.12,L.doorMax-L.doorMin]);
  }
  for(let z=-D/2+3;z<=D/2-3;z+=2.6)if(x<0||z<L.doorMin-.1||z>L.doorMax+.1)box(frames,[x+Math.sign(x)*.12,1.6,z],[.08,16.8,.07]);
  box(frames,[x+Math.sign(x)*.12,5,0],[.08,.09,D-6]);
 }
 merged(root,lobby,dark,'The Murray recessed lobby glazing');merged(root,frames,bronze,'The Murray bronze lobby mullions');
 // Paving is sampled from the same terrain as the player, never raised over a roadway.
 for(let x=-W/2;x<W/2;x+=1)for(let z=-D/2;z<D/2;z+=1){
  let x1=Math.min(x+1,W/2),z1=Math.min(z+1,D/2);if(isMurrayLobbyLocal((x+x1)/2,(z+z1)/2))continue;let w=authoredLocalToWorld(SITE,(x+x1)/2,(z+z1)/2),h=hongKongTerrainHeight(w.x,w.z);if(fullRoadSurfaceAt(w.x,w.z,.25,h))continue;
  const p=(xx,zz)=>{const pt=authoredLocalToWorld(SITE,xx,zz);return [xx,hongKongTerrainHeight(pt.x,pt.z)-datum+.025,zz];};
  const v=(Math.floor(x+W/2)+Math.floor(z+D/2))%4===0?.48:.50;quad(paving,p(x,z),p(x1,z),p(x1,z1),p(x,z1),[v,v,v*.95]);
 }
 meshStore(root,paving,material(.97),'The Murray terrain-following arcade paving',false);
 // One terrain-connected ramp section; the rest of the wrapped route remains to be built.
 const rampSection=buildMurrayRamp(root,datum,colliders);
 const interior=buildMurrayLobby(root,datum,colliders);
 const lift=buildMurrayLift(root,datum,colliders);
 for(const z of [-D/2,D/2])box(trims,[0,UPPER_TOP-.2,z],[W,.24,.18]);for(const x of [-W/2,W/2])box(trims,[x,UPPER_TOP-.2,0],[.18,.24,D]);
 merged(root,trims,black,'The Murray roof edge');
 // Exterior sign: positioning is an estimate based on arrival photographs.
 const sign=makeCanvasSign(5.8,.8,(ctx,c)=>{ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#e0c9a4';ctx.font=`${Math.floor(c.height*.62)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('THE MURRAY',c.width/2,c.height/2);},{transparent:true,canvasWidth:768,canvasHeight:128});
 sign.position.set(0,7,D/2+.04);sign.name='The Murray exterior lettering';root.add(sign);
 const courtyard=buildMurrayCourtyard(root,datum,colliders);
 const landmark={name:'美利大廈',englishName:'The Murray',x:SITE.x,z:SITE.z,w:SITE.w,d:SITE.d,h:93.83,ring:SITE.ring,bounds:SITE.bounds,osmId:SITE.osmId,kind:'landmark',labelHeight:false};
 return {group:root,colliders,landmarks:[landmark],datum,courtyard,rampSection,interior,lift,groundHeightAt:(x,z,current,referenceY)=>lift.groundHeightAt(x,z,murrayLobbyGroundHeight(x,z,murrayRampGroundHeight(x,z,current,referenceY,datum),referenceY,datum),referenceY),stats:{murrayOsm:SITE.osmId,murrayWindows:windows,murrayArches:arcades,murrayFloors:ROWS,murrayBase:datum,murrayCassiaTree:12718892293,murrayCourtyardCells:courtyard.cells,murrayRampSegments:rampSection.segments,murrayLobbyRooms:1}};
}
