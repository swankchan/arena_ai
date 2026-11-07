// HK-B0059: photo-directed rounded twin service cores and green glazed long elevations.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { HANG_SENG_SITE as site, HANG_SENG_HEIGHT, HANG_SENG_LEVELS, HANG_SENG_GLASS_EDGES, HANG_SENG_ENTRANCE_EDGE } from './hang-seng-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider } from './harbour-city-architecture.js';
import { store, quad, meshStore, merged, edgeBox, point, roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

export function buildHangSengHeadquarters(scene) {
  const base = hongKongTerrainHeight(site.x, site.z);
  const group = new THREE.Group(); group.name = 'Hang Seng Bank Headquarters — 恒生銀行總行大廈';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry;
  group.userData.landmark = 'hang-seng-headquarters'; scene.add(group);
  const panels = store(), glass = store(), frames = [], roofParts = [], colliders = [];
  const mat = (roughness, metalness) => {
    const m = new THREE.MeshStandardNodeMaterial({ vertexColors:true, roughness, metalness, side:THREE.DoubleSide });
    m.colorNode = attribute('color'); return m;
  };
  const metal = mat(.55,.42), glazing = mat(.25,.38);
  const frameMat = new THREE.MeshStandardMaterial({color:0x788a87,roughness:.42,metalness:.58});
  const roofMat = new THREE.MeshStandardMaterial({color:0x606a67,roughness:.8,metalness:.18});
  const ring = site.localRing;
  let paneCount = 0, metalPanels = 0;
  for (let edge = 0; edge < ring.length/2-1; edge++) {
    const info = harbourCityEdgeOutward(ring, edge), length = info.length;
    const isGlass = HANG_SENG_GLASS_EDGES.includes(edge), bays = Math.max(1,Math.ceil(length/(isGlass?2.1:2.8)));
    const at = (t,y,out=.035) => point(site,edge,t,y,out);
    const face = (target,t0,t1,y0,y1,tint,out=.035) => quad(target,at(t0,y0,out),at(t1,y0,out),at(t1,y1,out),at(t0,y1,out),tint);
    if (isGlass) {
      for (let bay=0; bay<bays; bay++) {
        const t0=bay/bays, t1=(bay+1)/bays, tm=(t0+t1)/2;
        // A genuine 3.6 m ground entrance opening, no full-height wall hidden behind it.
        const entrance = edge===HANG_SENG_ENTRANCE_EDGE && t0 < .5 + 2/length && t1 > .5 - 2/length;
        if (!entrance) face(glass,t0+.003,t1-.003,.35,12,[.10,.21,.22]);
        face(glass,t0+.003,t1-.003,12,18,[.14,.24,.25]);
        if (!entrance) colliders.push(harbourCitySegmentCollider(site,edge,t0,t1,base,base+18,.45));
        else colliders.push(harbourCitySegmentCollider(site,edge,t0,t1,base+4.4,base+18,.45));
        for (let floor=0; floor<24; floor++) {
          const y0=18+floor*(116/24), y1=18+(floor+1)*(116/24);
          const v=.88+.10*Math.sin(floor*1.2+bay*2.7);
          face(glass,t0+.004,t1-.004,y0+.18,y1-.18,[.17*v,.32*v,.32*v]); paneCount++;
          face(panels,t0+.004,t1-.004,y0,y0+.16,[.38,.45,.44]);
        }
        edgeBox(frames,site,edge,t0,76,.09,.18,116,.18);
      }
      edgeBox(frames,site,edge,1,76,.09,.18,116,.18);
      face(panels,0,1,134,137,[.50,.55,.54]);
      colliders.push(harbourCitySegmentCollider(site,edge,0,1,base+18,base+137,.45));
    } else {
      // OSM's corner segments describe the rounded, windowless aluminium cores.
      for(let bay=0;bay<bays;bay++) for(let floor=0;floor<29;floor++) {
        const y0=floor*137/29, y1=(floor+1)*137/29;
        const c=.57+.025*Math.sin(edge*4.8+floor*.73+bay);
        face(panels,bay/bays+.004,(bay+1)/bays-.004,y0+.025,y1-.025,[c,c*1.02,c*1.01]); metalPanels++;
      }
      colliders.push(harbourCitySegmentCollider(site,edge,0,1,base,base+137,.5));
    }
  }
  meshStore(group,panels,metal,'Hang Seng anodised aluminium service cores and panel seams');
  meshStore(group,glass,glazing,'Hang Seng green reflective glazed north and south elevations');
  merged(group,frames,frameMat,'Hang Seng vertical aluminium facade mullions');
  roofParts.push(roofGeometry(ring,HANG_SENG_HEIGHT));
  merged(group,roofParts,roofMat,'Hang Seng flat roof and parapet');
  const e = HANG_SENG_ENTRANCE_EDGE, frame = harbourCityEdgeOutward(ring,e), p = point(site,e,.5,15,.13);
  const sign = makeCanvasSign(Math.min(20,frame.length*.78),1.65,(ctx,canvas)=>{
    ctx.fillStyle='#d5d8cf'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#9c2630';ctx.font='bold 210px sans-serif'; ctx.fillText('●',100,canvas.height/2);
    ctx.fillStyle='#172524';ctx.font='bold 112px sans-serif';ctx.fillText('恒生銀行 HANG SENG BANK',canvas.width*.53,canvas.height/2,canvas.width*.82);
  },{transparent:false});
  sign.name='Hang Seng Bank bilingual podium sign'; sign.position.set(...p);sign.rotation.y=Math.atan2(frame.nx,frame.nz); group.add(sign);
  const landmark = {name:'恒生銀行總行大廈',englishName:'Hang Seng Bank Headquarters',x:site.x,z:site.z,w:site.w,d:site.d,h:HANG_SENG_HEIGHT,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
  return {group,colliders,landmarks:[landmark],stats:{hangSengOsmWay:site.osmId,hangSengHeight:HANG_SENG_HEIGHT,hangSengLevels:HANG_SENG_LEVELS,hangSengGlassPanels:paneCount,hangSengMetalPanels:metalPanels,hangSengGround:base}};
}
