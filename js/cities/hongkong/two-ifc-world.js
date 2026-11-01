import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, dot, float, fract, mix, sin, smoothstep, step, vec2 } from 'three/tsl';
import { cityUniforms, facadeCell, filteredPulse } from '../../tsl-materials.js';
import {
  TWO_IFC_SITE,
  TWO_IFC_HEIGHT,
  TWO_IFC_OSM_LEVELS,
  TWO_IFC_DESIGN_LEVELS,
  TWO_IFC_PLAZA_TOP,
  TWO_IFC_FLOOR_HEIGHT,
  TWO_IFC_BAY_WIDTH,
  TWO_IFC_CONVEX_PROJECTION,
  TWO_IFC_TIERS,
  TWO_IFC_CURTAIN_TIERS,
  TWO_IFC_OPEN_CROWN,
  TWO_IFC_SETBACK_COUNT,
  TWO_IFC_BELT_LEVELS,
  TWO_IFC_LOCAL_RING,
  twoIfcScaleAt,
  twoIfcLocalCollider
} from './two-ifc-architecture.js';

function nightAmount() {
  return smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
}

// Lightly reflective vision glass, fritted spandrels and pearly-silver aluminium are separate facade materials in
// the contractor's description. This office shader deliberately has no residential room interiors or daytime lights.
function createTwoIfcCurtainWallMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({
    metalness: 0.43, roughness: 0.27, envMapIntensity: 0.52, side: THREE.DoubleSide
  });
  const { cellId, cellUV, fw, isRoof } = facadeCell(2.7, TWO_IFC_FLOOR_HEIGHT, false);
  const random = fract(sin(dot(cellId, vec2(127.1, 311.7)).add(23.74)).mul(43758.5453));
  const randomB = fract(random.mul(17.17).add(0.29));
  const verticalPanel = filteredPulse(cellUV.x, 0.045, 0.955, fw.x);
  const vision = verticalPanel.mul(filteredPulse(cellUV.y, 0.27, 0.955, fw.y)).mul(float(1).sub(isRoof));
  const spandrel = verticalPanel.mul(filteredPulse(cellUV.y, 0.045, 0.265, fw.y)).mul(float(1).sub(isRoof));
  const glass = mix(color(0x52727e), color(0x9aafb3), step(0.54, randomB).mul(0.48))
    .mul(mix(float(0.91), float(1.08), random));
  const fritted = mix(color(0x71878c), color(0xa1adaa), random.mul(0.38));
  const pearlFrame = color(0xc1c8c4);
  material.colorNode = mix(mix(mix(pearlFrame, fritted, spandrel), glass, vision), color(0x7c8785), isRoof);
  material.roughnessNode = mix(float(0.43), float(0.23), vision);
  const officeLight = mix(color(0xffd7a0), color(0xd7e6e6), step(0.52, randomB));
  material.emissiveNode = officeLight.mul(step(0.84, random)).mul(vision).mul(nightAmount()).mul(0.82);
  return material;
}

function addInstances(group, geometry, material, transforms, name, { castShadow = true, receiveShadow = true } = {}) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((t, index) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    if (t.quaternion) dummy.quaternion.copy(t.quaternion);
    else dummy.rotation.set(0, t.heading || 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

function signedArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 2; i + 1 < ring.length; j = i, i += 2) {
    area += ring[j] * ring[i + 1] - ring[i] * ring[j + 1];
  }
  return area * 0.5;
}

function counterClockwiseRing() {
  const ring = TWO_IFC_LOCAL_RING.slice();
  if (signedArea(ring) >= 0) return ring;
  const reversed = [];
  for (let i = ring.length - 2; i >= 0; i -= 2) reversed.push(ring[i], ring[i + 1]);
  return reversed;
}
const LOCAL_CCW_RING = counterClockwiseRing();

function ringPoint(index, scale, y) {
  return [LOCAL_CCW_RING[index] * scale, y, LOCAL_CCW_RING[index + 1] * scale];
}

// Flat-shaded, tapered loft through the actual OSM-derived plan. Separate intervals leave real horizontal setback
// ledges; caps can be omitted for the open crown's narrow perimeter rails.
function createLoftGeometry(y0, y1, bottomScale, topScale, { capTop = true, capBottom = false } = {}) {
  const positions = [];
  const push = (point) => positions.push(point[0], point[1], point[2]);
  for (let i = 0; i < LOCAL_CCW_RING.length; i += 2) {
    const next = (i + 2) % LOCAL_CCW_RING.length;
    const ba = ringPoint(i, bottomScale, y0), bb = ringPoint(next, bottomScale, y0);
    const ta = ringPoint(i, topScale, y1), tb = ringPoint(next, topScale, y1);
    for (const point of [ba, ta, bb, bb, ta, tb]) push(point);
    if (capTop) for (const point of [[0, y1, 0], tb, ta]) push(point);
    if (capBottom) for (const point of [[0, y0, 0], ba, bb]) push(point);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function convexFacadePoint(side, u, scale, y, projection = TWO_IFC_CONVEX_PROJECTION) {
  const across = u * TWO_IFC_BAY_WIDTH * 0.5 * scale;
  const bulge = projection * (1 - u * u);
  const halfW = TWO_IFC_SITE.w * 0.5 * scale, halfD = TWO_IFC_SITE.d * 0.5 * scale;
  if (side === 0) return [across, y, -halfD - bulge];
  if (side === 1) return [halfW + bulge, y, across];
  if (side === 2) return [-across, y, halfD + bulge];
  return [-halfW - bulge, y, -across];
}

// Each cardinal elevation has a gently convex central field which steps beyond the faceted OSM-derived corner plan.
// The curved fields are geometry, not a normal-map decal, and follow every tier's taper independently.
function createConvexFacadesGeometry() {
  const positions = [], acrossSegments = 16;
  const push = (point) => positions.push(point[0], point[1], point[2]);
  for (const tier of TWO_IFC_CURTAIN_TIERS) {
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < acrossSegments; i++) {
        const u0 = -1 + i * 2 / acrossSegments, u1 = -1 + (i + 1) * 2 / acrossSegments;
        const a = convexFacadePoint(side, u0, tier.bottomScale, tier.y0);
        const b = convexFacadePoint(side, u1, tier.bottomScale, tier.y0);
        const c = convexFacadePoint(side, u1, tier.topScale, tier.y1);
        const d = convexFacadePoint(side, u0, tier.topScale, tier.y1);
        for (const point of [a, b, d, b, c, d]) push(point);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createConvexBeltGeometry(level, side) {
  const positions = [], acrossSegments = 16;
  const y0 = level - 1.35, y1 = level + 1.35;
  const bottomScale = twoIfcScaleAt(y0), topScale = twoIfcScaleAt(y1);
  const projection = TWO_IFC_CONVEX_PROJECTION + 0.025;
  const push = (point) => positions.push(point[0], point[1], point[2]);
  for (let i = 0; i < acrossSegments; i++) {
    const u0 = -1 + i * 2 / acrossSegments, u1 = -1 + (i + 1) * 2 / acrossSegments;
    const a = convexFacadePoint(side, u0, bottomScale, y0, projection);
    const b = convexFacadePoint(side, u1, bottomScale, y0, projection);
    const c = convexFacadePoint(side, u1, topScale, y1, projection);
    const d = convexFacadePoint(side, u0, topScale, y1, projection);
    for (const point of [a, b, d, b, c, d]) push(point);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createPlazaGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i + 1 < TWO_IFC_LOCAL_RING.length; i += 2) {
    const x = TWO_IFC_LOCAL_RING[i], z = TWO_IFC_LOCAL_RING[i + 1];
    if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, TWO_IFC_PLAZA_TOP, 0);
  return geometry;
}

function mergedMesh(group, geometries, material, name, { castShadow = true, receiveShadow = true } = {}) {
  if (!geometries.length) return null;
  const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
  if (geometries.length > 1) for (const part of geometries) part.dispose();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}

export function buildTwoInternationalFinanceCentre(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'TwoInternationalFinanceCentre';
  group.userData.landmark = 'two-international-finance-centre';
  group.userData.osm = { type: TWO_IFC_SITE.osmType, id: TWO_IFC_SITE.osmId };
  group.position.set(TWO_IFC_SITE.x, groundOffset, TWO_IFC_SITE.z);
  group.rotation.y = TWO_IFC_SITE.ry;
  root.add(group);

  const curtainWall = createTwoIfcCurtainWallMaterial();
  const podiumStone = new THREE.MeshStandardMaterial({ color: 0xaeb7b3, roughness: 0.57, metalness: 0.26 });
  const plazaStone = new THREE.MeshStandardMaterial({ color: 0xa7aaa3, roughness: 0.9, metalness: 0.03 });
  const darkGlass = new THREE.MeshStandardNodeMaterial({ color: 0x263e48, roughness: 0.3, metalness: 0.42 });
  darkGlass.emissiveNode = color(0x65858d).mul(nightAmount().mul(0.055));
  const pearlAluminium = new THREE.MeshStandardNodeMaterial({ color: 0xc2c9c5, roughness: 0.34, metalness: 0.72 });
  pearlAluminium.emissiveNode = color(0xc8d5d2).mul(nightAmount().mul(0.075));
  const crownSilver = new THREE.MeshStandardNodeMaterial({ color: 0xd0d6d0, roughness: 0.3, metalness: 0.7 });
  crownSilver.emissiveNode = color(0xe4eee4).mul(nightAmount().mul(0.62));
  const entranceGlass = new THREE.MeshStandardNodeMaterial({
    color: 0x385761, roughness: 0.24, metalness: 0.35, side: THREE.DoubleSide
  });
  entranceGlass.emissiveNode = color(0xffd7a0).mul(nightAmount().mul(0.13));

  const plaza = new THREE.Mesh(createPlazaGeometry(), plazaStone);
  plaza.name = 'TwoIfcOsmFootprintPlaza';
  plaza.receiveShadow = true;
  group.add(plaza);

  const podium = TWO_IFC_TIERS[0];
  mergedMesh(group, [createLoftGeometry(podium.y0, podium.y1, podium.bottomScale, podium.topScale)],
    podiumStone, 'TwoIfcPodiumAndSetbackBase');
  mergedMesh(group, TWO_IFC_CURTAIN_TIERS.map((tier) =>
    createLoftGeometry(tier.y0, tier.y1, tier.bottomScale, tier.topScale)),
  curtainWall, 'TwoIfcTaperedSetbackTowerSegments');
  mergedMesh(group, [createConvexFacadesGeometry()], curtainWall, 'TwoIfcFourConvexSteppedCurtainWallFields');

  // Dark mechanical / refuge bands articulate the real changes of plane without replacing the tower with a box.
  const belts = TWO_IFC_BELT_LEVELS.flatMap((level) => {
    const y0 = level - 1.35, y1 = level + 1.35;
    return [
      createLoftGeometry(y0, y1, twoIfcScaleAt(y0) + 0.0025, twoIfcScaleAt(y1) + 0.0025,
        { capTop: false }),
      ...Array.from({ length: 4 }, (_, side) => createConvexBeltGeometry(level, side))
    ];
  });
  mergedMesh(group, belts, darkGlass, 'TwoIfcMechanicalAndRefugeFacadeBelts');

  const fins = [], crownRibs = [], up = new THREE.Vector3(0, 1, 0);
  function beam(list, a, b, thickness, depth = thickness) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start), length = direction.length();
    if (length < 0.001) return;
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    list.push({
      x: midpoint.x, y: midpoint.y, z: midpoint.z,
      sx: thickness, sy: length, sz: depth,
      quaternion: new THREE.Quaternion().setFromUnitVectors(up, direction.normalize())
    });
  }

  // Wing-like vertical mullions run from the shaft into the crown. They are real shallow fins above the shader grid.
  for (const tier of TWO_IFC_CURTAIN_TIERS) {
    for (let side = 0; side < 4; side++) {
      for (let index = 0; index <= 12; index++) {
        const u = -1 + index / 6;
        beam(fins,
          convexFacadePoint(side, u, tier.bottomScale, tier.y0, TWO_IFC_CONVEX_PROJECTION + 0.13),
          convexFacadePoint(side, u, tier.topScale, tier.y1, TWO_IFC_CONVEX_PROJECTION + 0.13),
          0.115, 0.32);
      }
    }
    for (let i = 0; i < LOCAL_CCW_RING.length; i += 2) {
      beam(fins, ringPoint(i, tier.bottomScale + 0.002, tier.y0),
        ringPoint(i, tier.topScale + 0.002, tier.y1), 0.14, 0.28);
    }
  }
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), pearlAluminium, fins, 'TwoIfcWingLikeVerticalMullions');

  // Open sculptural crown: the centre of each curved face rises higher than its edges, while the corner ribs stop
  // lower. Nothing fills the gaps between these ribs with a solid cone or a closed rectangular rooftop box.
  for (let side = 0; side < 4; side++) {
    for (let index = 0; index <= 12; index++) {
      const u = -1 + index / 6, topY = TWO_IFC_HEIGHT - 5.2 * u * u;
      const bottom = convexFacadePoint(side, u, TWO_IFC_OPEN_CROWN.bottomScale, TWO_IFC_OPEN_CROWN.y0, 0.82);
      const middle = convexFacadePoint(side, u, 0.555, 403, 0.64);
      const top = convexFacadePoint(side, u, TWO_IFC_OPEN_CROWN.topScale, topY, 0.24);
      beam(crownRibs, bottom, middle, 0.18, 0.30);
      beam(crownRibs, middle, top, 0.15, 0.24);
    }
  }
  for (let i = 0; i < LOCAL_CCW_RING.length; i += 2) {
    beam(crownRibs, ringPoint(i, 0.60, 390), ringPoint(i, 0.54, 399), 0.16, 0.26);
    beam(crownRibs, ringPoint(i, 0.54, 399), ringPoint(i, 0.49, 405.5), 0.13, 0.22);
  }
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), crownSilver, crownRibs, 'TwoIfcOpenSculpturalCrownRibs');
  mergedMesh(group, [
    createLoftGeometry(395.8, 396.15, 0.586, 0.584, { capTop: false }),
    createLoftGeometry(404.7, 405.02, 0.536, 0.533, { capTop: false })
  ], crownSilver, 'TwoIfcOpenCrownHorizontalRails');
  mergedMesh(group, [createLoftGeometry(390, 401.5, 0.46, 0.42)], darkGlass, 'TwoIfcRecessedCrownLanternCore');

  // Harbour-facing podium entrance, kept within a small projection of the source site so it does not push the road.
  const frontZ = -TWO_IFC_SITE.d * 0.5 - 0.035;
  const doors = new THREE.Mesh(new THREE.PlaneGeometry(10, 6.4), entranceGlass);
  doors.position.set(0, 3.32, frontZ);
  doors.name = 'TwoIfcHarbourEntranceGlassDoors';
  group.add(doors);
  const entranceFrames = [];
  for (const x of [-5, -2.5, 0, 2.5, 5]) {
    entranceFrames.push({ x, y: 3.32, z: frontZ - 0.055, sx: 0.12, sy: 6.55, sz: 0.12 });
  }
  for (const y of [0.12, 3.25, 6.55]) {
    entranceFrames.push({ x: 0, y, z: frontZ - 0.055, sx: 10.15, sy: 0.12, sz: 0.12 });
  }
  entranceFrames.push({ x: 0, y: 6.85, z: frontZ + 0.52, sx: 13.8, sy: 0.22, sz: 1.8 });
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), pearlAluminium, entranceFrames, 'TwoIfcEntranceFramesAndCanopy');

  const colliders = TWO_IFC_TIERS.map((tier) => {
    const scale = Math.max(tier.bottomScale, tier.topScale);
    const projection = tier.kind === 'podium' ? 0 : TWO_IFC_CONVEX_PROJECTION * 2;
    return twoIfcLocalCollider({
      w: TWO_IFC_SITE.w * scale + projection,
      d: TWO_IFC_SITE.d * scale + projection,
      minY: tier.y0, maxY: tier.y1 + 0.15
    });
  });
  colliders.push(twoIfcLocalCollider({
    w: TWO_IFC_SITE.w * TWO_IFC_OPEN_CROWN.bottomScale + TWO_IFC_CONVEX_PROJECTION * 2,
    d: TWO_IFC_SITE.d * TWO_IFC_OPEN_CROWN.bottomScale + TWO_IFC_CONVEX_PROJECTION * 2,
    minY: TWO_IFC_OPEN_CROWN.y0, maxY: TWO_IFC_HEIGHT
  }));
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }

  const landmark = {
    name: TWO_IFC_SITE.name,
    englishName: TWO_IFC_SITE.englishName,
    x: TWO_IFC_SITE.x, z: TWO_IFC_SITE.z,
    w: TWO_IFC_SITE.w, d: TWO_IFC_SITE.d, h: TWO_IFC_HEIGHT,
    ry: TWO_IFC_SITE.ry,
    bounds: { ...TWO_IFC_SITE.bounds }, ring: TWO_IFC_SITE.ring, osmId: TWO_IFC_SITE.osmId
  };
  const stats = {
    twoIfcGroundOffset: groundOffset,
    twoIfcLandmarks: 1,
    twoIfcHeight: TWO_IFC_HEIGHT,
    twoIfcOsmLevels: TWO_IFC_OSM_LEVELS,
    twoIfcDesignLevels: TWO_IFC_DESIGN_LEVELS,
    twoIfcTaperedTiers: TWO_IFC_TIERS.length,
    twoIfcSetbacks: TWO_IFC_SETBACK_COUNT,
    twoIfcConvexFacadeFields: TWO_IFC_CURTAIN_TIERS.length * 4,
    twoIfcVerticalMullions: fins.length,
    twoIfcOpenCrownRibs: crownRibs.length,
    twoIfcOpenCrownHeight: TWO_IFC_HEIGHT - TWO_IFC_OPEN_CROWN.y0,
    twoIfcColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: TWO_IFC_PLAZA_TOP + groundOffset };
}
