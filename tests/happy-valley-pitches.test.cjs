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

test('eight mapped pitches preserve the OSM way geometry and ground surface', () => {
  const sources = JSON.parse(fs.readFileSync('tools/data/hongkong/parks.json')).elements;
  assert.equal(pitches.length, 8);
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
    for (const pitch of pitches.filter(q=>![563648704,563648705].includes(q.id))) assert.ok(!ringUtils.pointInFlatRing(pitch.ring,p.x,p.z), `track intersects ${pitch.id}`);
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
  for (const name of ['HappyValleyPitchMarkings', 'HappyValleyPitchCornerArcs', 'HappyValleyPitchCentreMarks', 'HappyValleyPitchGoals', 'HappyValleyPitchGoalNets']) {
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


test('goal netting spans the soccer frame and remains clear of same-level roads', () => {
  const net=built.group.getObjectByName('HappyValleyPitchGoalNets');
  assert.ok(net?.isLineSegments);
  const vertices=net.geometry.getAttribute('position');
  assert.ok(vertices.count > 700);
  let minY=Infinity,maxY=-Infinity;
  for(let i=0;i<vertices.count;i++) {
    const p=worldPoint({x:vertices.getX(i),z:vertices.getZ(i)});
    minY=Math.min(minY,vertices.getY(i));maxY=Math.max(maxY,vertices.getY(i));
    const hit=road(p.x,p.z,.1,terrain.happyValleyPadHeight);
    assert.ok(!hit || Math.abs(hit.height-terrain.happyValleyPadHeight)>=2.5,`net vertex ${i} on road ${hit?.way.id}`);
  }
  assert.ok(Math.abs(minY-.17)<.001); assert.ok(maxY>2.5 && maxY<2.7);
});

test('mapped pitches 2 and 3 clear the rendered provisional track and running rails', async () => {
  const THREE=await import('three/webgpu');
  built.group.updateMatrixWorld(true);
  const obstacles=['HappyValleyTrackSurface','HappyValleyRunningRails','HappyValleyRunningRailPosts']
    .map(name=>built.group.getObjectByName(name));
  assert.ok(obstacles.every(Boolean));
  const ray=new THREE.Raycaster();let checked=0;
  for(const pitch of pitches.filter(p=>[563648704,563648705].includes(p.id))) {
    const b=ringUtils.flatRingBounds(pitch.ring);
    for(let x=b.minX;x<=b.maxX;x+=2) for(let z=b.minZ;z<=b.maxZ;z+=2) {
      if(!ringUtils.pointInFlatRing(pitch.ring,x,z))continue;
      ray.set(new THREE.Vector3(x,terrain.happyValleyPadHeight+5,z),new THREE.Vector3(0,-1,0));
      assert.equal(ray.intersectObjects(obstacles).length,0,`obstruction over pitch ${pitch.id} at ${x},${z}`);
      checked++;
    }
  }
  assert.ok(checked>1000);
});


test('inferred football layouts include four corner arcs and a centre mark per pitch', () => {
  const arcs=built.group.getObjectByName('HappyValleyPitchCornerArcs');
  const marks=built.group.getObjectByName('HappyValleyPitchCentreMarks');
  assert.ok(arcs && marks);
  // beam() merges one box per small arc segment, eight segments per arc.
  assert.equal(arcs.geometry.getAttribute('position').count,pitches.length*4*8*24);
  assert.equal(marks.geometry.getAttribute('position').count,pitches.length*24);
  const p=arcs.geometry.getAttribute('position');
  for(let pitch=0;pitch<pitches.length;pitch++) {
    const f=frame(pitches[pitch]);
    for(let corner=0;corner<4;corner++) {
      const end=corner<2?.055:.945, side=corner%2?.945:.055;
      const cx=f.a.x+(f.b.x-f.a.x)*end+(f.c.x-f.a.x)*side;
      const cz=f.a.z+(f.b.z-f.a.z)*end+(f.c.z-f.a.z)*side;
      for(let v=(pitch*4+corner)*8*24;v<(pitch*4+corner+1)*8*24;v++)
        assert.ok(Math.abs(Math.hypot(p.getX(v)-cx,p.getZ(v)-cz)-1)<.09);
    }
  }
});
