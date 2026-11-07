import * as THREE from 'three/webgpu';
import { BLUE_HOUSE as site, BLUE_HOUSE_FRONT_EDGE as front } from './blue-house-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityLocalToWorld } from './harbour-city-architecture.js';
import { box,edgeBox,point,merged,store,quad,meshStore,roofGeometry,beam } from './harbour-city-world-utils.js';
import { ringShellGeometry,meshFromGeometry,makeCanvasSign } from './tst-hotel-world-utils.js';
import { attribute } from 'three/tsl';

// Four historic tong-lau units, photo-directed exterior; original interior layout is not modelled.
export function buildBlueHouse(scene){
 const base=hongKongTerrainHeight(site.x,site.z),root=new THREE.Group();root.name='藍屋 Blue House';root.position.set(site.x,base,site.z);root.rotation.y=site.ry;scene.add(root);
 const blue=new THREE.MeshStandardMaterial({color:0x1871b5,roughness:.9,side:THREE.DoubleSide}), white=new THREE.MeshStandardMaterial({color:0xc4c3b6,roughness:.88}), metal=new THREE.MeshStandardMaterial({color:0x47727b,roughness:.6,metalness:.28}),timber=new THREE.MeshStandardMaterial({color:0x235879,roughness:.8}), shopTimber=new THREE.MeshStandardMaterial({color:0x63492e,roughness:.8});
 const windowMat=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.45});windowMat.colorNode=attribute('color');
 meshFromGeometry(root,ringShellGeometry(site.localRing,-.6,15.2,false),blue,'Blue House painted masonry');
 merged(root,[roofGeometry(site.localRing,15.2)],white,'Blue House flat roof');
 const edges=site.localRing.length/2-1,frames=[],slabs=[],rails=[],wood=[],shopFrames=[],windows=store(),colliders=[];let panes=0,doorCount=0;
 for(let e=0;e<edges;e++){
  let f=harbourCityEdgeOutward(site.localRing,e),len=f.length;if(len<1)continue;
  // The irregular east/back wall is not treated as a street-facing shopfront.
  let bays=e===front?4:Math.max(1,Math.floor(len/3));
  for(let j=0;j<bays;j++){
   let mid=(j+.5)/bays,w=Math.min(e===front?2.0:1.35,len/bays*.7),half=w/(2*len);
   for(let floor=1;floor<=3;floor++){
    const y=4.2+(floor-1)*3.5,lo=y+.45,hi=y+2.85;
    if(e!==front&&len<2.5)continue;
    let tint=e===front?[.09,.16,.17]:[.12,.18,.19];
    quad(windows,point(site,e,mid-half,lo,.035),point(site,e,mid+half,lo,.035),point(site,e,mid+half,hi,.035),point(site,e,mid-half,hi,.035),tint);
    for(let t of [mid-half,mid,mid+half])edgeBox(wood,site,e,t,(lo+hi)/2,.10,.08,hi-lo,.09);
    for(let yy of [lo,lo+.95,lo+1.9,hi])edgeBox(wood,site,e,mid,yy,.10,w,.08,.09);
    edgeBox(frames,site,e,mid,lo-.06,.12,w+.2,.12,.2);edgeBox(frames,site,e,mid,hi+.07,.12,w+.2,.14,.2);panes++;
   }
  }
  // Keep solid walls at pedestrian height; there is no authored interior behind them.
  const wp=point(site,e,.5,0),q=harbourCityLocalToWorld(site,wp[0],wp[2]),bottom=hongKongTerrainHeight(q.x,q.z)-base-.4;
  colliders.push(harbourCitySegmentCollider(site,e,0,1,base+bottom,base+15.2,.18));
 }
 const f=harbourCityEdgeOutward(site.localRing,front),len=f.length;
 // The fourth unit of the cluster is pale rather than blue in the restored street view.
 const endUnit=store();quad(endUnit,point(site,front,0,0,.012),point(site,front,.25,0,.012),point(site,front,.25,15.2,.012),point(site,front,0,15.2,.012),[.52,.54,.50]);
 meshStore(root,endUnit,windowMat,'Blue House pale adjoining unit');
 // Three individual cantilevered decks with thin pale fascia, columns and patterned iron railings.
 for(let floor=1;floor<=3;floor++){
  const y=4.2+(floor-1)*3.5;
  edgeBox(slabs,site,front,.5,y,0.52,len, .22,1.18);
  edgeBox(slabs,site,front,.5,y+3.5,.52,len,.22,1.18);
  for(let k=0;k<=4;k++){
   let t=k/4;edgeBox(slabs,site,front,t,y+1.75,1.02,.18,3.35,.18);
   edgeBox(rails,site,front,t,y+.58,1.10,.09,1.05,.09);
   beam(slabs,point(site,front,t,y-.68,.04),point(site,front,t,y-.08,1.0),.16,.16);
  }
  for(let yy of [y+.15,y+1.05])edgeBox(rails,site,front,.5,yy,1.1,len,.08,.08);
  for(let k=0;k<=40;k++)edgeBox(rails,site,front,k/40,y+.6,1.1,.028,.82,.035);
  for(let k=0;k<4;k++){
   const t=(k+.5)/4,step=.037;
   const pts=[[t-step,y+.6],[t,y+.94],[t+step,y+.6],[t,y+.26],[t-step,y+.6]];
   for(let i=1;i<pts.length;i++)beam(rails,point(site,front,pts[i-1][0],pts[i-1][1],1.13),point(site,front,pts[i][0],pts[i][1],1.13),.035);
  }
 }
 // Dark wooden shopfronts with individual transom panes, recessed doors and signage.
 for(let j=0;j<4;j++){
  let t=(j+.5)/4,w=len/4-.35,lo=.18,hi=3.55;
  const a=t-w/(2*len),b=t+w/(2*len);
  quad(windows,point(site,front,a,lo,.04),point(site,front,b,lo,.04),point(site,front,b,hi,.04),point(site,front,a,hi,.04),[.085,.10,.095]);
  for(let k=0;k<=4;k++)edgeBox(shopFrames,site,front,a+(b-a)*k/4,(lo+hi)/2,.12,.09,hi-lo,.12);
  for(let yy of [lo,2.5,hi])edgeBox(shopFrames,site,front,t,yy,.12,w,.11,.12);
  const names=['林鎮顯醫館','香港故事館','藍屋','VIVA BLUE HOUSE'];
  let sign=makeCanvasSign(w-.1,.6,(ctx,c)=>{ctx.fillStyle=j===3?'#e9e2cf':'#ede9dd';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=j===3?'#185f76':'#282a28';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 130px sans-serif';ctx.fillText(names[j],c.width/2,c.height/2,c.width*.93);},{transparent:false});
  sign.position.set(...point(site,front,t,3.8,.2));sign.rotation.y=Math.atan2(f.nx,f.nz);sign.name='Blue House ground-floor signage';root.add(sign);doorCount++;
 }
 merged(root,frames,white,'Blue House window surrounds');merged(root,slabs,white,'Blue House verandah floors and columns');merged(root,rails,metal,'Blue House patterned iron verandah railings');merged(root,wood,timber,'Blue House painted timber window frames');merged(root,shopFrames,shopTimber,'Blue House shopfront timber frames');meshStore(root,windows,windowMat,'Blue House windows and shopfronts');
 const landmark={name:'藍屋',englishName:'Blue House',x:site.x,z:site.z,w:site.w,d:site.d,h:15.2,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
 return {group:root,colliders,landmarks:[landmark],stats:{blueHouseOsm:site.osmId,blueHouseWindowBays:panes,blueHouseStorefronts:doorCount,blueHouseBalconyFloors:3}};
}
