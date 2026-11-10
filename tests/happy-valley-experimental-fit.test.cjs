const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');

test('experimental fit stays offline and exposes tunnel clearance risk', () => {
  const fit=JSON.parse(fs.readFileSync('tools/data/hongkong/happy-valley-experimental-fit.json','utf8'));
  assert.equal(fit.status,'experimental-not-used-in-runtime');
  assert.equal(fit.points.length,720);
  const runtime=fs.readFileSync('js/cities/hongkong/happy-valley-racecourse-architecture.js','utf8');
  assert.ok(!runtime.includes('happy-valley-experimental-fit'));
  const report=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-happy-valley-fit.mjs'],{encoding:'utf8'}));
  assert.equal(report.outside,0); assert.equal(report.pitch,0); assert.equal(report.stand,0);
  assert.equal(report.mappedStandsChecked,6); assert.deepEqual(report.standIds,{});
  assert.equal(report.sameLevel,0);
  assert.ok(report.minSampledCentrelineRadiusMetres>0 && report.minSampledCentrelineRadiusMetres<40);
  assert.ok(Number.isInteger(report.sharpestStation));
  assert.ok(report.samplesWithRoadUnder5m>0, 'the remaining tunnel risk must not be lost');
  assert.ok(report.minSampledClearanceMetres<4.5);
  assert.ok(report.roadIds['43020']<4.5);
});

test('candidate comparison remains an explicitly offline diagnostic', () => {
  const html=fs.readFileSync('tests/visual/happy-valley-candidate-track.html','utf8');
  assert.match(html,/not in the game/i);
  assert.match(html,/experimental-not-used-in-runtime/);
  assert.match(html,/roadRibbonHeightAtSegment/);
  assert.match(html,/clearance\(q\[0\],q\[2\]\)<5/);
  assert.match(html,/HappyValleyTrackSurface/);
});

test('blended smoothing improves estimated curvature but remains offline due to tunnel risk', () => {
  const os=require('node:os'),path=require('node:path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'happy-valley-fit-'));
  try {
    const output=path.join(dir,'fit.json');
    execFileSync(process.execPath,['tools/cities/hongkong/smooth-happy-valley-fit.mjs',output]);
    const saved=fs.readFileSync('tools/data/hongkong/happy-valley-experimental-smooth-fit.json','utf8');
    assert.equal(fs.readFileSync(output,'utf8'),saved,'generated fit must be reproducible');
    const fit=JSON.parse(saved);assert.equal(fit.status,'experimental-not-used-in-runtime');
    const report=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-happy-valley-fit.mjs',output],{encoding:'utf8'}));
    assert.equal(report.outside,0);assert.equal(report.pitch,0);assert.equal(report.stand,0);assert.equal(report.sameLevel,0);
    assert.ok(report.minSampledCentrelineRadiusMetres>50);
    assert.ok(report.roadIds['43020']<4.5,'road clearance still blocks safe use');
    const runtime=fs.readFileSync('js/cities/hongkong/happy-valley-racecourse-architecture.js','utf8');
    assert.ok(!runtime.includes('happy-valley-experimental-smooth-fit'));
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('continuous candidate quads are checked against mapped site, pitches, and stands', () => {
  const os=require('node:os'),path=require('node:path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'happy-valley-band-'));
  try {
    const command=['tools/cities/hongkong/check-happy-valley-band.mjs'];
    const report=JSON.parse(execFileSync(process.execPath,command,{encoding:'utf8'}));
    assert.equal(report.quads,720);assert.equal(report.pitchesChecked,16);assert.equal(report.standsChecked,6);
    assert.equal(report.outsideSquareMetres,0);assert.deepEqual(report.pitchIntersectionsSquareMetres,{});assert.deepEqual(report.standIntersectionsSquareMetres,{});
    const fit=JSON.parse(fs.readFileSync('tools/data/hongkong/happy-valley-experimental-smooth-fit.json'));
    fit.points=fit.points.map(([x,z])=>[x+10,z]);
    const shifted=path.join(dir,'shifted.json');fs.writeFileSync(shifted,JSON.stringify(fit));
    const bad=JSON.parse(execFileSync(process.execPath,[...command,shifted],{encoding:'utf8'}));
    assert.ok(bad.outsideSquareMetres>0);assert.ok(Object.keys(bad.pitchIntersectionsSquareMetres).length>0);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
