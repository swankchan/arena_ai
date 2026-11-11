const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

let THREE, venue, terrain, built, inside, source, stands, clearance, build;
test.before(async () => {
  THREE = await import('three/webgpu');
  venue = (await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js')).HAPPY_VALLEY_SITE;
  terrain = (await import('../js/cities/hongkong/terrain.js')).HONG_KONG_TERRAIN_META;
  built = (await import('../js/cities/hongkong/happy-valley-racecourse-world.js'))
    .buildHappyValleyRacecourse(new THREE.Group(), { groundOffset: terrain.happyValleyPadHeight });
  built.group.updateMatrixWorld(true);
  inside = (await import('../js/cities/hongkong/landmark-site.js')).pointInFlatRing;
  source = await import('../js/cities/hongkong/happy-valley-remaining-stands-site.js');
  stands = await import('../js/cities/hongkong/happy-valley-remaining-stands-world.js');
  clearance = await import('../js/cities/hongkong/happy-valley-stand-road-clearance.js');
});

test('the three rebuilt stands reproduce their OSM outlines and level counts', () => {
  const mapped = new Map(JSON.parse(fs.readFileSync('tools/data/hongkong/landmarks.json'))
    .elements.filter((e) => e.type === 'way').map((e) => [e.id, e]));
  for (const [site, id, levels] of [
    [source.HAPPY_VALLEY_GRANDSTAND, 1356276114, '9'],
    [source.HAPPY_VALLEY_MEMBERS_I, 1356276115, '9'],
    [source.HAPPY_VALLEY_MEMBERS_II, 1356276118, '9'],
  ]) {
    assert.equal(site.source.id, id);
    assert.deepEqual(site.source.geometry, mapped.get(id).geometry, `way ${id} geometry`);
    assert.equal(site.levels, Number(levels));
    // Every stand must sit inside the mapped venue, unlike the east-side placeholders.
    assert.ok(inside(venue.ring, site.x, site.z), `${site.key} centre inside the venue`);
  }
});

test('all three stands are present in the world with their authored parts', () => {
  for (const [group, prefix] of [
    ['HappyValleyMappedGrandstand', 'HappyValleyMappedGrandstand'],
    ['HappyValleyMappedMembersStandI', 'HappyValleyMappedMembersStandI'],
    ['HappyValleyMappedMembersStandII', 'HappyValleyMappedMembersStandII'],
  ]) {
    const object = built.group.getObjectByName(group);
    assert.ok(object, group);
    for (const part of ['Glazing', 'Terraces', 'Fascias', 'Mullions', 'Rails', 'Roof']) {
      assert.ok(object.getObjectByName(prefix + part), `${group} ${part}`);
    }
    assert.ok(object.getObjectByName(prefix + 'Glazing').material.emissiveNode, `${group} night glazing`);
    const box = new THREE.Box3().setFromObject(object);
    assert.ok(box.max.y - box.min.y > 20, `${group} has real height`);
  }
  // The deleted east-side placeholders must not come back.
  for (const name of ['HappyValleyGrandstand', 'HappyValleyClubhouse', 'HappyValleyClubTower'])
    assert.equal(built.group.getObjectByName(name), undefined, `${name} placeholder returned`);
});

test('no stand vertex sits on a same-level carriageway', () => {
  const point = new THREE.Vector3();
  let sampled = 0;
  for (const group of ['HappyValleyMappedGrandstand', 'HappyValleyMappedMembersStandI', 'HappyValleyMappedMembersStandII']) {
    built.group.getObjectByName(group).traverse((mesh) => {
      if (!mesh.isMesh) return;
      const position = mesh.geometry.attributes.position;
      if (!position) return;
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        sampled++;
        assert.ok(!clearance.standOverSameLevelRoad(point.x, point.z),
          `${mesh.name} vertex ${i} stands on a carriageway`);
      }
    });
  }
  assert.ok(sampled > 20000, `sampled ${sampled} vertices`);
  // 黃泥涌道 crosses the Grandstand outline, so some triangles must have been clipped.
  assert.ok(built.stats.happyValleyStandsClippedTriangles > 0);
});

test('no rebuilt stand collider blocks a carriageway, and the street stays open', () => {
  const ringOf = (site) => site.ring;
  for (const site of [source.HAPPY_VALLEY_GRANDSTAND, source.HAPPY_VALLEY_MEMBERS_I, source.HAPPY_VALLEY_MEMBERS_II]) {
    const stand = stands;
    const own = built.colliders.filter((c) => c.x !== undefined
      && Math.hypot(c.x - site.x, c.z - site.z) < site.height * 2
      && inside(ringOf(site), c.x, c.z));
    for (const collider of own) {
      for (let x = collider.minX; x <= collider.maxX; x += 0.5) {
        for (let z = collider.minZ; z <= collider.maxZ; z += 0.5) {
          const dx = x - collider.x, dz = z - collider.z;
          if (Math.abs(dx * collider.obb.cs - dz * collider.obb.sn) > collider.obb.hx) continue;
          if (Math.abs(dx * collider.obb.sn + dz * collider.obb.cs) > collider.obb.hz) continue;
          assert.ok(!clearance.standOverSameLevelRoad(x, z), `collider on a carriageway near ${site.key}`);
        }
      }
    }
  }
});

test('the shared guard drops colliders that land on 黃泥涌道', () => {
  // A synthetic collider laid straight across the street must be removed, not kept.
  // A point on 黃泥涌道 way 20960, away from the tunnel openings cut into the same corridor.
  const onRoad = clearance.standOverSameLevelRoad(2214.5, 1178.5);
  assert.equal(onRoad, true, 'the sample point is on 黃泥涌道');
  const box = { x: 2214.5, z: 1178.5, minX: 2209, maxX: 2220, minZ: 1173, maxZ: 1184, obb: { cs: 1, sn: 0, hx: 6, hz: 6 } };
  const result = clearance.dropCollidersOverRoads([box]);
  assert.equal(result.removed, 1);
  assert.equal(result.colliders.length, 0);
  // A collider well away from any carriageway survives.
  const clear = { x: -1000, z: -1000, minX: -1010, maxX: -990, minZ: -1010, maxZ: -990, obb: { cs: 1, sn: 0, hx: 10, hz: 10 } };
  assert.equal(clearance.dropCollidersOverRoads([clear]).colliders.length, 1);
});
