// Seidler's prestressed office span over the club podium. Material, silhouette
// and facade are based on published photographs; placement uses an OSM parcel.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { HONG_KONG_CLUB_SITE as site, HONG_KONG_CLUB_HEIGHT as height, HONG_KONG_CLUB_OFFICE_FLOORS as floors } from './hong-kong-club-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { store, quad, meshStore, merged, box, beam, sphere } from './harbour-city-world-utils.js';

export function buildHongKongClub(scene) {
  const base=hongKongTerrainHeight(site.x,site.z), root=new THREE.Group();
  root.name='The Hong Kong Club Building — 香港會所大廈'; root.position.set(site.x,base,site.z); root.rotation.y=site.ry;
  root.userData.landmark='hong-kong-club-building'; scene.add(root);
  const stone=store(), darkGlass=store(), fins=store(), frames=[], roof=[], piers=[], planting=[], trunks=[], colliders=[];
  const material=(roughness,metalness)=>{const m=new THREE.MeshStandardNodeMaterial({vertexColors:true,side:THREE.DoubleSide,roughness,metalness});m.colorNode=attribute('color');return m;};
  const stoneMat=material(.83,.04), glassMat=material(.25,.3), finMat=material(.68,.1);
  const frameMat=new THREE.MeshStandardMaterial({color:0x555e5b,roughness:.5,metalness:.35});
  const roofMat=new THREE.MeshStandardMaterial({color:0x5c625e,roughness:.85});
  const pierMat=new THREE.MeshStandardMaterial({color:0x99998d,roughness:.83});
  const plantMat=new THREE.MeshStandardMaterial({color:0x344f32,roughness:1});
  const trunkMat=new THREE.MeshStandardMaterial({color:0x5b5040,roughness:1});
  const wall=(s,a,b,c,d,tint)=>quad(s,a,b,c,d,tint);
  // Recessed 17 office levels; deep granite horizontal blades cast shade on
  // dark glazing. Their ends curve down into the 34 m structural span.
  for(const side of [-1,1]) {
    const x=side*22.2;
    for(let f=0;f<floors;f++) {
      const y=22.4+f*3.55, yTop=y+3.2;
      for(let bay=0;bay<14;bay++) {
        const z0=-14.25+bay*28.5/14,z1=-14.25+(bay+1)*28.5/14;
        const variation=.8+.12*Math.sin(f*3+bay*7);
        wall(darkGlass,[x,y+.25,z0+.04],[x,y+.25,z1-.04],[x,yTop,z1-.04],[x,yTop,z0+.04],[.095*variation,.13*variation,.14*variation]);
        box(frames,[x,y+1.8,z0],[.10,3.0,.08]);
      }
      // Segment curved, tapered projecting edges instead of a flat white box.
      for(let i=0;i<28;i++) {
        const z0=-14.6+i*29.2/28,z1=-14.6+(i+1)*29.2/28;
        const droop=z=>.32*Math.pow(Math.abs(z)/14.6,6);
        const nose=side*24.1;
        wall(fins,[nose,y-droop(z0),z0],[nose,y-droop(z1),z1],[nose,y+.6-droop(z1),z1],[nose,y+.6-droop(z0),z0],[.65,.63,.57]);
        wall(fins,[x,y+.6,z0],[nose,y+.6-droop(z0),z0],[nose,y+.6-droop(z1),z1],[x,y+.6,z1],[.72,.70,.64]);
        wall(fins,[x,y,z0],[x,y,z1],[nose,y-droop(z1),z1],[nose,y-droop(z0),z0],[.42,.42,.39]);
      }
    }
    // Sculpted crown, recessed downward in the middle with uplifted corners.
    for(let i=0;i<32;i++) {
      const z0=-16+i,z1=z0+1;
      const crown=z=>height-4.2*(1-Math.pow(Math.abs(z)/16,2));
      const tint=[.62+.025*Math.sin(i),.61+.025*Math.sin(i),.56+.025*Math.sin(i)];
      wall(stone,[side*23,82.2,z0],[side*23,82.2,z1],[side*23,crown(z1),z1],[side*23,crown(z0),z0],tint);
    }
  }
  // Curved, nearly windowless side walls faced in flamed granite. Panel joints
  // and the small dark service windows are visible in the published photos.
  for(const side of [-1,1]) {
    const zAt=x=>side*(16.2+.55*Math.sin(Math.PI*(x+23)/46));
    for(let i=0;i<23;i++) {
      const x0=-23+i*2,x1=x0+2;
      const panel=(y0,y1,xA=x0,xB=x1-.025)=>{
        const v=.60+.025*Math.sin(i*2.1+y0*.23);
        wall(stone,[xA,y0,zAt(xA)],[xB,y0,zAt(xB)],[xB,y1,zAt(xB)],[xA,y1,zAt(xA)],[v,v*.985,v*.92]);
      };
      for(let row=0;row<8;row++) panel(row*2.8,(row+1)*2.8-.025);
      for(let f=0;f<17;f++) {
        const y=22.4+f*3.55, end=y+3.525;
        if(i===9) {
          panel(y,y+1.3); panel(y+1.78,end);
          panel(y+1.3,y+1.78,x0,x0+.22); panel(y+1.3,y+1.78,x1-.25,x1-.025);
          wall(darkGlass,[x0+.22,y+1.3,zAt(x0)+side*.025],[x1-.25,y+1.3,zAt(x1)+side*.025],
            [x1-.25,y+1.78,zAt(x1)+side*.025],[x0+.22,y+1.78,zAt(x0)+side*.025],[.055,.075,.075]);
        } else panel(y,end);
      }
      const crown=x=>height-4.2*(1-Math.pow(Math.abs(x)/23,2));
      wall(stone,[x0,82.75,zAt(x0)],[x1,82.75,zAt(x1)],[x1,crown(x1),zAt(x1)],[x0,crown(x0),zAt(x0)],[.60,.59,.55]);
    }
    // End pilasters and narrow granite return at each end of the sunshades.
    for(const x of [-23.0,23.0]) box(piers,[x,41.5,side*15.2],[2.6,83,2.1]);
    colliders.push(harbourCityLocalCollider(site,0,side*16.2,46,.6,base,base+83));
  }
  // South podium: a recessed, curved granite front and a glazed arch. The
  // central 4.4 m opening stays genuinely empty at walking height.
  const xAt=z=>-23.0+1.25*(1-Math.min(1,(z/15)**2));
  const arch=z=>3.4+8.5*Math.pow(Math.max(0,1-(z/9.5)**2),.7);
  for(let i=0;i<60;i++) {
    const z0=-15+i*.5,z1=z0+.5, mid=(z0+z1)/2;
    const y0=arch(z0), y1=arch(z1), tint=.57+.018*Math.sin(i*1.9);
    wall(stone,[xAt(z0),y0,z0],[xAt(z1),y1,z1],[xAt(z1),17,z1],[xAt(z0),17,z0],[tint,tint*.98,tint*.92]);
    if(Math.abs(mid)>2.2) wall(darkGlass,[xAt(z0)+.05,.3,z0],[xAt(z1)+.05,.3,z1],[xAt(z1)+.05,y1,z1],[xAt(z0)+.05,y0,z0],[.105,.15,.16]);
    else wall(darkGlass,[xAt(z0)+.05,4.4,z0],[xAt(z1)+.05,4.4,z1],[xAt(z1)+.05,y1,z1],[xAt(z0)+.05,y0,z0],[.105,.15,.16]);
    if(i%4===0) beam(frames,[xAt(z0)-.02,Math.abs(z0)<2.2?4.4:.35,z0],[xAt(z0)-.02,y0,z0],.07);
  }
  box(frames,[-22.5,4.5,0],[3.1,.22,6.1]);
  for(const side of [-1,1]) colliders.push(harbourCityLocalCollider(site,-22.6,side*8.7,1.2,12.8,base,base+17));
  colliders.push(harbourCityLocalCollider(site,-22.0,0,1,4.4,base+4.4,base+17));
  colliders.push(harbourCityLocalCollider(site,23,0,1,32.4,base,base+83));
  colliders.push(harbourCityLocalCollider(site,0,0,46,32.4,base+22,base+83));
  // Deep open landscape terrace between podium and tower, visible in photos.
  for(let i=0;i<7;i++) {
    const z=-12+i*4;box(roof,[-21,17.15,z],[1.4,.45,3]);
    sphere(planting,[-21,18.0,z],.85,8);
  }
  for(const z of [-12,12]) {box(trunks,[-19.8,19.0,z],[.18,3,.18]);sphere(planting,[-19.8,20.6,z],1.5,9);}
  box(roof,[0,82.3,0],[44,1,30]);
  meshStore(root,stone,stoneMat,'Hong Kong Club flamed granite articulated podium and cores');
  meshStore(root,darkGlass,glassMat,'Hong Kong Club recessed glazing and arched entrance');
  meshStore(root,fins,finMat,'Hong Kong Club 17 sculpted horizontal sunshades');
  merged(root,frames,frameMat,'Hong Kong Club facade mullions and entrance canopy');
  merged(root,roof,roofMat,'Hong Kong Club roof and terrace planters');
  merged(root,piers,pierMat,'Hong Kong Club granite corner piers');
  merged(root,planting,plantMat,'Hong Kong Club podium terrace greenery');
  merged(root,trunks,trunkMat,'Hong Kong Club terrace tree trunks');
  const landmark={name:'香港會所大廈',englishName:'The Hong Kong Club Building',x:site.x,z:site.z,w:site.w,d:site.d,h:height,ring:site.ring,bounds:site.bounds,osmId:site.osmId,kind:'landmark',labelHeight:false};
  return {group:root,colliders,landmarks:[landmark],stats:{hongKongClubParcel:site.osmId,hongKongClubHeight:height,hongKongClubOfficeFloors:floors,hongKongClubGround:base}};
}
