const test = require('node:test');
const assert = require('node:assert/strict');
let M,A,T,terrain,road,collision;
test.before(async()=>{
 global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)})})};
 [M,A,T,terrain,road,collision]=await Promise.all([import('../js/cities/hongkong/sogo-world.js'),import('../js/cities/hongkong/sogo-architecture.js'),import('three/webgpu'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js'),import('../js/cities/hongkong/colliders.js')]);
});
test('SOGO retains mapped outline, tower and rear wing and the reference-directed facade',()=>{
 const b=M.buildSogoCausewayBay(new T.Group());
 assert.equal(A.SOGO_SITE.osmId,294141091);assert.equal(A.SOGO_TOWER.osmId,198586269);assert.equal(A.SOGO_REAR.osmId,220977125);
 assert.ok(b.stats.sogoDiamondPanels>1000);assert.ok(b.stats.sogoWindowBays>900);assert.equal(b.stats.sogoCanopies,2);
 for(const name of ['SOGO podium glazing','SOGO tower faceted cladding','SOGO tower glazing','SOGO rear glazing','SOGO blue corner lettering','SOGO Hennessy Road advertising display','SOGO entrance canopy']) assert.ok(b.group.getObjectByName(name),name);
 for(const c of b.colliders){assert.ok(c.maxY>c.minY);for(const key of ['minX','maxX','minZ','maxZ','minY','maxY'])assert.ok(Number.isFinite(c[key]));}
});
test('mapped facade colliders do not obstruct sampled nearby roads at vehicle height',()=>{
 const b=M.buildSogoCausewayBay(new T.Group()), s=A.SOGO_SITE;let count=0,hits=0,ids={};
 for(let x=Math.floor(s.bounds.minX)-15;x<=s.bounds.maxX+15;x++)for(let z=Math.floor(s.bounds.minZ)-15;z<=s.bounds.maxZ+15;z++){
   const r=road.fullRoadSurfaceAt(x,z,0,terrain.hongKongTerrainHeight(x,z));if(!r)continue;count++;
   for(const c of b.colliders){if(r.height+4.8<c.minY||r.height+.1>c.maxY)continue;if(collision.colliderContains(c,x,z,0)){hits++;ids[r.way.id]=(ids[r.way.id]||0)+1;}}
 }
 assert.ok(count>1000,`road samples ${count}`);assert.equal(hits,0,JSON.stringify(ids));
});
test('nearby tram centreline samples keep a 1.3 m envelope clear of SOGO colliders',async()=>{
 const {HK_TRAM_NETWORK}=await import('../js/hk-tram-network-data.js');const b=M.buildSogoCausewayBay(new T.Group()),s=A.SOGO_SITE;let checked=0,hits=0;
 for(const track of HK_TRAM_NETWORK.tracks){const a=track.points;for(let i=3;i<a.length;i+=3){const x0=a[i-3],y0=a[i-2],z0=a[i-1],x1=a[i],y1=a[i+1],z1=a[i+2];
  if(Math.max(x0,x1)<s.bounds.minX-20||Math.min(x0,x1)>s.bounds.maxX+20||Math.max(z0,z1)<s.bounds.minZ-20||Math.min(z0,z1)>s.bounds.maxZ+20)continue;
  const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)));for(let j=0;j<=n;j++){const t=j/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t,y=y0+(y1-y0)*t;checked++;
   for(const c of b.colliders)if(y+4.8>=c.minY&&y+.1<=c.maxY&&collision.colliderContains(c,x,z,1.3))hits++;
  }
 }}assert.ok(checked>30,`checked ${checked}`);assert.equal(hits,0,`${hits} tram envelope samples obstructed`);
});
test('SOGO is included in the active scene, landmarks and collision chain',()=>{
 const src=require('node:fs').readFileSync('js/cities/hongkong/simple-world.js','utf8');
 assert.match(src,/buildSogoCausewayBay\(scene\)/);assert.match(src,/\.\.\.sogo\.colliders/);assert.match(src,/\.\.\.sogo\.landmarks/);assert.match(src,/\.\.\.sogo\.stats/);
});
