import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import { IMMIGRATION_TOWER_SITE as site, IMMIGRATION_TOWER_HEIGHT as height } from './immigration-tower-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityLocalToWorld, harbourCityWorldToLocal, harbourCityLocalCollider } from './harbour-city-architecture.js';
import { store, quad, point, edgeBox, meshStore, merged, roofGeometry, nightAmount, hash, box, beam } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';
import { OBRIEN_DECK_HEIGHT, IMMIGRATION_LOBBY_LINK } from './obrien-footbridge-architecture.js';

// Photo-directed exterior, bridge-side and garden-side entrance vestibules.
export function buildImmigrationTower(scene){
 const base=hongKongTerrainHeight(site.x,site.z),group=new THREE.Group(),glass=store(),podium=store(),frames=[],fine=[],colliders=[];
 group.name='Immigration Tower — 入境事務大樓';group.position.set(site.x,base,site.z);group.rotation.y=site.ry;scene.add(group);
 const glassMat=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.24,metalness:.36});
 glassMat.colorNode=attribute('color');glassMat.emissiveNode=color(0xffd9ab).mul(attribute('aLit','float')).mul(nightAmount()).mul(.26);
 const podiumMat=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.52,metalness:.25});podiumMat.colorNode=attribute('color');
 const mainFrame=new THREE.MeshStandardMaterial({color:0x1e282d,roughness:.48,metalness:.5});
 const thinFrame=new THREE.MeshStandardMaterial({color:0x84949a,roughness:.38,metalness:.55});
 let panes=0,openings=0,lit=0;
 for(let e=0;e<site.localRing.length/2-1;e++){
  const length=harbourCityEdgeOutward(site.localRing,e).length,bays=Math.max(1,Math.ceil(length/1.5));
  const p=(t,y,o=0)=>point(site,e,t,y,o);
  const face=(s,a,b,lo,hi,c,o=0,light=0)=>quad(s,p(a,lo,o),p(b,lo,o),p(b,hi,o),p(a,hi,o),c,light);
  for(let j=0;j<bays;j++){
   const a=j/bays,b=(j+1)/bays,entrance=(e===0&&(1-b)*length<2.4)||(e===1&&a*length<2.4);
   const q=p((a+b)/2,0),w=harbourCityLocalToWorld(site,q[0],q[2]);const bottom=hongKongTerrainHeight(w.x,w.z)-base-.18;
   // OSM node 1235363336 marks the level-one HF95 connection on edge 4.
   // Two portal openings retain the photographed centre pier; sizes are approximate.
   const xm=point(site,e,(a+b)/2,0)[0];
   const zm=point(site,e,(a+b)/2,0)[2];
   const bridgeOpening=(e===4&&((xm>=1.5&&xm<4.6)||(xm>=6&&xm<9.2))) || (e===6&&zm>9&&zm<15);
   if(bridgeOpening){
    face(glass,a+.002,b-.002,bottom,7.5,[.12,.17,.19],.025,.08);
    colliders.push(harbourCitySegmentCollider(site,e,a,b,base+bottom,base+7.5,.25));
    colliders.push(harbourCitySegmentCollider(site,e,a,b,base+10.6,base+height,.25));
   } else {
    if(!entrance)face(glass,a+.002,b-.002,bottom,10.6,[.12,.17,.19],.025,.08);else openings++;
    colliders.push(harbourCitySegmentCollider(site,e,a,b,base+(entrance?5.0:bottom),base+height,.25));
   }
   face(podium,a,b,10.6,15.6,[.052,.060,.065],.03);
   for(let f=0;f<46;f++){
    const lo=15.6+f*(163.4/46),hi=15.6+(f+1)*(163.4/46),v=.89+.13*hash(e,j,f),on=hash(f,e,j+11)>.77?.7:0;
    face(glass,a+.003,b-.003,lo+.075,hi-.075,[.19*v,.26*v,.29*v],.025,on);panes++;if(on)lit++;
   }
   edgeBox(fine,site,e,a,97.3,.10,.065,163.4,.10);
  }
  for(let f=0;f<=46;f++)edgeBox(fine,site,e,.5,15.6+f*(163.4/46),.11,length,.055,.10);
  for(const y of [15.6,63,121,179.3])edgeBox(frames,site,e,.5,y,.15,length,.85,.22);
  // The 2016 whole-building view shows strong corner piers, not regularly spaced thick interior stripes.
  const previous=harbourCityEdgeOutward(site.localRing,(e+site.localRing.length/2-2)%(site.localRing.length/2-1));
  const current=harbourCityEdgeOutward(site.localRing,e);
  if(Math.abs(previous.nx*current.nz-previous.nz*current.nx)>.1)edgeBox(frames,site,e,0,97.3,.15,1.1,163.4,.25);
  face(podium,0,1,179,180.8,[.065,.076,.082],.03);
 }
 meshStore(group,glass,glassMat,'Immigration Tower grey-blue glazed facade');
 meshStore(group,podium,podiumMat,'Immigration Tower dark podium and parapet');
 merged(group,frames,mainFrame,'Immigration Tower major black frames');
 merged(group,fine,thinFrame,'Immigration Tower fine curtain wall grid',false);
 merged(group,[roofGeometry(site.localRing,height)],mainFrame,'Immigration Tower roof');
 // Gloucester Road face: pale sloping entrance glazing / cladding beneath the dark sign band.
 // Bay dimensions and pitch are estimated from the street photograph. The ends are kept
 // within the mapped facade and clear of vehicle roads; it is not the separate footbridge.
 const streetCanopy=store(),streetRails=[];
 for(const [e,start,end] of [[3,.68,1],[4,0,.92]]){
  const count=Math.ceil(harbourCityEdgeOutward(site.localRing,e).length*(end-start)/3);
  const p=(t,y,o)=>point(site,e,t,y,o);
  for(let i=0;i<count;i++){
   const a=start+(end-start)*i/count,b=start+(end-start)*(i+1)/count;
   const shade=.86+.08*hash(e,i,2);
   const centre=point(site,e,(a+b)/2,0)[0];
   if(e===4 && centre>0 && centre<10.5)continue; // HF95 first-floor portal.
   quad(streetCanopy,p(a,5.5,1.7),p(b,5.5,1.7),p(b,9.3,.12),p(a,9.3,.12),[.53*shade,.55*shade,.54*shade]);
   beam(streetRails,p(a,5.5,1.75),p(a,9.3,.17),.09);
   beam(streetRails,p(a,5.5,1.75),p(b,5.5,1.75),.12);
   beam(streetRails,p(a,9.3,.17),p(b,9.3,.17),.12);
  }
 }
 const slopeMat=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.43,metalness:.28});slopeMat.colorNode=attribute('color');
 meshStore(group,streetCanopy,slopeMat,'Immigration Tower Gloucester Road sloping panels');
 merged(group,streetRails,thinFrame,'Immigration Tower sloping panel joints',false);
 const streetNormal=harbourCityEdgeOutward(site.localRing,3);
 const streetSign=makeCanvasSign(10,1.2,(ctx,c)=>{
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#dae1df';ctx.font='bold 104px sans-serif';
  ctx.fillText('入境事務大樓  IMMIGRATION TOWER',c.width/2,c.height/2,c.width*.94);
 });
 streetSign.position.set(...point(site,3,.27,12.8,.16));streetSign.rotation.y=Math.atan2(streetNormal.nx,streetNormal.nz);
 streetSign.name='Immigration Tower Gloucester Road lettering';group.add(streetSign);
 // Historic Philips rooftop sign: the 2007–2021 skyline rather than the later advertiser.
 // The metal lattice and letter proportions are photo-estimated, not measured.
 const roofEdge=8, signWidth=42, signHeight=10, roofFrame=[];
 const roofLen=harbourCityEdgeOutward(site.localRing,roofEdge).length;
 const half=signWidth/roofLen/2, left=.5-half, right=.5+half;
 const roofPoint=(t,y,o)=>point(site,roofEdge,t,y,o);
 for (const offset of [-.3,-1.7]) {
  for(const y of [height+.35,height+signHeight]) beam(roofFrame,roofPoint(left,y,offset),roofPoint(right,y,offset),.18);
  for(let i=0;i<=8;i++){
   const t=left+(right-left)*i/8;
   beam(roofFrame,roofPoint(t,height+.35,offset),roofPoint(t,height+signHeight,offset),.16);
   if(i<8) beam(roofFrame,roofPoint(t,height+.35,offset),roofPoint(left+(right-left)*(i+1)/8,height+signHeight,offset),.09);
  }
 }
 for(let i=0;i<=8;i++) for(const y of [height+.35,height+signHeight]){
  const t=left+(right-left)*i/8; beam(roofFrame,roofPoint(t,y,-.3),roofPoint(t,y,-1.7),.12);
 }
 merged(group,roofFrame,mainFrame,'Immigration Tower rooftop LED steel lattice',false);
 const roofSign=makeCanvasSign(signWidth,signHeight,(ctx,c)=>{
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#3d69df';ctx.font='bold 340px sans-serif';
  ctx.fillText('PHILIPS',c.width/2,c.height/2,c.width*.96);
 });
 const oldRoofMaterial=roofSign.material;
 roofSign.material=new THREE.MeshStandardNodeMaterial({map:oldRoofMaterial.map,transparent:true,alphaTest:.04,roughness:.6,side:THREE.DoubleSide});
 oldRoofMaterial.dispose();roofSign.material.emissiveNode=color(0x245bff).mul(nightAmount()).mul(1.25);
 const roofNormal=harbourCityEdgeOutward(site.localRing,roofEdge);
 roofSign.position.set(...roofPoint(.5,height+signHeight/2,-.15));roofSign.rotation.y=Math.atan2(roofNormal.nx,roofNormal.nz);
 roofSign.name='Immigration Tower historical rooftop LED letters';group.add(roofSign);
 // Shallow projecting entry canopy, patterned on the garden-side photograph.
 // Width, depth and supports are estimated and avoid the mapped roadway.
 const canopy=[],canopyColumns=[];
 box(canopy,[-28.2,4.4,0],[5.6,.3,14]);
 for(const z of [-6,6]){
  const p=harbourCityLocalToWorld(site,-30.1,z),foot=hongKongTerrainHeight(p.x,p.z)-base;
  box(canopyColumns,[-30.1,(foot+4.25)/2,z],[.45,4.25-foot,.45]);
  colliders.push(harbourCityLocalCollider(site,-30.1,z,.45,.45,base+foot,base+4.25));
 }
 const canopyMat=new THREE.MeshStandardMaterial({color:0x92918b,roughness:.78,metalness:.1});
 merged(group,canopy,canopyMat,'Immigration Tower garden entrance canopy');
 merged(group,canopyColumns,canopyMat,'Immigration Tower canopy columns');
 const n=harbourCityEdgeOutward(site.localRing,0),sign=makeCanvasSign(9.5,1.3,(ctx,c)=>{
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#d7e0e0';ctx.font='bold 104px sans-serif';ctx.fillText('入境事務大樓  IMMIGRATION TOWER',c.width/2,c.height/2,c.width*.94);
 });sign.position.set(...point(site,0,.78,12.75,.17));sign.rotation.y=Math.atan2(n.nx,n.nz);sign.name='Immigration Tower entrance lettering';group.add(sign);

 // Garden G/F entrance: POF records two open double-door portals separated by
 // glazing. The footprints, frames and limited interior are estimates, not a plan.
 const groundFloor=[],groundGrid=[],groundWalls=[],groundCeiling=[],groundLights=[],doorFrame=[],groundTactile=[];
 box(groundFloor,[-16.7,.015,0],[17.4,.03,14]);
 box(groundCeiling,[-16.7,4.3,0],[17.4,.18,14]);
 for(let x=-25;x<-8;x+=1)box(groundGrid,[x,.035,0],[.018,.012,14]);
 for(let z=-6;z<=6;z+=1)box(groundGrid,[-16.7,.035,z],[17.4,.012,.018]);
 for(const [x,z,w,d] of [[-8,0,.18,14],[-16.7,-7,17.4,.18],[-16.7,7,17.4,.18]]){
  box(groundWalls,[x,2.15,z],[w,4.3,d]);
  colliders.push(harbourCityLocalCollider(site,x,z,w,d,base,base+4.3));
 }
 for(let x=-23;x< -8;x+=3.5)for(const z of [-4,0,4])box(groundLights,[x,4.195,z],[.8,.025,.38]);
 for(const z of [-1.45,1.45]){
  box(groundTactile,[-26.4,.045,z],[.45,.03,2]);
  box(groundTactile,[-23,.045,z],[3,.03,.15]);
 }
 // Centre glazing and open leaves against the two sides; the openings remain
 // walkable. The metal-framed central pane is transparent, not an opaque wall.
 const entranceX=site.localRing[2], pane=new THREE.Mesh(new THREE.BoxGeometry(.09,3.5,.50),new THREE.MeshStandardMaterial({color:0x637d7b,metalness:.2,roughness:.18,transparent:true,opacity:.42}));
 pane.position.set(entranceX,1.75,0);pane.name='Immigration Tower garden entrance centre glass';group.add(pane);
 colliders.push(harbourCityLocalCollider(site,entranceX,0,.15,.5,base,base+3.5));
 for(const z of [-.25,.25])beam(doorFrame,[entranceX,0,z],[entranceX,3.6,z],.075);
 for(const z of [-2.9,2.9])beam(doorFrame,[entranceX,0,z],[entranceX,3.6,z],.09);
 beam(doorFrame,[entranceX,3.6,-2.9],[entranceX,3.6,2.9],.09);
 // Stainless-steel door leaves are drawn folded back at either side of entry.
 for(const z of [-2.8,2.8]){
  beam(doorFrame,[entranceX,0,z],[entranceX-1.2,0,z],.055);
  beam(doorFrame,[entranceX,3.4,z],[entranceX-1.2,3.4,z],.055);
  beam(doorFrame,[entranceX-1.2,0,z],[entranceX-1.2,3.4,z],.055);
 }
 for(const z of [-4.5,0,4.5])box(groundLights,[-28.2,4.22,z],[.38,.025,.8]);
 const groundLamp=new THREE.MeshStandardNodeMaterial({color:0xb9b8a7,roughness:.65});groundLamp.emissiveNode=color(0xffe3b3).mul(nightAmount()).mul(.8);
 const groundStone=new THREE.MeshStandardMaterial({color:0x88877e,roughness:.75,metalness:.08});
 const groundWallMat=new THREE.MeshStandardMaterial({color:0x777970,roughness:.8});
 const groundJoints=new THREE.MeshStandardMaterial({color:0x555b56,roughness:.9});
 const groundYellow=new THREE.MeshStandardMaterial({color:0x9e9060,roughness:.85});
 merged(group,groundFloor,groundStone,'Immigration Tower garden vestibule floor');
 merged(group,groundGrid,groundJoints,'Immigration Tower garden vestibule joints',false);
 merged(group,groundWalls,groundWallMat,'Immigration Tower garden vestibule provisional walls');
 merged(group,groundCeiling,groundWallMat,'Immigration Tower garden vestibule ceiling');
 merged(group,groundLights,groundLamp,'Immigration Tower garden vestibule and canopy night lights',false);
 merged(group,groundTactile,groundYellow,'Immigration Tower garden doorway tactile paving',false);
 merged(group,doorFrame,thinFrame,'Immigration Tower garden entry metal framing',false);
 // Estimated 1/F entrance vestibule: finish the HF95 end without inventing
 // the unverified Central Plaza passage or the interior stair arrangement.
 // Floor is exactly at bridge height rather than tied to fluctuating ground.
 const level=OBRIEN_DECK_HEIGHT-base, floors=[],ceiling=[],tileLines=[],tactile=[],lobbyLights=[],walls=[];
 box(floors,[10.5,level-.12,16.667],[20,.24,9]);
 box(ceiling,[10.5,level+3.0,16.667],[20,.16,9]);
 for(let x=1;x<20.5;x+=1)box(tileLines,[x,level+.007,16.667],[.018,.012,9]);
 for(let z=12.667;z<21.167;z+=1)box(tileLines,[10.5,level+.008,z],[20,.012,.018]);
 // The interior routing is illustrative; POF records metallic tactile paving.
 for(const x of [2.5,7.5])box(tactile,[x,level+.016,19.35],[.22,.025,3.5]);
 box(tactile,[5,level+.018,20.5],[7,.025,.35]);
 for(let x=2;x<20;x+=3)for(const z of [14.1,18.4])box(lobbyLights,[x,level+2.91,z],[1.1,.025,.32]);
 // Extension follows OSM's 1/F indoor path towards the east exit.
 const innerA=harbourCityWorldToLocal(site,IMMIGRATION_LOBBY_LINK.start.x,IMMIGRATION_LOBBY_LINK.start.z);
 const innerB=harbourCityWorldToLocal(site,IMMIGRATION_LOBBY_LINK.end.x,IMMIGRATION_LOBBY_LINK.end.z);
 const ddx=innerB.x-innerA.x,ddz=innerB.z-innerA.z, corridorLength=Math.hypot(ddx,ddz),corridorRotation=Math.atan2(-ddz,ddx);
 box(floors,[(innerA.x+innerB.x)/2,level-.114,(innerA.z+innerB.z)/2],[corridorLength+.1,.24,IMMIGRATION_LOBBY_LINK.width],corridorRotation);
 box(ceiling,[(innerA.x+innerB.x)/2,level+3.008,(innerA.z+innerB.z)/2],[corridorLength+.1,.16,IMMIGRATION_LOBBY_LINK.width],corridorRotation);
 for(let t=.15;t<1;t+=.25)box(lobbyLights,[innerA.x+ddx*t,level+2.91,innerA.z+ddz*t],[.8,.025,.28],corridorRotation);
 box(tactile,[(innerA.x+innerB.x)/2,level+.025,(innerA.z+innerB.z)/2],[corridorLength,.025,.15],corridorRotation);
 // Guard the incomplete ends of this vestibule; do not suggest an open exit
 // into unmodelled space. Location of the internal partition is inferred.
 for(const [x,z,w,d] of [[10.5,12.15,20,.18],[.5,16.67,.18,9],[20.5,19.5,.18,3.33]]){
  box(walls,[x,level+1.5,z],[w,3,d]);
  colliders.push(harbourCityLocalCollider(site,x,z,w,d,OBRIEN_DECK_HEIGHT,OBRIEN_DECK_HEIGHT+3));
 }
 const floorMat=new THREE.MeshStandardMaterial({color:0x85877f,roughness:.68,metalness:.13});
 const jointMat=new THREE.MeshStandardMaterial({color:0x515552,roughness:.85});
 const lobbyMat=new THREE.MeshStandardMaterial({color:0x89877c,roughness:.8,metalness:.08});
 const tactileMat=new THREE.MeshStandardMaterial({color:0xa9aaa3,roughness:.45,metalness:.58});
 const lobbyLamp=new THREE.MeshStandardNodeMaterial({color:0xd2c9ae,roughness:.6});lobbyLamp.emissiveNode=color(0xffe4b7).mul(nightAmount()).mul(.9);
 merged(group,floors,floorMat,'Immigration Tower 1F vestibule floor');
 merged(group,ceiling,lobbyMat,'Immigration Tower 1F vestibule ceiling');
 merged(group,tileLines,jointMat,'Immigration Tower 1F floor joints',false);
 merged(group,tactile,tactileMat,'Immigration Tower 1F tactile strips',false);
 merged(group,lobbyLights,lobbyLamp,'Immigration Tower 1F night lights',false);
 merged(group,walls,lobbyMat,'Immigration Tower 1F provisional enclosure');
 const bridgeSign=makeCanvasSign(9.4,1.05,(ctx,c)=>{
  ctx.fillStyle='#15191a';ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#d9dede';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 95px sans-serif';
  ctx.fillText('入境事務大樓  IMMIGRATION TOWER',c.width/2,c.height/2,c.width*.94);
 });
 const bridgeNormal=harbourCityEdgeOutward(site.localRing,4);
 bridgeSign.position.set(5.3,level+2.55,21.26);bridgeSign.rotation.y=Math.atan2(bridgeNormal.nx,bridgeNormal.nz);
 bridgeSign.name='Immigration Tower HF95 entrance sign';group.add(bridgeSign);
 const groundHeightAt=(x,z,current,ref)=>{
  if(!Number.isFinite(ref)||ref<OBRIEN_DECK_HEIGHT-.8||ref>OBRIEN_DECK_HEIGHT+2.5)return current;
  const p=harbourCityWorldToLocal(site,x,z);
  return p.x>=.5&&p.x<=20.5&&p.z>=12.167&&p.z<=21.167?OBRIEN_DECK_HEIGHT:current;
 };
 const landmark={name:'入境事務大樓',englishName:'Immigration Tower',x:site.x,z:site.z,w:site.w,d:site.d,h:height,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
 return {group,colliders,groundHeightAt,landmarks:[landmark],base,stats:{immigrationTowerOsm:site.osmId,immigrationTowerHeight:height,immigrationTowerLevels:49,immigrationTowerGlassPanels:panes,immigrationTowerLitPanels:lit,immigrationTowerEntranceBays:openings}};
}
