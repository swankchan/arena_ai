// Overpass client + OSM element helpers. Results are cached as JSON next to the build so a city rebuild does not
// re-download 50 MB of roads every time. Set GEO_REFRESH=1 to force a download.
import fs from 'node:fs';
import path from 'node:path';

const ENDPOINTS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];
const UA = 'slop-cities-geodata/1.0 (three.js city simulation)';

export function readCache(file) {
  if (!fs.existsSync(file)) return null;
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(json.elements) ? json : null;
  } catch {
    return null;
  }
}

export async function overpass(query, cacheFile, { refresh = process.env.GEO_REFRESH === '1', tries = 3 } = {}) {
  const cached = refresh ? null : readCache(cacheFile);
  if (cached) {
    console.log(`[osm] cache ${path.basename(cacheFile)} — ${cached.elements.length} elements`);
    return cached;
  }
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  let lastError = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(240_000)
        });
        if (res.status !== 200) {
          lastError = new Error(`${endpoint} HTTP ${res.status}`);
          continue;
        }
        const text = await res.text();
        const json = JSON.parse(text);
        if (!Array.isArray(json.elements)) throw new Error('response has no elements array');
        if (json.remark && /error|timeout/i.test(json.remark)) throw new Error(json.remark);
        fs.writeFileSync(cacheFile, text);
        console.log(`[osm] downloaded ${path.basename(cacheFile)} — ${json.elements.length} elements, ${(text.length / 1e6).toFixed(1)} MB`);
        return json;
      } catch (error) {
        lastError = error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
  }
  throw lastError || new Error(`Overpass failed for ${cacheFile}`);
}

// --- Element geometry ------------------------------------------------------------------------------------------------

/** Every polyline of an OSM way/relation in world metres. */
export function elementLines(element, toWorld) {
  if (element.type === 'way') {
    return element.geometry ? [element.geometry.map((g) => toWorld(g.lon, g.lat))] : [];
  }
  const lines = [];
  for (const member of element.members || []) {
    if (member.type !== 'way' || !member.geometry || member.role === 'inner') continue;
    lines.push(member.geometry.map((g) => toWorld(g.lon, g.lat)));
  }
  return lines;
}

function closeRing(points) {
  const ring = points.slice();
  if (ring.length > 2) {
    const a = ring[0], b = ring[ring.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5) ring.pop();
  }
  return ring;
}

/** Closed rings of an OSM way/relation (relation outers are chained when split). */
export function elementRings(element, toWorld) {
  if (element.type === 'way') {
    const line = element.geometry ? element.geometry.map((g) => toWorld(g.lon, g.lat)) : [];
    return line.length > 3 ? [closeRing(line)] : [];
  }
  const parts = (element.members || [])
    .filter((m) => m.type === 'way' && m.geometry && m.role !== 'inner')
    .map((m) => m.geometry.map((g) => toWorld(g.lon, g.lat)));
  const rings = [];
  const close = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5;
  while (parts.length) {
    let ring = parts.shift();
    for (let guard = 0; guard < 500 && !close(ring[0], ring[ring.length - 1]); guard++) {
      const i = parts.findIndex((p) => close(p[0], ring[ring.length - 1]) || close(p[p.length - 1], ring[ring.length - 1]));
      if (i < 0) break;
      const p = parts.splice(i, 1)[0];
      ring = ring.concat(close(p[0], ring[ring.length - 1]) ? p.slice(1) : p.reverse().slice(1));
    }
    if (ring.length > 3) rings.push(closeRing(ring));
  }
  return rings;
}

// --- Tags --------------------------------------------------------------------------------------------------------------

const CJK = /[\u3400-\u9fff]/;

/** Chinese name: explicit zh tags first, then the Chinese half of a bilingual `name`. */
export function zhName(tags = {}) {
  for (const key of ['name:zh', 'name:zh-Hant', 'name:zh-HK', 'name:zh-hant']) {
    if (tags[key]) return tags[key].trim();
  }
  const name = (tags.name || '').trim();
  if (!name) return '';
  if (!CJK.test(name)) return name;
  const tokens = name.split(/\s+/);
  const kept = [];
  for (const token of tokens) {
    if (CJK.test(token)) kept.push(token);
    else if (!kept.length) return name; // no leading Chinese token: keep the whole label
    else break;
  }
  return kept.join(' ') || name;
}

/** Width tag in metres, tolerating "12", "12 m" and "12;15". */
export function parseWidth(value) {
  if (value == null) return null;
  const first = String(value).split(';')[0];
  const n = parseFloat(first);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Direction of travel for the road graph: 1 = a->b, -1 = b->a, 0 = both. OSM geometry order is a->b. */
export function onewayDir(tags = {}) {
  const value = String(tags.oneway || '').toLowerCase();
  if (value === 'yes' || value === '1' || value === 'true') return 1;
  if (value === '-1' || value === 'reverse') return -1;
  if (tags.junction === 'roundabout') return 1;
  return 0;
}

export function isTunnel(tags = {}) {
  const layer = parseInt(tags.layer, 10);
  return tags.tunnel === 'yes' || tags.tunnel === 'building_passage' || (Number.isFinite(layer) && layer < 0);
}

export function isElevated(tags = {}) {
  const layer = parseInt(tags.layer, 10);
  return tags.bridge === 'yes' || tags.bridge === 'viaduct' || (Number.isFinite(layer) && layer > 0);
}
