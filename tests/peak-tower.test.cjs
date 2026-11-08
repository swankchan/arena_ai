const test=require('node:test'),assert=require('node:assert/strict');let M,A,T,terrain,road,collision,util,route;
test.before(async()=>{
 global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,A,T,terrain,road,collision,util,route]=await Promise.all([import('../js/cities/hongkong/peak-tower-world.js'),import('../js/cities/hongkong/peak-tower-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js'),import('../js/cities/hongkong/harbour-city-architecture.js'),import('../js/cities/hongkong/peak-tram-route.js')]);
});
test('mapped footprint, operator altitude and curved roof',()=>{
 const b=M.buildPeakTower(new T.Group()),s=A.PEAK_TOWER_SITE;assert.equal(s.osmId,143716612);assert.equal(s.source.version,11);assert.equal(A.PEAK_TOWER_BASE,396);assert.equal(A.PEAK_TOWER_DECK,428);
 assert.ok(A.peakTowerShellBottom(0)<A.peakTowerShellBottom(20));assert.ok(A.peakTowerShellBottom(20)<A.peakTowerShellBottom(34));
 for(const n of ['Peak Tower curved metal wok shell','Peak Tower curved ribbed soffit','Peak Tower shell panel joints','Peak Tower blue green glazed elevations','Peak Tower curtain wall mullions','Peak Tower hillside foundations','Peak Tower Sky Terrace 428 deck','Peak Tower Sky Terrace railings','Peak Tower entrance sign'])assert.ok(b.group.getObjectByName(n),n);
 b.group.updateMatrixWorld(true);for(let i=0;i<s.localRing.length;i+=2){const p=new T.Vector3(s.localRing[i],0,s.localRing[i+1]).applyMatrix4(b.group.matrixWorld);assert.ok(Math.abs(p.x-s.ring[i])<1e-7);assert.ok(Math.abs(p.z-s.ring[i+1])<1e-7);}
});
test('nearby roads retain vehicle clearance at sampled points',()=>{
 const b=M.buildPeakTower(new T.Group()),s=A.PEAK_TOWER_SITE;let count=0,hits=0;
 for(let x=Math.floor(s.bounds.minX)-25;x<=s.bounds.maxX+25;x++)for(let z=Math.floor(s.bounds.minZ)-25;z<=s.bounds.maxZ+25;z++){
  const r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;
  for(const c of b.colliders)if(r.height+4.8>=c.minY&&r.height+.1<=c.maxY&&collision.colliderContains(c,x,z))hits++;
 }assert.ok(count>1000);assert.equal(hits,0,`${hits} colliding road samples`);
});
test('the overhanging shell clears nearby sampled roads',()=>{
 const s=A.PEAK_TOWER_SITE;let samples=0,min=Infinity;
 for(let x=-34;x<=34;x+=1)for(let z=-12.9;z<=12.9;z+=1){
  const p=util.harbourCityLocalToWorld(s,x,z),r=road.fullRoadSurfaceAt(p.x,p.z,0,terrain.hongKongTerrainHeight(p.x,p.z));
  if(!r)continue;samples++;min=Math.min(min,A.PEAK_TOWER_BASE+A.peakTowerShellBottom(x)-r.height);
 }
 assert.ok(samples>10);assert.ok(min>4.8,`shell clearance ${min}m`);
});
test('mapped upper stop and approach are not blocked by the inset core colliders',()=>{
 const b=M.buildPeakTower(new T.Group());let r=route.peakTramRoute('A');let start=r.findIndex(n=>n.id===2525250104);
 for(let i=start;i<r.length;i++){const [x,z]=r[i].world;for(const c of b.colliders)assert.equal(collision.colliderContains(c,x,z),false,`${r[i].id} blocked`);}
});
test('active scene includes model, statistics, colliders and landmark',()=>{
 const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');
 for(const re of [/buildPeakTower\(scene\)/,/\.\.\.peakTower\.stats/,/\.\.\.peakTower\.colliders/,/\.\.\.peakTower\.landmarks/,/peakTower\.landmarks\.length/])assert.match(src,re);
});
test('upper terminus is aligned to mapped nodes, has two platforms and a gauge-sized track',async()=>{
 const S=await import('../js/cities/hongkong/peak-upper-station-site.js'),s=S.PEAK_UPPER_STATION,b=M.buildPeakTower(new T.Group()),site=A.PEAK_TOWER_SITE;
 const stop=util.harbourCityWorldToLocal(site,...route.PEAK_TRAM_NODES.peak.world),end=util.harbourCityWorldToLocal(site,...route.PEAK_TRAM_NODES.upperEnd.world);
 assert.ok(stop.x>s.x0 && stop.x<s.x1);assert.ok(Math.abs(stop.z-s.trackZ)<.1);assert.ok(Math.abs(end.x-s.x0)<1e-8);assert.equal(s.gauge,1.524);
 for(const name of ['Peak Tram upper terminus platforms','Peak Tram upper terminus track bed','Peak Tram upper terminus rails','Peak Tram upper terminus sleepers','Peak Tram upper terminus transparent barriers','Peak Tram upper terminus platform edge strips'])assert.ok(b.group.getObjectByName(name),name);
 for(let x=s.x0+.5;x<s.x1-.5;x+=.5){
  for(const z of [s.z0+.8,s.z1-.8]){const p=util.harbourCityLocalToWorld(site,x,z);assert.equal(b.groundHeightAt(p.x,p.z,380,s.platformY),s.platformY);}
  const p=util.harbourCityLocalToWorld(site,x,s.trackZ);assert.ok(Math.abs(b.groundHeightAt(p.x,p.z,380,s.platformY)-(s.platformY-.58))<1e-8);
 }
 const p=util.harbourCityLocalToWorld(site,stop.x,s.z0+.8);assert.equal(b.groundHeightAt(p.x,p.z,385,380),385);
});
test('station terrain cut is local and sampled road corridors remain untouched',async()=>{
 const S=await import('../js/cities/hongkong/peak-upper-station-site.js'),s=S.PEAK_UPPER_STATION,site=A.PEAK_TOWER_SITE;
 const {subtractTunnelOpenings,polygonArea}=await import('../js/cities/hongkong/tunnel-openings.js'),cut=S.peakUpperStationTerrainCut();
 const local=[[s.x0+.1,s.z0+.1],[s.x1-.1,s.z0+.1],[s.x1-.1,s.z1-.1]].map(([x,z])=>{const p=util.harbourCityLocalToWorld(site,x,z);return [p.x,p.z]});
 assert.equal(subtractTunnelOpenings(local,[cut]).reduce((a,p)=>a+polygonArea(p),0),0);
 for(let x=s.x0;x<=s.x1;x+=.5)for(let z=s.z0;z<=s.z1;z+=.5){const p=util.harbourCityLocalToWorld(site,x,z);assert.equal(road.fullRoadSurfaceAt(p.x,p.z,0,s.platformY),null);}
 const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');assert.match(src,/mode === 'person' && !groundUsesRoad \? peakTower\.groundHeightAt/);
});
