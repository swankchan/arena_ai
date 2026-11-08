import * as THREE from 'three/webgpu';
import {quad,store,meshStore} from './harbour-city-world-utils.js';
import {barkerStationTrackPoint} from './peak-tram-barker-station-track-site.js';
import {hongKongTerrainHeight} from './terrain.js';

// Approximate masonry supports at the ends of the provisional crossing. These
// stand outside the sampled road footprint; dimensions are not surveyed.
export function buildBarkerAbutments(scene){
 const group=new THREE.Group();group.name='Barker crossing abutments';scene.add(group);
 const stone=store(),colliders=[];
 for(const s of [1097,1116]){
  const p=barkerStationTrackPoint(s),halfWidth=1.65,halfLength=.34,top=p.y-.65;
  const world=(u,v,y)=>[p.x+p.ux*u+p.nx*v,y,p.z+p.uz*u+p.nz*v];
  let lowest=Infinity;for(let v=-halfWidth;v<=halfWidth+.01;v+=.33){const q=world(0,v,0);lowest=Math.min(lowest,hongKongTerrainHeight(q[0],q[2]));}
  // Small courses and staggered vertical joints give the stone a layered face.
  for(const u of [-halfLength,halfLength])for(let v=-halfWidth;v<halfWidth-.001;v+=.55){
   const V=Math.min(halfWidth,v+.55),a=world(u,v,0),b=world(u,V,0),ga=hongKongTerrainHeight(a[0],a[2])-.05,gb=hongKongTerrainHeight(b[0],b[2])-.05;
   for(let y=Math.floor(Math.min(ga,gb)/.55)*.55;y<top;y+=.55){
    const loA=Math.max(ga,y),loB=Math.max(gb,y),hi=Math.min(top,y+.535);if(hi<=Math.min(loA,loB))continue;
    const shade=.39+((Math.round((v+halfWidth)*10)+Math.round(y*10))%3)*.018;
    quad(stone,world(u,v,Math.min(loA,hi)),world(u,V,Math.min(loB,hi)),world(u,V,hi),world(u,v,hi),[shade,shade-.008,shade-.035]);
   }
  }
  for(const v of [-halfWidth,halfWidth]){const a=world(-halfLength,v,0),b=world(halfLength,v,0),ga=hongKongTerrainHeight(a[0],a[2])-.05,gb=hongKongTerrainHeight(b[0],b[2])-.05;quad(stone,world(-halfLength,v,ga),world(halfLength,v,gb),world(halfLength,v,top),world(-halfLength,v,top),[.39,.38,.35]);}
  const extX=Math.abs(p.ux)*halfLength+Math.abs(p.nx)*halfWidth,extZ=Math.abs(p.uz)*halfLength+Math.abs(p.nz)*halfWidth;
  colliders.push({minX:p.x-extX,maxX:p.x+extX,minZ:p.z-extZ,maxZ:p.z+extZ,minY:lowest-.05,maxY:top});
 }
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});meshStore(group,stone,mat,'Barker crossing masonry abutments');
 return {group,colliders,stats:{peakTramBarkerAbutments:colliders.length}};
}
