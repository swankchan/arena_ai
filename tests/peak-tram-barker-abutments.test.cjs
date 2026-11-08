const {test}=require('node:test'),assert=require('node:assert/strict');
test('Barker crossing abutments avoid road envelopes and support the provisional deck ends',async()=>{
 const T=await import('three/webgpu'),{buildBarkerAbutments}=await import('../js/cities/hongkong/peak-tram-barker-abutments.js'),{fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js'),{hongKongTerrainHeight:g}=await import('../js/cities/hongkong/terrain.js'),{barkerStationTrackPoint:p}=await import('../js/cities/hongkong/peak-tram-barker-station-track-site.js');
 const a=buildBarkerAbutments(new T.Group());assert.equal(a.stats.peakTramBarkerAbutments,2);assert.ok(a.group.getObjectByName('Barker crossing masonry abutments'));
 for(const [i,c] of a.colliders.entries()){
  assert.ok(Math.abs(c.maxY-(p(i?1116:1097).y-.65))<1e-7);
  for(let x=c.minX-.4;x<=c.maxX+.4;x+=.15)for(let z=c.minZ-.4;z<=c.maxZ+.4;z+=.15){const r=road(x,z,0,g(x,z));if(r)assert.ok(r.height+4.5<c.minY||r.height>c.maxY,`road ${r.way.id} overlaps abutment`);}
 }
 const source=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(source,/buildBarkerAbutments\(scene\)/);assert.match(source,/\.\.\.peakTramBarkerAbutments\.colliders/);
});
