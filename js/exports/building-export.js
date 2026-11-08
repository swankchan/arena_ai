import * as THREE from 'three/webgpu';
import { getExportBuilding } from './building-catalog.js';

// The model is built in a temporary scene; none of the game's live objects are changed.
export async function createBuildingExport(id, { tsl = false } = {}) {
  const entry = getExportBuilding(id);
  if (!entry) throw new Error('未知或未支援的建物');
  // Preserve the already verified lightweight path for Wan Chai Tower.
  if (entry.isolated) {
    const wanchai = await import('./wanchai-export.runtime.js');
    return tsl ? wanchai.createWanchaiTslExport() : wanchai.createWanchaiExport();
  }
  const [module, terrain, materials] = await Promise.all([
    entry.load(), import('../cities/hongkong/terrain.js'), import('../tsl-materials.js')
  ]);
  const scene = new THREE.Scene();
  const previousGlow = materials.cityUniforms.uInteriorGlow.value;
  try {
    if (tsl) materials.cityUniforms.uInteriorGlow.value = 1.4;
    module[entry.build](scene, entry.options(terrain.HONG_KONG_TERRAIN_META));
    if (!scene.children.length) throw new Error('模型沒有可匯出物件');
    const root = new THREE.Group();
    root.name = entry.name;
    root.add(...scene.children.slice());
    // The Editor's ObjectLoader does not know addon geometry types such as
    // RoundedBoxGeometry. Export their already-built attributes as BufferGeometry.
    root.traverse(object => {
      if (object.geometry?.type === 'RoundedBoxGeometry') {
        object.geometry = new THREE.BufferGeometry().copy(object.geometry);
      }
    });
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    if (bounds.isEmpty() || !['x', 'y', 'z'].every(axis => Number.isFinite(bounds.min[axis]) && Number.isFinite(bounds.max[axis]))) {
      throw new Error('模型範圍無效，無法匯出');
    }
    const centre = bounds.getCenter(new THREE.Vector3());
    root.position.set(-centre.x, -bounds.min.y, -centre.z);
    if (!tsl) {
      // Node graphs are not understood by the stock Editor. Retain ordinary material
      // properties and color attributes where present, but complex shaders are approximated.
      const replacements = new Map();
      root.traverse(object => {
        if (!object.material) return;
        const convert = old => {
          if (!old?.isNodeMaterial) return old;
          const hasColor = !!object.geometry?.getAttribute('color');
          const key = `${old.uuid}:${hasColor}`;
          if (!replacements.has(key)) {
            const Type = old.isMeshBasicNodeMaterial ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;
            const result = new Type();
            for (const prop of ['color', 'emissive']) if (result[prop] && old[prop]) result[prop].copy(old[prop]);
            for (const prop of ['map', 'alphaMap', 'transparent', 'opacity', 'alphaTest', 'side', 'depthWrite', 'depthTest', 'toneMapped', 'wireframe', 'roughness', 'metalness']) {
              if (prop in result && old[prop] !== undefined) result[prop] = old[prop];
            }
            result.vertexColors = hasColor;
            replacements.set(key, result);
          }
          return replacements.get(key);
        };
        object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
      });
    }
    root.updateMatrixWorld(true);
    return root.toJSON();
  } finally {
    materials.cityUniforms.uInteriorGlow.value = previousGlow;
  }
}
