import * as THREE from 'three/webgpu';
import {
  AIRPORT_RUNWAYS, AIRPORT_TAXIWAYS, AIRPORT_APRON_RECTS, AIRPORT_SURFACE_OFFSETS,
  airportLocalToWorld, airportSurfaceHeightAt,
} from './airport-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import {
  airportPalette, createAirportFrameGroup, airportRibbonGeometry, airportRectGeometry,
  box, sphere, merged,
} from './airport-world-utils.js';

function runwayFrame(runway) {
  const dx = runway.b.x - runway.a.x, dz = runway.b.z - runway.a.z, length = Math.hypot(dx,dz);
  return { ux: dx / length, uz: dz / length, nx: -dz / length, nz: dx / length, ry: Math.atan2(-dz,dx), length };
}
function runwayPoint(runway, frame, along, lateral = 0) {
  return [runway.a.x + frame.ux * along + frame.nx * lateral, runway.a.z + frame.uz * along + frame.nz * lateral];
}
function markingBox(parts, runway, frame, heightAt, along, lateral, widthAlong, widthAcross, offset = AIRPORT_SURFACE_OFFSETS.marking) {
  const [x,z] = runwayPoint(runway,frame,along,lateral), world = airportLocalToWorld(x,z);
  box(parts,[x,heightAt(world.x,world.z)+offset,z],[widthAlong,.025,widthAcross],frame.ry);
}

const SEGMENTS = {
  '0': [[0,8,4,8],[0,4,0,8],[4,4,4,8],[0,0,0,4],[4,0,4,4],[0,0,4,0]],
  '7': [[0,8,4,8],[4,4,4,8],[4,0,4,4]],
  '2': [[0,8,4,8],[4,4,4,8],[0,4,4,4],[0,0,0,4],[0,0,4,0]],
  '5': [[0,8,4,8],[0,4,0,8],[0,4,4,4],[4,0,4,4],[0,0,4,0]],
  'L': [[0,0,0,8],[0,0,4,0]],
  'C': [[0,8,4,8],[0,0,0,8],[0,0,4,0]],
  'R': [[0,4,0,8],[0,8,4,8],[4,4,4,8],[0,4,4,4],[0,0,0,4],[2,4,4,0]],
};
// Geometric runway designations: no font, image, canvas or photo texture is used.
function addRunwayText(parts, text, runway, frame, heightAt, end) {
  const forward = end ? -1 : 1, along = end ? frame.length - 72 : 72;
  for (let index = 0; index < text.length; index++) for (const [h0,v0,h1,v1] of SEGMENTS[text[index]] || []) {
    const point = (h,v) => {
      const lateral = (index - (text.length - 1) * .5) * 6.2 + (h - 2) * forward;
      const chainage = along + (v - 4) * 1.25 * forward;
      return runwayPoint(runway,frame,chainage,lateral);
    };
    const a = point(h0,v0), b = point(h1,v1), mid = [(a[0]+b[0])*.5,(a[1]+b[1])*.5];
    const world = airportLocalToWorld(mid[0],mid[1]), dx=b[0]-a[0], dz=b[1]-a[1], length=Math.hypot(dx,dz);
    box(parts,[mid[0],heightAt(world.x,world.z)+AIRPORT_SURFACE_OFFSETS.marking+.006,mid[1]],[.55,.025,length+.35],Math.atan2(dx,dz));
  }
}

export function buildAirportAirfield(scene, { groundHeightAt = hongKongTerrainHeight } = {}) {
  const root = createAirportFrameGroup('Hong Kong International Airport: three-runway airfield');
  const materials = airportPalette(), colliders = [];
  const aprons = [], taxiShoulders = [], taxiways = [], taxiLines = [], runwayShoulders = [], runways = [];
  const white = [], yellow = [], edgeLights = [], blueLights = [], greenLights = [], redLights = [];
  let markingCount = 0, lightCount = 0;

  for (const rect of AIRPORT_APRON_RECTS) {
    const geometry = airportRectGeometry(rect,groundHeightAt,AIRPORT_SURFACE_OFFSETS.apron);
    const mesh = new THREE.Mesh(geometry,rect.id==='midfield-apron'?materials.concreteLight:materials.concrete);
    mesh.name = `Airport apron: ${rect.id}`;mesh.receiveShadow=true;root.add(mesh);aprons.push(mesh);
  }
  for (const taxiway of AIRPORT_TAXIWAYS) {
    taxiShoulders.push(airportRibbonGeometry(taxiway.points,taxiway.width+10,groundHeightAt,.019));
    taxiways.push(airportRibbonGeometry(taxiway.points,taxiway.width,groundHeightAt,AIRPORT_SURFACE_OFFSETS.taxiway));
    taxiLines.push(airportRibbonGeometry(taxiway.points,.38,groundHeightAt,.061));
    for (let segment=1;segment<taxiway.points.length;segment++) {
      const a=taxiway.points[segment-1],b=taxiway.points[segment],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),steps=Math.max(1,Math.floor(length/62));
      for(let step=0;step<=steps;step++)for(const side of [-1,1]){
        const t=step/steps,x=a[0]+dx*t+dz/length*(taxiway.width*.5+2)*side,z=a[1]+dz*t-dx/length*(taxiway.width*.5+2)*side;
        const world=airportLocalToWorld(x,z);sphere(blueLights,[x,groundHeightAt(world.x,world.z)+.22,z],.25,6);lightCount++;
      }
    }
  }
  merged(root,taxiShoulders,materials.asphalt,'Airport taxiway shoulders',false);
  merged(root,taxiways,materials.taxiway,'Airport principal taxiways',false);
  merged(root,taxiLines,materials.yellowPaint,'Continuous yellow taxiway centrelines',false);

  for (const runway of AIRPORT_RUNWAYS) {
    const frame=runwayFrame(runway), centre=[[runway.a.x,runway.a.z],[runway.b.x,runway.b.z]];
    runwayShoulders.push(airportRibbonGeometry(centre,92,groundHeightAt,.026));
    runways.push(airportRibbonGeometry(centre,runway.width,groundHeightAt,AIRPORT_SURFACE_OFFSETS.runway));
    for(const lateral of [-27,27]){
      const a=runwayPoint(runway,frame,30,lateral),b=runwayPoint(runway,frame,frame.length-30,lateral);
      white.push(airportRibbonGeometry([a,b],.55,groundHeightAt,AIRPORT_SURFACE_OFFSETS.marking));markingCount++;
    }
    for(let along=320;along<frame.length-320;along+=60){
      const a=runwayPoint(runway,frame,along,0),b=runwayPoint(runway,frame,Math.min(along+30,frame.length-300),0);
      white.push(airportRibbonGeometry([a,b],.65,groundHeightAt,AIRPORT_SURFACE_OFFSETS.marking+.005));markingCount++;
    }
    for(const end of [0,1]){
      const thresholdAlong=end?frame.length-22:22;
      for(const lateral of [-24,-18,-12,-6,6,12,18,24]){
        markingBox(white,runway,frame,groundHeightAt,thresholdAlong,lateral,28,2.4);markingCount++;
      }
      for(const [along,lateral,w,d] of [[300,-18,46,6],[300,18,46,6],[450,-20,32,4],[450,20,32,4],[600,-20,32,4],[600,20,32,4]]){
        markingBox(white,runway,frame,groundHeightAt,end?frame.length-along:along,lateral,w,d);markingCount++;
      }
      addRunwayText(white,runway.thresholds[end],runway,frame,groundHeightAt,end);markingCount++;
    }
    const lightSteps=Math.floor(frame.length/60);
    for(let step=0;step<=lightSteps;step++)for(const side of [-1,1]){
      const [x,z]=runwayPoint(runway,frame,step/lightSteps*frame.length,32*side),world=airportLocalToWorld(x,z);
      sphere(edgeLights,[x,groundHeightAt(world.x,world.z)+.24,z],.27,6);lightCount++;
    }
    for(const end of [0,1])for(let lateral=-28;lateral<=28;lateral+=4){
      const [x,z]=runwayPoint(runway,frame,end?frame.length-2:2,lateral),world=airportLocalToWorld(x,z);
      sphere(end?redLights:greenLights,[x,groundHeightAt(world.x,world.z)+.28,z],.32,6);lightCount++;
    }
  }
  merged(root,runwayShoulders,materials.asphalt,'Three runway paved shoulders',false);
  const runwayMesh=merged(root,runways,materials.asphalt,'North Centre and South runway pavements',false);
  const markingMesh=merged(root,white,materials.whitePaint,'Runway thresholds aiming points centrelines and geometric designations',false);
  merged(root,yellow,materials.yellowPaint,'Airfield yellow markings',false);
  merged(root,edgeLights,materials.warmLight,'Runway edge lights',false);
  merged(root,blueLights,materials.blueLight,'Taxiway blue edge lights',false);
  merged(root,greenLights,materials.greenLight,'Runway threshold green lights',false);
  merged(root,redLights,materials.redLight,'Runway end red lights',false);
  scene.add(root);
  const stats={
    airportRunways:AIRPORT_RUNWAYS.length,airportRunwayLengthMetres:AIRPORT_RUNWAYS.map((runway)=>runway.length),
    airportTaxiways:AIRPORT_TAXIWAYS.length,airportAprons:AIRPORT_APRON_RECTS.length,
    airportRunwayMarkingSystems:markingCount,airportEdgeLights:lightCount,
    airportSurfaceSource:'AAHK 3,800 x 60 m dimensions; AirportGuide endpoints; continuous existing-DTM sampling',
  };
  return {root,colliders,stats,runwayMesh,markingMesh,groundHeightAt:(x,z,ground)=>airportSurfaceHeightAt(x,z,ground)};
}
