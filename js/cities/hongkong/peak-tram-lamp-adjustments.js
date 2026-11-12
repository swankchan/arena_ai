// Local scene corrections for two street lights that overlap the already-built
// Kennedy bridge/approach. Coordinates are game-space metres, not a survey.
// Keep both fixtures and their headings: move the poles away from the railway.
//
// Two things are checked here, and it matters which is which:
//  * the CSV row must still be the row these corrections were written against, and
//  * the corrected pole must still stand clear of the built track.
// The generated clearance override must NOT be part of the guard. It is re-derived every time the road surface or the
// deck levels change, so pinning its bytes made any regeneration throw during city start-up — which is exactly what
// happened when the flyover work re-derived it and moved this pole to 1.77 m from the track.
const ADJUSTMENTS = new Map([
 [373,{source:[-317.914,830.283,-1.6349,1],relocated:true,x:-311.5,z:831.75}],
 [4642,{source:[-178.353,625.795,2.756,1],x:-182.60,z:621.55}],
 [4643,{source:[-190.426,647.291,-2.9415,1],x:-194.67,z:643.05}]
]);
// The pole must stay further than this from the track centreline. It matches the 2.4 m assertion in
// tests/peak-tram-street-light-clearance.test.cjs.
export const PEAK_TRAM_LAMP_TRACK_CLEARANCE = 2.4;

export function peakTramAdjustedStreetLight(index, lamp, override) {
  const correction = ADJUSTMENTS.get(index);
  if (!correction) return null;
  if (lamp.length < 4 || correction.source.some((value, axis) => Math.abs(lamp[axis] - value) > 1e-6)) {
    throw new Error(`Peak Tram street light ${index} no longer matches the surveyed source row; review placement`);
  }
  // This lamp is only here because the generator relocates it off the track. If that relocation ever disappears the
  // hand correction would be placing a fixture the clearance pass had already judged unsafe, so fail closed.
  // The displacement and height themselves are re-derived with the road surface and are deliberately not pinned.
  if (correction.relocated && !override) {
    throw new Error(`Peak Tram street light ${index} lost its generated relocation; review placement`);
  }
  return { x: correction.x, z: correction.z };
}
