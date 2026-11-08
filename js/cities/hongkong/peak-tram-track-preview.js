// Diagnostic 3D track geometry only: not installed in the active game.
// The underlying elevations are a constrained approximation, NOT a survey.
import * as THREE from 'three/webgpu';
import {beam,merged,store,quad,meshStore} from './harbour-city-world-utils.js';
import {PEAK_TRAM_PROFILE} from './peak-tram-profile-data.js';
export function buildPeakTramTrackPreview(profile=PEAK_TRAM_PROFILE){
 const root=new THREE.Group();root.name='Peak Tram full track experimental preview';
 const rail=[],sleepers=[],bed=store(),seen=new Set();let segments=0;
 for(const branch of ['A','B']){
  const route=profile.routes[branch];
  for(let i=1;i<route.length;i++){
   const a=route[i-1],b=route[i],key=`${a.id}/${b.id}`;if(seen.has(key))continue;seen.add(key);
   const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<1e-6)continue;
   const nx=-dz/len,nz=dx/len;
   for(const sign of [-1,1]){
    const off=sign*.762;
    beam(rail,[a.x+nx*off,a.y,a.z+nz*off],[b.x+nx*off,b.y,b.z+nz*off],.075,.075);
   }
   for(let j=0,n=Math.max(1,Math.ceil(len/.75));j<n;j++){
    const t=j/n,x=a.x+dx*t,z=a.z+dz*t,y=a.y+(b.y-a.y)*t-.10;
    beam(sleepers,[x-nx*1.05,y,z-nz*1.05],[x+nx*1.05,y,z+nz*1.05],.13,.12);
   }
   quad(bed,[a.x-nx*1.35,a.y-.18,a.z-nz*1.35],[b.x-nx*1.35,b.y-.18,b.z-nz*1.35],[b.x+nx*1.35,b.y-.18,b.z+nz*1.35],[a.x+nx*1.35,a.y-.18,a.z+nz*1.35],[.28,.29,.27]);
   segments++;
  }
 }
 const steel=new THREE.MeshStandardMaterial({color:0x8b8c80,metalness:.65,roughness:.42}),wood=new THREE.MeshStandardMaterial({color:0x514a3f,roughness:.92}),stone=new THREE.MeshStandardMaterial({vertexColors:true,color:0xffffff,roughness:1,side:THREE.DoubleSide});
 merged(root,rail,steel,'Peak Tram preview paired rails');merged(root,sleepers,wood,'Peak Tram preview sleepers');meshStore(root,bed,stone,'Peak Tram preview track bed');
 return {group:root,segments,branchSamples:{A:profile.routes.A.length,B:profile.routes.B.length}};
}
