import * as THREE from 'three/webgpu';
import {attribute} from 'three/tsl';
import {JARDINE_HOUSE as site,JARDINE_FACES} from './jardine-house-architecture.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityEdgeOutward,harbourCitySegmentCollider} from './harbour-city-architecture.js';
import {store,quad,meshStore,point,edgeBox,merged,roofGeometry,scaledRing} from './harbour-city-world-utils.js';
import {ringShellGeometry,meshFromGeometry} from './tst-hotel-world-utils.js';

const ROWS=48, BASE=14, TOP=177.2;
export function buildJardineHouse(scene){
 const y0=hongKongTerrainHeight(site.x,site.z),root=new THREE.Group();root.name='怡和大廈 Jardine House';root.position.set(site.x,y0,site.z);root.rotation.y=site.ry;scene.add(root);
 const cladding=store(),reveals=store(),glass=store(),seams=store(),lower=[],trim=[],colliders=[];
 const mat=(roughness,metalness)=>{let m=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness,metalness});m.colorNode=attribute('color');return m;};
 const metal=new THREE.MeshStandardMaterial({color:0x9fa8a7,metalness:.22,roughness:.72,side:THREE.DoubleSide}), dark=new THREE.MeshStandardMaterial({color:0x30525b,metalness:.35,roughness:.33,side:THREE.DoubleSide});
 const inner={...site,localRing:scaledRing(site.localRing,.82)};
 meshFromGeometry(root,ringShellGeometry(inner.localRing,-.5,BASE,false),dark,'Jardine House recessed glazed lobby');
 const ring=site.localRing;
 for(let e=0;e<ring.length/2-1;e++){
  let f=harbourCityEdgeOutward(ring,e);if(f.length<.2)continue;
  // Existing lobby is glazed and non-traversable: colliders remain at its inset perimeter.
  colliders.push(harbourCitySegmentCollider(inner,e,0,1,y0-.6,y0+BASE,.16));
  colliders.push(harbourCitySegmentCollider(site,e,0,1,y0+BASE,y0+178.54,.16));
  if([1,4,10,13].includes(e))quad(cladding,point(site,e,0,BASE),point(site,e,1,BASE),point(site,e,1,TOP),point(site,e,0,TOP),[.59,.61,.60]);
  quad(cladding,point(site,e,0,TOP),point(site,e,1,TOP),point(site,e,1,178.54),point(site,e,0,178.54),[.59,.61,.60]);
  const gf=harbourCityEdgeOutward(inner.localRing,e);
  for(let j=0;j<=Math.max(1,Math.round(gf.length/2.3));j++)edgeBox(trim,inner,e,j/Math.max(1,Math.round(gf.length/2.3)),7,.12,.10,14,.12);
  for(let yy of [1,6.3,12.5])edgeBox(trim,inner,e,.5,yy,.10,gf.length,.10,.12);
  edgeBox(lower,site,e,.5,BASE-.32,0,f.length,.64,.35);
  edgeBox(trim,site,e,.5,177.65,.03,f.length,.25,.16);
  const count=Math.floor(f.length/10);
  if(f.length>10)for(let k=0;k<=count;k++){
   const t=(k+.5)/(count+1), halfBottom=.45/f.length, halfTop=Math.min(2.2/f.length,.42/(count+1));
   // The outward load-transfer supports widen as they meet the tower facade.
   quad(cladding,point(site,e,t-halfBottom,0,-.1),point(site,e,t+halfBottom,0,-.1),point(site,e,t+halfTop,BASE,0),point(site,e,t-halfTop,BASE,0),[.55,.57,.56]);
  }
 }
 // True circular openings, panel seams and deep window reveals, not a white box with painted dots.
 for(const face of JARDINE_FACES){
  let ax=ring[face.from*2],az=ring[face.from*2+1],bx=ring[face.to*2],bz=ring[face.to*2+1],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
  const f=harbourCityEdgeOutward(ring,face.from),nx=f.nx,nz=f.nz,columns=face.columns,cw=length/columns,rh=(TOP-BASE)/ROWS,radius=Math.min(cw,rh)*.365;
  const vertex=(cx,cy,u,v,depth=0)=>[ax+ux*(cx+u)+nx*depth,cy+v,az+uz*(cx+u)+nz*depth];
  const corner=Math.atan2(rh,cw),angles=[...Array.from({length:16},(_,k)=>k*Math.PI/8),corner,Math.PI-corner,Math.PI+corner,Math.PI*2-corner].sort((a,b)=>a-b);
  const seamColor=[.27,.30,.31];
  for(let j=1;j<columns;j++){const x=j*cw;quad(seams,vertex(x,BASE,-.023,0,.008),vertex(x,BASE,.023,0,.008),vertex(x,TOP,.023,0,.008),vertex(x,TOP,-.023,0,.008),seamColor);}
  for(let j=1;j<ROWS;j++){const y=BASE+j*rh;quad(seams,vertex(0,y,0,-.023,.008),vertex(length,y,0,-.023,.008),vertex(length,y,0,.023,.008),vertex(0,y,0,.023,.008),seamColor);}
  for(let row=0;row<ROWS;row++)for(let col=0;col<columns;col++){
   const cx=(col+.5)*cw,cy=BASE+(row+.5)*rh,shade=.94+((row+col)%5)*.008,front=[.61*shade,.63*shade,.62*shade],reveal=[.32,.36,.37],v=(row*17+col*7+face.from)%11/11,window=[.05+v*.035,.16+v*.08,.19+v*.10];
   for(let k=0;k<angles.length;k++){
    const a=angles[k],b=k+1<angles.length?angles[k+1]:Math.PI*2;
    function coords(t){let x=Math.cos(t),y=Math.sin(t),scale=Math.min(cw*.499/Math.max(1e-9,Math.abs(x)),rh*.499/Math.max(1e-9,Math.abs(y)));return [x*radius,y*radius,x*scale,y*scale];}
    let p=coords(a),q=coords(b);
    quad(cladding,vertex(cx,cy,p[2],p[3]),vertex(cx,cy,q[2],q[3]),vertex(cx,cy,q[0],q[1]),vertex(cx,cy,p[0],p[1]),front);
    quad(reveals,vertex(cx,cy,p[0],p[1]),vertex(cx,cy,q[0],q[1]),vertex(cx,cy,q[0]*.96,q[1]*.96,-.28),vertex(cx,cy,p[0]*.96,p[1]*.96,-.28),reveal);
    // Triangle as a degenerate quad keeps one buffer schema for all facade materials.
    const center=vertex(cx,cy,0,0,-.28);quad(glass,center,vertex(cx,cy,p[0]*.96,p[1]*.96,-.28),vertex(cx,cy,q[0]*.96,q[1]*.96,-.28),center,window);
   }
  }
 }
 meshStore(root,cladding,mat(.7,.18),'Jardine House metal cladding with circular perforations');meshStore(root,seams,mat(.8,.08),'Jardine House panel seams');meshStore(root,reveals,mat(.8,.08),'Jardine House deep porthole reveals');meshStore(root,glass,mat(.25,.32),'Jardine House recessed round glazing');
 merged(root,lower,metal,'Jardine House structural arcade and piers');merged(root,trim,metal,'Jardine House crown trim');merged(root,[roofGeometry(site.localRing,178.54)],metal,'Jardine House roof');
 let landmark={name:'怡和大廈',englishName:'Jardine House',x:site.x,z:site.z,w:site.w,d:site.d,h:178.54,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
 return {group:root,colliders,landmarks:[landmark],stats:{jardineHouseOsm:site.osmId,jardineHouseHeight:178.54,jardineHousePortholes:JARDINE_FACES.reduce((a,f)=>a+f.columns*ROWS,0)}};
}
