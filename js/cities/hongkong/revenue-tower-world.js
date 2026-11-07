import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { REVENUE_TOWER_SITE as site,REVENUE_TOWER_HEIGHT as height } from './revenue-tower-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward,harbourCitySegmentCollider,harbourCityLocalToWorld } from './harbour-city-architecture.js';
import { store,quad,point,edgeBox,meshStore,merged,roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

export function buildRevenueTower(scene){
 const base=hongKongTerrainHeight(site.x,site.z),group=new THREE.Group(),glass=store(),cladding=store(),frames=[],colliders=[];
 group.name='Revenue Tower — 稅務大樓';group.position.set(site.x,base,site.z);group.rotation.y=site.ry;scene.add(group);
 const material=(roughness,metalness)=>{const m=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness,metalness});m.colorNode=attribute('color');return m;};
 const black=new THREE.MeshStandardMaterial({color:0x20292c,roughness:.42,metalness:.48});
 let panes=0,entranceBays=0;
 for(let e=0;e<site.localRing.length/2-1;e++){
  const info=harbourCityEdgeOutward(site.localRing,e),length=info.length,bays=Math.max(1,Math.ceil(length/1.5));
  const p=(t,y,o=0)=>point(site,e,t,y,o);
  const face=(st,a,b,lo,hi,c,o=0)=>quad(st,p(a,lo,o),p(b,lo,o),p(b,hi,o),p(a,hi,o),c);
  for(let j=0;j<bays;j++){
   const a=j/bays,b=(j+1)/bays;
   // The OSM entrance node is shared by edges 0 and 1.
   const entrance=(e===0&&(1-b)*length<2.15)||(e===1&&a*length<2.15);
   const q=p((a+b)/2,0),w=harbourCityLocalToWorld(site,q[0],q[2]);
   const bottom=hongKongTerrainHeight(w.x,w.z)-base-.15;
   if(!entrance)face(glass,a+.002,b-.002,bottom,10.6,[.15,.23,.26],.02);else entranceBays++;
   colliders.push(harbourCitySegmentCollider(site,e,a,b,base+(entrance?5:bottom),base+height,.24));
   face(cladding,a,b,10.6,15.5,[.055,.065,.068],.03);
   for(let f=0;f<46;f++){
    const lo=15.5+f*(163.7/46),hi=15.5+(f+1)*(163.7/46),v=.91+.08*Math.sin(f*.64+j*1.87+e*2);
    face(glass,a+.004,b-.004,lo+.06,hi-.07,[.25*v,.32*v,.34*v],.02);panes++;
   }
   edgeBox(frames,site,e,a,97,.07,.085,164,.12);
  }
  // Large black aluminium outlines surround the curtain wall, with two major intermediate transfer bands.
  for(const y of [15.5,63,121,179.5])edgeBox(frames,site,e,.5,y,.12,length,.90,.25);
  const verticals=Math.max(1,Math.round(length/12));for(let j=0;j<=verticals;j++)edgeBox(frames,site,e,j/verticals,97,.12,.6,164,.25);
  face(cladding,0,1,179.2,181,[.07,.08,.085],.02);
 }
 meshStore(group,glass,material(.26,.38),'Revenue Tower reflective grey-blue glazed curtain wall');
 meshStore(group,cladding,material(.46,.32),'Revenue Tower black podium and parapet panels');
 merged(group,frames,black,'Revenue Tower black frame and window mullions');
 merged(group,[roofGeometry(site.localRing,height)],black,'Revenue Tower roof');
 const e=0,n=harbourCityEdgeOutward(site.localRing,e),sign=makeCanvasSign(12,2,(ctx,c)=>{ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e4e8e8';ctx.font='bold 115px sans-serif';ctx.fillText('REVENUE TOWER　稅務大樓',c.width/2,c.height/2,c.width*.94);});
 sign.position.set(...point(site,e,.65,13,.1));sign.rotation.y=Math.atan2(n.nx,n.nz);sign.name='Revenue Tower entrance lettering';group.add(sign);
 const landmark={name:'稅務大樓',englishName:'Revenue Tower',x:site.x,z:site.z,w:site.w,d:site.d,h:height,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
 return {group,colliders,landmarks:[landmark],stats:{revenueTowerOsm:site.osmId,revenueTowerHeight:height,revenueTowerLevels:49,revenueTowerGlassPanels:panes,revenueTowerEntranceBays:entranceBays}};
}
