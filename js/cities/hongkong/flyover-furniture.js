// Roadside furniture for carriageways that are genuinely up in the air.
//
// The territory road layer is a centreline ribbon: carriageway only, no shoulder, kerb, parapet or railing. That is
// enough for a street at grade (the pavement and blocks cover the edge), but a flyover drawn as a bare ribbon looks
// like a strip of asphalt hanging in the air. This module appends the cross-section that a Hong Kong flyover actually
// shows, in the order you meet it walking outwards from the lane:
//
//   lane edge | shoulder (路肩) | kerb upstand | parapet (欄杆底座) | steel railing (欄杆) | drop
//
// Dimensions are a presentation convention, not a survey: HK flyovers commonly carry a ~0.6 m shoulder wall / parapet
// and a ~1.1 m railing above the deck, and the values below are within that range. They are deliberately smaller than
// the lane so the geometry never eats into the carriageway the paint and entity queries rely on.
import { FLYOVER_SHOULDER, FLYOVER_PARAPET, FLYOVER_RAILING } from './flyover-furniture-dimensions.js';

function pushQuad(positions, indices, a, b, c, d) {
  const base = positions.length / 3;
  positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  // Both windings are emitted by the caller through `twoSided`, so a single order is enough here.
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function pushTwoSidedQuad(positions, indices, a, b, c, d) {
  pushQuad(positions, indices, a, b, c, d);
  pushQuad(positions, indices, d, c, b, a);
}

// A box run along the segment between two rails: `offset` is the lateral distance from the centreline, `width` the
// thickness, `bottom`/`top` the heights above the deck surface at each end.
function pushRun(positions, indices, a, b, nx, nz, offset, width, bottom, top) {
  const inner = offset - width * 0.5, outer = offset + width * 0.5;
  const ia = [a[0] + nx * inner, a[1], a[2] + nz * inner], oa = [a[0] + nx * outer, a[1], a[2] + nz * outer];
  const ib = [b[0] + nx * inner, b[1], b[2] + nz * inner], ob = [b[0] + nx * outer, b[1], b[2] + nz * outer];
  // top face
  pushTwoSidedQuad(positions, indices,
    [ia[0], ia[1] + top, ia[2]], [ib[0], ib[1] + top, ib[2]], [ob[0], ob[1] + top, ob[2]], [oa[0], oa[1] + top, oa[2]]);
  // inner and outer faces
  pushTwoSidedQuad(positions, indices,
    [ia[0], ia[1] + bottom, ia[2]], [ib[0], ib[1] + bottom, ib[2]], [ib[0], ib[1] + top, ib[2]], [ia[0], ia[1] + top, ia[2]]);
  pushTwoSidedQuad(positions, indices,
    [oa[0], oa[1] + bottom, oa[2]], [ob[0], ob[1] + bottom, ob[2]], [ob[0], ob[1] + top, ob[2]], [oa[0], oa[1] + top, oa[2]]);
  // end caps so the run reads as a solid object from a shallow angle
  pushTwoSidedQuad(positions, indices,
    [ia[0], ia[1] + bottom, ia[2]], [oa[0], oa[1] + bottom, oa[2]], [oa[0], oa[1] + top, oa[2]], [ia[0], ia[1] + top, ia[2]]);
  pushTwoSidedQuad(positions, indices,
    [ib[0], ib[1] + bottom, ib[2]], [ob[0], ob[1] + bottom, ob[2]], [ob[0], ob[1] + top, ob[2]], [ib[0], ib[1] + top, ib[2]]);
}

/**
 * Append the shoulder, kerb, parapet and railing for one elevated deck segment.
 *
 * Returns the number of railing posts added so the caller can report a real count. `firstPost` says whether this
 * segment starts a new post run (the segment is the first of a way or follows a gap), which keeps post spacing
 * continuous along a deck instead of restarting at every simplification vertex.
 */
export function addFlyoverCrossSection(concrete, steel, { ax, az, ay, bx, bz, by, width, firstPost = false, postCarry = 0 }) {
  const dx = bx - ax, dz = bz - az;
  const length = Math.hypot(dx, dz);
  if (length < 0.5 || !(width > 0)) return { posts: 0, carry: postCarry, metres: 0 };
  const ux = dx / length, uz = dz / length;
  // Lateral unit vector, matching the ribbon winding used by addRoadQuad.
  const nx = uz, nz = -ux;
  const base = width * 0.5;
  const shoulderEdge = base + FLYOVER_SHOULDER.width;
  let posts = 0;

  for (const side of [1, -1]) {
    const sx = nx * side, sz = nz * side;
    const a = [ax, ay, az], b = [bx, by, bz];
    // Shoulder slab continuous with the deck soffit: a person reading the silhouette sees a lifted road, not a knife edge.
    pushTwoSidedQuad(concrete.positions, concrete.indices,
      [ax + sx * base, ay, az + sz * base], [bx + sx * base, by, bz + sz * base],
      [bx + sx * shoulderEdge, by, bz + sz * shoulderEdge], [ax + sx * shoulderEdge, ay, az + sz * shoulderEdge]);
    // Underside of the shoulder so the wing reads as concrete from below.
    pushTwoSidedQuad(concrete.positions, concrete.indices,
      [ax + sx * base, ay - FLYOVER_SHOULDER.thickness, az + sz * base],
      [bx + sx * base, by - FLYOVER_SHOULDER.thickness, bz + sz * base],
      [bx + sx * shoulderEdge, by - FLYOVER_SHOULDER.thickness, bz + sz * shoulderEdge],
      [ax + sx * shoulderEdge, ay - FLYOVER_SHOULDER.thickness, az + sz * shoulderEdge]);
    // Kerb upstand at the lane edge.
    pushRun(concrete.positions, concrete.indices, a, b, sx, sz, base + FLYOVER_SHOULDER.kerbWidth * 0.5,
      FLYOVER_SHOULDER.kerbWidth, 0, FLYOVER_SHOULDER.kerbHeight);
    // Parapet wall out on the shoulder, which is what actually keeps vehicles on a Hong Kong flyover.
    pushRun(concrete.positions, concrete.indices, a, b, sx, sz,
      shoulderEdge - FLYOVER_PARAPET.thickness * 0.5, FLYOVER_PARAPET.thickness, 0, FLYOVER_PARAPET.height);

    // Steel railing above the parapet: two continuous rails plus posts at a surveyed-looking spacing.
    const railOffset = shoulderEdge - FLYOVER_PARAPET.thickness * 0.5;
    pushRun(steel.positions, steel.indices, a, b, sx, sz, railOffset, FLYOVER_RAILING.thickness,
      FLYOVER_PARAPET.height, FLYOVER_PARAPET.height + FLYOVER_RAILING.railHeight);
    for (let along = firstPost ? 0 : postCarry; along <= length; along += FLYOVER_RAILING.postSpacing) {
      const t = along / length;
      const px = ax + dx * t, pz = az + dz * t, py = ay + (by - ay) * t;
      const half = FLYOVER_RAILING.postWidth * 0.5;
      const box = (off) => [px + sx * (railOffset + off), py, pz + sz * (railOffset + off)];
      const p0 = box(-half), p1 = box(half);
      pushTwoSidedQuad(steel.positions, steel.indices,
        [p0[0], p0[1] + FLYOVER_PARAPET.height, p0[2]], [p1[0], p1[1] + FLYOVER_PARAPET.height, p1[2]],
        [p1[0], p1[1] + FLYOVER_PARAPET.height + FLYOVER_RAILING.railHeight, p1[2]],
        [p0[0], p0[1] + FLYOVER_PARAPET.height + FLYOVER_RAILING.railHeight, p0[2]]);
      posts++;
    }
  }
  const carry = firstPost ? length % FLYOVER_RAILING.postSpacing : (postCarry + length) % FLYOVER_RAILING.postSpacing;
  return { posts, carry, metres: length };
}

// Exposed for tests: the full height a deck edge adds above the carriageway.
export const FLYOVER_EDGE_HEIGHT = FLYOVER_PARAPET.height + FLYOVER_RAILING.railHeight;
export const FLYOVER_SHOULDER_OUTER_M = FLYOVER_SHOULDER.width;
