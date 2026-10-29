import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, positionView, metalness, roughness, vec2, smoothstep } from 'three/tsl';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { createPostProcessing } from './post-processing.js';
import { ClusteredLighting } from 'three/addons/lighting/ClusteredLighting.js';
import { isTypingInField } from './city-config.js';
import { ThirdPersonControllerManager } from './controllers.js';
import { TouchControls } from './touch-controls.js';
import { GamepadControls } from './gamepad-controls.js';
import { CameraSystem, CAMERA_PRESETS } from './cameras.js';
import { LightingSystem } from './lighting.js';
import { createTeleportTo } from './teleport.js';
import { CITIES, getCity } from './cities/registry.js';

// Application shell: home-screen city picker, renderer setup, HUD wiring and the frame loop.
// City-specific world building lives in js/cities/<id>/index.js.

function renderCityCards() {
  const list = document.getElementById('city-cards');
  if (!list) return;
  for (const city of CITIES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'city-card';
    card.dataset.city = city.id;

    const badge = document.createElement('span');
    badge.className = 'city-card-badge';
    badge.textContent = city.badge;

    const name = document.createElement('span');
    name.className = 'city-card-name';
    name.textContent = city.name;

    const tagline = document.createElement('span');
    tagline.className = 'city-card-tagline';
    tagline.textContent = city.tagline;

    const description = document.createElement('span');
    description.className = 'city-card-description';
    description.textContent = city.description;

    const cta = document.createElement('span');
    cta.className = 'city-card-cta';
    cta.textContent = 'Enter city →';

    card.append(badge, name, tagline, description, cta);
    card.addEventListener('click', () => startCity(city.id));
    list.appendChild(card);
  }
}

let booting = false;

function startCity(cityId) {
  if (booting) return;
  const cityStub = getCity(cityId);
  if (!cityStub) return;
  booting = true;
  document.getElementById('start-overlay')?.classList.add('hidden');
  document.getElementById('loading-overlay')?.classList.remove('hidden');
  initApp(cityStub).catch((error) => {
    console.error('[boot]', error);
    booting = false;
    document.getElementById('loading-overlay')?.classList.add('hidden');
    document.getElementById('start-overlay')?.classList.remove('hidden');
    const status = document.getElementById('loading-status');
    if (status) status.textContent = `Could not start ${cityStub.name}: ${error.message}`;
  });
}

async function initApp(cityStub) {
  const { city } = await cityStub.load();

  document.title = `${city.name} — Slop Cities`;
  const brandTitle = document.getElementById('brand-title');
  if (brandTitle) brandTitle.textContent = city.name;
  const brandBullet = document.getElementById('brand-bullet');
  if (brandBullet) brandBullet.textContent = city.short;
  const loaderTitle = document.getElementById('loader-title');
  if (loaderTitle) loaderTitle.textContent = city.name;
  const loaderBullet = document.getElementById('loader-bullet');
  if (loaderBullet) loaderBullet.textContent = city.short;

  const container = document.getElementById('canvas-container');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingStatus = document.getElementById('loading-status');
  const loadingTrack = loadingOverlay ? loadingOverlay.querySelector('.loader-track') : null;
  const loadingFill = document.getElementById('loading-progress');
  // The loading bar sweeps while the city is being built (the main thread is busy) and fills as the shaders compile
  const setLoadingProgress = (p) => {
    if (!loadingFill) return;
    if (loadingTrack) loadingTrack.classList.remove('is-indeterminate');
    loadingFill.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  };
  const setStatus = (text) => {
    if (loadingStatus) loadingStatus.textContent = text;
  };

  setStatus(`Initializing three.js r${THREE.REVISION} WebGPURenderer & TSL Shaders...`);

  // 1. Initialize Three.js WebGPURenderer with 32-bit float reversedDepthBuffer
  const renderer = new THREE.WebGPURenderer({
    antialias: true,
    powerPreference: 'high-performance',
    reversedDepthBuffer: true
  });
  renderer.setPixelRatio(1.0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.lighting = new ClusteredLighting(256, 32, 28, 48);
  container.appendChild(renderer.domElement);

  // Start-up phase timings (logged once as "[init] ...") to keep load-time regressions traceable
  let initTimings = [];
  let initMark = performance.now();
  const markInit = (label) => {
    const now = performance.now();
    initTimings.push(`${label} ${Math.round(now - initMark)}ms`);
    initMark = now;
  };

  await renderer.init();
  markInit('renderer');

  // 2. Scene, atmosphere and lighting
  const scene = new THREE.Scene();
  const lightingSystem = new LightingSystem(scene, renderer);
  markInit('lighting');

  // 3. Build the selected city's world. The pack owns every city-specific asset and builder.
  const world = await city.build({ scene, renderer, lightingSystem, markInit, setStatus });
  markInit('world');

  const colliders = world.colliders ?? [];
  const dynamicRoots = [];

  // 4. Initialize Third-Person Controllers (Person, Car, Cyclist, Helicopter) & Multi-Camera System
  const controllerManager = new ThirdPersonControllerManager(scene, colliders, world.player ?? null, world.theme ?? city.theme ?? null);
  // Cities can rename the HUD labels of the shared actors (e.g. Grid City has no yellow cabs).
  const entityLabels = world.entityLabels ?? city.entityLabels;
  if (entityLabels) {
    for (const [mode, label] of Object.entries(entityLabels)) {
      if (controllerManager.entities[mode]) controllerManager.entities[mode].label = label;
    }
  }
  const storageKey = city.storageKey || `slop-${city.id}-player-state`;
  let restored = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.version === 1) {
      for (const mode of Object.keys(controllerManager.entities)) {
        const p = saved.entities?.[mode];
        if (!p || ![p.x, p.y, p.z, p.heading].every(Number.isFinite)) continue;
        controllerManager.setMode(mode);
        controllerManager.teleportActiveTo(p.x, p.z, p.heading, p.y);
      }
      controllerManager.setMode(Object.hasOwn(controllerManager.entities, saved.activeMode) ? saved.activeMode : 'car');
      restored = true;
    }
  } catch { /* Missing or unavailable storage does not prevent playing. */ }
  if (!restored && world.spawn) {
    for (const mode of Object.keys(controllerManager.entities)) {
      const point = world.spawn(mode);
      if (!point) continue;
      controllerManager.setMode(mode);
      controllerManager.teleportActiveTo(point.x, point.z, point.heading ?? Math.PI, point.y ?? null);
    }
    controllerManager.setMode(controllerManager.entities[world.defaultMode ?? city.defaultMode] ? (world.defaultMode ?? city.defaultMode) : 'car');
  }

  function savePlayerState() {
    try {
      const entities = Object.fromEntries(Object.entries(controllerManager.entities).map(([mode, entity]) => [mode, {
        x: entity.position.x, y: entity.position.y, z: entity.position.z, heading: entity.heading
      }]));
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, activeMode: controllerManager.activeMode, entities }));
    } catch { /* Storage may be disabled or full. */ }
  }

  const cameraSystem = new CameraSystem(renderer.domElement, controllerManager);
  globalThis.__slopDebug = { scene, renderer, cameraSystem, controllerManager, world };
  const touchControls = new TouchControls(controllerManager);
  const soundButton = document.getElementById('btn-sound');
  const silentAudio = {
    enabled: false,
    supported: false,
    ready: false,
    setEnabled() {},
    update() {},
    dispose() {},
    honk() {}
  };
  let audioSystem = world.createAudio
    ? world.createAudio({ controllerManager, onStateChange: () => updateSoundButton() })
    : silentAudio;
  function updateSoundButton() {
    if (!soundButton) return;
    soundButton.disabled = !audioSystem.supported;
    soundButton.hidden = !audioSystem.supported;
    soundButton.setAttribute('aria-pressed', String(audioSystem.enabled));
    soundButton.setAttribute('aria-label', audioSystem.enabled ? 'Mute sound' : 'Enable sound');
    soundButton.title = audioSystem.supported ? `${audioSystem.enabled ? 'Mute' : 'Enable'} sound [N]` : 'Web Audio is unavailable';
    const use = soundButton.querySelector('use');
    if (use) use.setAttribute('href', audioSystem.enabled ? '#i-sound' : '#i-sound-off');
  }
  soundButton?.addEventListener('click', () => audioSystem.setEnabled(!audioSystem.enabled));
  updateSoundButton();
  // pagehide also covers navigation away on mobile; preserve the context across back-forward cache restores.
  window.addEventListener('pagehide', (event) => {
    savePlayerState();
    if (!event.persisted) audioSystem.dispose();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) savePlayerState(); });
  markInit('controllers');

  // 5. Wire UI Controls (Strictly using safe DOM APIs: textContent, classList, addEventListener)
  const modeButtons = document.querySelectorAll('[data-mode]');
  const cameraButtons = document.querySelectorAll('[data-camera]');
  const timeButtons = document.querySelectorAll('[data-time]');
  const hudToggleBtn = document.getElementById('btn-toggle-hud');
  const modeSwitch = document.getElementById('mode-switch');
  touchControls.onAvailabilityChange = placeModeIndicator;

  const elFps = document.getElementById('hud-fps');
  const elMode = document.getElementById('hud-active-mode');
  const elCamera = document.getElementById('hud-active-camera');
  const elSpeed = document.getElementById('hud-speed');
  const elSpeedMeter = document.getElementById('hud-speed-meter');
  const elAltitude = document.getElementById('hud-altitude');
  const elLocation = document.getElementById('hud-location');
  const elControlsHint = document.getElementById('hud-controls-hint');
  const gamepadControls = new GamepadControls(controllerManager, cameraSystem, {
    onCycleMode: (step) => {
      const modes = ['person', 'car', 'cyclist', 'helicopter'];
      selectMode(modes[(modes.indexOf(controllerManager.activeMode) + step + modes.length) % modes.length]);
    },
    onCycleCamera: cycleCamera,
    onToggleMap: () => { if (mapSystem) mapSystem.toggleFullMap(!mapSystem.isFullMapOpen); },
    onCloseMap: () => { if (mapSystem) mapSystem.toggleFullMap(false); }
  });

  // Keyboard guide for each mode: [keys, action]
  const controlHints = {
    person: [[['W', 'S'], 'Walk / Run'], [['A', 'D'], 'Turn'], [['Space'], 'Jump'], [['Drag'], 'Orbit']],
    car: [[['W', 'S'], 'Drive / Reverse'], [['A', 'D'], 'Steer'], [['B'], 'Horn'], [['Drag'], 'Orbit']],
    cyclist: [[['W', 'S'], 'Pedal / Brake'], [['A', 'D'], 'Lean & Turn'], [['Drag'], 'Orbit']],
    helicopter: [[['W', 'S'], 'Pitch'], [['A', 'D'], 'Yaw'], [['Space', 'E'], 'Ascend'], [['Q', 'C'], 'Descend']]
  };
  // Top speeds in mph (controllers.js caps them at 8.2, 36, 19 & 52 m/s): full scale of the speed meter
  const topSpeedMph = { person: 18, car: 81, cyclist: 43, helicopter: 116 };

  // Cities may expose only a subset of the cameras (Grid City has no Manhattan scenic rigs).
  const cameraPresets = world.cameraPresets ?? city.cameraPresets ?? null;
  const allowedCameraIds = cameraPresets ? new Set(cameraPresets) : null;
  const cameraPresetList = () => CAMERA_PRESETS.filter((preset) => !allowedCameraIds || allowedCameraIds.has(preset.id));
  // Number keys 8-0 are per-city: each pack gives three of its scenic cameras a shortcut field.
  const selectShortcutCamera = (digit) => {
    const preset = cameraPresetList().find((entry) => entry.shortcut === digit);
    if (preset) selectCamera(preset.id, true);
  };

  function renderControlHints(mode) {
    if (!elControlsHint) return;
    const items = (controlHints[mode] || []).map(([keys, action]) => {
      const item = document.createElement('span');
      item.className = 'hint';
      for (const key of keys) {
        const kbd = document.createElement('kbd');
        kbd.textContent = key;
        item.appendChild(kbd);
      }
      const label = document.createElement('span');
      label.className = 'hint-label';
      label.textContent = action;
      item.appendChild(label);
      return item;
    });
    elControlsHint.replaceChildren(...items);
  }

  // The taxi-yellow pill under the selected mode glides from button to button
  function placeModeIndicator() {
    const active = modeSwitch ? modeSwitch.querySelector('.mode-btn.active') : null;
    if (!active) return;
    modeSwitch.style.setProperty('--ind-x', `${active.offsetLeft}px`);
    modeSwitch.style.setProperty('--ind-w', `${active.offsetWidth}px`);
  }

  function selectMode(mode) {
    controllerManager.setMode(mode);
    touchControls.setMode(controllerManager.activeMode);
    gamepadControls.reset();
    modeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    document.body.dataset.mode = mode;
    placeModeIndicator();
    const ent = controllerManager.getActiveEntity();
    if (elMode) elMode.textContent = ent.label;
    renderControlHints(mode);

    // If currently on a static scenic camera, switch to 3rd-Person Chase so user sees their selected character/vehicle
    const currentCam = cameraSystem.getActivePreset();
    if (currentCam.category !== 'follow') {
      selectCamera('chase', false);
    }
  }

  function selectCamera(camId, snap = false) {
    if (allowedCameraIds && !allowedCameraIds.has(camId)) return;
    cameraSystem.setCameraPreset(camId, snap);
    cameraButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-camera') === camId);
    });
    const preset = cameraSystem.getActivePreset();
    if (elCamera) elCamera.textContent = preset.name;
  }

  // Steps through the city's available presets (V / Shift+V, and the arrows either side of the camera name)
  function cycleCamera(step) {
    const presets = cameraPresetList();
    const n = presets.length;
    if (!n) return;
    const idx = presets.findIndex((p) => p.id === cameraSystem.activePresetId);
    selectCamera(presets[(idx + step + n) % n].id, true);
  }

  function selectTime(timeId) {
    lightingSystem.applyPreset(timeId);
    colorGrade.applyPreset(lightingSystem.activePresetId);
    timeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-time') === timeId);
    });
  }

  // Popovers (native [popover]: light dismiss & Esc for free) open against the control that toggles them: data-anchor
  // names the element they sit above / below, data-align the one whose right edge they line up with
  const popovers = document.querySelectorAll('.popover[popover]');
  const supportsPopover = typeof HTMLElement.prototype.togglePopover === 'function';
  function closePopovers() {
    if (!supportsPopover) return;
    popovers.forEach((pop) => {
      if (pop.matches(':popover-open')) pop.hidePopover();
    });
  }
  popovers.forEach((pop) => {
    const invoker = document.querySelector(`[popovertarget="${pop.id}"]`);
    pop.addEventListener('beforetoggle', (e) => {
      const open = e.newState === 'open';
      if (invoker) invoker.classList.toggle('is-open', open);
      if (!open) return;
      const anchor = document.getElementById(pop.dataset.anchor) || invoker;
      const align = document.getElementById(pop.dataset.align) || invoker;
      if (!anchor || !align) return;
      const r = anchor.getBoundingClientRect();
      const spaceAbove = Math.max(0, r.top - 20);
      const spaceBelow = Math.max(0, window.innerHeight - r.bottom - 20);
      let above = pop.dataset.side === 'above';
      // The camera control moves to the top on touch screens; open toward the available space.
      if ((above ? spaceAbove : spaceBelow) < 160) above = spaceAbove > spaceBelow;
      pop.style.right = `${Math.max(8, window.innerWidth - align.getBoundingClientRect().right)}px`;
      if (above) {
        pop.style.top = 'auto';
        pop.style.bottom = `${window.innerHeight - r.top + 8}px`;
        pop.style.maxHeight = `${spaceAbove}px`;
      } else {
        pop.style.bottom = 'auto';
        pop.style.top = `${r.bottom + 8}px`;
        pop.style.maxHeight = `${spaceBelow}px`;
      }
    });
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectMode(btn.getAttribute('data-mode'));
    });
  });

  cameraButtons.forEach((btn) => {
    const camId = btn.getAttribute('data-camera');
    if (allowedCameraIds && !allowedCameraIds.has(camId)) btn.hidden = true;
    btn.addEventListener('click', () => {
      selectCamera(camId, true);
      closePopovers();
    });
  });
  const scenicTitle = document.getElementById('camera-scenic-title');
  if (scenicTitle && !cameraPresetList().some((preset) => preset.category === 'scenic')) scenicTitle.hidden = true;

  const camPrevBtn = document.getElementById('cam-prev');
  const camNextBtn = document.getElementById('cam-next');
  if (camPrevBtn) camPrevBtn.addEventListener('click', () => cycleCamera(-1));
  if (camNextBtn) camNextBtn.addEventListener('click', () => cycleCamera(1));

  timeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectTime(btn.getAttribute('data-time'));
    });
  });

  // A mouse click mustn't leave the focus on a HUD button, or Space (jump / ascend) and Enter would press it again
  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('button') : null;
    if (btn && e.detail > 0) btn.blur();
  });

  // Where you are: the place's name over its street corner, drawn as a pair of NYC street-name signs
  const roadNames = world.roadNames ?? city.roadNames ?? new Set();
  const placeNames = world.placeNames ?? city.placeNames ?? new Set();
  const locationLabel = world.locationLabel ?? city.locationLabel ?? (() => city.name);
  let locationText = '';
  function renderLocation(label) {
    if (!elLocation || label === locationText) return;
    locationText = label;
    let place = '';
    let streets = label;
    const split = label.indexOf(' · ');
    if (split >= 0) {
      place = label.slice(0, split);
      streets = label.slice(split + 3);
    } else if (placeNames.has(label) || (!label.includes(' & ') && !roadNames.has(label))) {
      place = label;
      streets = '';
    }
    const nodes = [];
    if (place) {
      const el = document.createElement('div');
      el.className = 'location-place';
      el.textContent = place;
      nodes.push(el);
    }
    if (streets) {
      const row = document.createElement('div');
      row.className = 'location-signs';
      if (streets.startsWith('near ')) {
        streets = streets.slice(5);
        const near = document.createElement('span');
        near.className = 'location-near';
        near.textContent = 'near';
        row.appendChild(near);
      }
      for (const name of streets.split(' & ')) {
        const sign = document.createElement('span');
        sign.className = 'street-sign';
        sign.textContent = name;
        row.appendChild(sign);
      }
      nodes.push(row);
    }
    elLocation.replaceChildren(...nodes);
  }

  let mapSystem = null;
  const teleportTo = createTeleportTo({
    controllerManager,
    touchControls,
    gamepadControls,
    cameraSystem,
    selectCamera,
    getMapSystem: () => mapSystem,
    locationLabel
  });

  if (world.createMap) {
    mapSystem = world.createMap({
      controllerManager,
      cameraSystem,
      onToggle: (open) => {
        controllerManager.resetInput();
        touchControls.setEnabled(!open);
        gamepadControls.setEnabled(!open);
        const mapHint = document.getElementById('fullmap-hover-info');
        if (open && touchControls.available && mapHint) {
          mapHint.textContent = 'Tap to teleport · Drag to pan · Use + / − to zoom';
        }
      },
      onTeleport: teleportTo
    });
  }
  document.body.classList.toggle('no-map', !mapSystem);

  // Teleport menu is generated from the city pack, so a new city only has to list its own destinations.
  const teleportPopover = document.getElementById('teleport-popover');
  const teleportTrigger = document.getElementById('btn-teleport');
  const teleports = world.teleports ?? city.teleports ?? [];
  if (teleportPopover && teleports.length) {
    teleportPopover.replaceChildren();
    const title = document.createElement('div');
    title.className = 'pop-title';
    title.textContent = 'Teleport to';
    teleportPopover.appendChild(title);
    for (const point of teleports) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pop-item tp-btn';
      button.dataset.teleport = point.id;
      const name = document.createElement('span');
      name.className = 'pop-name';
      name.textContent = point.name;
      const sub = document.createElement('span');
      sub.className = 'pop-sub';
      sub.textContent = point.sub;
      button.append(name, sub);
      button.addEventListener('click', () => {
        teleportTo(point.x, point.z, point.heading);
        closePopovers();
      });
      teleportPopover.appendChild(button);
    }
  } else if (teleportTrigger) {
    teleportTrigger.hidden = true;
  }

  const openMapBtn = document.getElementById('btn-open-map');
  if (openMapBtn) {
    openMapBtn.hidden = !mapSystem;
    openMapBtn.addEventListener('click', () => mapSystem?.toggleFullMap(true));
  }

  if (hudToggleBtn) {
    hudToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('hud-minimized');
      const isMin = document.body.classList.contains('hud-minimized');
      hudToggleBtn.setAttribute('aria-pressed', String(isMin));
      hudToggleBtn.setAttribute('aria-label', isMin ? 'Show HUD' : 'Hide HUD');
      hudToggleBtn.title = isMin ? 'Show the HUD [H]' : 'Clean view: hide the HUD [H]';
      if (isMin) closePopovers();
    });
  }

  // Global keyboard shortcuts for modes (1-4), cameras (V / 5-0), and HUD (H)
  window.addEventListener('keydown', (e) => {
    if (isTypingInField(e)) return;
    switch (e.code) {
      case 'Digit1':
        selectMode('person');
        break;
      case 'Digit2':
        selectMode('car');
        break;
      case 'Digit3':
        selectMode('cyclist');
        break;
      case 'Digit4':
        selectMode('helicopter');
        break;
      case 'Digit5':
        selectCamera('chase', true);
        break;
      case 'Digit6':
        selectCamera('action', true);
        break;
      case 'Digit7':
        selectCamera('pov', true);
        break;
      case 'Digit8':
        selectShortcutCamera('8');
        break;
      case 'Digit9':
        selectShortcutCamera('9');
        break;
      case 'Digit0':
        selectShortcutCamera('0');
        break;
      case 'KeyV':
        cycleCamera(e.shiftKey ? -1 : 1);
        break;
      case 'KeyH':
        if (hudToggleBtn) hudToggleBtn.click();
        break;
      case 'KeyN':
        if (!e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey && audioSystem.supported) audioSystem.setEnabled(!audioSystem.enabled);
        break;
      case 'KeyB':
        if (!e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey && !mapSystem?.isFullMapOpen) audioSystem.honk(controllerManager.getActiveEntity());
        break;
      case 'KeyM':
        if (mapSystem) mapSystem.toggleFullMap(!mapSystem.isFullMapOpen);
        break;
    }
  });

  window.addEventListener('resize', () => {
    cameraSystem.onResize(window.innerWidth, window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
    placeModeIndicator();
    if (mapSystem?.isFullMapOpen) {
      mapSystem.resizeFullCanvas();
      mapSystem.renderFullMap();
    }
  });

  // 6. Static-world preparation, culling and per-frame roots
  const updateCulling = world.updateCulling ? (position) => world.updateCulling(position) : null;
  dynamicRoots.push(
    ...(world.dynamicRoots ?? []),
    ...Object.values(controllerManager.entities).map((entity) => entity.mesh),
    controllerManager.entities.cyclist?.helmet
  );
  scene.updateMatrixWorld(true);
  scene.matrixWorldAutoUpdate = false;
  markInit('culling');

  // On WebGPU, small InstancedMeshes (<= 1000 instances) keep their matrices in uniform buffers that three.js
  // re-uploads on every draw of every pass (~2.5 MB/frame with the shadow cascades, stalling the GPU queue).
  // Storage attributes only upload when needed; WebGL2 needs ordinary instanced attributes for correct transforms.
  if (renderer.backend.isWebGPUBackend) {
    scene.traverse((object) => {
      if (object.isInstancedMesh) {
        object.instanceMatrix = new THREE.StorageInstancedBufferAttribute(object.instanceMatrix.array, 16);
      }
    });
  }

  // 7. TSL RenderPipeline with Half-Res Screen Space Reflections (SSRNode), Bloom & Filmic Toning
  //    Fade out distant and matte surfaces so SSR spends its rays on visible glossy reflections.
  const scenePass = pass(scene, cameraSystem.camera);
  // The multisampled colour attachments (output, normal, metalRough) only need resolving, never storing: discarding
  // them spares the GPU writing 3 x 4 samples per pixel to memory every frame (transient, memoryless attachments where
  // the browser supports them). The multisampled depth stays stored: SSR reads it.
  scenePass.renderTarget.storeMultisampledColorBuffer = false;
  const ssrFade = smoothstep(360.0, 180.0, positionView.z.negate());
  const maxSSRRoughness = 0.75;
  const sceneMRT = mrt({
    output: output,
    normal: normalView,
    metalRough: vec2(roughness.lessThan(maxSSRRoughness).select(metalness.mul(ssrFade), 0), roughness)
  });
  sceneMRT.setBlendMode('normal', new THREE.BlendMode(THREE.MaterialBlending));
  sceneMRT.setBlendMode('metalRough', new THREE.BlendMode(THREE.MaterialBlending));
  scenePass.setMRT(sceneMRT);

  const scenePassColor = scenePass.getTextureNode('output');
  const scenePassDepth = scenePass.getTextureNode('depth');
  const scenePassNormal = scenePass.getTextureNode('normal');
  const scenePassMetalRough = scenePass.getTextureNode('metalRough');

  const ssrPass = ssr(scenePassColor, scenePassDepth, scenePassNormal, {
    metalnessNode: scenePassMetalRough.r,
    roughnessNode: scenePassMetalRough.g,
    camera: cameraSystem.camera
  });
  ssrPass.resolutionScale = 0.5;
  ssrPass.blurQuality = 1;
  ssrPass.maxDistance.value = 42;
  ssrPass.thickness.value = 0.85;
  // Fewer coarse steps, then refine detected hits to keep reflection edges precise.
  ssrPass.quality.value = 0.25;
  ssrPass.binaryRefine = true;
  ssrPass.intensity.value = 0.50;
  ssrPass.screenEdgeFadeBlack = true;

  // Roughness mip blur must not spread reflections back onto matte or nonreflective surfaces.
  const reflectionMask = scenePassMetalRough.r.greaterThan(0).select(smoothstep(maxSSRRoughness, 0.55, scenePassMetalRough.g), 0);
  const reflections = ssrPass.mul(reflectionMask);
  const colorGrade = createPostProcessing(renderer, scenePassColor, reflections);
  const renderPipeline = new THREE.RenderPipeline(renderer, colorGrade.outputNode);

  // Initialize the UI and chase camera around the restored player, or the city's spawn.
  selectMode(controllerManager.activeMode);
  selectCamera('chase', true);
  selectTime('golden');
  // the web fonts change the buttons' widths once they arrive
  if (document.fonts) document.fonts.ready.then(placeModeIndicator);
  markInit('ui');

  // The loading screen stays up while the shaders compile (precompileShaders() & the warm-up frame, see the loop) and
  // until the first frame is on screen
  setStatus('Compiling Shaders & Render Pipelines...');

  // Compile shaders behind the loading screen. Overlapping compileAsync() jobs keep compilation moving
  // while individual jobs yield to the browser.
  const COMPILE_POOL = 16;
  const nextTask = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((resolve) => setTimeout(resolve, 0)));
  async function precompileShaders() {
    // An empty frame first: it sets up the post-processing chain, which configures the scene pass's render target
    // (MSAA samples, depth format), so the pipelines compiled below are the very ones the scene pass asks for
    scene.visible = false;
    renderPipeline.render();
    scene.visible = true;
    markInit('postFX');

    // Every visible object with frustum culling off (like the warm-up frame, see the loop). Plain meshes that share
    // a material share its shader, so one job compiles them in turn (the first build serves the rest); every
    // instanced mesh gets a build of its own unless its chunks share a pipeline
    const culled = [];
    const jobs = [];
    const jobByMaterial = new Map();
    const pipelines = new Set();
    scene.traverseVisible((o) => {
      if (o.frustumCulled) {
        culled.push(o);
        o.frustumCulled = false;
      }
      if (!o.isMesh && !o.isLine && !o.isPoints && !o.isSprite) return;
      // Use the first visible chunk: the original representative may be in an inactive tree cell. Shadow stand-ins
      // only draw in the shadow maps (the warm-up frame compiles those).
      if (o.userData.shadowProxy) return;
      const pipeline = o.userData.sharesPipelineWith || o;
      if (pipelines.has(pipeline)) return;
      pipelines.add(pipeline);
      if (o.isInstancedMesh || Array.isArray(o.material)) {
        jobs.push([o]);
        return;
      }
      let job = jobByMaterial.get(o.material);
      if (!job) {
        job = [];
        jobByMaterial.set(o.material, job);
        jobs.push(job);
      }
      job.push(o);
    });

    renderer.setRenderTarget(scenePass.renderTarget);
    renderer.setMRT(sceneMRT);
    const compile = async (object) => {
      // Each compile starts in a task of its own: compileAsync() keeps one precompilation state on the renderer,
      // which must not be mid-step for two of them in the same microtask checkpoint
      await nextTask();
      try {
        await renderer.compileAsync(object, cameraSystem.camera, scene);
      } catch (e) {
        console.warn('[compile]', e); // the warm-up frame compiles it instead
      }
    };
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        for (const object of job) await compile(object);
        done++;
        if (loadingStatus) {
          loadingStatus.textContent = `Compiling Shaders & Render Pipelines... ${Math.round((done / jobs.length) * 100)}%`;
        }
        setLoadingProgress(done / jobs.length);
      }
    };
    await Promise.all(Array.from({ length: COMPILE_POOL }, worker));
    renderer.setMRT(null);
    renderer.setRenderTarget(null);
    for (const o of culled) o.frustumCulled = true;
  }

  await precompileShaders();
  markInit('compile');

  // 8. Animation Loop
  let lastTime = performance.now();
  let elapsed = 0;
  let frameCount = 0;
  let fpsTimer = 0;
  let nextPlayerSave = 0;
  let warmedUp = false; // see the first frame below

  if (elFps) elFps.textContent = '60';

  renderer.setAnimationLoop((now) => {
    const rawDt = (now - lastTime) * 0.001;
    lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    elapsed += dt;

    // Update 3rd-person controllers, camera, and the city's own systems (traffic, signs, animation)
    gamepadControls.update(dt);
    controllerManager.update(dt, elapsed);
    cameraSystem.update(dt, elapsed);
    world.update?.(dt, elapsed, { cameraSystem, controllerManager });
    if (!document.hidden && now >= nextPlayerSave) {
      savePlayerState();
      nextPlayerSave = now + 5000;
    }
    lightingSystem.update(cameraSystem.currentPos);
    mapSystem?.update();
    audioSystem.update(dt, elapsed, cameraSystem.camera, lightingSystem.activePresetId === 'midnight');
    if (warmedUp && updateCulling) updateCulling(cameraSystem.camera.position); // the warm-up frame draws every chunk
    // Traffic collisions can move the player after controller updates; finalize moving hierarchies here.
    for (const root of dynamicRoots) root.updateMatrixWorld();

    // Render frame via TSL RenderPipeline (SSR + Bloom)
    if (!warmedUp) {
      // First frame = pipeline warm-up behind the loading screen, for what precompileShaders() can't reach (the shadow
      // map passes): with frustum culling off, every visible material's pipelines compile now instead of stalling the
      // first time the camera turns towards it (one chunk / shadow stand-in per shared pipeline is enough)
      const culled = [];
      const pipelines = new Set();
      scene.traverseVisible((o) => {
        const pipeline = o.userData.sharesPipelineWith || o;
        if (pipelines.has(pipeline)) return;
        pipelines.add(pipeline);
        if (o.frustumCulled) {
          culled.push(o);
          o.frustumCulled = false;
        }
      });
      renderPipeline.render();
      for (const o of culled) o.frustumCulled = true;
      markInit('warmup');
    }
    renderPipeline.render();
    if (!warmedUp) {
      warmedUp = true;
      markInit('firstFrame');
      // The loading screen stays up until the GPU has got through the first frame (and the pipelines its warm-up
      // compiled), i.e. until the city is actually on screen
      const device = renderer.backend.device;
      Promise.resolve(device && device.queue.onSubmittedWorkDone()).catch(() => {}).then(() => {
        markInit('gpu');
        console.log(`[init] ${city.name}: ${initTimings.join(', ')}`);
        initTimings = null;
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        audioSystem.ready = true;
        setLoadingProgress(1);
      });
    }

    // Telemetry uses wall time, not the clamped simulation step, so slow frames and high-refresh displays report
    // their actual frame rate (updates DOM every 250ms).
    frameCount++;
    fpsTimer += Math.max(0, rawDt);
    if (fpsTimer >= 0.25) {
      const currentFps = Math.round(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;

      const activeEnt = controllerManager.getActiveEntity();
      const mode = controllerManager.activeMode;
      const mph = Math.round(Math.abs(activeEnt.speed) * 2.237);
      const altFt = Math.max(0, Math.round(activeEnt.position.y * 3.281));

      if (elFps) {
        elFps.textContent = String(currentFps);
        elFps.className = currentFps >= 50 ? 'fps-ok' : currentFps >= 30 ? 'fps-warn' : 'fps-bad';
      }
      if (elSpeed) elSpeed.textContent = String(mph);
      if (elSpeedMeter) elSpeedMeter.style.transform = `scaleX(${Math.min(1, mph / (topSpeedMph[mode] || 80))})`;
      if (elAltitude) elAltitude.textContent = altFt.toLocaleString('en-US');
      // The street corner of the player on the follow cameras, of the camera itself on the scenic ones
      const where = cameraSystem.getActivePreset().category === 'follow' ? activeEnt.position : cameraSystem.currentPos;
      renderLocation(locationLabel(where.x, where.z));
    }
  });
}

renderCityCards();

// Direct links: /?city=grid starts that city without the picker (handy for sharing and smoke tests).
const requestedCity = new URLSearchParams(window.location.search).get('city');
if (requestedCity && getCity(requestedCity)) startCity(requestedCity);
