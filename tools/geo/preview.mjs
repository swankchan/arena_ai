// Top-down PNG preview of a city's GEO layer: land, blocks/lots, parks, roads, landmarks, points and bounds.
// Pure Node (no canvas dependency); the same PNG writer as the land debugger.
import fs from 'node:fs';
import path from 'node:path';
import { writePng } from './png.mjs';

class Canvas {
  constructor(x0, z0, x1, z1, ppm) {
    this.x0 = x0;
    this.z0 = z0;
    this.ppm = ppm;
    this.w = Math.max(1, Math.ceil((x1 - x0) * ppm));
    this.h = Math.max(1, Math.ceil((z1 - z0) * ppm));
    this.rgb = Buffer.alloc(this.w * this.h * 3);
  }

  px(x) { return (x - this.x0) * this.ppm; }
  py(z) { return (z - this.z0) * this.ppm; }

  set(ix, iy, r, g, b) {
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const o = (iy * this.w + ix) * 3;
    this.rgb[o] = r;
    this.rgb[o + 1] = g;
    this.rgb[o + 2] = b;
  }

  fillAll(r, g, b) {
    for (let o = 0; o < this.rgb.length; o += 3) {
      this.rgb[o] = r;
      this.rgb[o + 1] = g;
      this.rgb[o + 2] = b;
    }
  }

  // Even-odd scanline polygon fill, world points [[x,z],...].
  fillPoly(points, r, g, b) {
    if (points.length < 3) return;
    const ys = points.map((p) => this.py(p[1]));
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const y1 = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      xs.length = 0;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const za = points[j][1], zb = points[i][1];
        if ((za > y / this.ppm + this.z0) !== (zb > y / this.ppm + this.z0)) {
          const t = ((y / this.ppm + this.z0) - za) / (zb - za);
          xs.push(this.px(points[j][0] + t * (points[i][0] - points[j][0])));
        }
      }
      xs.sort((a, b) => a - b);
      for (let n = 0; n + 1 < xs.length; n += 2) {
        const i0 = Math.max(0, Math.ceil(xs[n]));
        const i1 = Math.min(this.w - 1, Math.floor(xs[n + 1]));
        for (let x = i0; x <= i1; x++) this.set(x, y, r, g, b);
      }
    }
  }

  fillRect(x0, z0, x1, z1, r, g, b) {
    const i0 = Math.max(0, Math.floor(this.px(x0))), i1 = Math.min(this.w - 1, Math.ceil(this.px(x1)));
    const j0 = Math.max(0, Math.floor(this.py(z0))), j1 = Math.min(this.h - 1, Math.ceil(this.py(z1)));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.set(i, j, r, g, b);
  }

  stroke(points, r, g, b, width = 1) {
    const half = width / 2;
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1], [bx, bz] = points[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * this.ppm));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = this.px(ax + (bx - ax) * t), cy = this.py(az + (bz - az) * t);
        for (let dj = -half; dj <= half; dj++) for (let di = -half; di <= half; di++) {
          this.set(Math.round(cx + di), Math.round(cy + dj), r, g, b);
        }
      }
    }
  }

  dot(x, z, radius, r, g, b) {
    const cx = this.px(x), cy = this.py(z);
    const rr = Math.max(1, radius) ** 2;
    for (let dj = -radius; dj <= radius; dj++) for (let di = -radius; di <= radius; di++) {
      if (di * di + dj * dj <= rr) this.set(Math.round(cx + di), Math.round(cy + dj), r, g, b);
    }
  }

  rectOutline(x0, z0, x1, z1, r, g, b, width = 2) {
    this.stroke([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], r, g, b, width);
  }

  save(file) {
    return writePng(file, this.w, this.h, this.rgb);
  }
}

const pts = (flat) => {
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
};

const frameRect = (th, px, pz, [x0, x1, z0, z1]) => {
  const cs = Math.cos(th), sn = Math.sin(th);
  const toWorld = (x, z) => [px + (x - px) * cs + (z - pz) * sn, pz - (x - px) * sn + (z - pz) * cs];
  return [toWorld(x0, z0), toWorld(x1, z0), toWorld(x1, z1), toWorld(x0, z1)];
};

export function renderPreview(GEO, outFile, { ppm = 0.7, margin = 120, crop = null, grid = false } = {}) {
  const b = crop || GEO.bounds;
  const canvas = new Canvas(b.minX - (crop ? 0 : margin), b.minZ - (crop ? 0 : margin), b.maxX + (crop ? 0 : margin), b.maxZ + (crop ? 0 : margin), ppm);
  canvas.fillAll(14, 43, 70); // water

  for (const flat of GEO.land) canvas.fillPoly(pts(flat), 233, 227, 213);

  // Parks under the blocks so the block outlines still show.
  for (const park of GEO.parks) {
    for (const flat of park.rings) canvas.fillPoly(pts(flat), 111, 174, 90);
  }

  for (const [flat, rects, park, , , frames] of GEO.blocks) {
    const poly = pts(flat);
    canvas.fillPoly(poly, 207, 199, 184);
    canvas.stroke([...poly, poly[0]], 74, 68, 58, 1);
    for (const r of rects) canvas.fillPoly(frameRect(0, 0, 0, r), 179, 170, 153);
    if (frames) {
      for (const [th, px, pz, framedRects] of frames) {
        for (const r of framedRects) canvas.fillPoly(frameRect(th, px, pz, r), 179, 170, 153);
      }
    }
  }

  for (const park of GEO.parks) {
    for (const flat of park.rings) {
      const ring = pts(flat);
      canvas.stroke([...ring, ring[0]], 57, 110, 47, 1);
    }
  }

  for (const [name, w, , , highway, flat] of GEO.roads) {
    const color = highway ? [90, 90, 96] : [124, 122, 116];
    canvas.stroke(pts(flat), color[0], color[1], color[2], Math.max(1, Math.round(w * ppm * 0.25)));
  }

  for (const landmark of Object.values(GEO.landmarks)) {
    const ring = pts(landmark.ring);
    if (ring.length >= 3) canvas.stroke([...ring, ring[0]], 197, 107, 35, 1);
  }

  for (const [id, p] of Object.entries(GEO.points || {})) canvas.dot(p[0], p[1], 3, 214, 48, 48);

  if (grid) {
    // 500 m graticule with labels every km, so a crop can be located in world coordinates.
    const step = 500;
    const x0 = Math.ceil(canvas.x0 / step) * step, z0 = Math.ceil(canvas.z0 / step) * step;
    for (let x = x0; x <= canvas.x0 + canvas.w / ppm; x += step) {
      canvas.stroke([[x, canvas.z0], [x, canvas.z0 + canvas.h / ppm]], 40, 70, 90, 1);
    }
    for (let z = z0; z <= canvas.z0 + canvas.h / ppm; z += step) {
      canvas.stroke([[canvas.x0, z], [canvas.x0 + canvas.w / ppm, z]], 40, 70, 90, 1);
    }
  }

  canvas.rectOutline(b.minX, b.minZ, b.maxX, b.maxZ, 180, 36, 36, 2);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  canvas.save(outFile);
  console.log(`[preview] ${outFile} — ${canvas.w}×${canvas.h} px @ ${ppm} px/m, world x ${canvas.x0.toFixed(0)}..${(canvas.x0 + canvas.w / ppm).toFixed(0)}, z ${canvas.z0.toFixed(0)}..${(canvas.z0 + canvas.h / ppm).toFixed(0)}`);
  return { width: canvas.w, height: canvas.h };
}
