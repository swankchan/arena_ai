import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {beam,box,merged,quad,store,meshStore,nightAmount} from './harbour-city-world-utils.js';
import {KENNEDY_APPROACH_POINTS as route,MACDONNELL_PLATFORM_START,MACDONNELL_PLATFORM_END} from './peak-tram-kennedy-approach-site.js';

// Provisional visual station on the experimental route, not a survey. The
// uphill OSM node is treated as an approximate platform end, not its centre.
export {MACDONNELL_PLATFORM_END};
export function intermediateTrackPoint(s,start,end){
 const d=Math.max(start,Math.min(end,s));
 let i=route.findIndex(p=>p.s>=d);i=Math.max(1,i);const a=route[i-1],b=route[i];
 const t=(d-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);
 return {x:a.x+dx*t,z:a.z+dz*t,y:a.y+(b.y-a.y)*t,nx:-dz/l,nz:dx/l,ux:dx/l,uz:dz/l};
}
export const macDonnellTrackPoint=s=>intermediateTrackPoint(s,MACDONNELL_PLATFORM_START,MACDONNELL_PLATFORM_END);
const at=(p,off,y)=>[p.x+p.nx*off,y,p.z+p.nz*off];
export function buildIntermediateStation(scene,{start,end,name,english,chinese,informationBoard=false}){
 const point=s=>intermediateTrackPoint(s,start,end);
 const group=new THREE.Group();group.name=`Peak Tram ${english} station`;scene.add(group);
 const steps=store(),risers=store(),stripe=store(),rail=[],posts=[],canopy=store(),trim=[],benches=[],lamps=[];
 const n=Math.ceil((end-start)/.58),ds=(end-start)/n;
 let lastTop=null;
 for(let i=0;i<n;i++){
  const a=point(start+i*ds),b=point(start+(i+1)*ds),top=(a.y+b.y)/2+.66;
  quad(steps,at(a,1.6,top),at(b,1.6,top),at(b,4,top),at(a,4,top),[.48,.49,.46]);
  quad(stripe,at(a,1.72,top+.012),at(b,1.72,top+.012),at(b,1.80,top+.012),at(a,1.80,top+.012),[.83,.61,.14]);
  if(lastTop!==null)quad(risers,at(a,1.6,lastTop),at(a,4,lastTop),at(a,4,top),at(a,1.6,top),[.35,.36,.34]);lastTop=top;
 }
 // Black outer guard and short vertical posts. Keep the platform edge open for boarding.
 const count=Math.ceil((end-start)/2);
 for(let i=0;i<=count;i++){
  const p=point(start+(end-start)*i/count),base=p.y+.66;
  beam(posts,at(p,3.85,base),at(p,3.85,base+1.05),.055,.055);
  if(i){const q=point(start+(end-start)*(i-1)/count);for(const h of [.55,1.05])beam(rail,at(q,3.85,q.y+.66+h),at(p,3.85,base+h),.055,.055);}
 }
 // Green steel canopy bracket and small roof, located wholly on the west platform.
 const mid=point((start+end)/2),base=mid.y+.66;
 for(const longitudinal of [-1.3,1.3]){
  const p=point((start+end)/2+longitudinal),y=p.y+.66;
  beam(posts,at(p,3.72,y),at(p,3.72,y+2.8),.095,.095);
  beam(trim,at(p,3.72,y+2.0),at(p,2.05,y+2.85),.075,.075);
  beam(trim,at(p,3.72,y+2.80),at(p,2.05,y+2.85),.075,.075);
 }
 const p=point((start+end)/2-1.55),q=point((start+end)/2+1.55);
 quad(canopy,at(p,2.02,p.y+3.54),at(q,2.02,q.y+3.54),at(q,3.83,q.y+3.43),at(p,3.83,p.y+3.43),[.25,.36,.32]);
 for(const v of [-1.3,1.3]){const q=point((start+end)/2+v);beam(lamps,at(q,2.35,q.y+3.43),at(q,3.45,q.y+3.43),.045,.055);}
 // Short timber bench kept behind the clearance envelope.
 for(const off of [3.14,3.34,3.54])beam(benches,at(p,off,p.y+1.13),at(q,off,q.y+1.13),.075,.09);
 const grey=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,side:THREE.DoubleSide});
 const black=new THREE.MeshStandardMaterial({color:0x242e2b,metalness:.5,roughness:.52}),green=new THREE.MeshStandardMaterial({color:0x45645a,metalness:.55,roughness:.48}),wood=new THREE.MeshStandardMaterial({color:0x7e5034,roughness:.8});
 const light=new THREE.MeshStandardNodeMaterial({color:0xffe1a8});light.emissiveNode=color(0xffc875).mul(nightAmount()).mul(1.3);
 meshStore(group,steps,grey,`${name} stepped platform`);meshStore(group,risers,grey,`${name} step risers`);meshStore(group,stripe,grey,`${name} yellow platform edge`);meshStore(group,canopy,grey,`${name} shelter roof`);
 merged(group,rail,black,`${name} guard rails`);merged(group,posts,black,`${name} shelter and guard posts`);merged(group,trim,green,`${name} canopy brackets`);merged(group,benches,wood,`${name} timber bench`);merged(group,lamps,light,`${name} shelter night lamps`,false);
 // Browser-created bilingual board; a dark backing is also present in non-DOM tests.
 const board=new THREE.Mesh(new THREE.PlaneGeometry(informationBoard?1.15:1.9,informationBoard?1.38:.62),new THREE.MeshStandardMaterial({color:informationBoard?0x403a30:0x263e35,side:THREE.DoubleSide}));
 board.name=`${name} station name board`;board.position.set(...at(mid,3.68,base+(informationBoard?1.65:2.18)));board.rotation.y=Math.atan2(-mid.uz,mid.ux);group.add(board);
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=768;c.height=informationBoard?920:256;const ctx=c.getContext('2d');
  if(ctx){ctx.fillStyle=informationBoard?'#443b32':'#214535';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#f1e8d4';ctx.textAlign='center';ctx.font='bold 74px sans-serif';ctx.fillText(chinese,384,106);ctx.font='bold 55px sans-serif';ctx.fillText(english,384,191);
   if(informationBoard){ctx.fillStyle='#94b574';ctx.fillRect(45,240,678,320);ctx.fillStyle='#eef1de';ctx.font='38px sans-serif';ctx.fillText('180 metres',384,305);ctx.font='32px sans-serif';ctx.fillText('Peak Tram',384,370);ctx.fillStyle='#e7e2d5';for(let x=55;x<650;x+=215)ctx.fillRect(x,590,190,80);ctx.fillStyle='#3eb98c';for(let y=730;y<=810;y+=80){ctx.beginPath();ctx.arc(300,y,24,0,Math.PI*2);ctx.fill();}}
   const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;board.material.map=tex;board.material.color.set(0xffffff);board.material.needsUpdate=true;}
 }
 return {group,steps:n};
}

export function buildMacDonnellStation(scene){
 const result=buildIntermediateStation(scene,{start:MACDONNELL_PLATFORM_START,end:MACDONNELL_PLATFORM_END,name:'MacDonnell',english:'MacDonnell Road',chinese:'麥當勞道'});
 return {...result,stats:{peakTramMacDonnellPlatformSteps:result.steps}};
}
