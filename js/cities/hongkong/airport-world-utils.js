import * as THREE from 'three/webgpu';
import {
  merged as mergeParts, meshStore, box, beam, cylinder, sphere, store, quad, roofGeometry,
  harbourCityPalette,
} from './harbour-city-world-utils.js';
import {
  harbourCityEdgeOutward, harbourCityPodiumBayConflict, harbourCitySegmentCollider,
  harbourCityLocalCollider, harbourCityLocalToWorld,
} from './harbour-city-architecture.js';
import { AIRPORT_FRAME, airportLocalToWorld } from './airport-architecture.js';

export { meshStore, box, beam, cylinder, sphere, store, quad, roofGeometry };

// Airport geometry deliberately mixes hand-built ribbons with Three primitives. They do not need UVs because no
// photographic or image texture is used; removing UVs makes the common merge deterministic and asset-free.
export function merged(group, parts, material, name, shadows = true) {
  for (const geometry of parts) if (geometry.getAttribute('uv')) geometry.deleteAttribute('uv');
  return mergeParts(group, parts, material, name, shadows);
}

export function airportPalette() {
  const common = harbourCityPalette({
    stone: [.57,.60,.60], paleStone: [.86,.87,.84], metal: [.53,.59,.61], roof: [.36,.40,.42], roughness: .24, metalness: .28,
  });
  return {
    ...common,
    silver: new THREE.MeshStandardMaterial({ color: 0xbcc7c9, roughness: .38, metalness: .72 }),
    silverDark: new THREE.MeshStandardMaterial({ color: 0x718186, roughness: .44, metalness: .62 }),
    whiteMetal: new THREE.MeshStandardMaterial({ color: 0xe4e9e6, roughness: .46, metalness: .38 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x26383d, roughness: .4, metalness: .55 }),
    blueGlass: new THREE.MeshStandardMaterial({ color: 0x315e68, roughness: .2, metalness: .42 }),
    greenGlass: new THREE.MeshStandardMaterial({ color: 0x386f68, roughness: .22, metalness: .36 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x999b96, roughness: .94, metalness: .01 }),
    concreteLight: new THREE.MeshStandardMaterial({ color: 0xb6b7ae, roughness: .9, metalness: .01 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x353b3d, roughness: .96, metalness: .01 }),
    taxiway: new THREE.MeshStandardMaterial({ color: 0x4c5354, roughness: .95, metalness: .01 }),
    whitePaint: new THREE.MeshStandardMaterial({ color: 0xf0f0e8, roughness: .82, metalness: 0 }),
    yellowPaint: new THREE.MeshStandardMaterial({ color: 0xe6bd35, roughness: .82, metalness: 0 }),
    redPaint: new THREE.MeshStandardMaterial({ color: 0xa6473c, roughness: .85, metalness: 0 }),
    greenLight: new THREE.MeshStandardMaterial({ color: 0x70e5b0, emissive: 0x38dd8a, emissiveIntensity: 1.25, roughness: .4 }),
    blueLight: new THREE.MeshStandardMaterial({ color: 0x7bbdeb, emissive: 0x388fe0, emissiveIntensity: 1.1, roughness: .4 }),
    redLight: new THREE.MeshStandardMaterial({ color: 0xff8270, emissive: 0xe84030, emissiveIntensity: 1.1, roughness: .4 }),
    aircraftWhite: new THREE.MeshStandardMaterial({ color: 0xe8eeeb, roughness: .42, metalness: .22 }),
    aircraftGreen: new THREE.MeshStandardMaterial({ color: 0x176b5c, roughness: .43, metalness: .2 }),
    aircraftBlue: new THREE.MeshStandardMaterial({ color: 0x315e85, roughness: .43, metalness: .2 }),
    aircraftRed: new THREE.MeshStandardMaterial({ color: 0x9b403b, roughness: .43, metalness: .2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x161b1c, roughness: .92, metalness: .02 }),
  };
}

export function createSiteGroup(site, name) {
  const group = new THREE.Group(); group.name = name;
  group.position.set(site.x, 0, site.z); group.rotation.y = site.ry;
  return group;
}
export function createAirportFrameGroup(name) {
  const group = new THREE.Group(); group.name = name;
  group.position.set(AIRPORT_FRAME.x, 0, AIRPORT_FRAME.z); group.rotation.y = AIRPORT_FRAME.ry;
  return group;
}

// Real source-edge facade panels with road-priority openings. Upper floors and collision continue over service ways.
export function buildSourceFacade(group, site, materials, options = {}) {
  const base = options.base ?? 0, height = options.height ?? site.height ?? 30, levels = options.levels ?? site.levels ?? 4;
  const bayWidth = options.bayWidth ?? 6, roadSoffit = options.roadSoffit ?? 8;
  const glass = store(), frames = [], columns = [], colliders = [];
  let panels = 0, roadOpenings = 0;
  const tintA = options.glassA ?? [.035,.12,.15], tintB = options.glassB ?? [.15,.31,.34];
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const info = harbourCityEdgeOutward(site.localRing, edge), bays = Math.max(1, Math.ceil(info.length / bayWidth));
    const p = (t, y, offset = 0) => {
      const i = edge * 2, ring = site.localRing;
      return [ring[i] + (ring[i + 2] - ring[i]) * t + info.nx * offset, y, ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t + info.nz * offset];
    };
    for (let bay = 0; bay < bays; bay++) {
      const t0 = bay / bays + .0005, t1 = (bay + 1) / bays - .0005;
      const road = harbourCityPodiumBayConflict(site, edge, bay / bays, (bay + 1) / bays);
      const bottom = road ? roadSoffit : .35;
      if (road) roadOpenings++;
      for (let level = 0; level < levels; level++) {
        const y0 = Math.max(bottom, level * (height / levels) + .25);
        const y1 = Math.min(height - .4, (level + 1) * (height / levels) - .35);
        if (y1 <= y0) continue;
        const variation = ((edge * 31 + bay * 17 + level * 13) % 19) / 18;
        const tint = tintA.map((v, i) => v + (tintB[i] - v) * variation);
        quad(glass, p(t0, base + y0), p(t1, base + y0), p(t1, base + y1), p(t0, base + y1), tint, .04 + (variation > .72 ? .32 : .06));
        panels++;
      }
      colliders.push(harbourCitySegmentCollider(site, edge, bay / bays, (bay + 1) / bays, base + bottom, base + height, .42));
      const mullion = p((bay + 1) / bays, base + (bottom + height) * .5, .05);
      box(columns, mullion, [.18, height - bottom, .24], info.ry);
    }
    for (let level = 0; level <= levels; level++) {
      const y = base + level * height / levels;
      const i = edge * 2, ring = site.localRing;
      beam(frames, p(0, y, .07), p(1, y, .07), .16, .2);
      void i; void ring;
    }
  }
  const glassMesh = meshStore(group, glass, materials.glazing, `${site.englishName}: individual glazed facade panels`, false);
  merged(group, frames, materials.silverDark, `${site.englishName}: horizontal facade transoms`);
  merged(group, columns, materials.whiteMetal, `${site.englishName}: vertical facade mullions`);
  return { colliders, panels, roadOpenings, glassMesh };
}

export function barrelVaultGeometry(width, length, rise, segments = 12) {
  const positions = [], indices = [];
  for (let end = 0; end < 2; end++) for (let i = 0; i <= segments; i++) {
    const theta = -Math.PI / 2 + i / segments * Math.PI;
    positions.push(Math.sin(theta) * width * .5, Math.cos(theta) * rise, (end - .5) * length);
  }
  for (let i = 0; i < segments; i++) {
    const a = i, b = i + 1, c = segments + 1 + i, d = c + 1;
    indices.push(a,c,b, b,c,d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); return geometry;
}

export function addBarrelVault(roofParts, ribParts, center, width, length, eaveY, rise, rotation = 0, segments = 12) {
  const geometry = barrelVaultGeometry(width, length, rise, segments);
  if (rotation) geometry.rotateY(rotation);
  geometry.translate(center[0], eaveY, center[1]); roofParts.push(geometry);
  const transform = (x, z) => [center[0] + x * Math.cos(rotation) + z * Math.sin(rotation), center[1] - x * Math.sin(rotation) + z * Math.cos(rotation)];
  for (const end of [-length * .5, length * .5]) for (let i = 0; i < segments; i++) {
    const a = -Math.PI / 2 + i / segments * Math.PI, b = -Math.PI / 2 + (i + 1) / segments * Math.PI;
    const pa = transform(Math.sin(a) * width * .5, end), pb = transform(Math.sin(b) * width * .5, end);
    beam(ribParts, [pa[0],eaveY + Math.cos(a) * rise,pa[1]], [pb[0],eaveY + Math.cos(b) * rise,pb[1]], .16, .2);
  }
}

export function featherStripGeometry(width, length, rise, phase = 0, archSegments = 10, lengthSegments = 20) {
  const positions = [], indices = [], row = archSegments + 1;
  for (let j = 0; j <= lengthSegments; j++) {
    const along = j / lengthSegments, z = (along - .5) * length;
    const longitudinal = Math.sin(along * Math.PI * 2 + phase) * 1.35 + Math.sin(along * Math.PI) * 1.4;
    for (let i = 0; i <= archSegments; i++) {
      const theta = -Math.PI / 2 + i / archSegments * Math.PI;
      positions.push(Math.sin(theta) * width * .5, Math.cos(theta) * rise + longitudinal, z);
    }
  }
  for (let j = 0; j < lengthSegments; j++) for (let i = 0; i < archSegments; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    indices.push(a,c,b, b,c,d);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

// Airport-local ribbon with every vertex sampling the same world DTM as the unified terrain.
export function airportRibbonGeometry(points, width, heightAt, offset = 0) {
  const positions = [], indices = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx,dz);
    if (length < .01) continue;
    const steps = Math.max(1, Math.ceil(length / 45));
    for (let step = 0; step < steps; step++) {
      const t0 = step / steps, t1 = (step + 1) / steps;
      const x0 = a[0] + dx * t0, z0 = a[1] + dz * t0, x1 = a[0] + dx * t1, z1 = a[1] + dz * t1;
      const nx = dz / length * width * .5, nz = -dx / length * width * .5;
      const local = [[x0+nx,z0+nz],[x0-nx,z0-nz],[x1+nx,z1+nz],[x1-nx,z1-nz]];
      const base = positions.length / 3;
      for (const [x,z] of local) { const world = airportLocalToWorld(x,z); positions.push(x,heightAt(world.x,world.z)+offset,z); }
      indices.push(base,base+2,base+1, base+1,base+2,base+3);
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function airportRectGeometry(rect, heightAt, offset = 0, cell = 55) {
  const positions = [], indices = [], nx = Math.max(1,Math.ceil((rect.maxX-rect.minX)/cell)), nz = Math.max(1,Math.ceil((rect.maxZ-rect.minZ)/cell));
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x0 = rect.minX + (rect.maxX-rect.minX)*i/nx, x1 = rect.minX + (rect.maxX-rect.minX)*(i+1)/nx;
    const z0 = rect.minZ + (rect.maxZ-rect.minZ)*j/nz, z1 = rect.minZ + (rect.maxZ-rect.minZ)*(j+1)/nz;
    const base = positions.length/3;
    for (const [x,z] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1]]) { const world=airportLocalToWorld(x,z); positions.push(x,heightAt(world.x,world.z)+offset,z); }
    indices.push(base,base+2,base+1,base+1,base+2,base+3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function airportLocalCollider(x, z, w, d, minY, maxY, ry = AIRPORT_FRAME.ry) {
  return harbourCityLocalCollider(AIRPORT_FRAME, x, z, w, d, minY, maxY, ry);
}
export function siteLocalToWorld(site, x, z) { return harbourCityLocalToWorld(site,x,z); }
