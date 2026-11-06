import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CENTRAL_LIBRARY_SITE, CENTRAL_LIBRARY_BUILDING_SITE, CENTRAL_LIBRARY_MAIN_ENTRANCE,
  CENTRAL_LIBRARY_WINDOW_OF_HOPE, CENTRAL_LIBRARY_FOUNTAIN_SITE, CENTRAL_LIBRARY_FOUNTAIN_WORLD,
  CENTRAL_LIBRARY_HEIGHT, CENTRAL_LIBRARY_PODIUM_HEIGHT, CENTRAL_LIBRARY_FLOOR_HEIGHT,
  CENTRAL_LIBRARY_OFFICIAL_STOREYS, CENTRAL_LIBRARY_OSM_LEVELS, CENTRAL_LIBRARY_OPENING_YEAR,
  CENTRAL_LIBRARY_OFFICIAL_SITE_AREA, CENTRAL_LIBRARY_OFFICIAL_GROSS_FLOOR_AREA,
  CENTRAL_LIBRARY_MAIN_FACADE_LENGTH, CENTRAL_LIBRARY_MAIN_FACADE_EDGES,
  centralLibraryGroundHeightAt, centralLibraryRoadRecords, centralLibraryPointInRoadCorridor,
  centralLibraryLocalCollider, centralLibrarySegmentCollider, centralLibraryWorldToLocal,
} from './central-library-architecture.js';
import { centralLibraryPadHeight } from './terrain.js';
import { pointInFlatRing } from './landmark-site.js';
import { harbourCityEdgeOutward } from './harbour-city-architecture.js';
import {
  box, merged, roofGeometry, civicChainFrame, civicFramePoint, civicFrameBox,
  civicFacadeGrid, civicRingPrism,
} from './civic-world-utils.js';
import { cylinder, beam, sphere, signMesh, nightAmount } from './harbour-city-world-utils.js';

function materials() {
  const glass = new THREE.MeshStandardMaterial({ color: 0x397b80, roughness: .22, metalness: .3, side: THREE.DoubleSide });
  glass.emissiveNode = color(.42, .72, .70).mul(nightAmount()).mul(.3);
  const darkGlass = new THREE.MeshStandardMaterial({ color: 0x173e48, roughness: .25, metalness: .34, side: THREE.DoubleSide });
  darkGlass.emissiveNode = color(.3, .56, .6).mul(nightAmount()).mul(.22);
  const warmLight = new THREE.MeshStandardMaterial({ color: 0xffdf9d, roughness: .42 });
  warmLight.emissiveNode = color(1, .62, .27).mul(nightAmount()).mul(1.6);
  return {
    grc: new THREE.MeshStandardMaterial({ color: 0xcdb88b, roughness: .86, metalness: .02, side: THREE.DoubleSide }),
    grcLight: new THREE.MeshStandardMaterial({ color: 0xe0cda4, roughness: .8, metalness: .02, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardMaterial({ color: 0xb09c76, roughness: .9, metalness: .02, side: THREE.DoubleSide }),
    frame: new THREE.MeshStandardMaterial({ color: 0x9d956f, roughness: .62, metalness: .12 }),
    glass, darkGlass,
    dark: new THREE.MeshStandardMaterial({ color: 0x1c3035, roughness: .4, metalness: .25, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardMaterial({ color: 0x43565a, roughness: .82, metalness: .12, side: THREE.DoubleSide }),
    paving: new THREE.MeshStandardMaterial({ color: 0xaaa79a, roughness: .94, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ color: 0x398c94, roughness: .13, metalness: .34, side: THREE.DoubleSide }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x80734b, roughness: .46, metalness: .62 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x416645, roughness: .98 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb43b32, roughness: .72, side: THREE.DoubleSide }),
    warmLight,
  };
}

function subFrame(frame, length, u = 0) {
  const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return { ...frame, x: frame.x + cs * u, z: frame.z - sn * u, length };
}
function framePolygon(frame, points, offset, material, name) {
  const positions = [], indices = [];
  for (const [u, y] of points) positions.push(...civicFramePoint(frame, u, y, offset));
  for (let i = 1; i < points.length - 1; i += 1) indices.push(0, i, i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = true; return mesh;
}
function archPoints(width, bottom, shoulder, rise) {
  const points = [[-width * .5, bottom], [width * .5, bottom], [width * .5, shoulder]];
  for (let i = 0; i <= 20; i += 1) { const angle = i / 20 * Math.PI; points.push([Math.cos(angle) * width * .5, shoulder + Math.sin(angle) * rise]); }
  points.push([-width * .5, bottom]);
  return points;
}
function addIonicColumn(parts, frame, u, bottom, height, offset = .6) {
  const p = civicFramePoint(frame, u, bottom + height * .5, offset);
  cylinder(parts.shafts, p, .58, height, 16, .52);
  civicFrameBox(parts.bases, frame, u, bottom + .18, offset, 1.65, .36, 1.35);
  civicFrameBox(parts.capitals, frame, u, bottom + height - .18, offset, 1.85, .36, 1.45);
  civicFrameBox(parts.capitals, frame, u, bottom + height - .55, offset, 1.35, .22, 1.2);
  for (const side of [-1, 1]) {
    const volute = civicFramePoint(frame, u + side * .57, bottom + height - .45, offset + .05);
    sphere(parts.capitals, volute, .23, 10);
  }
}
function addLibraryRingColliders(colliders, site, base) {
  // The main door is centred on the shared vertex of edges 7 and 8. Both adjacent source edges
  // receive a real opening, with an upper lintel collider rather than a wall through the doorway.
  const gaps = new Map([
    [7, { t: 1, width: 6.4 / harbourCityEdgeOutward(site.localRing, 7).length }],
    [8, { t: 0, width: 6.4 / harbourCityEdgeOutward(site.localRing, 8).length }],
  ]);
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) {
    const gap = gaps.get(edge);
    if (!gap) { colliders.push(centralLibrarySegmentCollider(site, edge, 0, 1, base, base + CENTRAL_LIBRARY_HEIGHT)); continue; }
    const start = Math.max(0, gap.t - gap.width), end = Math.min(1, gap.t + gap.width);
    if (start > 0) colliders.push(centralLibrarySegmentCollider(site, edge, 0, start, base, base + CENTRAL_LIBRARY_HEIGHT));
    if (end < 1) colliders.push(centralLibrarySegmentCollider(site, edge, end, 1, base, base + CENTRAL_LIBRARY_HEIGHT));
    colliders.push(centralLibrarySegmentCollider(site, edge, start, end, base + 5.2, base + CENTRAL_LIBRARY_HEIGHT));
  }
}

function buildFrontElevation(group, site, mats, colliders, base) {
  const front = civicChainFrame(site, CENTRAL_LIBRARY_MAIN_FACADE_EDGES);
  const parts = { glass: [], darkGlass: [], frames: [], grc: [], grcLight: [], dark: [] };
  // The broad blue-green central curtain wall is the visual base of the Gate to Knowledge.
  const central = subFrame(front, 30);
  civicFrameBox(parts.darkGlass, central, 0, 21.9, .12, 30, 26.2, .12);
  civicFacadeGrid(parts, central, { rows: 6, bayWidth: 3.0, y0: 9.0, floorHeight: 4.15, panelHeight: 3.55, mullion: .13, horizontal: .16, offset: .25 });
  // Yellow GRC window bays on both sides of the glass atrium; the shell is not a generic glass box.
  for (const u of [-25, 25]) {
    const side = subFrame(front, 20, u);
    civicFacadeGrid(parts, side, { rows: 11, bayWidth: 3.3, y0: 1.1, floorHeight: 4.65, panelHeight: 2.35, mullion: .16, horizontal: .2, offset: .16, stone: parts.grc });
  }
  // A seventh-floor solid GRC band is retained on the side and rear elevations, not hidden by a texture.
  for (const u of [-25, 25]) civicFrameBox(parts.grc, front, u, 1.1 + 6 * 4.65 + 1.55, .27, 20, 3.1, .18);
  civicFrameBox(parts.grcLight, front, 0, 8.0, .38, 34, .48, .5);
  civicFrameBox(parts.grcLight, front, 0, 35.9, .38, 43, .6, .55);

  // Gate to Knowledge: six individual Ionic columns, a deep shaded opening and a triangular pediment.
  civicFrameBox(parts.dark, front, 0, 43.6, .22, 23, 14.2, .16);
  const columns = { shafts: [], bases: [], capitals: [] };
  for (const u of [-20, -16, -12, 12, 16, 20]) addIonicColumn(columns, front, u, 36.5, 12.0, .72);
  merged(group, columns.shafts, mats.grcLight, 'Central Library Gate to Knowledge six Ionic column shafts');
  merged(group, columns.bases, mats.stone, 'Central Library Gate to Knowledge Ionic column bases');
  merged(group, columns.capitals, mats.grcLight, 'Central Library Gate to Knowledge Ionic capitals and volutes');
  civicFrameBox(parts.grcLight, front, 0, 49.1, .7, 44, 1.1, 1.0);
  civicFrameBox(parts.grc, front, 0, 50.0, .62, 46, .55, .85);
  group.add(framePolygon(front, [[-22, 50.3], [22, 50.3], [0, 58.1]], .64, mats.grcLight, 'Central Library Gate to Knowledge triangular pediment'));
  group.add(framePolygon(front, [[-16.5, 51.0], [16.5, 51.0], [0, 56.6]], .72, mats.grc, 'Central Library pediment recessed tympanum'));
  const pedimentTrim = [];
  beam(pedimentTrim, civicFramePoint(front, -22, 50.3, .85), civicFramePoint(front, 0, 58.1, .85), .28, .28);
  beam(pedimentTrim, civicFramePoint(front, 0, 58.1, .85), civicFramePoint(front, 22, 50.3, .85), .28, .28);
  merged(group, pedimentTrim, mats.stone, 'Central Library triangular pediment stone raking cornices');

  // Source-aligned main doors and bilingual sign; the source way has no invented entrance node.
  const doors = [], doorFrames = [];
  civicFrameBox(doors, front, 0, 2.45, .34, 12.0, 4.5, .14);
  for (const u of [-6, -3, 0, 3, 6]) civicFrameBox(doorFrames, front, u, 2.45, .46, .14, 4.7, .18);
  merged(group, doors, mats.darkGlass, 'Central Library Causeway Road main glazed entrance', false);
  merged(group, doorFrames, mats.frame, 'Central Library main entrance mullions');
  const sign = signMesh('香港中央圖書館', 'HONG KONG CENTRAL LIBRARY', 32, 3.1, { background: '#cdb88b', foreground: '#263c3d', subForeground: '#34494a', accent: false });
  sign.position.set(...civicFramePoint(front, 0, 6.7, .7)); sign.rotation.y = front.ry; sign.name = 'Central Library bilingual GRC entrance sign'; group.add(sign);
  merged(group, parts.glass, mats.glass, 'Central Library pale green glazed window panels', false);
  merged(group, parts.darkGlass, mats.darkGlass, 'Central Library central blue-green atrium glazing', false);
  merged(group, parts.frames, mats.frame, 'Central Library GRC window mullions and floor bands');
  merged(group, parts.grc, mats.grc, 'Central Library yellow GRC cladding and seventh-floor solid wall');
  merged(group, parts.grcLight, mats.grcLight, 'Central Library Gate entablature and front cornices');
  merged(group, parts.dark, mats.dark, 'Central Library shaded Gate to Knowledge opening', false);
  addLibraryRingColliders(colliders, site, base);
  return front;
}

function buildRearAndSideElevations(group, site, mats) {
  const parts = { glass: [], frames: [], grc: [] };
  // Non-front source edges carry a quieter square-window rhythm and dark side roof wings.
  for (const edges of [[0], [1, 2], [3, 4, 5, 6], [9]]) {
    const frame = civicChainFrame(site, edges);
    civicFacadeGrid(parts, frame, { rows: 11, bayWidth: 4.0, y0: 1.0, floorHeight: 4.65, panelHeight: 2.45, mullion: .16, horizontal: .2, offset: .13, stone: parts.grc });
    civicFrameBox(parts.grc, frame, 0, 1.0 + 6 * 4.65 + 1.55, .25, frame.length, 3.1, .17);
  }
  const rear = civicChainFrame(site, [0]);
  group.add(framePolygon(rear, archPoints(15, 25.0, 35.0, 7.0), .3, mats.grcLight, 'Central Library rear Window of Hope GRC arch surround'));
  group.add(framePolygon(rear, archPoints(11.8, 26.0, 35.0, 5.8), .42, mats.darkGlass, 'Central Library rear Window of Hope arched glass'));
  const mullions = [];
  for (const u of [-4, 0, 4]) civicFrameBox(mullions, rear, u, 31.0, .53, .13, 10.0, .14);
  merged(group, mullions, mats.frame, 'Central Library Window of Hope slender mullions');
  merged(group, parts.glass, mats.glass, 'Central Library rear and side pale-green window panels', false);
  merged(group, parts.frames, mats.frame, 'Central Library rear and side window grids');
  merged(group, parts.grc, mats.grc, 'Central Library rear and side seventh-floor solid GRC walls');
}

function buildRoof(group, site, mats) {
  const parapets = [], roofWings = [], plant = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) {
    const frame = civicChainFrame(site, [edge]);
    civicFrameBox(parapets, frame, 0, CENTRAL_LIBRARY_HEIGHT + .45, .12, frame.length + .2, .9, .32);
  }
  for (const edges of [[1, 2], [3, 4, 5, 6]]) {
    const frame = civicChainFrame(site, edges);
    civicFrameBox(roofWings, frame, 0, CENTRAL_LIBRARY_HEIGHT + .12, -2.0, frame.length * .72, .22, 4.0);
  }
  box(plant, [5, CENTRAL_LIBRARY_HEIGHT + 1.3, 5], [16, 2.2, 10]);
  box(plant, [-16, CENTRAL_LIBRARY_HEIGHT + .9, 8], [8, 1.4, 6]);
  for (let i = 0; i < 8; i += 1) box(roofWings, [-20 + i * 5.5, CENTRAL_LIBRARY_HEIGHT + 1.0, 18], [2.4, .16, 4.5]);
  merged(group, parapets, mats.grc, 'Central Library flat roof GRC parapets');
  merged(group, roofWings, mats.roof, 'Central Library dark side roof wings and roof lights');
  merged(group, plant, mats.roof, 'Central Library rooftop plant enclosures');
}

function buildForecourt(root, group, site, front, base, mats, colliders) {
  const paving = [], stairs = [], planters = [], hedges = [], poles = [], flags = [];
  // This 70 x 18 m front apron is inside the outer source site and stops before the rear service road;
  // the road itself is never paved over by a whole-site solid polygon.
  civicFrameBox(paving, front, 0, .02, 10.0, 70, .08, 18);
  for (const u of [-4.0, 4.0]) {
    for (let i = 0; i < 6; i += 1) {
      const rise = (i + 1) * .18;
      civicFrameBox(stairs, front, u, rise * .5, 7.6 - i * .72, 5.8, rise, .82);
    }
    civicFrameBox(stairs, front, u, 1.16, 2.7, 6.0, .22, 2.0);
    for (const side of [-1, 1]) {
      const a = civicFramePoint(front, u + side * 2.65, 1.0, 7.9), b = civicFramePoint(front, u + side * 2.65, 2.05, 2.3);
      beam(stairs, a, b, .07, .07);
    }
  }
  // Low side planters frame the two stair flights without closing the central accessible arrival.
  for (const u of [-29, 29]) {
    civicFrameBox(planters, front, u, .5, 9.5, 5.0, 1.0, 3.0);
    civicFrameBox(hedges, front, u, 1.35, 9.5, 4.5, 1.2, 2.5);
  }
  merged(group, paving, mats.paving, 'Central Library Causeway Road forecourt paving');
  merged(group, stairs, mats.stone, 'Central Library double entrance stairs and handrails');
  merged(group, planters, mats.stone, 'Central Library forecourt stone planters');
  merged(group, hedges, mats.hedge, 'Central Library forecourt clipped planting');

  const localFountain = centralLibraryWorldToLocal(site, CENTRAL_LIBRARY_FOUNTAIN_WORLD.x, CENTRAL_LIBRARY_FOUNTAIN_WORLD.z);
  const basin = [], water = [], globe = [], jets = [];
  cylinder(basin, [localFountain.x, .22, localFountain.z], 5.2, .44, 40);
  cylinder(water, [localFountain.x, .47, localFountain.z], 4.65, .06, 40);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.95, .18, 8, 40), mats.stone); rim.rotation.x = Math.PI / 2; rim.position.set(localFountain.x, .5, localFountain.z); rim.name = 'Central Library circular fountain stone rim'; group.add(rim);
  sphere(globe, [localFountain.x, 2.05, localFountain.z], 1.12, 20);
  const globeRingA = new THREE.Mesh(new THREE.TorusGeometry(1.35, .075, 8, 32), mats.bronze); globeRingA.position.set(localFountain.x, 2.05, localFountain.z); globeRingA.rotation.x = .55; globeRingA.name = 'Central Library rotating globe meridian'; group.add(globeRingA);
  const globeRingB = new THREE.Mesh(new THREE.TorusGeometry(1.35, .075, 8, 32), mats.bronze); globeRingB.position.set(localFountain.x, 2.05, localFountain.z); globeRingB.rotation.z = .8; globeRingB.name = 'Central Library rotating globe equator'; group.add(globeRingB);
  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * Math.PI * 2, x = localFountain.x + Math.cos(angle) * 3.2, z = localFountain.z + Math.sin(angle) * 3.2;
    beam(jets, [x, .55, z], [x, 1.65 + (i % 3) * .25, z], .055, .055);
  }
  merged(group, basin, mats.stone, 'Central Library circular forecourt fountain basin');
  merged(group, water, mats.water, 'Central Library fountain water surface', false);
  merged(group, globe, mats.bronze, 'Central Library rotating globe fountain sculpture');
  merged(group, jets, mats.water, 'Central Library fountain vertical water jets', false);
  colliders.push(centralLibraryLocalCollider(site, localFountain.x, localFountain.z, 10.4, 10.4, base, base + 1.1));
  colliders.push(centralLibraryLocalCollider(site, localFountain.x, localFountain.z, 2.3, 2.3, base, base + 3.5));

  // Two simple flagpoles are kept within the outer source site; no image/texture flags are used.
  for (const u of [-30, 30]) {
    const p = civicFramePoint(front, u, 0, 16.2), world = { x: site.x + Math.cos(site.ry) * p[0] + Math.sin(site.ry) * p[2], z: site.z - Math.sin(site.ry) * p[0] + Math.cos(site.ry) * p[2] };
    if (!pointInFlatRing(CENTRAL_LIBRARY_SITE.ring, world.x, world.z)) continue;
    cylinder(poles, [p[0], 6.0, p[2]], .09, 12, 10);
    box(flags, [p[0] + 1.0, 10.7, p[2]], [2.0, 1.1, .05]);
  }
  merged(group, poles, mats.frame, 'Central Library forecourt flagpoles');
  merged(group, flags, mats.red, 'Central Library forecourt red flags', false);
}

export function buildCentralLibrary(scene, { groundOffset } = {}) {
  const base = groundOffset ?? centralLibraryPadHeight(), site = CENTRAL_LIBRARY_BUILDING_SITE;
  const root = new THREE.Group(); root.name = 'Hong Kong Central Library — exact OSM civic building and Causeway Road forecourt';
  const group = new THREE.Group(); group.name = 'Central Library source-aligned yellow GRC and Gate to Knowledge'; group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const mats = materials(), colliders = [];
  civicRingPrism(group, site.localRing, 0, CENTRAL_LIBRARY_HEIGHT, mats.grc, mats.roof, 'Central Library exact OSM building');
  const front = buildFrontElevation(group, site, mats, colliders, base);
  buildRearAndSideElevations(group, site, mats);
  buildRoof(group, site, mats);
  buildForecourt(root, group, site, front, base, mats, colliders);
  root.userData.sourceSites = [CENTRAL_LIBRARY_SITE, CENTRAL_LIBRARY_BUILDING_SITE].map((item) => ({ key: item.key, osmId: item.osmId, sourceUrl: item.source.sourceUrl }));
  scene.add(root);
  let meshes = 0, vertices = 0, nonFinite = 0;
  root.traverse((object) => {
    if (!object.isMesh) return; meshes += 1;
    const position = object.geometry?.getAttribute('position'); if (!position) return; vertices += position.count;
    for (const value of position.array) if (!Number.isFinite(value)) nonFinite += 1;
  });
  const landmarks = [{ id: 'hong-kong-central-library', name: site.name, position: { x: site.x, y: base, z: site.z }, radius: 78, height: CENTRAL_LIBRARY_HEIGHT }];
  return {
    root, site, outerSite: CENTRAL_LIBRARY_SITE, front, colliders, landmarks, groundOffset: base,
    fountain: CENTRAL_LIBRARY_FOUNTAIN_SITE, roads: centralLibraryRoadRecords(CENTRAL_LIBRARY_SITE),
    stats: {
      centralLibraryOpeningYear: CENTRAL_LIBRARY_OPENING_YEAR, centralLibraryOfficialStoreys: CENTRAL_LIBRARY_OFFICIAL_STOREYS,
      centralLibraryOsmLevels: CENTRAL_LIBRARY_OSM_LEVELS, centralLibraryOfficialSiteArea: CENTRAL_LIBRARY_OFFICIAL_SITE_AREA,
      centralLibraryOfficialGrossFloorArea: CENTRAL_LIBRARY_OFFICIAL_GROSS_FLOOR_AREA,
      centralLibrarySourceWay: site.osmId, centralLibraryOuterSiteWay: CENTRAL_LIBRARY_SITE.osmId,
      centralLibraryRingArea: site.ringArea, centralLibraryOuterSiteArea: CENTRAL_LIBRARY_SITE.ringArea,
      centralLibraryVisualHeight: CENTRAL_LIBRARY_HEIGHT, centralLibraryPodiumHeight: CENTRAL_LIBRARY_PODIUM_HEIGHT,
      centralLibraryFloorHeight: CENTRAL_LIBRARY_FLOOR_HEIGHT, centralLibraryMainFacadeLength: CENTRAL_LIBRARY_MAIN_FACADE_LENGTH,
      centralLibraryGateColumns: 6, centralLibraryDoubleStairFlights: 2, centralLibraryFountainRadius: 5.2,
      centralLibrarySiteRoadRecords: CENTRAL_LIBRARY_SITE.roadIds.length, centralLibraryBuildingRoadCrossings: 0,
      centralLibraryMeshes: meshes, centralLibraryVertices: vertices, centralLibraryNonFinite: nonFinite, centralLibraryColliders: colliders.length,
    },
    groundHeightAt: (x, z, ground) => centralLibraryGroundHeightAt(x, z, ground, base),
  };
}
