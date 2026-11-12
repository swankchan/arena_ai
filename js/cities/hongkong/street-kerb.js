// Street-level kerbs, drawn only where OSM says the street has a walkable edge.
//
// The territory road ribbon is a strip of asphalt on the DTM: on a hillside there is nothing between the carriageway and
// the drop, and along a built-up street there is nothing between the carriageway and the block. Both problems have the
// same missing object — a kerb upstand along the edge the street actually has a footway on.
//
// The sides come from the OSM `sidewalk` / `sidewalk:left` / `sidewalk:right` / `footway:*` tags (see
// tools/cities/hongkong/build-kerb-sides.mjs). They are NOT inferred from geometry: 12,472 of the 18,596 checked-in
// ways say nothing about their footways, and those are left exactly as they are. That is the honest answer, and it is
// why 3,518 road records get a kerb and 73,552 do not.
//
// Dimensions are a presentation convention, not a surveyed kerb profile: 0.15 m face, 0.13 m upstand above the asphalt,
// with a 0.22 m top so the edge reads from a distance.
import { HK_ROAD_KERB_SIDES } from '../../hk-road-kerb-sides.js';

export const KERB_LEFT = 1, KERB_RIGHT = 2;
export const STREET_KERB = Object.freeze({
  // How far the kerb face sits outside the painted carriageway edge. The ribbon width is already the driveable width.
  offsetM: 0.06,
  widthM: 0.22,
  heightM: 0.13,
  // Below the asphalt, so a kerb on a steep grade does not show a gap under its downhill end.
  skirtM: 0.18
});

const kerbSidesByRecord = new Map(HK_ROAD_KERB_SIDES.kerbed || []);

export function kerbSidesForRoadRecord(recordIndex) {
  return kerbSidesByRecord.get(recordIndex) ?? 0;
}

export function streetKerbStats() {
  const counts = HK_ROAD_KERB_SIDES.counts || {};
  return {
    streetKerbRecords: kerbSidesByRecord.size,
    streetKerbRoadRecords: counts.roadRecords ?? 0,
    streetKerbLeftOnly: counts.left ?? 0,
    streetKerbRightOnly: counts.right ?? 0,
    streetKerbBoth: counts.both ?? 0,
    streetKerbUntaggedWays: (counts.none ?? 0),
    streetKerbUnmatchedWays: (HK_ROAD_KERB_SIDES.source?.unmatchedWays ?? []).length
  };
}

// Appends one segment of kerb upstand to `sides`, where 1..2 bits select which edges. `ay`/`by` are the asphalt heights
// at each end; the kerb follows them so a kerb on a grade leans with the road instead of floating.
export function addStreetKerb(positions, indices, { ax, az, ay, bx, bz, by, width, sides }) {
  if (!sides) return 0;
  const dx = bx - ax, dz = bz - az;
  const length = Math.hypot(dx, dz);
  if (length < 0.05) return 0;
  const ux = dx / length, uz = dz / length;
  // Lateral unit vector, matching the winding addRoadQuad uses for the carriageway.
  const nx = uz, nz = -ux;
  let drawn = 0;
  for (const [bit, side] of [[KERB_LEFT, 1], [KERB_RIGHT, -1]]) {
    if (!(sides & bit)) continue;
    const sx = nx * side, sz = nz * side;
    const face = width * 0.5 + STREET_KERB.offsetM;
    const inner = face, outer = face + STREET_KERB.widthM;
    const top = STREET_KERB.heightM, bottom = -STREET_KERB.skirtM;
    const a = (offset) => [ax + sx * offset, az + sz * offset];
    const b = (offset) => [bx + sx * offset, bz + sz * offset];
    const aIn = a(inner), aOut = a(outer), bIn = b(inner), bOut = b(outer);
    const base = positions.length / 3;
    // Order matters: the quads below share vertices, so they are pushed as one explicit vertex block.
    positions.push(
      aIn[0], ay + top, aIn[1], bIn[0], by + top, bIn[1], bOut[0], by + top, bOut[1], aOut[0], ay + top, aOut[1],
      aIn[0], ay + bottom, aIn[1], bIn[0], by + bottom, bIn[1],
      aOut[0], ay + bottom, aOut[1], bOut[0], by + bottom, bOut[1]
    );
    // Top face.
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    // Inner face, toward the carriageway.
    indices.push(base + 4, base + 1, base, base + 4, base + 5, base + 1);
    // Outer face, toward the footway or the drop.
    indices.push(base + 7, base + 3, base + 2, base + 7, base + 6, base + 3);
    drawn++;
  }
  return drawn;
}
