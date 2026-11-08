# Plantation Road cut infill

The existing terrain clip for road index 36109 had four overlapping OSM-tunnel opening rectangles. `build-barker-cut-fill.py` triangulates their union into a local infill below the generated road surface; the scene also adds retaining faces around the clipped boundary, skipping sampled road mouths. It does not alter road ribbons, AI paths or the tram alignment. A separate visual view includes the existing road ribbon and terrain cuts.

The fill covers approximately 534.27 m² of the 534.38 m² union. Tiny triangulation omissions and exposed seams can remain; the boundary faces are deliberately omitted near road junctions, and the two existing bridge-end support pairs are still rudimentary. This does **not** establish accurate stone abutments, complete slopes, pedestrian access, collision for the new retaining faces, or an in-game driving result. Road and rail clearance checks are discrete samples only, and road/track elevations remain unsurveyed.
