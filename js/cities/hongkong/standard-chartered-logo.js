// Standard Chartered's interlocking ribbon device, expressed as four vector subpaths rather than two handwritten S
// strokes. The two large ribbons and the two detached caps preserve the characteristic S / C negative space.
// Reference geometry: the Standard Chartered 2021 device, cross-checked against the bank's crown and entrance signs.
export const SCB_DEVICE_PATHS = Object.freeze([
  Object.freeze({
    tone: 'green',
    tx: -250.106, ty: -475.13,
    d: 'M275.523,511.3a3.915,3.915,0,0,1,1.135,5.419h0a3.915,3.915,0,0,1-5.419,1.135l-13.455-8.726s-4.475-2.937-4.823-3.148a6.735,6.735,0,0,1-2.331-2.608s-1.185-2.035.118-5.326a9.253,9.253,0,0,1,1.208-2.113Z'
  }),
  Object.freeze({
    tone: 'blue',
    tx: -254.001, ty: -401.89,
    d: 'M259.466,408.055c-.694.449-1.732,1.126-1.968,1.307a6.588,6.588,0,0,0-2.36,5.367,6.675,6.675,0,0,0,2.805,5.434c.341.243,6.391,4.174,6.391,4.174l12.321,8.012,2.813,1.822a8.6,8.6,0,0,0,1.789-5.56c-.025-.293.023-2.032-2.36-4.14-.225-.2-2.452-1.638-2.452-1.638l-6.039-3.905-4.77-3.124-1.856-1.209s6.022-3.922,7.013-4.577a8.711,8.711,0,0,0,2.329-1.751,3.947,3.947,0,0,0,.762-3.186,3.61,3.61,0,0,0-.888-1.805,3.8,3.8,0,0,0-2.671-1.364,3.692,3.692,0,0,0-1.961.347l-1.672,1.046-3.148,2.067Z'
  }),
  Object.freeze({
    tone: 'green',
    tx: -304.735, ty: -432.941,
    d: 'M320.281,445.647s3.454,2.256,3.791,2.467,1.091.717,1.438.918a4.011,4.011,0,0,0,2.252.477,3.924,3.924,0,0,0,2.69-1.5,3.891,3.891,0,0,0-.071-4.829,3.867,3.867,0,0,0-5.239-.71c-.2.135-2.769,1.8-2.769,1.8Z'
  }),
  Object.freeze({
    tone: 'blue',
    tx: -250.001, ty: -527.388,
    d: 'M260.978,566.9s-3.454-2.256-3.791-2.467-1.091-.717-1.438-.918a4.011,4.011,0,0,0-2.252-.477,3.925,3.925,0,0,0-2.69,1.5,3.89,3.89,0,0,0,.071,4.829,3.867,3.867,0,0,0,5.239.71c.2-.134,2.769-1.8,2.769-1.8Z'
  })
]);

const DEVICE_VIEW = Object.freeze({ x: -0.5, y: 5.5, w: 28, h: 40.5 });

export function drawStandardCharteredDevice(ctx, ox, oy, width, height, {
  blue = '#1577bd', green = '#62a744'
} = {}) {
  const scale = Math.min(width / DEVICE_VIEW.w, height / DEVICE_VIEW.h);
  ctx.save();
  ctx.translate(ox + (width - DEVICE_VIEW.w * scale) * 0.5, oy + (height - DEVICE_VIEW.h * scale) * 0.5);
  ctx.scale(scale, scale);
  ctx.translate(-DEVICE_VIEW.x, -DEVICE_VIEW.y);
  for (const part of SCB_DEVICE_PATHS) {
    ctx.save();
    ctx.translate(part.tx, part.ty);
    ctx.fillStyle = part.tone === 'blue' ? blue : green;
    ctx.fill(new Path2D(part.d));
    ctx.restore();
  }
  ctx.restore();
}
