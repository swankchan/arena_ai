import * as THREE from 'three/webgpu';
import {
  AIRPORT_TERMINAL_ONE_SITE, AIRPORT_T1_VAULT_LAYOUT, AIRPORT_T1_VOLUMES,
} from './airport-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { harbourCityPointInRoadCorridor } from './harbour-city-architecture.js';
import {
  airportPalette, createSiteGroup, buildSourceFacade, addBarrelVault,
  roofGeometry, beam, merged,
} from './airport-world-utils.js';

export function buildAirportTerminalOne(scene, { groundOffset = 0 } = {}) {
  const site = AIRPORT_TERMINAL_ONE_SITE, root = createSiteGroup(site,'HKIA Terminal 1: Y concourse and 129 barrel vaults');
  const materials = airportPalette(), facadeHeight = 36;
  const facade = buildSourceFacade(root,site,materials,{
    base:groundOffset,height:facadeHeight,levels:6,bayWidth:6,roadSoffit:8,
    glassA:[.025,.10,.13],glassB:[.16,.31,.34],
  });
  const ceiling = new THREE.Mesh(roofGeometry(site.localRing,groundOffset+facadeHeight-.08),materials.silverDark);
  ceiling.name='T1 continuous insulated ceiling below the barrel-vault roof';ceiling.castShadow=true;ceiling.receiveShadow=true;root.add(ceiling);

  const roof = [], ribs = [], structure = [], vaults = [];
  const processor = AIRPORT_T1_VOLUMES.processor, stripWidth=(processor.maxX-processor.minX)/6, moduleLength=(processor.maxZ-processor.minZ)/12;
  for(let strip=0;strip<6;strip++)for(let module=0;module<12;module++){
    const center=[processor.minX+(strip+.5)*stripWidth,processor.minZ+(module+.5)*moduleLength];
    addBarrelVault(roof,ribs,center,stripWidth,moduleLength,groundOffset+facadeHeight,8.6,0,12);
    vaults.push({zone:'processor',strip,module,center});
  }
  const central=AIRPORT_T1_VOLUMES.central,centralLength=(central.maxX-central.minX)/AIRPORT_T1_VAULT_LAYOUT.central;
  for(let module=0;module<AIRPORT_T1_VAULT_LAYOUT.central;module++){
    const center=[central.minX+(module+.5)*centralLength,0];
    addBarrelVault(roof,ribs,center,46,centralLength,groundOffset+facadeHeight,7.2,Math.PI/2,12);
    vaults.push({zone:'central',module,center});
  }
  for(const [zone,key] of [['northwestArm','northwestArm'],['southwestArm','southwestArm']]){
    const arm=AIRPORT_T1_VOLUMES[zone],dx=arm.to[0]-arm.from[0],dz=arm.to[1]-arm.from[1],length=Math.hypot(dx,dz),count=AIRPORT_T1_VAULT_LAYOUT[key];
    const rotation=Math.atan2(dx,dz);
    for(let module=0;module<count;module++){
      const t=(module+.5)/count,center=[arm.from[0]+dx*t,arm.from[1]+dz*t];
      addBarrelVault(roof,ribs,center,arm.width,length/count,groundOffset+facadeHeight,7.6,rotation,12);
      vaults.push({zone,module,center});
    }
  }
  const roofMesh=merged(root,roof,materials.silver,'T1 129 parallel curved barrel-vault roof modules');
  const ribMesh=merged(root,ribs,materials.whiteMetal,'T1 arched vault seams and white structural ribs');
  if(roofMesh)roofMesh.userData.vaultCount=vaults.length;if(ribMesh)ribMesh.userData.vaultCount=vaults.length;

  // Photograph-directed bowed white mullions and diagonal bracing on the long glazed airside elevations.
  for(const side of [-1,1])for(let x=-240;x<=320;x+=32){
    const z=side*23.4;
    beam(structure,[x,groundOffset+.3,z],[x+7,groundOffset+18,z+side*1.8],.34,.42);
    beam(structure,[x+7,groundOffset+18,z+side*1.8],[x+12,groundOffset+35.5,z],.34,.42);
    beam(structure,[x,groundOffset+15,z],[x+31,groundOffset+31,z],.2,.24);
  }
  // The processor's landside bowed columns read as a second, larger scale of the same structural family.
  for(let z=-180;z<=160;z+=34){
    beam(structure,[655.8,groundOffset+.4,z],[660,groundOffset+18,z],.52,.58);
    beam(structure,[660,groundOffset+18,z],[655.8,groundOffset+35.5,z],.52,.58);
    if(z<150)beam(structure,[659,groundOffset+17,z],[659,groundOffset+31,z+34],.25,.3);
  }
  merged(root,structure,materials.whiteMetal,'T1 bowed white facade mullions and diagonal structural braces');

  scene.add(root);
  const stats={
    airportT1Vaults:vaults.length,airportT1VaultLayout:AIRPORT_T1_VAULT_LAYOUT,
    airportT1FacadePanels:facade.panels,airportT1RoadOpenings:facade.roadOpenings,
    airportT1SourceWay:site.osmId,airportT1PhotoTextures:0,
  };
  return {
    root,colliders:facade.colliders,stats,vaults,roofMesh,
    landmarks:[{name:site.name,x:site.x,z:site.z,h:site.height,authored:true}],
    groundHeightAt(x,z,ground){
      return pointInFlatRing(site.ring,x,z)&&!harbourCityPointInRoadCorridor(site,x,z)?Math.max(ground,groundOffset):ground;
    },
  };
}
