import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {cityUniforms} from '../../tsl-materials.js';
import {hongKongTerrainHeight} from './terrain.js';
import {CENTRAL_CONCOURSE as C,centralConcoursePoint as point,centralConcourseHalfWidth as width,centralConcourseCoordinates as coords} from './peak-tram-central-concourse-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {store,quad,meshStore,beam,merged,nightAmount} from './harbour-city-world-utils.js';

// Estimated configuration, fitted to the existing unsurveyed game terrain and
// platform. Not the real station plan. The moving walkways are visual only.
export function buildPeakTramCentralConcourse(scene){
 const root=new THREE.Group();root.name='Peak Tram Central inferred concourse';scene.add(root);
 const interiorLights=[];for(let s=8;s<C.length;s+=18){let p=point(s),light=new THREE.PointLight(0xffd8a6,16,17,2);light.position.set(p.x,p.y+2.15,p.z);light.name='Central concourse warm ambient light';root.add(light);interiorLights.push(light);}
 const floors=store(),walls=store(),ceiling=store(),belt=store(),bands=store(),glass=store(),frames=[],lamps=[],rails=[],colliders=[];
 const v=(s,o,h=0)=>{const p=point(s,o);return [p.x,p.y+h,p.z];};
 // Keep the buried lining below terrain rather than slicing a long trench
 // through the forecourt; the actual entrance shaft is cut separately.
 const cap=(s,o,h)=>{const p=point(s,o);return Math.min(h,hongKongTerrainHeight(p.x,p.z)-.22-p.y);};
 const n=Math.ceil(C.length/.8);
 for(let i=0;i<n;i++){
  const a=C.length*i/n,b=C.length*(i+1)/n,wa=width(a),wb=width(b);
  if(a>=1.6)quad(floors,v(a,-wa),v(b,-wb),v(b,wb),v(a,wa),[.34,.35,.33]);
  // Faceted, shallow twisting canopy inspired by the portal structure in
  // Arup's photo; opaque because this inferred section sits below terrain.
  if(a>=2.4)for(let j=0;j<4;j++){let t0=-1+j*.5,t1=t0+.5,h=t=>3.45+.28*(1-Math.abs(t));const shade=j===1||j===2?.57:.50;
   quad(ceiling,v(a,wa*t0,cap(a,wa*t0,h(t0))),v(a,wa*t1,cap(a,wa*t1,h(t1))),v(b,wb*t1,cap(b,wb*t1,h(t1))),v(b,wb*t0,cap(b,wb*t0,h(t0))),[shade,shade+.01,shade]);}
  for(const side of [-1,1]){
   quad(walls,v(a,side*wa,0),v(b,side*wb,0),v(b,side*wb,1.25),v(a,side*wa,1.25),[.50,.42,.34]);
   quad(walls,v(a,side*wa,1.25),v(b,side*wb,1.25),v(b,side*wb,cap(b,side*wb,3.45)),v(a,side*wa,cap(a,side*wa,3.45)),[.59,.60,.58]);
   if(a>=2.4)beam(lamps,v(a,side*(wa-.08),cap(a,side*(wa-.08),2.7)),v(b,side*(wb-.08),cap(b,side*(wb-.08),2.7)),.045,.055);
   // Use short, vertically bounded wall boxes; the ground-level roads above
   // must not be blocked by a corridor collider.
   const A=point(a,side*wa),B=point(b,side*wb),dx=B.x-A.x,dz=B.z-A.z,l=Math.hypot(dx,dz),site={x:(A.x+B.x)/2,z:(A.z+B.z)/2,ry:Math.atan2(-dz,dx)};
   colliders.push(harbourCityLocalCollider(site,0,0,l+.02,.12,Math.min(A.y,B.y)-.1,Math.max(A.y+cap(a,side*wa,3.45),B.y+cap(b,side*wb,3.45))));
  }
  if(i%3===0&&a>=2.4){let t=Math.min(C.length,a+.4),wt=width(t);beam(frames,v(a,-wa,cap(a,-wa,3.40)),v(t,wt,cap(t,wt,3.40)),.055,.055);for(let side of [-1,1])beam(frames,v(a,side*wa,.05),v(a,side*wa,cap(a,side*wa,3.4)),.035,.035);}
  if(b>C.runStart){const start=Math.max(a,C.runStart);for(const [o0,o1] of [[-1.3,-.1],[.1,1.3]]){
   quad(belt,v(start,o0,.018),v(b,o0,.018),v(b,o1,.018),v(start,o1,.018),[.20,.22,.22]);
   if(i%2===0){let t=Math.min(b,start+.035);quad(bands,v(start,o0,.022),v(t,o0,.022),v(t,o1,.022),v(start,o1,.022),[.36,.37,.35]);}
  }for(const o of [-1.36,-.06,.06,1.36]){beam(rails,v(start,o,1.05),v(b,o,1.05),.06,.06);quad(glass,v(start,o,.10),v(b,o,.10),v(b,o,1.02),v(start,o,1.02),[.48,.57,.56]);}}
 }
 const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide}),steel=new THREE.MeshStandardMaterial({color:0x818a88,roughness:.36,metalness:.6});
 const light=new THREE.MeshStandardNodeMaterial({color:0xffe3bc});light.emissiveNode=color(0xffca86).mul(nightAmount()).mul(1.4);
 meshStore(root,floors,stone,'Central concourse floor');meshStore(root,walls,stone,'Central concourse panelled walls');meshStore(root,ceiling,stone,'Central concourse soffit');meshStore(root,belt,stone,'Central paired travellator belts');meshStore(root,bands,stone,'Central travellator tread joints');const glassMat=new THREE.MeshStandardMaterial({vertexColors:true,color:0xc0d0cc,transparent:true,opacity:.27,roughness:.18,metalness:.1,depthWrite:false,side:THREE.DoubleSide});meshStore(root,glass,glassMat,'Central travellator glass balustrades',false);merged(root,frames,steel,'Central concourse structural frames',false);merged(root,rails,steel,'Central travellator handrails',false);merged(root,lamps,light,'Central concourse linear lights',false);
 return {group:root,colliders,stats:{peakTramConcourseLength:C.length,peakTramTravellatorLength:40},update(dt,manager){
  const glow=Math.max(0,Math.min(1,(cityUniforms.uInteriorGlow.value-.55)/.85));for(const light of interiorLights)light.intensity=12+glow*10;
  const person=manager?.activeMode==='person'?manager.entities.person:null;if(!person)return;const q=coords(person.position.x,person.position.z),abs=Math.abs(q.o);if(q.s<C.runStart+.3||q.s>C.length-.3||abs<.16||abs>1.24)return;
  const y=point(q.s).y;if(Math.abs(person.position.y-y)>.25)return;const step=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0))*.55*(q.o>0?1:-1),next=Math.max(C.runStart+.3,Math.min(C.length-.3,q.s+step)),delta=next-q.s;
  person.position.x+=C.ux*delta;person.position.z+=C.uz*delta;person.position.y=point(next).y;if(person.mesh)person.mesh.position.copy(person.position);
 }};
}
