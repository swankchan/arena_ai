import * as THREE from 'three/webgpu';
import {attribute} from 'three/tsl';
import {CHINA_RESOURCES as site,CHINA_RESOURCES_ENTRANCES as entrances} from './china-resources-architecture.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityEdgeOutward,harbourCityLocalToWorld,harbourCitySegmentCollider} from './harbour-city-architecture.js';
import {store,quad,point,edgeBox,merged,meshStore,roofGeometry} from './harbour-city-world-utils.js';

// Retrofit by RLP: deep vertical silver fins and dark reflective glazing over the old structure.
export function buildChinaResources(scene){
 const base=hongKongTerrainHeight(site.x,site.z),root=new THREE.Group(),glass=store(),frames=[],colliders=[];root.name='華潤大廈 China Resources Building';root.position.set(site.x,base,site.z);root.rotation.y=site.ry;scene.add(root);
 const facade=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.22,metalness:.38});facade.colorNode=attribute('color');
 const silver=new THREE.MeshStandardMaterial({color:0xc2c8c5,metalness:.26,roughness:.48}),dark=new THREE.MeshStandardMaterial({color:0x3d5053,metalness:.35,roughness:.55});
 let panels=0,open=0,finCount=0;
 for(let e=0;e<site.localRing.length/2-1;e++){
  const f=harbourCityEdgeOutward(site.localRing,e),len=f.length;if(len<.1)continue;let p=point(site,e,.5,0),w=harbourCityLocalToWorld(site,p[0],p[2]);
  const entry=entrances.some(([x,z])=>Math.hypot(w.x-x,w.z-z)<2.15),bottom=entry?4.5:Math.min(-.2,hongKongTerrainHeight(w.x,w.z)-base-.2);
  colliders.push(harbourCitySegmentCollider(site,e,0,1,base+bottom,base+178,.12));if(entry)open++;
  edgeBox(frames,site,e,.5,177.7,.13,len,.38,.28);
  // OSM's closely spaced segments mark the edge subdivisions, so the original outline is retained.
  if(len<.8){edgeBox(frames,site,e,.5,(178+bottom)/2,.15,.42,178-bottom,.36);finCount++;continue;}
  for(let row=0;row<49;row++){
   const lo=Math.max(bottom,row*178/49),hi=(row+1)*178/49;if(hi<=lo)continue;
   const v=.86+.12*Math.sin(e*.73+row*.42);const tint=row===20?[.05,.09,.10]:[.14*v,.24*v,.29*v];
   quad(glass,point(site,e,.015,lo+.03,.03),point(site,e,.985,lo+.03,.03),point(site,e,.985,hi-.035,.03),point(site,e,.015,hi-.035,.03),tint);panels++;
   edgeBox(frames,site,e,.5,hi,.12,len,.05,.12);
  }
  edgeBox(frames,site,e,0,(178+bottom)/2,.13,.22,178-bottom,.26);
 }
 meshStore(root,glass,facade,'China Resources reflective curtain wall');merged(root,frames,silver,'China Resources full-height silver fins and mullions');merged(root,[roofGeometry(site.localRing,178)],dark,'China Resources rooftop');
 const landmark={name:'華潤大廈',englishName:'China Resources Building',x:site.x,z:site.z,w:site.w,d:site.d,h:178,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
 return {group:root,colliders,landmarks:[landmark],stats:{chinaResourcesOsm:site.osmId,chinaResourcesHeight:178,chinaResourcesWindows:panels,chinaResourcesEntrances:open,chinaResourcesFins:finCount}};
}
