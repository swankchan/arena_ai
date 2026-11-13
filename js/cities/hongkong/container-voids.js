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
import { THE_ARCH_SITE, THE_ARCH_GROUND_SOFFIT, THE_ARCH_VEHICLE_CLEARANCE } from './the-arch-architecture.js';
import { WATERFRONT_PODIUM_SITE, WATERFRONT_GROUND_SOFFIT } from './the-waterfront-architecture.js';
import { ICC_SITE, ICC_DRAGON_TAIL, iccPlanAt, iccLocalToWorld } from './icc-architecture.js';
import { HONG_KONG_TERRAIN_META } from './terrain.js';

// See the comment on the ICC void below.
const DRAGON_TAIL_EDGE_MARGIN_M = 12;

function dragonTailFootprint() {
  // The footprint is grown by a ramp margin: a deck that climbs past the canopy edge on its way to a higher street still
  // has to clear the canopy where the climb happens, and the climb starts before the deck is under it.
  const local = iccPlanAt(ICC_DRAGON_TAIL.y0, ICC_DRAGON_TAIL.projection + DRAGON_TAIL_EDGE_MARGIN_M);
  const ring = [];
  for (let i = 0; i + 1 < local.length; i += 2) {
    const world = iccLocalToWorld(local[i], local[i + 1]);
    ring.push(world.x, world.z);
  }
  return Object.freeze(ring);
}

export const CONTAINER_VOIDS = Object.freeze([
  Object.freeze({
    id: 'the-arch-podium',
    ring: THE_ARCH_SITE.ring,
    ceiling: HONG_KONG_TERRAIN_META.theArchPadHeight + THE_ARCH_GROUND_SOFFIT,
    slabDepth: 0.42,
    requiredClearance: THE_ARCH_VEHICLE_CLEARANCE
  }),
  Object.freeze({
    id: 'the-waterfront-podium',
    ring: WATERFRONT_PODIUM_SITE.ring,
    ceiling: HONG_KONG_TERRAIN_META.theWaterfrontPadHeight + WATERFRONT_GROUND_SOFFIT,
    slabDepth: 0.42,
    requiredClearance: 4.7
  }),
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
  }),
  // The Dragon Tail canopy over ICC's two elevated arrival ways. Lifting 51157 by 4.8 m to clear a street beneath it
  // cut its clearance under the canopy from 6.2 m to 1.76 m, so the canopy is a ceiling in exactly the same sense the
  // Sorrento podium is. The footprint is the canopy's own plan, not the tower ring: the arrival ways run past the tower
  // and only the canopy reaches out over them.
  Object.freeze({
    id: 'icc-dragon-tail',
    ring: dragonTailFootprint(),
    // `ICC_DRAGON_TAIL.y0` is measured from the tower's own datum, not from the terrain, so the soffit is the pad plus
    // that offset. The 0.35 m is the canopy plate the ICC test measures to as well.
    ceiling: HONG_KONG_TERRAIN_META.iccPadHeight + ICC_DRAGON_TAIL.y0 - 0.35,
    slabDepth: 0,
    requiredClearance: 4.5
  })
]);

// Structures whose underside spans this point. `ceiling` is the drawn soffit height, `headroomCeiling` the height a
// deck's top surface may reach before it touches the slab.
export function containerVoidsAt(x, z) {
  const found = [];
  for (const voidSpan of CONTAINER_VOIDS) {
    if (!pointInFlatRing(voidSpan.ring, x, z)) continue;
    // The highest a deck top may reach. `ceiling` is the drawn underside of the structure; the deck also has to leave the
    // carriageway beneath it `requiredClearance`, which is what makes this a headroom rather than a soffit height.
    found.push({ ...voidSpan,
      soffit: voidSpan.ceiling,
      headroomCeiling: voidSpan.ceiling - voidSpan.slabDepth - voidSpan.requiredClearance });
  }
  return found;
}

// Every container whose slab spans the carriageway of a road station, including the station's shoulders.
export function containerVoidCeilingsUnder(x, z) {
  return containerVoidsAt(x, z).map((voidSpan) => ({
    id: voidSpan.id,
    ceiling: voidSpan.headroomCeiling
  }));
}
