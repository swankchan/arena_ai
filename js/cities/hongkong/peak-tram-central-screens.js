import * as THREE from 'three/webgpu';
import {centralPlatformPoint as point, CENTRAL_PLATFORM_END as END} from './peak-tram-central-platform-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {store, quad, meshStore, beam, merged} from './harbour-city-world-utils.js';

// Provisional platform-edge glazing: these are NOT operating screen doors.
// Four 1.7m closed gate bays are distributed along each platform using the visual car's
// nominal four doors per side. Neither train docking nor dimensions are surveyed.
export const CENTRAL_SCREEN_OPENING_WIDTH = 1.7;
export const CENTRAL_SCREEN_OPENINGS = Object.freeze([1,3,5,7].map(n => END*n/8));
export function centralScreenIsOpening(s) {
  return CENTRAL_SCREEN_OPENINGS.some(c => Math.abs(s-c) < CENTRAL_SCREEN_OPENING_WIDTH/2);
}
export function buildCentralPlatformScreens(scene) {
  const group = new THREE.Group(); group.name = 'Central inferred platform edge glazing'; scene.add(group);
  const glass = store(), gates = store(), frames = [], colliders = [];
  const at = (s,side,h) => {const p=point(s);return [p.x+p.nx*side*1.72,p.y+.57+h,p.z+p.nz*side*1.72];};
  const breaks = [0,END];
  for(const c of CENTRAL_SCREEN_OPENINGS) breaks.push(c-CENTRAL_SCREEN_OPENING_WIDTH/2,c+CENTRAL_SCREEN_OPENING_WIDTH/2);
  for(let s=0;s<END;s+=.5) breaks.push(s);
  breaks.sort((a,b)=>a-b);
  for(const side of [-1,1]) for(let i=0;i+1<breaks.length;i++){
    const a=breaks[i],b=breaks[i+1]; if(b-a<1e-6) continue;
    const lowA=at(a,side,.08),lowB=at(b,side,.08),topA=at(a,side,2.12),topB=at(b,side,2.12);
    beam(frames,at(a,side,2.18),at(b,side,2.18),.055,.055);
    const gate=centralScreenIsOpening((a+b)/2);
    quad(gate?gates:glass,lowA,lowB,topB,topA,gate?[.46,.57,.56]:[.56,.66,.65]);
    const dx=lowB[0]-lowA[0],dz=lowB[2]-lowA[2],site={x:(lowA[0]+lowB[0])/2,z:(lowA[2]+lowB[2])/2,ry:Math.atan2(-dz,dx)};
    colliders.push(harbourCityLocalCollider(site,0,0,Math.hypot(dx,dz),.08,Math.min(lowA[1],lowB[1])-.1,Math.max(topA[1],topB[1])));
  }
  for(const side of [-1,1]){
    for(const s of [0,END,...CENTRAL_SCREEN_OPENINGS.flatMap(c=>[c-CENTRAL_SCREEN_OPENING_WIDTH/2,c+CENTRAL_SCREEN_OPENING_WIDTH/2])])beam(frames,at(s,side,.02),at(s,side,2.22),.075,.075);
  }
  const material=new THREE.MeshStandardMaterial({vertexColors:true,color:0xd3e2df,transparent:true,opacity:.42,roughness:.22,metalness:.12,side:THREE.DoubleSide,depthWrite:false});
  meshStore(group,glass,material,'Central platform fixed glass screens',false);
  meshStore(group,gates,material,'Central platform closed placeholder gates',false);
  merged(group,frames,new THREE.MeshStandardMaterial({color:0x666f6d,metalness:.55,roughness:.4}),'Central platform screen frames',false);
  return {group,colliders,stats:{peakTramCentralEstimatedScreenOpenings:CENTRAL_SCREEN_OPENINGS.length*2}};
}
