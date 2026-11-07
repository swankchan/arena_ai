import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { ENTERTAINMENT_PODIUM as podium, ENTERTAINMENT_TOWER as tower, ENTERTAINMENT_SETBACK as setback, ENTERTAINMENT_UPPER as upper, ENTERTAINMENT_CAP as cap, ENTERTAINMENT_HEIGHT as height } from './entertainment-building-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityWorldToLocal } from './harbour-city-architecture.js';
import { store, quad, point, edgeBox, beam, meshStore, merged, roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

// P&T's stone postmodern high-rise. The complex OSM office footprint and
// 165/180/185 m crown profiles are separate from the retail outline.
export function buildEntertainmentBuilding(scene) {
  const base=hongKongTerrainHeight(podium.x,podium.z),root=new THREE.Group();root.name='Entertainment Building — 娛樂行';scene.add(root);
  const groupFor=(site,name)=>{const g=new THREE.Group();g.name=name;g.position.set(site.x,base,site.z);g.rotation.y=site.ry;root.add(g);return g;};
  const retail=groupFor(podium,'Entertainment Building retail podium'),office=groupFor(tower,'Entertainment Building office tower'),crown=groupFor(upper,'Entertainment Building stepped crown');
  const stone=store(),glass=store(),screen=store(),frames=[],roofs=[],colliders=[];
  const mat=(r,m)=>{const x=new THREE.MeshStandardNodeMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:r,metalness:m});x.colorNode=attribute('color');return x;};
  const stoneMat=mat(.78,.03),glassMat=mat(.22,.3),screenMat=mat(.55,.05);
  const frameMat=new THREE.MeshStandardMaterial({color:0x303a3c,roughness:.5,metalness:.4});
  const columnMat=new THREE.MeshStandardMaterial({color:0x9e9788,roughness:.8});
  const roofMat=new THREE.MeshStandardMaterial({color:0x717975,roughness:.45,metalness:.5});
  let retailPanels=0,windowPanels=0;
  // Three entrance vertices mapped by OSM; retain openings on both edges of
  // each vertex, rather than a hidden full-height collider across the door.
  const entranceVertices=new Set([1,11,14]), ring=podium.localRing;
  for(let e=0;e<ring.length/2-1;e++) {
    const {length}=harbourCityEdgeOutward(ring,e), bays=Math.max(1,Math.ceil(length/1.0));
    const p=(t,y,o=0)=>point(podium,e,t,y,o),wall=(s,a,b,y0,y1,c,o=0)=>quad(s,p(a,y0,o),p(b,y0,o),p(b,y1,o),p(a,y1,o),c);
    for(let i=0;i<bays;i++) {
      const t0=i/bays,t1=(i+1)/bays;
      const gap=(entranceVertices.has(e)&&t0*length<2.2)||(entranceVertices.has(e+1)&&(1-t1)*length<2.2);
      if(!gap) wall(glass,t0+.002,t1-.002,.15,4.8,[.07,.105,.115],.02);
      else wall(glass,t0+.002,t1-.002,4.3,4.8,[.07,.105,.115],.02);
      colliders.push(harbourCitySegmentCollider(podium,e,t0,t1,base+(gap?4.3:0),base+15,.4));
      // Granite surrounds and dark glazed/advertisement facings, varied per bay.
      for(let f=0;f<3;f++) {
        const y=4.8+f*3.4, colour=.56+.025*Math.sin(e*8+i+f*2);
        const display=(e===12||e===13||e===14)&&f<2;
        if(display) wall(screen,t0+.004,t1-.004,y+.1,y+3.2,[.06+.03*f,.12+.025*f,.17+.025*f],.045);
        else wall(stone,t0+.004,t1-.004,y+.03,y+3.31,[colour,colour*.96,colour*.89],.03);
      }
      if(i%3===0 && !gap)edgeBox(frames,podium,e,t0,2.45,.1,.1,4.6,.15);
      retailPanels++;
    }
    edgeBox(frames,podium,e,.5,4.82,.1,length,.18,.2);
    edgeBox(frames,podium,e,.5,14.8,.1,length,.32,.3);
  }
  meshStore(retail,stone,stoneMat,'Entertainment Building stone retail podium and courses');
  meshStore(retail,glass,glassMat,'Entertainment Building glazed shopfronts');
  meshStore(retail,screen,screenMat,'Entertainment Building curved frontage digital display');
  merged(retail,frames,frameMat,'Entertainment Building streetfront framing');
  merged(retail,[roofGeometry(podium.localRing,15)],columnMat,'Entertainment Building podium roof');
  const entranceSign=makeCanvasSign(8,1,(ctx,c)=>{ctx.fillStyle='#272b2a';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#e2ddd0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 120px serif';ctx.fillText('ENTERTAINMENT BUILDING  娛樂行',c.width/2,c.height/2,c.width*.96);},{transparent:false});
  const sp=point(podium,13,.77,5.3,.14),sn=harbourCityEdgeOutward(podium.localRing,13);entranceSign.name='Entertainment Building entrance name';entranceSign.position.set(...sp);entranceSign.rotation.y=Math.atan2(sn.nx,sn.nz);retail.add(entranceSign);
  const officeStone=store(),officeGlass=store(),officeFrames=[],officeColumns=[];
  for(let e=0;e<tower.localRing.length/2-1;e++) {
    const {length}=harbourCityEdgeOutward(tower.localRing,e), p=(t,y,o=0)=>point(tower,e,t,y,o);
    const wall=(s,a,b,y0,y1,c,o=0)=>quad(s,p(a,y0,o),p(b,y0,o),p(b,y1,o),p(a,y1,o),c);
    if(e===6) {
      // Main north elevation: narrow outer windows, three tall diamond-patterned
      // central bays framed by the building's paired monumental columns.
      for(let floor=0;floor<26;floor++) {
        const y0=15+floor*5,y1=y0+5;
        for(const [a,b] of [[0,.10],[.15,.24],[.76,.85],[.9,1]]) wall(officeStone,a,b,y0+.02,y1-.02,[.59,.56,.51],.08);
        for(const [a,b] of [[.10,.15],[.85,.90]]) wall(officeGlass,a,b,y0+.8,y1-.7,[.075,.12,.14],-.10);
        for(let bay=0;bay<3;bay++) {
          const a=.24+bay*(.52/3)+.004,b=.24+(bay+1)*(.52/3)-.004;
          wall(officeGlass,a,b,y0+.18,y1-.18,[.075,.12,.14],-.11);windowPanels++;
          // Diamond lattice in the dark windows, not an opaque backing panel.
          const m=(a+b)/2;
          beam(officeFrames,p(a,y0+2.5,-.03),p(m,y0+4.1,-.03),.07);
          beam(officeFrames,p(m,y0+4.1,-.03),p(b,y0+2.5,-.03),.07);
          beam(officeFrames,p(b,y0+2.5,-.03),p(m,y0+.9,-.03),.07);
          beam(officeFrames,p(m,y0+.9,-.03),p(a,y0+2.5,-.03),.07);
        }
        if(floor%3===0) wall(officeStone,.24,.76,y0,y0+.6,[.58,.55,.50],.12);
      }
      for(const t of [.24+.52/3,.24+2*.52/3]) {
        // A faceted cylindrical column follows the tower height.
        const q=p(t,80,.12),g=new THREE.CylinderGeometry(.55,.55,130,12);g.translate(...q);officeColumns.push(g);
      }
    } else {
      const bays=Math.max(1,Math.round(length/3.1));
      for(let f=0;f<26;f++)for(let b=0;b<bays;b++) {
        const a=b/bays,z=(b+1)/bays,y=15+f*5,v=.56+.025*Math.sin(e*5+b*2+f);
        if(length<4){wall(officeStone,a,z,y+.02,y+4.98,[v,v*.96,v*.89],.04);continue;}
        const pad=.18/bays;
        wall(officeStone,a,a+pad,y,y+5,[v,v*.96,v*.89],.06);wall(officeStone,z-pad,z,y,y+5,[v,v*.96,v*.89],.06);
        wall(officeStone,a+pad,z-pad,y,y+.7,[v,v*.96,v*.89],.06);wall(officeStone,a+pad,z-pad,y+4.5,y+5,[v,v*.96,v*.89],.06);
        wall(officeGlass,a+pad,z-pad,y+.7,y+4.5,[.075,.12,.14],-.08);windowPanels++;
      }
    }
    colliders.push(harbourCitySegmentCollider(tower,e,0,1,base+15,base+145,.4));
  }
  meshStore(office,officeStone,stoneMat,'Entertainment Building stone facade and panel joints');
  meshStore(office,officeGlass,glassMat,'Entertainment Building dark neo-classical office windows');
  merged(office,officeFrames,frameMat,'Entertainment Building diamond window lattice');
  merged(office,officeColumns,columnMat,'Entertainment Building monumental columns');
  // Upper floors, plus the distinctive pitched pyramidal roof and lantern.
  for(const [site,from,floors,parent] of [[setback,145,3,groupFor(setback,'Entertainment Building setback floors')],[upper,160,1,crown]]) {
    const topStone=store(),topGlass=store();
    for(let e=0;e<site.localRing.length/2-1;e++){
      const {length}=harbourCityEdgeOutward(site.localRing,e),n=Math.max(1,Math.round(length/3));
      const p=(t,y,o=0)=>point(site,e,t,y,o), wall=(s,a,b,y0,y1,c,o=0)=>quad(s,p(a,y0,o),p(b,y0,o),p(b,y1,o),p(a,y1,o),c);
      for(let f=0;f<floors;f++)for(let b=0;b<n;b++){
        const a=b/n,z=(b+1)/n,y=from+f*5;
        wall(topStone,a,z,y,y+.8,[.58,.55,.50],.03);
        wall(topStone,a,a+(z-a)*.18,y+.8,y+5,[.58,.55,.50],.03);
        wall(topStone,z-(z-a)*.18,z,y+.8,y+5,[.58,.55,.50],.03);
        wall(topGlass,a+(z-a)*.18,z-(z-a)*.18,y+.8,y+4.85,[.08,.12,.13],-.07);
      }
      colliders.push(harbourCitySegmentCollider(site,e,0,1,base+from,base+from+floors*5,.4));
    }
    meshStore(parent,topStone,stoneMat,'Entertainment Building upper stone crown');
    meshStore(parent,topGlass,glassMat,'Entertainment Building upper crown glazing');
  }
  const upperRing=upper.ring.slice(0,-2),capRing=cap.ring.slice(0,-2);
  // Pair each roof corner to the closest mapped lantern corner.
  const local=(ring,i)=>{const q=harbourCityWorldToLocal(upper,ring[i],ring[i+1]);return [q.x,q.z];};
  const corners=[];for(let i=0;i<upperRing.length;i+=2)corners.push(local(upperRing,i));
  const inner=[];for(let i=0;i<capRing.length;i+=2)inner.push(local(capRing,i));
  const closest=p=>inner.reduce((a,b)=>Math.hypot(b[0]-p[0],b[1]-p[1])<Math.hypot(a[0]-p[0],a[1]-p[1])?b:a);
  const pyramid=store();for(let i=0;i<corners.length;i++){const a=corners[i],b=corners[(i+1)%corners.length],c=closest(b),d=closest(a);quad(pyramid,[a[0],165,a[1]],[b[0],165,b[1]],[c[0],180,c[1]],[d[0],180,d[1]],[.43,.46,.44]);}
  meshStore(crown,pyramid,roofMat,'Entertainment Building sloped metal pyramid roof');
  const capGroup=groupFor(cap,'Entertainment Building lantern');const capStone=store();
  for(let e=0;e<cap.localRing.length/2-1;e++){const p=(t,y)=>point(cap,e,t,y,.02);quad(capStone,p(0,180),p(1,180),p(1,185),p(0,185),[.59,.56,.51]);colliders.push(harbourCitySegmentCollider(cap,e,0,1,base+180,base+185,.3));}
  meshStore(capGroup,capStone,stoneMat,'Entertainment Building lantern stonework');
  const dome=new THREE.SphereGeometry(1.5,16,8,0,Math.PI*2,0,Math.PI/2);dome.translate(0,185,0);roofs.push(dome);merged(capGroup,roofs,columnMat,'Entertainment Building lantern dome');
  const landmark={name:'娛樂行',englishName:'Entertainment Building',x:podium.x,z:podium.z,w:podium.w,d:podium.d,h:height,ring:podium.ring,bounds:podium.bounds,osmId:podium.osmId,kind:'landmark',labelHeight:false};
  return {group:root,colliders,landmarks:[landmark],stats:{entertainmentBuildingOsm:podium.osmId,entertainmentTowerOsm:tower.osmId,entertainmentHeight:height,entertainmentWindowPanels:windowPanels,entertainmentRetailPanels:retailPanels,entertainmentGround:base}};
}
