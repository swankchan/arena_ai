import * as THREE from 'three/webgpu';
import {PEAK_TOWER_SITE as SITE, PEAK_TOWER_BASE as BASE} from './peak-tower-architecture.js';
import {PEAK_UPPER_STATION as STATION} from './peak-upper-station-site.js';
import {authoredLocalToWorld,authoredWorldToLocal} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,beam,merged,store,quad,meshStore} from './harbour-city-world-utils.js';

// Approximate access bridge and a short concourse, not a surveyed design or a complete station interior.
export const PEAK_STATION_ACCESS=Object.freeze({doorMin:13.6,doorMax:16.4,doorZ:9.45,roomX0:10,roomX1:18,roomZ0:2,roomZ1:9.65,bridgeX0:STATION.x1,bridgeX1:50.2,bridgeZ0:9.7,bridgeZ1:11.65});
const A=PEAK_STATION_ACCESS;
const end=authoredLocalToWorld(SITE,A.bridgeX1,(A.bridgeZ0+A.bridgeZ1)/2);
export const PEAK_STATION_BRIDGE_END=hongKongTerrainHeight(end.x,end.z);
export function peakStationBridgeHeight(x){let t=Math.max(0,Math.min(1,(x-A.bridgeX0)/(A.bridgeX1-A.bridgeX0)));return BASE+(PEAK_STATION_BRIDGE_END-BASE)*t;}
export function peakStationAccessGroundHeight(x,z,current,referenceY){
 const p=authoredWorldToLocal(SITE,x,z);let y;
 if(p.x>=A.roomX0&&p.x<=A.roomX1&&p.z>=A.roomZ0&&p.z<=A.roomZ1)y=BASE;
 else if(p.x>=A.bridgeX0&&p.x<=A.bridgeX1&&p.z>=A.bridgeZ0&&p.z<=A.bridgeZ1)y=peakStationBridgeHeight(p.x);
 else return current;
 return Math.abs(referenceY-y)<2 ? y : current;
}
export function buildPeakStationAccess(root,colliders){
 const floor=[],ceiling=[],walls=[],frames=[],stripes=[],bridge=store(),skirt=store(),handrails=[];
 const tile=new THREE.MeshStandardMaterial({color:0x777c76,roughness:.76}),wall=new THREE.MeshStandardMaterial({color:0x8f9690,roughness:.72}),metal=new THREE.MeshStandardMaterial({color:0x8f9c9a,roughness:.42,metalness:.55}),black=new THREE.MeshStandardMaterial({color:0x28393a,roughness:.7});
 box(floor,[(A.roomX0+A.roomX1)/2,-.12,(A.roomZ0+A.roomZ1)/2],[A.roomX1-A.roomX0,.24,A.roomZ1-A.roomZ0]);
 box(ceiling,[(A.roomX0+A.roomX1)/2,4.1,(A.roomZ0+A.roomZ1)/2],[A.roomX1-A.roomX0,.2,A.roomZ1-A.roomZ0]);
 for(const x of [A.roomX0,A.roomX1]){
  box(walls,[x,2,(A.roomZ0+A.roomZ1)/2],[.18,4,A.roomZ1-A.roomZ0]);
  colliders.push(harbourCityLocalCollider(SITE,x,(A.roomZ0+A.roomZ1)/2,.18,A.roomZ1-A.roomZ0,BASE-.2,BASE+4));
 }
 box(walls,[(A.roomX0+A.roomX1)/2,2,A.roomZ0],[A.roomX1-A.roomX0,4,.18]);
 colliders.push(harbourCityLocalCollider(SITE,(A.roomX0+A.roomX1)/2,A.roomZ0,A.roomX1-A.roomX0,.18,BASE-.2,BASE+4));
 // Stripe treatment and a simple bilingual station sign, avoiding the centre path.
 for(let z=A.roomZ0+.8;z<A.roomZ1;z+=1.2)box(stripes,[A.roomX0+.25,.015,z],[.07,.03,.55]);
 box(frames,[(A.doorMin+A.doorMax)/2,3.75,A.doorZ],[A.doorMax-A.doorMin,.12,.12]);
 for(const x of [A.doorMin,A.doorMax])box(frames,[x,1.85,A.doorZ],[.12,3.7,.12]);
 // A short sloped bridge meets existing DTM beyond the track-end. It is a gameplay approximation;
 // it does not assert the real pedestrian entrance is here.
 for(let x=A.bridgeX0;x<A.bridgeX1;x+=.5){
  let xx=Math.min(x+.5,A.bridgeX1),y=peakStationBridgeHeight(x)-BASE,yy=peakStationBridgeHeight(xx)-BASE;
  quad(bridge,[x,y,A.bridgeZ0],[xx,yy,A.bridgeZ0],[xx,yy,A.bridgeZ1],[x,y,A.bridgeZ1],[.43,.45,.42]);
  for(const z of [A.bridgeZ0,A.bridgeZ1]){const p=authoredLocalToWorld(SITE,x,z),q=authoredLocalToWorld(SITE,xx,z),h=hongKongTerrainHeight(p.x,p.z)-BASE,k=hongKongTerrainHeight(q.x,q.z)-BASE;quad(skirt,[x,h,z],[xx,k,z],[xx,yy-.1,z],[x,y-.1,z],[.36,.38,.36]);beam(handrails,[x,y+1,z],[xx,yy+1,z],.06,.06);}
 }
 for(const z of [A.bridgeZ0,A.bridgeZ1]){
  for(let x=A.bridgeX0;x<A.bridgeX1;x+=2)box(handrails,[x,peakStationBridgeHeight(x)-BASE+.5,z],[.07,1,.07]);
  // Small independent sections follow the slope; collider elevation is local to each section.
  for(let x=A.bridgeX0;x<A.bridgeX1;x+=2){let endX=Math.min(x+2,A.bridgeX1),lo=Math.min(peakStationBridgeHeight(x),peakStationBridgeHeight(endX)),hi=Math.max(peakStationBridgeHeight(x),peakStationBridgeHeight(endX));colliders.push(harbourCityLocalCollider(SITE,(x+endX)/2,z,endX-x,.08,lo-.1,hi+1));}
 }
 merged(root,floor,tile,'Peak Tram upper concourse floor');merged(root,ceiling,wall,'Peak Tram upper concourse ceiling');merged(root,walls,wall,'Peak Tram upper concourse walls');merged(root,frames,metal,'Peak Tram upper concourse doorway frame');merged(root,stripes,black,'Peak Tram upper concourse floor strips',false);
 meshStore(root,bridge,tile,'Peak Tram upper station access bridge');meshStore(root,skirt,wall,'Peak Tram upper station access bridge sides');merged(root,handrails,metal,'Peak Tram upper station bridge railings',false);
 return {bridgeEnd:PEAK_STATION_BRIDGE_END};
}
