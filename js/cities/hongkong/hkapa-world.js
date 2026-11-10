import * as THREE from 'three/webgpu';
import { color, attribute, positionWorld, smoothstep, float } from 'three/tsl';
import { HKAPA_SITE, HKAPA_ACADEMIC, HKAPA_THEATRE, HKAPA_WEST, hkapaTerrainHeightAt } from './hkapa-architecture.js';
import { HKAPA_MASSING } from './hkapa-massing-data.js';
import { hkapaPadHeight } from './terrain.js';
import { civicRingPrism } from './civic-world-utils.js';
import { box, beam, merged, roofGeometry, store, quad, meshStore, nightAmount } from './harbour-city-world-utils.js';
import { harbourCitySegmentCollider } from './harbour-city-architecture.js';

// These heights, subdivision and architectural details are photo-directed, not measured architectural drawings.
// The mapped internal driveway remains a genuine gap at ground level, bridged only above the vehicle clearance.
export function buildHkapa(scene) {
  const base=hkapaPadHeight(), root=new THREE.Group(); root.name='香港演藝學院 Hong Kong Academy for Performing Arts'; root.position.y=base;
  const tile=new THREE.MeshStandardNodeMaterial({color:0xb0aea3,roughness:.88,side:THREE.DoubleSide});
  // Approximate the warm architectural floodlighting visible in the night reference.
  // Localized emission avoids washing the whole building in a uniform night glow.
  const vertical=smoothstep(base+.3,base+4,positionWorld.y).mul(float(1).sub(smoothstep(base+19,base+27,positionWorld.y)));
  const frontage=smoothstep(219,231,positionWorld.z);
  const pool=x=>float(1).sub(smoothstep(2,13,positionWorld.x.sub(x).abs()));
  const pools=pool(1002).add(pool(1061)).add(pool(1093)).min(1);
  tile.emissiveNode=color(0xffb46d).mul(nightAmount()).mul(vertical).mul(frontage).mul(pools).mul(.18);

  const lightTile=new THREE.MeshStandardMaterial({color:0xc1beb0,roughness:.84,side:THREE.DoubleSide});
  const roof=new THREE.MeshStandardMaterial({color:0x8e938c,roughness:.82,side:THREE.DoubleSide});
  const seams=new THREE.MeshStandardMaterial({color:0x868a82,roughness:.86});
  const dark=new THREE.MeshStandardMaterial({color:0x273a3d,roughness:.42,metalness:.28,side:THREE.DoubleSide});
  const frame=new THREE.MeshStandardMaterial({color:0xa9aaa2,roughness:.73,metalness:.13});
  const glass=new THREE.MeshStandardNodeMaterial({color:0x233e45,roughness:.27,metalness:.2,side:THREE.DoubleSide});glass.emissiveNode=color(0x49808c).mul(nightAmount()).mul(.13);
  const litGlass=new THREE.MeshStandardNodeMaterial({vertexColors:true,roughness:.35,metalness:.15,side:THREE.DoubleSide});litGlass.colorNode=attribute('color');litGlass.emissiveNode=color(0xffca82).mul(attribute('aLit','float')).mul(nightAmount()).mul(.52);
  const warm=new THREE.MeshStandardNodeMaterial({color:0xffd69b,roughness:.4});warm.emissiveNode=color(0xffb459).mul(nightAmount()).mul(1.2);
  const p=(name,ring,h,mat=tile)=>civicRingPrism(root,ring,-1,h,mat,roof,name);
  // The mapped main entrance is a shared vertex on the south frontage. Split both
  // adjoining wall edges instead of putting a decorative door on a solid wall.
  const academic=HKAPA_MASSING.academic, wallPositions=[];
  const wall=(edge,t0,t1,y0,y1)=>{const i=edge*2,ax=academic[i],az=academic[i+1],dx=academic[i+2]-ax,dz=academic[i+3]-az;const a=[ax+dx*t0,y0,az+dz*t0],b=[ax+dx*t1,y0,az+dz*t1],c=[b[0],y1,b[2]],d=[a[0],y1,a[2]];wallPositions.push(...a,...b,...c,...a,...c,...d);};
  for(let e=0;e<academic.length/2-1;e++){
    const i=e*2,L=Math.hypot(academic[i+2]-academic[i],academic[i+3]-academic[i+1]);
    if(e===7){const t=1-2/L;wall(e,0,t,-1,27.5);wall(e,t,1,4.2,27.5);}
    else if(e===8){const t=2/L;wall(e,t,1,-1,27.5);wall(e,0,t,4.2,27.5);}
    else wall(e,0,1,-1,27.5);
  }
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wallPositions,3));wg.computeVertexNormals();
  const wm=new THREE.Mesh(wg,tile);wm.name='Academic block ceramic walls with main entrance';wm.castShadow=true;wm.receiveShadow=true;root.add(wm);
  const wr=new THREE.Mesh(roofGeometry(academic,27.5),roof);wr.name='Academic block roof';wr.castShadow=true;root.add(wr);
  p('Enclosed amphitheatre west wing',HKAPA_MASSING.western,11.5);
  p('Theatre lower stepped volume',HKAPA_MASSING.theatreFront,24);p('Theatre taller volume',HKAPA_MASSING.theatreRear,31);
  const structural=[],metal=[],panes=store(),stripes=[],roofParts=[],lights=[];
  // Gloucester Road academic frontage follows the long south face of the mapped building.
  // The mapped south frontage bends at the entrance; use both real source edges.
  // A single chord cuts behind the wall by almost a metre, hiding the glazing.
  const A=academic.slice(14,16), C=academic.slice(16,18), B=academic.slice(18,20);
  const l0=Math.hypot(C[0]-A[0],C[1]-A[1]),l1=Math.hypot(B[0]-C[0],B[1]-C[1]),len=l0+l1;
  const facadeFrame=u=>{const first=u<=l0, p=first?A:C, q=first?C:B, L=first?l0:l1,t=(first?u:u-l0)/L, ux=(q[0]-p[0])/L,uz=(q[1]-p[1])/L;return {x:p[0]+(q[0]-p[0])*t,z:p[1]+(q[1]-p[1])*t,ux,uz,ry:-Math.atan2(uz,ux)};};
  const fp=(u,y,o=0)=>{const f=facadeFrame(u);return [f.x-f.uz*o,y,f.z+f.ux*o];};
  const ebox=(parts,u,y,o,w,h,d)=>box(parts,fp(u,y,o),[w,h,d],facadeFrame(u).ry);
  const facadeBeam=(parts,start,end,y,o,w,d)=>{let cuts=[start,...(start<l0&&end>l0?[l0]:[]),end];for(let i=1;i<cuts.length;i++)beam(parts,fp(cuts[i-1],y,o),fp(cuts[i],y,o),w,d);};
  // The broad dark band is recessed-looking; structural X-members and mullions are real geometry.
  const left=8.3,right=59.5,bays=6,step=(right-left)/bays;
  for(let row=0;row<4;row++){
    const y0=5.3+row*4.1,y1=y0+3.4;
    for(let bay=0;bay<bays;bay++){
      const u0=left+bay*step,u1=u0+step;
      const lit=((row*7+bay*11)%7===1 || (row===1&&bay===3))?.55:0;
      quad(panes,fp(u0,y0,.15),fp(u1,y0,.15),fp(u1,y1,.15),fp(u0,y1,.15),[.045,.075,.075],lit);
    }
    facadeBeam(structural,left,right,y0,.4,.37,.48);
  }
  // The 2015 street photograph shows one tall X spanning two window rows,
  // rather than one squat X per row. The horizontal floor line still crosses
  // the midpoint; the placement is photo-directed, not structural survey.
  for(let pair=0;pair<2;pair++) for(let bay=0;bay<bays;bay++) {
    const u0=left+bay*step,u1=u0+step,y0=5.3+pair*8.2,y1=y0+7.5;
    beam(structural,fp(u0,y0,.43),fp(u1,y1,.43),.42,.48);
    beam(structural,fp(u0,y1,.43),fp(u1,y0,.43),.42,.48);
  }
  facadeBeam(structural,left,right,21.1,.4,.38,.48);
  for(let i=0;i<=bays;i++)ebox(structural,left+i*step,13.2,.4,.4,16.2,.5);
  // Real cladding seams on the large end piers and above and below the window lattice.
  for(let u=0;u<=len;u+=2.35){ if(u>left-.5&&u<right+.5)continue;ebox(stripes,u,14,.06,.035,27,.035); }
  for(let y of [4.6,22.4,26.4])facadeBeam(stripes,0,len,y,.08,.045,.04);
  // Exposed rooftop colonnade and an overhanging horizontal roof beam, rather than a closed white parapet.
  ebox(roofParts,33.8,29.2,-1.1,64,.4,.95);
  for(let u=5;u<=63;u+=5.4)ebox(roofParts,u,28.2,-1.1,.28,2,.32);
  ebox(roofParts,33.8,27.2,-1.1,64,.35,1.2);
  // Multi-pane glazed atrium over the driveway, with a clear vehicle passage below.
  // Axis follows the OSM service way, so no ground-level wall crosses it.
  const x0=1045,z0=197,x1=1072,z1=227, mx=(x0+x1)/2,mz=(z0+z1)/2;
  const atrium=new THREE.Group();atrium.name='Glazed atrium over open service drive';atrium.position.set(mx,0,mz);atrium.rotation.y=-Math.atan2(z1-z0,x1-x0);root.add(atrium);
  const ap=[],ag=[],af=[];box(ap,[0,8.8,0],[35,7.6,8.1]);
  for(let x=-17;x<=17;x+=3.4){box(af,[x,8.8,4.12],[.12,7.6,.15]);box(af,[x,8.8,-4.12],[.12,7.6,.15]);}
  for(let y of [5.1,8.8,12.5])for(let z of [-4.12,4.12])box(af,[0,y,z],[35,.12,.15]);
  box(ag,[0,12.7,0],[35,.24,8.5]);merged(atrium,ap,glass,'Atrium blue-grey glazing');merged(atrium,af,frame,'Atrium steel mullions');merged(atrium,ag,roof,'Atrium upper edge');
  // Street-facing glazed end of the connecting atrium, above the service opening.
  // The south elevation is an estimated setback, not a separate mapped footprint.
  const streetGlass=[],streetFrames=[];
  box(streetGlass,[1075.8,11.1,234.0],[9,12,.16]);
  for(let x=1071.3;x<=1080.3;x+=1.5)box(streetFrames,[x,11.1,234.12],[.11,12,.14]);
  for(let y of [5.1,8.1,11.1,14.1,17.1])box(streetFrames,[1075.8,y,234.12],[9,.11,.14]);
  merged(root,streetGlass,glass,'Street-facing atrium glass above driveway');
  merged(root,streetFrames,frame,'Street-facing atrium mullions');

  // Roof glazing and triangulation on the lower west wing evokes the now-covered amphitheatre.
  box(roofParts,[957,12.0,180],[27,.25,21]);
  for(let i=-3;i<=3;i++)box(metal,[957+i*3.8,12.22,180],[.16,.14,21]);
  for(let i=-2;i<=2;i++)box(metal,[957,12.23,180+i*4],[27,.14,.16]);
  // Dark horizontal theatre recesses and thin seams keep the large pale masses legible.
  for(let x of [1081,1089,1097,1105])box(stripes,[x,12.5,231.3],[.04,20,.05]);
  box(metal,[1092,12.2,232],[17,2.3,.16]);
  for(const x of [1008,1045,1087])box(lights,[x,.45,236.7],[.25,.2,.25]);
  merged(root,structural,lightTile,'Academic facade triangular X-bracing');merged(root,stripes,seams,'Fine ceramic cladding joints');
  merged(root,roofParts,lightTile,'Exposed academic crown and western roof');merged(root,metal,dark,'Theatre recesses and roof framing');
  meshStore(root,panes,litGlass,'Academic individual lit and unlit glazing');merged(root,lights,warm,'Warm exterior marker lights');
  const colliders=[];
  for(const site of [HKAPA_ACADEMIC,HKAPA_THEATRE,HKAPA_WEST])for(let e=0;e<site.localRing.length/2-1;e++){
    const height=site===HKAPA_WEST?11.5:site===HKAPA_THEATRE?31:27.5;
    if(site===HKAPA_ACADEMIC && (e===7 || e===8)){
      const i=e*2,L=Math.hypot(site.localRing[i+2]-site.localRing[i],site.localRing[i+3]-site.localRing[i+1]),t=2/L;
      if(e===7){colliders.push(harbourCitySegmentCollider(site,e,0,1-t,base-1,base+height,.22));colliders.push(harbourCitySegmentCollider(site,e,1-t,1,base+4.2,base+height,.22));}
      else {colliders.push(harbourCitySegmentCollider(site,e,t,1,base-1,base+height,.22));colliders.push(harbourCitySegmentCollider(site,e,0,t,base+4.2,base+height,.22));}
    } else colliders.push(harbourCitySegmentCollider(site,e,0,1,base-1,base+height,.22));
  }
  root.userData.sourceWay=HKAPA_SITE.osmId; scene.add(root);
  let vertices=0,nonFinite=0;root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.getAttribute('position');if(a){vertices+=a.count;for(const v of a.array)if(!Number.isFinite(v))nonFinite++;}});
  return {root,colliders,landmarks:[{id:'hkapa',name:'香港演藝學院',position:{x:HKAPA_SITE.x,y:base,z:HKAPA_SITE.z},radius:90,height:31}],stats:{hkapaSourceWay:117088641,hkapaFacadeBays:bays,hkapaFacadeRows:4,hkapaTwoStoreyBraces:bays*2*2,hkapaVertices:vertices,hkapaNonFinite:nonFinite},groundHeightAt:(x,z,g)=>hkapaTerrainHeightAt(x,z,g,base)};
}
