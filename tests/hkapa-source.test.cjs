const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../tools/data/hongkong/hkapa-building-osm.json')));
const xy = ({ lon, lat }) => [(lon - 114.1596) * 103056.81753522092, -(lat - 22.2819) * 110734.09626824585];
const ring = source.geometry.map(xy);
const pointSegment = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)) : 0;
  return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dz);
};
const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const segmentDistance = (a,b,c,d) => {
  const x = cross(a,b,c), y = cross(a,b,d), z = cross(c,d,a), w = cross(c,d,b);
  if (((x > 0 && y < 0) || (x < 0 && y > 0)) && ((z > 0 && w < 0) || (z < 0 && w > 0))) return 0;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
};
function inside(p) {
  let yes = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) yes = !yes;
  }
  return yes;
}
test('HKAPA source is the actual mapped building, not the campus or adjacent Arts Centre', () => {
  assert.equal(source.id, 117088641); assert.equal(source.version, 14);
  assert.equal(source.tags.building, 'university'); assert.equal(source.geometry.length, 68);
  assert.deepEqual(source.geometry[0], source.geometry.at(-1));
  assert.ok(source.geometry.some(p => p.id === 6853998910)); // mapped main entrance
  assert.ok(source.geometry.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)));
  assert.equal(inside(xy({ lat: 22.2802, lon: 114.1708 })), false); // neighbouring Arts Centre
});

test('existing inferred road ribbons do not intrude on the mapped outline', async () => {
  const { HK_FULL_ROADS } = await import('../js/cities/hongkong/building-priority-roads.js');
  const bounds = {minX: Math.min(...ring.map(p=>p[0])),maxX: Math.max(...ring.map(p=>p[0])),minZ: Math.min(...ring.map(p=>p[1])),maxZ: Math.max(...ring.map(p=>p[1]))};
  const conflicts = [];
  HK_FULL_ROADS.roads.forEach((road, id) => {
    const f = road[5], margin = road[1]/2 + .35;
    for (let i=2;i<f.length;i+=2) {
      const a=[f[i-2],f[i-1]], b=[f[i],f[i+1]];
      if (Math.max(a[0],b[0])<bounds.minX-margin || Math.min(a[0],b[0])>bounds.maxX+margin || Math.max(a[1],b[1])<bounds.minZ-margin || Math.min(a[1],b[1])>bounds.maxZ+margin) continue;
      let d = inside(a) || inside(b) ? 0 : Infinity;
      for (let j=1;j<ring.length;j++) d = Math.min(d,segmentDistance(a,b,ring[j-1],ring[j]));
      if (d < margin) { conflicts.push({id, name:road[0], distance:d, margin}); break; }
    }
  });
  assert.deepEqual(conflicts, []);
});
