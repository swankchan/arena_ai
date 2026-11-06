import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  PENINSULA_HERITAGE_SITE, PENINSULA_TOWER_SITE, PENINSULA_FORECOURT_SITE, PENINSULA_GROUND_SITES,
  PENINSULA_HERITAGE_HEIGHT, PENINSULA_TOWER_OSM_HEIGHT, PENINSULA_TOWER_HEIGHT,
  PENINSULA_TOWER_VISIBLE_ROOM_ROWS, PENINSULA_LOBBY_ARCH_HEIGHT,
  PENINSULA_MAIN_ENTRANCE, PENINSULA_ARCADE_ENTRANCE, PENINSULA_FOUNTAIN_CENTER, PENINSULA_FOUNTAIN_RADII,
  peninsulaWorldToLocal, peninsulaRoadRecords, peninsulaTerrainHeightAt,
} from './peninsula-hotel-architecture.js';
import {
  harbourCityRingColliders, harbourCitySegmentCollider, harbourCityLocalCollider,
  harbourCityEdgeOutward,
} from './harbour-city-architecture.js';
import {
  merged, box, cylinder, sphere, beam, point, edgeBox, ringBand,
  meshStore, harbourCityPalette, nightAmount, store, quad,
} from './harbour-city-world-utils.js';
import {
  ringShellGeometry, meshFromGeometry, createRingWindowRows, archPanelGeometry,
  placeFacadeGeometry, makeCanvasSign,
} from './tst-hotel-world-utils.js';

function siteGroup(root, site, base, name) {
  const group = new THREE.Group(); group.name = name;
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group); return group;
}

function stripedAwnings(site) {
  const awnings = store(); let strips = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, count = Math.max(1, Math.ceil(length / 0.68));
    for (let strip = 0; strip < count; strip++) {
      const t0 = strip / count + 0.0005, t1 = (strip + 1) / count - 0.0005;
      const tint = strip % 2 ? [0.82, 0.83, 0.73] : [0.12, 0.30, 0.24];
      quad(awnings, point(site, edge, t0, 7.18, 0.30), point(site, edge, t1, 7.18, 0.30),
        point(site, edge, t1, 6.78, 1.32), point(site, edge, t0, 6.78, 1.32), tint);
      quad(awnings, point(site, edge, t0, 6.78, 1.32), point(site, edge, t1, 6.78, 1.32),
        point(site, edge, t1, 6.48, 1.32), point(site, edge, t0, 6.48, 1.32), tint);
      strips++;
    }
  }
  return { awnings, strips };
}

function centralBalcony(site, materials) {
  const group = new THREE.Group(); group.name = 'The Peninsula curved central balcony and balustrade';
  const floor = store(), rails = [], balusters = [], edge = 4, segments = 22;
  const curveOffset = (t) => 0.55 + Math.sin(t * Math.PI) * 0.85;
  for (let i = 0; i < segments; i++) {
    const t0 = 0.34 + i / segments * 0.32, t1 = 0.34 + (i + 1) / segments * 0.32;
    quad(floor, point(site, edge, t0, 24.65, 0.15), point(site, edge, t1, 24.65, 0.15),
      point(site, edge, t1, 24.65, curveOffset(t1)), point(site, edge, t0, 24.65, curveOffset(t0)), [0.78, 0.75, 0.66]);
    const a = point(site, edge, t0, 25.72, curveOffset(t0)), b = point(site, edge, t1, 25.72, curveOffset(t1));
    beam(rails, a, b, 0.10); beam(rails, [a[0], 24.83, a[2]], [b[0], 24.83, b[2]], 0.08);
    if (i % 2 === 0) beam(balusters, point(site, edge, t0, 24.72, curveOffset(t0)), a, 0.075);
  }
  meshStore(group, floor, materials.interior, 'Curved balcony stone deck');
  merged(group, rails, materials.paleStone, 'Curved balcony continuous handrails');
  merged(group, balusters, materials.paleStone, 'Individual balcony balusters');
  return group;
}

function entranceGroup(site, entrance, materials, title, width = 10) {
  const group = new THREE.Group(); group.name = title;
  const local = peninsulaWorldToLocal(site, entrance.x, entrance.z);
  const outward = harbourCityEdgeOutward(site.localRing, entrance.sourceEdge);
  group.position.set(local.x, 0, local.z); group.rotation.y = Math.atan2(outward.nx, outward.nz);
  const glass = [], frames = [], canopy = [];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * width / 5;
    box(glass, [x, 2.25, 0.10], [width / 5 - 0.12, 4.35, 0.12]);
    box(frames, [x - width / 10, 2.3, 0.20], [0.075, 4.6, 0.10]);
    box(frames, [x, 2.25, 0.24], [0.055, 0.75, 0.08]);
  }
  box(frames, [0, 4.52, 0.20], [width + 0.3, 0.13, 0.12]);
  box(canopy, [0, 5.55, 1.10], [width + 1.8, 0.28, 2.65]);
  box(canopy, [0, 5.28, 2.32], [width + 1.8, 0.55, 0.22]);
  for (const x of [-width * 0.46, width * 0.46]) box(frames, [x, 2.65, 2.12], [0.18, 5.3, 0.18]);
  merged(group, glass, materials.dark, `${title} recessed glazing`);
  merged(group, frames, materials.metal, `${title} bronze frames and door pulls`);
  merged(group, canopy, materials.paleStone, `${title} stone canopy`);
  return group;
}

function buildHeritage(root, base, materials) {
  const site = PENINSULA_HERITAGE_SITE, group = siteGroup(root, site, base, 'The Peninsula 1928 U-shaped heritage building');
  meshFromGeometry(group, ringShellGeometry(site.localRing, PENINSULA_LOBBY_ARCH_HEIGHT, PENINSULA_HERITAGE_HEIGHT), materials.stone,
    'Exact OSM seven-storey heritage shell above the open arch line');
  const windows = createRingWindowRows(site, {
    y0: 8.35, rowCount: 6, floorHeight: 4.62, sill: 0.72, windowHeight: 2.28,
    targetBayWidth: 3.05, windowRatio: 0.49, jambWidth: 0.15, frameDepth: 0.23,
    tintA: [0.035, 0.047, 0.044], tintB: [0.20, 0.22, 0.18], litThreshold: 0.74,
  });
  meshStore(group, windows.glass, materials.glazing, 'Individual dark heritage hotel windows');
  merged(group, windows.frames, materials.paleStone, 'Projecting heritage window jambs');
  merged(group, windows.sills, materials.paleStone, 'Heritage window sills and lintels');

  const arches = [], piers = [], archBacks = [], colliders = [], archMaterial = new THREE.MeshStandardMaterial({
    color: 0x26302c, roughness: 0.32, metalness: 0.18, side: THREE.DoubleSide,
  });
  archMaterial.emissiveNode = color(0.64, 0.43, 0.20).mul(nightAmount()).mul(0.20);
  let archCount = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const length = harbourCityEdgeOutward(site.localRing, edge).length, bays = Math.max(1, Math.round(length / 5.0));
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, middle = (t0 + t1) * 0.5;
      const mainOpening = edge === PENINSULA_MAIN_ENTRANCE.sourceEdge && Math.abs(middle - 0.5) < 0.115;
      const arcadeOpening = (edge === 9 && middle > 0.78) || (edge === 10 && middle < 0.22);
      if (!mainOpening && !arcadeOpening) {
        const width = Math.min(3.55, length / bays * 0.72);
        placeFacadeGeometry(arches, archPanelGeometry(width, 6.20), site, edge, middle, 0.10).translate(0, 0.30, 0);
        colliders.push(harbourCitySegmentCollider(site, edge, t0, t1, base, base + PENINSULA_LOBBY_ARCH_HEIGHT, 0.46));
        archCount++;
      }
    }
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays;
      if (edge === 4 && Math.abs(t - 0.5) < 0.13) continue;
      if ((edge === 9 && t === 1) || (edge === 10 && t === 0)) continue;
      edgeBox(piers, site, edge, t, PENINSULA_LOBBY_ARCH_HEIGHT * 0.5, -0.02, 0.82, PENINSULA_LOBBY_ARCH_HEIGHT, 0.76);
    }
    edgeBox(archBacks, site, edge, 0.5, 6.85, 0.02, length + 0.05, 0.72, 0.68);
    colliders.push(harbourCitySegmentCollider(site, edge, 0, 1, base + PENINSULA_LOBBY_ARCH_HEIGHT, base + PENINSULA_HERITAGE_HEIGHT, 0.46));
  }
  merged(group, arches, archMaterial, 'Rounded ground-floor arcade and portico openings');
  merged(group, piers, materials.stone, 'Rusticated ground-floor arch piers');
  merged(group, archBacks, materials.paleStone, 'Continuous arch-line entablature');
  group.add(entranceGroup(site, PENINSULA_MAIN_ENTRANCE, materials, 'The Peninsula main lobby entrance', 10.5));
  group.add(entranceGroup(site, PENINSULA_ARCADE_ENTRANCE, materials, 'The Peninsula Arcade exact OSM entrance', 5.5));

  const awnings = stripedAwnings(site);
  meshStore(group, awnings.awnings, materials.interior, 'Alternating Peninsula-green and ivory striped awnings', false);
  const cornices = [];
  ringBand(cornices, site, 7.22, 0.36, 0.26, 0.36);
  ringBand(cornices, site, 36.85, 0.30, 0.30, 0.38);
  ringBand(cornices, site, 39.15, 0.55, 0.52, 0.60);
  ringBand(cornices, site, 40.15, 0.75, 0.28, 0.32);
  merged(group, cornices, materials.paleStone, 'Layered classical cornices and roof parapet');

  const quoins = [];
  for (const vertex of [0, 3, 6, 9, 11, 12]) {
    const x = site.localRing[vertex * 2], z = site.localRing[vertex * 2 + 1];
    for (let row = 0; row < 45; row++) box(quoins, [x, 7.55 + row * 0.66, z], [row % 2 ? 0.74 : 1.06, 0.48, row % 2 ? 1.06 : 0.74]);
  }
  merged(group, quoins, materials.paleStone, 'Alternating dressed-stone corner quoins');
  group.add(centralBalcony(site, materials));

  const sign = makeCanvasSign(19.2, 1.55, (ctx, canvas) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#403f36';
    ctx.font = '500 61px Georgia, serif'; ctx.fillText('T H E   P E N I N S U L A', canvas.width / 2, canvas.height / 2, 1450);
  });
  sign.name = 'THE PENINSULA direct heritage facade lettering';
  const e = PENINSULA_MAIN_ENTRANCE, local = peninsulaWorldToLocal(site, e.x, e.z), outward = harbourCityEdgeOutward(site.localRing, e.sourceEdge);
  sign.position.set(local.x + outward.nx * 0.30, 28.55, local.z + outward.nz * 0.30); sign.rotation.y = Math.atan2(outward.nx, outward.nz); group.add(sign);
  return { group, colliders, windows: windows.panels, archCount, awningStrips: awnings.strips };
}

function buildTower(root, base, materials) {
  const site = PENINSULA_TOWER_SITE, group = siteGroup(root, site, base, 'The Peninsula 1994 tower and rooftop helipad');
  meshFromGeometry(group, ringShellGeometry(site.localRing, 0, PENINSULA_TOWER_OSM_HEIGHT), materials.stone,
    'Exact OSM tower shell with retained 115 m source roof convention');
  const windows = createRingWindowRows(site, {
    y0: 41.2, rowCount: PENINSULA_TOWER_VISIBLE_ROOM_ROWS, floorHeight: 2.78,
    sill: 0.43, windowHeight: 1.92, targetBayWidth: 2.75, windowRatio: 0.58,
    jambWidth: 0.11, frameDepth: 0.18, tintA: [0.035, 0.055, 0.060], tintB: [0.23, 0.26, 0.25],
  });
  meshStore(group, windows.glass, materials.glazing, 'Peninsula Tower repeated guestroom windows');
  merged(group, windows.frames, materials.paleStone, 'Peninsula Tower pale window jambs');
  merged(group, windows.sills, materials.paleStone, 'Peninsula Tower window sills and lintels');

  const channel = store(), fins = [];
  for (const edge of [5]) {
    quad(channel, point(site, edge, 0.425, 41.0, 0.19), point(site, edge, 0.575, 41.0, 0.19),
      point(site, edge, 0.575, 111.8, 0.19), point(site, edge, 0.425, 111.8, 0.19), [0.025, 0.065, 0.078], 0.025);
    for (const t of [0.425, 0.46, 0.50, 0.54, 0.575]) edgeBox(fins, site, edge, t, 76.4, 0.27, 0.15, 70.8, 0.22);
    for (let y = 43; y < 112; y += 5.56) edgeBox(fins, site, edge, 0.5, y, 0.26, 6.5, 0.10, 0.20);
  }
  meshStore(group, channel, materials.glazing, 'Dark vertical tower atrium glazing channel');
  merged(group, fins, materials.metal, 'Tower atrium mullions and transoms');
  const bands = [];
  ringBand(bands, site, 40.15, 0.48, 0.30, 0.36);
  ringBand(bands, site, 109.25, 0.40, 0.30, 0.36);
  ringBand(bands, site, 114.55, 0.70, 0.45, 0.52);
  merged(group, bands, materials.paleStone, 'Tower transfer band and stepped crown cornices');

  const crown = [], dark = [];
  box(crown, [0, 112.35, -0.4], [25.5, 5.3, 15.5]);
  box(crown, [0, 116.25, -0.4], [13.5, 2.5, 13.5]);
  box(crown, [-18.7, 111.15, -0.2], [10.5, 2.9, 15.8]);
  box(crown, [18.7, 111.15, -0.2], [10.5, 2.9, 15.8]);
  box(dark, [0, 112.1, 7.48], [7.0, 5.0, 0.20]);
  merged(group, crown, materials.paleStone, 'Stepped pale tower crown and raised central pavilion');
  merged(group, dark, materials.dark, 'Crown atrium shadow slot');

  const helipad = new THREE.Group(); helipad.name = 'CTBUH 117.7 m rooftop helipad with H marking'; group.add(helipad);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(7.9, 7.9, 0.30, 64), materials.paleStone);
  pad.position.y = PENINSULA_TOWER_HEIGHT - 0.15; pad.castShadow = true; helipad.add(pad);
  const padTop = new THREE.Mesh(new THREE.CylinderGeometry(7.45, 7.45, 0.035, 64), materials.roof);
  padTop.position.y = PENINSULA_TOWER_HEIGHT + 0.0175; helipad.add(padTop);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.75, 5.96, 64), materials.white);
  ring.rotation.x = -Math.PI / 2; ring.position.y = PENINSULA_TOWER_HEIGHT + 0.039; helipad.add(ring);
  const h = makeCanvasSign(4.4, 4.4, (ctx, canvas) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f2f0df';
    ctx.font = 'bold 285px Arial, sans-serif'; ctx.fillText('H', canvas.width / 2, canvas.height / 2 + 8);
  });
  h.rotation.x = -Math.PI / 2; h.position.y = PENINSULA_TOWER_HEIGHT + 0.045; helipad.add(h);
  const colliders = harbourCityRingColliders(site, base + 40, base + PENINSULA_TOWER_HEIGHT, 0.44);
  return { group, colliders, windows: windows.panels };
}

function buildForecourt(root, base, materials) {
  const heritage = PENINSULA_HERITAGE_SITE, group = siteGroup(root, heritage, base, 'The Peninsula fountain forecourt and arrival facilities');
  // Keep the five existing arrival lanes visible; only the lobby-side pedestrian walkway receives a stone overlay.
  const paving = [], lobbyEdge = PENINSULA_MAIN_ENTRANCE.sourceEdge;
  edgeBox(paving, heritage, lobbyEdge, 0.5, 0.035, 0.04, PENINSULA_MAIN_ENTRANCE.length * 0.94, 0.07, 2.4, 1.2);
  merged(group, paving, materials.paleStone, 'Photo-directed lobby stone walkway clear of preserved access roads', false);
  const centre = peninsulaWorldToLocal(heritage, PENINSULA_FOUNTAIN_CENTER.x, PENINSULA_FOUNTAIN_CENTER.z);
  const basin = new THREE.Group(); basin.name = 'Peninsula forecourt oval fountain basin and central spray'; basin.position.set(centre.x, 0, centre.z); group.add(basin);
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.42, 64), materials.stone);
  outer.scale.set(PENINSULA_FOUNTAIN_RADII.x, 1, PENINSULA_FOUNTAIN_RADII.z); outer.position.y = 0.23; outer.castShadow = true; basin.add(outer);
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x5c8b91, roughness: 0.18, metalness: 0.20, transparent: true, opacity: 0.82 });
  waterMaterial.emissiveNode = color(0.15, 0.30, 0.36).mul(nightAmount()).mul(0.18);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 64), waterMaterial);
  water.scale.set(5.82, 1, 3.73); water.position.y = 0.47; basin.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.065, 8, 64), materials.paleStone);
  rim.rotation.x = Math.PI / 2; rim.scale.set(6.08, 3.98, 1); rim.position.y = 0.50; basin.add(rim);

  const jetMaterial = new THREE.MeshStandardMaterial({ color: 0xd9f1ee, roughness: 0.16, metalness: 0.02, transparent: true, opacity: 0.48, depthWrite: false });
  jetMaterial.emissiveNode = color(0.52, 0.78, 0.84).mul(nightAmount()).mul(0.32);
  const jets = [], foam = [];
  cylinder(jets, [0, 2.55, 0], 0.20, 4.15, 12, 0.10);
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2, dx = Math.cos(angle), dz = Math.sin(angle);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(dx * 0.25, 3.55, dz * 0.25),
      new THREE.Vector3(dx * 1.55, 5.15, dz * 1.55), new THREE.Vector3(dx * 3.25, 0.68, dz * 2.05));
    jets.push(new THREE.TubeGeometry(curve, 16, 0.045, 5, false));
    sphere(foam, [dx * 3.25, 0.58, dz * 2.05], 0.30, 8);
  }
  merged(basin, jets, jetMaterial, 'Twelve arcing fountain jets and central water column', false);
  merged(basin, foam, jetMaterial, 'Fountain foam clusters', false);

  const bollards = [], rails = [], shrubs = [], lights = [];
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = centre.x + side * (8.4 + i * 2.0), z = centre.z - 5.8;
    cylinder(bollards, [x, 0.48, z], 0.11, 0.96, 10); cylinder(bollards, [x, 0.98, z], 0.15, 0.08, 10);
  }
  for (const side of [-1, 1]) {
    const x = centre.x + side * 10.8, z = centre.z - 4.9;
    cylinder(shrubs, [x, 0.42, z], 0.75, 0.84, 16);
    sphere(shrubs, [x, 1.35, z], 1.12, 12);
    for (let i = 0; i < 3; i++) {
      const sx = centre.x + side * (7.8 + i * 1.15), sz = centre.z - 5.7;
      box(lights, [sx, 0.20, sz], [0.28, 0.38, 0.28]);
    }
  }
  for (const side of [-1, 1]) {
    const x = centre.x + side * 6.7;
    beam(rails, [x, 0.15, centre.z - 5.9], [x, 1.12, centre.z - 5.9], 0.055);
    beam(rails, [x, 1.12, centre.z - 5.9], [x, 1.12, centre.z - 3.0], 0.055);
    beam(rails, [x, 1.12, centre.z - 3.0], [x, 0.15, centre.z - 3.0], 0.055);
  }
  merged(group, bollards, materials.metal, 'Forecourt arrival bollards outside the central pedestrian path');
  merged(group, rails, materials.metal, 'Accessible lobby approach handrails');
  merged(group, shrubs, materials.lawn, 'Clipped forecourt topiary planters');
  const uplight = new THREE.MeshStandardMaterial({ color: 0xc5bda6, roughness: 0.45, metalness: 0.35 });
  uplight.emissiveNode = color(1, 0.73, 0.40).mul(nightAmount()).mul(0.75);
  merged(group, lights, uplight, 'Restrained warm facade uplight fixtures', false);
  const collider = harbourCityLocalCollider(heritage, centre.x, centre.z, 12.5, 8.3, base, base + 0.55);
  return { group, collider, centre, jets: 13 };
}

export function buildPeninsulaHotel(scene, { groundOffset = 0 } = {}) {
  const root = new THREE.Group(); root.name = 'The Peninsula Hong Kong — authored heritage, tower and forecourt';
  const materials = harbourCityPalette({ stone: [0.69, 0.66, 0.57], paleStone: [0.84, 0.81, 0.70], metal: [0.30, 0.28, 0.21], roof: [0.30, 0.32, 0.30], roughness: 0.34 });
  const heritage = buildHeritage(root, groundOffset, materials), tower = buildTower(root, groundOffset, materials), forecourt = buildForecourt(root, groundOffset, materials);
  const colliders = [...heritage.colliders, ...tower.colliders, forecourt.collider];
  scene.add(root);
  const site = PENINSULA_TOWER_SITE;
  const landmark = { name: '香港半島酒店 The Peninsula Hong Kong', englishName: 'The Peninsula Hong Kong',
    x: site.x, z: site.z, w: site.w, d: site.d, h: PENINSULA_TOWER_HEIGHT,
    bounds: { ...site.bounds }, ring: site.ring, osmId: site.osmId };
  return {
    root, heritage: heritage.group, tower: tower.group, forecourt: forecourt.group,
    colliders, landmarks: [landmark], groundOffset,
    heritageSite: PENINSULA_HERITAGE_SITE, towerSite: PENINSULA_TOWER_SITE, forecourtSite: PENINSULA_FORECOURT_SITE,
    roads: PENINSULA_GROUND_SITES.flatMap((site) => peninsulaRoadRecords(site)),
    stats: {
      peninsulaSourceBuildings: 2, peninsulaHeritageVertices: 13, peninsulaTowerVertices: 12,
      peninsulaHeritageRingArea: PENINSULA_HERITAGE_SITE.ringArea, peninsulaTowerRingArea: PENINSULA_TOWER_SITE.ringArea,
      peninsulaHeritageHeight: PENINSULA_HERITAGE_HEIGHT, peninsulaTowerOsmHeight: PENINSULA_TOWER_OSM_HEIGHT,
      peninsulaTowerHeight: PENINSULA_TOWER_HEIGHT, peninsulaHeritageWindows: heritage.windows,
      peninsulaTowerWindows: tower.windows, peninsulaGroundArches: heritage.archCount,
      peninsulaAwningStrips: heritage.awningStrips, peninsulaFountainJets: forecourt.jets,
      peninsulaRoadCrossings: 0, peninsulaPreservedForecourtAccessRoads: PENINSULA_FORECOURT_SITE.roadIds.length,
      peninsulaColliders: colliders.length,
    },
    groundHeightAt: (x, z, ground) => peninsulaTerrainHeightAt(x, z, ground, groundOffset),
  };
}
