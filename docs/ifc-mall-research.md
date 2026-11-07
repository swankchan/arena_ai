# IFC Mall — source and implementation notes

The shopping mall is not just the two existing IFC tower podiums. [Pelli Clarke & Partners](https://pcparch.com/work/ifc-hong-kong) describes a four-storey retail podium with cinema, restaurants and roof garden. [Hong Kong Government Greening](https://www.greening.gov.hk/en/greening-landscape/landscape-corner/index_id_43.html) describes the rooftop garden as approximately 0.84 ha, with a linear water feature, planting, covered paths and seating. Its photographs should guide the garden rather than replacing it with a generic lawn.

OSM [multipolygon relation 13849938](https://www.openstreetmap.org/relation/13849938) has an outer way 1034967053 and inner way 1034967052. It is associated with building relation 9229446, whose separate parts are:

- [664250329 v12](https://api.openstreetmap.org/api/0.6/way/664250329/full.json), four-level retail part, tagged height 30 m;
- [664250328 v9](https://api.openstreetmap.org/api/0.6/way/664250328/full.json), station-side part, three levels, tagged height 30 m;
- [664250327 v8](https://api.openstreetmap.org/api/0.6/way/664250327/full.json) and [664250326 v13](https://api.openstreetmap.org/api/0.6/way/664250326/full.json), both mapped as elevated glass retail bridges, min_height 7.5 m and height 30 m. These values are OSM tags, not surveyed levels.

[Apple's official IFC page](https://www.apple.com/hk/retail/ifcmall/) describes a three-storey shop with a 40-metre glass facade on a bridge above a street and gives 22.28463, 114.159172; this falls in the eastern bridge area. The glass facade, floor plates and actual sign need photo-based design rather than a generic flat mall facade.

## Road and terrain constraints

A temporary diagnostic projected the OSM parts into the game's coordinate system, sampling at 2 m. Part 664250329 contains about 409 sampled road points, mostly ways 39170, 44699 and 46194, tagged as tunnels in the game data. The western and eastern bridge footprints contain about 281 and 286 sampled road points respectively, including Man Cheung Street. Part 664250328 had no sampled road hits. Terrain in these parts ranges approximately 3.33–5.22 m in the game; these are DTM-derived values, not surveyed engineering elevations. A wall across the footprints or a blanket terrain flattening would break the user's road requirement. All levels, including ramps, portals and clearances, must be checked against full road geometry, traffic and the two existing tower models.

## Implemented approximation and limitations

The four OSM parts now supply the exterior outlines. The elevated parts have a 7.5 m-relative soffit; other perimeter bays that cross sampled surface roads have openings, so roads are not deliberately blocked. A 2 m grid sampled over the surrounding bounds tests collision clearance of 4.8 m above selected road surfaces; this is not a continuous proof for all traffic routes, overpasses, roads or vehicle sizes. The two IFC towers remain the existing separate models. The result was inspected with those towers in an isolated WebGL render, not the full game's WebGPU environment.

The roof garden, path, water, trees and eastern-bridge shop sign are photo-directed representations, **not** surveyed detail. The real Apple logo, interior, mall shop layouts, station and pedestrian connections are not reproduced. The rooftop ground selector supports a player already near roof height and does not lift road-level actors, but no staircase, escalator or lift is modelled for reaching it from street level. The top is a level platform in the game using OSM's 30 m tag, not measured engineering height. Exterior material and store arrangements are simplified, and the model needs in-game visual and drive-through validation before being described as faithful or complete.

## Temporary roof access

Older visitor guides ([Hong Kong Hustle, 2007](https://www.hongkonghustle.com/places/242/ifc-roof-garden/) and [The HK Shopper, 2012](https://thehkshopper.com/55-ifc-mall.html)) describe a lift near City Super to the P4 garden. They do not establish its exact location or current arrangement, so the model does not invent a lift shaft or stairs. Instead the teleport menu offers an explicitly labelled pedestrian-only roof arrival. This is a gameplay shortcut, not a recreation of the real access or mall interior. It selects walking mode and uses the model's roof height; ordinary map and street teleports retain their existing behavior. IFC colliders were checked at the arrival in a unit test; a full-game arrival and other surrounding colliders have not been visually validated.
