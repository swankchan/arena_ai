// HK-B0107: 跑馬地馬場 Happy Valley Racecourse — geometry.
//
// Provisional track and infield, mapped Pavilion Stand and parade ring, and estimated floodlights.
// The mislocated placeholder stands and museum have been removed pending mapped replacements.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  happyValleyTerrainHeightAt, happyValleyTrackPoint, happyValleyTrackFrame,
  HAPPY_VALLEY_SITE, HAPPY_VALLEY_TRACK, HAPPY_VALLEY_MAIN_STAND, HAPPY_VALLEY_COLOURS,
  HAPPY_VALLEY_CAPACITY, HAPPY_VALLEY_OPENED, HAPPY_VALLEY_PARADE_LOCAL_RING,
} from './happy-valley-racecourse-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, roofGeometry, nightAmount,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider, harbourCityEdgeFrame } from './harbour-city-architecture.js';
import { HAPPY_VALLEY_PAVILION, HAPPY_VALLEY_PAVILION_ENTRANCE } from './happy-valley-pavilion-site.js';
import { buildHappyValleyPitches, HAPPY_VALLEY_PITCHES, happyValleyPitchFrame } from './happy-valley-pitches-world.js';
import { buildHappyValleyPavilion } from './happy-valley-pavilion-world.js';
import { buildHappyValleyMembersIII } from './happy-valley-members-iii-world.js';
import { HAPPY_VALLEY_MEMBERS_III, HAPPY_VALLEY_MEMBERS_III_ENTRANCE } from './happy-valley-members-iii-site.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { TERRAIN_TUNNEL_OPENING_RECTS } from './road-elevation.js';
import { subtractTunnelOpenings } from './tunnel-openings.js';
import { buildHappyValleyTunnelWalls } from './happy-valley-tunnel-walls.js';
import { buildHappyValleyWinningPost, HAPPY_VALLEY_WINNING_POST } from './happy-valley-winning-post.js';
import { HAPPY_VALLEY_STAND_FOOTPRINTS } from './happy-valley-stand-footprints.js';
import { HAPPY_VALLEY_REMAINING_PITCH_FOOTPRINTS } from './happy-valley-remaining-pitch-footprints.js';
import { localRingFromWorld, worldRingFromGeometry } from './authored-landmark-site.js';
import { pointInFlatRing } from './landmark-site.js';

const C = HAPPY_VALLEY_COLOURS;
const DEG = Math.PI / 180;
// The two reduced offsets keep the newly continuous-loop mast centres inside
// the mapped venue, off sampled roads. They are provisional positions, not a
// survey of the actual floodlight locations.
const FLOODLIGHT_POSITIONS = [[0.02, 52], [0.14, 5], [0.30, 20], [0.70, 20], [0.86, 10], [0.96, 46]];
// Additional estimated positions on the old provisional track's outside; these
// are not surveyed poles and must be reconsidered when the circuit is refit.
const EXTRA_FLOODLIGHT_POSITIONS = [[.069444,7],[.180556,7],[.263889,12],[.402778,7],
  [.513889,7],[.597222,7],[.763889,12],[.902778,7]];


function makeMaterials() {
  const palette = harbourCityPalette();
  const seat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.7, side: THREE.DoubleSide });
  seat.colorNode = attribute('color').rgb;
  const floodlight = new THREE.MeshStandardNodeMaterial({ color: 0xbfcbd0, roughness: .35 });
  floodlight.emissiveNode = color(0xe5f2ff).mul(nightAmount()).mul(2.8);
  const screenText = new THREE.MeshStandardNodeMaterial({color:0xb5d0d1,roughness:.55});
  screenText.emissiveNode = color(0x8ebfc2).mul(nightAmount().mul(1.2).add(.12));
  const screenRed = new THREE.MeshStandardNodeMaterial({color:0x6d2223,roughness:.65});
  screenRed.emissiveNode = color(0x8e161b).mul(nightAmount().mul(.9).add(.08));
  const screenVideo = new THREE.MeshStandardNodeMaterial({color:0x22434d,roughness:.65});
  screenVideo.emissiveNode = color(0x3d8888).mul(nightAmount().mul(.7).add(.05));
  const decal = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  decal.colorNode = attribute('color').rgb;
  return {
    seat, decal, floodlight, screenText, screenRed, screenVideo,
    distanceBoard: new THREE.MeshStandardMaterial({color:0x172521,roughness:.8}),
    distanceNumeral: new THREE.MeshStandardMaterial({color:0xff8527,roughness:.65,emissive:0x442008}),
    grass: new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
    grassStripe: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.grassStripe), roughness: 0.95 }),
    infield: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.infield), roughness: 0.96 }),
    paradePath: new THREE.MeshStandardMaterial({ color: 0xc96b50, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    paradeWall: new THREE.MeshStandardMaterial({ color: 0xc9bba1, roughness: 0.87 }),
    perimeterBase: new THREE.MeshStandardMaterial({ color: 0x999b90, roughness: 0.9 }),
    perimeterMetal: new THREE.MeshStandardMaterial({ color: 0x52665c, roughness: 0.65, metalness: 0.2 }),
    paradeFoliage: new THREE.MeshStandardMaterial({ color: 0x345d32, roughness: 0.95 }),
    paradeFlowersRed: new THREE.MeshStandardMaterial({ color: 0xad2520, roughness: 0.9 }),
    paradeFlowersOrange: new THREE.MeshStandardMaterial({ color: 0xd7772e, roughness: 0.9 }),
    paradeCentre: new THREE.MeshStandardMaterial({ color: 0x316b60, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    sand: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.sand), roughness: 0.98 }),
    rail: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.rail), roughness: 0.5, metalness: 0.15 }),
    stand: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.standWhite), roughness: 0.62 }),
    standShade: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.standShade), roughness: 0.66 }),
    club: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.clubGreen), roughness: 0.6 }),
    apron: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.apron), roughness: 0.95 }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.roof), roughness: 0.55 }),
    glass: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.glass), roughness: 0.22, metalness: 0.45 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x182328, roughness: .65 }),
    white: palette.white,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The provisional circuit: 30.5 m grass band and white running rails.
// ---------------------------------------------------------------------------------------------------------------
// Shared with diagnostics, frames and tests: a single closed-loop source of truth.
const trackPoint = happyValleyTrackPoint;

// Generic tunnel portal cuts are already used by full-world terrain, but the
// authored racecourse overlay used to cover them again. Cut the same openings
// in the overlay meshes; this does not construct or certify a tunnel roof.
const SITE_TUNNEL_OPENINGS = TERRAIN_TUNNEL_OPENING_RECTS.filter(r =>
  r.minX<=HAPPY_VALLEY_SITE.bounds.maxX && r.maxX>=HAPPY_VALLEY_SITE.bounds.minX &&
  r.minZ<=HAPPY_VALLEY_SITE.bounds.maxZ && r.maxZ>=HAPPY_VALLEY_SITE.bounds.minZ);
function inTunnelOpening(point, margin=0) {
  const s=HAPPY_VALLEY_SITE,c=Math.cos(s.ry),sn=Math.sin(s.ry);
  const x=s.x+c*point.x+sn*point.z,z=s.z-sn*point.x+c*point.z;
  return SITE_TUNNEL_OPENINGS.some(r=>{
    const dx=x-r.cx,dz=z-r.cz;
    return Math.abs(dx*r.ux+dz*r.uz)<=r.hx+margin && Math.abs(-dx*r.uz+dz*r.ux)<=r.hz+margin;
  });
}
// Exact clipped rectangles preserve the mapped pitches rather than drawing
// the known-wrong provisional course and rails through them. The rectangular
// clearance is a conservative temporary fit, not a real racecourse gate.
const PITCH_PROTECTION_RECTS=HAPPY_VALLEY_PITCHES.filter(p=>[563648704,563648705].includes(p.id)).map(pitch=>{
  const f=happyValleyPitchFrame(pitch),s=HAPPY_VALLEY_SITE,c=Math.cos(s.ry),sn=Math.sin(s.ry);
  const ux0=(f.b.x-f.a.x)/f.length,uz0=(f.b.z-f.a.z)/f.length;
  const ux=c*ux0+sn*uz0,uz=-sn*ux0+c*uz0;
  const world=[];
  for(let i=0;i<pitch.localRing.length-2;i+=2) {
    const x=pitch.localRing[i],z=pitch.localRing[i+1];world.push([s.x+c*x+sn*z,s.z-sn*x+c*z]);
  }
  const along=world.map(([x,z])=>x*ux+z*uz),across=world.map(([x,z])=>-x*uz+z*ux);
  const lo=Math.min(...along)-.4,hi=Math.max(...along)+.4,low=Math.min(...across)-.4,high=Math.max(...across)+.4;
  const A=(lo+hi)/2,B=(low+high)/2,cx=ux*A-uz*B,cz=uz*A+ux*B,hx=(hi-lo)/2,hz=(high-low)/2;
  const ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
  return {cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez};
});
const REMAINING_PITCH_RINGS=HAPPY_VALLEY_REMAINING_PITCH_FOOTPRINTS.map(p=>
  localRingFromWorld(HAPPY_VALLEY_SITE,worldRingFromGeometry(p.geometry)));
function inRemainingPitch(point,margin=0) {
  return REMAINING_PITCH_RINGS.some(ring=>{
    if(pointInFlatRing(ring,point.x,point.z))return true;
    for(let i=0;i+3<ring.length;i+=2) {
      const x=ring[i],z=ring[i+1],dx=ring[i+2]-x,dz=ring[i+3]-z,l=dx*dx+dz*dz;
      if(l<1e-8)continue;
      const t=Math.max(0,Math.min(1,((point.x-x)*dx+(point.z-z)*dz)/l));
      if(Math.hypot(point.x-x-t*dx,point.z-z-t*dz)<margin)return true;
    }
    return false;
  });
}
function inProtectedPitch(point,margin=0) {
  const s=HAPPY_VALLEY_SITE,c=Math.cos(s.ry),sn=Math.sin(s.ry);
  const x=s.x+c*point.x+sn*point.z,z=s.z-sn*point.x+c*point.z;
  return PITCH_PROTECTION_RECTS.some(r=>{
    const dx=x-r.cx,dz=z-r.cz;
    return Math.abs(dx*r.ux+dz*r.uz)<=r.hx+margin && Math.abs(-dx*r.uz+dz*r.ux)<=r.hz+margin;
  });
}
function cutRacecourseTunnelOpenings(mesh, rects=SITE_TUNNEL_OPENINGS) {
  if(!mesh || !rects.length) return;
  const original=mesh.geometry, source=original.index?original.toNonIndexed():original;
  const position=source.getAttribute('position'), colour=source.getAttribute('color'), lit=source.getAttribute('aLit');
  const positions=[],colours=[],lights=[],s=HAPPY_VALLEY_SITE,c=Math.cos(s.ry),sn=Math.sin(s.ry);
  for(let i=0;i+2<position.count;i+=3) {
    const triangle=[];
    for(let j=0;j<3;j++) {const x=position.getX(i+j),z=position.getZ(i+j);triangle.push([s.x+c*x+sn*z,s.z-sn*x+c*z]);}
    for(const poly of subtractTunnelOpenings(triangle,rects)) for(let j=1;j+1<poly.length;j++) {
      for(const [X,Z] of [poly[0],poly[j],poly[j+1]]) {
        const dx=X-s.x,dz=Z-s.z;
        positions.push(c*dx-sn*dz,position.getY(i),sn*dx+c*dz);
        if(colour) colours.push(colour.getX(i),colour.getY(i),colour.getZ(i));
        if(lit) lights.push(lit.getX(i));
      }
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(colour)g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  if(lit)g.setAttribute('aLit',new THREE.Float32BufferAttribute(lights,1));
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  mesh.geometry=g;if(source!==original)source.dispose();original.dispose();
}

// Only an approximate same-level road query, not a complete swept collision test.
// These temporary breaks preserve infield-road access until the mapped track is re-fitted.
function trackRoadConflict(point, groundOffset, margin = 1.3) {
  const s = HAPPY_VALLEY_SITE, c = Math.cos(s.ry), sn = Math.sin(s.ry);
  const x = s.x + c * point.x + sn * point.z, z = s.z - sn * point.x + c * point.z;
  const hit = fullRoadSurfaceAt(x, z, margin, groundOffset);
  return inTunnelOpening(point,margin) || (!!hit && Math.abs(hit.height - groundOffset) < 2.5);
}

// Approximate distance measured along the *modelled* inside rail backwards
// from the equally provisional winning post, not a surveyed course marker.
export function happyValleyMarkerStation(metres) {
  const count=7200, step=1/count, offset=-HAPPY_VALLEY_TRACK.width;
  let previous=trackPoint(HAPPY_VALLEY_WINNING_POST.station,offset), travelled=0;
  for(let i=1;i<=count;i++) {
    const point=trackPoint(HAPPY_VALLEY_WINNING_POST.station-i*step,offset);
    const length=Math.hypot(point.x-previous.x,point.z-previous.z);
    if(travelled+length>=metres) return HAPPY_VALLEY_WINNING_POST.station-(i-1+(metres-travelled)/length)*step;
    travelled+=length;previous=point;
  }
  return null;
}

function buildDistanceBoard(course,materials,groundOffset) {
  const station=happyValleyMarkerStation(200);
  if(station===null)return false;
  const frame=happyValleyTrackFrame(station,-HAPPY_VALLEY_TRACK.width-1.5);
  // Clearance is an estimate: the board is omitted rather than placed into a
  // mapped pitch, road or tunnel. Future track realignment must relocate it.
  const probes=[[0,0],[-.5,0],[.5,0],[0,-.4],[0,.4]].map(([x,z])=>({
    x:frame.x+x*frame.tanX+z*frame.normalX,z:frame.z+x*frame.tanZ+z*frame.normalZ,
  }));
  const standRings=HAPPY_VALLEY_STAND_FOOTPRINTS.map(p=>localRingFromWorld(HAPPY_VALLEY_SITE,worldRingFromGeometry(p.geometry)));
  if(probes.some(p=>!pointInFlatRing(HAPPY_VALLEY_SITE.localRing,p.x,p.z)||
    standRings.some(ring=>pointInFlatRing(ring,p.x,p.z))||inProtectedPitch(p,1)||
    inRemainingPitch(p,1)||trackRoadConflict(p,groundOffset,1.4))) return false;
  const rotation=Math.atan2(-frame.tanZ,frame.tanX),cs=Math.cos(rotation),sn=Math.sin(rotation);
  const boards=[], supports=[], numerals=[];
  const place=(x,y,z)=>[frame.x+cs*x+sn*z,y,frame.z-sn*x+cs*z];
  box(boards,place(0,2.13,0),[.54,1.58,.13],rotation);
  cylinder(supports,place(0,.69,0),.06,1.38,6);
  // Simple geometric digits on both faces, inspired by the orange vertical
  // 200 board in trackside photographs, without using the photograph itself.
  const digits=[[1,1,0,1,1,0,1],[1,1,1,0,1,1,1],[1,1,1,0,1,1,1]];
  const pieces=[[-.0,.17,.26,.045],[.13,.085,.045,.17],[.13,-.085,.045,.17],
    [0,0,.26,.045],[-.13,-.085,.045,.17],[-.13,.085,.045,.17],[0,-.17,.26,.045]];
  for(const side of [-1,1])for(let digit=0;digit<digits.length;digit++)for(let k=0;k<7;k++) {
    if(!digits[digit][k])continue;
    const [x,y,w,h]=pieces[k];box(numerals,place(x*side,2.62-digit*.48+y,side*.071),[w,h,.012],rotation);
  }
  merged(course,boards,materials.distanceBoard,'HappyValley200MarkerBoard');
  merged(course,supports,materials.rail,'HappyValley200MarkerSupport');
  merged(course,numerals,materials.distanceNumeral,'HappyValley200MarkerNumerals',false);
  return true;
}

function buildCourse(group, materials, stats, groundOffset) {
  const course = new THREE.Group(); course.name = 'HappyValleyCourse'; group.add(course);
  const segments = 360;
  let roadRailGaps = 0, roadSurfaceGaps = 0, pitchRailGaps = 0;
  const band = store(), infieldStore = store();
  const infieldApex = { x: HAPPY_VALLEY_TRACK.centreX - 8, z: HAPPY_VALLEY_TRACK.centreZ };
  const rails = [], posts = [], distancePoles = [];
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    const outer0 = trackPoint(t0, 0), outer1 = trackPoint(t1, 0);
    const inner0 = trackPoint(t0, -HAPPY_VALLEY_TRACK.width), inner1 = trackPoint(t1, -HAPPY_VALLEY_TRACK.width);
    // Split the band into small cells so mapped same-level road ribbons are
    // not covered by the authored grass. Half-diagonal margin is conservative;
    // this is still a coarse, temporary cut until the track is realigned.
    const across = 12, cellWidth = HAPPY_VALLEY_TRACK.width / across;
    for (let cell = 0; cell < across; cell++) {
      const o0 = -cell * cellWidth, o1 = -(cell+1) * cellWidth;
      // Subtle longitudinal mowing bands, rather than one flat colour. The
      // shade is illustrative and does not imply surveyed mowing patterns.
      const shade = cell % 2 ? .91 : 1;
      const tint = C.grass.map(channel => channel*shade);
      const mid = trackPoint((t0+t1)/2, (o0+o1)/2);
      if (trackRoadConflict(mid, groundOffset, 2.7)) { roadSurfaceGaps++; continue; }
      const a=trackPoint(t0,o0), b=trackPoint(t1,o0), c=trackPoint(t1,o1), d=trackPoint(t0,o1);
      quad(band, [a.x,0.1,a.z], [b.x,0.1,b.z], [c.x,0.1,c.z], [d.x,0.1,d.z], tint);
    }
    // Avoid placing a solid rail/post across same-level carriageways. The
    // resulting gaps are temporary, not a claim about actual access gates.
    for (const [a, b, offset] of [[outer0, outer1, 0], [inner0, inner1, -HAPPY_VALLEY_TRACK.width]]) {
      const mid = trackPoint((t0+t1)/2, offset);
      if ([a,mid,b].some(p=>inProtectedPitch(p,1))) { pitchRailGaps++;continue; }
      const blocked = [a, mid, b].some(p => trackRoadConflict(p, groundOffset));
      if (blocked) { roadRailGaps++; continue; }
      // Reference photos show a broad white top rail on frequent slim posts,
      // not the three horizontal bars of the earlier placeholder. Actual
      // post spacing and section sizes are inferred, not surveyed.
      beam(rails, [a.x,1.15,a.z], [b.x,1.15,b.z], .17,.16);
      cylinder(posts, [mid.x,.58,mid.z], .045,1.14,6);
    }
    // Infield turf inside the inner running rail (the 1995 rebuild did away with the old inner sand track).
    const c0 = trackPoint(t0, -HAPPY_VALLEY_TRACK.width);
    const c1 = trackPoint(t1, -HAPPY_VALLEY_TRACK.width);
    quad(infieldStore, [infieldApex.x, -0.02, infieldApex.z], [c0.x, -0.02, c0.z], [c1.x, -0.02, c1.z],
      [infieldApex.x, -0.02, infieldApex.z], C.infield);
  }
  // Unnumbered provisional poles at regular model stations, not surveyed distance signs.
  for (let metre = 200; metre < HAPPY_VALLEY_TRACK.lapMetres; metre += 200) {
    const t = metre / HAPPY_VALLEY_TRACK.lapMetres;
    const p = trackPoint(t, -HAPPY_VALLEY_TRACK.width - 1.2);
    if (inProtectedPitch(p,1) || inRemainingPitch(p,1) || trackRoadConflict(p,groundOffset,1.2)) continue;
    cylinder(distancePoles, [p.x, 0.9, p.z], 0.09, 1.8, 6);
  }
  cutRacecourseTunnelOpenings(meshStore(course, band, materials.grass, 'HappyValleyTrackSurface', false),
    [...SITE_TUNNEL_OPENINGS,...PITCH_PROTECTION_RECTS]);
  cutRacecourseTunnelOpenings(meshStore(course, infieldStore, materials.infield, 'HappyValleyInfieldTurf', false));
  merged(course, rails, materials.rail, 'HappyValleyRunningRails');
  merged(course, posts, materials.rail, 'HappyValleyRunningRailPosts');
  merged(course, distancePoles, materials.rail, 'HappyValleyDistancePoles');
  stats.happyValley200Marker = buildDistanceBoard(course,materials,groundOffset);
  stats.happyValleyTrackSegments = segments;
  stats.happyValleyRoadRailGaps = roadRailGaps;
  stats.happyValleyPitchRailGaps = pitchRailGaps;
  stats.happyValleyRoadSurfaceGaps = roadSurfaceGaps;
  stats.happyValleyDistancePoles = distancePoles.length;
  return course;
}

// ---------------------------------------------------------------------------------------------------------------
// Legacy frame retained only for the provisional infield screen orientation.
// ---------------------------------------------------------------------------------------------------------------
function standFrame() {
  const stand = HAPPY_VALLEY_MAIN_STAND;
  const track = trackPoint(stand.t, 0);
  const next = trackPoint(stand.t + 0.0005, 0);
  const dx = next.x - track.x, dz = next.z - track.z;
  const length = Math.hypot(dx, dz) || 1;
  const tanX = dx / length, tanZ = dz / length;
  return {
    cx: stand.centreX, cz: stand.centreZ,
    tanX, tanZ, normalX: tanZ, normalZ: -tanX,
    ry: Math.atan2(-tanZ, tanX),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Convex half-plane inset keeps a consistent walking width, unlike scaling the
// long narrow ring about its centre. For this mapped ring, the intersection
// is conservative at any non-convex corner; no surveyed path is implied.
export function happyValleyParadeInset(ring, distance) {
  let points=[];
  for(let i=0;i<ring.length-2;i+=2) points.push({x:ring[i],z:ring[i+1]});
  let area=0;
  for(let i=0;i<points.length;i++) { const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.z-b.x*a.z; }
  const sign=Math.sign(area);
  for(let i=0;i<ring.length-2 && points.length;i+=2) {
    const ax=ring[i],az=ring[i+1],dx=ring[i+2]-ax,dz=ring[i+3]-az,len=Math.hypot(dx,dz);
    if(len<1e-6) continue;
    const d=p=>sign*(dx*(p.z-az)-dz*(p.x-ax))/len-distance;
    const next=[];
    for(let j=0;j<points.length;j++) {
      const a=points[j],b=points[(j+1)%points.length],da=d(a),db=d(b);
      if(da>=0) next.push(a);
      if((da>=0)!==(db>=0)) { const t=da/(da-db);next.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}); }
    }
    points=next;
  }
  if(points.length) points.push(points[0]);
  return points.flatMap(p=>[p.x,p.z]);
}

// Infield furniture: the club's branding boards, the big screen facing the stand, and the parade ring.
// ---------------------------------------------------------------------------------------------------------------
function buildInfield(group, materials, stats) {
  const infield = new THREE.Group(); infield.name = 'HappyValleyInfield'; group.add(infield);
  const boards = [], frames = [], screenParts = [], screenText = [], screenRed = [], screenVideo = [];
  // Green "馬會" branding boards along the far side of the infield, as seen in the race-night photographs.
  // The fourth placeholder board crossed mapped service roads after the loop fix.
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.06;
    const p = trackPoint(t, -HAPPY_VALLEY_TRACK.width - 6);
    const next = trackPoint(t + 0.0005, -HAPPY_VALLEY_TRACK.width - 6);
    const ry = Math.atan2(-(next.z - p.z), next.x - p.x);
    box(boards, [p.x, 2.3, p.z], [26, 4.2, 0.5], ry);
  }
  // The big video screen on the infield, facing the grandstand.
  const screenAt = trackPoint(0.02, -HAPPY_VALLEY_TRACK.width - 26);
  const frame = standFrame();
  box(screenParts, [screenAt.x, 6.5, screenAt.z], [26, 11, 1.2], frame.ry);
  box(screenParts, [screenAt.x, 0.9, screenAt.z], [8, 1.8, 3.2], frame.ry);
  box(frames, [screenAt.x, 12.6, screenAt.z], [27.5, 1.4, 1.8], frame.ry);
  // A stand-facing abstract race-information display, based on photographic
  // references; the former single cyan rectangle was only a placeholder.
  // The screen position, size and the unreadable information are estimates.
  const cs=Math.cos(HAPPY_VALLEY_SITE.ry),sn=Math.sin(HAPPY_VALLEY_SITE.ry);
  const dx=HAPPY_VALLEY_PAVILION.x-HAPPY_VALLEY_SITE.x,dz=HAPPY_VALLEY_PAVILION.z-HAPPY_VALLEY_SITE.z;
  const standX=cs*dx-sn*dz,standZ=sn*dx+cs*dz;
  const nx=Math.sin(frame.ry),nz=Math.cos(frame.ry);
  const face=Math.sign((standX-screenAt.x)*nx+(standZ-screenAt.z)*nz)||1;
  const sx=Math.cos(frame.ry),sz=-Math.sin(frame.ry);
  const panel=(parts,x,y,w,h,depth=.04)=>box(parts,
    [screenAt.x+sx*x+nx*face*(.61+depth/2),y,screenAt.z+sz*x+nz*face*(.61+depth/2)], [w,h,depth],frame.ry);
  panel(screenVideo,-8.6,6.55,6,8.6);
  panel(screenRed,8.4,6.55,7,8.6);
  // Coloured bars suggest a live information table, without invented names,
  // odds or logos. Kept inside the existing screen footprint.
  for(let row=0;row<9;row++) {
    const y=10.15-row*.83;
    for(let col=0;col<4;col++)panel(screenText,-4.8+col*1.85,y,1.25,.08,.07);
    for(let col=0;col<3;col++)panel(screenText,5.7+col*1.75,y,1.05,.08,.07);
  }
  for(let row=0;row<5;row++)panel(screenText,-8.5,9.2-row*1.2,3.3,.1,.07);
  // Mapped paddock footprint. A terracotta walking edge and muted green centre
  // recall the paddock photographs, but their widths and the rail are estimates.
  const ring = HAPPY_VALLEY_PARADE_LOCAL_RING;
  const outer = new THREE.Mesh(roofGeometry(ring, 0.14), materials.paradePath);
  outer.name = 'HappyValleyParadeRingSurface'; infield.add(outer);
  const centre = new THREE.Mesh(roofGeometry(happyValleyParadeInset(ring, 3.2), 0.155), materials.paradeCentre);
  centre.name = 'HappyValleyParadeRingCentre'; infield.add(centre);
  const ringRail = [], ringWall = [], foliage = [], redFlowers = [], orangeFlowers = [];
  // Leave a gap at each rounded end for access; actual gate positions are unknown.
  for (let i = 0; i < ring.length - 2; i += 2) {
    if (i === 0 || i === 12) continue;
    const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    // The HKJC parade-ring photo shows a cream low wall below the white rail,
    // with narrow flower planters. Gate locations remain provisional.
    beam(ringWall, [ax,.43,az], [bx,.43,bz], .18,.58);
    beam(foliage, [ax,.76,az], [bx,.76,bz], .22,.12);
    for (const y of [1.05]) beam(ringRail, [ax, y, az], [bx, y, bz], 0.09, 0.09);
    const flowerCount = Math.max(1, Math.floor(Math.hypot(bx-ax,bz-az)/.55));
    for (let k=0;k<flowerCount;k++) {
      const t=(k+.5)/flowerCount, x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      cylinder(k%3 ? redFlowers : orangeFlowers, [x,.85,z], .095,.13,5);
    }
    const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3));
    for (let k = 0; k < count; k++) {
      const t = k / count;
      cylinder(ringRail, [ax + (bx - ax) * t, 0.55, az + (bz - az) * t], 0.055, 1.1, 6);
    }
  }
  merged(infield, ringWall, materials.paradeWall, 'HappyValleyParadeRingWall');
  merged(infield, foliage, materials.paradeFoliage, 'HappyValleyParadeRingPlanters');
  merged(infield, redFlowers, materials.paradeFlowersRed, 'HappyValleyParadeRingRedFlowers');
  merged(infield, orangeFlowers, materials.paradeFlowersOrange, 'HappyValleyParadeRingOrangeFlowers');
  merged(infield, ringRail, materials.rail, 'HappyValleyParadeRingRail');
  merged(infield, boards, materials.club, 'HappyValleyInfieldBranding');
  merged(infield, frames, materials.roof, 'HappyValleyScreenFrame');
  merged(infield, screenParts.slice(0, 1), materials.screen, 'HappyValleyBigScreen');
  merged(infield, screenParts.slice(1), materials.standShade, 'HappyValleyBigScreenBase');
  merged(infield, screenVideo, materials.screenVideo, 'HappyValleyScreenVideo');
  merged(infield, screenRed, materials.screenRed, 'HappyValleyScreenOddsPanel');
  merged(infield, screenText, materials.screenText, 'HappyValleyScreenInformation');
  stats.happyValleyBrandingBoards = boards.length;
  stats.happyValleyParadeOsmId = 1056788255;
  return infield;
}

// ---------------------------------------------------------------------------------------------------------------
// Floodlights, perimeter fence, gates and the service road that rings the course.
// ---------------------------------------------------------------------------------------------------------------
function buildGrounds(group, materials, stats, groundOffset) {
  const grounds = new THREE.Group(); grounds.name = 'HappyValleyGrounds'; group.add(grounds);
  const masts = [], heads = [], lampFrames = [], lampFaces = [], fence = [], wallBase = [], fencePickets = [], gates = [], floodlights = [];
  const site = HAPPY_VALLEY_SITE;
  const ring = site.localRing;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
    minZ = Math.min(minZ, ring[i + 1]); maxZ = Math.max(maxZ, ring[i + 1]);
  }
  // Provisional lawn follows the mapped OSM site boundary, not a surveyed surface.
  const apron = new THREE.Mesh(roofGeometry(ring, -0.03), materials.apron);
  apron.name = 'HappyValleyGroundApron';
  cutRacecourseTunnelOpenings(apron);
  grounds.add(apron);
  // Original six and additional inferred masts. Extra heads add one modest
  // local light each, with no shadow maps, to reduce patchy illumination.
  for (const [index,[t, out]] of [...FLOODLIGHT_POSITIONS,...EXTRA_FLOODLIGHT_POSITIONS].entries()) {
    const p = trackPoint(t, out);
    cylinder(masts, [p.x, 17, p.z], 0.42, 34, 8);
    // Modular banks on a crossbar, facing the track/infield rather than
    // identical blank blocks. Lamp count and locations remain estimates.
    const target=trackPoint(t,-HAPPY_VALLEY_TRACK.width-6);
    // A bounded, downward-facing local light provides a modest night wash on
    // actual geometry, unlike the emissive faces alone. No dynamic shadows.
    const beams=index<FLOODLIGHT_POSITIONS.length?[[.2,4400],[.75,9000]]:[[.35,3800]];
    for(const [aim,strength] of beams) {
      const lamp=new THREE.SpotLight(0xe7f0ff,0,210,1.22,.8,2);
      lamp.name='HappyValleyFloodlightSpot';lamp.position.set(p.x,34,p.z);
      if(index>=FLOODLIGHT_POSITIONS.length) {
        const trackTarget=trackPoint(t,-HAPPY_VALLEY_TRACK.width/2);
        lamp.target.position.set(trackTarget.x,0,trackTarget.z);
      } else lamp.target.position.set(p.x+(HAPPY_VALLEY_TRACK.centreX-p.x)*aim,0,p.z+(HAPPY_VALLEY_TRACK.centreZ-p.z)*aim);
      lamp.userData.nightIntensity=strength;
      grounds.add(lamp,lamp.target);floodlights.push(lamp);
    }
    const nx=target.x-p.x,nz=target.z-p.z,ry=Math.atan2(nx,nz);
    const tx=Math.cos(ry),tz=-Math.sin(ry),sx=Math.sin(ry),sz=Math.cos(ry);
    box(heads,[p.x,34.3,p.z],[5.8,.25,.45],ry);
    for(let row=0;row<2;row++) for(let lamp=0;lamp<8;lamp++) {
      const along=(lamp-3.5)*.68,y=34.65+row*.62;
      const x=p.x+tx*along,z=p.z+tz*along;
      box(lampFrames,[x,y,z],[.56,.5,.35],ry);
      box(lampFaces,[x+sx*.19,y,z+sz*.19],[.46,.4,.04],ry);
    }
  }
  // The OSM boundary is not a surveyed fence. Keep the two short legacy
  // openings, and cut temporary gaps at roads, entrances and stand footprints.
  // The former index-based 44/45 openings skipped over 220m of boundary;
  // those long edges now use the same obstacle checks as all other edges.
  const ringCount = ring.length / 2;
  let roadFenceGaps = 0, entranceFenceGaps = 0, standFenceGaps = 0;
  const standRings = HAPPY_VALLEY_STAND_FOOTPRINTS.map(p=>localRingFromWorld(site,worldRingFromGeometry(p.geometry)));
  // With 2 m max segments, testing endpoints and midpoint with a 0.7 m
  // buffer conservatively avoids crossing or touching mapped footprints.
  const nearStand = p => standRings.some(ring=>{
    if(pointInFlatRing(ring,p.x,p.z))return true;
    for(let i=0;i+3<ring.length;i+=2) {
      const ax=ring[i],az=ring[i+1],dx=ring[i+2]-ax,dz=ring[i+3]-az,l=dx*dx+dz*dz;
      if(l<1e-8)continue;
      const t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.z-az)*dz)/l));
      if(Math.hypot(p.x-ax-t*dx,p.z-az-t*dz)<.7)return true;
    }
    return false;
  });
  const doors = [[HAPPY_VALLEY_PAVILION,HAPPY_VALLEY_PAVILION_ENTRANCE],
    [HAPPY_VALLEY_MEMBERS_III,HAPPY_VALLEY_MEMBERS_III_ENTRANCE]].map(([building,entry]) => ({
      ...harbourCityEdgeFrame(building,entry.edge,'Provisional entrance','Estimated street-side opening',entry.centre),
      width:entry.width,
    }));
  const nearDoor = p => {
    const c=Math.cos(site.ry), sn=Math.sin(site.ry);
    return doors.some(door => {
      const dx=site.x+c*p.x+sn*p.z-door.x, dz=site.z-sn*p.x+c*p.z-door.z;
      return Math.abs(dx*door.nz-dz*door.nx) < door.width/2+1 && Math.abs(dx*door.nx+dz*door.nz) < 3;
    });
  };
  for (let i = 0; i < ringCount; i++) {
    const ax = ring[2 * i], az = ring[2 * i + 1];
    const bx = ring[(2 * i + 2) % ring.length], bz = ring[(2 * i + 3) % ring.length];
    const gate = i === 1 || i === 2;
    if (gate) { gates.push({ x: ax, z: az }); continue; }
    const length = Math.hypot(bx-ax,bz-az), steps = Math.ceil(length / 2);
    for(let j=0;j<steps;j++) {
      const point = t => ({x:ax+(bx-ax)*t,z:az+(bz-az)*t});
      const a=point(j/steps), b=point((j+1)/steps), mid=point((j+.5)/steps);
      if ([a,mid,b].some(nearDoor)) { entranceFenceGaps++; continue; }
      if ([a,mid,b].some(nearStand)) { standFenceGaps++; continue; }
      if ([a,mid,b].some(p => trackRoadConflict(p,groundOffset,1.2))) { roadFenceGaps++; continue; }
      // A low masonry plinth and open metal infill make the site edge legible.
      // Appearance is an estimate: the OSM relation is not a surveyed wall.
      beam(wallBase, [a.x,.23,a.z], [b.x,.23,b.z], .46,.24);
      for (const height of [.55, 1.85]) beam(fence, [a.x,height,a.z], [b.x,height,b.z], .07,.07);
      const pickets=Math.max(1,Math.floor(Math.hypot(b.x-a.x,b.z-a.z)/.55));
      for(let k=0;k<pickets;k++) {
        const f=(k+.5)/pickets,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;
        cylinder(fencePickets,[x,1.2,z],.025,1.3,5);
      }
      if (j%3===0) cylinder(fence,[a.x,1.15,a.z],.06,1.5,6);
    }
  }
  stats.happyValleyRoadFenceGaps = roadFenceGaps;
  stats.happyValleyEntranceFenceGaps = entranceFenceGaps;
  stats.happyValleyStandFenceGaps = standFenceGaps;
  merged(grounds, masts, materials.standShade, 'HappyValleyFloodlightMasts');
  merged(grounds, heads, materials.standShade, 'HappyValleyFloodlightHeads');
  merged(grounds, lampFrames, materials.glass, 'HappyValleyFloodlightLampFrames');
  merged(grounds, lampFaces, materials.floodlight, 'HappyValleyFloodlightLampFaces', false);
  merged(grounds, wallBase, materials.perimeterBase, 'HappyValleyPerimeterWallBase');
  merged(grounds, fence, materials.perimeterMetal, 'HappyValleyPerimeterFence');
  merged(grounds, fencePickets, materials.perimeterMetal, 'HappyValleyPerimeterPickets');
  stats.happyValleyFloodlightMasts = FLOODLIGHT_POSITIONS.length + EXTRA_FLOODLIGHT_POSITIONS.length;
  stats.happyValleyFloodlightHeight = 36;
  stats.happyValleyGates = gates.length;
  return { grounds, gates, floodlights };
}

export function buildHappyValleyRacecourse(root, { groundOffset = 0 } = {}) {
  const venue = new THREE.Group();
  venue.name = 'HappyValleyRacecourse';
  venue.position.set(HAPPY_VALLEY_SITE.x, groundOffset, HAPPY_VALLEY_SITE.z);
  venue.rotation.y = HAPPY_VALLEY_SITE.ry;
  root.add(venue);
  const materials = makeMaterials();
  const stats = {};
  const {floodlights}=buildGrounds(venue, materials, stats, groundOffset);
  stats.happyValleyTunnelWallSegments = buildHappyValleyTunnelWalls(venue,groundOffset).segments;
  buildCourse(venue, materials, stats, groundOffset);
  buildHappyValleyPitches(venue);
  const pavilion = buildHappyValleyPavilion(venue, groundOffset);
  const membersIII = buildHappyValleyMembersIII(venue, groundOffset);
  buildInfield(venue, materials, stats);
  const winningPost=buildHappyValleyWinningPost(venue);

  const colliders = [];
  const push = (x, z, w, d, h, ry = 0) => colliders.push(harbourCityLocalCollider(
    HAPPY_VALLEY_SITE, x, z, w, d, groundOffset, groundOffset + h, HAPPY_VALLEY_SITE.ry + ry));
  // No colliders for the removed, incorrectly located stand/club/museum.
  // Floodlight masts.
  for (const [t, out] of FLOODLIGHT_POSITIONS) {
    const p = trackPoint(t, out);
    push(p.x, p.z, 1.6, 1.6, 36);
  }

  colliders.push(...pavilion.colliders, ...membersIII.colliders);
  // Colliders only at the two feet and central post, not across the open arch.
  const postCos=Math.cos(winningPost.direction),postSin=Math.sin(winningPost.direction);
  for(const x of [-3.85,0,3.85]) push(winningPost.position.x+postCos*x,winningPost.position.z-postSin*x,
    x===0?.65:.85,.65,x===0?4.7:1,winningPost.direction);
  // Keep the established collider order stable for existing entrance checks.
  for (const [t,out] of EXTRA_FLOODLIGHT_POSITIONS) {
    const p=trackPoint(t,out);push(p.x,p.z,1.6,1.6,36);
  }

  const landmarks = [{
    id: 'happy-valley-racecourse', name: '跑馬地馬場 · Happy Valley Racecourse',
    position: { x: HAPPY_VALLEY_SITE.x, y: groundOffset, z: HAPPY_VALLEY_SITE.z },
    radius: 300, height: 36, components: 1,
  }];

  Object.assign(stats, {
    happyValleyGroundOffset: groundOffset,
    happyValleyLandmarks: 1,
    happyValleyInventoryId: 'HK-B0107',
    happyValleyOsmRelation: HAPPY_VALLEY_SITE.osmId,
    happyValleyRingArea: HAPPY_VALLEY_SITE.ringArea,
    happyValleyCapacity: HAPPY_VALLEY_CAPACITY,
    happyValleyOpened: HAPPY_VALLEY_OPENED,
    happyValleyTrackWidth: HAPPY_VALLEY_TRACK.width,
    happyValleyPublishedLap: 1417,
    happyValleyModelledLap: Math.round(HAPPY_VALLEY_TRACK.lapMetres),
    happyValleyColliders: colliders.length,
  });

  return {
    group: venue, colliders, landmarks, stats, groundOffset,
    update(context) {
      // Avoid lighting the scene when the camera is far from the racecourse.
      // Lamps remain present so clustered-light shader topology stays stable.
      const pos=context?.cameraSystem?.currentPos;
      const nearby=!pos || Math.hypot(pos.x-HAPPY_VALLEY_SITE.x,pos.z-HAPPY_VALLEY_SITE.z)<900;
      const strength=nearby?THREE.MathUtils.smoothstep(cityUniforms.uInteriorGlow.value,.55,1.4):0;
      for(const lamp of floodlights) lamp.intensity=lamp.userData.nightIntensity*strength;
    },
    groundHeightAt(x, z, fallback) {
      return happyValleyTerrainHeightAt(x, z, fallback, groundOffset);
    },
  };
}
