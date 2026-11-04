import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function box(w, h, d, x, y, z, ry = 0) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  if (ry) geometry.rotateY(ry);
  return geometry.translate(x, y, z);
}

export function cylinder(rt, rb, h, segments, x, y, z, rx = 0, rz = 0) {
  const geometry = new THREE.CylinderGeometry(rt, rb, h, segments);
  if (rx) geometry.rotateX(rx);
  if (rz) geometry.rotateZ(rz);
  return geometry.translate(x, y, z);
}

export function tube(a, b, radius, sides = 8) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start), length = direction.length();
  if (length < 1e-6) return null;
  const geometry = new THREE.CylinderGeometry(radius, radius, length, sides);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), direction.normalize()
  ));
  const midpoint = start.add(end).multiplyScalar(0.5);
  return geometry.translate(midpoint.x, midpoint.y, midpoint.z);
}

export function pushTube(parts, a, b, radius, sides = 8) {
  const geometry = tube(a, b, radius, sides);
  if (geometry) parts.push(geometry);
}

export function extrudeRing(ring, base, height) {
  const shape = new THREE.Shape();
  shape.moveTo(ring[0], -ring[1]);
  for (let i = 2; i + 1 < ring.length; i += 2) shape.lineTo(ring[i], -ring[i + 1]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, base, 0);
  return geometry;
}

export function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 2; i + 1 < ring.length; j = i, i += 2) {
    area += ring[j] * ring[i + 1] - ring[i] * ring[j + 1];
  }
  return area * 0.5;
}

export function ringEdge(ring, edge) {
  const index = edge * 2, next = ((edge + 1) % (ring.length / 2)) * 2;
  const ax = ring[index], az = ring[index + 1], bx = ring[next], bz = ring[next + 1];
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  const sign = ringArea(ring) >= 0 ? 1 : -1;
  return {
    ax, az, bx, bz, dx, dz, length,
    x: (ax + bx) * 0.5, z: (az + bz) * 0.5,
    nx: dz / length * sign, nz: -dx / length * sign,
    ry: Math.atan2(-dz, dx)
  };
}

export function mergeParts(parts) {
  // Custom hull/roof strips need the same position/normal/uv schema as Three's indexed primitives.
  for (const part of parts) {
    if (!part.getAttribute('normal')) part.computeVertexNormals();
    if (!part.getAttribute('uv')) {
      part.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(part.getAttribute('position').count * 2), 2));
    }
  }
  const normalized = parts.map((part) => part.index ? part.toNonIndexed() : part);
  const geometry = mergeGeometries(normalized, false);
  for (const part of parts) part.dispose();
  for (const part of normalized) if (!parts.includes(part)) part.dispose();
  if (!geometry) throw new Error('Star Ferry geometry batch has incompatible attributes');
  return geometry;
}

export function addMergedMeshes(group, parts, materials, prefix, representatives = {}) {
  const meshes = [];
  for (const [kind, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeParts(list), materials[kind]);
    mesh.name = `${prefix}:${kind}`;
    mesh.castShadow = !kind.toLowerCase().includes('glass') && kind !== 'lamp' && kind !== 'sign';
    mesh.receiveShadow = !kind.toLowerCase().includes('glass') && kind !== 'lamp';
    if (representatives[kind]) mesh.userData.sharesPipelineWith = representatives[kind];
    else representatives[kind] = mesh;
    group.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

function canvasTexture(width, height, draw) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function terminalSignTexture(title, subtitle, detail = 'STAR FERRY 天星小輪', palette = {}) {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = palette.background || '#164f3b'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = palette.border || '#e8e1c9'; ctx.lineWidth = 9; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = palette.foreground || '#fff8df'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 70px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(title, w / 2, 72);
    ctx.font = '600 34px sans-serif'; ctx.fillText(subtitle.toUpperCase(), w / 2, 145);
    ctx.fillStyle = palette.detail || '#d6cda9'; ctx.font = '700 25px sans-serif'; ctx.fillText(detail, w / 2, 207);
  });
}

export function vesselNameTexture(name) {
  return canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#e5d49b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 54px Georgia, serif'; ctx.fillText(name, w / 2, 52);
    ctx.font = '600 25px sans-serif'; ctx.fillText('THE STAR FERRY CO. LTD.  ·  HONG KONG', w / 2, 101);
  });
}

export function clockTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f3f0df'; ctx.strokeStyle = '#173c32'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 224, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(w / 2, h / 2);
    for (let index = 0; index < 60; index++) {
      const major = index % 5 === 0;
      ctx.save(); ctx.rotate(index * Math.PI / 30);
      ctx.strokeStyle = '#203b34'; ctx.lineWidth = major ? 12 : 5;
      ctx.beginPath(); ctx.moveTo(0, -193); ctx.lineTo(0, major ? -164 : -181); ctx.stroke(); ctx.restore();
    }
    ctx.strokeStyle = '#142d28'; ctx.lineCap = 'round';
    ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(-76, -58); ctx.stroke();
    ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(102, -118); ctx.stroke();
    ctx.fillStyle = '#142d28'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}
