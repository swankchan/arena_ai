const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

let architecture;
let crossings;
let plan;

test.before(async () => {
  architecture = await import('../js/cities/hongkong/cross-bay-architecture.js');
  crossings = await import('../js/cities/hongkong/crossings.js');
  plan = architecture.buildCrossBayPlan();
});

test('Cross Bay Link has two outward-leaning 200 m steel arches and forty attached hangers', () => {
  const [start, end] = architecture.crossBayArchFractions();
  const length = crossings.CROSSING_ROUTES.find((route) => route.id === 'cross-bay-link:0').length;
  assert.ok(Math.abs((end - start) * length - 200) < 1e-7);
  assert.equal(plan.arches.length, 2);
  assert.equal(plan.hangers.length, 40);
  assert.equal(architecture.CROSS_BAY_ARCH.ribThickness, 2.6);
  assert.equal(architecture.CROSS_BAY_ARCH.girderDepth, 5);
  for (const panel of plan.bottomPanels) {
    assert.ok(Math.abs(panel.left.y - panel.left.lowerY - 5) < 1e-7);
    assert.ok(Math.abs(panel.right.y - panel.right.lowerY - 5) < 1e-7);
  }
  for (const arch of plan.arches) {
    assert.equal(arch.segments.length, 48);
    const crown = arch.segments[24].a;
    assert.ok(Math.abs(crown.y - crown.edge.y - 40) < 1e-7);
    assert.ok(Math.abs(crown.x - crown.edge.x - crown.edge.outwardX * 4) < 1e-7);
    assert.ok(Math.abs(crown.z - crown.edge.z - crown.edge.outwardZ * 4) < 1e-7);
    const spring = arch.segments[0].a;
    assert.ok(Math.abs(spring.y - spring.edge.y) < 1e-7);
  }
});

test('every Cross Bay hanger and lamp base meets the elevated carriageway', () => {
  for (const hanger of plan.hangers) {
    const hit = crossings.crossingSurfaceAt(hanger.b.x, hanger.b.z, 0.03);
    assert.ok(hit, 'hanger has a deck anchorage');
    assert.equal(hit.crossingId, 'cross-bay-link');
    assert.ok(Math.abs(hit.distance - hit.width * 0.5) < 0.03);
    assert.ok(Math.abs(hit.height - (hanger.b.y - 0.35)) < 0.002);
  }
  for (const lamp of plan.lamps) {
    const hit = crossings.crossingSurfaceAt(lamp.base.x, lamp.base.z, 0.03);
    assert.ok(hit, 'lamp has a deck footing');
    assert.equal(hit.crossingId, 'cross-bay-link');
    assert.ok(Math.abs(hit.distance - (hit.width * 0.5 - 0.22)) < 0.03);
    assert.ok(Math.abs(hit.height - lamp.base.y) < 0.002);
  }
});

test('paired V-piers support the approaches and the two main arch springings', () => {
  assert.equal(plan.piers.length, 12);
  assert.equal(plan.piers.filter((pier) => pier.main).length, 2);
  for (const pier of plan.piers) {
    assert.equal(pier.legs.length, 2);
    assert.notDeepEqual(pier.legs[0].b, pier.legs[1].b);
    assert.ok(pier.legs.every((leg) => leg.b.y > leg.a.y));
    assert.equal(pier.footing.sy, 2);
  }
  const world = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/crossings-world.js'), 'utf8');
  assert.match(world, /route\.crossingId === CROSS_BAY_ID \|\|/);
});

test('Cross Bay renderer installs the photographed steel, box-girder and night-light details once', () => {
  const world = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/crossings-world.js'), 'utf8');
  assert.equal(world.match(/buildCrossBayArchitecture\(root\)/g)?.length, 1);
  assert.match(world, /\.\.\.crossBay\.stats/);
  assert.match(world, /crossBayRailMaterial/);
  const renderer = fs.readFileSync(path.join(__dirname, '../js/cities/hongkong/cross-bay-world.js'), 'utf8');
  assert.match(renderer, /CrossBaySteelArch:/);
  assert.match(renderer, /CrossBayVerticalHangers/);
  assert.match(renderer, /CrossBayMainSpanBoxGirderBottom/);
  assert.match(renderer, /CrossBayVShapedPiers/);
  assert.match(renderer, /material\.emissiveNode = color\(lightColor\)\.mul\(night\.mul\(intensity\)\)/);
});
