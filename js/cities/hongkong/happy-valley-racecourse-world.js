// HK-B0107: 跑馬地馬場 Happy Valley Racecourse — geometry.
//
// Provisional track and infield, mapped Pavilion Stand and parade ring, and estimated floodlights.
// The mislocated placeholder stands and museum have been removed pending mapped replacements.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import {
  happyValleyTerrainHeightAt, happyValleyTrackPoint,
  HAPPY_VALLEY_SITE, HAPPY_VALLEY_TRACK, HAPPY_VALLEY_MAIN_STAND, HAPPY_VALLEY_COLOURS,
  HAPPY_VALLEY_CAPACITY, HAPPY_VALLEY_OPENED, HAPPY_VALLEY_PARADE_LOCAL_RING,
} from './happy-valley-racecourse-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, roofGeometry,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider, harbourCityEdgeFrame } from './harbour-city-architecture.js';
import { HAPPY_VALLEY_PAVILION, HAPPY_VALLEY_PAVILION_ENTRANCE } from './happy-valley-pavilion-site.js';
import { buildHappyValleyPitches } from './happy-valley-pitches-world.js';
import { buildHappyValleyPavilion } from './happy-valley-pavilion-world.js';
import { fullRoadSurfaceAt } from './full-meta.js';

const C = HAPPY_VALLEY_COLOURS;
const DEG = Math.PI / 180;
// The two reduced offsets keep the newly continuous-loop mast centres inside
// the mapped venue, off sampled roads. They are provisional positions, not a
// survey of the actual floodlight locations.
const FLOODLIGHT_POSITIONS = [[0.02, 52], [0.14, 5], [0.30, 20], [0.70, 20], [0.86, 10], [0.96, 46]];


function makeMaterials() {
  const palette = harbourCityPalette();
  const seat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.7, side: THREE.DoubleSide });
  seat.colorNode = attribute('color').rgb;
  const decal = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  decal.colorNode = attribute('color').rgb;
  return {
    seat, decal,
    grass: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.grass), roughness: 0.95, side: THREE.DoubleSide }),
    grassStripe: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.grassStripe), roughness: 0.95 }),
    infield: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.infield), roughness: 0.96 }),
    paradePath: new THREE.MeshStandardMaterial({ color: 0xc96b50, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    paradeWall: new THREE.MeshStandardMaterial({ color: 0xc9bba1, roughness: 0.87 }),
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
    screen: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.screen), roughness: 0.4, emissive: new THREE.Color(0.05, 0.35, 0.4) }),
    white: palette.white,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The provisional circuit: 30.5 m grass band and white running rails.
// ---------------------------------------------------------------------------------------------------------------
// Shared with diagnostics, frames and tests: a single closed-loop source of truth.
const trackPoint = happyValleyTrackPoint;

// Only an approximate same-level road query, not a complete swept collision test.
// These temporary breaks preserve infield-road access until the mapped track is re-fitted.
function trackRoadConflict(point, groundOffset, margin = 1.3) {
  const s = HAPPY_VALLEY_SITE, c = Math.cos(s.ry), sn = Math.sin(s.ry);
  const x = s.x + c * point.x + sn * point.z, z = s.z - sn * point.x + c * point.z;
  const hit = fullRoadSurfaceAt(x, z, margin, groundOffset);
  return !!hit && Math.abs(hit.height - groundOffset) < 2.5;
}

function buildCourse(group, materials, stats, groundOffset) {
  const course = new THREE.Group(); course.name = 'HappyValleyCourse'; group.add(course);
  const segments = 360;
  let roadRailGaps = 0, roadSurfaceGaps = 0;
  const band = store(), infieldStore = store();
  const infieldApex = { x: HAPPY_VALLEY_TRACK.centreX - 8, z: HAPPY_VALLEY_TRACK.centreZ };
  const rails = [], posts = [], distancePoles = [];
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    const outer0 = trackPoint(t0, 0), outer1 = trackPoint(t1, 0);
    const inner0 = trackPoint(t0, -HAPPY_VALLEY_TRACK.width), inner1 = trackPoint(t1, -HAPPY_VALLEY_TRACK.width);
    // Mowing stripes alternate every eight segments along the track.
    const tint = Math.floor(i / 8) % 2 ? C.grassStripe : C.grass;
    // Split the band into small cells so mapped same-level road ribbons are
    // not covered by the authored grass. Half-diagonal margin is conservative;
    // this is still a coarse, temporary cut until the track is realigned.
    const across = 12, cellWidth = HAPPY_VALLEY_TRACK.width / across;
    for (let cell = 0; cell < across; cell++) {
      const o0 = -cell * cellWidth, o1 = -(cell+1) * cellWidth;
      const mid = trackPoint((t0+t1)/2, (o0+o1)/2);
      if (trackRoadConflict(mid, groundOffset, 2.7)) { roadSurfaceGaps++; continue; }
      const a=trackPoint(t0,o0), b=trackPoint(t1,o0), c=trackPoint(t1,o1), d=trackPoint(t0,o1);
      quad(band, [a.x,0.1,a.z], [b.x,0.1,b.z], [c.x,0.1,c.z], [d.x,0.1,d.z], tint);
    }
    // Avoid placing a solid rail/post across same-level carriageways. The
    // resulting gaps are temporary, not a claim about actual access gates.
    for (const [a, b, offset] of [[outer0, outer1, 0], [inner0, inner1, -HAPPY_VALLEY_TRACK.width]]) {
      const mid = trackPoint((t0+t1)/2, offset);
      const blocked = [a, mid, b].some(p => trackRoadConflict(p, groundOffset));
      if (blocked) { roadRailGaps++; continue; }
      for (const height of [1.15, 0.82, 0.5]) beam(rails, [a.x, height, a.z], [b.x, height, b.z], 0.13, 0.11);
      if (i % 9 === 0) cylinder(posts, [a.x, 0.58, a.z], 0.055, 1.16, 5);
    }
    // Infield turf inside the inner running rail (the 1995 rebuild did away with the old inner sand track).
    const c0 = trackPoint(t0, -HAPPY_VALLEY_TRACK.width);
    const c1 = trackPoint(t1, -HAPPY_VALLEY_TRACK.width);
    quad(infieldStore, [infieldApex.x, -0.02, infieldApex.z], [c0.x, -0.02, c0.z], [c1.x, -0.02, c1.z],
      [infieldApex.x, -0.02, infieldApex.z], C.infield);
  }
  // Distance poles every 200 m along the inner rail, painted white with black bands.
  for (let metre = 200; metre < HAPPY_VALLEY_TRACK.lapMetres; metre += 200) {
    const t = metre / HAPPY_VALLEY_TRACK.lapMetres;
    const p = trackPoint(t, -HAPPY_VALLEY_TRACK.width - 1.2);
    cylinder(distancePoles, [p.x, 0.9, p.z], 0.09, 1.8, 6);
  }
  meshStore(course, band, materials.grass, 'HappyValleyTrackSurface', false);
  meshStore(course, infieldStore, materials.infield, 'HappyValleyInfieldTurf', false);
  merged(course, rails, materials.rail, 'HappyValleyRunningRails');
  merged(course, posts, materials.rail, 'HappyValleyRunningRailPosts');
  merged(course, distancePoles, materials.rail, 'HappyValleyDistancePoles');
  stats.happyValleyTrackSegments = segments;
  stats.happyValleyRoadRailGaps = roadRailGaps;
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
  const boards = [], frames = [], screenParts = [];
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
  stats.happyValleyBrandingBoards = boards.length;
  stats.happyValleyParadeOsmId = 1056788255;
  return infield;
}

// ---------------------------------------------------------------------------------------------------------------
// Floodlights, perimeter fence, gates and the service road that rings the course.
// ---------------------------------------------------------------------------------------------------------------
function buildGrounds(group, materials, stats, groundOffset) {
  const grounds = new THREE.Group(); grounds.name = 'HappyValleyGrounds'; group.add(grounds);
  const masts = [], heads = [], fence = [], gates = [];
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
  grounds.add(apron);
  // Six floodlight masts around the course, four on the stand side and two opposite.
  for (const [t, out] of FLOODLIGHT_POSITIONS) {
    const p = trackPoint(t, out);
    cylinder(masts, [p.x, 17, p.z], 0.42, 34, 8);
    box(heads, [p.x, 34.6, p.z], [5.4, 2.2, 0.8]);
    for (let lamp = 0; lamp < 8; lamp++) {
      box(heads, [p.x - 2.2 + lamp * 0.63, 36.4, p.z], [0.5, 0.9, 0.4]);
    }
  }
  // The OSM boundary is not a surveyed fence. Preserve existing placeholder
  // openings and cut additional temporary gaps at same-level road ribbons.
  const ringCount = ring.length / 2;
  let roadFenceGaps = 0, entranceFenceGaps = 0;
  const door = harbourCityEdgeFrame(HAPPY_VALLEY_PAVILION, HAPPY_VALLEY_PAVILION_ENTRANCE.edge,
    'Provisional Pavilion entrance', 'Estimated street-side opening', HAPPY_VALLEY_PAVILION_ENTRANCE.centre);
  const nearDoor = p => {
    const c=Math.cos(site.ry), sn=Math.sin(site.ry);
    const dx=site.x+c*p.x+sn*p.z-door.x, dz=site.z-sn*p.x+c*p.z-door.z;
    return Math.abs(dx*door.nz-dz*door.nx) < HAPPY_VALLEY_PAVILION_ENTRANCE.width/2+1 &&
      Math.abs(dx*door.nx+dz*door.nz) < 3;
  };
  for (let i = 0; i < ringCount; i++) {
    const ax = ring[2 * i], az = ring[2 * i + 1];
    const bx = ring[(2 * i + 2) % ring.length], bz = ring[(2 * i + 3) % ring.length];
    const gate = i === 1 || i === 2 || i === 44 || i === 45;
    if (gate) { gates.push({ x: ax, z: az }); continue; }
    const length = Math.hypot(bx-ax,bz-az), steps = Math.ceil(length / 2);
    for(let j=0;j<steps;j++) {
      const point = t => ({x:ax+(bx-ax)*t,z:az+(bz-az)*t});
      const a=point(j/steps), b=point((j+1)/steps), mid=point((j+.5)/steps);
      if ([a,mid,b].some(nearDoor)) { entranceFenceGaps++; continue; }
      if ([a,mid,b].some(p => trackRoadConflict(p,groundOffset,1.2))) { roadFenceGaps++; continue; }
      for (const height of [1.9, 1.0]) beam(fence, [a.x,height,a.z], [b.x,height,b.z], .07,.07);
      if (j%3===0) cylinder(fence,[a.x,1,a.z],.08,2,6);
    }
  }
  stats.happyValleyRoadFenceGaps = roadFenceGaps;
  stats.happyValleyEntranceFenceGaps = entranceFenceGaps;
  merged(grounds, masts, materials.standShade, 'HappyValleyFloodlightMasts');
  merged(grounds, heads, materials.roof, 'HappyValleyFloodlightHeads');
  merged(grounds, fence, materials.rail, 'HappyValleyPerimeterFence');
  stats.happyValleyFloodlightMasts = 6;
  stats.happyValleyFloodlightHeight = 36;
  stats.happyValleyGates = gates.length;
  return { grounds, gates };
}

export function buildHappyValleyRacecourse(root, { groundOffset = 0 } = {}) {
  const venue = new THREE.Group();
  venue.name = 'HappyValleyRacecourse';
  venue.position.set(HAPPY_VALLEY_SITE.x, groundOffset, HAPPY_VALLEY_SITE.z);
  venue.rotation.y = HAPPY_VALLEY_SITE.ry;
  root.add(venue);
  const materials = makeMaterials();
  const stats = {};
  buildGrounds(venue, materials, stats, groundOffset);
  buildCourse(venue, materials, stats, groundOffset);
  buildHappyValleyPitches(venue);
  const pavilion = buildHappyValleyPavilion(venue, groundOffset);
  buildInfield(venue, materials, stats);

  const colliders = [];
  const push = (x, z, w, d, h, ry = 0) => colliders.push(harbourCityLocalCollider(
    HAPPY_VALLEY_SITE, x, z, w, d, groundOffset, groundOffset + h, HAPPY_VALLEY_SITE.ry + ry));
  // No colliders for the removed, incorrectly located stand/club/museum.
  // Floodlight masts.
  for (const [t, out] of FLOODLIGHT_POSITIONS) {
    const p = trackPoint(t, out);
    push(p.x, p.z, 1.6, 1.6, 36);
  }

  colliders.push(...pavilion.colliders);

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
    groundHeightAt(x, z, fallback) {
      return happyValleyTerrainHeightAt(x, z, fallback, groundOffset);
    },
  };
}
