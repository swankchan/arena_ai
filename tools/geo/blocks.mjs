// Curb islands from a land polygon + at-grade road corridors, with building lots inside the property line.
// This is the Manhattan block cutter (tools/geo-blocks.mjs) with the city-specific bits removed: any land rings and
// any road segments work. Each block keeps the engine's contract:
//   poly   curb outline in world metres
//   rects  axis-aligned lots [x0, x1, z0, z1] (first frame)
//   frames [[θ, px, pz, rects], ...] lots laid out along the streets the block fronts, turned by θ about (px, pz)
import { Raster, labelComponents, traceComponent } from './raster.mjs';
import { bbox, destair, rdpRing, ringArea } from './geom.mjs';

const DEG = Math.PI / 180;
const wrap90 = (a) => ((((a + Math.PI / 4) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)) - Math.PI / 4;

// Greedy axis-aligned rectangles in a 0/1 mask (largest rectangle in a histogram), clearing as it goes.
function maskRects(m, w, h, maxRects = 8, minSide = 8, minCells = 120) {
  let total = 0;
  for (let k = 0; k < w * h; k++) total += m[k];
  const rects = [];
  const hist = new Int32Array(w);
  const stack = new Int32Array(w + 1);
  let covered = 0;
  for (let it = 0; it < maxRects; it++) {
    hist.fill(0);
    let best = 0, bi0 = 0, bi1 = 0, bj0 = 0, bj1 = 0;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) hist[i] = m[j * w + i] ? hist[i] + 1 : 0;
      let sp = 0;
      for (let i = 0; i <= w; i++) {
        const hh = i < w ? hist[i] : 0;
        while (sp && hist[stack[sp - 1]] >= hh) {
          const top = stack[--sp];
          const height = hist[top];
          const left = sp ? stack[sp - 1] + 1 : 0;
          const width = i - left;
          if (height >= minSide && width >= minSide) {
            const area = height * width;
            if (area > best) { best = area; bi0 = left; bi1 = i - 1; bj0 = j - height + 1; bj1 = j; }
          }
        }
        stack[sp++] = i;
      }
    }
    if (best < minCells || (rects.length && best < total * 0.06)) break;
    rects.push([bi0, bi1, bj0, bj1]);
    covered += best;
    for (let j = bj0; j <= bj1; j++) for (let i = bi0; i <= bi1; i++) m[j * w + i] = 0;
    if (covered > total * 0.93) break;
  }
  return rects;
}

export function cutBlocks({
  landRings,
  roads,
  parks = [],
  bounds = null,
  res = 1,
  sidewalk = 2.5,
  strip = 8,
  minArea = 150,
  maxArea = 120000,
  minLotSide = 10,
  maxRects = 10
}) {
  const bb = bbox(landRings.flat());
  const R = new Raster(bb.x0 - 4, bb.z0 - 4, bb.x1 + 4, bb.z1 + 4, res);
  for (const ring of landRings) R.fillRing(ring, 1);

  // Keep a waterfront esplanade clear of blocks.
  if (strip > 0) {
    const toWater = R.edt((v) => v === 0);
    const rc = (strip / res) ** 2;
    for (let i = 0; i < R.d.length; i++) R.d[i] = toWater[i] > rc ? 1 : 0;
  }

  for (const s of roads) R.stampSegment(s.x0, s.z0, s.x1, s.z1, s.r);
  const W = R.w, H = R.h;

  // Parkland per cell, so lots leave parks empty and the building generator can skip mostly-green blocks.
  const parkMask = new Uint16Array(W * H);
  parks.forEach((park, n) => {
    for (const flat of park.rings || []) {
      const ring = [];
      for (let i = 0; i + 1 < flat.length; i += 2) ring.push([flat[i], flat[i + 1]]);
      if (ring.length >= 3) R.fillRing(ring, n + 1, parkMask);
    }
  });

  const { lab, comps } = labelComponents(R.d, W, H);
  console.log(`[blocks] ${comps.length} curb islands labelled on ${W}×${H} cells @ ${res} m`);

  // Property line: square erosion by the sidewalk width, per component.
  const ER = Math.max(1, Math.round(sidewalk / res));
  const prop = new Uint8Array(W * H);
  {
    const tmp = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) {
      const row = j * W;
      let run = 0;
      const left = new Int32Array(W), right = new Int32Array(W);
      for (let i = 0; i < W; i++) {
        const L = lab[row + i];
        run = L && i > 0 && lab[row + i - 1] === L ? run + 1 : L ? 1 : 0;
        left[i] = run;
      }
      run = 0;
      for (let i = W - 1; i >= 0; i--) {
        const L = lab[row + i];
        run = L && i < W - 1 && lab[row + i + 1] === L ? run + 1 : L ? 1 : 0;
        right[i] = run;
      }
      for (let i = 0; i < W; i++) tmp[row + i] = lab[row + i] && left[i] > ER && right[i] > ER ? 1 : 0;
    }
    const up = new Int32Array(H), dn = new Int32Array(H);
    for (let i = 0; i < W; i++) {
      let run = 0;
      for (let j = 0; j < H; j++) {
        const k = j * W + i, L = lab[k];
        run = L && j > 0 && lab[k - W] === L ? run + 1 : L ? 1 : 0;
        up[j] = run;
      }
      run = 0;
      for (let j = H - 1; j >= 0; j--) {
        const k = j * W + i, L = lab[k];
        run = L && j < H - 1 && lab[k + W] === L ? run + 1 : L ? 1 : 0;
        dn[j] = run;
      }
      for (let j = 0; j < H; j++) prop[j * W + i] = tmp[j * W + i] && up[j] > ER && dn[j] > ER ? 1 : 0;
    }
  }
  // Building lots stop at the park boundary.
  for (let k = 0; k < prop.length; k++) if (parkMask[k]) prop[k] = 0;

  function lotRects(c) {
    const w = c.i1 - c.i0 + 1, h = c.j1 - c.j0 + 1;
    const m = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = (c.j0 + j) * W + c.i0 + i;
      if (prop[k] && lab[k] === c.id) m[j * w + i] = 1;
    }
    const rects = maskRects(m, w, h, maxRects, Math.round(minLotSide / res));
    return rects.map(([i0, i1, j0, j1]) => [
      R.x0 + (c.i0 + i0) * res, R.x0 + (c.i0 + i1 + 1) * res,
      R.z0 + (c.j0 + j0) * res, R.z0 + (c.j0 + j1 + 1) * res
    ]);
  }

  // Frontage frames for irregular blocks: cluster the outline's edge directions (mod 90°), re-rasterise the block in
  // each cluster's frame, erode by the sidewalk and cover it with lot rectangles in that frame.
  function blockFrames(c, poly) {
    const edges = [];
    let per = 0;
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i];
      const [bx, bz] = poly[(i + 1) % poly.length];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.5) continue;
      edges.push({ ax, az, bx, bz, L, phi: wrap90(Math.atan2(bz - az, bx - ax)), k: -1 });
      per += L;
    }
    const clusters = [];
    for (let n = 0; n < 3; n++) {
      let seed = null, seedW = 0;
      for (const e of edges) {
        if (e.k >= 0 || e.L < 4) continue;
        let w = 0;
        for (const f of edges) if (f.k < 0 && Math.abs(wrap90(f.phi - e.phi)) <= 7 * DEG) w += f.L;
        if (w > seedW) { seedW = w; seed = e; }
      }
      if (!seed || seedW < 14 || (n > 0 && seedW < per * 0.12)) break;
      const members = edges.filter((f) => f.k < 0 && Math.abs(wrap90(f.phi - seed.phi)) <= 7 * DEG);
      let sx = 0, sy = 0;
      for (const f of members) { sx += f.L * Math.cos(4 * f.phi); sy += f.L * Math.sin(4 * f.phi); }
      for (const f of members) f.k = clusters.length;
      clusters.push({ phi: Math.atan2(sy, sx) / 4 });
    }
    if (!clusters.length || (clusters.length === 1 && Math.abs(clusters[0].phi) < 2 * DEG)) return null;
    for (const e of edges) {
      if (e.k >= 0) continue;
      let bd = Infinity;
      clusters.forEach((cl, k) => { const d = Math.abs(wrap90(e.phi - cl.phi)); if (d < bd) { bd = d; e.k = k; } });
    }

    const w = c.i1 - c.i0 + 1, h = c.j1 - c.j0 + 1;
    const owner = new Int8Array(w * h).fill(-1);
    for (let j = 0; j < h; j++) {
      const pz = R.z0 + (c.j0 + j + 0.5) * res;
      for (let i = 0; i < w; i++) {
        if (lab[(c.j0 + j) * W + c.i0 + i] !== c.id) continue;
        if (clusters.length === 1) { owner[j * w + i] = 0; continue; }
        const px = R.x0 + (c.i0 + i + 0.5) * res;
        let bd = Infinity, bk = 0;
        for (const e of edges) {
          const dx = e.bx - e.ax, dz = e.bz - e.az;
          let t = ((px - e.ax) * dx + (pz - e.az) * dz) / (e.L * e.L);
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = e.ax + t * dx - px, ez = e.az + t * dz - pz;
          const d = ex * ex + ez * ez;
          if (d < bd) { bd = d; bk = e.k; }
        }
        owner[j * w + i] = bk;
      }
    }

    const px = R.x0 + ((c.i0 + c.i1 + 1) * res) / 2;
    const pz = R.z0 + ((c.j0 + c.j1 + 1) * res) / 2;
    const views = clusters.map((cl, k) => {
      const th = -cl.phi;
      const cs = Math.cos(th), sn = Math.sin(th);
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const [x, z] of [[c.i0, c.j0], [c.i1 + 1, c.j0], [c.i0, c.j1 + 1], [c.i1 + 1, c.j1 + 1]]) {
        const dx = R.x0 + x * res - px, dz = R.z0 + z * res - pz;
        const u = px + dx * cs - dz * sn, v = pz + dx * sn + dz * cs;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u);
        v0 = Math.min(v0, v); v1 = Math.max(v1, v);
      }
      u0 = Math.floor(u0); v0 = Math.floor(v0);
      const lw = Math.ceil(u1 - u0) + 1, lh = Math.ceil(v1 - v0) + 1;
      const isl = new Uint8Array(lw * lh);
      const reg = new Uint8Array(lw * lh);
      const parkView = new Uint8Array(lw * lh);
      const cell = new Int32Array(lw * lh).fill(-1);
      for (let j = 0; j < lh; j++) {
        const dv = v0 + j + 0.5 - pz;
        for (let i = 0; i < lw; i++) {
          const du = u0 + i + 0.5 - px;
          const x = px + du * cs + dv * sn, z = pz - du * sn + dv * cs;
          const gi = Math.floor((x - R.x0) / res) - c.i0, gj = Math.floor((z - R.z0) / res) - c.j0;
          if (gi < 0 || gj < 0 || gi >= w || gj >= h) continue;
          const o = owner[gj * w + gi];
          if (o < 0) continue;
          isl[j * lw + i] = 1;
          cell[j * lw + i] = gj * w + gi;
          if (parkMask[(c.j0 + gj) * W + c.i0 + gi]) parkView[j * lw + i] = 1;
          if (o === k) reg[j * lw + i] = 1;
        }
      }
      const tmp = new Uint8Array(lw * lh);
      for (let j = 0; j < lh; j++) {
        let run = 0;
        const left = new Int32Array(lw);
        for (let i = 0; i < lw; i++) { run = isl[j * lw + i] ? run + 1 : 0; left[i] = run; }
        run = 0;
        for (let i = lw - 1; i >= 0; i--) { run = isl[j * lw + i] ? run + 1 : 0; tmp[j * lw + i] = left[i] > ER && run > ER ? 1 : 0; }
      }
      const lprop = new Uint8Array(lw * lh);
      for (let i = 0; i < lw; i++) {
        let run = 0;
        const up = new Int32Array(lh);
        for (let j = 0; j < lh; j++) { run = isl[j * lw + i] ? run + 1 : 0; up[j] = run; }
        run = 0;
        for (let j = lh - 1; j >= 0; j--) {
          run = isl[j * lw + i] ? run + 1 : 0;
          lprop[j * lw + i] = tmp[j * lw + i] && up[j] > ER && run > ER ? 1 : 0;
        }
      }
      for (let k = 0; k < lprop.length; k++) if (parkView[k]) lprop[k] = 0;
      return { th, u0, v0, lw, lh, prop: lprop, reg, cell, rects: [] };
    });

    const used = new Uint8Array(w * h);
    const markUsed = (k) => {
      const gi = k % w, gj = (k - gi) / w;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const i = gi + di, j = gj + dj;
        if (i >= 0 && j >= 0 && i < w && j < h) used[j * w + i] = 1;
      }
    };
    for (const pass of [1, 2]) {
      for (const vw of views) {
        const { lw, lh, prop: lp, reg, cell } = vw;
        const m = new Uint8Array(lw * lh);
        for (let k = 0; k < lw * lh; k++) m[k] = lp[k] && (pass === 2 || reg[k]) && cell[k] >= 0 && !used[cell[k]] ? 1 : 0;
        const rects = maskRects(m, lw, lh, pass === 1 ? 6 : 4, Math.max(6, Math.round(minLotSide / res)));
        for (const [i0, i1, j0, j1] of rects) {
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (cell[j * lw + i] >= 0) markUsed(cell[j * lw + i]);
          vw.rects.push([vw.u0 + i0, vw.u0 + i1 + 1, vw.v0 + j0, vw.v0 + j1 + 1]);
        }
      }
    }
    const frames = views.filter((vw) => vw.rects.length).map((vw) => [vw.th, px, pz, vw.rects]);
    return frames.length ? frames : null;
  }

  const blocks = [];
  let small = 0, huge = 0, outside = 0;
  for (const c of comps) {
    const area = c.n * res * res;
    if (area < minArea) { small++; continue; }
    if (area > maxArea) { huge++; continue; }
    const cx = R.x0 + ((c.i0 + c.i1 + 1) * res) / 2;
    const cz = R.z0 + ((c.j0 + c.j1 + 1) * res) / 2;
    if (bounds && (cx < bounds.minX || cx > bounds.maxX || cz < bounds.minZ || cz > bounds.maxZ)) { outside++; continue; }
    let poly = rdpRing(traceComponent(R, lab, c), 0.5);
    if (poly.length < 3) continue;
    if (ringArea(poly) > 0) poly.reverse();
    const bw = (c.i1 - c.i0 + 1) * res, bd = (c.j1 - c.j0 + 1) * res;
    const rectness = area / (bw * bd);
    const rects = area >= 300 ? lotRects(c) : [];
    const frames = rectness <= 0.985 && area >= 300 ? blockFrames(c, poly) : null;
    let parkCells = 0;
    const parkCounts = new Map();
    for (let j = c.j0; j <= c.j1; j++) {
      for (let i = c.i0; i <= c.i1; i++) {
        const k = j * W + i;
        if (lab[k] !== c.id || !parkMask[k]) continue;
        parkCells++;
        parkCounts.set(parkMask[k], (parkCounts.get(parkMask[k]) || 0) + 1);
      }
    }
    const park = Math.min(1, Math.round((parkCells / area) * 100) / 100);
    let parkName = '';
    if (park > 0.25 && parkCounts.size) {
      let best = 0, bestN = -1;
      for (const [id, n] of parkCounts) if (n > bestN) { bestN = n; best = id; }
      parkName = parks[best - 1]?.name || '';
    }
    blocks.push({ poly, area: Math.round(area), rect: rectness > 0.985, rects, frames, park, parkName });
  }
  console.log(`[blocks] ${blocks.length} blocks kept (${blocks.filter((b) => b.frames).length} with frontage frames); dropped ${small} specks, ${huge} oversized, ${outside} outside the core`);
  return blocks;
}
