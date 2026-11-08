const test=require('node:test'),assert=require('node:assert/strict');let roads,elev,terrain,meta;
test.before(async()=>{[roads,elev,terrain,meta]=await Promise.all([import('../js/cities/hongkong/building-priority-roads.js'),import('../js/cities/hongkong/road-elevation.js'),import('../js/cities/hongkong/terrain.js'),import('../js/cities/hongkong/full-meta.js')]);});
test('government house service road connects continuously to forecourt and descends smoothly',()=>{
 const a=roads.HK_FULL_ROADS.roads[38479],b=roads.HK_FULL_ROADS.roads[38480],p=b[5];
 assert.deepEqual(a[5].slice(12,14),p.slice(0,2));
 assert.ok(Math.abs(elev.roadRibbonHeightAtVertex(38479,6)-elev.roadRibbonHeightAtVertex(38480,0))<1e-9);
 let maxSlope=0,minClearance=Infinity;
 for(let i=0;i<p.length/2-1;i++){
  const profile=elev.roadRibbonProfileAtSegment(38480,i),dx=p[2*i+2]-p[2*i],dz=p[2*i+3]-p[2*i+1],len=Math.hypot(dx,dz);
  assert.deepEqual(profile.ts,[0,1]);
  if(i)assert.equal(profile.heights[0],elev.roadRibbonProfileAtSegment(38480,i-1).heights.at(-1));
  maxSlope=Math.max(maxSlope,Math.abs(profile.heights[1]-profile.heights[0])/len);
  for(let j=0;j<=100;j++)for(const o of [-b[1]/2,0,b[1]/2]){
   const t=j/100,x=p[2*i]+dx*t+dz/len*o,z=p[2*i+1]+dz*t-dx/len*o;
   const h=elev.roadRibbonHeightAtSegment(38480,i,t);minClearance=Math.min(minClearance,h-terrain.hongKongTerrainHeight(x,z));
   assert.ok(Math.abs(h-(profile.heights[0]*(1-t)+profile.heights[1]*t))<1e-9);
   if(o===0){const selected=meta.fullRoadSurfaceAt(x,z,0,h);assert.ok(selected);assert.ok(Math.abs(selected.height-h)<1e-6,'selected gameplay ground must match rendered ribbon');}
  }
 }
 assert.ok(maxSlope<.2,`max grade ${maxSlope}`);assert.ok(minClearance>=-.02,`terrain above pavement by ${-minClearance}m`);
 const forecourt=elev.roadRibbonProfileAtSegment(38479,5);assert.deepEqual(forecourt.ts,[0,1]);assert.equal(forecourt.heights[1],elev.roadRibbonHeightAtSegment(38480,0,0));
});
