import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  KOWLOON_SHANGRI_LA_SITE, KOWLOON_SHANGRI_LA_TOWER_SITE, KOWLOON_SHANGRI_LA_MODEL_HEIGHT,
  KOWLOON_SHANGRI_LA_PODIUM_HEIGHT, KOWLOON_SHANGRI_LA_ROAD_SOFFIT,
  KOWLOON_SHANGRI_LA_GUESTROOM_ROWS, KOWLOON_SHANGRI_LA_GUESTROOM_FLOOR_HEIGHT,
  KOWLOON_SHANGRI_LA_BAY_PROJECTION, KOWLOON_SHANGRI_LA_MAIN_ENTRANCE,
  KOWLOON_SHANGRI_LA_CANOPY_WIDTH, KOWLOON_SHANGRI_LA_CANOPY_DEPTH, KOWLOON_SHANGRI_LA_CANOPY_SOFFIT,
  KOWLOON_SHANGRI_LA_SOURCE_ENTRANCE_NODE, KOWLOON_SHANGRI_LA_COMPLETION_YEAR,
  kowloonShangriLaRoadRecords, kowloonShangriLaTerrainHeightAt,
} from './kowloon-shangri-la-architecture.js';
import {
  harbourCityRingColliders, harbourCityLocalCollider, harbourCityEdgeOutward,
} from './harbour-city-architecture.js';
import {
  store, quad, merged, meshStore, box, beam, cylinder, sphere, edgeBox, point, ringBand,
  harbourCityPalette, nightAmount, warmWindowEmission, createStreetLevel, hash, mix,
} from './harbour-city-world-utils.js';
import { ringShellGeometry, meshFromGeometry, createRingWindowRows, makeCanvasSign } from './tst-hotel-world-utils.js';

const absolute = (colliders, base) => colliders.map((collider) => ({ ...collider, minY: collider.minY + base, maxY: collider.maxY + base }));
function facadeFrame(site = KOWLOON_SHANGRI_LA_SITE, edge = KOWLOON_SHANGRI_LA_MAIN_ENTRANCE.sourceEdge) {
  const outward = harbourCityEdgeOutward(site.localRing, edge);
  return { outward, tangent: { x: outward.nz, z: -outward.nx }, rotation: Math.atan2(outward.nx, outward.nz) };
}
function entrancePoint(x, z) {
  const { outward, tangent } = facadeFrame(), e = KOWLOON_SHANGRI_LA_MAIN_ENTRANCE;
  return { x: e.localX + tangent.x * x + outward.nx * z, z: e.localZ + tangent.z * x + outward.nz * z };
}

function buildEntrance(group, base, materials) {
  const e = KOWLOON_SHANGRI_LA_MAIN_ENTRANCE, portal = new THREE.Group();
  portal.name = 'Kowloon Shangri-La photo-directed Mody Road arrival-court entrance';
  portal.position.set(e.localX, 0, e.localZ); portal.rotation.y = facadeFrame().rotation; group.add(portal);
  const glass = [], frames = [], canopy = [], columns = [], lights = [];
  for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * 1.82;
    box(glass, [x, 2.25, 0.08], [1.68, 4.35, 0.13]);
    box(frames, [x - 0.89, 2.28, 0.16], [0.09, 4.55, 0.16]);
    box(frames, [x, 2.05, 0.23], [0.055, 0.82, 0.07]);
  }
  box(canopy, [0, KOWLOON_SHANGRI_LA_CANOPY_SOFFIT + 0.18, KOWLOON_SHANGRI_LA_CANOPY_DEPTH * 0.5],
    [KOWLOON_SHANGRI_LA_CANOPY_WIDTH, 0.36, KOWLOON_SHANGRI_LA_CANOPY_DEPTH]);
  box(canopy, [0, KOWLOON_SHANGRI_LA_CANOPY_SOFFIT - 0.02, KOWLOON_SHANGRI_LA_CANOPY_DEPTH - 0.10],
    [KOWLOON_SHANGRI_LA_CANOPY_WIDTH, 0.62, 0.20]);
  for (const x of [-7.55, 7.55]) {
    box(columns, [x, KOWLOON_SHANGRI_LA_CANOPY_SOFFIT * 0.5, KOWLOON_SHANGRI_LA_CANOPY_DEPTH - 0.60], [0.38, KOWLOON_SHANGRI_LA_CANOPY_SOFFIT, 0.38]);
    for (const z of [1.25, 3.75]) cylinder(columns, [x, 0.48, z], 0.11, 0.96, 10);
  }
  for (const x of [-6, -3, 0, 3, 6]) box(lights, [x, KOWLOON_SHANGRI_LA_CANOPY_SOFFIT - 0.035, 2.6], [0.28, 0.06, 0.28]);
  merged(portal, glass, materials.dark, 'Kowloon Shangri-La warm recessed lobby glazing');
  merged(portal, frames, materials.metal, 'Kowloon Shangri-La bronze door mullions and pulls');
  merged(portal, canopy, materials.metal, 'Kowloon Shangri-La dark porte-cochere canopy');
  merged(portal, columns, materials.metal, 'Kowloon Shangri-La arrival columns and bollards');
  const downlight = new THREE.MeshStandardMaterial({ color: 0xffdfac, roughness: 0.45 });
  downlight.emissiveNode = color(1, 0.68, 0.34).mul(nightAmount()).mul(1.1);
  merged(portal, lights, downlight, 'Warm Kowloon Shangri-La porte-cochere downlights', false);
  const sign = makeCanvasSign(17.2, 2.75, (ctx, canvas) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#d4b675';
    ctx.font = '700 174px Georgia, "Times New Roman", serif'; ctx.fillText('Shangri-La', canvas.width / 2, 120, 1420);
    ctx.font = '600 65px "Noto Sans CJK TC", "PingFang HK", sans-serif'; ctx.fillText('九龍香格里拉', canvas.width / 2, 245, 900);
    ctx.font = '500 34px Arial, sans-serif'; ctx.fillText('KOWLOON  ·  HONG KONG  ·  64 MODY ROAD', canvas.width / 2, 326, 1250);
  }, { emissive: true, canvasWidth: 1536, canvasHeight: 384 });
  sign.name = 'Gold Shangri-La lettering and Kowloon identity on the dark podium';
  sign.position.set(0, 7.15, 0.22); portal.add(sign);
  const colliders = [];
  for (const x of [-7.55, 7.55]) {
    const p = entrancePoint(x, KOWLOON_SHANGRI_LA_CANOPY_DEPTH - 0.60);
    colliders.push(harbourCityLocalCollider(KOWLOON_SHANGRI_LA_SITE, p.x, p.z, 0.42, 0.42, base, base + KOWLOON_SHANGRI_LA_CANOPY_SOFFIT));
  }
  return colliders;
}

function buildPodium(group, base, materials) {
  const site = KOWLOON_SHANGRI_LA_SITE;
  const street = createStreetLevel(site, {
    soffit: KOWLOON_SHANGRI_LA_ROAD_SOFFIT, customEdges: [KOWLOON_SHANGRI_LA_MAIN_ENTRANCE.sourceEdge], bayWidth: 3.4,
    glassA: [0.055, 0.085, 0.082], glassB: [0.24, 0.25, 0.20], backingTint: [0.12, 0.10, 0.075], stoneTint: [0.24, 0.21, 0.17],
  });
  meshStore(group, street.backing, materials.interior, 'Kowloon Shangri-La dark ground-floor backing outside road bays');
  meshStore(group, street.glass, materials.glazing, 'Kowloon Shangri-La ground-floor lobby and arrival glazing');
  meshStore(group, street.stone, materials.interior, 'Kowloon Shangri-La dark bronze podium courses');
  merged(group, street.frames, materials.metal, 'Kowloon Shangri-La road-safe ground lintels');
  merged(group, street.columns, materials.stone, 'Kowloon Shangri-La road-safe porte-cochere columns');

  meshFromGeometry(group, ringShellGeometry(site.localRing, KOWLOON_SHANGRI_LA_ROAD_SOFFIT, KOWLOON_SHANGRI_LA_PODIUM_HEIGHT), materials.stone,
    'Exact OSM two-level dark bronze Kowloon Shangri-La upper podium above the open arrival roads');
  const windows = createRingWindowRows(site, {
    y0: KOWLOON_SHANGRI_LA_ROAD_SOFFIT, rowCount: 1, floorHeight: KOWLOON_SHANGRI_LA_PODIUM_HEIGHT - KOWLOON_SHANGRI_LA_ROAD_SOFFIT,
    sill: 0.48, windowHeight: 2.40, targetBayWidth: 3.4, windowRatio: 0.78, jambWidth: 0.11, frameDepth: 0.18,
    tintA: [0.055, 0.085, 0.085], tintB: [0.24, 0.27, 0.24], litThreshold: 0.58,
    edgePredicate: (edge) => edge !== KOWLOON_SHANGRI_LA_MAIN_ENTRANCE.sourceEdge,
  });
  meshStore(group, windows.glass, materials.glazing, 'Kowloon Shangri-La upper-podium ribbon glazing');
  merged(group, windows.frames, materials.metal, 'Kowloon Shangri-La upper-podium bronze mullions');
  merged(group, windows.sills, materials.metal, 'Kowloon Shangri-La upper-podium horizontal frames');
  const bands = [], planters = [], shrubs = [];
  ringBand(bands, site, KOWLOON_SHANGRI_LA_ROAD_SOFFIT + 0.05, 0.24, 0.14, 0.26);
  ringBand(bands, site, KOWLOON_SHANGRI_LA_PODIUM_HEIGHT - 0.16, 0.32, 0.16, 0.30);
  ringBand(planters, site, KOWLOON_SHANGRI_LA_PODIUM_HEIGHT + 0.22, 0.44, -0.68, 0.62);
  ringBand(shrubs, site, KOWLOON_SHANGRI_LA_PODIUM_HEIGHT + 0.58, 0.52, -0.68, 0.54);
  merged(group, bands, materials.metal, 'Kowloon Shangri-La dark podium edge courses');
  merged(group, planters, materials.stone, 'Kowloon Shangri-La podium terrace planters');
  merged(group, shrubs, materials.lawn, 'Kowloon Shangri-La podium terrace planting');

  // The photographs show a row of podium flagpoles; coloured flags are authored geometry, not copied flag textures.
  const poles = [], finials = [], redFlags = [], goldFlags = [];
  for (const [index, t] of [0.26, 0.36, 0.46, 0.60, 0.70].entries()) {
    const p = point(site, KOWLOON_SHANGRI_LA_MAIN_ENTRANCE.sourceEdge, t, KOWLOON_SHANGRI_LA_PODIUM_HEIGHT, -0.68);
    cylinder(poles, [p[0], p[1] + 2.45, p[2]], 0.045, 4.9, 10); sphere(finials, [p[0], p[1] + 4.96, p[2]], 0.085, 10);
    edgeBox(index % 2 ? goldFlags : redFlags, site, KOWLOON_SHANGRI_LA_MAIN_ENTRANCE.sourceEdge, t + 0.018,
      KOWLOON_SHANGRI_LA_PODIUM_HEIGHT + 4.15, -0.68, 1.25, 0.72, 0.045);
  }
  merged(group, poles, materials.metal, 'Photo-directed Kowloon Shangri-La podium flagpoles');
  merged(group, finials, materials.gold, 'Kowloon Shangri-La flagpole finials');
  merged(group, redFlags, materials.redFlag, 'Photo-directed red ceremonial flags');
  merged(group, goldFlags, materials.goldFlag, 'Photo-directed gold hotel flags');
  const colliders = [
    ...absolute(street.colliders, base),
    ...harbourCityRingColliders(site, base + KOWLOON_SHANGRI_LA_ROAD_SOFFIT, base + KOWLOON_SHANGRI_LA_PODIUM_HEIGHT, 0.44),
    ...buildEntrance(group, base, materials),
  ];
  return { colliders, windows: windows.panels, openRoadBays: street.openRoadBays, closedRoadBays: street.closedBays, flagpoles: 5 };
}

// Each guestroom bay has a front pane and two angled side panes. All three are real geometry with
// dark bronze jambs and transoms, producing the photographed projecting / sawtooth facade rather than a flat texture.
function createProjectingBayWindows(site) {
  const glass = store(), frames = [], fins = [];
  let bayWindows = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, bays = Math.max(1, Math.round(length / 3.25));
    for (let bay = 0; bay <= bays; bay++) edgeBox(fins, site, edge, bay / bays,
      (KOWLOON_SHANGRI_LA_PODIUM_HEIGHT + KOWLOON_SHANGRI_LA_MODEL_HEIGHT) * 0.5, 0.10, 0.14,
      KOWLOON_SHANGRI_LA_MODEL_HEIGHT - KOWLOON_SHANGRI_LA_PODIUM_HEIGHT, 0.24);
    for (let row = 0; row < KOWLOON_SHANGRI_LA_GUESTROOM_ROWS; row++) {
      const low = KOWLOON_SHANGRI_LA_PODIUM_HEIGHT + row * KOWLOON_SHANGRI_LA_GUESTROOM_FLOOR_HEIGHT + 0.42;
      const high = low + 2.82;
      for (let bay = 0; bay < bays; bay++) {
        const middle = (bay + 0.5) / bays, baseHalf = 0.45 / bays, frontHalf = 0.33 / bays;
        const bl = point(site, edge, middle - baseHalf, low, 0.08), br = point(site, edge, middle + baseHalf, low, 0.08);
        const fl = point(site, edge, middle - frontHalf, low, KOWLOON_SHANGRI_LA_BAY_PROJECTION);
        const fr = point(site, edge, middle + frontHalf, low, KOWLOON_SHANGRI_LA_BAY_PROJECTION);
        const blH = [bl[0], high, bl[2]], brH = [br[0], high, br[2]], flH = [fl[0], high, fl[2]], frH = [fr[0], high, fr[2]];
        const variation = hash(edge + 29403978, row + 13, bay + 37);
        const lit = variation > 0.76 ? 0.08 + hash(row, bay, edge, 641) * 0.32 : 0;
        const frontTint = mix([0.12, 0.19, 0.20], [0.56, 0.60, 0.57], 0.16 + variation * 0.72);
        const sideTint = frontTint.map((value) => value * 0.72);
        quad(glass, fl, fr, frH, flH, frontTint, lit);
        quad(glass, fl, bl, blH, flH, sideTint, lit * 0.85);
        quad(glass, br, fr, frH, brH, sideTint, lit * 0.85);
        for (const [a, b] of [[bl, blH], [fl, flH], [fr, frH], [br, brH]]) beam(frames, a, b, 0.105, 0.105);
        for (const [a, b, aH, bH] of [[bl, fl, blH, flH], [fl, fr, flH, frH], [fr, br, frH, brH]]) {
          beam(frames, a, b, 0.12, 0.12); beam(frames, aH, bH, 0.12, 0.12);
        }
        bayWindows++;
      }
    }
  }
  return { glass, frames, fins, bayWindows, panels: bayWindows * 3 };
}

function buildTower(group, base, materials) {
  const site = KOWLOON_SHANGRI_LA_TOWER_SITE;
  meshFromGeometry(group, ringShellGeometry(site.localRing, KOWLOON_SHANGRI_LA_PODIUM_HEIGHT, KOWLOON_SHANGRI_LA_MODEL_HEIGHT), materials.dark,
    'Photo-derived inset Kowloon Shangri-La tower backing on fourteen guestroom floors');
  const windows = createProjectingBayWindows(site);
  meshStore(group, windows.glass, materials.glazing, 'Fourteen floors of projecting three-sided Kowloon Shangri-La bay windows');
  merged(group, windows.frames, materials.metal, 'Angled dark-bronze bay-window jambs and transoms');
  merged(group, windows.fins, materials.metal, 'Continuous dark-bronze vertical bay mullions');
  const bands = [], parapet = [], plant = [], grilles = [];
  for (let row = 0; row <= KOWLOON_SHANGRI_LA_GUESTROOM_ROWS; row++) {
    ringBand(bands, site, KOWLOON_SHANGRI_LA_PODIUM_HEIGHT + row * KOWLOON_SHANGRI_LA_GUESTROOM_FLOOR_HEIGHT, 0.14, 0.10, 0.16);
  }
  ringBand(parapet, site, KOWLOON_SHANGRI_LA_MODEL_HEIGHT + 0.10, 0.34, 0.04, 0.22);
  merged(group, bands, materials.metal, 'Kowloon Shangri-La guestroom floor-edge bands');
  merged(group, parapet, materials.metal, 'Kowloon Shangri-La dark roof parapet');
  for (const x of [-24, -12, 0, 12, 24]) {
    box(plant, [x, KOWLOON_SHANGRI_LA_MODEL_HEIGHT + 0.32, 18], [4.2, 0.64, 2.4]);
    box(grilles, [x, KOWLOON_SHANGRI_LA_MODEL_HEIGHT + 0.655, 18], [3.5, 0.035, 1.75]);
  }
  merged(group, plant, materials.roof, 'Low Kowloon Shangri-La rooftop plant');
  merged(group, grilles, materials.dark, 'Kowloon Shangri-La rooftop ventilation grilles');
  return {
    windows: windows.panels, bayWindows: windows.bayWindows,
    colliders: harbourCityRingColliders(site, base + KOWLOON_SHANGRI_LA_PODIUM_HEIGHT, base + KOWLOON_SHANGRI_LA_MODEL_HEIGHT, 0.42),
  };
}

export function buildKowloonShangriLa(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group(); root.name = 'Kowloon Shangri-La — exact OSM podium, preserved arrival roads and photo-derived bay-window tower'; scene.add(root);
  const group = new THREE.Group(); group.name = 'Kowloon Shangri-La dark podium and fourteen projecting bay-window floors';
  group.position.set(KOWLOON_SHANGRI_LA_SITE.x, groundOffset, KOWLOON_SHANGRI_LA_SITE.z);
  group.rotation.y = KOWLOON_SHANGRI_LA_SITE.ry; root.add(group);
  const materials = harbourCityPalette({
    stone: [0.24, 0.21, 0.17], paleStone: [0.34, 0.29, 0.22], metal: [0.25, 0.20, 0.14], roof: [0.20, 0.21, 0.19], roughness: 0.22, metalness: 0.38,
  });
  materials.dark.color.set(0x171713); materials.metal.roughness = 0.32;
  materials.gold = new THREE.MeshStandardMaterial({ color: 0xc0a164, roughness: 0.30, metalness: 0.72 });
  materials.redFlag = new THREE.MeshStandardMaterial({ color: 0xa92b27, roughness: 0.82, metalness: 0 });
  materials.goldFlag = new THREE.MeshStandardMaterial({ color: 0xb99a52, roughness: 0.82, metalness: 0 });
  warmWindowEmission(materials.glazing, [1, 0.79, 0.50], 0.72);
  const podium = buildPodium(group, groundOffset, materials), tower = buildTower(group, groundOffset, materials);
  const colliders = [...podium.colliders, ...tower.colliders];
  const landmark = {
    name: KOWLOON_SHANGRI_LA_SITE.name, englishName: KOWLOON_SHANGRI_LA_SITE.englishName,
    x: KOWLOON_SHANGRI_LA_SITE.x, z: KOWLOON_SHANGRI_LA_SITE.z,
    w: KOWLOON_SHANGRI_LA_SITE.w, d: KOWLOON_SHANGRI_LA_SITE.d, h: KOWLOON_SHANGRI_LA_MODEL_HEIGHT,
    bounds: { ...KOWLOON_SHANGRI_LA_SITE.bounds }, ring: KOWLOON_SHANGRI_LA_SITE.ring,
    osmId: KOWLOON_SHANGRI_LA_SITE.osmId, heightEvidence: 'photo-derived 62 m scene massing; no OSM or official height',
  };
  return {
    root, group, colliders, landmarks: [landmark], groundOffset, site: KOWLOON_SHANGRI_LA_SITE,
    towerSite: KOWLOON_SHANGRI_LA_TOWER_SITE, roads: kowloonShangriLaRoadRecords(),
    groundHeightAt: (x, z, ground) => kowloonShangriLaTerrainHeightAt(x, z, ground, groundOffset),
    stats: {
      kowloonShangriLaSourceBuildings: 1, kowloonShangriLaSourceVertices: 10,
      kowloonShangriLaRingArea: KOWLOON_SHANGRI_LA_SITE.ringArea, kowloonShangriLaOsmHeight: null,
      kowloonShangriLaOsmLevels: 16, kowloonShangriLaModelHeight: KOWLOON_SHANGRI_LA_MODEL_HEIGHT,
      kowloonShangriLaGuestroomRows: KOWLOON_SHANGRI_LA_GUESTROOM_ROWS, kowloonShangriLaPodiumLevels: 2,
      kowloonShangriLaCompletionYear: KOWLOON_SHANGRI_LA_COMPLETION_YEAR,
      kowloonShangriLaSourceEntranceNode: KOWLOON_SHANGRI_LA_SOURCE_ENTRANCE_NODE.id,
      kowloonShangriLaRoadCrossings: 2, kowloonShangriLaOpenRoadBays: podium.openRoadBays,
      kowloonShangriLaClosedGroundBays: podium.closedRoadBays, kowloonShangriLaRoadSoffit: KOWLOON_SHANGRI_LA_ROAD_SOFFIT,
      kowloonShangriLaBayWindows: tower.bayWindows, kowloonShangriLaWindows: podium.windows + tower.windows,
      kowloonShangriLaFlagpoles: podium.flagpoles, kowloonShangriLaColliders: colliders.length,
    },
  };
}
