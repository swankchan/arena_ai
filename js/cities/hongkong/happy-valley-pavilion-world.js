// Pavilion Stand: source outline with photo-directed horizontal balconies.
// Actual heights, interior, ground entrances and operating lighting are not surveyed.
import * as THREE from 'three/webgpu';
import { color, attribute } from 'three/tsl';
import { HAPPY_VALLEY_PAVILION as site } from './happy-valley-pavilion-site.js';
import { HAPPY_VALLEY_SITE as venue } from './happy-valley-racecourse-architecture.js';
import { harbourCityWorldToLocal, harbourCityRingColliders, harbourCityEdgeOutward } from './harbour-city-architecture.js';
import { roofGeometry, store, quad, meshStore, beam, merged, nightAmount } from './harbour-city-world-utils.js';

export function buildHappyValleyPavilion(parent, groundOffset) {
  const origin = harbourCityWorldToLocal(venue, site.x, site.z);
  const group = new THREE.Group(); group.name = 'HappyValleyPavilionStand';
  group.position.set(origin.x, 0, origin.z); group.rotation.y = site.ry - venue.ry; parent.add(group);
  const stone = new THREE.MeshStandardMaterial({color:0xb4b1a5,roughness:.8,side:THREE.DoubleSide});
  const fascia = new THREE.MeshStandardMaterial({color:0x929894,roughness:.68,metalness:.12});
  const seat = new THREE.MeshStandardMaterial({color:0x22486a,roughness:.77});
  const metal = new THREE.MeshStandardMaterial({color:0x69777b,roughness:.55,metalness:.32});
  const glass = new THREE.MeshStandardNodeMaterial({vertexColors:true,roughness:.38,metalness:.16,side:THREE.DoubleSide});
  glass.colorNode = attribute('color');
  glass.emissiveNode = color(0xffc889).mul(attribute('aLit','float')).mul(nightAmount()).mul(.6);
  const warm = new THREE.MeshStandardNodeMaterial({color:0xffd9a5,roughness:.6});
  warm.emissiveNode = color(0xffc16d).mul(nightAmount()).mul(1.15);
  const wall = store(), panes = store(), decks = store(), bands = [], frames = [], roofParts = [], lights = [], seats = [];
  const ring = site.localRing;
  for (let edge=0; edge<ring.length/2-1; edge++) {
    const i=edge*2, ax=ring[i], az=ring[i+1], bx=ring[i+2], bz=ring[i+3];
    const dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz), out=harbourCityEdgeOutward(ring,edge);
    const at=(t,y,inset=0)=>[ax+dx*t-out.nx*inset,y,az+dz*t-out.nz*inset];
    // Dark recessed glazing on the complete mapped wall; short end walls are
    // clad separately. Per-bay colours and night emission avoid a blank slab.
    if (L < 7) {
      quad(wall,at(0,0),at(1,0),at(1,site.height),at(0,site.height),[.68,.68,.64]);
      continue;
    }
    const bays=Math.max(1,Math.round(L/4));
    // The race-facing terraces recess their glazing behind a shallow deck.
    const recess = edge === 1 ? 2.05 : .08;
    for(let floor=0;floor<site.levels;floor++) {
      const y=1.1+floor*3.35, y2=y+2.45;
      for(let b=0;b<bays;b++) {
        const t0=(b+.025)/bays,t1=(b+.975)/bays;
        const lit=(edge===1 && floor>=1 && floor<=7) ? (((floor*17+b*13)%7===0) ? .16 : .32) : (((floor*17+b*13+edge*7)%9<2) ? .24 : 0);
        quad(panes,at(t0,y,recess),at(t1,y,recess),at(t1,y2,recess),at(t0,y2,recess),[.10,.16,.17],lit);
      }
      // Inset slightly so the band stays within the mapped building envelope.
      beam(bands,at(0,y-.22,0.25),at(1,y-.22,0.25),.34,.42);
      beam(frames,at(0,y2,recess+.04),at(1,y2,recess+.04),.09,.1);
      for(let b=0;b<=bays;b++) beam(frames,at(b/bays,y,recess+.06),at(b/bays,y2,recess+.06),.10,.12);
    }
    // Blue-grey horizontal balcony rail and deeper fascia on the race-facing
    // long edge, matching the broad tiers in the 2008 photograph.
    if(edge===1) for(let floor=1;floor<8;floor++) {
      const y=1.1+floor*3.35;
      // Deck, pale concrete fascia and metal railing, all inside the footprint.
      quad(decks,at(0,y-.26,.22),at(1,y-.26,.22),at(1,y-.26,2.05),at(0,y-.26,2.05),[.66,.65,.60]);
      beam(frames,at(0,y+.72,0.24),at(1,y+.72,0.24),.12,.14);
      beam(frames,at(0,y+.27,0.24),at(1,y+.27,0.24),.08,.10);
      beam(bands,at(0,y-.2,0.32),at(1,y-.2,0.32),.55,.62);
      for(let b=0;b<=bays;b++) beam(frames,at(b/bays,y-.1,.24),at(b/bays,y+.72,.24),.08,.1);
      for(let b=0;b<bays;b+=2) beam(lights,at((b+.2)/bays,y+2.75,1.25),at((b+.8)/bays,y+2.75,1.25),.08,.12);
      // Short banks of seating on each terrace, broken by aisles.
      const rows=Math.max(1,Math.floor(L/1.05));
      for(let b=0;b<rows;b++) {
        if(b%14===0 || b%14===1) continue;
        const t=(b+.5)/rows;
        beam(seats,at(t,y-.03,1.28),at(t,y+.40,1.55),.39,.14);
      }
    }
    beam(roofParts,at(0,35.3,0.35),at(1,35.3,0.35),.65,.72);
    if(edge===1) {
      // A deep canopy above the viewing levels, rather than a flat glass box.
      quad(decks,at(0,35.25,.18),at(1,35.25,.18),at(1,35.65,4.2),at(0,35.65,4.2),[.65,.64,.61]);
      beam(roofParts,at(0,35.0,.40),at(1,35.0,.40),1.05,.8);
    }
  }
  meshStore(group,wall,stone,'HappyValleyPavilionEndWalls');
  meshStore(group,panes,glass,'HappyValleyPavilionGlazing');
  meshStore(group,decks,stone,'HappyValleyPavilionTerraces');
  merged(group,lights,warm,'HappyValleyPavilionDeckLights');
  merged(group,seats,seat,'HappyValleyPavilionTerraceSeats');
  merged(group,bands,stone,'HappyValleyPavilionFloorBands');
  merged(group,frames,metal,'HappyValleyPavilionMullions');
  merged(group,roofParts,fascia,'HappyValleyPavilionRoofFascia');
  const top=new THREE.Mesh(roofGeometry(ring,site.height),fascia);top.name='HappyValleyPavilionRoof';group.add(top);
  return { group, colliders: harbourCityRingColliders(site,groundOffset,groundOffset+site.height,0.35) };
}
