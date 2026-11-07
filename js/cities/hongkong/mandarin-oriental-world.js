// The Connaught Road hotel (not The Landmark Mandarin Oriental on Queen's Road).
import * as THREE from 'three/webgpu';
import {attribute} from 'three/tsl';
import {MANDARIN_ORIENTAL_SITE as site, MANDARIN_ORIENTAL_SOURCE, MANDARIN_ORIENTAL_ESTIMATED_HEIGHT as height, MANDARIN_ORIENTAL_ENTRANCE_EDGE as entry} from './mandarin-oriental-architecture.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityEdgeOutward,harbourCitySegmentCollider} from './harbour-city-architecture.js';
import {store,quad,point,edgeBox,box,meshStore,merged,roofGeometry} from './harbour-city-world-utils.js';
import {makeCanvasSign} from './tst-hotel-world-utils.js';

export function buildMandarinOriental(scene) {
  const base=hongKongTerrainHeight(site.x,site.z),group=new THREE.Group();group.name='Mandarin Oriental Hong Kong — 香港文華東方酒店';group.position.set(site.x,base,site.z);group.rotation.y=site.ry;scene.add(group);
  const stone=store(),glass=store(),dark=store(),frames=[],roof=[],colliders=[];
  const material=(r,m)=>{const x=new THREE.MeshStandardNodeMaterial({vertexColors:true,roughness:r,metalness:m,side:THREE.DoubleSide});x.colorNode=attribute('color');return x;};
  const stoneMat=material(.8,.03),glassMat=material(.24,.34),darkMat=material(.35,.28);
  const frameMat=new THREE.MeshStandardMaterial({color:0x858984,roughness:.46,metalness:.36});
  const roofMat=new THREE.MeshStandardMaterial({color:0x535b59,roughness:.85});let windows=0,groundBays=0;
  for(let e=0;e<site.localRing.length/2-1;e++) {
    const {length}=harbourCityEdgeOutward(site.localRing,e),bays=Math.max(1,Math.ceil(length/3.05));
    const p=(t,y,o=0)=>point(site,e,t,y,o);
    const wall=(s,a,b,y0,y1,c,o=0)=>quad(s,p(a,y0,o),p(b,y0,o),p(b,y1,o),p(a,y1,o),c);
    for(let b=0;b<bays;b++) {
      const t0=b/bays,t1=(b+1)/bays, opening=e===entry && t0<.5+2.3/length && t1>.5-2.3/length;
      // Polished black granite with a recessed gold-trimmed lobby opening.
      if(!opening)wall(dark,t0+.003,t1-.003,.22,5.6,[.045,.052,.052],.025);
      else wall(dark,t0+.003,t1-.003,4.45,5.6,[.045,.052,.052],.025);
      colliders.push(harbourCitySegmentCollider(site,e,t0,t1,base+(opening?4.45:0),base+14,.4));groundBays++;
      const v=.57+.025*Math.sin(b*4+e);
      wall(stone,t0,t1,5.6,7.3,[v,v*.97,v*.91],.03);
      wall(stone,t0,t0+(t1-t0)*.2,7.3,13.7,[v,v*.97,v*.91],.03);
      wall(stone,t1-(t1-t0)*.2,t1,7.3,13.7,[v,v*.97,v*.91],.03);
      wall(glass,t0+(t1-t0)*.2,t1-(t1-t0)*.2,7.3,13.7,[.12,.17,.17],-.12);
      for(let f=0;f<19;f++) {
        const y0=14+f*3.35,y1=y0+3.35,c=.91+.12*Math.sin(b*4.2+f*2.1+e);
        wall(stone,t0+.002,t1-.002,y0,y0+.42,[.63,.62,.58],.04);
        wall(glass,t0+.008,t1-.008,y0+.42,y1-.1,[.22*c,.32*c,.34*c],-.08);windows++;
        edgeBox(frames,site,e,t0,y0+1.8,.06,.065,2.9,.12);
      }
      // Top two storeys use smaller windows set in a deep stone cornice.
      for(let f=0;f<2;f++) {
        const y0=77.65+f*3.35, y1=y0+3.35;
        wall(stone,t0,t0+(t1-t0)*.17,y0,y1,[.61,.60,.56],.04);
        wall(stone,t1-(t1-t0)*.17,t1,y0,y1,[.61,.60,.56],.04);
        wall(stone,t0+(t1-t0)*.17,t1-(t1-t0)*.17,y0,y0+.6,[.61,.60,.56],.04);
        wall(stone,t0+(t1-t0)*.17,t1-(t1-t0)*.17,y1-.55,y1,[.61,.60,.56],.04);
        wall(glass,t0+(t1-t0)*.17,t1-(t1-t0)*.17,y0+.6,y1-.55,[.12,.17,.18],-.08);
      }
      wall(stone,t0,t1,84.35,88,[.54,.54,.50],.035);
      wall(dark,t0,t1,88,92,[.18,.20,.19],.02);
      colliders.push(harbourCitySegmentCollider(site,e,t0,t1,base+14,base+height,.4));
    }
    if ([3,8,11].includes(e)) {
      const pwidth=2/length;
      for(const [a,b] of [[0,pwidth],[1-pwidth,1]]) for(let f=0;f<21;f++) {
        const y0=14+f*3.35, y1=Math.min(84.35,y0+3.31);
        if(y0<y1) wall(stone,a,b,y0,y1,[.59,.58,.54],.13);
      }
    }
    edgeBox(frames,site,e,.5,14,.1,length,.22,.22);
    edgeBox(frames,site,e,.5,77.6,.1,length,.3,.25);
    edgeBox(frames,site,e,.5,84.3,.1,length,.4,.3);
  }
  // The entrance canopy is restrained to the parcel frontage and is clear
  // underneath; the open doorway accommodates a 3.2 m actor collider.
  edgeBox(roof,site,entry,.5,4.55,.35,7,.22,.9);
  for(const t of [.44,.56]) edgeBox(frames,site,entry,t,2.3,.09,.1,4.45,.13);
  const sign=makeCanvasSign(26,2.15,(ctx,c)=>{
    ctx.fillStyle='#252b2a';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#e4e0d4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 100px serif';ctx.fillText('MANDARIN ORIENTAL',c.width*.57,c.height*.55,c.width*.75);
    // Fan motif, rather than the unrelated Landmark hotel's folded facade.
    ctx.fillStyle='#d6c7a0';const cx=150,cy=275,r=130;
    for(let i=0;i<9;i++){const a=Math.PI+(i+.08)*Math.PI/9,b=Math.PI+(i+.92)*Math.PI/9;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));ctx.lineTo(cx+r*Math.cos(b),cy+r*Math.sin(b));ctx.closePath();ctx.fill();}
  },{transparent:false});
  const pos=point(site,entry,.5,86.1,.15),normal=harbourCityEdgeOutward(site.localRing,entry);sign.name='Mandarin Oriental rooftop name and fan';sign.position.set(...pos);sign.rotation.y=Math.atan2(normal.nx,normal.nz);group.add(sign);
  const entrySign=makeCanvasSign(5,1.25,(ctx,c)=>{ctx.fillStyle='#101616';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#d3bd83';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 105px serif';ctx.fillText('MANDARIN ORIENTAL',c.width/2,c.height/2,c.width*.9);},{transparent:false});
  const ep=point(site,entry,.34,2.8,.06);entrySign.name='Mandarin Oriental entrance gold lettering';entrySign.position.set(...ep);entrySign.rotation.y=Math.atan2(normal.nx,normal.nz);group.add(entrySign);
  roof.push(roofGeometry(site.localRing,height));
  meshStore(group,stone,stoneMat,'Mandarin Oriental stone piers and horizontal floor bands');
  meshStore(group,glass,glassMat,'Mandarin Oriental post-renovation guestroom glazing');
  meshStore(group,dark,darkMat,'Mandarin Oriental black granite podium and roof plant');
  merged(group,frames,frameMat,'Mandarin Oriental glazing frames and cornices');
  merged(group,roof,roofMat,'Mandarin Oriental roof and entrance canopy');
  const landmark={name:'香港文華東方酒店',englishName:'Mandarin Oriental, Hong Kong',x:site.x,z:site.z,w:site.w,d:site.d,h:height,ring:site.ring,bounds:site.bounds,osmId:null,sourceParcelId:MANDARIN_ORIENTAL_SOURCE.id,kind:'landmark',labelHeight:false};
  return {group,colliders,landmarks:[landmark],stats:{mandarinOrientalParcel:MANDARIN_ORIENTAL_SOURCE.id,mandarinOrientalEstimatedHeight:height,mandarinOrientalWindows:windows,mandarinOrientalGroundBays:groundBays,mandarinOrientalGround:base}};
}
