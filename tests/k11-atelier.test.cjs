const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let k11, terrain, sites;
test.before(async () => {
  k11 = await import('../js/cities/hongkong/k11-atelier-architecture.js');
  terrain = await import('../js/cities/hongkong/terrain.js');
  sites = await import('../js/cities/hongkong/landmark-site.js');
});
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
function worldRing(ring) {
  const result = [];
  for (let i = 0; i + 1 < ring.length; i += 2) { const p = k11.k11AtelierLocalToWorld(ring[i], ring[i + 1]); result.push(p.x, p.z); }
  return result;
}

test('K11 Atelier preserves the 26-vertex OSM tower and all published height/floor conventions separately', () => {
  const site = k11.K11_ATELIER_SITE;
  assert.equal(site.osmId, 668219664); assert.equal(site.source.version, 14); assert.equal(site.source.changeset, 179797122);
  assert.equal(site.localRing.length / 2, 26); assert.equal(site.ring.length, 54);
  near(site.x, 1664.0993512000164); near(site.z, -1438.3614526756262);
  near(site.w, 63.55503258862382); near(site.d, 49.47862969496305); near(site.ry, -1.4995793299728333);
  near(site.ring[0], 1690.3276155314861); near(site.ring[1], -1418.3708922805301);
  assert.equal(site.source.tags.height, '274'); assert.equal(site.source.tags['building:levels'], '66'); assert.equal(site.source.tags.layer, '1');
  assert.equal(k11.K11_ATELIER_OSM_HEIGHT, 274); assert.equal(k11.K11_ATELIER_OFFICIAL_APPROX_HEIGHT, 273);
  assert.equal(k11.K11_ATELIER_DESIGN_REPORT_HEIGHT, 280); assert.equal(k11.K11_ATELIER_WIKIPEDIA_HEIGHT, 284);
  assert.equal(k11.K11_ATELIER_HEIGHT, 272.5); assert.equal(k11.K11_ATELIER_TO_TIP_HEIGHT, 277.3); assert.equal(k11.K11_ATELIER_OCCUPIED_HEIGHT, 255.1);
  assert.equal(k11.K11_ATELIER_OSM_LEVELS, 66); assert.equal(k11.K11_ATELIER_LEVELS, 66); assert.equal(k11.K11_ATELIER_OFFICIAL_LEVELS, 62);
  assert.equal(k11.K11_ATELIER_REFUGE_LEVELS, 2); assert.equal(k11.K11_ATELIER_ME_LEVELS, 2); assert.equal(k11.K11_ATELIER_BELOW_GROUND_LEVELS, 5);
});

test('K11 Atelier stepped tiers stay inside the preceding outline and retain road portals and the Salisbury Road frontage', () => {
  assert.equal(k11.K11_ATELIER_TIERS.length, 5);
  for (const [index, tier] of k11.K11_ATELIER_TIERS.entries()) {
    assert.equal(tier.ring.length / 2, 27);
    const previous = worldRing(index ? k11.K11_ATELIER_TIERS[index - 1].ring : k11.K11_ATELIER_LOBBY_RING);
    if (!index) continue; // The first occupied tier is the exact source boundary; strict point-in-ring rejects boundary points.
    for (let i = 0; i < tier.ring.length - 2; i += 2) {
      for (let step = 0; step <= 12; step++) {
        const t = step / 12, p = k11.k11AtelierLocalToWorld(tier.ring[i] + (tier.ring[i + 2] - tier.ring[i]) * t,
          tier.ring[i + 1] + (tier.ring[i + 3] - tier.ring[i + 1]) * t);
        assert.ok(sites.pointInFlatRing(previous, p.x, p.z), `tier ${index} escapes its preceding outline`);
      }
    }
  }
  near(k11.k11AtelierFloorY(1), 9); near(k11.k11AtelierFloorY(66), 255.1);
  assert.deepEqual(k11.K11_ATELIER_GROUND_VEHICLE_PORTAL_EDGES, [0, 10, 11, 12, 13, 14, 25]);
  assert.deepEqual(k11.K11_ATELIER_CROSS_BRACED_EDGES, [4, 8, 18, 24]);
  assert.equal(k11.K11_ATELIER_ENTRANCE_EDGE, 5); near(k11.K11_ATELIER_ENTRANCE.x, 1668.1291770342075); near(k11.K11_ATELIER_ENTRANCE.z, -1470.4878946894278);
  assert.ok(k11.K11_ATELIER_ENTRANCE.nz < -0.99); assert.match(k11.K11_ATELIER_ENTRANCE.evidence, /no OSM door tag/);
  assert.equal(k11.k11AtelierRingColliders(k11.K11_ATELIER_LOBBY_RING, 0, 9, 0.85, k11.K11_ATELIER_GROUND_VEHICLE_PORTAL_EDGES).length, 19);
});

test('K11 Atelier world has authored limestone, bronze, setbacks, crown, road soffit and terrain wiring without photo assets', () => {
  const source = fs.readFileSync(path.join(root, 'js/cities/hongkong/k11-atelier-world.js'), 'utf8');
  for (const pattern of [/K11AtelierPanoramicGlassInsets/, /K11AtelierContinuousPortugueseLimestonePiers/,
    /K11AtelierBronzeWindowTrims/, /K11AtelierRefugeAndPlantVisualLouvreBands/, /K11AtelierFourSteppedRoofParapets/,
    /K11AtelierProjectingCrownLimestoneFins/, /K11AtelierSurfaceRoadPortalLintels/, /K11AtelierNineMetreLobbySoffit/,
    /K11AtelierSalisburyRoadLobbyEntrance/, /K11AtelierFlatBronzeEntranceCanopy/, /K11AtelierRecessedCornerDiagonalBraces/,
    /K11AtelierLobbyProceduralTriptychInkArt/, /K11AtelierLobbySecurityGateCabinets/, /K11AtelierLobbyTimberWall/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /TextureLoader|GLTFLoader|\.jpg|\.png|image-search/);
  assert.match(source, /for \(const collider of colliders\) \{ collider\.minY \+= groundOffset; collider\.maxY \+= groundOffset; \}/);
  const meta = terrain.HONG_KONG_TERRAIN_META;
  near(meta.k11AtelierPadHeight, terrain.rawHongKongTerrainHeight(k11.K11_ATELIER_SITE.x, k11.K11_ATELIER_SITE.z));
  near(meta.k11AtelierPadHeight, 5.444955721524252);
  near(terrain.hongKongTerrainHeight(k11.K11_ATELIER_SITE.x, k11.K11_ATELIER_SITE.z), meta.k11AtelierPadHeight);
});
