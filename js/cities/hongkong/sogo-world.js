import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { SOGO_SITE, SOGO_TOWER, SOGO_REAR, SOGO_ENTRANCES } from './sogo-architecture.js';
import { projectHongKongLonLat } from './authored-landmark-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { harbourCityEdgeOutward, harbourCitySegmentCollider, harbourCityLocalToWorld } from './harbour-city-architecture.js';
import { point, edgeBox, store, quad, meshStore, merged, roofGeometry } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

// Photo-directed exterior, not a measured drawing. The street advertisements are deliberately original artwork.
const PODIUM_TOP = 16, TOWER_TOP = 78, REAR_TOP = 54;
export function buildSogoCausewayBay(scene) {
  const base = hongKongTerrainHeight(SOGO_SITE.x, SOGO_SITE.z);
  const root = new THREE.Group(); root.name = 'SOGO Causeway Bay — 崇光百貨'; scene.add(root);
  const colliders = [];
  const vertex = new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide, roughness:.72, metalness:.12});
  vertex.colorNode = attribute('color').rgb;
  const framing = new THREE.MeshStandardMaterial({color:0x8f9593,roughness:.62,metalness:.25,side:THREE.DoubleSide});
  const groups = new Map();
  let bayCount = 0, diamondCount = 0, canopyCount = 0;
  for (const [site, kind, bottom, top] of [[SOGO_SITE,'podium',0,PODIUM_TOP],[SOGO_TOWER,'tower',PODIUM_TOP,TOWER_TOP],[SOGO_REAR,'rear',PODIUM_TOP,REAR_TOP]]) {
    const local = new THREE.Group(); local.name = `SOGO ${kind}`; local.position.set(site.x,base,site.z); local.rotation.y=site.ry; root.add(local); groups.set(kind,local);
    const pieces = store(), windows=store(), diamonds=store(), frames=[], topRoof=[];
    for (let e=0;e<site.localRing.length/2-1;e++) {
      const frame=harbourCityEdgeOutward(site.localRing,e), length=frame.length;
      if (length < .3) continue;
      const n = Math.max(1,Math.ceil(length / (kind==='podium' ? 2.4 : 2.8)));
      const face=(out,a,b,low,high,c,offset=0)=>quad(out,point(site,e,a,low,offset),point(site,e,b,low,offset),point(site,e,b,high,offset),point(site,e,a,high,offset),c);
      for(let j=0;j<n;j++) {
        const a=j/n,b=(j+1)/n;
        if(kind==='podium') {
          const p=point(site,e,(a+b)/2,0), w=harbourCityLocalToWorld(site,p[0],p[2]);
          const foot=Math.min(0,hongKongTerrainHeight(w.x,w.z)-base)-.12;
          face(windows,a+.012/n,b-.012/n,foot,4.5,[.065,.105,.12],.025);
          face(pieces,a,b,4.5,7.0,[.59,.61,.60],.01);
          face(pieces,a,b,7,16,[.64,.66,.65],.01);
          edgeBox(frames,site,e,a,2.2,.12,.085,4.4,.12);
          // Thin facade panel joints, not a single unbroken pale wall.
          edgeBox(frames,site,e,a,11.5,.08,.035,9,.06);
          // Solid glazed storefront: entrance positions are visible, but there is no playable interior.
          colliders.push(harbourCitySegmentCollider(site,e,a,b,base+foot,base+PODIUM_TOP,.20));
        } else {
          // Folded diamond-pattern cladding under the ribbon-glazed upper floors.
          const transition = kind==='tower' ? 46 : 39;
          const rows=Math.ceil((transition-bottom)/2.5);
          for(let k=0;k<rows;k++) {
            const lo=bottom+(transition-bottom)*k/rows, hi=bottom+(transition-bottom)*(k+1)/rows, mid=(a+b)/2, ym=(lo+hi)/2;
            const p0=point(site,e,a,lo,.03),p1=point(site,e,b,lo,.03),p2=point(site,e,b,hi,.03),p3=point(site,e,a,hi,.03),pm=point(site,e,mid,ym,.18);
            const triangle=(a,b,c,col)=>quad(diamonds,a,b,c,c,col);
            triangle(p0,p1,pm,[.62,.64,.63]);triangle(p1,p2,pm,[.73,.74,.72]);
            triangle(p2,p3,pm,[.66,.68,.67]);triangle(p3,p0,pm,[.57,.60,.59]); diamondCount++;
          }
          const floors=kind==='tower'?10:5;
          for(let k=0;k<floors;k++) {
            const lo=transition+(top-transition)*k/floors, hi=transition+(top-transition)*(k+1)/floors;
            const v=.93+.07*Math.sin(k*1.7+j*.8+e);
            face(pieces,a,b,lo,lo+1.05,[.65*v,.68*v,.67*v]);
            face(windows,a+.012/n,b-.012/n,lo+1.05,hi-.13,[.13*v,.21*v,.24*v],.03); bayCount++;
          }
          edgeBox(frames,site,e,a,(transition+top)/2,.12,.07,top-transition,.10);
        }
      }
      for(const h of kind==='podium'?[4.6,7,16]:[kind==='tower'?46:39,top]) edgeBox(frames,site,e,.5,h,.13,length,.16,.18);
      if(kind!=='podium') colliders.push(harbourCitySegmentCollider(site,e,0,1,base+bottom,base+top,.20));
    }
    topRoof.push(roofGeometry(site.localRing,top));
    meshStore(local,pieces,vertex,`SOGO ${kind} facade bands`,false);
    meshStore(local,windows,vertex,`SOGO ${kind} glazing`,false);
    meshStore(local,diamonds,vertex,`SOGO ${kind} faceted cladding`,false);
    merged(local,frames,framing,`SOGO ${kind} mullions and cornices`);
    merged(local,topRoof,framing,`SOGO ${kind} roof`);
  }
  const local=groups.get('podium');
  // The observed blue SOGO letters and circular mark are at the Hennessy / East Point Road corner.
  for(const e of [11,2]) {
    const f=harbourCityEdgeOutward(SOGO_SITE.localRing,e);
    const sign=makeCanvasSign(e===11 ? 9.5 : 10,3.0,(ctx,c)=>{
      ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#0678bc';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='bold 132px Georgia, serif';ctx.fillText('SOGO',c.width*.39,c.height/2,c.width*.68);
      ctx.strokeStyle='#0678bc';ctx.lineWidth=12;ctx.beginPath();ctx.arc(c.width*.84,c.height*.50,55,0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(c.width*.84-29,c.height*.50-27);ctx.lineTo(c.width*.84+29,c.height*.50+27);ctx.moveTo(c.width*.84+29,c.height*.50-27);ctx.lineTo(c.width*.84-29,c.height*.50+27);ctx.stroke();
    },{canvasWidth:768,canvasHeight:192});
    sign.name='SOGO blue corner lettering';sign.position.set(...point(SOGO_SITE,e,e===11?.88:.18,12,.26));sign.rotation.y=Math.atan2(f.nx,f.nz);local.add(sign);
    // A narrow canopy, only where its centre and ends do not meet a mapped road.
    const centre=e===11?.88:.18, spread=e===11?.10:.12;
    const safe=[centre-spread,centre,centre+spread].every(t=>{const p=point(SOGO_SITE,e,t,0,.65), w=harbourCityLocalToWorld(SOGO_SITE,p[0],p[2]);return !fullRoadSurfaceAt(w.x,w.z,.35,base);});
    if(safe){ const pieces=[];edgeBox(pieces,SOGO_SITE,e,centre,5,.5,f.length*spread*2,.28,1.0);merged(local,pieces,framing,'SOGO entrance canopy');canopyCount++; }
  }
  // Original illustrative billboards; the photographed displays change regularly.
  for (const e of [10,11]) {
    const f=harbourCityEdgeOutward(SOGO_SITE.localRing,e);
    const fraction=e===11 ? .76 : .94, mid=e===11 ? .39 : .5;
    const sign=makeCanvasSign(f.length*fraction,20,(ctx,c)=>{
      ctx.fillStyle='#102e44';ctx.fillRect(0,0,c.width,c.height);
      // Non-photographic, original floral-inspired display graphic; not a real campaign.
      const colours=['#e69b51','#a95179','#4e9d98','#d56658','#b8bb79'];
      for(let i=0;i<74;i++) { const x=((i*127+(e===11?70:0))%1024), y=(i*193)%512, r=15+(i%5)*5;
        ctx.fillStyle=colours[i%colours.length];ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#1c5d60';ctx.fillRect(x-3,y+r,6,65+(i%4)*12);
      }
      ctx.fillStyle='#142943';ctx.fillRect(c.width*.30,c.height*.31,c.width*.40,c.height*.37);
      ctx.fillStyle='#f2e8d6';ctx.font='bold 85px sans-serif';ctx.textAlign='center';ctx.fillText('SOGO',c.width*.5,c.height*.47);
      ctx.font='38px sans-serif';ctx.fillText('CAUSEWAY BAY',c.width*.5,c.height*.59);
    },{transparent:false,canvasWidth:1024,canvasHeight:512});
    sign.name='SOGO Hennessy Road advertising display';sign.position.set(...point(SOGO_SITE,e,mid,20,.28));sign.rotation.y=Math.atan2(f.nx,f.nz);local.add(sign);
  }
  // Surface entrance highlights are photo-directed near the OSM nodes. Glass doors are decorative:
  // the perimeter collider stays solid because the department-store interior is not modelled.
  const doors=[];
  for (const [edge,t,width] of [[12,.65,3.3],[2,.07,3.0],[3,.78,3.2]]) {
    const f=harbourCityEdgeOutward(SOGO_SITE.localRing,edge);
    edgeBox(doors,SOGO_SITE,edge,t,2.25,.22,width,.09,.12);
    for(const delta of [-width/2,0,width/2]) edgeBox(doors,SOGO_SITE,edge,t+delta/f.length,2.25,.22,.08,4.5,.12);
    edgeBox(doors,SOGO_SITE,edge,t,4.5,.22,width,.10,.12);
  }
  merged(local,doors,framing,'SOGO glazed entrance door frames');
  for (const entrance of SOGO_ENTRANCES) {
    const [x,z]=projectHongKongLonLat(entrance.lon,entrance.lat);
    const marker=new THREE.Group();marker.position.set(x,base,z);marker.name=`SOGO mapped ${entrance.kind} entrance ${entrance.id}`;root.add(marker);
  }
  const landmark={name:'崇光百貨',englishName:'SOGO Causeway Bay',x:SOGO_SITE.x,z:SOGO_SITE.z,w:SOGO_SITE.w,d:SOGO_SITE.d,h:TOWER_TOP,ring:SOGO_SITE.ring,bounds:SOGO_SITE.bounds,osmId:SOGO_SITE.osmId,kind:'landmark',labelHeight:false};
  return {group:root,colliders,landmarks:[landmark],stats:{sogoOsm:SOGO_SITE.osmId,sogoHeight:TOWER_TOP,sogoDiamondPanels:diamondCount,sogoWindowBays:bayCount,sogoCanopies:canopyCount}};
}
