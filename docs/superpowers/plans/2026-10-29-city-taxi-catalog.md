# City Taxi Catalog and Hong Kong Crown Comfort Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Hong Kong taxi as a Toyota Crown Comfort-style car and make taxi appearance a per-city catalog so the player and AI traffic always share one definition.

**Architecture:** A new plain-data `js/taxi-styles.js` catalog maps city taxi ids to a body spec name, paint, shader livery, plate mode and optional door decal. `BODY_SPECS.hkTaxi` supplies the Crown Comfort loft; `createLoftedCarMaterial(..., { livery: 'hk' })` paints the two-tone body, trim, plates, decals and roof sign. Hong Kong traffic renders taxis and private cars in two instanced meshes; New York traffic resolves its existing taxi from the same catalog. The home-screen city cards show each city's taxi.

**Tech Stack:** Three.js WebGPU, TSL node materials, native ES modules, CanvasTexture, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-29-city-taxi-catalog-design.md`

## Global Constraints

- Taxi follows the selected city. No garage or cross-city taxi chooser.
- Hong Kong style id is `hk-urban`, body `hkTaxi`, paint `0xc6202b`, livery `hk`, plate `hk`, door decal `null`.
- New York style id is `nyc-medallion`, body `taxi`, paint `0xffbe14`, livery `nyc`, plate `nyc`, door decal `nyc`.
- Player and Hong Kong AI taxis must use the same `BODY_SPECS.hkTaxi` and `livery: 'hk'`.
- Player and AI collision footprint stays at half-width `0.86` and half-length `2.18`.
- Crown Comfort body target: about 4.5 m long, 1.72 m wide, 1.50 m roof; max half-width `0.86`.
- No per-vehicle materials, per-frame material rebuilds, or a draw call per taxi.
- Hong Kong private traffic must never use the taxi mesh or red paint; red means taxi.
- New York taxi body, door badge, plates, roof sign and per-instance `carState` behaviour must not regress.
- Rendering code must stay TSL; no custom GLSL pass.
- Run tests with `node --test "tests/*.test.cjs"` from `D:\slop-newyork`.
- No new dependencies.

## Review Focus

- A Hong Kong AI taxi still looks like a red private sedan, has the wrong body, or lacks the roof sign because traffic did not resolve the same style as the player. Task 6 pins the shared body/livery; Task 9 checks it visually.
- Door lettering or the green sticker lands on a different physical door on the left and right sides, or reads backwards. Task 5 pins the two-half atlas and side-dependent UVs; Task 9 checks both sides.
- The roof `TAXI` sign is mirrored from behind or unreadable at night. Task 5 pins the back-face UV flip and texture-based emissive; Task 9 checks front and back.
- Hong Kong AI taxis accidentally share the player's fixed-colour material and its mutable `carState` uniform, so player braking lights every taxi. Task 6 pins the instanced-paint/state material construction.
- The New York medallion taxi regresses, or a Hong Kong private car uses the Crown Comfort body. Tasks 6 and 7 pin both; the full suite in Task 9 catches collateral damage.

---

### Task 1: Taxi style catalog and city metadata

**Files:**
- Create: `js/taxi-styles.js`
- Modify: `js/cities/registry.js`
- Test: `tests/taxi-styles.test.cjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `TAXI_STYLES` (object keyed by id), `DEFAULT_TAXI_STYLE = 'nyc-medallion'`, `getTaxiStyle(id) -> style | null`; city entries gain `taxiStyle: string`.

- [ ] **Step 1: Write the failing catalog test**

```js
const assert = require('node:assert/strict');
const test = require('node:test');
let styles;
let registry;

test.before(async () => {
  styles = await import('../js/taxi-styles.js');
  registry = await import('../js/cities/registry.js');
});

test('taxi styles describe body, livery, plates and paint', () => {
  assert.ok(styles.TAXI_STYLES[styles.DEFAULT_TAXI_STYLE]);
  for (const [key, style] of Object.entries(styles.TAXI_STYLES)) {
    assert.equal(style.id, key);
    assert.ok(style.city);
    assert.ok(style.label);
    assert.match(style.body, /^[a-zA-Z]+$/);
    assert.ok(['nyc', 'hk', 'none'].includes(style.livery));
    assert.ok(['nyc', 'hk'].includes(style.plate));
    assert.ok(Number.isFinite(style.paint));
    if (style.doorDecal) assert.equal(style.doorDecal, 'nyc');
  }
});

test('Hong Kong and New York keep distinct taxi identities', () => {
  const hk = styles.getTaxiStyle('hk-urban');
  assert.equal(hk.body, 'hkTaxi');
  assert.equal(hk.livery, 'hk');
  assert.equal(hk.plate, 'hk');
  assert.equal(hk.paint, 0xc6202b);
  assert.equal(hk.doorDecal, null);
  const nyc = styles.getTaxiStyle('nyc-medallion');
  assert.equal(nyc.body, 'taxi');
  assert.equal(nyc.livery, 'nyc');
  assert.equal(nyc.plate, 'nyc');
  assert.equal(nyc.paint, 0xffbe14);
  assert.equal(nyc.doorDecal, 'nyc');
  assert.equal(styles.getTaxiStyle('missing'), null);
});

test('every city card resolves a registered taxi style', () => {
  for (const city of registry.CITIES) {
    assert.ok(city.taxiStyle, `${city.id} declares a taxiStyle`);
    assert.ok(styles.getTaxiStyle(city.taxiStyle), `${city.id} style exists`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/taxi-styles.test.cjs`
Expected: FAIL with `Cannot find module '../js/taxi-styles.js'`.

- [ ] **Step 3: Create `js/taxi-styles.js`**

Write this exact data:

```js
export const DEFAULT_TAXI_STYLE = 'nyc-medallion';

export const TAXI_STYLES = {
  'nyc-medallion': {
    id: 'nyc-medallion',
    city: 'newyork',
    label: 'Yellow medallion · Ford Crown Victoria',
    body: 'taxi',
    paint: 0xffbe14,
    livery: 'nyc',
    plate: 'nyc',
    doorDecal: 'nyc'
  },
  'hk-urban': {
    id: 'hk-urban',
    city: 'hongkong',
    label: '紅色的士 · Toyota Crown Comfort',
    body: 'hkTaxi',
    paint: 0xc6202b,
    livery: 'hk',
    plate: 'hk',
    doorDecal: null
  }
};

export function getTaxiStyle(id) {
  return TAXI_STYLES[id] ?? null;
}
```

- [ ] **Step 4: Add `taxiStyle` to the three city registry entries**

In `js/cities/registry.js`:

- New York entry: `taxiStyle: 'nyc-medallion'`.
- Hong Kong entry: `taxiStyle: 'hk-urban'`.
- Grid City entry: `taxiStyle: 'nyc-medallion'`.

Place the field after `badge`.

- [ ] **Step 5: Run the catalog test**

Run: `node --test tests/taxi-styles.test.cjs`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add js/taxi-styles.js js/cities/registry.js tests/taxi-styles.test.cjs
git commit -m "feat: add city taxi style catalog"
```

---

### Task 2: Crown Comfort body spec

**Files:**
- Modify: `js/actor-models.js`
- Test: `tests/hongkong.test.cjs`

**Interfaces:**
- Consumes: existing `BODY_SPECS.sedan`.
- Produces: `BODY_SPECS.hkTaxi`, a full body spec with `name: 'hkTaxi'`, `sign: true`, and every field the loft/material expects.

- [ ] **Step 1: Write the failing body-spec test**

Append to `tests/hongkong.test.cjs`:

```js
test('the Hong Kong taxi has a dedicated Crown Comfort body spec', () => {
  const source = read('js/actor-models.js');
  const start = source.indexOf('BODY_SPECS.hkTaxi');
  const end = source.indexOf('\nfor (const spec of Object.values(BODY_SPECS))', start);
  assert.ok(start > 0 && end > start, 'hkTaxi is declared before the spec loop');
  const hk = source.slice(start, end);
  assert.match(hk, /name: 'hkTaxi'/);
  assert.match(hk, /sign: true/);
  assert.match(hk, /zFront: 2\.25/);
  assert.match(hk, /zRear: -2\.25/);
  assert.match(hk, /\[0, 0\.86\]/);
  assert.match(hk, /roofY: \[\[0\.20, 1\.49\]/);
  assert.match(hk, /bumpers: \[\[0\.45, 0\.085\], \[0\.48, 0\.09\]\]/);
  assert.match(source, /BODY_SPECS\.taxi = Object\.assign\(\{\}, BODY_SPECS\.sedan/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/hongkong.test.cjs`
Expected: FAIL because `BODY_SPECS.hkTaxi` is missing.

- [ ] **Step 3: Add `BODY_SPECS.hkTaxi`**

In `js/actor-models.js`, immediately after the `BODY_SPECS.taxi = ...` line and before the `for (const spec of Object.values(BODY_SPECS))` loop, add:

```js
BODY_SPECS.hkTaxi = Object.assign({}, BODY_SPECS.sedan, {
  name: 'hkTaxi',
  zFront: 2.25,
  zRear: -2.25,
  wheelRadius: 0.34,
  wheelZ: 1.34,
  wheelX: 0.79,
  archGap: 0.065,
  archFlare: 0.02,
  tuck: 0.07,
  stationStep: 0.25,
  halfWidth: [[2.25, 0.845], [1.34, 0.855], [0, 0.86], [-1.34, 0.858], [-2.25, 0.85]],
  sill: [[2.25, 0.3], [1.2, 0.275], [-1.2, 0.275], [-2.25, 0.31]],
  shoulder: [[2.25, 0.7], [0, 0.74], [-2.25, 0.78]],
  edge: [[2.1, 0.84], [1.5, 0.89], [0.92, 0.955], [0.55, 0.975], [-1.0, 1.0], [-1.65, 0.99], [-2.1, 0.92]],
  crown: [[2.1, 0.03], [0.95, 0.026], [0.66, 0.004], [-1.56, 0.004], [-1.78, 0.014], [-2.25, 0.01]],
  tumble: [[2.25, 0.1], [0.9, 0.08], [-1.6, 0.075], [-2.25, 0.095]],
  nose: { halfWidth: [0.3, 0.68, 3], edge: [0.12, 0.8, 3], crown: [0.12, 0.008, 2], sill: [0.13, 0.34, 2], shoulder: [0.2, 0.62, 2.4] },
  tail: { halfWidth: [0.3, 0.71, 2.6], edge: [0.11, 0.92, 3], crown: [0.11, 0.006, 2], sill: [0.14, 0.36, 2], shoulder: [0.2, 0.72, 2.4] },
  cabin: {
    cowl: 0.92,
    roofFront: 0.2,
    roofRear: -1.22,
    deck: -1.68,
    roofY: [[0.2, 1.49], [0, 1.5], [-0.6, 1.505], [-1.22, 1.475]],
    rail: [0.655, 0.635],
    inset: 0.03,
    bulge: 0.01,
    roofEdge: 0.045,
    roofCrown: 0.03,
    roofRound: 4,
    pillars: [-0.18]
  },
  doors: [0.86, -0.18, -1.08],
  handles: [-0.05, -0.86],
  headlight: [0.6, 0.7, 0.245, 0.072],
  taillight: [0.58, 0.8, 0.265, 0.074],
  grille: [0.71, 0.35, 0.055],
  intake: [0.4, 0.47, 0.045],
  plates: [0.57, 0.7],
  bumperLine: [0.79, 0.59],
  bumpers: [[0.45, 0.085], [0.48, 0.09]],
  chrome: true,
  cladding: 0,
  sign: true,
  rails: false,
  rearWiper: false
});
```

The nested `cabin`, `nose`, `tail`, curve arrays and bumper array are all new objects/arrays. Do not mutate the sedan's nested values.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/hongkong.test.cjs`
Expected: PASS, including the new body-spec test.

- [ ] **Step 5: Commit**

```bash
git add js/actor-models.js tests/hongkong.test.cjs
git commit -m "feat: add Crown Comfort taxi body spec"
```

---

### Task 3: Livery option and catalog-driven player taxi

**Files:**
- Modify: `js/actor-models.js`
- Modify: `js/controllers.js`
- Modify: `js/cities/hongkong/index.js`
- Test: `tests/hongkong.test.cjs`

**Interfaces:**
- Consumes: `TAXI_STYLES`, `DEFAULT_TAXI_STYLE`, `getTaxiStyle` from Task 1; `BODY_SPECS.hkTaxi` from Task 2.
- Produces: `createLoftedCarMaterial(spec, fixedColorHex = null, options = {})` accepts `options.livery: 'nyc' | 'hk' | 'none'`; the player controller resolves the style and uses `{ livery }`; the Hong Kong theme exports `TAXI_STYLE = 'hk-urban'`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/hongkong.test.cjs`:

```js
test('the taxi material takes a livery mode and keeps the New York badge gated', () => {
  const source = read('js/actor-models.js');
  assert.match(source, /const livery = options\.livery \?\? \(options\.taxiLivery === false \? 'none' : 'nyc'\)/);
  assert.match(source, /`\$\{spec\.name\}_\$\{fixedColorHex \?\? 'instanced'\}_\$\{livery\}`/);
  assert.match(source, /spec\.sign && livery === 'nyc'/);
});

test('the player car resolves body, paint and livery from the taxi catalog', () => {
  const source = read('js/controllers.js');
  assert.match(source, /from '\.\/taxi-styles\.js'/);
  assert.match(source, /getTaxiStyle\(carTheme\.taxiStyle\)/);
  assert.match(source, /BODY_SPECS\[style\?\.body\]/);
  assert.match(source, /createLoftedCarMaterial\(spec, paint, \{ livery \}\)/);
  assert.match(source, /style\?\.plate/);
  assert.match(source, /style\?\.doorDecal === 'nyc'/);
});

test('the Hong Kong theme selects the Crown Comfort taxi style', () => {
  const source = read('js/cities/hongkong/index.js');
  assert.match(source, /const TAXI_STYLE = 'hk-urban'/);
  assert.match(source, /taxiStyle: TAXI_STYLE/);
  assert.doesNotMatch(source, /taxiLivery: false/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/hongkong.test.cjs`
Expected: FAIL on the missing livery option, catalog import and theme style.

- [ ] **Step 3: Add the livery option to `createLoftedCarMaterial`**

In `js/actor-models.js`:

- Replace the `taxiLivery` declaration with:

```js
const livery = options.livery ?? (options.taxiLivery === false ? 'none' : 'nyc');
```

- Change the cache key to:

```js
const cacheKey = `${spec.name}_${fixedColorHex ?? 'instanced'}_${livery}`;
```

- Change the New York badge gate from `if (spec.sign && taxiLivery)` to `if (spec.sign && livery === 'nyc')`.

Do not add the Hong Kong paint yet; Task 4 does that. With `livery: 'hk'` the body is plain paint and the New York badge is off.

- [ ] **Step 4: Resolve the player style in `js/controllers.js`**

Add the import:

```js
import { DEFAULT_TAXI_STYLE, getTaxiStyle } from './taxi-styles.js';
```

At the top of `createCarEntity()`, replace the current `carTheme`, `spec` and `taxiLoftMat` block with:

```js
const carTheme = this.theme?.car ?? {};
const style = getTaxiStyle(carTheme.taxiStyle) ?? getTaxiStyle(DEFAULT_TAXI_STYLE);
const spec = BODY_SPECS[style?.body] ?? BODY_SPECS.taxi;
const paint = carTheme.paint ?? style?.paint ?? 0xffbe14;
const livery = style?.livery ?? (carTheme.taxiLivery === false ? 'none' : 'nyc');
const plateMode = carTheme.plate ?? style?.plate ?? 'nyc';
const doorDecal = carTheme.nycDoorDecals === false ? null : (style?.doorDecal ?? 'nyc');

const taxiLoftMat = createLoftedCarMaterial(spec, paint, { livery });
```

Keep the rest of the body construction. Change the door decal gate from `if (carTheme.nycDoorDecals !== false)` to `if (doorDecal === 'nyc')`. Change the plate gate from `if (carTheme.plate === 'hk')` to `if (plateMode === 'hk')`.

Replace the fixed shadow geometry with spec-derived dimensions:

```js
const carShadowGeo = new THREE.PlaneGeometry(spec.halfWidth[2][1] * 2 + 0.36, spec.zFront - spec.zRear + 0.55);
```

- [ ] **Step 5: Point the Hong Kong theme at the style**

In `js/cities/hongkong/index.js`, add this module constant above `export const city`:

```js
const TAXI_STYLE = 'hk-urban';
```

Replace the `theme.car` object with:

```js
car: {
  label: '香港的士',
  taxiStyle: TAXI_STYLE
}
```

Remove `paint`, `taxiLivery` and `nycDoorDecals` from the Hong Kong theme.

- [ ] **Step 6: Run the Hong Kong tests**

Run: `node --test tests/hongkong.test.cjs`
Expected: PASS. The player now builds a red Crown Comfort body with `livery: 'hk'`; the Hong Kong paint details arrive in Task 4.

- [ ] **Step 7: Commit**

```bash
git add js/actor-models.js js/controllers.js js/cities/hongkong/index.js tests/hongkong.test.cjs
git commit -m "feat: drive player taxi from the city style catalog"
```

---

### Task 4: Hong Kong two-tone paint, black trim, chrome and plates

**Files:**
- Modify: `js/actor-models.js`
- Test: `tests/hongkong.test.cjs`

**Interfaces:**
- Consumes: `livery === 'hk'` from Task 3; `BODY_SPECS.hkTaxi` from Task 2.
- Produces: Hong Kong body/glasshouse colour masks and chrome material overrides. No text decals yet.

- [ ] **Step 1: Write the failing livery-paint test**

Append to `tests/hongkong.test.cjs`:

```js
test('Hong Kong livery paints a silver roof, black trim and chrome nose', () => {
  const source = read('js/actor-models.js');
  for (const token of ['hkRoof', 'hkLower', 'hkStrip', 'hkGrille', 'hkGrilleSurround', 'hkHeadlightBezel']) {
    assert.match(source, new RegExp(`const ${token} = livery === 'hk'`), `${token} is livery-gated`);
  }
  assert.match(source, /hkRoof/);
  assert.match(source, /max\(hkLower, hkStrip\)/);
  assert.match(source, /body = mix\(body, color\(0xf2f4f5\), plateFront\)/);
  assert.match(source, /one\.sub\(max\(glass, seal, chromeBelt\)\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/hongkong.test.cjs`
Expected: FAIL because the Hong Kong masks do not exist.

- [ ] **Step 3: Add the paint masks**

In `js/actor-models.js`, after `chromeBelt` and `chmsl` are defined, add:

```js
const hkRoof = livery === 'hk'
  ? isWindow.mul(smoothstep(belt.add(0.01), belt.add(0.035), p.y)).mul(one.sub(max(glass, seal, chromeBelt)))
  : float(0);
```

After `hg`/`wheelDist` and `hkRoof`, add:

```js
const hkLower = livery === 'hk'
  ? max(front, rear).mul(smoothstep(0.6, 0.55, p.y))
  : float(0);
const hkStrip = livery === 'hk'
  ? isSide.mul(isBody)
    .mul(smoothstep(0.03, 0.022, abs(p.y.sub(0.53))))
    .mul(smoothstep(archR + 0.02, archR + 0.08, wheelDist))
    .mul(smoothstep(float(spec.zRear + 0.32), float(spec.zRear + 0.4), p.z))
    .mul(smoothstep(float(spec.zFront - 0.3), float(spec.zFront - 0.38), p.z))
  : float(0);
```

After `grille`, `headlight` and their UVs are defined, add:

```js
const hkGrille = livery === 'hk' ? grille : float(0);
const hkGrilleSurround = livery === 'hk'
  ? roundedRect(vec2(p.x, p.y.sub(grY)), vec2(grW + 0.018, grH + 0.014), 0.018)
    .mul(front).mul(one.sub(grille))
  : float(0);
const hkHeadlightBezel = livery === 'hk'
  ? roundedRect(hlUV, vec2(hlW + 0.01, hlH + 0.01), 0.014)
    .mul(front).mul(one.sub(headlight))
  : float(0);
```

- [ ] **Step 4: Apply the paint masks**

- Add `max(hkLower, hkStrip)` to the `matte` mask so black trim stays matte.
- After the body paint / cowl-panel mixes, apply the black lower body and strip:

```js
if (livery === 'hk') {
  body = mix(body, color(0x111417), max(hkLower, hkStrip));
}
```

- After the existing grille/intake mix and `slats`, apply the chrome nose:

```js
if (livery === 'hk') {
  body = mix(body, mix(color(0xd7dde2), color(0x171a1d), slats), hkGrille);
  body = mix(body, color(0xd7dde2), hkGrilleSurround);
  body = mix(body, color(0xd7dde2), hkHeadlightBezel);
}
```

- After `body = mix(body, color(0xf2b718), plates);`, make the shader-painted front plate white:

```js
if (livery === 'hk') body = mix(body, color(0xf2f4f5), plateFront);
```

- After the base roughness/metalness mixes, add:

```js
if (livery === 'hk') {
  rough = mix(rough, float(0.18), max(hkGrille, hkGrilleSurround));
  metal = mix(metal, float(0.9), max(hkGrille, hkGrilleSurround));
  rough = mix(rough, float(0.3), hkRoof);
  metal = mix(metal, float(0.22), hkRoof);
}
```

- After `let windowCol = ...`, mix the silver roof and pillars:

```js
if (livery === 'hk') windowCol = mix(windowCol, color(0xd8dad7), hkRoof);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/hongkong.test.cjs`
Expected: PASS.

- [ ] **Step 6: Visual spot check (player)**

Run the app and inspect `?city=hongkong` from the chase camera. Confirm the player taxi has a silver roof/pillars, black lower bumpers and side strip, chrome grille surround and a white front plate. Record any values that need tuning for Task 9.

- [ ] **Step 7: Commit**

```bash
git add js/actor-models.js tests/hongkong.test.cjs
git commit -m "feat: paint the Hong Kong taxi two-tone body and trim"
```

---

### Task 5: Hong Kong door decals and roof sign text

**Files:**
- Modify: `js/actor-models.js`
- Test: `tests/hongkong.test.cjs`

**Interfaces:**
- Consumes: `livery === 'hk'`, the decal masks and sign mask from Tasks 3 and 4.
- Produces: `hkTaxiSideTexture()` and `hkTaxiSignTexture()` lazy CanvasTextures; door lettering/sticker and roof-sign text in the `hk` material.

- [ ] **Step 1: Write the failing decal test**

Append to `tests/hongkong.test.cjs`:

```js
test('Hong Kong livery adds door lettering, a seat sticker and a roof sign texture', () => {
  const source = read('js/actor-models.js');
  assert.match(source, /function hkTaxiSideTexture\(\)/);
  assert.match(source, /function hkTaxiSignTexture\(\)/);
  assert.match(source, /c\.width = 2048/);
  assert.match(source, /TAXI 4 SEATS/);
  assert.match(source, /的士/);
  assert.match(source, /const hkDecal = /);
  assert.match(source, /hkTaxiSideTexture\(\)/);
  assert.match(source, /hkTaxiSignTexture\(\), vec2/);
  assert.match(source, /one\.sub\(signU\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/hongkong.test.cjs`
Expected: FAIL because the texture functions and samples are missing.

- [ ] **Step 3: Add `hkTaxiSideTexture()`**

Place it beside `carPlateTexture()` in `js/actor-models.js`. Use a cached module-level texture.

Canvas layout:

- Width `2048`, height `512`. Texture colour space `THREE.SRGBColorSpace`.
- Right half (`x = 0..1024`) is the `+x` car side. Car front is at the left edge; draw the front-door lettering centred at `x ≈ 434` and the rear-door green sticker centred at `x ≈ 655`.
- Left half (`x = 1024..2048`) is the `-x` car side. Car rear is at the left edge; draw the rear-door sticker centred at `x ≈ 1393` and the front-door lettering centred at `x ≈ 1614`.
- Vertical coordinate: `y = 0` is the top of the decal span (`p.y = 0.84`), `y = 512` is the bottom (`p.y = 0.56`). Centre the lettering around `y ≈ 256`; centre the sticker around `y ≈ 293`.
- Front door: white `的士` in a CJK stack (`"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`) at about `80px` bold, and `TAXI` below it in about `44px` bold. Keep the whole group within about 220 px of width.
- Rear door: green rounded rectangle about `150 × 230 px` with `TAXI` and `4 SEATS` in white, centred. The canvas text must literally include `TAXI 4 SEATS` for the test.
- Leave the rest of the canvas transparent. Do not mirror the text: draw both halves left-to-right.

Use a small rounded-rectangle path helper rather than relying on `ctx.roundRect`:

```js
function roundedCanvasRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
```

- [ ] **Step 4: Add `hkTaxiSignTexture()`**

Canvas `512 × 128`, `THREE.SRGBColorSpace`, cached. Fill cream (`#f3efe2`), draw a dark border, and centre `TAXI` in a bold dark font (`#15181b`). This is the roof-sign face for both front and back.

- [ ] **Step 5: Add the object-space decal mapping**

Near the body masks, define:

```js
const decalZ0 = spec.zRear + 0.55;
const decalZ1 = spec.zFront - 0.4;
const decalY0 = 0.56;
const decalY1 = 0.84;
const decalU = p.z.sub(decalZ0).div(decalZ1 - decalZ0);
const decalV = p.y.sub(decalY0).div(decalY1 - decalY0);
const sideU = mix(float(0.5).add(decalU.mul(0.5)), one.sub(decalU).mul(0.5), step(0.0, p.x));
const decalZone = isBody.mul(isSide)
  .mul(smoothstep(decalZ0, decalZ0 + 0.04, p.z))
  .mul(smoothstep(decalZ1, decalZ1 - 0.04, p.z))
  .mul(smoothstep(decalY0, decalY0 + 0.02, p.y))
  .mul(smoothstep(decalY1, decalY1 - 0.02, p.y));
const sideTex = livery === 'hk' ? texture(hkTaxiSideTexture(), vec2(sideU, decalV)) : null;
const hkDecal = sideTex ? sideTex.a.mul(decalZone) : float(0);
```

The `sideU` expression maps the `+x` half with the front at `u = 0` and the `-x` half with the front at `u = 1`. This is the mapping that keeps the front-door lettering on the front doors on both sides while the text reads left-to-right.

Apply the decal after the black trim and before the glasshouse mix:

```js
if (livery === 'hk') body = mix(body, sideTex.rgb, hkDecal);
```

- [ ] **Step 6: Add the roof sign texture**

After `signFace` and the existing `signCol`:

```js
const signBase = signY - 0.075;
const signU = p.x.div(0.6).add(0.5);
const signV = p.y.sub(signBase).div(0.15);
const signBackU = one.sub(signU);
const signTex = livery === 'hk'
  ? texture(hkTaxiSignTexture(), vec2(mix(signU, signBackU, step(n.z, 0.0)), signV))
  : null;
let signCol = mix(color(0xf3efe2), mix(color(0xfff1b8), color(0x15181b), signGlyph), signFace);
if (livery === 'hk') signCol = mix(signCol, signTex.rgb, signFace);
```

Change the existing `const signCol` to `let signCol` and the existing `const sign` to `let sign`. Then override the Hong Kong sign emissive:

```js
if (livery === 'hk') sign = color(0xfff1c8).mul(signFace).mul(signTex.r).mul(1.2);
```

Keep the New York glyph and emissive path unchanged for `livery === 'nyc'`.

- [ ] **Step 7: Run the test to verify it passes**

Run: `node --test tests/hongkong.test.cjs`
Expected: PASS.

- [ ] **Step 8: Visual check both sides and the roof sign**

In the browser with `?city=hongkong`, inspect the player taxi from both sides. Confirm:

- `的士 TAXI` is on the front doors on both sides and reads left-to-right.
- The green `TAXI 4 SEATS` sticker is on the rear doors on both sides.
- The roof sign reads `TAXI` from the front and is not mirrored from behind.
- The sign still glows at night.

Record any atlas or font adjustments for Task 9.

- [ ] **Step 9: Commit**

```bash
git add js/actor-models.js tests/hongkong.test.cjs
git commit -m "feat: add Hong Kong taxi decals and roof sign"
```

---

### Task 6: Hong Kong AI taxi/private split

**Files:**
- Modify: `js/cities/hongkong/traffic.js`
- Modify: `js/cities/hongkong/index.js`
- Test: `tests/hongkong.test.cjs`
- Run: `tests/hongkong-collision.test.cjs` (no changes)

**Interfaces:**
- Consumes: `getTaxiStyle`, `DEFAULT_TAXI_STYLE`, `BODY_SPECS.hkTaxi`, `createLoftedCarMaterial(..., { livery })`.
- Produces: `createHongKongTraffic(scene, { getFocus, taxiStyle })`; two car body meshes named `HongKongCars` (private) and `HongKongTaxis` (taxis); each car gains `taxi`, `taxiSlot`, `privateSlot`.

- [ ] **Step 1: Write the failing traffic test**

Append to `tests/hongkong.test.cjs`:

```js
test('Hong Kong traffic renders taxis with the catalog body and livery', () => {
  const traffic = read('js/cities/hongkong/traffic.js');
  assert.match(traffic, /from '\.\.\/\.\.\/taxi-styles\.js'/);
  assert.match(traffic, /getTaxiStyle\(taxiStyle\)/);
  assert.match(traffic, /buildCarGeometry\(taxiSpec, false\)/);
  assert.match(traffic, /createLoftedCarMaterial\(taxiSpec, null, \{ livery: style\.livery \}\)/);
  assert.match(traffic, /'HongKongTaxis'/);
  assert.match(traffic, /taxiSlot/);
  assert.match(traffic, /privateSlot/);
  assert.match(traffic, /vehicle\.taxi/);
  assert.doesNotMatch(traffic, /TAXI_RED/);

  const index = read('js/cities/hongkong/index.js');
  assert.equal((index.match(/taxiStyle: TAXI_STYLE/g) || []).length, 2, 'theme and traffic call both use the style');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/hongkong.test.cjs`
Expected: FAIL on the missing catalog import and taxi mesh.

- [ ] **Step 3: Import and resolve the style**

In `js/cities/hongkong/traffic.js`, add:

```js
import { DEFAULT_TAXI_STYLE, getTaxiStyle } from '../../taxi-styles.js';
```

Change the export signature to:

```js
export function createHongKongTraffic(scene, { getFocus, taxiStyle }) {
```

After `group` setup, resolve:

```js
const style = getTaxiStyle(taxiStyle) ?? getTaxiStyle(DEFAULT_TAXI_STYLE);
const taxiSpec = BODY_SPECS[style?.body] ?? BODY_SPECS.taxi;
const taxiLivery = style?.livery ?? 'nyc';
const taxiPaint = new THREE.Color(style?.paint ?? 0xc6202b);
```

- [ ] **Step 4: Replace the palette and classify taxis**

Replace `TAXI_RED` and `PALETTE` with a private palette that contains no red:

```js
const PRIVATE_PALETTE = [
  new THREE.Color(0xe5e7e3),
  new THREE.Color(0x171a1e),
  new THREE.Color(0x8f969c),
  new THREE.Color(0x26394f),
  new THREE.Color(0xd6b13c)
];
```

In the car creation loop, set:

```js
const taxi = i % 7 < 2;
const car = createVehicle(i, 'car', taxi);
```

Add a third parameter `taxi = false` to `createVehicle`. Set:

```js
taxi,
taxiSlot: -1,
privateSlot: -1,
paint: taxi ? taxiPaint : PRIVATE_PALETTE[index % PRIVATE_PALETTE.length]
```

Keep the existing `halfW: 0.86`, `halfL: 2.18`, mass and speed values.

After the car loop, assign compact slots:

```js
let privateCount = 0;
let taxiCount = 0;
for (const car of cars) {
  if (car.taxi) car.taxiSlot = taxiCount++;
  else car.privateSlot = privateCount++;
}
```

- [ ] **Step 5: Build two instanced body meshes**

Replace the single `carGeo` / `carMesh` block with:

```js
const carGeo = buildCarGeometry(BODY_SPECS.sedan, false);
carGeo.setAttribute('paintColor', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, privateCount) * 3), 3));
carGeo.setAttribute('carState', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, privateCount) * 4), 4));
const carMesh = new THREE.InstancedMesh(carGeo, createLoftedCarMaterial(BODY_SPECS.sedan), Math.max(1, privateCount));
carMesh.count = privateCount;
carMesh.castShadow = true;
carMesh.receiveShadow = true;
carMesh.frustumCulled = false;
carMesh.name = 'HongKongCars';

const taxiGeo = buildCarGeometry(taxiSpec, false);
taxiGeo.setAttribute('paintColor', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, taxiCount) * 3), 3));
taxiGeo.setAttribute('carState', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, taxiCount) * 4), 4));
const taxiMesh = new THREE.InstancedMesh(taxiGeo, createLoftedCarMaterial(taxiSpec, null, { livery: taxiLivery }), Math.max(1, taxiCount));
taxiMesh.count = taxiCount;
taxiMesh.castShadow = true;
taxiMesh.receiveShadow = true;
taxiMesh.frustumCulled = false;
taxiMesh.name = 'HongKongTaxis';

const taxiPaintArray = taxiGeo.attributes.paintColor.array;
for (let i = 0; i < taxiCount; i++) {
  taxiPaintArray[i * 3] = taxiPaint.r;
  taxiPaintArray[i * 3 + 1] = taxiPaint.g;
  taxiPaintArray[i * 3 + 2] = taxiPaint.b;
}
taxiGeo.attributes.paintColor.needsUpdate = true;

group.add(carMesh, taxiMesh, wheelMesh);
```

Remove the old `group.add(carMesh, wheelMesh);` line. Keep the shared wheel mesh unchanged.

- [ ] **Step 6: Render each car into its class mesh**

In `renderVehicle` for cars:

```js
if (vehicle.taxi) {
  taxiMesh.setMatrixAt(vehicle.taxiSlot, matrix);
} else {
  carMesh.setMatrixAt(vehicle.privateSlot, matrix);
  const paint = carMesh.geometry.attributes.paintColor.array;
  paint[vehicle.privateSlot * 3] = vehicle.paint.r;
  paint[vehicle.privateSlot * 3 + 1] = vehicle.paint.g;
  paint[vehicle.privateSlot * 3 + 2] = vehicle.paint.b;
}
```

Keep the four wheel matrix writes using the car's original `slot` index, as today.

- [ ] **Step 7: Update upload flags**

In `update()` add:

```js
taxiMesh.instanceMatrix.needsUpdate = true;
```

Keep `carMesh.instanceMatrix.needsUpdate = true`, `wheelMesh.instanceMatrix.needsUpdate = true`, and `carMesh.geometry.attributes.paintColor.needsUpdate = true`. The taxi paint buffer is static after Step 5.

- [ ] **Step 8: Pass the style from the city pack**

In `js/cities/hongkong/index.js`, change the traffic creation to:

```js
const traffic = createHongKongTraffic(scene, { getFocus: () => focus, taxiStyle: TAXI_STYLE });
```

The same `TAXI_STYLE` constant is already used by the theme from Task 3.

- [ ] **Step 9: Run the Hong Kong tests**

Run: `node --test tests/hongkong.test.cjs tests/hongkong-collision.test.cjs`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add js/cities/hongkong/traffic.js js/cities/hongkong/index.js tests/hongkong.test.cjs
git commit -m "feat: render Hong Kong AI taxis with the Crown Comfort style"
```

---

### Task 7: New York AI taxis resolve the catalog

**Files:**
- Modify: `js/traffic.js`
- Test: `tests/traffic.test.cjs`

**Interfaces:**
- Consumes: `DEFAULT_TAXI_STYLE`, `getTaxiStyle`, `BODY_SPECS`.
- Produces: `newYorkTaxiStyle()` used by both New York traffic builders; returns `{ style, spec, livery, paint }`.

- [ ] **Step 1: Write the failing New York test**

Append to `tests/traffic.test.cjs`:

```js
test('New York AI taxis resolve body, livery and paint from the catalog', () => {
  const traffic = readFileSync(join(__dirname, '../js/traffic.js'), 'utf8');
  assert.match(traffic, /import \{ DEFAULT_TAXI_STYLE, getTaxiStyle \} from '\.\/taxi-styles\.js';/);
  assert.match(traffic, /function newYorkTaxiStyle\(\)/);
  assert.match(traffic, /BODY_SPECS\[style\?\.body\] \?\? BODY_SPECS\.taxi/);
  assert.match(traffic, /livery: style\?\.livery \?\? 'nyc'/);
  assert.match(traffic, /paint: style\?\.paint \?\? 0xffbe14/);
  assert.equal((traffic.match(/const nycTaxi = newYorkTaxiStyle\(\)/g) || []).length, 2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/traffic.test.cjs`
Expected: FAIL on the missing import and helper.

- [ ] **Step 3: Add the helper**

At the top of `js/traffic.js`, add:

```js
import { DEFAULT_TAXI_STYLE, getTaxiStyle } from './taxi-styles.js';
```

Add this function near the other module-level helpers:

```js
function newYorkTaxiStyle() {
  const style = getTaxiStyle(DEFAULT_TAXI_STYLE);
  return {
    style,
    spec: BODY_SPECS[style?.body] ?? BODY_SPECS.taxi,
    livery: style?.livery ?? 'nyc',
    paint: style?.paint ?? 0xffbe14
  };
}
```

- [ ] **Step 4: Use the helper in the Manhattan traffic builder**

In the builder that currently has `const taxiGeo = buildCarGeometry(BODY_SPECS.taxi, false);`:

```js
const nycTaxi = newYorkTaxiStyle();
const taxiGeo = buildCarGeometry(nycTaxi.spec, false);
const taxiMat = createLoftedCarMaterial(nycTaxi.spec, null, { livery: nycTaxi.livery });
const taxiYellow = new THREE.Color(nycTaxi.paint);
```

In the `bodies` loop, use `nycTaxi.spec` for the taxi proxy:

```js
bodies[kind] = { near: lodMesh(geo), far: lodMesh(buildCarProxyGeometry(kind === 'taxi' ? nycTaxi.spec : BODY_SPECS[kind])) };
```

- [ ] **Step 5: Use the helper in the highway traffic builder**

At the start of `createHighwayTraffic`, add:

```js
const nycTaxi = newYorkTaxiStyle();
```

Change the taxi palette to:

```js
taxi: [nycTaxi.paint],
```

In the per-kind mesh loop:

```js
const spec = kind === 'taxi' ? nycTaxi.spec : BODY_SPECS[kind];
const mat = kind === 'taxi'
  ? createLoftedCarMaterial(spec, null, { livery: nycTaxi.livery })
  : createLoftedCarMaterial(spec);
```

Use `mat` in the `new THREE.InstancedMesh(geo, mat, n)` call.

- [ ] **Step 6: Run the New York traffic test**

Run: `node --test tests/traffic.test.cjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/traffic.js tests/traffic.test.cjs
git commit -m "feat: resolve New York AI taxis from the style catalog"
```

---

### Task 8: Home-screen taxi line

**Files:**
- Modify: `js/main.js`
- Modify: `css/style.css`
- Test: `tests/taxi-styles.test.cjs`

**Interfaces:**
- Consumes: `getTaxiStyle`, `city.taxiStyle` from Task 1.
- Produces: every city card renders `.city-card-taxi` with `.city-card-taxi-dot` and the style label.

- [ ] **Step 1: Write the failing UI test**

Append to `tests/taxi-styles.test.cjs`:

```js
test('the home-screen city cards show the city taxi style', () => {
  const main = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/main.js'), 'utf8');
  const css = require('node:fs').readFileSync(require('node:path').join(__dirname, '../css/style.css'), 'utf8');
  assert.match(main, /import \{ getTaxiStyle \} from '\.\/taxi-styles\.js';/);
  assert.match(main, /const taxiStyle = getTaxiStyle\(city\.taxiStyle\)/);
  assert.match(main, /city-card-taxi/);
  assert.match(css, /\.city-card-taxi\s*\{/);
  assert.match(css, /\.city-card-taxi-dot\s*\{/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/taxi-styles.test.cjs`
Expected: FAIL on the missing import and card line.

- [ ] **Step 3: Add the import and card line**

In `js/main.js`, add:

```js
import { getTaxiStyle } from './taxi-styles.js';
```

In `renderCityCards`, after the description:

```js
const taxiStyle = getTaxiStyle(city.taxiStyle);
if (taxiStyle) {
  const taxi = document.createElement('span');
  taxi.className = 'city-card-taxi';
  const dot = document.createElement('span');
  dot.className = 'city-card-taxi-dot';
  dot.style.background = `#${taxiStyle.paint.toString(16).padStart(6, '0')}`;
  taxi.append(dot, document.createTextNode(taxiStyle.label));
  card.append(badge, name, tagline, description, taxi, cta);
} else {
  card.append(badge, name, tagline, description, cta);
}
```

Remove the old single `card.append(badge, name, tagline, description, cta);` line so the card is appended once.

- [ ] **Step 4: Add the styles**

In `css/style.css`, after `.city-card-description`:

```css
.city-card-taxi {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 12px;
}

.city-card-taxi-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}
```

- [ ] **Step 5: Run the UI test**

Run: `node --test tests/taxi-styles.test.cjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/main.js css/style.css tests/taxi-styles.test.cjs
git commit -m "feat: show each city taxi style on the city cards"
```

---

### Task 9: Documentation, full suite and visual verification

**Files:**
- Modify: `README.md`
- Test: `tests/taxi-styles.test.cjs`
- Verify: full test suite, browser `?city=hongkong`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: documented catalog workflow and a verified visual result.

- [ ] **Step 1: Add the README section**

Add a `## Taxi styles` section after `## Adding a city`:

```markdown
## Taxi styles

A city's taxi is a catalog entry in `js/taxi-styles.js` plus a body in `BODY_SPECS` (`js/actor-models.js`). A style names its body, paint, shader livery, plate mode and optional door decal. The player car and the city's AI traffic both resolve the same entry.

To add a region's taxi:

1. Add a `BODY_SPECS` entry for the body.
2. Add a `TAXI_STYLES` entry in `js/taxi-styles.js`.
3. Set `taxiStyle` on the city card in `js/cities/registry.js` and in the city theme's `car` object.

Hong Kong uses `hk-urban` (`BODY_SPECS.hkTaxi`, livery `hk`); New York uses `nyc-medallion` (`BODY_SPECS.taxi`, livery `nyc`).
```

- [ ] **Step 2: Add the README test**

Append to `tests/taxi-styles.test.cjs`:

```js
test('README documents the taxi style catalog', () => {
  const readme = require('node:fs').readFileSync(require('node:path').join(__dirname, '../README.md'), 'utf8');
  assert.match(readme, /## Taxi styles/);
  assert.match(readme, /taxiStyle/);
  assert.match(readme, /hk-urban/);
});
```

- [ ] **Step 3: Run the full CJS suite**

Run: `node --test "tests/*.test.cjs"`
Expected: PASS. All pre-existing tests plus the new catalog, body, livery, traffic and UI tests pass. The environment-only `.mjs` suites are out of scope.

- [ ] **Step 4: Start the app and visually verify**

Run a static server from `D:\slop-newyork`:

```sh
npx --yes serve . -l 3000
```

Open `http://localhost:3000/?city=hongkong` and check:

- Player taxi: Crown Comfort proportions, red body, silver roof/pillars, black bumpers and side strip, chrome grille, rectangular lamps, white front plate, yellow rear plate.
- Door lettering and green sticker on the correct doors on both sides, readable and not mirrored.
- Roof sign reads `TAXI` from front and back.
- Traffic: at least one red AI taxi with the same body, roof sign and decals; private cars remain non-red and use the generic sedan.
- Switch to `?city=newyork` and confirm the yellow medallion taxi still has its door badge, plates, roof sign and that AI taxis are still yellow.

If Chrome headless WebGPU is available, capture a screenshot with:

```sh
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --enable-unsafe-webgpu --use-angle=vulkan --window-size=1600,900 --virtual-time-budget=30000 --screenshot="C:\Users\X\AppData\Local\Temp\opencode\hk-taxi.png" "http://localhost:3000/?city=hongkong"
```

If headless rendering fails, ask the user to confirm the visual checks in a normal browser.

- [ ] **Step 5: Fix visual issues and re-run the suite**

Tune the Crown Comfort control points, decal atlas coordinates, fonts or colours only as needed. After any code change, re-run `node --test "tests/*.test.cjs"` and repeat the visual check.

- [ ] **Step 6: Commit**

```bash
git add README.md tests/taxi-styles.test.cjs
git commit -m "docs: document city taxi styles"
```
