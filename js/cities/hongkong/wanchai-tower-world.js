import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import { WANCHAI_TOWER_SITE as site, WANCHAI_TOWER_HEIGHT as height } from './wanchai-tower-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityLocalToWorld, harbourCityWorldToLocal, harbourCityLocalCollider } from './harbour-city-architecture.js';
import { store, quad, point, edgeBox, meshStore, merged, roofGeometry, nightAmount, hash, box, beam } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

// Dimensions and finishes inferred from photographs; site outline and height have independent sources.
export function buildWanchaiTower(scene) {
 const base=hongKongTerrainHeight(site.x,site.z),group=new THREE.Group(),stone=store(),glass=store(),metal=[],fine=[],steps=[],nosings=[],rail=[],tactile=[],luminaires=[],pavilions=store(),colliders=[];
 group.name='Wanchai Tower — 灣仔政府大樓';group.position.set(site.x,base,site.z);group.rotation.y=site.ry;scene.add(group);
 const stoneMat=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.83,metalness:.03});stoneMat.colorNode=attribute('color');
 const glassMat=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.28,metalness:.42});glassMat.colorNode=attribute('color');glassMat.emissiveNode=color(0xffdfb5).mul(attribute('aLit','float')).mul(nightAmount()).mul(.27);
 const frameMat=new THREE.MeshStandardMaterial({color:0x273338,roughness:.42,metalness:.54});
 const concreteMat=new THREE.MeshStandardMaterial({color:0x999995,roughness:.9});
 const nosingMat=new THREE.MeshStandardMaterial({color:0x7a7060,roughness:.7,metalness:.18});
 const railMat=new THREE.MeshStandardMaterial({color:0x88949a,roughness:.32,metalness:.7});
 let windows=0,lit=0;
 for(let e=0;e<site.localRing.length/2-1;e++){
  const info=harbourCityEdgeOutward(site.localRing,e),length=info.length,bays=Math.max(1,Math.ceil(length/1.25)),front=[4,5,11,12].includes(e);
  const p=(t,y,o=0)=>point(site,e,t,y,o);
  const face=(st,a,b,lo,hi,c,o=0,l=0)=>quad(st,p(a,lo,o),p(b,lo,o),p(b,hi,o),p(a,hi,o),c,l);
  for(let j=0;j<bays;j++){
   const a=j/bays,b=(j+1)/bays,x=p((a+b)/2,0)[0],v=.93+.08*hash(e,j,0),middle=front&&Math.abs(x)<20.4;
   const w=harbourCityLocalToWorld(site,...[p((a+b)/2,0)[0],p((a+b)/2,0)[2]]),bottom=hongKongTerrainHeight(w.x,w.z)-base-.15;
   colliders.push(harbourCitySegmentCollider(site,e,a,b,base+bottom,base+height,.18));
   // Recessed entrance curtain wall is flanked by the solid end piers.
   if(front&&Math.abs(x)<17){
    const on=hash(e,j,101)>.65?.5:0;
    face(glass,a+.003,b-.003,1.05,13.8,[.105*v,.16*v,.18*v],.022,on);
    edgeBox(fine,site,e,a,7.4,.04,.06,12.7,.08);
   } else face(stone,a,b,bottom,14,[.55*v,.55*v,.52*v],.01);
   for(let f=0;f<12;f++){
    const lo=14+f*4.55, hi=lo+4.55, tint=[.60*v,.60*v,.565*v];
    if(middle){
     face(stone,a,b,lo,lo+2.8,tint,.01);face(stone,a,b,lo+4.05,hi,tint,.01);
     const on=hash(e,j,f)>.79?.7:0;face(glass,a+.004,b-.004,lo+2.8,lo+4.05,[.105*v,.16*v,.18*v],.015,on);windows++;if(on)lit++;
     edgeBox(fine,site,e,a,lo+3.425,.04,.045,1.25,.08);
    }else face(stone,a,b,lo,hi,tint,.01);
   }
   face(stone,a,b,68.6,69.5,[.50*v,.50*v,.47*v],.01);
   const upper=(front&&Math.abs(x)<23.4)||[3,6,10,13].includes(e);
   if(upper){
    for(let f=0;f<18;f++){const lo=69.5+f*(65.5/18),hi=69.5+(f+1)*(65.5/18),on=hash(e,j,f+50)>.79?.7:0;face(glass,a+.003,b-.003,lo+.03,hi-.035,[.20*v,.27*v,.29*v],.025,on);windows++;if(on)lit++;}
    edgeBox(fine,site,e,a,102.25,.05,.055,65.5,.08);
    face(stone,a,b,135,height,[.34*v,.36*v,.35*v],.01);
   }else face(stone,a,b,69.5,height,[.56*v,.56*v,.53*v],.01);
  }
  if(front){
   for(let f=0;f<12;f++)for(const y of [14+f*4.55+2.8,14+f*4.55+4.05])edgeBox(fine,site,e,.5,y,.05,length,.075,.09);
   for(let f=0;f<=18;f++)edgeBox(fine,site,e,.5,69.5+f*(65.5/18),.05,length,.06,.09);
   edgeBox(metal,site,e,.5,69.55,.09,length,.65,.22);
  }
 }
 meshStore(group,stone,stoneMat,'Wanchai Tower weathered pale precast and piers');
 meshStore(group,glass,glassMat,'Wanchai Tower ribbon windows and upper curtain wall');
 merged(group,metal,frameMat,'Wanchai Tower transfer bands');metal.length=0;merged(group,fine,frameMat,'Wanchai Tower mullions and window reveals',false);
 merged(group,[roofGeometry(site.localRing,height)],frameMat,'Wanchai Tower roof');
 // Estimation of the two photographed glass entrance pavilions. They project out of the
 // mapped face, but not across the sampled roads. Doors remain closed: no interior is modelled.
 for(const side of [-1,1]){
  const front=side*17.55,back=side*16.6;
  const P=(x,y,z)=>[x,y,z];
  quad(pavilions,P(-17,1.05,front),P(17,1.05,front),P(17,10.2,front),P(-17,10.2,front),[.095,.145,.16],.18);
  quad(pavilions,P(-17,10.2,front),P(17,10.2,front),P(17,12.6,back),P(-17,12.6,back),[.11,.16,.17],.1);
  for(let i=0;i<=28;i++){
   const x=-17+34*i/28;beam(metal,P(x,1.05,front),P(x,10.2,front),.07,.07);beam(metal,P(x,10.2,front),P(x,12.6,back),.07,.07);
  }
  for(const y of [1.05,4.15,7.25,10.2])beam(metal,P(-17,y,front),P(17,y,front),.08,.08);
  // Black stone portal, with dark glazed doors (not an invented open interior).
  for(const x of [-4.7,4.7])box(metal,[x,2.75,front+side*.05],[.55,3.4,.22]);
  box(metal,[0,4.55,front+side*.05],[9.95,.55,.22]);
  for(const x of [-3,0,3])box(luminaires,[x,4.22,front+side*.22],[1,.055,.18]);
  box(tactile,[0,1.065,side*17.38],[33,.025,.25]);
  for(let i=0;i<7;i++){
   const a=17.55+i*.45,b=a+.45,y=1.05-i*.15;
   box(steps,[0,y/2,side*(a+b)/2],[34,y,.45]);
   box(nosings,[0,y+.012,side*b],[34,.025,.05]);
  }
  box(steps,[0,.525,side*17.075],[34,1.05,.95]);
  // central stainless handrail follows the stairs.
  beam(rail,P(0,1.9,side*17.7),P(0,.92,side*20.6),.06,.06);
  for(let i=0;i<4;i++){const z=17.8+i*.88,y=1.05-i*.29;beam(rail,P(0,y,side*z),P(0,y+.85,side*z),.055,.055);}
  colliders.push(harbourCityLocalCollider(site,0,side*19.15,.12,3.1,base+.1,base+2.1));
  colliders.push(harbourCityLocalCollider(site,0,front,34,.18,base+1.05,base+10.2));
 }
 meshStore(group,pavilions,glassMat,'Wanchai Tower glazed entrance pavilions');
 merged(group,metal,frameMat,'Wanchai Tower entrance pavilion frames and portals');
 const lampMat=new THREE.MeshStandardNodeMaterial({color:0xffe4b3,roughness:.55});lampMat.emissiveNode=color(0xffd398).mul(nightAmount()).mul(1.1);
 merged(group,luminaires,lampMat,'Wanchai Tower entrance night lights',false);
 merged(group,tactile,new THREE.MeshStandardMaterial({color:0xc8ac52,roughness:.85}),'Wanchai Tower tactile warning strips',false);
 merged(group,steps,concreteMat,'Wanchai Tower north and south granite steps');merged(group,nosings,nosingMat,'Wanchai Tower stair nosings',false);merged(group,rail,railMat,'Wanchai Tower stainless stair handrails');
 const sign=makeCanvasSign(11,2,(ctx,c)=>{ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#253036';ctx.font='bold 94px sans-serif';ctx.fillText('WANCHAI TOWER',c.width/2,c.height*.32,c.width*.95);ctx.fillText('灣仔政府大樓',c.width/2,c.height*.73,c.width*.95);});
 sign.position.set(-22,17,-16.7);sign.rotation.y=Math.PI;sign.name='Wanchai Tower bilingual facade lettering';group.add(sign);
 const landmark={name:'灣仔政府大樓',englishName:'Wanchai Tower',x:site.x,z:site.z,w:site.w,d:site.d,h:height,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
 function groundHeightAt(x,z,current,ref){const p=harbourCityWorldToLocal(site,x,z),az=Math.abs(p.z);if(Math.abs(p.x)>17||az<16.6-1e-5||az>20.7+1e-5)return current;const rise=az<=17.55?1.05:Math.max(0,1.05-Math.floor((az-17.55)/.45)*.15);const y=base+rise;return ref>=y-.8&&ref<=y+2.5?y:current;}
 return {group,colliders,landmarks:[landmark],base,groundHeightAt,stats:{wanchaiTowerOsm:site.osmId,wanchaiTowerHeight:height,wanchaiTowerLevels:32,wanchaiTowerWindows:windows,wanchaiTowerLitWindows:lit}};
}
