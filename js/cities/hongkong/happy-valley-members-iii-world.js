// Members Stand III: mapped footprint, photo-informed tiers, inferred facade and entrance.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import { HAPPY_VALLEY_MEMBERS_III as site, HAPPY_VALLEY_MEMBERS_III_ENTRANCE as entrance } from './happy-valley-members-iii-site.js';
import { HAPPY_VALLEY_SITE as venue } from './happy-valley-racecourse-architecture.js';
import { harbourCityWorldToLocal, harbourCityEdgeOutward, harbourCitySegmentCollider } from './harbour-city-architecture.js';
import { roofGeometry, store, quad, meshStore, beam, merged, nightAmount } from './harbour-city-world-utils.js';
import { dropCollidersOverRoads } from './happy-valley-stand-road-clearance.js';

export function buildHappyValleyMembersIII(parent,groundOffset) {
  const origin=harbourCityWorldToLocal(venue,site.x,site.z);
  const group=new THREE.Group(); group.name='HappyValleyMembersStandIII';
  group.position.set(origin.x,0,origin.z);group.rotation.y=site.ry-venue.ry;parent.add(group);
  const concrete=new THREE.MeshStandardMaterial({color:0xbab4a4,roughness:.8,side:THREE.DoubleSide});
  const fascia=new THREE.MeshStandardMaterial({color:0x9ca5a5,roughness:.55,metalness:.25});
  const metal=new THREE.MeshStandardMaterial({color:0x708087,roughness:.5,metalness:.4});
  const seat=new THREE.MeshStandardMaterial({color:0x18518e,roughness:.7});
  const glass=new THREE.MeshStandardNodeMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.32,metalness:.22});
  glass.colorNode=attribute('color');glass.emissiveNode=color(0xffd19a).mul(attribute('aLit','float')).mul(nightAmount()).mul(.58);
  const light=new THREE.MeshStandardNodeMaterial({color:0xffdcb0});light.emissiveNode=color(0xffca85).mul(nightAmount()).mul(1.2);
  const shell=store(),panes=store(),decks=store(),threshold=store(),bands=[],mullions=[],rail=[],seats=[],lights=[],portal=[];
  const ring=site.localRing, j=entrance.edge*2, length=Math.hypot(ring[j+2]-ring[j],ring[j+3]-ring[j+1]);
  const start=entrance.centre-entrance.width/(2*length),end=entrance.centre+entrance.width/(2*length);
  for(let edge=0;edge<ring.length/2-1;edge++) {
    const i=edge*2,ax=ring[i],az=ring[i+1],dx=ring[i+2]-ax,dz=ring[i+3]-az,L=Math.hypot(dx,dz);
    const out=harbourCityEdgeOutward(ring,edge),at=(t,y,inset=0)=>[ax+dx*t-out.nx*inset,y,az+dz*t-out.nz*inset];
    // Narrow junction edges are structural rather than pretending to be a facade.
    if(L<7) {quad(shell,at(0,0,.04),at(1,0,.04),at(1,site.height,.04),at(0,site.height,.04),[.65,.65,.62]);continue;}
    const bays=Math.max(2,Math.round(L/3.6)), front=edge===3;
    for(let floor=0;floor<site.levels;floor++) {
      const y=.65+3.45*floor,top=y+2.65;
      // The documented outdoor 2/F viewing seats need deeper space; other
      // balcony and glazing proportions are inferred from stand photographs.
      const inset=front && floor===2?4.0:front && floor>0?1.7:.12;
      for(let b=0;b<bays;b++) {
        const t0=(b+.035)/bays,t1=(b+.965)/bays;
        const ranges=edge===entrance.edge && floor===0?[[t0,Math.min(t1,start)],[Math.max(t0,end),t1]]:[[t0,t1]];
        const lit=(floor*19+b*11+edge*7)%8<3?.28:0;
        for(const [lo,hi] of ranges) if(hi>lo) quad(panes,at(lo,y,inset),at(hi,y,inset),at(hi,top,inset),at(lo,top,inset),[.22,.28,.28],lit);
      }
      const fasciaY=y-.18;
      if(edge===entrance.edge && floor===0) {
        beam(bands,at(0,fasciaY,.25),at(start,fasciaY,.25),.4,.4);
        beam(bands,at(end,fasciaY,.25),at(1,fasciaY,.25),.4,.4);
      } else beam(bands,at(0,fasciaY,.25),at(1,fasciaY,.25),.82,.65);
      beam(mullions,at(0,top,inset+.03),at(1,top,inset+.03),.08,.09);
      for(let b=0;b<=bays;b++) {
        const t=b/bays;if(edge===entrance.edge && floor===0 && t>start && t<end) continue;
        beam(mullions,at(t,y,inset+.04),at(t,top,inset+.04),.08,.09);
      }
      if(front && floor>0) {
        quad(decks,at(0,y-.22,.18),at(1,y-.22,.18),at(1,y-.22,inset),at(0,y-.22,inset),[.62,.62,.59]);
        beam(rail,at(0,y+.75,.28),at(1,y+.75,.28),.09,.1);
        for(let b=0;b<=bays;b++) beam(rail,at(b/bays,y-.12,.28),at(b/bays,y+.75,.28),.07,.07);
        for(let b=0;b<bays;b+=2) beam(lights,at((b+.15)/bays,y+3.0,1.0),at((b+.8)/bays,y+3.0,1.0),.08,.1);
      }
      if(front && floor===2) {
        // Photo reference: blue tip-up seats in several rows, with aisles.
        const count=Math.floor(L/.53);
        for(let row=0;row<4;row++) {
          const near=.55+row*.72, far=near+.72, yStep=y-.15+row*.15;
          quad(decks,at(0,yStep,near),at(1,yStep,near),at(1,yStep,far),at(0,yStep,far),[.55,.56,.55]);
          if(row>0) quad(decks,at(0,yStep-.15,near),at(1,yStep-.15,near),at(1,yStep,near),at(0,yStep,near),[.49,.5,.49]);
        }
        for(let row=0;row<4;row++) for(let n=0;n<count;n++) {
          if(n%20===0||n%20===1) continue;
          const t=(n+.5)/count,depth=.85+row*.72,base=y-.15+row*.15;
          beam(seats,at(t,base+.30,depth),at(t,base+.62,depth+.18),.42,.09);
          beam(seats,at(t,base+.29,depth-.18),at(t,base+.29,depth+.16),.42,.08);
        }
      }
    }
    if(edge===entrance.edge) {
      for(const t of [start,end]) beam(portal,at(t,0,.1),at(t,entrance.height,.1),.16,.18);
      beam(portal,at(start,entrance.height,.1),at(end,entrance.height,.1),.16,.18);
      quad(threshold,at(start,.03,.12),at(end,.03,.12),at(end,.03,3.0),at(start,.03,3.0),[.6,.58,.53]);
    }
    beam(bands,at(0,35.45,.35),at(1,35.45,.35),.7,.7);
    if(front) quad(decks,at(0,35.1,.15),at(1,35.1,.15),at(1,35.5,4),at(0,35.5,4),[.65,.64,.61]);
  }
  meshStore(group,shell,concrete,'HappyValleyMembersIIIEndWalls');
  meshStore(group,panes,glass,'HappyValleyMembersIIIGlazing');
  meshStore(group,decks,concrete,'HappyValleyMembersIIITerraces');
  meshStore(group,threshold,concrete,'HappyValleyMembersIIIEntranceFloor',false);
  merged(group,bands,concrete,'HappyValleyMembersIIIFascias');
  merged(group,mullions,metal,'HappyValleyMembersIIIMullions');
  merged(group,rail,metal,'HappyValleyMembersIIIRails');
  merged(group,seats,seat,'HappyValleyMembersIIISeats');
  merged(group,lights,light,'HappyValleyMembersIIITerraceLights');
  merged(group,portal,metal,'HappyValleyMembersIIIEntranceFrame');
  const roof=new THREE.Mesh(roofGeometry(ring,site.height),fascia);roof.name='HappyValleyMembersIIIRoof';group.add(roof);
  const colliders=[];
  for(let edge=0;edge<ring.length/2-1;edge++) {
    const add=(a,b,min,max)=>colliders.push(harbourCitySegmentCollider(site,edge,a,b,min,max,.35));
    if(edge!==entrance.edge) add(0,1,groundOffset,groundOffset+site.height);
    else {add(0,start,groundOffset,groundOffset+site.height);add(end,1,groundOffset,groundOffset+site.height);add(start,end,groundOffset+entrance.height,groundOffset+site.height);}
  }
  // 黃泥涌道 crosses this mapped outline; never seal the street with a wall collider.
  const guarded=dropCollidersOverRoads(colliders);
  return {group,colliders:guarded.colliders,droppedColliders:guarded.removed};
}
