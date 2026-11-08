import * as THREE from 'three/webgpu';
import {HK_FULL_ROADS} from './building-priority-roads.js';
import {roadRibbonHeightAtSegment} from './road-elevation.js';
import {fullRoadSurfaceAt} from './full-meta.js';
import {hongKongTerrainHeight} from './terrain.js';
import {quad,store,meshStore} from './harbour-city-world-utils.js';
import {BARKER_OPENING_TRIANGLES as triangles,BARKER_OPENING_BOUNDARY as boundary} from './peak-tram-barker-cut-data.js';

// This road was encoded as an OSM tunnel. Its pre-existing rectangular terrain
// openings form a union; the infill is confined to that union, below road level.
// Retaining faces rise only at the union boundary and omit adjoining road mouths.
export function barkerRoadDatum(x,z){
 const flat=HK_FULL_ROADS.roads[36109][5];let best=Infinity,height=0;
 for(let i=0;i<flat.length/2-1;i++){
  const ax=flat[2*i],az=flat[2*i+1],dx=flat[2*i+2]-ax,dz=flat[2*i+3]-az,den=dx*dx+dz*dz;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/den)),d=(x-ax-dx*t)**2+(z-az-dz*t)**2;
  if(d<best){best=d;height=roadRibbonHeightAtSegment(36109,i,t);}
 }
 const r=fullRoadSurfaceAt(x,z,.15,hongKongTerrainHeight(x,z));
 return Math.min(height,r?.height??Infinity)-.12;
}
export function buildBarkerRoadEarthworks(scene){
 const group=new THREE.Group();group.name='Barker Road cutting earthworks';scene.add(group);
 const floor=store(),walls=store();
 for(let i=0;i<triangles.length;i+=6){
  const a=[triangles[i],0,triangles[i+1]],b=[triangles[i+2],0,triangles[i+3]],c=[triangles[i+4],0,triangles[i+5]];
  for(const p of [a,b,c])p[1]=barkerRoadDatum(p[0],p[2]);
  for(const p of [a,b,c]){floor.positions.push(...p);floor.colors.push(.29,.30,.28);floor.lit.push(0);}
 }
 let wallCount=0;
 for(let i=1;i<boundary.length;i++){
  const a=boundary[i-1],b=boundary[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(length/.45));
  for(let j=0;j<n;j++){
   const t=j/n,T=(j+1)/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,X=a[0]+(b[0]-a[0])*T,Z=a[1]+(b[1]-a[1])*T;
   // Fail open for all road exits: no wall is drawn near a road ribbon.
   let occupied=false;for(const f of [0,.5,1]){let xx=x+(X-x)*f,zz=z+(Z-z)*f;if(fullRoadSurfaceAt(xx,zz,.6,hongKongTerrainHeight(xx,zz)))occupied=true;}
   if(occupied)continue;
   const y=barkerRoadDatum(x,z),Y=barkerRoadDatum(X,Z),top=Math.max(y,hongKongTerrainHeight(x,z)-.08),TOP=Math.max(Y,hongKongTerrainHeight(X,Z)-.08);
   if(top-y<.1&&TOP-Y<.1)continue;
   const shade=.36+(i%3)*.018;quad(walls,[x,y,z],[X,Y,Z],[X,TOP,Z],[x,top,z],[shade,shade,shade-.025]);wallCount++;
  }
 }
 const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,side:THREE.DoubleSide});
 meshStore(group,floor,stone,'Plantation Road opening infill');meshStore(group,walls,stone,'Plantation Road cutting retaining faces');
 return {group,stats:{peakTramBarkerCutFaces:wallCount,peakTramBarkerCutTriangles:triangles.length/6}};
}
