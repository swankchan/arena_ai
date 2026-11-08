import { projectHongKongLonLat } from './authored-landmark-site.js';
// OSM ways 148784104 v12, 963983432 v1 and 148858993 v2; © OSM contributors, ODbL.
// Deck and stair elevations/widths are photo- and vehicle-clearance estimates, not surveyed.
export const OBRIEN_SOURCE = Object.freeze({way:148784104,version:12,stair:148858993,stairVersion:2,link:963983432});
const ll = ([lat,lon]) => {const [x,z]=projectHongKongLonLat(lon,lat);return Object.freeze({x,z});};
export const OBRIEN_ROUTE = Object.freeze([
 [22.2773724,114.1732880],[22.2774447,114.1733117],[22.2779227,114.1732572],
 [22.2779536,114.1732532],[22.2783235,114.1732104],[22.2784753,114.1731911],
 [22.2785363,114.1731837],[22.2786983,114.1731642],[22.2790857,114.1731193],
 [22.2795153,114.1730680],[22.2795255,114.1730669],[22.2795369,114.1730657],
 [22.2795540,114.1730635],[22.2796098,114.1730563]
].map(ll));
export const OBRIEN_STAIR = Object.freeze({bottom:ll([22.2790600,114.1728600]),top:ll([22.2790825,114.1730874]),junction:OBRIEN_ROUTE[8]});
// OSM 242379504 reaches the A5 escalator head (963983632), © OSM contributors.
// The lower escalator/concourse level is not mapped here.
export const WANCHAI_A5_APPROACH=Object.freeze({start:OBRIEN_ROUTE[0],end:ll([22.2772878,114.1732936]),escalatorEnd:ll([22.2772036,114.1733047]),way:242379504,escalatorWay:963983632});
// Wider landing then a right-shifted 4.8 m strip beside the street stair.
const a5dx=WANCHAI_A5_APPROACH.end.x-WANCHAI_A5_APPROACH.start.x,a5dz=WANCHAI_A5_APPROACH.end.z-WANCHAI_A5_APPROACH.start.z,a5len=Math.hypot(a5dx,a5dz),a5nx=-a5dz/a5len,a5nz=a5dx/a5len;
export const WANCHAI_A5_DECK=Object.freeze({split:Object.freeze({x:WANCHAI_A5_APPROACH.start.x+a5dx*.35,z:WANCHAI_A5_APPROACH.start.z+a5dz*.35}),
 shiftedSplit:Object.freeze({x:WANCHAI_A5_APPROACH.start.x+a5dx*.35-a5nx*1.2,z:WANCHAI_A5_APPROACH.start.z+a5dz*.35-a5nz*1.2}),
 shiftedEnd:Object.freeze({x:WANCHAI_A5_APPROACH.end.x-a5nx*1.2,z:WANCHAI_A5_APPROACH.end.z-a5nz*1.2}),width:4.8});
// Side steps OSM 963983633: from bridge to street; heights estimated from DTM.
export const WANCHAI_A5_STAIR=Object.freeze({top:ll([22.2773427,114.1732588]),bottom:ll([22.2771649,114.1732803]),width:2.4,way:963983633});
// OSM bridge 40491215, Immigration Tower to Central Plaza, © OSM contributors.
export const CENTRAL_PLAZA_LINK=Object.freeze({
 start:ll([22.2797060,114.1732482]),end:ll([22.2798124,114.1734042]),
 inside:ll([22.2798209,114.1734184]), width:4.8, way:40491215
});
export const IMMIGRATION_LOBBY_LINK=Object.freeze({
 start:ll([22.2796402,114.1731427]),end:CENTRAL_PLAZA_LINK.start,width:4.8,way:364266386
});
export const OBRIEN_DECK_HEIGHT = 12.5, OBRIEN_WIDTH=7.2, OBRIEN_SLAB=.55, OBRIEN_STAIR_WIDTH=2.4;
export function segmentProjection(p,a,b) {
 const dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len2));
 return {t,distance:Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)};
}
// Returns deck/stair surface only near that layer; users on the road underneath
// do not snap upstairs. Stairs interpolate from the local terrain-height datum.
export function obrienFootbridgeGroundHeight(x,z,current,referenceY,stairBottomHeight,a5BottomHeight){
 const p={x,z},a5q=segmentProjection(p,WANCHAI_A5_STAIR.bottom,WANCHAI_A5_STAIR.top);
 if(a5q.distance<=WANCHAI_A5_STAIR.width/2){const y=a5BottomHeight+(OBRIEN_DECK_HEIGHT-a5BottomHeight)*a5q.t;
  if(referenceY>=y-.8&&referenceY<=y+2.5)return y;
 }
 const q=segmentProjection(p,OBRIEN_STAIR.bottom,OBRIEN_STAIR.top);
 if(q.distance<=OBRIEN_STAIR_WIDTH/2){const y=stairBottomHeight+(OBRIEN_DECK_HEIGHT-stairBottomHeight)*q.t;
  if(referenceY>=y-.8 && referenceY<=y+2.5)return y;
 }
 const segments=[...OBRIEN_ROUTE.slice(0,-1).map((a,i)=>[a,OBRIEN_ROUTE[i+1]]),[OBRIEN_STAIR.top,OBRIEN_STAIR.junction],[WANCHAI_A5_APPROACH.start,WANCHAI_A5_DECK.split]];
 if(referenceY>=OBRIEN_DECK_HEIGHT-.8 && referenceY<=OBRIEN_DECK_HEIGHT+2.5){
  if(segments.some(([a,b])=>segmentProjection(p,a,b).distance<=OBRIEN_WIDTH/2))return OBRIEN_DECK_HEIGHT;
  if(segmentProjection(p,WANCHAI_A5_DECK.shiftedSplit,WANCHAI_A5_DECK.shiftedEnd).distance<=WANCHAI_A5_DECK.width/2)return OBRIEN_DECK_HEIGHT;
  for(const [a,b] of [[IMMIGRATION_LOBBY_LINK.start,IMMIGRATION_LOBBY_LINK.end],[CENTRAL_PLAZA_LINK.start,CENTRAL_PLAZA_LINK.end],[CENTRAL_PLAZA_LINK.end,CENTRAL_PLAZA_LINK.inside]])
   if(segmentProjection(p,a,b).distance<=CENTRAL_PLAZA_LINK.width/2)return OBRIEN_DECK_HEIGHT;
 }
 return current;
}

// The generic 9.6 m street-lamp model rises through this bridge. Check its
// pole and arm footprint with a conservative head margin, not just the base.
// Only applied to surveyed city lamps, not synthetic caller-provided lamps.
export function obrienLampConflicts(x,z,heading,arms){
 if(x<1350||x>1440||z<245||z>530)return false;
 const segments=[...OBRIEN_ROUTE.slice(0,-1).map((a,i)=>[a,OBRIEN_ROUTE[i+1],OBRIEN_WIDTH/2]),[OBRIEN_STAIR.top,OBRIEN_STAIR.junction,OBRIEN_STAIR_WIDTH/2],[OBRIEN_STAIR.bottom,OBRIEN_STAIR.top,OBRIEN_STAIR_WIDTH/2],[WANCHAI_A5_APPROACH.start,WANCHAI_A5_APPROACH.end,OBRIEN_WIDTH/2],[WANCHAI_A5_STAIR.bottom,WANCHAI_A5_STAIR.top,WANCHAI_A5_STAIR.width/2]];
 for(let arm=0;arm<arms;arm++)for(let j=0;j<=10;j++){
  const d=j*.25,h=heading+arm*Math.PI,p={x:x+Math.sin(h)*d,z:z+Math.cos(h)*d};
  if(segments.some(([a,b,w])=>segmentProjection(p,a,b).distance<w+.2))return true;
 }
 return false;
}
