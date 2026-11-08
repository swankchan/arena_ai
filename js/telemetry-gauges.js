// Both dials sweep clockwise from lower-left to lower-right over 260 degrees.
export const SPEED_GAUGE_MAX_KPH = 300;
export const ALTITUDE_GAUGE_MAX_METRES = 1000;
export function gaugeNeedleDegrees(value, maximum) {
  const ratio = Number.isFinite(value) && maximum > 0 ? Math.max(0, Math.min(1, value / maximum)) : 0;
  return -130 + ratio * 260;
}
