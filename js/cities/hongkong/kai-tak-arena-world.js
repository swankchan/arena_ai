// HK-B0105: 啟德體藝館 Kai Tak Arena — the colour-field indoor hall inside 啟德體育園 Kai Tak Sports Park.
//
// The building follows the surveyed block with a 4 m inset. Its identity is in the facade: tall vertical panels in
// lime / sage / olive greens with scattered white and silver strips, a gold-amber patchwork near the east end, and a
// deep charcoal fascia band wrapping the whole roofline, carrying the white "啟德體育園 KAI TAK ARENA" lettering.
// Above it: a dark roof with a forest of slim telecom masts. Below it: a dark glazed base and the plaza with the
// silver gymnast statue. The hall drum rises above the podium wing at the west end, where the main arena is.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import {
  KAI_TAK_ARENA_SITE, KAI_TAK_ARENA_OSM_SOURCE, KAI_TAK_ARENA_MASSING, KAI_TAK_ARENA_COLOURS, KAI_TAK_ARENA_CAPACITY,
  KAI_TAK_ARENA_SECONDARY_SEATS, KAI_TAK_ARENA_MAIN_HALL_SQUARE_METRES, KAI_TAK_ARENA_CEILING_HEIGHT,
  KAI_TAK_ARENA_RETRACTABLE_SHARE, KAI_TAK_ARENA_OPENED, KAI_TAK_ARENA_SPORTS, KAI_TAK_ARENA_ARCHITECTS,
  KAI_TAK_ARENA_RESEARCH_SOURCES, kaiTakArenaTerrainHeightAt,
} from './kai-tak-arena-architecture.js';
import {
  merged, box, cylinder, beam, store, quad, meshStore, harbourCityPalette,
} from './harbour-city-world-utils.js';
import { harbourCityLocalCollider, harbourCityRingColliders } from './harbour-city-architecture.js';
import { makeCanvasSign } from './tst-hotel-world-utils.js';

const M = KAI_TAK_ARENA_MASSING, C = KAI_TAK_ARENA_COLOURS;

// Ring edges in local metres, wound so that (dz, -dx) is the outward normal.
function ringEdges() {
  const ring = KAI_TAK_ARENA_SITE.localRing;
  const edges = [];
  for (let i = 0; i + 3 < ring.length; i += 2) {
    const x0 = ring[i], z0 = ring[i + 1], x1 = ring[i + 2], z1 = ring[i + 3];
    const dx = x1 - x0, dz = z1 - z0, length = Math.hypot(dx, dz);
    if (length < 0.4) continue;
    edges.push({
      x0, z0, x1, z1, length, mx: (x0 + x1) / 2, mz: (z0 + z1) / 2,
      angle: Math.atan2(-dz, dx), normal: { x: dz / length, z: -dx / length }, along: { x: dx / length, z: dz / length },
    });
  }
  return edges;
}

function panelTint(index, goldZone) {
  if (goldZone) return C.gold[index % C.gold.length];
  const pick = index % 17;
  if (pick === 3) return C.white;
  if (pick === 11) return C.silver;
  return C.greens[index % C.greens.length];
}

function makeMaterials() {
  const panel = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: 0.12, roughness: 0.55, side: THREE.DoubleSide });
  panel.colorNode = attribute('color').rgb;
  const glass = new THREE.MeshStandardNodeMaterial({
    vertexColors: true, metalness: 0.3, roughness: 0.16, transparent: true, opacity: 0.6,
    depthWrite: false, side: THREE.DoubleSide,
  });
  glass.colorNode = attribute('color').rgb;
  const palette = harbourCityPalette();
  return {
    panel, glass,
    band: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.band), roughness: 0.62, metalness: 0.18 }),
    bandEdge: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.bandEdge), roughness: 0.55, metalness: 0.3 }),
    mullion: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.mullion), roughness: 0.34, metalness: 0.7 }),
    roof: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.roof), roughness: 0.82, metalness: 0.1 }),
    mast: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.mast), roughness: 0.4, metalness: 0.55 }),
    statue: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.statue), roughness: 0.28, metalness: 0.85 }),
    paving: new THREE.MeshStandardMaterial({ color: new THREE.Color(...C.paving), roughness: 0.9 }),
    lawn: palette.lawn,
    stone: palette.stone,
    dark: palette.dark,
  };
}

// Facades: vertical colour-field panels (with the gold patchwork at the +x end), the charcoal band and glazed base.
function buildFacades(group, materials, stats) {
  const facades = new THREE.Group(); facades.name = 'KaiTakArenaFacades'; group.add(facades);
  const panels = store(), glass = store(), mullions = [], bands = [], bandEdges = [], parapets = [];
  const edges = ringEdges();
  let minX = Infinity, maxX = -Infinity;
  for (const edge of edges) { minX = Math.min(minX, edge.x0, edge.x1); maxX = Math.max(maxX, edge.x0, edge.x1); }
  const goldFrom = maxX - 46;                 // the photographed gold/amber end
  let panelCount = 0;
  for (const edge of edges) {
    const outerX = edge.mx - edge.normal.x * M.inset, outerZ = edge.mz - edge.normal.z * M.inset;
    const length = edge.length - M.inset * 2;
    if (length < 1) continue;
    const count = Math.max(1, Math.round(length / M.panelPitch));
    const width = length / count;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count - 0.5;
      const px = outerX + edge.along.x * t * length, pz = outerZ + edge.along.z * t * length;
      const goldZone = px > goldFrom;
      const tint = panelTint(panelCount + i * 3, goldZone);
      const shrink = width * 0.03;
      // Each strip is a thin vertical box, so the colour field has real relief rather than being a painted plane.
      quad(panels,
        [px - edge.along.x * (width / 2 - shrink), M.glazingHeight, pz - edge.along.z * (width / 2 - shrink)],
        [px + edge.along.x * (width / 2 - shrink), M.glazingHeight, pz + edge.along.z * (width / 2 - shrink)],
        [px + edge.along.x * (width / 2 - shrink), M.podiumHeight, pz + edge.along.z * (width / 2 - shrink)],
        [px - edge.along.x * (width / 2 - shrink), M.podiumHeight, pz - edge.along.z * (width / 2 - shrink)], tint);
      panelCount++;
    }
    // Dark glazed base with mullions.
    quad(glass,
      [edge.x0 - edge.normal.x * M.inset, 0.2, edge.z0 - edge.normal.z * M.inset],
      [edge.x1 - edge.normal.x * M.inset, 0.2, edge.z1 - edge.normal.z * M.inset],
      [edge.x1 - edge.normal.x * M.inset, M.glazingHeight, edge.z1 - edge.normal.z * M.inset],
      [edge.x0 - edge.normal.x * M.inset, M.glazingHeight, edge.z0 - edge.normal.z * M.inset], C.glazing, 1);
    const mullionCount = Math.max(1, Math.round(length / 2.4));
    for (let i = 0; i <= mullionCount; i++) {
      const t = i / mullionCount - 0.5;
      cylinder(mullions, [outerX + edge.along.x * t * length, M.glazingHeight / 2, outerZ + edge.along.z * t * length],
        0.09, M.glazingHeight, 6);
    }
    // Charcoal band: the deep fascia that wraps the roofline, proud of the colour field.
    box(bands, [edge.mx - edge.normal.x * (M.inset - M.bandProjection / 2), M.podiumHeight + M.bandHeight / 2,
      edge.mz - edge.normal.z * (M.inset - M.bandProjection / 2)],
      [edge.length - M.inset * 2 + 0.6, M.bandHeight, M.bandProjection], edge.angle);
    box(bandEdges, [edge.mx - edge.normal.x * (M.inset - M.bandProjection), M.podiumHeight + M.bandHeight / 2,
      edge.mz - edge.normal.z * (M.inset - M.bandProjection)],
      [edge.length - M.inset * 2 + 0.6, 0.22, 0.16], edge.angle);
    box(parapets, [edge.mx - edge.normal.x * M.inset, M.roofHeight - 0.3, edge.mz - edge.normal.z * M.inset],
      [edge.length - M.inset * 2, 0.6, 0.9], edge.angle);
  }
  meshStore(facades, panels, materials.panel, 'KaiTakArenaColourFieldPanels');
  meshStore(facades, glass, materials.glass, 'KaiTakArenaGlazedBase', false);
  merged(facades, mullions, materials.mullion, 'KaiTakArenaBaseMullions');
  merged(facades, bands, materials.band, 'KaiTakArenaCharcoalBand');
  merged(facades, bandEdges, materials.bandEdge, 'KaiTakArenaBandCoping');
  merged(facades, parapets, materials.roof, 'KaiTakArenaParapet');

  // White bilingual lettering on the charcoal band, facing the stadium forecourt.
  for (const [side, x, z, ry] of [['South', 0, KAI_TAK_ARENA_SITE.localRing.reduce((min, value, index) => index % 2 ? min : Math.min(min, value), Infinity) - M.inset - 0.65, 0]]) {
    const sign = makeCanvasSign(35.0, 4.4, (ctx, canvas) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f4f4f1';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 96px "Noto Sans CJK TC", "PingFang HK", sans-serif';
      ctx.fillText('啟德體育園', canvas.width * 0.30, canvas.height * 0.52);
      ctx.font = '600 74px "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('KAI TAK ARENA', canvas.width * 0.71, canvas.height * 0.52);
      ctx.fillStyle = 'rgba(240,240,236,0.9)';
      ctx.fillRect(canvas.width * 0.055, canvas.height * 0.36, canvas.width * 0.11, canvas.height * 0.05);
      ctx.fillRect(canvas.width * 0.055, canvas.height * 0.46, canvas.width * 0.085, canvas.height * 0.05);
      ctx.fillRect(canvas.width * 0.055, canvas.height * 0.56, canvas.width * 0.10, canvas.height * 0.05);
    }, { canvasWidth: 2048, canvasHeight: 300 });
    sign.name = `KaiTakArenaBandLettering${side}`;
    sign.position.set(x, M.podiumHeight + M.bandHeight * 0.52, z - 1.2);
    sign.rotation.y = ry;
    facades.add(sign);
  }
  stats.kaiTakArenaFacadePanels = panelCount;
  return facades;
}

// The arena drum above the podium wing, the roof deck, the telecom masts and the plant.
function buildRoof(group, materials, stats) {
  const roof = new THREE.Group(); roof.name = 'KaiTakArenaRoof'; roof.add(new THREE.Group());
  group.add(roof);
  const deck = new THREE.Group(); deck.name = 'KaiTakArenaRoofDeck'; roof.add(deck);
  const ring = KAI_TAK_ARENA_SITE.localRing;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
    minZ = Math.min(minZ, ring[i + 1]); maxZ = Math.max(maxZ, ring[i + 1]);
  }
  // The deck is pulled 4 m inwards so it does not overhang the colour-field facades.
  const cxm = (minX + maxX) / 2, czm = (minZ + maxZ) / 2;
  const insetPoint = (x, z) => {
    const dx = x - cxm, dz = z - czm, length = Math.hypot(dx, dz) || 1;
    return [x - (dx / length) * M.inset, z - (dz / length) * M.inset];
  };
  const shape = new THREE.Shape();
  const p0 = insetPoint(ring[0], ring[1]);
  shape.moveTo(p0[0], p0[1]);
  for (let i = 2; i + 1 < ring.length; i += 2) {
    const p = insetPoint(ring[i], ring[i + 1]);
    shape.lineTo(p[0], p[1]);
  }
  shape.closePath();
  const roofGeometry = new THREE.ShapeGeometry(shape);
  roofGeometry.rotateX(Math.PI / 2);
  roofGeometry.translate(0, M.roofHeight, 0);
  const roofMesh = new THREE.Mesh(roofGeometry, materials.roof);
  roofMesh.name = 'KaiTakArenaFlatRoof';
  roofMesh.receiveShadow = true;
  deck.add(roofMesh);

  // The arena hall drum rises above the podium wing (the main 競技場 sits here). It carries the same charcoal band
  // and colour-field treatment, so from outside it reads as the arena rather than a roof lump.
  const hallX = minX + M.inset + M.hallWidth / 2 + 6, hallZ = (minZ + maxZ) / 2;
  const hall = [], hallBand = [], hallPanels = store();
  box(hall, [hallX, (M.podiumHeight + M.hallHeight) / 2, hallZ], [M.hallWidth, M.hallHeight - M.podiumHeight, M.hallLength]);
  box(hallBand, [hallX, M.hallHeight - 2.4, hallZ], [M.hallWidth + 1.0, 5.2, M.hallLength + 1.0]);
  box(hall, [hallX, M.hallHeight + 0.4, hallZ], [M.hallWidth + 1.6, 0.8, M.hallLength + 1.6]);
  // Colour-field strips on the two long faces of the drum, above the podium band.
  for (const side of [-1, 1]) {
    const columns = Math.round(M.hallLength / M.panelPitch);
    for (let i = 0; i < columns; i++) {
      const t = (i + 0.5) / columns - 0.5;
      const z = hallZ + t * M.hallLength;
      const tint = panelTint(i * 5, false);
      const x = hallX + side * (M.hallWidth / 2 + 0.05);
      quad(hallPanels, [x, M.podiumHeight, z - 0.55], [x, M.podiumHeight, z + 0.55],
        [x, M.hallHeight - 4.8, z + 0.55], [x, M.hallHeight - 4.8, z - 0.55], tint);
    }
  }
  merged(roof, hall, materials.band, 'KaiTakArenaHallDrum');
  merged(roof, hallBand, materials.bandEdge, 'KaiTakArenaHallDrumBand');
  meshStore(roof, hallPanels, materials.panel, 'KaiTakArenaHallDrumPanels');

  // Row of slim telecom masts along the roofline, as photographed above the charcoal band.
  const masts = [], dishes = [];
  for (let i = 0; i < M.masts; i++) {
    const t = (i + 0.5) / M.masts;
    const x = minX + M.inset + 8 + t * (maxX - minX - M.inset * 2 - 16);
    cylinder(masts, [x, M.roofHeight + M.mastHeight / 2, minZ + M.inset + 1.6], 0.10, M.mastHeight, 6);
    for (let k = 0; k < 3; k++) {
      box(dishes, [x, M.roofHeight + 2.2 + k * 1.5, minZ + M.inset + 1.9], [0.55, 0.9, 0.12]);
    }
  }
  merged(roof, masts, materials.mast, 'KaiTakArenaRoofMasts');
  merged(roof, dishes, materials.mast, 'KaiTakArenaRoofAntennae');
  stats.kaiTakArenaRoofMasts = M.masts;
  stats.kaiTakArenaHallDrum = `${M.hallWidth} x ${M.hallLength} m to ${M.hallHeight} m`;
  return roof;
}

// Plaza: paved apron inside the surveyed block, kerbs, planters and the silver gymnast statue.
function buildPlaza(group, materials, stats) {
  const plaza = new THREE.Group(); plaza.name = 'KaiTakArenaPlaza'; group.add(plaza);
  const apron = store(), kerbs = [], planters = [], statue = [], trees = [], trunks = [];
  const ring = KAI_TAK_ARENA_SITE.localRing;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
    minZ = Math.min(minZ, ring[i + 1]); maxZ = Math.max(maxZ, ring[i + 1]);
  }
  quad(apron, [minX, 0.05, minZ], [maxX, 0.05, minZ], [maxX, 0.05, maxZ], [minX, 0.05, maxZ], C.paving);
  box(kerbs, [(minX + maxX) / 2, 0.14, minZ + M.inset + 1.0], [maxX - minX, 0.28, 0.5]);
  // Silver gymnast statue on the forecourt, before the west end of the colour field.
  const sx = minX + 12, sz = minZ + 22;
  box(planters, [sx, 0.6, sz], [7.0, 1.2, 7.0]);
  cylinder(statue, [sx, 2.2, sz], 0.5, 2.2, 8);
  // A simplified but recognisable gymnast: raised arms, a leaning torso and one lifted leg.
  merged(plaza, statue, materials.statue, 'KaiTakArenaGymnastStatue');
  const limbs = [];
  beam(limbs, [sx, 3.3, sz], [sx + 0.6, 5.1, sz - 0.3], 0.28, 0.28);
  beam(limbs, [sx, 3.3, sz], [sx - 0.5, 5.0, sz + 0.35], 0.26, 0.26);
  beam(limbs, [sx, 3.2, sz], [sx + 0.1, 6.3, sz], 0.32, 0.32);
  beam(limbs, [sx + 0.1, 6.3, sz], [sx + 1.5, 7.6, sz - 0.2], 0.22, 0.22);
  beam(limbs, [sx + 0.1, 6.3, sz], [sx - 1.3, 7.8, sz + 0.2], 0.22, 0.22);
  beam(limbs, [sx, 3.2, sz], [sx - 1.7, 1.2, sz + 0.5], 0.30, 0.30);
  beam(limbs, [sx, 3.2, sz], [sx + 1.9, 2.6, sz - 0.4], 0.28, 0.28);
  merged(plaza, limbs, materials.statue, 'KaiTakArenaGymnastLimbs');
  // Planters and trees along the frontage.
  for (let i = 0; i < 8; i++) {
    const x = minX + 20 + i * ((maxX - minX - 40) / 7);
    box(planters, [x, 0.35, minZ + M.inset + 5.0], [3.0, 0.7, 3.0]);
    cylinder(trunks, [x, 2.4, minZ + M.inset + 5.0], 0.22, 3.6, 8);
    const crown = new THREE.SphereGeometry(2.2, 10, 7); crown.translate(x, 5.2, minZ + M.inset + 5.0); trees.push(crown);
  }
  meshStore(plaza, apron, materials.paving, 'KaiTakArenaPlazaPaving', false);
  merged(plaza, kerbs, materials.stone, 'KaiTakArenaPlazaKerbs');
  merged(plaza, planters, materials.stone, 'KaiTakArenaPlanters');
  merged(plaza, trunks, materials.stone, 'KaiTakArenaTreeTrunks');
  merged(plaza, trees, materials.lawn, 'KaiTakArenaTreeCrowns');
  stats.kaiTakArenaPlazaTrees = trees.length;
  return plaza;
}

export function buildKaiTakArena(root, { groundOffset = 0 } = {}) {
  const arena = new THREE.Group();
  arena.name = 'KaiTakArena';
  arena.position.set(KAI_TAK_ARENA_SITE.x, groundOffset, KAI_TAK_ARENA_SITE.z);
  arena.rotation.y = KAI_TAK_ARENA_SITE.ry;
  root.add(arena);
  const materials = makeMaterials();
  const stats = {};
  buildPlaza(arena, materials, stats);
  buildFacades(arena, materials, stats);
  buildRoof(arena, materials, stats);

  const colliders = harbourCityRingColliders(KAI_TAK_ARENA_SITE, groundOffset, groundOffset + M.roofHeight, 1.4);
  colliders.push(harbourCityLocalCollider(KAI_TAK_ARENA_SITE,
    KAI_TAK_ARENA_SITE.localRing.reduce((min, value, index) => index % 2 ? min : Math.min(min, value), Infinity) + M.inset + M.hallWidth / 2 + 6,
    0, M.hallWidth, M.hallLength, groundOffset, groundOffset + M.hallHeight));

  const landmarks = [{
    id: 'kai-tak-arena', name: '啟德體藝館 · Kai Tak Arena',
    position: { x: KAI_TAK_ARENA_SITE.x, y: groundOffset, z: KAI_TAK_ARENA_SITE.z },
    radius: 150, height: M.hallHeight, components: 2,
  }];

  Object.assign(stats, {
    kaiTakArenaGroundOffset: groundOffset,
    kaiTakArenaLandmarks: 1,
    kaiTakArenaInventoryId: 'HK-B0105',
    kaiTakArenaOsmWay: KAI_TAK_ARENA_OSM_SOURCE.id,
    kaiTakArenaRingArea: KAI_TAK_ARENA_SITE.ringArea,
    kaiTakArenaCapacity: KAI_TAK_ARENA_CAPACITY,
    kaiTakArenaSecondarySeats: KAI_TAK_ARENA_SECONDARY_SEATS,
    kaiTakArenaMainHallSquareMetres: KAI_TAK_ARENA_MAIN_HALL_SQUARE_METRES,
    kaiTakArenaCeilingHeight: KAI_TAK_ARENA_CEILING_HEIGHT,
    kaiTakArenaRetractableShare: KAI_TAK_ARENA_RETRACTABLE_SHARE,
    kaiTakArenaOpened: KAI_TAK_ARENA_OPENED,
    kaiTakArenaSports: KAI_TAK_ARENA_SPORTS.join(', '),
    kaiTakArenaArchitects: KAI_TAK_ARENA_ARCHITECTS,
    kaiTakArenaResearchSources: KAI_TAK_ARENA_RESEARCH_SOURCES.length,
    kaiTakArenaColliders: colliders.length,
    kaiTakArenaBandHeight: M.bandHeight,
    kaiTakArenaPodiumHeight: M.podiumHeight,
    kaiTakArenaRoofHeight: M.roofHeight,
  });

  return {
    group: arena, colliders, landmarks, stats, groundOffset,
    hallHeight: M.hallHeight,
    groundHeightAt(x, z, fallback) {
      return kaiTakArenaTerrainHeightAt(x, z, fallback, groundOffset);
    },
  };
}
