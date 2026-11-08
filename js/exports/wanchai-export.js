import * as THREE from 'three/webgpu';
import { buildWanchaiTower } from '../cities/hongkong/wanchai-tower-world.js';

// Build a separate model; never mutate the running city's materials or objects.
export function createWanchaiExport() {
  const scene = new THREE.Scene();
  const { group } = buildWanchaiTower(scene);
  group.position.set(0, 0, 0); // local coordinates make the object easy to find in the editor
  group.traverse(object => {
    if (!object.isMesh || !object.material?.isNodeMaterial) return;
    const old = object.material;
    const material = new THREE.MeshStandardMaterial({
      color: old.color, roughness: old.roughness, metalness: old.metalness,
      side: old.side, vertexColors: !!object.geometry.getAttribute('color')
    });
    // Node-based day/night lighting cannot be represented faithfully in plain materials.
    object.material = material;
  });
  group.updateMatrixWorld(true); // Object3D JSON serializes local matrices, including the sign transform.
  return group.toJSON();
}
