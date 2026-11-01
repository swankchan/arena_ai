// Conservative longitudinal smoothing for ordinary surface roads. Peaks and endpoints are never lowered: valleys and
// approaches rise towards the neighbouring chord, removing visible steps without flattening the territory DTM.
// The 5 m source DTM is approximate, so corrections are deliberately bounded rather than treated as engineering levels.
export const MAX_ORDINARY_ROAD_LIFT = 6;
export function smoothConstrainedProfileHeights(nodes, iterations = 18) {
  const result = nodes.map((node) => node.height);
  for (let pass = 0; pass < iterations; pass++) {
    const previous = result.slice();
    for (let i = 1; i < result.length - 1; i++) {
      const before = nodes[i - 1], current = nodes[i], after = nodes[i + 1];
      const left = Math.hypot(current.x - before.x, current.z - before.z);
      const right = Math.hypot(after.x - current.x, after.z - current.z);
      if (left + right < 1e-6) continue;
      const incomingX = current.x - before.x, incomingZ = current.z - before.z;
      const outgoingX = after.x - current.x, outgoingZ = after.z - current.z;
      const chord = Math.hypot(after.x - before.x, after.z - before.z);
      // A switchback is not a longitudinal valley: its outer point can be far above the shortcut chord even though
      // the engineered road descends around the loop. Leave tight reversals on the surveyed terrain profile.
      if (incomingX * outgoingX + incomingZ * outgoingZ < 0 || chord < (left + right) * 0.65) continue;
      const target = (previous[i - 1] * right + previous[i + 1] * left) / (left + right);
      // Bound each accumulated correction in source-DTM space. A single consistent limit avoids the kinks produced
      // by clipping adjacent vertices to different local envelopes while still preventing large artificial embankments.
      const boundedTarget = Math.min(target, nodes[i].height + MAX_ORDINARY_ROAD_LIFT);
      if (boundedTarget > previous[i]) result[i] = previous[i] + (boundedTarget - previous[i]) * 0.5;
    }
  }
  return result;
}
