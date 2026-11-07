# Hong Kong pale-facade source audit (2026-11-07)

This is a source-code triage, not a visual inspection of every building or a WebGPU render certification. A pale material alone is not a defect: for example stadium membranes, colonial columns and lighting are intentionally light. Conversely a facade can be hidden behind another mesh even when its source contains windows.

- Searched the authored `*world.js` files for white / pale materials and for `Mesh*Material({color: color(...)})`, the previously identified CPU-colour/TSL mix-up. No matching one-line constructor was found; this does not rule out other forms of that mistake.
- 32 world files reference the shared `materials.white`, `mats.white` or `palette.white` patterns. These uses require context, not blanket replacement.
- **Kowloon Park Sports Centre:** its ribbon windows were built inside the larger ring shell, so they could be occluded by the plain white wall. Added perimeter-following glazing and mullions on the actual ring, plus a less-white stone wall. The detailed facade is an interpretation, not a verified survey.
- **Victoria Park swimming pool:** previous change c6c99bd added a non-white procedural wall and roof and perimeter panel joints; browser appearance still needs confirmation.
- **Kowloon Park historic barracks / Hong Kong Park heritage buildings / Flagstaff House:** pale ring shells remain, with authored veranda and/or shutter details in source. Visibility of details and accuracy at all angles have not been checked in WebGPU; these are follow-up inspection candidates rather than automatically assumed defects.
- **City Hall:** pale materials remain intentionally alongside concrete facade fins and glazing. Its covered walkways and low-block entrance openings must not be filled in by a generic cladding pass.
- **Ocean Park:** the prior station cladding exists in source. Gate structures and some canopies still use the shared white material; whether any large surfaces remain visually blank needs an in-browser view.

No statement is made that all 89 authored world files or all viewpoints are free of white/skinless buildings. Real runtime lighting, material nodes, occlusion, depth and level of detail still need visual checking.
