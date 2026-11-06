import * as THREE from 'three/webgpu';
import { AIRPORT_TERMINAL_TWO_SITE } from './airport-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { harbourCityPointInRoadCorridor, harbourCityRoadConflictAtLocal } from './harbour-city-architecture.js';
import {
  airportPalette, createSiteGroup, buildSourceFacade, featherStripGeometry,
  roofGeometry, beam, cylinder, merged,
} from './airport-world-utils.js';

export function buildAirportTerminalTwo(scene, { groundOffset = 0 } = {}) {
  const site=AIRPORT_TERMINAL_TWO_SITE,root=createSiteGroup(site,'HKIA Terminal 2: feather roof and tree columns');
  const materials=airportPalette(),facadeHeight=31;
  const facade=buildSourceFacade(root,site,materials,{
    base:groundOffset,height:facadeHeight,levels:6,bayWidth:5.8,roadSoffit:8,
    glassA:[.035,.13,.16],glassB:[.17,.34,.36],
  });
  const ceiling=new THREE.Mesh(roofGeometry(site.localRing,groundOffset+facadeHeight-.1),materials.silverDark);
  ceiling.name='T2 continuous hall ceiling below separated feather strips';ceiling.castShadow=true;root.add(ceiling);

  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<site.localRing.length;i+=2){minX=Math.min(minX,site.localRing[i]);maxX=Math.max(maxX,site.localRing[i]);minZ=Math.min(minZ,site.localRing[i+1]);maxZ=Math.max(maxZ,site.localRing[i+1]);}
  const width=maxX-minX,depth=maxZ-minZ,centerX=(minX+maxX)*.5,centerZ=(minZ+maxZ)*.5;
  const roof=[],skylights=[],fascia=[],columns=[],stripCount=9,pitch=width/stripCount,stripWidth=pitch-2.6,length=depth+24;
  for(let strip=0;strip<stripCount;strip++){
    const x=minX+(strip+.5)*pitch,geometry=featherStripGeometry(stripWidth,length,7.4,0,10,24);
    geometry.translate(x,groundOffset+facadeHeight,centerZ);roof.push(geometry);
    for(const end of [-1,1])for(let segment=0;segment<10;segment++){
      const a=-Math.PI/2+segment/10*Math.PI,b=-Math.PI/2+(segment+1)/10*Math.PI;
      const longitudinal=Math.sin((end<0?0:1)*Math.PI*2)*1.35+(end<0?0:Math.PI)*1.4;
      beam(fascia,[x+Math.sin(a)*stripWidth*.5,groundOffset+facadeHeight+Math.cos(a)*7.4+longitudinal,centerZ+end*length*.5],
        [x+Math.sin(b)*stripWidth*.5,groundOffset+facadeHeight+Math.cos(b)*7.4+longitudinal,centerZ+end*length*.5],.24,.3);
    }
    if(strip<stripCount-1){
      const slot=featherStripGeometry(2.1,length-4,.55,0,4,24);slot.translate(x+pitch*.5,groundOffset+facadeHeight+.3,centerZ);skylights.push(slot);
    }
  }
  const roofMesh=merged(root,roof,materials.silver,'T2 nine undulating feather-roof strips with deep eaves');
  merged(root,skylights,materials.blueGlass,'T2 continuous daylight slots between feather roofs',false);
  merged(root,fascia,materials.whiteMetal,'T2 sculpted feather-edge fascia');

  // Inclined branching tree columns support the apparently floating roof; each has a small lifted pedestal.
  for(const side of [-1,1])for(let z=minZ+18;z<=maxZ-12;z+=42){
    const x=side<0?minX+2:maxX-2;
    if(harbourCityRoadConflictAtLocal(site,x,z))continue;
    cylinder(columns,[x,groundOffset+.35,z],1.1,.7,12);
    const fork=[x+side*3,groundOffset+17,z];
    beam(columns,[x,groundOffset+.7,z],fork,.85,.85);
    beam(columns,fork,[x+side*8,groundOffset+30.5,z-10],.58,.62);
    beam(columns,fork,[x+side*8,groundOffset+30.5,z+10],.58,.62);
    beam(columns,[x+side*1,groundOffset+11,z],[x-side*4,groundOffset+29.5,z],.42,.48);
  }
  merged(root,columns,materials.whiteMetal,'T2 inclined branching tree columns and floating pedestals');
  scene.add(root);
  const stats={
    airportT2FeatherStrips:stripCount,airportT2SkylightSlots:stripCount-1,
    airportT2FacadePanels:facade.panels,airportT2RoadOpenings:facade.roadOpenings,
    airportT2SourceWay:site.osmId,airportT2PhotoTextures:0,
  };
  return {root,colliders:facade.colliders,stats,roofMesh,
    landmarks:[{name:site.name,x:site.x,z:site.z,h:site.height,authored:true}],
    groundHeightAt(x,z,ground){return pointInFlatRing(site.ring,x,z)&&!harbourCityPointInRoadCorridor(site,x,z)?Math.max(ground,groundOffset):ground;},
  };
}
