// Land polygons from the OSM coastline. The coastline ways are barriers on a raster; a flood fill from known sea
// points marks the water, and whatever the sea cannot reach is land. This handles arbitrary harbour shapes, islands
// and reclamation without having to assemble closed coastline rings.
import { Raster, labelComponents, traceComponent } from './raster.mjs';
import { bbox, centroid, landWinding, pointInRing, rdpRing } from './geom.mjs';
import { writePng } from './png.mjs';

export function landFromCoastline({ coastline, toWorld, bounds, res = 2, seaSeeds = [], landChecks = [] }) {
  const corners = [
    [bounds.west, bounds.south], [bounds.east, bounds.south],
    [bounds.west, bounds.north], [bounds.east, bounds.north]
  ].map(([lon, lat]) => toWorld(lon, lat));
  const bb = bbox(corners);
  // No margin: the grid boundary itself seals coastline ways that end at the edge of the download box.
  const raster = new Raster(bb.x0, bb.z0, bb.x1, bb.z1, res);

  let segments = 0;
  const endpoints = [];
  const coastSegs = [];
  for (const element of coastline.elements) {
    if (element.type !== 'way' || !element.geometry) continue;
    let prev = null;
    for (const node of element.geometry) {
      const p = toWorld(node.lon, node.lat);
      if (prev) {
        raster.drawBarrier(prev[0], prev[1], p[0], p[1]);
        coastSegs.push([prev, p]);
        segments++;
      }
      prev = p;
    }
    if (element.geometry.length) {
      const first = toWorld(element.geometry[0].lon, element.geometry[0].lat);
      const lastNode = element.geometry[element.geometry.length - 1];
      const last = toWorld(lastNode.lon, lastNode.lat);
      endpoints.push({ p: first, id: element.id }, { p: last, id: element.id });
    }
  }

  // OSM coastlines are interrupted at ferry piers and active reclamation sites. Pair the loose ends that sit inside the
  // download bounds and bridge small gaps; without this the sea floods straight through into the city.
  const inside = ([x, z]) => {
    const margin = 60;
    return x > raster.x0 + margin && x < raster.x0 + raster.w * res - margin &&
      z > raster.z0 + margin && z < raster.z0 + raster.h * res - margin;
  };
  const loose = endpoints.filter((e) => {
    if (!inside(e.p)) return false;
    // A coincident endpoint is already connected to its neighbour; only genuinely loose ends need bridging.
    return !endpoints.some((f) => f !== e && f.id !== e.id &&
      Math.hypot(f.p[0] - e.p[0], f.p[1] - e.p[1]) < 1.5);
  });
  const used = new Uint8Array(loose.length);
  const pairs = [];
  for (let i = 0; i < loose.length; i++) {
    if (used[i]) continue;
    let best = -1, bestD = 450;
    for (let j = i + 1; j < loose.length; j++) {
      if (used[j] || loose[j].id === loose[i].id) continue;
      const d = Math.hypot(loose[i].p[0] - loose[j].p[0], loose[i].p[1] - loose[j].p[1]);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best >= 0) {
      used[i] = used[best] = 1;
      pairs.push([loose[i].p, loose[best].p, bestD]);
    }
  }
  for (const [a, b] of pairs) {
    raster.drawBarrier(a[0], a[1], b[0], b[1]);
    segments++;
  }
  if (pairs.length) {
    console.log(`[land] bridged ${pairs.length} coastline gaps (${pairs.map((p) => Math.round(p[2])).join(', ')} m)`);
  }

  // Seal loose ends at the download edge: extend every endpoint that sits near the border to the border itself, so
  // the flood cannot slip between the coastline's end and the raster frame.
  for (const e of endpoints) {
    if (inside(e.p)) continue;
    const x = Math.min(Math.max(e.p[0], raster.x0), raster.x0 + (raster.w - 1) * res);
    const z = Math.min(Math.max(e.p[1], raster.z0), raster.z0 + (raster.h - 1) * res);
    raster.drawBarrier(e.p[0], e.p[1], x, z);
  }

  // Seal the raster border. Coastline ways often stop a few metres inside the download box; without this the sea
  // wraps around their ends and floods the land from the edge.
  for (let i = 0; i < raster.w; i++) {
    raster.d[i] = 1;
    raster.d[(raster.h - 1) * raster.w + i] = 1;
  }
  for (let j = 0; j < raster.h; j++) {
    raster.d[j * raster.w] = 1;
    raster.d[j * raster.w + raster.w - 1] = 1;
  }

  const { w, h, d } = raster;
  let barrierCells = 0;
  for (let i = 0; i < d.length; i++) barrierCells += d[i];
  console.log(`[land] raster ${w}×${h} @ ${res} m, ${barrierCells} barrier cells, ${segments} segments`);
  const water = new Uint8Array(w * h);
  const seedMask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const seedWaterCell = (x, z) => {
    const i = Math.floor((x - raster.x0) / res);
    const j = Math.floor((z - raster.z0) / res);
    if (i < 0 || j < 0 || i >= w || j >= h) return;
    const k = j * w + i;
    if (d[k] || water[k]) return;
    water[k] = 1;
    seedMask[k] = 1;
    queue[tail++] = k;
  };

  // Nearest coastline segment, used to validate every seed. OSM convention: water is on the right of the coastline
  // direction, which in (x east, z south) is (-dz, dx), so the cross product below is negative for water.
  const nearestCoast = (x, z) => {
    let best = null, bestD2 = Infinity;
    for (const [a, b] of coastSegs) {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
      const ex = a[0] + t * dx - x, ez = a[1] + t * dz - z;
      const d2 = ex * ex + ez * ez;
      if (d2 < bestD2) { bestD2 = d2; best = [a, b]; }
    }
    const [a, b] = best;
    return {
      d: Math.sqrt(bestD2),
      side: (x - a[0]) * (b[1] - a[1]) - (z - a[1]) * (b[0] - a[0])
    };
  };

  // Offset a little to seaward of every coastline segment, then keep only candidates that are still on the water side
  // of their nearest segment. Fixed-radius offsets alone land inside piers and slipways (the flood then starts on land),
  // and offsets longer than a narrow slip can jump onto the opposite bank; 8 m stays in the water next to the shore.
  let rejected = 0;
  for (const [a, b] of coastSegs) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz);
    if (L < 0.01) continue;
    const nx = -dz / L, nz = dx / L;
    const steps = Math.max(1, Math.ceil(L / 20));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a[0] + dx * t, pz = a[1] + dz * t;
      const x = px + nx * 8, z = pz + nz * 8;
      const near = nearestCoast(x, z);
      if (near.d < 5 || near.side >= 0) { rejected++; continue; }
      seedWaterCell(x, z);
    }
  }
  if (rejected) console.log(`[land] rejected ${rejected} land-side seed candidates`);

  // Explicit fallback seeds for water bodies with no coastline inside the download box. Validate them the same way:
  // a hand-written coordinate is not evidence that the point is in the water.
  for (const seed of seaSeeds) {
    const [x, z] = toWorld(seed.lon, seed.lat);
    const near = nearestCoast(x, z);
    if (near.d >= 5 && near.side >= 0) {
      console.warn(`[land] sea seed "${seed.name}" is on the land side of the coastline — skipped`);
      continue;
    }
    seedWaterCell(x, z);
  }
  if (!tail) throw new Error('no water cells found on the seaward side of the coastline');
  while (head < tail) {
    const p = queue[head++];
    const i = p % w;
    const j = (p - i) / w;
    if (i > 0 && !d[p - 1] && !water[p - 1]) { water[p - 1] = 1; queue[tail++] = p - 1; }
    if (i < w - 1 && !d[p + 1] && !water[p + 1]) { water[p + 1] = 1; queue[tail++] = p + 1; }
    if (j > 0 && !d[p - w] && !water[p - w]) { water[p - w] = 1; queue[tail++] = p - w; }
    if (j < h - 1 && !d[p + w] && !water[p + w]) { water[p + w] = 1; queue[tail++] = p + w; }
  }

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = !water[i] && !d[i] ? 1 : 0;
  let waterCells = 0;
  for (let i = 0; i < water.length; i++) waterCells += water[i];
  console.log(`[land] water ${(waterCells * res * res / 1e6).toFixed(2)} km², land ${((w * h - waterCells - barrierCells) * res * res / 1e6).toFixed(2)} km²`);
  if (process.env.DEBUG_LAND) {
    const cols = 70;
    const step = Math.max(1, Math.floor(w / cols));
    const rowStep = step * 2;
    let art = '';
    for (let j = 0; j < h; j += rowStep) {
      for (let i = 0; i < w; i += step) {
        let hasBarrier = 0, hasWater = 0, hasLand = 0;
        for (let jj = j; jj < Math.min(h, j + rowStep); jj++) {
          for (let ii = i; ii < Math.min(w, i + step); ii++) {
            const k = jj * w + ii;
            if (d[k]) hasBarrier = 1;
            else if (water[k]) hasWater = 1;
            else hasLand = 1;
          }
        }
        art += hasBarrier ? '#' : hasWater ? '~' : '.';
      }
      art += '\n';
    }
    console.log(art);
  }
  if (process.env.DEBUG_LAND_IMAGE) {
    const scale = 3;
    const W = Math.floor(w / scale), H = Math.floor(h / scale);
    const rgb = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let barrier = 0, wet = 0, dry = 0;
        for (let jj = 0; jj < scale; jj++) for (let ii = 0; ii < scale; ii++) {
          const k = (y * scale + jj) * w + x * scale + ii;
          if (d[k]) barrier++;
          else if (water[k]) wet++;
          else dry++;
        }
        const o = (y * W + x) * 3;
        if (barrier > wet && barrier > dry) { rgb[o] = 25; rgb[o + 1] = 25; rgb[o + 2] = 25; }
        else if (wet > dry) {
          let seeded = 0;
          for (let jj = 0; jj < scale; jj++) for (let ii = 0; ii < scale; ii++) {
            if (seedMask[(y * scale + jj) * w + x * scale + ii]) seeded++;
          }
          if (seeded) { rgb[o] = 255; rgb[o + 1] = 220; rgb[o + 2] = 40; }
          else { rgb[o] = 40; rgb[o + 1] = 80; rgb[o + 2] = 160; }
        }
        else { rgb[o] = 90; rgb[o + 1] = 165; rgb[o + 2] = 90; }
      }
    }
    for (const check of landChecks) {
      const [x, z] = toWorld(check.lon, check.lat);
      const px = Math.round((x - raster.x0) / res / scale);
      const py = Math.round((z - raster.z0) / res / scale);
      for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) {
        const xx = px + di, yy = py + dj;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const o = (yy * W + xx) * 3;
        rgb[o] = 255; rgb[o + 1] = 30; rgb[o + 2] = 30;
      }
    }
    writePng(process.env.DEBUG_LAND_IMAGE, W, H, rgb);
    console.log(`[land] debug image ${process.env.DEBUG_LAND_IMAGE} (${W}×${H})`);
  }
  const { lab, comps } = labelComponents(mask, w, h);

  const rings = [];
  const kept = [];
  for (const comp of comps) {
    const area = comp.n * res * res;
    if (area < 3000) continue;
    let ring = rdpRing(traceComponent(raster, lab, comp), 1.2);
    if (ring.length < 4) continue;
    ring = landWinding(ring);
    rings.push(ring);
    kept.push({ comp, area });
  }
  rings.sort((a, b) => Math.abs(ringAreaOf(b)) - Math.abs(ringAreaOf(a)));

  // Sanity: every known land point must be inside some land ring and not in the flooded water.
  for (const check of landChecks) {
    const [x, z] = toWorld(check.lon, check.lat);
    const i = Math.floor((x - raster.x0) / res);
    const j = Math.floor((z - raster.z0) / res);
    const wet = i >= 0 && j >= 0 && i < w && j < h && water[j * w + i];
    const onLand = rings.some((ring) => pointInRing(ring, x, z));
    if (wet || !onLand) {
      throw new Error(`land check "${check.name}" at ${check.lat},${check.lon} came out ${wet ? 'water' : 'outside every land ring'} — coastline data or a sea seed is wrong`);
    }
  }

  return {
    raster,
    mask,
    water,
    lab,
    components: kept,
    rings,
    areaKm2: kept.reduce((total, k) => total + k.area, 0) / 1e6,
    segments
  };
}

function ringAreaOf(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return a / 2;
}
