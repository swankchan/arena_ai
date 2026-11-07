import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { IFC_MALL_PARTS } from './ifc-mall-architecture.js';
import { TWO_IFC_SITE } from './two-ifc-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { hongKongTerrainHeight } from './terrain.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { harbourCityEdgeOutward, harbourCityLocalToWorld, harbourCitySegmentCollider } from './harbour-city-architecture.js';
import { store, quad, point, edgeBox, meshStore, merged, roofGeometry, box, cylinder, sphere } from './harbour-city-world-utils.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

// Mapped shells, photo-directed facades and roof garden; see docs/ifc-mall-research.md.
export function buildIfcMall(scene) {
  const group=new THREE.Group();group.name='IFC Mall — 國際金融中心商場';scene.add(group);
  const datum=hongKongTerrainHeight(TWO_IFC_SITE.x,TWO_IFC_SITE.z), roofY=datum+30;
  const colliders=[],stats={ifcMallRelation:13849938,ifcMallRoofHeight:roofY,ifcMallGlassPanels:0,ifcMallRoadOpenings:0,ifcMallRoofTrees:0};
  const glass=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide,roughness:.29,metalness:.25});glass.colorNode=attribute('color');
  const metal=new THREE.MeshStandardMaterial({color:0x879596,roughness:.55,metalness:.35});
  const paving=new THREE.MeshStandardMaterial({color:0x87918c,roughness:.87});
  const darkStone=new THREE.MeshStandardMaterial({color:0x596361,roughness:.83});
  const leaf=new THREE.MeshStandardMaterial({color:0x3d7147,roughness:.94});
  const grass=new THREE.MeshStandardMaterial({color:0x59854d,roughness:.95});
  const trunk=new THREE.MeshStandardMaterial({color:0x5e4e3c,roughness:.95});
  const water=new THREE.MeshStandardMaterial({color:0x387780,roughness:.28,metalness:.2});
  for(const {site,kind} of IFC_MALL_PARTS){
    const part=new THREE.Group();part.name=`IFC Mall OSM ${site.osmId} ${kind}`;part.position.set(site.x,datum,site.z);part.rotation.y=site.ry;group.add(part);
    merged(part,[roofGeometry(site.localRing,30)],paving,`IFC Mall ${site.osmId} roof`);
    if(kind==='bridge'){const material=darkStone.clone();material.side=THREE.DoubleSide;merged(part,[roofGeometry(site.localRing,7.5)],material,`IFC Mall ${site.osmId} elevated soffit`);}
    const panels=store(), frames=[], firstY=kind==='bridge'?7.5:0;
    for(let e=0;e<site.localRing.length/2-1;e++){
      const {length}=harbourCityEdgeOutward(site.localRing,e), n=Math.max(1,Math.ceil(length/1.8));
      const p=(t,y,o=0)=>point(site,e,t,y,o);
      for(let b=0;b<n;b++){
        const a=b/n,z=(b+1)/n,mid=p((a+z)/2,0),w=harbourCityLocalToWorld(site,mid[0],mid[2]);
        // Leave a generous, uncollided road portal wherever a surface road touches an edge.
        const road=kind!=='bridge'&&fullRoadSurfaceAt(w.x,w.z,1.5,datum);
        const bottom=road?7.5:firstY;if(road)stats.ifcMallRoadOpenings++;
        for(let f=0;f<4;f++){
          const lo=Math.max(bottom,f*7.5),hi=(f+1)*7.5;if(lo>=hi)continue;
          const tint=kind==='bridge'?[.21,.32,.36]:[.16,.26,.29];
          quad(panels,p(a+.005,lo+.25,.03),p(z-.005,lo+.25,.03),p(z-.005,hi-.30,.03),p(a+.005,hi-.30,.03),tint);stats.ifcMallGlassPanels++;
        }
        edgeBox(frames,site,e,a,(bottom+30)/2,.10,.11,30-bottom,.22);
        colliders.push(harbourCitySegmentCollider(site,e,a,z,datum+bottom,roofY,.22));
      }
      for(let y=7.5;y<=30;y+=7.5)edgeBox(frames,site,e,.5,y,.10,length,.35,.24);
    }
    meshStore(part,panels,glass,`IFC Mall ${site.osmId} glass curtain walls`);
    merged(part,frames,metal,`IFC Mall ${site.osmId} facade mullions and floor bands`);
    if(site.osmId===664250326){
      let edge=0,max=0;for(let e=0;e<site.localRing.length/2-1;e++){const l=harbourCityEdgeOutward(site.localRing,e).length;if(l>max){max=l;edge=e;}}
      const sign=makeCanvasSign(5,5,(ctx,c)=>{ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#f4f5f2';ctx.beginPath();ctx.ellipse(c.width*.48,c.height*.57,c.width*.23,c.height*.24,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(c.width*.62,c.height*.25,c.width*.1,c.height*.05,-.7,0,Math.PI*2);ctx.fill();},{transparent:true});
      const normal=harbourCityEdgeOutward(site.localRing,edge);sign.position.set(...point(site,edge,.5,20,.25));sign.rotation.y=Math.atan2(normal.nx,normal.nz);sign.name='IFC Mall Apple store bridge sign';part.add(sign);
    }
  }
  const retail=IFC_MALL_PARTS[0].site, garden=new THREE.Group();garden.name='IFC Mall rooftop garden';garden.position.set(retail.x,datum,retail.z);garden.rotation.y=retail.ry;group.add(garden);
  const beds=[],walks=[],pools=[],poolsEdge=[],canopies=[],trees=[],foliage=[];
  // Long garden spine, reflecting pool, covered path and planted court: photo-directed, not a survey.
  box(walks,[-25,30.06,0],[150,.12,5]);box(poolsEdge,[-38,30.12,-5],[52,.24,3.4]);box(pools,[-38,30.25,-5],[51.4,.06,2.8]);
  for(const x of [-90,-65,-5,20,45])for(const z of [-15,15])box(beds,[x,30.12,z],[17,.24,7]);
  for(let x=-92;x<=42;x+=8){box(canopies,[x,32.3,5],[.16,4.6,.16]);box(canopies,[x,32.3,10],[.16,4.6,.16]);}box(canopies,[-25,34.55,7.5],[142,.16,5.4]);
  for(const x of [-100,-84,-68,-52,-36,-20,-4,12,28,44])for(const z of [-22,22]){
    const w=harbourCityLocalToWorld(retail,x,z);if(!pointInFlatRing(retail.ring,w.x,w.z)||pointInFlatRing(TWO_IFC_SITE.ring,w.x,w.z))continue;
    cylinder(trees,[x,32,z],.17,3.8,8);sphere(foliage,[x,35,z],2.1,10);stats.ifcMallRoofTrees++;
  }
  merged(garden,walks,paving,'IFC Mall garden paved promenade');merged(garden,poolsEdge,darkStone,'IFC Mall pool edging');merged(garden,pools,water,'IFC Mall linear reflecting pool');merged(garden,beds,grass,'IFC Mall garden planting beds');merged(garden,canopies,metal,'IFC Mall covered garden walk');merged(garden,trees,trunk,'IFC Mall garden tree trunks');merged(garden,foliage,leaf,'IFC Mall garden trees');
  // Select the roof only for an entity already close to it; traffic remains at road level.
  function groundHeightAt(x,z,current,referenceY){
    if(referenceY<roofY-2.0 || referenceY>roofY+4.0)return current;
    if(IFC_MALL_PARTS.some(({site})=>pointInFlatRing(site.ring,x,z)))return roofY;
    return current;
  }
  const landmark={name:'國際金融中心商場',englishName:'IFC Mall',x:retail.x,z:retail.z,w:retail.w,d:retail.d,h:30,ring:retail.ring,bounds:retail.bounds,osmId:13849938,kind:'landmark',labelHeight:false};
  return {group,colliders,landmarks:[landmark],stats,groundHeightAt};
}
