import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import { IMMIGRATION_TOWER_SITE as site, IMMIGRATION_TOWER_HEIGHT as height } from './immigration-tower-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityLocalToWorld, harbourCityLocalCollider } from './harbour-city-architecture.js';
import { store, quad, point, edgeBox, meshStore, merged, roofGeometry, nightAmount, hash, box, beam } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

// Photo-directed exterior; public bridge and complete interior are not modeled.
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
   if(!entrance)face(glass,a+.002,b-.002,bottom,10.6,[.12,.17,.19],.025,.08);else openings++;
   colliders.push(harbourCitySegmentCollider(site,e,a,b,base+(entrance?5.0:bottom),base+height,.25));
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
   quad(streetCanopy,p(a,5.5,1.7),p(b,5.5,1.7),p(b,9.3,.12),p(a,9.3,.12),[.53*shade,.55*shade,.54*shade]);
   beam(streetRails,p(a,5.5,1.75),p(a,9.3,.17),.09);
  }
  beam(streetRails,p(start,5.5,1.75),p(end,5.5,1.75),.12);
  beam(streetRails,p(start,9.3,.17),p(end,9.3,.17),.12);
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
 const landmark={name:'入境事務大樓',englishName:'Immigration Tower',x:site.x,z:site.z,w:site.w,d:site.d,h:height,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
 return {group,colliders,landmarks:[landmark],base,stats:{immigrationTowerOsm:site.osmId,immigrationTowerHeight:height,immigrationTowerLevels:49,immigrationTowerGlassPanels:panes,immigrationTowerLitPanels:lit,immigrationTowerEntranceBays:openings}};
}
