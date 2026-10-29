// OSM highway tags -> the road pieces the block cutter, road graph and map consume.
import { dedupe } from './geom.mjs';
import { isElevated, isTunnel, onewayDir, parseWidth, zhName } from './osm.mjs';

// Curb-to-curb widths by class, used when the way has neither `width` nor enough `lanes`.
export const CLASS_WIDTH = {
  motorway: 24, trunk: 22, primary: 18, secondary: 15, tertiary: 13,
  unclassified: 9.5, residential: 8.5, living_street: 7, pedestrian: 7, service: 5.5,
  motorway_link: 8, trunk_link: 8, primary_link: 7, secondary_link: 6, tertiary_link: 6
};

const DRIVABLE = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'unclassified', 'residential', 'living_street', 'service',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'
]);
const CUTS = new Set([...DRIVABLE, 'pedestrian']);

export function buildRoads(elements, toWorld) {
  const roads = [];
  const cuts = [];
  const names = new Set();
  let skipped = 0;

  for (const element of elements) {
    if (element.type !== 'way' || !element.geometry || element.geometry.length < 2) continue;
    const tags = element.tags || {};
    const cls = tags.highway;
    if (!CUTS.has(cls)) continue;
    if (tags.area === 'yes') continue;

    const pts = dedupe(element.geometry.map((g) => toWorld(g.lon, g.lat)), 0.2);
    if (pts.length < 2) continue;

    const name = zhName(tags);
    const lanes = parseInt(tags.lanes, 10);
    const width = parseWidth(tags.width) ?? (Number.isFinite(lanes) && lanes > 0 ? lanes * 3.2 + 2 : CLASS_WIDTH[cls]);
    const tunnel = isTunnel(tags);
    const elevated = isElevated(tags);
    const dir = onewayDir(tags);
    const highway = /^(motorway|trunk|primary)/.test(cls);
    const drivable = DRIVABLE.has(cls);

    roads.push({ id: element.id, name, cls, w: width, lanes: Number.isFinite(lanes) && lanes > 0 ? lanes : Math.max(1, Math.round((width - 2) / 3.2)), dir, tunnel, elevated, highway, drivable, pts });
    if (name) names.add(name);

    if (!tunnel && !elevated && drivable) {
      for (let i = 1; i < pts.length; i++) {
        cuts.push({ x0: pts[i - 1][0], z0: pts[i - 1][1], x1: pts[i][0], z1: pts[i][1], r: width / 2, name, cls });
      }
    } else if (!tunnel && !elevated && cls === 'pedestrian') {
      for (let i = 1; i < pts.length; i++) {
        cuts.push({ x0: pts[i - 1][0], z0: pts[i - 1][1], x1: pts[i][0], z1: pts[i][1], r: width / 2, name, cls });
      }
    } else {
      skipped++;
    }
  }

  // Map / road-graph polylines: chain same name + class + direction pieces end to end.
  const merged = mergeByName(roads);
  return { roads, cuts, merged, names, skippedElevatedOrTunnelled: skipped };
}

function keyOf(road) {
  return `${road.name || `#${road.id}`}|${Math.round(road.w)}|${road.cls}|${road.dir}`;
}

export function mergeByName(roads) {
  const groups = new Map();
  for (const road of roads) {
    const key = keyOf(road);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(road);
  }
  const out = [];
  for (const list of groups.values()) {
    const meta = list[0];
    // Only merge ways that actually touch; disconnected same-name roads stay separate.
    const pool = list.map((r) => r.pts.slice());
    while (pool.length) {
      let line = pool.shift();
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < pool.length; i++) {
          const other = pool[i];
          let next = null;
          if (near(line[line.length - 1], other[0])) next = line.concat(other.slice(1));
          else if (near(line[line.length - 1], other[other.length - 1])) next = line.concat(other.slice(0, -1).reverse());
          else if (near(line[0], other[other.length - 1])) next = other.slice(0, -1).concat(line);
          else if (near(line[0], other[0])) next = other.slice(1).reverse().concat(line);
          if (!next) continue;
          line = next;
          pool.splice(i, 1);
          changed = true;
          break;
        }
      }
      out.push({ name: meta.name, w: meta.w, lanes: meta.lanes, dir: meta.dir, cls: meta.cls, highway: meta.highway, tunnel: meta.tunnel, elevated: meta.elevated, pts: line });
    }
  }
  return out;
}

function near(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.75;
}
