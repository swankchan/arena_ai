import { GEO } from '../../hk-geodata.js';

// Auxiliary paint is evaluated in the existing asphalt shader, not emitted as millions of coincident triangles.
// Its coordinates come from each OSM way's centreline, width, lane count and direction. It is not surveyed paint.
export const DERIVED_LINE_WIDTH = 0.12;
export const DERIVED_EDGE_INSET = 0.24;
export const DERIVED_DASH = Object.freeze({ mark: 3, gap: 3 });
const SURVEY_GUARD_MARGIN = 8;

function surveyedPaintBounds() {
  const aids = GEO.trafficAids;
  if (!aids) return null;
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const key of ['marks', 'crossings', 'yellowBoxes', 'yellowBoxPolygons']) {
    for (const entry of aids[key] || []) {
      for (const part of entry.parts || []) {
        for (let i = 0; i + 1 < part.length; i += 2) {
          minX = Math.min(minX, part[i]); maxX = Math.max(maxX, part[i]);
          minZ = Math.min(minZ, part[i + 1]); maxZ = Math.max(maxZ, part[i + 1]);
        }
      }
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    minX: minX - SURVEY_GUARD_MARGIN, maxX: maxX + SURVEY_GUARD_MARGIN,
    minZ: minZ - SURVEY_GUARD_MARGIN, maxZ: maxZ + SURVEY_GUARD_MARGIN
  };
}

export const SURVEYED_PAINT_GUARD = surveyedPaintBounds();
export const DERIVED_ROAD_MARKINGS = Object.freeze({
  lineWidth: DERIVED_LINE_WIDTH,
  edgeInset: DERIVED_EDGE_INSET,
  dashMark: DERIVED_DASH.mark,
  dashGap: DERIVED_DASH.gap,
  guard: SURVEYED_PAINT_GUARD
});

// Negative means a two-way carriageway; the absolute value is always the recorded total lane count. This packs the
// direction distinction into the existing vec4 without adding another per-vertex attribute to the territory roads.
export function signedRoadLaneCount(road) {
  const lanes = Math.max(1, Math.round(road[3] || 1));
  return road[2] === 0 ? -lanes : lanes;
}
