import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { SHUN_TAK_WEST as west, SHUN_TAK_EAST as east, SHUN_TAK_PODIUM as podium, SHUN_TAK_FERRY as ferry } from './shun-tak-architecture.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityLocalToWorld } from './harbour-city-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { store, point, quad, edgeBox, box, beam, cylinder, meshStore, merged, roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

export function buildShunTakCentre(scene){
 const root=new THREE.Group();root.name='信德中心及港澳碼頭 Shun Tak Centre and ferry terminal';scene.add(root);
 const base=hongKongTerrainHeight(west.x,west.z), colliders=[];
 const mk=(s,y,name)=>{let g=new THREE.Group();g.name=name;g.position.set(s.x,y,s.z);g.rotation.y=s.ry;root.add(g);return g;};
 const colour=(r,m)=>{let mat=new THREE.MeshStandardNodeMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:r,metalness:m});mat.colorNode=attribute('color');return mat;};
 const glassMat=colour(.24,.4),stoneMat=colour(.68,.14);
 const red=new THREE.MeshStandardMaterial({color:0xa9282d,roughness:.48,metalness:.4}), frame=new THREE.MeshStandardMaterial({color:0x78878b,roughness:.4,metalness:.6}), dark=new THREE.MeshStandardMaterial({color:0x14272d,roughness:.35,metalness:.3}),green=new THREE.MeshStandardMaterial({color:0x29704b,roughness:.82}),yellow=new THREE.MeshStandardMaterial({color:0xe8b838,roughness:.75}),white=new THREE.MeshStandardMaterial({color:0xd2d6cf,roughness:.72}),port=new THREE.MeshStandardMaterial({color:0x374e52,metalness:.3,roughness:.38});
 let windows=0, roadOpenings=0;
 for(const [site,label] of [[west,'West Tower'],[east,'China Merchants Tower']]){
  const g=mk(site,base,`Shun Tak ${label}`),vision=store(),spandrel=store(),bars=[],steel=[],roofs=[];
  for(let e=0;e<site.localRing.length/2-1;e++){
   const {length}=harbourCityEdgeOutward(site.localRing,e);const n=Math.max(1,Math.round(length/2.4)),p=(t,y,o=0)=>point(site,e,t,y,o);
   for(let f=0;f<32;f++){let y=26+f*4.0;
    for(let j=0;j<n;j++){let a=j/n,b=(j+1)/n,v=.16+.03*Math.sin(e*8+j*3+f);
      quad(vision,p(a+.001,y+.35,-.03),p(b-.001,y+.35,-.03),p(b-.001,y+3.6,-.03),p(a+.001,y+3.6,-.03),[v*.65,v*.9,v]);
      quad(spandrel,p(a,y+3.6),p(b,y+3.6),p(b,y+4),p(a,y+4),[.33,.37,.37]);windows++;
    }
    edgeBox(bars,site,e,.5,y+3.8,.09,length,.07,.1);
   }
   for(let j=0;j<=n;j++)edgeBox(bars,site,e,j/n,90,.11,.09,128,.1);
   for(let y of [27,87,152]){
    edgeBox(steel,site,e,.5,y,.2,length,.65,.6);
    if(y<152){edgeBox(steel,site,e,.5,y+4,.2,length,.65,.6);for(let k=0;k<Math.max(1,Math.floor(length/10));k++){let n=Math.max(1,Math.floor(length/10)),a=k/n,b=(k+1)/n;beam(steel,p(a,y,.25),p(b,y+4,.25),.45,.4);}}
   }
   colliders.push(harbourCitySegmentCollider(site,e,0,1,base+26,base+156,.45));
  }
  roofs.push(roofGeometry(site.localRing,156));meshStore(g,vision,glassMat,`Shun Tak ${label} curtain glazing`);meshStore(g,spandrel,stoneMat,`Shun Tak ${label} horizontal spandrels`);merged(g,bars,frame,`Shun Tak ${label} aluminium curtain grid`);merged(g,steel,red,`Shun Tak ${label} red structural trusses`);merged(g,roofs,frame,`Shun Tak ${label} roof`);
 }
 const pg=mk(podium,base,'Shun Tak retail podium and parking'), panels=store(),storefront=store(),redParts=[],metalParts=[],ports=[],portGlazing=[];
 for(let e=0;e<podium.localRing.length/2-1;e++){
  const {length}=harbourCityEdgeOutward(podium.localRing,e),n=Math.max(1,Math.ceil(length/3)),p=(t,y,o=0)=>point(podium,e,t,y,o);
  for(let i=0;i<n;i++){
   let a=i/n,b=(i+1)/n,m=(a+b)/2,probe=[a,m,b].map(t=>{let q=p(t,0);let v=harbourCityLocalToWorld(podium,q[0],q[2]);return fullRoadSurfaceAt(v.x,v.z,.8,base);}).filter(Boolean);
   let low=probe.length?Math.max(0,...probe.map(r=>r.height+5.2-base)):0;
   // Preserve entrance near mapped node 1334208286 on west side.
   const entry=(e===0&&(1-b)*length<2.5)||(e===1&&a*length<2.5);if(entry)low=Math.max(low,4.5);
   if(low>0)roadOpenings++;
   if(low<6)quad(storefront,p(a+.005,low+.12),p(b-.005,low+.12),p(b-.005,6),p(a+.005,6),[.08,.13,.14]);
   for(let f=0;f<4;f++){let y=6+f*5;if(y+4.85<=low)continue;let y0=Math.max(y,low);quad(panels,p(a+.002,y0),p(b-.002,y0),p(b-.002,y+4.85),p(a+.002,y+4.85),f%2?[.34,.37,.37]:[.42,.44,.43]);}
   if(low<26)colliders.push(harbourCitySegmentCollider(podium,e,a,b,base+low,base+26,.35));
   if(low<22 && i%2===0){const q=p(m,14,.12);let geo=new THREE.TorusGeometry(1.05,.12,8,24);geo.rotateY(Math.atan2(harbourCityEdgeOutward(podium.localRing,e).nx,harbourCityEdgeOutward(podium.localRing,e).nz));geo.translate(...q);ports.push(geo);let disc=new THREE.CircleGeometry(.92,24);disc.rotateY(Math.atan2(harbourCityEdgeOutward(podium.localRing,e).nx,harbourCityEdgeOutward(podium.localRing,e).nz));disc.translate(q[0],q[1],q[2]);portGlazing.push(disc);}
  }
  for(const y of [6,11,16,21,26])edgeBox(metalParts,podium,e,.5,y,.12,length,.18,.18);
  for(const y of [21.5,25.5])edgeBox(redParts,podium,e,.5,y,.22,length,.55,.4);
 }
 meshStore(pg,panels,stoneMat,'Shun Tak podium grey articulated panels');meshStore(pg,storefront,glassMat,'Shun Tak podium retail glazing');merged(pg,redParts,red,'Shun Tak red parking structure');merged(pg,metalParts,frame,'Shun Tak podium panel joints');merged(pg,ports,frame,'Shun Tak podium circular porthole surrounds');merged(pg,portGlazing,port,'Shun Tak podium dark porthole glazing');merged(pg,[roofGeometry(podium.localRing,26)],frame,'Shun Tak podium roof');
 const sign=makeCanvasSign(12,1.3,(ctx,c)=>{ctx.fillStyle='#d0d1c9';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#247d83';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 110px sans-serif';ctx.fillText('信德中心  Shun Tak Centre',c.width/2,c.height/2,c.width*.94);});let q=point(podium,0,.9,7,.25),n=harbourCityEdgeOutward(podium.localRing,0);sign.position.set(...q);sign.rotation.y=Math.atan2(n.nx,n.nz);pg.add(sign);
 // Elevated ferry pavilion on the harbour side. Helipad elevation (about 107 ft)
 // is expressed relative to sea-level datum, not added to the inland terrain.
 const fg=mk(ferry,0,'Hong Kong Macau Ferry Terminal and Shun Tak Heliport'), fglass=store(), fstone=store(), fs=[],fc=[],fport=[],fportGlass=[],helicopterPad=[],mark=[],letters=[],docks=[],dockPiles=[];
 for(let e=0;e<ferry.localRing.length/2-1;e++){
   const {length}=harbourCityEdgeOutward(ferry.localRing,e),p=(t,y,o=0)=>point(ferry,e,t,y,o),bays=Math.max(2,Math.round(length/4));
   for(let i=0;i<bays;i++){const a=i/bays,b=(i+1)/bays;quad(fstone,p(a,5),p(b,5),p(b,13),p(a,13),[.37,.40,.40]);quad(fglass,p(a+.01,13.2),p(b-.01,13.2),p(b-.01,20.5),p(a+.01,20.5),[.08,.14,.16]);edgeBox(fs,ferry,e,a,17,.1,.13,7.5,.13);
    const v=p((a+b)/2,9,.15);let geo=new THREE.TorusGeometry(1.15,.14,8,24);geo.rotateY(Math.atan2(harbourCityEdgeOutward(ferry.localRing,e).nx,harbourCityEdgeOutward(ferry.localRing,e).nz));geo.translate(...v);fport.push(geo);let disc=new THREE.CircleGeometry(1.02,24);disc.rotateY(Math.atan2(harbourCityEdgeOutward(ferry.localRing,e).nx,harbourCityEdgeOutward(ferry.localRing,e).nz));disc.translate(...v);fportGlass.push(disc);
   }
   for(let i=0;i<=Math.ceil(length/8);i++){const v=p(i/Math.ceil(length/8),22);cylinder(fc,v,.32,20,10);}
   edgeBox(fs,ferry,e,.5,32,.08,length,.32,.35);colliders.push(harbourCitySegmentCollider(ferry,e,0,1,5,31,.45));
 }
 meshStore(fg,fstone,stoneMat,'Ferry terminal metal porthole walls');meshStore(fg,fglass,glassMat,'Ferry terminal glazing');merged(fg,fs,frame,'Ferry terminal steel framing');merged(fg,fc,white,'Ferry terminal elevated supporting columns');merged(fg,fport,frame,'Ferry terminal circular porthole surrounds');merged(fg,fportGlass,port,'Ferry terminal porthole glazing');
 const w=ferry.w,d=ferry.d;box(helicopterPad,[0,32.4,0],[w,.3,d]);
 for(const x of [-w*.28,w*.28]){
  let ring=new THREE.RingGeometry(5.0,5.6,32);ring.rotateX(-Math.PI/2);ring.translate(x,32.57,0);mark.push(ring);
  box(letters,[x-1,32.59,0],[.4,.04,3]);box(letters,[x+1,32.59,0],[.4,.04,3]);box(letters,[x,32.59,0],[2,.04,.4]);
 }
 merged(fg,helicopterPad,green,'Shun Tak Heliport twin green landing pads');merged(fg,mark,yellow,'Shun Tak Heliport yellow landing circles');merged(fg,letters,white,'Shun Tak Heliport white H markings');
 // Photo-directed boarding pontoons and fender piles along the pier; exact berth
 // boundaries are not represented by the OSM office-tower outlines.
 for(const side of [-1,1])for(const x of [-25,-8,9,26]){
  box(docks,[x,2.2,side*(d/2+5)],[8,.45,10]);
  for(const z of [side*(d/2+1),side*(d/2+9)])cylinder(dockPiles,[x+4,1.8,z],.25,4.2,10);
 }
 merged(fg,docks,frame,'Ferry terminal boarding pontoons');merged(fg,dockPiles,dark,'Ferry terminal berth fender piles');
 // Enclosed bridge across the road. Elevated above sampled roadway, no ground piers.
 const pa={x:podium.x,z:podium.z},pb={x:ferry.x,z:ferry.z},dx=pb.x-pa.x,dz=pb.z-pa.z,L=Math.hypot(dx,dz),bridge=new THREE.Group();bridge.position.set((pa.x+pb.x)/2,0,(pa.z+pb.z)/2);bridge.rotation.y=-Math.atan2(dz,dx);root.add(bridge);
 let high=base+8;for(let i=0;i<=20;i++){let t=i/20,r=fullRoadSurfaceAt(pa.x+dx*t,pa.z+dz*t,1,base);if(r)high=Math.max(high,r.height+5.5);}
 const walk=[],links=[];box(walk,[0,high,0],[L,.35,6]);for(const z of [-3,3]){box(links,[0,high+2,z],[L,4,.12]);}merged(bridge,walk,frame,'Ferry terminal raised connecting bridge floor');merged(bridge,links,new THREE.MeshStandardMaterial({color:0x759695,transparent:true,opacity:.42,roughness:.25,metalness:.2,side:THREE.DoubleSide,depthWrite:false}),'Ferry terminal glazed connecting bridge');
 return {group:root,colliders,landmarks:[{name:'信德中心及港澳碼頭',englishName:'Shun Tak Centre and Hong Kong-Macau Ferry Terminal',x:podium.x,z:podium.z,w:podium.w,d:podium.d,h:156,ring:podium.ring,bounds:podium.bounds,kind:'landmark',labelHeight:false}],stats:{shunTakWestOsm:west.osmId,shunTakEastOsm:east.osmId,shunTakHeight:156,shunTakWindowPanels:windows,shunTakRoadOpenings:roadOpenings,shunTakBridgeBottom:high-.175,shunTakGround:base}};
}
