const assert = require('node:assert/strict');
const test = require('node:test');

test('Hang Seng headquarters uses the OSM tower outline, glazed long faces and rounded metal cores', async () => {
  globalThis.document = { createElement: () => { const canvas = {}; canvas.getContext = () => new Proxy({}, { get: (t,k) => t[k] || (() => {}), set: (t,k,v) => { t[k]=v; return true; } }); return canvas; } };
  const THREE = await import('three/webgpu');
  const { HANG_SENG_SITE, HANG_SENG_HEIGHT, HANG_SENG_GLASS_EDGES, HANG_SENG_ENTRANCE_EDGE } = await import('../js/cities/hongkong/hang-seng-architecture.js');
  const { buildHangSengHeadquarters } = await import('../js/cities/hongkong/hang-seng-world.js');
  const { harbourCityLocalToWorld } = await import('../js/cities/hongkong/harbour-city-architecture.js');
  const b = buildHangSengHeadquarters(new THREE.Group());
  assert.equal(HANG_SENG_SITE.osmId, 28825127); assert.equal(HANG_SENG_HEIGHT, 137);
  assert.equal(HANG_SENG_GLASS_EDGES.length, 4);
  assert.ok(b.stats.hangSengGlassPanels > 500 && b.stats.hangSengMetalPanels > 500);
  for (const name of ['Hang Seng green reflective glazed north and south elevations','Hang Seng anodised aluminium service cores and panel seams']) {
    const mesh = b.group.getObjectByName(name); assert.ok(mesh && mesh.material.colorNode && mesh.geometry.getAttribute('color'));
  }
  assert.ok(b.group.getObjectByName('Hang Seng Bank bilingual podium sign'));
  // At street level the entrance has at least 3.2 m of unobstructed width;
  // above the entrance the same facade is collidable.
  const ring=HANG_SENG_SITE.localRing, i=HANG_SENG_ENTRANCE_EDGE*2;
  const dx=ring[i+2]-ring[i], dz=ring[i+3]-ring[i+1], len=Math.hypot(dx,dz);
  const overlaps=(p,y)=>b.colliders.some(c => {
    if(y<c.minY || y>c.maxY)return false; const x=p.x-c.obb.cx,z=p.z-c.obb.cz;
    return Math.abs(x*c.obb.cs-z*c.obb.sn)<c.obb.hx && Math.abs(x*c.obb.sn+z*c.obb.cs)<c.obb.hz;
  });
  for(const offset of [-1.55,0,1.55]) {
    const t=.5+offset/len, p=harbourCityLocalToWorld(HANG_SENG_SITE,ring[i]+dx*t,ring[i+1]+dz*t);
    assert.equal(overlaps(p,b.stats.hangSengGround+2),false,`entrance ${offset}`);
    assert.equal(overlaps(p,b.stats.hangSengGround+5),true,`upper wall ${offset}`);
  }
});

test('Hang Seng is integrated into the simple world, colliders and landmarks', () => {
  const s = require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/cities/hongkong/simple-world.js'),'utf8');
  for (const item of ['buildHangSengHeadquarters(scene)','...hangSeng.colliders','...hangSeng.landmarks','...hangSeng.stats']) assert.ok(s.includes(item), item);
});
