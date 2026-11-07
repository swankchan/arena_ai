// Shared facade cladding for authored Hong Kong buildings.
//
// The lesson from the screenshots: a plain `box()` painted near-white reads as a snow bank. Real Hong Kong
// buildings are made of things — floor bands, spandrels, ribbon glazing, panel joints, a plinth in darker granite,
// a metal cornice. This module lays those out as vertex-coloured geometry, so a single merged mesh carries the
// tone variation and every panel can differ slightly without a texture.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { store, quad, hash } from './harbour-city-world-utils.js';

export function claddingStores() {
  return { panels: store(), glass: store(), joints: store(), plinth: store(), metal: store() };
}

export function claddingMaterials({ glazingMetalness = 0.35, glazingRoughness = 0.16 } = {}) {
  const vertex = (roughness, metalness) => {
    const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness, metalness, side: THREE.DoubleSide });
    material.colorNode = attribute('color');
    return material;
  };
  return {
    panels: vertex(0.78, 0.03),
    glass: vertex(glazingRoughness, glazingMetalness),
    joints: vertex(0.85, 0.02),
    plinth: vertex(0.9, 0.02),
    metal: vertex(0.42, 0.6),
  };
}

const shade = (tint, factor) => [tint[0] * factor, tint[1] * factor, tint[2] * factor];

// A wall of one building block: plinth, floors of spandrel + ribbon glazing, panel joints and a metal cornice.
// `ry` is applied the way THREE.BoxGeometry.rotateY applies it, so a clad block lines up with a `box()` of the
// same footprint.
export function cladBox(stores, spec) {
  const {
    x, z, y = 0, w, d, h, ry = 0,
    tint = [0.70, 0.68, 0.63],
    glassTint = [0.13, 0.18, 0.21],
    plinthTint = [0.44, 0.42, 0.39],
    corniceTint = [0.30, 0.32, 0.33],
    floors = Math.max(1, Math.round(h / 4)),
    bayWidth = 6.2,
    plinthHeight = Math.min(1.4, h * 0.18),
    seed = 1,
    glazingRatio = 0.52,
  } = spec;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const toWorld = (dx, dz) => [x + dx * cos + dz * sin, z - dx * sin + dz * cos];
  const floorHeight = (h - plinthHeight) / floors;

  // Four faces, each described by an along-axis and an outward normal in the block's own frame.
  const faces = [
    { name: 'front', along: 'x', span: w, normal: [0, 1], bays: Math.max(1, Math.round(w / bayWidth)) },
    { name: 'back', along: 'x', span: w, normal: [0, -1], bays: Math.max(1, Math.round(w / bayWidth)) },
    { name: 'right', along: 'z', span: d, normal: [1, 0], bays: Math.max(1, Math.round(d / bayWidth)) },
    { name: 'left', along: 'z', span: d, normal: [-1, 0], bays: Math.max(1, Math.round(d / bayWidth)) },
  ];

  for (const face of faces) {
    const half = (face.along === 'x' ? w : d) / 2;
    const normalOffset = (face.along === 'x' ? d : w) / 2;
    // Position on the face: u runs -half..half along the wall, `out` pushes it clear of the mass.
    const at = (u, height, out = 0) => {
      const dx = face.along === 'x' ? u : face.normal[0] * (normalOffset + out);
      const dz = face.along === 'x' ? face.normal[1] * (normalOffset + out) : u;
      return toWorld(dx, dz).concat([height]);
    };
    const wall = (target, u0, u1, y0, y1, colour, out = 0.02) => {
      quad(target, at(u0, y0, out), at(u1, y0, out), at(u1, y1, out), at(u0, y1, out), colour);
    };

    // Plinth: the granite base that keeps a facade from floating.
    wall(stores.plinth, -half - 0.02, half + 0.02, y, y + plinthHeight, plinthTint, 0.1);

    for (let floor = 0; floor < floors; floor++) {
      const base = y + plinthHeight + floor * floorHeight;
      const spandrelTop = base + floorHeight * (1 - glazingRatio);
      const glazedTop = base + floorHeight - 0.32;
      for (let bay = 0; bay < face.bays; bay++) {
        const u0 = -half + (2 * half * bay) / face.bays;
        const u1 = -half + (2 * half * (bay + 1)) / face.bays;
        const variation = hash(seed, floor, bay, face.bays);
        // Spandrel panel with a little tonal drift, the way precast panels and stone cladding vary.
        wall(stores.panels, u0 + 0.05, u1 - 0.05, base + 0.02, spandrelTop, shade(tint, 0.94 + variation * 0.1));
        // Ribbon glazing, some bays curtain-wall bright, some deeper in shadow.
        wall(stores.glass, u0 + 0.12, u1 - 0.12, spandrelTop, glazedTop,
          shade(glassTint, 0.78 + variation * 0.5), 0.05);
        // Mullion between bays.
        wall(stores.joints, u1 - 0.18, u1 + 0.04, base, glazedTop, shade(plinthTint, 0.72), 0.08);
      }
      // Floor band shadow line.
      wall(stores.joints, -half, half, glazedTop, base + floorHeight, shade(plinthTint, 0.55), 0.1);
    }

    // Metal cornice along the parapet.
    wall(stores.metal, -half - 0.05, half + 0.05, y + h - 0.45, y + h, corniceTint, 0.12);
    // Vertical corner pilasters.
    for (const u of [-half + 0.3, half - 0.3]) {
      wall(stores.panels, u - 0.3, u + 0.3, y, y + h - 0.45, shade(tint, 0.9), 0.09);
    }
  }
  return stores;
}

// A glazed, mullioned facade panel — used for the big curved fronts (aquarium, station concourses) where a
// flat wall would read as a blank. Writes one quad plus its mullion grid.
export function cladGlazedPanel(stores, { a, b, height, base = 0, ry = 0, mullions = 12, tint = [0.16, 0.22, 0.26], frame = [0.42, 0.44, 0.44] }) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length < 0.2) return;
  const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
  const point = (u, y) => [a[0] + ux * u, y, a[1] + uz * u];
  quad(stores.glass, point(0, base), point(length, base), point(length, base + height), point(0, base + height), tint);
  for (let i = 0; i <= mullions; i++) {
    const u = (i / mullions) * length;
    quad(stores.joints, point(u - 0.08, base), point(u + 0.08, base), point(u + 0.08, base + height), point(u - 0.08, base + height), frame);
  }
  const bands = Math.max(1, Math.round(height / 3.4));
  for (let i = 0; i <= bands; i++) {
    const y = base + (i / bands) * height;
    quad(stores.joints, point(0, y - 0.08), point(length, y - 0.08), point(length, y + 0.08), point(0, y + 0.08), frame);
  }
  void ry;
}

// Build the three meshes from the stores.
export function claddingMeshes(group, stores, materials, name, shadows = true) {
  const meshStore = (storeRef, material, suffix) => {
    if (!storeRef.positions.length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(storeRef.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(storeRef.colors, 3));
    geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(storeRef.lit, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${name}${suffix}`;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  meshStore(stores.panels, materials.panels, 'Panels');
  meshStore(stores.glass, materials.glass, 'Glazing');
  meshStore(stores.joints, materials.joints, 'Joints');
  meshStore(stores.plinth, materials.plinth, 'Plinth');
  meshStore(stores.metal, materials.metal, 'Cornice');
}
