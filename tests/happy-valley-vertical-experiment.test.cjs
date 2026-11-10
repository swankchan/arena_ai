const test=require('node:test');const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const report=script=>JSON.parse(execFileSync(process.execPath,[`tools/cities/hongkong/${script}.mjs`],{encoding:'utf8'}));
test('offline raised candidate improves sampled road clearance but is not a runtime fit',()=>{
 const r=report('check-happy-valley-vertical-fit');
 assert.equal(r.samples,12240);assert.equal(r.results.flat.low,22);assert.equal(r.results.raised.low,0);
 assert.equal(r.results.raised.same,0);assert.ok(r.results.raised.min>5 && r.results.raised.min<6);
 assert.ok(r.maxCentrelineGradePercent>3 && r.maxCentrelineGradePercent<4);
});
test('hypothetical wide shoulders at the raised segment collide with existing mapped features',()=>{
 const r=report('check-happy-valley-embankment-experiment');
 assert.equal(r.status,'experimental-not-used-in-runtime');assert.equal(r.quads,112);
 assert.ok(r.outsideSquareMetres>0);
 assert.ok(r.pitchIntersectionsSquareMetres['184720664']>50);
 assert.ok(r.standIntersectionsSquareMetres['494027781']>500);
});
