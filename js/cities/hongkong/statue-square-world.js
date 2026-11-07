import * as THREE from 'three/webgpu';
import { STATUE_SQUARE_SOUTH as south, STATUE_SQUARE_NORTH as north, SQUARE_WATER, SQUARE_SHELTERS, JACKSON_POSITION, CENOTAPH_RING } from './statue-square-architecture.js';
import { pointInFlatRing, minimumAreaObb } from './landmark-site.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { hongKongTerrainHeight, rawHongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { box, beam, cylinder, sphere, merged } from './harbour-city-world-utils.js';

// All coordinates are world metres. The outlines, pools, roofs, statue and memorial
// have OSM locations; dimensions of artwork, figures and furnishing are estimates.
export function buildStatueSquare(scene) {
 const group=new THREE.Group(); group.name='皇后像廣場 Statue Square'; scene.add(group);
 const ground=(x,z)=>hongKongTerrainHeight(x,z), road=(x,z,m=0)=>fullRoadSurfaceAt(x,z,m);
 const inside=(s,x,z)=>pointInFlatRing(s.ring,x,z);
 const inAny=(rings,x,z)=>rings.some(a=>pointInFlatRing(a.world,x,z));
 const mats={paving:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide}), water:new THREE.MeshStandardMaterial({color:0x579da6,roughness:.24,metalness:.14,side:THREE.DoubleSide}), stone:new THREE.MeshStandardMaterial({color:0x989991,roughness:.88}), coping:new THREE.MeshStandardMaterial({color:0xbbb9aa,roughness:.82}), dark:new THREE.MeshStandardMaterial({color:0x4b514c,roughness:.9}), white:new THREE.MeshStandardMaterial({color:0xc6c4ba,roughness:.77,side:THREE.DoubleSide}), metal:new THREE.MeshStandardMaterial({color:0x687570,roughness:.38,metalness:.7}), bronze:new THREE.MeshStandardMaterial({color:0x393b31,metalness:.65,roughness:.55}), hedge:new THREE.MeshStandardMaterial({color:0x385835,roughness:.95}), poolblue:new THREE.MeshStandardMaterial({color:0x729fa7,roughness:.75})};
 const colliders=[], treeSites=[], positions=[],colors=[];let cells=0;
 for(const site of [south,north]) {
  const {minX,maxX,minZ,maxZ}=site.bounds, step=1.6;
  for(let x=minX;x<maxX;x+=step)for(let z=minZ;z<maxZ;z+=step){
   const vertices=[[x,z],[x+step,z],[x+step,z+step],[x,z+step]],samples=[...vertices,[x+step/2,z+step/2],[x+step/2,z],[x+step,z+step/2],[x+step/2,z+step],[x,z+step/2]];
   if(!samples.every(([a,b])=>inside(site,a,b)&&!road(a,b,.4)))continue;
   const variation=((Math.floor((x+200)*2)+Math.floor((z+200)*2))%5)*.009;
   for(const i of [0,3,1,1,3,2]){const [a,b]=vertices[i];positions.push(a,ground(a,b)+.14,b);colors.push(.47+variation,.46+variation,.42+variation);}cells++;
  }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 // Fine square stone joints, repeated in world metres, rather than a flat white slab.
 const uv=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]*2,positions[i+2]*2);
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const pixels=new Uint8Array(16*16*4);for(let z=0;z<16;z++)for(let x=0;x<16;x++){const v=x===0||z===0?165:255,j=(z*16+x)*4;pixels.set([v,v,v,255],j);}const tile=new THREE.DataTexture(pixels,16,16,THREE.RGBAFormat);tile.wrapS=tile.wrapT=THREE.RepeatWrapping;tile.magFilter=THREE.LinearFilter;tile.minFilter=THREE.LinearMipmapLinearFilter;tile.generateMipmaps=true;tile.needsUpdate=true;mats.paving.map=tile;
 let normals=[];
 for(let i=0;i<positions.length;i+=3){let x=positions[i],z=positions[i+2],e=1.5,nx=rawHongKongTerrainHeight(x-e,z)-rawHongKongTerrainHeight(x+e,z),nz=rawHongKongTerrainHeight(x,z-e)-rawHongKongTerrainHeight(x,z+e),inv=1/Math.hypot(nx,2*e,nz);normals.push(nx*inv,2*e*inv,nz*inv);}geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();const base=new THREE.Mesh(geo,mats.paving);base.name='Statue Square road-cleared terrain paving';base.receiveShadow=true;group.add(base);
 const copings=[],posts=[],roofTrim=[],benches=[],planters=[],foliage=[],jets=[],colliderAt=(x,z,w,d,y,h,ry=0)=>harbourCityLocalCollider({x:0,z:0,ry:0},x,z,w,d,y,y+h,ry);
 // Polygon surfaces preserve OSM water outlines; coping and inner decorative wall are photo-inspired.
 for(const feature of SQUARE_WATER){
  const r=feature.world,pts=[];for(let i=0;i<r.length-2;i+=2)pts.push(new THREE.Vector2(r[i],r[i+1]));
  const y=Math.max(...pts.map(p=>ground(p.x,p.y)))+.22,shape=new THREE.Shape(pts),g=new THREE.ShapeGeometry(shape);g.rotateX(Math.PI/2); // Shape Y -> world +Z after rotation correction below.
  // rotateX(+pi/2) maps shape Y to +Z, and reverse face is visible via DoubleSide.
  g.translate(0,y,0);const mesh=new THREE.Mesh(g,mats.water);mesh.name=`Statue Square mapped pool ${feature.id}`;mesh.receiveShadow=true;group.add(mesh);
  for(let i=0;i<r.length-2;i+=2){let ax=r[i],az=r[i+1],bx=r[i+2],bz=r[i+3];if(road((ax+bx)/2,(az+bz)/2,.2))continue;beam(copings,[ax,y+.08,az],[bx,y+.08,bz],.22,.25);}
  // The pool surface itself remains a visible depression; a low perimeter prevents driving into it.
  for(let i=0;i<r.length-2;i+=2){let ax=r[i],az=r[i+1],bx=r[i+2],bz=r[i+3],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(len<.2||road((ax+bx)/2,(az+bz)/2,.25))continue;colliders.push(colliderAt((ax+bx)/2,(az+bz)/2,len,.25,y-.2,.55,Math.atan2(-dz,dx)));}
 }
 // Two distinct vertical artworks: dark mosaic and pale patterned pierced screen.
 // Their positions and decoration are photographic interpretations, not mapped surveys.
 for(const [index,art] of [[0,'dark'],[1,'light']]){
  const f=SQUARE_WATER[index],obb=minimumAreaObb(f.world),x=obb.x,z=obb.z,y=ground(x,z)+.3,ry=obb.ry,w=Math.min(obb.w*.67,12);
  const a=new THREE.Group();a.position.set(x,y,z);a.rotation.y=ry;group.add(a);
  const baseParts=[],details=[],colours=[];box(baseParts,[0,1.15,0],[w,2.3,.23]);
  // Multiple inset panels read as the photographed abstract mosaic / patterned white wall, not a blank slab.
  const count=Math.floor(w/.65);for(let j=0;j<count;j++)for(let row=0;row<4;row++){
   const xx=-w/2+.32+j*(w-.64)/Math.max(1,count-1), yy=.3+row*.52, t=Math.abs(Math.sin(j*23+row*47));
   box(details,[xx,yy,.13],[.08,.4,.06]);box(details,[xx,yy+.21,.13],[.47,.055,.06]);
   if((j+row)%3===0)box(colours,[xx+.17,yy,.165],[.2,.3,.04]);
  }
  for(let j=-3;j<=3;j++){
   let px=j*w/8, prev=[px,.07,1.1];for(let k=1;k<=12;k++){const t=k/12, next=[px,.07+1.5*4*t*(1-t),1.1-2.2*t];beam(jets,[x+Math.cos(ry)*prev[0]+Math.sin(ry)*prev[2],y+prev[1],z-Math.sin(ry)*prev[0]+Math.cos(ry)*prev[2]],[x+Math.cos(ry)*next[0]+Math.sin(ry)*next[2],y+next[1],z-Math.sin(ry)*next[0]+Math.cos(ry)*next[2]],.025,.025);prev=next;}
  }
  merged(a,baseParts,art==='dark'?mats.dark:mats.white,`Statue Square ${art} fountain artwork base`);merged(a,details,art==='dark'?mats.stone:mats.poolblue,`Statue Square ${art} fountain artwork relief`);merged(a,colours,art==='dark'?new THREE.MeshStandardMaterial({color:0x895b44,roughness:.8}):mats.coping,`Statue Square ${art} fountain artwork accents`);
 }
 // Roof outlines are mapped; transverse folds, slender columns and concrete thickness follow the photos.
 const roofs=[];
 for(const feature of SQUARE_SHELTERS){
  const r=feature.world, p=[];for(let i=0;i<8;i+=2)p.push({x:r[i],z:r[i+1]});
  let a=p[0],b=p[1],c=p[2],d=p[3];if(Math.hypot(b.x-a.x,b.z-a.z)<Math.hypot(d.x-a.x,d.z-a.z)){[a,b,c,d]=[p[1],p[2],p[3],p[0]];}
  const y=Math.max(...p.map(q=>ground(q.x,q.z)))+.16, n=4;
  const lerp=(v,w,t)=>({x:v.x+(w.x-v.x)*t,z:v.z+(w.z-v.z)*t});
  let vp=[];for(let i=0;i<n;i++){let t=i/n,u=(i+1)/n, aa=lerp(a,d,t),bb=lerp(b,c,t),cc=lerp(a,d,u),dd=lerp(b,c,u),h0=y+3.72+(i%2? .66:0),h1=y+3.72+((i+1)%2? .66:0);vp.push(aa.x,h0,aa.z,bb.x,h0,bb.z,cc.x,h1,cc.z,cc.x,h1,cc.z,bb.x,h0,bb.z,dd.x,h1,dd.z);beam(roofTrim,[aa.x,h0,aa.z],[bb.x,h0,bb.z],.1,.1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));g.computeVertexNormals();const roof=new THREE.Mesh(g,mats.white);roof.name=`Statue Square folded canopy ${feature.id}`;roof.castShadow=true;group.add(roof);roofs.push(roof);
  const len=Math.hypot(b.x-a.x,b.z-a.z),nposts=Math.max(2,Math.ceil(len/5));for(let i=0;i<=nposts;i++)for(const [u,v] of [[a,b],[d,c]]){let q=lerp(u,v,i/nposts);if(road(q.x,q.z,.4))continue;let py=ground(q.x,q.z)+.14;cylinder(posts,[q.x,(py+y+3.72)/2,q.z],.09,y+3.72-py,10);colliders.push(colliderAt(q.x,q.z,.2,.2,py,3.7));}
 }
 // Jackson: photo-directed bronze likeness on a stone plinth. Face toward the courthouse (east).
 const [sx,sz]=JACKSON_POSITION,sy=ground(sx,sz)+.15;const statue=new THREE.Group();statue.name='Sir Thomas Jackson statue';statue.position.set(sx,sy,sz);statue.rotation.y=Math.PI/2;group.add(statue);
 const plinth=[],body=[],skin=[],plaque=[];box(plinth,[0,.15,0],[2.35,.3,2.05]);box(plinth,[0,.9,0],[1.9,1.25,1.7]);box(plinth,[0,1.58,0],[2,.14,1.8]);box(plaque,[0,1.04,.86],[1.36,.76,.035]);
 // Figure wears a long frock coat, waistcoat, straight trousers; right arm bends to chest.
 box(body,[0,2.47,0],[.57,1.17,.35]);box(body,[0,3.08,0],[.72,.77,.38]);box(body,[-.22,2.49,-.12],[.18,1.06,.16]);box(body,[.22,2.49,-.12],[.18,1.06,.16]);
 for(const xx of [-.18,.18]){beam(body,[xx,1.68,0],[xx,2.26,0],.22,.22);box(body,[xx,1.71,.09],[.23,.16,.38]);}
 beam(body,[-.4,3.32,0],[-.43,2.57,.03],.18,.19);beam(body,[.39,3.31,0],[.55,2.95,.06],.18,.19);beam(body,[.55,2.95,.06],[.22,3.03,.19],.16,.16);sphere(skin,[.2,3.03,.2],.09,10);sphere(skin,[0,3.63,.015],.21,12);box(body,[0,3.37,0],[.18,.17,.17]);box(body,[0,3.03,.22],[.045,.42,.035]);
 merged(statue,plinth,mats.stone,'Jackson stone plinth');merged(statue,plaque,new THREE.MeshStandardMaterial({color:0x483934,metalness:.45,roughness:.6}),'Jackson dark plaque');merged(statue,body,mats.bronze,'Jackson bronze coat and limbs');merged(statue,skin,mats.bronze,'Jackson bronze head and hand');colliders.push(colliderAt(sx,sz,2.4,2.1,sy,4));
 // The nearby Cenotaph is outside the square's northern ring. Mapped outline is the base.
 const obb=minimumAreaObb(CENOTAPH_RING),cy=ground(obb.x,obb.z)+.14, cen=new THREE.Group();cen.name='和平紀念碑 The Cenotaph';cen.position.set(obb.x,cy,obb.z);cen.rotation.y=obb.ry;group.add(cen);const blocks=[],seams=[],poles=[];
 box(blocks,[0,.18,0],[obb.w, .36,obb.d]);box(blocks,[0,.65,0],[obb.w*.9,.62,obb.d*.9]);box(blocks,[0,3.55,0],[obb.w*.76,5.2,obb.d*.76]);box(blocks,[0,7.05,0],[obb.w*.68,1.8,obb.d*.68]);box(blocks,[0,8.5,0],[obb.w*.60,1.15,obb.d*.6]);box(blocks,[0,9.35,0],[obb.w*.55,.55,obb.d*.55]);box(blocks,[0,9.75,0],[obb.w*.62,.25,obb.d*.62]);box(blocks,[0,10.05,0],[obb.w*.48,.35,obb.d*.48]);box(blocks,[0,10.4,0],[obb.w*.38,.35,obb.d*.38]);
 for(let y=1.2;y<8.1;y+=.56)for(const sign of [-1,1]){box(seams,[0,y,sign*obb.d*.381],[obb.w*.76,.018,.015]);box(seams,[sign*obb.w*.381,y,0],[.015,.018,obb.d*.76]);}
 for(const sign of [-1,1])for(let i=-1;i<=1;i++)beam(poles,[i*.6,1.1,sign*(obb.d*.39)],[i*.6,6,sign*(obb.d*.39)],.04,.04);
 for(const sign of [-1,1]){const wreath=new THREE.Mesh(new THREE.TorusGeometry(.48,.09,8,24),mats.coping);wreath.position.set(sign*(obb.w*.35),6.75,0);wreath.rotation.y=Math.PI/2;cen.add(wreath);}
 merged(cen,blocks,mats.coping,'Cenotaph limestone stepped monument');merged(cen,seams,mats.stone,'Cenotaph stone courses');merged(cen,poles,mats.dark,'Cenotaph ceremonial flagpoles');colliders.push(colliderAt(obb.x,obb.z,obb.w,obb.d,cy,10.7,obb.ry));
 // Planting kept away from pools, roofs, road and central circulation; tree positions are indicative.
 for(const site of [south,north])for(let x=site.bounds.minX+4;x<site.bounds.maxX-4;x+=7)for(let z=site.bounds.minZ+4;z<site.bounds.maxZ-4;z+=7){
  const xx=x+Math.sin(z)*.7,zz=z+Math.cos(x)*.7;if(!inside(site,xx,zz)||road(xx,zz,3)||inAny(SQUARE_WATER,xx,zz)||inAny(SQUARE_SHELTERS,xx,zz)||Math.hypot(xx-sx,zz-sz)<5)continue;
  // Prefer perimeter rather than an artificial forest in the paved square.
  let nearEdge=false;for(let a=0;a<Math.PI*2;a+=Math.PI/4)if(!inside(site,xx+Math.cos(a)*6,zz+Math.sin(a)*6))nearEdge=true;
  if(!nearEdge)continue;
  // Low raised planting beds are approximate; keep their corners within the garden and off the road.
  if(![[-1.6,-1.6],[-1.6,1.6],[1.6,-1.6],[1.6,1.6]].every(([dx,dz])=>inside(site,xx+dx,zz+dz)&&!road(xx+dx,zz+dz,.5)&&!inAny(SQUARE_WATER,xx+dx,zz+dz)&&!inAny(SQUARE_SHELTERS,xx+dx,zz+dz)))continue;
  const y=ground(xx,zz)+.14;box(planters,[xx,y+.12,zz],[3.2,.24,3.2]);box(foliage,[xx,y+.29,zz],[2.85,.16,2.85]);
  for(let j=0;j<4;j++){const a=j*Math.PI/2;sphere(foliage,[xx+Math.cos(a)*1.1,y+.47,zz+Math.sin(a)*1.1],.35,8);}
  treeSites.push({x:xx,z:zz,y:y+.35,scale:.65+.15*Math.abs(Math.sin(xx+zz)),species:Math.abs(Math.round(xx+zz))%4,tier:1});
 }
 // Bench rows near square edges; do not obstruct mapped water or entrances.
 for(const [x,z] of [[-2,82],[-6,100],[4,111],[55,91],[55,70],[23,22],[60,19]]){if(![south,north].some(s=>inside(s,x,z))||road(x,z,2)||inAny(SQUARE_WATER,x,z)||inAny(SQUARE_SHELTERS,x,z))continue;let y=ground(x,z)+.14;box(benches,[x,y+.48,z],[1.8,.12,.55]);box(benches,[x,y+.82,z+.24],[1.8,.57,.09]);for(const dx of [-.7,.7])box(posts,[x+dx,y+.23,z],[.09,.46,.45]);colliders.push(colliderAt(x,z,1.8,.55,y,1));}
 merged(group,roofTrim,mats.white,'Statue Square folded canopy edges');merged(group,jets,new THREE.MeshStandardMaterial({color:0xc7ded7,transparent:true,opacity:.72,roughness:.26}),'Statue Square fountain jets');merged(group,planters,mats.stone,'Statue Square raised planting beds');merged(group,foliage,mats.hedge,'Statue Square low planting');merged(group,copings,mats.coping,'Statue Square pool edging');merged(group,posts,mats.metal,'Statue Square canopy columns and trim');merged(group,benches,new THREE.MeshStandardMaterial({color:0x755d4b,roughness:.9}),'Statue Square timber seating');
 const landmarks=[{name:'皇后像廣場',englishName:'Statue Square',x:south.x,z:south.z,w:south.w,d:south.d,h:8,ring:south.ring,bounds:south.bounds,osmId:6970394,kind:'majorPark',labelHeight:false}];
 return {group,colliders,treeSites,landmarks,stats:{statueSquareGroundCells:cells,statueSquarePools:SQUARE_WATER.length,statueSquareCanopies:roofs.length,statueSquareTrees:treeSites.length,statueSquareCenotaph:1,statueSquareJackson:1}};
}
