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


for (const [kind,script,file,exportName] of [
 ['site','build-happy-valley-site-cut-experiment.mjs','happy-valley-site-cut-data.js','siteCutTriangles'],
 ['inset','build-happy-valley-inset-cut-experiment.mjs','happy-valley-inset-cut-data.js','insetCutTriangles'],
]) test(`offline ${kind} polygon cut snapshot reproduces the same covered area`, {timeout:30000}, async () => {
 // Earcut versions can triangulate the same polygon differently. Compare the
 // actual coverage, not the order of internal diagonals or vertices.
 const {execFileSync}=require('node:child_process');
 const clip=(await import('polygon-clipping')).default;
 const reference=(await import('./visual/'+file))[exportName];
 const output=execFileSync(process.execPath,['tools/cities/hongkong/'+script],{encoding:'utf8',maxBuffer:1024*1024});
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
 let count=0;for(const tris of [...Object.values(siteCutTriangles),...Object.values(insetCutTriangles)])for(const [a,b,c] of tris) {
  assert.ok((b[1]-a[1])*(c[0]-a[0])-(b[0]-a[0])*(c[1]-a[1])>0);count++;
 }
 assert.ok(count>100);
});

test('experimental inset remains inside and approximately 8m from mapped site edge', async () => {
 const fs=require('node:fs'),clip=(await import('polygon-clipping')).default;
 const {HAPPY_VALLEY_SITE:site}=await import('../js/cities/hongkong/happy-valley-racecourse-architecture.js');
 const inset=JSON.parse(fs.readFileSync('tools/data/hongkong/happy-valley-inset-experiment.json','utf8'));
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
   assert.ok(distance>=7.999,`inset too close to site: ${distance}`);
  }
 }
});
