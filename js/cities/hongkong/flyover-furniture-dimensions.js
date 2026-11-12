// Dimensions for the flyover cross-section. Kept in its own module so the runtime can read them without importing the
// geometry builder, and so tests can pin them without pulling in three.
//
// These are a presentation convention, not a surveyed set of kerb and parapet dimensions.
export const FLYOVER_SHOULDER = Object.freeze({
  width: 0.85,      // 路肩: walkable/refuge strip outside the lane edge
  thickness: 0.36,  // underside of the overhang
  kerbWidth: 0.18,
  kerbHeight: 0.14
});

export const FLYOVER_PARAPET = Object.freeze({
  height: 0.72,     // concrete parapet above the deck, matching the verified-bridge parapet
  thickness: 0.32
});

export const FLYOVER_RAILING = Object.freeze({
  height: 1.08,     // full railing panel, of which the top rail is what actually catches the light
  railHeight: 0.11, // depth of the continuous top rail
  thickness: 0.07,
  postSpacing: 2.4,
  postWidth: 0.09
});
