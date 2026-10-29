// Local tangent-plane frame for a city: WGS84 lon/lat -> simulation world metres (x = grid east, z = grid south).
// Every city supplies its origin and the bearing of its street grid; the maths is the same one the Manhattan
// geodata build uses (tools/geo-base.mjs), just without the hardcoded constants.
const A = 6378137.0;
const E2 = 6.69437999014e-3;
const RAD = Math.PI / 180;

export function makeFrame({ lat0, lon0, bearingDeg = 0, origin = null }) {
  const phi = lat0 * RAD;
  const sin = Math.sin(phi);
  const nrad = A / Math.sqrt(1 - E2 * sin * sin);
  const mrad = (A * (1 - E2)) / Math.pow(1 - E2 * sin * sin, 1.5);
  const KX = RAD * nrad * Math.cos(phi);
  const KY = RAD * mrad;

  const theta = bearingDeg * RAD;
  const cs = Math.cos(theta);
  const sn = Math.sin(theta);

  // East/north metres, then rotate into the grid: u = grid east, v = grid south (north is -z).
  const gridUV = (lon, lat) => {
    const e = (lon - lon0) * KX;
    const n = (lat - lat0) * KY;
    return [e * cs - n * sn, -(e * sn + n * cs)];
  };
  const shift = origin ? gridUV(origin.lon, origin.lat) : [0, 0];
  const toWorld = (lon, lat) => {
    const [u, v] = gridUV(lon, lat);
    return [u - shift[0], v - shift[1]];
  };

  return {
    lat0,
    lon0,
    bearingDeg,
    theta,
    KX,
    KY,
    toWorld,
    gridUV,
    origin: origin || { lon: lon0, lat: lat0 }
  };
}
