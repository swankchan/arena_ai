// Offline hypothesis only: raise a short portion of the experimental 720-point
// circuit to explore road 43020 clearance without lowering its road profile.
// The terrain, bridge structure, vehicle envelope and real elevations are NOT
// represented; this file does not change the game.
import fs from 'node:fs';
import {HAPPY_VALLEY_SITE as site} from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import {HONG_KONG_TERRAIN_META as terrain} from '../../../js/cities/hongkong/terrain.js';
import {fullRoadWaysNear} from '../../../js/cities/hongkong/full-meta.js';
import {roadRibbonHeightAtSegment} from '../../../js/cities/hongkong/road-elevation.js';
const fit=JSON.parse(fs.readFileSync(new URL('../../data/hongkong/happy-valley-experimental-smooth-fit.json',import.meta.url))),points=fit.points;
if(points.length!==720 || fit.status!=='experimental-not-used-in-runtime')throw new Error('Unexpected candidate');
// 1.8 m hump, with a 32-station plateau and 40-station smooth ramps.
// It is only an exploratory scenario, not a real course profile.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const lift=i=>1.8*Math.min(smooth((i-120)/40),smooth((232-i)/40));
const c=Math.cos(site.ry),s=Math.sin(site.ry),results={flat:{low:0,same:0,min:Infinity},raised:{low:0,same:0,min:Infinity}};
let maxSlope=0;
for(let i=0;i<points.length;i++) {
 const p=points[i],prev=points[(i+719)%720],next=points[(i+1)%720],dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz);
 const step=Math.hypot(next[0]-p[0],next[1]-p[1]);maxSlope=Math.max(maxSlope,Math.abs(lift(i+1)-lift(i))/step);
 for(let j=0;j<=16;j++) {
  const offset=15.25-30.5*j/16,x=p[0]-dz/len*offset,z=p[1]+dx/len*offset,X=site.x+c*x+s*z,Z=site.z-s*x+c*z;
  const hits=[];
  for(const way of fullRoadWaysNear(X,Z,12))for(let k=2;k<way.flat.length;k+=2){
   const ax=way.flat[k-2],az=way.flat[k-1],vx=way.flat[k]-ax,vz=way.flat[k+1]-az,l=vx*vx+vz*vz;
   if(l<.0025)continue;const u=Math.max(0,Math.min(1,((X-ax)*vx+(Z-az)*vz)/l)),px=ax+u*vx,pz=az+u*vz;
   if(Math.hypot(X-px,Z-pz)<=way.width/2+1)hits.push(roadRibbonHeightAtSegment(way.id,k/2-1,u,px,pz));
  }
  for(const [key,extra] of [['flat',0],['raised',lift(i)]]) {
   let low=false,same=false;
   for(const h of hits){const clear=terrain.happyValleyPadHeight+extra-h;if(Math.abs(clear)<2.5)same=true;if(clear>0){results[key].min=Math.min(results[key].min,clear);if(clear<5)low=true;}}
   if(low)results[key].low++;if(same)results[key].same++;
  }
 }
}
for(const r of Object.values(results))r.min=Number.isFinite(r.min)?+r.min.toFixed(3):null;
console.log(JSON.stringify({stations:points.length,samples:points.length*17,liftMetres:1.8,plateau:[160,192],ramps:[120,160,192,232],maxCentrelineGradePercent:+(maxSlope*100).toFixed(2),results,
 caveat:'Discrete samples only; 5m clearance is exploratory and before track/bridge thickness. Not a survey, structural design, road surface edge, vehicle sweep, actual terrain/rail or gameplay validation.'},null,2));
