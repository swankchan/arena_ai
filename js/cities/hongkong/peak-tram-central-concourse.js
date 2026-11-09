import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {cityUniforms} from '../../tsl-materials.js';
import {hongKongTerrainHeight} from './terrain.js';
import {makeCanvasSign} from './tst-hotel-world-utils.js';
import {CENTRAL_CONCOURSE as C,centralConcoursePoint as point,centralConcourseHalfWidth as width,centralConcourseCoordinates as coords} from './peak-tram-central-concourse-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {store,quad,meshStore,beam,merged,nightAmount} from './harbour-city-world-utils.js';

// Estimated configuration, fitted to the existing unsurveyed game terrain and
// platform. Not the real station plan. The simulated moving walkways are not real mechanical equipment.
export function buildPeakTramCentralConcourse(scene){
 const root=new THREE.Group();root.name='Peak Tram Central inferred concourse';scene.add(root);
 const interiorLights=[];for(let s=8;s<C.length;s+=18){let p=point(s),light=new THREE.PointLight(0xffd8a6,16,17,2);light.position.set(p.x,p.y+2.15,p.z);light.name='Central concourse warm ambient light';root.add(light);interiorLights.push(light);}
 const floors=store(),walls=store(),ceiling=store(),belt=store(),treads=[store(),store()],glass=store(),frames=[],lamps=[],rails=[],queue=[],colliders=[];
 const v=(s,o,h=0)=>{const p=point(s,o);return [p.x,p.y+h,p.z];};
 // Keep the buried lining below terrain rather than slicing a long trench
 // through the forecourt; the actual entrance shaft is cut separately.
 const cap=(s,o,h)=>{const p=point(s,o);return Math.min(h,hongKongTerrainHeight(p.x,p.z)-.22-p.y);};
 const n=Math.ceil(C.length/.8);
 for(let i=0;i<n;i++){
  const a=C.length*i/n,b=C.length*(i+1)/n,wa=width(a),wb=width(b);
  if(a>=1.6){const slices=b>C.length-7?16:1;for(let j=0;j<slices;j++){
   const t0=-1+2*j/slices,t1=-1+2*(j+1)/slices;
   quad(floors,v(a,wa*t0),v(b,wb*t0),v(b,wb*t1),v(a,wa*t1),[.34,.35,.33]);
  }}
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
  if(b>C.runStart){const start=Math.max(a,C.runStart);for(const [lane,[o0,o1]] of [[-1.3,-.1],[.1,1.3]].entries()){
   quad(belt,v(start,o0,.018),v(b,o0,.018),v(b,o1,.018),v(start,o1,.018),[.20,.22,.22]);
   quad(treads[lane],v(start,o0,.024),v(b,o0,.024),v(b,o1,.024),v(start,o1,.024),[1,1,1]);
  }for(const o of [-1.36,-.06,.06,1.36]){beam(rails,v(start,o,1.05),v(b,o,1.05),.06,.06);quad(glass,v(start,o,.10),v(b,o,.10),v(b,o,1.02),v(start,o,1.02),[.48,.57,.56]);}}
 }
 // Low-profile queue rails leave a clear central route to the walkways.
 for(let s=10;s<C.runStart-4;s+=3)for(const o of [-2.8,2.8]){const t=Math.min(s+2.7,C.runStart-3),a=point(s,o),b=point(t,o);beam(queue,v(s,o,.05),v(s,o,.94),.045,.045);beam(queue,v(s,o,.94),v(t,o,.94),.035,.035);const site={x:(a.x+b.x)/2,z:(a.z+b.z)/2,ry:Math.atan2(-(b.z-a.z),b.x-a.x)};colliders.push(harbourCityLocalCollider(site,0,0,t-s,.06,Math.min(a.y,b.y),Math.max(a.y,b.y)+.97));}
 const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide}),steel=new THREE.MeshStandardMaterial({color:0x818a88,roughness:.36,metalness:.6});
 const light=new THREE.MeshStandardNodeMaterial({color:0xffe3bc});light.emissiveNode=color(0xffca86).mul(nightAmount()).mul(1.4);
 meshStore(root,floors,stone,'Central concourse floor');meshStore(root,walls,stone,'Central concourse panelled walls');meshStore(root,ceiling,stone,'Central concourse soffit');meshStore(root,belt,stone,'Central paired travellator belts');const treadTextures=[];for(let lane=0;lane<2;lane++){
  const data=new Uint8Array(16*4);for(let i=0;i<16;i++){const v=i<2?105:65;data.set([v,v+3,v+2,255],i*4);}const texture=new THREE.DataTexture(data,1,16,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;treadTextures.push(texture);
  const material=new THREE.MeshStandardMaterial({map:texture,roughness:.82,metalness:.2,side:THREE.DoubleSide}),mesh=meshStore(root,treads[lane],material,`Central travellator moving tread ${lane}`,false),pos=mesh.geometry.attributes.position,uv=[];for(let i=0;i<pos.count;i++){let q=coords(pos.getX(i),pos.getZ(i));uv.push(q.o,(q.s-C.runStart)*4);}mesh.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 }const glassMat=new THREE.MeshStandardMaterial({vertexColors:true,color:0xc0d0cc,transparent:true,opacity:.27,roughness:.18,metalness:.1,depthWrite:false,side:THREE.DoubleSide});meshStore(root,glass,glassMat,'Central travellator glass balustrades',false);merged(root,frames,steel,'Central concourse structural frames',false);merged(root,rails,steel,'Central travellator handrails',false);merged(root,queue,steel,'Central concourse queue rails',false);merged(root,lamps,light,'Central concourse linear lights',false);
 // Abstract original illustrations indicate a heritage display without
 // republishing the copyrighted videos shown at the real terminus.
 if(typeof document!=='undefined')for(const [s,year] of [[11,'1888'],[24,'1926'],[37,'1959'],[50,'2022']]){
  const sign=makeCanvasSign(4.0,1.2,(ctx,c)=>{ctx.fillStyle='#14252d';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#334f55';ctx.fillRect(0,c.height*.62,c.width,c.height*.38);ctx.fillStyle='#e4d6b3';ctx.font=`bold ${Math.floor(c.height*.21)}px sans-serif`;ctx.fillText('PEAK TRAM  '+year,c.width*.07,c.height*.23);ctx.fillStyle='#356a59';ctx.fillRect(c.width*.22,c.height*.39,c.width*.53,c.height*.33);ctx.fillStyle='#99bdba';for(let k=0;k<6;k++)ctx.fillRect(c.width*(.25+k*.075),c.height*.43,c.width*.055,c.height*.15);ctx.fillStyle='#e8c46f';ctx.fillRect(c.width*.22,c.height*.70,c.width*.53,c.height*.025);ctx.fillStyle='#d4ddda';ctx.font=`${Math.floor(c.height*.09)}px sans-serif`;ctx.fillText('A JOURNEY THROUGH HONG KONG',c.width*.07,c.height*.91);},{transparent:false,emissive:true,canvasWidth:1024,canvasHeight:420});
  const q=point(s,3.96);sign.position.set(q.x,q.y+1.85,q.z);sign.rotation.y=Math.atan2(-C.nx,-C.nz);sign.name=`Central tram heritage display ${year}`;root.add(sign);
 }
 return {group:root,colliders,stats:{peakTramConcourseLength:C.length,peakTramTravellatorLength:40},update(dt,manager){
  const elapsed=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));for(let i=0;i<2;i++)treadTextures[i].offset.y=((treadTextures[i].offset.y+(i===0?1:-1)*elapsed*.55*4)%1+1)%1;
  const glow=Math.max(0,Math.min(1,(cityUniforms.uInteriorGlow.value-.55)/.85));for(const light of interiorLights)light.intensity=12+glow*10;
  const person=manager?.activeMode==='person'?manager.entities.person:null;if(!person)return;const q=coords(person.position.x,person.position.z),abs=Math.abs(q.o);if(q.s<C.runStart+.3||q.s>C.length-.3||abs<.16||abs>1.24)return;
  const y=point(q.s,q.o).y;if(Math.abs(person.position.y-y)>.25)return;const step=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0))*.55*(q.o>0?1:-1),next=Math.max(C.runStart+.3,Math.min(C.length-.3,q.s+step)),delta=next-q.s;
  person.position.x+=C.ux*delta;person.position.z+=C.uz*delta;person.position.y=point(next,q.o).y;if(person.mesh)person.mesh.position.copy(person.position);
 }};
}
