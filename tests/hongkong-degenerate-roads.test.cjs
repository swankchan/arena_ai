const assert = require('node:assert/strict');
const test = require('node:test');

test('collapsed road segments do not create invisible drivable discs or spawn points', async () => {
  const {HK_FULL_ROADS} = await import('../js/cities/hongkong/building-priority-roads.js');
  const {fullRoadSurfaceAt,nearestFullRoad,nearestFullRoads,spawnOnFullRoad} = await import('../js/cities/hongkong/full-meta.js');
  const {HONG_KONG_TERRAIN_META} = await import('../js/cities/hongkong/terrain.js');
  // This generated Happy Valley record consists of one exactly zero-length
  // segment. addRoadQuad renders no geometry for it.
  const collapsed=HK_FULL_ROADS.roads[41113][5];
  assert.deepEqual(collapsed,[2432.3,919.3,2432.3,919.3]);
  assert.equal(fullRoadSurfaceAt(2432.3,919.3,0,HONG_KONG_TERRAIN_META.happyValleyPadHeight),null);
  assert.equal(nearestFullRoad(2432.3,919.3,{radius:.01}),null);
  assert.equal(spawnOnFullRoad(2432.3,919.3,{minWidth:0,radius:.01}),null);
  assert.ok(nearestFullRoads(2432.3,919.3,45).every(hit=>hit.length>=.05));
  // A real nearby service-road endpoint continues to be recognised.
  const road=nearestFullRoad(2395.4,931.2,{radius:.01});
  assert.ok(road && road.length>=.05);
  assert.ok(fullRoadSurfaceAt(2395.4,931.2,0,HONG_KONG_TERRAIN_META.happyValleyPadHeight));
});
