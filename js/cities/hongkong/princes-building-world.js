// The 1965 office block over LANDMARK PRINCE'S, with source rings kept separate.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { PRINCES_TOWER as tower, PRINCES_PODIUM as podium, PRINCES_HEIGHT_ESTIMATE as height, PRINCES_OFFICE_COURSES as floors } from './princes-building-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider } from './harbour-city-architecture.js';
import { store, quad, point, edgeBox, box, meshStore, merged, roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

export function buildPrincesBuilding(scene) {
  const root=new THREE.Group();root.name="Prince's Building and LANDMARK PRINCE'S — 太子大廈";scene.add(root);
  const base=hongKongTerrainHeight(podium.x,podium.z), colliders=[];
  const groupFor=(s,name)=>{const g=new THREE.Group();g.name=name;g.position.set(s.x,base,s.z);g.rotation.y=s.ry;root.add(g);return g;};
  const towerGroup=groupFor(tower,'Prince’s Building office tower'), mallGroup=groupFor(podium,'LANDMARK PRINCE’S retail podium');
  const material=(r,m)=>{const x=new THREE.MeshStandardNodeMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:r,metalness:m});x.colorNode=attribute('color');return x;};
  const stoneMat=material(.76,.04),glassMat=material(.27,.27),metalMat=material(.48,.45);
  const frameMat=new THREE.MeshStandardMaterial({color:0x6b6d68,roughness:.52,metalness:.3});
  const roofMat=new THREE.MeshStandardMaterial({color:0x646b63,roughness:.94});
  const towerStone=store(),towerGlass=store(),towerFrames=[],towerRoof=[];
  let windows=0;
  for(let e=0;e<tower.localRing.length/2-1;e++) {
    const {length}=harbourCityEdgeOutward(tower.localRing,e), bays=Math.max(1,Math.round(length/2.9)), service=length<8;
    const p=(t,y,o=0)=>point(tower,e,t,y,o);
    const wall=(s,a,b,y0,y1,c,o=0)=>quad(s,p(a,y0,o),p(b,y0,o),p(b,y1,o),p(a,y1,o),c);
    for(let f=0;f<floors;f++) {
      const y0=20+f*(height-20)/floors, y1=20+(f+1)*(height-20)/floors;
      for(let b=0;b<bays;b++) {
        const t0=b/bays,t1=(b+1)/bays, v=.62+.018*Math.sin(e*8+f*1.3+b*3.7), stone=[v,v*.98,v*.92];
        if(service || length/bays<1.5) {
          wall(towerStone,t0+.001,t1-.001,y0+.015,y1-.015,stone,.025);continue;
        }
        const pad=Math.min(.22/bays,.38/length), g0=t0+pad,g1=t1-pad;
        wall(towerStone,t0,g0,y0,y1,stone,.08);wall(towerStone,g1,t1,y0,y1,stone,.08);
        wall(towerStone,g0,g1,y0,y0+.48,stone,.08);wall(towerStone,g0,g1,y1-.42,y1,stone,.08);
        const c=.9+.1*Math.sin(f*2.3+b*4.1+e);
        wall(towerGlass,g0,g1,y0+.48,y1-.42,[.09*c,.14*c,.15*c],-.16);windows++;
        edgeBox(towerFrames,tower,e,(g0+g1)/2,y0+1.22,-.12,(g1-g0)*length,.07,.07);
      }
    }
    colliders.push(harbourCitySegmentCollider(tower,e,0,1,base+20,base+height,.45));
  }
  towerRoof.push(roofGeometry(tower.localRing,height));
  meshStore(towerGroup,towerStone,stoneMat,'Prince’s Building concrete window grid and corner panel joints');
  meshStore(towerGroup,towerGlass,glassMat,'Prince’s Building recessed dark office windows');
  merged(towerGroup,towerFrames,frameMat,'Prince’s Building window sill and transoms');
  merged(towerGroup,towerRoof,roofMat,'Prince’s Building tower roof');
  const mallGlass=store(), mallStone=store(), mallMetal=store(), mallFrames=[], mallRoof=[];
  let retailBays=0;
  for(let e=0;e<podium.localRing.length/2-1;e++) {
    const {length}=harbourCityEdgeOutward(podium.localRing,e),bays=Math.max(1,Math.ceil(length/3.0));
    const p=(t,y,o=0)=>point(podium,e,t,y,o);
    const wall=(s,a,b,y0,y1,c,o=0)=>quad(s,p(a,y0,o),p(b,y0,o),p(b,y1,o),p(a,y1,o),c);
    for(let b=0;b<bays;b++) {
      const t0=b/bays,t1=(b+1)/bays,entrance=e===3 && t0<.5+2.1/length && t1>.5-2.1/length;
      if(!entrance) wall(mallGlass,t0+.004,t1-.004,.25,5.8,[.105,.135,.13],.02);
      else wall(mallGlass,t0+.004,t1-.004,4.3,5.8,[.105,.135,.13],.02);
      colliders.push(harbourCitySegmentCollider(podium,e,t0,t1,base+(entrance?4.3:0),base+20,.38));retailBays++;
      edgeBox(mallFrames,podium,e,t0,3,.10,.13,5.8,.2);
      // Varied shop-front cladding: dark bronze, glass and stone panels; the
      // photographic fronts are not one uniform sheet of near-white paint.
      const style=(e*3+Math.floor(b/4))%3;
      for(let row=0;row<5;row++) {
        const y0=6+row*2.65,y1=y0+2.59,v=.88+.10*Math.sin(e*2+b*3+row);
        if(style===0) wall(mallGlass,t0+.004,t1-.004,y0,y1,[.20*v,.29*v,.29*v],.02);
        else if(style===1) wall(mallMetal,t0+.004,t1-.004,y0,y1,[.39*v,.35*v,.30*v],.02);
        else wall(mallStone,t0+.004,t1-.004,y0,y1,[.57*v,.56*v,.52*v],.02);
      }
      edgeBox(mallFrames,podium,e,t0,12.6,.10,.07,13.2,.14);
    }
    edgeBox(mallFrames,podium,e,.5,5.95,.13,length,.20,.22);
    edgeBox(mallFrames,podium,e,.5,19.65,.13,length,.30,.25);
  }
  mallRoof.push(roofGeometry(podium.localRing,20));
  meshStore(mallGroup,mallGlass,glassMat,'LANDMARK PRINCE’S glazed shopfronts and entrances');
  meshStore(mallGroup,mallStone,stoneMat,'LANDMARK PRINCE’S dressed stone retail panels');
  meshStore(mallGroup,mallMetal,metalMat,'LANDMARK PRINCE’S bronze retail panels');
  merged(mallGroup,mallFrames,frameMat,'LANDMARK PRINCE’S shopfront mullions and horizontal bands');
  merged(mallGroup,mallRoof,roofMat,'LANDMARK PRINCE’S podium roof');
  const edge=3, f=harbourCityEdgeOutward(podium.localRing,edge),position=point(podium,edge,.5,7.1,.19);
  const sign=makeCanvasSign(10,1.3,(ctx,c)=>{ctx.fillStyle='#d7d2c2';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#212825';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 106px sans-serif';ctx.fillText("PRINCE'S BUILDING  太子大廈",c.width/2,c.height/2,c.width*.94);},{transparent:false});
  sign.name='Prince’s Building bilingual entrance sign';sign.position.set(...position);sign.rotation.y=Math.atan2(f.nx,f.nz);mallGroup.add(sign);
  const landmark={name:'太子大廈',englishName:"Prince's Building",x:podium.x,z:podium.z,w:podium.w,d:podium.d,h:height,ring:podium.ring,bounds:podium.bounds,osmId:tower.osmId,kind:'landmark',labelHeight:false};
  return {group:root,colliders,landmarks:[landmark],stats:{princesBuildingTowerOsm:tower.osmId,princesBuildingPodiumOsm:podium.osmId,princesBuildingEstimatedHeight:height,princesBuildingOfficeWindows:windows,princesBuildingRetailBays:retailBays,princesBuildingGround:base}};
}
