const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const read = (path) => readFileSync(join(__dirname, '..', path), 'utf8');

let districtsModule;

test.before(async () => {
  districtsModule = await import('../js/cities/hongkong/districts.js');
});

test('districts module defines exactly 19 districts with complete metadata', () => {
  const { DISTRICTS, DISTRICT_MAP } = districtsModule;
  assert.equal(DISTRICTS.length, 19, 'Must have 19 districts');

  const seenIds = new Set();
  for (const d of DISTRICTS) {
    assert.ok(d.id, 'District must have an id');
    assert.ok(!seenIds.has(d.id), `Duplicate district id: ${d.id}`);
    seenIds.add(d.id);

    assert.ok(typeof d.name === 'string' && d.name.length > 0, `District ${d.id} must have Chinese name`);
    assert.ok(typeof d.englishName === 'string' && d.englishName.length > 0, `District ${d.id} must have English name`);
    assert.ok(['hong-kong-island', 'kowloon', 'new-territories', 'waters'].includes(d.region), `District ${d.id} has valid region`);
    assert.ok(typeof d.landmarkCount === 'number' && d.landmarkCount >= 0, `District ${d.id} must have landmarkCount`);

    assert.equal(DISTRICT_MAP[d.id], d, 'DISTRICT_MAP maps district id to object');
  }

  // Check expected districts exist
  const expectedDistricts = [
    'central-western', 'wan-chai', 'eastern', 'southern',
    'yau-tsim', 'mong-kok', 'sham-shui-po', 'kowloon-city', 'wong-tai-sin', 'kwun-tong',
    'tsuen-wan', 'kwai-tsing', 'tuen-mun', 'yuen-long', 'north', 'tai-po', 'sha-tin', 'sai-kung',
    'islands'
  ];
  for (const exp of expectedDistricts) {
    assert.ok(seenIds.has(exp), `Expected district ${exp} to be present`);
  }
});

test('DISTRICT_REGIONS defines valid regional preset groupings', () => {
  const { DISTRICTS, DISTRICT_REGIONS } = districtsModule;
  const allIds = new Set(DISTRICTS.map((d) => d.id));

  assert.ok(DISTRICT_REGIONS['hong-kong-island'], 'hong-kong-island preset exists');
  assert.equal(DISTRICT_REGIONS['hong-kong-island'].length, 4, 'Hong Kong Island has 4 districts');

  assert.ok(DISTRICT_REGIONS['kowloon'], 'kowloon preset exists');
  assert.equal(DISTRICT_REGIONS['kowloon'].length, 6, 'Kowloon has 6 districts (including Yau Tsim & Mong Kok)');

  assert.ok(DISTRICT_REGIONS['new-territories'], 'new-territories preset exists');
  assert.equal(DISTRICT_REGIONS['new-territories'].length, 9, 'New Territories and Islands have 9 districts');

  assert.ok(DISTRICT_REGIONS['core'], 'core preset exists');
  assert.ok(DISTRICT_REGIONS['core'].includes('central-western'));
  assert.ok(DISTRICT_REGIONS['core'].includes('wan-chai'));
  assert.ok(DISTRICT_REGIONS['core'].includes('yau-tsim'));

  for (const [preset, ids] of Object.entries(DISTRICT_REGIONS)) {
    for (const id of ids) {
      assert.ok(allIds.has(id), `Preset ${preset} contains unknown district id: ${id}`);
    }
  }
});

test('LANDMARK_DISTRICT_MAP maps all landmark keys to registered district IDs', () => {
  const { DISTRICT_MAP, LANDMARK_DISTRICT_MAP } = districtsModule;
  assert.ok(Object.keys(LANDMARK_DISTRICT_MAP).length >= 80, 'Must map at least 80 landmarks');

  for (const [key, districtId] of Object.entries(LANDMARK_DISTRICT_MAP)) {
    if (Array.isArray(districtId)) {
      for (const id of districtId) {
        assert.ok(id in DISTRICT_MAP, `Landmark "${key}" array item mapped to unknown district "${id}"`);
      }
    } else {
      assert.ok(districtId in DISTRICT_MAP, `Landmark "${key}" mapped to unknown district "${districtId}"`);
    }
  }

  // Key landmarks checks
  assert.equal(LANDMARK_DISTRICT_MAP['twoIfc'], 'central-western');
  assert.equal(LANDMARK_DISTRICT_MAP['bankOfChina'], 'central-western');
  assert.equal(LANDMARK_DISTRICT_MAP['centralPlaza'], 'wan-chai');
  assert.equal(LANDMARK_DISTRICT_MAP['conventionPlazaOffice'], 'wan-chai');
  assert.equal(LANDMARK_DISTRICT_MAP['conventionPlazaApartments'], 'wan-chai');
  assert.equal(LANDMARK_DISTRICT_MAP['hkcec'], 'wan-chai');
  assert.equal(LANDMARK_DISTRICT_MAP['icc'], 'yau-tsim');
  assert.equal(LANDMARK_DISTRICT_MAP['mongKokStadium'], 'mong-kok');
  assert.equal(LANDMARK_DISTRICT_MAP['timesSquare'], 'wan-chai');
  assert.equal(LANDMARK_DISTRICT_MAP['ninaTower'], 'tsuen-wan');
  assert.equal(LANDMARK_DISTRICT_MAP['shaTin'], 'sha-tin');
  assert.equal(LANDMARK_DISTRICT_MAP['airside'], 'kowloon-city');
  assert.equal(LANDMARK_DISTRICT_MAP['airport'], 'islands');
});

test('shouldBuildLandmark filters correctly according to selectedDistricts', () => {
  const { shouldBuildLandmark } = districtsModule;

  // When no filter is supplied, build all
  assert.equal(shouldBuildLandmark('twoIfc', null), true);
  assert.equal(shouldBuildLandmark('icc', undefined), true);
  assert.equal(shouldBuildLandmark('unmappedBuilding', ['central-western']), true);

  // When Wan Chai is not selected, Wan Chai landmarks return false
  const onlyCentral = ['central-western'];
  assert.equal(shouldBuildLandmark('twoIfc', onlyCentral), true);
  assert.equal(shouldBuildLandmark('bankOfChina', onlyCentral), true);
  assert.equal(shouldBuildLandmark('centralPlaza', onlyCentral), false);
  assert.equal(shouldBuildLandmark('hkcec', onlyCentral), false);
  assert.equal(shouldBuildLandmark('conventionPlazaOffice', onlyCentral), false);
  assert.equal(shouldBuildLandmark('icc', onlyCentral), false);

  // When Kowloon preset is selected
  const kowloonDistricts = ['yau-tsim', 'mong-kok', 'sham-shui-po', 'kowloon-city', 'wong-tai-sin', 'kwun-tong'];
  assert.equal(shouldBuildLandmark('twoIfc', kowloonDistricts), false);
  assert.equal(shouldBuildLandmark('icc', kowloonDistricts), true);
  assert.equal(shouldBuildLandmark('k11Atelier', kowloonDistricts), true);
  assert.equal(shouldBuildLandmark('mongKokStadium', kowloonDistricts), true);
  assert.equal(shouldBuildLandmark('centralPlaza', kowloonDistricts), false);
});

test('simple-world.js integrates shouldBuildLandmark and passes options through builders', () => {
  const code = read('js/cities/hongkong/simple-world.js');

  assert.match(code, /import\s*\{\s*shouldBuildLandmark\s*\}\s*from\s*'(\.\/districts\.js|districts\.js)';/);
  assert.match(code, /function\*\s+buildSimpleHongKongWorldSteps\s*\(\s*scene\s*,\s*options\s*=\s*\{\}\s*\)/);
  assert.match(code, /const\s+selectedDistricts\s*=\s*options\.selectedDistricts/);
  assert.match(code, /const\s+maybe\s*=\s*\(key,\s*(?:builderFn|fn),\s*defaultStub\s*=\s*\{\}\)\s*=>/);
  assert.match(code, /buildSimpleHongKongWorld\(scene,\s*options\s*=\s*\{\}\)/);
  assert.match(code, /buildSimpleHongKongWorldAsync\(scene,\s*options\s*=\s*\{\}\)/);
});

test('UI elements for district selection exist in index.html', () => {
  const html = read('index.html');

  assert.match(html, /id="district-picker"/, 'Start screen district picker element exists');
  assert.match(html, /id="district-grid"/, 'District grid container exists');
  assert.match(html, /id="district-summary"/, 'District count summary exists');
  assert.match(html, /data-preset="hong-kong-island"/, 'Island preset button exists');
  assert.match(html, /data-preset="kowloon"/, 'Kowloon preset button exists');
  assert.match(html, /data-preset="new-territories"/, 'New Territories preset button exists');
  assert.match(html, /data-preset="core"/, 'Core CBD preset button exists');

  assert.match(html, /id="btn-districts"/, 'HUD district toolbar button exists');
  assert.match(html, /id="districts-popover"/, 'HUD district popover element exists');
  assert.match(html, /id="hud-district-list"/, 'HUD district checklist container exists');
  assert.match(html, /id="hud-apply-districts"/, 'HUD apply button exists');
});

test('CSS styles define responsive district components', () => {
  const css = read('css/style.css');

  assert.match(css, /\.district-picker\b/, 'district-picker class defined');
  assert.match(css, /\.district-grid\b/, 'district-grid class defined');
  assert.match(css, /\.district-card\b/, 'district-card class defined');
  assert.match(css, /\.districts-popover\b/, 'districts-popover class defined');
  assert.match(css, /\.hud-district-item\b/, 'hud-district-item class defined');
});

test('DISTRICT_BOUNDS and getDistrictsCombinedBounds compute spatial bounding boxes', () => {
  const { DISTRICTS, DISTRICT_BOUNDS, getDistrictsCombinedBounds } = districtsModule;

  for (const d of DISTRICTS) {
    const b = DISTRICT_BOUNDS[d.id];
    assert.ok(b, `District ${d.id} must have bounding box`);
    assert.ok(b.minX < b.maxX, `minX < maxX for ${d.id}`);
    assert.ok(b.minZ < b.maxZ, `minZ < maxZ for ${d.id}`);
  }

  // All or null returns null (full territory)
  assert.equal(getDistrictsCombinedBounds(null), null);
  assert.equal(getDistrictsCombinedBounds([]), null);
  assert.equal(getDistrictsCombinedBounds(['all']), null);
  assert.equal(getDistrictsCombinedBounds(DISTRICTS.map((d) => d.id)), null);

  // Single district has constrained bounds
  const cw = getDistrictsCombinedBounds(['central-western']);
  assert.ok(cw);
  assert.ok(cw.minX < 0 && cw.maxX > 0);
  assert.ok(cw.minZ < 0 && cw.maxZ > 0);
});

test('simple-world.js references valid imported builder functions for Hong Kong Club and Science Museum', () => {
  const code = read('js/cities/hongkong/simple-world.js');

  assert.doesNotMatch(code, /\bbuildHongKongClubBuilding\b/, 'buildHongKongClubBuilding should not be referenced');
  assert.match(code, /\bbuildHongKongClub\(scene\)/, 'buildHongKongClub(scene) should be called');
  assert.doesNotMatch(code, /\bbuildHongKongScienceMuseum\b/, 'buildHongKongScienceMuseum should not be referenced');
  assert.match(code, /\bbuildScienceMuseum\(scene,/, 'buildScienceMuseum(scene, ...) should be called');
});

test('full-world.js filters road processing when selectedDistricts is specified', () => {
  const code = read('js/cities/hongkong/full-world.js');

  assert.match(code, /import\s*\{\s*getDistrictsCombinedBounds\s*\}\s*from\s*'(\.\/districts\.js|districts\.js)';/);
  assert.match(code, /function\*\s+createRoadChunksSteps\s*\(\s*root\s*,\s*includeCore\s*,\s*selectedDistricts\s*\)/);
  assert.match(code, /const\s+targetBounds\s*=\s*getDistrictsCombinedBounds\s*\(\s*selectedDistricts\s*\)/);
});
