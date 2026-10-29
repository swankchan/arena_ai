// Hong Kong geodata build: OSM -> world-space land, roads, blocks with lots, parks, landmarks and a drivable graph.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFrame } from '../../geo/frame.mjs';
import { overpass } from '../../geo/osm.mjs';
import { landFromCoastline } from '../../geo/land.mjs';
import { buildRoads } from '../../geo/roads.mjs';
import { cutBlocks } from '../../geo/blocks.mjs';
import { buildParks } from '../../geo/parks.mjs';
import { buildLandmarks } from '../../geo/landmarks.mjs';
import { buildRoadGraph } from '../../geo/roadgraph.mjs';
import { emitGeo } from '../../geo/emit.mjs';
import { bbox, ringArea } from '../../geo/geom.mjs';
import { coastlineQuery, landmarksQuery, parksQuery, roadQueries } from './queries.mjs';

const DATA = fileURLToPath(new URL('../../data/hongkong/', import.meta.url));
const DEFAULT_OUT = fileURLToPath(new URL('../../../js/hk-geodata.js', import.meta.url));

const q = (v) => Math.round(v * 10) / 10;
const flat = (pts) => pts.flatMap(([x, z]) => [q(x), q(z)]);

export async function buildHongKong({ outFile = DEFAULT_OUT } = {}) {
  const { default: cfg } = await import('./config.mjs');
  const frame = makeFrame(cfg.frame);
  const b = cfg.dataBounds;

  // --- download / cache ---------------------------------------------------------------------------------------------
  const roadElements = [];
  for (const request of roadQueries(b)) {
    const json = await overpass(request.query, path.join(DATA, request.file));
    roadElements.push(...json.elements);
  }
  const coastline = await overpass(coastlineQuery(b), path.join(DATA, 'coastline.json'));
  const parksOsm = await overpass(parksQuery(b), path.join(DATA, 'parks.json'));
  const landmarksOsm = await overpass(landmarksQuery(b), path.join(DATA, 'landmarks.json'));

  // Tiles overlap at their shared edge; OSM ids are unique per type.
  const seen = new Set();
  const roadsOsm = roadElements.filter((el) => {
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`[hk] ${roadsOsm.length} road ways, ${coastline.elements.length} coastline ways, ${parksOsm.elements.length} park elements`);

  // --- land ---------------------------------------------------------------------------------------------------------
  const land = landFromCoastline({
    coastline,
    toWorld: frame.toWorld,
    bounds: b,
    res: 2,
    seaSeeds: cfg.seaSeeds,
    landChecks: cfg.landChecks
  });
  console.log(`[land] ${land.rings.length} land masses, ${land.areaKm2.toFixed(2)} km², ${land.segments} coastline segments`);

  // --- roads --------------------------------------------------------------------------------------------------------
  const roads = buildRoads(roadsOsm, frame.toWorld);
  console.log(`[roads] ${roads.roads.length} ways, ${roads.cuts.length} at-grade cut segments (${roads.skippedElevatedOrTunnelled} elevated/tunnel ways kept off the block cutter)`);

  const core = worldBounds(cfg.coreBounds, frame);
  const parksAll = buildParks(parksOsm.elements, frame.toWorld);
  const parks = parksAll.filter((p) => p.rings.some((flat) => overlapsBounds(flatBBox(flat), core)));
  const blocks = cutBlocks({
    landRings: land.rings,
    roads: roads.cuts,
    parks,
    bounds: core,
    res: cfg.res,
    sidewalk: cfg.sidewalk,
    strip: cfg.strip,
    minArea: cfg.minBlockArea,
    maxArea: cfg.maxBlockArea,
    minLotSide: cfg.minLotSide
  });

  // --- landmarks, graph ---------------------------------------------------------------------------------------------
  const landmarksAll = buildLandmarks(landmarksOsm.elements, frame.toWorld);
  const landmarks = Object.fromEntries(
    Object.entries(landmarksAll).filter(([, l]) => overlapsBounds(flatBBox(l.ring), core))
  );
  // Tunnels are underground and flyovers float above the blocks, so neither belongs on the 2D road layer. Emit the raw
  // at-grade ways rather than merging them: the map keeps every real named street segment, and the unnamed service lanes
  // stay in a separate background layer so the street layer itself is entirely named.
  const surfaced = roads.roads.filter((r) => !r.tunnel && !r.elevated);
  const mapRoads = surfaced.filter((r) => r.name && overlapsBounds(flatBBox(r.pts.flat()), core));
  const serviceRoads = surfaced.filter((r) => !r.name && overlapsBounds(flatBBox(r.pts.flat()), core));
  const graphRoads = surfaced.filter((r) => overlapsBounds(flatBBox(r.pts.flat()), core));
  const roadGraph = buildRoadGraph(graphRoads, { merge: 1.0 });

  const points = {};
  const pointNames = {};
  for (const p of cfg.points) {
    const [x, z] = frame.toWorld(p.lon, p.lat);
    points[p.id] = [q(x), q(z)];
    pointNames[p.id] = p.name;
  }

  const blockArea = blocks.reduce((total, blk) => total + blk.area, 0);
  const landArea = land.rings.reduce((total, r) => total + Math.abs(ringArea(r)), 0);
  console.log(`[hk] ${blocks.length} blocks, ${(blockArea / 1e6).toFixed(2)} km² built, ${(100 * blockArea / landArea).toFixed(0)}% of land`);
  console.log(`[hk] ${parks.length} parks, ${Object.keys(landmarks).length} landmarks, ${mapRoads.length} named road ways (+${serviceRoads.length} service lanes), ${roadGraph.links.length} road links`);

  const GEO = {
    version: 2,
    city: 'hongkong',
    frame: {
      bearingDeg: cfg.frame.bearingDeg,
      origin: { ...cfg.frame.origin, label: '中環 皇后像廣場' },
      units: 'm',
      bounds: { minX: q(core.minX), maxX: q(core.maxX), minZ: q(core.minZ), maxZ: q(core.maxZ) }
    },
    bounds: { minX: q(core.minX), maxX: q(core.maxX), minZ: q(core.minZ), maxZ: q(core.maxZ) },
    land: land.rings.map(flat),
    roads: mapRoads.map((r) => [r.name, q(r.w), r.dir, r.lanes, r.highway ? 1 : 0, flat(r.pts)]),
    serviceRoads: serviceRoads.map((r) => [r.name, q(r.w), r.dir, r.lanes, r.highway ? 1 : 0, flat(r.pts)]),
    roadGraph,
    blocks: blocks.map((blk) => [
      flat(blk.poly),
      blk.rects.map((r) => r.map(q)),
      blk.park || 0,
      blk.parkName || '',
      blk.rect ? 1 : 0,
      blk.frames ? blk.frames.map(([th, px, pz, rects]) => [Math.round(th * 1e4) / 1e4, q(px), q(pz), rects.map((r) => r.map(q))]) : 0
    ]),
    parks,
    landmarks,
    points,
    pointNames
  };

  emitGeo(GEO, outFile, {
    title: 'Hong Kong — Victoria Harbour, Central to Causeway Bay and Tsim Sha Tsui to Mong Kok.',
    sources: 'OpenStreetMap © OpenStreetMap contributors (ODbL); coastline, roads, parks and landmark footprints via Overpass.',
    note: 'Flat world: the Mid-Levels and the Peak are outside the detailed core.'
  });
  return GEO;
}

function worldBounds(latLonBounds, frame) {
  const corners = [
    [latLonBounds.west, latLonBounds.south], [latLonBounds.east, latLonBounds.south],
    [latLonBounds.west, latLonBounds.north], [latLonBounds.east, latLonBounds.north]
  ].map(([lon, lat]) => frame.toWorld(lon, lat));
  const bb = bbox(corners);
  return { minX: bb.x0, maxX: bb.x1, minZ: bb.z0, maxZ: bb.z1 };
}

// Flat [x0, z0, x1, z1, ...] geometry -> bounds. Used to drop layers that lie entirely outside the playable core
// (boundary-crossing geometry is kept whole so roads and parks do not end abruptly at the edge).
function flatBBox(flat) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = flat[i], z = flat[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

function overlapsBounds(bb, bounds) {
  return bb.maxX >= bounds.minX && bb.minX <= bounds.maxX && bb.maxZ >= bounds.minZ && bb.minZ <= bounds.maxZ;
}

// CLI dispatch name used by tools/build-city.mjs.
export const build = buildHongKong;
