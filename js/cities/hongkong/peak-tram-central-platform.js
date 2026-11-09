import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {CENTRAL_PLATFORM_POINTS as P,CENTRAL_PLATFORM_HALF_WIDTH as W} from './peak-tram-central-platform-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {fullRoadSurfaceAt} from './full-meta.js';
import {beam,merged,store,quad,meshStore,nightAmount} from './harbour-city-world-utils.js';
// Estimated platforms and rails, not an engineering drawing or complete station.
export function buildPeakTramCentralPlatform(scene){
 const group=new THREE.Group();group.name='Peak Tram Central boarding platforms';scene.add(group);
 const rail=[],ties=[],lights=[],posts=[],bed=store(),platform=store(),marking=store(),wall=store();
 for(let i=1;i<P.length;i++){
  const a=P[i-1],b=P[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,at=(p,o,h)=>[p.x+nx*o,p.y+h,p.z+nz*o];
  for(let o of [-.762,.762])beam(rail,at(a,o,0),at(b,o,0),.075,.075);
  for(let j=0,n=Math.ceil(len/.7);j<n;j++){let t=j/n,p={x:a.x+dx*t,z:a.z+dz*t,y:a.y+(b.y-a.y)*t};beam(ties,at(p,-1.08,-.11),at(p,1.08,-.11),.12,.13);}
  quad(bed,at(a,-1.65,-.28),at(b,-1.65,-.28),at(b,1.65,-.28),at(a,1.65,-.28),[.28,.29,.28]);
  for(const side of [-1,1]){
   const inner=side*1.65,outer=side*W,edge=side*1.87;
   quad(platform,at(a,inner,.57),at(b,inner,.57),at(b,outer,.57),at(a,outer,.57),[.46,.47,.45]);
   quad(wall,at(a,inner,-.28),at(b,inner,-.28),at(b,inner,.57),at(a,inner,.57),[.35,.36,.34]);
   quad(marking,at(a,edge,.59),at(b,edge,.59),at(b,edge+side*.12,.59),at(a,edge+side*.12,.59),[.82,.65,.21]);
   // A side face follows the existing terrain but is stopped below any road
   // above it; the side face is not a tunnel or bridge support.
   const A=at(a,outer,.57),B=at(b,outer,.57),top=p=>{const terrain=hongKongTerrainHeight(p[0],p[2])-.08,road=fullRoadSurfaceAt(p[0],p[2],.5,terrain);return Math.max(p[1],Math.min(terrain,road?road.height-.65:Infinity));};
   let ya=top(A),yb=top(B);if(ya>A[1]||yb>B[1])quad(wall,A,B,[B[0],yb,B[2]],[A[0],ya,A[2]],[.35,.37,.36]);
   if(i%3===0){beam(lights,at(a,side*(W-.12),2.35),at(b,side*(W-.12),2.35),.05,.07);}
  }
 }
 // Close the cut ends against the surrounding hillside. Keep a narrow opening
 // at the uphill end for the as-yet unbuilt continuation; no collider wall.
 for(const [p,uphill] of [[P[0],false],[P.at(-1),true]]){
  const q=uphill?P.at(-2):P[1],dx=(uphill?p.x-q.x:q.x-p.x),dz=(uphill?p.z-q.z:q.z-p.z),l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l;
  for(let o=-W;o<W;o+=.35){let n=Math.min(W,o+.35);if(uphill&&o<1.65&&n> -1.65)continue;
   const point=(v)=>[p.x+nx*v,p.y+(Math.abs(v)<1.65?-.28:.57),p.z+nz*v],a=point(o),b=point(n),top=v=>{let t=hongKongTerrainHeight(v[0],v[2])-.08,r=fullRoadSurfaceAt(v[0],v[2],.5,t);return Math.max(v[1],Math.min(t,r?r.height-.65:Infinity));},A=top(a),B=top(b);
   if(A>a[1]||B>b[1])quad(wall,a,b,[b[0],B,b[2]],[a[0],A,a[2]],[.35,.37,.36]);
  }
 }
 const metal=new THREE.MeshStandardMaterial({color:0x969b96,roughness:.38,metalness:.65}),wood=new THREE.MeshStandardMaterial({color:0x555149,roughness:.9}),stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,side:THREE.DoubleSide});
 const lamp=new THREE.MeshStandardNodeMaterial({color:0xf3e0bf});lamp.emissiveNode=color(0xffd18b).mul(nightAmount()).mul(1.3);
 merged(group,rail,metal,'Central platform twin rails');merged(group,ties,wood,'Central platform sleepers');meshStore(group,bed,stone,'Central platform track bed');meshStore(group,platform,stone,'Central boarding and alighting platforms');meshStore(group,marking,stone,'Central platform yellow edge');meshStore(group,wall,stone,'Central platform terrain retaining faces');merged(group,lights,lamp,'Central platform linear night lights',false);
 return {group,colliders:[],stats:{peakTramCentralPlatformLength:P.at(-1).s,peakTramCentralPlatformSections:P.length-1}};
}
