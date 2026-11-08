// Audit generated experimental track samples. No scene or safety certification.
import {PEAK_TRAM_PROFILE as p} from '../../../js/cities/hongkong/peak-tram-profile-data.js';
import {fullRoadSurfaceAt} from '../../../js/cities/hongkong/full-meta.js';
const roadOver=new Set([720,8998,5701,36167,42840]),tramOver=new Set([13131,36109]);
const report=[];
for(const branch of ['A','B']){
 let violations=0,known=0,unknown=0,minRoadMargin=Infinity,maxBurial=0,maxElevated=0;
 for(const v of p.routes[branch]){
  maxBurial=Math.max(maxBurial,v.ground-v.y);maxElevated=Math.max(maxElevated,v.y-v.ground);
  const road=fullRoadSurfaceAt(v.x,v.z,1.65,v.ground);if(!road)continue;
  const id=road.way.id;let margin;
  if(roadOver.has(id))margin=road.height-v.y-p.clearance;
  else if(tramOver.has(id))margin=v.y-road.height-p.clearance;
  else {unknown++;continue;}
  known++;minRoadMargin=Math.min(minRoadMargin,margin);if(margin<-.001)violations++;
 }
 report.push({branch,knownSamples:known,unknownSamples:unknown,violations,minRoadMargin,maxBurial,maxElevated});
}
console.log(JSON.stringify({report,limitations:['Nearest road only; lateral and vertical geometry, other levels and swept-car envelopes not verified.','Unknown crossing unresolved. Large terrain cut and bridge structures are not built.','No active scene changes.']},null,2));
