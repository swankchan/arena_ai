import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {box,merged,nightAmount} from './harbour-city-world-utils.js';

// Visual asset only, not yet installed in the scene or a functional vehicle. The
// length is published; all other dimensions and small details are estimates.
// Local +X is the long axis, y=0 is rail top, and z=0 is track centre.
export const PEAK_TRAM_CAR=Object.freeze({length:33,width:2.7,height:3.65,gauge:1.524,doorsPerSide:4});
export function createPeakTramCar(){
 const g=new THREE.Group();g.name='Peak Tram sixth generation';
 const green=new THREE.MeshStandardMaterial({color:0x07543e,roughness:.36,metalness:.38});
 const dark=new THREE.MeshStandardMaterial({color:0x252b2b,roughness:.66,metalness:.25});
 const roof=new THREE.MeshStandardMaterial({color:0xc6c7be,roughness:.52,metalness:.24});
 const trim=new THREE.MeshStandardMaterial({color:0x827968,roughness:.45,metalness:.5});
 const glass=new THREE.MeshStandardMaterial({color:0x9bb5b0,roughness:.12,metalness:.14,transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide});
 const seat=new THREE.MeshStandardNodeMaterial({color:0x725440,roughness:.8});seat.emissiveNode=color(0x96633f).mul(nightAmount()).mul(.35);
 const lamp=new THREE.MeshStandardNodeMaterial({color:0xffe3ad,roughness:.4});lamp.emissiveNode=color(0xffc979).mul(nightAmount()).mul(1.6);
 const headlamp=new THREE.MeshStandardNodeMaterial({color:0xe9e5ce,roughness:.3});headlamp.emissiveNode=color(0xffddaa).mul(nightAmount()).mul(1.8);
 const body=[],under=[],roofParts=[],frame=[],panes=[],interior=[],seats=[],lights=[],bellows=[],headlights=[],roofGlass=[],wheels=[],lampRims=[];
 const half=PEAK_TRAM_CAR.length/2, w=PEAK_TRAM_CAR.width, ends=[[-half,-.2],[.2,half]];
 // Two sections, eight double doors total. Broad uninterrupted glazing is divided
 // by slim metal frames. Upper side panels are glass, not opaque green walls.
 for(const [start,end] of ends){
  const mid=(start+end)/2,len=end-start;
  box(under,[mid,.36,0],[len,.38,w-.10]);
  for(const bx of [start+3.0,end-3.0])for(const offset of [-.65,.65])for(const side of [-1,1]){
   const wheel=new THREE.CylinderGeometry(.27,.27,.12,20);wheel.rotateX(Math.PI/2);wheel.translate(bx+offset,.27,side*PEAK_TRAM_CAR.gauge/2);wheels.push(wheel);
  }
  box(interior,[mid,.65,0],[len,.20,w-.18]);
  for(const side of [-1,1]){
   const z=side*(w/2-.04);
   box(body,[mid,1.13,z],[len,.92,.09]);
   box(body,[mid,3.25,z],[len,.18,.10]);
   box(panes,[mid,2.32,z],[len-.12,1.72,.025]);
   for(let x=start+.35;x<end;x+=1.32)box(frame,[x,2.32,side*(w/2+.015)],[.055,1.75,.045]);
   box(frame,[mid,1.45,side*(w/2+.015)],[len,.055,.045]);
   // Two double-door sets per section on each side; closed in this static model.
   for(const fraction of [.25,.75]){
    const x=start+len*fraction;
    for(const dx of [-.78,.78])box(frame,[x+dx,2.13,side*(w/2+.10)],[.055,2.12,.06]);
    for(const y of [1.09,3.17])box(frame,[x,y,side*(w/2+.10)],[1.60,.055,.06]);
    box(body,[x,1.19,side*(w/2+.08)],[1.48,.43,.045]);
    for(const dx of [-.37,.37])box(panes,[x+dx,2.2,side*(w/2+.085)],[.68,1.45,.025]);
    box(frame,[x,2.16,side*(w/2+.11)],[.045,2.0,.035]);
   }
   // Side roof rails leave the centre free for large skylight panels.
   box(roofParts,[mid,3.43,side*.98],[len,.16,.72]);
   box(lights,[mid,3.24,side*.82],[len-.6,.045,.065]);
  }
  box(roofGlass,[mid,3.44,0],[len-.18,.08,1.18]);
  for(let x=start+.65;x<end;x+=1.32)box(frame,[x,3.50,0],[.065,.07,1.2]);
  // A simplified seated interior is visible through glass. Seat arrangement and
  // exact step heights are visual estimates, not a seating diagram.
  for(let x=start+.65;x<end-.4;x+=.72)for(const side of [-1,1]){
   box(seats,[x,1.03,side*.83],[.42,.12,.79]);
   box(seats,[x-.18,1.32,side*.83],[.09,.62,.79]);
  }
 }
 box(bellows,[0,1.85,0],[.40,2.9,w-.06]);
 for(let x=-.16;x<=.16;x+=.08)for(const side of [-1,1])box(frame,[x,1.95,side*(w/2-.02)],[.026,2.75,.035]);
 // End windows are separate from the lower green panels; cab details are estimated.
 for(const side of [-1,1]){
  const x=side*(half-.045);
  box(body,[x,1.15,0],[.09,.95,w]);
  box(body,[x,3.24,0],[.09,.18,w]);
  box(panes,[x,2.31,0],[.025,1.72,w-.18]);
  for(const z of [-1.27,-.47,.47,1.27])box(frame,[x+side*.05,2.31,z],[.045,1.78,.065]);
  box(under,[x,.51,0],[.15,.22,w]);
  for(const z of [-.48,0,.48]){
   const rim=new THREE.CylinderGeometry(.13,.13,.04,20);rim.rotateZ(Math.PI/2);rim.translate(x+side*.09,1.22,z);lampRims.push(rim);
   const disk=new THREE.CylinderGeometry(.09,.09,.055,20);disk.rotateZ(Math.PI/2);disk.translate(x+side*.12,1.22,z);headlights.push(disk);
  }
  for(const z of [-.98,.98]){const buffer=new THREE.CylinderGeometry(.20,.20,.13,20);buffer.rotateZ(Math.PI/2);buffer.translate(x+side*.13,.48,z);wheels.push(buffer);}
  box(under,[x+side*.16,.45,0],[.32,.23,.28]);
 }
 merged(g,wheels,dark,'Peak Tram steel wheels and buffers');merged(g,lampRims,trim,'Peak Tram lamp bezels',false);
 merged(g,under,dark,'Peak Tram chassis and end bumper');
 merged(g,interior,dark,'Peak Tram interior floor');merged(g,seats,seat,'Peak Tram seats',false);
 merged(g,body,green,'Peak Tram green body panels');merged(g,bellows,dark,'Peak Tram central gangway');
 merged(g,roofParts,roof,'Peak Tram pale roof');merged(g,roofGlass,glass,'Peak Tram roof glazing',false);
 merged(g,panes,glass,'Peak Tram panoramic glazing',false);merged(g,frame,trim,'Peak Tram window and door frames',false);
 merged(g,lights,lamp,'Peak Tram night interior lights',false);merged(g,headlights,headlamp,'Peak Tram end lights',false);
 return g;
}
