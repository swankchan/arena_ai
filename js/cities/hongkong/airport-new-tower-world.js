import { AIRPORT_NAT_SITE } from './airport-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { airportPalette, createSiteGroup, box, beam, cylinder, sphere, merged } from './airport-world-utils.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';

export function buildAirportNewTower(scene, { groundOffset = 0 } = {}) {
  const site=AIRPORT_NAT_SITE,root=createSiteGroup(site,'HKIA New Air Traffic Control Tower: CAD 102 m');
  const materials=airportPalette(),podium=[],shaft=[],glass=[],silver=[],frames=[];
  box(podium,[0,groundOffset+4,0],[30,8,24]);
  for(const side of [-1,1]){
    box(glass,[0,groundOffset+4,side*12.08],[27,5.8,.16]);
    for(let x=-12;x<=12;x+=4)box(frames,[x,groundOffset+4,side*12.2],[.22,6,.22]);
  }
  cylinder(shaft,[0,groundOffset+44,0],7.2,72,28,4.1);
  cylinder(silver,[0,groundOffset+81,0],5.2,5,28,10.8);
  // Four stacked glazed cab floors and strong silver horizontal bands reproduce the current NAT silhouette.
  for(let floor=0;floor<4;floor++){
    const y=groundOffset+84+floor*3.7,radius=11.2-floor*.35;
    cylinder(glass,[0,y,0],radius,3.25,28);
    cylinder(silver,[0,y-1.75,0],radius+.35,.42,28);
    for(let i=0;i<24;i++){
      const a=i/24*Math.PI*2,x=Math.cos(a)*(radius+.08),z=Math.sin(a)*(radius+.08);
      beam(frames,[x,y-1.5,z],[x,y+1.5,z],.16,.2);
    }
  }
  cylinder(silver,[0,groundOffset+98.6,0],10.1,2.2,28,8.2);
  cylinder(silver,[0,groundOffset+100.4,0],2.2,1.5,16);
  sphere(silver,[0,groundOffset+101.6,0],.55,10);
  merged(root,podium,materials.concreteLight,'NAT operations podium');merged(root,shaft,materials.concreteLight,'NAT 72 m tapered circular shaft');
  merged(root,glass,materials.greenGlass,'NAT four stacked panoramic glazed cab floors');merged(root,silver,materials.silver,'NAT silver cab bands roof and antenna');
  merged(root,frames,materials.whiteMetal,'NAT cab vertical mullions and podium fins');scene.add(root);
  const colliders=[harbourCityLocalCollider(site,0,0,30,24,groundOffset,groundOffset+8),harbourCityLocalCollider(site,0,0,15,15,groundOffset,groundOffset+102)];
  return {root,colliders,stats:{airportNATHeight:102,airportNATSource:'CAD 2024–25; photo-directed position/base',airportNATPhotoTextures:0},
    landmarks:[{name:site.name,x:site.x,z:site.z,h:102,authored:true}],
    groundHeightAt(x,z,ground){return pointInFlatRing(site.ring,x,z)?Math.max(ground,groundOffset):ground;},
  };
}
