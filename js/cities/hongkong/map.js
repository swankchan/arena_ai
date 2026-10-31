import { GEO } from '../../hk-geodata.js';
import { SCB_SITE } from './standard-chartered-architecture.js';
import { HK_FULL_MAP } from '../../hk-full-map-data.js';
import { HK_FULL_ROADS } from '../../hk-full-roads-data.js';
import { AREA_LABELS, locationLabel, nearestRoadNode } from './meta.js';
import { spawnOnFullRoad } from './full-meta.js';

// Hong Kong minimap and full-screen street atlas. The same Path2D world layers feed both maps; the labels use a
// CJK-capable font stack so Chinese street and district names render correctly on every platform.
//
// World frame: 1 unit = 1 m, x east, z south. North is up on the map, which matches the world frame exactly.

const CJK_FONT = '"Noto Sans TC", "Noto Sans CJK TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", "Source Han Sans TC", sans-serif';
const FONT = `600 10px ${CJK_FONT}`;
const FONT_DISTRICT = `700 13px ${CJK_FONT}`;
const FONT_DISTRICT_SMALL = `600 10px ${CJK_FONT}`;
const FONT_WATER = `italic 600 11px ${CJK_FONT}`;
const FONT_LANDMARK = `600 9.5px ${CJK_FONT}`;

const MAP = {
  water: '#081a25',
  land: '#151d22',
  overviewLand: '#202b2e',
  block: '#2c3439',
  park: '#1d3828',
  wood: '#183021',
  roadCasing: '#0c1114',
  roadMinor: '#39434a',
  roadSecondary: '#505c63',
  roadMajor: '#68757c',
  player: '#ffd23f',
  playerHalo: 'rgba(255, 210, 63, 0.24)',
  waypoint: '#ffcf3a',
  route: 'rgba(255, 207, 58, 0.72)',
  hover: '#9fdcff',
  landmark: '#ffcf7a',
  search: '#ff6b5d',
  text: '#dbe7e9',
  textDim: '#9fb1b7'
};

const RADAR_SCALE = 0.58;
const MIN_FULL_ZOOM = 0.003;
const MAX_FULL_ZOOM = 2.2;

export function hongKongFitZoom(bounds, w, h) {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const depth = Math.max(1, bounds.maxZ - bounds.minZ);
  return Math.max(MIN_FULL_ZOOM, Math.min(
    Math.max(1, w) / (width * 1.03),
    Math.max(1, h) / (depth * 1.04)
  ));
}

export function isHongKongCorePoint(x, z) {
  const b = GEO.bounds;
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

function addRing(path, flat) {
  if (!flat || flat.length < 4) return;
  path.moveTo(flat[0], flat[1]);
  for (let i = 2; i + 1 < flat.length; i += 2) path.lineTo(flat[i], flat[i + 1]);
  path.closePath();
}

function bbox(points) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of points) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minZ, maxZ };
}

let layers = null;
function mapLayers() {
  if (layers) return layers;
  const land = new Path2D();
  for (const ring of GEO.land) addRing(land, ring);
  const waterOnly = new Path2D(); // reserved for lakes / dock basins if the geodata grows them
  const parks = new Path2D();
  const woods = new Path2D();
  for (const park of GEO.parks) {
    if (!park.rings.length) continue;
    const target = park.cat === 'wood' ? woods : parks;
    addRing(target, park.rings[0]);
    for (const hole of park.rings.slice(1)) addRing(target, hole);
  }
  const blocks = new Path2D();
  for (const block of GEO.blocks) addRing(blocks, block[0]);
  const roadCasing = { major: new Path2D(), secondary: new Path2D(), minor: new Path2D() };
  const roadFill = { major: new Path2D(), secondary: new Path2D(), minor: new Path2D() };
  const labelRoads = [];
  for (const list of [GEO.roads, GEO.serviceRoads || []]) {
    for (const road of list) {
      const name = road[0], width = road[1], flat = road[5];
      if (!flat || flat.length < 4) continue;
      const cls = width >= 15 ? 'major' : width >= 9 ? 'secondary' : 'minor';
      const path = new Path2D();
      const points = [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        const x = flat[i], z = flat[i + 1];
        points.push([x, z]);
        if (i === 0) path.moveTo(x, z);
        else path.lineTo(x, z);
      }
      roadCasing[cls].addPath(path);
      roadFill[cls].addPath(path);
      if (name) {
        labelRoads.push({ name, width, points, bounds: bbox(points) });
      }
    }
  }
  const landmarks = [...Object.entries(GEO.landmarks), [SCB_SITE.name, SCB_SITE]]
    .filter(([, landmark]) => Number.isFinite(landmark.h) && landmark.h > 45)
    .map(([name, landmark]) => ({ name, ...landmark }))
    .sort((a, b) => b.h - a.h);
  layers = { land, waterOnly, parks, woods, blocks, roadCasing, roadFill, labelRoads, landmarks };
  return layers;
}

function flatBounds(flat) {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i + 1 < flat.length; i += 2) {
    b.minX = Math.min(b.minX, flat[i]); b.maxX = Math.max(b.maxX, flat[i]);
    b.minZ = Math.min(b.minZ, flat[i + 1]); b.maxZ = Math.max(b.maxZ, flat[i + 1]);
  }
  return b;
}

let overviewLayers = null;
function fullMapLayers() {
  if (overviewLayers) return overviewLayers;
  const land = new Path2D();
  for (const ring of HK_FULL_MAP.land) addRing(land, ring);
  const parks = new Path2D();
  const woods = new Path2D();
  for (const [cat, , ring] of HK_FULL_MAP.parks) addRing(cat === 1 ? woods : parks, ring);
  const roadCasing = Array.from({ length: 5 }, () => new Path2D());
  const roadFill = Array.from({ length: 5 }, () => new Path2D());
  const labelRoads = [];
  for (const [name, width, , , flags, flat] of HK_FULL_ROADS.roads) {
    if (!flat || flat.length < 4) continue;
    const cls = (flags & 1) ? (width >= 20 ? 0 : 1) : width >= 13 ? 2 : width >= 9 ? 3 : 4;
    const path = new Path2D();
    path.moveTo(flat[0], flat[1]);
    for (let i = 2; i + 1 < flat.length; i += 2) path.lineTo(flat[i], flat[i + 1]);
    roadCasing[cls].addPath(path);
    roadFill[cls].addPath(path);
    if (name) labelRoads.push({ name, cls, flat, bounds: flatBounds(flat) });
  }
  const coreOutline = new Path2D();
  coreOutline.rect(GEO.bounds.minX, GEO.bounds.minZ, GEO.bounds.maxX - GEO.bounds.minX, GEO.bounds.maxZ - GEO.bounds.minZ);
  overviewLayers = { land, parks, woods, roadCasing, roadFill, labelRoads, places: HK_FULL_MAP.places, coreOutline };
  return overviewLayers;
}

class MapView {
  constructor(cx, cz, zoom, w, h, dpr = 1) {
    this.cx = cx;
    this.cz = cz;
    this.zoom = zoom;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
  }
  world(ctx) {
    const s = this.zoom * this.dpr;
    ctx.setTransform(s, 0, 0, s, this.dpr * this.w * 0.5 - this.cx * s, this.dpr * this.h * 0.5 - this.cz * s);
  }
  screen(ctx) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  toX(x) { return (x - this.cx) * this.zoom + this.w * 0.5; }
  toY(z) { return (z - this.cz) * this.zoom + this.h * 0.5; }
}

function drawArrow(ctx, x, y, heading, size = 8) {
  ctx.save();
  ctx.translate(x, y);
  // Heading 0 faces +z (south), which is down on a north-up map.
  ctx.rotate(Math.PI - heading);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.72, size * 0.74);
  ctx.lineTo(0, size * 0.36);
  ctx.lineTo(-size * 0.72, size * 0.74);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWaypoint(ctx, x, y, r) {
  ctx.save();
  ctx.strokeStyle = MAP.waypoint;
  ctx.fillStyle = 'rgba(255, 207, 58, 0.16)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fillStyle = MAP.waypoint; ctx.fill();
  ctx.restore();
}

function drawDashedRoute(ctx, x0, y0, x1, y1) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 4.2;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = MAP.route;
  ctx.lineWidth = 2.1;
  ctx.setLineDash([7, 7]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}

export class HKGMapSystem {
  constructor({ controllerManager, cameraSystem, onTeleport, onToggle }) {
    this.controllerManager = controllerManager;
    this.cameraSystem = cameraSystem;
    this.onTeleport = onTeleport;
    this.onToggle = onToggle;

    this.miniCanvas = document.getElementById('minimap-canvas');
    this.miniCtx = this.miniCanvas ? this.miniCanvas.getContext('2d') : null;
    this.miniScale = RADAR_SCALE;
    this.miniCache = null;
    this.textWidths = new Map();

    this.modal = document.getElementById('fullmap-modal');
    this.fullCanvas = document.getElementById('fullmap-canvas');
    this.fullCanvasWrap = document.getElementById('fullmap-canvas-wrap');
    this.fullCtx = this.fullCanvas ? this.fullCanvas.getContext('2d') : null;
    this.fullDpr = 1;
    this.fullStatic = null;
    this.fullStaticKey = '';
    this.elHoverInfo = document.getElementById('fullmap-hover-info');
    this.elPlayerInfo = document.getElementById('fullmap-player-info');
    this.elSearchInput = document.getElementById('fullmap-search');
    this.elCounts = document.getElementById('fullmap-counts');

    this.isFullMapOpen = false;
    this.viewCenterX = 0;
    this.viewCenterZ = 0;
    this.viewZoom = 0.22;
    this.isPanning = false;
    this.panPointerId = null;
    this.panStart = { x: 0, y: 0, cx: 0, cz: 0 };
    this.pointerDown = null;
    this.dragMoved = false;

    this.searchHighlight = '';
    this.searchPath = null;
    this.searchBounds = null;

    const entrance = GEO.points.tsimShaTsui || [1298, -1417];
    this.waypoint = { x: entrance[0], z: entrance[1], name: '尖沙咀鐘樓' };

    this.setCopy();
    if (document.fonts) {
      document.fonts.ready.then(() => {
        this.textWidths.clear();
        this.miniCache = null;
        this.fullStaticKey = '';
      });
    }
    this.initEvents();
  }

  setCopy() {
    const title = document.querySelector('.fullmap-title h2');
    if (title) title.textContent = '香港全圖';
    const bullet = document.querySelector('.fullmap-title .mta-bullet');
    if (bullet) bullet.textContent = 'HK';
    if (this.elCounts) {
      this.elCounts.textContent = `${HK_FULL_ROADS.roads.length.toLocaleString('zh-HK')} 段可駕駛 OSM 道路 · 全港及離島`;
    }
    if (this.elSearchInput) {
      this.elSearchInput.placeholder = '搜尋全港街道、地區 — 彌敦道、屯門、西貢、東涌…';
      this.elSearchInput.setAttribute('aria-label', '搜尋全港街道或地區');
    }
    if (this.modal) this.modal.setAttribute('aria-label', '香港全圖');
    const attribution = document.getElementById('fullmap-attribution');
    if (attribution) attribution.textContent = '全港 3D 道路 + 2D 總圖 · © OpenStreetMap contributors · ODbL 1.0';
    const mini = document.getElementById('minimap-card');
    if (mini) {
      mini.setAttribute('aria-label', '即時香港街道雷達圖');
      mini.title = '開啟香港全圖 [M]';
    }
    const openMap = document.getElementById('btn-open-map');
    if (openMap) openMap.title = '香港全圖 [M]';
    const viewAll = document.getElementById('map-view-all');
    if (viewAll) {
      viewAll.title = '全港總圖 · 新界、港九及離島';
      viewAll.setAttribute('aria-label', '顯示全港及離島');
    }
    const compass = document.querySelector('.map-compass');
    if (compass) compass.title = '正北';
    if (this.elHoverInfo) this.elHoverInfo.textContent = '全港統一簡潔道路 · 點擊附近道路傳送';
    if (this.elPlayerInfo) this.elPlayerInfo.textContent = '你在此：中環';
    const compassNeedle = document.getElementById('map-compass-needle');
    if (compassNeedle) compassNeedle.setAttribute('transform', 'rotate(0 22 22)');
  }

  isCore(point) {
    return isHongKongCorePoint(point.x, point.z);
  }

  nearestPlace(x, z) {
    let best = null;
    let bestDistance = Infinity;
    for (const [name, px, pz, rank] of HK_FULL_MAP.places) {
      const distance = Math.hypot(px - x, pz - z);
      const limit = rank === 0 ? 4200 : rank === 1 ? 2200 : rank === 2 ? 1300 : 700;
      if (distance < limit && distance < bestDistance) {
        best = name;
        bestDistance = distance;
      }
    }
    return best;
  }

  initEvents() {
    const miniCard = document.getElementById('minimap-card');
    const closeBtn = document.getElementById('close-fullmap-btn');
    const zoomInBtn = document.getElementById('map-zoom-in');
    const zoomOutBtn = document.getElementById('map-zoom-out');
    const centerPlayerBtn = document.getElementById('map-center-player');
    const viewAllBtn = document.getElementById('map-view-all');

    miniCard?.addEventListener('click', () => this.toggleFullMap(true));
    closeBtn?.addEventListener('click', () => this.toggleFullMap(false));
    zoomInBtn?.addEventListener('click', () => {
      this.viewZoom = Math.min(MAX_FULL_ZOOM, this.viewZoom * 1.45);
      this.renderFullMap();
    });
    zoomOutBtn?.addEventListener('click', () => {
      this.viewZoom = Math.max(this.minimumFullZoom(), this.viewZoom / 1.45);
      this.renderFullMap();
    });
    centerPlayerBtn?.addEventListener('click', () => {
      const entity = this.controllerManager.getActiveEntity();
      this.viewCenterX = entity.position.x;
      this.viewCenterZ = entity.position.z;
      this.viewZoom = 1.05;
      this.renderFullMap();
    });
    viewAllBtn?.addEventListener('click', () => {
      this.fitAll();
      this.renderFullMap();
    });

    this.elSearchInput?.addEventListener('input', () => this.search(this.elSearchInput.value));

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isFullMapOpen) this.toggleFullMap(false);
    });

    if (!this.fullCanvas) return;
    const canvas = this.fullCanvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      this.panPointerId = e.pointerId;
      this.pointerDown = { x: e.clientX, y: e.clientY };
      this.panStart = { x: e.clientX, y: e.clientY, cx: this.viewCenterX, cz: this.viewCenterZ };
      this.isPanning = false;
      this.dragMoved = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy, rect.width, rect.height);
      const point = this.pointerDown;
      if (point && !this.dragMoved && Math.hypot(e.clientX - point.x, e.clientY - point.y) > 4) {
        this.dragMoved = true;
        this.isPanning = true;
        this.fullCanvasWrap?.classList.add('is-panning');
      }
      if (this.isPanning && this.panPointerId === e.pointerId) {
        this.viewCenterX = this.panStart.cx - (e.clientX - this.panStart.x) / this.viewZoom;
        this.viewCenterZ = this.panStart.cz - (e.clientY - this.panStart.y) / this.viewZoom;
        this.clampView();
        this.renderFullMap();
        return;
      }
      if (this.elHoverInfo) {
        const road = nearestRoadNode(world.x, world.z, { fullRoad: true });
        const place = road?.name || this.nearestPlace(world.x, world.z) || locationLabel(world.x, world.z);
        this.elHoverInfo.textContent = road && road.distance <= 1500
          ? `${place} · 點擊傳送至附近道路`
          : `${place} · 附近沒有可駕駛道路`;
      }
    });
    const endPointer = (e) => {
      if (this.panPointerId !== e.pointerId) return;
      const wasDragging = this.dragMoved;
      this.panPointerId = null;
      this.pointerDown = null;
      this.isPanning = false;
      this.fullCanvasWrap?.classList.remove('is-panning');
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (!wasDragging) {
        const rect = canvas.getBoundingClientRect();
        const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
        this.teleportAt(world.x, world.z);
      }
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const before = this.screenToWorld(sx, sy, rect.width, rect.height);
      const factor = Math.exp(-e.deltaY * 0.0014);
      this.viewZoom = Math.max(this.minimumFullZoom(), Math.min(MAX_FULL_ZOOM, this.viewZoom * factor));
      const after = this.screenToWorld(sx, sy, rect.width, rect.height);
      this.viewCenterX += before.x - after.x;
      this.viewCenterZ += before.z - after.z;
      this.clampView();
      this.renderFullMap();
    }, { passive: false });
  }

  fitZoom() {
    const { w, h } = this.fullSize();
    return hongKongFitZoom(HK_FULL_MAP.bounds, w, h);
  }

  minimumFullZoom() {
    return Math.max(MIN_FULL_ZOOM, this.fitZoom());
  }

  fitAll() {
    const b = HK_FULL_MAP.bounds;
    this.viewCenterX = (b.minX + b.maxX) * 0.5;
    this.viewCenterZ = (b.minZ + b.maxZ) * 0.5;
    this.viewZoom = this.fitZoom();
  }

  clampView() {
    const b = HK_FULL_MAP.bounds;
    const { w, h } = this.fullSize();
    const halfW = w / (2 * this.viewZoom), halfH = h / (2 * this.viewZoom);
    this.viewCenterX = Math.max(b.minX + Math.min(halfW, (b.maxX - b.minX) / 2), Math.min(b.maxX - Math.min(halfW, (b.maxX - b.minX) / 2), this.viewCenterX));
    this.viewCenterZ = Math.max(b.minZ + Math.min(halfH, (b.maxZ - b.minZ) / 2), Math.min(b.maxZ - Math.min(halfH, (b.maxZ - b.minZ) / 2), this.viewCenterZ));
  }

  teleportAt(x, z) {
    const spawn = spawnOnFullRoad(x, z, { minWidth: 5, laneOffset: 2.4 });
    if (!spawn || spawn.distance > 1500) {
      if (this.elHoverInfo) this.elHoverInfo.textContent = '附近沒有可駕駛道路 · 請移近全港 OSM 道路再試';
      return false;
    }
    this.waypoint = { x: spawn.x, z: spawn.z, name: locationLabel(spawn.x, spawn.z) };
    this.onTeleport?.(spawn.x, spawn.z, spawn.heading);
    this.renderFullMap();
    return true;
  }

  search(text) {
    const query = String(text || '').trim().toLowerCase();
    this.searchHighlight = query;
    this.searchPath = null;
    this.searchBounds = null;
    if (!query) {
      this.renderFullMap();
      return;
    }
    const L = fullMapLayers();
    const roads = L.labelRoads.filter((road) => road.name.toLowerCase().includes(query));
    if (roads.length) {
      const path = new Path2D();
      const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
      for (let index = 0; index < roads.length; index++) {
        const road = roads[index];
        if (index < 800) {
          const flat = road.flat;
          path.moveTo(flat[0], flat[1]);
          for (let i = 2; i + 1 < flat.length; i += 2) path.lineTo(flat[i], flat[i + 1]);
        }
        b.minX = Math.min(b.minX, road.bounds.minX);
        b.maxX = Math.max(b.maxX, road.bounds.maxX);
        b.minZ = Math.min(b.minZ, road.bounds.minZ);
        b.maxZ = Math.max(b.maxZ, road.bounds.maxZ);
      }
      this.searchPath = path;
      this.searchBounds = b;
    }
    const place = HK_FULL_MAP.places
      .filter((entry) => entry[0].toLowerCase().includes(query))
      .sort((a, b) => {
        const exact = Number(a[0].toLowerCase() !== query) - Number(b[0].toLowerCase() !== query);
        return exact || a[3] - b[3];
      })[0];
    const landmark = mapLayers().landmarks.find((entry) => entry.name.toLowerCase().includes(query));
    if (place && (place[0].toLowerCase() === query || !roads.length)) {
      this.viewCenterX = place[1];
      this.viewCenterZ = place[2];
      const targetZoom = this.isCore({ x: place[1], z: place[2] }) ? 0.75 : place[3] === 0 ? 0.09 : place[3] === 1 ? 0.16 : 0.28;
      this.viewZoom = Math.max(this.viewZoom, targetZoom);
    } else if (landmark && !roads.length) {
      this.viewCenterX = landmark.x;
      this.viewCenterZ = landmark.z;
      this.viewZoom = Math.max(this.viewZoom, 1.1);
    } else if (this.searchBounds) {
      const b = this.searchBounds;
      const { w, h } = this.fullSize();
      this.viewCenterX = (b.minX + b.maxX) * 0.5;
      this.viewCenterZ = (b.minZ + b.maxZ) * 0.5;
      const fit = Math.min(w / ((b.maxX - b.minX) * 1.35 + 2), h / ((b.maxZ - b.minZ) * 1.35 + 2));
      this.viewZoom = Math.max(0.04, Math.min(1.7, fit));
    }
    this.clampView();
    this.renderFullMap();
  }

  toggleFullMap(open) {
    this.isFullMapOpen = Boolean(open);
    if (!this.isFullMapOpen) this.panPointerId = null;
    this.onToggle?.(this.isFullMapOpen);
    if (!this.modal) return;
    this.modal.classList.toggle('hidden', !this.isFullMapOpen);
    if (this.isFullMapOpen) {
      for (const pop of document.querySelectorAll('.popover[popover]')) {
        if (typeof pop.hidePopover === 'function' && pop.matches(':popover-open')) pop.hidePopover();
      }
      this.resizeFullCanvas();
      this.fitAll();
      this.renderFullMap();
    } else {
      this.fullStatic = null;
      this.fullStaticKey = '';
    }
  }

  resizeFullCanvas() {
    if (!this.fullCanvas) return;
    const w = this.fullCanvas.clientWidth || window.innerWidth;
    const h = this.fullCanvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(6e6 / Math.max(1, w * h)));
    this.fullDpr = dpr;
    this.fullCanvas.width = Math.max(1, Math.floor(w * dpr));
    this.fullCanvas.height = Math.max(1, Math.floor(h * dpr));
    this.fullStatic = null;
    this.fullStaticKey = '';
  }

  fullSize() {
    const dpr = this.fullDpr || 1;
    if (!this.fullCanvas) return { w: 1200, h: 800 };
    return { w: this.fullCanvas.width / dpr, h: this.fullCanvas.height / dpr };
  }

  screenToWorld(sx, sy, width, height) {
    return {
      x: this.viewCenterX + (sx - width * 0.5) / this.viewZoom,
      z: this.viewCenterZ + (sy - height * 0.5) / this.viewZoom
    };
  }

  textWidth(ctx, text) {
    const key = `${ctx.font}|${text}`;
    let value = this.textWidths.get(key);
    if (value === undefined) {
      value = ctx.measureText(text).width;
      this.textWidths.set(key, value);
    }
    return value;
  }

  drawOverviewGround(ctx, view) {
    const L = fullMapLayers();
    const left = view.cx - view.w / (2 * view.zoom);
    const top = view.cz - view.h / (2 * view.zoom);
    ctx.save();
    view.world(ctx);
    ctx.fillStyle = MAP.water;
    ctx.fillRect(left, top, view.w / view.zoom, view.h / view.zoom);
    ctx.fillStyle = MAP.overviewLand;
    ctx.fill(L.land);
    ctx.fillStyle = MAP.wood;
    ctx.fill(L.woods);
    ctx.fillStyle = MAP.park;
    ctx.fill(L.parks);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const widths = [20, 14, 10, 7, 4.5];
    const minPx = [2.2, 1.7, 1.25, 0.9, 0.65];
    const colors = [MAP.roadMajor, MAP.roadMajor, MAP.roadSecondary, MAP.roadSecondary, MAP.roadMinor];
    for (let cls = 4; cls >= 0; cls--) {
      if (view.zoom < 0.045 && cls >= 3) continue;
      if (view.zoom < 0.022 && cls >= 2) continue;
      const casingWidth = Math.max(widths[cls] + 3, (minPx[cls] + 1.1) / view.zoom);
      ctx.strokeStyle = MAP.roadCasing;
      ctx.lineWidth = casingWidth;
      ctx.stroke(L.roadCasing[cls]);
      ctx.strokeStyle = colors[cls];
      ctx.lineWidth = Math.max(widths[cls], minPx[cls] / view.zoom);
      ctx.stroke(L.roadFill[cls]);
    }
    ctx.restore();
  }

  drawGround(ctx, view, minimap) {
    const L = mapLayers();
    const left = view.cx - view.w / (2 * view.zoom);
    const top = view.cz - view.h / (2 * view.zoom);
    ctx.save();
    view.world(ctx);
    ctx.fillStyle = MAP.water;
    ctx.fillRect(left, top, view.w / view.zoom, view.h / view.zoom);
    ctx.fillStyle = MAP.land;
    ctx.fill(L.land);
    ctx.fillStyle = MAP.wood;
    ctx.fill(L.woods);
    ctx.fillStyle = MAP.park;
    ctx.fill(L.parks);
    ctx.fillStyle = MAP.block;
    ctx.fill(L.blocks);

    const casing = { major: 17, secondary: 11, minor: 7 };
    const fill = { major: 14.5, secondary: 9, minor: 5.3 };
    for (const cls of ['minor', 'secondary', 'major']) {
      ctx.strokeStyle = MAP.roadCasing;
      ctx.lineWidth = casing[cls];
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(L.roadCasing[cls]);
      ctx.strokeStyle = cls === 'major' ? MAP.roadMajor : cls === 'secondary' ? MAP.roadSecondary : MAP.roadMinor;
      ctx.lineWidth = fill[cls];
      ctx.stroke(L.roadFill[cls]);
    }

    ctx.restore();
  }

  drawSearch(ctx, view) {
    if (!this.searchPath) return;
    ctx.save();
    view.world(ctx);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 107, 93, 0.35)';
    ctx.lineWidth = 14 / view.zoom;
    ctx.stroke(this.searchPath);
    ctx.strokeStyle = MAP.search;
    ctx.lineWidth = 4 / view.zoom;
    ctx.stroke(this.searchPath);
    ctx.restore();
  }

  drawRoadLabels(ctx, view, { fontPx = 10, maxLabels = 220, majorOnly = false, sameNameGap = 160 } = {}) {
    const L = mapLayers();
    const placed = new Map();
    let drawn = 0;
    const px = view.zoom;
    ctx.save();
    view.screen(ctx);
    ctx.font = `600 ${fontPx}px ${CJK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const road of L.labelRoads) {
      if (drawn >= maxLabels) break;
      if (majorOnly && road.width < 12) continue;
      const b = road.bounds;
      const x0 = view.toX(b.minX), x1 = view.toX(b.maxX);
      const y0 = view.toY(b.minZ), y1 = view.toY(b.maxZ);
      if (x1 < -80 || x0 > view.w + 80 || y1 < -40 || y0 > view.h + 40) continue;
      const last = placed.get(road.name);
      const points = road.points;
      const step = Math.max(1, Math.floor(points.length / 4));
      for (let i = 1; i < points.length; i += step) {
        const ax = view.toX(points[i - 1][0]), ay = view.toY(points[i - 1][1]);
        const bx = view.toX(points[i][0]), by = view.toY(points[i][1]);
        const dx = bx - ax, dy = by - ay;
        const length = Math.hypot(dx, dy);
        if (length < Math.max(34, this.textWidth(ctx, road.name) + 18)) continue;
        let angle = Math.atan2(dy, dx);
        if (angle > Math.PI / 2) angle -= Math.PI;
        if (angle < -Math.PI / 2) angle += Math.PI;
        const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5;
        if (last && Math.hypot(mx - last.x, my - last.y) < sameNameGap) continue;
        placed.set(road.name, { x: mx, y: my });
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle);
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = 'rgba(5, 10, 13, 0.92)';
        ctx.strokeText(road.name, 0, 0);
        ctx.fillStyle = road.width >= 15 ? '#e6eef0' : MAP.textDim;
        ctx.fillText(road.name, 0, 0);
        ctx.restore();
        drawn++;
        break;
      }
    }
    ctx.restore();
  }

  drawOverviewPlaceLabels(ctx, view) {
    const placed = [];
    let drawn = 0;
    ctx.save();
    view.screen(ctx);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [name, x, z, rank] of HK_FULL_MAP.places) {
      if (view.zoom < 0.028 && rank > 0) continue;
      if (view.zoom < 0.055 && rank > 1) continue;
      if (view.zoom < 0.12 && rank > 2) continue;
      if (view.zoom >= 0.12 && this.isCore({ x, z })) continue;
      const sx = view.toX(x), sy = view.toY(z);
      if (sx < -100 || sx > view.w + 100 || sy < -30 || sy > view.h + 30) continue;
      const fontPx = rank === 0 ? (view.zoom < 0.04 ? 14 : 15) : rank === 1 ? 12 : rank === 2 ? 10.5 : 9.5;
      ctx.font = `${rank === 0 ? 700 : 600} ${fontPx}px ${CJK_FONT}`;
      const width = this.textWidth(ctx, name);
      const box = [sx - width / 2 - 5, sy - fontPx * 0.7, sx + width / 2 + 5, sy + fontPx * 0.7];
      if (placed.some((other) => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1])) continue;
      placed.push(box);
      ctx.lineWidth = rank === 0 ? 4 : 3;
      ctx.strokeStyle = 'rgba(4, 9, 12, 0.9)';
      ctx.strokeText(name, sx, sy);
      ctx.fillStyle = rank === 0 ? '#e6eef0' : rank === 1 ? '#c5d7db' : MAP.textDim;
      ctx.fillText(name, sx, sy);
      if (++drawn >= 220) break;
    }
    ctx.restore();
  }

  drawOverviewRoadLabels(ctx, view) {
    if (view.zoom < 0.04) return;
    const placed = new Map();
    let drawn = 0;
    ctx.save();
    view.screen(ctx);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const road of fullMapLayers().labelRoads) {
      if (drawn >= 120) break;
      if (view.zoom < 0.075 && road.cls > 1) continue;
      if (view.zoom < 0.16 && road.cls > 2) continue;
      if (view.zoom < 0.32 && road.cls > 3) continue;
      const b = road.bounds;
      if (this.isCore({ x: (b.minX + b.maxX) * 0.5, z: (b.minZ + b.maxZ) * 0.5 })) continue;
      const x0 = view.toX(b.minX), x1 = view.toX(b.maxX);
      const y0 = view.toY(b.minZ), y1 = view.toY(b.maxZ);
      if (x1 < -80 || x0 > view.w + 80 || y1 < -40 || y0 > view.h + 40) continue;
      const fontPx = road.cls <= 1 ? 11 : road.cls === 2 ? 10 : 9;
      ctx.font = `600 ${fontPx}px ${CJK_FONT}`;
      const needed = this.textWidth(ctx, road.name) + 16;
      const flat = road.flat;
      const segments = Math.max(1, Math.floor((flat.length / 2 - 1) / 7));
      let best = null;
      for (let i = 2; i + 1 < flat.length; i += 2 * segments) {
        const ax = view.toX(flat[i - 2]), ay = view.toY(flat[i - 1]);
        const bx = view.toX(flat[i]), by = view.toY(flat[i + 1]);
        const length = Math.hypot(bx - ax, by - ay);
        if (length >= needed && (!best || length > best.length)) best = { ax, ay, bx, by, length };
      }
      if (!best) continue;
      const mx = (best.ax + best.bx) * 0.5, my = (best.ay + best.by) * 0.5;
      const last = placed.get(road.name);
      if (last && Math.hypot(mx - last.x, my - last.y) < 180) continue;
      placed.set(road.name, { x: mx, y: my });
      let angle = Math.atan2(best.by - best.ay, best.bx - best.ax);
      if (angle > Math.PI / 2) angle -= Math.PI;
      if (angle < -Math.PI / 2) angle += Math.PI;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = 'rgba(5, 10, 13, 0.92)';
      ctx.strokeText(road.name, 0, 0);
      ctx.fillStyle = road.cls <= 1 ? '#e6eef0' : MAP.textDim;
      ctx.fillText(road.name, 0, 0);
      ctx.restore();
      drawn++;
    }
    ctx.restore();
  }

  drawAreaLabels(ctx, view, minimap) {
    ctx.save();
    view.screen(ctx);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [name, x, z, rank] of AREA_LABELS) {
      const sx = view.toX(x), sy = view.toY(z);
      if (sx < -60 || sx > view.w + 60 || sy < -30 || sy > view.h + 30) continue;
      if (rank === 2 && view.zoom < 0.22) continue;
      if (rank === 0) {
        ctx.font = minimap ? FONT_DISTRICT_SMALL : FONT_DISTRICT;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(4, 9, 12, 0.9)';
        ctx.strokeText(name, sx, sy);
        ctx.fillStyle = MAP.text;
        ctx.fillText(name, sx, sy);
      } else if (rank === 1) {
        ctx.font = FONT_WATER;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(4, 9, 12, 0.8)';
        ctx.strokeText(name, sx, sy);
        ctx.fillStyle = '#89c9e4';
        ctx.fillText(name, sx, sy);
      } else {
        ctx.font = FONT_DISTRICT_SMALL;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(4, 9, 12, 0.8)';
        ctx.strokeText(name, sx, sy);
        ctx.fillStyle = '#b7d8b8';
        ctx.fillText(name, sx, sy);
      }
    }
    ctx.restore();
  }

  drawLandmarkLabels(ctx, view, minimap) {
    const L = mapLayers();
    const placed = [];
    ctx.save();
    view.screen(ctx);
    ctx.font = FONT_LANDMARK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const landmark of L.landmarks) {
      if (minimap && landmark.h < 120) continue;
      const sx = view.toX(landmark.x), sy = view.toY(landmark.z);
      if (sx < -40 || sx > view.w + 40 || sy < -20 || sy > view.h + 20) continue;
      if (minimap) {
        ctx.fillStyle = MAP.landmark;
        ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const show = view.zoom > 0.75 || landmark.h >= 180;
      if (!show) continue;
      if (placed.some(([x, y]) => Math.hypot(sx - x, sy - y) < 70)) continue;
      placed.push([sx, sy]);
      const label = view.zoom > 1.1 ? `${landmark.name} ${Math.round(landmark.h)}m` : landmark.name;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(4, 9, 12, 0.86)';
      ctx.strokeText(label, sx, sy - 4);
      ctx.fillStyle = MAP.landmark;
      ctx.fillText(label, sx, sy - 4);
    }
    ctx.restore();
  }

  drawPlayer(ctx, view, x, y, entity, minimap) {
    if (minimap) {
      // Camera cone first, then the arrow.
      const cam = this.cameraSystem;
      const dx = cam.currentLookAt.x - cam.currentPos.x;
      const dz = cam.currentLookAt.z - cam.currentPos.z;
      const angle = Math.atan2(dx, dz);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI - angle);
      const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 66);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.26)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 66, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = MAP.playerHalo;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = MAP.player;
    drawArrow(ctx, x, y, entity.heading, minimap ? 7 : 9);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 1;
    ctx.restore();
  }

  update() {
    if (this.isFullMapOpen) this.renderFullMap();
    else this.renderMinimap();
  }

  renderMinimap() {
    if (!this.miniCtx || !this.miniCanvas) return;
    if (!this.miniCanvas.offsetParent || document.body.classList.contains('hud-minimized')) return;
    const w = this.miniCanvas.clientWidth;
    const h = this.miniCanvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (this.miniCanvas.width !== bw || this.miniCanvas.height !== bh) {
      this.miniCanvas.width = bw;
      this.miniCanvas.height = bh;
      this.miniCache = null;
    }
    const entity = this.controllerManager.getActiveEntity();
    const px = entity.position.x, pz = entity.position.z;
    const target = Math.max(0.1, RADAR_SCALE / (1 + Math.max(0, entity.position.y - 25) / 180));
    this.miniScale += (target - this.miniScale) * 0.08;
    const zoom = this.miniScale;

    let cache = this.miniCache;
    if (!cache || Math.abs(cache.s - zoom) > 0.025 ||
      Math.hypot(px - cache.cx, pz - cache.cz) > 55) {
      if (!cache) cache = this.miniCache = { canvas: document.createElement('canvas') };
      cache.canvas.width = bw;
      cache.canvas.height = bh;
      cache.ctx = cache.canvas.getContext('2d');
      cache.cx = px;
      cache.cz = pz;
      cache.s = zoom;
      const view = new MapView(px, pz, zoom, w, h, dpr);
      cache.ctx.setTransform(1, 0, 0, 1, 0, 0);
      cache.ctx.clearRect(0, 0, bw, bh);
      this.drawOverviewGround(cache.ctx, view);
      this.drawOverviewPlaceLabels(cache.ctx, view);
      this.drawOverviewRoadLabels(cache.ctx, view);
    }

    const ctx = this.miniCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = MAP.water;
    ctx.fillRect(0, 0, bw, bh);
    const offsetX = ((cache.cx - px) * zoom + 0) * dpr;
    const offsetY = ((cache.cz - pz) * zoom + 0) * dpr;
    const scale = zoom / cache.s;
    ctx.drawImage(
      cache.canvas,
      offsetX + (bw * 0.5) * (1 - scale),
      offsetY + (bh * 0.5) * (1 - scale),
      bw * scale,
      bh * scale
    );

    const view = new MapView(px, pz, zoom, w, h, dpr);
    view.screen(ctx);
    if (this.waypoint) {
      const wx = view.toX(this.waypoint.x), wy = view.toY(this.waypoint.z);
      if (Math.abs(wx - w / 2) < w || Math.abs(wy - h / 2) < h) drawDashedRoute(ctx, w / 2, h / 2, wx, wy);
      drawWaypoint(ctx, wx, wy, 4.2);
    }
    this.drawPlayer(ctx, view, w * 0.5, h * 0.5, entity, true);
  }

  renderFullMapStatic(view) {
    const key = `${this.fullCanvas.width}x${this.fullCanvas.height}|${this.viewCenterX.toFixed(1)}|${this.viewCenterZ.toFixed(1)}|${this.viewZoom.toFixed(4)}|${this.searchHighlight}`;
    if (this.fullStatic && this.fullStaticKey === key) return this.fullStatic;
    const canvas = this.fullStatic?.canvas || document.createElement('canvas');
    canvas.width = this.fullCanvas.width;
    canvas.height = this.fullCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawOverviewGround(ctx, view);
    this.drawSearch(ctx, view);
    this.drawOverviewPlaceLabels(ctx, view);
    this.drawOverviewRoadLabels(ctx, view);
    this.fullStatic = { canvas };
    this.fullStaticKey = key;
    return this.fullStatic;
  }

  renderFullMap() {
    if (!this.fullCtx || !this.fullCanvas) return;
    if (!this.fullCanvas.width || !this.fullCanvas.height) this.resizeFullCanvas();
    const { w, h } = this.fullSize();
    const view = new MapView(this.viewCenterX, this.viewCenterZ, this.viewZoom, w, h, this.fullDpr);
    const stat = this.renderFullMapStatic(view);
    const ctx = this.fullCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.fullCanvas.width, this.fullCanvas.height);
    ctx.drawImage(stat.canvas, 0, 0);
    view.screen(ctx);

    const entity = this.controllerManager.getActiveEntity();
    const px = view.toX(entity.position.x), py = view.toY(entity.position.z);
    if (this.waypoint) {
      const wx = view.toX(this.waypoint.x), wy = view.toY(this.waypoint.z);
      drawDashedRoute(ctx, px, py, wx, wy);
      drawWaypoint(ctx, wx, wy, 6.5);
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(4, 9, 12, 0.9)';
      ctx.strokeText(this.waypoint.name, wx, wy - 9);
      ctx.fillStyle = MAP.waypoint;
      ctx.fillText(this.waypoint.name, wx, wy - 9);
    }
    this.drawPlayer(ctx, view, px, py, entity, false);
    if (this.elPlayerInfo) {
      const label = locationLabel(entity.position.x, entity.position.z);
      this.elPlayerInfo.textContent = `你在此：${label} · 座標 ${Math.round(entity.position.x)}, ${Math.round(entity.position.z)}`;
    }
  }
}
