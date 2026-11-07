// Coarse diagnostics of the approximate course against retained runtime roads.
// Neither source is a surveyed engineering drawing; overpasses/tunnels need individual investigation.
import { SHA_TIN_SITE as site, SHA_TIN_TRACK as track, shaTinTrackPoint } from '../../../js/cities/hongkong/sha-tin-racecourse-architecture.js';
import { HONG_KONG_TERRAIN_META as terrain } from '../../../js/cities/hongkong/terrain.js';
import { fullRoadSurfaceAt } from '../../../js/cities/hongkong/full-meta.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';

const count = 720, offsets = [0, 20, 40, 60, track.turfOuterRadius-track.innerRadius];
const roadIds = {}, offsetHits = {}, c = Math.cos(site.ry), s = Math.sin(site.ry);
let maxStep = 0, outside = 0, roadSamples = 0;
for (let i = 0; i < count; i++) {
  const a = shaTinTrackPoint(i/count, 0), b = shaTinTrackPoint((i+1)/count, 0);
  maxStep = Math.max(maxStep, Math.hypot(a.x-b.x, a.z-b.z));
  for (const offset of offsets) {
    const p = shaTinTrackPoint(i/count, offset);
    if (!pointInFlatRing(site.localRing, p.x, p.z)) outside++;
    const x = site.x + c*p.x + s*p.z, z = site.z - s*p.x + c*p.z;
    const road = fullRoadSurfaceAt(x, z, 1, terrain.shaTinPadHeight);
    if (road && Math.abs(road.height-terrain.shaTinPadHeight) < 2.5) {
      roadSamples++;
      roadIds[road.way.id] = (roadIds[road.way.id] || 0) + 1;
      offsetHits[offset] = (offsetHits[offset] || 0) + 1;
    }
  }
}
console.log(JSON.stringify({ samples: count*offsets.length, padHeight: terrain.shaTinPadHeight,
  largestAdjacentInnerRailStepMetres: +maxStep.toFixed(2), outside, roadSamples, roadIds, offsetHits,
  caveat: 'Runtime road ids, 1m road margin, 2.5m vertical tolerance; sampled model coordinates, not surveyed engineering clearances.' }, null, 2));
