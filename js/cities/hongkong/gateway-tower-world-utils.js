import * as THREE from 'three/webgpu';
import {
  harbourCityRingColliders, harbourCitySegmentCollider, harbourCityGroundHeightAt,
  harbourCityPodiumBayConflict, harbourCityLocalToWorld, GATEWAY_PODIUM_HEIGHT,
} from './harbour-city-architecture.js';
import {
  store, quad, meshStore, merged, box, beam, point, edgeBox, roofGeometry,
  harbourCityPalette, createStreetLevel, ringBand, addEdgeSign, hash,
} from './harbour-city-world-utils.js';

const BLUE_GREEN = [0.22, 0.4, 0.44];
const SERVICE_BLUE = [0.075, 0.15, 0.18];
const absolute = (colliders, base) => colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base }));
const edgeLength = (site, edge) => Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);

function addOfficeEntrance(group, site, materials, entrance, title, subtitle) {
  const edge = entrance.sourceEdge, glass = store(), panels = store(), backing = store(), granite = [], metal = [];
  const p = (t, y, o = 0.1) => point(site, edge, t, y, o);
  const side = (t0, t1, y0, y1, target, offset = 0.1, tint = [0.67, 0.51, 0.46], lit = 0) => quad(target,
    p(t0, y0, offset), p(t1, y0, offset), p(t1, y1, offset), p(t0, y1, offset), tint, lit);
  side(0, 1, 0, GATEWAY_PODIUM_HEIGHT, backing, -0.15, [0.11, 0.15, 0.16], 0.05);
  side(0, 0.26, 0, GATEWAY_PODIUM_HEIGHT, panels);
  side(0.74, 1, 0, GATEWAY_PODIUM_HEIGHT, panels);
  side(0, 1, 7.1, GATEWAY_PODIUM_HEIGHT, panels);
  side(0.26, 0.74, 0.12, 7.15, glass, 0.15, [0.11, 0.23, 0.25], 0.18);
  for (const t of [0.26, 0.74]) edgeBox(granite, site, edge, t, 3.55, 0.36, 0.78, 7.1, 0.9);
  // The shallow segmental pink-granite arch is visible in the close exterior photographs.
  for (let i = 0; i < 14; i += 1) {
    const ta = 0.26 + i / 14 * 0.48, tb = 0.26 + (i + 1) / 14 * 0.48;
    beam(granite, p(ta, 7.05 + Math.sin(i / 14 * Math.PI) * 0.78, 0.39),
      p(tb, 7.05 + Math.sin((i + 1) / 14 * Math.PI) * 0.78, 0.39), 0.78, 0.9);
  }
  for (const t of [0.38, 0.5, 0.62]) edgeBox(metal, site, edge, t, 2.15, 0.21, 0.085, 4.3, 0.15);
  edgeBox(metal, site, edge, 0.5, 4.32, 0.23, entrance.length * 0.48, 0.12, 0.18);
  for (const t of [0.475, 0.525]) edgeBox(metal, site, edge, t, 1.15, 0.28, 0.055, 0.78, 0.12);
  meshStore(group, backing, materials.interior, `${site.englishName} entrance backing`);
  meshStore(group, panels, materials.interior, `${site.englishName} pink-granite podium portal`);
  meshStore(group, glass, materials.glazing, `${site.englishName} glazed office entrance`);
  merged(group, granite, materials.stone, `${site.englishName} segmental granite entrance arch`);
  merged(group, metal, materials.metal, `${site.englishName} entrance door frames and handles`);
  addEdgeSign(group, site, edge, title, subtitle, 9.15, Math.min(18, entrance.length * 0.84), 1.4, 0.68,
    { background: '#d5bbb0', foreground: '#293b3e', accent: false });
}

export function addGatewayInterconnection(parent, siteA, baseA, localA, siteB, baseB, localB, options) {
  const a = harbourCityLocalToWorld(siteA, localA[0], localA[1]), b = harbourCityLocalToWorld(siteB, localB[0], localB[1]);
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length;
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, ry = Math.atan2(-dz, dx), datum = Math.min(baseA, baseB);
  const group = new THREE.Group(); group.name = options.name; parent.add(group);
  const frame = new THREE.MeshStandardMaterial({ color: 0xd7c8be, roughness: 0.54, metalness: 0.28 });
  const glazing = new THREE.MeshStandardMaterial({ color: 0x2a5058, roughness: 0.2, metalness: 0.46, emissive: 0x14292e, emissiveIntensity: 0.22 });
  const frames = [], glass = [], colliders = [], width = options.width;
  const cs = Math.cos(ry), sn = Math.sin(ry);
  for (const level of options.levels) {
    const y = datum + level;
    box(glass, [mx, y, mz], [length + 0.7, 2.8, width], ry);
    for (const dy of [-1.55, 1.55]) box(frames, [mx, y + dy, mz], [length + 0.9, 0.34, width + 0.35], ry);
    for (let u = -length / 2; u <= length / 2 + 0.01; u += Math.max(1.8, length / 4)) {
      for (const v of [-width / 2, width / 2]) {
        const x = mx + ux * u - uz * v, z = mz + uz * u + ux * v;
        box(frames, [x, y, z], [0.09, 3.2, 0.12], ry);
      }
    }
    const w = length + 0.7, hx = w / 2, hz = width / 2;
    colliders.push({ shape: 'box', x: mx, z: mz, w, d: width, ry, minY: y - 1.4, maxY: y + 1.4,
      minX: mx - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: mx + Math.abs(cs) * hx + Math.abs(sn) * hz,
      minZ: mz - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: mz + Math.abs(sn) * hx + Math.abs(cs) * hz,
      obb: { cx: mx, cz: mz, hx, hz, cs, sn } });
  }
  merged(group, glass, glazing, `${options.name} blue-green glazed links`);
  merged(group, frames, frame, `${options.name} pale lattice floor frames and mullions`);
  return { root: group, colliders, stats: { connectedLevels: options.levels.length, clearSpan: length,
    lowestSoffit: Math.min(...options.levels) - 1.55, datum, width } };
}

export function buildGatewayTower(scene, sourceSite, sourceEntrance, options) {
  const site = sourceSite, base = options.groundOffset;
  const root = new THREE.Group(); root.name = `Harbour City — ${site.englishName}`;
  const group = new THREE.Group(); group.name = `${site.englishName} local frame`;
  group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const entrance = sourceEntrance;
  const materials = harbourCityPalette({
    stone: [0.66, 0.49, 0.44], paleStone: [0.8, 0.72, 0.68], metal: [0.63, 0.69, 0.69],
    roof: [0.43, 0.46, 0.46], roughness: 0.2, metalness: 0.46,
  });
  materials.glazing.side = THREE.DoubleSide;
  materials.interior.side = THREE.DoubleSide;
  const street = createStreetLevel(site, {
    soffit: GATEWAY_PODIUM_HEIGHT, customEdges: [entrance.sourceEdge],
    glassA: [0.055, 0.12, 0.135], glassB: [0.15, 0.27, 0.28], stoneTint: [0.65, 0.49, 0.44],
  });
  meshStore(group, street.backing, materials.interior, `${site.englishName} three-storey mall backing`);
  meshStore(group, street.glass, materials.glazing, `${site.englishName} three-storey mall shopfront glazing`);
  meshStore(group, street.stone, materials.interior, `${site.englishName} pink-granite mall spandrels`);
  merged(group, street.frames, materials.paleStone, `${site.englishName} road-safe podium lintels`);
  merged(group, street.columns, materials.stone, `${site.englishName} road-safe pink-granite podium columns`);
  addOfficeEntrance(group, site, materials, entrance,
    options.entranceTitle || 'THE GATEWAY', options.entranceSubtitle || site.englishName.toUpperCase());
  const podiumBands = [], podiumLouvres = [], podiumStone = store(), podiumGlass = store();
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) {
    if (edge === entrance.sourceEdge) continue;
    const length = edgeLength(site, edge), bays = Math.max(1, Math.ceil(length / 3.15));
    const p = (t, y, o = 0.13) => point(site, edge, t, y, o);
    for (let bay = 0; bay < bays; bay += 1) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, t = (bay + 0.5) / bays;
      if (harbourCityPodiumBayConflict(site, edge, t0, t1)) continue;
      const v = hash(edge, bay, 981);
      quad(podiumStone, p(t0 + 0.002, 3.8), p(t1 - 0.002, 3.8), p(t1 - 0.002, 12), p(t0 + 0.002, 12), [0.59 + v * 0.06, 0.43 + v * 0.05, 0.39 + v * 0.05]);
      const halfWindow = (t1 - t0) * 0.16, wc = t;
      quad(podiumGlass, p(wc - halfWindow, 4.35, 0.17), p(wc + halfWindow, 4.35, 0.17),
        p(wc + halfWindow, 11.05, 0.17), p(wc - halfWindow, 11.05, 0.17), [0.11 + v * 0.04, 0.27 + v * 0.05, 0.3 + v * 0.05], 0.04 + v * 0.1);
      for (const y of [4, 11.75]) edgeBox(podiumBands, site, edge, t, y, 0.19, length / bays - 0.08, 0.22, 0.28);
      edgeBox(podiumBands, site, edge, wc, 7.7, 0.2, Math.min(1.2, length / bays * 0.36), 0.1, 0.16);
      if ((edge + bay) % 5 === 0) for (let j = 0; j < 7; j += 1) edgeBox(podiumLouvres, site, edge, wc, 9.95 + j * 0.16, 0.22, Math.min(1.15, length / bays * 0.35), 0.055, 0.12);
    }
  }
  meshStore(group, podiumStone, materials.interior, `${site.englishName} pink-granite podium stone panels`);
  meshStore(group, podiumGlass, materials.glazing, `${site.englishName} slender vertical podium window strips`, false);
  merged(group, podiumBands, materials.paleStone, `${site.englishName} three-storey pink-granite podium bands`);
  merged(group, podiumLouvres, materials.dark, `${site.englishName} podium ventilation louvres`);
  const colliders = absolute(street.colliders, base);

  const glass = store(), backing = store(), bands = [], mullions = [], service = [];
  const officeCourses = options.officeCourses, apartmentCourses = options.apartmentCourses || 0;
  const courses = officeCourses + apartmentCourses, floorHeight = (site.height - GATEWAY_PODIUM_HEIGHT) / courses;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) {
    const length = edgeLength(site, edge), bays = Math.max(1, Math.ceil(length / 2.65));
    const serviceEdge = options.serviceEdges.includes(edge), p = (t, y, o = 0) => point(site, edge, t, y, o);
    for (let course = 0; course < courses; course += 1) {
      const apartment = course >= officeCourses;
      const y0 = GATEWAY_PODIUM_HEIGHT + course * floorHeight, y1 = y0 + floorHeight;
      for (let bay = 0; bay < bays; bay += 1) {
        const t0 = bay / bays + 0.035 / bays, t1 = (bay + 1) / bays - 0.035 / bays;
        const v = hash(edge, course, bay, options.towerNumber * 7);
        const tint = serviceEdge ? SERVICE_BLUE : apartment ? [0.27 + v * 0.035, 0.39 + v * 0.035, 0.4 + v * 0.035] : BLUE_GREEN.map((n) => n + v * 0.045);
        quad(backing, p(bay / bays, y0, -0.15), p((bay + 1) / bays, y0, -0.15),
          p((bay + 1) / bays, y1, -0.15), p(bay / bays, y1, -0.15), [0.1, 0.17, 0.19], 0.03 + v * 0.08);
        quad(glass, p(t0, y0 + 0.5, 0.01), p(t1, y0 + 0.5, 0.01), p(t1, y1 - 0.46, 0.01), p(t0, y1 - 0.46, 0.01), tint,
          serviceEdge ? (v > 0.94 ? 0.08 : 0) : (v > (apartment ? 0.72 : 0.84) ? 0.32 + v * 0.52 : 0.025));
        if (apartment) edgeBox(mullions, site, edge, (t0 + t1) / 2, (y0 + y1) / 2, 0.07, 0.045, floorHeight - 0.9, 0.12);
      }
      edgeBox(bands, site, edge, 0.5, y0 + 0.22, 0.03, length + 0.03, 0.44, 0.34);
      edgeBox(mullions, site, edge, 0.5, y0 + 0.49, 0.08, length + 0.03, 0.085, 0.39);
    }
    for (let bay = 0; bay <= bays; bay += 1) edgeBox(mullions, site, edge, bay / bays,
      (site.height + GATEWAY_PODIUM_HEIGHT) / 2, 0.075, serviceEdge ? 0.16 : 0.065,
      site.height - GATEWAY_PODIUM_HEIGHT, serviceEdge ? 0.24 : 0.13);
    if (serviceEdge) edgeBox(service, site, edge, 0.5, (site.height + GATEWAY_PODIUM_HEIGHT) / 2,
      -0.08, length, site.height - GATEWAY_PODIUM_HEIGHT, 0.18);
  }
  merged(group, service, materials.dark, `${site.englishName} recessed dark vertical service strip`);
  meshStore(group, backing, materials.interior, `${site.englishName} recessed curtain-wall backing`);
  meshStore(group, glass, materials.glazing, `${site.englishName} curved blue-green curtain wall`, false);
  merged(group, bands, materials.paleStone, `${site.englishName} silver horizontal spandrel ribbons`);
  merged(group, mullions, materials.metal, `${site.englishName} aluminium curtain-wall mullions and transoms`);

  const roof = new THREE.Mesh(roofGeometry(site.localRing, site.height), materials.roof);
  roof.name = `${site.englishName} exact-footprint roof`; roof.receiveShadow = true; group.add(roof);
  const parapet = [], plant = [], dark = [], crown = [];
  ringBand(parapet, site, site.height + 0.42, 0.84, 0.02, 0.24);
  ringBand(plant, site, site.height + 0.96, 0.1, 0.03, 0.13);
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) {
    const length = edgeLength(site, edge), fins = Math.max(1, Math.ceil(length / 1.6));
    for (let fin = 0; fin <= fins; fin += 1) edgeBox(crown, site, edge, fin / fins, site.height + 1.75, 0.04, 0.075, 3.5, 0.16);
  }
  ringBand(crown, site, site.height + 3.52, 0.12, 0.04, 0.17);
  box(plant, [0, site.height + 1.7, 0], [12, 3.4, 8]);
  box(dark, [0, site.height + 3.46, 0], [12.3, 0.16, 8.3]);
  for (const x of [-12, -7.2, -2.4, 2.4, 7.2, 12]) {
    box(plant, [x, site.height + 0.7, -5], [2.4, 1.4, 2]);
    box(dark, [x, site.height + 1.43, -5], [2.15, 0.08, 1.75]);
  }
  merged(group, parapet, materials.paleStone, `${site.englishName} roof parapet`);
  merged(group, crown, materials.metal, `${site.englishName} open rooftop metal grille crown`);
  merged(group, plant, materials.roof, `${site.englishName} rooftop lift overrun and plant`);
  merged(group, dark, materials.metal, `${site.englishName} rooftop fan grilles`);
  for (const [t0, t1] of [[0, 0.4], [0.6, 1]]) colliders.push(harbourCitySegmentCollider(site,
    entrance.sourceEdge, t0, t1, base + 0.15, base + GATEWAY_PODIUM_HEIGHT));
  colliders.push(...harbourCityRingColliders(site, base + GATEWAY_PODIUM_HEIGHT, base + site.height));
  scene.add(root);
  const landmark = { id: options.landmarkId, name: site.name, position: { x: site.x, y: base, z: site.z }, radius: options.radius || 70, height: site.height };
  return {
    root, group, colliders, landmarks: [landmark], groundOffset: base, site,
    stats: {
      [`${site.key}SourceVertices`]: site.ring.length / 2 - 1,
      [`${site.key}RingArea`]: site.ringArea,
      [`${site.key}Height`]: site.height,
      [`${site.key}OsmLevels`]: site.levels,
      [`${site.key}VisualOfficeCourses`]: officeCourses,
      [`${site.key}VisualApartmentCourses`]: apartmentCourses,
      [`${site.key}CompletionYear`]: options.completionYear,
      [`${site.key}RoadCrossings`]: site.roadIds.length,
      [`${site.key}OpenRoadBays`]: street.openRoadBays,
      [`${site.key}RoadSoffit`]: GATEWAY_PODIUM_HEIGHT,
    },
    groundHeightAt: (x, z, ground) => harbourCityGroundHeightAt(site, x, z, ground, { deck: base + 0.12 }),
  };
}
