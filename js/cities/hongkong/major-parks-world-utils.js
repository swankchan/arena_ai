import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import { createTreeField } from '../../trees.js';
import { merged, box, beam, cylinder, sphere, roofGeometry, nightAmount } from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry, makeCanvasSign } from './tst-hotel-world-utils.js';
import { harbourCityLocalCollider } from './harbour-city-architecture.js';
import {
  MAJOR_PARK_BASE_OFFSET, MAJOR_PARK_PATH_OFFSET, MAJOR_PARK_SURFACE_OFFSET,
  majorParkGroundHeightAt, majorParkMinimumTerrain, majorParkPadHeight, majorParkPathAt,
  majorParkRoadAt, majorParkWorldToLocal, majorParkLocalToWorld, majorParkPointInRing, majorParkFurnitureConflictAt
} from './major-parks-architecture.js';
import { hongKongTerrainHeight, rawHongKongTerrainHeight } from './terrain.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { surfaceRoadHeight } from './road-elevation.js';

export function createMajorParkMaterials() {
  const warmLight = new THREE.MeshStandardMaterial({ color: 0xffe2ae, roughness: .42, metalness: .05 });
  warmLight.emissiveNode = color(1, .69, .32).mul(nightAmount()).mul(1.35);
  return {
    base: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98, metalness: 0 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x527a45, roughness: .98, metalness: 0 }),
    centralLawn: new THREE.MeshStandardMaterial({ color: 0x63884d, roughness: .98, metalness: 0 }),
    path: new THREE.MeshStandardMaterial({ color: 0xb5b0a2, roughness: .93, metalness: .01 }),
    plaza: new THREE.MeshStandardMaterial({ color: 0xc5c0b1, roughness: .9, metalness: .02 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xaaa99f, roughness: .88, metalness: .02 }),
    paleStone: new THREE.MeshStandardMaterial({ color: 0xd8d5c7, roughness: .82, metalness: .02 }),
    darkStone: new THREE.MeshStandardMaterial({ color: 0x535b56, roughness: .9, metalness: .03 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe9e9df, roughness: .65, metalness: .05 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3d514c, roughness: .42, metalness: .65 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xa8b8b8, roughness: .28, metalness: .82 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1e302f, roughness: .48, metalness: .32 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x88b7b0, roughness: .2, metalness: .18, transparent: true, opacity: .42, depthWrite: false, side: THREE.DoubleSide }),
    window: new THREE.MeshStandardMaterial({ color: 0x274f53, roughness: .22, metalness: .38 }),
    water: new THREE.MeshStandardMaterial({ color: 0x367f83, roughness: .2, metalness: .28, transparent: true, opacity: .9 }),
    shallowWater: new THREE.MeshStandardMaterial({ color: 0x55a9ac, roughness: .24, metalness: .18, transparent: true, opacity: .9 }),
    ripple: new THREE.MeshStandardMaterial({ color: 0xb8d8cf, roughness: .35, metalness: .1, transparent: true, opacity: .48 }),
    tennis: new THREE.MeshStandardMaterial({ color: 0x336fa0, roughness: .88, metalness: 0 }),
    tennisInner: new THREE.MeshStandardMaterial({ color: 0x315879, roughness: .9, metalness: 0 }),
    soccer: new THREE.MeshStandardMaterial({ color: 0x3e7352, roughness: .94, metalness: 0 }),
    basketball: new THREE.MeshStandardMaterial({ color: 0x507c77, roughness: .9, metalness: 0 }),
    bowls: new THREE.MeshStandardMaterial({ color: 0x4f7945, roughness: .98, metalness: 0 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x9a6956, roughness: .94, metalness: 0 }),
    blueRubber: new THREE.MeshStandardMaterial({ color: 0x47768a, roughness: .94, metalness: 0 }),
    line: new THREE.MeshStandardMaterial({ color: 0xf0eee0, roughness: .72, metalness: 0 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x76543b, roughness: .9, metalness: 0 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x315d37, roughness: .98, metalness: 0 }),
    flower: new THREE.MeshStandardMaterial({ color: 0xb36d78, roughness: .92, metalness: 0 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x413a2d, roughness: .54, metalness: .72 }),
    pink: new THREE.MeshStandardMaterial({ color: 0xd88e96, roughness: .78, metalness: 0 }),
    red: new THREE.MeshStandardMaterial({ color: 0xa64c3f, roughness: .8, metalness: 0 }),
    warmLight
  };
}
function setDtmNormals(geometry, lift = 0) {
  const position = geometry.getAttribute('position'), normals = [], epsilon = 1.5;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const nx = rawHongKongTerrainHeight(x - epsilon, z) - rawHongKongTerrainHeight(x + epsilon, z);
    const nz = rawHongKongTerrainHeight(x, z - epsilon) - rawHongKongTerrainHeight(x, z + epsilon);
    const inverse = 1 / Math.hypot(nx, epsilon * 2, nz); normals.push(nx * inverse, epsilon * 2 * inverse, nz * inverse);
  }
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
}
export function buildMajorParkBase(park, group, materials) {
  const positions = [], colors = [], source = park.baseTriangles;
  for (let i = 0; i < source.length; i += 2) {
    const x = source[i], z = source[i + 1], y = hongKongTerrainHeight(x, z) + MAJOR_PARK_BASE_OFFSET;
    positions.push(x, y, z);
    const variation = .93 + .09 * Math.abs(Math.sin(x * .071 + z * .053));
    colors.push(.235 * variation, .385 * variation, .225 * variation);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  setDtmNormals(geometry); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, materials.base); mesh.name = `${park.englishName} exact OSM site, DTM terrain and road-cleared lawn base`;
  mesh.receiveShadow = true; group.add(mesh);
  return { mesh, triangles: source.length / 6, area: park.baseArea };
}
function pathHeight(park, x, z) {
  return majorParkGroundHeightAt(park, x, z, hongKongTerrainHeight(x, z) + MAJOR_PARK_BASE_OFFSET);
}
export function buildMajorParkPaths(park, group, materials) {
  const positions = [], stripes = [], crossings = [], routeCrossings = new Set();
  const pushVertex = (x, z) => positions.push(x, pathHeight(park, x, z), z);
  for (const route of park.paths) for (let i = 2; i < route.points.length; i += 2) {
    const ax = route.points[i - 2], az = route.points[i - 1], bx = route.points[i], bz = route.points[i + 1];
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz); if (length < .05) continue;
    const ux = dx / length, uz = dz / length, nx = uz * route.width * .5, nz = -ux * route.width * .5;
    const steps = Math.max(1, Math.ceil(length / 3));
    for (let step = 0; step < steps; step++) {
      const t0 = step / steps, t1 = (step + 1) / steps, x0 = ax + dx * t0, z0 = az + dz * t0, x1 = ax + dx * t1, z1 = az + dz * t1;
      const mx = (x0 + x1) * .5, mz = (z0 + z1) * .5;
      const road = majorParkRoadAt(park, mx, mz, .05);
      if (road || majorParkRoadAt(park, x0, z0, .05) || majorParkRoadAt(park, x1, z1, .05)) {
        if (road) {
          routeCrossings.add(`${route.id}:${road.road.id}`);
          if (!crossings.some((crossing) => crossing.road.road.id === road.road.id && Math.hypot(crossing.x - road.x, crossing.z - road.z) < 10)) crossings.push({ route, road, x: road.x, z: road.z });
        }
        continue;
      }
      const a = [x0 + nx, z0 + nz], b = [x0 - nx, z0 - nz], c = [x1 + nx, z1 + nz], d = [x1 - nx, z1 - nz];
      for (const point of [a, b, c, b, d, c]) pushVertex(...point);
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  setDtmNormals(geometry); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, materials.path); mesh.name = `${park.englishName} connected accessible walking paths with carriageway gaps`;
  mesh.receiveShadow = true; group.add(mesh);
  let crossingCount = 0;
  for (const { road, x, z } of crossings) {
    const tangentLength = Math.hypot(road.dx, road.dz) || 1, tx = road.dx / tangentLength, tz = road.dz / tangentLength;
    const width = road.road.width + .7;
    for (let stripe = -3; stripe <= 3; stripe++) {
      const offset = stripe * .78, cx = x + tx * offset, cz = z + tz * offset;
      const roadHeight = fullRoadSurfaceAt(cx, cz, 1, surfaceRoadHeight(cx, cz))?.height ?? surfaceRoadHeight(cx, cz);
      box(stripes, [cx, roadHeight + .045, cz], [.42, .035, width], Math.atan2(-tz, tx));
    }
    crossingCount++;
  }
  merged(group, stripes, materials.line, `${park.englishName} pedestrian road-crossing stripes`, false);
  return { mesh, triangles: positions.length / 9, crossings: crossingCount, routeCrossings: routeCrossings.size };
}
export function majorParkBoxCollider(x, z, w, d, minY, maxY, ry = 0) {
  return harbourCityLocalCollider({ x: 0, z: 0, ry: 0 }, x, z, w, d, minY, maxY, ry);
}
export function majorParkRingColliders(ring, minY, maxY, depth = .42) {
  const colliders = [];
  for (let i = 2; i < ring.length; i += 2) {
    const ax = ring[i - 2], az = ring[i - 1], bx = ring[i], bz = ring[i + 1], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
    if (length < .05) continue;
    colliders.push(majorParkBoxCollider((ax + bx) * .5, (az + bz) * .5, length + .03, depth, minY, maxY, Math.atan2(-dz, dx)));
  }
  return colliders;
}
export function majorParkRingSurface(feature, material, name, group, offset = MAJOR_PARK_SURFACE_OFFSET) {
  if (!material?.isMaterial) throw new TypeError(`Missing material for ${name}`);
  const pad = majorParkPadHeight(feature, offset), bottom = majorParkMinimumTerrain(feature);
  const geometry = ringShellGeometry(feature.ring, bottom, pad);
  const mesh = meshFromGeometry(group, geometry, material, name); return { mesh, pad, bottom };
}
export function majorParkLocalGroup(feature, group, y = 0, name = feature.name) {
  const local = new THREE.Group(); local.name = name; local.position.set(feature.site.x, y, feature.site.z); local.rotation.y = feature.site.ry; group.add(local); return local;
}
export function fitMajorParkLocalRect(feature, cx, cz, w, d) {
  const valid = (x, z, width, depth) => {
    // Sample the whole rectangle, not only its corners: several OSM facility rings are concave.
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
      const world = majorParkLocalToWorld(feature.site, x + (i / 6 - .5) * width, z + (j / 6 - .5) * depth);
      if (!majorParkPointInRing(feature.ring, world.x, world.z)) return false;
    }
    return true;
  };
  for (let attempt = 0; attempt < 24; attempt++) {
    const width = w * Math.pow(.91, attempt), depth = d * Math.pow(.91, attempt);
    if (valid(cx, cz, width, depth)) return { x: cx, z: cz, w: width, d: depth };
  }
  throw new Error(`No safe local rectangle inside ${feature.name}`);
}
export function addMajorParkEntrances(park, group, materials, colliders) {
  const posts = [], signs = [];
  for (const entry of park.entrances) {
    const ground = majorParkGroundHeightAt(park, entry.x, entry.z, hongKongTerrainHeight(entry.x, entry.z) + MAJOR_PARK_BASE_OFFSET);
    for (const side of [-1, 1]) {
      const x = entry.x + Math.cos(entry.heading) * side * 3.4, z = entry.z - Math.sin(entry.heading) * side * 3.4;
      if (majorParkFurnitureConflictAt(park, x, z, .2)) continue;
      box(posts, [x, ground + 2.0, z], [.22, 4.0, .22]); colliders.push(majorParkBoxCollider(x, z, .28, .28, ground, ground + 4.0));
    }
    const sign = makeCanvasSign(7.4, 1.65, (ctx, canvas) => {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#173d31';
      ctx.font = '700 100px "Noto Sans CJK TC", "PingFang HK", sans-serif'; ctx.fillText(park.name, canvas.width / 2, 142, 1400);
      ctx.font = '500 43px Arial, sans-serif'; ctx.fillText('康文署 LCSD  ·  PARK ENTRANCE', canvas.width / 2, 280, 1300);
    });
    sign.name = `${park.englishName} bilingual entrance sign`; sign.position.set(entry.x, ground + 3.0, entry.z); sign.rotation.y = entry.heading; group.add(sign); signs.push(sign);
  }
  merged(group, posts, materials.metal, `${park.englishName} entrance sign posts`);
  return signs.length;
}
export function addMajorParkFurniture(park, group, materials, colliders) {
  const lamps = [], luminaires = [], benches = [], bins = [];
  let lampCount = 0, benchCount = 0;
  const lampPositions = [];
  for (const route of park.paths) for (let i = 2; i < route.points.length; i += 2) {
    const ax = route.points[i - 2], az = route.points[i - 1], bx = route.points[i], bz = route.points[i + 1];
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz); if (length < 1) continue;
    const ux = dx / length, uz = dz / length, nx = uz, nz = -ux;
    for (let d = 14; d < length; d += 31) {
      const side = (Math.floor(d / 31) + i) % 2 ? 1 : -1, offset = route.width * .5 + .72;
      const x = ax + ux * d + nx * offset * side, z = az + uz * d + nz * offset * side;
      if (majorParkFurnitureConflictAt(park, x, z, .45)) continue;
      const y = pathHeight(park, x, z);
      cylinder(lamps, [x, y + 2.05, z], .075, 4.1, 10); cylinder(lamps, [x, y + .18, z], .16, .36, 10);
      sphere(luminaires, [x, y + 4.18, z], .19, 10); colliders.push(majorParkBoxCollider(x, z, .24, .24, y, y + 4.1)); lampPositions.push({x, y: y + 4.18, z}); lampCount++;
    }
    for (let d = 24; d < length; d += 47) {
      const side = (Math.floor(d / 47) + i) % 2 ? 1 : -1, offset = route.width * .5 + 1.65;
      const x = ax + ux * d + nx * offset * side, z = az + uz * d + nz * offset * side;
      if (majorParkFurnitureConflictAt(park, x, z, 1.2)) continue;
      const y = pathHeight(park, x, z), ry = Math.atan2(-uz, ux);
      for (const dz of [-.28, 0, .28]) box(benches, [x, y + .48, z + dz], [1.8, .11, .19], ry);
      box(benches, [x, y + .9, z + .38], [1.8, .62, .10], ry);
      for (const dx2 of [-.68, .68]) box(benches, [x + dx2, y + .24, z], [.11, .48, .58], ry);
      colliders.push(majorParkBoxCollider(x, z, 1.85, .8, y, y + 1.2, ry)); benchCount++;
      if (benchCount % 3 === 0) { cylinder(bins, [x + 1.25, y + .45, z], .24, .9, 12); }
    }
  }
  merged(group, lamps, materials.metal, `${park.englishName} path lantern posts`);
  merged(group, luminaires, materials.warmLight, `${park.englishName} warm path lantern globes`, false);
  merged(group, benches, materials.wood, `${park.englishName} path benches`);
  merged(group, bins, materials.dark, `${park.englishName} litter bins`);
  return { lamps: lampCount, benches: benchCount, lampPositions };
}
export function addMajorParkWater(feature, group, materials, colliders, options = {}) {
  const pad = majorParkPadHeight(feature, .03), bottom = majorParkMinimumTerrain(feature);
  const basin = ringShellGeometry(feature.ring, bottom, pad - .08);
  meshFromGeometry(group, basin, materials.darkStone, `${feature.name} retaining basin and stone edge`);
  const waterGeometry = roofGeometry(feature.ring, pad);
  meshFromGeometry(group, waterGeometry, options.shallow ? materials.shallowWater : materials.water, `${feature.name} water surface`, false);
  const coping = [];
  for (let i = 2; i < feature.ring.length; i += 2) {
    const ax = feature.ring[i - 2], az = feature.ring[i - 1], bx = feature.ring[i], bz = feature.ring[i + 1];
    beam(coping, [ax, pad + .12, az], [bx, pad + .12, bz], .24, .24);
  }
  merged(group, coping, materials.stone, `${feature.name} continuous stone coping`);
  colliders.push(...majorParkRingColliders(feature.ring, pad - .55, pad + 1.05, .38));
  return { pad, bottom };
}
export function addMajorParkFountainJets(feature, group, materials, count = 5) {
  const pad = majorParkPadHeight(feature, feature.kind === 'fountainPlaza' ? .105 : .03), jets = [], bases = [];
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2, radius = Math.min(feature.site.w, feature.site.d) * .18;
    const x = feature.site.x + Math.cos(a) * radius, z = feature.site.z + Math.sin(a) * radius;
    cylinder(bases, [x, pad + .12, z], .22, .24, 12);
    const height = 1.8 + (i % 3) * .65;
    beam(jets, [x, pad + .18, z], [x + Math.cos(a) * .45, pad + height, z + Math.sin(a) * .45], .055, .055);
  }
  merged(group, bases, materials.silver, `${feature.name} fountain nozzles`);
  merged(group, jets, materials.ripple, `${feature.name} dancing fountain jets`, false);
}
export function addMajorParkPlayground(feature, group, materials, colliders) {
  const { pad } = majorParkRingSurface(feature, materials.rubber, `${feature.name} exact OSM rubberised playground terrace`, group);
  const local = majorParkLocalGroup(feature, group, pad, `${feature.name} play equipment`);
  const frames = [], slides = [], swings = [];
  const rect = fitMajorParkLocalRect(feature, 0, 0, Math.min(18, feature.site.w * .55), Math.min(12, feature.site.d * .55));
  for (const x of [-2.2, 2.2]) for (const z of [-1.8, 1.8]) box(frames, [x, 1.45, z], [.16, 2.9, .16]);
  box(frames, [0, 2.75, 0], [4.8, .18, 4.1]); box(frames, [0, 1.35, 0], [4.2, .16, 3.6]);
  const slide = new THREE.BoxGeometry(1.1, .15, 5.4); slide.rotateX(-.48); slide.translate(rect.x + 4.2, 1.25, rect.z); slides.push(slide);
  for (const x of [-3.4, 3.4]) beam(swings, [x, 0, 6], [x, 3.4, 6], .13, .13);
  beam(swings, [-3.4, 3.4, 6], [3.4, 3.4, 6], .15, .15);
  for (const x of [-1.5, 1.5]) { beam(swings, [x, 3.35, 6], [x, .85, 6], .035, .035); box(swings, [x, .78, 6], [.65, .10, .36]); }
  merged(local, frames, materials.red, `${feature.name} climbing frame and platform`);
  merged(local, slides, materials.silver, `${feature.name} slide`);
  merged(local, swings, materials.dark, `${feature.name} swing frame and seats`);
  colliders.push(majorParkBoxCollider(feature.site.x, feature.site.z, Math.min(6, feature.site.w * .4), Math.min(6, feature.site.d * .4), pad, pad + 3.1, feature.site.ry));
  return pad;
}
// Doubles rectangle and singles/service markings, scaled to the available scene rectangle.
// ITF rule 1: 23.77m long, 10.97m doubles / 8.23m singles, service lines 6.40m from net.
// This does not assert that an OSM polygon supplies surveyed court dimensions.
export function majorParkTennisLineRects(w, d) {
  const singles = w * (8.23 / 10.97), service = d * (6.40 / 23.77), t = .05;
  return [
    [0, -d/2, w, t], [0, d/2, w, t],
    [-w/2, 0, t, d], [w/2, 0, t, d],
    [-singles/2, 0, t, d], [singles/2, 0, t, d],
    [0, -service, singles, t], [0, service, singles, t],
    [0, 0, t, service * 2],
    [0, -d/2 + .05, t, .1], [0, d/2 - .05, t, .1],
  ];
}

export function addMajorParkCourt(feature, group, materials, colliders, options = {}) {
  const material = options.centre ? materials.tennis : feature.kind === 'soccer' ? materials.soccer : feature.kind === 'basketball' || feature.kind === 'handball' ? materials.basketball : feature.kind === 'bowls' ? materials.bowls : feature.kind === 'roller' || feature.kind === 'tableTennis' ? materials.plaza : materials.tennis;
  const { pad } = majorParkRingSurface(feature, material, `${feature.name} exact OSM ${feature.kind} surface`, group);
  const local = majorParkLocalGroup(feature, group, pad + .025, `${feature.name} regulation-inspired markings and equipment`);
  // The court's long dimension is the playing direction (local z). OSM OBBs
  // can put that direction on x, so rotate the markings AND equipment together.
  const rotateCourt = ['soccer', 'tennis', 'centreCourt'].includes(feature.kind) && feature.site.w > feature.site.d;
  const markings = new THREE.Group();
  markings.name = `${feature.name} aligned court markings and equipment`;
  markings.rotation.y = rotateCourt ? Math.PI / 2 : 0;
  local.add(markings);
  const lines = [], equipment = [], nets = [];
  const w = (rotateCourt ? feature.site.d : feature.site.w) * .82;
  const d = (rotateCourt ? feature.site.w : feature.site.d) * .82;
  const lineBox = (x, z, lw, ld) => box(lines, [x, .02, z], [lw, .035, ld]);
  if (['soccer', 'basketball', 'handball'].includes(feature.kind)) {
    lineBox(0, -d * .5, w, .10); lineBox(0, d * .5, w, .10); lineBox(-w * .5, 0, .10, d); lineBox(w * .5, 0, .10, d);
  }
  if (feature.kind === 'tennis' || feature.kind === 'centreCourt') {
    for (const rect of majorParkTennisLineRects(w, d)) lineBox(...rect);
    beam(nets, [-w * .52, .95, 0], [w * .52, .95, 0], .055, .055);
    for (const x of [-w * .52, w * .52]) cylinder(equipment, [x, .55, 0], .055, 1.1, 8);
  } else if (feature.kind === 'soccer') {
    lineBox(0, 0, w, .09);
    const circle = new THREE.RingGeometry(Math.min(w, d) * .15 - .06, Math.min(w, d) * .15, 40); circle.rotateX(-Math.PI / 2); circle.translate(0, .025, 0); lines.push(circle);
    for (const side of [-1, 1]) {
      const z = side * d * .5;
      for (const x of [-w * .15, w * .15]) beam(equipment, [x, 0, z], [x, 2.1, z], .10, .10);
      beam(equipment, [-w * .15, 2.1, z], [w * .15, 2.1, z], .10, .10);
    }
  } else if (feature.kind === 'basketball' || feature.kind === 'handball') {
    lineBox(0, 0, w, .08);
    for (const side of [-1, 1]) {
      cylinder(equipment, [0, 1.55, side * d * .43], .09, 3.1, 10);
      box(equipment, [0, 3.05, side * d * .43], [1.8, 1.05, .09]);
      const hoop = new THREE.TorusGeometry(.24, .035, 6, 18); hoop.rotateX(Math.PI / 2); hoop.translate(0, 2.72, side * d * .38); equipment.push(hoop);
    }
  } else if (feature.kind === 'bowls') {
    for (let rink = -3; rink <= 3; rink++) lineBox(rink * w / 8, 0, .055, d * .92);
  } else if (feature.kind === 'tableTennis') {
    for (let table = -1; table <= 1; table++) {
      const z = table * d * .27;
      box(nets, [0, .78, z], [Math.min(1.55, w * .3), .09, 2.7]);
      box(nets, [0, 1.00, z], [Math.min(1.55, w * .3), .16, .035]);
      for (const x of [-.55, .55]) for (const dz of [-.95, .95]) box(equipment, [x, .39, z + dz], [.07, .78, .07]);
    }
  }
  merged(markings, lines, materials.line, `${feature.name} painted lines`, false);
  merged(markings, equipment, materials.white, `${feature.name} goals and sports equipment`);
  merged(markings, nets, materials.dark, `${feature.name} net`);
  return { pad, local, w, d };
}
export function buildMajorParkTreeLayer(scene, parks, colliders) {
  const sites = parks.flatMap((park) => park.treeSites || []);
  const treeField = createTreeField(scene, sites, colliders); treeField.group.name = 'Authored major-park avenue trees and OSM woodland groves'; scene.add(treeField.group);
  return treeField;
}
export function majorParkLandmark(park, height) {
  return {
    name: park.name, englishName: park.englishName, x: park.site.x, z: park.site.z, w: park.site.w, d: park.site.d, h: height,
    bounds: park.bounds, ring: park.ring, osmId: park.id, kind: 'majorPark', labelHeight: false,
    heightEvidence: 'Authored park facilities on the traceable DTM; scene pads are not surveyed engineering elevations.'
  };
}
