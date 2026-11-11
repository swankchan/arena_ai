const test=require('node:test');const assert=require('node:assert/strict');
test('local terrain reconstruction exposes track occlusion and compares offline experiments', {timeout:60000}, async()=>{
 const THREE=await import('three/webgpu');
 const {buildLocalTerrain}=await import('./visual/happy-valley-terrain-fixture.js');
 const {buildHappyValleyRacecourse}=await import('../js/cities/hongkong/happy-valley-racecourse-world.js');
 const {HAPPY_VALLEY_SITE:s,happyValleyTrackPoint:track}=await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
 const {HONG_KONG_TERRAIN_META:t}=await import('../js/cities/hongkong/terrain.js');
 const root=new THREE.Group();buildHappyValleyRacecourse(root,{groundOffset:t.happyValleyPadHeight});root.updateMatrixWorld(true);
 const turf=root.getObjectByName('HappyValleyTrackSurface'),ray=new THREE.Raycaster();
 function sample(terrain){
  terrain.updateMatrixWorld(true);let count=0,hits=0,max=0;
  for(let i=0;i<720;i++)for(const offset of [0,-8,-16,-24,-30]){
   const p=track(i/720,offset),c=Math.cos(s.ry),sn=Math.sin(s.ry),x=s.x+c*p.x+sn*p.z,z=s.z-sn*p.x+c*p.z;
   ray.set(new THREE.Vector3(x,50,z),new THREE.Vector3(0,-1,0));
   const a=ray.intersectObject(turf)[0],b=ray.intersectObject(terrain)[0];if(!a)continue;count++;
   if(b&&b.point.y>a.point.y+.05){hits++;max=Math.max(max,b.point.y-a.point.y);}
  }return {count,hits,max};
 }
 const baseline=sample(buildLocalTerrain()),cut=sample(buildLocalTerrain({cutTrack:true})),grade=sample(buildLocalTerrain({grade:true})),siteCut=sample(buildLocalTerrain({siteCut:true})),insetCut=sample(buildLocalTerrain({insetCut:true}));
 assert.ok(baseline.count>2000);assert.ok(baseline.hits>300 && baseline.max>2);
 assert.equal(cut.hits,0);assert.ok(grade.hits>0 && grade.hits<20);assert.equal(siteCut.hits,0);assert.equal(insetCut.hits,0);
 // Neither experiment proves road/sky/physics safety; neither is runtime.
});


for (const [kind,script,file,exportName,argument] of [
 ['site','build-happy-valley-site-cut-experiment.mjs','happy-valley-site-cut-data.js','siteCutTriangles'],
 ['inset','build-happy-valley-inset-cut-experiment.mjs','happy-valley-inset-cut-data.js','insetCutTriangles'],
 ['inset-1m','build-happy-valley-inset-cut-experiment.mjs','happy-valley-inset-1m-cut-data.js','inset1mCutTriangles','--1m'],
]) test(`offline ${kind} polygon cut snapshot reproduces the same covered area`, {timeout:30000}, async () => {
 // Earcut versions can triangulate the same polygon differently. Compare the
 // actual coverage, not the order of internal diagonals or vertices.
 const {execFileSync}=require('node:child_process');
 const clip=(await import('polygon-clipping')).default;
 const reference=(await import('./visual/'+file))[exportName];
 const output=execFileSync(process.execPath,['tools/cities/hongkong/'+script,...(argument?[argument]:[])],{encoding:'utf8',maxBuffer:1024*1024});
 const actual=(await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64')))[exportName];
 assert.deepEqual(Object.keys(actual).sort(),Object.keys(reference).sort());
 const union=tris=>tris.length?clip.union(...tris.map(t=>[[[...t,t[0]]]])):[];
 const area=multi=>multi.reduce((sum,poly)=>sum+poly.reduce((s,ring,i)=>{
  let a=0;for(let j=1;j<ring.length;j++)a+=ring[j-1][0]*ring[j][1]-ring[j][0]*ring[j-1][1];
  return s+(i===0?1:-1)*Math.abs(a)/2;
 },0),0);
 for(const key of Object.keys(reference)){
  const a=union(reference[key]),b=union(actual[key]);
  const diff=a.length&&b.length?clip.xor(a,b):a.length?a:b;
  assert.ok(area(diff)<1e-5,`coverage differs at ${key}: ${area(diff)} m²`);
 }
});


test('experimental polygon cut triangles face upward', async () => {
 const {siteCutTriangles}=await import('./visual/happy-valley-site-cut-data.js');
 const {insetCutTriangles}=await import('./visual/happy-valley-inset-cut-data.js');
 const {inset1mCutTriangles}=await import('./visual/happy-valley-inset-1m-cut-data.js');
 let count=0;for(const tris of [...Object.values(siteCutTriangles),...Object.values(insetCutTriangles),...Object.values(inset1mCutTriangles)])for(const [a,b,c] of tris) {
  assert.ok((b[1]-a[1])*(c[0]-a[0])-(b[0]-a[0])*(c[1]-a[1])>0);count++;
 }
 assert.ok(count>100);
});

for (const [distance,file] of [[8,'happy-valley-inset-experiment.json'],[1,'happy-valley-inset-1m-experiment.json']]) test(`experimental ${distance}m inset remains inside and clear of mapped site edge`, async () => {
 const fs=require('node:fs'),clip=(await import('polygon-clipping')).default;
 const argumentsDistance=distance;
 const {HAPPY_VALLEY_SITE:site}=await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
 const inset=JSON.parse(fs.readFileSync('tools/data/hongkong/'+file,'utf8'));
 const ring=Array.from({length:site.ring.length/2},(_,i)=>[site.ring[2*i],site.ring[2*i+1]]);
 assert.deepEqual(inset[0],inset[inset.length-1]);
 const closed=[...ring];if(closed[0][0]!==closed.at(-1)[0]||closed[0][1]!==closed.at(-1)[1])closed.push(closed[0]);
 assert.equal(clip.difference([[inset]],[[closed]]).length,0);
 for(let i=0;i+1<inset.length;i++){
  const [a,b]=[inset[i],inset[i+1]],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2);
  for(let n=0;n<=steps;n++){
   const x=a[0]+(b[0]-a[0])*n/steps,z=a[1]+(b[1]-a[1])*n/steps;let distance=Infinity;
   for(let j=0;j+1<closed.length;j++){
    const [p,q]=[closed[j],closed[j+1]],dx=q[0]-p[0],dz=q[1]-p[1],len=dx*dx+dz*dz;
    if(!len)continue;const t=Math.max(0,Math.min(1,((x-p[0])*dx+(z-p[1])*dz)/len));
    distance=Math.min(distance,Math.hypot(x-p[0]-t*dx,z-p[1]-t*dz));
   }
   assert.ok(distance>=argumentsDistance-0.001,`inset too close to site: ${distance}`);
  }
 }
});

test('candidate fit is hidden by coarse terrain but clears a 1m inset cut in the local fixture', {timeout:30000}, async () => {
 const fs=require('node:fs'),THREE=await import('three/webgpu');
 const {buildLocalTerrain}=await import('./visual/happy-valley-terrain-fixture.js');
 const {HAPPY_VALLEY_SITE:s}=await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
 const {HONG_KONG_TERRAIN_META:t}=await import('../js/cities/hongkong/terrain.js');
 const points=JSON.parse(fs.readFileSync('tools/data/hongkong/happy-valley-experimental-smooth-fit.json')).points;
 const n=points.length,cs=Math.cos(s.ry),sn=Math.sin(s.ry),ray=new THREE.Raycaster();
 function sample(mesh) {
  mesh.updateMatrixWorld();let hits=0,max=0;
  for(let i=0;i<n;i++) {
   const [x,z]=points[i],a=points[(i+n-1)%n],b=points[(i+1)%n],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   for(const offset of [-15.25,-8,0,8,15.25]) {
    const px=x-dz*offset/length,pz=z+dx*offset/length,X=s.x+cs*px+sn*pz,Z=s.z-sn*px+cs*pz;
    ray.set(new THREE.Vector3(X,50,Z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(mesh)[0];
    if(hit&&hit.point.y>t.happyValleyPadHeight+.15){hits++;max=Math.max(max,hit.point.y-t.happyValleyPadHeight-.1);}
   }
  }
  return {hits,max};
 }
 const before=sample(buildLocalTerrain()),after=sample(buildLocalTerrain({inset1mCut:true}));
 assert.ok(before.hits>1000&&before.max>3);
 assert.equal(after.hits,0);
 // No claim about the perimeter seam, roads, missing props, physics or runtime.
});

test('inset seam diagnostic distinguishes high and low steps near roads', {timeout:30000}, () => {
 const {execFileSync}=require('node:child_process');
 const report=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-happy-valley-site-seam.mjs','--inset1m'],{encoding:'utf8'}));
 assert.equal(report.boundary,'experimental 1m inset');
 assert.equal(report.terrainAbovePad+report.terrainBelowPad,report.over10cm);
 assert.ok(report.terrainAbovePad>0 && report.terrainBelowPad>0);
 assert.ok(report.aboveNearSameLevelRoad>0 && report.belowNearSameLevelRoad>0);
 assert.match(report.caveat,/excludes tunnel cuts/);
});

test('seam source check reproduces the committed step and locates it in the surrounding grid', {timeout:30000}, () => {
 const {execFileSync}=require('node:child_process');
 const report=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-happy-valley-seam-source.mjs','--inset1m'],{encoding:'utf8'}));
 const seam=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-happy-valley-site-seam.mjs','--inset1m'],{encoding:'utf8'}));
 assert.equal(report.boundary,'experimental 1m inset');
 // Same samples and the same statistic as the committed diagnostic; the split must not drift.
 assert.equal(report.samples,seam.samples);
 assert.equal(report.flatEdge.above,seam.terrainAbovePad);
 assert.equal(report.flatEdge.below,seam.terrainBelowPad);
 assert.equal(report.flatEdge.minMetres,seam.minMetres);
 assert.equal(report.flatEdge.maxMetres,seam.maxMetres);
 // The pad is not what lifts the edge: only the surrounding corners can be, and every edge cell straddles.
 assert.equal(report.cellsFullyInsideVenue,0);
 assert.equal(report.straddlingCells,report.samples);
 assert.equal(report.insideCornersPerCell.four,0);
 assert.ok(report.highestSurroundingCornerAbovePad.p50>1);
 // The bare DTM inside the venue is below the pad as often as above, so the median datum is not a high guess.
 assert.ok(report.pureDtmGrid.below>report.pureDtmGrid.above*.5);
 assert.ok(report.pureDtmGrid.below>0 && report.pureDtmGrid.above>0);
 assert.match(report.caveat,/excludes tunnel cuts/);
});
