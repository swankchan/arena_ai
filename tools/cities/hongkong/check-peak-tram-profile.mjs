// Feasibility experiment, NOT runtime track, surveyed design or a clearance certification.
import {peakTramRoute, PEAK_TRAM_NODES} from '../../../js/cities/hongkong/peak-tram-route.js';
import {PEAK_UPPER_STATION} from '../../../js/cities/hongkong/peak-upper-station-site.js';
import {hongKongTerrainHeight} from '../../../js/cities/hongkong/terrain.js';
import {fullRoadSurfaceAt} from '../../../js/cities/hongkong/full-meta.js';
import {solveProfile} from './peak-tram-profile.mjs';

const clearance=6.3, maxGrade=Math.tan(26*Math.PI/180);
const roadOver=new Set([720,8998,5701,36167,42840]), tramOver=new Set([13131,36109]);
function audit(branch){
 const route=peakTramRoute(branch),samples=[];let s=0, stationStart;
 for(let i=1;i<route.length;i++){
  if(route[i-1].id===PEAK_TRAM_NODES.n11.id) stationStart=s;
  const [x,z]=route[i-1].world,[X,Z]=route[i].world,d=Math.hypot(X-x,Z-z),n=Math.ceil(d/2);
  for(let j=0;j<n;j++){
   const px=x+(X-x)*j/n,pz=z+(Z-z)*j/n,target=hongKongTerrainHeight(px,pz),road=fullRoadSurfaceAt(px,pz,0,target);
   const p={s:s+d*j/n,target,roadId:road?.way.id??null};
   if(road && roadOver.has(p.roadId))p.max=road.height-clearance;
   if(road && tramOver.has(p.roadId))p.min=road.height+clearance;
   samples.push(p);
  }
  s+=d;
 }
 const [x,z]=route.at(-1).world;samples.push({s,target:hongKongTerrainHeight(x,z),roadId:null});
 // Match the existing flat upper-station rail stub, itself an estimated level.
 if(stationStart===undefined)throw new Error('upper station approach missing');
 for(const p of samples)if(p.s>=stationStart-1e-6){
  const y=PEAK_UPPER_STATION.trackY;
  if ((p.min??-Infinity)>y || (p.max??Infinity)<y) return {branch,feasible:false,reason:'upper station conflicts with sampled road bound',conflict:p};
  p.min=y;p.max=y;
 }
 const solved=solveProfile(samples,maxGrade);
 if(!solved.feasible)return {branch,feasible:false,conflict: samples[solved.conflictIndex]};
 let maxAbove=-Infinity,maxBelow=-Infinity,maxGradeObserved=0,gradeChange=0,previousGrade=null;
 let unknown=0,constrained=0;
 samples.forEach((p,i)=>{
  const h=solved.heights[i];maxAbove=Math.max(maxAbove,h-p.target);maxBelow=Math.max(maxBelow,p.target-h);
  if(p.roadId!==null&&!roadOver.has(p.roadId)&&!tramOver.has(p.roadId))unknown++;
  if(p.roadId!==null&&(roadOver.has(p.roadId)||tramOver.has(p.roadId)))constrained++;
  if(i){const g=(h-solved.heights[i-1])/(p.s-samples[i-1].s);maxGradeObserved=Math.max(maxGradeObserved,g);if(previousGrade!==null)gradeChange=Math.max(gradeChange,Math.abs(g-previousGrade));previousGrade=g;}
 });
 return {branch,feasible:true,samples:samples.length,constrainedSamples:constrained,unknownRoadSamples:unknown,lowerRail:solved.heights[0],upperRail:solved.heights.at(-1),maxAboveTerrain:maxAbove,maxBelowTerrain:maxBelow,maxGradeObserved,maxAdjacentGradeChange:gradeChange};
}
console.log(JSON.stringify({clearanceMetres:clearance,maxGrade,results:['A','B'].map(audit),limitations:['Experimental nearest-road sample constraints; not actual meshes, swept tram clearance, other road levels or continuous intersection tests.','Unknown crossing is unconstrained. Lower station height, grade transitions, earthworks, foundations, structures and access remain unresolved.','Greedy feasible profile is not smooth or a construction design. No runtime scene changes.']},null,2));
