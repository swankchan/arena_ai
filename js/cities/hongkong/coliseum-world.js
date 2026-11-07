// Hong Kong Coliseum (紅館). Photo-directed exterior, not a surveyed architectural model.
// The OSM way is the larger venue precinct, NOT the building footprint. The arena's
// dimensions, roof and podium below are visual estimates from LCSD exterior photos.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { projectHongKongLonLat } from './authored-landmark-site.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { store, quad, meshStore, merged, box, beam } from './harbour-city-world-utils.js';

const [x, z] = projectHongKongLonLat(114.18196, 22.30128);
export const COLISEUM_SITE = Object.freeze({ x, z, ry: -.09, w: 110, d: 110 });
export const COLISEUM_RESEARCH = Object.freeze([
  'https://www.lcsd.gov.hk/en/hkc/aboutus/photogallery/historicalphotos.html',
  'https://www.openstreetmap.org/way/102256410',
  'https://www.slideshare.net/slideshow/coliseum-hong-kong/249516033',
]);

export function buildHongKongColiseum(scene) {
  const ground = hongKongTerrainHeight(x, z);
  const root = new THREE.Group(); root.name = 'Hong Kong Coliseum — 紅館';
  root.position.set(x, ground, z); root.rotation.y = COLISEUM_SITE.ry;
  root.userData.landmark = 'hong-kong-coliseum'; scene.add(root);
  const panels = store(), roofPanels = store(), podium = [], structural = [], roofTop = [], seams = [], doors = [];
  const shell = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: .88, metalness: .03, side: THREE.DoubleSide });
  shell.colorNode = attribute('color');
  const roof = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: .67, metalness: .28, side: THREE.DoubleSide });
  roof.colorNode = attribute('color');
  const concrete = new THREE.MeshStandardMaterial({ color: 0x92958f, roughness: .86 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x253332, roughness: .42, metalness: .25 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x565f5b, roughness: .65, metalness: .3 });
  // Four planes taper inward below the broad upper edge; small panels carry subtle
  // individually varied tile colours rather than a featureless white polygon.
  const sidePoint = (side, t, h) => {
    const half = 34 + 21 * h, u = (t * 2 - 1) * half, y = 10 + 18 * h;
    return side === 0 ? [u,y,-half] : side === 1 ? [half,y,u] : side === 2 ? [-u,y,half] : [-half,y,-u];
  };
  for (let s = 0; s < 4; s++) for (let row = 0; row < 12; row++) for (let col = 0; col < 32; col++) {
    const t0 = (col + .012) / 32, t1 = (col + .988) / 32, h0 = (row + .012) / 12, h1 = (row + .988) / 12;
    const v = .73 + .025 * Math.sin(col * 1.7 + row * 2.1 + s * 4);
    quad(panels, sidePoint(s,t0,h0), sidePoint(s,t1,h0), sidePoint(s,t1,h1), sidePoint(s,t0,h1), [v, v*.99, v*.95]);
  }
  // Recessed dark sloping roof perimeter and a low inset metal roof.
  const roofPoint = (side, t, h) => {
    const half = 55 - 8*h, u = (t*2-1)*half, y = 28+5*h;
    return side===0?[u,y,-half]:side===1?[half,y,u]:side===2?[-u,y,half]:[-half,y,-u];
  };
  for(let s=0;s<4;s++) for(let n=0;n<28;n++) {
    const t0=n/28,t1=(n+1)/28, v=.20+.025*(n%3);
    quad(roofPanels,roofPoint(s,t0,0),roofPoint(s,t1,0),roofPoint(s,t1,1),roofPoint(s,t0,1),[v,v*1.1,v*1.15]);
    beam(seams,roofPoint(s,t0,0),roofPoint(s,t0,1),.12,.12);
  }
  box(podium,[0,4.6,0],[69,1,69]); box(podium,[0,9.5,0],[72,1,72]);
  box(doors,[0,6.9,0],[66,4.0,66]);
  for(const sx of [-1,1]) for(const sz of [-1,1]) box(structural,[sx*30,2.4,sz*30],[2.4,4.8,2.4]);
  for(let n=-4;n<=4;n++) for(const s of [-1,1]) {
    box(structural,[n*7.2,7,s*33.3],[.3,4.3,.4]);
    box(structural,[s*33.3,7,n*7.2],[.4,4.3,.3]);
  }
  box(roofTop,[0,33.2,0],[94,.5,94]);
  for(let n=-10;n<=10;n++) box(seams,[n*4.3,33.52,0],[.10,.08,92]);
  meshStore(root,panels,shell,'Coliseum sloping precast facade panels');
  meshStore(root,roofPanels,roof,'Coliseum dark sloping roof perimeter');
  merged(root,podium,concrete,'Coliseum elevated podium and fascia');
  merged(root,doors,dark,'Coliseum recessed dark glazed concourse');
  merged(root,structural,concrete,'Coliseum columns and mullions');
  merged(root,roofTop,trim,'Coliseum inset metal roof');
  merged(root,seams,trim,'Coliseum roof panel seams');
  const colliders = [
    harbourCityLocalCollider(COLISEUM_SITE,0,0,66,66,ground+4.6,ground+10),
    harbourCityLocalCollider(COLISEUM_SITE,0,0,70,70,ground+10,ground+28),
  ];
  for(const sx of [-1,1]) for(const sz of [-1,1]) colliders.push(harbourCityLocalCollider(COLISEUM_SITE,sx*30,sz*30,2.4,2.4,ground,ground+4.8));
  const landmark = { name:'香港體育館', englishName:'Hong Kong Coliseum', x,z,w:110,d:110,h:34,osmId:102256410,kind:'landmark',labelHeight:false };
  return { root, colliders, landmarks:[landmark], stats:{ coliseumOsmWay:102256410, coliseumFacadePanels:1536, coliseumGround:ground, coliseumPhotoDirected:true } };
}
