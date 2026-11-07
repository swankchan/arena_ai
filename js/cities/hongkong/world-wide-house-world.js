import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { WORLD_WIDE_PODIUM as site, WORLD_WIDE_TOWER_RING, WORLD_WIDE_HIGH_RING,
  WORLD_WIDE_HEIGHT as height, WORLD_WIDE_LOWER_HEIGHT as lowerHeight,
  WORLD_WIDE_PODIUM_HEIGHT as podiumHeight, WORLD_WIDE_ENTRANCE_VERTICES } from './world-wide-house-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityLocalToWorld } from './harbour-city-architecture.js';
import { store, quad, point, edgeBox, meshStore, merged, roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

// Photo-directed glass and retail facade. The footprint trace and crown are estimates.
export function buildWorldWideHouse(scene) {
  const base = hongKongTerrainHeight(site.x, site.z), root = new THREE.Group();
  root.name = 'World-Wide House — 環球大廈'; root.position.set(site.x,base,site.z); root.rotation.y = site.ry; scene.add(root);
  const glazing = store(), metal = store(), frames = [], roofs = [], colliders = [];
  const mat = (roughness, metalness) => { const m = new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness,metalness}); m.colorNode=attribute('color');return m; };
  const glassMat=mat(.28,.35), metalMat=mat(.48,.45);
  const frameMat=new THREE.MeshStandardMaterial({color:0x222e36,roughness:.5,metalness:.48});
  const roofMat=new THREE.MeshStandardMaterial({color:0x4a575b,roughness:.8,metalness:.15});
  let panes=0, shops=0;
  // Mapped entrances are at vertices. Split both adjoining edges around the vertex.
  for(let e=0;e<site.localRing.length/2-1;e++) {
    const {length}=harbourCityEdgeOutward(site.localRing,e), n=Math.max(1,Math.ceil(length/1.6));
    const p=(t,y,o=0)=>point(site,e,t,y,o);
    const wall=(store,a,b,y0,y1,c,o=0)=>quad(store,p(a,y0,o),p(b,y0,o),p(b,y1,o),p(a,y1,o),c);
    for(let b=0;b<n;b++) {
      const a=b/n,z=(b+1)/n, gap=(WORLD_WIDE_ENTRANCE_VERTICES.includes(e)&&a*length<2.1)||(WORLD_WIDE_ENTRANCE_VERTICES.includes(e+1)&&(1-z)*length<2.1);
      // Follow the existing DTM at street level. A single centre-height sill left
      // gaps at lower edges and sank into the slope at higher ones; do not flatten
      // or alter the neighbouring tram/road profile to hide that mismatch.
      const groundAt = t => { const q=p(t,0), w=harbourCityLocalToWorld(site,q[0],q[2]); return hongKongTerrainHeight(w.x,w.z)-base-.12; };
      const ya=groundAt(a), yz=groundAt(z);
      if(!gap)quad(glazing,p(a+.004,ya,.02),p(z-.004,yz,.02),p(z-.004,4.4,.02),p(a+.004,4.4,.02),[.065,.11,.13]);
      else wall(glazing,a+.004,z-.004,4.05,4.4,[.065,.11,.13],.02);
      colliders.push(harbourCitySegmentCollider(site,e,a,z,base+(gap?4.05:Math.min(ya,yz)),base+podiumHeight,.35));
      for(let f=0;f<3;f++) {
        const y=4.4+f*3.8,v=.90+.08*Math.sin(e*3+b*.7+f*5);
        wall(glazing,a+.006,z-.006,y+.36,y+3.5,[.10*v,.21*v,.27*v],.025);
        wall(metal,a,z,y,y+.36,[.12,.15,.17],.04);
      }
      edgeBox(frames,site,e,a,8.8,.06,.075,14.2,.11); shops++;
    }
    for(let y of [4.4,8.2,12,15.8])edgeBox(frames,site,e,.5,y,.08,length,.16,.16);
  }
  // 2.25 m curtain-wall bays and narrow dark mullions, retaining the deep dark mid-height band.
  const towerSite = ring => ({...site, localRing:ring});
  function tower(ring, y0, y1, label) {
    const s=towerSite(ring), panel=store(), band=store(), mullions=[];
    for(let e=0;e<ring.length/2-1;e++) {
      const {length}=harbourCityEdgeOutward(ring,e), n=Math.max(1,Math.round(length/2.25));
      const p=(t,y,o=0)=>point(s,e,t,y,o);
      const wall=(st,a,b,lo,hi,c,o=0)=>quad(st,p(a,lo,o),p(b,lo,o),p(b,hi,o),p(a,hi,o),c);
      for(let b=0;b<n;b++) {
        const a=b/n,z=(b+1)/n;
        for(let f=0;f<Math.ceil((y1-y0)/4.0);f++) {
          const lo=y0+f*4.0,hi=Math.min(y1,lo+4.0);if(lo>=hi)break;
          const shade=.9+.1*Math.sin(e*9+b*2.1+f*.8);
          // Broad continuous service band visible in contemporary photographs.
          if(lo<61 && hi>57.5)wall(band,a,z,Math.max(lo,57.5),Math.min(hi,61),[.035,.047,.055],.035);
          const h0=lo+.12,h1=hi-.12;
          for(const [v0,v1] of [[h0,Math.min(h1,57.5)],[Math.max(h0,61),h1]])
            if(v0<v1)wall(panel,a+.004,z-.004,v0,v1,[.10*shade,.22*shade,.29*shade],.015);
          panes++;
        }
        edgeBox(mullions,s,e,a,(y0+y1)/2,.07,.09,y1-y0,.15);
      }
      for(let y=y0;y<=y1;y+=4.0) edgeBox(mullions,s,e,.5,y,.07,length,.09,.15);
      colliders.push(harbourCitySegmentCollider(s,e,0,1,base+y0,base+y1,.28));
    }
    meshStore(root,panel,glassMat,`${label} blue reflective glazing`);
    meshStore(root,band,metalMat,`${label} dark horizontal service band`);
    merged(root,mullions,frameMat,`${label} curtain wall grid`);
  }
  tower(WORLD_WIDE_TOWER_RING,podiumHeight,lowerHeight,'World-Wide House lower stepped tower');
  tower(WORLD_WIDE_HIGH_RING,lowerHeight,height,'World-Wide House taller tower');
  roofs.push(roofGeometry(site.localRing,podiumHeight),roofGeometry(WORLD_WIDE_TOWER_RING,lowerHeight),roofGeometry(WORLD_WIDE_HIGH_RING,height));
  meshStore(root,glazing,glassMat,'World-Wide House retail glazing');
  meshStore(root,metal,metalMat,'World-Wide House retail spandrels');
  merged(root,frames,frameMat,'World-Wide House podium glazing frames');
  merged(root,roofs,roofMat,'World-Wide House roof terraces');
  // Recognisable blue screen at the Pedder/Des Voeux frontage; text is decorative, not an advertising replica.
  const screen=makeCanvasSign(8.5,9,(ctx,c)=>{
    ctx.fillStyle='#185287';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#c9dce4';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='bold 105px sans-serif';ctx.fillText('環球大廈',c.width/2,c.height*.25,c.width*.85);
    ctx.font='bold 65px sans-serif';ctx.fillText('WORLD-WIDE HOUSE',c.width/2,c.height*.42,c.width*.9);
    ctx.strokeStyle='#8ac6e0';ctx.lineWidth=14;ctx.beginPath();ctx.arc(c.width/2,c.height*.7,c.height*.17,0,Math.PI*2);ctx.stroke();
  },{transparent:false});
  const ep=point(site,3,.65,9.1,.12),normal=harbourCityEdgeOutward(site.localRing,3);
  screen.position.set(...ep);screen.rotation.y=Math.atan2(normal.nx,normal.nz);screen.name='World-Wide House blue streetfront screen';root.add(screen);
  const landmark={name:'環球大廈',englishName:'World-Wide House',x:site.x,z:site.z,w:site.w,d:site.d,h:height,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
  return {group:root,colliders,landmarks:[landmark],stats:{worldWideHouseOsm:site.osmId,worldWideHouseHeight:height,worldWideHouseGround:base,worldWideHouseWindowPanels:panes,worldWideHouseRetailBays:shops}};
}
