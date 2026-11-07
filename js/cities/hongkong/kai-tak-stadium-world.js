// HK-B0104: 啟德主場館 Kai Tak Stadium — the "Pearl of the Orient" on the former Kai Tak runway apron.
//
// One continuous pearl skin of triangular aluminium facets wraps the whole 55 m oval; the hue cycles through the
// documented mountain blue / metallic purple / silver / sea green Kameleon range, so that the shell shimmers instead
// of showing storey bands. The skin stops at a dark glazed skirt, is cut by the wide lens-shaped glass mouth onto
// Victoria Harbour, and is split along the crown by the sliding seam of the 4,800 t retractable roof. Inside the
// seam the two-tier bowl, the pitch and the four bearing-free concrete tower cores are modelled, so the roof really
// reads as a movable lid rather than a painted line.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import {
  KAI_TAK_STADIUM_SITE, KAI_TAK_STADIUM_OSM_SOURCE, KAI_TAK_STADIUM_MASSING, KAI_TAK_STADIUM_COLOURS,
  KAI_TAK_STADIUM_GATES, KAI_TAK_STADIUM_CAPACITY, KAI_TAK_STADIUM_HEIGHT, KAI_TAK_STADIUM_WIDTH,
  KAI_TAK_STADIUM_FACADE_PANELS, KAI_TAK_STADIUM_ROOF_TONNES, KAI_TAK_STADIUM_ROOF_TRUSS_SPAN,
  KAI_TAK_STADIUM_TOWER_CORES, KAI_TAK_STADIUM_SKYBOXES, KAI_TAK_STADIUM_OPENED,
  KAI_TAK_STADIUM_CONSTRUCTION_START, KAI_TAK_STADIUM_PARK_HECTARES, KAI_TAK_STADIUM_FACADE_COATING,
  KAI_TAK_STADIUM_RESEARCH_SOURCES, kaiTakStadiumTerrainHeightAt,
} from './kai-tak-stadium-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider, harbourCityRingColliders } from './harbour-city-architecture.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';
import { projectHongKongLonLat } from './authored-landmark-site.js';

const M = KAI_TAK_STADIUM_MASSING, C = KAI_TAK_STADIUM_COLOURS;
const A = M.halfX, B = M.halfZ, H = KAI_TAK_STADIUM_HEIGHT;

// Local metric position on the pearl shell. The section is a superellipse — near-vertical at the skirt and a broad
// flat crown, exactly like the photographed "pebble" — so v = 0 at the skirt and v = 1 at the crown plane.
function shellRadial(v) { return Math.sqrt(Math.max(0, 1 - v ** 4)); }
function shellPoint(u, v) {
  const theta = u * Math.PI * 2;
  const radial = shellRadial(v);
  return { x: A * radial * Math.cos(theta), y: M.skirtHeight + (H - M.skirtHeight) * v, z: B * radial * Math.sin(theta) };
}
// Height of the skin above any (x, z): used for the crown gutters, trusses and roof tracks.
function shellHeightAt(x, z) {
  const r2 = (x / A) ** 2 + (z / B) ** 2;
  if (r2 >= 1) return M.skirtHeight;
  return M.skirtHeight + (H - M.skirtHeight) * Math.max(0, 1 - r2 * r2) ** 0.25;
}

// Deterministic Kameleon tint: the documented hues cycle around the shell and shift slowly with height, with a
// per-facet variation so neighbouring triangular panels never read as one flat colour.
function facetTint(column, row, columns, rows) {
  const u = column / columns, v = row / rows;
  const wave = Math.sin(u * Math.PI * 2 * 3 + v * 2.4) + Math.sin(u * Math.PI * 2 * 7 - v * 4.1) * 0.5;
  const index = ((Math.round((wave + 1.5) * 2.2) % C.pearl.length) + C.pearl.length) % C.pearl.length;
  const base = C.pearl[index];
  const shimmer = 0.94 + (((column * 37 + row * 61) % 11) / 11) * 0.12;
  return [base[0] * shimmer, base[1] * shimmer, base[2] * shimmer];
}

function triangle(s, a, b, c, tint, lit = 0) {
  s.positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < 3; i++) { s.colors.push(...tint); s.lit.push(lit); }
}

function makeMaterials() {
  const pearl = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.58, roughness: 0.26, side: THREE.DoubleSide });
  pearl.colorNode = attribute('color').rgb.mul(0.82 + 0.32 * 0);
  pearl.emissiveNode = attribute('color').rgb.mul(attribute('aLit')).mul(0.9);
  const pearlBacking = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.2, roughness: 0.62, side: THREE.DoubleSide });
  pearlBacking.colorNode = attribute('color').rgb;
  const interior = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.82, side: THREE.DoubleSide });
  interior.colorNode = attribute('color').rgb;
  const glass = new THREE.MeshStandardNodeMaterial({
    vertexColors: true, metalness: 0.32, roughness: 0.14, transparent: true, opacity: 0.55,
    depthWrite: false, side: THREE.DoubleSide,
  });
  glass.colorNode = attribute('color').rgb;
  const palette = harbourCityPalette();
  return {
    pearl, pearlBacking, interior, glass,
    metal: palette.metal,
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa2a6, roughness: 0.35, metalness: 0.75 }),
    dark: palette.dark,
    stone: palette.stone,
    paleStone: palette.paleStone,
    paving: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.paving), roughness: 0.9 }),
    lawn: palette.lawn,
    white: palette.white,
  };
}

// The pearl skin: 120 columns x 44 rings of triangular facets, with the harbour mouth and the crown seam omitted.
function buildPearlShell(group, materials, stats) {
  const shell = new THREE.Group(); shell.name = 'KaiTakStadiumPearlShell'; group.add(shell);
  const facets = store(), backing = store(), mouthGlass = store();
  const columns = 120, rows = 44;
  const mouthAngle = M.mouthAngle / 360;
  let facetsSkippedMouth = 0, facetsSkippedSeam = 0;
  for (let row = 0; row < rows; row++) {
    const v0 = row / rows, v1 = (row + 1) / rows;
    for (let column = 0; column < columns; column++) {
      const u0 = (column + (row % 2) * 0.5) / columns, u1 = u0 + 1 / columns;
      const midU = ((u0 + u1) / 2) % 1;
      const midV = (v0 + v1) / 2;
      const p00 = shellPoint(u0, v0), p10 = shellPoint(u1, v0), p11 = shellPoint(u1, v1), p01 = shellPoint(u0, v1);
      const centre = shellPoint(midU, midV);
      const tint = facetTint(column, row, columns, rows);

      // The lens-shaped glazed mouth: the same angular window at every ring it spans, so it reads as one opening.
      let dAngle = Math.abs(midU - mouthAngle);
      dAngle = Math.min(dAngle, 1 - dAngle);
      const dn = (dAngle * 360) / M.mouthHalfSpan, dv = (midV - M.mouthCentre) / M.mouthHalfHeight;
      const inMouth = dn * dn + dv * dv < 1;
      if (inMouth) {
        facetsSkippedMouth++;
        triangle(mouthGlass, p00, p10, p11, C.mouthGlass, 1);
        triangle(mouthGlass, p00, p11, p01, C.mouthGlass, 1);
        continue;
      }
      // The sliding seam of the retractable roof: the crown opens over the pitch on both halves.
      if (Math.abs(centre.x) < M.crownSlotWidth / 2 && Math.abs(centre.z) < M.crownSlotHalfLength && centre.y > H * 0.72) {
        facetsSkippedSeam++;
        continue;
      }
      // Each cell is two triangular panels with slightly different tints, exactly like the photographed diamond grid.
      const alt = (column + row) % 2 === 0;
      const tintB = tint.map((value) => value * 0.94);
      if (alt) {
        triangle(facets, p00, p10, p11, tint, 1); triangle(facets, p00, p11, p01, tintB, 1);
      } else {
        triangle(facets, p00, p10, p01, tint, 1); triangle(facets, p10, p11, p01, tintB, 1);
      }
      // Backing shell: one coarse quad per cell, so the skin is opaque from inside the bowl. The mouth and the roof
      // seam deliberately have none, because those openings must look through to the bowl.
      quad(backing, [p00.x * 0.985, p00.y, p00.z * 0.985], [p10.x * 0.985, p10.y, p10.z * 0.985],
        [p11.x * 0.985, p11.y, p11.z * 0.985], [p01.x * 0.985, p01.y, p01.z * 0.985], [0.24, 0.26, 0.30], 0);
    }
  }
  meshStore(shell, facets, materials.pearl, 'KaiTakStadiumPearlFacets');
  meshStore(shell, backing, materials.pearlBacking, 'KaiTakStadiumPearlBacking');
  meshStore(shell, mouthGlass, materials.glass, 'KaiTakStadiumHarbourMouthGlass', false);
  stats.kaiTakStadiumModelledFacets = facets.positions.length / 9;
  stats.kaiTakStadiumFacetsInMouth = facetsSkippedMouth;
  stats.kaiTakStadiumFacetsInRoofSeam = facetsSkippedSeam;
  return shell;
}

// Dark glazed skirt at ground level, with the stainless mullions and the podium fascia under the pearl skin.
function buildSkirt(group, materials, stats) {
  const skirt = new THREE.Group(); skirt.name = 'KaiTakStadiumGlazedSkirt'; group.add(skirt);
  const glass = store(), mullions = [], fascia = [], plinth = [];
  const steps = 120;
  const insetX = A - M.skirtInset, insetZ = B - M.skirtInset;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1) / steps) * Math.PI * 2;
    const x0 = insetX * Math.cos(a0), z0 = insetZ * Math.sin(a0);
    const x1 = insetX * Math.cos(a1), z1 = insetZ * Math.sin(a1);
    quad(glass, [x0, 0.3, z0], [x1, 0.3, z1], [x1, M.skirtHeight - 0.6, z1], [x0, M.skirtHeight - 0.6, z0], C.skirtGlass, 1);
    beam(mullions, [x0, 0.3, z0], [x0, M.skirtHeight - 0.6, z0], 0.18, 0.18);
  }
  // Upper fascia and the granite plinth ring.
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1) / steps) * Math.PI * 2;
    const x0 = (insetX + 0.5) * Math.cos(a0), z0 = (insetZ + 0.5) * Math.sin(a0);
    const x1 = (insetX + 0.5) * Math.cos(a1), z1 = (insetZ + 0.5) * Math.sin(a1);
    box(fascia, [(x0 + x1) / 2, M.skirtHeight - 0.3, (z0 + z1) / 2],
      [Math.hypot(x1 - x0, z1 - z0) + 0.4, 1.1, 1.0], Math.atan2(-(z1 - z0), x1 - x0));
    box(plinth, [(x0 + x1) / 2, 0.2, (z0 + z1) / 2],
      [Math.hypot(x1 - x0, z1 - z0) + 0.4, 0.4, 1.4], Math.atan2(-(z1 - z0), x1 - x0));
  }
  meshStore(skirt, glass, materials.glass, 'KaiTakStadiumSkirtGlass', false);
  merged(skirt, mullions, materials.steel, 'KaiTakStadiumSkirtMullions');
  merged(skirt, fascia, materials.paleStone, 'KaiTakStadiumSkirtFascia');
  merged(skirt, plinth, materials.stone, 'KaiTakStadiumGranitePlinth');
  stats.kaiTakStadiumSkirtMullions = steps;
  return skirt;
}

// The retractable roof: crown tracks and gutters along the seam, plus the photovoltaic bands on the closed roof.
function buildRetractableRoof(group, materials, stats) {
  const roof = new THREE.Group(); roof.name = 'KaiTakStadiumRetractableRoof'; group.add(roof);
  const gutters = [], rails = [], trusses = [];
  const samples = 32;
  const halfWidth = M.crownSlotWidth / 2;
  // Crown gutters and the two sliding tracks run the full length of the seam, on the real crown profile.
  for (const side of [-1, 1]) {
    for (let i = 0; i < samples; i++) {
      const z0 = -M.crownSlotHalfLength + (2 * M.crownSlotHalfLength) * (i / samples);
      const z1 = -M.crownSlotHalfLength + (2 * M.crownSlotHalfLength) * ((i + 1) / samples);
      const y = (shellHeightAt(side * halfWidth, z0) + shellHeightAt(side * halfWidth, z1)) / 2;
      const length = Math.abs(z1 - z0) + 0.06;
      box(gutters, [side * halfWidth, y + 0.22, (z0 + z1) / 2], [1.05, 0.45, length]);
      box(rails, [side * (halfWidth + 1.15), y + 0.08, (z0 + z1) / 2], [0.3, 0.24, length]);
    }
  }
  // The two pairs of orthogonal main trusses, spanning between the bearing-free cores under the roof.
  // Kept short enough that every truss stays under the curved skin instead of standing out of the silhouette.
  for (const z of [-52, 52]) box(trusses, [0, H - 3.2, z], [120, 1.0, 1.0]);
  for (const x of [-58, 58]) box(trusses, [x, H - 3.2, 0], [1.0, 1.0, 100]);
  merged(roof, gutters, materials.metal, 'KaiTakStadiumRoofGutters');
  merged(roof, rails, materials.steel, 'KaiTakStadiumRoofTrackRails');
  merged(roof, trusses, materials.steel, 'KaiTakStadiumRoofTrusses');
  stats.kaiTakStadiumRoofTrackSegments = samples * 2;
  stats.kaiTakStadiumRoofTrusses = 4;
  return roof;
}

// Inside the seam: the two-tier bowl, the pitch, the stage pocket and the four bearing-free tower cores.
function buildBowl(group, materials, stats) {
  const bowl = new THREE.Group(); bowl.name = 'KaiTakStadiumInnerBowl'; group.add(bowl);
  const pitchStore = store(), seats = store(), concourse = [], cores = [], vomitories = [];
  const pitchHalfX = 52.5, pitchHalfZ = 34;
  quad(pitchStore, [-pitchHalfX, 0.6, -pitchHalfZ], [pitchHalfX, 0.6, -pitchHalfZ],
    [pitchHalfX, 0.6, pitchHalfZ], [-pitchHalfX, 0.6, pitchHalfZ], C.pitch);
  quad(pitchStore, [-pitchHalfX, 0.62, -pitchHalfZ / 3], [pitchHalfX, 0.62, -pitchHalfZ / 3],
    [pitchHalfX, 0.62, pitchHalfZ / 3], [-pitchHalfX, 0.62, pitchHalfZ / 3], [0.29, 0.49, 0.22]);
  // Two tiers of seating arranged around the oval, colour-blocked so the 啟德 seat pattern is hinted at scale.
  const tiers = [{ innerA: 56, innerB: 40, rows: 18, step: 1.40, rise: 0.62, base: 3.0 },
    { innerA: 72, innerB: 56, rows: 16, step: 1.30, rise: 0.74, base: 19.0 }];
  const blocks = 24;
  for (const tier of tiers) {
    for (let block = 0; block < blocks; block++) {
      const a0 = (block / blocks) * Math.PI * 2, a1 = ((block + 1) / blocks) * Math.PI * 2;
      const glyph = (block % 6) < 3 ? C.seatBlue : (block % 6) < 5 ? C.seatPurple : C.seatSilver;
      const tint = Math.floor(block / 6) % 2 === 0 ? glyph : C.seatOrange;
      for (let row = 0; row < tier.rows; row++) {
        const aA = tier.innerA + row * tier.step, aB = tier.innerB + row * tier.step;
        // Never let a seat row pierce the pearl shell: the skin is the authority on the building's edge.
        const limitX = A * 0.80, limitZ = B * 0.80;
        if (aA > limitX || aB > limitZ) break;
        const y = tier.base + row * tier.rise;
        const p0 = { x: aA * Math.cos(a0), y, z: aB * Math.sin(a0) };
        const p1 = { x: aA * Math.cos(a1), y, z: aB * Math.sin(a1) };
        const p2 = { x: aB * Math.cos(a1), y, z: (aB + 1.6) * Math.sin(a1) };
        const p3 = { x: aB * Math.cos(a0), y, z: (aB + 1.6) * Math.sin(a0) };
        triangle(seats, p0, p1, p2, [tint[0] * 0.86, tint[1] * 0.86, tint[2] * 0.86], 0);
        triangle(seats, p0, p2, p3, tint, 0);
      }
    }
    // Concourse slab edge between the tiers.
    for (let block = 0; block < blocks; block++) {
      const a0 = (block / blocks) * Math.PI * 2, a1 = ((block + 1) / blocks) * Math.PI * 2;
      const aA = tier.innerA - 2.4, aB = tier.innerB - 2.4;
      const y = tier.base - 0.5;
      box(concourse, [0.5 * (aA + aB) * Math.cos((a0 + a1) / 2), y, 0.5 * (aA + aB) * Math.sin((a0 + a1) / 2)],
        [Math.abs(a1 - a0) * (aA + aB) / 2, 0.6, 4.2], Math.atan2(-Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)));
    }
  }
  // Four bearing-free reinforced-concrete tower cores carrying the roof trusses.
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = sx * 62, z = sz * 52;
    box(cores, [x, (H - 6) / 2 + 2, z], [9.0, H - 6, 9.0]);
    for (let i = 0; i < 4; i++) {
      cylinder(vomitories, [x + sx * 5.6, 2.4, z + sz * (i - 1.5) * 2.6], 0.35, 4.4, 8);
    }
  }
  meshStore(bowl, pitchStore, materials.interior, 'KaiTakStadiumPitch');
  meshStore(bowl, seats, materials.interior, 'KaiTakStadiumSeatTiers');
  merged(bowl, concourse, materials.concourse ? materials.concourse : materials.paleStone, 'KaiTakStadiumConcourseEdges');
  merged(bowl, cores, materials.paleStone, 'KaiTakStadiumTowerCores');
  merged(bowl, vomitories, materials.steel, 'KaiTakStadiumVomitoryColumns');
  stats.kaiTakStadiumSeatBlocks = blocks * 2;
  stats.kaiTakStadiumTowerCoresModelled = 4;
  return bowl;
}

// The public realm: the paved podium inside the OSM oval, the ten OSM gates with their canopies and lettering,
// flagpoles, lawns and trees.
function buildPodium(group, materials, stats) {
  const podium = new THREE.Group(); podium.name = 'KaiTakStadiumPodium'; group.add(podium);
  const apron = store(), kerbs = [], canopies = [], columns = [], portals = [], doors = [];
  // The pearl shell *is* the building: the OSM oval is its footprint, so the podium is only the paved margin
  // between the glazed skirt and the surveyed outline, drawn as a smooth 120-segment band.
  const segments = 120;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2, a1 = ((i + 1) / segments) * Math.PI * 2;
    const rx0 = (A - 1.2) * Math.cos(a0), rz0 = (B - 1.2) * Math.sin(a0);
    const rx1 = (A - 1.2) * Math.cos(a1), rz1 = (B - 1.2) * Math.sin(a1);
    quad(apron, [0, 0.06, 0], [rx0, 0.06, rz0], [rx1, 0.06, rz1], [rx1, 0.06, rz1], C.paving);
    beam(kerbs, [rx0, 0.16, rz0], [rx1, 0.16, rz1], 1.2, 0.3);
  }
  meshStore(podium, apron, materials.paving, 'KaiTakStadiumPodiumPaving', false);
  merged(podium, kerbs, materials.paleStone, 'KaiTakStadiumPodiumKerbs');

  // The ten OSM entrance nodes (refs A–K, no I) become real gates: canopy, two columns and a lit fascia board.
  const cs = Math.cos(KAI_TAK_STADIUM_SITE.ry), sn = Math.sin(KAI_TAK_STADIUM_SITE.ry);
  const gates = [];
  for (const gate of KAI_TAK_STADIUM_GATES) {
    const [wx, wz] = projectHongKongLonLat(gate.lon, gate.lat);
    const dx = wx - KAI_TAK_STADIUM_SITE.x, dz = wz - KAI_TAK_STADIUM_SITE.z;
    const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
    const phi = Math.atan2(lz, lx);
    const outward = { x: Math.cos(phi), z: Math.sin(phi) };
    // Tangent direction of the ellipse at the gate, so the canopy follows the skin instead of cutting across it.
    const tangent = { x: -outward.z, z: outward.x };
    const angle = Math.atan2(-tangent.z, tangent.x);
    // The gate itself is a recessed dark portal in the skirt, with a cantilevered canopy over it and two columns.
    const px = lx - outward.x * 0.4, pz = lz - outward.z * 0.4;
    box(portals, [px, 4.1, pz], [9.4, 7.6, 1.1], angle);
    box(doors, [px + outward.x * 0.5, 3.4, pz + outward.z * 0.5], [8.2, 6.2, 0.2], angle);
    const cx = lx + outward.x * 1.3, cz = lz + outward.z * 1.3;
    box(canopies, [cx, 8.5, cz], [10.4, 0.7, 3.6], angle);
    for (const side of [-1, 1]) {
      cylinder(columns, [cx + tangent.x * side * 4.4 + outward.x * 1.2, 4.1, cz + tangent.z * side * 4.4 + outward.z * 1.2],
        0.24, 8.2, 8);
    }
    gates.push({ ref: gate.ref, lx, lz, angle, outward });
  }
  merged(podium, portals, materials.paleStone, 'KaiTakStadiumGatePortals');
  merged(podium, doors, materials.dark, 'KaiTakStadiumGateDoors');
  merged(podium, canopies, materials.paleStone, 'KaiTakStadiumGateCanopies');
  merged(podium, columns, materials.steel, 'KaiTakStadiumGateColumns');

  // Gate letters on the fascia, facing outwards from the skin.
  for (const gate of gates) {
    const sign = makeCanvasSign(4.2, 1.6, (ctx, canvas) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f4f4f0'; ctx.font = '700 170px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`GATE ${gate.ref}`, canvas.width / 2, canvas.height / 2);
    }, { canvasWidth: 640, canvasHeight: 244 });
    sign.name = `KaiTakStadiumGateSign${gate.ref}`;
    sign.position.set(gate.lx + gate.outward.x * 3.2, 8.5, gate.lz + gate.outward.z * 3.2);
    sign.rotation.y = Math.atan2(gate.outward.x, gate.outward.z);
    podium.add(sign);
  }
  stats.kaiTakStadiumGates = gates.length;
  stats.kaiTakStadiumPodiumSegments = segments;
  return { podium, gates };
}

export function buildKaiTakStadium(root, { groundOffset = 0 } = {}) {
  const stadium = new THREE.Group();
  stadium.name = 'KaiTakStadium';
  stadium.position.set(KAI_TAK_STADIUM_SITE.x, groundOffset, KAI_TAK_STADIUM_SITE.z);
  root.add(stadium);
  const materials = makeMaterials();
  const stats = {};
  buildPodium(stadium, materials, stats);
  buildSkirt(stadium, materials, stats);
  const shell = buildPearlShell(stadium, materials, stats);
  buildRetractableRoof(stadium, materials, stats);
  buildBowl(stadium, materials, stats);

  // Colliders follow the OSM oval so the real footprint (and nothing more) is solid, plus the four tower cores.
  const colliders = harbourCityRingColliders(KAI_TAK_STADIUM_SITE, groundOffset, groundOffset + H, 1.6);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    colliders.push(harbourCityLocalCollider(KAI_TAK_STADIUM_SITE, sx * 62, sz * 52, 9.0, 9.0, groundOffset, groundOffset + H - 6));
  }

  const landmarks = [{
    id: 'kai-tak-stadium', name: '啟德主場館 · Kai Tak Stadium（東方之珠 Pearl of the Orient）',
    position: { x: KAI_TAK_STADIUM_SITE.x, y: groundOffset, z: KAI_TAK_STADIUM_SITE.z },
    radius: 230, height: H, components: 4,
  }];

  Object.assign(stats, {
    kaiTakStadiumGroundOffset: groundOffset,
    kaiTakStadiumLandmarks: 1,
    kaiTakStadiumInventoryId: 'HK-B0104',
    kaiTakStadiumOsmWay: KAI_TAK_STADIUM_OSM_SOURCE.id,
    kaiTakStadiumOsmVersion: KAI_TAK_STADIUM_OSM_SOURCE.version,
    kaiTakStadiumRingArea: KAI_TAK_STADIUM_SITE.ringArea,
    kaiTakStadiumCapacity: KAI_TAK_STADIUM_CAPACITY,
    kaiTakStadiumHeight: KAI_TAK_STADIUM_HEIGHT,
    kaiTakStadiumWidth: KAI_TAK_STADIUM_WIDTH,
    kaiTakStadiumFacadePanels: KAI_TAK_STADIUM_FACADE_PANELS,
    kaiTakStadiumFacadeCoating: KAI_TAK_STADIUM_FACADE_COATING,
    kaiTakStadiumRoofTonnes: KAI_TAK_STADIUM_ROOF_TONNES,
    kaiTakStadiumRoofTrussSpan: KAI_TAK_STADIUM_ROOF_TRUSS_SPAN,
    kaiTakStadiumTowerCores: KAI_TAK_STADIUM_TOWER_CORES,
    kaiTakStadiumSkyboxes: KAI_TAK_STADIUM_SKYBOXES,
    kaiTakStadiumOpened: KAI_TAK_STADIUM_OPENED,
    kaiTakStadiumConstructionStart: KAI_TAK_STADIUM_CONSTRUCTION_START,
    kaiTakStadiumParkHectares: KAI_TAK_STADIUM_PARK_HECTARES,
    kaiTakStadiumResearchSources: KAI_TAK_STADIUM_RESEARCH_SOURCES.length,
    kaiTakStadiumColliders: colliders.length,
    kaiTakStadiumShellColumns: M.panelColumns,
    kaiTakStadiumShellRows: M.panelRows,
  });

  return {
    group: stadium,
    colliders,
    landmarks,
    stats,
    groundOffset,
    height: H,
    shellPoint,
    groundHeightAt(x, z, fallback) {
      return kaiTakStadiumTerrainHeightAt(x, z, fallback, groundOffset);
    },
  };
}
