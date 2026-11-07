import * as THREE from 'three/webgpu';
import { CHATER_GARDEN as site } from './chater-garden-architecture.js';
import { harbourCityLocalToWorld, harbourCityLocalCollider } from './harbour-city-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { hongKongTerrainHeight, rawHongKongTerrainHeight } from './terrain.js';
import { box, beam, cylinder, sphere, merged } from './harbour-city-world-utils.js';

// Open public garden: mapped perimeter, photo-directed layout, sampled DTM.
// Routes recall the LCSD Tree Walk map; no interior layout is claimed surveyed.
export function buildChaterGarden(scene) {
 const group=new THREE.Group();group.name='遮打花園 Chater Garden';scene.add(group);
 const local=(x,z)=>harbourCityLocalToWorld(site,x,z);
 const safe=(x,z,clearance=.5)=>{const p=local(x,z);return pointInFlatRing(site.ring,p.x,p.z)&&!fullRoadSurfaceAt(p.x,p.z,clearance);};
 const ground=(x,z)=>{const p=local(x,z);return hongKongTerrainHeight(p.x,p.z);};
 const segments=[[-43,-40,38,-40],[38,-40,40,35],[40,35,5,37],[5,37,-38,37],[-38,37,-43,-40],[-34,-18,27,-18],[27,-18,27,6],[27,6,-25,12],[-25,12,-34,-18],[-10,-38,-10,35]];
 const distance=(x,z,a,b,c,d)=>{const dx=c-a,dz=d-b,t=Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a-t*dx,z-b-t*dz);};
 const onPath=(x,z)=>segments.some(([a,b,c,d])=>distance(x,z,a,b,c,d)<2.1)||(z>18&&x>-26&&x<30);
 const positions=[],colors=[],step=2;
 let cells=0;for(let x=-50;x<50;x+=step)for(let z=-54;z<54;z+=step){
   const v=[[x,z],[x+step,z],[x+step,z+step],[x,z+step]];
   if(!v.every(([a,b])=>safe(a,b,.45))||![[1,1],[1,0],[2,1],[1,2],[0,1]].every(([a,b])=>safe(x+a,z+b,.45)))continue;
   const path=onPath(x+1,z+1),tint=path?[.46,.45,.41]:[.19,.32,.16];
   for(const i of [0,3,1,1,3,2]){const [a,b]=v[i],p=local(a,b);positions.push(p.x,ground(a,b)+.13,p.z);colors.push(...tint);}
   cells++;
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const normals=[];for(let i=0;i<positions.length;i+=3){const x=positions[i],z=positions[i+2],e=1.5,nx=rawHongKongTerrainHeight(x-e,z)-rawHongKongTerrainHeight(x+e,z),nz=rawHongKongTerrainHeight(x,z-e)-rawHongKongTerrainHeight(x,z+e),inv=1/Math.hypot(nx,2*e,nz);normals.push(nx*inv,2*e*inv,nz*inv);}geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();
 const base=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,side:THREE.DoubleSide}));base.name='Chater Garden terrain-following lawn and paved tree walk';base.receiveShadow=true;group.add(base);
 const features=new THREE.Group();features.position.set(site.x,0,site.z);features.rotation.y=site.ry;group.add(features);
 const stone=new THREE.MeshStandardMaterial({color:0x686e68,roughness:.84}), coping=new THREE.MeshStandardMaterial({color:0xc3bdad,roughness:.78}), water=new THREE.MeshStandardMaterial({color:0x4e9bab,roughness:.23,metalness:.18}),fall=new THREE.MeshStandardMaterial({color:0xb7d3d0,roughness:.25,transparent:true,opacity:.6,side:THREE.DoubleSide}),metal=new THREE.MeshStandardMaterial({color:0x344b3e,metalness:.45,roughness:.55}),wood=new THREE.MeshStandardMaterial({color:0x795846,roughness:.85});
 const pools=[],walls=[],copings=[],cascades=[],jets=[],benches=[],rails=[],shrubs=[],palmTrunks=[],palmFronds=[];const cx=-3,cz=-10,poolW=25,poolD=14;
 // Approximate pool position from photographs; ensure whole feature stays on the site.
 let poolBuilt=false,poolLevel=0;
 if([[-poolW/2,-poolD/2],[poolW/2,-poolD/2],[poolW/2,poolD/2],[-poolW/2,poolD/2]].every(([x,z])=>safe(cx+x,cz+z,1))){
  let y=Math.max(...[[-poolW/2,-poolD/2],[poolW/2,-poolD/2],[poolW/2,poolD/2],[-poolW/2,poolD/2],[0,0]].map(([x,z])=>ground(cx+x,cz+z)))+.18;
  box(pools,[cx,y+.03,cz],[poolW,.08,poolD]);
  for(const z of [cz-poolD/2,cz+poolD/2]){box(walls,[cx,y+.23,z],[poolW+.6,.48,.32]);box(copings,[cx,y+.5,z],[poolW+.6,.12,.5]);}
  for(const x of [cx-poolW/2,cx+poolW/2]){box(walls,[x,y+.23,cz],[.32,.48,poolD]);box(copings,[x,y+.5,cz],[.5,.12,poolD]);}
  // Two low, dark horizontal spill ledges; transparent curtains suggest falling water.
  for(const [h,w,d] of [[1.05,12,5],[2.0,9,3.3]]){
   box(walls,[cx,y+h,cz],[w,.32,d]);
   for(const side of [-1,1])box(cascades,[cx,y+h-.47,cz+side*d/2],[w-.3,.75,.04]);
  }
  for(let i=-4;i<=4;i++)cylinder(jets,[cx+i*2.2,y+.36,cz+4.9],.045,.58,6);
  poolBuilt=true;poolLevel=y;
 }
 const trees=[];for(let x=-37;x<=37;x+=11)for(let z=-43;z<=6;z+=12){
  const jx=x+2*Math.sin(x*2+z),jz=z+2*Math.cos(z+x);
  if(!safe(jx,jz,3)||onPath(jx,jz)|| (Math.abs(jx-cx)<poolW/2+3&&Math.abs(jz-cz)<poolD/2+3))continue;
  const p=local(jx,jz);trees.push({x:p.x,z:p.z,y:ground(jx,jz)+.13,scale:.8+.25*Math.abs(Math.sin(x+z)),species:Math.abs(Math.round(x+z))%4,tier:1});
 }
 // Lower planting and a small group of feather palms complement the mixed tree canopy.
 for(let x=-42;x<=40;x+=5)for(let z=-47;z<=9;z+=6){
  const jx=x+Math.sin(z+x)*1.1,jz=z+Math.cos(x-z)*1.1;
  if(!safe(jx,jz,1.7)||onPath(jx,jz)||(Math.abs(jx-cx)<poolW/2+2&&Math.abs(jz-cz)<poolD/2+2))continue;
  sphere(shrubs,[jx,ground(jx,jz)+.55,jz],.55+.2*Math.abs(Math.sin(x*z)),8);
 }
 for(const [x,z] of [[-37,-34],[-27,-32],[1,-34],[22,-33],[-38,-5],[-34,8]]){
  if(!safe(x,z,2)||onPath(x,z)||(Math.abs(x-cx)<poolW/2+2&&Math.abs(z-cz)<poolD/2+2))continue;
  const y=ground(x,z)+.12,h=5.5+Math.abs(Math.sin(x+z))*1.5;
  cylinder(palmTrunks,[x,y+h/2,z],.18,h,8,.12);
  for(let j=0;j<9;j++){const a=j*Math.PI*2/9,dx=Math.cos(a),dz=Math.sin(a);beam(palmFronds,[x,y+h,z],[x+dx*2,y+h+.2,z+dz*2],.12,.26);beam(palmFronds,[x+dx*2,y+h+.2,z+dz*2],[x+dx*3,y+h-.55,z+dz*3],.08,.2);}
 }
 for(const [x,z] of [[-31,-24],[14,-24],[34,-5],[34,12],[-30,20],[-7,22],[16,22]]){
  if(!safe(x,z,2))continue;const y=ground(x,z)+.15;
  box(benches,[x,y+.52,z],[2.1,.13,.52]);box(benches,[x,y+.9,z+.22],[2.1,.5,.1]);
  for(const dx of [-.8,.8])box(rails,[x+dx,y+.27,z],[.1,.5,.4]);
 }
 // Low green criss-cross railings around selected planting beds, as in photographs.
 for(const [a,b,c,d] of [[-36,-28,23,-28],[-34,3,20,3]])for(let k=0;k<6;k++){
  const t=k/6,u=(k+1)/6,x=a+(c-a)*t,z=b+(d-b)*t,xx=a+(c-a)*u,zz=b+(d-b)*u;
  if(!safe(x,z,1)||!safe(xx,zz,1))continue;const y=ground(x,z)+.16,yy=ground(xx,zz)+.16;
  beam(rails,[x,y,z],[x,y+.65,z],.055);beam(rails,[x,y+.65,z],[xx,yy+.65,zz],.055);beam(rails,[x,y+.08,z],[xx,yy+.62,zz],.045);beam(rails,[x,y+.62,z],[xx,yy+.08,zz],.045);
 }
 merged(features,shrubs,new THREE.MeshStandardMaterial({color:0x375a2e,roughness:.96}),'Chater Garden clipped garden shrubs');merged(features,palmTrunks,wood,'Chater Garden palm trunks');merged(features,palmFronds,new THREE.MeshStandardMaterial({color:0x35633b,roughness:.9}),'Chater Garden palm fronds');
 merged(features,pools,water,'Chater Garden blue spill pool');merged(features,copings,coping,'Chater Garden stone pool coping');merged(features,walls,stone,'Chater Garden stone cascade and pool walls');merged(features,cascades,fall,'Chater Garden cascading water');merged(features,jets,fall,'Chater Garden fountain jets');merged(features,benches,wood,'Chater Garden seating');merged(features,rails,metal,'Chater Garden green garden railings and pool coping');
 const colliders=[];if(poolBuilt){colliders.push(harbourCityLocalCollider(site,cx,cz,poolW,poolD,poolLevel-.3,poolLevel+2.5));}
 return {group,treeSites:trees,colliders,landmarks:[{name:'遮打花園',englishName:'Chater Garden',x:site.x,z:site.z,w:site.w,d:site.d,h:12,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'majorPark',labelHeight:false}],stats:{chaterGardenOsm:site.osmId,chaterGardenArea:site.ringArea,chaterGardenGroundCells:cells,chaterGardenTreeSites:trees.length,chaterGardenSpillPool:poolBuilt?1:0}};
}
