const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
let THREE,parts,build,full,terrain;
test.before(async()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 THREE=await import('three/webgpu');parts=(await import('../js/cities/hongkong/ifc-mall-architecture.js')).IFC_MALL_PARTS;
 build=(await import('../js/cities/hongkong/ifc-mall-world.js')).buildIfcMall;full=await import('../js/cities/hongkong/full-meta.js');terrain=await import('../js/cities/hongkong/terrain.js');
});
test('IFC mall retains separate mapped retail, station and elevated bridge parts',()=>{
 assert.deepEqual(parts.map(p=>[p.site.osmId,p.site.source.version,p.kind]),[[664250329,12,'retail'],[664250327,8,'bridge'],[664250326,13,'bridge'],[664250328,9,'station']]);
 for(const p of parts)assert.ok(p.site.ringArea>1800);
});
test('IFC mall renders facade, garden and an eastern Apple store bridge without flattening roads',()=>{
 const m=build(new THREE.Group());assert.ok(m.stats.ifcMallGlassPanels>3000);assert.ok(m.stats.ifcMallRoofTrees>10);
 for(const name of ['IFC Mall 664250327 elevated soffit','IFC Mall 664250326 elevated soffit','IFC Mall Apple store bridge sign','IFC Mall linear reflecting pool','IFC Mall covered garden walk'])assert.ok(m.group.getObjectByName(name),name);
 const s=parts[0].site,road=full.fullRoadSurfaceAt(-203,-465,0,0);assert.ok(road);
 assert.equal(m.groundHeightAt(-203,-465,road.height,road.height),road.height);
 // High-level surfaces must not pull a road-level actor up; a rooftop actor stays on the flat roof.
 const x=s.x,z=s.z,base=terrain.hongKongTerrainHeight(x,z);
 assert.equal(m.groundHeightAt(x,z,base,base),base);
 assert.equal(m.groundHeightAt(x,z,base,m.stats.ifcMallRoofHeight),m.stats.ifcMallRoofHeight);
});
test('IFC facade collision samples leave roads and bridge underpasses clear to 4.8 metres',()=>{
 const m=build(new THREE.Group()), bounds={minX:Math.min(...parts.map(p=>p.site.bounds.minX)),maxX:Math.max(...parts.map(p=>p.site.bounds.maxX)),minZ:Math.min(...parts.map(p=>p.site.bounds.minZ)),maxZ:Math.max(...parts.map(p=>p.site.bounds.maxZ))};let samples=0;
 for(let x=bounds.minX;x<bounds.maxX;x+=2)for(let z=bounds.minZ;z<bounds.maxZ;z+=2){
  const road=full.fullRoadSurfaceAt(x,z,0);if(!road)continue;samples++;
  for(const c of m.colliders){if(!c.obb||road.height+4.8<c.minY||road.height+.1>c.maxY)continue;const dx=x-c.obb.cx,dz=z-c.obb.cz;assert.ok(!(Math.abs(dx*c.obb.cs-dz*c.obb.sn)<c.obb.hx&&Math.abs(dx*c.obb.sn+dz*c.obb.cs)<c.obb.hz),`road ${road.way.id} at ${x},${z}`);}
 }
 assert.ok(samples>5000);
});
test('IFC mall integrated into world and ground-height selection',()=>{const s=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');for(const text of ['buildIfcMall(scene)','...ifcMall.colliders','...ifcMall.landmarks','...ifcMall.stats','ifcMall.landmarks.length','ifcMall.groundHeightAt(x, z, finalGround, referenceY)'])assert.ok(s.includes(text),text)});
test('IFC roof has a pedestrian-only elevated arrival away from walls',()=>{
 const m=build(new THREE.Group()), p=m.roofTeleport;assert.equal(p.mode,'person');assert.equal(p.y,m.stats.ifcMallRoofHeight);
 assert.equal(m.groundHeightAt(p.x,p.z,0,p.y),p.y);
 for(const c of m.colliders){if(!c.obb||p.y+1.9<c.minY||p.y>=c.maxY)continue;const x=p.x-c.obb.cx,z=p.z-c.obb.cz;assert.ok(!(Math.abs(x*c.obb.cs-z*c.obb.sn)<c.obb.hx+.48&&Math.abs(x*c.obb.sn+z*c.obb.cs)<c.obb.hz+.48),'arrival overlaps mall collider');}
 const index=fs.readFileSync('js/cities/hongkong/index.js','utf8');assert.ok(index.includes('world.ifcMall.roofTeleport'));
});
