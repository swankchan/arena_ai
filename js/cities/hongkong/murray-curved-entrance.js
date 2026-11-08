import * as THREE from 'three/webgpu';
import {attribute} from 'three/tsl';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {MURRAY_WRAPPED_RAMP as W,murrayWrappedRampLocalHeight} from './murray-wrapped-ramp.js';
import {authoredLocalToWorld,authoredWorldToLocal} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {beam,merged,store,quad,meshStore} from './harbour-city-world-utils.js';

// Plan-directed curved exterior approach. The path, local DTM endpoint and
// elevations are estimates; the published drawing does not establish a survey.
const controls=[[-4.2,25.1],[-4.2,39],[-8,51],[0,52]],steps=64,halfWidth=W.halfWidth;
function bezier(t){const u=1-t;return [0,1].map(i=>u*u*u*controls[0][i]+3*u*u*t*controls[1][i]+3*u*t*t*controls[2][i]+t*t*t*controls[3][i]);}
function tangent(t){const u=1-t;return [0,1].map(i=>3*u*u*(controls[1][i]-controls[0][i])+6*u*t*(controls[2][i]-controls[1][i])+3*t*t*(controls[3][i]-controls[2][i]));}
function triangle(x,z,a,b,c){
 const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-10)return null;
 const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;
 return u>=-1e-7&&v>=-1e-7&&w>=-1e-7?u*a.y+v*b.y+w*c.y:null;
}
export function createMurrayCurvedEntrance(datum){
 const startY=murrayWrappedRampLocalHeight(...controls[0]),endWorld=authoredLocalToWorld(SITE,...controls[3]),endY=hongKongTerrainHeight(endWorld.x,endWorld.z)-datum+.04,stations=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,[x,z]=bezier(t),[dx,dz]=tangent(t),len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  const edge=side=>{const ex=x+nx*halfWidth*side,ez=z+nz*halfWidth*side,p=authoredLocalToWorld(SITE,ex,ez),ground=hongKongTerrainHeight(p.x,p.z)-datum;
   // Blend the final metres into the DTM on each side, not a raised floating step.
   const blend=Math.max(0,(t-.9)/.1),base=startY+(endY-startY)*t+.3*Math.sin(Math.PI*t);
   const edgeStart=murrayWrappedRampLocalHeight(controls[0][0]+nx*halfWidth*side,controls[0][1])??startY;
   const seamBlend=Math.max(0,1-t/.1),surface=base*(1-seamBlend)+edgeStart*seamBlend;
   return {x:ex,z:ez,y:Math.max(surface*(1-blend)+(ground+.04)*blend,ground+.025)};};
  stations.push([edge(1),edge(-1)]);
 }
 function heightAt(x,z){for(let i=0;i<steps;i++){const [a,b]=stations[i],[d,c]=stations[i+1];const y=triangle(x,z,a,b,c)??triangle(x,z,a,c,d);if(y!==null)return y;}return null;}
 return {stations,heightAt,groundHeightAt(x,z,current,ref){const p=authoredWorldToLocal(SITE,x,z),local=heightAt(p.x,p.z);if(local===null)return current;const y=datum+local;return ref>=y-.35&&ref<=y+2.5?y:current;}};
}
export function buildMurrayCurvedEntrance(root,datum,colliders){
 const curve=createMurrayCurvedEntrance(datum),floor=store(),panels=store(),handrails=[],seams=[];
 const mat=new THREE.MeshStandardNodeMaterial({roughness:.86,side:THREE.DoubleSide});mat.colorNode=attribute('color');
 const metal=new THREE.MeshStandardMaterial({color:0x918064,metalness:.6,roughness:.4});
 for(let i=0;i<steps;i++){
  const [a,b]=curve.stations[i],[d,c]=curve.stations[i+1],p=v=>[v.x,v.y,v.z];
  quad(floor,p(a),p(b),p(c),p(d),[.36,.36,.345]);
  if(i%4===0)beam(seams,[a.x,a.y+.01,a.z],[b.x,b.y+.01,b.z],.018,.018);
  for(let side=0;side<2;side++){
   const v=curve.stations[i][side],q=curve.stations[i+1][side],dx=q.x-v.x,dz=q.z-v.z,length=Math.hypot(dx,dz);
   quad(panels,[v.x,v.y-.15,v.z],[q.x,q.y-.15,q.z],[q.x,q.y+.95,q.z],[v.x,v.y+.95,v.z],[.57,.58,.55]);
   beam(handrails,[v.x,v.y+.98,v.z],[q.x,q.y+.98,q.z],.05,.05);
   colliders.push(harbourCityLocalCollider(SITE,(v.x+q.x)/2,(v.z+q.z)/2,length+.01,.1,datum+Math.min(v.y,q.y)-.15,datum+Math.max(v.y,q.y)+1.05,SITE.ry+Math.atan2(-dz,dx)));
  }
 }
 meshStore(root,floor,mat,'The Murray curved ramp entrance paving',false);meshStore(root,panels,mat,'The Murray curved ramp entrance parapets',false);
 merged(root,handrails,metal,'The Murray curved ramp entrance handrails',false);merged(root,seams,metal,'The Murray curved ramp entrance paving joints',false);
 return curve;
}
