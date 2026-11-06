import * as THREE from 'three/webgpu';
import { AIRPORT_MIDFIELD_SITE } from './airport-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { harbourCityPointInRoadCorridor, harbourCityRoadConflictAtLocal } from './harbour-city-architecture.js';
import {
  airportPalette, createSiteGroup, buildSourceFacade, featherStripGeometry,
  roofGeometry, beam, box, merged,
} from './airport-world-utils.js';

export function buildAirportMidfield(scene, { groundOffset = 0 } = {}) {
  const site=AIRPORT_MIDFIELD_SITE,root=createSiteGroup(site,'HKIA T1 Midfield Concourse: rooflights and inclined mega-columns');
  const materials=airportPalette(),facadeHeight=24;
  const facade=buildSourceFacade(root,site,materials,{
    base:groundOffset,height:facadeHeight,levels:4,bayWidth:6,roadSoffit:8,
    glassA:[.035,.12,.15],glassB:[.16,.32,.35],
  });
  const ceiling=new THREE.Mesh(roofGeometry(site.localRing,groundOffset+facadeHeight-.08),materials.silverDark);
  ceiling.name='Midfield continuous concourse ceiling';ceiling.castShadow=true;root.add(ceiling);
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<site.localRing.length;i+=2){minX=Math.min(minX,site.localRing[i]);maxX=Math.max(maxX,site.localRing[i]);minZ=Math.min(minZ,site.localRing[i+1]);maxZ=Math.max(maxZ,site.localRing[i+1]);}
  const centerX=(minX+maxX)*.5,width=maxX-minX,depth=maxZ-minZ,stripCount=5,pitch=depth/stripCount;
  const roof=[],rooflights=[],structure=[],shading=[];
  for(let strip=0;strip<stripCount;strip++){
    const z=minZ+(strip+.5)*pitch,geometry=featherStripGeometry(pitch-2.2,width+14,6.2,.35,10,28);
    geometry.rotateY(Math.PI/2);geometry.translate(centerX,groundOffset+facadeHeight,z);roof.push(geometry);
    if(strip<stripCount-1){
      const light=featherStripGeometry(1.8,width+8,.45,.35,4,28);light.rotateY(Math.PI/2);light.translate(centerX,groundOffset+facadeHeight+.25,z+pitch*.5);rooflights.push(light);
    }
  }
  merged(root,roof,materials.silver,'Midfield long curved silver roof strips');
  merged(root,rooflights,materials.blueGlass,'Midfield integrated linear rooflights',false);

  for(const side of [-1,1]){
    const z=side<0?minZ-.8:maxZ+.8;
    for(let x=minX+22;x<maxX-12;x+=48){
      if(harbourCityRoadConflictAtLocal(site,x,z))continue;
      const fork=[x+7,groundOffset+15,z+side*1.5];
      beam(structure,[x,groundOffset+.3,z],fork,.72,.78);
      beam(structure,fork,[x+14,groundOffset+24.5,z],.52,.62);
      beam(structure,fork,[x-4,groundOffset+23,z-side*2],.4,.48);
    }
    for(let x=minX+6;x<maxX-6;x+=12)for(const y of [7.8,13.8,19.8]){
      box(shading,[x+5.5,groundOffset+y,z+side*.65],[11.5,.18,1.25]);
    }
  }
  merged(root,structure,materials.whiteMetal,'Midfield inclined steel mega-columns and forked roof supports');
  merged(root,shading,materials.silverDark,'Midfield external horizontal shading louvres');
  scene.add(root);
  const stats={
    airportMidfieldRoofStrips:stripCount,airportMidfieldRooflights:stripCount-1,
    airportMidfieldFacadePanels:facade.panels,airportMidfieldRoadOpenings:facade.roadOpenings,
    airportMidfieldSourceWay:site.osmId,airportMidfieldPhotoTextures:0,
  };
  return {root,colliders:facade.colliders,stats,
    landmarks:[{name:site.name,x:site.x,z:site.z,h:site.height,authored:true}],
    groundHeightAt(x,z,ground){return pointInFlatRing(site.ring,x,z)&&!harbourCityPointInRoadCorridor(site,x,z)?Math.max(ground,groundOffset):ground;},
  };
}
