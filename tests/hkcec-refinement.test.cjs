const assert = require('node:assert/strict');
const test = require('node:test');
let THREE, world, h;

test.before(async () => {
  h = await import('../js/cities/hongkong/hkcec-architecture.js');
  globalThis.document = { createElement: () => {
    const canvas = { width: 0, height: 0 };
    const context = new Proxy({ getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
      get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; },
    });
    canvas.getContext = () => context; return canvas;
  } };
  THREE = await import('three/webgpu');
  const { buildHkcec } = await import('../js/cities/hongkong/hkcec-world.js');
  world = buildHkcec(new THREE.Group(), { groundOffset: 5 });
});

test('HK-B0088 New Wing refinement keeps the curved glass wall and bird-roof structure finite', () => {
  assert.equal(world.stats.hkcecNewWingRefined, true);
  assert.equal(world.stats.hkcecNewWingInventoryId, 'HK-B0088');
  assert.equal(world.stats.hkcecNewWingRoofShells, 3);
  assert.ok(world.stats.hkcecNewWingFineFacadeFins >= 400);
  assert.equal(world.stats.hkcecNewWingRoofRibs, 180);
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  assert.ok(names.some((name) => /NewWingHK-B0088DenseCurvedGlassWallFins/.test(name)));
  assert.ok(names.some((name) => /NewWingHK-B0088TransverseWhiteBirdRoofRibs/.test(name)));
  let nonFinite = 0;
  world.group.traverse((object) => {
    if (!object.isMesh) return;
    const position = object.geometry?.getAttribute('position');
    if (position) for (const value of position.array) if (!Number.isFinite(value)) nonFinite++;
  });
  assert.equal(nonFinite, 0);
  assert.equal(h.HKCEC_NEW_WING_SITE.osmId, 26490011);
});

test('HK-B0089 Old Wing refinement adds separate pale balcony ribbons without changing clearance geometry', () => {
  assert.equal(world.stats.hkcecOldWingRefined, true);
  assert.equal(world.stats.hkcecOldWingInventoryId, 'HK-B0089');
  assert.equal(world.stats.hkcecOldWingBalconySlabs, 93);
  assert.equal(world.stats.hkcecOldWingBalconyRailSegments, 93);
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  assert.ok(names.some((name) => /OldWingHK-B0089PaleCurvedBalconySlabs/.test(name)));
  assert.ok(names.some((name) => /OldWingHK-B0089RoundedBalconyEndCaps/.test(name)));
  assert.equal(h.HKCEC_OLD_WING_SITE.osmId, 26490161);
  assert.equal(world.stats.hkcecGroundFacadePanels, 366);
  assert.equal(world.stats.hkcecGroundFacadeColliders, 84);
  assert.equal(world.stats.hkcecColliders, 452);
});

test('HK-B0043 Convention Plaza Apartments reads as projecting silver ribbon courses from the harbour', () => {
  const stats = world.stats;
  assert.ok(stats.hkcecApartmentGlassPanels > 900, `glass panels ${stats.hkcecApartmentGlassPanels}`);
  assert.ok(stats.hkcecApartmentCourseBands >= stats.hkcecApartmentVisualCourses * 4);
  assert.ok(stats.hkcecApartmentMullions >= stats.hkcecApartmentGlassPanels / 4);
  assert.equal(stats.hkcecApartmentCornerPilasters, 2 * (h.HKCEC_APARTMENT_SITE.localRing.length / 2 - 1));
  const names = [];
  world.group.traverse((object) => { if (object.name) names.push(object.name); });
  for (const name of ['ApartmentsProjectingSilverCourseBands', 'ApartmentsSilverVerticalMullions',
    'ApartmentsFullHeightChamferCornerPilasters', 'ApartmentsBlueGreenGlass35Courses']) {
    assert.ok(names.some((n) => n.includes(name)), name);
  }
  // The courses must recede into the building: glass sits behind the projecting bands, and the bands stop at the roof.
  const apartment = world.group.getObjectByName('ConventionPlazaApartments');
  assert.ok(apartment);
  const box = new THREE.Box3().setFromObject(apartment);
  assert.ok(Number.isFinite(box.min.x) && Number.isFinite(box.max.y));
  assert.ok(box.max.y <= h.HKCEC_APARTMENT_HEIGHT + 6, `apartment crown ${box.max.y}`);
});

test('New Wing tall central arch faces the harbour rather than running across it', () => {
  const mesh=world.group.getObjectByName('NewWingCurvedHarbourGlassWall');
  const p=mesh.geometry.getAttribute('position'), b=h.HKCEC_NEW_WING_SITE.localBounds;
  let tallHarbour=0, nearCentreTop=-Infinity;
  for(let i=0;i<p.count;i++) {
    // Local +X points roughly toward the harbour; local Z spans the facade.
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(x>b.maxX-25 && y>40) tallHarbour++;
    if(x>b.maxX-25 && Math.abs(z)<12) nearCentreTop=Math.max(nearCentreTop,y);
  }
  assert.ok(tallHarbour>15,`tall harbour glass vertices ${tallHarbour}`);
  assert.ok(nearCentreTop>48,`harbour centre glass height ${nearCentreTop}`);
});
