import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  CHAMPION_TOWER_SITE, CHAMPION_TOWER_OSM_SOURCE, CHAMPION_TOWER_LOCAL_RING, CHAMPION_TOWER_RING_AREA,
  CHAMPION_TOWER_OSM_HEIGHT, CHAMPION_TOWER_HEIGHT, CHAMPION_TOWER_OSM_LEVELS,
  CHAMPION_TOWER_OFFICIAL_LEVELS, CHAMPION_TOWER_CENTADATA_LEVELS, CHAMPION_TOWER_ICBC_LEVELS,
  CHAMPION_TOWER_COMPLETION_YEAR, CHAMPION_TOWER_ARCHITECT, CHAMPION_TOWER_GFA_SQFT,
  CHAMPION_TOWER_TYPICAL_LETTABLE_SQFT, CHAMPION_TOWER_COMPLEX_GFA_SQFT, CHAMPION_TOWER_COMPLEX_GFA_M2,
  CHAMPION_TOWER_COMBINED_LETTABLE_SQFT, CHAMPION_TOWER_CONNECTABLE_FLOORS,
  CHAMPION_TOWER_COMPLEX_LIFT_ZONES, CHAMPION_TOWER_HIGH_SPEED_LIFTS_PER_ZONE,
  CHAMPION_TOWER_COMPLEX_SERVICE_LIFTS, CHAMPION_TOWER_PARKING_SPACES,
  CHAMPION_TOWER_PLAZA_TOP, CHAMPION_TOWER_LOBBY_TOP, CHAMPION_TOWER_OFFICE_TOP,
  CHAMPION_TOWER_OFFICE_COURSES, CHAMPION_TOWER_PANEL_WIDTH, CHAMPION_TOWER_LOBBY_PANEL_WIDTH,
  CHAMPION_TOWER_BELT_LEVELS, CHAMPION_TOWER_BELT_HEIGHT, CHAMPION_TOWER_ENTRANCE_EDGE,
  CHAMPION_TOWER_CURVED_LOBBY_EDGES, CHAMPION_TOWER_ENTRANCE,
  CHAMPION_TOWER_ENTRANCE_FORECOURT_WIDTH, CHAMPION_TOWER_ENTRANCE_FORECOURT_DEPTH,
  championTowerEdgeOutward, championTowerRingColliders, championTowerLocalCollider,
  championTowerFrameCollider, championTowerGroundHeightAt
} from './champion-tower-architecture.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(0.55, 1.4, cityUniforms.uInteriorGlow);
function store() { return { positions: [], colors: [], lit: [] }; }
function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function hash(a, b, c, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
function vertex(target, p, tint, lit = 0) { target.positions.push(...p); target.colors.push(...tint); target.lit.push(lit); }
function quad(target, a, b, c, d, tint, lit = 0) { for (const p of [a, b, c, a, c, d]) vertex(target, p, tint, lit); }
function geometryFromStore(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(data.lit, 1));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}
function meshStore(group, data, material, name, shadows = true) {
  if (!data.positions.length) return null;
  const mesh = new THREE.Mesh(geometryFromStore(data), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null;
  const geometry = mergeGeometries(parts, false); for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true;
  group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) {
  const geometry = new THREE.BoxGeometry(...size); if (ry) geometry.rotateY(ry); geometry.translate(...center); parts.push(geometry); return geometry;
}
function cylinder(parts, center, radius, height, segments = 20) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, segments); geometry.translate(...center); parts.push(geometry); return geometry;
}
function beam(parts, a, b, width = 0.12, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length();
  if (length < 0.001) return null;
  const geometry = new THREE.BoxGeometry(width, length, depth);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate(...start.add(end).multiplyScalar(0.5).toArray()); parts.push(geometry); return geometry;
}
function edgePoint(ring, edge, t, y, offset = 0) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { nx, nz } = championTowerEdgeOutward(ring, edge);
  return [lerp(ax, bx, t) + nx * offset, y, lerp(az, bz, t) + nz * offset];
}
function edgeBox(parts, ring, edge, t, y, offset, width, height, depth) {
  const p = edgePoint(ring, edge, t, y, offset), { ry } = championTowerEdgeOutward(ring, edge);
  return box(parts, p, [width, height, depth], ry);
}
function segmentCollider(ring, edge, t0, t1, minY, maxY, depth = 0.42) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
  const { ry, length } = championTowerEdgeOutward(ring, edge), tm = (t0 + t1) * 0.5;
  return championTowerLocalCollider(lerp(ax, bx, tm), lerp(az, bz, tm), length * (t1 - t0), depth, minY, maxY, CHAMPION_TOWER_SITE.ry + ry);
}
function roofGeometry(ring, y) {
  const shape = new THREE.Shape();
  for (let i = 0; i < ring.length - 2; i += 2) { const x = ring[i], z = -ring[i + 1]; if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z); }
  shape.closePath(); const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2); geometry.translate(0, y, 0); return geometry;
}

// Rocco Yim's reflective curved tower: dense silver floor lines, blue-green glass and a darker service spine.
function createOfficeCurtainWall() {
  const vision = store(), spandrel = store(), backing = store(), belts = store();
  const mullions = [], transoms = [], colliders = championTowerRingColliders(CHAMPION_TOWER_LOCAL_RING, CHAMPION_TOWER_LOBBY_TOP, CHAMPION_TOWER_OFFICE_TOP);
  let glassPanels = 0, spandrelPanels = 0, verticalMullions = 0, horizontalTransoms = 0;
  for (let edge = 0; edge < CHAMPION_TOWER_LOCAL_RING.length / 2 - 1; edge++) {
    const i = edge * 2, length = championTowerEdgeOutward(CHAMPION_TOWER_LOCAL_RING, edge).length;
    const bays = Math.max(1, Math.round(length / CHAMPION_TOWER_PANEL_WIDTH)), service = edge >= 7 && edge <= 9;
    const point = (t, y, offset = 0.035) => edgePoint(CHAMPION_TOWER_LOCAL_RING, edge, t, y, offset);
    quad(backing, point(0, CHAMPION_TOWER_LOBBY_TOP, -0.16), point(1, CHAMPION_TOWER_LOBBY_TOP, -0.16),
      point(1, CHAMPION_TOWER_OFFICE_TOP, -0.16), point(0, CHAMPION_TOWER_OFFICE_TOP, -0.16), service ? [0.025, 0.035, 0.042] : [0.055, 0.085, 0.10]);
    for (let course = 0; course < CHAMPION_TOWER_OFFICE_COURSES; course++) {
      const y0 = lerp(CHAMPION_TOWER_LOBBY_TOP, CHAMPION_TOWER_OFFICE_TOP, course / CHAMPION_TOWER_OFFICE_COURSES);
      const y1 = lerp(CHAMPION_TOWER_LOBBY_TOP, CHAMPION_TOWER_OFFICE_TOP, (course + 1) / CHAMPION_TOWER_OFFICE_COURSES);
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays + 0.0008, t1 = (bay + 1) / bays - 0.0008, variation = hash(edge, bay, course, 22);
        const lit = hash(edge, bay, course, 83) > 0.87 ? 0.12 + variation * 0.68 : 0;
        const dark = service ? [0.035, 0.065, 0.078] : [0.11, 0.22, 0.27], light = service ? [0.12, 0.17, 0.19] : [0.40, 0.53, 0.56];
        quad(vision, point(t0, y0 + 0.82), point(t1, y0 + 0.82), point(t1, y1 - 0.13), point(t0, y1 - 0.13),
          mix(dark, light, 0.18 + variation * 0.62), lit); glassPanels++;
        quad(spandrel, point(t0, y0 + 0.12, 0.045), point(t1, y0 + 0.12, 0.045), point(t1, y0 + 0.70, 0.045), point(t0, y0 + 0.70, 0.045),
          mix(service ? [0.11, 0.14, 0.15] : [0.28, 0.37, 0.40], service ? [0.23, 0.27, 0.28] : [0.55, 0.62, 0.62], variation * 0.55)); spandrelPanels++;
      }
      for (const [dy, width, depth] of [[0.08,0.11,0.23],[0.76,0.075,0.17]]) {
        beam(transoms, point(0, y0 + dy, 0.13), point(1, y0 + dy, 0.13), width, depth); horizontalTransoms++;
      }
    }
    beam(transoms, point(0, CHAMPION_TOWER_OFFICE_TOP - 0.06, 0.13), point(1, CHAMPION_TOWER_OFFICE_TOP - 0.06, 0.13), 0.12, 0.24); horizontalTransoms++;
    for (let bay = 0; bay <= bays; bay++) {
      const t = bay / bays, major = bay % 4 === 0 || service;
      beam(mullions, point(t, CHAMPION_TOWER_LOBBY_TOP, 0.15), point(t, CHAMPION_TOWER_OFFICE_TOP, 0.15),
        major ? 0.10 : 0.045, major ? 0.30 : 0.17); verticalMullions++;
    }
  }
  // Two dark, finely louvred visual bands seen in the photographs; these are not claimed as measured refuge floors.
  for (const level of CHAMPION_TOWER_BELT_LEVELS) {
    const y0 = level - CHAMPION_TOWER_BELT_HEIGHT * 0.5, y1 = level + CHAMPION_TOWER_BELT_HEIGHT * 0.5;
    for (let edge = 0; edge < CHAMPION_TOWER_LOCAL_RING.length / 2 - 1; edge++) {
      const point = (t, y, offset = 0.11) => edgePoint(CHAMPION_TOWER_LOCAL_RING, edge, t, y, offset);
      quad(belts, point(0, y0), point(1, y0), point(1, y1), point(0, y1), [0.025, 0.040, 0.047]);
      for (let y = y0 + 0.18; y < y1 - 0.08; y += 0.38) quad(belts, point(0, y, 0.14), point(1, y, 0.14), point(1, y + 0.065, 0.14), point(0, y + 0.065, 0.14), [0.20, 0.25, 0.26]);
      edgeBox(transoms, CHAMPION_TOWER_LOCAL_RING, edge, 0.5, y0, 0.16, championTowerEdgeOutward(CHAMPION_TOWER_LOCAL_RING, edge).length, 0.16, 0.26);
      edgeBox(transoms, CHAMPION_TOWER_LOCAL_RING, edge, 0.5, y1, 0.16, championTowerEdgeOutward(CHAMPION_TOWER_LOCAL_RING, edge).length, 0.16, 0.26);
    }
  }
  return { vision, spandrel, backing, belts, mullions, transoms, colliders, glassPanels, spandrelPanels, verticalMullions, horizontalTransoms };
}

function createLobby() {
  const glass = store(), stone = store(), joints = store();
  const tension = [], fittings = [], columns = [], colliders = [];
  let glassPanels = 0, spiderFittings = 0, columnCount = 0;
  for (let edge = 0; edge < CHAMPION_TOWER_LOCAL_RING.length / 2 - 1; edge++) {
    const i = edge * 2, ax = CHAMPION_TOWER_LOCAL_RING[i], az = CHAMPION_TOWER_LOCAL_RING[i + 1];
    const bx = CHAMPION_TOWER_LOCAL_RING[i + 2], bz = CHAMPION_TOWER_LOCAL_RING[i + 3];
    const length = championTowerEdgeOutward(CHAMPION_TOWER_LOCAL_RING, edge).length;
    const bays = Math.max(1, Math.ceil(length / CHAMPION_TOWER_LOBBY_PANEL_WIDTH)), service = edge >= 7 && edge <= 9;
    const point = (t, y, offset = 0.035) => edgePoint(CHAMPION_TOWER_LOCAL_RING, edge, t, y, offset);
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays, t1 = (bay + 1) / bays, tm = (t0 + t1) * 0.5;
      const lx = lerp(ax, bx, tm), lz = lerp(az, bz, tm);
      const entranceGap = edge === CHAMPION_TOWER_ENTRANCE_EDGE && Math.hypot(lx - CHAMPION_TOWER_ENTRANCE.localX, lz - CHAMPION_TOWER_ENTRANCE.localZ) < CHAMPION_TOWER_ENTRANCE_FORECOURT_WIDTH * 0.5;
      if (entranceGap) continue;
      if (service) {
        quad(stone, point(t0, CHAMPION_TOWER_PLAZA_TOP), point(t1, CHAMPION_TOWER_PLAZA_TOP), point(t1, CHAMPION_TOWER_LOBBY_TOP), point(t0, CHAMPION_TOWER_LOBBY_TOP),
          mix([0.31,0.34,0.34],[0.50,0.52,0.50],hash(edge,bay,4)*0.55));
        for (let y = 3.5; y < CHAMPION_TOWER_LOBBY_TOP; y += 3.5) quad(joints, point(t0,y,0.045),point(t1,y,0.045),point(t1,y+0.035,0.045),point(t0,y+0.035,0.045),[0.12,0.14,0.14]);
      } else {
        const variation = hash(edge, bay, 17);
        quad(glass, point(t0 + 0.0008, CHAMPION_TOWER_PLAZA_TOP), point(t1 - 0.0008, CHAMPION_TOWER_PLAZA_TOP),
          point(t1 - 0.0008, CHAMPION_TOWER_LOBBY_TOP - 0.12), point(t0 + 0.0008, CHAMPION_TOWER_LOBBY_TOP - 0.12),
          mix([0.20,0.35,0.39],[0.48,0.61,0.61],variation*0.55),0.06+variation*0.13); glassPanels++;
        if (CHAMPION_TOWER_CURVED_LOBBY_EDGES.includes(edge)) {
          for (let row = 0; row <= 6; row++) {
            const p = point(t0, lerp(CHAMPION_TOWER_PLAZA_TOP, CHAMPION_TOWER_LOBBY_TOP, row / 6), 0.11);
            box(fittings, p, [0.16,0.16,0.10]); spiderFittings++;
          }
        }
      }
      colliders.push(segmentCollider(CHAMPION_TOWER_LOCAL_RING, edge, t0, t1, 0, CHAMPION_TOWER_LOBBY_TOP));
      beam(tension, point(t0, CHAMPION_TOWER_PLAZA_TOP, 0.10), point(t0, CHAMPION_TOWER_LOBBY_TOP, 0.10), service ? 0.08 : 0.045, service ? 0.16 : 0.065);
    }
    if (!service) for (let row = 0; row <= 6; row++) {
      const y = lerp(CHAMPION_TOWER_PLAZA_TOP, CHAMPION_TOWER_LOBBY_TOP, row / 6);
      beam(tension, point(0,y,0.09),point(1,y,0.09),0.035,0.055);
    }
    edgeBox(tension, CHAMPION_TOWER_LOCAL_RING, edge, 0.5, CHAMPION_TOWER_LOBBY_TOP - 0.10, 0.13, length, 0.20, 0.28);
  }
  for (const [edge,t] of [[0,0.5],[2,0.5],[4,0.5],[6,0.5],[10,0.5],[12,0.18],[12,0.82],[14,0.5]]) {
    const p = edgePoint(CHAMPION_TOWER_LOCAL_RING, edge, t, CHAMPION_TOWER_LOBBY_TOP * 0.5, -0.82);
    cylinder(columns,p,0.62,CHAMPION_TOWER_LOBBY_TOP,24); columnCount++;
    colliders.push(championTowerLocalCollider(p[0],p[2],1.38,1.38,0,CHAMPION_TOWER_LOBBY_TOP));
  }
  return { glass, stone, joints, tension, fittings, columns, colliders, glassPanels, spiderFittings, columnCount };
}

function createCrown() {
  const cladding = store(), louvres = store(), rails = [], plant = [];
  const colliders = championTowerRingColliders(CHAMPION_TOWER_LOCAL_RING, CHAMPION_TOWER_OFFICE_TOP, CHAMPION_TOWER_HEIGHT);
  let crownFins = 0;
  for (let edge = 0; edge < CHAMPION_TOWER_LOCAL_RING.length / 2 - 1; edge++) {
    const length = championTowerEdgeOutward(CHAMPION_TOWER_LOCAL_RING, edge).length, bays = Math.max(1, Math.round(length / 3.1));
    const point = (t,y,offset=0.05) => edgePoint(CHAMPION_TOWER_LOCAL_RING,edge,t,y,offset);
    const metal = CHAMPION_TOWER_CURVED_LOBBY_EDGES.includes(edge);
    quad(metal ? cladding : louvres,point(0,198.2),point(1,198.2),point(1,204.78),point(0,204.78),metal?[0.48,0.55,0.56]:[0.035,0.055,0.063]);
    for (let bay=0;bay<=bays;bay++) { const t=bay/bays; beam(rails,point(t,192,0.13),point(t,204.72,0.13),0.12,0.28); crownFins++; }
    if (!metal) for(let y=192.3;y<198;y+=0.42) quad(louvres,point(0,y,0.11),point(1,y,0.11),point(1,y+0.07,0.11),point(0,y+0.07,0.11),[0.20,0.25,0.26]);
    edgeBox(rails,CHAMPION_TOWER_LOCAL_RING,edge,0.5,192.1,0.13,length,0.20,0.30);
    edgeBox(rails,CHAMPION_TOWER_LOCAL_RING,edge,0.5,198.15,0.13,length,0.18,0.30);
    // Vertical size is exactly 0.20 m, so the crown terminates at 205.00 m rather than overshooting the source height.
    edgeBox(rails,CHAMPION_TOWER_LOCAL_RING,edge,0.5,204.90,0.13,length,0.20,0.32);
  }
  box(plant,[0,196.1,0],[22,7.8,17]);
  box(plant,[0,200.10,0],[22.4,0.20,17.4]);
  return { cladding,louvres,rails,plant,colliders,crownFins };
}

function textPlane(text,width,height,fontSize=54) {
  const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=180;
  const context=canvas.getContext('2d'); context.clearRect(0,0,canvas.width,canvas.height);
  context.fillStyle='#e9efec'; context.textAlign='center'; context.textBaseline='middle';
  context.font=`600 ${fontSize}px Arial, sans-serif`; context.fillText(text,canvas.width/2,canvas.height/2);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,toneMapped:false}));
  mesh.renderOrder=20; return mesh;
}
function createEntrance(materials) {
  const group=new THREE.Group(); group.name='ChampionTowerGardenRoadLobbyEntrance';
  group.position.set(CHAMPION_TOWER_ENTRANCE.localX,CHAMPION_TOWER_PLAZA_TOP,CHAMPION_TOWER_ENTRANCE.localZ);
  group.rotation.y=CHAMPION_TOWER_ENTRANCE.ry-CHAMPION_TOWER_SITE.ry;
  const stone=[],frames=[],glass=[],interior=[],lights=[],forecourt=[],colliders=[];
  box(forecourt,[0,-0.06,CHAMPION_TOWER_ENTRANCE_FORECOURT_DEPTH*0.5],[CHAMPION_TOWER_ENTRANCE_FORECOURT_WIDTH,0.12,CHAMPION_TOWER_ENTRANCE_FORECOURT_DEPTH]);
  box(interior,[0,4.2,-2.5],[10.2,8.4,0.30]);
  box(glass,[0,4.1,-0.10],[9.2,8.2,0.08]);
  for(const x of [-4.85,4.85]) { box(stone,[x,4.5,0],[0.50,9,0.70]); colliders.push(championTowerFrameCollider(CHAMPION_TOWER_ENTRANCE,x,0,0.62,0.82,0,9)); }
  box(stone,[0,8.7,0],[10.2,0.60,0.70]);
  box(stone,[0,6.90,0.28],[9.4,2.20,0.18]);
  for(const x of [-3.45,-1.15,1.15,3.45]) {
    box(frames,[x,2.15,0.04],[0.085,4.3,0.14]);
    for(const dx of [-0.17,0.17]) box(frames,[x+dx,1.25,0.16],[0.04,0.68,0.08]);
  }
  box(glass,[0,5.25,1.55],[10.8,0.15,3.4]);
  box(frames,[0,5.18,3.20],[11,0.20,0.16]);
  for(const x of [-4.2,4.2]) beam(frames,[x,5.35,2.9],[x,8.3,0.1],0.055);
  for(const x of [-3.4,0,3.4]) box(lights,[x,5.13,1.5],[1.1,0.045,0.15]);
  // Visible lobby details follow the current reception photograph: granite, brushed steel gates and a warm lift hall.
  box(interior,[-2.7,0.65,-1.25],[3.2,1.3,0.75]);
  for(const x of [0.1,1.25,2.4]) { box(frames,[x,0.55,-1.25],[0.18,1.1,1.25]); box(glass,[x+0.46,0.72,-1.25],[0.75,0.48,0.055]); }
  for(const x of [-2.7,-0.9,0.9,2.7]) box(interior,[x,2.4,-2.28],[1.35,4.2,0.10]);
  colliders.push(championTowerFrameCollider(CHAMPION_TOWER_ENTRANCE,0,-0.10,9.4,0.40,0,8.4));
  merged(group,forecourt,materials.plaza,'ChampionTowerLevelArrivalForecourt');
  merged(group,frames,materials.silver,'ChampionTowerEntranceSteelAndTurnstiles');
  merged(group,stone,materials.stone,'ChampionTowerEntranceGranite');
  merged(group,glass,materials.entranceGlass,'ChampionTowerEntranceGlassAndCanopy');
  merged(group,interior,materials.interior,'ChampionTowerReceptionAndLiftLobby',false);
  merged(group,lights,materials.light,'ChampionTowerCanopyLights',false);
  const sign=textPlane('CHAMPION TOWER',7.8,1.05,57); sign.position.set(0,7.35,0.38); group.add(sign);
  const address=textPlane('冠君大廈  ·  3 GARDEN ROAD',7.8,0.72,40); address.position.set(0,6.48,0.38); group.add(address);
  return {group,colliders};
}

export function buildChampionTower(root,{groundOffset=0}={}) {
  const group=new THREE.Group(); group.name='ChampionTower';
  group.userData.landmark='champion-tower'; group.userData.osm={type:'way',id:CHAMPION_TOWER_OSM_SOURCE.id};
  group.position.set(CHAMPION_TOWER_SITE.x,groundOffset,CHAMPION_TOWER_SITE.z); group.rotation.y=CHAMPION_TOWER_SITE.ry; root.add(group);
  const facade=new THREE.MeshStandardNodeMaterial({vertexColors:true,metalness:0.52,roughness:0.24,side:THREE.DoubleSide});
  facade.colorNode=attribute('color'); facade.emissiveNode=color(0xffd39a).mul(attribute('aLit')).mul(nightAmount());
  const backing=new THREE.MeshStandardNodeMaterial({vertexColors:true,metalness:0.35,roughness:0.43,side:THREE.DoubleSide}); backing.colorNode=attribute('color');
  const silver=new THREE.MeshStandardNodeMaterial({color:0xbfc9c9,metalness:0.76,roughness:0.29}); silver.emissiveNode=color(0xd6e1df).mul(nightAmount()).mul(0.09);
  const crown=new THREE.MeshStandardNodeMaterial({vertexColors:true,metalness:0.72,roughness:0.30,side:THREE.DoubleSide});
  crown.colorNode=attribute('color'); crown.emissiveNode=color(0xdce9e7).mul(nightAmount()).mul(0.38);
  const stone=new THREE.MeshStandardNodeMaterial({vertexColors:true,metalness:0.12,roughness:0.64,side:THREE.DoubleSide}); stone.colorNode=attribute('color');
  const entranceStone=new THREE.MeshStandardMaterial({color:0x777f7d,roughness:0.58,metalness:0.18});
  const plazaMaterial=new THREE.MeshStandardMaterial({color:0x8d9592,roughness:0.90,metalness:0.03});
  const lobbyGlass=new THREE.MeshStandardNodeMaterial({vertexColors:true,metalness:0.24,roughness:0.18,side:THREE.DoubleSide,transparent:true,opacity:0.70,depthWrite:false});
  lobbyGlass.colorNode=attribute('color'); lobbyGlass.emissiveNode=color(0xffd6a0).mul(attribute('aLit')).mul(nightAmount());
  const entranceGlass=new THREE.MeshStandardNodeMaterial({color:0x3b5d63,roughness:0.19,metalness:0.30,side:THREE.DoubleSide,transparent:true,opacity:0.78});
  entranceGlass.emissiveNode=color(0xffd49b).mul(nightAmount()).mul(0.15);
  const interior=new THREE.MeshStandardNodeMaterial({color:0x635444,roughness:0.73}); interior.emissiveNode=color(0xffc47e).mul(nightAmount()).mul(0.48);
  const light=new THREE.MeshStandardNodeMaterial({color:0xffe2ad}); light.emissiveNode=color(0xffd18a).mul(nightAmount()).mul(2.1);
  const materials={silver,stone:entranceStone,plaza:plazaMaterial,entranceGlass,interior,light};
  const plaza=new THREE.Mesh(roofGeometry(CHAMPION_TOWER_LOCAL_RING,CHAMPION_TOWER_PLAZA_TOP),plazaMaterial); plaza.name='ChampionTowerExactFootprintStonePlaza'; plaza.receiveShadow=true; group.add(plaza);
  const lobby=createLobby();
  meshStore(group,lobby.stone,stone,'ChampionTowerTenStoreyStoneServiceCore');
  meshStore(group,lobby.joints,backing,'ChampionTowerLobbyStonePanelJoints');
  meshStore(group,lobby.glass,lobbyGlass,'ChampionTowerTwoFramelessCurvedLobbyWalls',false);
  merged(group,lobby.tension,silver,'ChampionTowerLobbyTensionRods');
  merged(group,lobby.fittings,silver,'ChampionTowerLobbySpiderFittings');
  merged(group,lobby.columns,silver,'ChampionTowerFullHeightLobbyColumns');
  const curtain=createOfficeCurtainWall();
  meshStore(group,curtain.backing,backing,'ChampionTowerCurtainWallBacking');
  meshStore(group,curtain.vision,facade,'ChampionTowerReflectiveVisionGlass');
  meshStore(group,curtain.spandrel,facade,'ChampionTowerSilverSpandrelPanels');
  meshStore(group,curtain.belts,backing,'ChampionTowerLouvredVisualBelts');
  merged(group,curtain.mullions,silver,'ChampionTowerCurvedFacadeMullions');
  merged(group,curtain.transoms,silver,'ChampionTowerDenseHorizontalFloorLines');
  const crownModel=createCrown();
  meshStore(group,crownModel.cladding,crown,'ChampionTowerCurvedMetalCrownCladding');
  meshStore(group,crownModel.louvres,backing,'ChampionTowerCrownLouvres');
  merged(group,crownModel.rails,silver,'ChampionTowerCrownRibsAnd205mRim');
  merged(group,crownModel.plant,entranceStone,'ChampionTowerRoofPlant');
  const entrance=createEntrance(materials); group.add(entrance.group);
  const colliders=[...lobby.colliders,...curtain.colliders,...crownModel.colliders,...entrance.colliders];
  for(const collider of colliders){collider.minY+=groundOffset;collider.maxY+=groundOffset;}
  const grounds={plaza:groundOffset+CHAMPION_TOWER_PLAZA_TOP};
  const landmark={id:'champion-tower',name:CHAMPION_TOWER_SITE.name,position:{x:CHAMPION_TOWER_SITE.x,y:groundOffset,z:CHAMPION_TOWER_SITE.z},radius:65,height:CHAMPION_TOWER_HEIGHT};
  const stats={
    championTowerGroundOffset:groundOffset,championTowerLandmarks:1,championTowerOsmHeight:CHAMPION_TOWER_OSM_HEIGHT,
    championTowerHeight:CHAMPION_TOWER_HEIGHT,championTowerOsmLevels:CHAMPION_TOWER_OSM_LEVELS,
    championTowerOfficialLevels:CHAMPION_TOWER_OFFICIAL_LEVELS,championTowerCentadataLevels:CHAMPION_TOWER_CENTADATA_LEVELS,
    championTowerIcbcLevels:CHAMPION_TOWER_ICBC_LEVELS,championTowerCompletionYear:CHAMPION_TOWER_COMPLETION_YEAR,
    championTowerArchitect:CHAMPION_TOWER_ARCHITECT,championTowerGfaSqft:CHAMPION_TOWER_GFA_SQFT,
    championTowerTypicalLettableSqft:CHAMPION_TOWER_TYPICAL_LETTABLE_SQFT,championTowerComplexGfaSqft:CHAMPION_TOWER_COMPLEX_GFA_SQFT,
    championTowerComplexGfaM2:CHAMPION_TOWER_COMPLEX_GFA_M2,championTowerCombinedLettableSqft:CHAMPION_TOWER_COMBINED_LETTABLE_SQFT,
    championTowerConnectableFloors:CHAMPION_TOWER_CONNECTABLE_FLOORS,championTowerComplexLiftZones:CHAMPION_TOWER_COMPLEX_LIFT_ZONES,
    championTowerHighSpeedLiftsPerZone:CHAMPION_TOWER_HIGH_SPEED_LIFTS_PER_ZONE,championTowerComplexServiceLifts:CHAMPION_TOWER_COMPLEX_SERVICE_LIFTS,
    championTowerParkingSpaces:CHAMPION_TOWER_PARKING_SPACES,championTowerSourceVertices:15,
    championTowerOsmWayVersion:CHAMPION_TOWER_OSM_SOURCE.version,championTowerRingArea:CHAMPION_TOWER_RING_AREA,
    championTowerOfficeCourses:CHAMPION_TOWER_OFFICE_COURSES,championTowerGlassPanels:curtain.glassPanels,
    championTowerSpandrelPanels:curtain.spandrelPanels,championTowerVerticalMullions:curtain.verticalMullions,
    championTowerHorizontalTransoms:curtain.horizontalTransoms,championTowerLobbyGlassPanels:lobby.glassPanels,
    championTowerSpiderFittings:lobby.spiderFittings,championTowerLobbyColumns:lobby.columnCount,
    championTowerCrownFins:crownModel.crownFins,championTowerVisualBelts:CHAMPION_TOWER_BELT_LEVELS.length,
    championTowerEntranceEdge:CHAMPION_TOWER_ENTRANCE_EDGE,championTowerEntranceForecourtDepth:CHAMPION_TOWER_ENTRANCE_FORECOURT_DEPTH,
    championTowerPlazaGround:grounds.plaza,championTowerColliders:colliders.length
  };
  return {group,colliders,landmarks:[landmark],stats,groundOffset,grounds,plazaTop:grounds.plaza,
    groundHeightAt:(x,z,ground)=>championTowerGroundHeightAt(x,z,ground,grounds)};
}
