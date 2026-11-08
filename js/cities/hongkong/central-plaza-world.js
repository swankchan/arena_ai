import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep, uniform } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  CENTRAL_PLAZA_SITE, CENTRAL_PLAZA_HEIGHT, CENTRAL_PLAZA_OFFICIAL_ROUNDED_HEIGHT,
  CENTRAL_PLAZA_OSM_ROOF_HEIGHT, CENTRAL_PLAZA_OSM_LEVELS, CENTRAL_PLAZA_OFFICIAL_OFFICE_LEVELS,
  CENTRAL_PLAZA_MAST_HEIGHT, CENTRAL_PLAZA_PLAZA_TOP, CENTRAL_PLAZA_PODIUM_HEIGHT,
  CENTRAL_PLAZA_BODY_TOP, CENTRAL_PLAZA_FLOOR_HEIGHT, CENTRAL_PLAZA_BAY_WIDTH,
  CENTRAL_PLAZA_COLUMN_SPACING, CENTRAL_PLAZA_CROWN_PLANT_FLOORS, CENTRAL_PLAZA_PYRAMID_TOP,
  CENTRAL_PLAZA_LIGHTIME_BAND_LEVELS, CENTRAL_PLAZA_FRAME_BOTTOM, CENTRAL_PLAZA_FRAME_TOP, CENTRAL_PLAZA_LOCAL_RING,
  CENTRAL_PLAZA_LIGHTIME_PALETTE, centralPlazaPlanAt, centralPlazaLocalCollider, centralPlazaLightimeState
} from './central-plaza-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const hash = (a, b, c = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.79) * 43758.5453; return v - Math.floor(v); };
function nightAmount() { return smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow); }
function store() { return { positions: [], colors: [], lit: [], quads: 0, triangles: 0 }; }
function vertex(s, p, tint, lit = 0) { s.positions.push(...p); s.colors.push(...tint); s.lit.push(lit); }
function quad(s, a, b, c, d, tint, lit = 0) { for (const i of [0, 1, 2, 0, 2, 3]) vertex(s, [a, b, c, d][i], tint, lit); s.quads++; }
function triangle(s, a, b, c, tint) { for (const p of [a, b, c]) vertex(s, p, tint); s.triangles++; }
function geometry(s) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3));
  g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null;
  const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name; mesh.frustumCulled = false;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name) {
  if (!parts.length) return null;
  const g = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(g, material); mesh.name = name; mesh.frustumCulled = false;
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function beam(parts, a, b, width, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length(); if (length < 0.02) return;
  const g = new THREE.BoxGeometry(width, length, depth);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  parts.push(g);
}
function instances(group, g, material, transforms, name, shadows = true) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(g, material, transforms.length), dummy = new THREE.Object3D();
  transforms.forEach((t, i) => {
    dummy.position.set(t.x, t.y, t.z); dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    dummy.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.name = name; mesh.frustumCulled = false;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function glassMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0.48, roughness: 0.23, envMapIntensity: 0.75, side: THREE.DoubleSide });
  m.colorNode = attribute('color', 'vec3');
  m.emissiveNode = color(0xffd29b).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(0.24);
  return m;
}
function vertexMaterial(options = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.72, side: THREE.DoubleSide, ...options });
  m.colorNode = attribute('color', 'vec3'); return m;
}
function mixTint(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

function createBodyCurtainWall() {
  const facade = store(), frames = store(), goldNeon = [];
  let visionPanels = 0;
  for (let row = 0, y = CENTRAL_PLAZA_PODIUM_HEIGHT; y < CENTRAL_PLAZA_BODY_TOP - 0.01; row++) {
    const y0 = y, y1 = Math.min(y + CENTRAL_PLAZA_FLOOR_HEIGHT, CENTRAL_PLAZA_BODY_TOP); y = y1;
    const bottom = centralPlazaPlanAt(y0), top = centralPlazaPlanAt(y1);
    for (let edge = 0; edge + 3 < bottom.length; edge += 2) {
      const next = edge + 2, ax = bottom[edge], az = bottom[edge + 1], bx = bottom[next], bz = bottom[next + 1];
      const length = Math.hypot(bx - ax, bz - az), broad = length > 30;
      const bays = Math.max(1, Math.round(length / CENTRAL_PLAZA_BAY_WIDTH));
      const dx = bx - ax, dz = bz - az, nx = dz / (length || 1), nz = -dx / (length || 1);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0012, t1 = (bay + 1) / bays - 0.0012, mid = (t0 + t1) * 0.5;
        const gold = broad && Math.abs(mid - 0.5) < 0.27;
        const variation = hash(row, edge, bay);
        const base = gold ? [0.26, 0.19, 0.10] : broad ? [0.15, 0.25, 0.28] : [0.075, 0.15, 0.18];
        const high = gold ? [0.54, 0.42, 0.23] : broad ? [0.35, 0.45, 0.46] : [0.23, 0.34, 0.37];
        const tint = mixTint(base, high, 0.30 + variation * 0.42);
        const point = (t, yy, offset = 0.035) => [lerp(ax, bx, t) + nx * offset, yy, lerp(az, bz, t) + nz * offset];
        const lit = hash(row + 17, bay, edge) > 0.88 ? 0.30 + variation * 0.38 : 0;
        quad(facade, point(t0, y0 + 0.04), point(t1, y0 + 0.04), point(t1, y1 - 0.04), point(t0, y1 - 0.04), tint, lit);
        visionPanels++;
        const spandrel = gold ? [0.24, 0.20, 0.13] : [0.16, 0.23, 0.25];
        quad(facade, point(t0, y0 + 0.04, 0.045), point(t1, y0 + 0.04, 0.045),
          point(t1, Math.min(y0 + 0.42, y1), 0.045), point(t0, Math.min(y0 + 0.42, y1), 0.045), spandrel);
        const ft = [0.39, 0.45, 0.44];
        quad(frames, point(t0, y0, 0.065), point(t1, y0, 0.065), point(t1, y0 + 0.07, 0.065), point(t0, y0 + 0.07, 0.065), ft);
        const major = bay % 3 === 0, half = (major ? 0.15 : 0.045) / length;
        quad(frames, point(Math.max(0, t0 - half), y0, 0.07), point(Math.min(1, t0 + half), y0, 0.07),
          point(Math.min(1, t0 + half), y1, 0.07), point(Math.max(0, t0 - half), y1, 0.07), ft);
      }
      if (broad && row === 0) {
        for (const t of [0.32, 0.38, 0.44, 0.50, 0.56, 0.62, 0.68]) {
          beam(goldNeon, [lerp(ax, bx, t) + nx * 0.15, 34, lerp(az, bz, t) + nz * 0.15],
            [lerp(ax, bx, t) + nx * 0.15, CENTRAL_PLAZA_BODY_TOP - 3, lerp(az, bz, t) + nz * 0.15], 0.10, 0.12);
        }
      }
    }
  }
  return { facade, frames, goldNeon, visionPanels };
}

function loft(storeObject, y0, y1, tint, offset = 0) {
  const a = centralPlazaPlanAt(y0), b = centralPlazaPlanAt(y1);
  for (let i = 0; i + 3 < a.length; i += 2) {
    quad(storeObject, [a[i] + Math.sign(a[i]) * offset, y0, a[i + 1] + Math.sign(a[i + 1]) * offset],
      [a[i + 2] + Math.sign(a[i + 2]) * offset, y0, a[i + 3] + Math.sign(a[i + 3]) * offset],
      [b[i + 2], y1, b[i + 3]], [b[i], y1, b[i + 1]], tint);
  }
}

function createCrown(group, materials) {
  const backing = store(), louvres = [], staticNeon = [];
  const height = CENTRAL_PLAZA_OSM_ROOF_HEIGHT - CENTRAL_PLAZA_BODY_TOP;
  for (let floor = 0; floor < CENTRAL_PLAZA_CROWN_PLANT_FLOORS; floor++) {
    const y0 = CENTRAL_PLAZA_BODY_TOP + height * floor / CENTRAL_PLAZA_CROWN_PLANT_FLOORS;
    const y1 = CENTRAL_PLAZA_BODY_TOP + height * (floor + 1) / CENTRAL_PLAZA_CROWN_PLANT_FLOORS;
    loft(backing, y0, y1, [0.11, 0.15, 0.16]);
    for (let y = y0 + 0.55; y < y1; y += 0.78) {
      const plan = centralPlazaPlanAt(y);
      for (let i = 0; i + 3 < plan.length; i += 2) {
        beam(louvres, [plan[i], y, plan[i + 1]], [plan[i + 2], y, plan[i + 3]], 0.12, 0.20);
      }
    }
    const neonPlan = centralPlazaPlanAt(y0 + 0.2);
    for (let i = 0; i + 3 < neonPlan.length; i += 2) {
      beam(staticNeon, [neonPlan[i], y0 + 0.2, neonPlan[i + 1]], [neonPlan[i + 2], y0 + 0.2, neonPlan[i + 3]], 0.12, 0.14);
    }
  }
  meshStore(group, backing, materials.vertexDark, 'CentralPlazaSixMechanicalCrownFloors');
  merged(group, louvres, materials.metal, 'CentralPlazaCrownHorizontalLouvres');
  merged(group, staticNeon, materials.goldNeon, 'CentralPlazaGoldCrownSpandrelLighting');

  const frame = [], plan = centralPlazaPlanAt(CENTRAL_PLAZA_OSM_ROOF_HEIGHT);
  for (const index of [1, 5, 9]) {
    const i = index * 2;
    beam(frame, [plan[i], CENTRAL_PLAZA_FRAME_BOTTOM, plan[i + 1]], [plan[i], CENTRAL_PLAZA_FRAME_TOP, plan[i + 1]], 0.72, 0.72);
    beam(frame, [plan[i], CENTRAL_PLAZA_FRAME_TOP, plan[i + 1]], [0, CENTRAL_PLAZA_PYRAMID_TOP, 0], 0.48, 0.55);
  }
  for (const y of [CENTRAL_PLAZA_FRAME_BOTTOM, CENTRAL_PLAZA_FRAME_TOP]) {
    for (let i = 0; i + 3 < plan.length; i += 2) beam(frame, [plan[i], y, plan[i + 1]], [plan[i + 2], y, plan[i + 3]], 0.48, 0.55);
  }
  merged(group, frame, materials.champagne, 'CentralPlazaOpenCrownFrameAroundPyramid');
}

function createPyramid(group, materials) {
  const glass = store(), rafters = [], base = CENTRAL_PLAZA_LOCAL_RING.map((value) => value * 0.78);
  const apex = [0, CENTRAL_PLAZA_PYRAMID_TOP, 0];
  for (let i = 0; i + 3 < base.length; i += 2) {
    const a = [base[i], CENTRAL_PLAZA_OSM_ROOF_HEIGHT, base[i + 1]];
    const b = [base[i + 2], CENTRAL_PLAZA_OSM_ROOF_HEIGHT, base[i + 3]];
    const segments = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 5));
    for (let segment = 0; segment < segments; segment++) {
      const t0 = segment / segments, t1 = (segment + 1) / segments;
      const p0 = a.map((value, axis) => lerp(value, b[axis], t0));
      const p1 = a.map((value, axis) => lerp(value, b[axis], t1));
      const tint = mixTint([0.23, 0.20, 0.12], [0.48, 0.40, 0.22], hash(i, segment));
      triangle(glass, p0, p1, apex, tint);
      beam(rafters, p0, apex, 0.16, 0.18);
    }
    beam(rafters, a, b, 0.32, 0.34);
  }
  for (const t of [0.25, 0.50, 0.75]) {
    const y = lerp(CENTRAL_PLAZA_OSM_ROOF_HEIGHT, CENTRAL_PLAZA_PYRAMID_TOP, t);
    for (let i = 0; i + 3 < base.length; i += 2) {
      const a = [base[i] * (1 - t), y, base[i + 1] * (1 - t)], b = [base[i + 2] * (1 - t), y, base[i + 3] * (1 - t)];
      beam(rafters, a, b, 0.13, 0.16);
    }
  }
  meshStore(group, glass, materials.glass, 'CentralPlazaGlazedPyramidalRoofPanels');
  merged(group, rafters, materials.champagne, 'CentralPlazaPyramidRaftersAndTransoms');
  return glass.triangles;
}

function createLightime(group, materials) {
  const cage = [], bandMaterials = [];
  const legs = Array.from({ length: 3 }, (_, i) => {
    const angle = Math.PI * 2 * i / 3 + Math.PI / 2; return [Math.cos(angle) * 3.4, Math.sin(angle) * 3.4];
  });
  for (let i = 0; i < 3; i++) {
    const a = legs[i], b = legs[(i + 1) % 3];
    beam(cage, [a[0], 334, a[1]], [a[0], 356, a[1]], 0.28, 0.28);
    for (const y of CENTRAL_PLAZA_LIGHTIME_BAND_LEVELS) {
      beam(cage, [a[0], y - 2, a[1]], [b[0], y + 2, b[1]], 0.15, 0.15);
      beam(cage, [b[0], y - 2, b[1]], [a[0], y + 2, a[1]], 0.15, 0.15);
    }
  }
  merged(group, cage, materials.metal, 'CentralPlazaThreeLeggedMastSpaceFrame');
  CENTRAL_PLAZA_LIGHTIME_BAND_LEVELS.forEach((y, index) => {
    const clockColor = uniform(new THREE.Color(CENTRAL_PLAZA_LIGHTIME_PALETTE[index].hex)), intensity = uniform(1);
    const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.34, metalness: 0.12, side: THREE.DoubleSide });
    material.colorNode = clockColor.mul(0.32);
    material.emissiveNode = clockColor.mul(intensity).mul(nightAmount().mul(2.2).add(0.10));
    const panels = store();
    for (let i = 0; i < 3; i++) {
      const a = legs[i], b = legs[(i + 1) % 3];
      quad(panels, [a[0], y - 1.55, a[1]], [b[0], y - 1.55, b[1]], [b[0], y + 1.55, b[1]], [a[0], y + 1.55, a[1]], [0.5, 0.5, 0.5]);
    }
    meshStore(group, panels, material, `CentralPlazaLightimeQuarterBand${index + 1}`, false);
    bandMaterials.push({ clockColor, intensity });
  });
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.28, CENTRAL_PLAZA_HEIGHT - 356, 10), materials.champagne);
  needle.position.y = (356 + CENTRAL_PLAZA_HEIGHT) * 0.5; needle.name = 'CentralPlazaUpperNeedleToArchitecturalHeight'; group.add(needle);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 6), materials.beacon);
  beacon.position.y = CENTRAL_PLAZA_HEIGHT; group.add(beacon);
  let lastKey = '';
  return (timestamp = Date.now()) => {
    const state = centralPlazaLightimeState(timestamp);
    const key = `${state.hour}:${state.minute}:${state.blink}`;
    if (key === lastKey) return; lastKey = key;
    bandMaterials.forEach((entry, index) => {
      entry.clockColor.value.setHex(state.bands[index].hex); entry.intensity.value = state.blink ? 0.22 : 1;
    });
  };
}

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.textAlign = 'center'; ctx.fillStyle = '#eee9d8';
  ctx.font = '600 58px sans-serif'; ctx.fillText('CENTRAL PLAZA', 512, 96); ctx.font = '52px sans-serif'; ctx.fillText('中 環 廣 場', 512, 186);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function createPodium(group, materials) {
  const base = store(), upper = store(); loft(base, 0, 4.2, [0.16, 0.23, 0.19]);
  // Cut the OSM 40491215 level-one doorway on edge 7; other edges remain
  // unchanged. Height and doorway width are estimates, not a surveyed plan.
  const ring=CENTRAL_PLAZA_LOCAL_RING, tint=[0.08,0.15,0.17];
  for(let i=0;i+3<ring.length;i+=2){
    const a=[ring[i],ring[i+1]],b=[ring[i+2],ring[i+3]];
    const section=(t0,t1,y0,y1)=>quad(upper,[lerp(a[0],b[0],t0),y0,lerp(a[1],b[1],t0)],[lerp(a[0],b[0],t1),y0,lerp(a[1],b[1],t1)],[lerp(a[0],b[0],t1),y1,lerp(a[1],b[1],t1)],[lerp(a[0],b[0],t0),y1,lerp(a[1],b[1],t0)],tint);
    if(i!==14){section(0,1,4.2,CENTRAL_PLAZA_PODIUM_HEIGHT);continue;}
    section(0,1,4.2,7.5);section(0,1,10.6,CENTRAL_PLAZA_PODIUM_HEIGHT);
    section(0,.17,7.5,10.6);section(.83,1,7.5,10.6);
  }
  meshStore(group, base, materials.granite, 'CentralPlazaVerdeBahiaGranitePodiumBase');
  meshStore(group, upper, materials.podiumGlass, 'CentralPlazaThirtyPointFiveMetreGlazedEntrancePodium');
  const columns = [];
  for (let i = 0; i + 3 < CENTRAL_PLAZA_LOCAL_RING.length; i += 2) {
    const ax = CENTRAL_PLAZA_LOCAL_RING[i], az = CENTRAL_PLAZA_LOCAL_RING[i + 1];
    const bx = CENTRAL_PLAZA_LOCAL_RING[i + 2], bz = CENTRAL_PLAZA_LOCAL_RING[i + 3];
    const length = Math.hypot(bx - ax, bz - az), count = Math.max(1, Math.round(length / CENTRAL_PLAZA_COLUMN_SPACING));
    for (let column = 0; column < count; column++) {
      const t = (column + 0.5) / count, x = lerp(ax, bx, t), z = lerp(az, bz, t);
      const outX = x, outZ = z, outLength = Math.hypot(outX, outZ) || 1;
      const px=x+outX/outLength*.65,pz=z+outZ/outLength*.65;
      if(i===14){ // retain the column above and below the bridge-level portal
        columns.push({x:px,z:pz,y:3.75,sy:7.5/CENTRAL_PLAZA_PODIUM_HEIGHT});
        columns.push({x:px,z:pz,y:(10.6+CENTRAL_PLAZA_PODIUM_HEIGHT)/2,sy:(CENTRAL_PLAZA_PODIUM_HEIGHT-10.6)/CENTRAL_PLAZA_PODIUM_HEIGHT});
      }else columns.push({x:px,y:CENTRAL_PLAZA_PODIUM_HEIGHT*.5,z:pz});
    }
  }
  instances(group, new THREE.CylinderGeometry(1, 1, CENTRAL_PLAZA_PODIUM_HEIGHT, 12), materials.greenGranite,
    columns, 'CentralPlazaTwoMetreGraniteEntranceColumns');

  const vestibuleFloor=new THREE.Mesh(new THREE.BoxGeometry(8,.2,7),new THREE.MeshStandardMaterial({color:0x706e65,roughness:.72,metalness:.12}));
  vestibuleFloor.position.set(-26,7.4,20);vestibuleFloor.name='CentralPlaza bridge entrance vestibule floor';group.add(vestibuleFloor);
  const vestibuleCeiling=new THREE.Mesh(new THREE.BoxGeometry(8,.15,7),new THREE.MeshStandardMaterial({color:0x85867f,roughness:.75}));
  vestibuleCeiling.position.set(-26,10.55,20);vestibuleCeiling.name='CentralPlaza bridge entrance vestibule ceiling';group.add(vestibuleCeiling);
  const lightMat=new THREE.MeshStandardNodeMaterial({color:0xc9c3ad,roughness:.65});lightMat.emissiveNode=color(0xffdcb0).mul(nightAmount()).mul(.8);
  const lamps=[];for(const x of [-28,-25])for(const z of [18,21]){const g=new THREE.BoxGeometry(.9,.025,.3);g.translate(x,10.46,z);lamps.push(g);}
  merged(group,lamps,lightMat,'CentralPlaza bridge vestibule night lights');

  // Main entrance on the long south face (local edge 9), with its own doors, canopy and modest identification sign.
  const i = 18, ax = CENTRAL_PLAZA_LOCAL_RING[i], az = CENTRAL_PLAZA_LOCAL_RING[i + 1];
  const bx = CENTRAL_PLAZA_LOCAL_RING[i + 2], bz = CENTRAL_PLAZA_LOCAL_RING[i + 3];
  const x = (ax + bx) * 0.5, z = (az + bz) * 0.5, normalLength = Math.hypot(x, z) || 1;
  const nx = x / normalLength, nz = z / normalLength, heading = Math.atan2(nx, nz);
  const doors = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), materials.entranceGlass);
  doors.position.set(x + nx * 0.22, 5.2, z + nz * 0.22); doors.rotation.y = heading; doors.name = 'CentralPlazaMainEntranceDoors'; group.add(doors);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(17, 0.28, 4), materials.entranceCanopy);
  canopy.position.set(x + nx * 1.8, 11, z + nz * 1.8); canopy.rotation.y = heading; canopy.name = 'CentralPlazaEntranceCanopy'; group.add(canopy);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: signTexture(), transparent: true, side: THREE.DoubleSide, toneMapped: false }));
  sign.position.set(x + nx * 0.25, 16, z + nz * 0.25); sign.rotation.y = heading; sign.name = 'CentralPlazaEntranceIdentification'; group.add(sign);
  return { canopy: { x: x + nx * 1.8, z: z + nz * 1.8 } };
}

function planBounds(y) {
  const plan = centralPlazaPlanAt(y); let hx = 0, hz = 0;
  for (let i = 0; i < plan.length; i += 2) { hx = Math.max(hx, Math.abs(plan[i])); hz = Math.max(hz, Math.abs(plan[i + 1])); }
  return { hx, hz };
}

export function buildCentralPlaza(root, { groundOffset = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'CentralPlazaAuthoredLandmark'; group.userData.internalId = 'HK-B0006';
  group.position.set(CENTRAL_PLAZA_SITE.x, groundOffset, CENTRAL_PLAZA_SITE.z); group.rotation.y = CENTRAL_PLAZA_SITE.ry; root.add(group);
  const materials = {
    glass: glassMaterial(), podiumGlass: glassMaterial(), vertexDark: vertexMaterial({ metalness: 0.28, roughness: 0.44 }),
    granite: vertexMaterial({ roughness: 0.84 }),
    metal: new THREE.MeshStandardNodeMaterial({ color: 0x9da9a8, metalness: 0.72, roughness: 0.32 }),
    champagne: new THREE.MeshStandardNodeMaterial({ color: 0xb9a878, metalness: 0.72, roughness: 0.30 }),
    goldNeon: new THREE.MeshStandardNodeMaterial({ color: 0x9b752e, metalness: 0.30, roughness: 0.34 }),
    greenGranite: new THREE.MeshStandardNodeMaterial({ color: 0x334a3e, roughness: 0.80 }),
    entranceGlass: new THREE.MeshStandardNodeMaterial({ color: 0x193334, metalness: 0.26, roughness: 0.30, side: THREE.DoubleSide }),
    entranceCanopy: new THREE.MeshStandardNodeMaterial({ color: 0x9a8657, metalness: 0.38, roughness: 0.40 }),
    beacon: new THREE.MeshStandardNodeMaterial({ color: 0x8d1914, roughness: 0.32 })
  };
  materials.goldNeon.emissiveNode = color(0xffbd55).mul(nightAmount().mul(1.25).add(0.04));
  materials.champagne.emissiveNode = color(0xffd482).mul(nightAmount()).mul(0.12);
  materials.beacon.emissiveNode = color(0xff3525).mul(nightAmount().mul(2).add(0.3));
  materials.podiumGlass.emissiveNode = color(0xffd0a0).mul(nightAmount()).mul(0.14);
  materials.entranceGlass.emissiveNode = color(0xffd7a6).mul(nightAmount()).mul(0.20);
  materials.entranceCanopy.emissiveNode = color(0xffd69a).mul(nightAmount().mul(0.9).add(0.03));

  const podium = createPodium(group, materials);
  const curtain = createBodyCurtainWall();
  meshStore(group, curtain.facade, materials.glass, 'CentralPlazaThreeColourChamferedTriangleCurtainWall');
  meshStore(group, curtain.frames, materials.metal, 'CentralPlazaFineMullionsAndFourPointSixMetreStructure');
  merged(group, curtain.goldNeon, materials.goldNeon, 'CentralPlazaVerticalGoldFacadeNeonStrips');
  createCrown(group, materials);
  const pyramidPanels = createPyramid(group, materials);
  const updateLightime = createLightime(group, materials); updateLightime();

  const body = planBounds(CENTRAL_PLAZA_PODIUM_HEIGHT), crown = planBounds(CENTRAL_PLAZA_OSM_ROOF_HEIGHT);
  const colliders = [
    // Preserve the previous full collision below and above the bridge. At 1/F,
    // four rectangles leave a small entrance pocket rather than a solid OBB.
    centralPlazaLocalCollider({ w: body.hx * 2 + 1.4, d: body.hz * 2 + 1.4, minY: 0, maxY: 7.5 }),
    centralPlazaLocalCollider({ w: body.hx * 2 + 1.4, d: body.hz * 2 + 1.4, minY: 10.6, maxY: CENTRAL_PLAZA_PODIUM_HEIGHT }),
    centralPlazaLocalCollider({x:(-22+body.hx+.7)/2,z:0,w:body.hx+.7+22,d:body.hz*2+1.4,minY:7.5,maxY:10.6}),
    centralPlazaLocalCollider({x:(-body.hx-.7-22)/2,z:(-body.hz-.7+15)/2,w:body.hx+.7-22,d:body.hz+.7+15,minY:7.5,maxY:10.6}),
    centralPlazaLocalCollider({x:(-body.hx-.7-22)/2,z:(25.5+body.hz+.7)/2,w:body.hx+.7-22,d:body.hz+.7-25.5,minY:7.5,maxY:10.6}),
    centralPlazaLocalCollider({ w: body.hx * 2, d: body.hz * 2, minY: CENTRAL_PLAZA_PODIUM_HEIGHT, maxY: CENTRAL_PLAZA_BODY_TOP }),
    centralPlazaLocalCollider({ w: crown.hx * 2, d: crown.hz * 2, minY: CENTRAL_PLAZA_BODY_TOP, maxY: CENTRAL_PLAZA_OSM_ROOF_HEIGHT }),
    centralPlazaLocalCollider({ w: crown.hx * 2, d: crown.hz * 2, minY: CENTRAL_PLAZA_OSM_ROOF_HEIGHT, maxY: CENTRAL_PLAZA_PYRAMID_TOP }),
    centralPlazaLocalCollider({ w: 7.4, d: 7.4, minY: 334, maxY: 356 }),
    centralPlazaLocalCollider({ w: 0.8, d: 0.8, minY: 356, maxY: CENTRAL_PLAZA_HEIGHT }),
    centralPlazaLocalCollider({ x: podium.canopy.x, z: podium.canopy.z, w: 17, d: 4, minY: 10.8, maxY: 11.2 })
  ];
  for (const collider of colliders) { collider.minY += groundOffset; collider.maxY += groundOffset; }
  const landmark = {
    name: CENTRAL_PLAZA_SITE.name, englishName: CENTRAL_PLAZA_SITE.englishName,
    x: CENTRAL_PLAZA_SITE.x, z: CENTRAL_PLAZA_SITE.z, w: CENTRAL_PLAZA_SITE.w, d: CENTRAL_PLAZA_SITE.d,
    h: CENTRAL_PLAZA_HEIGHT, ry: CENTRAL_PLAZA_SITE.ry, bounds: { ...CENTRAL_PLAZA_SITE.bounds },
    ring: CENTRAL_PLAZA_SITE.ring, osmId: CENTRAL_PLAZA_SITE.osmId
  };
  const stats = {
    centralPlazaGroundOffset: groundOffset, centralPlazaLandmarks: 1,
    centralPlazaHeight: CENTRAL_PLAZA_HEIGHT, centralPlazaOfficialRoundedHeight: CENTRAL_PLAZA_OFFICIAL_ROUNDED_HEIGHT,
    centralPlazaOsmRoofHeight: CENTRAL_PLAZA_OSM_ROOF_HEIGHT, centralPlazaOsmLevels: CENTRAL_PLAZA_OSM_LEVELS,
    centralPlazaOfficialOfficeLevels: CENTRAL_PLAZA_OFFICIAL_OFFICE_LEVELS, centralPlazaMastHeight: CENTRAL_PLAZA_MAST_HEIGHT,
    centralPlazaVisionPanels: curtain.visionPanels, centralPlazaFacadeQuads: curtain.facade.quads,
    centralPlazaFrameQuads: curtain.frames.quads, centralPlazaGoldNeonStrips: curtain.goldNeon.length,
    centralPlazaCrownPlantFloors: CENTRAL_PLAZA_CROWN_PLANT_FLOORS, centralPlazaPyramidPanels: pyramidPanels,
    centralPlazaLightimeBands: CENTRAL_PLAZA_LIGHTIME_BAND_LEVELS.length, centralPlazaColliders: colliders.length
  };
  group.userData.stats = stats;
  return {
    group, colliders, landmarks: [landmark], stats, groundOffset, plazaTop: CENTRAL_PLAZA_PLAZA_TOP + groundOffset,
    update() { updateLightime(); }
  };
}
