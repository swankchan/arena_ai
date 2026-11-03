import * as THREE from 'three/webgpu';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BUILDING_ICON = 'M4 21V5l8-3v19M4 9h8M8 7v2m0 3v2m0 3v2m4-8h8v10M16 9v2m0 3v2m0 3v2M2 21h20';

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function icon(path = BUILDING_ICON, className = 'icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', path);
  svg.appendChild(p);
  return svg;
}

function control(label, className = 'inventory-control') {
  const btn = node('button', className, label);
  btn.type = 'button';
  return btn;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * In-game building catalogue and isolated model inspector.
 *
 * The inspector renders a clone in the existing scene so the single WebGPU renderer, shared materials and TSL pipeline
 * stay in use. Original top-level geometry is hidden, not deleted; the city's sun and hemisphere lights stay active so
 * shared materials keep the exact same lighting path. The city simulation and follow camera are paused while inspecting;
 * closing restores object visibility, camera transform, environment preset and input state.
 */
export class BuildingInventory {
  constructor({
    scene, cameraSystem, controllerManager, world, lightingSystem, renderer,
    touchControls, gamepadControls, mapSystem, selectTime, closePopovers
  }) {
    this.scene = scene;
    this.cameraSystem = cameraSystem;
    this.camera = cameraSystem.camera;
    this.controllerManager = controllerManager;
    this.world = world;
    this.lightingSystem = lightingSystem;
    this.canvas = renderer.domElement;
    this.touchControls = touchControls;
    this.gamepadControls = gamepadControls;
    this.mapSystem = mapSystem;
    this.selectTime = selectTime;
    this.closePopovers = closePopovers;
    this.entries = world.buildingInventory ?? [];
    this.integrated = this.entries.filter((entry) => entry.status === 'integrated' && this.world[entry.worldKey]?.group);
    this.activeEntry = null;
    this.rig = null;
    this.previewModel = null;
    this.grid = null;
    this.saved = null;
    this.bounds = null;
    this.orbit = null;
    this.pointers = new Map();
    this.filter = 'all';
    this.autoRotate = false;
    this.previewTime = 'midday';
    this.lastFocus = null;

    this.buildUI();
    this.bindEvents();
    this.renderList();
  }

  buildUI() {
    const toolbar = document.getElementById('hud-toolbar');
    this.toolbarButton = node('button', 'tool-btn');
    this.toolbarButton.id = 'btn-building-inventory';
    this.toolbarButton.type = 'button';
    this.toolbarButton.title = 'Building Inventory [I]';
    this.toolbarButton.setAttribute('aria-label', 'Open Building Inventory');
    this.toolbarButton.setAttribute('aria-controls', 'building-inventory-modal');
    this.toolbarButton.setAttribute('aria-expanded', 'false');
    this.toolbarButton.append(icon(), node('span', 'tool-label', 'Buildings'), node('kbd', '', 'I'));
    if (toolbar) {
      const before = document.getElementById('btn-open-map') || document.getElementById('btn-sound');
      toolbar.insertBefore(this.toolbarButton, before);
    }

    this.inventoryModal = node('section', 'building-inventory-modal');
    this.inventoryModal.id = 'building-inventory-modal';
    this.inventoryModal.hidden = true;
    this.inventoryModal.setAttribute('role', 'dialog');
    this.inventoryModal.setAttribute('aria-modal', 'true');
    this.inventoryModal.setAttribute('aria-labelledby', 'building-inventory-title');

    const panel = node('div', 'building-inventory-panel panel');
    const header = node('header', 'building-inventory-header');
    const heading = node('div', 'building-inventory-heading');
    heading.append(node('div', 'inventory-eyebrow', 'HONG KONG · 100 BUILDING PROGRAM'));
    const title = node('h2', '', 'Building Inventory');
    title.id = 'building-inventory-title';
    heading.appendChild(title);
    this.inventorySummary = node('p', 'building-inventory-summary');
    heading.appendChild(this.inventorySummary);
    const closeInventory = control('×', 'inventory-close');
    closeInventory.setAttribute('aria-label', 'Close Building Inventory');
    closeInventory.addEventListener('click', () => this.closeInventory());
    header.append(heading, closeInventory);

    const tools = node('div', 'building-inventory-tools');
    const searchLabel = node('label', 'inventory-search');
    searchLabel.setAttribute('aria-label', 'Search buildings');
    this.searchInput = node('input');
    this.searchInput.type = 'search';
    this.searchInput.placeholder = 'Search name, ID, district or height / 搜尋名稱、ID、地區或高度…';
    this.searchInput.autocomplete = 'off';
    this.searchInput.spellcheck = false;
    searchLabel.appendChild(this.searchInput);
    const filters = node('div', 'inventory-filters');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', 'Filter by construction status');
    this.filterButtons = new Map();
    for (const [id, label] of [['all', 'All 全部'], ['integrated', 'Added 已加入'], ['pending', 'Planned 待製作']]) {
      const count = id === 'all' ? this.entries.length : this.entries.filter((entry) => entry.status === id).length;
      const btn = control(`${label} ${count}`, 'inventory-filter');
      btn.dataset.filter = id;
      btn.setAttribute('aria-pressed', String(id === this.filter));
      btn.addEventListener('click', () => {
        this.filter = id;
        for (const [key, button] of this.filterButtons) button.setAttribute('aria-pressed', String(key === id));
        this.renderList();
      });
      this.filterButtons.set(id, btn);
      filters.appendChild(btn);
    }
    tools.append(searchLabel, filters);

    this.resultCount = node('div', 'inventory-result-count');
    this.resultCount.setAttribute('aria-live', 'polite');
    this.list = node('div', 'building-inventory-list');
    this.list.setAttribute('role', 'list');
    this.list.addEventListener('click', (event) => {
      const row = event.target.closest('[data-building-id]');
      if (row) this.openPreview(row.dataset.buildingId);
    });
    const footer = node('footer', 'building-inventory-footer',
      'Actual in-game models only; planned buildings have no preview. / 3D 預覽使用實際遊戲模型，待製作項目沒有假模型。');
    panel.append(header, tools, this.resultCount, this.list, footer);
    this.inventoryModal.appendChild(panel);

    this.previewUI = node('section', 'building-preview-ui');
    this.previewUI.id = 'building-preview-ui';
    this.previewUI.hidden = true;
    this.previewUI.setAttribute('aria-label', 'Isolated building preview');

    const top = node('header', 'preview-chrome preview-top panel');
    this.backButton = control('← Building Inventory', 'preview-back');
    this.backButton.addEventListener('click', () => this.closePreview({ showInventory: true }));
    this.previewTitle = node('div', 'preview-top-title');
    const exit = control('×', 'preview-exit');
    exit.title = 'Exit preview to the city';
    exit.setAttribute('aria-label', 'Exit preview to the city');
    exit.addEventListener('click', () => this.closePreview({ showInventory: false }));
    top.append(this.backButton, this.previewTitle, exit);

    const info = node('aside', 'preview-chrome preview-info panel');
    this.previewId = node('div', 'inventory-eyebrow');
    this.previewName = node('h2');
    this.previewMeta = node('p', 'preview-meta');
    this.previewStatus = node('p', 'preview-status', 'Integrated · refined · actual game model / 已加入 · 已精修');
    info.append(this.previewId, this.previewName, this.previewMeta, this.previewStatus);

    const bottom = node('div', 'preview-chrome preview-bottom panel');
    this.prevButton = control('← Prev 上一幢', 'preview-nav');
    this.prevButton.addEventListener('click', () => this.stepPreview(-1));
    this.nextButton = control('Next 下一幢 →', 'preview-nav');
    this.nextButton.addEventListener('click', () => this.stepPreview(1));
    this.previewCount = node('span', 'preview-count');
    const views = node('div', 'preview-button-group');
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', 'Camera views');
    for (const [id, label] of [['full', 'Full 全幢'], ['roof', 'Roof 屋頂'], ['base', 'Base 基座']]) {
      const btn = control(label, 'inventory-control');
      btn.dataset.previewView = id;
      btn.addEventListener('click', () => this.fitView(id));
      views.appendChild(btn);
    }
    this.rotateButton = control('Auto rotate 自動旋轉', 'inventory-control');
    this.rotateButton.setAttribute('aria-pressed', 'false');
    this.rotateButton.addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      this.rotateButton.setAttribute('aria-pressed', String(this.autoRotate));
    });
    const times = node('div', 'preview-button-group');
    times.setAttribute('role', 'group');
    times.setAttribute('aria-label', 'Preview lighting');
    this.timeButtons = new Map();
    for (const [id, label] of [['midday', 'Day 日間'], ['midnight', 'Night 夜間']]) {
      const btn = control(label, 'inventory-control');
      btn.dataset.previewTime = id;
      btn.setAttribute('aria-pressed', String(id === this.previewTime));
      btn.addEventListener('click', () => this.setPreviewTime(id));
      this.timeButtons.set(id, btn);
      times.appendChild(btn);
    }
    bottom.append(this.prevButton, this.previewCount, views, this.rotateButton, times, this.nextButton);

    const hint = node('div', 'preview-chrome preview-hint',
      'Drag to orbit · Wheel / pinch to zoom · Right-drag to pan · H clean view · Esc back');
    this.previewUI.append(top, info, bottom, hint);
    document.body.append(this.inventoryModal, this.previewUI);

    const integratedCount = this.entries.filter((entry) => entry.status === 'integrated').length;
    const pendingCount = this.entries.length - integratedCount;
    this.inventorySummary.textContent = `${integratedCount} integrated / 已加入可預覽 · ${pendingCount} planned / 待製作`;
  }

  bindEvents() {
    this.toolbarButton.addEventListener('click', () => this.toggleInventory());
    this.searchInput.addEventListener('input', () => this.renderList());
    this.inventoryModal.addEventListener('pointerdown', (event) => {
      if (event.target === this.inventoryModal) this.closeInventory();
    });

    window.addEventListener('keydown', (event) => {
      const typing = event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]');
      if (event.code === 'KeyI' && !typing && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (this.isPreviewOpen()) this.closePreview({ showInventory: true });
        else this.toggleInventory();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return; // keep browser / OS shortcuts intact
      if (!this.isPreviewOpen() && this.inventoryModal.hidden) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (this.isPreviewOpen()) this.closePreview({ showInventory: true });
        else this.closeInventory();
        return;
      }
      if (!this.isPreviewOpen()) {
        // The catalogue is modal to game shortcuts, without blocking normal focus or list scrolling.
        if (!typing) event.stopImmediatePropagation();
        return;
      }
      if (typing) return;
      if (event.code === 'KeyH' && !event.repeat) {
        document.body.classList.toggle('building-preview-clean');
      } else if (event.code === 'ArrowLeft') {
        this.stepPreview(-1);
      } else if (event.code === 'ArrowRight') {
        this.stepPreview(1);
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    this.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event), true);
    this.canvas.addEventListener('pointermove', (event) => this.onPointerMove(event), true);
    this.canvas.addEventListener('pointerup', (event) => this.onPointerUp(event), true);
    this.canvas.addEventListener('pointercancel', (event) => this.onPointerUp(event), true);
    this.canvas.addEventListener('wheel', (event) => this.onWheel(event), { capture: true, passive: false });
    this.canvas.addEventListener('contextmenu', (event) => {
      if (!this.isPreviewOpen()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  renderList() {
    const query = this.searchInput.value.trim().toLocaleLowerCase();
    const visible = this.entries.filter((entry) => {
      if (this.filter !== 'all' && entry.status !== this.filter) return false;
      if (!query) return true;
      return `${entry.id} ${entry.name} ${entry.district} ${entry.heightLabel}`.toLocaleLowerCase().includes(query);
    });
    this.resultCount.textContent = `Showing 顯示 ${visible.length}／${this.entries.length}`;
    const rows = visible.map((entry) => this.makeRow(entry));
    if (!rows.length) rows.push(node('p', 'inventory-empty', '沒有符合搜尋條件的建築。'));
    this.list.replaceChildren(...rows);
  }

  makeRow(entry) {
    const available = entry.status === 'integrated' && Boolean(this.world[entry.worldKey]?.group);
    const row = node(available ? 'button' : 'article', `building-inventory-row ${available ? 'is-integrated' : 'is-pending'}`);
    if (available) {
      row.type = 'button';
      row.dataset.buildingId = entry.id;
      row.setAttribute('aria-label', `單幢預覽 ${entry.name}`);
    }
    row.setAttribute('role', 'listitem');
    const id = node('span', 'inventory-row-id', entry.id);
    const name = node('span', 'inventory-row-name', entry.name);
    const district = node('span', 'inventory-row-district', entry.district);
    const height = node('span', 'inventory-row-height', entry.heightLabel);
    const status = node('span', `inventory-row-status ${available ? 'ready' : 'pending'}`,
      available ? 'View 3D 查看 →' : 'Planned 待製作 · no model');
    row.append(id, name, district, height, status);
    return row;
  }

  toggleInventory() {
    if (this.inventoryModal.hidden) this.openInventory();
    else this.closeInventory();
  }

  openInventory() {
    if (this.isPreviewOpen()) return;
    this.closePopovers?.();
    if (this.mapSystem?.isFullMapOpen) this.mapSystem.toggleFullMap(false);
    this.lastFocus = this.toolbarButton;
    this.inventoryModal.hidden = false;
    this.toolbarButton.setAttribute('aria-expanded', 'true');
    this.toolbarButton.classList.add('is-open');
    this.renderList();
    requestAnimationFrame(() => this.searchInput.focus({ preventScroll: true }));
  }

  closeInventory() {
    this.inventoryModal.hidden = true;
    this.toolbarButton.setAttribute('aria-expanded', 'false');
    this.toolbarButton.classList.remove('is-open');
    this.searchInput.blur();
    if (this.lastFocus instanceof HTMLElement && this.lastFocus.isConnected) this.lastFocus.focus({ preventScroll: true });
  }

  isPreviewOpen() {
    return Boolean(this.activeEntry);
  }

  openPreview(id) {
    const entry = this.entries.find((item) => item.id === id);
    const worldObject = entry?.status === 'integrated' ? this.world[entry.worldKey] : null;
    if (!worldObject?.group) return false;

    if (!this.isPreviewOpen()) this.beginIsolation();
    else this.removeRig();
    this.activeEntry = entry;
    this.previewModel = worldObject.group.clone(true);
    this.previewModel.name = `IsolatedBuildingPreview_${entry.id}`;
    this.previewModel.visible = true;
    this.previewModel.traverse((object) => {
      object.frustumCulled = false;
      if (object.isMesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });
    this.previewModel.updateMatrixWorld(true);
    this.bounds = new THREE.Box3().setFromObject(this.previewModel);
    if (this.bounds.isEmpty() || ![...this.bounds.min.toArray(), ...this.bounds.max.toArray()].every(Number.isFinite)) {
      this.closePreview({ showInventory: true });
      return false;
    }

    this.buildRig();
    this.inventoryModal.hidden = true;
    this.previewUI.hidden = false;
    document.body.classList.add('building-preview-open');
    document.body.classList.remove('building-preview-clean');
    this.toolbarButton.setAttribute('aria-expanded', 'false');
    this.toolbarButton.classList.remove('is-open');
    this.previewId.textContent = `${entry.id} · ${entry.district}`;
    this.previewName.textContent = entry.name;
    this.previewMeta.textContent = `Reference height 參考高度：${entry.heightLabel}`;
    this.previewTitle.textContent = `${entry.id} · Single-building 3D 單幢測試`;
    const index = this.integrated.findIndex((item) => item.id === entry.id);
    this.previewCount.textContent = `${index + 1}／${this.integrated.length}`;
    this.setPreviewTime(this.previewTime);
    this.fitView('full');
    this.backButton.focus({ preventScroll: true });
    return true;
  }

  beginIsolation() {
    this.closePopovers?.();
    if (this.mapSystem?.isFullMapOpen) this.mapSystem.toggleFullMap(false);
    this.controllerManager.resetInput();
    this.saved = {
      visibility: this.scene.children.map((child) => [child, child.visible]),
      background: this.scene.background,
      cameraPosition: this.camera.position.clone(),
      cameraQuaternion: this.camera.quaternion.clone(),
      cameraFov: this.camera.fov,
      preset: this.lightingSystem.activePresetId,
      touchEnabled: this.touchControls.enabled,
      gamepadEnabled: this.gamepadControls.enabled
    };
    // Keep the two city-wide lights visible so precompiled shared materials retain their established lighting path.
    const inspectionLights = new Set([this.lightingSystem.sunLight, this.lightingSystem.hemiLight]);
    for (const child of this.scene.children) child.visible = inspectionLights.has(child);
    this.touchControls.setEnabled(false);
    this.gamepadControls.setEnabled(false);
    this.scene.background = new THREE.Color(0x405461);
  }

  buildRig() {
    const center = this.bounds.getCenter(new THREE.Vector3());
    const size = this.bounds.getSize(new THREE.Vector3());
    this.rig = new THREE.Group();
    this.rig.name = 'BuildingInventoryPreviewRig';
    this.rig.add(this.previewModel);

    const gridSize = Math.max(30, Math.ceil(Math.max(size.x, size.z) * 2.4 / 10) * 10);
    this.grid = new THREE.GridHelper(gridSize, 24, 0x60788a, 0x354955);
    this.grid.name = 'BuildingPreviewScaleGrid';
    this.grid.position.set(center.x, this.bounds.min.y - 0.04, center.z);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.34;
    this.grid.material.depthWrite = false;
    this.rig.add(this.grid);
    this.scene.add(this.rig);
  }

  removeRig() {
    if (!this.rig) return;
    this.scene.remove(this.rig);
    if (this.grid) {
      this.grid.geometry.dispose();
      this.grid.material.dispose();
    }
    this.rig = null;
    this.previewModel = null;
    this.grid = null;
    this.pointers.clear();
  }

  setPreviewTime(id) {
    if (!this.isPreviewOpen()) return;
    this.previewTime = id === 'midnight' ? 'midnight' : 'midday';
    this.selectTime(this.previewTime);
    // The city uses aerial fog. An inspector must not fade a tall building out at its fitted orbit distance.
    this.scene.fog.density = 0;
    if (this.lightingSystem.uFogDensity) this.lightingSystem.uFogDensity.value = 0;
    const night = this.previewTime === 'midnight';
    this.scene.background = new THREE.Color(night ? 0x080d14 : 0x405461);
    if (this.grid) this.grid.material.opacity = night ? 0.18 : 0.34;
    for (const [key, button] of this.timeButtons) button.setAttribute('aria-pressed', String(key === this.previewTime));
  }

  fitView(mode = 'full') {
    if (!this.bounds || !this.isPreviewOpen()) return;
    const center = this.bounds.getCenter(new THREE.Vector3());
    const size = this.bounds.getSize(new THREE.Vector3());
    const radius = Math.max(1, size.length() * 0.5);
    const horizontalRadius = Math.max(2, Math.hypot(size.x, size.z) * 0.5);
    const target = center.clone();
    let distance = radius / Math.sin(THREE.MathUtils.degToRad(24)) * 1.18;
    let pitch = 0.22;
    if (this.camera.aspect < 1) distance /= Math.max(0.55, this.camera.aspect);
    if (mode === 'roof') {
      target.y = this.bounds.max.y - Math.min(size.y * 0.08, 12);
      distance = Math.max(horizontalRadius * 2.8, 35);
      pitch = 1.18;
    } else if (mode === 'base') {
      target.y = this.bounds.min.y + Math.min(10, size.y * 0.08);
      distance = Math.max(horizontalRadius * 2.6, Math.min(size.y * 0.34, 150), 28);
      pitch = 0.10;
    }
    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();
    this.orbit = {
      yaw: Math.PI * 0.75,
      pitch,
      distance,
      target,
      minDistance: Math.max(1, radius * 0.08),
      maxDistance: Math.max(2000, radius * 12)
    };
    this.updateCamera();
  }

  stepPreview(direction) {
    if (!this.isPreviewOpen() || !this.integrated.length) return;
    const index = this.integrated.findIndex((entry) => entry.id === this.activeEntry.id);
    const next = this.integrated[(index + direction + this.integrated.length) % this.integrated.length];
    this.openPreview(next.id);
  }

  update(dt, elapsed) {
    if (!this.isPreviewOpen()) return;
    if (this.autoRotate && this.orbit && !this.pointers.size) this.orbit.yaw += dt * 0.28;
    this.world[this.activeEntry.worldKey].update?.(dt, elapsed);
    this.updateCamera();
  }

  updateCamera() {
    if (!this.orbit) return;
    const o = this.orbit;
    o.pitch = clamp(o.pitch, -0.08, 1.45);
    o.distance = clamp(o.distance, o.minDistance, o.maxDistance);
    const horizontal = Math.cos(o.pitch) * o.distance;
    this.camera.position.set(
      o.target.x + Math.sin(o.yaw) * horizontal,
      o.target.y + Math.sin(o.pitch) * o.distance,
      o.target.z + Math.cos(o.yaw) * horizontal
    );
    this.camera.lookAt(o.target);
    this.camera.updateMatrixWorld();
  }

  pan(dx, dy) {
    if (!this.orbit) return;
    const scale = this.orbit.distance * 0.0015;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    this.orbit.target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
  }

  onPointerDown(event) {
    if (!this.isPreviewOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.canvas.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
    this.autoRotate = false;
    this.rotateButton.setAttribute('aria-pressed', 'false');
  }

  onPointerMove(event) {
    if (!this.isPreviewOpen() || !this.pointers.has(event.pointerId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const previousPoints = [...this.pointers.values()].map((point) => ({ ...point }));
    const previous = this.pointers.get(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: previous.button });
    if (this.pointers.size === 1) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (previous.button === 2 || event.shiftKey) this.pan(dx, dy);
      else {
        this.orbit.yaw -= dx * 0.006;
        this.orbit.pitch += dy * 0.005;
      }
    } else {
      const currentPoints = [...this.pointers.values()];
      const oldDistance = Math.hypot(previousPoints[0].x - previousPoints[1].x, previousPoints[0].y - previousPoints[1].y);
      const newDistance = Math.hypot(currentPoints[0].x - currentPoints[1].x, currentPoints[0].y - currentPoints[1].y);
      if (oldDistance > 0 && newDistance > 0) this.orbit.distance *= oldDistance / newDistance;
      const oldX = (previousPoints[0].x + previousPoints[1].x) * 0.5;
      const oldY = (previousPoints[0].y + previousPoints[1].y) * 0.5;
      const newX = (currentPoints[0].x + currentPoints[1].x) * 0.5;
      const newY = (currentPoints[0].y + currentPoints[1].y) * 0.5;
      this.pan(newX - oldX, newY - oldY);
    }
    this.updateCamera();
  }

  onPointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.pointers.delete(event.pointerId);
    if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  }

  onWheel(event) {
    if (!this.isPreviewOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.orbit.distance *= Math.exp(event.deltaY * 0.001);
    this.autoRotate = false;
    this.rotateButton.setAttribute('aria-pressed', 'false');
    this.updateCamera();
  }

  closePreview({ showInventory = true } = {}) {
    if (!this.isPreviewOpen()) return;
    this.removeRig();
    this.activeEntry = null;
    this.previewUI.hidden = true;
    document.body.classList.remove('building-preview-open', 'building-preview-clean');
    this.restoreCity();
    if (showInventory) this.openInventory();
    else this.toolbarButton.focus({ preventScroll: true });
  }

  restoreCity() {
    if (!this.saved) return;
    const saved = this.saved;
    this.saved = null;
    for (const [child, visible] of saved.visibility) child.visible = visible;
    this.scene.background = saved.background;
    this.camera.position.copy(saved.cameraPosition);
    this.camera.quaternion.copy(saved.cameraQuaternion);
    this.camera.fov = saved.cameraFov;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    // Force a real restoration even when the preview and original city used the same preset: preview fog was zeroed.
    this.lightingSystem.applyPreset(saved.preset, true);
    this.selectTime(saved.preset);
    this.touchControls.setEnabled(saved.touchEnabled);
    this.gamepadControls.setEnabled(saved.gamepadEnabled);
    this.controllerManager.resetInput();
  }
}
