import * as THREE from 'three/webgpu';
import {quad,store,meshStore} from './harbour-city-world-utils.js';
import {hongKongTerrainHeight} from './terrain.js';
import {fullRoadSurfaceAt} from './full-meta.js';
import {KENNEDY_APPROACH_POINTS,isMacDonnellBridgeSegment} from './peak-tram-kennedy-approach-site.js';

// Scene-fit approximation of the documented masonry road-over-rail bridge.
// The original road surface remains untouched; this is not a surveyed structure.
export const MACDONNELL_ARCH_HALF_WIDTH=1.85;
export const MACDONNELL_ARCH_RISE=.8;
export const MACDONNELL_BRIDGE_POINTS=KENNEDY_APPROACH_POINTS.filter((p,i,r)=>isMacDonnellBridgeSegment(p,r[i+1]||p)||i>0&&isMacDonnellBridgeSegment(r[i-1],p));
export function macDonnellArchSection(p,ux,uz,roadIds=[418,8998]){
 const nx=-uz,nz=ux,heights=[-1.85,0,1.85].map(off=>{
  const x=p.x+nx*off,z=p.z+nz*off,r=fullRoadSurfaceAt(x,z,0,hongKongTerrainHeight(x,z));
  if(!r||!roadIds.includes(r.way.id))throw Error('Stone arch no longer under expected road');
  return r.height;
 });
 const crown=Math.min(...heights)-.5;
 return {p,nx,nz,crown,spring:crown-MACDONNELL_ARCH_RISE};
}
export function macDonnellArchHeight(section,offset){
 const q=Math.max(-1,Math.min(1,offset/MACDONNELL_ARCH_HALF_WIDTH));
 return section.spring+MACDONNELL_ARCH_RISE*Math.sqrt(Math.max(0,1-q*q));
}
function loc(section,off,y){return [section.p.x+section.nx*off,y,section.p.z+section.nz*off];}
export function buildPeakTramStoneArch(scene,points,{name,roadIds,interiorRings=false}){
 const root=new THREE.Group();root.name=`${name} masonry arch`;scene.add(root);
 const vault=store(),jamb=store(),ring=store(),sections=[];
 for(let i=0;i<points.length;i++){
  const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);
  sections.push(macDonnellArchSection(points[i],dx/l,dz/l,roadIds));
 }
 const w=MACDONNELL_ARCH_HALF_WIDTH,parts=16;
 for(let i=1;i<sections.length;i++){
  const a=sections[i-1],b=sections[i];
  for(let j=0;j<parts;j++){
   const x=-w+2*w*j/parts,X=-w+2*w*(j+1)/parts,c=(j+i)%3*.025;
   quad(vault,loc(a,x,macDonnellArchHeight(a,x)),loc(b,x,macDonnellArchHeight(b,x)),loc(b,X,macDonnellArchHeight(b,X)),loc(a,X,macDonnellArchHeight(a,X)),[.38+c,.37+c,.34+c]);
  }
  for(const side of [-1,1])quad(jamb,loc(a,side*w,a.p.y-.27),loc(b,side*w,b.p.y-.27),loc(b,side*w,b.spring),loc(a,side*w,a.spring),[.40,.39,.36]);
 }
 // Individual arch stones at each portal, with fine dark joints between wedges.
 for(const section of interiorRings?sections:[sections[0],sections.at(-1)])for(let j=0;j<parts;j++){
  const x=-w+2*w*j/parts+.012,X=-w+2*w*(j+1)/parts-.012;
  const y=macDonnellArchHeight(section,x),Y=macDonnellArchHeight(section,X),c=j%3*.035;
  quad(ring,loc(section,x,y),loc(section,X,Y),loc(section,X,Y+.28),loc(section,x,y+.28),[.50+c,.48+c,.43+c]);
 }
 const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,side:THREE.DoubleSide});
 meshStore(root,vault,stone,`${name} masonry barrel vault`);meshStore(root,jamb,stone,`${name} stone bridge jambs`);meshStore(root,ring,stone,`${name} arch voussoirs`);
 return {group:root,sections};
}
export function buildMacDonnellBridge(scene){
 const result=buildPeakTramStoneArch(scene,MACDONNELL_BRIDGE_POINTS,{name:'MacDonnell',roadIds:[418,8998]});
 return {...result,stats:{peakTramMacDonnellArchSegments:result.sections.length-1}};
}
