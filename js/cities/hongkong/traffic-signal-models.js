import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Hong Kong signal hardware modelled from local street photographs. Geometry is deliberately separate from the TIS_16
// placement rules. No countdown, invented arrow stack or illuminated phase is added.

export const VEHICLE_HEAD = Object.freeze({ width: 0.40, height: 1.04, mount: 2.40, headroom: 0.18 });
export const PEDESTRIAN_HEAD = Object.freeze({ width: 0.34, height: 0.68, centre: 2.05 });

function mergeParts(parts) {
  // RoundedBoxGeometry is non-indexed while cylinders/tori are indexed; normalise before merging instanced parts.
  return mergeGeometries(parts.map((part) => part.index ? part.toNonIndexed() : part), false);
}

export function createVehicleHeadGeometry() {
  const lensY = [0.34, 0, -0.34];
  const housing = [
    new RoundedBoxGeometry(0.52, 1.16, 0.07, 3, 0.09).translate(0, 0, -0.105),
    new RoundedBoxGeometry(0.40, 1.04, 0.25, 3, 0.065).translate(0, 0, 0.015)
  ];
  const rims = [];
  for (const y of lensY) {
    // Deep open half-round hood, with its open side facing the lens rather than a solid cylinder over the glass.
    const hood = new THREE.CylinderGeometry(0.145, 0.145, 0.22, 18, 1, true, Math.PI, Math.PI);
    hood.rotateX(Math.PI / 2);
    hood.translate(0, y, 0.235);
    housing.push(hood);
    rims.push(new THREE.TorusGeometry(0.123, 0.013, 6, 20).translate(0, y, 0.151));
  }
  return {
    housing: mergeParts(housing),
    rims: mergeParts(rims),
    lenses: lensY.map((y) => new THREE.CircleGeometry(0.112, 20).translate(0, y, 0.154))
  };
}

function figureTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07090b'; ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#252a2c'; ctx.lineWidth = 3;
  ctx.strokeRect(13, 13, 230, 230); ctx.strokeRect(13, 269, 230, 230);
  ctx.lineCap = ctx.lineJoin = 'round';

  // Unlit red standing man.
  ctx.fillStyle = '#63272b'; ctx.strokeStyle = '#63272b'; ctx.lineWidth = 19;
  ctx.beginPath(); ctx.arc(128, 65, 23, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(128, 96); ctx.lineTo(128, 158);
  ctx.moveTo(104, 105); ctx.lineTo(91, 151); ctx.moveTo(152, 105); ctx.lineTo(165, 151);
  ctx.moveTo(128, 155); ctx.lineTo(109, 211); ctx.moveTo(128, 155); ctx.lineTo(147, 211); ctx.stroke();

  // Unlit green walking man: a clear stride and swinging arms, not a second copy of the standing symbol.
  ctx.fillStyle = '#20573b'; ctx.strokeStyle = '#20573b'; ctx.lineWidth = 18;
  ctx.beginPath(); ctx.arc(137, 320, 22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(127, 348); ctx.lineTo(113, 405);
  ctx.moveTo(119, 360); ctx.lineTo(83, 384); ctx.moveTo(121, 361); ctx.lineTo(158, 382);
  ctx.moveTo(113, 403); ctx.lineTo(79, 457); ctx.moveTo(113, 403); ctx.lineTo(160, 444); ctx.lineTo(181, 466); ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createPedestrianHeadGeometry() {
  const housing = new RoundedBoxGeometry(0.34, 0.68, 0.18, 3, 0.05);
  const face = new THREE.PlaneGeometry(0.29, 0.59);
  face.translate(0, 0, 0.096);
  const faceMaterial = new THREE.MeshStandardMaterial({
    map: figureTexture(), roughness: 0.38, metalness: 0.04
  });
  const unit = new RoundedBoxGeometry(0.22, 0.32, 0.14, 2, 0.025);
  const details = [
    new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16).rotateX(Math.PI / 2).translate(0, -0.025, 0.077),
    new THREE.BoxGeometry(0.085, 0.026, 0.012).translate(0, 0.10, 0.077)
  ];
  return {
    housing, face, faceMaterial, unit,
    unitDetails: mergeParts(details)
  };
}

export function createBeaconPoleGeometry() {
  const geometry = new THREE.CylinderGeometry(0.055, 0.055, 2.25, 12, 12);
  const position = geometry.attributes.position;
  const colours = [];
  const white = new THREE.Color(0xe4e1d6), black = new THREE.Color(0x171b1c);
  for (let i = 0; i < position.count; i++) {
    const band = Math.floor((position.getY(i) + 1.125) / 0.28);
    const c = band % 2 ? black : white;
    colours.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  return geometry;
}
