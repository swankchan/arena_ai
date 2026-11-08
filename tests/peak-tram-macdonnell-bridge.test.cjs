const {test}=require('node:test'),assert=require('node:assert/strict');
test('the masonry vault stays under the existing road and clears an estimated car envelope',async()=>{
 const THREE=await import('three/webgpu');const {MACDONNELL_BRIDGE_POINTS:p,MACDONNELL_ARCH_HALF_WIDTH:w,macDonnellArchSection:section,macDonnellArchHeight:arch,buildMacDonnellBridge:build}=await import('../js/cities/hongkong/peak-tram-macdonnell-bridge.js');
 const {fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js');const {hongKongTerrainHeight:ground}=await import('../js/cities/hongkong/terrain.js');assert.ok(p.length>=4);
 for(let i=1;i<p.length;i++){let a=p[i-1],b=p[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l;
  for(let t=0;t<=1;t+=.1){let v={x:a.x+dx*t,z:a.z+dz*t,y:a.y+(b.y-a.y)*t},vsec=section(v,ux,uz);
   for(let off=-1.8;off<=1.8;off+=.15){const x=v.x+vsec.nx*off,z=v.z+vsec.nz*off,r=road(x,z,0,ground(x,z));assert.ok(r);assert.ok(arch(vsec,off)+.28<r.height,'stone intrudes into roadway');if(Math.abs(off)<1.36)assert.ok(arch(vsec,off)-v.y>4.1,'estimated tram envelope hits vault');}
  }
 }
 const result=build(new THREE.Group());assert.ok(result.stats.peakTramMacDonnellArchSegments>=3);for(const n of ['MacDonnell masonry barrel vault','MacDonnell stone bridge jambs','MacDonnell arch voussoirs'])assert.ok(result.group.getObjectByName(n));assert.equal(w,1.85);
});
test('stone bridge replaces the old flat soffit only under the vault',()=>{const fs=require('node:fs'),world=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8'),approach=fs.readFileSync('js/cities/hongkong/peak-tram-kennedy-approach.js','utf8');assert.match(world,/buildMacDonnellBridge\(scene\)/);assert.match(approach,/isMacDonnellBridgeSegment\(a,b\)\)continue/);assert.doesNotMatch(approach,/MacDonnell Road underpass soffit/);});
