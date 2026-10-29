// Transport Department Traffic Aids Drawings -> the Hong Kong simulation frame.
// The GeoJSON files are the official geometry. This stage only transforms coordinates and compacts attributes; dash
// modules, stripe faces and signal assemblies are derived later by js/cities/hongkong/traffic-aid-geometry.js.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const q = (value) => Math.round(value * 1000) / 1000;
const flat = (points, toWorld) => points.flatMap(([lon, lat]) => {
  const [x, z] = toWorld(lon, lat);
  if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error(`Non-finite traffic-aid coordinate ${lon},${lat}`);
  return [q(x), q(z)];
});

function readLayer(dataDir, manifest, name) {
  const entry = manifest.layers[name];
  if (!entry) throw new Error(`Traffic-aid provenance has no ${name} entry`);
  const raw = fs.readFileSync(path.join(dataDir, entry.file));
  const sha256 = createHash('sha256').update(raw).digest('hex');
  if (sha256 !== entry.sha256) throw new Error(`${entry.file} SHA-256 differs from source.json`);
  const data = JSON.parse(raw);
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error(`${entry.file} is not GeoJSON`);
  if (data.features.length !== entry.count) throw new Error(`${entry.file} count differs from source.json`);
  for (const feature of data.features) {
    if (!feature.geometry || !feature.properties || !Number.isFinite(feature.properties.OBJECTID)) {
      throw new Error(`${entry.file} contains a feature without geometry, properties or OBJECTID`);
    }
  }
  return data.features;
}

function lines(features, toWorld, layer) {
  const out = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    const sourceParts = geometry.type === 'LineString' ? [geometry.coordinates] :
      geometry.type === 'MultiLineString' ? geometry.coordinates : null;
    if (!sourceParts) throw new Error(`${layer} ${feature.properties.OBJECTID}: unsupported ${geometry.type}`);
    const record = {
      id: feature.properties.OBJECTID,
      layer,
      parts: sourceParts.map((part) => flat(part, toWorld))
    };
    if (feature.properties.LINETYPE != null) record.type = String(feature.properties.LINETYPE).toUpperCase();
    if (feature.properties.ELEVATION != null) record.elevation = feature.properties.ELEVATION;
    out.push(record);
  }
  return out;
}

function polygons(features, toWorld, layer) {
  const out = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    const sourceRings = geometry.type === 'Polygon' ? geometry.coordinates :
      geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : null;
    if (!sourceRings) throw new Error(`${layer} ${feature.properties.OBJECTID}: unsupported ${geometry.type}`);
    out.push({
      id: feature.properties.OBJECTID,
      layer,
      rings: sourceRings.map((ring) => flat(ring, toWorld))
    });
  }
  return out;
}

function points(features, toWorld, layer) {
  return features.map((feature) => {
    if (feature.geometry.type !== 'Point') throw new Error(`${layer}: expected Point geometry`);
    const [x, z] = flat([feature.geometry.coordinates], toWorld);
    const record = {
      id: feature.properties.OBJECTID,
      layer,
      code: String(feature.properties.REFNAME ?? '').toUpperCase(),
      angle: Number.isFinite(feature.properties.ANGLE) ? feature.properties.ANGLE : null,
      x, z
    };
    if (feature.properties.ELEVATION != null) record.elevation = feature.properties.ELEVATION;
    return record;
  });
}

export function buildTrafficAids({ frame, dataDir }) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'source.json'), 'utf8'));
  const read = (name) => readLayer(dataDir, manifest, name);
  const road = lines(read('DTAD_RD_MARK_LINE'), frame.toWorld, 'DTAD_RD_MARK_LINE');
  const representation = lines(read('DTAD_RD_MARK_LINE_C'), frame.toWorld, 'DTAD_RD_MARK_LINE_C');
  const crossings = lines(read('DTAD_CROSSING_LINE'), frame.toWorld, 'DTAD_CROSSING_LINE');
  const yellowBoxes = lines(read('DTAD_YL_BOX_LINE'), frame.toWorld, 'DTAD_YL_BOX_LINE');
  const yellowBoxPolygons = polygons(read('DTAD_YL_BOX_POLY'), frame.toWorld, 'DTAD_YL_BOX_POLY');
  const signals = points(read('DTAD_TRAFFIC_LIGHT_PT'), frame.toWorld, 'DTAD_TRAFFIC_LIGHT_PT');

  const aids = {
    schema: 1,
    bbox: manifest.bbox,
    source: {
      dataset: manifest.dataset,
      datasetUrl: manifest.datasetUrl,
      publisher: manifest.publisher,
      mirrorItemId: manifest.mirror.itemId,
      mirrorUrl: manifest.mirror.itemUrl,
      sourceUpdated: manifest.mirror.sourceUpdated,
      retrieved: manifest.retrieved,
      manifest: 'tools/data/hongkong/traffic-aids/source.json'
    },
    marks: [...road, ...representation],
    crossings,
    yellowBoxes,
    yellowBoxPolygons,
    signals
  };
  console.log(`[traffic-aids] ${road.length + representation.length} road-mark features, ${crossings.length} crossings, ` +
    `${yellowBoxes.length} yellow-box line features, ${yellowBoxPolygons.length} yellow-box polygons, ${signals.length} signal points`);
  return aids;
}
