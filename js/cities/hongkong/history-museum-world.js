import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  HISTORY_MUSEUM_SITE, HISTORY_MUSEUM_PAD_HEIGHT, HISTORY_MUSEUM_ROOF_HEIGHT,
  HISTORY_MUSEUM_VAULT_HEIGHT, historyMuseumTerrainHeightAt,
} from './history-museum-site.js';
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

export function buildHistoryMuseum(scene, { groundOffset } = {}) {
  const site = HISTORY_MUSEUM_SITE;
  const base = groundOffset ?? HISTORY_MUSEUM_PAD_HEIGHT;
  const root = new THREE.Group();
  root.name = 'Hong Kong Museum of History — exact OSM 68-node ring with terracotta masonry and barrel-vault roofs';
  root.position.set(site.x, base, site.z);
  root.rotation.y = site.ry;

  // Materials
  const terracottaMat = new THREE.MeshStandardMaterial({
    color: 0x9c4e3c, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide,
  });
  terracottaMat.emissiveNode = color(0.45, 0.22, 0.18).mul(nightAmount()).mul(0.02);

  const crimsonBand = new THREE.MeshStandardMaterial({
    color: 0x6e241b, roughness: 0.82, metalness: 0.04, side: THREE.DoubleSide,
  });

  const stonePlinth = new THREE.MeshStandardMaterial({
    color: 0x7a716b, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide,
  });

  const vaultRoofMat = new THREE.MeshStandardMaterial({
    color: 0x546268, roughness: 0.42, metalness: 0.55, side: THREE.DoubleSide, // Curved zinc / metal vault
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x162c33, roughness: 0.18, metalness: 0.32, transparent: true, opacity: 0.86, side: THREE.DoubleSide,
  });
  glassMat.emissiveNode = color(1.0, 0.8, 0.45).mul(nightAmount()).mul(0.7);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x2b2e30, roughness: 0.35, metalness: 0.8,
  });

  const roofSlabMat = new THREE.MeshStandardMaterial({
    color: 0x7c7670, roughness: 0.95, side: THREE.DoubleSide,
  });

  const piazzaMat = new THREE.MeshStandardMaterial({
    color: 0x8a847e, roughness: 0.88,
  });

  const localRing = site.localRing;
  const numEdges = localRing.length / 2 - 1;

  // 1. Solid Walls along the 67 edges
  const wallPositions = [];
  const wallIndices = [];
  const plinthParts = [];
  const bandParts = [];
  const windowParts = [];
  const roofParts = [];
  const vaultParts = [];
  const piazzaParts = [];

  for (let edge = 0; edge < numEdges; edge++) {
    const i = edge * 2;
    const ax = localRing[i], az = localRing[i + 1];
    const bx = localRing[i + 2], bz = localRing[i + 3];
    const dx = bx - ax, dz = bz - az;
    const edgeLen = Math.hypot(dx, dz);
    if (edgeLen < 0.01) continue;

    const { nx, nz, ry } = harbourCityEdgeOutward(localRing, edge);
    const midX = (ax + bx) * 0.5, midZ = (az + bz) * 0.5;

    // Extrude main terracotta walls
    addQuad(
      wallPositions, wallIndices,
      [ax, 0, az], [bx, 0, bz],
      [bx, HISTORY_MUSEUM_ROOF_HEIGHT, bz], [ax, HISTORY_MUSEUM_ROOF_HEIGHT, az],
    );

    // Stone plinth at base (0 to 3.2 m)
    box(plinthParts, [midX + nx * 0.05, 1.6, midZ + nz * 0.05], [edgeLen + 0.05, 3.2, 0.22], ry);

    // Crimson horizontal accent bands
    for (const yh of [6.2, 11.8, 16.5, HISTORY_MUSEUM_ROOF_HEIGHT]) {
      box(bandParts, [midX + nx * 0.06, yh, midZ + nz * 0.06], [edgeLen + 0.08, 0.38, 0.28], ry);
    }

    // Windows on longer facade sections
    if (edgeLen >= 7.0) {
      const numBays = Math.floor(edgeLen / 4.5);
      for (let b = 1; b <= numBays; b++) {
        const u = b / (numBays + 1);
        const wx = ax + dx * u, wz = az + dz * u;
        for (const wy of [7.8, 13.4]) {
          box(windowParts, [wx + nx * 0.08, wy, wz + nz * 0.08], [1.6, 2.0, 0.16], ry);
        }
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
    roofPositions.push(localRing[i], HISTORY_MUSEUM_ROOF_HEIGHT, localRing[i + 1]);
  }
  for (const tri of roofTris) {
    roofIndices.push(tri[0], tri[2], tri[1]);
  }
  const mainRoofMesh = new THREE.Mesh(geometry(roofPositions, roofIndices), roofSlabMat);
  mainRoofMesh.name = 'Hong Kong Museum of History — flat gallery roof slab';
  mainRoofMesh.receiveShadow = true;
  root.add(mainRoofMesh);

  // 3. Monumental Curved Barrel-Vault Roofs (兩大圓拱展廳屋頂)
  // Gallery Vault 1 (North wing): ~38 m long, 16 m wide, radius 8 m
  // Gallery Vault 2 (South wing): ~32 m long, 14 m wide, radius 7 m
  const vaultConfigs = [
    { x: -12.0, z: -18.0, len: 42.0, width: 16.0, angle: 0 },
    { x: 18.0, z: 12.0, len: 36.0, width: 14.0, angle: 0.12 },
  ];

  for (const v of vaultConfigs) {
    const vRadius = v.width * 0.5;
    const vCyl = new THREE.CylinderGeometry(vRadius, vRadius, v.len, 20, 1, false, 0, Math.PI);
    vCyl.rotateZ(Math.PI * 0.5);
    if (v.angle) vCyl.rotateY(v.angle);
    vCyl.translate(v.x, HISTORY_MUSEUM_ROOF_HEIGHT, v.z);
    vaultParts.push(vCyl);

    // End-wall semicircular lunettes (tympanums)
    for (const endSign of [-1, 1]) {
      const ex = v.x + Math.sin(v.angle) * (v.len * 0.5 * endSign);
      const ez = v.z + Math.cos(v.angle) * (v.len * 0.5 * endSign);
      const tymp = new THREE.CircleGeometry(vRadius * 0.94, 16, 0, Math.PI);
      tymp.rotateY(v.angle + (endSign > 0 ? 0 : Math.PI));
      tymp.translate(ex, HISTORY_MUSEUM_ROOF_HEIGHT, ez);
      windowParts.push(tymp);
      // Framing arch
      box(bandParts, [ex, HISTORY_MUSEUM_ROOF_HEIGHT + vRadius * 0.5, ez], [v.width + 0.6, 0.4, 0.6], v.angle);
    }
  }

  // 4. Central Amphitheatre Courtyard & Connecting Colonnade
  // Stepped seating amphitheatre facing the Science Museum courtyard
  const ampX = 8.0, ampZ = -2.0;
  for (let step = 0; step < 4; step++) {
    const stepR = 12.0 + step * 1.8;
    const stepH = 0.45;
    const stepY = step * stepH + 0.2;
    cylinder(piazzaParts, [ampX, stepY, ampZ], stepR, stepH, 24);
  }

  // Covered walkway / colonnade linking towards Science Museum
  const colY = 4.2;
  box(roofParts, [ampX + 16.0, colY, ampZ - 8.0], [5.2, 0.35, 22.0], 0.2);
  for (let cz = -16.0; cz <= 0.0; cz += 4.5) {
    box(plinthParts, [ampX + 14.5, colY * 0.5, ampZ - 8.0 + cz], [0.45, colY, 0.45], 0.2);
    box(plinthParts, [ampX + 17.5, colY * 0.5, ampZ - 8.0 + cz], [0.45, colY, 0.45], 0.2);
  }

  // 5. Main Entrance Portal on Chatham Road South / Courtyard
  const portalX = -24.0, portalZ = 16.0;
  box(plinthParts, [portalX, 4.2, portalZ], [12.0, 8.4, 3.5], -0.15);
  box(windowParts, [portalX, 3.2, portalZ + 1.2], [7.2, 5.8, 0.4], -0.15);
  // Entrance steps
  for (let s = 0; s < 3; s++) {
    box(piazzaParts, [portalX, 0.15 + s * 0.2, portalZ + 2.8 + s * 0.5], [14.0 - s * 0.6, 0.2 + s * 0.2, 0.6], -0.15);
  }

  // Add all meshes to root
  const wallMesh = new THREE.Mesh(geometry(wallPositions, wallIndices), terracottaMat);
  wallMesh.name = 'Hong Kong Museum of History — terracotta brick and tile walls';
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  root.add(wallMesh);

  merged(root, plinthParts, stonePlinth, 'Hong Kong Museum of History — rusticated stone plinth and entrance portal');
  merged(root, bandParts, crimsonBand, 'Hong Kong Museum of History — crimson string courses and vault arches');
  merged(root, windowParts, glassMat, 'Hong Kong Museum of History — gallery fenestrations and lunettes', false);
  merged(root, vaultParts, vaultRoofMat, 'Hong Kong Museum of History — curved zinc barrel vaults');
  merged(root, roofParts, roofSlabMat, 'Hong Kong Museum of History — colonnade roof and curbs');
  merged(root, piazzaParts, piazzaMat, 'Hong Kong Museum of History — amphitheatre steps and plaza paving');

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
      site, mx, mz, len, 1.2, base, base + HISTORY_MUSEUM_ROOF_HEIGHT, site.ry + Math.atan2(-dz, dx),
    ));
  }
  // Vault colliders
  for (const v of vaultConfigs) {
    colliders.push(harbourCityLocalCollider(
      site, v.x, v.z, v.len, v.width, base + HISTORY_MUSEUM_ROOF_HEIGHT, base + HISTORY_MUSEUM_VAULT_HEIGHT, site.ry + v.angle,
    ));
  }

  const landmark = {
    id: 'hong-kong-museum-of-history',
    name: site.name,
    englishName: site.englishName,
    position: { x: site.x, y: base, z: site.z },
    radius: 80,
    height: HISTORY_MUSEUM_VAULT_HEIGHT,
  };

  return {
    root,
    colliders,
    landmarks: [landmark],
    groundOffset: base,
    site,
    groundHeightAt(x, z, ground) { return historyMuseumTerrainHeightAt(x, z, ground, base); },
    stats: {
      historyMuseumVertices: numEdges,
      historyMuseumRingArea: site.ringArea,
      historyMuseumHeight: HISTORY_MUSEUM_VAULT_HEIGHT,
      historyMuseumLevels: 4,
      historyMuseumBarrelVaults: vaultConfigs.length,
      historyMuseumColliders: colliders.length,
    },
  };
}
