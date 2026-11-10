// Experimental estimate only, NOT runtime. Reports discrete samples against all
// nearby road segments rather than only the closest-height road layer.
import fs from 'node:fs';
import { makeFrame } from '../../geo/frame.mjs';
import cfg from './config.mjs';
import { HAPPY_VALLEY_SITE as site } from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import { HAPPY_VALLEY_PAVILION as pavilion } from '../../../js/cities/hongkong/happy-valley-pavilion-site.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';
import { HONG_KONG_TERRAIN_META as terrain } from '../../../js/cities/hongkong/terrain.js';
import { fullRoadWaysNear } from '../../../js/cities/hongkong/full-meta.js';
import { roadRibbonHeightAtSegment } from '../../../js/cities/hongkong/road-elevation.js';

const path = new URL('../../data/hongkong/happy-valley-experimental-fit.json',import.meta.url);
const fit=JSON.parse(fs.readFileSync(path)), points=fit.points, projection=makeFrame(cfg.frame);
const data=JSON.parse(fs.readFileSync(new URL('../../data/hongkong/parks.json',import.meta.url)));
const pitches=data.elements.filter(e=>e.type==='way' && e.tags?.leisure==='pitch' && e.geometry?.length>=4)
  .map(e=>({id:e.id,ring:e.geometry.flatMap(({lon,lat})=>projection.toWorld(lon,lat))}))
  .filter(p=>p.ring.some((v,i)=>!(i%2) && pointInFlatRing(site.ring,v,p.ring[i+1])));
const cs=Math.cos(site.ry),sn=Math.sin(site.ry), c=terrain.happyValleyPadHeight;
let sampleCount=0, outside=0, pitch=0, stand=0, sameLevel=0, lessThan5m=0, minClearance=Infinity;
const obstacles=new Map();
for(let i=0;i<points.length;i++) {
  const p=points[i],before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length];
  const dx=after[0]-before[0],dz=after[1]-before[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
  for(let j=0;j<=16;j++) {
    const offset=15.25-30.5*j/16, x=p[0]+nx*offset,z=p[1]+nz*offset;
    const X=site.x+cs*x+sn*z,Z=site.z-sn*x+cs*z; sampleCount++;
    if(!pointInFlatRing(site.ring,X,Z))outside++;
    if(pitches.some(p=>pointInFlatRing(p.ring,X,Z)))pitch++;
    if(pointInFlatRing(pavilion.ring,X,Z))stand++;
    let same=false, low=false;
    for(const way of fullRoadWaysNear(X,Z,12)) for(let k=2;k<way.flat.length;k+=2) {
      const ax=way.flat[k-2],az=way.flat[k-1],bx=way.flat[k],bz=way.flat[k+1],vx=bx-ax,vz=bz-az,len2=vx*vx+vz*vz;
      if(len2<.05*.05)continue;
      const t=Math.max(0,Math.min(1,((X-ax)*vx+(Z-az)*vz)/len2));
      const px=ax+t*vx,pz=az+t*vz;
      if(Math.hypot(X-px,Z-pz)>way.width/2+1)continue;
      const height=roadRibbonHeightAtSegment(way.id,k/2-1,t,px,pz),clearance=c-height;
      if(Math.abs(clearance)<2.5)same=true;
      if(clearance>0 && clearance<5) {
        low=true;minClearance=Math.min(minClearance,clearance);
        obstacles.set(way.id,Math.min(obstacles.get(way.id)??Infinity,clearance));
      }
    }
    if(same)sameLevel++;
    if(low)lessThan5m++;
  }
}
console.log(JSON.stringify({status:fit.status,centrelineMetres:fit.centrelineMetres,sampleCount,outside,pitch,stand,sameLevel,
  samplesWithRoadUnder5m:lessThan5m,minSampledClearanceMetres:Number.isFinite(minClearance)?+minClearance.toFixed(3):null,
  roadIds:Object.fromEntries([...obstacles].map(([id,v])=>[id,+v.toFixed(3)])),
  caveat:'Discrete model samples, nearest height at road centreline; not continuous clearance, actual tunnel geometry, real track or surveyed heights.'},null,2));
