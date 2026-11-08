# Hong Kong Academy for Performing Arts — Wan Chai reference research

Scope: existing campus at 1 Gloucester Road, not the neighbouring Hong Kong Arts Centre, the Béthanie campus, or the proposed expansion. Research gathered October 2026; no geometry or heights here are survey measurements.

## Saved reference photographs

- `images/gloucester-road-2015.jpg` — Exploringlife, 17 December 2015, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_Hong_Kong_Academy_for_Performing_Arts.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Original file, unmodified. Shows the full Gloucester Road elevation, roof structure and theatre block.
- `images/campus-model-2013-thumbnail.jpg` — Yaukanmgonghu, 23 November 2013, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:HK_Wan_Chai_North_HKAPA_%E9%A6%99%E6%B8%AF%E6%BC%94%E8%97%9D%E5%AD%B8%E9%99%A2_The_Hong_Kong_Academy_For_Performing_Arts_Nov-2013_school_campus_building_model.JPG), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Wikimedia 500 px derivative; no further edits. Photograph of a physical model, useful for relative massing and roof forms, not proof of current exact landscaping or dimensions.

## Architectural observations

[M+ Simon Kwan archives](https://www.mplus.org.hk/en/collection/archives/drawings-and-photographs-the-hong-kong-academy-for-performing-arts-19811985-hong-kong-ca15-2/) describes interlocking triangular volumes, a five-storey academic block and six-storey theatre block, connected over an internal vehicle road, with ceramic-tile-clad facades and a glazed atrium. Historic images are not a current site plan. The Gloucester Road view has pale grey-beige vertically textured cladding, deep dark window bays and large pale diagonal bracing forming triangular patterns; strong blank end walls; a thin upper roof edge on exposed columns; a glazed blue-grey atrium; and the theatre's stepped, angular, largely solid masses. Add tile joints and tonal variation rather than a flat white box. The physical model indicates more complex angular roofs and a curved glazed/solid canopy towards one end.

The [official venue description](https://www.hkapa.edu/tch/hirers/venues) identifies the enclosed Jockey Club amphitheatre and its adjustable skylight: do not blindly recreate the original outdoor amphitheatre described by the 1985 archival account. A proposed later expansion is not evidence of current massing.

Night observation: the [government film location listing](https://fpf.ccidahk.gov.hk/en/location/detail.php?id=107) shows warm spotlit walls, a few lit windows and cool atrium light, not uniformly luminous cladding. Its images are not copied here: the site's copyright notice prohibits reproduction without prior written authorisation. Similar night and daylight streetscape images can be consulted at the [government location page](https://www.gohk.gov.hk/en/spots/spot_detail.php?spot=Hong+Kong+Academy+for+Performing+Arts); check rights before redistribution.

## Location and unresolved modelling checks

Government location listing gives 22.280170930802736, 114.16940283782252. [OSM way 865670733](https://www.openstreetmap.org/way/865670733) identifies the university site; this is not yet verified as the actual building footprint. Neighbouring Arts Centre is OSM way 117088646 and must not be replaced. Site/building rings, height, road clearances, terrain, internal access road, canopy orientation, current rear elevations, night-light distribution and collisions need verification before integration. Existing runtime still needs an authored model, day/night integration, terrain/road coordination and tests; these notes do not claim a completed building.

### Mapped outline and road audit

OSM [way 117088641](https://www.openstreetmap.org/way/117088641), version 14, is the `building=university` outline, distinct from the larger university grounds way 865670733 and Arts Centre way 117088646. Its node coordinates and IDs are preserved in `tools/data/hongkong/hkapa-building-osm.json`; node 6853998910 is tagged as a main entrance. The outline is a mapped envelope, not an architectural survey; in particular it should not simply be extruded solid across the connected vehicle access or uniformly to one height.

`tests/hkapa-source.test.cjs` checks the closed outline and calculates segment-to-polygon distances against the game's current inferred road ribbons with a 0.35 m margin. It finds no conflicts with the mapped overall envelope. This does **not** validate unbuilt photo-directed volumes, actual kerbs, lamps, ground heights, the internal driveway, the adjacent footbridge, or gameplay collision; those remain to be tested when the model exists.

## Implemented model and limitations

The procedural model uses the OSM building envelope, divided into teaching, theatre and covered-western volumes. The approximate 8.4 m internal vehicle clearance follows three mapped nodes of [OSM service way 1193439765](https://www.openstreetmap.org/way/1193439765); the buffer width, subdivision into blocks, 11.5–31 m heights, roof shapes, façade pattern and glazing are visual estimates, **not** measured plans. `tools/cities/hongkong/build-hkapa-massing.py` documents how the footprint was derived (requires Shapely). The main door has a real collider/wall gap at OSM entrance node 6853998910; the upper atrium spans the open driveway. DTM-derived site pads exclude the driveway and existing roads. TSL glazing has individually lit warm panes and cool atrium light at night.

Automated checks cover finite geometry, road ribbons versus the mapped footprint, sampled driveway centreline and colliders, the entrance, mapped street-lamp centres, TSL materials, and DTM/road-priority behaviour. They are not an engineering clearance survey: the full driveway width, neighbouring footbridge, terrain mesh, fine architectural proportions, actual lighting and playable approach need in-game visual verification. No in-game WebGPU visual check was available during construction.
