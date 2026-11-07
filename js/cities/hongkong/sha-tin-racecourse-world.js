// HK-B0108: 沙田馬場 Sha Tin Racecourse — geometry.
//
// The course comes straight out of the survey: the infield ring is OSM way 163970357 (彭福公園 Penfold Park) and
// the two tracks are the published 30.5 m grass course and 24 m all-weather track laid outside it, so the grass
// outer rail measures 1,900 m and the all-weather centre line 1,633 m. The grandstands sit on the north-west side
// where the surveyed fence leaves its widest apron: Grandstand I from 1978, the members' stand of 1985, the club
// building, the parade ring and the saddling enclosure between them, and the big screen out in the infield facing
// the stands. The stabling and 馬場站 Racecourse Station fill the freight-yard corner of the property.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import {
  SHA_TIN_SITE, SHA_TIN_TRACK, SHA_TIN_LAPS, SHA_TIN_COLOURS, SHA_TIN_GRANDSTANDS, SHA_TIN_CLUBHOUSE,
  SHA_TIN_PARADE_RING, SHA_TIN_BIG_SCREEN, SHA_TIN_STABLES, SHA_TIN_RACECOURSE_STATION_PLATFORM,
  SHA_TIN_COURSE_PUBLISHED, SHA_TIN_INFIELD_PARK, SHA_TIN_INFIELD_LOCAL, SHA_TIN_RESEARCH_SOURCES,
  shaTinTrackPoint, shaTinTrackFrame, shaTinOnInfield, shaTinTerrainHeightAt,
} from './sha-tin-racecourse-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette, hash,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import { pointInFlatRing } from './landmark-site.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

const C = SHA_TIN_COLOURS;
const DEG = Math.PI / 180;
const TRACK = SHA_TIN_TRACK;

function makeMaterials() {
  const palette = harbourCityPalette();
  const vertex = (roughness, extra = {}) => {
    const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness, metalness: 0.04, side: THREE.DoubleSide, ...extra });
    material.colorNode = attribute('color');
    return material;
  };
  return {
    surface: vertex(0.95),
    seats: vertex(0.72),
    decal: vertex(0.86),
    white: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.standWhite), roughness: 0.6, side: THREE.DoubleSide }),
    shade: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.standShade), roughness: 0.68, side: THREE.DoubleSide }),
    rail: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.rail), roughness: 0.45, metalness: 0.2 }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.roof), roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.glass), roughness: 0.16, metalness: 0.5, side: THREE.DoubleSide }),
    club: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.clubGreen), roughness: 0.55 }),
    red: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.clubRed), roughness: 0.6 }),
    screen: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.screen), roughness: 0.35, emissive: new THREE.Color(0.04, 0.3, 0.34) }),
    metal: palette.metal ?? new THREE.MeshStandardMaterial({ color: 0x8f9491, roughness: 0.42, metalness: 0.55 }),
    white2: palette.white,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The course: apron, 全天候跑道 all-weather track, 草地跑道 turf, running rails and the infield park.
// ---------------------------------------------------------------------------------------------------------------
function buildCourse(group, materials, stats) {
  const course = new THREE.Group();
  course.name = 'ShaTinCourse';
  group.add(course);
  const segments = 144;
  const apron = store(), sand = store(), turf = store(), infield = store(), park = store();
  const rails = [], posts = [], markers = [], fences = [];
  const flags = store();
  const centre = { x: TRACK.centreX, z: TRACK.centreZ };

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    const inner0 = shaTinTrackPoint(t0, 0), inner1 = shaTinTrackPoint(t1, 0);
    const awtIn0 = shaTinTrackPoint(t0, TRACK.apronMetres), awtIn1 = shaTinTrackPoint(t1, TRACK.apronMetres);
    const awtOut0 = shaTinTrackPoint(t0, TRACK.apronMetres + TRACK.allWeatherMetres);
    const awtOut1 = shaTinTrackPoint(t1, TRACK.apronMetres + TRACK.allWeatherMetres);
    const turfOut0 = shaTinTrackPoint(t0, TRACK.turfOuterRadius - TRACK.innerRadius);
    const turfOut1 = shaTinTrackPoint(t1, TRACK.turfOuterRadius - TRACK.innerRadius);
    // The discorectangle parameterisation jumps between the two straights at t = 1/4 and 3/4; skip those segments
    // so nothing is drawn across the infield.
    if (Math.hypot(inner1.x - inner0.x, inner1.z - inner0.z) > TRACK.straight * 0.4) continue;
    // Sand apron between the infield hedge and the all-weather track.
    quad(apron, [inner0.x, 0.09, inner0.z], [inner1.x, 0.09, inner1.z],
      [awtIn1.x, 0.09, awtIn1.z], [awtIn0.x, 0.09, awtIn0.z], C.sand);
    // 全天候跑道: sand-coloured, with a darker harrowed edge.
    quad(sand, [awtIn0.x, 0.1, awtIn0.z], [awtIn1.x, 0.1, awtIn1.z],
      [awtOut1.x, 0.1, awtOut1.z], [awtOut0.x, 0.1, awtOut0.z], C.allWeather);
    // 草地跑道: mowing stripes alternate every six segments.
    const stripe = Math.floor(i / 6) % 2 ? C.turfStripe : C.turf;
    quad(turf, [awtOut0.x, 0.1, awtOut0.z], [awtOut1.x, 0.1, awtOut1.z],
      [turfOut1.x, 0.1, turfOut1.z], [turfOut0.x, 0.1, turfOut0.z], stripe);
    // Infield lawn, drawn as a fan from the infield centre.
    quad(infield, [centre.x, 0.07, centre.z], [inner0.x, 0.07, inner0.z], [inner1.x, 0.07, inner1.z],
      [centre.x, 0.07, centre.z], C.infieldLawn);
    // Running rails: inner rail against the infield, a rail between the two tracks, and the outer rail.
    for (const [a, b, colour] of [[inner0, inner1, C.rail], [awtOut0, awtOut1, C.rail], [turfOut0, turfOut1, C.rail]]) {
      for (const height of [TRACK.railHeight, 0.78, 0.46]) beam(rails, [a.x, height, a.z], [b.x, height, b.z], 0.12, 0.1);
      void colour;
    }
    if (i % 3 === 0) {
      for (const point of [inner0, awtOut0, turfOut0]) cylinder(posts, [point.x, 0.58, point.z], 0.055, 1.16, 5);
    }
    // Betting boards and distance markers along the outer rail, on the home straight side.
    if (i % 12 === 0) {
      const board = shaTinTrackPoint(t0, TRACK.turfOuterRadius - TRACK.innerRadius + 2.4);
      box(markers, [board.x, 1.4, board.z], [3.2, 1.5, 0.3]);
    }
  }

  const parkRing = SHA_TIN_INFIELD_LOCAL;
  // Penfold Park: the surveyed infield outline is what the course was laid out from, so the infield lawn above is
  // already the park. A lighter mown band marks the walking ring the public uses on race days.
  for (let i = 0; i + 1 < parkRing.length; i += 2) {
    const ax = parkRing[i], az = parkRing[i + 1];
    if (!shaTinOnInfield(ax, az, 6)) continue;
    quad(park, [centre.x, 0.08, centre.z], [ax, 0.08, az], [parkRing[(i + 2) % parkRing.length], 0.08, parkRing[(i + 3) % parkRing.length]],
      [centre.x, 0.08, centre.z], C.parkLawn);
  }

  // Winning post on the home straight, with the club's red and gold livery.
  const post = shaTinTrackPoint(0.0, -TRACK.innerRadius + 6);
  box(markers, [post.x, 0.9, post.z], [1.2, 1.8, 1.2]);
  cylinder(markers, [post.x, 4.4, post.z], 0.14, 9, 8);
  quad(flags, [post.x, 8.4, post.z], [post.x + 1.8, 8.1, post.z], [post.x + 1.8, 7.2, post.z], [post.x, 7.5, post.z], C.clubRed);

  // Perimeter fence round the property, following the surveyed ring, with the club's gates on the stand side.
  const ring = SHA_TIN_SITE.localRing;
  for (let i = 0; i < ring.length; i += 2) {
    const ax = ring[i], az = ring[i + 1];
    const bx = ring[(i + 2) % ring.length], bz = ring[(i + 3) % ring.length];
    const length = Math.hypot(bx - ax, bz - az);
    if (length < 4) continue;
    beam(fences, [ax, 1.1, az], [bx, 1.1, bz], 1.5, 2.2);
    if (i % 4 === 0) cylinder(posts, [ax, 1.1, az], 0.16, 2.2, 6);
  }

  meshStore(course, apron, materials.surface, 'ShaTinSandApron', false);
  meshStore(course, sand, materials.surface, 'ShaTinAllWeatherTrack', false);
  meshStore(course, turf, materials.surface, 'ShaTinTurfCourse', false);
  meshStore(course, infield, materials.surface, 'ShaTinInfieldLawn', false);
  meshStore(course, park, materials.surface, 'ShaTinPenfoldParkLawn', false);
  merged(course, rails, materials.rail, 'ShaTinRunningRails');
  merged(course, posts, materials.rail, 'ShaTinRunningRailPosts');
  merged(course, markers, materials.white, 'ShaTinWinningPostAndBoards');
  meshStore(course, flags, materials.surface, 'ShaTinWinningPostFlag', false);
  merged(course, fences, materials.shade, 'ShaTinPerimeterFence');

  stats.shaTinTurfLapMetres = SHA_TIN_LAPS.turfOuterMetres;
  stats.shaTinAllWeatherLapMetres = SHA_TIN_LAPS.allWeatherCentreMetres;
  stats.shaTinInnerRailMetres = SHA_TIN_LAPS.innerRailMetres;
  return { colliders: [] };
}

// ---------------------------------------------------------------------------------------------------------------
// A grandstand: podium concourse, a tiered terrace bowl facing the course, a rear enclosure and a cantilevered roof.
// ---------------------------------------------------------------------------------------------------------------
function buildStand(group, materials, stand, stats, index) {
  const name = index === 0 ? 'ShaTinGrandstandOne' : 'ShaTinGrandstandTwo';
  const holder = new THREE.Group();
  holder.name = name;
  group.add(holder);
  holder.position.set(stand.x, 0, stand.z);
  holder.rotation.y = -stand.rotation * DEG;
  const length = stand.lengthMetres, depth = stand.depthMetres;
  const white = [], tiers = [], seatsA = [], seatsB = [], glass = [], roofs = [], masts = [], lights = [];
  const front = depth / 2;   // the course side: the stands all sit north of the track here
  // Podium: the concourse floor, betting hall and the rear service spine.
  box(white, [0, stand.podiumHeight / 2, 0], [length, stand.podiumHeight, depth]);
  box(glass, [0, stand.podiumHeight + 2.6, -depth / 2 + 3.5], [length - 8, 5.2, 1.2]);
  // Terraces: each row steps back and up from the front of the podium.
  let z = front - 2, y = stand.podiumHeight;
  for (let tier = 0; tier < stand.tiers; tier++) {
    const rowLength = length - 6;
    box(tiers, [0, y + stand.tierRise / 2, z], [rowLength, stand.tierRise, stand.tierTread]);
    box(tier % 3 === 0 ? seatsA : seatsB, [0, y + stand.tierRise + 0.06, z], [rowLength - 2.4, 0.12, stand.tierTread * 0.62]);
    y += stand.tierRise;
    z -= stand.tierTread;
  }
  // Rear enclosure: the tall glazed back wall of the stand with the members' floors above the terraces.
  box(glass, [0, (y + stand.canopyHeight) / 2, -depth / 2 + 2], [length - 4, stand.canopyHeight - y, 2.4]);
  box(white, [0, stand.canopyHeight + 1.2, -depth / 2 + 12], [length, 2.4, 24]);
  for (const side of [-1, 1]) {
    box(white, [side * (length / 2 - 1.2), (y + stand.canopyHeight) / 2, 0], [2.4, stand.canopyHeight - y, depth - 4]);
  }
  // The long cantilevered roof, with its fascia and the floodlights along the leading edge.
  box(roofs, [0, stand.canopyHeight, 0], [length + 4, 1.6, depth + stand.roofOverhang * 2]);
  box(white, [0, stand.canopyHeight - 1.4, front + stand.roofOverhang], [length + 4, 1.4, 1.2]);
  const lightCount = Math.round(length / 22);
  for (let i = 0; i < lightCount; i++) {
    const lx = -length / 2 + 8 + i * ((length - 16) / Math.max(1, lightCount - 1));
    cylinder(masts, [lx, stand.canopyHeight + 2.6, front + stand.roofOverhang - 1.2], 0.28, 4.2, 8);
    box(lights, [lx, stand.canopyHeight + 4.6, front + stand.roofOverhang - 1.2], [2.6, 0.8, 1.0]);
  }
  // Stair and lift towers in front of the podium, as on the photographed elevation.
  for (const side of [-1, 1]) {
    box(white, [side * (length / 2 - 6), stand.podiumHeight + 2.2, front + 1.2], [6, 4.4, 2.4]);
  }
  merged(holder, white, materials.white, `${name}ConcourseAndRearEnclosure`);
  merged(holder, glass, materials.glass, `${name}GlazedEnclosure`);
  merged(holder, tiers, materials.shade, `${name}TerraceSteps`);
  merged(holder, seatsA, materials.seats, `${name}SeatsBlue`);
  merged(holder, seatsB, materials.seats, `${name}SeatsGrey`);
  merged(holder, roofs, materials.roof, `${name}CantileveredRoof`);
  merged(holder, masts, materials.metal, `${name}FloodlightMasts`);
  merged(holder, lights, materials.screen, `${name}FloodlightHeads`);
  // Seat colour blocks need vertex colours; give the merged seat meshes a flat tint by material colour.
  for (const mesh of [holder.getObjectByName(`${name}SeatsBlue`), holder.getObjectByName(`${name}SeatsGrey`)]) {
    if (!mesh) continue;
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(...(mesh.name.endsWith('Blue') ? C.seatBlue : C.seatGrey)), roughness: 0.72,
    });
  }
  // The stand's name board over the main entrance.
  const sign = makeCanvasSign(Math.min(26, length * 0.5), 1.6, (ctx, canvas) => {
    ctx.fillStyle = '#f4f1e8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0d5c3f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 96px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
    ctx.fillText('沙田馬場  SHA TIN RACECOURSE', canvas.width / 2, canvas.height * 0.52, canvas.width - 40);
  }, { transparent: false, canvasWidth: 1024, canvasHeight: 120 });
  sign.name = `${name}Sign`;
  sign.position.set(0, stand.podiumHeight + 5.6, front + 2.6);
  holder.add(sign);
  stats[`${stand.key}Seats`] = Math.round(length * stand.tiers * 3.6);
  stats[`${stand.key}Height`] = stand.canopyHeight + 6;
  return { colliders: [harbourCityLocalCollider(SHA_TIN_SITE, stand.x, stand.z, length, depth, -stand.rotation, 0, stand.canopyHeight)] };
}

// ---------------------------------------------------------------------------------------------------------------
// The club building, the parade ring and the saddling enclosure.
// ---------------------------------------------------------------------------------------------------------------
function buildClubhouse(group, materials, stats) {
  const club = SHA_TIN_CLUBHOUSE;
  const holder = new THREE.Group();
  holder.name = 'ShaTinClubhouse';
  group.add(holder);
  holder.position.set(club.x, 0, club.z);
  holder.rotation.y = -club.rotation * DEG;
  const body = [], glassBands = [], canopy = [];
  box(body, [0, club.height / 2, 0], [club.length, club.height, club.depth]);
  for (let floor = 1; floor < club.floors; floor++) {
    box(glassBands, [0, floor * club.floorHeight, club.depth / 2 + 0.15], [club.length - 2, 1.7, 0.3]);
    box(glassBands, [-club.length / 2 - 0.15, floor * club.floorHeight, 0], [0.3, 1.7, club.depth - 2]);
    box(glassBands, [club.length / 2 + 0.15, floor * club.floorHeight, 0], [0.3, 1.7, club.depth - 2]);
  }
  box(canopy, [0, club.height + 0.6, 1.5], [club.length + 3, 0.8, club.depth + 3]);
  merged(holder, body, materials.white, 'ShaTinClubhouseFloors');
  merged(holder, glassBands, materials.glass, 'ShaTinClubhouseGlazing');
  merged(holder, canopy, materials.roof, 'ShaTinClubhouseRoof');
  stats.shaTinClubhouseFloors = club.floors;
  return { colliders: [harbourCityLocalCollider(SHA_TIN_SITE, club.x, club.z, club.length, club.depth, -club.rotation, 0, club.height)] };
}

function buildParadeRing(group, materials, stats) {
  const ring = SHA_TIN_PARADE_RING;
  const holder = new THREE.Group();
  holder.name = 'ShaTinParadeRing';
  group.add(holder);
  const sandStore = store(), rails = [], posts = [], roofs = [], buildings = [];
  const segments = 48;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2, a1 = ((i + 1) / segments) * Math.PI * 2;
    const p0 = { x: ring.x + Math.cos(a0) * ring.radius, z: ring.z + Math.sin(a0) * ring.radius };
    const p1 = { x: ring.x + Math.cos(a1) * ring.radius, z: ring.z + Math.sin(a1) * ring.radius };
    quad(sandStore, [ring.x, 0.12, ring.z], [p0.x, 0.12, p0.z], [p1.x, 0.12, p1.z], [ring.x, 0.12, ring.z], C.sand);
    for (const height of [ring.railHeight, 0.8]) beam(rails, [p0.x, height, p0.z], [p1.x, height, p1.z], 0.1, 0.09);
    if (i % 3 === 0) cylinder(posts, [p0.x, 0.6, p0.z], 0.05, 1.2, 5);
  }
  // The saddling enclosure beside the ring, under the retractable-roof frame.
  box(buildings, [ring.x, 2.2, ring.z - ring.radius - 14], [ring.saddlingLength, 4.4, ring.saddlingDepth]);
  for (const dx of [-ring.saddlingLength / 2 + 4, 0, ring.saddlingLength / 2 - 4]) {
    cylinder(buildings, [ring.x + dx, 3.4, ring.z - ring.radius - 14], 0.18, 6.8, 7);
  }
  box(roofs, [ring.x, 7.0, ring.z - ring.radius - 14], [ring.saddlingLength + 4, 0.5, ring.saddlingDepth + 4]);
  meshStore(holder, sandStore, materials.surface, 'ShaTinParadeRingSanding', false);
  merged(holder, rails, materials.rail, 'ShaTinParadeRingRail');
  merged(holder, posts, materials.rail, 'ShaTinParadeRingPosts');
  merged(holder, buildings, materials.white, 'ShaTinSaddlingEnclosure');
  merged(holder, roofs, materials.roof, 'ShaTinSaddlingRetractableRoof');
  stats.shaTinParadeRingRadius = ring.radius;
  return {
    colliders: [
      harbourCityLocalCollider(SHA_TIN_SITE, ring.x, ring.z - ring.radius - 14, ring.saddlingLength, ring.saddlingDepth, 0, 7),
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The big screen and the club's branding boards in the infield, facing the stands.
// ---------------------------------------------------------------------------------------------------------------
function buildBigScreen(group, materials, stats) {
  const spec = SHA_TIN_BIG_SCREEN;
  const holder = new THREE.Group();
  holder.name = 'ShaTinBigScreen';
  group.add(holder);
  holder.position.set(spec.x, 0, spec.z);
  holder.rotation.y = -spec.facing;
  const frame = [], face = [], boards = [], pylons = [];
  for (const side of [-1, 1]) cylinder(pylons, [side * (spec.width / 2 - 4), spec.mastHeight / 2, 3], 0.9, spec.mastHeight, 10);
  box(frame, [0, spec.mastHeight - 6, 0], [spec.width + 2, spec.height + 2, 2.4]);
  box(face, [0, spec.mastHeight - 6, -1.4], [spec.width, spec.height, 0.4]);
  // Club branding boards on either side of the screen, as the green boards photographed in the infield.
  for (const side of [-1, 1]) {
    box(boards, [side * (spec.width / 2 + 26), 2.2, 4], [46, 4.4, 0.6]);
    box(boards, [side * (spec.width / 2 + 74), 2.2, 4], [46, 4.4, 0.6]);
  }
  merged(holder, pylons, materials.metal, 'ShaTinBigScreenPylons');
  merged(holder, frame, materials.white, 'ShaTinBigScreenFrame');
  merged(holder, face, materials.screen, 'ShaTinBigScreenFace');
  merged(holder, boards, materials.club, 'ShaTinInfieldBrandingBoards');
  stats.shaTinScreenWidth = spec.width;
  return {
    colliders: [
      harbourCityLocalCollider(SHA_TIN_SITE, spec.x, spec.z, spec.width, 6, -spec.facing, 0, spec.mastHeight),
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Stabling and 馬場站.
// ---------------------------------------------------------------------------------------------------------------
function buildStables(group, materials, stats) {
  const spec = SHA_TIN_STABLES;
  const holder = new THREE.Group();
  holder.name = 'ShaTinStables';
  group.add(holder);
  const blocks = [], roofs = [], yards = store();
  let built = 0;
  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < spec.perRow; col++) {
      const x = spec.originX + col * spec.spacingX;
      const z = spec.originZ + row * spec.spacingZ;
      if (!pointInFlatRing(SHA_TIN_SITE.localRing, x, z)) continue;
      box(blocks, [x, spec.height / 2, z], [spec.blockLength, spec.height, spec.blockDepth]);
      box(roofs, [x, spec.height + 0.4, z], [spec.blockLength + 1.6, 0.8, spec.blockDepth + 1.6]);
      quad(yards, [x - 22, 0.06, z + 14], [x + 22, 0.06, z + 14], [x + 22, 0.06, z + 30], [x - 22, 0.06, z + 30], [0.55, 0.52, 0.44]);
      built++;
    }
  }
  meshStore(holder, yards, materials.surface, 'ShaTinStableYards', false);
  merged(holder, blocks, materials.white, 'ShaTinStableBlocks');
  merged(holder, roofs, materials.roof, 'ShaTinStableRoofs');
  stats.shaTinStableBlocks = built;
  return { colliders: [] };
}

function buildStation(group, materials, stats) {
  const spec = SHA_TIN_RACECOURSE_STATION_PLATFORM;
  const holder = new THREE.Group();
  holder.name = 'ShaTinRacecourseStation';
  group.add(holder);
  holder.position.set(spec.x, 0, spec.z);
  holder.rotation.y = -spec.rotation * DEG;
  const platform = [], canopy = [], columns = [], rail = [];
  box(platform, [0, 0.6, 0], [spec.length, 1.2, spec.width]);
  box(platform, [0, 1.2, -spec.width / 2 + 2.6], [spec.length, 0.2, 3.2]);
  for (let i = 0; i < 8; i++) {
    const x = -spec.length / 2 + 14 + i * ((spec.length - 28) / 7);
    cylinder(columns, [x, spec.canopyHeight / 2 + 1.2, 0], 0.22, spec.canopyHeight, 8);
  }
  box(canopy, [0, spec.canopyHeight + 1.4, 0], [spec.length, 0.4, spec.width + 3]);
  beam(rail, [-spec.length / 2, 1.4, -spec.width / 2 - 1.2], [spec.length / 2, 1.4, -spec.width / 2 - 1.2], 0.12, 0.1);
  merged(holder, platform, materials.white, 'ShaTinRacecourseStationPlatform');
  merged(holder, columns, materials.metal, 'ShaTinRacecourseStationColumns');
  merged(holder, canopy, materials.roof, 'ShaTinRacecourseStationCanopy');
  merged(holder, rail, materials.rail, 'ShaTinRacecourseStationTrackRail');
  const sign = makeCanvasSign(16, 1.8, (ctx, canvas) => {
    ctx.fillStyle = '#101a24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 96px "Noto Sans HK", "PingFang HK", Arial, sans-serif';
    ctx.fillText('馬場  RACECOURSE', canvas.width / 2, canvas.height * 0.36, canvas.width - 40);
    ctx.font = '600 52px Arial, sans-serif'; ctx.fillStyle = '#9fd7ff';
    ctx.fillText('EAST RAIL LINE · 東鐵綫', canvas.width / 2, canvas.height * 0.76, canvas.width - 60);
  }, { transparent: false, canvasWidth: 1024, canvasHeight: 160 });
  sign.name = 'ShaTinRacecourseStationSign';
  sign.position.set(0, spec.canopyHeight + 3.1, spec.width / 2 - 2);
  holder.add(sign);
  stats.shaTinStationPlatformMetres = spec.length;
  return { colliders: [harbourCityLocalCollider(SHA_TIN_SITE, spec.x, spec.z, spec.length, spec.width, -spec.rotation, 0, 10)] };
}

// ---------------------------------------------------------------------------------------------------------------
// The property: apron roads, car parks, trees and the public lawn in front of the stands.
// ---------------------------------------------------------------------------------------------------------------
// Tarmac only where the site genuinely is paved: the two stand car parks, the concourse in front of the stands,
// the stable yards and the station forecourt.
function inPavedZone(x, z) {
  for (const [cx, cz, w, d] of [[-150, -230, 170, 80], [40, -250, 140, 70], [300, -250, 140, 80],
    [120, -170, 320, 110], [-120, -196, 170, 70], [480, -170, 210, 250], [330, -258, 200, 60]]) {
    if (Math.abs(x - cx) < w / 2 && Math.abs(z - cz) < d / 2) return true;
  }
  return false;
}

function buildSiteGround(group, materials, stats) {
  const ground = new THREE.Group();
  ground.name = 'ShaTinSiteGround';
  group.add(ground);
  const tarmac = store(), verge = store();
  const ring = SHA_TIN_SITE.localRing;
  let tiles = 0;
  // 24 m tiles clipped to the surveyed fence: tarmac over the property, with a grass verge along the boundary.
  for (let x = -680; x < 680; x += 24) {
    for (let z = -720; z < 720; z += 24) {
      const cx = x + 12, cz = z + 12;
      if (!pointInFlatRing(ring, cx, cz)) continue;
      const edge = [[x + 1, z + 1], [x + 23, z + 1], [x + 23, z + 23], [x + 1, z + 23]]
        .some(([px, pz]) => !pointInFlatRing(ring, px, pz));
      // The property reads as grass and sandy training ground, with tarmac only where cars and horses actually go.
      const paved = inPavedZone(cx, cz);
      quad(edge || !paved ? verge : tarmac, [x, 0.03, z], [x + 24, 0.03, z], [x + 24, 0.03, z + 24], [x, 0.03, z + 24],
        edge || !paved ? (edge ? [0.31, 0.44, 0.24] : [0.30, 0.43, 0.23]) : [0.44, 0.44, 0.43]);
      tiles++;
    }
  }
  meshStore(ground, tarmac, materials.surface, 'ShaTinSiteTarmac', false);
  meshStore(ground, verge, materials.surface, 'ShaTinBoundaryVerge', false);
  stats.shaTinSiteTiles = tiles;
}

function buildApron(group, materials, stats) {
  const apron = new THREE.Group();
  apron.name = 'ShaTinApron';
  group.add(apron);
  const parking = store(), trees = [], trunks = [], lawns = store();
  // Car parks in the north apron behind the stands.
  for (const [x, z, w, d] of [[-150, -230, 150, 60], [40, -250, 120, 50], [300, -250, 120, 60], [-380, -300, 130, 70]]) {
    if (!pointInFlatRing(SHA_TIN_SITE.localRing, x, z)) continue;
    quad(parking, [x - w / 2, 0.07, z - d / 2], [x + w / 2, 0.07, z - d / 2],
      [x + w / 2, 0.07, z + d / 2], [x - w / 2, 0.07, z + d / 2], [0.36, 0.36, 0.37]);
  }
  // Trees: around the stands, along the fence and through the infield park.
  for (let i = 0; i < 1400; i++) {
    const x = -620 + hash(i, 3, 11) * 1240;
    const z = -700 + hash(i, 7, 5) * 1300;
    if (!pointInFlatRing(SHA_TIN_SITE.localRing, x, z)) continue;
    const onInfield = shaTinOnInfield(x, z, 26);
    const nearTrack = (() => {
      const dx = x - TRACK.centreX, dz = z - TRACK.centreZ;
      const inner = Math.abs(dx) - TRACK.straight / 2;
      const distance = inner <= 0 ? Math.abs(dz) : Math.hypot(inner, dz);
      return distance < TRACK.turfOuterRadius + 34 && distance > TRACK.innerRadius - 26;
    })();
    if (nearTrack) continue;
    if (!onInfield && hash(i, 11, 7) > 0.35) continue;
    const scale = 0.8 + hash(i, 13, 3) * 0.7;
    cylinder(trunks, [x, 1.1 * scale, z], 0.16 * scale, 2.2 * scale, 6);
    const canopy = new THREE.SphereGeometry(1.7 * scale, 8, 6);
    canopy.scale(1, 0.85, 1);
    canopy.translate(x, 2.9 * scale, z);
    trees.push(canopy);
  }
  // The public lawn between the stands and the parade ring.
  for (const [x, z, w, d] of [[120, -160, 200, 46], [-120, -190, 150, 40]]) {
    if (!pointInFlatRing(SHA_TIN_SITE.localRing, x, z)) continue;
    quad(lawns, [x - w / 2, 0.06, z - d / 2], [x + w / 2, 0.06, z - d / 2],
      [x + w / 2, 0.06, z + d / 2], [x - w / 2, 0.06, z + d / 2], [0.30, 0.46, 0.22]);
  }
  meshStore(apron, parking, materials.surface, 'ShaTinCarParks', false);
  meshStore(apron, lawns, materials.surface, 'ShaTinPublicLawns', false);
  merged(apron, trunks, materials.shade, 'ShaTinTreeTrunks');
  merged(apron, trees, materials.club, 'ShaTinTreeCanopies');
  stats.shaTinTrees = trees.length;
  return { colliders: [] };
}

export function buildShaTinRacecourse(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group();
  root.name = 'ShaTinRacecourse';
  root.position.set(SHA_TIN_SITE.x, groundOffset, SHA_TIN_SITE.z);
  scene.add(root);
  const materials = makeMaterials();
  const stats = { shaTinRacecourse: true, shaTinOsmRelation: SHA_TIN_SITE.osmId };
  buildSiteGround(root, materials, stats);
  const course = buildCourse(root, materials, stats);
  const stands = SHA_TIN_GRANDSTANDS.map((stand, index) => buildStand(root, materials, stand, stats, index));
  const club = buildClubhouse(root, materials, stats);
  const parade = buildParadeRing(root, materials, stats);
  const screen = buildBigScreen(root, materials, stats);
  const stables = buildStables(root, materials, stats);
  const station = buildStation(root, materials, stats);
  const apron = buildApron(root, materials, stats);

  const colliders = [...course.colliders, ...stands.flatMap((s) => s.colliders), ...club.colliders,
    ...parade.colliders, ...screen.colliders, ...stables.colliders, ...station.colliders, ...apron.colliders]
    .map((collider) => ({ ...collider, minY: collider.minY + groundOffset, maxY: collider.maxY + groundOffset }));

  Object.assign(stats, {
    shaTinGroundOffset: groundOffset,
    shaTinPropertyHectares: Math.round(SHA_TIN_SITE.ringArea / 1000) / 10,
    shaTinInfieldSquareMetres: SHA_TIN_INFIELD_PARK.areaSquareMetres,
    shaTinInfieldPark: SHA_TIN_INFIELD_PARK.name,
    shaTinTurfWidthMetres: SHA_TIN_COURSE_PUBLISHED.turf.widthMetres,
    shaTinPublishedTurfLap: SHA_TIN_COURSE_PUBLISHED.turf.lapMetres,
    shaTinPublishedAllWeatherLap: SHA_TIN_COURSE_PUBLISHED.allWeather.lapMetres,
    shaTinDirection: SHA_TIN_COURSE_PUBLISHED.direction,
    shaTinCapacity: SHA_TIN_COURSE_PUBLISHED.capacity,
    shaTinOpened: SHA_TIN_COURSE_PUBLISHED.opened,
    shaTinStands: SHA_TIN_GRANDSTANDS.length,
    shaTinResearchSources: SHA_TIN_RESEARCH_SOURCES.length,
    shaTinColliders: 0,
  });
  stats.shaTinColliders = colliders.length;

  const landmarks = [{
    id: 'sha-tin-racecourse', name: '沙田馬場 · Sha Tin Racecourse',
    position: { x: SHA_TIN_SITE.x, y: groundOffset, z: SHA_TIN_SITE.z },
    radius: 700, height: 48, components: 9,
  }];
  stats.shaTinLandmarks = landmarks.length;
  stats.shaTinInventoryId = 'HK-B0108';

  return {
    group: root, colliders, landmarks, stats, groundOffset,
    groundHeightAt(x, z, fallback) {
      return shaTinTerrainHeightAt(x, z, Math.max(fallback ?? 0, groundOffset), groundOffset);
    },
  };
}
