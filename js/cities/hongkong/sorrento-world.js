import * as THREE from 'three/webgpu';
import {
  SORRENTO_SITE, SORRENTO_TOWER_SITES, SORRENTO_MAIN_ENTRANCE, SORRENTO_MIN_HEIGHT,
  SORRENTO_PODIUM_HEIGHT, SORRENTO_CROWN_HEIGHT, SORRENTO_GROUND_SOFFIT, sorrentoTerrainHeightAt,
} from './sorrento-architecture.js';
import { harbourCityEdgeOutward, harbourCityRingColliders } from './harbour-city-architecture.js';
import {
  store, quad, merged, meshStore, box, beam, edgeBox, point, ringBand, roofGeometry,
  harbourCityPalette, warmWindowEmission, createStreetLevel, hash, mix, featureGroup, signMesh,
} from './harbour-city-world-utils.js';
import { meshFromGeometry } from './tst-hotel-world-utils.js';

const lerp = (a,b,t) => a+(b-a)*t;

// Winged source rings carry individual teal panes, white floor edges, open metal rails and continuous pale fins.
function createSorrentoFacade(site,options) {
  const glass=store(),spandrel=store(),backing=store(),frames=[],fins=[],floorEdges=[];
  let panels=0,finCount=0;
  for(let edge=0;edge<site.localRing.length/2-1;edge++) {
    const length=harbourCityEdgeOutward(site.localRing,edge).length;if(length<.07)continue;
    const bays=Math.max(1,Math.round(length/(options.bayWidth??1.55))),p=(t,y,o=.04)=>point(site,edge,t,y,o);
    quad(backing,p(0,options.y0,-.17),p(1,options.y0,-.17),p(1,options.y1,-.17),p(0,options.y1,-.17),[.035,.065,.072]);
    for(let floor=0;floor<options.courses;floor++) {
      const low=lerp(options.y0,options.y1,floor/options.courses),high=lerp(options.y0,options.y1,(floor+1)/options.courses);
      const band=Math.min(options.spandrel??.46,(high-low)*.22);
      quad(spandrel,p(0,low+.025,.035),p(1,low+.025,.035),p(1,low+band,.035),p(0,low+band,.035),options.spandrelTint??[.32,.39,.39]);
      edgeBox(floorEdges,site,edge,.5,low+.07,.24,length+.025,.14,.54);
      if(options.rails)edgeBox(floorEdges,site,edge,.5,low+.70,.43,length+.02,.055,.07);
      for(let bay=0;bay<bays;bay++) {
        const t0=bay/bays+.00035,t1=(bay+1)/bays-.00035,variation=hash(edge+(site.osmId??23),floor+41,bay+67,options.seed??0);
        const tint=mix(options.glassA??[.035,.10,.12],options.glassB??[.16,.29,.30],.12+variation*.72);
        const lit=variation>(options.litThreshold??.88)?.04+hash(floor,bay,edge,1019)*.20:0;
        quad(glass,p(t0,low+band+.06),p(t1,low+band+.06),p(t1,high-.14),p(t0,high-.14),tint,lit);panels++;

      }
      edgeBox(frames,site,edge,.5,low+.03,.10,length+.03,.08,.18);
    }
    for(let bay=0;bay<=bays;bay++) {
      const structural=bay%3===0,q=p(bay/bays,(options.y0+options.y1)*.5,structural?.24:.13);
      box(structural?fins:frames,q,[structural?.15:.06,options.y1-options.y0,structural?.66:.24],harbourCityEdgeOutward(site.localRing,edge).ry);
      if(structural)finCount++;

    }
  }
  return{glass,spandrel,backing,frames,fins,floorEdges,panels,finCount};
}
function addSorrentoFacade(group,site,options,materials,name) {
  const facade=createSorrentoFacade(site,options);
  meshStore(group,facade.backing,materials.interior,`${name} — recessed dark teal backing`);
  meshStore(group,facade.spandrel,materials.interior,`${name} — cool-grey spandrel panels`);
  meshStore(group,facade.glass,materials.glazing,`${name} — individual blue-green residential panes`);
  merged(group,facade.frames,materials.metal,`${name} — fine window mullions and transoms`);
  merged(group,facade.fins,materials.paleStone,`${name} — continuous white vertical wing fins`);
  merged(group,facade.floorEdges,materials.paleStone,`${name} — white floor edges and open metal rails`);
  return facade;
}

function addCrown(group,site,materials,name) {
  const height=site.height,base=height-SORRENTO_CROWN_HEIGHT,walls=store(),dark=store(),fins=[];
  let maxX=0;for(let i=0;i<site.localRing.length;i+=2)maxX=Math.max(maxX,Math.abs(site.localRing[i]));
  const topAt=(x)=>base+5+3*(.5+.5*Math.cos(Math.min(1,Math.abs(x)/maxX)*Math.PI/2));
  for(let edge=0;edge<site.localRing.length/2-1;edge++) {
    const length=harbourCityEdgeOutward(site.localRing,edge).length;if(length<.07)continue;
    const p=(t,y,o=.035)=>point(site,edge,t,y,o),i=edge*2,x0=site.localRing[i],x1=site.localRing[i+2];
    // Match the roof's edge interpolation exactly: no gaps between the curved sail and its supporting crown wall.
    quad(walls,p(0,base),p(1,base),p(1,topAt(x1)),p(0,topAt(x0)),[.62,.49,.31]);
    for(const y of [base+1.25,base+3.05])quad(dark,p(0,y,.055),p(1,y,.055),p(1,y+.42,.055),p(0,y+.42,.055),[.08,.10,.10]);
    if(length>3.2)for(const t of [0,1])edgeBox(fins,site,edge,t,height-4.5,.15,.22,9,.52);
  }
  const roof=roofGeometry(site.localRing,0),position=roof.getAttribute('position');
  for(let i=0;i<position.count;i++)position.setY(i,topAt(position.getX(i)));position.needsUpdate=true;roof.computeVertexNormals();
  meshStore(group,walls,materials.crown,`${name} — source-ring beige crown walls with continuously curved top`);
  meshStore(group,dark,materials.dark,`${name} — recessed horizontal crown louvres`);
  meshFromGeometry(group,roof,materials.crown,`${name} — curved beige sail roof inside the exact tower ring`);
  merged(group,fins,materials.paleStone,`${name} — tall white side blades to the source height`);
  return{base,roof,maxHeight:height};
}

function buildTowers(root,base,materials) {
  const groups={},colliders=[],crowns={};let panels=0,fins=0,courses=0;
  for(const [index,site] of SORRENTO_TOWER_SITES.entries()) {
    const group=new THREE.Group();group.name=`${site.englishName} — exact winged ring, ${site.height} m and beige sail crown`;
    group.position.set(site.x,base,site.z);group.rotation.y=site.ry;root.add(group);groups[site.key]=group;
    const visualCourses=site.levels-6,bodyTop=site.height-SORRENTO_CROWN_HEIGHT;courses+=visualCourses;
    const facade=addSorrentoFacade(group,site,{y0:SORRENTO_MIN_HEIGHT,y1:bodyTop,courses:visualCourses,bayWidth:1.48,rails:true,seed:31+index*13,
      glassA:[.03,.085,.105],glassB:[.14,.25,.27],spandrelTint:[.26,.33,.34]},materials,site.englishName);
    meshFromGeometry(group,roofGeometry(site.localRing,bodyTop),materials.roof,`${site.englishName} — recessed roof deck below the crown`);
    crowns[site.key]=addCrown(group,site,materials,site.englishName);
    colliders.push(...harbourCityRingColliders(site,base+SORRENTO_MIN_HEIGHT,base+site.height,.42));
    panels+=facade.panels;fins+=facade.finCount;
  }
  return{groups,colliders,crowns,panels,fins,courses};
}

function curvedCanopyGeometry(width,projection) {
  const positions=[],indices=[],xSegments=24,zSegments=6;
  for(let z=0;z<=zSegments;z++)for(let x=0;x<=xSegments;x++) {
    const u=x/xSegments,v=z/zSegments,px=(u-.5)*width,pz=v*projection;
    const y=5.8+1.1*Math.cos((u-.5)*Math.PI)+.25*v;positions.push(px,y,pz);
  }
  for(let z=0;z<zSegments;z++)for(let x=0;x<xSegments;x++) {
    const a=z*(xSegments+1)+x,b=a+1,c=a+xSegments+1,d=c+1;indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function addCurvedCanopy(group,site,materials) {
  const canopy=featureGroup(site,SORRENTO_MAIN_ENTRANCE.sourceEdge,'Sorrento — sweeping white podium entrance canopy');group.add(canopy);
  meshFromGeometry(canopy,curvedCanopyGeometry(38,8.4),materials.canopy,'Sorrento — curved white shell canopy',false);
  const ribs=[];
  for(let x=-18;x<=18;x+=3){const u=x/38+.5,y=5.8+1.1*Math.cos((u-.5)*Math.PI);beam(ribs,[x,y-.08,0],[x,y+.17,8.4],.12,.16);}
  merged(canopy,ribs,materials.paleStone,'Sorrento — cantilevered curved canopy ribs and front fascia');
  const sign=signMesh('擎天半島','SORRENTO · 1 AUSTIN ROAD WEST',17,1.65,{background:'#e5e3dc',foreground:'#344448',accent:'#a8926c'});sign.position.set(0,8.4,.35);canopy.add(sign);
}

function buildPodium(root,base,materials) {
  const site=SORRENTO_SITE,group=new THREE.Group();group.name='Sorrento — exact six-level podium and curved white entrance canopy';
  group.position.set(site.x,base,site.z);group.rotation.y=site.ry;root.add(group);
  const street=createStreetLevel(site,{soffit:SORRENTO_GROUND_SOFFIT,customEdges:[SORRENTO_MAIN_ENTRANCE.sourceEdge],bayWidth:4.0,
    glassA:[.045,.11,.13],glassB:[.17,.28,.30],stoneTint:[.48,.48,.44]});
  meshStore(group,street.backing,materials.interior,'Sorrento podium — recessed lobby backing outside retained roads');
  meshStore(group,street.glass,materials.glazing,'Sorrento podium — road-safe ground glazing and open entrance');
  meshStore(group,street.stone,materials.interior,'Sorrento podium — pale stone ground spandrels');
  merged(group,street.frames,materials.metal,'Sorrento podium — preserved-road lintels');merged(group,street.columns,materials.paleStone,'Sorrento podium — road-safe columns');
  const upper=addSorrentoFacade(group,site,{y0:SORRENTO_GROUND_SOFFIT,y1:SORRENTO_PODIUM_HEIGHT,courses:5,bayWidth:2.3,rails:false,spandrel:1.0,seed:93,
    glassA:[.045,.11,.13],glassB:[.18,.29,.30],spandrelTint:[.50,.52,.49],litThreshold:.76},materials,'Sorrento five upper podium courses');
  meshFromGeometry(group,roofGeometry(site.localRing,SORRENTO_PODIUM_HEIGHT),materials.roof,'Sorrento podium — 25 m roof datum');
  const bands=[];ringBand(bands,site,24.55,.42,.24,.44);merged(group,bands,materials.paleStone,'Sorrento podium — white roof fascia');addCurvedCanopy(group,site,materials);
  const colliders=[...street.colliders.map(c=>({...c,minY:c.minY+base,maxY:c.maxY+base})),...harbourCityRingColliders(site,base+SORRENTO_GROUND_SOFFIT,base+SORRENTO_PODIUM_HEIGHT,.44)];
  return{group,colliders,openRoadBays:street.openRoadBays,entranceBays:street.entranceBays,panels:upper.panels};
}

export function buildSorrento(scene,{groundOffset=0}={}) {
  const root=new THREE.Group();root.name='Sorrento — five authored winged residential towers and sail crowns';scene.add(root);
  const materials=harbourCityPalette({stone:[.58,.58,.53],paleStone:[.82,.83,.79],metal:[.32,.39,.40],roof:[.28,.32,.32],roughness:.24,metalness:.36});
  materials.crown=new THREE.MeshStandardMaterial({color:0xc7ab7d,roughness:.61,metalness:.16});
  materials.canopy=new THREE.MeshStandardMaterial({color:0xe6e7df,roughness:.48,metalness:.18,side:THREE.DoubleSide});
  warmWindowEmission(materials.glazing,[1,.79,.52],.62);
  const podium=buildPodium(root,groundOffset,materials),towers=buildTowers(root,groundOffset,materials),colliders=[...podium.colliders,...towers.colliders];
  const landmarks=[SORRENTO_SITE,...SORRENTO_TOWER_SITES].map(site=>({name:site.name,englishName:site.englishName,x:site.x,z:site.z,w:site.w,d:site.d,
    h:site.height,bounds:{...site.bounds},ring:site.ring,osmId:site.osmId,
    heightEvidence:site===SORRENTO_SITE?'OSM height=25 / six levels / min_height=20':`OSM height=${site.height} / levels=${site.levels} / min_height=20; crown stays below source height`}));
  return{root,groups:{podium:podium.group,...towers.groups},colliders,landmarks,groundOffset,crowns:towers.crowns,
    sites:{podium:SORRENTO_SITE,towers:SORRENTO_TOWER_SITES},groundHeightAt:(x,z,ground)=>sorrentoTerrainHeightAt(x,z,ground,groundOffset),
    stats:{sorrentoSourceTowers:5,sorrentoPodiumHeight:SORRENTO_PODIUM_HEIGHT,sorrentoTowerHeights:SORRENTO_TOWER_SITES.map(s=>s.height),
      sorrentoVisualCourses:towers.courses,sorrentoResidentialPanels:towers.panels+podium.panels,sorrentoWhiteVerticalFins:towers.fins,
      sorrentoBeigeCurvedCrowns:5,sorrentoOpenRoadBays:podium.openRoadBays,sorrentoEntranceBays:podium.entranceBays,sorrentoColliders:colliders.length}};
}
