const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
let pitches, frame, arch, terrain, road, ringUtils, built;
test.before(async () => {
  ({ HAPPY_VALLEY_PITCHES: pitches, happyValleyPitchFrame: frame } = await import('../js/cities/hongkong/happy-valley-pitches-world.js'));
  arch = await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
  terrain = (await import('../js/cities/hongkong/terrain.js')).HONG_KONG_TERRAIN_META;
  road = (await import('../js/cities/hongkong/full-meta.js')).fullRoadSurfaceAt;
  ringUtils = await import('../js/cities/hongkong/landmark-site.js');
  const THREE = await import('three/webgpu');
  const world = await import('../js/cities/hongkong/happy-valley-racecourse-world.js');
  built = world.buildHappyValleyRacecourse(new THREE.Group(), { groundOffset: terrain.happyValleyPadHeight });
});
const worldPoint = (p) => ({ x: arch.HAPPY_VALLEY_SITE.x + Math.cos(arch.HAPPY_VALLEY_SITE.ry) * p.x + Math.sin(arch.HAPPY_VALLEY_SITE.ry) * p.z,
  z: arch.HAPPY_VALLEY_SITE.z - Math.sin(arch.HAPPY_VALLEY_SITE.ry) * p.x + Math.cos(arch.HAPPY_VALLEY_SITE.ry) * p.z });

test('six mapped pitches preserve the OSM way geometry and ground surface', () => {
  const sources = JSON.parse(fs.readFileSync('tools/data/hongkong/parks.json')).elements;
  assert.equal(pitches.length, 6);
  for (const pitch of pitches) {
    const source = sources.find(e => e.type === 'way' && e.id === pitch.id);
    assert.deepEqual(pitch.geometry, source.geometry);
    assert.equal(pitch.surface, source.tags.surface);
    assert.ok(built.group.getObjectByName(`HappyValleyPitch${pitch.id}`));
    const f = frame(pitch);
    assert.ok(f.length > f.width, `${pitch.id} soccer axis is not the long side`);
    assert.ok(f.width > 30);
  }
  assert.ok(built.group.getObjectByName('HappyValleyPitchMarkings'));
  assert.ok(built.group.getObjectByName('HappyValleyPitchGoals'));
});

test('selected pitches clear sampled provisional racing band and roads', () => {
  for (let i = 0; i < 1440; i++) for (const offset of [0,-6,-12,-18,-24,-30.5]) {
    const p = worldPoint(arch.happyValleyTrackPoint(i/1440,offset));
    for (const pitch of pitches) assert.ok(!ringUtils.pointInFlatRing(pitch.ring,p.x,p.z), `track intersects ${pitch.id}`);
  }
  for (const pitch of pitches) {
    const b = ringUtils.flatRingBounds(pitch.ring);
    for (let x=b.minX;x<=b.maxX;x+=2) for (let z=b.minZ;z<=b.maxZ;z+=2) {
      if (!ringUtils.pointInFlatRing(pitch.ring,x,z)) continue;
      const hit=road(x,z,1,terrain.happyValleyPadHeight);
      assert.ok(!hit || Math.abs(hit.height-terrain.happyValleyPadHeight)>=2.5, `pitch ${pitch.id} road ${hit?.way.id}`);
    }
  }
});

test('paint and goal mesh vertices stay inside one of the mapped pitch outlines', () => {
  for (const name of ['HappyValleyPitchMarkings', 'HappyValleyPitchGoals']) {
    const vertices = built.group.getObjectByName(name).geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const p = worldPoint({x: vertices.getX(i), z: vertices.getZ(i)});
      assert.ok(pitches.some(pitch => ringUtils.pointInFlatRing(pitch.ring,p.x,p.z)), `${name} vertex ${i} outside`);
    }
  }
});

test('the inferred full hockey markings span both 9 and 10 without leaving their OSM outlines', async () => {
  const {happyValleyCombinedHockeyFrame} = await import('../js/cities/hongkong/happy-valley-pitches-world.js');
  const f=happyValleyCombinedHockeyFrame();
  assert.equal(f.length,91.4); assert.equal(f.width,55);
  assert.ok(Math.abs(f.ux*f.vx+f.uz*f.vz)<.02, 'the axes are close to orthogonal');
  const hockey=pitches.filter(p => [680858151,680858152].includes(p.id));
  const mesh=built.group.getObjectByName('HappyValleyCombinedHockeyMarkings');
  assert.ok(mesh);
  const pos=mesh.geometry.getAttribute('position');
  let seen=new Set();
  for (let i=0;i<pos.count;i++) {
    const p=worldPoint({x:pos.getX(i),z:pos.getZ(i)});
    const hit=hockey.find(pitch => ringUtils.pointInFlatRing(pitch.ring,p.x,p.z));
    assert.ok(hit, `hockey vertex ${i} is outside the mapped pitches`);
    seen.add(hit.id);
  }
  assert.equal(seen.size,2);
});
