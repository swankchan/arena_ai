// Street centrelines -> the drivable graph (nodes, links, name table) used by js/road-network.js.
//
// OSM ways are not guaranteed to be split at junctions (and merging same-name ways into long polylines definitely
// removes the intermediate ends), so linking only polyline endpoints shatters the graph. Instead: find every vertex
// shared by two or more different polylines, split each polyline there, and emit one link per piece. Vertices are
// matched within `merge` metres, the same tolerance the graph nodes use, because OSM junction coordinates can differ
// by a few decimetres between ways.
import { rdp } from './geom.mjs';

const CELL = 100003; // prime stride for the coordinate hash

export function buildRoadGraph(roads, { merge = 1.0, minComponent = 20 } = {}) {
  // At-grade, drivable polylines only. Tunnels and flyovers do not connect to the street grid.
  const lines = [];
  for (const road of roads) {
    if (!road.drivable || road.tunnel || road.elevated) continue;
    const pts = road.pts;
    if (!pts || pts.length < 2) continue;
    lines.push({ road, pts });
  }

  // Walk every vertex into a spatially-hashed table. A record touched by two different polylines is a junction.
  const vcells = new Map();
  const vkey = (ix, iz) => ix * CELL + iz;
  const vertexAt = (x, z) => {
    const ix = Math.floor(x / merge), iz = Math.floor(z / merge);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const rec of vcells.get(vkey(ix + dx, iz + dz)) || []) {
          if (Math.hypot(rec.x - x, rec.z - z) <= merge) return rec;
        }
      }
    }
    const rec = { x, z, line: -1, junction: false };
    const k = vkey(ix, iz);
    if (!vcells.has(k)) vcells.set(k, []);
    vcells.get(k).push(rec);
    return rec;
  };
  for (let li = 0; li < lines.length; li++) {
    for (const [x, z] of lines[li].pts) {
      const rec = vertexAt(x, z);
      if (rec.line < 0) rec.line = li;
      else if (rec.line !== li) rec.junction = true;
    }
  }
  const isJunction = (x, z) => vertexAt(x, z).junction;

  const nodes = [];
  const cells = new Map();
  const cellKey = (ix, iz) => ix * CELL + iz;
  function nodeAt(x, z) {
    const ix = Math.floor(x / merge), iz = Math.floor(z / merge);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const id of cells.get(cellKey(ix + dx, iz + dz)) || []) {
          if (Math.hypot(nodes[id][0] - x, nodes[id][1] - z) <= merge) return id;
        }
      }
    }
    const id = nodes.length;
    nodes.push([x, z]);
    const k = cellKey(ix, iz);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(id);
    return id;
  }

  const names = [];
  const nameIds = new Map();
  const nameId = (name) => {
    if (!nameIds.has(name)) { nameIds.set(name, names.length); names.push(name); }
    return nameIds.get(name);
  };

  const links = [];
  let splitLinks = 0;
  for (const { road, pts } of lines) {
    // Split at junction vertices, then simplify each piece; simplification never drops a junction because each piece
    // starts and ends at one.
    let start = 0;
    for (let i = 1; i < pts.length; i++) {
      const last = i === pts.length - 1;
      if (!last && !isJunction(pts[i][0], pts[i][1])) continue;
      const piece = pts.slice(start, i + 1);
      const a = nodeAt(piece[0][0], piece[0][1]);
      const b = nodeAt(piece[piece.length - 1][0], piece[piece.length - 1][1]);
      start = i;
      if (a === b) continue;
      const line = rdp(piece, 0.4);
      links.push([a, b, nameId(road.name || ''), Math.round(road.w * 10) / 10, road.lanes || 0, road.dir, line]);
      splitLinks++;
    }
  }

  // Keep every substantial connected component. A city split by a harbour has one network per shore; keeping only the
  // largest would leave the island (or Kowloon) without a drivable graph. Tiny orphan fragments are dropped.
  const used = new Map();
  const outNodes = [];
  const idOf = (i) => {
    if (!used.has(i)) {
      used.set(i, outNodes.length / 2);
      outNodes.push(Math.round(nodes[i][0] * 10) / 10, Math.round(nodes[i][1] * 10) / 10);
    }
    return used.get(i);
  };
  const outLinks = links.map(([a, b, n, w, lanes, dir, line]) => {
    const ia = idOf(a), ib = idOf(b);
    const inner = line.slice(2, -2).flatMap(([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10]);
    return [ia, ib, n, w, lanes, dir, inner];
  });

  const adjacency = Array.from({ length: outNodes.length / 2 }, () => []);
  for (const [a, b] of outLinks) { adjacency[a].push(b); adjacency[b].push(a); }
  const seen = new Uint8Array(adjacency.length);
  const components = [];
  for (let s = 0; s < adjacency.length; s++) {
    if (seen[s]) continue;
    const stack = [s];
    const comp = [];
    seen[s] = 1;
    while (stack.length) {
      const n = stack.pop();
      comp.push(n);
      for (const m of adjacency[n]) if (!seen[m]) { seen[m] = 1; stack.push(m); }
    }
    components.push(comp);
  }
  const keep = new Set();
  for (const comp of components) if (comp.length >= minComponent) for (const id of comp) keep.add(id);
  if (!keep.size && components.length) {
    const largest = components.reduce((best, comp) => (comp.length > best.length ? comp : best), components[0]);
    for (const id of largest) keep.add(id);
  }
  const remap = new Map();
  const nodesOut = [];
  for (const id of keep) {
    remap.set(id, nodesOut.length / 2);
    nodesOut.push(outNodes[id * 2], outNodes[id * 2 + 1]);
  }
  const linksOut = [];
  for (const [a, b, n, w, lanes, dir, inner] of outLinks) {
    if (!keep.has(a) || !keep.has(b)) continue;
    linksOut.push([remap.get(a), remap.get(b), n, w, lanes, dir, inner]);
  }

  const keptComponents = components.filter((comp) => comp.some((id) => keep.has(id))).length;
  console.log(`[roadgraph] ${lines.length} polylines, ${splitLinks} split links, ${nodesOut.length / 2} nodes, ${linksOut.length} links kept (${keptComponents} of ${components.length} components, >=${minComponent} nodes)`);
  return { nodes: nodesOut, links: linksOut, names };
}
