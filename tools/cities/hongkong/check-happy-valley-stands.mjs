// Offline plan/clearance audit for the three stands that were never rebuilt.
// Samples a grid inside each mapped footprint and reports any carriageway whose ribbon
// height sits at the venue level. Discrete samples, not a swept vehicle clearance.
import {
  HAPPY_VALLEY_GRANDSTAND, HAPPY_VALLEY_MEMBERS_I, HAPPY_VALLEY_MEMBERS_II,
} from '../../../js/cities/hongkong/happy-valley-remaining-stands-site.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';
import { HONG_KONG_TERRAIN_META as meta } from '../../../js/cities/hongkong/terrain.js';
import { fullRoadWaysNear } from '../../../js/cities/hongkong/full-meta.js';
import { roadRibbonHeightAtSegment } from '../../../js/cities/hongkong/road-elevation.js';

const stands = [
  ['Grandstand', HAPPY_VALLEY_GRANDSTAND],
  ['MembersStandI', HAPPY_VALLEY_MEMBERS_I],
  ['MembersStandII', HAPPY_VALLEY_MEMBERS_II],
];
const STEP = 0.5;
const report = {};

for (const [name, site] of stands) {
  const ring = site.ring;
  const bounds = site.bounds;
  let samples = 0;
  const roads = new Map();
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let x = bounds.minX; x <= bounds.maxX; x += STEP) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += STEP) {
      if (!pointInFlatRing(ring, x, z)) continue;
      samples++;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      for (const way of fullRoadWaysNear(x, z, 12)) {
        for (let k = 2; k < way.flat.length; k += 2) {
          const ax = way.flat[k - 2], az = way.flat[k - 1];
          const vx = way.flat[k] - ax, vz = way.flat[k + 1] - az;
          const l = vx * vx + vz * vz;
          if (l < 0.0025) continue;
          const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l));
          const px = ax + t * vx, pz = az + t * vz;
          if (Math.hypot(x - px, z - pz) > way.width / 2 + 1) continue;
          const height = roadRibbonHeightAtSegment(way.id, k / 2 - 1, t, px, pz);
          if (Math.abs(height - meta.happyValleyPadHeight) < 2.5) {
            roads.set(way.id, (roads.get(way.id) ?? 0) + 1);
          }
        }
      }
    }
  }
  report[name] = {
    footprintSamples: samples,
    sameLevelRoadIds: Object.fromEntries(roads),
    sameLevelRoadSamples: [...roads.values()].reduce((a, b) => a + b, 0),
    boundsMetres: {
      x: [Number(minX.toFixed(1)), Number(maxX.toFixed(1))],
      z: [Number(minZ.toFixed(1)), Number(maxZ.toFixed(1))],
    },
  };
}

console.log(JSON.stringify({
  stands: report,
  caveat: 'Discrete 0.5 m footprint samples against nearby road layers at the venue datum; excludes tunnels below the sample, vehicle sweeps, real doors and surveyed heights. An entrance is not evidence of an official HKJC entrance.',
}, null, 2));
