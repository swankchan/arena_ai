// Build a reviewable inventory of every elevated record in the actual territory-wide driving dataset.
// The checked-in OSM JSON caches are a smaller subset of that dataset, so unmatched records remain explicitly
// unresolved instead of being guessed into a bridge category. Exact signatures make the tag supplementation safe.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeFrame } from '../../geo/frame.mjs';
import { buildRoads } from '../../geo/roads.mjs';
import { rdp } from '../../geo/geom.mjs';
import { HK_FULL_ROADS } from '../../../js/hk-full-roads-data.js';
import { HK_FULL_MAP } from '../../../js/hk-full-map-data.js';
import { CROSSING_ROUTES } from '../../../js/cities/hongkong/crossings.js';
import config from './config.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_DATA_DIR = path.resolve(HERE, '../../data/hongkong');
const DEFAULT_DOC = path.resolve(HERE, '../../../docs/hongkong-viaduct-inventory.md');
const MAP_TEMPLATE = path.resolve(HERE, 'viaduct-inventory-map.html');
const CACHE_FILES = ['roads_major.json', 'roads_minor_sw.json', 'roads_minor_se.json', 'roads_minor_nw.json', 'roads_minor_ne.json'];
const q = (value) => Math.round(value * 10) / 10;
const q3 = (value) => Math.round(value * 1000) / 1000;
const flat = (points) => points.flatMap(([x, z]) => [q(x), q(z)]);
const signature = (road) => JSON.stringify(road);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12).toUpperCase();

const CLASS_DEFINITIONS = [
  {
    id: 'confirmed-viaduct', label: '明確高架橋', color: '#00a88f',
    description: '精確配對的 OSM way 帶 bridge=viaduct；可進入通用幾何設計階段，但高度仍未核實。'
  },
  {
    id: 'confirmed-bridge', label: '明確橋樑', color: '#2387e8',
    description: '精確配對的 OSM way 帶 bridge=yes 或 man_made=bridge；仍需覆核橋型及高度。'
  },
  {
    id: 'review-layer-only', label: '只有正 layer', color: '#e5a72f',
    description: '已配對 tags，但只有正 layer 而沒有明確橋樑標記；不得直接升高。'
  },
  {
    id: 'review-special-bridge', label: '特殊橋樑標記', color: '#a876dc',
    description: 'bridge 類型不是 yes/viaduct，例如 covered 或 building；需要逐段判斷，不套用通用高架橋。'
  },
  {
    id: 'review-tag-unavailable', label: '待來源補全', color: '#ef7d54',
    description: '存在於實際全港道路檔，但舊 cache 沒有這條 way，未能核實 bridge/layer 原始 tags。'
  },
  {
    id: 'review-degenerate-geometry', label: '幾何待修復', color: '#d65f78',
    description: '道路簡化後長度為零；保留索引供修復，但不得產生橋面或橋墩。'
  },
  {
    id: 'existing-crossing', label: '已有專用橋隧模型', color: '#f1f5f7',
    description: '已屬於七條手動建模跨海通道；保留獨立模型，不重複生成通用橋。'
  },
  {
    id: 'excluded-tunnel', label: '隧道／排除', color: '#7c8790',
    description: '同時具有 elevated 與 tunnel 證據；不得送入高架橋生成器。'
  }
];
const CLASS_BY_ID = new Map(CLASS_DEFINITIONS.map((item) => [item.id, item]));

function dispositionFor(classification) {
  if (classification === 'existing-crossing') return 'existing-special-model';
  if (classification === 'excluded-tunnel') return 'exclude-from-viaducts';
  if (classification === 'confirmed-viaduct' || classification === 'confirmed-bridge') return 'generic-geometry-candidate';
  return 'manual-review-required';
}

function heightStatusFor(classification) {
  return classification === 'existing-crossing' ? 'procedural-not-surveyed' : 'unverified-no-elevation-data';
}

function classify(road, sourceRecordIndex, raw, crossingByIndex) {
  if (crossingByIndex.has(sourceRecordIndex)) return 'existing-crossing';
  const tags = raw?.tags || {};
  if ((road[4] & 4) || tags.tunnel) return 'excluded-tunnel';
  if (!raw) return 'review-tag-unavailable';
  if (tags.bridge === 'viaduct') return 'confirmed-viaduct';
  if (tags.bridge === 'yes' || (!tags.bridge && tags.man_made === 'bridge')) return 'confirmed-bridge';
  if (tags.bridge && tags.bridge !== 'no') return 'review-special-bridge';
  return 'review-layer-only';
}

function readCaches(dataDir) {
  const elements = [];
  const seen = new Set();
  const cacheSources = [];
  for (const filename of CACHE_FILES) {
    const json = JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf8'));
    cacheSources.push({ filename, elements: json.elements.length, source: json.source });
    if (json.source?.sha256 !== HK_FULL_ROADS.source.sha256
      || json.source?.sourceTimestamp !== HK_FULL_ROADS.source.sourceTimestamp) {
      throw new Error(`${filename} does not come from the same OSM extract as js/hk-full-roads-data.js`);
    }
    for (const element of json.elements) {
      const key = `${element.type}/${element.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      elements.push(element);
    }
  }
  return { elements, cacheSources };
}

function geometryMetrics(coordinates) {
  let length = 0, x = 0, z = 0;
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < coordinates.length; i += 2) {
    const px = coordinates[i], pz = coordinates[i + 1];
    bounds.minX = Math.min(bounds.minX, px); bounds.maxX = Math.max(bounds.maxX, px);
    bounds.minZ = Math.min(bounds.minZ, pz); bounds.maxZ = Math.max(bounds.maxZ, pz);
    if (i < 2) continue;
    const dx = px - coordinates[i - 2], dz = pz - coordinates[i - 1];
    const segment = Math.hypot(dx, dz);
    length += segment;
    x += (coordinates[i - 2] + dx * 0.5) * segment;
    z += (coordinates[i - 1] + dz * 0.5) * segment;
  }
  if (!length) { x = coordinates[0]; z = coordinates[1]; }
  return {
    lengthM: q3(length),
    centerX: q(length ? x / length : x),
    centerZ: q(length ? z / length : z),
    bounds: Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, q(value)]))
  };
}

function worldToLonLat(frame, x, z) {
  const shift = frame.gridUV(frame.origin.lon, frame.origin.lat);
  const u = x + shift[0], v = z + shift[1];
  const cs = Math.cos(frame.theta), sn = Math.sin(frame.theta);
  const east = u * cs - v * sn;
  const north = -u * sn - v * cs;
  return {
    lon: Number((frame.lon0 + east / frame.KX).toFixed(7)),
    lat: Number((frame.lat0 + north / frame.KY).toFixed(7))
  };
}

function rawSignature(road) {
  const flags = (road.highway ? 1 : 0) | (road.elevated ? 2 : 0) | (road.tunnel ? 4 : 0);
  return signature([road.name, q(road.w), road.dir, road.lanes, flags, flat(rdp(road.pts, 0.65))]);
}

function makeWayId(road) {
  // Names and tags may improve without changing the identity of the physical geometry.
  return `HKW-${hash(JSON.stringify([road[1], road[2], road[3], road[5]]))}`;
}

function makeWay(road, sourceRecordIndex, raw, crossingByIndex, frame) {
  const tags = raw?.tags || null;
  const metrics = geometryMetrics(road[5]);
  let classification = classify(road, sourceRecordIndex, raw, crossingByIndex);
  if (metrics.lengthM <= 0 && classification !== 'existing-crossing' && classification !== 'excluded-tunnel') {
    classification = 'review-degenerate-geometry';
  }
  const center = worldToLonLat(frame, metrics.centerX, metrics.centerZ);
  const selectedTags = tags ? Object.fromEntries([
    'bridge', 'layer', 'tunnel', 'covered', 'man_made', 'highway', 'lanes', 'width', 'maxspeed', 'ref', 'name', 'name:en', 'name:zh'
  ].filter((key) => tags[key] != null).map((key) => [key, tags[key]])) : null;
  return {
    id: makeWayId(road),
    sourceRecordIndex,
    osmWayId: raw?.id ?? null,
    tagMatch: raw ? 'exact-road-signature' : 'unavailable-in-checked-in-caches',
    classification,
    disposition: dispositionFor(classification),
    heightStatus: heightStatusFor(classification),
    crossingId: crossingByIndex.get(sourceRecordIndex)?.crossingId ?? null,
    name: road[0] || '',
    nameEn: tags?.['name:en'] || '',
    ref: tags?.ref || '',
    highway: tags?.highway ?? null,
    widthM: road[1], direction: road[2], lanes: road[3], flags: road[4],
    layer: tags && Number.isFinite(Number.parseInt(tags.layer, 10)) ? Number.parseInt(tags.layer, 10) : null,
    bridge: tags?.bridge ?? null,
    lengthM: metrics.lengthM,
    center: { x: metrics.centerX, z: metrics.centerZ, ...center },
    bounds: metrics.bounds,
    flat: [...road[5]],
    tags: selectedTags,
    groupId: null
  };
}

function namesCompatible(a, b, strict) {
  if (strict) return a.name === b.name;
  return !a.name || !b.name || a.name === b.name;
}

function layersCompatible(a, b) {
  return a.layer == null || b.layer == null || a.layer === b.layer;
}

function canJoin(a, b) {
  if (a.classification !== b.classification || a.crossingId || b.crossingId) return false;
  if (a.classification === 'review-degenerate-geometry') return false;
  if (a.direction !== b.direction || a.highway !== b.highway || !layersCompatible(a, b)) return false;
  if (a.classification === 'review-tag-unavailable') {
    return a.name === b.name && a.widthM === b.widthM && a.lanes === b.lanes && a.flags === b.flags;
  }
  if (a.classification === 'review-layer-only') {
    return namesCompatible(a, b, true) && a.layer === b.layer;
  }
  if (a.classification === 'review-special-bridge' && a.bridge !== b.bridge) return false;
  return namesCompatible(a, b, false);
}

function endpointKey(way, first) {
  const offset = first ? 0 : way.flat.length - 2;
  return `${way.flat[offset].toFixed(1)},${way.flat[offset + 1].toFixed(1)}`;
}

function groupWays(ways) {
  const parent = ways.map((_, index) => index);
  const find = (index) => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== index) { const next = parent[index]; parent[index] = root; index = next; }
    return root;
  };
  const join = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const endpoints = new Map();
  ways.forEach((way, index) => {
    if (way.crossingId) return;
    for (const first of [true, false]) {
      const key = endpointKey(way, first);
      if (!endpoints.has(key)) endpoints.set(key, []);
      endpoints.get(key).push(index);
    }
  });
  for (const indexes of endpoints.values()) {
    for (let i = 0; i < indexes.length; i++) {
      for (let j = i + 1; j < indexes.length; j++) {
        if (canJoin(ways[indexes[i]], ways[indexes[j]])) join(indexes[i], indexes[j]);
      }
    }
  }
  const components = new Map();
  ways.forEach((way, index) => {
    const key = way.crossingId ? `crossing:${way.crossingId}` : `run:${find(index)}`;
    if (!components.has(key)) components.set(key, []);
    components.get(key).push(way);
  });
  return [...components.values()];
}

function makeGroup(componentWays) {
  componentWays.sort((a, b) => a.sourceRecordIndex - b.sourceRecordIndex);
  const first = componentWays[0];
  const classification = first.classification;
  if (!componentWays.every((way) => way.classification === classification)) {
    throw new Error('A viaduct inventory group contains inconsistent classifications');
  }
  const wayIds = componentWays.map((way) => way.id).sort();
  const crossingId = first.crossingId;
  const id = crossingId
    ? `HKX-${crossingId.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`
    : `HKV-${hash(wayIds.join('|'))}`;
  const names = new Set(), namesEn = new Set(), refs = new Set(), layers = new Set(), bridges = new Set(), highways = new Set();
  const sourceRecordIndexes = [], osmWayIds = [];
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  let lengthM = 0, centerX = 0, centerZ = 0, matchedWayCount = 0;
  for (const way of componentWays) {
    way.groupId = id;
    if (way.name) names.add(way.name);
    if (way.nameEn) namesEn.add(way.nameEn);
    if (way.ref) refs.add(way.ref);
    if (way.layer != null) layers.add(way.layer);
    if (way.bridge != null) bridges.add(way.bridge);
    if (way.highway != null) highways.add(way.highway);
    if (way.tagMatch === 'exact-road-signature') matchedWayCount++;
    sourceRecordIndexes.push(way.sourceRecordIndex);
    if (way.osmWayId != null) osmWayIds.push(way.osmWayId);
    lengthM += way.lengthM;
    centerX += way.center.x * way.lengthM; centerZ += way.center.z * way.lengthM;
    bounds.minX = Math.min(bounds.minX, way.bounds.minX); bounds.maxX = Math.max(bounds.maxX, way.bounds.maxX);
    bounds.minZ = Math.min(bounds.minZ, way.bounds.minZ); bounds.maxZ = Math.max(bounds.maxZ, way.bounds.maxZ);
  }
  if (crossingId) {
    const crossingName = CROSSING_ROUTES.find((route) => route.crossingId === crossingId)?.name;
    if (crossingName) names.add(crossingName);
  }
  return {
    id, classification,
    disposition: dispositionFor(classification),
    heightStatus: heightStatusFor(classification),
    crossingId,
    names: [...names].sort(), namesEn: [...namesEn].sort(), refs: [...refs].sort(),
    wayCount: componentWays.length,
    carriagewayLengthM: q3(lengthM),
    center: { x: q(centerX / Math.max(lengthM, 1e-9)), z: q(centerZ / Math.max(lengthM, 1e-9)) },
    bounds,
    layerValues: [...layers].sort((a, b) => a - b),
    bridgeValues: [...bridges].sort(),
    highwayClasses: [...highways].sort(),
    tagCoverage: { matchedWayCount, totalWayCount: componentWays.length },
    sourceRecordIndexes,
    osmWayIds,
    wayIds,
    groupingEvidence: crossingId ? 'existing-crossing-definition' : 'shared-endpoints-and-compatible-attributes'
  };
}

function csvEscape(value) {
  if (value == null) return '';
  const text = Array.isArray(value) ? value.join(';') : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows) {
  return `﻿${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

function makeGroupCsv(groups, frame) {
  const rows = [[
    'group_id', 'classification', 'disposition', 'height_status', 'crossing_id', 'names', 'names_en', 'refs',
    'way_count', 'carriageway_length_m', 'center_lon', 'center_lat', 'min_x', 'max_x', 'min_z', 'max_z',
    'layer_values', 'bridge_values', 'highway_classes', 'tag_matched_ways', 'tag_total_ways',
    'source_record_indexes', 'osm_way_ids', 'way_ids'
  ]];
  for (const group of groups) {
    const center = worldToLonLat(frame, group.center.x, group.center.z);
    rows.push([
      group.id, group.classification, group.disposition, group.heightStatus, group.crossingId,
      group.names, group.namesEn, group.refs, group.wayCount, group.carriagewayLengthM, center.lon, center.lat,
      group.bounds.minX, group.bounds.maxX, group.bounds.minZ, group.bounds.maxZ,
      group.layerValues, group.bridgeValues, group.highwayClasses,
      group.tagCoverage.matchedWayCount, group.tagCoverage.totalWayCount,
      group.sourceRecordIndexes, group.osmWayIds, group.wayIds
    ]);
  }
  return csv(rows);
}

function makeWayCsv(ways) {
  const rows = [[
    'way_id', 'group_id', 'source_record_index', 'osm_way_id', 'tag_match', 'classification', 'disposition',
    'height_status', 'crossing_id', 'name', 'name_en', 'ref', 'highway', 'width_m', 'lanes', 'direction', 'flags',
    'layer', 'bridge', 'length_m', 'center_lon', 'center_lat', 'center_x', 'center_z', 'geometry_xz'
  ]];
  for (const way of ways) {
    const geometry = [];
    for (let i = 0; i < way.flat.length; i += 2) geometry.push(`${way.flat[i]},${way.flat[i + 1]}`);
    rows.push([
      way.id, way.groupId, way.sourceRecordIndex, way.osmWayId, way.tagMatch, way.classification, way.disposition,
      way.heightStatus, way.crossingId, way.name, way.nameEn, way.ref, way.highway, way.widthM, way.lanes,
      way.direction, way.flags, way.layer, way.bridge, way.lengthM, way.center.lon, way.center.lat,
      way.center.x, way.center.z, geometry.join(';')
    ]);
  }
  return csv(rows);
}

function makeSummary(ways, groups, sourceAudit) {
  const byClass = {};
  for (const definition of CLASS_DEFINITIONS) {
    const classWays = ways.filter((way) => way.classification === definition.id);
    const classGroups = groups.filter((group) => group.classification === definition.id);
    byClass[definition.id] = {
      wayCount: classWays.length,
      groupCount: classGroups.length,
      carriagewayLengthM: q3(classWays.reduce((sum, way) => sum + way.lengthM, 0))
    };
  }
  return {
    totalElevatedWays: ways.length,
    totalGroups: groups.length,
    carriagewayLengthM: q3(ways.reduce((sum, way) => sum + way.lengthM, 0)),
    byClass,
    sourceAudit
  };
}

function makeDocumentation(inventory) {
  const { summary } = inventory;
  const lines = [
    '# 香港高架橋資料 inventory',
    '',
    '> 這是道路來源與覆核清單，不是已測量橋高或可直接施工的結構模型。OSM `layer` 只表示上下次序，不是米。',
    '',
    '## 文件',
    '',
    '- `tools/data/hongkong/viaduct-inventory.json`：完整群組、逐段幾何、分類、來源索引及配對狀態。',
    '- `tools/data/hongkong/viaduct-groups.csv`：每個連續候選群組一列，適合試算表覆核。',
    '- `tools/data/hongkong/viaduct-ways.csv`：每個 elevated 道路記錄一列，保留幾何及原始 tags。',
    '- `tools/data/hongkong/viaduct-inventory-map.html`：可離線使用的分類地圖；支援縮放、搜尋、篩選及群組定位。',
    '',
    '## 覆核優先次序',
    '',
    '1. 先處理「明確高架橋」及「明確橋樑」，但只生成幾何草案，不直接採用推測高度。',
    '2. 「只有正 layer」、「特殊橋樑標記」、「待來源補全」及「幾何待修復」必須另外覆核，不得直接升高。',
    '3. 「已有專用橋隧模型」不可再生成通用橋；「隧道／排除」不可進入高架橋生成器。',
    '4. 群組只是按共同端點及相容屬性連接的資料段落，不等同已核實的工程結構邊界。',
    '',
    '## 總覽',
    '',
    `- 全港道路記錄：**${summary.sourceAudit.runtimeRoadRecords.toLocaleString('en-US')}**`,
    `- Elevated 道路記錄：**${summary.totalElevatedWays.toLocaleString('en-US')}**`,
    `- 候選／覆核群組：**${summary.totalGroups.toLocaleString('en-US')}**`,
    `- 車道橋段總長（雙向分開計算）：**${(summary.carriagewayLengthM / 1000).toFixed(1)} km**`,
    `- OSM 來源時間：**${inventory.source.sourceTimestamp}**`,
    '',
    '| 分類 | 路段數 | 群組數 | 車道總長 km | 處理方式 |',
    '| --- | ---: | ---: | ---: | --- |'
  ];
  for (const definition of inventory.definitions) {
    const item = summary.byClass[definition.id];
    lines.push(`| ${definition.label} | ${item.wayCount.toLocaleString('en-US')} | ${item.groupCount.toLocaleString('en-US')} | ${(item.carriagewayLengthM / 1000).toFixed(1)} | ${dispositionFor(definition.id)} |`);
  }
  lines.push(
    '',
    '## 來源可追溯性',
    '',
    `- 舊 OSM cache 的 drivable ways：**${summary.sourceAudit.cacheDrivableWays.toLocaleString('en-US')}**`,
    `- 以完整生成道路簽名精確配對：**${summary.sourceAudit.matchedRuntimeRecords.toLocaleString('en-US')}**`,
    `- 未能配對的 cache ways：**${summary.sourceAudit.unmatchedCacheWays.toLocaleString('en-US')}**`,
    `- Elevated 記錄具有原始 tag 補充：**${summary.sourceAudit.elevatedTaggedRecords.toLocaleString('en-US')}**`,
    `- Elevated 記錄仍待來源補全：**${summary.sourceAudit.elevatedTagUnavailableRecords.toLocaleString('en-US')}**`,
    '',
    '實際遊戲道路檔比舊 cache 大。兩者來自相同 SHA-256 的 OSM extract，但 cache 只是子集；因此本 inventory 以實際道路檔確保路段完整，並只為精確配對的記錄補上原始 OSM way ID 和 tags。未能配對的記錄會保留為「待來源補全」，絕不猜作明確橋樑。',
    '',
    '每段均有由方向、闊度、車道數及世界座標幾何產生的穩定 `HKW-…` ID，同時保留目前遊戲 `sourceRecordIndex`。重新生成後應先核對幾何 ID，不應只依賴可能重排的陣列索引。',
    '',
    '## 較長的明確橋樑候選群組',
    '',
    '| 群組 | 名稱 | 分類 | 路段 | 車道總長 km |',
    '| --- | --- | --- | ---: | ---: |'
  );
  const candidates = inventory.groups
    .filter((group) => group.names.length && (group.classification === 'confirmed-viaduct' || group.classification === 'confirmed-bridge'))
    .sort((a, b) => b.carriagewayLengthM - a.carriagewayLengthM || a.id.localeCompare(b.id))
    .slice(0, 20);
  for (const group of candidates) {
    lines.push(`| ${group.id} | ${group.names.join('／')} | ${CLASS_BY_ID.get(group.classification).label} | ${group.wayCount} | ${(group.carriagewayLengthM / 1000).toFixed(2)} |`);
  }
  lines.push(
    '',
    '## 日後建築物放置',
    '',
    '- 建築物排除區應使用逐段 `flat` 幾何及 `widthM` 建立精確道路緩衝；群組 `bounds` 只適合做空間索引，不能當成橋面外形。',
    '- 「待來源補全」及「隧道／排除」仍然是現有道路記錄，不得因為等待橋樑分類而開放給建築物覆蓋。',
    '- `sourceRecordIndex` 可直接對回現時遊戲道路；更新資料後則以 `HKW-…` 幾何 ID 核對是否仍為同一段。',
    '',
    '## 高度與日後建築使用限制',
    '',
    '- 所有新候選群組的 `heightStatus` 都是 `unverified-no-elevation-data`。不得把 `layer=1/2/3` 換算成假定橋高後當作事實保存。',
    '- 現有跨海模型的 `heightStatus` 是 `procedural-not-surveyed`，即現時展示高度也是程式設定，不是工程測量。',
    '- 日後放置橋底建築、道路或結構前，仍要核實橋面、淨空、橋墩及地面標高。這份文件能防止漏段及錯誤分類，但不能取代測量。',
    '',
    '## 重新生成',
    '',
    '```sh',
    'npm run build:hk-viaduct-inventory',
    '```',
    '',
    '輸出不含生成時間，同一輸入會產生相同文件。若日後補回完整 OSM cache，必須保持與道路檔相同的 source SHA-256，再重新生成以提升 tag 覆蓋率。',
    ''
  );
  return lines.join('\n');
}

export async function buildHongKongViaductInventory({ dataDir = DEFAULT_DATA_DIR, outDir = dataDir, docFile = DEFAULT_DOC } = {}) {
  const frame = makeFrame(config.frame);
  if (HK_FULL_MAP.source.sha256 !== HK_FULL_ROADS.source.sha256
    || HK_FULL_MAP.source.sourceTimestamp !== HK_FULL_ROADS.source.sourceTimestamp) {
    throw new Error('The full-map land context and full-roads geometry come from different OSM extracts');
  }
  const { elements, cacheSources } = readCaches(dataDir);
  const rawById = new Map(elements.filter((element) => element.type === 'way').map((element) => [element.id, element]));
  const cacheRoads = buildRoads(elements, frame.toWorld).roads.filter((road) => road.drivable);
  const bySignature = new Map();
  for (const road of cacheRoads) {
    const key = rawSignature(road);
    if (!bySignature.has(key)) bySignature.set(key, []);
    bySignature.get(key).push(road);
  }
  const crossingByIndex = new Map();
  for (const route of CROSSING_ROUTES) {
    for (const sourceRecordIndex of route.wayIds) {
      if (!crossingByIndex.has(sourceRecordIndex)) crossingByIndex.set(sourceRecordIndex, route);
    }
  }

  const matchedCacheIds = new Set();
  let matchedRuntimeRecords = 0, ambiguousRuntimeRecords = 0;
  const ways = [];
  HK_FULL_ROADS.roads.forEach((road, sourceRecordIndex) => {
    const matches = bySignature.get(signature(road)) || [];
    let cacheRoad = null;
    if (matches.length === 1) {
      cacheRoad = matches[0];
      matchedCacheIds.add(cacheRoad.id);
      matchedRuntimeRecords++;
    } else if (matches.length > 1) {
      ambiguousRuntimeRecords++;
    }
    if (!(road[4] & 2)) return;
    const raw = cacheRoad ? rawById.get(cacheRoad.id) : null;
    ways.push(makeWay(road, sourceRecordIndex, raw, crossingByIndex, frame));
  });
  const duplicateWayIds = ways.length - new Set(ways.map((way) => way.id)).size;
  if (duplicateWayIds) throw new Error(`${duplicateWayIds} duplicate geometry IDs require an explicit disambiguation rule`);

  const groups = groupWays(ways).map(makeGroup)
    .sort((a, b) => Math.min(...a.sourceRecordIndexes) - Math.min(...b.sourceRecordIndexes) || a.id.localeCompare(b.id));
  ways.sort((a, b) => a.sourceRecordIndex - b.sourceRecordIndex);
  const sourceAudit = {
    runtimeRoadRecords: HK_FULL_ROADS.roads.length,
    cacheDrivableWays: cacheRoads.length,
    matchedRuntimeRecords,
    ambiguousRuntimeRecords,
    unmatchedCacheWays: cacheRoads.filter((road) => !matchedCacheIds.has(road.id)).length,
    elevatedRuntimeRecords: ways.length,
    elevatedTaggedRecords: ways.filter((way) => way.tagMatch === 'exact-road-signature').length,
    elevatedTagUnavailableRecords: ways.filter((way) => way.tagMatch !== 'exact-road-signature').length,
    cacheFiles: cacheSources
  };
  const inventory = {
    schemaVersion: 1,
    dataset: 'hongkong-viaduct-inventory',
    generatedBy: 'tools/cities/hongkong/build-viaduct-inventory.mjs',
    source: HK_FULL_ROADS.source,
    frame: config.frame,
    bounds: HK_FULL_ROADS.bounds,
    notes: [
      'OSM layer is relative ordering, not elevation in metres.',
      'Groups are connected review runs, not verified engineering structure boundaries.',
      'Carriageway lengths count dual carriageways separately.',
      'Records without exact tag matches must remain manual-review-required.',
      'World geometry is the same rounded x/z geometry used by the current driving dataset.'
    ],
    definitions: CLASS_DEFINITIONS,
    summary: makeSummary(ways, groups, sourceAudit),
    groups,
    ways
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.dirname(docFile), { recursive: true });
  const outputs = {
    'viaduct-inventory.json': `${JSON.stringify(inventory)}\n`,
    'viaduct-groups.csv': makeGroupCsv(groups, frame),
    'viaduct-ways.csv': makeWayCsv(ways)
  };
  for (const [filename, content] of Object.entries(outputs)) fs.writeFileSync(path.join(outDir, filename), content);
  const places = config.fullMapLandChecks.map((place) => {
    const [x, z] = frame.toWorld(place.lon, place.lat);
    return { name: place.name, x: q(x), z: q(z) };
  });
  const mapData = JSON.stringify({ inventory, land: HK_FULL_MAP.land, places }).replace(/</g, '\\u003c');
  const template = fs.readFileSync(MAP_TEMPLATE, 'utf8');
  if (!template.includes('/*__VIADUCT_MAP_DATA__*/')) throw new Error('Viaduct map template has no data placeholder');
  fs.writeFileSync(path.join(outDir, 'viaduct-inventory-map.html'), template.replace('/*__VIADUCT_MAP_DATA__*/', mapData));
  fs.writeFileSync(docFile, makeDocumentation(inventory));
  console.log(`[hk-viaducts] ${ways.length} elevated ways, ${groups.length} groups`);
  for (const definition of CLASS_DEFINITIONS) {
    const item = inventory.summary.byClass[definition.id];
    console.log(`[hk-viaducts] ${definition.id}: ${item.wayCount} ways / ${item.groupCount} groups`);
  }
  console.log(`[hk-viaducts] exact tag coverage ${sourceAudit.elevatedTaggedRecords}/${ways.length}; unresolved ${sourceAudit.elevatedTagUnavailableRecords}`);
  console.log(`[hk-viaducts] wrote ${outDir} and ${docFile}`);
  return inventory;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = (flag, fallback) => {
    const index = process.argv.indexOf(flag);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
  };
  const dataDir = path.resolve(value('--data', DEFAULT_DATA_DIR));
  await buildHongKongViaductInventory({
    dataDir,
    outDir: path.resolve(value('--out-dir', dataDir)),
    docFile: path.resolve(value('--doc', DEFAULT_DOC))
  });
}
