// Estimate the height step left by removing coarse terrain inside the venue.
// Offline 2m samples of the original unsplit grid, not a road/terrain survey.
import fs from 'node:fs';
import {HAPPY_VALLEY_SITE as site} from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import {HONG_KONG_TERRAIN_META as meta,hongKongTerrainHeight} from '../../../js/cities/hongkong/terrain.js';
import {pointInFlatRing} from '../../../js/cities/hongkong/landmark-site.js';
import {fullRoadWaysNear} from '../../../js/cities/hongkong/full-meta.js';
import {roadRibbonHeightAtSegment} from '../../../js/cities/hongkong/road-elevation.js';
const grid=meta.grid;
function coarseHeight(x,z) {
 const fx=(x-grid.minX)/grid.cell,fz=(z-grid.minZ)/grid.cell,i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;
 const height=(di,dj)=>hongKongTerrainHeight(grid.minX+(i+di)*grid.cell,grid.minZ+(j+dj)*grid.cell)-.08;
 const a=height(0,0),b=height(1,0),c=height(0,1),d=height(1,1);
 return u+v<=1?a+u*(b-a)+v*(c-a):d*(u+v-1)+b*(1-v)+c*(1-u);
}
let min=Infinity,max=-Infinity,significant=0,count=0;const roads=new Map();
const oneMetre=process.argv.includes('--inset1m'), inset=process.argv.includes('--inset') || oneMetre;
const ring=inset ? JSON.parse(fs.readFileSync(new URL(oneMetre?'../../data/hongkong/happy-valley-inset-1m-experiment.json':'../../data/hongkong/happy-valley-inset-experiment.json',import.meta.url))).flat() : site.ring;
for(let i=0;i+3<ring.length;i+=2) {
 const x=ring[i],z=ring[i+1],dx=ring[i+2]-x,dz=ring[i+3]-z,len=Math.hypot(dx,dz);
 if(len<.01)continue;
 const steps=Math.ceil(len/2);
 for(let k=0;k<steps;k++) {
  const t=(k+.5)/steps,X=x+dx*t,Z=z+dz*t;let nx=-dz/len,nz=dx/len;
  if(pointInFlatRing(ring,X+nx*.1,Z+nz*.1)){nx=-nx;nz=-nz;}
  const gap=coarseHeight(X+nx*.1,Z+nz*.1)-(meta.happyValleyPadHeight-.03);
  count++;min=Math.min(min,gap);max=Math.max(max,gap);if(Math.abs(gap)>.1)significant++;
  for(const way of fullRoadWaysNear(X,Z,10))for(let j=2;j<way.flat.length;j+=2) {
   const ax=way.flat[j-2],az=way.flat[j-1],vx=way.flat[j]-ax,vz=way.flat[j+1]-az,l=vx*vx+vz*vz;
   if(l<.0025)continue;
   const u=Math.max(0,Math.min(1,((X-ax)*vx+(Z-az)*vz)/l)),px=ax+u*vx,pz=az+u*vz;
   if(Math.hypot(X-px,Z-pz)>way.width/2+1)continue;
   if(Math.abs(roadRibbonHeightAtSegment(way.id,j/2-1,u,px,pz)-meta.happyValleyPadHeight)<2.5)
    roads.set(way.id,(roads.get(way.id)??0)+1);
  }
 }
}
console.log(JSON.stringify({boundary:oneMetre?'experimental 1m inset':inset?'experimental 8m inset':'site',samples:count,over10cm:significant,minMetres:+min.toFixed(3),maxMetres:+max.toFixed(3),sameLevelRoadIds:Object.fromEntries(roads),caveat:'2m boundary samples of unsplit terrain; excludes tunnel cuts, earthworks, road widths at oblique crossings and continuous vehicle sweeps.'},null,2));
