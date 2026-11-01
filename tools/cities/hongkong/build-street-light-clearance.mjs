import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HK_STREET_LIGHTS } from '../../../js/hk-street-light-data.js';
import { fullRoadSurfaceAt } from '../../../js/cities/hongkong/full-meta.js';
import { crossingSurfaceAt } from '../../../js/cities/hongkong/crossings.js';
import { surfaceRoadHeight } from '../../../js/cities/hongkong/road-elevation.js';

const MAX_RELOCATION = 24;
const CARRIAGEWAY_MARGIN = 0.22;
const HEIGHT_TOLERANCE = 2;

function baseHeight(x, z) {
  const crossing = crossingSurfaceAt(x, z, 1);
  return crossing?.kind === 'bridge' ? crossing.height : surfaceRoadHeight(x, z);
}

function conflictAt(x, z) {
  const baseY = baseHeight(x, z);
  const hit = fullRoadSurfaceAt(x, z, CARRIAGEWAY_MARGIN, baseY);
  if (!hit || Math.abs(hit.height - baseY) > HEIGHT_TOLERANCE) return null;
  return { hit, baseY };
}

function clearCandidate(x, z) {
  const conflict = conflictAt(x, z);
  return conflict ? null : baseHeight(x, z);
}

function relocate(x, z, heading) {
  const original = conflictAt(x, z);
  if (!original) return { x, z, baseY: baseHeight(x, z), relocated: false };
  // Prefer the short outward normal of the actual conflicting segment. Revalidate after every move because parallel
  // carriageways, medians and layered roads can make the first apparently clear point belong to another road.
  let px = x, pz = z;
  for (let iteration = 0; iteration < 8; iteration++) {
    const conflict = conflictAt(px, pz);
    if (!conflict) return { x: px, z: pz, baseY: baseHeight(px, pz), relocated: true };
    const hit = conflict.hit, distance = hit.distance;
    const nx = distance > 1e-6 ? (px - hit.x) / distance : hit.leftX;
    const nz = distance > 1e-6 ? (pz - hit.z) / distance : hit.leftZ;
    const outward = hit.width * 0.5 + CARRIAGEWAY_MARGIN + 0.65 - distance;
    const candidates = [
      [px + nx * outward, pz + nz * outward],
      [px - nx * (outward + distance * 2), pz - nz * (outward + distance * 2)]
    ];
    let moved = false;
    for (const [cx, cz] of candidates) {
      if (Math.hypot(cx - x, cz - z) > MAX_RELOCATION) continue;
      const baseY = clearCandidate(cx, cz);
      if (baseY !== null) return { x: cx, z: cz, baseY, relocated: true };
    }
    const next = candidates[0];
    if (Math.hypot(next[0] - x, next[1] - z) <= MAX_RELOCATION) {
      px = next[0]; pz = next[1]; moved = true;
    }
    if (!moved) break;
  }
  // Deterministic radial fallback covers junctions and overlapping ways where a single segment normal is insufficient.
  for (const radius of [1.5, 3, 5, 8, 12, 16, 20, 24]) {
    for (let step = 0; step < 16; step++) {
      const angle = heading + step * Math.PI / 8;
      const cx = x + Math.sin(angle) * radius, cz = z + Math.cos(angle) * radius;
      const baseY = clearCandidate(cx, cz);
      if (baseY !== null) return { x: cx, z: cz, baseY, relocated: true };
    }
  }
  return null;
}

export async function buildHongKongStreetLightClearance({
  outFile = fileURLToPath(new URL('../../../js/hk-street-light-clearance-data.js', import.meta.url)),
  manifestFile = fileURLToPath(new URL('../../../tools/data/hongkong/street-light-clearance-manifest.json', import.meta.url))
} = {}) {
  const overrides = [], suppressed = [];
  for (let index = 0; index < HK_STREET_LIGHTS.lamps.length; index++) {
    const [x, z, heading] = HK_STREET_LIGHTS.lamps[index];
    const result = relocate(x, z, heading);
    if (!result) { suppressed.push(index); continue; }
    if (!result.relocated) continue;
    const dx = Math.round((result.x - x) * 100), dz = Math.round((result.z - z) * 100);
    const baseY = Math.round(result.baseY * 100);
    if (Math.hypot(dx / 100, dz / 100) > MAX_RELOCATION) { suppressed.push(index); continue; }
    // Centimetre quantisation is part of the runtime table, so validate exactly what will be rendered.
    const conflict = conflictAt(x + dx / 100, z + dz / 100);
    if (conflict) { suppressed.push(index); continue; }
    overrides.push([index, dx, dz, baseY]);
  }
  let remainingCarriagewayConflicts = 0;
  const moved = new Map(overrides.map((row) => [row[0], row]));
  const hidden = new Set(suppressed);
  for (let index = 0; index < HK_STREET_LIGHTS.lamps.length; index++) {
    if (hidden.has(index)) continue;
    const [x, z] = HK_STREET_LIGHTS.lamps[index], row = moved.get(index);
    if (conflictAt(x + (row?.[1] || 0) / 100, z + (row?.[2] || 0) / 100)) remainingCarriagewayConflicts++;
  }
  const manifest = {
    version: 1,
    source: { sha256: HK_STREET_LIGHTS.source.sha256, records: HK_STREET_LIGHTS.lamps.length },
    derivation: {
      algorithm: 'segment-normal-then-radial-v1', carriagewayMargin: CARRIAGEWAY_MARGIN,
      heightTolerance: HEIGHT_TOLERANCE, maxRelocation: MAX_RELOCATION, radialDirections: 16
    },
    counts: {
      relocated: overrides.length, suppressed: suppressed.length,
      rendered: HK_STREET_LIGHTS.lamps.length - suppressed.length,
      remainingCarriagewayConflicts
    }
  };
  const javascript = `// Generated by tools/cities/hongkong/build-street-light-clearance.mjs.\n` +
    `export const HK_STREET_LIGHT_CLEARANCE = ${JSON.stringify({ version: 1, overrides, suppressed })};\n`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(outFile, javascript);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await buildHongKongStreetLightClearance();
  console.log(JSON.stringify(result, null, 2));
}
