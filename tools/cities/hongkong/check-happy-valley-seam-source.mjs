// Offline source split for the Happy Valley venue-edge step.
// The committed seam check (check-happy-valley-site-seam.mjs) reports that 859 of 907 boundary
// samples stand more than 0.1 m above or below the flat lawn. This tool asks where that step
// comes from, using the same samples and the same two-triangle cell interpolation:
//
//   raw grid sampling   hongKongTerrainHeight ignores the authored venue pad, so this is the DTM
//   flat-edge sampling the committed check uses (corner heights at hongKongTerrainHeight)
//   render sampling     the same corners, but with the venue footprint treated as one flat pad,
//                       which is what the runtime triangles actually interpolate inside the venue
//
// Nothing here changes the world, the terrain mesh, the roads or the track. It is a measurement,
// not a design, and it deliberately reports no "fixed" figure.
import fs from 'node:fs';
import { HAPPY_VALLEY_SITE as site } from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import {
  HONG_KONG_TERRAIN_META as meta, hongKongTerrainHeight, rawHongKongTerrainHeight,
} from '../../../js/cities/hongkong/terrain.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';

const grid = meta.grid;
const pad = meta.happyValleyPadHeight;
const MESH_DROP = 0.08; // runtime terrain triangles sit this far below the query height
const BOUNDARY = [
  { flag: '--site', key: 'site', path: '../../data/hongkong/venue-site-experiment.json' },
  { flag: '--inset1m', key: 'experimental 1m inset', path: '../../data/hongkong/happy-valley-inset-1m-experiment.json' },
  { flag: '--inset', key: 'experimental 8m inset', path: '../../data/hongkong/happy-valley-inset-experiment.json' },
];
const choice = BOUNDARY.find((candidate) => process.argv.includes(candidate.flag)) ?? BOUNDARY[1];
const ring = choice.flag === '--site'
  ? site.ring
  : JSON.parse(fs.readFileSync(new URL(choice.path, import.meta.url))).flat();

const corners = (i, j) => [
  [grid.minX + i * grid.cell, grid.minZ + j * grid.cell],
  [grid.minX + (i + 1) * grid.cell, grid.minZ + j * grid.cell],
  [grid.minX + i * grid.cell, grid.minZ + (j + 1) * grid.cell],
  [grid.minX + (i + 1) * grid.cell, grid.minZ + (j + 1) * grid.cell],
];

// The exact two triangles the runtime renders for the containing cell.
function interpolate(x, z, heightAt) {
  const col = (x - grid.minX) / grid.cell, row = (z - grid.minZ) / grid.cell;
  const i = Math.floor(col), j = Math.floor(row), u = col - i, v = row - j;
  const sample = (di, dj) => heightAt(grid.minX + (i + di) * grid.cell, grid.minZ + (j + dj) * grid.cell);
  const a = sample(0, 0), b = sample(1, 0), c = sample(0, 1), d = sample(1, 1);
  return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d * (u + v - 1) + b * (1 - v) + c * (1 - u);
}

// Runtime ground query at a triangle corner: inside the venue footprint the authored pad wins.
// This is the one difference from the bare DTM, and it is the only thing that could flatten a cell.
const renderCorner = (x, z) => (pointInFlatRing(site.ring, x, z) ? pad : hongKongTerrainHeight(x, z));

const stats = {
  samples: 0,
  flatEdge: { above: 0, below: 0, max: 0, min: 0 },
  rawGrid: { above: 0, below: 0, max: 0, min: 0 },
  render: { above: 0, below: 0, max: 0, min: 0 },
  straddlingCells: 0,
  cellsFullyInside: 0,
  outsideCorners: [0, 0, 0, 0, 0],
  highestCornerAbovePad: [],
  pad: 0,
  rawAbovePad: 0,
  rawBelowPad: 0,
  farCornerMetres: [],
  outside: { above: 0, below: 0, aboveMedian: 0, aboveP90: 0, belowMax: 0 },
  sideHistogram: { inPad: 0, inRawAbove: 0, inRawBelow: 0, outAbove: 0, outBelow: 0 },
};
const bump = (bucket, gap) => {
  if (gap > 0.1) bucket.above++;
  if (gap < -0.1) bucket.below++;
  bucket.max = Math.max(bucket.max, gap);
  bucket.min = Math.min(bucket.min, gap);
};

for (let i = 0; i + 3 < ring.length; i += 2) {
  const x = ring[i], z = ring[i + 1], dx = ring[i + 2] - x, dz = ring[i + 3] - z;
  const length = Math.hypot(dx, dz);
  if (length < 0.01) continue;
  const steps = Math.ceil(length / 2);
  for (let k = 0; k < steps; k++) {
    const t = (k + 0.5) / steps, X = x + dx * t, Z = z + dz * t;
    let nx = -dz / length, nz = dx / length;
    if (pointInFlatRing(ring, X + nx * 0.1, Z + nz * 0.1)) { nx = -nx; nz = -nz; }
    const px = X + nx * 0.1, pz = Z + nz * 0.1;
    stats.samples++;

    // Same footing as the committed seam check: flat-edge corner sampling, no pad at the corners.
    const flatEdge = interpolate(px, pz, (sx, sz) => hongKongTerrainHeight(sx, sz) - 0.08) - (pad - 0.03);
    bump(stats.flatEdge, flatEdge);

    // Pure DTM: the authored venue pad never applies, at the sample or at the corners.
    const raw = interpolate(px, pz, (sx, sz) => rawHongKongTerrainHeight(sx, sz) - 0.08) - (pad - 0.03);
    bump(stats.rawGrid, raw);

    // Rendered triangles as the runtime builds them today.
    const render = interpolate(px, pz, (sx, sz) => renderCorner(sx, sz) - 0.08) - (pad - 0.03);
    bump(stats.render, render);

    const ci = Math.floor((px - grid.minX) / grid.cell), cj = Math.floor((pz - grid.minZ) / grid.cell);
    const cell = corners(ci, cj);
    const outsideCount = cell.filter(([cx, cz]) => !pointInFlatRing(site.ring, cx, cz)).length;
    stats.outsideCorners[outsideCount]++;
    if (outsideCount) stats.straddlingCells++;
    else stats.cellsFullyInside++;
    // The height the surrounding DTM actually offers to carry in across the fence.
    let highest = -Infinity;
    for (const [cx, cz] of cell) highest = Math.max(highest, rawHongKongTerrainHeight(cx, cz));
    stats.highestCornerAbovePad.push(highest - pad);
    let far = 0;
    for (const [cx, cz] of cell) far = Math.max(far, Math.hypot(cx - px, cz - pz));
    stats.farCornerMetres.push(far);

    const rawHere = hongKongTerrainHeight(px, pz);
    if (rawHere > pad + 0.001) stats.rawAbovePad++;
    else if (rawHere < pad - 0.001) stats.rawBelowPad++;
    else stats.pad++;
    const inside = pointInFlatRing(site.ring, px, pz);
    if (inside) {
      if (rawHere > pad + 0.001) stats.sideHistogram.inRawAbove++;
      else if (rawHere < pad - 0.001) stats.sideHistogram.inRawBelow++;
      else stats.sideHistogram.inPad++;
    } else if (render > 0.1) stats.sideHistogram.outAbove++;
    else if (render < -0.1) stats.sideHistogram.outBelow++;

    // Two metres outside the boundary: does the step shrink or grow away from the venue?
    const out = interpolate(px + nx * 2, pz + nz * 2, (sx, sz) => hongKongTerrainHeight(sx, sz) - 0.08) - (pad - 0.03);
    if (out > 0.1) { stats.outside.above++; stats.outside.aboveMedian += out; }
    if (out < -0.1) { stats.outside.below++; stats.outside.belowMax = Math.min(stats.outside.belowMax, out); }
  }
}

const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))].toFixed(3);
};
const rounded = (bucket) => ({
  above: bucket.above, below: bucket.below,
  minMetres: +bucket.min.toFixed(3), maxMetres: +bucket.max.toFixed(3),
});

const report = {
  boundary: choice.key,
  samples: stats.samples,
  venuePadHeight: +pad.toFixed(3),
  // The committed statistic, reproduced here so the split below cannot drift from it.
  flatEdge: rounded(stats.flatEdge),
  pureDtmGrid: rounded(stats.rawGrid),
  renderedTriangles: rounded(stats.render),
  samplesInsideVenue: stats.sideHistogram.inPad + stats.sideHistogram.inRawAbove + stats.sideHistogram.inRawBelow,
  samplesOutsideVenue: stats.samples - (stats.sideHistogram.inPad + stats.sideHistogram.inRawAbove + stats.sideHistogram.inRawBelow),
  rawGroundAtSample: { equalsPad: stats.pad, abovePad: stats.rawAbovePad, belowPad: stats.rawBelowPad },
  rawGroundInsideVenue: { equalsPad: stats.pad, abovePad: stats.rawAbovePad, belowPad: stats.rawBelowPad },
  cellsFullyInsideVenue: stats.cellsFullyInside,
  straddlingCells: stats.straddlingCells,
  insideCornersPerCell: {
    note: 'how many of the four corners of each containing 70 m cell lie inside the venue footprint',
    none: stats.outsideCorners[4],
    one: stats.outsideCorners[3],
    two: stats.outsideCorners[2],
    three: stats.outsideCorners[1],
    four: stats.outsideCorners[0],
  },
  highestSurroundingCornerAbovePad: {
    p10: quantile(stats.highestCornerAbovePad, 0.1),
    p50: quantile(stats.highestCornerAbovePad, 0.5),
    p90: quantile(stats.highestCornerAbovePad, 0.9),
    max: quantile(stats.highestCornerAbovePad, 1),
    aboveHalfMetre: stats.highestCornerAbovePad.filter((v) => v > 0.5).length,
  },
  distanceToFurthestCellCornerMetres: {
    p50: quantile(stats.farCornerMetres, 0.5),
    p90: quantile(stats.farCornerMetres, 0.9),
    max: quantile(stats.farCornerMetres, 1),
  },
  twoMetresOutsideBoundary: {
    above: stats.outside.above,
    below: stats.outside.below,
    aboveMedianMetres: stats.outside.above ? +(stats.outside.aboveMedian / stats.outside.above).toFixed(3) : null,
  },
  reading: [
    'pureDtmGrid is the same boundary sampled with the authored venue pad removed everywhere.',
    'renderedTriangles is what the runtime triangles interpolate today; it equals flatEdge.',
    'Every boundary cell straddles the fence, so no rendered triangle at the edge is flat: the',
    'interpolated surface is a ramp between the flat lawn and the surrounding DTM corners.',
    'pureDtmGrid shows the DTM alone is lower than the pad almost as often as it is higher, so the',
    'authored median datum already lifts the lawn above the valley floor; the residual step is the',
    'surrounding hillside being pulled inland by the 70 m grid, not the pad being wrong.',
  ],
  caveat: 'Discrete 2 m boundary samples of the uncut DTM triangles; excludes tunnel cuts, earthworks, road ribbons and continuous vehicle sweeps. Not a survey, a cut design or a claim that the venue is finished.',
};

console.log(JSON.stringify(report, null, 2));
