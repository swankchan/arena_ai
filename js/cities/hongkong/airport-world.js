import * as THREE from 'three/webgpu';
import { HONG_KONG_TERRAIN_META, hongKongTerrainHeight } from './terrain.js';
import { buildAirportAirfield } from './airport-airfield-world.js';
import { buildAirportTerminalOne } from './airport-terminal-one-world.js';
import { buildAirportTerminalTwo } from './airport-terminal-two-world.js';
import { buildAirportMidfield } from './airport-midfield-world.js';
import { buildAirportSatellite } from './airport-satellite-world.js';
import { buildAirportSouthTower } from './airport-south-tower-world.js';
import { buildAirportNewTower } from './airport-new-tower-world.js';
import { buildAirportAircraft } from './airport-aircraft-world.js';

export function buildHongKongAirport(scene,{groundHeightAt=hongKongTerrainHeight,padHeights=HONG_KONG_TERRAIN_META.airportPadHeights}={}){
  const root=new THREE.Group();root.name='Hong Kong International Airport at Chek Lap Kok';
  const airfield=buildAirportAirfield(root,{groundHeightAt});
  const terminalOne=buildAirportTerminalOne(root,{groundOffset:padHeights.airportT1});
  const terminalTwo=buildAirportTerminalTwo(root,{groundOffset:padHeights.airportT2});
  const midfield=buildAirportMidfield(root,{groundOffset:padHeights.airportMidfield});
  const satellite=buildAirportSatellite(root,{groundOffset:padHeights.airportSatellite});
  const southTower=buildAirportSouthTower(root,{groundOffset:padHeights.airportSouthTower});
  const newTower=buildAirportNewTower(root,{groundOffset:padHeights.airportNAT});
  const aircraft=buildAirportAircraft(root,{groundHeightAt});
  scene.add(root);
  const buildings=[terminalOne,terminalTwo,midfield,satellite,southTower,newTower];
  const stats={...airfield.stats,...terminalOne.stats,...terminalTwo.stats,...midfield.stats,...satellite.stats,
    ...southTower.stats,...newTower.stats,...aircraft.stats,airportLandmarks:6,airportUnifiedGround:true};
  return {
    root,airfield,terminalOne,terminalTwo,midfield,satellite,southTower,newTower,aircraft,stats,
    colliders:[...airfield.colliders,...buildings.flatMap((building)=>building.colliders),...aircraft.colliders],
    landmarks:buildings.flatMap((building)=>building.landmarks),
    groundHeightAt(x,z,ground){
      let height=airfield.groundHeightAt(x,z,ground);
      for(const building of buildings)height=building.groundHeightAt(x,z,height);
      return height;
    },
  };
}
