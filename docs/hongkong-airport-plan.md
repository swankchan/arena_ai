# Hong Kong International Airport — construction plan

Date: 2026-11-06  
Site: Chek Lap Kok / 赤鱲角, **not** Kai Tak and not the AIRSIDE mall.

This is the construction sequence being implemented in the current change. It is not a proposal to stop after planning. The airport will be built from georeferenced source geometry and procedural meshes; photographs are research evidence only and will never be used as textures.

## 1. Scope and recognisable identity

The first complete airport composition contains:

1. The current three-runway airfield: North `07L/25R`, Centre `07C/25C` and South `07R/25L`, each with a 60 m pavement, continuous DTM-following surface, shoulders, threshold / aiming-point / centreline markings, edge lights and principal taxiway connections.
2. Terminal 1: the source Y-shaped terminal / concourse footprint, long central circulation spine, two angled arms, glass walls, white structural mullions and **129 modelled barrel-vault roof modules**. The distribution of modules is a visual reconstruction, not a claim to have the original structural BIM.
3. Terminal 2: the current expanded processor on its 2026 OSM footprint, with a photo-directed feather roof, separated skylight slots, deep eaves, glass walls and branching tree columns.
4. T1 Midfield Concourse: its long source footprint, curved roof and rooflights, full-height glazing, inclined mega-columns, gates and apron.
5. T1 Satellite Concourse and Sky Bridge: the source concourse, a glazed 200 m bridge composition with a 28 m deck datum, white structure and an open taxiway below.
6. South Air Traffic Control Tower on its exact OSM footprint, plus the current 102 m New Air Traffic Control Tower beside the T2 Concourse area. The NAT position / base outline is explicitly photo-directed because no verified OSM tower footprint has been obtained; its height is from CAD.
7. Aprons, gate markings, jet bridges, parked procedural aircraft, service vehicles and airfield lights. Aircraft are built from geometry, with fuselage, swept wings, tailplanes, fin, engines, windows and landing gear.
8. Airport teleports, atlas landmarks, HUD location, ground queries, collision envelopes and night materials.

This pass does **not** claim to reproduce every cargo shed, every support building, all 211 parking stands, an operational aerodrome ground-movement chart, or a flight simulator. Principal taxiways and gate positions are a clearly documented visual reconstruction around the georeferenced runways and terminals, not navigation data.

## 2. Traceable sources

### Georeferencing and site coverage

- OSM aerodrome relation **16105017**, Hong Kong International Airport: <https://www.openstreetmap.org/relation/16105017>. Nominatim reports the airport at 22.3125986, 113.9172999.
- Existing `HK_FULL_MAP.land` covers all sampled terminal and runway points, including the northern reclamation. The existing coastline remains unchanged.
- Existing `HK_FULL_ROADS` already contains Airport Road, Cheong Hong Road, Control Tower Road, runway roads and airport service roads. These remain drivable and retain their existing road profiles.
- Existing 5 m DTM is used only as the app's traceable terrain field. It is **not** described as a surveyed engineering elevation. Samples at the T1 / T2 / south-tower area are about 8 / 7 / 7 m; the northern runway samples are zero in this DTM. Airport presentation therefore follows the same DTM rather than silently replacing it with a supposedly surveyed airfield datum.

### Terminal and tower geometry

Nominatim geometry is simplified only for real-time rendering. The OSM way ID and the simplification threshold are recorded in the source module; no generic airport footprint is substituted.

- T1, OSM way **772085062**, `building=transportation`, six above-ground levels plus two underground, round silver roof: <https://www.openstreetmap.org/way/772085062>. Geometry lookup used `polygon_threshold=0.00005`.
- T2, OSM way **1204348925**, current expanded terminal, `start_date=2026-05-27`: <https://www.openstreetmap.org/way/1204348925>.
- T1 Midfield, OSM way **393009711**, four levels plus three underground, round roof: <https://www.openstreetmap.org/way/393009711>. Geometry lookup used `polygon_threshold=0.00003`.
- T1 Satellite, OSM way **155502514**, two levels and wave roof: <https://www.openstreetmap.org/way/155502514>. Geometry lookup used `polygon_threshold=0.00002`.
- South ATC tower, OSM way **393439479**: <https://www.openstreetmap.org/way/393439479>.
- T2 Concourse reference, OSM way **775198090**, used only to establish the NAT's northern airport context: <https://www.openstreetmap.org/way/775198090>. Its stale `construction` tag is not treated as proof of the current operational state.

### Dimensions and architectural research

- Airport Authority fact sheet (June 2026): three 3,800 m × 60 m runways; expanded T2 began operations in phases from September 2025, departures on 27 May 2026: <https://www.hongkongairport.com/iwov-resources/file/the-airport/hkia-at-a-glance/facts-figures/HKIA_FactSheet_2606_EN.pdf>.
- AirportGuide runway endpoints, cross-checked against the official runway dimensions: <https://airportguide.com/airport/info/HKG>. Its runway elevations are not substituted for the app DTM.
- Government NAPCO: T1 is just over 1 km long, has a wing-like wave roof, tinted glass walls, a Y-shaped concourse and a 750 m central concourse: <https://www.info.gov.hk/archive/napco/p-airport.html>.
- HKIE, August 2025: **129 parallel barrel vaults**, with prefabricated roof sections up to 54 m × 36 m: <https://www.hkengineer.org.hk/issue/vol53-aug2025/feature_story/?id=18929>.
- Aedas / AECOM T2 research: feather roof, separated daylight slots, deep overhangs and tree-like columns; the roof is approximately 63,000 m²: <https://www.prc-magazine.com/aedas-celebrates-opening-of-hkia-terminal-2/> and <https://aecom.com/press-releases/aecom-celebrates-the-successful-delivery-of-terminal-2-at-hong-kong-international-airport/>.
- Aedas Midfield research and photographs: full-height glazing, external shading, inclined steel mega-columns and rooflights: <https://www.aedas.com/en/project/hong-kong-international-airport-midfield-concourse/>.
- CAD 2024–25 report: the New ATC tower is **102 m** and entered service in November 2024: <https://www.cad.gov.hk/reports/an2024-2025/html/en/ch6.html>.
- Sky Bridge: 200 m long, 28 m high, glazed and able to span a Code F aircraft taxiway: <https://www.aci-asiapac.aero/media-centre/news/sky-bridge-opens-to-offer-new-airport-experience-with-stunning-view>.

Photo review also covered the T1 airside barrel-vault elevation, curved white facade mullions and interior vault panels; the T2 feather-roof exterior; Midfield glass / mega-column details; and the old and new control-tower silhouettes. Those image files remain outside Git and are not runtime assets.

## 3. Construction sequence

### Phase A — provenance and shared airport frame

- Preserve the WGS84 source points in `airport-architecture.js` and project them with the same Hong Kong tangent plane as the rest of the city.
- Use T1's minimum-area oriented frame as the airport-local runway axis. Verify that all three runway pairs and the Midfield align with it.
- Keep source geometry, photo-directed geometry and presentation heights explicitly separate.

### Phase B — airfield and ground

- Build continuous segmented runway / taxiway ribbons whose vertices sample the exact rendered DTM triangle height. No flat runway hovering over a sloping cell and no staircase segments.
- Add low apron concrete below the existing road surface, then runway markings and lights above the pavement.
- Use one shared airport ground query for players, vehicles, aircraft and furniture. Existing carriageways retain priority.

### Phase C — individual architecture commits

- Build and review each terminal / tower as its own procedural module and independent commit.
- T1 receives actual curved vault surfaces, seams and ribs; T2 receives separate undulating feather strips and tree columns; Midfield receives its mega-column / rooflight identity. A textured box is not accepted as a substitute.
- Keep ground-floor road openings and upper collision envelopes consistent. No lamp, column or aircraft may be left inside a terminal.

### Phase D — airport life and access

- Add jet bridges, marked stands, procedural parked aircraft and service vehicles at the authored aprons.
- Add atlas geometry, airport teleport and HUD naming without restoring the rejected Building Inventory or `Local first` row.

### Phase E — integration and verification

- Integrate once with `simple_replace` / unified world, terrain, ground, collision, map, runtime entry and debug world references.
- Extend street-light clearance for the new source building rings, regenerate the official clearance data and inspect every remaining airport road / lamp conflict.
- Run focused source / geometry / integration tests, then the complete `node --test --test-reporter=dot tests/*.test.cjs` suite.
- Rebuild `app.runtime.js` and its manifest, repeat focused tests, and commit / push the completed work on the session branch.

## 4. Acceptance checks

- All five principal OSM building / tower IDs and all three runway pairs are present; measured runway lengths are consistent with 3,800 m within source-coordinate rounding.
- Exactly 129 T1 barrel vaults are generated; T2 feather strips, Midfield mega-columns and both tower silhouettes are actual meshes.
- Every geometry position is finite; no photo / texture loader, downloaded model or generic grey-box substitute is introduced.
- Runway and apron ground queries agree with their rendered DTM-following surfaces; existing roads keep their profiles and collision-free vehicle envelopes.
- No final street lamp occupies a new terminal / tower footprint. Existing full-Hong-Kong roads, tram, crossings, parks, landmarks and street-light behaviour remain green in the complete suite.
- Node tests and runtime construction are reported separately from browser visual inspection. If Chromium remains unavailable, no claim of browser visual inspection is made.

## 5. Completion record — 2026-11-06

- Implemented all Phase A–E items: three DTM-following runways, 14 principal visual taxiways, three aprons, T1 / T2 / Midfield / Satellite, both control towers, Sky Bridge, 23 procedural aircraft and jet bridges, map geometry, airport HUD naming and a road-valid airport teleport.
- Each terminal / tower was committed independently before the unified-world integration commit.
- `tests/hongkong-airport.test.cjs` covers source identity, exact runway dimensions, 129 vaults, DTM pads, road-clear colliders, cleared lamps, teleport, finite asset-free geometry and runtime / map wiring.
- Final complete suite: **763 tests passed, 0 failed** (`node --test --test-reporter=dot tests/*.test.cjs`).
- Runtime rebuilt successfully from **241 modules**. A separate full unified-world Node construction completed with airport stats present, 77 total landmarks and 38,912 colliders; browser-only canvas / Path2D calls were stubbed for that construction check.
- No Chromium / Playwright browser session was available. The geometry, integration and runtime checks above are **not** represented as browser visual inspection.
