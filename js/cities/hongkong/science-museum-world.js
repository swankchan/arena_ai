import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  SCIENCE_MUSEUM_SITE, SCIENCE_MUSEUM_PAD_HEIGHT, SCIENCE_MUSEUM_ROOF_HEIGHT,
  SCIENCE_MUSEUM_ATRIUM_TOWER_HEIGHT, SCIENCE_MUSEUM_ENERGY_MACHINE_HEIGHT,
  scienceMuseumTerrainHeightAt,
} from './science-museum-site.js';
import {
  harbourCityEdgeOutward, harbourCityLocalCollider,
} from './harbour-city-architecture.js';
import {
  merged, box, cylinder, beam, nightAmount,
} from './harbour-city-world-utils.js';

function addQuad(positions, indices, a, b, c, d) {
  const i = positions.length / 3;
  positions.push(...a, ...b, ...c, ...d);
  indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
}

function geometry(positions, indices = null) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (indices) g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export function buildScienceMuseum(scene, { groundOffset } = {}) {
  const site = SCIENCE_MUSEUM_SITE;
  const base = groundOffset ?? SCIENCE_MUSEUM_PAD_HEIGHT;
  const root = new THREE.Group();
  root.name = 'Hong Kong Science Museum — exact OSM ring with central glass atrium and 22m Energy Machine';
  root.position.set(site.x, base, site.z);
  root.rotation.y = site.ry;

  // Materials
  const salmonTile = new THREE.MeshStandardMaterial({
    color: 0xc4a494, roughness: 0.82, metalness: 0.04, side: THREE.DoubleSide,
  });
  salmonTile.emissiveNode = color(0.48, 0.38, 0.34).mul(nightAmount()).mul(0.02);

  const whiteGranite = new THREE.MeshStandardMaterial({
    color: 0xd8d4ce, roughness: 0.78, metalness: 0.06, side: THREE.DoubleSide,
  });

  const atriumGlass = new THREE.MeshStandardMaterial({
    color: 0x162c33, roughness: 0.16, metalness: 0.32, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  });
  atriumGlass.emissiveNode = color(1.0, 0.85, 0.52).mul(nightAmount()).mul(0.85);

  const spaceFrameMat = new THREE.MeshStandardMaterial({
    color: 0xdb2424, roughness: 0.42, metalness: 0.65, // Iconic red/crimson high-tech structural steel
  });
  spaceFrameMat.emissiveNode = color(1.0, 0.2, 0.15).mul(nightAmount()).mul(0.4);

  const steelTrussMat = new THREE.MeshStandardMaterial({
    color: 0xced4d9, roughness: 0.32, metalness: 0.85,
  });

  const kineticBallMat = new THREE.MeshStandardMaterial({
    color: 0xe6b022, roughness: 0.25, metalness: 0.92, // Gold / brass kinetic spheres
  });
  kineticBallMat.emissiveNode = color(1.0, 0.7, 0.1).mul(nightAmount()).mul(0.8);

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x7e7872, roughness: 0.94, metalness: 0.02, side: THREE.DoubleSide,
  });

  const skylightGlass = new THREE.MeshStandardMaterial({
    color: 0x1d3640, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.88, side: THREE.DoubleSide,
  });
  skylightGlass.emissiveNode = color(0.8, 0.9, 1.0).mul(nightAmount()).mul(0.5);

  const forecourtMat = new THREE.MeshStandardMaterial({
    color: 0x88837e, roughness: 0.88,
  });

  const localRing = site.localRing;
  const numEdges = localRing.length / 2 - 1;

  // 1. Solid Walls
  const wallPositions = [];
  const wallIndices = [];
  const accentBands = [];
  const fenestrations = [];
  const roofParts = [];
  const canopyParts = [];
  const forecourtParts = [];

  for (let edge = 0; edge < numEdges; edge++) {
    const i = edge * 2;
    const ax = localRing[i], az = localRing[i + 1];
    const bx = localRing[i + 2], bz = localRing[i + 3];
    const dx = bx - ax, dz = bz - az;
    const edgeLen = Math.hypot(dx, dz);
    if (edgeLen < 0.01) continue;

    const { nx, nz, ry } = harbourCityEdgeOutward(localRing, edge);
    const midX = (ax + bx) * 0.5, midZ = (az + bz) * 0.5;

    // Extrude main gallery walls
    addQuad(
      wallPositions, wallIndices,
      [ax, 0, az], [bx, 0, bz],
      [bx, SCIENCE_MUSEUM_ROOF_HEIGHT, bz], [ax, SCIENCE_MUSEUM_ROOF_HEIGHT, az],
    );

    // Horizontal white granite accent bands and cornices
    for (const yh of [4.8, 10.2, 15.6, SCIENCE_MUSEUM_ROOF_HEIGHT]) {
      box(accentBands, [midX + nx * 0.06, yh, midZ + nz * 0.06], [edgeLen + 0.1, 0.45, 0.3], ry);
    }

    // Punched vertical slit windows along galleries
    const numWindows = Math.max(1, Math.floor(edgeLen / 6.0));
    for (let w = 1; w <= numWindows; w++) {
      const u = w / (numWindows + 1);
      const wx = ax + dx * u, wz = az + dz * u;
      for (const wy of [7.5, 12.8]) {
        box(fenestrations, [wx + nx * 0.08, wy, wz + nz * 0.08], [1.4, 2.2, 0.18], ry);
      }
    }
  }

  // 2. Main Roof Slab
  const contour = [];
  for (let i = 0; i < localRing.length - 2; i += 2) {
    contour.push(new THREE.Vector2(localRing[i], localRing[i + 1]));
  }
  const roofTris = THREE.ShapeUtils.triangulateShape(contour, []);
  const roofPositions = [];
  const roofIndices = [];
  for (let i = 0; i < localRing.length - 2; i += 2) {
    roofPositions.push(localRing[i], SCIENCE_MUSEUM_ROOF_HEIGHT, localRing[i + 1]);
  }
  for (const tri of roofTris) {
    roofIndices.push(tri[0], tri[2], tri[1]);
  }
  const mainRoofMesh = new THREE.Mesh(geometry(roofPositions, roofIndices), roofMat);
  mainRoofMesh.name = 'Hong Kong Science Museum — main gallery roof';
  mainRoofMesh.receiveShadow = true;
  root.add(mainRoofMesh);

  // 3. Central Glass Atrium Tower (housing the Energy Machine)
  // Positioned centrally in local coordinates: roughly (0, 0)
  const atriumW = 18.0, atriumD = 18.0;
  const atriumH = SCIENCE_MUSEUM_ATRIUM_TOWER_HEIGHT;
  const atriumMidY = atriumH * 0.5;

  const atriumPanes = [];
  const atriumFrames = [];

  // 4 glazed walls of the central tower
  for (const [side, [gx, gz, angle, len]] of Object.entries({
    south: [0, atriumD * 0.5, 0, atriumW],
    north: [0, -atriumD * 0.5, Math.PI, atriumW],
    east: [atriumW * 0.5, 0, Math.PI * 0.5, atriumD],
    west: [-atriumW * 0.5, 0, -Math.PI * 0.5, atriumD],
  })) {
    const pane = new THREE.PlaneGeometry(len, atriumH - 0.2);
    pane.rotateY(angle);
    pane.translate(gx, atriumMidY, gz);
    atriumPanes.push(pane);

    // Vertical structural mullions
    for (let m = -3; m <= 3; m++) {
      const off = (m / 3) * (len * 0.5 - 0.2);
      const mx = angle === 0 || angle === Math.PI ? off : gx;
      const mz = angle === 0 || angle === Math.PI ? gz : off;
      box(atriumFrames, [mx, atriumMidY, mz], [0.22, atriumH, 0.22], angle);
    }
  }

  // Atrium roof and pyramid skylight atop the atrium tower
  box(roofParts, [0, atriumH + 0.3, 0], [atriumW + 0.8, 0.6, atriumD + 0.8]);
  const skylights = [];
  // Pyramid atop atrium
  const pyr = new THREE.ConeGeometry(atriumW * 0.45, 4.2, 4);
  pyr.rotateY(Math.PI * 0.25);
  pyr.translate(0, atriumH + 2.7, 0);
  skylights.push(pyr);

  // 4. Four Gallery Pyramid Skylights on Main Roof
  for (const [sx, sz] of [[-22, 6], [22, -6], [-20, -8], [20, 8]]) {
    const kPyr = new THREE.ConeGeometry(3.6, 2.4, 4);
    kPyr.rotateY(Math.PI * 0.25);
    kPyr.translate(sx, SCIENCE_MUSEUM_ROOF_HEIGHT + 1.2, sz);
    skylights.push(kPyr);
    // Base curb
    box(roofParts, [sx, SCIENCE_MUSEUM_ROOF_HEIGHT + 0.2, sz], [5.4, 0.4, 5.4]);
  }

  // 5. The Energy Machine (能量穿梭機)
  // Located inside the atrium, 22 metres tall!
  // Twin space-frame towers with diagonal lattice, rolling ball chutes and loops
  const energyTowers = [];
  const energyChutes = [];
  const kineticBalls = [];

  const emH = SCIENCE_MUSEUM_ENERGY_MACHINE_HEIGHT;
  // Left tower & Right tower
  for (const tx of [-4.2, 4.2]) {
    // 4 vertical corner columns
    for (const [cx, cz] of [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]]) {
      cylinder(energyTowers, [tx + cx, emH * 0.5, cz], 0.12, emH, 8);
    }
    // Horizontal and diagonal cross braces every 2.5 m
    for (let y = 1.2; y <= emH; y += 2.4) {
      box(energyTowers, [tx, y, 0], [2.4, 0.12, 2.4]);
      // Diagonals
      beam(energyTowers, [tx - 1.2, y - 2.4, -1.2], [tx + 1.2, y, 1.2], 0.08, 0.08);
      beam(energyTowers, [tx + 1.2, y - 2.4, -1.2], [tx - 1.2, y, 1.2], 0.08, 0.08);
    }
    // Top machinery housing
    box(energyTowers, [tx, emH + 0.4, 0], [2.8, 0.8, 2.8]);
  }

  // Overhead connecting bridge between the two towers
  box(energyTowers, [0, emH - 1.2, 0], [8.4, 0.25, 1.6]);
  beam(energyTowers, [-4.2, emH, 0], [4.2, emH - 3.2, 0], 0.14, 0.14);

  // Winding rolling-ball tracks / chutes spiralling down
  for (let s = 0; s < 12; s++) {
    const t = s / 12;
    const angle = t * Math.PI * 4.0;
    const r = 3.6 + Math.sin(s * 1.5) * 1.2;
    const cy = emH * (1.0 - t * 0.85) + 0.8;
    const bx = Math.cos(angle) * r;
    const bz = Math.sin(angle) * r;

    // Track segments
    const nextAngle = (s + 1) / 12 * Math.PI * 4.0;
    const nextR = 3.6 + Math.sin((s + 1) * 1.5) * 1.2;
    const nextY = emH * (1.0 - (s + 1) / 12 * 0.85) + 0.8;
    beam(energyChutes, [bx, cy, bz], [Math.cos(nextAngle) * nextR, nextY, Math.sin(nextAngle) * nextR], 0.18, 0.1);

    // Glowing bowling balls travelling on the track
    if (s % 2 === 0) {
      cylinder(kineticBalls, [bx, cy + 0.32, bz], 0.28, 0.28, 10);
    }
  }

  // 6. Science Museum Entrance Canopy & Forecourt
  // Facing Science Museum Road (south-east, near edge 1)
  const canopyX = 14.0, canopyZ = 12.0;
  box(canopyParts, [canopyX, 4.6, canopyZ], [14.0, 0.4, 8.0], 0.35);
  for (const [colX, colZ] of [[canopyX - 5.0, canopyZ + 2.5], [canopyX + 5.0, canopyZ + 2.5]]) {
    cylinder(energyTowers, [colX, 2.3, colZ], 0.24, 4.6, 12);
  }

  // Forecourt steps and interactive science exhibit (parabolic acoustic dishes)
  box(forecourtParts, [canopyX, 0.2, canopyZ + 6.0], [22.0, 0.4, 12.0]);
  // Parabolic dish 1 & 2
  cylinder(forecourtParts, [canopyX - 6.0, 1.2, canopyZ + 8.0], 0.25, 1.6, 10); // pole
  cylinder(forecourtParts, [canopyX + 6.0, 1.2, canopyZ + 8.0], 0.25, 1.6, 10);
  const dish1 = new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
  dish1.rotateX(Math.PI * 0.45);
  dish1.translate(canopyX - 6.0, 2.0, canopyZ + 8.0);
  forecourtParts.push(dish1);
  const dish2 = new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
  dish2.rotateX(-Math.PI * 0.45);
  dish2.translate(canopyX + 6.0, 2.0, canopyZ + 8.0);
  forecourtParts.push(dish2);

  // Add all meshes to root
  const wallMesh = new THREE.Mesh(geometry(wallPositions, wallIndices), salmonTile);
  wallMesh.name = 'Hong Kong Science Museum — salmon and terracotta ceramic walls';
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  root.add(wallMesh);

  merged(root, accentBands, whiteGranite, 'Hong Kong Science Museum — white granite string courses and cornices');
  merged(root, fenestrations, atriumGlass, 'Hong Kong Science Museum — gallery windows', false);
  merged(root, atriumPanes, atriumGlass, 'Hong Kong Science Museum — central glass atrium tower glazing', false);
  merged(root, atriumFrames, steelTrussMat, 'Hong Kong Science Museum — atrium structural mullions');
  merged(root, skylights, skylightGlass, 'Hong Kong Science Museum — roof pyramid skylights', false);
  merged(root, roofParts, roofMat, 'Hong Kong Science Museum — roof equipment curbs and atrium roof');
  merged(root, energyTowers, spaceFrameMat, 'Hong Kong Science Museum — Energy Machine red steel towers');
  merged(root, energyChutes, steelTrussMat, 'Hong Kong Science Museum — Energy Machine ball chutes');
  merged(root, kineticBalls, kineticBallMat, 'Hong Kong Science Museum — Energy Machine rolling spheres', false);
  merged(root, canopyParts, spaceFrameMat, 'Hong Kong Science Museum — entrance red space-frame canopy');
  merged(root, forecourtParts, forecourtMat, 'Hong Kong Science Museum — forecourt plaza and acoustic dishes');

  scene.add(root);

  // Colliders
  const colliders = [];
  for (let edge = 0; edge < numEdges; edge++) {
    const i = edge * 2;
    const ax = localRing[i], az = localRing[i + 1];
    const bx = localRing[i + 2], bz = localRing[i + 3];
    const mx = (ax + bx) * 0.5, mz = (az + bz) * 0.5;
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    colliders.push(harbourCityLocalCollider(
      site, mx, mz, len, 1.2, base, base + SCIENCE_MUSEUM_ROOF_HEIGHT, site.ry + Math.atan2(-dz, dx),
    ));
  }
  // Central atrium tower collider
  colliders.push(harbourCityLocalCollider(
    site, 0, 0, atriumW, atriumD, base + SCIENCE_MUSEUM_ROOF_HEIGHT, base + atriumH, site.ry,
  ));

  const landmark = {
    id: 'hong-kong-science-museum',
    name: site.name,
    englishName: site.englishName,
    position: { x: site.x, y: base, z: site.z },
    radius: 65,
    height: atriumH + 4.2,
  };

  return {
    root,
    colliders,
    landmarks: [landmark],
    groundOffset: base,
    site,
    groundHeightAt(x, z, ground) { return scienceMuseumTerrainHeightAt(x, z, ground, base); },
    stats: {
      scienceMuseumVertices: numEdges,
      scienceMuseumRingArea: site.ringArea,
      scienceMuseumHeight: atriumH + 4.2,
      scienceMuseumLevels: 4,
      scienceMuseumPyramids: 4,
      scienceMuseumEnergyMachineHeight: SCIENCE_MUSEUM_ENERGY_MACHINE_HEIGHT,
      scienceMuseumColliders: colliders.length,
    },
  };
}
