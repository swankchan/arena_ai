const test = require('node:test'); const assert = require('node:assert/strict');
let T, aberdeen, terrain, collision, road;
test.before(async () => { [T, aberdeen, terrain, collision, road] = await Promise.all([
  import('three/webgpu'), import('../js/cities/hongkong/aberdeen-tunnel-world.js'),
  import('../js/cities/hongkong/terrain.js'), import('../js/cities/hongkong/colliders.js'), import('../js/cities/hongkong/full-meta.js')
]); });
test('Aberdeen Tunnel lining follows both mapped road profiles below terrain', () => {
  const sections = aberdeen.aberdeenTunnelSections(); assert.ok(sections.length > 400);
  assert.deepEqual([...new Set(sections.map(s => s.id))].sort((a,b)=>a-b), [29,5688]);
  for (const s of sections) for (const p of [s.a, s.b]) for (const side of [-1,0,1]) {
    assert.ok(terrain.hongKongTerrainHeight(p.x + side*s.nx*(s.width/2+.3),p.z + side*s.nz*(s.width/2+.3))-p.y >= 6.15 - 1e-7);
  }
});
test('road centre and 3.6 metre vehicle envelope remain clear of lining walls', () => {
  const result = aberdeen.buildAberdeenTunnel(new T.Group()), sections = aberdeen.aberdeenTunnelSections();
  assert.ok(result.group.getObjectByName('Aberdeen Tunnel continuous central light strip'));
  assert.equal(result.colliders.length, sections.length * 2);
  let samples = 0;
  for (const s of sections) for (const p0 of [s.a,s.b]) for (const lane of [-2, 0, 2]) {
    const p = { x: p0.x + lane * s.nx, y: p0.y, z: p0.z + lane * s.nz };
    samples++;
    for (const c of result.colliders) {
      if (p.y + 4.8 < c.minY || p.y + .1 > c.maxY) continue;
      assert.ok(!collision.colliderContains(c,p.x,p.z,1.8), `road ${s.id} blocked at ${p.x}, ${p.z}`);
    }
  }
  assert.ok(samples > 2400);
  const scene = require('node:fs').readFileSync('js/cities/hongkong/crossings-world.js','utf8');
  assert.match(scene, /buildAberdeenTunnel\(root\)/); assert.match(scene, /colliders\.push\(\.\.\.aberdeenTunnel\.colliders\)/);
  assert.match(scene, /aberdeenTunnel\.update\(cameraSystem\)/);
});
