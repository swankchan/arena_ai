import * as THREE from 'three/webgpu';
import {beam,box,merged,quad,store,meshStore} from './harbour-city-world-utils.js';
import {hongKongTerrainHeight} from './terrain.js';
import {fullRoadSurfaceAt} from './full-meta.js';
import {KENNEDY_APPROACH_POINTS,isMacDonnellPlatformSegment,isMacDonnellBridgeSegment,isMagazineGapBridgeSegment} from './peak-tram-kennedy-approach-site.js';

// A short non-playable track section connecting to the Kennedy Road bridge.
// The earthworks and piers are approximations to the current scene DTM.
export function buildPeakTramKennedyApproach(scene){
 const group=new THREE.Group();group.name='Peak Tram Kennedy Road uphill approach';scene.add(group);
 const rails=[],ties=[],piers=[],feet=[],bed=store(),walls=store(),colliders=[],points=KENNEDY_APPROACH_POINTS;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  const p=(q,off,dy=0)=>[q.x+nx*off,q.y+dy,q.z+nz*off];
  for(const off of [-.762,.762])beam(rails,p(a,off),p(b,off),.075,.075);
  for(let j=0,n=Math.max(1,Math.ceil(len/.7));j<n;j++){
   const t=j/n,v={x:a.x+dx*t,z:a.z+dz*t,y:a.y+(b.y-a.y)*t};beam(ties,p(v,-1.08,-.11),p(v,1.08,-.11),.12,.13);
  }
  quad(bed,p(a,-1.60,-.27),p(b,-1.60,-.27),p(b,1.60,-.27),p(a,1.60,-.27),[.31,.30,.27]);
  // Both cut faces follow DTM on the outside edge, rather than flattening a wide pad.
  for(const side of [-1,1]){
   if(isMacDonnellBridgeSegment(a,b)||isMagazineGapBridgeSegment(a,b))continue; // the vault supplies its own jambs
   const off=side>0&&isMacDonnellPlatformSegment(a,b)?4:side*1.6,ax=a.x+nx*off,az=a.z+nz*off,bx=b.x+nx*off,bz=b.z+nz*off;
   const terrainA=hongKongTerrainHeight(ax,az),terrainB=hongKongTerrainHeight(bx,bz);
   const roadA=fullRoadSurfaceAt(ax,az,.35,terrainA),roadB=fullRoadSurfaceAt(bx,bz,.35,terrainB);
   // Overpasses keep their existing road surface. Trench walls stop below its
   // underside so they do not protrude into the drivable carriageway.
   const ga=Math.min(terrainA-.08,roadA ? roadA.height-.5 : Infinity),gb=Math.min(terrainB-.08,roadB ? roadB.height-.5 : Infinity);
   if(ga>a.y-.27||gb>b.y-.27)quad(walls,[ax,a.y-.27,az],[bx,b.y-.27,bz],[bx,Math.max(gb,b.y-.27),bz],[ax,Math.max(ga,a.y-.27),az],[.42,.42,.38]);
  }
  // Structural support under genuinely elevated portions only; road checks cover each pier.
  if(i%4===0){
   const ground=hongKongTerrainHeight(b.x,b.z),top=b.y-.32,h=top-ground;
   if(h>.6){
    box(piers,[b.x,ground+h/2,b.z],[.5,h,.5]);box(feet,[b.x,ground+.04,b.z],[.85,.16,.85]);
    colliders.push({minX:b.x-.425,maxX:b.x+.425,minZ:b.z-.425,maxZ:b.z+.425,minY:ground-.05,maxY:top});
   }
  }
 }
 const steel=new THREE.MeshStandardMaterial({color:0x93958d,roughness:.36,metalness:.7}),wood=new THREE.MeshStandardMaterial({color:0x514b40,roughness:.88});
 const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),concrete=new THREE.MeshStandardMaterial({color:0x737871,roughness:.9});
 merged(group,rails,steel,'Kennedy approach rails');merged(group,ties,wood,'Kennedy approach sleepers');meshStore(group,bed,stone,'Kennedy approach track bed');meshStore(group,walls,stone,'Kennedy approach retaining walls');merged(group,piers,concrete,'Kennedy approach support piers');merged(group,feet,concrete,'Kennedy approach footing pads');
 return {group,points,colliders,stats:{peakTramKennedyApproachSegments:points.length-1}};
}
