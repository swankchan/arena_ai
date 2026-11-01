import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, mix, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  ICC_SITE,
  ICC_HEIGHT,
  ICC_OSM_LEVELS,
  ICC_DESIGN_LEVELS,
  ICC_REPORTED_ABOVE_GROUND_LEVELS,
  ICC_PLAZA_TOP,
  ICC_LOBBY_HEIGHT,
  ICC_ROOF_Y,
  ICC_PARAPET_HEIGHT,
  ICC_FACADE_ROWS,
  ICC_FACADE_ROW_HEIGHT,
  ICC_BAY_WIDTH,
  ICC_VISION_HEIGHT,
  ICC_PANEL_TILT,
  ICC_BASE_PANEL_TILT,
  ICC_UPPER_PANEL_TILT,
  ICC_BASE_FLARE_END_Y,
  ICC_LOCAL_RING,
  ICC_DRAGON_TAIL,
  ICC_MECHANICAL_BANDS,
  ICC_CROWN_PLANT_BAND,
  ICC_MEGA_COLUMNS,
  ICC_LOBBY_COLLIDER,
  iccPlanAt,
  iccMegaColumnPoint,
  iccLocalCollider
} from './icc-architecture.js';

function nightAmount() {
  return smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
}

function signedArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 2; i + 1 < ring.length; j = i, i += 2) {
    area += ring[j] * ring[i + 1] - ring[i] * ring[j + 1];
  }
  return area * 0.5;
}
const REVERSE_QUAD = signedArea(ICC_LOCAL_RING) > 0;
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (a, b, c = 0) => {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.79) * 43758.5453;
  return value - Math.floor(value);
};

function addInstances(group, geometry, material, transforms, name, { castShadow = true, receiveShadow = true } = {}) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(transform.x, transform.y, transform.z);
    dummy.scale.set(transform.sx ?? 1, transform.sy ?? 1, transform.sz ?? 1);
    if (transform.quaternion) dummy.quaternion.copy(transform.quaternion);
    else dummy.rotation.set(0, transform.heading || 0, 0);
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

function createFacadeMaterial() {
  const material = new THREE.MeshStandardNodeMaterial({
    metalness: 0.48, roughness: 0.24, envMapIntensity: 0.72, side: THREE.DoubleSide
  });
  const vision = attribute('aVision', 'float');
  const lit = attribute('aLit', 'float');
  const cool = attribute('aCool', 'float');
  material.colorNode = attribute('color', 'vec3');
  material.roughnessNode = mix(0.39, 0.19, vision);
  const officeLight = mix(color(0xffd5a0), color(0xcde4ec), cool);
  material.emissiveNode = officeLight.mul(lit).mul(vision).mul(nightAmount()).mul(0.38);
  return material;
}

function panelStore() {
  return { positions: [], colors: [], lit: [], cool: [], vision: [], quads: 0 };
}

function pushQuad(store, a, b, c, d, tint, lit = 0, cool = 0, vision = 0) {
  const points = REVERSE_QUAD ? [a, d, c, b] : [a, b, c, d];
  for (const index of [0, 1, 2, 0, 2, 3]) {
    const point = points[index];
    store.positions.push(point[0], point[1], point[2]);
    store.colors.push(tint[0], tint[1], tint[2]);
    store.lit.push(lit);
    store.cool.push(cool);
    store.vision.push(vision);
  }
  store.quads++;
}

function storeGeometry(store) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(store.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(store.colors, 3));
  geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(store.lit, 1));
  geometry.setAttribute('aCool', new THREE.Float32BufferAttribute(store.cool, 1));
  geometry.setAttribute('aVision', new THREE.Float32BufferAttribute(store.vision, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function mixTint(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
const VISION_DARK = [0.055, 0.105, 0.135];
const VISION_SILVER = [0.18, 0.27, 0.30];
const SPANDREL_DARK = [0.20, 0.27, 0.29];
const SPANDREL_SILVER = [0.36, 0.43, 0.44];

function createLoftGeometry(y0, y1, outwardOffset = 0, { capTop = false, capBottom = false } = {}) {
  const bottom = iccPlanAt(y0, outwardOffset), top = iccPlanAt(y1, outwardOffset);
  const store = panelStore(), neutral = [0.5, 0.5, 0.5];
  for (let i = 0; i < bottom.length; i += 2) {
    const next = (i + 2) % bottom.length;
    const a = [bottom[i], y0, bottom[i + 1]], b = [bottom[next], y0, bottom[next + 1]];
    const d = [top[i], y1, top[i + 1]], c = [top[next], y1, top[next + 1]];
    pushQuad(store, a, b, c, d, neutral);
    if (capTop) pushQuad(store, [0, y1, 0], d, c, [0, y1, 0], neutral);
    if (capBottom) pushQuad(store, [0, y0, 0], b, a, [0, y0, 0], neutral);
  }
  // Loft geometry uses an ordinary material, so remove the custom facade attributes and retain position / normal only.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(store.positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function planBounds(y) {
  const ring = iccPlanAt(y);
  let hx = 0, hz = 0;
  for (let i = 0; i < ring.length; i += 2) {
    hx = Math.max(hx, Math.abs(ring[i]));
    hz = Math.max(hz, Math.abs(ring[i + 1]));
  }
  return { hx, hz };
}

function createCurtainWall() {
  const facade = panelStore(), frames = panelStore();
  const neutral = [0.62, 0.665, 0.67];
  let visionPanels = 0, dragonOmissions = 0;

  for (let row = 0; row < ICC_FACADE_ROWS; row++) {
    const y0 = ICC_LOBBY_HEIGHT + row * ICC_FACADE_ROW_HEIGHT;
    const y1 = y0 + ICC_FACADE_ROW_HEIGHT;
    const bottom = iccPlanAt(y0), top = iccPlanAt(y1);
    const rowMiddle = (y0 + y1) * 0.5;
    const tilt = rowMiddle < ICC_BASE_FLARE_END_Y ? ICC_BASE_PANEL_TILT
      : rowMiddle > 400 ? ICC_UPPER_PANEL_TILT : ICC_PANEL_TILT;
    const visionHeight = Math.min(ICC_VISION_HEIGHT, (y1 - y0) * 0.52);
    const vision0 = y0 + (y1 - y0 - visionHeight) * 0.5;
    const vision1 = vision0 + visionHeight;

    for (let edge = 0; edge < bottom.length; edge += 2) {
      const next = (edge + 2) % bottom.length;
      const bx0 = bottom[edge], bz0 = bottom[edge + 1], bx1 = bottom[next], bz1 = bottom[next + 1];
      const tx0 = top[edge], tz0 = top[edge + 1], tx1 = top[next], tz1 = top[next + 1];
      const edgeLength = Math.hypot((bx1 + tx1 - bx0 - tx0) * 0.5, (bz1 + tz1 - bz0 - tz0) * 0.5);
      if (edgeLength < 0.2) continue;
      const bays = Math.max(1, Math.round(edgeLength / ICC_BAY_WIDTH));
      const dx = (bx1 + tx1 - bx0 - tx0) * 0.5, dz = (bz1 + tz1 - bz0 - tz0) * 0.5;
      const normalLength = Math.hypot(dx, dz) || 1;
      const sign = REVERSE_QUAD ? 1 : -1;
      const nx = sign * dz / normalLength, nz = sign * -dx / normalLength;
      const northMain = Math.abs(bz1 - bz0) < 1 && (bz0 + bz1) * 0.5 < -ICC_SITE.d * 0.35 && edgeLength > 30;

      for (let bay = 0; bay < bays; bay++) {
        const centreX = lerp((bx0 + tx0) * 0.5, (bx1 + tx1) * 0.5, (bay + 0.5) / bays);
        if (northMain && rowMiddle < ICC_DRAGON_TAIL.y1 && Math.abs(centreX) < ICC_DRAGON_TAIL.halfWidthBottom) {
          dragonOmissions++;
          continue;
        }
        const gap = Math.min(0.018 / edgeLength, 0.1 / bays);
        const t0 = bay / bays + gap, t1 = (bay + 1) / bays - gap;
        const a0 = [lerp(bx0, bx1, t0), lerp(bz0, bz1, t0)];
        const b0 = [lerp(bx0, bx1, t1), lerp(bz0, bz1, t1)];
        const a1 = [lerp(tx0, tx1, t0), lerp(tz0, tz1, t0)];
        const b1 = [lerp(tx0, tx1, t1), lerp(tz0, tz1, t1)];
        const point = (low, high, y, extra = 0) => {
          const t = (y - y0) / (y1 - y0);
          const offset = 0.045 + Math.tan(tilt) * (y1 - y) + extra;
          return [lerp(low[0], high[0], t) + nx * offset, y, lerp(low[1], high[1], t) + nz * offset];
        };
        const quad = (store, lowY, highY, tint, lit = 0, cool = 0, vision = 0, extra = 0) => {
          pushQuad(store, point(a0, a1, lowY, extra), point(b0, b1, lowY, extra),
            point(b0, b1, highY, extra), point(a0, a1, highY, extra), tint, lit, cool, vision);
        };
        const variation = hash(row, edge, bay);
        const silver = hash(edge, bay, row + 19);
        const visionTint = mixTint(VISION_DARK, VISION_SILVER, 0.28 + silver * 0.42);
        const spandrelTint = mixTint(SPANDREL_DARK, SPANDREL_SILVER, 0.35 + variation * 0.40);
        const lit = hash(row + 41, edge, bay) > 0.84 ? 0.38 + hash(row, bay, edge) * 0.42 : 0;
        const cool = hash(edge + 7, row, bay) > 0.56 ? 1 : 0;
        quad(facade, y0, vision0, spandrelTint, 0, 0, 0);
        quad(facade, vision0, vision1, visionTint, lit, cool, 1);
        quad(facade, vision1, y1, spandrelTint, 0, 0, 0);
        visionPanels++;

        // Every course has a real projecting transom and every bay a narrow vertical aluminium mullion.
        quad(frames, y0, Math.min(y0 + 0.085, y1), neutral, 0, 0, 0, 0.035);
        const mullionWidth = Math.min(0.032 / edgeLength, 0.08 / bays);
        const mt0 = Math.max(0, t0 - mullionWidth), mt1 = Math.min(1, t0 + mullionWidth);
        const ma0 = [lerp(bx0, bx1, mt0), lerp(bz0, bz1, mt0)];
        const mb0 = [lerp(bx0, bx1, mt1), lerp(bz0, bz1, mt1)];
        const ma1 = [lerp(tx0, tx1, mt0), lerp(tz0, tz1, mt0)];
        const mb1 = [lerp(tx0, tx1, mt1), lerp(tz0, tz1, mt1)];
        pushQuad(frames, point(ma0, ma1, y0, 0.055), point(mb0, mb1, y0, 0.055),
          point(mb0, mb1, y1, 0.055), point(ma0, ma1, y1, 0.055), neutral);
      }
    }
  }
  return { facade, frames, visionPanels, dragonOmissions };
}

function createPlazaGeometry() {
  const shape = new THREE.Shape();
  const ring = iccPlanAt(0, 1.2);
  for (let i = 0; i < ring.length; i += 2) {
    if (i === 0) shape.moveTo(ring[i], -ring[i + 1]);
    else shape.lineTo(ring[i], -ring[i + 1]);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, ICC_PLAZA_TOP, 0);
  return geometry;
}

function createSignTexture(lines, width = 1024, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillStyle = '#eef3f1';
  lines.forEach((line, index) => {
    context.font = `${index === 0 ? 600 : 400} ${index === 0 ? 94 : 42}px Arial, "Noto Sans HK", sans-serif`;
    context.fillText(line, width / 2, index === 0 ? height * 0.36 : height * 0.76);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildInternationalCommerceCentre(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'InternationalCommerceCentre';
  group.userData.landmark = 'international-commerce-centre';
  group.userData.internalId = 'HK-B0004';
  group.userData.osm = { type: ICC_SITE.osmType, id: ICC_SITE.osmId };
  group.position.set(ICC_SITE.x, groundOffset, ICC_SITE.z);
  group.rotation.y = ICC_SITE.ry;
  root.add(group);

  const facadeMaterial = createFacadeMaterial();
  const frameMaterial = new THREE.MeshStandardNodeMaterial({ color: 0xaebbb9, metalness: 0.76, roughness: 0.3 });
  frameMaterial.emissiveNode = color(0xb9cccd).mul(nightAmount().mul(0.055));
  const darkCore = new THREE.MeshStandardMaterial({ color: 0x17252b, metalness: 0.28, roughness: 0.48, side: THREE.DoubleSide });
  const mechanical = new THREE.MeshStandardMaterial({ color: 0x253238, metalness: 0.58, roughness: 0.43, side: THREE.DoubleSide });
  const paleStructure = new THREE.MeshStandardNodeMaterial({ color: 0x9da9a7, metalness: 0.42, roughness: 0.46, side: THREE.DoubleSide });
  paleStructure.emissiveNode = color(0xb6c5c1).mul(nightAmount().mul(0.045));
  const parapetGlass = new THREE.MeshStandardNodeMaterial({ color: 0x71878c, metalness: 0.5, roughness: 0.27, side: THREE.DoubleSide });
  parapetGlass.emissiveNode = color(0xa9c2c7).mul(nightAmount().mul(0.065));
  const plazaStone = new THREE.MeshStandardMaterial({ color: 0x999e99, roughness: 0.88, metalness: 0.04 });
  const roofStone = new THREE.MeshStandardMaterial({ color: 0x606a6b, roughness: 0.79, metalness: 0.18 });
  const entranceGlass = new THREE.MeshStandardNodeMaterial({
    color: 0x3d5c66, metalness: 0.4, roughness: 0.22, side: THREE.DoubleSide
  });
  entranceGlass.emissiveNode = color(0xffd29b).mul(nightAmount().mul(0.16));
  const warmSoffit = new THREE.MeshStandardNodeMaterial({ color: 0x807766, metalness: 0.35, roughness: 0.42 });
  warmSoffit.emissiveNode = color(0xffd6a2).mul(nightAmount().mul(0.85));

  const plaza = new THREE.Mesh(createPlazaGeometry(), plazaStone);
  plaza.name = 'IccOsmStationRoofArrivalPlaza';
  plaza.receiveShadow = true;
  group.add(plaza);

  // A recessed dark backing is visible only in the small shingle joints. It follows the flared base and the separate
  // upper-third taper rather than using a single rectangular tower box.
  mergedMesh(group, [
    createLoftGeometry(ICC_LOBBY_HEIGHT, ICC_BASE_FLARE_END_Y, -0.36),
    createLoftGeometry(ICC_BASE_FLARE_END_Y, 320, -0.36),
    createLoftGeometry(320, ICC_ROOF_Y, -0.36, { capTop: true })
  ], darkCore, 'IccReentrantTaperedTowerBacking');

  const curtain = createCurtainWall();
  const facadeMesh = new THREE.Mesh(storeGeometry(curtain.facade), facadeMaterial);
  facadeMesh.name = 'IccShingledSilverLowECurtainWallPanels';
  facadeMesh.castShadow = true; facadeMesh.receiveShadow = true; facadeMesh.frustumCulled = false;
  group.add(facadeMesh);
  const frameMesh = new THREE.Mesh(storeGeometry(curtain.frames), frameMaterial);
  frameMesh.name = 'IccThreeMetreMullionsAndProjectingTransoms';
  frameMesh.castShadow = true; frameMesh.receiveShadow = true; frameMesh.frustumCulled = false;
  group.add(frameMesh);

  const bandGeometries = [], louverGeometries = [];
  for (const band of [...ICC_MECHANICAL_BANDS, ICC_CROWN_PLANT_BAND]) {
    bandGeometries.push(createLoftGeometry(band.y0, band.y1, 0.68, { capTop: true }));
    for (let y = band.y0 + 0.55; y < band.y1; y += 1.1) {
      louverGeometries.push(createLoftGeometry(y, Math.min(y + 0.12, band.y1), 0.76));
    }
  }
  mergedMesh(group, bandGeometries, mechanical, 'IccFourMechanicalBeltsAndCrownPlant');
  mergedMesh(group, louverGeometries, frameMaterial, 'IccMechanicalHorizontalLouvres', { castShadow: false });

  // Six-metre roof parapets are part of the published 484 m height. There is no invented antenna or pyramidal crown.
  mergedMesh(group, [createLoftGeometry(ICC_ROOF_Y, ICC_HEIGHT - 0.25, 0.03)],
    parapetGlass, 'IccSixMetrePerimeterParapet');
  mergedMesh(group, [createLoftGeometry(ICC_HEIGHT - 0.25, ICC_HEIGHT, 0.13, { capTop: true })],
    frameMaterial, 'IccParapetContinuousTopFlashing');
  mergedMesh(group, [createLoftGeometry(ICC_ROOF_Y - 0.28, ICC_ROOF_Y - 0.06, -0.55, { capTop: true })],
    roofStone, 'IccRecessedRoofDeck');

  const rooftopPlant = [];
  for (const x of [-12, -4, 4, 12]) for (const z of [-8, 8]) {
    rooftopPlant.push({ x, y: ICC_ROOF_Y - 1.35, z, sx: 4.6, sy: 2.4, sz: 5.2 });
  }
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), mechanical, rooftopPlant, 'IccRoofPlantBelowParapet');

  const beams = [], up = new THREE.Vector3(0, 1, 0);
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

  // Continuous fins make the four re-entrant crevasses legible from skyline distance without turning them into solid
  // corner boxes. Each fin follows both the lower flare and upper taper.
  for (let i = 0; i < ICC_LOCAL_RING.length; i += 2) {
    const levels = [ICC_LOBBY_HEIGHT, ICC_BASE_FLARE_END_Y, 320, ICC_ROOF_Y];
    for (let level = 0; level < levels.length - 1; level++) {
      const y0 = levels[level], y1 = levels[level + 1];
      const p0 = iccPlanAt(y0, 0.13), p1 = iccPlanAt(y1, 0.13);
      beam(beams, [p0[i], y0, p0[i + 1]], [p1[i], y1, p1[i + 1]], 0.11, 0.24);
    }
  }
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), frameMaterial, beams, 'IccReentrantCornerContinuousFins');

  const megaColumns = [], columnShoes = [];
  for (const column of ICC_MEGA_COLUMNS) {
    const bottom = iccMegaColumnPoint(column, 0), top = iccMegaColumnPoint(column, ICC_BASE_FLARE_END_Y);
    beam(megaColumns, [bottom.x, 0.35, bottom.z], [top.x, ICC_BASE_FLARE_END_Y, top.z], 1.05, 1.45);
    columnShoes.push({ x: bottom.x, y: 0.3, z: bottom.z, sx: 1.85, sy: 0.6, sz: 2.05 });
  }
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), paleStructure, megaColumns, 'IccEightThreeDegreeSplayedMegaColumns');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), paleStructure, columnShoes, 'IccMegaColumnBaseShoes');

  // North Dragon Tail: a scooped glass atrium, not a flat canopy decal. Its leading edge projects twelve metres from
  // the tower's north plane towards Kowloon Station, with overlapping glass courses and explicit curved ribs.
  function northFaceAt(y) {
    const ring = iccPlanAt(y);
    let north = Infinity;
    for (let i = 0; i < ring.length; i += 2) north = Math.min(north, ring[i + 1]);
    return north;
  }
  function tailPoint(u, t, outward = 0) {
    const y = lerp(ICC_DRAGON_TAIL.y0, ICC_DRAGON_TAIL.y1, t);
    const halfWidth = lerp(ICC_DRAGON_TAIL.halfWidthBottom, ICC_DRAGON_TAIL.halfWidthTop, t);
    const scoop = ICC_DRAGON_TAIL.projection * (1 - Math.sqrt(Math.max(0, t)));
    const z = northFaceAt(y) - scoop + u * u * 6 * (1 - t) - outward;
    return [u * halfWidth, y, z];
  }
  const tailPanels = panelStore(), tailRows = 20, tailColumns = 12;
  for (let row = 0; row < tailRows; row++) for (let column = 0; column < tailColumns; column++) {
    const t0 = row / tailRows, t1 = (row + 1) / tailRows;
    const u0 = -1 + column * 2 / tailColumns, u1 = -1 + (column + 1) * 2 / tailColumns;
    const tint = mixTint(VISION_DARK, VISION_SILVER, 0.25 + hash(row, column, 91) * 0.32);
    const spandrel = mixTint(SPANDREL_DARK, SPANDREL_SILVER, 0.44);
    const lit = hash(row, column, 93) > 0.86 ? 0.48 : 0;
    const tv = lerp(t0, t1, 0.27);
    pushQuad(tailPanels, tailPoint(u0, t0, 0.22), tailPoint(u1, t0, 0.22),
      tailPoint(u1, tv, 0.08), tailPoint(u0, tv, 0.08), spandrel, 0, 0, 0);
    pushQuad(tailPanels, tailPoint(u0, tv, 0.08), tailPoint(u1, tv, 0.08),
      tailPoint(u1, t1), tailPoint(u0, t1), tint, lit, 0.35, 1);
  }
  // Glazed returns close both sides of the scoop back into the main north elevation; there is no open black slit
  // between the Dragon Tail and the ordinary shingled facade.
  for (let row = 0; row < tailRows; row++) for (const side of [-1, 1]) {
    const t0 = row / tailRows, t1 = (row + 1) / tailRows;
    const y0 = lerp(ICC_DRAGON_TAIL.y0, ICC_DRAGON_TAIL.y1, t0);
    const y1 = lerp(ICC_DRAGON_TAIL.y0, ICC_DRAGON_TAIL.y1, t1);
    const anchor0 = [side * ICC_DRAGON_TAIL.halfWidthBottom, y0, northFaceAt(y0) + 0.03];
    const anchor1 = [side * ICC_DRAGON_TAIL.halfWidthTop, y1, northFaceAt(y1) + 0.03];
    const edge0 = tailPoint(side, t0, 0.04), edge1 = tailPoint(side, t1, 0.04);
    const tint = mixTint(VISION_DARK, VISION_SILVER, 0.42);
    if (side < 0) pushQuad(tailPanels, edge0, anchor0, anchor1, edge1, tint, 0, 0.4, 1);
    else pushQuad(tailPanels, anchor0, edge0, edge1, anchor1, tint, 0, 0.4, 1);
  }
  const tailMesh = new THREE.Mesh(storeGeometry(tailPanels), facadeMaterial);
  tailMesh.name = 'IccNorthDragonTailScoopedGlassAtrium';
  tailMesh.castShadow = true; tailMesh.receiveShadow = true; tailMesh.frustumCulled = false;
  group.add(tailMesh);
  const tailRibs = [];
  for (let rib = 0; rib < ICC_DRAGON_TAIL.ribs; rib++) {
    const u = -1 + rib * 2 / (ICC_DRAGON_TAIL.ribs - 1);
    for (let row = 0; row < tailRows; row++) {
      beam(tailRibs, tailPoint(u, row / tailRows, 0.12), tailPoint(u, (row + 1) / tailRows, 0.04), 0.105, 0.18);
    }
  }
  for (let row = 0; row <= tailRows; row++) for (let column = 0; column < tailColumns; column++) {
    const deepBand = row % 2 === 0;
    beam(tailRibs, tailPoint(-1 + column * 2 / tailColumns, row / tailRows, 0.16),
      tailPoint(-1 + (column + 1) * 2 / tailColumns, row / tailRows, 0.16), deepBand ? 0.22 : 0.095, deepBand ? 0.34 : 0.16);
  }
  for (let row = 0; row <= tailRows; row++) for (const side of [-1, 1]) {
    const t = row / tailRows, y = lerp(ICC_DRAGON_TAIL.y0, ICC_DRAGON_TAIL.y1, t);
    beam(tailRibs, tailPoint(side, t, 0.12),
      [side * lerp(ICC_DRAGON_TAIL.halfWidthBottom, ICC_DRAGON_TAIL.halfWidthTop, t), y, northFaceAt(y) + 0.06], 0.09, 0.15);
  }
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), frameMaterial, tailRibs, 'IccDragonTailCurvedSilverRibs');
  const soffitGeometries = [];
  const soffitPoint = (u, v) => {
    const leading = tailPoint(u, 0);
    return [leading[0], ICC_DRAGON_TAIL.y0 - 0.18 - v * 0.12, leading[2] + v * 4.5];
  };
  for (let column = 0; column < 6; column++) for (let row = 0; row < 2; row++) {
    const u0 = -1 + column / 3, u1 = -1 + (column + 1) / 3, v0 = row / 2, v1 = (row + 1) / 2;
    const points = [soffitPoint(u0, v0), soffitPoint(u0, v1), soffitPoint(u1, v1),
      soffitPoint(u0, v0), soffitPoint(u1, v1), soffitPoint(u1, v0)];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.computeVertexNormals(); soffitGeometries.push(geometry);
  }
  mergedMesh(group, soffitGeometries, paleStructure, 'IccDragonTailPointedMetalSoffit');
  const tailSoffit = [];
  for (const x of [-12, -6, 0, 6, 12]) tailSoffit.push({ x, y: ICC_DRAGON_TAIL.y0 - 0.18, z: tailPoint(0, 0)[2] + 1.3, sx: 3.8, sy: 0.12, sz: 0.32 });
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), warmSoffit, tailSoffit, 'IccDragonTailWarmUndersideLights', { castShadow: false });

  // Offices and hotel use angular glazed canopies on the other three sides. The north side remains the unique scoop.
  const canopyPanels = [], canopyRibs = [], canopyColumns = [];
  function canopyPoint(side, u, v) {
    const face = planBounds(ICC_LOBBY_HEIGHT).hx;
    const across = u * 11, outward = face + 6 * v, y = lerp(ICC_LOBBY_HEIGHT, 10.5, v);
    if (side === 0) return [outward, y, across];
    if (side === 1) return [-across, y, outward];
    return [-outward, y, -across];
  }
  for (let side = 0; side < 3; side++) {
    for (let column = 0; column < 6; column++) {
      const u0 = -1 + column / 3, u1 = -1 + (column + 1) / 3;
      const a = canopyPoint(side, u0, 0), b = canopyPoint(side, u1, 0);
      const c = canopyPoint(side, u1, 1), d = canopyPoint(side, u0, 1);
      const geometry = new THREE.BufferGeometry();
      const points = [a, d, c, a, c, b];
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
      geometry.computeVertexNormals();
      canopyPanels.push(geometry);
      beam(canopyRibs, a, d, 0.11, 0.18);
      beam(canopyRibs, d, c, 0.11, 0.18);
    }
    for (const u of [-0.82, 0.82]) {
      const top = canopyPoint(side, u, 1);
      beam(canopyColumns, [top[0], 0.25, top[2]], top, 0.28, 0.36);
    }
  }
  mergedMesh(group, canopyPanels, entranceGlass, 'IccThreeAngularOfficeAndHotelCanopies');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), frameMaterial, canopyRibs, 'IccAngularCanopyRibs');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), paleStructure, canopyColumns, 'IccAngularCanopySlenderSupports');

  // Entrance glazing stays behind the arrival carriageways. The occupied tower collider begins above their vehicle
  // envelope, so the real elevated station-roof roads can pass below the cantilever without being horizontally moved.
  const entranceFrames = [];
  const northZ = northFaceAt(ICC_LOBBY_HEIGHT) + 0.35;
  const northDoors = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), entranceGlass);
  northDoors.position.set(0, 5.1, northZ); northDoors.rotation.y = Math.PI;
  northDoors.name = 'IccNorthStationAtriumEntranceDoors'; group.add(northDoors);
  for (const x of [-10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10]) {
    entranceFrames.push({ x, y: 5.1, z: northZ - 0.05, sx: 0.11, sy: 10.1, sz: 0.13 });
  }
  for (const y of [0.12, 5.1, 10.15]) entranceFrames.push({ x: 0, y, z: northZ - 0.05, sx: 20.15, sy: 0.11, sz: 0.13 });
  for (let side = 0; side < 3; side++) {
    const centre = canopyPoint(side, 0, 0);
    const doors = new THREE.Mesh(new THREE.PlaneGeometry(8, 7), entranceGlass);
    doors.position.set(centre[0], 3.6, centre[2]);
    doors.rotation.y = side === 0 ? Math.PI / 2 : side === 1 ? 0 : -Math.PI / 2;
    doors.name = `IccAngularCanopyEntrance${side + 1}`; group.add(doors);
  }
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), frameMaterial, entranceFrames, 'IccNorthEntranceDoorFrames');

  const signMaterial = new THREE.MeshBasicMaterial({
    map: createSignTexture(['ICC', '環球貿易廣場  INTERNATIONAL COMMERCE CENTRE']),
    transparent: true, side: THREE.DoubleSide, toneMapped: false
  });
  const northSign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), signMaterial);
  northSign.position.set(-3.5, 7.8, northZ - 0.09);
  northSign.rotation.y = Math.PI; northSign.name = 'IccDragonTailIdentificationSign'; group.add(northSign);
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), mechanical, [{
    x: -3.5, y: 7.8, z: northZ, sx: 7.4, sy: 1.95, sz: 0.12
  }], 'IccDragonTailSignMetalBacking');
  const hotelSignMaterial = new THREE.MeshBasicMaterial({
    map: createSignTexture(['THE RITZ-CARLTON', 'HONG KONG']), transparent: true, side: THREE.DoubleSide, toneMapped: false
  });
  const hotelSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), hotelSignMaterial);
  hotelSign.position.set(6.5, 7.8, northZ - 0.09); hotelSign.rotation.y = Math.PI;
  hotelSign.name = 'IccHotelArrivalSign'; group.add(hotelSign);

  const beaconMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x7d1610, roughness: 0.35 });
  beaconMaterial.emissiveNode = color(0xff321d).mul(nightAmount().mul(2.4).add(0.35));
  const beacons = [];
  const crownRing = iccPlanAt(ICC_HEIGHT, -1.1);
  for (const index of [2, 8, 12, 18]) beacons.push({ x: crownRing[index], y: ICC_HEIGHT - 0.18, z: crownRing[index + 1] });
  addInstances(group, new THREE.SphereGeometry(0.18, 8, 6), beaconMaterial, beacons, 'IccRoofObstructionLights', { castShadow: false });

  const colliders = [];
  const towerIntervals = [[ICC_LOBBY_HEIGHT, ICC_BASE_FLARE_END_Y], [ICC_BASE_FLARE_END_Y, 320], [320, ICC_ROOF_Y], [ICC_ROOF_Y, ICC_HEIGHT]];
  for (const [y0, y1] of towerIntervals) {
    const a = planBounds(y0), b = planBounds(y1);
    colliders.push(iccLocalCollider({ w: Math.max(a.hx, b.hx) * 2 + 0.8, d: Math.max(a.hz, b.hz) * 2 + 0.8, minY: y0, maxY: y1 }));
  }
  colliders.push(iccLocalCollider(ICC_LOBBY_COLLIDER));
  colliders.push(iccLocalCollider({ x: 0, z: northZ, w: 20, d: 0.7, minY: 0, maxY: 10.2 }));
  colliders.push(iccLocalCollider({
    x: 0, z: tailPoint(0, 0)[2] + ICC_DRAGON_TAIL.projection * 0.45,
    w: ICC_DRAGON_TAIL.halfWidthBottom * 2, d: ICC_DRAGON_TAIL.projection + 3,
    minY: ICC_DRAGON_TAIL.y0 - 0.35, maxY: ICC_DRAGON_TAIL.y1
  }));
  for (const column of ICC_MEGA_COLUMNS) {
    const lower = iccMegaColumnPoint(column, 7), upper = iccMegaColumnPoint(column, 42);
    colliders.push(iccLocalCollider({ x: lower.x, z: lower.z, w: 2.3, d: 2.5, minY: 0, maxY: ICC_LOBBY_HEIGHT }));
    colliders.push(iccLocalCollider({ x: upper.x, z: upper.z, w: 4.6, d: 4.9, minY: ICC_LOBBY_HEIGHT, maxY: ICC_BASE_FLARE_END_Y }));
  }

  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = {
    name: ICC_SITE.name, englishName: ICC_SITE.englishName,
    x: ICC_SITE.x, z: ICC_SITE.z, w: ICC_SITE.w, d: ICC_SITE.d, h: ICC_HEIGHT, ry: ICC_SITE.ry,
    bounds: { ...ICC_SITE.bounds }, ring: ICC_SITE.ring, osmId: ICC_SITE.osmId
  };
  const stats = {
    iccGroundOffset: groundOffset,
    iccLandmarks: 1,
    iccHeight: ICC_HEIGHT,
    iccParapetHeight: ICC_PARAPET_HEIGHT,
    iccOsmLevels: ICC_OSM_LEVELS,
    iccDesignLevels: ICC_DESIGN_LEVELS,
    iccReportedAboveGroundLevels: ICC_REPORTED_ABOVE_GROUND_LEVELS,
    iccFacadeRows: ICC_FACADE_ROWS,
    iccVisionPanels: curtain.visionPanels,
    iccFacadeQuads: curtain.facade.quads,
    iccFrameQuads: curtain.frames.quads,
    iccDragonTailPanels: tailPanels.quads,
    iccDragonTailRibs: tailRibs.length,
    iccDragonTailProjection: ICC_DRAGON_TAIL.projection,
    iccMegaColumns: ICC_MEGA_COLUMNS.length,
    iccMechanicalBelts: ICC_MECHANICAL_BANDS.length,
    iccAngularCanopies: 3,
    iccColliders: colliders.length
  };
  group.userData.stats = stats;
  return { group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: ICC_PLAZA_TOP + groundOffset };
}
