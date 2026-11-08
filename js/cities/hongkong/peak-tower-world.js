import {buildPeakStationAccess,peakStationAccessGroundHeight,PEAK_STATION_ACCESS as ACCESS} from './peak-station-access.js';
import {buildPeakUpperStation} from './peak-upper-station-world.js';
import {peakUpperStationGroundHeight} from './peak-upper-station-site.js';
import * as THREE from 'three/webgpu';
import {PEAK_TOWER_SITE as SITE, PEAK_TOWER_BASE as BASE, PEAK_TOWER_DECK, peakTowerShellBottom} from './peak-tower-architecture.js';
import {authoredLocalToWorld} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box, beam, merged, store, quad, meshStore} from './harbour-city-world-utils.js';
import {makeCanvasSign} from './tst-hotel-world-utils.js';

export function buildPeakTower(scene) {
 const group=new THREE.Group();group.name='Peak Tower 凌霄閣';group.position.set(SITE.x,BASE,SITE.z);group.rotation.y=SITE.ry;scene.add(group);
 const mats={shell:new THREE.MeshStandardMaterial({color:0xaeb5b6,roughness:.64,metalness:.18,side:THREE.DoubleSide}), underside:new THREE.MeshStandardMaterial({color:0x6e7779,roughness:.78,metalness:.18,side:THREE.DoubleSide}),seam:new THREE.MeshStandardMaterial({color:0x717c7e,roughness:.74,metalness:.2}),glass:new THREE.MeshStandardMaterial({color:0x425c61,roughness:.25,metalness:.34,side:THREE.DoubleSide}),dark:new THREE.MeshStandardMaterial({color:0x263739,roughness:.5,metalness:.15,side:THREE.DoubleSide}),column:new THREE.MeshStandardMaterial({color:0x9caaa8,roughness:.56,metalness:.24}),stone:new THREE.MeshStandardMaterial({color:0x7c7f78,roughness:.91,side:THREE.DoubleSide}),rail:new THREE.MeshStandardMaterial({color:0x9ba9a9,roughness:.38,metalness:.6}),deck:new THREE.MeshStandardMaterial({color:0x6b716b,roughness:.86}),green:new THREE.MeshStandardMaterial({color:0x344b37,roughness:1})};
 const hull=store(),under=store(),joints=[],beams=[],windows=[],frames=[],baseWalls=store(),floorBands=[],columns=[],rails=[],deck=[],signs=[];
 const count=68,half=34.1,depth=12.9,top=31.8;
 // The long face of the white-metal wok is a parabolic soffit under a level sky terrace.
 for(let i=0;i<count;i++){
  const x0=-half+2*half*i/count,x1=-half+2*half*(i+1)/count,y0=peakTowerShellBottom(x0),y1=peakTowerShellBottom(x1);
  for(const z of [-depth,depth])quad(hull,[x0,y0,z],[x1,y1,z],[x1,top,z],[x0,top,z],[.73,.76,.76]);
  quad(under,[x0,y0,-depth],[x1,y1,-depth],[x1,y1,depth],[x0,y0,depth],[.48,.52,.51]);
  if(i%4===0){for(const z of [-depth-.02,depth+.02])beam(joints,[x0,y0,z],[x0,top,z],.035,.035);beam(joints,[x0,y0-.025,-depth],[x0,y0-.025,depth],.045,.045);}
 }
 // Horizontal sheet joints follow the curved lower edge and never extend outside the shell.
 for(const z of [-depth-.025,depth+.025])for(let y=20;y<top;y+=2.35){
  let run=null;for(let i=0;i<=count;i++){const x=-half+2*half*i/count,inside=peakTowerShellBottom(x)<y;if(inside&&run===null)run=x;if((!inside||i===count)&&run!==null){beam(joints,[run,y,z],[inside?x:x-2*half/count,y,z],.035,.035);run=null;}}
 }
 meshStore(group,hull,mats.shell,'Peak Tower curved metal wok shell');meshStore(group,under,mats.underside,'Peak Tower curved ribbed soffit');merged(group,joints,mats.seam,'Peak Tower shell panel joints',false);
 // Landward elevation: the post-2006 inset dark horizontal glazing in the upper shell.
 for(let row=0;row<4;row++){let y=23.1+row*2.05,extent=0;while(extent<27&&peakTowerShellBottom(extent+1)<y-.75)extent++;
  if(extent>2){box(windows,[0,y,depth+.05],[extent*2,1.45,.10]);for(let x=-extent;x<=extent;x+=3.1)box(frames,[x,y,depth+.15],[.07,1.55,.08]);box(frames,[0,y-.77,depth+.14],[extent*2,.09,.12]);box(frames,[0,y+.77,depth+.14],[extent*2,.09,.12]);}}
 // Glazed lower volumes, banded steel and columns; set back from the north road and the mapped track.
 for(const z of [-9.45,9.45]){
  if(z<0)box(windows,[0,9.1,z],[42.8,16.4,.11]);
  else {
   for(const [a,b] of [[-21.4,ACCESS.doorMin],[ACCESS.doorMax,21.4]])box(windows,[(a+b)/2,9.1,z],[b-a,16.4,.11]);
   box(windows,[(ACCESS.doorMin+ACCESS.doorMax)/2,10.55,z],[ACCESS.doorMax-ACCESS.doorMin,13.5,.11]);
  }
  for(let x=-21;x<=21;x+=2.1)if(z<0||x<ACCESS.doorMin||x>ACCESS.doorMax)box(frames,[x,9.1,z+Math.sign(z)*.09],[.09,16.4,.1]);
  for(let y=1;y<=17;y+=3.2){
   if(z>0&&y===1){for(const [a,b] of [[-21.5,ACCESS.doorMin],[ACCESS.doorMax,21.5]])box(floorBands,[(a+b)/2,y,z+.1],[b-a,.22,.21]);}
   else box(floorBands,[0,y,z+Math.sign(z)*.1],[43,.22,.21]);
  }
 }
 for(const x of [-21.5,21.5]){
  box(windows,[x,9.1,0],[.11,16.4,18.8]);
  for(let z=-9;z<=9;z+=2.25)box(frames,[x+Math.sign(x)*.09,9.1,z],[.1,16.4,.09]);
  for(let y=1;y<=17;y+=3.2)box(floorBands,[x+Math.sign(x)*.1,y,0],[.2,.22,18.9]);
 }
 for(const x of [-18,18])for(const z of [-8.1,8.1]){box(columns,[x,9.1,z],[1.9,18.2,1.9]);for(let y=2;y<18;y+=1.3)box(floorBands,[x,y,z],[2.0,.08,2]);}
 // Terrain-following foundation, not a level terrain pad; the existing road is left unchanged.
 for(const z of [-9.3,9.3])for(let x=-21.5;x<21.5;x+=2.15){
  const p=authoredLocalToWorld(SITE,x,z),q=authoredLocalToWorld(SITE,x+2.15,z),a=Math.min(-.12,hongKongTerrainHeight(p.x,p.z)-BASE-.15),b=Math.min(-.12,hongKongTerrainHeight(q.x,q.z)-BASE-.15);
  quad(baseWalls,[x,a,z],[x+2.15,b,z],[x+2.15,1,z],[x,1,z],[.47,.48,.44]);
 }
 for(const x of [-21.5,21.5])for(let z=-9.3;z<9.3;z+=1.86){
  const p=authoredLocalToWorld(SITE,x,z),q=authoredLocalToWorld(SITE,x,z+1.86),a=Math.min(-.12,hongKongTerrainHeight(p.x,p.z)-BASE-.15),b=Math.min(-.12,hongKongTerrainHeight(q.x,q.z)-BASE-.15);
  quad(baseWalls,[x,a,z],[x,b,z+1.86],[x,1,z+1.86],[x,1,z],[.47,.48,.44]);
 }
 meshStore(group,baseWalls,mats.stone,'Peak Tower hillside foundations');
 merged(group,windows,mats.glass,'Peak Tower blue green glazed elevations');merged(group,frames,mats.rail,'Peak Tower curtain wall mullions',false);merged(group,floorBands,mats.column,'Peak Tower floor bands and column fins',false);merged(group,columns,mats.column,'Peak Tower structural columns');
 // Projecting light-metal pier covers, louvres and articulated stone panels distinguish the
 // glazed lower building from a generic all-glass box. These are photo-directed, not measured.
 const pierCovers=[],louvres=[],stonework=[],shopPanels=[],shopTrim=[];
 for(const z of [-9.59,9.59])for(const x of [-18,18]){
  box(pierCovers,[x,10,z],[2.4,16,.22]);
  for(let y=2;y<18;y+=1.25)box(louvres,[x,y,z+Math.sign(z)*.14],[2.38,.055,.09]);
 }
 // Harbour-facing high-level mechanical grille, as seen under the wok in photographs.
 box(shopPanels,[0,14.2,-9.57],[15.6,5.3,.14]);
 for(let y=11.65;y<=16.8;y+=.36)box(louvres,[0,y,-9.69],[15.5,.07,.14]);
 for(const z of [-9.59,9.59])for(const x of [-12,12]){
  const panelWidth=z>0&&x===12?4.5:6.0,center=x-(6-panelWidth)/2;
  box(stonework,[center,2.7,z],[panelWidth,4.6,.14]);
  for(let y=.8;y<5;y+=.9)box(shopTrim,[center,y,z+Math.sign(z)*.1],[panelWidth-.05,.035,.06]);
 }
 // The approach glazing, canopies and shopfronts are exterior-only representations.
 for(const x of [-16,10,16]){
  box(shopPanels,[x,7.2,9.57],[4.8,2.6,.12]);
  box(shopTrim,[x,8.6,9.68],[5.0,.16,.15]);
 }
 merged(group,pierCovers,mats.column,'Peak Tower banded facade piers');
 merged(group,louvres,mats.rail,'Peak Tower facade louvres and pier seams',false);
 merged(group,stonework,mats.stone,'Peak Tower lower stone panels');
 merged(group,shopPanels,mats.dark,'Peak Tower retail frontage and harbour grille');
 merged(group,shopTrim,mats.seam,'Peak Tower shopfront and stone joints',false);
 // Outdoor viewing deck, handrails and regular posts. No teleport or implied public access.
 box(deck,[0,31.85,0],[67.8,.3,25.4]);
 for(const z of [-12.3,12.3]){box(rails,[0,32.95,z],[67.4,.1,.1]);for(let x=-33;x<=33;x+=2.2)box(rails,[x,32.4,z],[.07,1.1,.07]);}
 for(const x of [-33.6,33.6]){box(rails,[x,32.95,0],[.1,.1,24.6]);for(let z=-12;z<=12;z+=2)box(rails,[x,32.4,z],[.07,1.1,.07]);}
 for(let z=-11.5;z<12;z+=1.2)box(beams,[0,32.015,z],[66.8,.018,.025]);
 merged(group,deck,mats.deck,'Peak Tower Sky Terrace 428 deck');merged(group,rails,mats.rail,'Peak Tower Sky Terrace railings',false);merged(group,beams,mats.seam,'Peak Tower terrace deck seams',false);
 // Platform/track edge is outside the core on the southern side. It remains open for the future rail.
 const entrance=[],trim=[];
 box(entrance,[-3,2.2,9.58],[10,4.4,.10]);for(const x of [-8,-3,2])box(trim,[x,2.2,9.72],[.16,4.5,.14]);for(const y of [.08,4.45])box(trim,[-3,y,9.72],[10.1,.13,.14]);
 box(trim,[-3,4.75,10.25],[13,.25,2]);merged(group,entrance,mats.dark,'Peak Tower south entrance glazing');merged(group,trim,mats.rail,'Peak Tower entrance frame and canopy');
 const sign=makeCanvasSign(12,1.7,(ctx,c)=>{ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#dbe4dd';ctx.font=`bold ${Math.floor(c.height*.60)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('THE PEAK TOWER',c.width/2,c.height/2);},{transparent:true,canvasWidth:1024,canvasHeight:160});sign.name='Peak Tower entrance sign';sign.position.set(-3,5.8,9.7);group.add(sign);
 // Collision only around the inset lower core. The high shell does not obstruct road vehicles.
 const colliders=[harbourCityLocalCollider(SITE,0,-9.45,43,.30,BASE-15,BASE+17.5),harbourCityLocalCollider(SITE,(-21.5+ACCESS.doorMin)/2,9.45,ACCESS.doorMin+21.5,.30,BASE-15,BASE+17.5),harbourCityLocalCollider(SITE,(ACCESS.doorMax+21.5)/2,9.45,21.5-ACCESS.doorMax,.30,BASE-15,BASE+17.5),harbourCityLocalCollider(SITE,(ACCESS.doorMin+ACCESS.doorMax)/2,9.45,ACCESS.doorMax-ACCESS.doorMin,.30,BASE+3.8,BASE+17.5),harbourCityLocalCollider(SITE,-21.5,0,.3,18.6,BASE-15,BASE+17.5),harbourCityLocalCollider(SITE,21.5,0,.3,18.6,BASE-15,BASE+17.5)];
 const upperStation=buildPeakUpperStation(group,colliders);
 const stationAccess=buildPeakStationAccess(group,colliders);
 const landmark={name:'凌霄閣',englishName:'Peak Tower',x:SITE.x,z:SITE.z,w:SITE.w,d:SITE.d,h:32,ring:SITE.ring,bounds:SITE.bounds,osmId:SITE.osmId,kind:'landmark',labelHeight:false};
 return {group,colliders,upperStation,stationAccess,groundHeightAt:(x,z,current,referenceY)=>peakStationAccessGroundHeight(x,z,peakUpperStationGroundHeight(x,z,current,referenceY),referenceY),landmarks:[landmark],stats:{peakTowerOsm:SITE.osmId,peakTowerShellSegments:count,peakTowerDeckAltitude:PEAK_TOWER_DECK,peakTowerColumns:4,peakTowerUpperStationSegments:1}};
}
