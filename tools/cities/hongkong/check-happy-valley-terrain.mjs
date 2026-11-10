// Approximate rendered 70 m terrain triangles against the provisional track.
// Assumes the uncut land grid; actual chunk cuts/roads can change visibility.
import {HAPPY_VALLEY_SITE as site,happyValleyTrackPoint} from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import {HONG_KONG_TERRAIN_META as meta,hongKongTerrainHeight} from '../../../js/cities/hongkong/terrain.js';
const grid=meta.grid,pad=meta.happyValleyPadHeight;
function meshHeight(x,z){
 const col=(x-grid.minX)/grid.cell,row=(z-grid.minZ)/grid.cell,i=Math.floor(col),j=Math.floor(row),u=col-i,v=row-j;
 const sample=(dx,dz)=>hongKongTerrainHeight(grid.minX+(i+dx)*grid.cell,grid.minZ+(j+dz)*grid.cell)-.08;
 const a=sample(0,0),b=sample(1,0),c=sample(0,1),d=sample(1,1);
 return u+v<=1?a+u*(b-a)+v*(c-a):d*(u+v-1)+b*(1-v)+c*(1-u);
}
let count=0,above=0,max=-Infinity;const points=[];
for(let i=0;i<720;i++)for(const offset of [0,-8,-16,-24,-30]){
 const p=happyValleyTrackPoint(i/720,offset),c=Math.cos(site.ry),s=Math.sin(site.ry),x=site.x+c*p.x+s*p.z,z=site.z-s*p.x+c*p.z;
 const diff=meshHeight(x,z)-(pad+.1);count++;if(diff>.05)above++;if(diff>max)max=diff;
 if(diff>.05 && points.length<3)points.push({x:+x.toFixed(2),z:+z.toFixed(2),metres:+diff.toFixed(3)});
}
console.log(JSON.stringify({samples:count,terrainAboveTrackSamples:above,maxTerrainAboveTrackMetres:+max.toFixed(3),sampleLocations:points,caveat:'Uncut 70 m grid triangles; not raycasts of full rendered chunks. Tunnel cuts and temporary missing track cells are not represented; not measured ground elevation.'},null,2));
