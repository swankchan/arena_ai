// Diagnose the existing Happy Valley layout against the extracted OSM pitches and generated roads.
// These are map/model checks, not surveyed engineering clearances.
import fs from 'node:fs';
import { makeFrame } from '../../geo/frame.mjs';
import cfg from './config.mjs';
import { HAPPY_VALLEY_SITE as site, HAPPY_VALLEY_TRACK as track, happyValleyTrackPoint } from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';
import { HONG_KONG_TERRAIN_META as terrain } from '../../../js/cities/hongkong/terrain.js';
import { fullRoadSurfaceAt } from '../../../js/cities/hongkong/full-meta.js';

const frame = makeFrame(cfg.frame);
const parks = JSON.parse(fs.readFileSync(new URL('../../data/hongkong/parks.json', import.meta.url)));
const pitches = parks.elements.filter((e) => e.type === 'way' && e.tags?.leisure === 'pitch' && e.geometry?.length >= 4)
  .map((e) => ({ id: e.id, name: e.tags.name || '', ring: e.geometry.flatMap(({ lon, lat }) => frame.toWorld(lon, lat)) }))
  .filter(({ ring }) => ring.some((_, i) => !(i % 2) && pointInFlatRing(site.ring, ring[i], ring[i + 1])));
const roadIds = new Map(), pitchIds = new Map();
let maxStep = 0, roadSamples = 0, pitchSamples = 0;
const count = 720;
function point(t, offset) {
  const p = happyValleyTrackPoint(t, offset), c = Math.cos(site.ry), s = Math.sin(site.ry);
  return { x: site.x + c * p.x + s * p.z, z: site.z - s * p.x + c * p.z };
}
for (let i = 0; i < count; i++) {
  const a = point(i / count, 0), b = point((i + 1) / count, 0);
  maxStep = Math.max(maxStep, Math.hypot(a.x - b.x, a.z - b.z));
  for (const offset of [0, -8, -16, -24, -30]) {
    const p = point(i / count, offset);
    const road = fullRoadSurfaceAt(p.x, p.z, 1, terrain.happyValleyPadHeight);
    if (road && Math.abs(road.height - terrain.happyValleyPadHeight) < 2.5) {
      roadSamples++; roadIds.set(road.way.id, (roadIds.get(road.way.id) || 0) + 1);
    }
    const hit = pitches.find(({ ring }) => pointInFlatRing(ring, p.x, p.z));
    if (hit) { pitchSamples++; pitchIds.set(hit.id, (pitchIds.get(hit.id) || 0) + 1); }
  }
}
console.log(JSON.stringify({ pitchWays: pitches.length, declaredLapMetres: track.lapMetres, largestAdjacentRailStepMetres: +maxStep.toFixed(2), roadSamples, roadIds: Object.fromEntries(roadIds), pitchSamples, pitchIds: Object.fromEntries(pitchIds), sampleCount: count * 5, caveat: 'OSM/model coordinates and coarse samples, not survey; road ids are generated runtime indices' }, null, 2));
