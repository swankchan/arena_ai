import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, color, float, length, pow, smoothstep, uv } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import { HK_STREET_LIGHTS } from '../../hk-street-light-data.js';
import { crossingSurfaceAt } from './crossings.js';
import { surfaceRoadHeight } from './road-elevation.js';

export const HK_STREET_LIGHT_HEIGHT = 9.6;
const ARM_REACH = 2.15;
const CHUNK_SIZE = 1000;
const GEOMETRY_RANGE = 800;
const POOL_RANGE = 260;
const NIGHT_GLOW_RANGE = 1800;

function nightAmount() {
  const t = Math.max(0, Math.min(1, (cityUniforms.uInteriorGlow.value - 0.7) / 0.75));
  return t * t * (3 - 2 * t);
}

function poleGeometry() {
  const parts = [
    new THREE.CylinderGeometry(0.075, 0.13, HK_STREET_LIGHT_HEIGHT, 6).translate(0, HK_STREET_LIGHT_HEIGHT * 0.5, 0),
    // The buried sleeve reaches below the flat land/park surfaces as well as the slightly higher road ribbon.
    new THREE.CylinderGeometry(0.19, 0.24, 0.60, 8).translate(0, 0.12, 0)
  ];
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return geometry;
}

function armGeometry() {
  // A shallow curved bracket, not a rectangular T suspended from the pole top.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 9.24, 0),
    new THREE.Vector3(0, 9.29, 0.48),
    new THREE.Vector3(0, 9.47, 1.30),
    new THREE.Vector3(0, 9.62, 2.02)
  ], false, 'centripetal');
  return new THREE.TubeGeometry(curve, 6, 0.045, 4, false);
}

function headGeometry() {
  return new THREE.BoxGeometry(0.34, 0.17, 0.68).translate(0, 9.60, ARM_REACH);
}

function glowGeometry() {
  return new THREE.SphereGeometry(0.36, 6, 4).translate(0, 9.60, ARM_REACH);
}

function materials() {
  const night = smoothstep(0.7, 1.45, cityUniforms.uInteriorGlow);
  const metal = new THREE.MeshStandardMaterial({ color: 0x737875, metalness: 0.68, roughness: 0.48 });
  const head = new THREE.MeshStandardNodeMaterial({ color: 0x8d845e, metalness: 0.16, roughness: 0.48 });
  head.emissiveNode = color(0xffb84f).mul(night.mul(4.2));
  const glow = new THREE.MeshBasicNodeMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
  });
  glow.colorNode = color(0xffb235).mul(night.mul(1.6));
  glow.opacityNode = night.mul(0.55);
  const pool = new THREE.MeshBasicNodeMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const radius = length(uv().sub(0.5)).mul(2);
  const radial = clamp(float(1).sub(radius), 0, 1);
  // Broad, low-energy scattering plus a gentle core: no hard-edged orange spot under each lamp.
  const scattered = pow(radial, 1.35).mul(0.16);
  const softCore = pow(radial, 3.2).mul(0.08);
  pool.colorNode = color(0xffbd67).mul(scattered.add(softCore).mul(night));
  pool.opacityNode = float(1);
  return { metal, head, glow, pool };
}

function makeInstanced(geometry, material, count, name, representatives, kind, shadows = false) {
  if (!count) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  mesh.frustumCulled = true;
  if (representatives[kind]) mesh.userData.sharesPipelineWith = representatives[kind];
  else representatives[kind] = mesh;
  return mesh;
}

function finishMesh(mesh) {
  if (!mesh) return;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

// Exact source positions are static. Geometry is bucketed into 1 km cells so the rest of the territory does not get
// submitted while driving in one district. All luminaires share five pipelines; emissive heads, halos and flat road
// pools provide the night effect without creating 145,000 real-time lights.
export function createHongKongStreetLighting(root, { lamps = HK_STREET_LIGHTS.lamps } = {}) {
  const group = new THREE.Group();
  group.name = 'HongKongStreetLighting';
  group.userData.streetLighting = true;
  root.add(group);
  const buckets = new Map();
  let singleArm = 0, doubleArm = 0, bridgeMatched = 0;
  for (const lamp of lamps) {
    const [x, z, heading, arms] = lamp;
    if (![x, z, heading, arms].every(Number.isFinite) || ![1, 2].includes(arms)) throw new Error('Invalid street-light record');
    const key = `${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`;
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = { key, lamps: [], minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }));
    const crossing = crossingSurfaceAt(x, z, 1);
    const baseY = crossing?.kind === 'bridge' ? crossing.height : surfaceRoadHeight(x, z);
    if (crossing?.kind === 'bridge') bridgeMatched++;
    bucket.lamps.push([x, z, heading, arms, baseY]);
    bucket.minX = Math.min(bucket.minX, x - 2.6); bucket.maxX = Math.max(bucket.maxX, x + 2.6);
    bucket.minZ = Math.min(bucket.minZ, z - 2.6); bucket.maxZ = Math.max(bucket.maxZ, z + 2.6);
    if (arms === 2) doubleArm++; else singleArm++;
  }

  const material = materials();
  const poleGeo = poleGeometry(), armGeo = armGeometry(), headGeo = headGeometry(), glowGeo = glowGeometry();
  const poolGeo = new THREE.PlaneGeometry(18, 18).rotateX(-Math.PI / 2);
  const representatives = {}, chunks = [], dummy = new THREE.Object3D();
  for (const bucket of buckets.values()) {
    const chunk = new THREE.Group();
    chunk.name = `HongKongStreetLightChunk:${bucket.key}`;
    group.add(chunk);
    const headCount = bucket.lamps.reduce((sum, lamp) => sum + lamp[3], 0);
    const poles = makeInstanced(poleGeo, material.metal, bucket.lamps.length,
      `HongKongStreetLightPoles:${bucket.key}`, representatives, 'poles', true);
    const arms = makeInstanced(armGeo, material.metal, headCount,
      `HongKongStreetLightArms:${bucket.key}`, representatives, 'arms', true);
    const heads = makeInstanced(headGeo, material.head, headCount,
      `HongKongStreetLightHeads:${bucket.key}`, representatives, 'heads');
    const glows = makeInstanced(glowGeo, material.glow, headCount,
      `HongKongStreetLightGlows:${bucket.key}`, representatives, 'glows');
    const pools = makeInstanced(poolGeo, material.pool, headCount,
      `HongKongStreetLightPools:${bucket.key}`, representatives, 'pools');
    let headIndex = 0;
    // Set matrices in an indexed pass; no source coordinate is replaced by a snapped road position.
    for (let lampIndex = 0; lampIndex < bucket.lamps.length; lampIndex++) {
      const [x, z, heading, armCount, baseY] = bucket.lamps[lampIndex];
      dummy.position.set(x, baseY, z); dummy.rotation.set(0, heading, 0); dummy.updateMatrix();
      poles.setMatrixAt(lampIndex, dummy.matrix);
      for (let arm = 0; arm < armCount; arm++) {
        const armHeading = heading + arm * Math.PI;
        dummy.position.set(x, baseY, z); dummy.rotation.set(0, armHeading, 0); dummy.updateMatrix();
        arms.setMatrixAt(headIndex, dummy.matrix);
        heads.setMatrixAt(headIndex, dummy.matrix);
        glows.setMatrixAt(headIndex, dummy.matrix);
        const hx = x + Math.sin(armHeading) * ARM_REACH, hz = z + Math.cos(armHeading) * ARM_REACH;
        const surface = crossingSurfaceAt(hx, hz, 1.5);
        const poolGround = surface?.kind === 'bridge' ? surface.height : surfaceRoadHeight(hx, hz);
        const poolY = poolGround + 0.045;
        dummy.position.set(hx, poolY, hz); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
        pools.setMatrixAt(headIndex, dummy.matrix);
        headIndex++;
      }
    }
    for (const mesh of [poles, arms, heads, glows, pools]) { finishMesh(mesh); chunk.add(mesh); }
    chunks.push({ group: chunk, poles, arms, heads, glows, pools, ...bucket });
  }

  const stats = {
    streetLightSourceLamps: lamps.length,
    streetLightSingleArm: singleArm,
    streetLightDoubleArm: doubleArm,
    streetLightHeads: singleArm + doubleArm * 2,
    streetLightBridgeMatched: bridgeMatched,
    streetLightChunks: chunks.length,
    streetLightGeometryRangeM: GEOMETRY_RANGE,
    streetLightNightGlowRangeM: NIGHT_GLOW_RANGE,
    streetLightRealPointLights: 0
  };
  group.userData.stats = stats;

  function update({ cameraSystem } = {}) {
    const position = cameraSystem?.currentPos || cameraSystem?.camera?.position;
    if (!position) return;
    updateAt(position);
  }

  function updateAt(position) {
    const night = nightAmount();
    for (const chunk of chunks) {
      const dx = Math.max(chunk.minX - position.x, 0, position.x - chunk.maxX);
      const dz = Math.max(chunk.minZ - position.z, 0, position.z - chunk.maxZ);
      const distanceSq = dx * dx + dz * dz;
      const geometryVisible = distanceSq <= GEOMETRY_RANGE * GEOMETRY_RANGE;
      const farGlowVisible = night > 0.01 && distanceSq <= NIGHT_GLOW_RANGE * NIGHT_GLOW_RANGE;
      chunk.group.visible = geometryVisible || farGlowVisible;
      if (!chunk.group.visible) continue;
      chunk.poles.visible = geometryVisible;
      chunk.arms.visible = geometryVisible;
      chunk.heads.visible = geometryVisible;
      // Near zero-alpha instances stay visible by day so the initial shader precompile covers every shared pipeline.
      chunk.pools.visible = distanceSq <= POOL_RANGE * POOL_RANGE;
      chunk.glows.visible = geometryVisible || farGlowVisible;
    }
  }

  updateAt({ x: 0, z: 0 });
  return { group, stats, update, updateAt, chunks };
}
