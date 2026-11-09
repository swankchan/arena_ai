// Feasibility diagnostic, NOT a surveyed alignment or a runtime track.
// Road IDs here are indices in this checkout's full-road dataset, not OSM way IDs.
import { peakTramRoute } from '../../../js/cities/hongkong/peak-tram-route.js';
import { hongKongTerrainHeight } from '../../../js/cities/hongkong/terrain.js';
import { fullRoadSurfaceAt } from '../../../js/cities/hongkong/full-meta.js';

// 6.3 m is an explicitly provisional envelope: 5.5 m + 0.8 m structural allowance.
// It is not a measured headroom, and doesn't account for curved car overhang.
// Probe 2 m either side of the centreline for nearby road footprints, allowing for
// track width and a small precautionary margin. This is not a swept vehicle clearance.
const lateralProbeMetres=2;
const clearance=6.3, maxGrade=Math.tan(26*Math.PI/180);
const crossingKinds=new Map([[720,'road-over'],[13131,'tram-over'],[8998,'road-over'],[5701,'road-over'],[36167,'road-over'],[42840,'road-over'],[36109,'tram-over'],[39703,'unknown']]);
const route=peakTramRoute('A'), samples=[]; let s=0;
for(let i=1;i<route.length;i++){
 const [x,z]=route[i-1].world,[X,Z]=route[i].world,d=Math.hypot(X-x,Z-z),n=Math.ceil(d/2);
 for(let j=0;j<n;j++){
  const px=x+(X-x)*j/n,pz=z+(Z-z)*j/n,ground=hongKongTerrainHeight(px,pz),road=fullRoadSurfaceAt(px,pz,lateralProbeMetres,ground);
  samples.push({s:s+d*j/n,x:px,z:pz,ground,road});
 }s+=d;
}
const [x,z]=route.at(-1).world;samples.push({s,x,z,ground:hongKongTerrainHeight(x,z),road:fullRoadSurfaceAt(x,z,lateralProbeMetres,hongKongTerrainHeight(x,z))});
const groups=new Map();
for(const p of samples){
 if(!p.road)continue;const id=p.road.way.id;let g=groups.get(id);if(!g)groups.set(id,g={id,name:p.road.way.name,kind:crossingKinds.get(id)??'unknown',start:p.s,end:p.s,roadMin:p.road.height,roadMax:p.road.height,groundMin:p.ground,groundMax:p.ground,samples:0});
 g.start=Math.min(g.start,p.s);g.end=Math.max(g.end,p.s);g.roadMin=Math.min(g.roadMin,p.road.height);g.roadMax=Math.max(g.roadMax,p.road.height);g.groundMin=Math.min(g.groundMin,p.ground);g.groundMax=Math.max(g.groundMax,p.ground);g.samples++;
}
// The lower platform elevation is only a tentative game design choice, not a survey.
// At the first footprint intersection the present road must rise OR the assumed rail height must fall.
const lowerRail=samples[0].ground, firstRoad=samples[0].road;
const initialRoadDeficit=firstRoad ? Math.max(0,lowerRail+clearance-firstRoad.height):0;
console.log(JSON.stringify({branch:'A',stepMaxMetres:2,lateralProbeMetres,clearanceEnvelopeMetres:clearance,maximumGrade:maxGrade,lowerGroundMetres:lowerRail,firstRoadHeightMetres:firstRoad?.height??null,initialRoadDeficitMetres:initialRoadDeficit,intersections:[...groups.values()].sort((a,b)=>a.start-b.start),limitations:['Only horizontal footprint overlaps; no road structure or collider tested.','The initial terrain-based station height and clearance envelope are provisional.','Unknown pedestrian crossing has not been classified.','No active scene changes.']},null,2));
