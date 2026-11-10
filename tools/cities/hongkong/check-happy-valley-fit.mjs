// Experimental estimate only, NOT runtime. Reports discrete samples against all
// nearby road segments rather than only the closest-height road layer.
import fs from 'node:fs';
import { makeFrame } from '../../geo/frame.mjs';
import cfg from './config.mjs';
import { HAPPY_VALLEY_SITE as site } from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';
import { HONG_KONG_TERRAIN_META as terrain } from '../../../js/cities/hongkong/terrain.js';
import { fullRoadWaysNear } from '../../../js/cities/hongkong/full-meta.js';
import { roadRibbonHeightAtSegment } from '../../../js/cities/hongkong/road-elevation.js';

const path = process.argv[2] ?? new URL('../../data/hongkong/happy-valley-experimental-fit.json',import.meta.url);
const fit=JSON.parse(fs.readFileSync(path)), points=fit.points, projection=makeFrame(cfg.frame);
const data=JSON.parse(fs.readFileSync(new URL('../../data/hongkong/parks.json',import.meta.url)));
const pitches=data.elements.filter(e=>e.type==='way' && e.tags?.leisure==='pitch' && e.geometry?.length>=4)
  .map(e=>({id:e.id,ring:e.geometry.flatMap(({lon,lat})=>projection.toWorld(lon,lat))}))
  .filter(p=>p.ring.some((v,i)=>!(i%2) && pointInFlatRing(site.ring,v,p.ring[i+1])));
// Include all six mapped stands, not just the ones already built in runtime.
const standIds=new Set([494027781,1356276114,1356276115,1356276116,1356276117,1356276118]);
const stands=JSON.parse(fs.readFileSync(new URL('../../data/hongkong/landmarks.json',import.meta.url))).elements
  .filter(e=>e.type==='way' && standIds.has(e.id) && e.geometry?.length>=4)
  .map(e=>({id:e.id,ring:e.geometry.flatMap(({lon,lat})=>projection.toWorld(lon,lat))}));
if(stands.length!==standIds.size) throw new Error('Missing mapped Happy Valley stand footprint');
// Local circumradius is a diagnostic of the sampled polyline, not a measured
// or certified racing radius. Rounded input points can exaggerate curvature.
let minimumCentrelineRadius=Infinity, sharpStation=null;
for(let i=0;i<points.length;i++) {
  const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];
  const ux=b[0]-a[0],uz=b[1]-a[1],vx=c[0]-b[0],vz=c[1]-b[1];
  const u=Math.hypot(ux,uz),v=Math.hypot(vx,vz),chord=Math.hypot(c[0]-a[0],c[1]-a[1]);
  const cross=Math.abs(ux*vz-uz*vx);
  if(cross<1e-8)continue;
  const radius=u*v*chord/(2*cross);
  if(radius<minimumCentrelineRadius){minimumCentrelineRadius=radius;sharpStation=i;}
}
const standHits=new Map();
const cs=Math.cos(site.ry),sn=Math.sin(site.ry), c=terrain.happyValleyPadHeight;
let sampleCount=0, outside=0, pitch=0, stand=0, sameLevel=0, lessThan5m=0, minClearance=Infinity;
const obstacles=new Map(),sameLevelRoads=new Map();
for(let i=0;i<points.length;i++) {
  const p=points[i],before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length];
  const dx=after[0]-before[0],dz=after[1]-before[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
  for(let j=0;j<=16;j++) {
    const offset=15.25-30.5*j/16, x=p[0]+nx*offset,z=p[1]+nz*offset;
    const X=site.x+cs*x+sn*z,Z=site.z-sn*x+cs*z; sampleCount++;
    if(!pointInFlatRing(site.ring,X,Z))outside++;
    if(pitches.some(p=>pointInFlatRing(p.ring,X,Z)))pitch++;
    let inStand=false;
    for(const building of stands) if(pointInFlatRing(building.ring,X,Z)) {
      inStand=true;standHits.set(building.id,(standHits.get(building.id)??0)+1);
    }
    if(inStand)stand++;
    let same=false, low=false;
    for(const way of fullRoadWaysNear(X,Z,12)) for(let k=2;k<way.flat.length;k+=2) {
      const ax=way.flat[k-2],az=way.flat[k-1],bx=way.flat[k],bz=way.flat[k+1],vx=bx-ax,vz=bz-az,len2=vx*vx+vz*vz;
      if(len2<.05*.05)continue;
      const t=Math.max(0,Math.min(1,((X-ax)*vx+(Z-az)*vz)/len2));
      const px=ax+t*vx,pz=az+t*vz;
      if(Math.hypot(X-px,Z-pz)>way.width/2+1)continue;
      const height=roadRibbonHeightAtSegment(way.id,k/2-1,t,px,pz),clearance=c-height;
      if(Math.abs(clearance)<2.5){same=true;sameLevelRoads.set(way.id,(sameLevelRoads.get(way.id)??0)+1);}
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
  mappedStandsChecked:stands.length,standIds:Object.fromEntries(standHits),sameLevelRoadIds:Object.fromEntries(sameLevelRoads),
  minSampledCentrelineRadiusMetres:+minimumCentrelineRadius.toFixed(2),sharpestStation:sharpStation,
  samplesWithRoadUnder5m:lessThan5m,minSampledClearanceMetres:Number.isFinite(minClearance)?+minClearance.toFixed(3):null,
  roadIds:Object.fromEntries([...obstacles].map(([id,v])=>[id,+v.toFixed(3)])),
  caveat:'Discrete model samples and three-point curvature; nearest height at road centreline; not continuous clearance, actual tunnel geometry, real track or surveyed heights.'},null,2));
