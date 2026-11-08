import * as THREE from 'three/webgpu';
import { GOVERNMENT_HOUSE_SITE as SITE } from './government-house-architecture.js';
import { authoredHighestRawDatum, authoredWorldToLocal } from './authored-landmark-site.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalToWorld, harbourCitySegmentCollider, harbourCityLocalCollider, harbourCityEdgeOutward } from './harbour-city-architecture.js';
import { box, cylinder, sphere, beam, merged, store, quad, meshStore, point, edgeBox } from './harbour-city-world-utils.js';

// All building heights, roof junctions and architectural details are photo-directed estimates.
export const GOVERNMENT_HOUSE_EAVES=9.0, GOVERNMENT_HOUSE_TOWER_TOP=25.5;
function hipRoof(x,z,w,d,y,rise) {
 const hx=w/2,hz=d/2, ridge=Math.max(0,hx-hz*.8), a=[x-hx,y,z-hz],b=[x+hx,y,z-hz],c=[x+hx,y,z+hz],d0=[x-hx,y,z+hz],l=[x-ridge,y+rise,z],r=[x+ridge,y+rise,z];
 const positions=[...a,...b,...r,...a,...r,...l,...b,...c,...r,...c,...d0,...l,...c,...l,...r,...d0,...a,...l];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
function gable(x,z,y,width,rise){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([x-width/2,y,z,x+width/2,y,z,x,y+rise,z],3));g.computeVertexNormals();return g;}
// The small photo-directed approach falls gently into the DTM; it never changes a road.
export function governmentHouseApronHeight(x,z,raw,base) {
 const p=authoredWorldToLocal(SITE,x,z);
 if(p.x < -6 || p.x > 8 || p.z < 6.4 || p.z > 16.4) return raw;
 const side=Math.max(0,Math.min(1,(p.x+6)*2,(8-p.x)*2));
 const end=Math.max(0,Math.min(1,(16.4-p.z)/2));
 const target=base-Math.max(0,p.z-6.4)*.12;
 return raw+Math.max(0,target-raw)*side*end;
}
export function buildGovernmentHouse(scene) {
 const base=authoredHighestRawDatum([SITE],hongKongTerrainHeight),group=new THREE.Group(),colliders=[];
 group.name='Government House 香港禮賓府';group.position.set(SITE.x,base,SITE.z);group.rotation.y=SITE.ry;scene.add(group);
 const mat={plaster:new THREE.MeshStandardMaterial({color:0xc8c8bb,roughness:.9,side:THREE.DoubleSide}),trim:new THREE.MeshStandardMaterial({color:0xe1ded0,roughness:.76}),roof:new THREE.MeshStandardMaterial({color:0x38302f,roughness:.92,side:THREE.DoubleSide}),roofEdge:new THREE.MeshStandardMaterial({color:0x63554c,roughness:.92}),glass:new THREE.MeshStandardMaterial({color:0x424a42,roughness:.4,side:THREE.DoubleSide}),deep:new THREE.MeshStandardMaterial({color:0x35372d,roughness:.8}),stone:new THREE.MeshStandardMaterial({color:0xb7b5a7,roughness:.88})};
 const walls=store(),foundations=store(),windows=[],frames=[],cornice=[],roofs=[],tiles=[],details=[],porch=[],loggias=[],foundationJoints=[];let windowCount=0;
 for(let e=0;e<SITE.localRing.length/2-1;e++){
  const f=harbourCityEdgeOutward(SITE.localRing,e),len=f.length,n=Math.max(1,Math.ceil(len/2.5));
  for(let j=0;j<n;j++){
   const a=j/n,b=(j+1)/n,p0=point(SITE,e,a,0),p1=point(SITE,e,b,0),w0=harbourCityLocalToWorld(SITE,p0[0],p0[2]),w1=harbourCityLocalToWorld(SITE,p1[0],p1[2]);
   const y0=Math.min(-.12,hongKongTerrainHeight(w0.x,w0.z)-base-.18),y1=Math.min(-.12,hongKongTerrainHeight(w1.x,w1.z)-base-.18);
   quad(foundations,[p0[0],y0,p0[2]],[p1[0],y1,p1[2]],point(SITE,e,b,0),point(SITE,e,a,0),[.59,.59,.54]);
   colliders.push(harbourCitySegmentCollider(SITE,e,a,b,base+Math.min(y0,y1),base+GOVERNMENT_HOUSE_EAVES,.3));
   for(let y=-1;y>Math.max(y0,y1)+.1;y-=1)edgeBox(foundationJoints,SITE,e,(a+b)/2,y,.035,len/n,.035,.05);
  }
  quad(walls,point(SITE,e,0,0),point(SITE,e,1,0),point(SITE,e,1,GOVERNMENT_HOUSE_EAVES),point(SITE,e,0,GOVERNMENT_HOUSE_EAVES),[.76,.76,.70]);
  for(const [y,h,off,depth] of [[.18,.32,.10,.20],[4.45,.18,.12,.22],[8.66,.24,.2,.38],[9.02,.18,.3,.6]])edgeBox(cornice,SITE,e,.5,y,off,len+.08,h,depth);
  const bays=Math.max(1,Math.floor(len/4.1));if(len<2.2)continue;
  for(let i=0;i<bays;i++)for(let row=0;row<2;row++){
   const t=(i+.5)/bays,y=2.25+row*4.28,width=Math.min(2.05,len/bays*.56),height=2.35;
   if(row===1&&((e===16&&i===bays-2)||(e===17&&i===1))){edgeBox(loggias,SITE,e,t,y+.22,.10,Math.min(3.2,len/bays*.8),2.7,.15);edgeBox(frames,SITE,e,t,y-1.2,.20,Math.min(3.4,len/bays*.86),.16,.24);windowCount++;continue;}
   edgeBox(windows,SITE,e,t,y,.07,width,height,.09);
   for(const u of [-width/2,0,width/2])edgeBox(frames,SITE,e,t+u/len,y,.15,.08,height+.16,.13);
   for(const yy of [y-height/2,y,y+height/2])edgeBox(frames,SITE,e,t,yy,.15,width+.1,.085,.13);
   edgeBox(frames,SITE,e,t,y-height/2-.10,.19,width+.32,.12,.22);windowCount++;
  }
 }
 const vertex=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.9});
 meshStore(group,walls,vertex,'Government House two-storey plaster elevations');meshStore(group,foundations,vertex,'Government House terrain-following foundation');merged(group,foundationJoints,mat.stone,'Government House foundation masonry courses',false);
 merged(group,windows,mat.glass,'Government House sash windows');merged(group,loggias,mat.deep,'Government House recessed upper verandah openings');merged(group,frames,mat.trim,'Government House sash frames and glazing bars');merged(group,cornice,mat.stone,'Government House plinth and layered eaves');
 for(const [x,z,w,d,y,rise] of [[5.9,-8.8,50,30.4,9,3.2],[45.2,-7.6,28,16.8,8.8,2.5],[-30.4,-8.3,22,15,8.8,2.3],[-42.6,20.2,33.6,7.5,8.0,1.8],[-30.5,8,10,16,8.3,2.1]]){
  roofs.push(hipRoof(x,z,w,d,y,rise));const half=w/2,hz=d/2,ridge=Math.max(0,half-hz*.8),n=Math.floor(w/.85);
  for(let i=1;i<n;i++){let dx=-half+i*w/n,rx=Math.max(-ridge,Math.min(ridge,dx));beam(tiles,[x+dx,y+.03,z-hz],[x+rx,y+rise+.03,z],.035,.035);beam(tiles,[x+dx,y+.03,z+hz],[x+rx,y+rise+.03,z],.035,.035);}
 }
 merged(group,roofs,mat.roof,'Government House dark hipped tiled roofs');merged(group,tiles,mat.roofEdge,'Government House roof tile seams',false);
 box(details,[18,15.5,-9],[7.3,17,7.3]);box(details,[-24,10.7,-10],[3.3,3.4,3.3]);box(details,[18,22.8,-9],[8.5,.38,8.5]);
 for(const [cx,cz,w,d] of [[18,-5.18,5.8,.65],[18,-12.82,5.8,.65],[14.18,-9,.65,5.8],[21.82,-9,.65,5.8]])box(details,[cx,20.3,cz],[w,.5,d]);
 merged(group,details,mat.plaster,'Government House central landmark tower and balcony');
 for(const [name,x,z,w,d,y,rise] of [['tower',18,-9,9.1,9.1,24,1.5],['cupola',-24,-10,4.2,4.2,12.4,.8]]){const m=new THREE.Mesh(hipRoof(x,z,w,d,y,rise),mat.roof);m.name=`Government House ${name} tiled roof`;group.add(m);}
 // Tower details follow the preserved reference photograph: small arched
 // openings below the projecting crown and a larger latticed arched window.
 // They are surface insets on a solid, non-enterable tower, not real openings.
 const tw=[],tf=[],grilles=[];
 function towerArch(face,u,y,width,height,lattice=false){
  const radius=width/2,spring=height-radius,shape=new THREE.Shape();
  shape.moveTo(-radius,0);shape.lineTo(radius,0);shape.lineTo(radius,spring);
  shape.absarc(0,spring,radius,0,Math.PI,false);shape.lineTo(-radius,0);
  const geometry=new THREE.ShapeGeometry(shape,12),side=face[1];
  const at=(uu,v)=>face[0]==='z'?[18+u+uu,y+v,-9+side*3.68]:[18+side*3.68,y+v,-9-u-uu];
  if(face[0]==='x')geometry.rotateY(Math.PI/2);
  geometry.translate(...at(0,0));tw.push(geometry);
  for(const uu of [-radius,radius])beam(tf,at(uu,0),at(uu,spring),.075,.075);
  beam(tf,at(-radius,0),at(radius,0),.075,.075);
  for(let i=0;i<12;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;beam(tf,at(radius*Math.cos(a),spring+radius*Math.sin(a)),at(radius*Math.cos(b),spring+radius*Math.sin(b)),.075,.075);}
  if(lattice){
   // Diamond grilles are clipped to the rectangular part of each window.
   for(const direction of [-1,1])for(let offset=-height;offset<width+height;offset+=.34){
    const candidates=[];for(const xx of [0,width]){const yy=direction*xx+offset;if(yy>=0&&yy<=spring)candidates.push([xx,yy]);}
    for(const yy of [0,spring]){const xx=(yy-offset)/direction;if(xx>0&&xx<width)candidates.push([xx,yy]);}
    if(candidates.length>=2){const p=candidates[0],q=candidates[1];beam(grilles,at(p[0]-radius,p[1]),at(q[0]-radius,q[1]),.035,.035);}
   }
  }else beam(tf,at(0,.05),at(0,spring),.045,.045);
 }
 for(const face of [['z',-1],['z',1],['x',-1],['x',1]]){
  for(const u of [-1.15,0,1.15])towerArch(face,u,18.5,.62,1.45);
  towerArch(face,0,21.05,1.65,1.25,true);
  towerArch(face,0,12.0,2.0,3.8,true);
 }
 merged(group,tw,mat.glass,'Government House arched tower window insets');
 merged(group,tf,mat.trim,'Government House arched tower window surrounds',false);
 merged(group,grilles,mat.stone,'Government House tower diamond grilles',false);
 box(porch,[1,4.05,9.2],[12,.45,5.5]);for(const x of [-5,7])for(const z of [7.2,11.7]){box(porch,[x,2,z],[.68,4,.68]);const w=harbourCityLocalToWorld(SITE,x,z),foot=Math.min(-.15,hongKongTerrainHeight(w.x,w.z)-base-.15);box(porch,[x,(foot+.28)/2,z],[1,.28-foot,1]);colliders.push(harbourCityLocalCollider(SITE,x,z,1,1,base+foot,base+4.3));}
 merged(group,porch,mat.stone,'Government House granite carriage porch');
 const entry=[],ef=[];box(entry,[1,1.8,6.48],[5.2,3.6,.12]);for(const x of [-1.6,1,3.6])box(ef,[x,1.8,6.58],[.16,3.65,.16]);for(const y of [.12,3.65])box(ef,[1,y,6.58],[5.4,.16,.16]);merged(group,entry,mat.deep,'Government House south entrance glazing');merged(group,ef,mat.stone,'Government House granite entrance surround');
 const ped=new THREE.Mesh(gable(1,6.43,9.1,9,2.7),mat.plaster);ped.name='Government House front pediment';group.add(ped);const pt=[];for(const x of [-.45,0,.45])box(pt,[1+x,9.8,6.50],[.12,.48,.12]);beam(pt,[-3.5,9.1,6.48],[1,11.8,6.48],.18,.18);beam(pt,[1,11.8,6.48],[5.5,9.1,6.48],.18,.18);merged(group,pt,mat.roofEdge,'Government House pediment moulding');
 // Flag staff and a schematic five-petal bauhinia, on the porch roof as in the reference.
 const pole=[];cylinder(pole,[1,7.65,9.0],.065,7.3,10);merged(group,pole,mat.stone,'Government House flagstaff');
 const flag=makeCanvasSign(2.3,1.5,(ctx,c)=>{
  ctx.fillStyle='#d81432';ctx.fillRect(0,0,c.width,c.height);ctx.save();ctx.translate(c.width/2,c.height/2);ctx.fillStyle='#fff';
  for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*Math.PI*2/5);ctx.beginPath();ctx.ellipse(0,-38,22,46,.4,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.restore();
 },{canvasWidth:512,canvasHeight:320});flag.name='Government House regional flag';flag.position.set(2.2,10.35,9);group.add(flag);
 // Planters at the photographed forecourt, kept off the roadway and beyond the walkable apron.
 const urns=[],shrubs=[];const foliage=new THREE.MeshStandardMaterial({color:0x43613a,roughness:1});
 for(const x of [-17,-13,-9,11,15,19]){
  const z=8.1,w=harbourCityLocalToWorld(SITE,x,z),y=hongKongTerrainHeight(w.x,w.z)-base;
  if(fullRoadSurfaceAt(w.x,w.z,1,hongKongTerrainHeight(w.x,w.z)))continue;
  cylinder(urns,[x,y+.34,z],.48,.68,12,.58);sphere(shrubs,[x,y+1.05,z],.62,12);
 }
 merged(group,urns,mat.stone,'Government House forecourt planters');merged(group,shrubs,foliage,'Government House forecourt shrubs');
 // Small paved approach: sampled from the same height function as player ground.
 const apron=store();
 const height=(x,z)=>{const w=harbourCityLocalToWorld(SITE,x,z),raw=hongKongTerrainHeight(w.x,w.z);return governmentHouseApronHeight(w.x,w.z,raw,base)-base+.015;};
 let apronCells=0;
 for(let x=-6;x<8;x+=.5)for(let z=6.4;z<16.4;z+=.5){
  const p=harbourCityLocalToWorld(SITE,x+.25,z+.25),raw=hongKongTerrainHeight(p.x,p.z);
  if(fullRoadSurfaceAt(p.x,p.z,.4,raw))continue;
  quad(apron,[x,height(x,z),z],[x+.5,height(x+.5,z),z],[x+.5,height(x+.5,z+.5),z+.5],[x,height(x,z+.5),z+.5],[(Math.floor((x+6)*2)+Math.floor((z-6.4)*2))%2?.50:.48,.49,.46]);apronCells++;
 }
 meshStore(group,apron,vertex,'Government House terrain-blended entrance apron',false);
 // Twin gate lodges approximately flank mapped barrier node 1294918105. OSM does not map their footprints.
 // They are outside the mapped roadway; the central road opening stays unobstructed.
 const lodgeWalls=[],lodgeRoof=[],lodgeTrim=[],lodgeGlass=[],lodgeColumns=[],green=new THREE.MeshStandardMaterial({color:0x2e8b70,roughness:.72,side:THREE.DoubleSide});
 let lodges=0;
 for(const x of [3,16]){
  const z=58.5, pos=harbourCityLocalToWorld(SITE,x,z),y=hongKongTerrainHeight(pos.x,pos.z)-base;
  box(lodgeWalls,[x,y+1.8,z],[4,3.6,4.5]);box(lodgeTrim,[x,y+3.65,z],[4.5,.30,5]);box(lodgeTrim,[x,y+.2,z],[4.3,.4,4.8]);
  lodgeRoof.push(hipRoof(x,z,4.1,4.6,y+3.82,.75));
  box(lodgeGlass,[x,y+1.5,z+2.27],[1.25,2.5,.08]);
  for(const dx of [-.72,.72])box(lodgeTrim,[x+dx,y+1.5,z+2.33],[.14,2.7,.14]);
  box(lodgeTrim,[x,y+2.87,z+2.33],[1.55,.18,.14]);
  for(const dx of [-1.8,1.8]){cylinder(lodgeColumns,[x+dx,y+1.9,z+2.40],.22,3.8,12);box(lodgeColumns,[x+dx,y+3.7,z+2.40],[.54,.20,.54]);}
  colliders.push(harbourCityLocalCollider(SITE,x,z,4.35,4.85,base+y-.3,base+y+4.6));lodges++;
 }
 // Decorative open iron leaves fold beside the lodges and leave the mapped gate drive clear.
 const gateBars=[],gateMaterial=new THREE.MeshStandardMaterial({color:0x303b36,roughness:.7,metalness:.45});
 for(const x of [5.15,13.85]){const z=58.5,p=harbourCityLocalToWorld(SITE,x,z),y=hongKongTerrainHeight(p.x,p.z)-base;
  for(let i=0;i<=8;i++)box(gateBars,[x,y+1.05,56.5+i*.25],[.07,2.1,.06]);
  for(const h of [.18,1.95])box(gateBars,[x,y+h,57.5],[.09,.09,2.1]);
 }
 merged(group,gateBars,gateMaterial,'Government House open gate leaves');
 merged(group,lodgeWalls,mat.plaster,'Government House paired gate lodge walls');merged(group,lodgeRoof,green,'Government House green gate lodge roofs');merged(group,lodgeTrim,mat.stone,'Government House gate lodge cornices');merged(group,lodgeGlass,mat.deep,'Government House gate lodge doors');merged(group,lodgeColumns,mat.trim,'Government House gate lodge classical columns');
 colliders.push(harbourCityLocalCollider(SITE,18,-9,7.3,7.3,base+9,base+25.5));
 const landmark={name:'香港禮賓府',englishName:'Government House',x:SITE.x,z:SITE.z,w:SITE.w,d:SITE.d,h:25.5,ring:SITE.ring,bounds:SITE.bounds,osmId:SITE.osmId,kind:'landmark',labelHeight:false};
 return {group,colliders,landmarks:[landmark],stats:{governmentHouseWindows:windowCount,governmentHouseRoofs:5,governmentHouseTowerHeight:25.5,governmentHouseGateLodges:lodges,governmentHouseApronCells:apronCells},base,groundHeightAt:(x,z,raw)=>governmentHouseApronHeight(x,z,raw,base)};
}
