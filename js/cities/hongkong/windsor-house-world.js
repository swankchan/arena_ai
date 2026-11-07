import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { WINDSOR_MALL, WINDSOR_TOWER } from './windsor-house-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { harbourCityEdgeOutward,harbourCitySegmentCollider,harbourCityLocalToWorld } from './harbour-city-architecture.js';
import { store,quad,point,edgeBox,meshStore,merged,roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

// Windsor House's magenta retail crown and glazed corner, below the horizontally banded Chubb Tower.
export function buildWindsorHouse(scene){
 const base=hongKongTerrainHeight(WINDSOR_MALL.x,WINDSOR_MALL.z),root=new THREE.Group(),colliders=[];root.name='Windsor House — 皇室堡';scene.add(root);
 const mat=(roughness,metalness)=>{const m=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness,metalness});m.colorNode=attribute('color');return m;};
 const darkMetal=new THREE.MeshStandardMaterial({color:0x505a5c,roughness:.52,metalness:.44}), cream=new THREE.MeshStandardMaterial({color:0xa9a89d,roughness:.76,metalness:.1});
 let panels=0,portals=0,doors=0;
 for(const [site,tower] of [[WINDSOR_MALL,false],[WINDSOR_TOWER,true]]){
  const group=new THREE.Group(),glass=store(),solid=store(),structure=[],roof=[];group.name=tower?'Windsor House Chubb Tower':'Windsor House retail podium';group.position.set(site.x,base,site.z);group.rotation.y=site.ry;root.add(group);
  for(let e=0;e<site.localRing.length/2-1;e++){
   const frame=harbourCityEdgeOutward(site.localRing,e),len=frame.length;if(len<.2)continue;
   const n=Math.max(1,Math.ceil(len/(tower?2.0:1.0))),p=(t,y,o=0)=>point(site,e,t,y,o);
   const face=(st,a,b,lo,hi,c,o=0)=>quad(st,p(a,lo,o),p(b,lo,o),p(b,hi,o),p(a,hi,o),c);
   for(let j=0;j<n;j++){
    const a=j/n,b=(j+1)/n;
    if(tower){
     for(let f=0;f<35;f++){const lo=26+f*114/35,hi=26+(f+1)*114/35,v=.9+.08*Math.sin(f*.7+j*1.5+e);
      face(solid,a,b,lo,lo+1.25,[.78*v,.76*v,.70*v]);face(glass,a+.02/n,b-.02/n,lo+1.25,hi-.12,[.09*v,.14*v,.16*v],-.08);panels++;}
     edgeBox(structure,site,e,a,83,.08,.12,114,.20);
    }else{
     const v=p((a+b)/2,0),w=harbourCityLocalToWorld(site,v[0],v[2]),road=fullRoadSurfaceAt(w.x,w.z,.4,base),bottom=road?6.6:0;
     const door=(e===3||e===10)&&Math.abs((a+b)/2-.5)*len<2.2;
     if(road)portals++;if(door)doors++;
     const foot=hongKongTerrainHeight(w.x,w.z)-base-.15;
     if(!road&&!door)face(glass,a+.01/n,b-.01/n,foot,4.8,[.07,.12,.14],.03);
     colliders.push(harbourCitySegmentCollider(site,e,a,b,base+(road?6.6:door?4.8:foot),base+26,.25));
     for(const [lo,hi] of [[4.8,10],[10,15.2],[15.2,20]])if(hi>bottom){const tint=(j+e)%5===0?[.13,.24,.28]:[.16,.27,.31];face(glass,a+.01/n,b-.01/n,Math.max(lo,bottom),hi-.16,tint,.02);panels++;}
     const c=.34+((j%6)/6)*.035;face(solid,a,b,20,26,[c,.09,.16],.02);
     edgeBox(structure,site,e,a,13,.12,.1,14,.16);
    }
   }
   if(tower){for(let j=0;j<=Math.max(1,Math.round(len/12));j++){let q=j/Math.max(1,Math.round(len/12));edgeBox(structure,site,e,q,83,.14,.48,114,.24);}
    colliders.push(harbourCitySegmentCollider(site,e,0,1,base+26,base+140,.22));
   }else{for(const y of [4.8,10,15.2,20,26])edgeBox(structure,site,e,.5,y,.12,len,.18,.22);}
  }
  meshStore(group,glass,mat(.28,.34),tower?'Chubb Tower dark horizontal ribbon windows':'Windsor House glazed shopfronts');
  meshStore(group,solid,mat(.62,.14),tower?'Chubb Tower stone floor bands':'Windsor House magenta crown panels');
  merged(group,structure,tower?cream:darkMetal,tower?'Chubb Tower vertical piers and mullions':'Windsor House shopfront frames and cornices');
  roof.push(roofGeometry(site.localRing,tower?140:26));merged(group,roof,cream,tower?'Chubb Tower roof':'Windsor House podium roof');
  if(!tower){
   for(const edge of [3,10]){const info=harbourCityEdgeOutward(site.localRing,edge), sign=makeCanvasSign(Math.min(info.length*.82,24),2.2,(ctx,c)=>{ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#f3eceb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 140px sans-serif';ctx.fillText('WINDSOR HOUSE',c.width/2,c.height/2,c.width*.96);});sign.position.set(...point(site,edge,.5,23,.16));sign.rotation.y=Math.atan2(info.nx,info.nz);sign.name='Windsor House roofline lettering';group.add(sign);}
   // Ground fascia lettering seen on the shopping-mall corner.
   const corner=harbourCityEdgeOutward(site.localRing,3);
   const shop=makeCanvasSign(17,1.5,(ctx,c)=>{ctx.fillStyle='#141414';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#f1eeeb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 150px sans-serif';ctx.fillText('SEPHORA',c.width/2,c.height/2);},{transparent:false});
   shop.position.set(...point(site,3,.72,4.1,.3));shop.rotation.y=Math.atan2(corner.nx,corner.nz);shop.name='Windsor House ground retail fascia';group.add(shop);
   // Photo-directed retail display bays: bespoke graphic placeholders, not a copy of an advertisement.
   for(const edge of [3,10]){
    const info=harbourCityEdgeOutward(site.localRing,edge),count=edge===3?3:2;
    for(let k=0;k<count;k++){
     const sign=makeCanvasSign(info.length/count-.35,9.1,(ctx,c)=>{
      const bg=['#dbd3cc','#282932','#ba8290'][k%3];ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle=k%3===1?'#e6dcd4':'#3e3940';ctx.textAlign='center';ctx.font='bold 88px sans-serif';
      ctx.fillText(['WINDSOR','BEAUTY','LIFESTYLE'][k%3],c.width/2,c.height*.35);
      ctx.font='52px sans-serif';ctx.fillText(['CAUSEWAY BAY','DISCOVER','SHOP & DINE'][k%3],c.width/2,c.height*.59);
      ctx.fillRect(c.width*.19,c.height*.72,c.width*.62,4);
     },{transparent:false,canvasWidth:768,canvasHeight:512});
     sign.position.set(...point(site,edge,(k+.5)/count,14.5,.4));sign.rotation.y=Math.atan2(info.nx,info.nz);sign.name='Windsor House retail display graphic';group.add(sign);
    }
   }
  }
 }
 const site=WINDSOR_MALL;const landmark={name:'皇室堡',englishName:'Windsor House',x:site.x,z:site.z,w:site.w,d:site.d,h:140,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
 return {group:root,colliders,landmarks:[landmark],stats:{windsorMallOsm:site.osmId,windsorTowerOsm:WINDSOR_TOWER.osmId,windsorTowerHeight:140,windsorFacadePanels:panels,windsorDrivewayPortals:portals,windsorEntranceBays:doors}};
}
