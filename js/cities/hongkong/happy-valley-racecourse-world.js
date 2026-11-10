// HK-B0107: 跑馬地馬場 Happy Valley Racecourse — geometry.
//
// Built from HAPPY_VALLEY_TRACK (the 30.5 m grass circuit fitted inside the surveyed fence), the 1969 grandstand
// on its widest arc, the clubhouse and Racing Museum behind it, the sand-coloured infield with the club's branding
// boards and the big screen facing the stand, the parade ring, and the floodlights of the Wednesday night meetings.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import {
  happyValleyTerrainHeightAt, happyValleyTrackPoint,
  HAPPY_VALLEY_SITE, HAPPY_VALLEY_TRACK, HAPPY_VALLEY_MAIN_STAND, HAPPY_VALLEY_CLUBHOUSE, HAPPY_VALLEY_COLOURS,
  HAPPY_VALLEY_CAPACITY, HAPPY_VALLEY_OPENED, HAPPY_VALLEY_PARADE_LOCAL_RING,
} from './happy-valley-racecourse-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, roofGeometry, scaledRing,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { buildHappyValleyPitches } from './happy-valley-pitches-world.js';
import { buildHappyValleyPavilion } from './happy-valley-pavilion-world.js';

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
    grass: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.grass), roughness: 0.95 }),
    grassStripe: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.grassStripe), roughness: 0.95 }),
    infield: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.infield), roughness: 0.96 }),
    paradePath: new THREE.MeshStandardMaterial({ color: 0x884239, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
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

function buildCourse(group, materials, stats) {
  const course = new THREE.Group(); course.name = 'HappyValleyCourse'; group.add(course);
  const segments = 120;
  const band = store(), infieldStore = store();
  const infieldApex = { x: HAPPY_VALLEY_TRACK.centreX - 8, z: HAPPY_VALLEY_TRACK.centreZ };
  const rails = [], posts = [], distancePoles = [];
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    const outer0 = trackPoint(t0, 0), outer1 = trackPoint(t1, 0);
    const inner0 = trackPoint(t0, -HAPPY_VALLEY_TRACK.width), inner1 = trackPoint(t1, -HAPPY_VALLEY_TRACK.width);
    // Mowing stripes alternate every eight segments along the track.
    const tint = Math.floor(i / 8) % 2 ? C.grassStripe : C.grass;
    quad(band, [outer0.x, 0.1, outer0.z], [outer1.x, 0.1, outer1.z],
      [inner1.x, 0.1, inner1.z], [inner0.x, 0.1, inner0.z], tint);
    // Running rails: top rail + two lower rails, with a post every fourth segment.
    for (const [a, b] of [[outer0, outer1], [inner0, inner1]]) {
      for (const height of [1.15, 0.82, 0.5]) beam(rails, [a.x, height, a.z], [b.x, height, b.z], 0.13, 0.11);
    }
    if (i % 3 === 0) {
      cylinder(posts, [outer0.x, 0.58, outer0.z], 0.055, 1.16, 5);
      cylinder(posts, [inner0.x, 0.58, inner0.z], 0.055, 1.16, 5);
    }
    // Infield turf inside the inner running rail (the 1995 rebuild did away with the old inner sand track).
    const c0 = trackPoint(t0, -HAPPY_VALLEY_TRACK.width);
    const c1 = trackPoint(t1, -HAPPY_VALLEY_TRACK.width);
    quad(infieldStore, [infieldApex.x, 0.08, infieldApex.z], [c0.x, 0.08, c0.z], [c1.x, 0.08, c1.z],
      [infieldApex.x, 0.08, infieldApex.z], C.infield);
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
  stats.happyValleyDistancePoles = distancePoles.length;
  return course;
}

// ---------------------------------------------------------------------------------------------------------------
// The 1969 grandstand: 12 decks on a white plinth, cantilever roof, clubhouse and Racing Museum behind.
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

function buildGrandstand(group, materials, stats) {
  const stand = HAPPY_VALLEY_MAIN_STAND;
  const frame = standFrame();
  const group2 = new THREE.Group();
  group2.name = 'HappyValleyGrandstand';
  group2.position.set(stand.centreX, 0, stand.centreZ);
  group2.rotation.y = frame.ry;
  group.add(group2);
  // Inside this group +X runs along the stand and +Z faces the track.
  const halfLength = stand.length / 2;
  const halfDepth = stand.depth / 2;
  const seats = store(), structure = [], glazing = [], roofParts = [], canopyColumns = [];
  // Plinth and the 12 decks behind it.
  box(structure, [0, stand.podiumHeight / 2, halfDepth - 4.0], [stand.length, stand.podiumHeight, 8.0]);
  for (let tier = 0; tier < stand.tiers; tier++) {
    const z = halfDepth - 4.0 - (tier + 0.5) * stand.tierTread;
    const y = stand.podiumHeight + tier * stand.tierRise;
    box(structure, [0, y + stand.tierRise / 2 - 0.08, z], [stand.length, stand.tierRise + 0.16, stand.tierTread + 0.04]);
    const seatsPerTier = Math.round(stand.length / 0.62);
    for (let seat = 0; seat < seatsPerTier; seat++) {
      const x = -halfLength + (seat + 0.5) * (stand.length / seatsPerTier);
      const tint = Math.floor(seat / 24) % 2 ? C.seat : C.seatAlt;
      quad(seats, [x - 0.23, y, z + stand.tierTread / 2 - 0.1], [x + 0.23, y, z + stand.tierTread / 2 - 0.1],
        [x + 0.23, y + 0.34, z + stand.tierTread / 2 - 0.26], [x - 0.23, y + 0.34, z + stand.tierTread / 2 - 0.26], tint);
    }
  }
  // Rear wall, side walls and the glazed concourse behind the seating.
  const topDeck = stand.podiumHeight + stand.tiers * stand.tierRise;
  box(structure, [0, (stand.podiumHeight + topDeck) / 2, -halfDepth + 0.5], [stand.length, topDeck - stand.podiumHeight, 1.0]);
  for (const side of [-1, 1]) {
    box(structure, [side * (halfLength + 0.5), stand.canopyHeight / 2, 0], [1.0, stand.canopyHeight, stand.depth]);
  }
  box(glazing, [0, stand.podiumHeight + 6.5, -halfDepth + 1.2], [stand.length - 6, 11.0, 0.5]);
  // Cantilever roof over the top decks, with the fascia band and its columns at the back.
  box(roofParts, [0, stand.canopyHeight, halfDepth - 5.5], [stand.length + 4, 0.9, stand.depth + 3]);
  box(roofParts, [0, stand.canopyHeight + 1.2, halfDepth + 0.6], [stand.length + 4, 1.6, 0.8]);
  for (let i = 0; i <= 10; i++) {
    const x = -halfLength + (i / 10) * stand.length;
    cylinder(canopyColumns, [x, stand.canopyHeight / 2, -halfDepth + 3.0], 0.32, stand.canopyHeight, 8);
  }
  // Betting hall and entrance canopy at ground level.
  box(structure, [0, 2.4, halfDepth + 1.6], [stand.length - 18, 4.8, 3.2]);
  meshStore(group2, seats, materials.seat, 'HappyValleyGrandstandSeats');
  merged(group2, structure, materials.stand, 'HappyValleyGrandstandStructure');
  merged(group2, glazing, materials.glass, 'HappyValleyGrandstandGlazing');
  merged(group2, roofParts, materials.roof, 'HappyValleyGrandstandRoof');
  merged(group2, canopyColumns, materials.standShade, 'HappyValleyGrandstandColumns');
  stats.happyValleyGrandstandTiers = stand.tiers;
  stats.happyValleyGrandstandLength = stand.length;
  stats.happyValleyGrandstandSeats = Math.round(stand.length / 0.62) * stand.tiers;
  return { group2, frame, topDeck };
}

// Clubhouse block and the Racing Museum annex, on the club side behind the grandstand.
function buildClubHouse(group, materials, stats, frame) {
  const club = new THREE.Group(); club.name = 'HappyValleyClubhouse'; group.add(club);
  const stand = HAPPY_VALLEY_MAIN_STAND;
  const place = (along, out) => ({
    x: stand.centreX + frame.tanX * along + frame.normalX * out,
    z: stand.centreZ + frame.tanZ * along + frame.normalZ * out,
  });
  const parts = [], glazing = [], tower = [];
  const house = place(0, -26);
  box(parts, [house.x, HAPPY_VALLEY_CLUBHOUSE.height / 2, house.z],
    [HAPPY_VALLEY_CLUBHOUSE.length, HAPPY_VALLEY_CLUBHOUSE.height, HAPPY_VALLEY_CLUBHOUSE.depth], frame.ry);
  box(glazing, [house.x, 15, house.z], [HAPPY_VALLEY_CLUBHOUSE.length - 8, 14, HAPPY_VALLEY_CLUBHOUSE.depth + 0.4], frame.ry);
  // The club headquarters tower stands beyond the north end of the stand.
  const towerSite = place(HAPPY_VALLEY_MAIN_STAND.length / 2 + 26, -34);
  box(tower, [towerSite.x, 32, towerSite.z], [26, 64, 26], frame.ry);
  box(tower, [towerSite.x, 66, towerSite.z], [20, 6, 20], frame.ry);
  // Museum annex: a low green-roofed block at the south end of the stand complex.
  const museum = place(-HAPPY_VALLEY_MAIN_STAND.length / 2 - 20, 2);
  box(parts, [museum.x, 5.5, museum.z], [30, 11, 20], frame.ry);
  box(parts, [museum.x, 11.6, museum.z], [32, 1.2, 22], frame.ry);
  merged(club, parts, materials.club, 'HappyValleyClubAndMuseum');
  merged(club, glazing, materials.glass, 'HappyValleyClubGlazing');
  merged(club, tower, materials.stand, 'HappyValleyClubTower');
  stats.happyValleyClubTowerHeight = 70;
  return club;
}

// ---------------------------------------------------------------------------------------------------------------
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
  // Mapped paddock footprint. A reddish walking edge and muted green centre
  // recall the paddock photographs, but their widths and the rail are estimates.
  const ring = HAPPY_VALLEY_PARADE_LOCAL_RING;
  const outer = new THREE.Mesh(roofGeometry(ring, 0.14), materials.paradePath);
  outer.name = 'HappyValleyParadeRingSurface'; infield.add(outer);
  const centre = new THREE.Mesh(roofGeometry(scaledRing(ring, 0.76), 0.155), materials.paradeCentre);
  centre.name = 'HappyValleyParadeRingCentre'; infield.add(centre);
  const ringRail = [];
  // Leave a gap at each rounded end for access; actual gate positions are unknown.
  for (let i = 0; i < ring.length - 2; i += 2) {
    if (i === 0 || i === 12) continue;
    const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    for (const y of [0.55, 1.05]) beam(ringRail, [ax, y, az], [bx, y, bz], 0.07, 0.07);
    const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3));
    for (let k = 0; k < count; k++) {
      const t = k / count;
      cylinder(ringRail, [ax + (bx - ax) * t, 0.55, az + (bz - az) * t], 0.055, 1.1, 6);
    }
  }
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
function buildGrounds(group, materials, stats) {
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
  const apron = new THREE.Mesh(roofGeometry(ring, 0.04), materials.apron);
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
  // Placeholder perimeter fence follows the mapped boundary; its real location is unverified.
  const ringCount = ring.length / 2;
  for (let i = 0; i < ringCount; i++) {
    const ax = ring[2 * i], az = ring[2 * i + 1];
    const bx = ring[(2 * i + 2) % ring.length], bz = ring[(2 * i + 3) % ring.length];
    const gate = i === 1 || i === 2 || i === 44 || i === 45;
    if (gate) { gates.push({ x: ax, z: az }); continue; }
    for (const height of [1.9, 1.0]) beam(fence, [ax, height, az], [bx, height, bz], 0.07, 0.07);
    cylinder(fence, [ax, 1.0, az], 0.08, 2.0, 6);
  }
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
  buildGrounds(venue, materials, stats);
  buildCourse(venue, materials, stats);
  buildHappyValleyPitches(venue);
  const pavilion = buildHappyValleyPavilion(venue, groundOffset);
  const { frame } = buildGrandstand(venue, materials, stats);
  buildClubHouse(venue, materials, stats, frame);
  buildInfield(venue, materials, stats);

  const stand = HAPPY_VALLEY_MAIN_STAND;
  const colliders = [];
  const push = (x, z, w, d, h, ry = 0) => colliders.push(harbourCityLocalCollider(
    HAPPY_VALLEY_SITE, x, z, w, d, groundOffset, groundOffset + h, HAPPY_VALLEY_SITE.ry + ry));
  // Grandstand, clubhouse, club tower and the museum annex.
  push(stand.centreX, stand.centreZ, stand.length, stand.depth, stand.canopyHeight + 2.4, frame.ry);
  const place = (along, out) => ({
    x: stand.centreX + frame.tanX * along + frame.normalX * out,
    z: stand.centreZ + frame.tanZ * along + frame.normalZ * out,
  });
  const house = place(0, -26);
  push(house.x, house.z, HAPPY_VALLEY_CLUBHOUSE.length, HAPPY_VALLEY_CLUBHOUSE.depth, HAPPY_VALLEY_CLUBHOUSE.height, frame.ry);
  const towerSite = place(stand.length / 2 + 26, -34);
  push(towerSite.x, towerSite.z, 26, 26, 70, frame.ry);
  const museum = place(-stand.length / 2 - 20, 2);
  push(museum.x, museum.z, 30, 20, 12.4, frame.ry);
  // Floodlight masts.
  for (const [t, out] of FLOODLIGHT_POSITIONS) {
    const p = trackPoint(t, out);
    push(p.x, p.z, 1.6, 1.6, 36);
  }

  colliders.push(...pavilion.colliders);

  const landmarks = [{
    id: 'happy-valley-racecourse', name: '跑馬地馬場 · Happy Valley Racecourse',
    position: { x: HAPPY_VALLEY_SITE.x, y: groundOffset, z: HAPPY_VALLEY_SITE.z },
    radius: 300, height: 70, components: 4,
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
