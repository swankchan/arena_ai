// Renderer-independent counterpart of the three long deep-water swells in harbour-water.js.
// [wavelength m, amplitude m, direction x/z, phase]. The mean displacement remains zero.
export const HONG_KONG_HARBOUR_SWELLS = Object.freeze([
  Object.freeze([240, 0.13, 0.94, 0.342, 0.4]),
  Object.freeze([165, 0.20, 0.81, -0.586, 2.1]),
  Object.freeze([128, 0.09, 0.98, 0.199, 4.3])
]);

export function sampleHongKongHarbourSwell(x, z, elapsed) {
  let height = 0, slopeX = 0, slopeZ = 0;
  for (const [wavelength, amplitude, dx, dz, phaseOffset] of HONG_KONG_HARBOUR_SWELLS) {
    const k = Math.PI * 2 / wavelength;
    const omega = Math.sqrt(9.81 * k);
    const phase = (x * dx + z * dz) * k - elapsed * omega + phaseOffset;
    height += Math.sin(phase) * amplitude;
    const derivative = Math.cos(phase) * amplitude * k;
    slopeX += derivative * dx;
    slopeZ += derivative * dz;
  }
  return { height, slopeX, slopeZ };
}
