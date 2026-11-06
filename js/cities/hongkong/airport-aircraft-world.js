import * as THREE from 'three/webgpu';
import { AIRPORT_GATES, AIRPORT_FRAME, airportLocalToWorld } from './airport-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import {
  airportPalette, createAirportFrameGroup, airportRibbonGeometry, airportLocalCollider,
  box, beam, cylinder, sphere, merged,
} from './airport-world-utils.js';

function prismXZ(points, bottom, top) {
  let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
  const ring=area>0?points.slice().reverse():points.slice(),positions=[],indices=[],n=ring.length;
  const centre=ring.reduce((sum,p)=>[sum[0]+p[0]/n,sum[1]+p[1]/n],[0,0]);
  for(const y of [bottom,top]){for(const [x,z] of ring)positions.push(x,y,z);positions.push(centre[0],y,centre[1]);}
  for(let i=0;i<n;i++){
    const next=(i+1)%n;
    indices.push(2*n+1,n+i,n+next); // top, upward after winding correction
    indices.push(2*n,next,i); // bottom, downward
    indices.push(i,next,n+i, next,n+next,n+i);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function tailFinGeometry() {
  const shape=new THREE.Shape();shape.moveTo(18,5);shape.lineTo(25,15);shape.lineTo(30,15);shape.lineTo(28,5);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.7,bevelEnabled:false,curveSegments:1});geometry.rotateY(-Math.PI/2);geometry.translate(.35,0,0);return geometry;
}

function addAircraft(globals,gate,baseY,index,materials) {
  const local={white:[],livery:[],silver:[],dark:[],rubber:[]};
  const fuselage=new THREE.CylinderGeometry(2.55,2.55,48,18,1);fuselage.rotateX(Math.PI/2);fuselage.translate(0,4.8,0);local.white.push(fuselage);
  const nose=new THREE.SphereGeometry(1,18,12);nose.scale(2.55,2.55,5);nose.translate(0,4.8,-25);local.white.push(nose);
  const tail=new THREE.CylinderGeometry(.45,2.4,10,16,1);tail.rotateX(Math.PI/2);tail.translate(0,4.8,27);local.white.push(tail);
  for(const side of [-1,1]){
    local.silver.push(prismXZ([[side*2,-4],[side*29,11],[side*28,15],[side*2,5]],4.05,4.42));
    local.silver.push(prismXZ([[side*1.4,20],[side*11,27],[side*10,30],[side*1.4,27]],5.05,5.35));
    const engine=new THREE.CylinderGeometry(1.35,1.35,5.2,14);engine.rotateX(Math.PI/2);engine.translate(side*9,3.1,4);local.white.push(engine);
    const intake=new THREE.CylinderGeometry(1.05,1.05,.18,14);intake.rotateX(Math.PI/2);intake.translate(side*9,3.1,1.32);local.dark.push(intake);
    for(let window=0;window<24;window++)box(local.dark,[side*2.52,5.55,-18+window*1.62],[.12,.34,.52]);
    box(local.dark,[side*1.05,6.35,-28.15],[1.35,.65,.18],side*.18);
    // Main landing gear and wheels.
    beam(local.silver,[side*4,3.8,6],[side*4,.75,6],.18,.18);
  }
  const fin=tailFinGeometry();local.livery.push(fin);
  // Abstract geometric brushmark strokes on the coloured fin, not an image logo.
  for(const side of [-1,1]){
    beam(local.white,[side*.39,7.2,25.2],[side*.39,13.2,27.2],.32,.22);
    beam(local.white,[side*.39,8.2,27],[side*.39,11.8,25.2],.24,.2);
  }
  beam(local.silver,[0,4,-20],[0,.7,-20],.16,.16);
  for(const [x,z] of [[0,-20],[-4,6],[4,6]]){
    const wheel=new THREE.CylinderGeometry(.58,.58,.34,12);wheel.rotateZ(Math.PI/2);wheel.translate(x,.58,z);local.rubber.push(wheel);
  }
  const matrix=new THREE.Matrix4().makeRotationY(gate.heading);matrix.setPosition(gate.x,baseY,gate.z);
  const target={white:globals.aircraftWhite,livery:globals.livery,silver:globals.aircraftSilver,dark:globals.aircraftDark,rubber:globals.rubber};
  for(const [key,parts] of Object.entries(local))for(const geometry of parts){geometry.applyMatrix4(matrix);target[key].push(geometry);}
}

function tunnelGeometry(width,height,from,to,yOffset=0,depthOverride=null) {
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),direction=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
  const length=direction.length(),geometry=new THREE.BoxGeometry(width,height,depthOverride??length);geometry.translate(0,yOffset,0);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),direction.normalize()));geometry.translate(...mid.toArray());return geometry;
}

export function buildAirportAircraft(scene,{groundHeightAt=hongKongTerrainHeight}={}){
  const root=createAirportFrameGroup('HKIA parked aircraft jet bridges and marked passenger stands'),materials=airportPalette();
  const globals={aircraftWhite:[],livery:[],aircraftSilver:[],aircraftDark:[],rubber:[],bridgeWhite:[],bridgeGlass:[],bridgeFrame:[],tugs:[],wheels:[]};
  const markings=[],colliders=[];
  for(const [index,gate] of AIRPORT_GATES.entries()){
    const world=airportLocalToWorld(gate.x,gate.z),baseY=groundHeightAt(world.x,world.z)+.06;
    addAircraft(globals,gate,baseY,index,materials);
    const noseX=gate.x-Math.sin(gate.heading)*28,noseZ=gate.z-Math.cos(gate.heading)*28;
    const from=gate.axis==='x'?[gate.terminalEdge,gate.z-12]:[gate.x-12,gate.terminalEdge];
    const to=[noseX-2,noseZ],groundFrom=airportLocalToWorld(...from),groundTo=airportLocalToWorld(...to);
    const a=[from[0],groundHeightAt(groundFrom.x,groundFrom.z)+6.2,from[1]],b=[to[0],groundHeightAt(groundTo.x,groundTo.z)+5.2,to[1]];
    globals.bridgeGlass.push(tunnelGeometry(3.1,2.8,a,b));
    globals.bridgeWhite.push(tunnelGeometry(3.35,.28,a,b,-1.5),tunnelGeometry(3.35,.25,a,b,1.5));
    const length=Math.hypot(b[0]-a[0],b[2]-a[2]),stations=Math.max(1,Math.ceil(length/7));
    for(let station=0;station<=stations;station++){
      const t=station/stations,p=a.map((v,i)=>v+(b[i]-v)*t),q=a.map((v,i)=>v+(b[i]-v)*Math.min(1,(station+1)/stations));
      globals.bridgeFrame.push(tunnelGeometry(3.35,3.05,p,q,0,.16));
    }
    cylinder(globals.bridgeFrame,[from[0],a[1],from[1]],2.05,3.1,12);
    beam(globals.bridgeFrame,[to[0],baseY+.4,to[1]],[to[0],b[1]-1.3,to[1]],.22,.22);
    markings.push(airportRibbonGeometry([from,[gate.x,gate.z]],.28,groundHeightAt,.067));
    const ry=AIRPORT_FRAME.ry+gate.heading;
    colliders.push(airportLocalCollider(gate.x,gate.z,6,62,baseY,baseY+8,ry));
    const wingX=gate.x+Math.sin(gate.heading)*6,wingZ=gate.z+Math.cos(gate.heading)*6;
    colliders.push(airportLocalCollider(wingX,wingZ,58,18,baseY+2,baseY+5.8,ry));
    if(index%3===0){
      const tugX=gate.x+Math.cos(gate.heading)*10,tugZ=gate.z-Math.sin(gate.heading)*10,tugWorld=airportLocalToWorld(tugX,tugZ),tugY=groundHeightAt(tugWorld.x,tugWorld.z)+.8;
      box(globals.tugs,[tugX,tugY,tugZ],[4.2,1.25,2.1],gate.heading);box(globals.tugs,[tugX,tugY+1,tugZ],[1.8,.9,1.8],gate.heading);
      for(const side of [-1,1])for(const end of [-1,1]){
        const wheel=new THREE.CylinderGeometry(.42,.42,.28,10);wheel.rotateZ(Math.PI/2);wheel.translate(tugX+end*1.35,tugY-.55,tugZ+side*.9);globals.wheels.push(wheel);
      }
      beam(globals.bridgeFrame,[tugX,tugY-.2,tugZ],[noseX,baseY+.7,noseZ],.12,.12);
    }
  }
  merged(root,globals.aircraftWhite,materials.aircraftWhite,'Procedural widebody fuselages noses and engines');
  merged(root,globals.livery,materials.aircraftGreen,'Cathay-inspired green tail fins with geometric brushmarks');
  merged(root,globals.aircraftSilver,materials.silver,'Swept main wings tailplanes and landing-gear struts');
  merged(root,globals.aircraftDark,materials.darkMetal,'Cockpit windows passenger windows and engine intakes');
  merged(root,globals.rubber,materials.rubber,'Aircraft landing-gear tyres');
  merged(root,globals.bridgeWhite,materials.whiteMetal,'Jet bridge floors roofs and airport service tugs');
  merged(root,globals.bridgeGlass,materials.blueGlass,'Glazed passenger jet bridge tunnels',false);
  merged(root,globals.bridgeFrame,materials.silverDark,'Jet bridge ribs rotundas wheels and towbars');
  merged(root,globals.wheels,materials.rubber,'Airport service vehicle tyres');
  merged(root,markings,materials.yellowPaint,'Passenger stand lead-in lines',false);
  scene.add(root);
  return {root,colliders,stats:{airportAircraft:AIRPORT_GATES.length,airportJetBridges:AIRPORT_GATES.length,
    airportServiceTugs:Math.ceil(AIRPORT_GATES.length/3),airportAircraftPhotoTextures:0}};
}
