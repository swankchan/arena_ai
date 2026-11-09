// Comparative geometry diagnostic only. No route, lift or structural design is
// implied; the paths cross unsurveyed buildings/terrain and are not playable.
import {ST_JOHNS_SITE} from '../../../js/cities/hongkong/st-johns-building-site.js';
import {authoredLocalToWorld} from '../../../js/cities/hongkong/authored-landmark-site.js';
import {centralEntranceGround} from '../../../js/cities/hongkong/peak-tram-central-entrance.js';
import {centralPlatformPoint} from '../../../js/cities/hongkong/peak-tram-central-platform-site.js';
import {hongKongTerrainHeight} from '../../../js/cities/hongkong/terrain.js';
import {fullRoadSurfaceAt} from '../../../js/cities/hongkong/full-meta.js';

const entry=authoredLocalToWorld(ST_JOHNS_SITE,6.7,2), platform=centralPlatformPoint(0);
const end={x:platform.x+platform.nx*3.3,z:platform.z+platform.nz*3.3,y:platform.y+.57};
const start={x:entry.x,z:entry.z,y:centralEntranceGround(6.7,2)+.045};
const dx=end.x-start.x,dz=end.z-start.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
function sample(drop){
 let min=Infinity,worst=null,covered=0,conflicts=0;
 for(let s=0;s<=length;s+=.5)for(let off=-2;off<=2;off+=.5){
  const t=s/length,x=start.x+dx*t+nx*off,z=start.z+dz*t+nz*off,y=start.y-drop+(end.y-start.y+drop)*t;
  const r=fullRoadSurfaceAt(x,z,.35,hongKongTerrainHeight(x,z));if(!r)continue;
  covered++;let clearance=r.height-y;if(clearance<min){min=clearance;worst={s,offset:off,road:r.way.id,roadHeight:r.height,floor:y};}if(clearance<3.4)conflicts++;
 }
 return {initialDrop:drop,gradient:(end.y-start.y+drop)/length,roadSamples:covered,samplesBelow3_4m:conflicts,minRoadAboveFloor:min,worst};
}
console.log(JSON.stringify({units:'metres',length,start,end,straight:sample(0),withHypotheticalLift:sample(2),limitations:'Discrete road-height samples only; road deck thickness, all buildings, underground structures, walls, actual lift access, and accessibility compliance are not verified.'},null,2));
