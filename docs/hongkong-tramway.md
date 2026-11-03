# Hong Kong tramway

## Scope

The city now renders the northern-shore passenger tramway as embedded railway infrastructure rather than moving the old box vehicles along two road centrelines.

- **Four traced passenger alignments:** eastbound, westbound, Happy Valley and North Point.
- **Three additional terminus crossovers:** Shek Tong Tsui, Western Market and Causeway Bay. These short curves are derived from the official terminus-stop locations and the two adjacent passenger alignments; they are scene geometry, not surveyed siding plans.
- **123 official stop assignments / 116 unique stops**, including Kennedy Town, Shek Tong Tsui, Western Market, Causeway Bay, North Point, Happy Valley and Shau Kei Wan termini.
- **30.765 km of generated track**, 10,575 sampled points, 901 overhead spans and 1,802 support poles in the current deterministic output.
- Depot-internal and non-passenger workshop tracks are not represented. The upstream package also omits some short physical terminus sidings, so this is a passenger-network reconstruction, not a claim to reproduce every piece of steel on the ground.

## Sources and licensing

`tools/data/hongkong/tram-network-source.json` is the compact, reproducible input snapshot. The generator and manifest record:

- Sager1145/Japan-Train-Map commit `611065e10415be9d8cef66add1580ec99f5ee527`, `app/public/rail/hk-2025.json`.
- Track centre-lines: **© OpenStreetMap contributors, ODbL 1.0**, chained from tram route relations by the upstream package.
- Stop identities and names: Hong Kong Tramways open data via **DATA.GOV.HK**, as packaged by that source.
- Upstream alignment SHA-256 `ff877b3d0b546423b6233cd269cdb7ca69b4af2ea92e7afab5158df89649706a`; compact snapshot SHA-256 `b19ae219bbb02e7b84733054557e0223496ef0bd38affc0e04b0166cdbb7f328`.
- Scene technical basis: **1,067 mm gauge**, **550 V DC**, single trolley pole, and an approximately **6 m** contact-wire height. The 6 m value is a scene baseline from government transport-study material, not a 2026 location-by-location survey.

## Geometry and road heights

Run:

```sh
node tools/cities/hongkong/build-tram-network.mjs
```

The builder resamples the traced alignments at 3 m, matches the same road-ribbon height functions used by the drivable roads, limits adjacent rail grades, and equalises heights at mainline/branch/crossover junctions. It writes:

- `js/hk-tram-network-data.js`
- `tools/data/hongkong/tram-network-manifest.json`

The current profile has a maximum adjacent height step of **0.36 m**, maximum sampled grade of **12.31%**, and **0 m junction height mismatch**. There are **68 terrain-height fallbacks** out of 10,575 points. Road geometry, DTM values and profile corrections remain approximate visual elevations; they are **not verified tramway engineering levels**.

Rail head width is 64 mm. Runtime rail-centre separation is `gauge + railHeadWidth`, leaving the specified 1,067 mm between the inner rail heads. Dark flangeway beds sit below flush steel running surfaces at road level; rails are not raised sleepers or a viaduct. Where the traced track or a derived crossover leaves an existing carriageway ribbon, the runtime adds a narrow asphalt infill immediately below the rail/flangeway surfaces (**5,244 flagged sample points**). The source road ribbons, surveyed markings and crossing data are not replaced or removed.

## Overhead and rolling stock

`js/cities/hongkong/tram.js` builds, per 1 km chunk:

- two embedded running rails and flangeway beds per alignment;
- one contact wire per running track;
- cross-road span wires, vertical droppers, contact ears, insulators and roadside poles;
- bounded span lengths (maximum **32 m** in the generated output).

Sixteen detailed double-ended, double-deck trams run on the eastbound, westbound, Happy Valley and North Point alignments. Features include separate windows on two decks, kerb-side doors, rounded roof/bodywork, destination boards, axle/wheel assemblies, headlights/tail lights, roof equipment and a single trolley pole. Vehicles accelerate and brake for ordered stops, dwell, and reverse at termini without an instant 180-degree body spin.

Vehicle chainage, road height, axle pitch and trolley contact are computed independently. The contact shoe is always `contactWireHeight` above the sampled rail point, including while reversing; the body is not clamped to a fixed `y` value.

`js/cities/hongkong/tram-motion.js` contains the pure chainage and motion implementation used by both runtime and tests.

## Street-light clearance

`build-street-light-clearance.mjs` now checks tram body, support-pole and span-wire envelopes in addition to the existing carriageway clearance. It deterministically relocates or suppresses affected lamps and revalidates the centimetre-quantised output.

The runtime retains the established **32 m / 0.30 / 0.14** soft street-light pools. The manifest must report both:

- `remainingCarriagewayConflicts: 0`
- `remainingTramConflicts: 0`

## Validation

```sh
node --test tests/hongkong-tram.test.cjs
npm run build:runtime
```

The tram tests check coverage, attribution, gauge/voltage, finite geometry, support records, continuous grades, connected termini, trolley contact, moving/dwelling/reversing vehicles, street-light clearance and byte-for-byte deterministic generation.

Browser inspection was performed in the complete Hong Kong city with the WebGL backend at representative mainline, Happy Valley and North Point locations, including day and night views. The inspected run contained 16 moving trams, 19 infrastructure chunks and no page exception; controlled motion probes advanced trams by **45–46 m**. Rails, overhead spans, trolley poles and paved terminus crossovers were visible in the close views, and the existing white lane markings and street-light pools remained present. The only resource error in that run was the already-known external font connection failure.
