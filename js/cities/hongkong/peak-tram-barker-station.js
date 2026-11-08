import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {beam,box,merged,quad,store,meshStore,nightAmount} from './harbour-city-world-utils.js';
import {barkerStationTrackPoint as point} from './peak-tram-barker-station-track-site.js';
import {hongKongTerrainHeight} from './terrain.js';

// Photo-directed scene fit, not an architectural survey. The station has a
// level roof over the sloping track and a stepped platform on one side.
export const BARKER_STATION_START=1076, BARKER_STATION_END=1093;
const at=(p,o,y)=>[p.x+p.nx*o,y,p.z+p.nz*o];
export function buildBarkerRoadStation(scene){
 const group=new THREE.Group();group.name='Barker Road Peak Tram station';scene.add(group);
 const a=point(BARKER_STATION_START),b=point(BARKER_STATION_END),roofY=b.y+4.55;
 const roof=store(),steps=store(),riser=store(),stripe=store(),facings=store(),columns=[],trim=[],iron=[],lamps=[],colliders=[];
 const lightStone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.89,side:THREE.DoubleSide});
 const plaster=new THREE.MeshStandardMaterial({color:0xb9b9a4,roughness:.86});
 const dark=new THREE.MeshStandardMaterial({color:0x29302c,metalness:.55,roughness:.55});
 const warm=new THREE.MeshStandardNodeMaterial({color:0xe9d8af});warm.emissiveNode=color(0xffc87c).mul(nightAmount()).mul(1.25);
 // Flat slab with a narrow contrasting fascia and soffit.
 quad(roof,at(a,-2.25,roofY),at(b,-2.25,roofY),at(b,4.75,roofY),at(a,4.75,roofY),[.64,.65,.60]);
 quad(roof,at(a,-2.25,roofY-.25),at(a,4.75,roofY-.25),at(b,4.75,roofY-.25),at(b,-2.25,roofY-.25),[.49,.50,.46]);
 for(const off of [-2.25,4.75]){beam(trim,at(a,off,roofY-.15),at(b,off,roofY-.15),.24,.3);beam(trim,at(a,off,roofY-.4),at(b,off,roofY-.4),.09,.12);}
 // Shallow stone treads, risers, and a continuous yellow edge line.
 const n=30,ds=(BARKER_STATION_END-BARKER_STATION_START)/n;let last;
 for(let i=0;i<n;i++){
  const p=point(BARKER_STATION_START+i*ds),q=point(BARKER_STATION_START+(i+1)*ds),y=(p.y+q.y)/2+.64;
  quad(steps,at(p,1.65,y),at(q,1.65,y),at(q,4.5,y),at(p,4.5,y),[.45,.46,.43]);
  quad(stripe,at(p,1.76,y+.015),at(q,1.76,y+.015),at(q,1.84,y+.015),at(p,1.84,y+.015),[.86,.63,.17]);
  if(last!==undefined)quad(riser,at(p,1.65,last),at(p,4.5,last),at(p,4.5,y),at(p,1.65,y),[.34,.35,.32]);last=y;
  const h0=Math.min(y,hongKongTerrainHeight(...[p.x+p.nx*4.5,p.z+p.nz*4.5])-.08),h1=Math.min(y,hongKongTerrainHeight(q.x+q.nx*4.5,q.z+q.nz*4.5)-.08);
  quad(facings,at(p,4.5,h0),at(q,4.5,h1),at(q,4.5,y),at(p,4.5,y),[.39,.39,.36]);
 }
 // Four bays with arched, radiating ironwork on the outer platform side.
 for(let k=0;k<=3;k++){
  const s=BARKER_STATION_START+(BARKER_STATION_END-BARKER_STATION_START)*k/3,p=point(s);
  for(const off of [-2.05,4.55]){
   const base=p.y+.64,top=roofY-.27,x=p.x+p.nx*off,z=p.z+p.nz*off;
   box(columns,[x,(base+top)/2,z],[.42,top-base,.42]);
   box(columns,[x,base+.14,z],[.58,.28,.58]);
   colliders.push({minX:x-.29,maxX:x+.29,minZ:z-.29,maxZ:z+.29,minY:base,maxY:top});
  }
  if(k<3){
   let q=point(s+(BARKER_STATION_END-BARKER_STATION_START)/3),mid=(s+s+(BARKER_STATION_END-BARKER_STATION_START)/3)/2,r=(BARKER_STATION_END-BARKER_STATION_START)/6,spring=roofY-2.25;
   for(const side of [-2.05,4.55])for(let j=0;j<18;j++){const t0=Math.PI*j/18,t1=Math.PI*(j+1)/18,pa=point(mid-r*Math.cos(t0)),pb=point(mid-r*Math.cos(t1));beam(trim,at(pa,side,spring+Math.sin(t0)*1.8),at(pb,side,spring+Math.sin(t1)*1.8),.12,.14);}
   const c=point(mid);for(let j=1;j<10;j++){const t=Math.PI*j/10,p2=point(mid-r*Math.cos(t));beam(iron,at(c,4.53,spring),at(p2,4.53,spring+Math.sin(t)*1.75),.028,.028);}
   beam(iron,at(p,4.53,spring),at(q,4.53,spring),.045,.045);
   const p1=point(mid);beam(lamps,at(p1,3.6,roofY-.42),at(p1,4.2,roofY-.42),.10,.10);
  }
 }
 // Railings follow the steps; leave both ends open for the unmodelled access.
 for(let s=BARKER_STATION_START+.5;s<BARKER_STATION_END-.5;s+=.5){const p=point(s),q=point(Math.min(s+.5,BARKER_STATION_END-.5));beam(iron,at(p,4.48,p.y+1.62),at(q,4.48,q.y+1.62),.055,.055);beam(iron,at(p,4.48,p.y+.65),at(p,4.48,p.y+1.62),.035,.035);}
 const mid=point(1084),sign=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.55),new THREE.MeshStandardMaterial({color:0x294236,side:THREE.DoubleSide}));sign.name='Barker Road station name board';sign.position.set(...at(mid,4.4,mid.y+2.4));sign.rotation.y=Math.atan2(-mid.uz,mid.ux);group.add(sign);
 if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=640;canvas.height=220;const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#294236';ctx.fillRect(0,0,640,220);ctx.fillStyle='#eee7d6';ctx.textAlign='center';ctx.font='bold 65px sans-serif';ctx.fillText('白加道',320,88);ctx.font='bold 47px sans-serif';ctx.fillText('BARKER ROAD',320,165);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;sign.material.map=texture;sign.material.color.set(0xffffff);sign.material.needsUpdate=true;}}
 meshStore(group,roof,lightStone,'Barker station flat roof');meshStore(group,steps,lightStone,'Barker station stepped platform');meshStore(group,riser,lightStone,'Barker station risers');meshStore(group,stripe,lightStone,'Barker station yellow edge');meshStore(group,facings,lightStone,'Barker station masonry platform base');
 merged(group,columns,plaster,'Barker station columns');merged(group,trim,plaster,'Barker station arch and roof mouldings');merged(group,iron,dark,'Barker station arch fan ironwork');merged(group,lamps,warm,'Barker station night lamps',false);
 return {group,colliders,stats:{peakTramBarkerStationBays:3}};
}
