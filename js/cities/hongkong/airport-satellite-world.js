import * as THREE from 'three/webgpu';
import { AIRPORT_SATELLITE_SITE, AIRPORT_FRAME, airportLocalToWorld } from './airport-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { harbourCityPointInRoadCorridor } from './harbour-city-architecture.js';
import {
  airportPalette, createSiteGroup, createAirportFrameGroup, buildSourceFacade,
  featherStripGeometry, roofGeometry, box, beam, merged, airportLocalCollider,
} from './airport-world-utils.js';
import { hongKongTerrainHeight } from './terrain.js';

export const AIRPORT_SKY_BRIDGE = Object.freeze({ from:[178,-282],to:[356,-193],deckRise:28,width:12 });

export function buildAirportSatellite(scene, { groundOffset = 0 } = {}) {
  const site=AIRPORT_SATELLITE_SITE,root=new THREE.Group();root.name='HKIA T1 Satellite Concourse and Sky Bridge';
  const materials=airportPalette(),terminal=createSiteGroup(site,'T1 Satellite Concourse wave-roof terminal'),facadeHeight=17;
  const facade=buildSourceFacade(terminal,site,materials,{base:groundOffset,height:facadeHeight,levels:2,bayWidth:5.5,roadSoffit:8});
  const ceiling=new THREE.Mesh(roofGeometry(site.localRing,groundOffset+facadeHeight-.08),materials.silverDark);ceiling.name='Satellite concourse ceiling';terminal.add(ceiling);
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<site.localRing.length;i+=2){minX=Math.min(minX,site.localRing[i]);maxX=Math.max(maxX,site.localRing[i]);minZ=Math.min(minZ,site.localRing[i+1]);maxZ=Math.max(maxZ,site.localRing[i+1]);}
  const roof=[],rooflights=[],centerX=(minX+maxX)*.5,width=maxX-minX,depth=maxZ-minZ,pitch=depth/3;
  for(let strip=0;strip<3;strip++){
    const z=minZ+(strip+.5)*pitch,g=featherStripGeometry(pitch-1.5,width+10,6.2,.7,10,12);g.rotateY(Math.PI/2);g.translate(centerX,groundOffset+facadeHeight,z);roof.push(g);
    if(strip<2){const light=featherStripGeometry(1.2,width+6,.35,.7,4,12);light.rotateY(Math.PI/2);light.translate(centerX,groundOffset+facadeHeight+.2,z+pitch*.5);rooflights.push(light);}
  }
  merged(terminal,roof,materials.silver,'Satellite three wave-roof strips');merged(terminal,rooflights,materials.blueGlass,'Satellite rooflight slots',false);
  root.add(terminal);

  const bridge=createAirportFrameGroup('Sky Bridge: glazed 200 m airside span'),from=AIRPORT_SKY_BRIDGE.from,to=AIRPORT_SKY_BRIDGE.to;
  const dx=to[0]-from[0],dz=to[1]-from[1],length=Math.hypot(dx,dz),mx=(from[0]+to[0])*.5,mz=(from[1]+to[1])*.5;
  const rotation=Math.atan2(dx,dz),edgeRotation=Math.atan2(-dz,dx),nx=dz/length,nz=-dx/length,deckY=groundOffset+AIRPORT_SKY_BRIDGE.deckRise;
  const structure=[],glass=[],frames=[];
  box(structure,[mx,deckY,mz],[AIRPORT_SKY_BRIDGE.width,.55,length],rotation);
  box(structure,[mx,deckY+5.2,mz],[AIRPORT_SKY_BRIDGE.width+1,.42,length+1],rotation);
  const panels=Math.ceil(length/7);
  for(let panel=0;panel<panels;panel++){
    const t=(panel+.5)/panels,cx=from[0]+dx*t,cz=from[1]+dz*t,panelLength=length/panels-.25;
    for(const side of [-1,1])box(glass,[cx+nx*(AIRPORT_SKY_BRIDGE.width*.5)*side,deckY+2.75,cz+nz*(AIRPORT_SKY_BRIDGE.width*.5)*side],[panelLength,4.5,.12],edgeRotation);
  }
  for(let station=0;station<=Math.ceil(length/10);station++){
    const t=station/Math.ceil(length/10),cx=from[0]+dx*t,cz=from[1]+dz*t;
    for(const side of [-1,1]){
      const sx=cx+nx*AIRPORT_SKY_BRIDGE.width*.5*side,sz=cz+nz*AIRPORT_SKY_BRIDGE.width*.5*side;
      beam(frames,[sx,deckY,sz],[sx,deckY+5.2,sz],.22,.26);
      if(station<Math.ceil(length/10)){
        const nt=(station+1)/Math.ceil(length/10),ex=from[0]+dx*nt+nx*AIRPORT_SKY_BRIDGE.width*.5*side,ez=from[1]+dz*nt+nz*AIRPORT_SKY_BRIDGE.width*.5*side;
        beam(frames,[sx,deckY+.3,sz],[ex,deckY+4.9,ez],.18,.22);
      }
    }
  }
  // A wider observation lounge at the satellite end; the central taxiway remains completely open below.
  box(structure,[from[0],deckY,from[1]],[24,.55,24],rotation);
  for(const side of [-1,1]){
    box(glass,[from[0]+side*11.5,deckY+2.7,from[1]],[.14,4.4,23],rotation);
    box(glass,[from[0],deckY+2.7,from[1]+side*11.5],[23,4.4,.14],rotation);
  }
  merged(bridge,structure,materials.whiteMetal,'Sky Bridge floor roof and observation lounge');
  merged(bridge,glass,materials.blueGlass,'Sky Bridge panoramic glazing and glass-floor observation volume',false);
  merged(bridge,frames,materials.whiteMetal,'Sky Bridge white diagonal truss frames');
  root.add(bridge);scene.add(root);
  const bridgeCollider=airportLocalCollider(mx,mz,AIRPORT_SKY_BRIDGE.width,length,deckY,deckY+5.5,AIRPORT_FRAME.ry+rotation);
  const stats={airportSatelliteWaveStrips:3,airportSatelliteFacadePanels:facade.panels,airportSkyBridgeLength:length,
    airportSkyBridgeDeckRise:AIRPORT_SKY_BRIDGE.deckRise,airportSkyBridgePhotoTextures:0};
  return {root,colliders:[...facade.colliders,bridgeCollider],stats,
    landmarks:[{name:site.name,x:site.x,z:site.z,h:site.height,authored:true}],
    groundHeightAt(x,z,ground){return pointInFlatRing(site.ring,x,z)&&!harbourCityPointInRoadCorridor(site,x,z)?Math.max(ground,groundOffset):ground;},
  };
}
