// Binary raster with the scanline fill, exact Euclidean distance transform and morphology the block cutter needs.
// Ported from tools/geo-base.mjs; no city data is loaded here.
import { bbox, destair } from './geom.mjs';

// 4-connected component labelling of the 1-cells. Returns the label array plus one record per component.
export function labelComponents(mask, w, h) {
  const lab = new Int32Array(w * h);
  const comps = [];
  const stack = new Int32Array(w * h);
  for (let s0 = 0; s0 < w * h; s0++) {
    if (!mask[s0] || lab[s0]) continue;
    const id = comps.length + 1;
    let sp = 0, n = 0, i0 = w, i1 = -1, j0 = h, j1 = -1;
    stack[sp++] = s0;
    lab[s0] = id;
    while (sp) {
      const p = stack[--sp];
      n++;
      const i = p % w, j = (p - i) / w;
      if (i < i0) i0 = i;
      if (i > i1) i1 = i;
      if (j < j0) j0 = j;
      if (j > j1) j1 = j;
      if (i > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = id; stack[sp++] = p - 1; }
      if (i < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = id; stack[sp++] = p + 1; }
      if (j > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = id; stack[sp++] = p - w; }
      if (j < h - 1 && mask[p + w] && !lab[p + w]) { lab[p + w] = id; stack[sp++] = p + w; }
    }
    comps.push({ id, n, i0, i1, j0, j1, start: s0 });
  }
  return { lab, comps };
}

// Contour of one labelled component, in world metres. `short` is the stair-step length to collapse (res * 1.5).
export function traceComponent(raster, lab, comp, short = raster.res * 1.5) {
  const { w, h, res } = raster;
  const at = (i, j) => (i >= 0 && j >= 0 && i < w && j < h && lab[j * w + i] === comp.id ? 1 : 0);
  const si = comp.start % w, sj = (comp.start - si) / w;
  const DX = [1, 0, -1, 0], DZ = [0, 1, 0, -1];
  let cx = si, cz = sj, dir = 0;
  const pts = [];
  const start = `${cx},${cz},${dir}`;
  let guard = 0;
  do {
    pts.push([raster.x0 + cx * res, raster.z0 + cz * res]);
    cx += DX[dir];
    cz += DZ[dir];
    let left, right;
    if (dir === 0) { left = at(cx, cz - 1); right = at(cx, cz); }
    else if (dir === 1) { left = at(cx, cz); right = at(cx - 1, cz); }
    else if (dir === 2) { left = at(cx - 1, cz); right = at(cx - 1, cz - 1); }
    else { left = at(cx - 1, cz - 1); right = at(cx, cz - 1); }
    if (left && right) dir = (dir + 3) % 4;
    else if (!right) dir = (dir + 1) % 4;
    if (++guard > 40_000_000) throw new Error('component trace runaway');
  } while (`${cx},${cz},${dir}` !== start);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[(i + pts.length - 1) % pts.length], q = pts[i], n = pts[(i + 1) % pts.length];
    if ((q[0] - p[0]) * (n[1] - q[1]) - (q[1] - p[1]) * (n[0] - q[0]) !== 0) out.push(q);
  }
  return destair(out, short);
}

export class Raster {
  constructor(x0, z0, x1, z1, res) {
    this.res = res;
    this.x0 = Math.floor(x0 / res) * res;
    this.z0 = Math.floor(z0 / res) * res;
    this.w = Math.ceil((x1 - this.x0) / res) + 1;
    this.h = Math.ceil((z1 - this.z0) / res) + 1;
    this.d = new Uint8Array(this.w * this.h);
  }

  // Scanline fill of a ring (even-odd) with `val` into `target` (this.d by default).
  fillRing(ring, val = 1, target = this.d) {
    const { res, x0, z0, w, h } = this;
    const bb = bbox(ring);
    const jy0 = Math.max(0, Math.floor((bb.z0 - z0) / res));
    const jy1 = Math.min(h - 1, Math.ceil((bb.z1 - z0) / res));
    const xs = [];
    for (let j = jy0; j <= jy1; j++) {
      const z = z0 + (j + 0.5) * res;
      xs.length = 0;
      for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
        const [xa, za] = ring[k];
        const [xb, zb] = ring[i];
        if ((za > z) !== (zb > z)) xs.push(xa + ((z - za) * (xb - xa)) / (zb - za));
      }
      xs.sort((p, q) => p - q);
      for (let n = 0; n + 1 < xs.length; n += 2) {
        const i0 = Math.max(0, Math.ceil((xs[n] - x0) / res - 0.5));
        const i1 = Math.min(w - 1, Math.floor((xs[n + 1] - x0) / res - 0.5));
        for (let i = i0; i <= i1; i++) target[j * w + i] = val;
      }
    }
  }

  // Squared Euclidean distance (in cells) from every cell to the nearest cell where mask(v) is true (Felzenszwalb).
  edt(isSource) {
    const { w, h, d } = this;
    const INF = 1e20;
    const f = new Float64Array(Math.max(w, h));
    const out = new Float32Array(w * h);
    const v = new Int32Array(Math.max(w, h));
    const zz = new Float64Array(Math.max(w, h) + 1);
    const dt1 = (n, get, set) => {
      for (let q = 0; q < n; q++) f[q] = get(q);
      let k = 0;
      v[0] = 0;
      zz[0] = -INF;
      zz[1] = INF;
      for (let q = 1; q < n; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= zz[k]) {
          k--;
          s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        zz[k] = s;
        zz[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < n; q++) {
        while (zz[k + 1] < q) k++;
        set(q, (q - v[k]) * (q - v[k]) + f[v[k]]);
      }
    };
    for (let i = 0; i < w * h; i++) out[i] = isSource(d[i]) ? 0 : INF;
    for (let i = 0; i < w; i++) dt1(h, (q) => out[q * w + i], (q, val) => (out[q * w + i] = val));
    for (let j = 0; j < h; j++) dt1(w, (q) => out[j * w + q], (q, val) => (out[j * w + q] = val));
    return out;
  }

  // Morphological opening of the 1-cells with a disc of radius r metres.
  open(r) {
    const rc = (r / this.res) ** 2;
    const toWater = this.edt((x) => x === 0);
    const eroded = new Uint8Array(this.d.length);
    for (let i = 0; i < eroded.length; i++) eroded[i] = toWater[i] > rc ? 1 : 0;
    const save = this.d;
    this.d = eroded;
    const toEroded = this.edt((x) => x === 1);
    this.d = save;
    for (let i = 0; i < this.d.length; i++) this.d[i] = this.d[i] && toEroded[i] <= rc + 1e-6 ? 1 : 0;
  }

  // Morphological closing (fills inlets / gaps narrower than 2r).
  close(r) {
    const rc = (r / this.res) ** 2;
    const toLand = this.edt((x) => x === 1);
    const dil = new Uint8Array(this.d.length);
    for (let i = 0; i < dil.length; i++) dil[i] = toLand[i] <= rc ? 1 : 0;
    const save = this.d;
    this.d = dil;
    const toGap = this.edt((x) => x === 0);
    this.d = save;
    for (let i = 0; i < this.d.length; i++) this.d[i] = dil[i] && toGap[i] > rc ? 1 : 0;
  }

  // Keep only the 4-connected component containing the most cells.
  keepLargest() {
    const { w, h, d } = this;
    const lab = new Int32Array(w * h);
    let best = 0, bestN = 0, cur = 0;
    const stack = [];
    for (let s = 0; s < w * h; s++) {
      if (!d[s] || lab[s]) continue;
      cur++;
      let n = 0;
      stack.push(s);
      lab[s] = cur;
      while (stack.length) {
        const p = stack.pop();
        n++;
        const i = p % w, j = (p - i) / w;
        if (i > 0 && d[p - 1] && !lab[p - 1]) { lab[p - 1] = cur; stack.push(p - 1); }
        if (i < w - 1 && d[p + 1] && !lab[p + 1]) { lab[p + 1] = cur; stack.push(p + 1); }
        if (j > 0 && d[p - w] && !lab[p - w]) { lab[p - w] = cur; stack.push(p - w); }
        if (j < h - 1 && d[p + w] && !lab[p + w]) { lab[p + w] = cur; stack.push(p + w); }
      }
      if (n > bestN) { bestN = n; best = cur; }
    }
    for (let i = 0; i < w * h; i++) d[i] = lab[i] === best ? 1 : 0;
  }

  // Outer boundary of the (single) region as a ring of cell-corner points.
  traceOuter() {
    const { w, h, d, res, x0, z0 } = this;
    const at = (i, j) => (i >= 0 && j >= 0 && i < w && j < h ? d[j * w + i] : 0);
    let si = -1, sj = -1;
    outer: for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (at(i, j)) { si = i; sj = j; break outer; }
    if (si < 0) return [];
    const DX = [1, 0, -1, 0], DZ = [0, 1, 0, -1];
    let cx = si, cz = sj, dir = 0;
    const pts = [];
    const start = `${cx},${cz},${dir}`;
    let guard = 0;
    do {
      pts.push([x0 + cx * res, z0 + cz * res]);
      cx += DX[dir];
      cz += DZ[dir];
      const cellAt = (dxl, dzl) => at(cx + dxl, cz + dzl);
      let left, right;
      if (dir === 0) { left = cellAt(0, -1); right = cellAt(0, 0); }
      else if (dir === 1) { left = cellAt(0, 0); right = cellAt(-1, 0); }
      else if (dir === 2) { left = cellAt(-1, 0); right = cellAt(-1, -1); }
      else { left = cellAt(-1, -1); right = cellAt(0, -1); }
      if (left && right) dir = (dir + 3) % 4;
      else if (!left && right) { /* straight */ }
      else dir = (dir + 1) % 4;
      if (++guard > 50000000) throw new Error('trace runaway');
    } while (`${cx},${cz},${dir}` !== start);
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[(i + pts.length - 1) % pts.length], q = pts[i], n = pts[(i + 1) % pts.length];
      if ((q[0] - p[0]) * (n[1] - q[1]) - (q[1] - p[1]) * (n[0] - q[0]) !== 0) out.push(q);
    }
    return out.map((q, i) => {
      const n = out[(i + 1) % out.length];
      return [(q[0] + n[0]) / 2, (q[1] + n[1]) / 2];
    });
  }

  // Paint a capsule (thick segment) as 0 over the 1-cells.
  stampSegment(x0, z0, x1, z1, r) {
    const { res, w, h, d } = this;
    const ix0 = Math.max(0, Math.floor((Math.min(x0, x1) - r - this.x0) / res));
    const ix1 = Math.min(w - 1, Math.ceil((Math.max(x0, x1) + r - this.x0) / res));
    const iz0 = Math.max(0, Math.floor((Math.min(z0, z1) - r - this.z0) / res));
    const iz1 = Math.min(h - 1, Math.ceil((Math.max(z0, z1) + r - this.z0) / res));
    if (ix0 > ix1 || iz0 > iz1) return;
    const dx = x1 - x0, dz = z1 - z0;
    const L2 = dx * dx + dz * dz || 1e-9;
    const r2 = r * r;
    for (let j = iz0; j <= iz1; j++) {
      const pz = this.z0 + (j + 0.5) * res;
      for (let i = ix0; i <= ix1; i++) {
        const k = j * w + i;
        if (!d[k]) continue;
        const px = this.x0 + (i + 0.5) * res;
        let t = ((px - x0) * dx + (pz - z0) * dz) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = x0 + t * dx - px, ez = z0 + t * dz - pz;
        if (ex * ex + ez * ez <= r2) d[k] = 0;
      }
    }
  }

  // Draw a 1-cell-thick barrier line (used for OSM coastlines). Thickened to 3×3 so a 4-connected flood cannot slip
  // through the diagonal gaps between samples.
  drawBarrier(x0, z0, x1, z1) {
    const { res, w, h } = this;
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (res * 0.35));
    for (let s = 0; s <= steps; s++) {
      const t = steps ? s / steps : 0;
      const i = Math.floor((x0 + (x1 - x0) * t - this.x0) / res);
      const j = Math.floor((z0 + (z1 - z0) * t - this.z0) / res);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue;
          this.d[jj * w + ii] = 1;
        }
      }
    }
  }
}
