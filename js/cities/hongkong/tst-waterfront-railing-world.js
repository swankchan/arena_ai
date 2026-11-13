import * as THREE from 'three/webgpu';
import { tstWaterfrontRailingPath, TST_WATERFRONT_RAILING_SOURCE, TST_WATERFRONT_RAILING_STYLE } from './tst-waterfront-railing-architecture.js';
import { hongKongTerrainHeight } from './terrain.js';
import { FULL_WORLD_HEIGHT } from './full-world.js';
import { fullRoadSurfaceAt } from './full-meta.js';
import { segmentWall } from './colliders.js';
import { beam, merged, nightAmount } from './harbour-city-world-utils.js';
import { color } from 'three/tsl';

export function buildTstWaterfrontRailing(scene, {
  groundHeightAt = (x, z) => hongKongTerrainHeight(x, z) + FULL_WORLD_HEIGHT.land,
} = {}) {
  const root = new THREE.Group(); root.name = 'Tsim Sha Tsui Star Ferry to Tsim East wave balustrade';
  root.userData.source = TST_WATERFRONT_RAILING_SOURCE;
  const samples = tstWaterfrontRailingPath().map((point) => {
    const y = groundHeightAt(point.x, point.z), road = fullRoadSurfaceAt(point.x, point.z, .65, y);
    return { ...point, y, roadOpen: Boolean(road && Math.abs(road.height - y) < 2) };
  });
  const handrail = [], balusters = [], posts = [], lowerRail = [], lightStrip = [], colliders = [];
  let length = 0, roadOpenings = 0;
  for (let index = 0; index < samples.length; index++) {
    const point = samples[index], inland = .17, seaward = .10;
    if (point.roadOpen && !samples[index - 1]?.roadOpen) roadOpenings++;
    if (!point.roadOpen) {
      // Official photographs show inclined metal balusters below the broad tactile timber-substitute rail.
      beam(balusters,
        [point.x + point.nx * inland, point.y + .14, point.z + point.nz * inland],
        [point.x - point.nx * seaward, point.y + TST_WATERFRONT_RAILING_STYLE.balustradeHeight, point.z - point.nz * seaward], .065, .13);
      if (index % 5 === 0 || index === samples.length - 1 || samples[index - 1]?.roadOpen || samples[index + 1]?.roadOpen) {
        beam(posts, [point.x, point.y + .04, point.z], [point.x, point.y + 1.09, point.z], .085, .10);
      }
    }
    const next = samples[index + 1];
    if (!next || point.roadOpen || next.roadOpen) continue;
    length += Math.hypot(next.x - point.x, next.z - point.z);
    beam(handrail, [point.x, point.y + 1.12, point.z], [next.x, next.y + 1.12, next.z], .28, .12);
    beam(lowerRail, [point.x, point.y + .16, point.z], [next.x, next.y + .16, next.z], .075, .075);
    beam(lightStrip, [point.x - point.nx * .025, point.y + 1.035, point.z - point.nz * .025],
      [next.x - next.nx * .025, next.y + 1.035, next.z - next.nz * .025], .024, .024);
  }
  // Collision bays follow exactly the same centreline and stop at the genuine service-road opening.
  const addColliderRun = (start, end) => {
    const a = samples[start], b = samples[end];
    let low = Infinity, high = -Infinity;
    for (let index = start; index <= end; index++) { low = Math.min(low, samples[index].y); high = Math.max(high, samples[index].y); }
    const collider = segmentWall(a.x, a.z, b.x, b.z, { thickness: .10, base: low + .02, top: high + 1.18 });
    if (collider) colliders.push(collider);
  };
  let run = [];
  for (let index = 0; index < samples.length - 1; index++) {
    const closed = !samples[index].roadOpen && !samples[index + 1].roadOpen;
    if (closed) run.push(index);
    if (run.length && (!closed || run.length === 4 || index === samples.length - 2)) {
      addColliderRun(run[0], run.at(-1) + 1); run = [];
    }
  }
  const wood = new THREE.MeshStandardMaterial({ color: 0xb8a180, roughness: .76, metalness: .02 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xa5b0b0, roughness: .32, metalness: .76 });
  const postSteel = new THREE.MeshStandardMaterial({ color: 0x718082, roughness: .37, metalness: .72 });
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xd8c9a6, roughness: .42, metalness: .08 });
  light.emissiveNode = color(0xffd598).mul(nightAmount()).mul(1.5);
  merged(root, handrail, wood, 'TST promenade wide bio-based wood substitute handrail');
  merged(root, balusters, steel, 'TST promenade individual seaward-leaning wave balusters');
  merged(root, posts, postSteel, 'TST promenade stainless newel posts');
  merged(root, lowerRail, steel, 'TST promenade continuous lower rail');
  merged(root, lightStrip, light, 'TST promenade subtle under-handrail light strip', false);
  scene.add(root);
  return {
    root, colliders, samples,
    stats: {
      tstWaterfrontRailingLength: length,
      tstWaterfrontRailingSamples: samples.length,
      tstWaterfrontRailingBalusters: balusters.length,
      tstWaterfrontRailingPosts: posts.length,
      tstWaterfrontRailingColliders: colliders.length,
      tstWaterfrontRailingRoadOpenings: roadOpenings,
      tstWaterfrontRailingRoadOpeningSamples: samples.filter((point) => point.roadOpen).length,
      tstWaterfrontRailingSourceVertices: TST_WATERFRONT_RAILING_SOURCE.lastVertex - TST_WATERFRONT_RAILING_SOURCE.firstVertex + 1,
      tstWaterfrontRailingPhotoTextures: 0,
    },
  };
}
