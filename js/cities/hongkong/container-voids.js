// Ceilings of the podium structures that roads pass under.
//
// Several landmark bases are open at street level: the slab starts at a soffit height and the street runs underneath it.
// The underpass pass lifts mapped decks so they clear the streets beneath them, and without this table it would happily
// lift a deck straight into one of those slabs — which is exactly what happened to way 40414 at Sorrento, where a 9.7 m
// `layer=2` lift turned a 7.3 m soffit clearance into 1.56 m. The structure is authored, so the structure wins.
//
// Each entry is the flat ring of the podium plus the height of its underside. Heights are the same presentation
// conventions the architecture modules draw with; they are not surveyed soffit elevations.
import { pointInFlatRing } from './landmark-site.js';
import { SORRENTO_SITE, SORRENTO_GROUND_SOFFIT } from './sorrento-architecture.js';
import { HONG_KONG_TERRAIN_META } from './terrain.js';

export const CONTAINER_VOIDS = Object.freeze([
  Object.freeze({
    id: 'sorrento-podium',
    ring: SORRENTO_SITE.ring,
    // The pad is the datum the podium is drawn from, so the soffit is pad + ground floor height.
    ceiling: HONG_KONG_TERRAIN_META.sorrentoPadHeight + SORRENTO_GROUND_SOFFIT,
    // The slab the deck must not enter, measured down from the soffit.
    slabDepth: 0.42,
    // Headroom a carriageway running under the slab still has to keep. A deck lift is a better answer than a clash
    // only while it leaves this much room; past that the structure owns the alignment.
    requiredClearance: 4.7
  })
]);

// Structures whose underside spans this point. `ceiling` is the drawn soffit height, `clearanceCeiling` the height a
// deck's top surface may reach before it touches the slab.
export function containerVoidsAt(x, z) {
  const found = [];
  for (const voidSpan of CONTAINER_VOIDS) {
    if (!pointInFlatRing(voidSpan.ring, x, z)) continue;
    // The deck top may not rise above what still leaves `requiredClearance` under the slab. Derived from the slab's own
    // numbers in this order so the headroom is exact rather than the remainder of a subtraction chain.
    found.push({ ...voidSpan,
      clearanceCeiling: voidSpan.ceiling - voidSpan.slabDepth - voidSpan.requiredClearance,
      headroom: voidSpan.ceiling - voidSpan.slabDepth - voidSpan.requiredClearance });
  }
  return found;
}

// Every container whose slab spans the carriageway of a road station, including the station's shoulders.
export function containerVoidCeilingsUnder(x, z) {
  return containerVoidsAt(x, z).map((voidSpan) => ({
    id: voidSpan.id,
    ceiling: voidSpan.clearanceCeiling
  }));
}
