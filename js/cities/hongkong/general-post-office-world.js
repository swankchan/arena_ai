import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { GPO_SITE, GPO_WING } from './general-post-office-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityLocalToWorld } from './harbour-city-architecture.js';
import { store, quad, point, edgeBox, meshStore, merged, roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

// Photo-directed facades on OSM mapped parts; wing height and details are estimates.
export function buildGeneralPostOffice(scene) {
 const base=hongKongTerrainHeight(GPO_SITE.x,GPO_SITE.z), root=new THREE.Group(), colliders=[];
 root.name='General Post Office — 郵政總局';scene.add(root);
 const coloured=()=>{const m=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.82});m.colorNode=attribute('color');return m;};
 const trim=new THREE.MeshStandardMaterial({color:0xa8a8a0,roughness:.88});
 const roof=new THREE.MeshStandardMaterial({color:0x777e7b,roughness:.95});
 let bays=0,portals=0,doors=0,awnings=0;
 for(const [site,wing] of [[GPO_SITE,false],[GPO_WING,true]]){
  const part=new THREE.Group();part.position.set(site.x,base,site.z);part.rotation.y=site.ry;root.add(part);
  part.name=wing?'General Post Office lower wing':'General Post Office main building';
  const walls=store(),glass=store(),fins=[],bands=[];
  for(let e=0;e<site.localRing.length/2-1;e++){
   const frame=harbourCityEdgeOutward(site.localRing,e),length=frame.length;if(length<.2)continue;
   const p=(t,y,o=0)=>point(site,e,t,y,o), count=Math.max(1,Math.ceil(length/1));
   const front=!wing&&(e===3||e===4), back=!wing&&(e===7||e===8);
   for(let j=0;j<count;j++){
    const a=j/count,b=(j+1)/count,mid=p((a+b)/2,0),w=harbourCityLocalToWorld(site,mid[0],mid[2]);
    // The private OSM building_passage runs along the middle of the wing; it only opens at either end.
    // Probe the road near facade segments, preserving the two long walls alongside the passage.
    const road=fullRoadSurfaceAt(w.x,w.z,.05,base), bottom=road?7.5:0;
    const door=!wing&&((e===3&&(1-b)*length<2.05)||(e===4&&a*length<2.05));
    if(road)portals++;if(door)doors++;
    const wall=(st,a0,b0,lo,hi,c,o=0)=>quad(st,p(a0,lo,o),p(b0,lo,o),p(b0,hi,o),p(a0,hi,o),c);
    if(bottom===0&&!door){const wa=p(a,0),wb=p(b,0),qa=harbourCityLocalToWorld(site,wa[0],wa[2]),qb=harbourCityLocalToWorld(site,wb[0],wb[2]);quad(glass,p(a,hongKongTerrainHeight(qa.x,qa.z)-base-.12,.02),p(b,hongKongTerrainHeight(qb.x,qb.z)-base-.12,.02),p(b,4.25,.02),p(a,4.25,.02),[.09,.13,.13]);}
    colliders.push(harbourCitySegmentCollider(site,e,a,b,base+(road?7.5:door?4.25:-.3),base+(wing?15:30.1),.24));
    if(!road)wall(walls,a,b,4.25,6.2,[.57,.58,.56]);
    if(wing){
     wall(glass,a+.12/count,b-.12/count,Math.max(bottom,6.2),10.7,[.12,.16,.16],-.14);
     wall(walls,a,a+.12/count,Math.max(bottom,6.2),10.7,[.54,.56,.53]);wall(walls,b-.12/count,b,Math.max(bottom,6.2),10.7,[.54,.56,.53]);
     wall(walls,a,b,10.7,15,[.53,.55,.52]);
    }else{
     if(front){wall(glass,a+.17/count,b-.17/count,Math.max(bottom,6.2),13.3,[.095,.13,.13],-.18);wall(walls,a,a+.17/count,Math.max(bottom,6.2),13.3,[.58,.59,.56],.06);wall(walls,b-.17/count,b,Math.max(bottom,6.2),13.3,[.58,.59,.56],.06);edgeBox(fins,site,e,a,(Math.max(bottom,6.2)+13.3)/2,.36,.14,13.3-Math.max(bottom,6.2),.72);}
     else wall(walls,a,b,Math.max(bottom,6.2),13.3,[.58,.59,.56]);
     wall(walls,a,b,13.3,18.2,[.57,.58,.55]);wall(glass,a,b,18.2,19.25,[.10,.13,.13],-.02);
     if(back)wall(walls,a,b,19.25,29.4,[.52,.54,.52]);
     else if(!front){
      for(const [lo,hi] of [[19.25,23.25],[24.25,28.25]]){
       if(j%5===2){wall(walls,a,a+.40/count,lo,hi,[.56,.57,.55]);wall(glass,a+.40/count,b-.40/count,lo,hi,[.095,.13,.14],-.12);wall(walls,b-.40/count,b,lo,hi,[.56,.57,.55]);}
       else wall(walls,a,b,lo,hi,[.56,.57,.55]);
      }
      wall(walls,a,b,23.25,24.25,[.55,.57,.54]);wall(walls,a,b,28.25,29.4,[.55,.57,.54]);
     } else {for(const [lo,hi] of [[19.25,23.25],[24.25,28.25]]){
       wall(glass,a+.18/count,b-.18/count,lo,hi,[.095,.13,.14],-.15);wall(walls,a,a+.18/count,lo,hi,[.59,.60,.57],.09);wall(walls,b-.18/count,b,lo,hi,[.59,.60,.57],.09);edgeBox(fins,site,e,a,(lo+hi)/2,.32,.12,hi-lo,.64);
      }wall(walls,a,b,23.25,24.25,[.55,.57,.54]);wall(walls,a,b,28.25,29.4,[.55,.57,.54]);}
    }
    bays++;
   }
   for(const y of (wing?[10.7,14.8]:[18.1,23.2,28.2,29.7]))edgeBox(bands,site,e,.5,y,.1,length,.16,.20);
   if(front){const n=Math.max(1,Math.floor(length/13));for(let k=0;k<n;k++){
    const width=length/n-.07,shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,-1.05);
    for(let v=0;v<=16;v++){let x=width/2-width*v/16;shape.lineTo(x,-1.05+Math.sqrt(Math.max(0,1-(2*x/width)**2))*.78);}shape.closePath();
    const g=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:1.6,bevelEnabled:false}),trim);g.position.set(...p((k+.5)/n,5.55,.04));g.rotation.y=Math.atan2(frame.nx,frame.nz);part.add(g);awnings++;
   }}
  }
  meshStore(part,walls,coloured(),`${part.name} limestone`);meshStore(part,glass,coloured(),`${part.name} glazing`);
  merged(part,fins,trim,`${part.name} projecting window fins`);merged(part,bands,trim,`${part.name} horizontal cornices`);merged(part,[roofGeometry(site.localRing,wing?15:30.1)],roof,`${part.name} roof`);
  if(!wing){const sign=makeCanvasSign(29,2,(ctx,c)=>{ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#171b1b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 150px sans-serif';ctx.fillText('GENERAL POST OFFICE　 郵政總局',c.width/2,c.height/2,c.width*.96);});let normal=harbourCityEdgeOutward(site.localRing,3);sign.position.set(...point(site,3,.55,15.7,.14));sign.rotation.y=Math.atan2(normal.nx,normal.nz);sign.name='General Post Office bilingual facade lettering';part.add(sign);}
 }
 const landmark={name:'郵政總局',englishName:'General Post Office',x:GPO_SITE.x,z:GPO_SITE.z,w:GPO_SITE.w,d:GPO_SITE.d,h:30.1,ring:GPO_SITE.ring,bounds:GPO_SITE.bounds,osmId:GPO_SITE.osmId,kind:'landmark',labelHeight:false};
 return {group:root,colliders,landmarks:[landmark],stats:{generalPostOfficeOsm:GPO_SITE.osmId,generalPostOfficeBays:bays,generalPostOfficeCanopies:awnings,generalPostOfficeEntranceBays:doors,generalPostOfficeRoadPortals:portals}};
}
