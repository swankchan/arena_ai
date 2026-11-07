import { PEAK_WALK_WAYS } from '../../../js/cities/hongkong/peak-walk-data.js';
import { hongKongTerrainHeight } from '../../../js/cities/hongkong/terrain.js';
import { fullRoadSurfaceAt } from '../../../js/cities/hongkong/full-meta.js';

let length=0, maxSlope=0, steep=0, total=0, roadSamples=0, minY=Infinity, maxY=-Infinity;
for(const way of PEAK_WALK_WAYS) for(let i=2;i<way.points.length;i+=2) {
  const ax=way.points[i-2],az=way.points[i-1],dx=way.points[i]-ax,dz=way.points[i+1]-az, distance=Math.hypot(dx,dz);
  if(distance<.02)continue;
  const steps=Math.ceil(distance/3);let last=hongKongTerrainHeight(ax,az);
  for(let j=1;j<=steps;j++) {
    const x=ax+dx*j/steps,z=az+dz*j/steps,y=hongKongTerrainHeight(x,z),slope=Math.abs(y-last)/(distance/steps);
    length+=distance/steps;maxSlope=Math.max(maxSlope,slope);if(slope>.15)steep++;total++;
    minY=Math.min(minY,y);maxY=Math.max(maxY,y); if(fullRoadSurfaceAt(x,z,2.25,y))roadSamples++;last=y;
  }
}
console.log(JSON.stringify({ways:PEAK_WALK_WAYS.length,lengthMetres:length,sampleSegments:total,terrainMin:minY,terrainMax:maxY,terrainMaxGrade:maxSlope,segmentsOver15Percent:steep,roadIntersectionSamples:roadSamples},null,2));
