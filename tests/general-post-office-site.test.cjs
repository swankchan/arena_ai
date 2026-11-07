const test=require('node:test');const assert=require('node:assert/strict');
test('postal headquarters records both mapped parts rather than treating the amenity polygon as a building',async()=>{
 const {GPO_SITE,GPO_WING,GPO_SOURCE,GPO_WING_SOURCE}=await import('../js/cities/hongkong/general-post-office-architecture.js');
 assert.equal(GPO_SOURCE.id,16281866);assert.equal(GPO_WING_SOURCE.id,184767036);
 assert.equal(GPO_SITE.osmId,16281866);assert.equal(GPO_WING.osmId,184767036);
 assert.ok(GPO_SITE.ringArea>2400&&GPO_SITE.ringArea<2600);assert.ok(GPO_WING.ringArea>450&&GPO_WING.ringArea<520);
});
