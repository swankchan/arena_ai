import * as THREE from 'three/webgpu';
import {
  harbourCityRingColliders, harbourCitySegmentCollider, harbourCityGroundHeightAt,
} from './harbour-city-architecture.js';
import {
  store, quad, meshStore, merged, box, point, edgeBox, roofGeometry,
  harbourCityPalette, createStreetLevel, ringBand, hash,
} from './harbour-city-world-utils.js';

const absolute = (colliders, base) => colliders.map((c) => ({ ...c, minY: c.minY + base, maxY: c.maxY + base }));
const edgeLength = (site, edge) => Math.hypot(site.localRing[edge * 2 + 2] - site.localRing[edge * 2], site.localRing[edge * 2 + 3] - site.localRing[edge * 2 + 1]);

export function buildHarbourCityHotel(scene, site, entrance, options) {
  const base = options.groundOffset, root = new THREE.Group(); root.name = `Harbour City — ${site.englishName}`;
  const group = new THREE.Group(); group.name = `${site.englishName} local frame`; group.position.set(site.x, base, site.z); group.rotation.y = site.ry; root.add(group);
  const materials = harbourCityPalette({ stone: options.stone, paleStone: options.paleStone, metal: [0.58, 0.63, 0.64], roof: [0.43, 0.45, 0.44], roughness: 0.24, metalness: 0.3 });
  materials.glazing.side = THREE.DoubleSide; materials.interior.side = THREE.DoubleSide;
  const street = createStreetLevel(site, { soffit: options.podiumTop, customEdges: [entrance.sourceEdge], glassA: options.glassA, glassB: options.glassB, stoneTint: options.stoneTint });
  meshStore(group, street.backing, materials.interior, `${site.englishName} three-storey podium backing`);
  meshStore(group, street.glass, materials.glazing, `${site.englishName} retail and hotel podium glazing`);
  meshStore(group, street.stone, materials.interior, `${site.englishName} podium stone spandrels`);
  merged(group, street.frames, materials.paleStone, `${site.englishName} road-safe podium lintels`);
  merged(group, street.columns, materials.paleStone, `${site.englishName} road-safe podium columns`);
  const podiumBands = [];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) {
    if (edge === entrance.sourceEdge) continue;
    const length = edgeLength(site, edge);
    for (const y of [4, 8]) edgeBox(podiumBands, site, edge, 0.5, y, 0.12, length + 0.03, 0.28, 0.34);
  }
  merged(group, podiumBands, materials.paleStone, `${site.englishName} three podium floor bands`);
  options.addEntrance(group, site, materials, entrance);

  const glass = store(), backing = store(), facadeStone = store(), frames = [], sills = [], darkBands = [];
  const floorHeight = (site.height - options.podiumTop) / options.roomFloors;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge += 1) {
    const length = edgeLength(site, edge), bays = Math.max(1, Math.ceil(length / 2.7));
    const p = (t, y, o = 0) => point(site, edge, t, y, o);
    for (let floor = 0; floor < options.roomFloors; floor += 1) {
      const y0 = options.podiumTop + floor * floorHeight, y1 = y0 + floorHeight;
      for (let bay = 0; bay < bays; bay += 1) {
        const t0 = bay / bays, t1 = (bay + 1) / bays, inset = (t1 - t0) * (options.frameStyle === 'vertical' ? 0.16 : 0.055), v = hash(edge, floor, bay, site.osmId);
        const core = options.corePanel?.(edge, bay, bays) ?? false;
        if (core) quad(facadeStone, p(t0, y0, 0.02), p(t1, y0, 0.02), p(t1, y1, 0.02), p(t0, y1, 0.02), options.coreTint ?? [0.58, 0.59, 0.57], 0.015);
        else {
          quad(backing, p(t0, y0, -0.15), p(t1, y0, -0.15), p(t1, y1, -0.15), p(t0, y1, -0.15), [0.09, 0.12, 0.13], 0.02 + v * 0.06);
          quad(glass, p(t0 + inset, y0 + 0.46, 0.015), p(t1 - inset, y0 + 0.46, 0.015), p(t1 - inset, y1 - 0.4, 0.015), p(t0 + inset, y1 - 0.4, 0.015),
            options.windowTint(v), v > 0.86 ? 0.25 + v * 0.4 : 0.025);
        }
        if (options.frameStyle === 'vertical' && !core) edgeBox(darkBands, site, edge, (t0 + t1) / 2, y0 + 0.22, 0.03, length / bays, 0.44, 0.22);
        else if (options.frameStyle !== 'vertical') edgeBox(sills, site, edge, (t0 + t1) / 2, y0 + 0.35, 0.18, length / bays + 0.03, 0.16, 0.48);
      }
      if (options.frameStyle !== 'vertical') edgeBox(frames, site, edge, 0.5, y0 + 0.16, 0.15, length + 0.05, 0.32, 0.42);
    }
    for (let bay = 0; bay <= bays; bay += 1) {
      const leftCore = bay > 0 && (options.corePanel?.(edge, bay - 1, bays) ?? false), rightCore = bay < bays && (options.corePanel?.(edge, bay, bays) ?? false);
      if (options.frameStyle === 'vertical' && leftCore && rightCore) continue;
      edgeBox(frames, site, edge, bay / bays, (site.height + options.podiumTop) / 2,
        0.12, options.frameStyle === 'vertical' ? 0.15 : 0.22, site.height - options.podiumTop, options.frameStyle === 'vertical' ? 0.28 : 0.46);
    }
  }
  meshStore(group, backing, materials.interior, `${site.englishName} recessed guestroom backing`);
  meshStore(group, facadeStone, materials.interior, `${site.englishName} broad pale stone service-core panels`);
  meshStore(group, glass, materials.glazing, `${site.englishName} thirteen articulated guestroom window courses`, false);
  merged(group, darkBands, materials.dark, `${site.englishName} dark horizontal guestroom spandrel bands`);
  merged(group, sills, materials.paleStone, `${site.englishName} projecting white guestroom window surrounds and sills`);
  merged(group, frames, materials.paleStone, `${site.englishName} white vertical guestroom frames and floor transoms`);

  const roof = new THREE.Mesh(roofGeometry(site.localRing, site.height), materials.roof); roof.name = `${site.englishName} exact-footprint roof`; roof.receiveShadow = true; group.add(roof);
  const parapet = [], plant = [], dark = []; ringBand(parapet, site, site.height + 0.45, 0.9, 0.04, 0.24);
  box(plant, [0, site.height + 1.55, 0], [10, 3.1, 8]); box(dark, [0, site.height + 3.15, 0], [10.2, 0.12, 8.2]);
  for (const x of [-10, -5, 0, 5, 10]) { box(plant, [x, site.height + 0.65, -7], [2.3, 1.3, 2]); box(dark, [x, site.height + 1.33, -7], [2, 0.08, 1.7]); }
  merged(group, parapet, materials.paleStone, `${site.englishName} roof parapet`); merged(group, plant, materials.roof, `${site.englishName} roof lift overrun and plant`); merged(group, dark, materials.metal, `${site.englishName} roof ventilation grilles`);

  const colliders = absolute(street.colliders, base), opening = options.entranceOpening || [0.36, 0.64];
  for (const [t0, t1] of [[0, opening[0]], [opening[1], 1]]) colliders.push(harbourCitySegmentCollider(site, entrance.sourceEdge, t0, t1, base + 0.15, base + options.podiumTop));
  colliders.push(...harbourCityRingColliders(site, base + options.podiumTop, base + site.height));
  scene.add(root);
  const landmark = { id: options.landmarkId, name: site.name, position: { x: site.x, y: base, z: site.z }, radius: 58, height: site.height };
  return {
    root, group, colliders, landmarks: [landmark], groundOffset: base, site,
    stats: {
      [`${site.key}SourceVertices`]: site.ring.length / 2 - 1, [`${site.key}RingArea`]: site.ringArea,
      [`${site.key}Height`]: site.height, [`${site.key}OsmLevels`]: site.levels,
      [`${site.key}PodiumLevels`]: options.podiumLevels, [`${site.key}RoomFloors`]: options.roomFloors,
      [`${site.key}Rooms`]: options.rooms, [`${site.key}RoadCrossings`]: site.roadIds.length,
      [`${site.key}OpenRoadBays`]: street.openRoadBays, [`${site.key}RoadSoffit`]: options.podiumTop,
    },
    groundHeightAt: (x, z, ground) => harbourCityGroundHeightAt(site, x, z, ground, { deck: base + 0.12 }),
  };
}
