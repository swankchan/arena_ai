import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CITY_HALL_SITE, CITY_HALL_HIGH_SITE, CITY_HALL_LOW_SITE, CITY_HALL_ANNEX_SITE,
  CITY_HALL_MEMORIAL_GARDEN_SITE, CITY_HALL_SHRINE_SITE, CITY_HALL_SHRINE_WORLD,
  CITY_HALL_HIGH_HEIGHT, CITY_HALL_LOW_HEIGHT, CITY_HALL_ANNEX_HEIGHT,
  CITY_HALL_HIGH_MAIN_ENTRANCE, CITY_HALL_HIGH_SECOND_ENTRANCE, CITY_HALL_LOW_MAIN_ENTRANCE, CITY_HALL_LOW_SECOND_ENTRANCE,
  CITY_HALL_HIGH_GARDEN_LINK, CITY_HALL_LOW_GARDEN_LINK,
  CITY_HALL_MEMORIAL_SHRINE_SIDES, CITY_HALL_MEMORIAL_SHRINE_HEIGHT,
  CITY_HALL_OPENING_DATE, CITY_HALL_DECLARED_MONUMENT_YEAR,
  cityHallGroundHeightAt, cityHallRoadRecords, cityHallPointInRoadCorridor,
  cityHallRingColliders, cityHallSegmentCollider, cityHallLocalCollider, cityHallWorldToLocal,
} from './city-hall-architecture.js';
import { cityHallPadHeight } from './terrain.js';
import { pointInFlatRing } from './landmark-site.js';
import { harbourCityEdgeOutward } from './harbour-city-architecture.js';
import {
  box, merged, roofGeometry, civicChainFrame, civicFramePoint, civicFrameBox,
  civicFacadeGrid, civicRingPrism,
} from './civic-world-utils.js';
import { cylinder, beam, sphere, signMesh, nightAmount } from './harbour-city-world-utils.js';

function materials() {
  const glass = new THREE.MeshStandardMaterial({ color: 0x21474d, roughness: .24, metalness: .32, side: THREE.DoubleSide });
  glass.emissiveNode = color(.48, .72, .68).mul(nightAmount()).mul(.34);
  const lowGlass = new THREE.MeshStandardMaterial({ color: 0x3c7778, roughness: .27, metalness: .25, side: THREE.DoubleSide });
  lowGlass.emissiveNode = color(.57, .78, .69).mul(nightAmount()).mul(.27);
  const warmLight = new THREE.MeshStandardMaterial({ color: 0xffe0a4, roughness: .45 });
  warmLight.emissiveNode = color(1, .62, .28).mul(nightAmount()).mul(1.7);
  return {
    white: new THREE.MeshStandardMaterial({ color: 0xe3e2da, roughness: .76, metalness: .03, side: THREE.DoubleSide }),
    frame: new THREE.MeshStandardMaterial({ color: 0xc7cbc4, roughness: .56, metalness: .18 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xaaa99e, roughness: .9, metalness: .02, side: THREE.DoubleSide }),
    granite: new THREE.MeshStandardMaterial({ color: 0x878c87, roughness: .92, metalness: .02 }),
    glass, lowGlass,
    dark: new THREE.MeshStandardMaterial({ color: 0x1d3031, roughness: .42, metalness: .26, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardMaterial({ color: 0x777e7a, roughness: .9, metalness: .04, side: THREE.DoubleSide }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x504c3d, roughness: .54, metalness: .62 }),
    paving: new THREE.MeshStandardMaterial({ color: 0x9b9b91, roughness: .95 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x527449, roughness: .98, side: THREE.DoubleSide }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x315c3c, roughness: .98 }),
    water: new THREE.MeshStandardMaterial({ color: 0x477e80, roughness: .16, metalness: .3 }),
    warmLight,
  };
}

function addRingCollidersWithEntrance(colliders, site, base, height, gapEdge, gapT = 0, gapWidth = .22, additionalGaps = []) {
  const gaps = [{ edge: gapEdge, t: gapT, width: gapWidth }, ...additionalGaps];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) {
    const openings = gaps.filter((gap) => gap.edge === edge).map((gap) => ({
      start: Math.max(0, gap.t - gap.width), end: Math.min(1, gap.t + gap.width)
    })).sort((a, b) => a.start - b.start);
    if (!openings.length) { colliders.push(cityHallSegmentCollider(site, edge, 0, 1, base, base + height)); continue; }
    let cursor = 0;
    for (const opening of openings) {
      if (opening.start > cursor) colliders.push(cityHallSegmentCollider(site, edge, cursor, opening.start, base, base + height));
      if (opening.end > opening.start) colliders.push(cityHallSegmentCollider(site, edge, opening.start, opening.end, base + 4.4, base + height));
      cursor = Math.max(cursor, opening.end);
    }
    if (cursor < 1) colliders.push(cityHallSegmentCollider(site, edge, cursor, 1, base, base + height));
  }
}
function chainUFromLocal(frame, x, z) {
  const dx = x - frame.x, dz = z - frame.z, cs = Math.cos(frame.ry), sn = Math.sin(frame.ry);
  return dx * cs - dz * sn;
}
function addHighEntrance(group, site, base, mats, colliders) {
  const frame = civicChainFrame(site, [10, 11]);
  // Use the actual entrance=yes vertex, rather than a visually convenient edge midpoint.
  const u = chainUFromLocal(frame, CITY_HALL_HIGH_MAIN_ENTRANCE.localX, CITY_HALL_HIGH_MAIN_ENTRANCE.localZ);
  const doors = [], frames = [], canopy = [], lights = [];
  civicFrameBox(doors, frame, u, 2.0, .16, 4.8, 3.7, .12);
  for (const du of [-2.5, 0, 2.5]) civicFrameBox(frames, frame, u + du, 2.0, .23, .11, 3.9, .15);
  civicFrameBox(canopy, frame, u, 4.35, 1.35, 7.2, .28, 3.0);
  civicFrameBox(canopy, frame, u, 4.03, 2.75, 7.2, .58, .22);
  for (const du of [-2.7, 2.7]) {
    civicFrameBox(canopy, frame, u + du, 2.12, 2.25, .26, 4.24, .26);
    const p = civicFramePoint(frame, u + du, 0, 2.25);
    // The source-aligned columns are outside the door opening; their colliders use the same local frame.
    colliders.push(cityHallLocalCollider(site, p[0], p[2], .42, .42, base, base + 4.3, site.ry + frame.ry));
  }
  for (const du of [-2, 0, 2]) civicFrameBox(lights, frame, u + du, 4.15, 1.25, .22, .06, .22);
  merged(group, doors, mats.dark, 'City Hall High Block real entrance-node glazed doors', false);
  merged(group, frames, mats.frame, 'City Hall High Block entrance mullions');
  merged(group, canopy, mats.white, 'City Hall High Block covered entrance canopy and columns');
  merged(group, lights, mats.warmLight, 'City Hall High Block warm entrance downlights', false);
  const sign = signMesh('香港大會堂', 'HONG KONG CITY HALL · HIGH BLOCK', 8.8, 1.18, { background: '#e3e2da', foreground: '#263b3b', accent: false });
  const p = civicFramePoint(frame, u, 4.02, 2.89); sign.position.set(...p); sign.rotation.y = frame.ry; group.add(sign);

  // High Block has a second entrance=yes vertex on the garden-side return.  Keep it distinct
  // from the main Edinburgh Square canopy instead of silently treating the two OSM nodes as one.
  const secondFrame = civicChainFrame(site, [2, 3]);
  const secondU = chainUFromLocal(secondFrame, CITY_HALL_HIGH_SECOND_ENTRANCE.localX, CITY_HALL_HIGH_SECOND_ENTRANCE.localZ);
  const secondDoors = [], secondFrames = [], secondCanopy = [];
  civicFrameBox(secondDoors, secondFrame, secondU, 1.85, .16, 3.2, 3.35, .12);
  for (const du of [-1.65, 0, 1.65]) civicFrameBox(secondFrames, secondFrame, secondU + du, 1.85, .23, .1, 3.55, .14);
  civicFrameBox(secondCanopy, secondFrame, secondU, 3.9, .9, 4.5, .24, 2.0);
  merged(group, secondDoors, mats.dark, 'City Hall High Block second OSM entrance-node glazed door', false);
  merged(group, secondFrames, mats.frame, 'City Hall High Block second entrance mullions');
  merged(group, secondCanopy, mats.white, 'City Hall High Block garden-side entrance canopy');
}
function addExternalStair(group, site, mats) {
  const frame = civicChainFrame(site, [10, 11]), steps = [], rails = [];
  const u = frame.length * .5 - 5.2;
  for (let i = 0; i < 12; i += 1) {
    const rise = (i + 1) * .18;
    civicFrameBox(steps, frame, u, rise * .5, 1.1 + i * .42, 3.6, rise, .48);
  }
  civicFrameBox(steps, frame, u, 2.2, 6.2, 4.1, .22, 2.0);
  for (const side of [-1, 1]) {
    const a = civicFramePoint(frame, u + side * 1.65, .95, 1.0), b = civicFramePoint(frame, u + side * 1.65, 3.1, 6.0);
    beam(rails, a, b, .065, .065);
    for (let i = 0; i <= 4; i += 1) {
      const t = i / 4, p = civicFramePoint(frame, u + side * 1.65, .9 + t * 2.1, 1 + t * 5);
      beam(rails, [p[0], p[1] - .9, p[2]], p, .05, .05);
    }
  }
  merged(group, steps, mats.white, 'City Hall High Block external stair and landing');
  merged(group, rails, mats.frame, 'City Hall High Block external-stair stainless handrails');
}
function addCoveredLinkDoor(group, site, link, mats, label) {
  const frame = civicChainFrame(site, [link.sourceEdge]);
  const u = chainUFromLocal(frame, link.localX, link.localZ), doors = [], frames = [], canopy = [];
  civicFrameBox(doors, frame, u, 2.0, .17, 3.6, 3.7, .12);
  for (const du of [-1.85, 0, 1.85]) civicFrameBox(frames, frame, u + du, 2.0, .24, .11, 3.9, .15);
  civicFrameBox(canopy, frame, u, 4.35, 1.0, 4.8, .26, 2.2);
  merged(group, doors, mats.dark, `${label} covered-link glazed threshold`, false);
  merged(group, frames, mats.frame, `${label} covered-link door mullions`);
  merged(group, canopy, mats.white, `${label} covered-link canopy`);
}

function addHighBlockRefinement(group, site, mats) {
  // HK-B0082: the High Block is a gridded modernist concrete frame, not a plain glass
  // curtain wall.  These deeper fins and recessed shadow joints follow the two photographed
  // long elevations and stay subordinate to the exact OSM shell and its entrance openings.
  const fins = [], shadowJoints = [], coping = [];
  let finCount = 0, jointCount = 0;
  for (const edges of [[1, 2, 3, 4, 5, 6], [10, 11]]) {
    const frame = civicChainFrame(site, edges), bays = Math.max(1, Math.round(frame.length / 3.6));
    for (let b = 0; b <= bays; b++) {
      const u = -frame.length * .5 + b / bays * frame.length;
      civicFrameBox(fins, frame, u, 29.55, .18, .17, 48.5, .24); finCount++;
    }
    for (let row = 0; row < 12; row++) {
      civicFrameBox(shadowJoints, frame, 0, 5.02 + row * 4.42, .16, frame.length - .35, .075, .09); jointCount++;
    }
  }
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const frame = civicChainFrame(site, [edge]);
    civicFrameBox(coping, frame, 0, CITY_HALL_HIGH_HEIGHT + .58, .12, frame.length + .18, .16, .42);
  }
  merged(group, fins, mats.white, 'City Hall High Block HK-B0082 deep modular concrete facade fins');
  merged(group, shadowJoints, mats.dark, 'City Hall High Block HK-B0082 recessed floor shadow joints', false);
  merged(group, coping, mats.frame, 'City Hall High Block HK-B0082 continuous roof coping');
  return { finCount, jointCount, copingEdges: site.localRing.length / 2 - 1 };
}

function buildHighBlock(root, base, mats, colliders) {
  const site = CITY_HALL_HIGH_SITE, group = new THREE.Group(); group.name = 'Hong Kong City Hall High Block — OSM way 25608273';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  civicRingPrism(group, site.localRing, 0, CITY_HALL_HIGH_HEIGHT, mats.white, mats.roof, 'City Hall High Block');
  const parts = { glass: [], frames: [], stone: [] };
  // The two long, source-aligned elevations carry the characteristic white modular grid.
  for (const edges of [[1, 2, 3, 4, 5, 6], [10, 11]]) {
    const frame = civicChainFrame(site, edges);
    civicFacadeGrid(parts, frame, { rows: 11, bayWidth: 3.6, y0: 5.15, floorHeight: 4.42, panelHeight: 3.35, mullion: .22, horizontal: .24, margin: .25 });
    civicFacadeGrid(parts, frame, { rows: 1, bayWidth: 3.6, y0: .45, floorHeight: 4.15, panelHeight: 3.45, mullion: .18, horizontal: .2, margin: .25 });
    civicFrameBox(parts.frames, frame, 0, 5.0, .28, frame.length + .4, .38, .45);
    civicFrameBox(parts.frames, frame, 0, 54.1, .26, frame.length + .35, .42, .4);
  }
  // Short returns remain predominantly blank plaster, with narrow stair / service slots rather than
  // turning every elevation into the same generic glass box.
  for (const edge of [0, 7, 8, 9]) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length;
    for (let row = 0; row < 10; row += 1) {
      const y = 8 + row * 4.35;
      if (length > 2) {
        const frame = civicChainFrame(site, [edge]);
        civicFrameBox(parts.glass, frame, 0, y, .1, Math.min(.72, length - .3), 2.15, .1);
        civicFrameBox(parts.frames, frame, 0, y + 1.18, .15, Math.min(.95, length), .12, .14);
      }
    }
  }
  merged(group, parts.glass, mats.glass, 'City Hall High Block dark recessed modular window panes', false);
  merged(group, parts.frames, mats.white, 'City Hall High Block white concrete window-grid fins and floor bands');
  merged(group, parts.stone, mats.stone, 'City Hall High Block stone base panels');
  addHighEntrance(group, site, base, mats, colliders);
  addCoveredLinkDoor(group, site, CITY_HALL_HIGH_GARDEN_LINK, mats, 'City Hall High Block');
  addExternalStair(group, site, mats);
  const roofParts = [], roofDark = [];
  box(roofParts, [0, CITY_HALL_HIGH_HEIGHT + .65, 0], [12, 1.3, 7]);
  for (let i = 0; i < 5; i += 1) box(roofDark, [-4.5 + i * 2.2, CITY_HALL_HIGH_HEIGHT + 1.36, 0], [1.1, .12, 3.8]);
  for (const edge of [0, 7, 10]) {
    const frame = civicChainFrame(site, [edge]); civicFrameBox(roofParts, frame, 0, CITY_HALL_HIGH_HEIGHT + .35, .1, frame.length, .7, .18);
  }
  merged(group, roofParts, mats.white, 'City Hall High Block roof parapet and lift overrun');
  merged(group, roofDark, mats.dark, 'City Hall High Block roof vents', false);
  const refinement = addHighBlockRefinement(group, site, mats);
  addRingCollidersWithEntrance(colliders, site, base, CITY_HALL_HIGH_HEIGHT, 11, 0, .18, [
    { edge: 10, t: 1, width: .18 },
    { edge: 3, t: 0, width: 1.7 / harbourCityEdgeOutward(site.localRing, 3).length },
    { edge: 2, t: 1, width: 1.7 / harbourCityEdgeOutward(site.localRing, 2).length },
    // Node 11774406411 is only 0.496 m from the next source vertex; continue the same
    // 3.2 m clear doorway onto edge 4 rather than leaving a hidden wall beside the door.
    { edge: 4, t: 0, width: Math.max(0, 1.7 - harbourCityEdgeOutward(site.localRing, 3).length) / harbourCityEdgeOutward(site.localRing, 4).length },
    { edge: 6, t: CITY_HALL_HIGH_GARDEN_LINK.t, width: 2 / CITY_HALL_HIGH_GARDEN_LINK.length }
  ]);
  return { root: group, site, entrance: CITY_HALL_HIGH_MAIN_ENTRANCE, refinement };
}

function diamondPanel(frame, u, y, offset, width, height, material, name) {
  const shape = new THREE.Shape(); shape.moveTo(0, height * .5); shape.lineTo(width * .5, 0); shape.lineTo(0, -height * .5); shape.lineTo(-width * .5, 0); shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape); geometry.rotateY(frame.ry); const p = civicFramePoint(frame, u, y, offset); geometry.translate(...p);
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = false; return mesh;
}
function addLowEntrance(group, site, base, mats, colliders) {
  const frame = civicChainFrame(site, [3, 4]);
  // The door and canopy are centred on OSM entrance node 11774418675, not displaced along the facade.
  const u = chainUFromLocal(frame, CITY_HALL_LOW_MAIN_ENTRANCE.localX, CITY_HALL_LOW_MAIN_ENTRANCE.localZ);
  const doors = [], frames = [], canopy = [], lights = [];
  civicFrameBox(doors, frame, u, 2.0, .16, 5.8, 3.6, .12);
  for (const du of [-2.9, 0, 2.9]) civicFrameBox(frames, frame, u + du, 2.0, .23, .12, 3.8, .16);
  civicFrameBox(canopy, frame, u, 4.35, 1.6, 9.2, .3, 3.6);
  civicFrameBox(canopy, frame, u, 4.0, 3.25, 9.2, .55, .24);
  for (const du of [-3.5, 3.5]) {
    civicFrameBox(canopy, frame, u + du, 2.1, 2.7, .3, 4.2, .3);
    const p = civicFramePoint(frame, u + du, 0, 2.7);
    colliders.push(cityHallLocalCollider(site, p[0], p[2], .46, .46, base, base + 4.3, site.ry + frame.ry));
  }
  for (const du of [-3, -1, 1, 3]) civicFrameBox(lights, frame, u + du, 4.14, 1.5, .24, .06, .24);
  merged(group, doors, mats.lowGlass, 'City Hall Low Block source-node glass entrance', false);
  merged(group, frames, mats.frame, 'City Hall Low Block entrance door mullions');
  merged(group, canopy, mats.white, 'City Hall Low Block covered garden entrance canopy');
  merged(group, lights, mats.warmLight, 'City Hall Low Block entrance downlights', false);
  const sign = signMesh('香港大會堂', 'HONG KONG CITY HALL · LOW BLOCK', 10.2, 1.2, { background: '#aaa99e', foreground: '#f1eee2', subForeground: '#e4e1d5', accent: false });
  const p = civicFramePoint(frame, u, 4.0, 3.39); sign.position.set(...p); sign.rotation.y = frame.ry; group.add(sign);

  // The second source entrance is a smaller Memorial Garden-side door, not a duplicate of the main canopy.
  const secondFrame = civicChainFrame(site, [1, 2]);
  const secondU = chainUFromLocal(secondFrame, CITY_HALL_LOW_SECOND_ENTRANCE.localX, CITY_HALL_LOW_SECOND_ENTRANCE.localZ);
  const secondDoors = [], secondFrames = [], secondCanopy = [];
  civicFrameBox(secondDoors, secondFrame, secondU, 1.85, .15, 3.2, 3.35, .12);
  for (const du of [-1.65, 0, 1.65]) civicFrameBox(secondFrames, secondFrame, secondU + du, 1.85, .22, .1, 3.55, .14);
  civicFrameBox(secondCanopy, secondFrame, secondU, 3.9, 1.0, 4.5, .24, 2.2);
  merged(group, secondDoors, mats.lowGlass, 'City Hall Low Block second OSM entrance-node glazed door', false);
  merged(group, secondFrames, mats.frame, 'City Hall Low Block second entrance mullions');
  merged(group, secondCanopy, mats.white, 'City Hall Low Block Memorial Garden-side entrance canopy');
}
function buildLowBlock(root, base, mats, colliders) {
  const site = CITY_HALL_LOW_SITE, group = new THREE.Group(); group.name = 'Hong Kong City Hall Low Block — exact L-shaped OSM way 101959153';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  civicRingPrism(group, site.localRing, 0, CITY_HALL_LOW_HEIGHT, mats.stone, mats.roof, 'City Hall Low Block');
  const parts = { glass: [], frames: [], stone: [] };
  // Long horizontal glazing follows the actual L-shaped edges; the auditorium return stays stone.
  for (const edges of [[3, 4], [6], [16]]) {
    const frame = civicChainFrame(site, edges);
    civicFacadeGrid(parts, frame, { rows: 3, bayWidth: 4.0, y0: 2.1, floorHeight: 6.1, panelHeight: 4.65, mullion: .16, horizontal: .22, margin: .28 });
    civicFrameBox(parts.frames, frame, 0, 1.55, .24, frame.length + .35, .34, .42);
    civicFrameBox(parts.frames, frame, 0, 20.75, .28, frame.length + .4, .38, .45);
  }
  // The verified elevations are not interchangeable: edge 8 has a blank auditorium centre with
  // glazed side bays, while the west-facing edge 17 is a granite / diamond-window elevation.
  // The exact source shell already supplies the stone wall; narrow joints and individual openings
  // below articulate it instead of hiding the whole ring behind generic solid panels.
  for (const edge of [8, 17]) {
    const frame = civicChainFrame(site, [edge]);
    for (let row = 0; row < 3; row += 1) {
      const y = 2.1 + row * 6.1 + 3.05;
      civicFrameBox(parts.frames, frame, 0, 2.1 + row * 6.1, .18, frame.length, .2, .18);
      for (let u = -frame.length * .5 + 2.1; u < frame.length * .5 - 1; u += 4.2) {
        if (edge === 8 && Math.abs(u) > frame.length * .22) civicFrameBox(parts.glass, frame, u, y, .14, 3.55, 4.65, .1);
        if (edge === 17 && (row + Math.round(u)) % 2 === 0) group.add(diamondPanel(frame, u, y, .18, 1.15, 1.15, mats.dark, 'City Hall Low Block west-facing diamond window'));
      }
    }
    for (let u = -frame.length * .5; u <= frame.length * .5; u += 4.2) {
      civicFrameBox(parts.frames, frame, u, 11.0, .2, .13, 20.0, .16);
      civicFrameBox(parts.stone, frame, u + .16, 11.0, .1, .09, 20.0, .12);
    }
  }
  merged(group, parts.glass, mats.lowGlass, 'City Hall Low Block horizontal green-blue glass bands', false);
  merged(group, parts.frames, mats.frame, 'City Hall Low Block horizontal curtain-wall mullions');
  merged(group, parts.stone, mats.granite, 'City Hall Low Block blank granite auditorium wall panels');
  addLowEntrance(group, site, base, mats, colliders);
  addCoveredLinkDoor(group, site, CITY_HALL_LOW_GARDEN_LINK, mats, 'City Hall Low Block');
  const roofParts = [], skylights = [];
  for (const edges of [[3, 4], [6], [16]]) {
    const frame = civicChainFrame(site, edges); civicFrameBox(roofParts, frame, 0, CITY_HALL_LOW_HEIGHT + .25, .2, frame.length + .7, .5, .6);
    for (let u = -frame.length * .35; u <= frame.length * .35; u += 5.5) civicFrameBox(skylights, frame, u, CITY_HALL_LOW_HEIGHT + .53, -2.0, 2.4, .08, 1.0);
  }
  box(roofParts, [12, CITY_HALL_LOW_HEIGHT + .65, 5], [12, 1.1, 8]);
  merged(group, roofParts, mats.white, 'City Hall Low Block flat roof overhang parapets and plant');
  merged(group, skylights, mats.dark, 'City Hall Low Block narrow roof skylights', false);
  addRingCollidersWithEntrance(colliders, site, base, CITY_HALL_LOW_HEIGHT, 4, 0, .15, [
    { edge: 3, t: 1, width: .15 },
    { edge: 2, t: 0, width: 1.7 / harbourCityEdgeOutward(site.localRing, 2).length },
    { edge: 1, t: 1, width: 1.7 / harbourCityEdgeOutward(site.localRing, 1).length },
    { edge: 17, t: CITY_HALL_LOW_GARDEN_LINK.t, width: 2 / CITY_HALL_LOW_GARDEN_LINK.length }
  ]);
  return { root: group, site, entrance: CITY_HALL_LOW_MAIN_ENTRANCE };
}

function worldBox(parts, x, y, z, w, h, d, ry = 0) { box(parts, [x, y, z], [w, h, d], ry); }
function worldSegment(parts, a, b, y, height, width, depth = width) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz); if (length < .01) return;
  worldBox(parts, (a[0] + b[0]) * .5, y, (a[1] + b[1]) * .5, length, height, depth, Math.atan2(-dz, dx));
}
function worldPointClear(x, z, margin = .2, allowBuildingEndpoint = false) {
  if (cityHallPointInRoadCorridor(CITY_HALL_SITE, x, z, margin)) return false;
  // A covered link may meet a source wall at its endpoint, but its open-air samples and columns
  // must never be rejected/accepted indiscriminately inside a building footprint.
  if (!allowBuildingEndpoint) for (const site of [CITY_HALL_HIGH_SITE, CITY_HALL_LOW_SITE, CITY_HALL_ANNEX_SITE]) if (pointInFlatRing(site.ring, x, z)) return false;
  return true;
}
function buildCoveredWalkway(root, base, mats, colliders) {
  // Endpoints are on the facing source walls, with matching door/collider thresholds in both blocks.
  // This is a real High–Low link, not a garden path that merely stops near the annex and Low Block.
  const high = CITY_HALL_HIGH_GARDEN_LINK, low = CITY_HALL_LOW_GARDEN_LINK;
  const route = [[high.x, high.z], [(high.x + low.x) * .5, (high.z + low.z) * .5], [low.x, low.z]];
  const roofs = [], columns = [], rails = [];
  let length = 0, openSegments = 0;
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1], b = route[i], dx = b[0] - a[0], dz = b[1] - a[1], segmentLength = Math.hypot(dx, dz);
    const samples = Math.max(1, Math.ceil(segmentLength / .5)); let clear = true;
    for (let n = 0; n <= samples; n += 1) {
      const t = n / samples, endpoint = n === 0 || n === samples;
      if (!worldPointClear(a[0] + dx * t, a[1] + dz * t, .25, endpoint)) { clear = false; break; }
    }
    if (!clear) continue;
    length += segmentLength; openSegments += 1;
    worldSegment(roofs, a, b, base + 4.35, .26, 3.0, 3.0);
    const count = Math.max(1, Math.ceil(segmentLength / 5));
    for (let n = 0; n <= count; n += 1) {
      const t = n / count, x = a[0] + dx * t, z = a[1] + dz * t;
      if (n === 0 || n === count || !worldPointClear(x, z, .1)) continue;
      worldBox(columns, x, base + 2.15, z, .24, 4.3, .24);
      colliders.push(cityHallLocalCollider(CITY_HALL_SITE, cityHallWorldToLocal(CITY_HALL_SITE, x, z).x, cityHallWorldToLocal(CITY_HALL_SITE, x, z).z, .38, .38, base, base + 4.35));
    }
    worldSegment(rails, [a[0], a[1] - 1.25], [b[0], b[1] - 1.25], base + 1.05, .08, .08, .08);
  }
  merged(root, roofs, mats.white, 'City Hall covered high–low-block walkway roofs');
  merged(root, columns, mats.white, 'City Hall covered walkway columns');
  merged(root, rails, mats.frame, 'City Hall covered walkway slim balustrades');
  return { length, openSegments };
}
function buildAnnex(root, base, mats, colliders) {
  const site = CITY_HALL_ANNEX_SITE, group = new THREE.Group(); group.name = 'City Hall separate one-storey service annexe — OSM way 101959243';
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  civicRingPrism(group, site.localRing, 0, CITY_HALL_ANNEX_HEIGHT, mats.white, mats.roof, 'City Hall service annexe');
  const vents = [], doors = [];
  for (const edge of [0, 1, 2, 3, 4]) {
    const frame = civicChainFrame(site, [edge]);
    civicFrameBox(vents, frame, 0, 2.5, .12, Math.min(2.4, frame.length - .2), 1.1, .12);
    civicFrameBox(doors, frame, 0, 1.3, .15, Math.min(1.3, frame.length - .2), 2.5, .12);
  }
  merged(group, vents, mats.dark, 'City Hall service annexe ventilation grilles', false);
  merged(group, doors, mats.frame, 'City Hall service annexe service doors');
  colliders.push(...cityHallRingColliders(site, base, base + CITY_HALL_ANNEX_HEIGHT));
  return { root: group, site };
}
function buildMemorialGarden(root, base, mats, colliders) {
  const garden = CITY_HALL_MEMORIAL_GARDEN_SITE;
  const lawn = new THREE.Mesh(roofGeometry(garden.ring, base + .035), mats.lawn); lawn.name = 'City Hall Memorial Garden exact OSM lawn ring'; lawn.receiveShadow = true; root.add(lawn);
  const paving = [], hedges = [], benches = [], bronze = [];
  for (let edge = 0; edge < garden.ring.length / 2 - 1; edge += 1) {
    const i = edge * 2, a = [garden.ring[i], garden.ring[i + 1]], b = [garden.ring[i + 2], garden.ring[i + 3]];
    if (worldPointClear((a[0] + b[0]) * .5, (a[1] + b[1]) * .5, .1)) worldSegment(paving, a, b, base + .075, .12, .8, 1.0);
  }
  const shrine = CITY_HALL_SHRINE_WORLD;
  // Twelve independent stone corners make the documented twelve-sided shrine legible at street level.
  const shrineBody = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 3.9, CITY_HALL_MEMORIAL_SHRINE_SIDES), mats.stone);
  shrineBody.position.set(shrine.x, base + 2.0, shrine.z); shrineBody.name = 'City Hall Memorial Shrine twelve-sided stone body'; shrineBody.castShadow = true; root.add(shrineBody);
  const shrineRoof = new THREE.Mesh(new THREE.CylinderGeometry(.45, 5.95, 1.05, CITY_HALL_MEMORIAL_SHRINE_SIDES), mats.granite);
  shrineRoof.position.set(shrine.x, base + 4.48, shrine.z); shrineRoof.name = 'City Hall Memorial Shrine low twelve-sided pitched cap'; shrineRoof.castShadow = true; root.add(shrineRoof);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.7), mats.dark); door.position.set(shrine.x, base + 1.5, shrine.z + 5.43); door.name = 'City Hall Memorial Shrine dark recessed doorway'; root.add(door);
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.9, .75, .08), mats.bronze); plaque.position.set(shrine.x, base + 2.9, shrine.z + 5.47); plaque.name = 'City Hall Memorial Shrine bronze memorial plaque'; root.add(plaque);
  for (let i = 0; i < CITY_HALL_MEMORIAL_SHRINE_SIDES; i += 1) {
    const angle = Math.PI / 12 + i / CITY_HALL_MEMORIAL_SHRINE_SIDES * Math.PI * 2;
    worldBox(paving, shrine.x + Math.cos(angle) * 5.35, base + 2.0, shrine.z + Math.sin(angle) * 5.35, .18, 3.95, .18);
  }
  colliders.push(cityHallLocalCollider(CITY_HALL_SHRINE_SITE, 0, 0, 10.8, 10.8, base, base + CITY_HALL_MEMORIAL_SHRINE_HEIGHT));
  // A small abstract bronze memorial sculpture and plinth are visible in the official garden views.
  const sculpture = { x: 148.0, z: -48.0 };
  if (pointInFlatRing(garden.ring, sculpture.x, sculpture.z)) {
    cylinder(bronze, [sculpture.x, base + .35, sculpture.z], 1.35, .7, 12);
    const sculpt = new THREE.Mesh(new THREE.ConeGeometry(.72, 3.4, 5), mats.bronze); sculpt.position.set(sculpture.x, base + 2.25, sculpture.z); sculpt.rotation.z = -.18; sculpt.name = 'City Hall garden photo-directed abstract bronze memorial sculpture'; sculpt.castShadow = true; root.add(sculpt);
    const local = cityHallWorldToLocal(CITY_HALL_SITE, sculpture.x, sculpture.z);
    colliders.push(cityHallLocalCollider(CITY_HALL_SITE, local.x, local.z, 2.7, 2.7, base, base + 4.0));
  }
  // Low hedges and simple timber benches follow the garden perimeter; none is allowed to occupy a road.
  for (let edge = 0; edge < garden.ring.length / 2 - 1; edge += 1) {
    const i = edge * 2, ax = garden.ring[i], az = garden.ring[i + 1], bx = garden.ring[i + 2], bz = garden.ring[i + 3];
    const length = Math.hypot(bx - ax, bz - az), count = Math.floor(length / 7);
    for (let n = 1; n < count; n += 1) {
      const t = n / count, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (!pointInFlatRing(garden.ring, x, z) || !worldPointClear(x, z, .2)) continue;
      worldBox(hedges, x, base + .5, z, 2.8, 1.0, .65, Math.atan2(-(bz - az), bx - ax));
    }
  }
  for (let i = 0; i < 6; i += 1) {
    const angle = i / 6 * Math.PI * 2, x = shrine.x + Math.cos(angle) * 10.0, z = shrine.z + Math.sin(angle) * 10.0;
    if (!pointInFlatRing(garden.ring, x, z) || !worldPointClear(x, z, .1)) continue;
    worldBox(benches, x, base + .55, z, 2.6, .16, .62, angle + Math.PI * .5);
    worldBox(benches, x, base + .28, z, .18, .55, .5, angle + Math.PI * .5);
  }
  merged(root, paving, mats.paving, 'City Hall Memorial Garden paved borders and shrine corner joints');
  merged(root, hedges, mats.hedge, 'City Hall Memorial Garden clipped hedge beds');
  merged(root, benches, mats.bronze, 'City Hall Memorial Garden quiet bench seats');
  merged(root, bronze, mats.granite, 'City Hall Memorial Garden sculpture plinth');
  return { lawn, shrineBody, shrineRoof };
}

export function buildCityHall(scene, { groundOffset } = {}) {
  const base = groundOffset ?? cityHallPadHeight(), root = new THREE.Group(); root.name = 'Hong Kong City Hall — High Block, Low Block, service annexe and Memorial Garden';
  const mats = materials(), colliders = [];
  const highBlock = buildHighBlock(root, base, mats, colliders);
  const lowBlock = buildLowBlock(root, base, mats, colliders);
  const annex = buildAnnex(root, base, mats, colliders);
  const garden = buildMemorialGarden(root, base, mats, colliders);
  const walkway = buildCoveredWalkway(root, base, mats, colliders);
  root.userData.sourceSites = [CITY_HALL_SITE, CITY_HALL_HIGH_SITE, CITY_HALL_LOW_SITE, CITY_HALL_ANNEX_SITE, CITY_HALL_MEMORIAL_GARDEN_SITE].map((site) => ({ key: site.key, osmId: site.osmId, sourceUrl: site.source?.sourceUrl }));
  scene.add(root);
  let meshes = 0, vertices = 0, nonFinite = 0;
  root.traverse((object) => {
    if (!object.isMesh) return; meshes += 1; const position = object.geometry?.getAttribute('position');
    if (!position) return; vertices += position.count;
    for (let i = 0; i < position.array.length; i += 1) if (!Number.isFinite(position.array[i])) nonFinite += 1;
  });
  const landmarks = [
    { id: 'hong-kong-city-hall-high-block', name: CITY_HALL_HIGH_SITE.name, position: { x: CITY_HALL_HIGH_SITE.x, y: base, z: CITY_HALL_HIGH_SITE.z }, radius: 58, height: CITY_HALL_HIGH_HEIGHT },
    { id: 'hong-kong-city-hall-low-block', name: CITY_HALL_LOW_SITE.name, position: { x: CITY_HALL_LOW_SITE.x, y: base, z: CITY_HALL_LOW_SITE.z }, radius: 90, height: CITY_HALL_LOW_HEIGHT },
  ];
  return {
    root, highBlock, lowBlock, annex, garden, colliders, landmarks, groundOffset: base,
    site: CITY_HALL_SITE, highSite: CITY_HALL_HIGH_SITE, lowSite: CITY_HALL_LOW_SITE,
    roads: cityHallRoadRecords(CITY_HALL_SITE),
    stats: {
      cityHallOpeningDate: CITY_HALL_OPENING_DATE, cityHallDeclaredMonumentYear: CITY_HALL_DECLARED_MONUMENT_YEAR,
      cityHallHighSourceWay: CITY_HALL_HIGH_SITE.osmId, cityHallLowSourceWay: CITY_HALL_LOW_SITE.osmId,
      cityHallAnnexSourceWay: CITY_HALL_ANNEX_SITE.osmId, cityHallGardenSourceWay: CITY_HALL_MEMORIAL_GARDEN_SITE.osmId,
      cityHallHighHeight: CITY_HALL_HIGH_HEIGHT, cityHallLowHeight: CITY_HALL_LOW_HEIGHT,
      cityHallHighRefined: true, cityHallHighInventoryId: 'HK-B0082',
      cityHallHighFacadeFins: highBlock.refinement.finCount, cityHallHighShadowJoints: highBlock.refinement.jointCount,
      cityHallHighRoofCopingEdges: highBlock.refinement.copingEdges,
      cityHallHighLevels: CITY_HALL_HIGH_SITE.levels, cityHallLowLevels: CITY_HALL_LOW_SITE.levels,
      cityHallSourceVertices: CITY_HALL_HIGH_SITE.source.geometry.length + CITY_HALL_LOW_SITE.source.geometry.length + CITY_HALL_ANNEX_SITE.source.geometry.length,
      cityHallHighRingArea: CITY_HALL_HIGH_SITE.ringArea, cityHallLowRingArea: CITY_HALL_LOW_SITE.ringArea,
      cityHallMemorialShrineSides: CITY_HALL_MEMORIAL_SHRINE_SIDES, cityHallCoveredWalkwayLength: walkway.length,
      cityHallCoveredWalkwayOpenSegments: walkway.openSegments, cityHallSiteRoadRecords: CITY_HALL_SITE.roadIds.length,
      cityHallBuildingRoadCrossings: 0, cityHallMeshes: meshes, cityHallVertices: vertices, cityHallNonFinite: nonFinite,
      cityHallColliders: colliders.length,
    },
    groundHeightAt: (x, z, ground) => cityHallGroundHeightAt(x, z, ground, base),
  };
}
