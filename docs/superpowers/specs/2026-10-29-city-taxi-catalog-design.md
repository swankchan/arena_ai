# City taxi catalog and Hong Kong Crown Comfort redesign

Date: 2026-10-29
Status: proposed

## Intent

Hong Kong taxis currently look like generic red sedans. The player car is a New York taxi body repainted red, with the New York livery switched off, and the Hong Kong AI cars are ordinary sedans painted red. They have no roof sign, no Hong Kong door markings, no seat sticker, and no Crown Comfort silhouette.

This change does two things at once:

1. Redesign the Hong Kong urban taxi as a Toyota Crown Comfort-style car: boxier and taller cabin, narrower body, upright glasshouse, long rear doors, short deck, two-tone red/silver paint, black bumpers and rubbing strip, chrome grille, rectangular lamps, roof `TAXI` sign, green `TAXI 4 SEATS` stickers, white `的士 TAXI` door lettering, and a yellow rear plate.
2. Move taxi appearance out of one-off city flags into a data-driven catalog. A city declares which taxi style it uses; the player car and that city's AI traffic read the same definition. Future cities add an entry instead of editing controllers, traffic, and materials.

The taxi follows the selected city automatically. There is no garage or cross-city taxi chooser. The home-screen city picker is the interface, and each city card gains a small taxi-style line so the choice is visible before entering.

## Goals

- A dedicated `BODY_SPECS.hkTaxi` Crown Comfort-style body used by both the player and Hong Kong AI taxis.
- Hong Kong livery drawn by the shared TSL car material, so player and AI taxis match exactly.
- Hong Kong AI traffic separates taxis from private cars: taxis use the Hong Kong body and livery; private cars keep the existing sedan geometry and palette.
- A `js/taxi-styles.js` catalog with `nyc-medallion` and `hk-urban` entries, referenced by city id and by city theme.
- New York AI taxis also resolve the `nyc-medallion` entry for body, livery and paint, so the catalog is authoritative wherever an existing taxi appears, not just for the player and Hong Kong.
- Existing New York and Grid City taxi appearance is preserved.
- The home-screen city cards show each city's taxi style name and paint swatch.
- Tests cover the catalog contract, the Hong Kong theme wiring, the dedicated body spec, and the AI taxi/private split.
- Draw calls stay bounded: one instanced mesh for Hong Kong private cars, one for Hong Kong taxis, one shared wheel mesh, plus the existing buses.

## Non-goals

- Driving a Hong Kong taxi in New York, or any other cross-city taxi selection.
- Adding new cities or new taxi styles beyond New York and Hong Kong.
- Redesigning private AI cars, buses, trams, or other actors.
- Changing vehicle handling, collision behaviour, collision footprint, or the traffic route graph.
- A 3D turntable or showroom preview on the home screen.

## Anti-goals

- A player Hong Kong taxi that looks different from an AI Hong Kong taxi.
- Per-vehicle materials, per-frame material rebuilds, or a draw call per taxi.
- Hardcoding Hong Kong in `controllers.js` or `traffic.js` in a way that future cities must copy.
- Regressing the New York medallion taxi, its door badge, or its plates.
- Text decals that appear on different doors on opposite sides, or mirrored lettering.

## Constraints

- Three.js WebGPU with TSL node materials. No custom GLSL pass.
- Car bodies are one mesh with a `partId` attribute; the material paints glass, trim, lamps, plates and liveries from object-space position and normal.
- Instanced traffic reads per-instance `paintColor` and `carState` attributes. Fixed-colour player materials use a `carState` uniform instead.
- Material instances are cached by body spec, paint mode, and livery. The player and traffic must not accidentally share a mutable state uniform.
- Node tests run without WebGPU or a DOM. Rendering-heavy model code is covered by source-contract tests; the catalog itself is plain data and can be imported directly.
- The Hong Kong road graph and collision dimensions must keep working.

## Approaches considered

### 1. Data-driven catalog plus shader livery (chosen)

Add a small taxi catalog, one dedicated Crown Comfort body spec, and extend the existing TSL car material with a Hong Kong livery mode. Hong Kong traffic gets a second instanced mesh for taxis. Decals are painted from a generated texture atlas sampled in object space.

Why: player and AI share one body spec and one livery definition; draw calls stay low; future cities are a catalog entry plus a body spec. The cost is a more complex material and a visual tuning pass.

### 2. Catalog plus separate decal meshes

Same catalog and body spec, but door lettering, stickers and roof-sign text are separate textured meshes (player) and extra instanced meshes (AI).

Why not: each taxi class gains several draw calls, and the player and AI decal placement must be maintained twice. The existing New York door decal already shows this duplication.

### 3. Hardcode the Hong Kong taxi only

Change the player car and Hong Kong traffic directly, with no catalog.

Why not: fails the stated goal of adding other regions later, and leaves New York and Grid City on a separate path.

## Design

### 1. Taxi style catalog

New file `js/taxi-styles.js`, plain data with no Three.js imports:

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

- `getTaxiStyle` returns `null` for an unknown or missing id so the controller can keep its legacy fallback. The default New York entry remains available through `DEFAULT_TAXI_STYLE`.

- `body` names a key in `BODY_SPECS`.
- `livery` selects the shader livery: `nyc`, `hk`, or `none`.
- `plate` selects the physical plate meshes added by the player controller (`hk` white front / yellow rear, `nyc` Empire Gold pair).
- `doorDecal` selects optional extra player decal meshes; only New York uses one after this change.

City registry entries gain `taxiStyle`:

- New York: `nyc-medallion`
- Hong Kong: `hk-urban`
- Grid City: `nyc-medallion` (existing default yellow cab)

City themes gain `car.taxiStyle` where they need a non-default style. Hong Kong becomes:

```js
theme: {
  car: {
    label: '香港的士',
    taxiStyle: 'hk-urban'
  }
}
```

Legacy fields (`paint`, `taxiLivery`, `nycDoorDecals`, `plate`) remain supported as fallbacks in the controller, but the Hong Kong theme stops using them. The style is the source of truth.

### 2. Crown Comfort body spec

Add `BODY_SPECS.hkTaxi` in `js/actor-models.js`, derived from the sedan but with its own nested objects. Approximate real Crown Comfort proportions:

- Length about 4.5 m within the existing collision envelope, width about 1.72 m, roof about 1.50 m.
- Narrower half-width curves (~0.86 m max) than the sedan (~0.93 m).
- Taller, flatter belt line and shoulder.
- Cabin cowl moved forward and roof front moved back for a more upright windshield.
- Roof rear moved back and deck moved forward: long cabin, short rear deck.
- Larger, squarer headlights and taillights; wider chrome grille; taller black bumper strips.
- `sign: true`, `chrome: true`, no roof rails, no rear wiper.
- Door shut lines moved: front door longer, rear door centred around the rear passenger area.
- Plate heights raised to sit in the new bumper/trunk layout.

The exact control-point values are a builder call, tuned against the reference photos and the existing loft curves. The spec must not mutate shared sedan arrays.

`BODY_SPECS.taxi` remains the New York taxi body.

### 3. Hong Kong shader livery

Extend `createLoftedCarMaterial(spec, fixedColorHex, options)`:

- Replace the boolean `taxiLivery` cache dimension with a `livery` string: `options.livery ?? (options.taxiLivery === false ? 'none' : 'nyc')`.
- Cache key becomes `${spec.name}_${fixedColorHex ?? 'instanced'}_${livery}`.
- `nyc` keeps the existing badge, medallion and roof-sign glyph exactly as today.
- `none` keeps the current no-livery behavior.
- `hk` adds the following, only for that material:

Body and glasshouse:

- Silver roof and pillars: on the `WINDOW` part, mix the painted shell (not glass, not seals, not the chrome belt) toward a warm silver above the belt line. The B-pillar stays black through the existing seal mask.
- Black lower bumpers: front and rear body faces below the bumper line become near-black, matching the physical black bumper trims.
- Black side rubbing strip: a thin horizontal band at about 0.53 m, broken at the wheel arches and ending before the bumper wraps.
- Chrome grille: the grille area becomes a chrome base with dark horizontal slats and a chrome surround. Metalness rises and roughness falls there.
- Chrome headlight bezels around the rectangular lenses.
- White front plate: the shader-painted front plate becomes white for AI cars; the physical player plate is already white. The rear plate stays yellow and keeps the existing generated plate texture.

Generated textures:

- `hkTaxiSideTexture()`: one atlas with separate left- and right-side halves. Each half contains the white `的士` and `TAXI` front-door lettering and the green `TAXI 4 SEATS` rear-door sticker. The two halves are laid out as mirror images of the physical car so the lettering reads correctly from outside and stays on the same doors on both sides.
- `hkTaxiSignTexture()`: cream `TAXI` roof-sign face with dark lettering. Sampled on the front and back faces; the horizontal coordinate flips on the back face so the text is not mirrored.

Object-space mapping:

- Side decals are sampled only on painted body sides (`isBody`, `isSide`), within a rectangle covering the doors in z and the belt-to-rubbing-strip height in y. UVs are computed from `p.z` normalized across the door span and `p.y` normalized across the decal height. The left/right atlas half is chosen by the sign of `p.x`.
- The decal blend uses the texture alpha, so the transparent canvas background leaves the red paint untouched.
- The roof sign uses the sign face mask already used by the New York glyph.

Texture helpers are module-level lazy singletons, matching `carPlateTexture()`.

Emissive behaviour:

- The Hong Kong roof sign uses the sign texture brightness as its emissive mask, so the cream background glows at night while the dark letters stay legible.
- Headlamps, taillights, turn signals and the New York sign are unchanged.

The `hk` block must be a JS-level conditional so non-HK materials do not pay for the extra texture samples or masks.

### 4. Player controller

`createCarEntity()` resolves the style:

```js
const style = getTaxiStyle(carTheme.taxiStyle) ?? getTaxiStyle(DEFAULT_TAXI_STYLE);
const spec = BODY_SPECS[style?.body] ?? BODY_SPECS.taxi;
const paint = carTheme.paint ?? style?.paint ?? 0xffbe14;
const livery = style?.livery ?? (carTheme.taxiLivery === false ? 'none' : 'nyc');
```

- Body geometry and material use the resolved spec and livery.
- Physical plates use `style?.plate ?? carTheme.plate`.
- The New York door-decal patch is added only when `style?.doorDecal === 'nyc'` (legacy `nycDoorDecals !== false` still works when no style is available).
- No other player logic changes. Headlights, wheels, steering and shadow follow the chosen spec. The player collision footprint stays at the existing 0.86 m half-width and 2.18 m half-length, which the Crown Comfort body is sized to fit.

### 5. Hong Kong AI traffic

`createHongKongTraffic` reads the same style (`hk-urban`) rather than hardcoding a body.

- Classify each car deterministically as taxi or private, keeping roughly today's two-in-seven red share. Taxi status becomes an explicit `taxi` boolean instead of being inferred from paint.
- Private cars: current sedan geometry, current instanced paint material, and a private palette that no longer contains red, so red always means taxi.
- Taxis: a second `InstancedMesh` built from `BODY_SPECS[style.body]` with `paintColor` and `carState` instanced attributes, and `createLoftedCarMaterial(spec, null, { livery: style.livery })`. Per-instance paint is set to the style paint; per-instance state stays available for brake and turn lights.
- Taxi bodies use a compact taxi slot for instance matrices; private cars keep the existing car slot. The shared wheel mesh keeps using the car index so wheels stay aligned.
- `renderVehicle` writes the body matrix to the correct mesh and still writes all four wheels.
- Update flags: taxi and private matrix buffers, wheel matrix buffer, private paint buffer.
- Hong Kong taxis keep the existing 0.86 m half-width and 2.18 m half-length collision values; the Crown Comfort spec is sized to that envelope, so collision behaviour does not change.
- Bus rendering is untouched.

This guarantees that the tourist-looking red car in traffic is the same Crown Comfort taxi as the player car, not a repainted sedan.

### 6. New York AI traffic

The two New York traffic builders also resolve the `nyc-medallion` style instead of hardcoding `BODY_SPECS.taxi` and `0xffbe14`:

- `js/traffic.js` Manhattan traffic: resolve body geometry, material livery and the taxi paint colour from the style.
- The highway traffic builder in the same file: for the `taxi` kind, resolve the body spec and livery from the style, and assign the style paint colour when creating taxi instances.

The New York taxi body, door badge, plates, roof sign and per-instance `carState` behaviour are unchanged. This keeps the catalog authoritative for every taxi already in the game and prevents a future catalog edit from leaving one AI fleet behind.

### 7. Home-screen taxi line

`js/main.js` reads `getTaxiStyle(city.taxiStyle)` for each registry card and adds a small line above the CTA:

- A paint swatch dot using the style paint colour.
- The style label, e.g. `紅色的士 · Toyota Crown Comfort`.

`css/style.css` adds `.city-card-taxi` and `.city-card-taxi-dot`. The line is text and a coloured dot only; no 3D preview.

### 8. Documentation

Add a short `## Taxi styles` section to `README.md`:

- A taxi style is a catalog entry plus a `BODY_SPECS` body.
- A city references it in `js/cities/registry.js` and `theme.car.taxiStyle`.
- Player and AI traffic read the same catalog entry.
- Textures and shader livery live in `js/actor-models.js`.

## Affected files

- `js/taxi-styles.js` (new)
- `js/actor-models.js`: `BODY_SPECS.hkTaxi`, HK livery branch, texture helpers
- `js/controllers.js`: style resolution, plate/decal gating
- `js/traffic.js`: New York AI taxi style resolution
- `js/cities/hongkong/index.js`: theme uses `taxiStyle`
- `js/cities/hongkong/traffic.js`: taxi/private instanced split
- `js/cities/registry.js`: `taxiStyle` metadata on city cards
- `js/main.js`: city-card taxi line
- `css/style.css`: city-card taxi line styles
- `README.md`: taxi style documentation
- `tests/taxi-styles.test.cjs` (new)
- `tests/hongkong.test.cjs`: Hong Kong taxi wiring and body assertions
- `tests/traffic.test.cjs`: New York AI taxi catalog wiring

## Testing

- Catalog contract: every style has a matching id, a city, a label, a body name, a livery, a plate mode, and a numeric paint value. The default style exists. Hong Kong points at `hkTaxi`, `hk` livery and `hk` plates. New York keeps `taxi`, `nyc` livery and `nyc` plates.
- Hong Kong wiring: the city theme references `hk-urban`; `traffic.js` resolves the style instead of hardcoding a body; a taxi instanced mesh exists alongside the private-car mesh; the player controller resolves `taxiStyle`.
- New York wiring: both New York traffic builders resolve the `nyc-medallion` style for taxi body, livery and paint instead of hardcoding `BODY_SPECS.taxi` and the yellow constant.
- Body spec: `actor-models.js` defines `hkTaxi` with `sign: true` and does not mutate the sedan. Source assertions cover the Crown Comfort dimensions and the HK livery/texture hooks.
- UI: `main.js` renders `.city-card-taxi` from `getTaxiStyle`; the stylesheet defines it.
- Run `node --test "tests/*.test.cjs"`; the existing 171 tests must keep passing.
- Visual check in a browser with `?city=hongkong`: player taxi from chase and action cameras, plus a traffic close-up showing an AI taxi. Check both sides of the car for readable, correctly placed door lettering and stickers; check the roof sign from front and back; check that private traffic cars still look like private cars.
- If headless WebGPU is available, capture a screenshot; otherwise ask the user to confirm visually.

## What is left to the builder

- Exact Crown Comfort control-point values and lamp/grille sizes, tuned visually within the spec framework.
- Exact decal typography, atlas pixel layout, sticker proportions and colours, tuned against the references.
- Exact silver/black/chrome colour values and roughness/metalness numbers, tuned to match the reference photos.
- Whether the small taxi line belongs above or below the city description; the design places it above the CTA.
- Any refactoring needed to keep the TSL node graph readable, as long as the catalog, livery and traffic contracts above hold.
