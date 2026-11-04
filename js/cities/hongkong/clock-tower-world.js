import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  CLOCK_TOWER_SITE, CLOCK_TOWER_FACADES, CLOCK_TOWER_GARDEN_SITE,
  CLOCK_TOWER_PALMS, CLOCK_TOWER_JETS, CLOCK_TOWER_HEIGHT, CLOCK_TOWER_LIGHTNING_ROD_HEIGHT,
  CLOCK_TOWER_TOTAL_HEIGHT, CLOCK_TOWER_MAIN_CORNICE_HEIGHT, CLOCK_TOWER_LOWER_TURRET_TOP,
  CLOCK_TOWER_BELFRY_TOP, CLOCK_TOWER_POOL_OFFSET, CLOCK_TOWER_POOL_LENGTH, CLOCK_TOWER_POOL_WIDTH,
  CLOCK_TOWER_APRON_LENGTH, CLOCK_TOWER_APRON_WIDTH, CLOCK_TOWER_MAIN_LEVELS, CLOCK_TOWER_TURRET_LEVELS,
  CLOCK_TOWER_CLOCK_FACES, clockTowerRoadRecords, clockTowerTerrainHeightAt,
} from './clock-tower-architecture.js';
import {
  harbourCityLocalCollider, harbourCityRingColliders, harbourCityLocalToWorld,
} from './harbour-city-architecture.js';
import { clockTowerPadHeight, rawHongKongTerrainHeight } from './terrain.js';
import { merged, box, cylinder, beam, nightAmount, roofGeometry, scaledRing } from './harbour-city-world-utils.js';

function geometry(positions, indices, uvs = null) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (uvs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (indices) g.setIndex(indices);
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function wallGeometry(ring, y0, y1) {
  const positions = [], indices = [], uvs = [];
  for (let i = 0; i < ring.length - 2; i += 2) {
    const ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], j = positions.length / 3;
    positions.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y1, az);
    const u = Math.hypot(bx - ax, bz - az) / 3;
    uvs.push(0, y0 / 3, u, y0 / 3, u, y1 / 3, 0, y1 / 3);
    indices.push(j, j + 1, j + 2, j, j + 2, j + 3);
  }
  return geometry(positions, indices, uvs);
}
function octagonRing(apothem, theta) {
  const radius = apothem / Math.cos(Math.PI / 8), ring = [];
  for (let i = 0; i <= 8; i += 1) {
    const a = theta - Math.PI / 8 + i * Math.PI / 4; ring.push(Math.sin(a) * radius, Math.cos(a) * radius);
  }
  return ring;
}
function facadeGroup(root, facade, name) {
  const group = new THREE.Group(); group.name = name; group.position.set(facade.x, 0, facade.z); group.rotation.y = facade.ry; root.add(group); return group;
}
function stageFaceGroup(root, apothem, angle, name) {
  const group = new THREE.Group(); group.name = name;
  group.position.set(Math.sin(angle) * (apothem + .025), 0, Math.cos(angle) * (apothem + .025)); group.rotation.y = angle; root.add(group); return group;
}

function brickTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#8d604d'; ctx.fillRect(0, 0, 512, 512);
  const brickW = 96, brickH = 32;
  for (let row = -1; row < 17; row += 1) for (let col = -1; col < 7; col += 1) {
    const x = col * brickW + (row % 2 ? brickW * .5 : 0), y = row * brickH;
    const variation = Math.sin(row * 91.7 + col * 37.1) * .5 + .5, light = 103 + Math.floor(variation * 30);
    ctx.fillStyle = `rgb(${light + 38},${light - 4},${light - 24})`; ctx.fillRect(x + 1.5, y + 1.5, brickW - 3, brickH - 3);
    ctx.fillStyle = 'rgba(255,220,185,.08)'; ctx.fillRect(x + 3, y + 3, brickW - 6, 2);
    ctx.fillStyle = 'rgba(72,34,25,.09)'; ctx.fillRect(x + 3, y + brickH - 5, brickW - 6, 2);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 8; return texture;
}
function clockTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#17282a'; ctx.fillRect(0, 0, 512, 512);
  ctx.translate(256, 256); ctx.strokeStyle = '#d9ddd0'; ctx.fillStyle = '#e3e4d7'; ctx.lineCap = 'round';
  for (let i = 0; i < 60; i += 1) {
    const a = i / 60 * Math.PI * 2, major = i % 5 === 0, r0 = major ? 211 : 222, r1 = 235;
    ctx.lineWidth = major ? 5 : 2; ctx.beginPath(); ctx.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); ctx.lineTo(Math.sin(a) * r1, -Math.cos(a) * r1); ctx.stroke();
  }
  const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  ctx.font = '600 39px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 12; i += 1) { const a = i / 12 * Math.PI * 2; ctx.fillText(roman[i], Math.sin(a) * 172, -Math.cos(a) * 172); }
  const hand = (angle, length, width) => { ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(-Math.sin(angle) * 22, Math.cos(angle) * 22); ctx.lineTo(Math.sin(angle) * length, -Math.cos(angle) * length); ctx.stroke(); };
  hand((10 + 10 / 60) / 12 * Math.PI * 2, 112, 13); hand(10 / 60 * Math.PI * 2, 158, 9);
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; return texture;
}
function waterTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#173b45'; ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 130; i += 1) {
    const y = (i * 73.17) % 512, x = (i * 41.31) % 256, width = 12 + (i * 17 % 54);
    ctx.strokeStyle = `rgba(170,215,220,${.025 + (i % 5) * .012})`; ctx.lineWidth = 1 + i % 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + width * .3, y - 2, x + width * .7, y + 2, x + width, y); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1.2, 3.5); texture.anisotropy = 8; return texture;
}

function rectangularWindow(glazing, granite, timber, x, y, width, height) {
  box(glazing, [x, y, .095], [width, height, .11]);
  for (const side of [-1, 1]) box(granite, [x + side * (width * .5 + .12), y, .12], [.24, height + .42, .22]);
  for (const side of [-1, 1]) box(granite, [x, y + side * (height * .5 + .12), .12], [width + .48, .24, .22]);
  for (const dx of [-width / 6, width / 6]) box(timber, [x + dx, y, .18], [.045, height, .055]);
  box(timber, [x, y + .1, .18], [width, .05, .055]);
}
function pediment(parts, x, y, width) {
  const z0 = .09, z1 = .27, positions = [
    x - width * .5, y, z0, x, y + .62, z0, x + width * .5, y, z0,
    x - width * .5, y, z1, x, y + .62, z1, x + width * .5, y, z1,
  ], indices = [0, 1, 2, 5, 4, 3, 0, 2, 5, 0, 5, 3, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2];
  parts.push(geometry(positions, indices, [0, 0, .5, 1, 1, 0, 0, 0, .5, 1, 1, 0]));
}
function archedShape(width, height) {
  const r = width * .5, straight = height - r, shape = new THREE.Shape();
  shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, straight); shape.absarc(0, straight, r, 0, Math.PI, false); shape.lineTo(-r, 0); shape.closePath(); return shape;
}
function archedPanel(width, height, x, y, z) {
  const g = new THREE.ShapeGeometry(archedShape(width, height), 18); g.translate(x, y, z); return g;
}
function diamondPanel(width, x, y, z) {
  const g = new THREE.PlaneGeometry(width, width); g.rotateZ(Math.PI / 4); g.translate(x, y, z); return g;
}

function buildMainFacades(root, materials) {
  let entrance = null;
  for (const facade of CLOCK_TOWER_FACADES) {
    const group = facadeGroup(root, facade, facade.entrance ? 'Clock Tower real node 6980052362 granite pediment main entrance' : `Clock Tower logical facade ${facade.index}`);
    if (facade.entrance) entrance = group;
    const graniteA = [], graniteB = [], cornice = [], dentils = [], glazing = [], timber = [], uplights = [];
    for (let course = 0; course < 27; course += 1) {
      const y = .82 + course * 1.22 + .59, target = course % 2 ? graniteA : graniteB;
      for (const side of [-1, 1]) box(target, [side * (facade.length * .5 - .42), y, .055], [.84, 1.195, .17]);
    }
    for (const [y, h, depth] of [[32.96, .2, .25], [33.28, .19, .34], [33.6, .27, .43], [33.91, .2, .5]]) {
      box(cornice, [0, y, depth * .35], [facade.length + .28, h, depth]);
    }
    for (let x = -facade.length * .5 + .35; x < facade.length * .5 - .2; x += .48) box(dentils, [x, 32.69, .19], [.2, .25, .31]);
    const rim = new THREE.CylinderGeometry(1.52, 1.52, .17, 48); rim.rotateX(Math.PI / 2); rim.translate(0, 28.45, .15); cornice.push(rim);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(1.275, 48), materials.clock); clock.name = `Clock Tower analog Roman-numeral clock face ${facade.index + 1} of 4`;
    clock.position.set(0, 28.45, .245); group.add(clock);
    for (const x of [-.62, 0, .62]) rectangularWindow(glazing, cornice, timber, x, 31.3, .39, 1.28);
    if (facade.windowed) {
      for (const y of [8.35, 14.75, 21.15]) rectangularWindow(glazing, cornice, timber, 0, y, 1.05, 2.35);
      rectangularWindow(glazing, cornice, timber, 0, 2.62, 1.28, 3.55);
      pediment(cornice, 0, 4.66, 1.95);
      if (facade.entrance) {
        box(timber, [0, 2.45, .19], [.065, 3.2, .07]);
        box(cornice, [0, .09, .42], [2.05, .18, .85]);
      }
    }
    box(uplights, [0, .16, .68], [.3, .25, .32]);
    merged(group, graniteA, materials.graniteA, 'Clock Tower alternating dressed-granite corner quoins');
    merged(group, graniteB, materials.graniteB, 'Clock Tower subtly varied granite courses');
    merged(group, cornice, materials.graniteA, 'Clock Tower classical cornices, window surrounds, pediment and clock rim');
    merged(group, dentils, materials.graniteB, 'Clock Tower small classical cornice dentils');
    merged(group, glazing, materials.glass, 'Clock Tower dark rectangular wooden-framed glazing', false);
    merged(group, timber, materials.timber, 'Clock Tower dark timber window mullions and entrance meeting stile');
    merged(group, uplights, materials.warmLight, 'Clock Tower restrained warm facade uplight fixture', false);
  }
  return entrance;
}

function buildOctagonalTurret(root, materials) {
  const theta = CLOCK_TOWER_FACADES[0].ry;
  const lowerRing = octagonRing(2.55, theta), upperRing = octagonRing(2.05, theta);
  const lower = new THREE.Mesh(wallGeometry(lowerRing, CLOCK_TOWER_MAIN_CORNICE_HEIGHT, CLOCK_TOWER_LOWER_TURRET_TOP), materials.brick);
  lower.name = 'Clock Tower first storey of official two-storey octagonal turret'; lower.castShadow = lower.receiveShadow = true; root.add(lower);
  const upper = new THREE.Mesh(wallGeometry(upperRing, CLOCK_TOWER_LOWER_TURRET_TOP, CLOCK_TOWER_BELFRY_TOP), materials.brick);
  upper.name = 'Clock Tower octagonal open belfry second storey'; upper.castShadow = upper.receiveShadow = true; root.add(upper);
  const bands = [], columns = [];
  for (const [ring, y0, y1] of [
    [octagonRing(2.72, theta), 33.92, 34.18], [octagonRing(2.67, theta), 36.86, 37.22],
    [octagonRing(2.22, theta), 37.02, 37.3], [octagonRing(2.24, theta), 40.72, 41.12],
    [octagonRing(1.94, theta), 40.98, 41.24],
  ]) { bands.push(wallGeometry(ring, y0, y1)); bands.push(roofGeometry(ring, y1)); }
  for (let face = 0; face < 8; face += 1) {
    const angle = theta + face * Math.PI / 4;
    const lowerFace = stageFaceGroup(root, 2.55, angle, `Clock Tower lower octagonal turret face ${face + 1}`);
    const upperFace = stageFaceGroup(root, 2.05, angle, `Clock Tower belfry arched opening ${face + 1}`);
    if (face % 2 === 0) {
      const dg = [], df = [], ss = [];
      dg.push(diamondPanel(.54, 0, 35.45, .12)); df.push(diamondPanel(.86, 0, 35.45, .08));
      for (const side of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 2.18, 34.08, .16), new THREE.Vector3(side * 1.92, 34.72, .18),
          new THREE.Vector3(side * 2.13, 35.34, .18), new THREE.Vector3(side * 1.76, 36.15, .17),
          new THREE.Vector3(side * 1.62, 36.91, .15),
        ]);
        ss.push(new THREE.TubeGeometry(curve, 18, .13, 7, false));
      }
      // These parts are already in face-local coordinates; merge within their rotated facade groups.
      merged(lowerFace, dg, materials.belfryVoid, 'Clock Tower diamond-pattern dark window', false);
      merged(lowerFace, df, materials.graniteA, 'Clock Tower granite diamond-window surround');
      merged(lowerFace, ss, materials.graniteA, 'Clock Tower paired white classical scroll buttresses');
    }
    const av = [], af = [], bal = [];
    av.push(archedPanel(1.02, 2.2, 0, 37.65, .12)); af.push(archedPanel(1.34, 2.52, 0, 37.49, .075));
    for (const x of [-.34, 0, .34]) box(bal, [x, 38.15, .18], [.045, .95, .055]);
    for (const y of [37.75, 38.15, 38.58]) box(bal, [0, y, .18], [1.0, .045, .055]);
    merged(upperFace, av, materials.belfryVoid, 'Clock Tower dark arched belfry opening', false);
    merged(upperFace, af, materials.graniteA, 'Clock Tower pale arched belfry surround');
    merged(upperFace, bal, materials.timber, 'Clock Tower belfry balustrade bars');
  }
  const vertexRadius = 2.05 / Math.cos(Math.PI / 8) + .045;
  for (let i = 0; i < 8; i += 1) {
    const a = theta - Math.PI / 8 + i * Math.PI / 4, x = Math.sin(a) * vertexRadius, z = Math.cos(a) * vertexRadius;
    cylinder(columns, [x, 39.02, z], .115, 3.36, 12);
    for (const y of [37.42, 40.62]) cylinder(columns, [x, y, z], .19, .22, 12);
  }
  merged(root, bands, materials.graniteA, 'Clock Tower white octagonal entablatures and concrete dome drum');
  merged(root, columns, materials.graniteA, 'Clock Tower eight white belfry columns with bases and capitals');
  const dome = new THREE.SphereGeometry(2.16, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, (CLOCK_TOWER_HEIGHT - CLOCK_TOWER_BELFRY_TOP) / 2.16, 1); dome.translate(0, CLOCK_TOWER_BELFRY_TOP, 0);
  const domeMesh = new THREE.Mesh(dome, materials.dome); domeMesh.name = 'Clock Tower official 44 m concrete domed crown'; domeMesh.castShadow = domeMesh.receiveShadow = true; root.add(domeMesh);
  const mast = [], legs = 3, levels = 7;
  const mastPoint = (leg, y) => {
    const t = (y - CLOCK_TOWER_HEIGHT) / 4.2, r = .2 * (1 - t) + .045 * t, a = leg / legs * Math.PI * 2;
    return [Math.sin(a) * r, y, Math.cos(a) * r];
  };
  for (let leg = 0; leg < legs; leg += 1) beam(mast, mastPoint(leg, 44), mastPoint(leg, 48.2), .035, .035);
  for (let level = 0; level < levels; level += 1) {
    const y0 = 44 + level * .6, y1 = Math.min(48.2, y0 + .6);
    for (let leg = 0; leg < legs; leg += 1) {
      beam(mast, mastPoint(leg, y0), mastPoint((leg + 1) % legs, y0), .026, .026);
      beam(mast, mastPoint(leg, y0), mastPoint((leg + 1) % legs, y1), .022, .022);
    }
  }
  cylinder(mast, [0, 49.6, 0], .032, 2.8, 8, .018);
  merged(root, mast, materials.mast, 'Clock Tower 7 m lightning rod and slender three-leg steel lattice support');
}

function palmLeaves(crown, seed) {
  const positions = [], spines = [];
  for (let frond = 0; frond < 12; frond += 1) {
    const angle = frond / 12 * Math.PI * 2 + seed * .37, dx = Math.cos(angle), dz = Math.sin(angle), px = -dz, pz = dx;
    const length = 3.05 + .32 * Math.sin(seed * 4.1 + frond * 2.3);
    const at = (t) => [crown[0] + dx * length * t, crown[1] + Math.sin(t * Math.PI) * .62 - t * 1.02, crown[2] + dz * length * t];
    const curve = new THREE.CatmullRomCurve3([0, .25, .5, .75, 1].map((t) => new THREE.Vector3(...at(t))));
    spines.push(new THREE.TubeGeometry(curve, 10, .025, 5, false));
    for (let leaflet = 1; leaflet <= 11; leaflet += 1) {
      const t = leaflet / 13, c = at(t), leafletLength = (.48 + .62 * Math.sin(t * Math.PI)) * (1 - t * .2);
      for (const side of [-1, 1]) {
        const tip = [c[0] + px * side * leafletLength + dx * .24, c[1] - .38 - t * .22, c[2] + pz * side * leafletLength + dz * .24];
        const a = [c[0] - dx * .065, c[1], c[2] - dz * .065], b = [c[0] + dx * .065, c[1], c[2] + dz * .065];
        const c0 = [tip[0] + dx * .012, tip[1], tip[2] + dz * .012], d = [tip[0] - dx * .012, tip[1], tip[2] - dz * .012];
        positions.push(...a, ...b, ...c0, ...a, ...c0, ...d);
      }
    }
  }
  return { leaves: geometry(positions), spines };
}

function buildFountainGarden(root, materials, colliders, base) {
  const f = CLOCK_TOWER_FACADES[3], garden = new THREE.Group(); garden.name = 'Clock Tower photo-directed southwest reflecting pool and palm garden';
  garden.position.set(f.x, 0, f.z); garden.rotation.y = f.ry; root.add(garden);
  const apron = [], basin = [], coping = [], jets = [], nozzles = [];
  const sideWidth = (CLOCK_TOWER_APRON_WIDTH - CLOCK_TOWER_POOL_WIDTH) * .5;
  for (const side of [-1, 1]) box(apron, [side * (CLOCK_TOWER_POOL_WIDTH * .5 + sideWidth * .5), -.02, CLOCK_TOWER_APRON_LENGTH * .5], [sideWidth, .2, CLOCK_TOWER_APRON_LENGTH]);
  box(apron, [0, -.02, CLOCK_TOWER_POOL_OFFSET * .5], [CLOCK_TOWER_POOL_WIDTH, .2, CLOCK_TOWER_POOL_OFFSET]);
  box(basin, [0, -.35, CLOCK_TOWER_POOL_OFFSET + CLOCK_TOWER_POOL_LENGTH * .5], [CLOCK_TOWER_POOL_WIDTH, .22, CLOCK_TOWER_POOL_LENGTH]);
  const poolCentre = CLOCK_TOWER_POOL_OFFSET + CLOCK_TOWER_POOL_LENGTH * .5;
  for (const side of [-1, 1]) box(coping, [side * (CLOCK_TOWER_POOL_WIDTH * .5 - .1), .09, poolCentre], [.2, .27, CLOCK_TOWER_POOL_LENGTH]);
  for (const z of [CLOCK_TOWER_POOL_OFFSET + .1, CLOCK_TOWER_POOL_OFFSET + CLOCK_TOWER_POOL_LENGTH - .1]) box(coping, [0, .09, z], [CLOCK_TOWER_POOL_WIDTH, .27, .2]);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(CLOCK_TOWER_POOL_WIDTH - .38, CLOCK_TOWER_POOL_LENGTH - .38), materials.water);
  water.name = 'Clock Tower long narrow dark reflecting pool with subtle procedural ripples'; water.rotation.x = -Math.PI / 2;
  water.position.set(0, .035, poolCentre); water.receiveShadow = true; garden.add(water);
  const jetHeights = [.82, 1.02, .88, 1.08, .78];
  for (const jet of CLOCK_TOWER_JETS) {
    const z = jet.distance, h = jetHeights[jet.index];
    cylinder(nozzles, [0, 0, z], .13, .12, 12);
    cylinder(jets, [0, -.02 + h * .5, z], .075, h, 10, .022);
    const foam = new THREE.RingGeometry(.12, .34, 24); foam.rotateX(-Math.PI / 2); foam.translate(0, .047, z); jets.push(foam);
    for (let direction = 0; direction < 4; direction += 1) {
      const a = direction * Math.PI * .5 + jet.index * .4, dx = Math.cos(a), dz = Math.sin(a);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, h * .72, z), new THREE.Vector3(dx * .19, h * .83, z + dz * .19),
        new THREE.Vector3(dx * .34, h * .46, z + dz * .34), new THREE.Vector3(dx * .42, .045, z + dz * .42),
      ]);
      jets.push(new THREE.TubeGeometry(curve, 8, .018, 5, false));
    }
  }
  merged(garden, apron, materials.paving, 'Clock Tower photo-directed stone pool apron; no invented OSM fountain footprint');
  merged(garden, basin, materials.basin, 'Clock Tower recessed rectangular fountain basin');
  merged(garden, coping, materials.coping, 'Clock Tower narrow dark granite pool coping');
  merged(garden, nozzles, materials.mast, 'Clock Tower five fountain jet nozzles', false);
  merged(garden, jets, materials.jet, 'Clock Tower five central water columns with arcing spray and foam rings', false);
  const toTower = (x, z) => ({ x: f.x + f.nz * x + f.nx * z, z: f.z - f.nx * x + f.nz * z });
  for (const side of [-1, 1]) {
    const p = toTower(side * CLOCK_TOWER_POOL_WIDTH * .5, poolCentre);
    colliders.push(harbourCityLocalCollider(CLOCK_TOWER_SITE, p.x, p.z, .25, CLOCK_TOWER_POOL_LENGTH, base - .2, base + .25, CLOCK_TOWER_SITE.ry + f.ry));
  }
  for (const z of [CLOCK_TOWER_POOL_OFFSET, CLOCK_TOWER_POOL_OFFSET + CLOCK_TOWER_POOL_LENGTH]) {
    const p = toTower(0, z); colliders.push(harbourCityLocalCollider(CLOCK_TOWER_SITE, p.x, p.z, CLOCK_TOWER_POOL_WIDTH, .25, base - .2, base + .25, CLOCK_TOWER_SITE.ry + f.ry));
  }

  const planters = [], soil = [], trunks = [], trunkRings = [], spines = [], leafGeometries = [];
  for (const palm of CLOCK_TOWER_PALMS) {
    const ground = rawHongKongTerrainHeight(palm.worldX, palm.worldZ), y = ground - base;
    const height = 8.9 + (palm.index % 3) * .55 + (palm.side > 0 ? .3 : 0), crown = [palm.x, y + .2 + height, palm.z];
    cylinder(planters, [palm.x, y + .12, palm.z], .62, .24, 18);
    cylinder(soil, [palm.x, y + .245, palm.z], .51, .035, 18);
    cylinder(trunks, [palm.x, y + .2 + height * .5, palm.z], .19, height, 12, .115);
    for (let ring = 1; ring < 13; ring += 1) {
      const t = ring / 13; cylinder(trunkRings, [palm.x, y + .2 + height * t, palm.z], .19 * (1 - t * .34), .035, 12);
    }
    const crownGeometry = palmLeaves(crown, palm.index + (palm.side > 0 ? 7 : 0)); leafGeometries.push(crownGeometry.leaves); spines.push(...crownGeometry.spines);
    colliders.push(harbourCityLocalCollider(CLOCK_TOWER_SITE, palm.x, palm.z, 1.24, 1.24, ground, ground + .26));
    colliders.push(harbourCityLocalCollider(CLOCK_TOWER_SITE, palm.x, palm.z, .4, .4, ground, ground + height + .3));
  }
  merged(root, planters, materials.coping, 'Clock Tower ten low circular palm-tree planters');
  merged(root, soil, materials.soil, 'Clock Tower palm planting soil', false);
  merged(root, trunks, materials.trunk, 'Clock Tower five pairs of tall slender palm trunks');
  merged(root, trunkRings, materials.trunkRing, 'Clock Tower fine palm trunk growth rings');
  merged(root, spines, materials.trunkRing, 'Clock Tower curved palm frond spines', false);
  const leaves = merged(root, leafGeometries, materials.leaves, 'Clock Tower individual pinnate palm leaflets', false);
  return { garden, water, leaves };
}

export function buildClockTower(scene, { groundOffset } = {}) {
  const site = CLOCK_TOWER_SITE, base = groundOffset ?? clockTowerPadHeight(), root = new THREE.Group();
  root.name = 'Former Kowloon-Canton Railway Clock Tower — exact OSM monument and fountain garden';
  root.position.set(site.x, base, site.z); root.rotation.y = site.ry;
  const brick = new THREE.MeshStandardMaterial({ map: brickTexture(), roughness: .88, metalness: .01, side: THREE.DoubleSide });
  brick.emissiveNode = color(1, .48, .19).mul(nightAmount()).mul(.065);
  const graniteA = new THREE.MeshStandardMaterial({ color: 0xc4bba6, roughness: .83, metalness: .02, side: THREE.DoubleSide });
  const graniteB = new THREE.MeshStandardMaterial({ color: 0xb4aa97, roughness: .87, metalness: .02, side: THREE.DoubleSide });
  for (const material of [graniteA, graniteB]) material.emissiveNode = color(1, .67, .34).mul(nightAmount()).mul(.075);
  const dome = new THREE.MeshStandardMaterial({ color: 0xd6d1c2, roughness: .77, metalness: .02, side: THREE.DoubleSide });
  dome.emissiveNode = color(1, .72, .42).mul(nightAmount()).mul(.055);
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2929, roughness: .36, metalness: .16 });
  glass.emissiveNode = color(1, .67, .32).mul(nightAmount()).mul(.14);
  const belfryVoid = new THREE.MeshStandardMaterial({ color: 0x172220, roughness: .82, side: THREE.DoubleSide });
  belfryVoid.emissiveNode = color(1, .57, .23).mul(nightAmount()).mul(.12);
  const clock = new THREE.MeshStandardMaterial({ map: clockTexture(), roughness: .53, metalness: .08 });
  clock.emissiveNode = color(1, .86, .57).mul(nightAmount()).mul(.07);
  const warmLight = new THREE.MeshStandardMaterial({ color: 0xffdfa1, roughness: .42 });
  warmLight.emissiveNode = color(1, .59, .23).mul(nightAmount()).mul(1.7);
  const waterMap = waterTexture();
  const water = new THREE.MeshPhysicalMaterial({ map: waterMap, color: 0x69898c, roughness: .38, metalness: 0, ior: 1.33, specularIntensity: 0, transparent: true, opacity: .94, side: THREE.DoubleSide });
  water.emissiveNode = color(.2, .38, .44).mul(nightAmount()).mul(.04);
  const jet = new THREE.MeshStandardMaterial({ color: 0xc4e2df, roughness: .2, metalness: .06, transparent: true, opacity: .72, side: THREE.DoubleSide, depthWrite: false });
  jet.emissiveNode = color(.55, .8, .88).mul(nightAmount()).mul(.42);
  const materials = {
    brick, graniteA, graniteB, dome, glass, belfryVoid, clock, warmLight, water, jet,
    timber: new THREE.MeshStandardMaterial({ color: 0x292b25, roughness: .68, metalness: .08 }),
    mast: new THREE.MeshStandardMaterial({ color: 0x3e4947, roughness: .4, metalness: .72 }),
    paving: new THREE.MeshStandardMaterial({ color: 0x928b7e, roughness: .95, metalness: .01 }),
    basin: new THREE.MeshStandardMaterial({ color: 0x263b3c, roughness: .78, metalness: .08 }),
    coping: new THREE.MeshStandardMaterial({ color: 0x6d7069, roughness: .84, metalness: .04 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x332c22, roughness: 1 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x827b68, roughness: .96 }),
    trunkRing: new THREE.MeshStandardMaterial({ color: 0x655f50, roughness: .96 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x315f39, roughness: .9, side: THREE.DoubleSide }),
  };

  const plinthRing = scaledRing(site.localRing, 1.075), plinth = [];
  plinth.push(wallGeometry(plinthRing, 0, .72)); plinth.push(roofGeometry(plinthRing, .72));
  merged(root, plinth, graniteB, 'Clock Tower dressed-granite plinth around the exact OSM shaft');
  const shaft = new THREE.Mesh(wallGeometry(site.localRing, .65, CLOCK_TOWER_MAIN_CORNICE_HEIGHT), brick);
  shaft.name = 'Clock Tower exact OSM six-storey red-brick square main shaft'; shaft.castShadow = shaft.receiveShadow = true; root.add(shaft);
  const mainRoof = new THREE.Mesh(roofGeometry(site.localRing, CLOCK_TOWER_MAIN_CORNICE_HEIGHT), graniteA);
  mainRoof.name = 'Clock Tower flat main-tower platform below octagonal turret'; mainRoof.receiveShadow = true; root.add(mainRoof);
  const entrance = buildMainFacades(root, materials);
  buildOctagonalTurret(root, materials);
  const colliders = harbourCityRingColliders(site, base, base + CLOCK_TOWER_MAIN_CORNICE_HEIGHT, .34);
  colliders.push(harbourCityLocalCollider(site, 0, 0, 5.5, 5.5, base + CLOCK_TOWER_MAIN_CORNICE_HEIGHT, base + CLOCK_TOWER_HEIGHT));
  const fountain = buildFountainGarden(root, materials, colliders, base);

  scene.add(root);
  const landmark = { id: 'tsim-sha-tsui-clock-tower', name: site.name, position: { x: site.x, y: base, z: site.z }, radius: 55, height: CLOCK_TOWER_TOTAL_HEIGHT };
  return {
    root, entrance, garden: fountain.garden, water: fountain.water, colliders, landmarks: [landmark], groundOffset: base,
    site, gardenSite: CLOCK_TOWER_GARDEN_SITE,
    roads: [...clockTowerRoadRecords(site), ...clockTowerRoadRecords(CLOCK_TOWER_GARDEN_SITE)],
    stats: {
      clockTowerSourceVertices: 5, clockTowerSourceNodeReferences: 6, clockTowerRingArea: site.ringArea,
      clockTowerHeight: CLOCK_TOWER_HEIGHT, clockTowerLightningRodHeight: CLOCK_TOWER_LIGHTNING_ROD_HEIGHT,
      clockTowerTotalHeight: CLOCK_TOWER_TOTAL_HEIGHT, clockTowerMainLevels: CLOCK_TOWER_MAIN_LEVELS,
      clockTowerTurretLevels: CLOCK_TOWER_TURRET_LEVELS, clockTowerClockFaces: CLOCK_TOWER_CLOCK_FACES,
      clockTowerFountainJets: CLOCK_TOWER_JETS.length, clockTowerPalmTrees: CLOCK_TOWER_PALMS.length,
      clockTowerPhotoDirectedPoolLength: CLOCK_TOWER_POOL_LENGTH, clockTowerRoadCrossings: 0,
    },
    groundHeightAt: (x, z, ground) => clockTowerTerrainHeightAt(x, z, ground, base),
    update(dt) { waterMap.offset.y = (waterMap.offset.y + dt * .006) % 1; },
  };
}
