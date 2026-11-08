// Input for the experimental joint profile. This is not a construction survey.
import {peakTramRoute,PEAK_TRAM_NODES} from '../../../js/cities/hongkong/peak-tram-route.js';
import {PEAK_UPPER_STATION} from '../../../js/cities/hongkong/peak-upper-station-site.js';
import {hongKongTerrainHeight} from '../../../js/cities/hongkong/terrain.js';
import {fullRoadSurfaceAt} from '../../../js/cities/hongkong/full-meta.js';
const roadOver=new Set([720,8998,5701,36167,42840]),tramOver=new Set([13131,36109]);
const samples={},routes={};
for(const branch of ['A','B']){
 const route=peakTramRoute(branch),keys=[];let s=0,station=false;
 const add=(key,x,z)=>{
  if(!samples[key]){
   const ground=hongKongTerrainHeight(x,z),road=fullRoadSurfaceAt(x,z,1.65,ground),p={x,z,ground};
   if(road){p.roadId=road.way.id;p.roadName=road.way.name;p.roadHeight=road.height;
    if(roadOver.has(p.roadId))p.max=road.height-6.3;
    else if(tramOver.has(p.roadId))p.min=road.height+6.3;
    else p.unknown=true;
   }
   samples[key]=p;
  }
  if(station){const p=samples[key],y=PEAK_UPPER_STATION.trackY;if((p.min??-Infinity)>y || (p.max??Infinity)<y)throw Error('station and road constraints conflict');p.min=y;p.max=y;}
  keys.push({key,s});
 };
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i];if(a.id===PEAK_TRAM_NODES.n11.id)station=true;
  const [x,z]=a.world,[X,Z]=b.world,d=Math.hypot(X-x,Z-z),steps=Math.ceil(d/2);
  for(let j=0;j<steps;j++){const t=j/steps;add(j===0?`n${a.id}`:`e${a.id}-${b.id}-${j}-${steps}`,x+(X-x)*t,z+(Z-z)*t);s+=d/steps;}
 }
 const last=route.at(-1);add(`n${last.id}`,...last.world);routes[branch]=keys;
}
console.log(JSON.stringify({samples,routes,maxGrade:Math.tan(26*Math.PI/180),clearance:6.3,stepMax:2}));
