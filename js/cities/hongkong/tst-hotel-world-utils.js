import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { quad, hash, mix, point, edgeBox, roofGeometry } from './harbour-city-world-utils.js';
import { harbourCityEdgeOutward } from './harbour-city-architecture.js';
import { flatRingArea } from './tst-hotel-site.js';

// A thin-walled, top-capped prism follows every source vertex; it is never replaced by an oriented bounding box.
export function ringShellGeometry(ring, y0, y1, cap = true) {
  const positions = [], uvs = [], indices = [], count = ring.length / 2 - 1;
  for (let edge = 0; edge < count; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const j = positions.length / 3;
    positions.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y1, az);
    const length = Math.hypot(bx - ax, bz - az); uvs.push(0, y0, length, y0, length, y1, 0, y1);
    if (flatRingArea(ring) >= 0) indices.push(j, j + 2, j + 1, j, j + 3, j + 2);
    else indices.push(j, j + 1, j + 2, j, j + 2, j + 3);
  }
  const sides = new THREE.BufferGeometry();
  sides.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  sides.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  sides.setIndex(indices); sides.computeVertexNormals();
  if (!cap) return sides;
  const top = roofGeometry(ring, y1), geometry = mergeGeometries([sides, top], false);
  sides.dispose(); top.dispose(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export function meshFromGeometry(group, geometry, material, name, shadows = true) {
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}

// Repeated windows are individual facade panels with real projecting jambs, sills and lintels, not a flat texture.
export function createRingWindowRows(site, options = {}) {
  const ring = site.localRing, glass = { positions: [], colors: [], lit: [] }, frames = [], sills = [];
  const y0 = options.y0 ?? 0, rowCount = options.rowCount ?? 1, floorHeight = options.floorHeight ?? 3.2;
  const sill = options.sill ?? 0.75, windowHeight = options.windowHeight ?? Math.min(2.1, floorHeight - 1);
  const targetBayWidth = options.targetBayWidth ?? 3.2, windowRatio = options.windowRatio ?? 0.58;
  const offset = options.offset ?? 0.07, seed = options.seed ?? site.osmId ?? 1;
  const tintA = options.tintA ?? [0.035, 0.065, 0.075], tintB = options.tintB ?? [0.20, 0.25, 0.25];
  const skip = options.skip ?? (() => false);
  let panels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    if (options.edgePredicate && !options.edgePredicate(edge)) continue;
    const length = harbourCityEdgeOutward(ring, edge).length;
    if (length < 0.3) continue;
    const bays = Math.max(1, Math.round(length / targetBayWidth));
    for (let row = 0; row < rowCount; row++) {
      const rowY = y0 + row * floorHeight;
      for (let bay = 0; bay < bays; bay++) {
        if (skip(edge, row, bay, bays)) continue;
        const middle = (bay + 0.5) / bays, halfT = windowRatio / bays * 0.5;
        const t0 = middle - halfT, t1 = middle + halfT, low = rowY + sill, high = low + windowHeight;
        const variation = hash(edge + seed, row + 17, bay + 31);
        const lit = variation > (options.litThreshold ?? 0.79) ? 0.07 + hash(row, bay, edge, seed) * 0.28 : 0;
        quad(glass, point(site, edge, t0, low, offset), point(site, edge, t1, low, offset),
          point(site, edge, t1, high, offset), point(site, edge, t0, high, offset),
          mix(tintA, tintB, 0.18 + variation * 0.65), lit);
        const width = (t1 - t0) * length;
        for (const t of [t0, t1]) edgeBox(frames, site, edge, t, (low + high) * 0.5, offset + 0.08,
          options.jambWidth ?? 0.12, windowHeight + 0.26, options.frameDepth ?? 0.18);
        edgeBox(sills, site, edge, middle, low - 0.08, offset + 0.13, width + 0.28,
          options.sillHeight ?? 0.15, (options.frameDepth ?? 0.18) + 0.12);
        if (options.lintels !== false) edgeBox(sills, site, edge, middle, high + 0.08, offset + 0.10,
          width + 0.24, options.lintelHeight ?? 0.14, (options.frameDepth ?? 0.18) + 0.08);
        panels++;
      }
    }
  }
  return { glass, frames, sills, panels };
}

export function archPanelGeometry(width, height, archRise = width * 0.5) {
  const shape = new THREE.Shape(), shoulder = height - archRise;
  shape.moveTo(-width * 0.5, 0); shape.lineTo(width * 0.5, 0); shape.lineTo(width * 0.5, shoulder);
  shape.absarc(0, shoulder, archRise, 0, Math.PI, false); shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 16); geometry.computeVertexNormals(); return geometry;
}

export function placeFacadeGeometry(parts, geometry, site, edge, t, offset = 0.08) {
  const p = point(site, edge, t, 0, offset), { nx, nz } = harbourCityEdgeOutward(site.localRing, edge);
  geometry.rotateY(Math.atan2(nx, nz)); geometry.translate(p[0], p[1], p[2]); parts.push(geometry); return geometry;
}

export function makeCanvasSign(width, height, draw, { transparent = true, emissive = false } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!transparent) { ctx.fillStyle = '#ece8dc'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  draw(ctx, canvas);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const material = emissive
    ? new THREE.MeshStandardMaterial({ map: texture, transparent, alphaTest: 0.04, roughness: 0.48, metalness: 0.08, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.3, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ map: texture, transparent, alphaTest: 0.04, roughness: 0.68, metalness: 0.04, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.castShadow = false;
  return mesh;
}
