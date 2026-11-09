import {centralTrialDocking} from '../../../js/cities/hongkong/peak-tram-central-docking.js';
import {PEAK_TRAM_CAR, PEAK_TRAM_DOOR_OFFSETS} from '../../../js/cities/hongkong/peak-tram-car.js';
import {centralPlatformPoint, centralPlatformFloor, CENTRAL_PLATFORM_END} from '../../../js/cities/hongkong/peak-tram-central-platform-site.js';
import {fullRoadSurfaceAt} from '../../../js/cities/hongkong/full-meta.js';
import {hongKongTerrainHeight} from '../../../js/cities/hongkong/terrain.js';
import {centralRoofVertex} from '../../../js/cities/hongkong/peak-tram-central-roof.js';

// A conservative diagnostic for the stationary *visual* car and inferred platform,
// not a train simulation, accessibility assessment or continuous swept envelope.
export function checkCentralDocking() {
 const {pose,measuredLength,doorStations}=centralTrialDocking(),a=centralPlatformPoint(0),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch),cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw);
 const world=(x,y,z)=>{const u=x*cp-y*sp;return {x:pose.position.x+cy*u+sy*z,y:pose.position.y+x*sp+y*cp,z:pose.position.z-sy*u+cy*z};};
 const toStation=p=>{const x=p.x-a.x,z=p.z-a.z;return {s:x*a.ux+z*a.uz,o:x*a.nx+z*a.nz};};
 // The visual floor box is centred at .65 and has thickness .20: its top is .75.
 const thresholds=PEAK_TRAM_DOOR_OFFSETS.map(x=>{const w=world(x,.75,PEAK_TRAM_CAR.width/2),q=toStation(w),floor=centralPlatformFloor(q.s,1.65);return {station:q.s,visualFloorAbovePlatform:w.y-floor,nominalHorizontalGap:1.72-Math.abs(q.o)};});
 let minRoofClearance=Infinity,roofSamples=0;
 for(let i=0;i<=330;i++)for(const z of [-PEAK_TRAM_CAR.width/2,0,PEAK_TRAM_CAR.width/2]){
  const w=world(-PEAK_TRAM_CAR.length/2+i*.1,PEAK_TRAM_CAR.height,z),q=toStation(w);if(q.s<0||q.s>CENTRAL_PLATFORM_END)continue;
  minRoofClearance=Math.min(minRoofClearance,centralRoofVertex(q.s,q.o).y-w.y);roofSamples++;
 }
 // A hypothetical single flat-in-car-frame platform would remove this model's
 // step, but can reduce headroom under the existing fitted roof. It is not applied.
 const centreAlong=(pose.position.x-a.x)*a.ux+(pose.position.z-a.z)*a.uz;
 let minTrialHeadroom=Infinity,minTrialRoadGap=Infinity,trialSamples=0;
 for(let s=0;s<=CENTRAL_PLATFORM_END;s+=.25)for(const offset of [-4.75,-3,-1.8,1.8,3,4.75]){
  const p=centralPlatformPoint(s),floor=pose.position.y+(s-centreAlong)*Math.tan(pose.pitch)+.75/cp;
  minTrialHeadroom=Math.min(minTrialHeadroom,centralRoofVertex(s,offset).y-floor);
  const x=p.x+p.nx*offset,z=p.z+p.nz*offset,r=fullRoadSurfaceAt(x,z,.35,hongKongTerrainHeight(x,z));
  if(r)minTrialRoadGap=Math.min(minTrialRoadGap,r.height-floor);
  trialSamples++;
 }
 return {measuredLength,doorStations,thresholds,minRoofClearance,roofSamples,trialLevelFloor:{minTrialHeadroom,minTrialRoadGap,trialSamples}};
}
if (process.argv[1] && import.meta.url===new URL(`file://${process.argv[1]}`).href) console.log(JSON.stringify(checkCentralDocking(),null,2));
