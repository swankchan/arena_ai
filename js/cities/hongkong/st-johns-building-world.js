import * as THREE from 'three/webgpu';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {color} from 'three/tsl';
import {ST_JOHNS_SITE as S,ST_JOHNS_HEIGHT as H,ST_JOHNS_PILOTIS_HEIGHT as B,ST_JOHNS_OFFICE_FLOORS as FLOORS,ST_JOHNS_FLOOR_HEIGHT as FH} from './st-johns-building-site.js';
import {authoredLocalToWorld} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,cylinder,merged,nightAmount,hash} from './harbour-city-world-utils.js';

function rounded(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
// Full upper office elevation; tower fit is based on the OSM footprint and
// photographs, while the heights and individual interior lights are estimates.
export function buildStJohnsBuilding(scene){
 const ground=hongKongTerrainHeight(S.x,S.z),root=new THREE.Group();root.name="St John's Building";root.position.set(S.x,ground,S.z);root.rotation.y=S.ry;scene.add(root);
 const w=S.w,d=S.d,bodyH=H-B,body=new RoundedBoxGeometry(w,bodyH,d,4,1.15);body.translate(0,B+bodyH/2,0);
 const metal=new THREE.MeshStandardMaterial({color:0x929b9c,roughness:.72,metalness:.24}),shell=new THREE.Mesh(body,metal);shell.name='St Johns rounded silver-grey cladding';shell.castShadow=true;shell.receiveShadow=true;root.add(shell);
 const seams=[],black=[],glass=[],lit=[],columns=[],ceiling=[],base=[],roof=[],soffitLights=[],lobbyFrames=[];let windows=0;
 const dark=new THREE.MeshStandardMaterial({color:0x222e32,roughness:.55,metalness:.35});
 const pane=new THREE.MeshStandardMaterial({color:0x304d58,roughness:.25,metalness:.48});
 const light=new THREE.MeshStandardNodeMaterial({color:0x6a7771,roughness:.35,metalness:.25});light.emissiveNode=color(0xffcc85).mul(nightAmount()).mul(.8);
 const rimGeo=new THREE.ShapeGeometry(rounded(1.75,1.77,.24),6),glassGeo=new THREE.ShapeGeometry(rounded(1.53,1.54,.19),6);
 for(let side=0;side<4;side++){
  const wide=side<2,along=wide?w:d,count=wide?12:5,depth=wide?d:w,angle=side===0?0:side===1?Math.PI:side===2?Math.PI/2:-Math.PI/2;
  const position=(u,y,off)=>wide?[side===0?u:-u,y,(side===0?1:-1)*off]:[(side===2?1:-1)*off,y,side===2?-u:u];
  for(let f=0;f<FLOORS;f++){
   let y=B+FH*f+FH*.57;
   for(let j=0;j<count;j++){
    let u=(j+.5-count/2)*(along-2.2)/count,loc=position(u,y,depth/2+.018),rim=rimGeo.clone();rim.rotateY(angle);rim.translate(...loc);black.push(rim);
    let g=glassGeo.clone();g.rotateY(angle);g.translate(...position(u,y,depth/2+.032));(hash(side,j,f,11)>.86?lit:glass).push(g);windows++;
   }
   const seam=position(0,B+FH*f,depth/2+.025);box(seams,seam,wide?[w-2,.035,.035]:[.035,.035,d-2]);
  }
  for(let j=0;j<=count;j++){
   let u=(j-count/2)*(along-2.2)/count,loc=position(u,(B+H)/2,depth/2+.028);box(seams,loc,wide?[.035,H-B,.035]:[.035,H-B,.035]);
  }
 }
 rimGeo.dispose();glassGeo.dispose();
 // Open pilotis beneath the office tower: chrome-clad structural columns and
 // dark recessed lobby. Do not fabricate the distinct tram entrance here.
 const chrome=new THREE.MeshStandardMaterial({color:0xb1b9b8,roughness:.25,metalness:.65});
 const colliders=[harbourCityLocalCollider(S,0,0,w,d,ground+B,ground+H)];
 for(const x of [-w/2+2,w/2-2])for(const z of [-d/2+1.7,d/2-1.7]){
  const p=authoredLocalToWorld(S,x,z),bottom=hongKongTerrainHeight(p.x,p.z)-ground;
  if(bottom>=B-.3)continue;const height=B-bottom;cylinder(columns,[x,bottom+height/2,z],.52,height,20);colliders.push(harbourCityLocalCollider(S,x,z,1.04,1.04,ground+bottom,ground+B));
 }
 box(ceiling,[0,B-.13,0],[w-.4,.26,d-.4]);
 // Lobby is set back behind the column line, leaving the street-side open.
 box(base,[0,3.2,0],[w-5,6.4,.18]);
 // Recessed lobby glazing divisions and soft light strips under the canopy.
 for(let x=-w/2+3;x<w/2-2;x+=2.7)box(lobbyFrames,[x,3.2,.14],[.055,6.4,.08]);
 for(const z of [-3,3])box(soffitLights,[0,B-.29,z],[w-5,.035,.10]);
 box(roof,[0,H+.09,0],[w-1.8,.18,d-1.8]);
 for(const x of [-w/2+.8,w/2-.8])box(roof,[x,H+.35,0],[.12,.55,d-1.5]);
 for(const z of [-d/2+.8,d/2-.8])box(roof,[0,H+.35,z],[w-1.5,.55,.12]);
 box(roof,[-w*.18,H+.50,0],[4,.9,2.8]);box(roof,[w*.12,H+.40,1.4],[2.5,.7,2]);
 const soffitMat=new THREE.MeshStandardNodeMaterial({color:0xffdfac});soffitMat.emissiveNode=color(0xffc787).mul(nightAmount()).mul(1.3);
 merged(root,seams,dark,'St Johns panel joints',false);merged(root,black,dark,'St Johns rounded window frames',false);merged(root,glass,pane,'St Johns dark reflective windows',false);merged(root,lit,light,'St Johns night office windows',false);merged(root,columns,chrome,'St Johns chrome pilotis');merged(root,ceiling,dark,'St Johns recessed soffit');merged(root,base,dark,'St Johns recessed lobby screen');merged(root,lobbyFrames,chrome,'St Johns lobby mullions');merged(root,roof,metal,'St Johns parapet and roof plant');merged(root,soffitLights,soffitMat,'St Johns lobby night lighting',false);
 return {group:root,colliders,landmarks:[{id:'st-johns-building',name:"聖約翰大廈 St John's Building",position:{x:S.x,y:ground,z:S.z},radius:20,height:H}],stats:{stJohnsWindows:windows,stJohnsOfficeFloors:FLOORS,stJohnsHeight:H},groundOffset:ground};
}
