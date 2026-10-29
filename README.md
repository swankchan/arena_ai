# Slop New York

A city simulation built with [three.js](https://threejs.org/), WebGPURenderer, and TSL. Pick a city on the home screen and explore it on foot, by car, by bicycle, or by helicopter.

[Try it live](https://mrdoob.github.io/slop-newyork/)

## Cities

- **New York** — the full-detail world: every Manhattan block from 125th St to the Battery, real landmarks, subway entrances, avenue traffic signals, environmental audio synthesis, street map and minimap, and 11 camera presets (including the scenic and aerial rigs).
- **Hong Kong** — the full-detail harbour city: Central, Admiralty, Wan Chai, Causeway Bay, Tsim Sha Tsui, Jordan, Yau Ma Tei and Mong Kok, built from OpenStreetMap blocks and streets with Chinese names, neon blade signs, red urban taxis, trams, the Star Ferry, harbour water, street map and minimap, and nine camera presets.
- **Grid City** — a procedural 7×7 downtown generated in code at load: sidewalks, glass and stone towers, a central plaza with fountain, trees, street lamps and four teleport destinations. It has no external map data, map overlay or audio, and offers the three follow cameras.

Add `?city=hongkong` (or `?city=grid`, `?city=newyork`) to the URL to skip the picker.

## Controls

| Input | Action |
| --- | --- |
| `1` `2` `3` `4` | Walk, drive, cycle, fly |
| `5`–`0`, `V` / `Shift+V` | Camera presets, cycle cameras |
| `W` `A` `S` `D` | Move / steer |
| `Space` | Jump / ascend |
| `Q` `C` | Descend (helicopter) |
| `B` | Horn |
| `N` | Toggle sound |
| `M` | Full-screen map |
| `H` | Hide / show the HUD |

Touch controls and gamepads are supported. The teleport menu is generated from the active city's destinations.

## Development

No build step: the app is native ES modules. Serve the directory over HTTP (the modules will not load from `file://`):

```sh
npx serve .
```

Run the test suite with Node:

```sh
node --test "tests/*.test.cjs"
```

## Adding a city

Cities are packs loaded on demand:

1. Add a card to `js/cities/registry.js` with a dynamic loader:

   ```js
   {
     id: 'mycity',
     name: 'My City',
     short: 'MC',
     badge: 'Demo',
     tagline: 'One line for the home screen',
     description: 'A sentence about the world.',
     load: () => import('./mycity/index.js')
   }
   ```

2. Create `js/cities/mycity/index.js` exporting `city` with metadata (`id`, `name`, `short`, `storageKey`) and `build({ scene, renderer, lightingSystem, markInit, setStatus })`.

`build()` returns a world object. Required: `colliders`. Optional:

| Field | Purpose |
| --- | --- |
| `spawn(mode)` | Per-mode starting point `{ x, z, heading?, y? }` |
| `update(dt, elapsed, { cameraSystem, controllerManager })` | Per-frame city systems |
| `updateCulling(cameraPosition)` | Distance / chunk culling |
| `dynamicRoots` | Moving hierarchies whose matrices are finalized after updates |
| `teleports` | `{ id, name, sub, x, z, heading }` entries for the teleport menu |
| `cameraPresets` | Subset of camera ids (`chase`, `action`, `pov`, plus scenic ids) |
| `roadNames`, `placeNames`, `locationLabel(x, z)` | Street-corner HUD labels |
| `defaultMode` | Initial mode (`person`, `car`, `cyclist`, `helicopter`) |
| `entityLabels` | Rename the shared actors in the HUD |
| `player` | Ground adapter: `{ bounds, getGroundHeight(x, z, mode), isPointOnSidewalk(x, z) }` |
| `createMap(...)`, `createAudio(...)` | Optional map overlay and audio system |

Without a `player` adapter the controllers use Manhattan's real blocks and shoreline. New York keeps exactly that behaviour.

## Taxi styles

A city's taxi is a catalog entry in `js/taxi-styles.js` plus a body in `BODY_SPECS` (`js/actor-models.js`). A style names its body, paint, shader livery, plate mode and optional door decal. The player car and the city's AI traffic both resolve the same entry.

To add a region's taxi:

1. Add a `BODY_SPECS` entry for the body.
2. Add a `TAXI_STYLES` entry in `js/taxi-styles.js`.
3. Set `taxiStyle` on the city card in `js/cities/registry.js` and in the city theme's `car` object.

Hong Kong uses `hk-urban` (`BODY_SPECS.hkTaxi`, livery `hk`); New York uses `nyc-medallion` (`BODY_SPECS.taxi`, livery `nyc`).

## Colliders and traffic

Two rules keep a generated city drivable and its traffic physical:

**Colliders must match visible geometry.** Entries in `world.colliders` are axis-aligned boxes unless they provide an `obb`. `js/controllers.js` uses `obb` in its narrow phase, so rotated buildings and diagonal seawalls must supply one; an AABB around a rotated rectangle reaches into the street and feels like an invisible wall. Landmarks and props that are rendered as axis-aligned boxes can stay AABBs. Verify clearance against the real drivable graph by sampling link centre lines and asserting that collider overlaps stay near zero (see `tests/hongkong.test.cjs`). Hong Kong's AABB colliders covered 27% of wide-road centre-line metres; with oriented footprints it is ~1.6%, and the remainder is visible landmark geometry.

**Traffic keeps its route; contacts come from the shared solver.** Cars advance kinematically along the road graph, then resolve car-to-car and car-to-player contacts with `js/vehicle-physics.js` (`vehicleContact`, `sweptVehicleContact`, `resolveVehicleContact`), exactly as New York does. Keep a contact correction as a decaying positional `push` so a struck car visibly moves but settles back into its lane instead of leaving the graph. Pass `controllerManager` through the city `update` and run the traffic collision pass after the controllers have moved the player.

Add following before enabling contacts: cap a car's speed by the gap to the leader on the same link and direction. Without it, collision-enabled traffic spends its time rear-ending the car in front. `tests/hongkong-collision.test.cjs` covers separation, momentum, player push-out, helicopter/distance ignores, and following caps.

## Geographic data

New York's geometry is generated from NYC Open Data, MTA subway entrances, NYC Parks and © OpenStreetMap contributors, then baked into `js/nyc-geodata.js`.

To rebuild it (requires the source extracts in `tools/data`, see `tools/build-geodata.mjs`):

```sh
GEO_DATA=tools/data node --max-old-space-size=8192 tools/build-geodata.mjs
```

Hong Kong's geometry is generated from OpenStreetMap data (Overpass API) and baked into `js/hk-geodata.js`:

```sh
node --max-old-space-size=8192 tools/build-city.mjs hongkong
```

Cached Overpass extracts are reused from `tools/data/hongkong/`; set `GEO_REFRESH=1` to download them again.

## Make it your own

Fork it, remix it, improve it, break it. Make games, animations, films, experiments, or something completely different. Use it as a starting point and take it wherever you want. Have fun!

Explore other cities and community remixes in [Slop Cities](https://github.com/zz85/slop-cities).

## License and data

The project code is available under the [MIT License](LICENSE).

Geographic data: NYC Open Data, [MTA subway entrances](https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja), and © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL). Third-party data and dependencies retain their respective licenses.
