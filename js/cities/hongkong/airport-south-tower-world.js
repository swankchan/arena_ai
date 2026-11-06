import { AIRPORT_SOUTH_TOWER_SITE } from './airport-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import {
  airportPalette, createSiteGroup, box, beam, cylinder, sphere, merged,
  siteLocalToWorld,
} from './airport-world-utils.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';

export function buildAirportSouthTower(scene, { groundOffset = 0 } = {}) {
  const site=AIRPORT_SOUTH_TOWER_SITE,root=createSiteGroup(site,'HKIA South Air Traffic Control Tower');
  const materials=airportPalette(),concrete=[],glass=[],shaft=[],cab=[],frames=[];
  box(concrete,[0,groundOffset+5,0],[34,10,26]);
  for(const y of [2.2,5.2,8.2]){
    box(glass,[0,groundOffset+y,13.08],[31,1.9,.16]);box(glass,[0,groundOffset+y,-13.08],[31,1.9,.16]);
    box(glass,[17.08,groundOffset+y,0],[.16,1.9,23]);box(glass,[-17.08,groundOffset+y,0],[.16,1.9,23]);
  }
  for(let x=-15;x<=15;x+=5)for(const z of [-13.2,13.2])box(frames,[x,groundOffset+5,z],[.28,10,.3]);
  cylinder(shaft,[0,groundOffset+38,0],5.2,56,24,3.4);
  cylinder(cab,[0,groundOffset+67.5,0],6.2,7,24,11.2);
  cylinder(glass,[0,groundOffset+74,0],11.2,8.5,24);
  cylinder(cab,[0,groundOffset+80,0],10.2,3.5,24,8.4);
  sphere(cab,[0,groundOffset+85,0],2.2,16);
  for(const y of [69.8,72.5,76,78.5,81.5])cylinder(frames,[0,groundOffset+y,0],11.45,.34,24);
  for(let i=0;i<20;i++){
    const a=i/20*Math.PI*2,x=Math.cos(a)*11.3,z=Math.sin(a)*11.3;
    beam(frames,[x,groundOffset+69.8,z],[x,groundOffset+78.4,z],.2,.24);
  }
  merged(root,concrete,materials.concreteLight,'South tower ATC complex podium');merged(root,glass,materials.greenGlass,'South tower green glazed podium and cab');
  merged(root,shaft,materials.concreteLight,'South tower tapered circular shaft');merged(root,cab,materials.silver,'South tower flared cab roof and radome');
  merged(root,frames,materials.whiteMetal,'South tower cab floor rings and vertical mullions');scene.add(root);
  const colliders=[harbourCityLocalCollider(site,0,0,34,26,groundOffset,groundOffset+10),harbourCityLocalCollider(site,0,0,13,13,groundOffset,groundOffset+86)];
  return {root,colliders,stats:{airportSouthTowerSourceWay:site.osmId,airportSouthTowerPresentationHeight:86,airportSouthTowerPhotoTextures:0},
    landmarks:[{name:site.name,x:site.x,z:site.z,h:86,authored:true}],
    groundHeightAt(x,z,ground){return pointInFlatRing(site.ring,x,z)?Math.max(ground,groundOffset):ground;},
  };
}
