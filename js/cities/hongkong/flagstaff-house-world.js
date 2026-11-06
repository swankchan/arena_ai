import * as THREE from 'three/webgpu';
import {
  FLAGSTAFF_HOUSE_FEATURE, FLAGSTAFF_HOUSE_SITE, FLAGSTAFF_HOUSE_OSM_SOURCE,
  FLAGSTAFF_HOUSE_MAIN_ENTRANCE, FLAGSTAFF_HOUSE_SECOND_ENTRANCE, FLAGSTAFF_HOUSE_ENTRANCES,
  FLAGSTAFF_HOUSE_MAIN_DOOR_WIDTH, FLAGSTAFF_HOUSE_SECOND_DOOR_WIDTH, FLAGSTAFF_HOUSE_WALL_HEIGHT,
  flagstaffHouseEntranceGapWidth,
} from './flagstaff-house-architecture.js';
import {
  majorParkPadHeight, majorParkMinimumTerrain, majorParkLocalToWorld, majorParkRoadAt,
  HONG_KONG_PARK,
} from './major-parks-architecture.js';
import { majorParkLocalGroup } from './major-parks-world-utils.js';
import {
  harbourCityEdgeOutward, harbourCityLocalCollider, harbourCitySegmentCollider,
} from './harbour-city-architecture.js';
import { box, cylinder, beam, merged } from './harbour-city-world-utils.js';
import { civicFramePoint, civicFrameBox, roofGeometry } from './civic-world-utils.js';
import { ringShellGeometry, meshFromGeometry, makeCanvasSign } from './tst-hotel-world-utils.js';

const edgeFrame = (edge, t = .5) => {
  const site = FLAGSTAFF_HOUSE_SITE, ring = site.localRing, i = edge * 2;
  const orientation = harbourCityEdgeOutward(ring, edge);
  const x = ring[i] + (ring[i + 2] - ring[i]) * t;
  const z = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t;
  // civicFramePoint's positive offset is the outward normal with this convention.
  return { x, z, localX: x, localZ: z, length: orientation.length, nx: orientation.nx, nz: orientation.nz, ry: Math.atan2(orientation.nx, orientation.nz) };
};

function hipRoofGeometry(w, d, rise) {
  const hx = w * .5, hz = d * .5, ridge = Math.max(0, hx - hz * .8);
  const positions = [
    -hx, 0, -hz, hx, 0, -hz, ridge, rise, 0, -hx, 0, -hz, ridge, rise, 0, -ridge, rise, 0,
    hx, 0, hz, -hx, 0, hz, -ridge, rise, 0, hx, 0, hz, -ridge, rise, 0, ridge, rise, 0,
    -hx, 0, hz, -hx, 0, -hz, -ridge, rise, 0,
    hx, 0, -hz, hx, 0, hz, ridge, rise, 0,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals(); return geometry;
}

function archGeometry(width, height) {
  const shape = new THREE.Shape(), radius = width * .5;
  shape.moveTo(-radius, 0); shape.lineTo(-radius, height - radius);
  shape.absarc(0, height - radius, radius, Math.PI, 0, true);
  shape.lineTo(radius, 0); shape.closePath();
  return new THREE.ShapeGeometry(shape, 12);
}

function addArchedOpening(group, frame, u, bottom, offset, width, height, materials, name) {
  const outer = archGeometry(width + .34, height + .22);
  outer.rotateY(frame.ry); outer.translate(...civicFramePoint(frame, u, bottom - .08, offset));
  const trim = new THREE.Mesh(outer, materials.white); trim.name = `${name} white classical architrave`; group.add(trim);
  const inner = archGeometry(width, height);
  inner.rotateY(frame.ry); inner.translate(...civicFramePoint(frame, u, bottom, offset + .055));
  const dark = new THREE.Mesh(inner, materials.dark); dark.name = `${name} dark arched timber opening`; group.add(dark);
  return { trim, dark };
}

function addRingColliders(colliders, pad) {
  const site = FLAGSTAFF_HOUSE_SITE, ring = site.localRing, edgeCount = ring.length / 2 - 1;
  const gaps = Array.from({ length: edgeCount }, () => []);
  const addGap = (edge, t, width) => {
    const length = harbourCityEdgeOutward(ring, edge).length;
    gaps[edge].push({ start: Math.max(0, t - width / length * .5), end: Math.min(1, t + width / length * .5) });
  };
  for (const entrance of FLAGSTAFF_HOUSE_ENTRANCES) {
    const width = flagstaffHouseEntranceGapWidth(entrance);
    addGap(entrance.sourceEdge, entrance.t, width);
    // The two source nodes are vertices.  Continue each clear opening around the corner,
    // rather than leaving a collider across half of a real door.
    if (entrance.t <= 1e-8) addGap((entrance.sourceEdge + edgeCount - 1) % edgeCount, 1, width);
    if (entrance.t >= 1 - 1e-8) addGap((entrance.sourceEdge + 1) % edgeCount, 0, width);
  }
  for (let edge = 0; edge < edgeCount; edge++) {
    const openings = gaps[edge].sort((a, b) => a.start - b.start), mergedOpenings = [];
    for (const opening of openings) {
      const last = mergedOpenings.at(-1);
      if (last && opening.start <= last.end) last.end = Math.max(last.end, opening.end);
      else mergedOpenings.push({ ...opening });
    }
    let cursor = 0;
    for (const opening of mergedOpenings) {
      if (opening.start > cursor) colliders.push(harbourCitySegmentCollider(site, edge, cursor, opening.start, pad, pad + FLAGSTAFF_HOUSE_WALL_HEIGHT, .48));
      // The wall above a door remains solid; the person-height portal is genuinely open.
      colliders.push(harbourCitySegmentCollider(site, edge, opening.start, opening.end, pad + 3.35, pad + FLAGSTAFF_HOUSE_WALL_HEIGHT, .48));
      cursor = Math.max(cursor, opening.end);
    }
    if (cursor < 1) colliders.push(harbourCitySegmentCollider(site, edge, cursor, 1, pad, pad + FLAGSTAFF_HOUSE_WALL_HEIGHT, .48));
  }
}

function addFacade(local, materials) {
  const glass = [], frames = [], shutters = [], mouldings = [], verandas = [], rails = [];
  let panels = 0, shutterPanels = 0, verandaColumns = 0;
  const ring = FLAGSTAFF_HOUSE_SITE.localRing;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(ring, edge).length, frame = edgeFrame(edge);
    if (length < .5) continue;
    // Continuous plinth, floor string course and eaves are characteristic of the white
    // Greek-Revenue elevation; they follow every real source edge, including the returns.
    for (const [y, h, depth] of [[.28, .34, .32], [3.12, .20, .25], [6.18, .24, .36]]) {
      civicFrameBox(mouldings, frame, 0, y, .14, length + .18, h, depth);
    }
    const bays = Math.max(1, Math.round(length / 3.15)), bay = length / bays;
    for (let row = 0; row < 2; row++) for (let b = 0; b < bays; b++) {
      const u = -length * .5 + (b + .5) * bay;
      const nearDoor = FLAGSTAFF_HOUSE_ENTRANCES.some((entry) => entry.sourceEdge === edge && Math.abs((entry.t - .5) * length - u) < 1.65);
      if (nearDoor) continue;
      const y = 1.65 + row * 3.15, width = Math.min(1.42, Math.max(.48, bay - .66));
      civicFrameBox(glass, frame, u, y, .13, width, 1.72, .10); panels++;
      for (const side of [-1, 1]) {
        civicFrameBox(frames, frame, u + side * (width * .5 + .07), y, .19, .12, 1.94, .15);
        if ((b + row + edge) % 3 !== 1) {
          civicFrameBox(shutters, frame, u + side * (width * .5 + .29), y, .21, .34, 1.78, .10); shutterPanels++;
          for (const sy of [-.56, -.28, 0, .28, .56]) civicFrameBox(rails, frame, u + side * (width * .5 + .29), y + sy, .28, .34, .035, .055);
        }
      }
      civicFrameBox(frames, frame, u, y + .93, .19, width + .25, .12, .15);
      civicFrameBox(frames, frame, u, y - .93, .19, width + .25, .12, .15);
    }
    // Verandas are concentrated on the long photographed elevations, not stamped on every
    // notch of the OSM polygon.  The upper and lower columns remain separate silhouettes.
    if ([6, 16, 17].includes(edge) && length > 8) {
      const count = Math.max(2, Math.round(length / 3.4));
      for (let i = 0; i <= count; i++) {
        const u = -length * .47 + i / count * length * .94;
        for (const y of [1.55, 4.65]) {
          const p = civicFramePoint(frame, u, y, .78);
          cylinder(verandas, p, .16, 3.08, 12);
          civicFrameBox(verandas, frame, u, y - 1.43, .78, .46, .22, .46);
          if (y < 2) verandaColumns++;
        }
      }
      civicFrameBox(rails, frame, 0, 3.68, .79, length * .94, .10, .10);
      for (let i = 0; i < count * 2; i++) {
        const u = -length * .46 + (i + .5) / (count * 2) * length * .92;
        civicFrameBox(rails, frame, u, 3.42, .79, .065, .65, .065);
      }
    }
  }
  merged(local, glass, materials.window, 'Flagstaff House individual dark recessed window panels', false);
  merged(local, frames, materials.white, 'Flagstaff House white window architraves and mullions');
  merged(local, shutters, materials.dark, 'Flagstaff House dark timber louvred shutters');
  merged(local, mouldings, materials.white, 'Flagstaff House continuous classical plinth string courses and eaves');
  merged(local, verandas, materials.white, 'Flagstaff House two-storey columned verandas');
  merged(local, rails, materials.paleStone, 'Flagstaff House veranda balustrades and shutter slats');
  return { panels, shutterPanels, verandaColumns };
}

function addEntrance(local, entrance, width, materials, colliders, pad, main = false) {
  const frame = edgeFrame(entrance.sourceEdge, entrance.t), doors = [], trim = [], canopy = [], lights = [];
  const doorHeight = main ? 2.85 : 2.65;
  civicFrameBox(doors, frame, 0, doorHeight * .5, .18, width, doorHeight, .12);
  for (const u of [-width * .5 - .12, 0, width * .5 + .12]) civicFrameBox(trim, frame, u, doorHeight * .5, .25, .12, doorHeight + .20, .16);
  civicFrameBox(trim, frame, 0, doorHeight + .13, .25, width + .36, .18, .18);
  civicFrameBox(canopy, frame, 0, 3.55, .72, width + 1.25, .24, 1.65);
  for (const u of [-width * .5 - .45, width * .5 + .45]) {
    civicFrameBox(canopy, frame, u, 1.75, 1.12, .22, 3.5, .22);
    const p = civicFramePoint(frame, u, 0, 1.12), world = majorParkLocalToWorld(FLAGSTAFF_HOUSE_SITE, p[0], p[2]);
    if (!majorParkRoadAt(HONG_KONG_PARK, world.x, world.z, .1)) {
      colliders.push(harbourCityLocalCollider(FLAGSTAFF_HOUSE_SITE, p[0], p[2], .36, .36, pad, pad + 3.55, FLAGSTAFF_HOUSE_SITE.ry + frame.ry));
    }
  }
  for (const u of [-width * .32, width * .32]) civicFrameBox(lights, frame, u, 3.38, .7, .18, .06, .18);
  merged(local, doors, materials.dark, `${entrance.name} exact-node dark glazed door`, false);
  merged(local, trim, materials.white, `${entrance.name} classical door surround`);
  merged(local, canopy, materials.white, `${entrance.name} columned portico and canopy`);
  merged(local, lights, materials.warmLight, `${entrance.name} warm entrance lanterns`, false);
  if (main) {
    // The arched upper opening and the portico are photographed identity cues, not a generic
    // two-storey shutter grid.  The source-node door remains below them at the exact vertex.
    addArchedOpening(local, frame, 0, 4.05, .18, 1.72, 1.85, materials, 'Flagstaff House central upper arch');
    const sign = makeCanvasSign(12, 1.25, (ctx, canvas) => {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#eee9d8';
      ctx.font = '600 82px "Noto Sans CJK TC", "PingFang HK", sans-serif'; ctx.fillText('茶具文物館', canvas.width / 2, 125, 1100);
      ctx.font = '500 40px Georgia, serif'; ctx.fillText('FLAGSTAFF HOUSE MUSEUM OF TEA WARE', canvas.width / 2, 260, 1380);
    });
    sign.position.set(...civicFramePoint(frame, 0, 3.78, .96)); sign.rotation.y = frame.ry; local.add(sign);
  }
}

function addRoof(local, materials) {
  const roofs = [], tileCourses = [], chimneys = [];
  // A red-brown roof deck follows the complete concave source ring.  Two smaller hipped
  // volumes sit over the photographed principal and west-wing rooms instead of one huge
  // rectangular roof covering the notches.
  const deck = roofGeometry(FLAGSTAFF_HOUSE_SITE.localRing, FLAGSTAFF_HOUSE_WALL_HEIGHT);
  // The hand-authored hip shells have position/normal only; keep the merged roof attribute
  // layout identical to the source-ring ShapeGeometry deck.
  deck.deleteAttribute('uv');
  roofs.push(deck);
  const sections = [
    { x: 22, z: -2, w: 20, d: 30, rise: 2.05 },
    { x: -27, z: 9, w: 12, d: 14, rise: 1.35 },
  ];
  for (const section of sections) {
    const roof = hipRoofGeometry(section.w, section.d, section.rise);
    roof.translate(section.x, FLAGSTAFF_HOUSE_WALL_HEIGHT + .03, section.z); roofs.push(roof);
    for (let i = 1; i < 6; i++) {
      const z = section.z - section.d * .42 + i / 6 * section.d * .84;
      const half = section.w * .5 * (1 - Math.abs(z - section.z) / (section.d * .5) * .28);
      beam(tileCourses, [section.x - half, FLAGSTAFF_HOUSE_WALL_HEIGHT + .10 + section.rise * .36, z], [section.x + half, FLAGSTAFF_HOUSE_WALL_HEIGHT + .10 + section.rise * .36, z], .035, .045);
    }
  }
  for (const [x, z] of [[16, -10], [28, -10], [22, 7]]) {
    box(chimneys, [x, FLAGSTAFF_HOUSE_WALL_HEIGHT + 1.35, z], [.9, 2.7, .9]);
    box(chimneys, [x, FLAGSTAFF_HOUSE_WALL_HEIGHT + 2.76, z], [1.18, .18, 1.18]);
  }
  const roofParts = roofs.map((geometry) => geometry.index ? geometry.toNonIndexed() : geometry);
  for (let i = 0; i < roofs.length; i++) if (roofParts[i] !== roofs[i]) roofs[i].dispose();
  merged(local, roofParts, materials.roofTile, 'Flagstaff House red-brown hipped tile roofs over source-ring deck');
  merged(local, tileCourses, materials.roofTileDark, 'Flagstaff House individual roof tile courses', false);
  merged(local, chimneys, materials.roofTileDark, 'Flagstaff House three brick chimney stacks and caps');
  return { sections: sections.length, chimneys: 3 };
}

export function buildFlagstaffHouse(group, materials, colliders) {
  const feature = FLAGSTAFF_HOUSE_FEATURE, pad = majorParkPadHeight(feature), bottom = majorParkMinimumTerrain(feature);
  meshFromGeometry(group, ringShellGeometry(feature.ring, bottom, pad + FLAGSTAFF_HOUSE_WALL_HEIGHT), materials.white,
    'Flagstaff House exact OSM v15 heritage walls and DTM retaining foundation');
  const local = majorParkLocalGroup(feature, group, pad, 'Flagstaff House dedicated Greek Revival museum refinement — HK-B0093');
  const roofTile = new THREE.MeshStandardMaterial({ color: 0x824b3d, roughness: .88, metalness: .02, side: THREE.DoubleSide });
  const roofTileDark = new THREE.MeshStandardMaterial({ color: 0x5f382f, roughness: .9, metalness: .02 });
  const dedicated = { ...materials, roofTile, roofTileDark };
  const facade = addFacade(local, dedicated);
  addEntrance(local, FLAGSTAFF_HOUSE_MAIN_ENTRANCE, FLAGSTAFF_HOUSE_MAIN_DOOR_WIDTH, dedicated, colliders, pad, true);
  addEntrance(local, FLAGSTAFF_HOUSE_SECOND_ENTRANCE, FLAGSTAFF_HOUSE_SECOND_DOOR_WIDTH, dedicated, colliders, pad, false);
  const roof = addRoof(local, dedicated);
  addRingColliders(colliders, pad);
  return {
    pad, bottom, wallHeight: FLAGSTAFF_HOUSE_WALL_HEIGHT,
    stats: {
      flagstaffHouseRefined: true, flagstaffHouseInventoryId: 'HK-B0093', flagstaffHouseSourceWay: FLAGSTAFF_HOUSE_OSM_SOURCE.id,
      flagstaffHouseSourceVersion: FLAGSTAFF_HOUSE_OSM_SOURCE.version, flagstaffHouseEntranceNodes: FLAGSTAFF_HOUSE_ENTRANCES.map((entry) => entry.nodeId),
      flagstaffHouseWindowPanels: facade.panels, flagstaffHouseShutterPanels: facade.shutterPanels,
      flagstaffHouseVerandaColumns: facade.verandaColumns, flagstaffHouseRoofSections: roof.sections, flagstaffHouseChimneys: roof.chimneys,
      flagstaffHouseGenericHeritage: false, flagstaffHouseEvidence: 'OSM v15 + official Greek Revival history + photo-directed white classical / dark timber / red tile details',
    },
  };
}
