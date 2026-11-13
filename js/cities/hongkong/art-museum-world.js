import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  ART_MUSEUM_SITE, ART_MUSEUM_PAD_HEIGHT, ART_MUSEUM_MAIN_ROOF_HEIGHT,
  ART_MUSEUM_TOP_BOX_HEIGHT, ART_MUSEUM_PLINTH_HEIGHT, artMuseumTerrainHeightAt,
} from './art-museum-site.js';
import {
  harbourCityEdgeOutward, harbourCityLocalCollider, harbourCityLocalToWorld,
} from './harbour-city-architecture.js';
import { rawHongKongTerrainHeight } from './terrain.js';
import {
  merged, box, cylinder, beam, point, ringFrame, nightAmount, store, quad, meshStore,
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

function pointInRing(ring, x, z) {
  let c = false;
  for (let i = 0, j = ring.length - 2; i + 1 < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c;
  }
  return c;
}

export function buildArtMuseum(scene, { groundOffset } = {}) {
  const site = ART_MUSEUM_SITE;
  const base = groundOffset ?? ART_MUSEUM_PAD_HEIGHT;
  const root = new THREE.Group();
  root.name = 'Hong Kong Museum of Art — exact OSM ring with 2019 wavy ceramic facade and panoramic Harbour Gallery';
  root.position.set(site.x, base, site.z);
  root.rotation.y = site.ry;

  // Materials
  const ceramicWall = new THREE.MeshStandardMaterial({
    color: 0xd4d0c7, roughness: 0.78, metalness: 0.04, side: THREE.DoubleSide,
  });
  ceramicWall.emissiveNode = color(0.42, 0.45, 0.52).mul(nightAmount()).mul(0.02);

  const wavyPanel = new THREE.MeshStandardMaterial({
    color: 0xdbd8d0, roughness: 0.72, metalness: 0.05, side: THREE.DoubleSide,
  });

  const glass = new THREE.MeshStandardMaterial({
    color: 0x182c33, roughness: 0.18, metalness: 0.35, transparent: true, opacity: 0.88, side: THREE.DoubleSide,
  });
  glass.emissiveNode = color(1.0, 0.78, 0.48).mul(nightAmount()).mul(0.65);

  const mullions = new THREE.MeshStandardMaterial({
    color: 0x2e3235, roughness: 0.35, metalness: 0.75,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x827d78, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide,
  });

  const warmLight = new THREE.MeshStandardMaterial({
    color: 0xffe6b8, roughness: 0.4,
  });
  warmLight.emissiveNode = color(1.0, 0.82, 0.45).mul(nightAmount()).mul(2.2);

  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0x8e8a84, roughness: 0.88,
  });

  const bronzeSculpture = new THREE.MeshStandardMaterial({
    color: 0x6e5238, roughness: 0.38, metalness: 0.82,
  });

  const chromeSculpture = new THREE.MeshStandardMaterial({
    color: 0xb5bcc2, roughness: 0.12, metalness: 0.92,
  });

  const foliage = new THREE.MeshStandardMaterial({
    color: 0x2b4f30, roughness: 0.85,
  });

  const localRing = site.localRing;
  const numEdges = localRing.length / 2 - 1;

  // 1. Solid Walls and 2019 Undulating Facade
  const wallPositions = [];
  const wallIndices = [];
  const wavyBoxes = [];
  const glassPanes = [];
  const frameParts = [];
  const roofParts = [];
  const canopyParts = [];
  const plazaParts = [];

  const harbourEdges = new Set([0, 1, 2, 3, 13, 14, 15]);
  const entranceEdges = new Set([10, 11, 12]);

  for (let edge = 0; edge < numEdges; edge++) {
    const i = edge * 2;
    const ax = localRing[i], az = localRing[i + 1];
    const bx = localRing[i + 2], bz = localRing[i + 3];
    const dx = bx - ax, dz = bz - az;
    const edgeLen = Math.hypot(dx, dz);
    if (edgeLen < 0.01) continue;

    const { nx, nz, ry } = harbourCityEdgeOutward(localRing, edge);
    const midX = (ax + bx) * 0.5, midZ = (az + bz) * 0.5;

    // Ground level to plinth
    const isGlazedPodium = harbourEdges.has(edge) || entranceEdges.has(edge);

    if (isGlazedPodium) {
      // Glazed ground & first floor
      const glassH = ART_MUSEUM_PLINTH_HEIGHT;
      const gPane = new THREE.PlaneGeometry(edgeLen * 0.98, glassH - 0.2);
      gPane.rotateY(ry);
      gPane.translate(midX + nx * 0.02, glassH * 0.5, midZ + nz * 0.02);
      glassPanes.push(gPane);

      // Mullions
      const numBays = Math.max(1, Math.ceil(edgeLen / 3.2));
      for (let b = 0; b <= numBays; b++) {
        const u = b / numBays;
        const px = ax + dx * u, pz = az + dz * u;
        box(frameParts, [px + nx * 0.05, glassH * 0.5, pz + nz * 0.05], [0.12, glassH, 0.16], ry);
      }
      // Top lintel / spandrel
      box(frameParts, [midX + nx * 0.05, glassH, midZ + nz * 0.05], [edgeLen, 0.22, 0.18], ry);
    } else {
      // Solid plinth
      addQuad(
        wallPositions, wallIndices,
        [ax, 0, az], [bx, 0, bz],
        [bx, ART_MUSEUM_PLINTH_HEIGHT, bz], [ax, ART_MUSEUM_PLINTH_HEIGHT, az],
      );
    }

    // Upper levels: Main gallery facade with 2019 wavy ceramic panels
    const upperH = ART_MUSEUM_MAIN_ROOF_HEIGHT - ART_MUSEUM_PLINTH_HEIGHT;
    const upperMidY = ART_MUSEUM_PLINTH_HEIGHT + upperH * 0.5;

    addQuad(
      wallPositions, wallIndices,
      [ax, ART_MUSEUM_PLINTH_HEIGHT, az], [bx, ART_MUSEUM_PLINTH_HEIGHT, bz],
      [bx, ART_MUSEUM_MAIN_ROOF_HEIGHT, bz], [ax, ART_MUSEUM_MAIN_ROOF_HEIGHT, az],
    );

    // Architectural wavy fins / bevelled facet panels
    const panelCount = Math.max(1, Math.round(edgeLen / 2.8));
    for (let p = 0; p < panelCount; p++) {
      const u = (p + 0.5) / panelCount;
      const px = ax + dx * u, pz = az + dz * u;
      const waveOut = Math.sin(p * 1.1) * 0.18 + 0.12;
      box(
        wavyBoxes,
        [px + nx * (waveOut + 0.08), upperMidY, pz + nz * (waveOut + 0.08)],
        [edgeLen / panelCount * 0.94, upperH - 0.4, 0.18],
        ry,
      );
    }

    // Parapet coping at main roof edge
    box(frameParts, [midX + nx * 0.02, ART_MUSEUM_MAIN_ROOF_HEIGHT + 0.25, midZ + nz * 0.02], [edgeLen + 0.1, 0.5, 0.4], ry);
  }

  // 2. Main Building Roof Slab
  // Triangulate localRing to form the roof
  const contour = [];
  for (let i = 0; i < localRing.length - 2; i += 2) {
    contour.push(new THREE.Vector2(localRing[i], localRing[i + 1]));
  }
  const roofTris = THREE.ShapeUtils.triangulateShape(contour, []);
  const roofPositions = [];
  const roofIndices = [];
  for (let i = 0; i < localRing.length - 2; i += 2) {
    roofPositions.push(localRing[i], ART_MUSEUM_MAIN_ROOF_HEIGHT, localRing[i + 1]);
  }
  for (const tri of roofTris) {
    roofIndices.push(tri[0], tri[2], tri[1]);
  }
  const mainRoofMesh = new THREE.Mesh(geometry(roofPositions, roofIndices), roofMat);
  mainRoofMesh.name = 'Hong Kong Museum of Art — main exhibition roof slab';
  mainRoofMesh.receiveShadow = true;
  root.add(mainRoofMesh);

  // 3. The Belvedere / Harbour Gallery (頂層全海景展廳)
  // A panoramic cantilevered glass box sitting on top of the southern / harbour wing
  // Dimensions: ~42 m long, 18 m wide, from 24.5 m to 31.8 m (7.3 m high)
  const topBoxX = 2.0, topBoxZ = -8.0;
  const topBoxW = 44.0, topBoxD = 18.0;
  const topBoxH = ART_MUSEUM_TOP_BOX_HEIGHT - ART_MUSEUM_MAIN_ROOF_HEIGHT;
  const topBoxMidY = ART_MUSEUM_MAIN_ROOF_HEIGHT + topBoxH * 0.5;

  // Glass walls around the top box
  const tbPaneS = new THREE.PlaneGeometry(topBoxW, topBoxH - 0.2);
  tbPaneS.translate(topBoxX, topBoxMidY, topBoxZ + topBoxD * 0.5);
  glassPanes.push(tbPaneS);

  const tbPaneN = new THREE.PlaneGeometry(topBoxW, topBoxH - 0.2);
  tbPaneN.rotateY(Math.PI);
  tbPaneN.translate(topBoxX, topBoxMidY, topBoxZ - topBoxD * 0.5);
  glassPanes.push(tbPaneN);

  const tbPaneE = new THREE.PlaneGeometry(topBoxD, topBoxH - 0.2);
  tbPaneE.rotateY(Math.PI * 0.5);
  tbPaneE.translate(topBoxX + topBoxW * 0.5, topBoxMidY, topBoxZ);
  glassPanes.push(tbPaneE);

  const tbPaneW = new THREE.PlaneGeometry(topBoxD, topBoxH - 0.2);
  tbPaneW.rotateY(-Math.PI * 0.5);
  tbPaneW.translate(topBoxX - topBoxW * 0.5, topBoxMidY, topBoxZ);
  glassPanes.push(tbPaneW);

  // Top box roof slab and perimeter fascia
  box(roofParts, [topBoxX, ART_MUSEUM_TOP_BOX_HEIGHT + 0.25, topBoxZ], [topBoxW + 1.2, 0.5, topBoxD + 1.2]);
  box(frameParts, [topBoxX, ART_MUSEUM_TOP_BOX_HEIGHT + 0.15, topBoxZ], [topBoxW + 1.4, 0.4, topBoxD + 1.4]);

  // Top box interior ceiling downlights (warm glow)
  for (let gx = -16; gx <= 16; gx += 8) {
    for (let gz = -5; gz <= 5; gz += 5) {
      box(canopyParts, [topBoxX + gx, ART_MUSEUM_TOP_BOX_HEIGHT - 0.1, topBoxZ + gz], [1.2, 0.1, 1.2]);
    }
  }

  // 4. North Main Entrance (Salisbury Road / Art Square)
  // Transparent foyer vestibule, entrance canopy, and signage
  const entX = -12.0, entZ = 32.0;
  box(canopyParts, [entX, ART_MUSEUM_PLINTH_HEIGHT + 0.2, entZ], [16.0, 0.35, 6.5]);
  for (const cx of [-6.0, 6.0]) {
    cylinder(frameParts, [entX + cx, (ART_MUSEUM_PLINTH_HEIGHT + 0.2) * 0.5, entZ + 2.4], 0.22, ART_MUSEUM_PLINTH_HEIGHT + 0.2, 12);
  }

  // 5. Outdoor Art Plaza & Sculptures (facing Salisbury Garden & Victoria Harbour)
  // Stepped terrace
  box(plazaParts, [26.0, 0.2, -18.0], [22.0, 0.4, 18.0]);
  box(plazaParts, [26.0, 0.5, -18.0], [18.0, 0.3, 14.0]);

  // Modern abstract sculpture 1 (Bronze ribbon / geometric form)
  cylinder(plazaParts, [22.0, 0.9, -16.0], 1.2, 0.6, 12); // plinth
  const sc1 = [];
  cylinder(sc1, [22.0, 2.2, -16.0], 0.35, 2.0, 10);
  box(sc1, [22.0, 3.4, -16.0], [2.2, 0.5, 0.5], 0.4);
  box(sc1, [22.0, 2.8, -16.0], [0.5, 1.6, 1.8], -0.6);
  merged(root, sc1, bronzeSculpture, 'HKMoA outdoor bronze abstract sculpture');

  // Modern abstract sculpture 2 (Chrome kinetic ring / arch form)
  cylinder(plazaParts, [30.0, 0.9, -20.0], 1.4, 0.6, 12); // plinth
  const sc2 = [];
  cylinder(sc2, [30.0, 2.6, -20.0], 1.1, 0.22, 16, 1.1);
  cylinder(sc2, [30.0, 3.8, -20.0], 0.8, 0.18, 16, 0.8);
  merged(root, sc2, chromeSculpture, 'HKMoA outdoor chrome sculpture');

  // Planter boxes and greenery
  for (const pz of [-24.0, -12.0]) {
    box(plazaParts, [35.0, 0.4, pz], [2.4, 0.8, 4.2]);
    box(sc1, [35.0, 1.2, pz], [1.8, 0.9, 3.6]); // foliage inside
  }

  // Add merged meshes to root
  const wallMesh = new THREE.Mesh(geometry(wallPositions, wallIndices), ceramicWall);
  wallMesh.name = 'Hong Kong Museum of Art — ceramic and masonry wall shells';
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  root.add(wallMesh);

  merged(root, wavyBoxes, wavyPanel, 'Hong Kong Museum of Art — 2019 wavy faceted facade panels');
  merged(root, glassPanes, glass, 'Hong Kong Museum of Art — waterfront and panoramic gallery glazing', false);
  merged(root, frameParts, mullions, 'Hong Kong Museum of Art — structural mullions and entrance columns');
  merged(root, roofParts, roofMat, 'Hong Kong Museum of Art — upper roof slabs and fascias');
  merged(root, canopyParts, warmLight, 'Hong Kong Museum of Art — entrance canopy and illuminated ceiling bays', false);
  merged(root, plazaParts, plazaMat, 'Hong Kong Museum of Art — stepped outdoor art plaza and sculpture plinths');

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
      site, mx, mz, len, 1.2, base, base + ART_MUSEUM_MAIN_ROOF_HEIGHT, site.ry + Math.atan2(-dz, dx),
    ));
  }
  // Top box collider
  colliders.push(harbourCityLocalCollider(
    site, topBoxX, topBoxZ, topBoxW, topBoxD, base + ART_MUSEUM_MAIN_ROOF_HEIGHT, base + ART_MUSEUM_TOP_BOX_HEIGHT, site.ry,
  ));

  const landmark = {
    id: 'hong-kong-museum-of-art',
    name: site.name,
    englishName: site.englishName,
    position: { x: site.x, y: base, z: site.z },
    radius: 75,
    height: ART_MUSEUM_TOP_BOX_HEIGHT,
  };

  return {
    root,
    colliders,
    landmarks: [landmark],
    groundOffset: base,
    site,
    groundHeightAt(x, z, ground) { return artMuseumTerrainHeightAt(x, z, ground, base); },
    stats: {
      artMuseumVertices: numEdges,
      artMuseumRingArea: site.ringArea,
      artMuseumHeight: ART_MUSEUM_TOP_BOX_HEIGHT,
      artMuseumLevels: 5,
      artMuseumColliders: colliders.length,
    },
  };
}
