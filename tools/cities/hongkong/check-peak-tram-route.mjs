// Diagnostic only: do not use the DTM as a surveyed track profile.
import { peakTramRoute, PEAK_TRAM_SEGMENTS } from '../../../js/cities/hongkong/peak-tram-route.js';
import { hongKongTerrainHeight } from '../../../js/cities/hongkong/terrain.js';
import { fullRoadSurfaceAt } from '../../../js/cities/hongkong/full-meta.js';
const summaries=[];
for(const branch of ['A','B']){
 const route=peakTramRoute(branch);let length=0,spatial=0,maximumGrade=0,descending=0,steep=0,count=0,roadHits=0,min=Infinity,max=-Infinity;
 const roadIds=new Map();
 for(let i=1;i<route.length;i++){
  const [ax,az]=route[i-1].world,[bx,bz]=route[i].world,distance=Math.hypot(bx-ax,bz-az),steps=Math.max(1,Math.ceil(distance/2));let prev=hongKongTerrainHeight(ax,az);
  for(let j=1;j<=steps;j++){
   const x=ax+(bx-ax)*j/steps,z=az+(bz-az)*j/steps,y=hongKongTerrainHeight(x,z),delta=y-prev,step=distance/steps,grade=delta/step;
   length+=step;spatial+=Math.hypot(step,delta);maximumGrade=Math.max(maximumGrade,Math.abs(grade));if(grade<-.01)descending++;if(grade>Math.tan(26*Math.PI/180))steep++;count++;min=Math.min(min,y);max=Math.max(max,y);
   const road=fullRoadSurfaceAt(x,z,1.6,y);if(road){roadHits++;const id=road.way?.id??road.recordIndex??'unknown';roadIds.set(id,(roadIds.get(id)||0)+1);}prev=y;
  }
 }
 summaries.push({branch,nodes:route.length,lengthMetres:length,sceneTerrain3dLength:spatial,terrainMin:min,terrainMax:max,terrainMaxGrade:maximumGrade,uphillSegmentsDescending:descending,segmentsAbove26Degrees:steep,sampleSegments:count,roadSamples:roadHits,roadIds:Object.fromEntries(roadIds)});
}
console.log(JSON.stringify({relation:3264047,ways:PEAK_TRAM_SEGMENTS.length,lower:peakTramRoute('A')[0],upper:peakTramRoute('A').at(-2),summaries},null,2));
