const { test } = require('node:test');
const assert = require('node:assert/strict');
const data = import('../js/cities/hongkong/peak-tram-route.js');
test('OSM ways join at both passing-loop switches', async () => {
 const { PEAK_TRAM_SEGMENTS: ways } = await data;
 for (const branch of ['A','B']) {
  const selected = ways.filter(w => !w.branch || w.branch === branch);
  for(let i=1;i<selected.length;i++) assert.equal(selected[i-1].nodes.at(-1).id,selected[i].nodes[0].id,`gap between ${selected[i-1].id} and ${selected[i].id}`);
 }
});
test('both routes connect mapped stop positions and retain distinct loop', async () => {
 const { peakTramRoute, PEAK_TRAM_NODES:n }=await data;
 const a=peakTramRoute('A'),b=peakTramRoute('B');
 for(const route of [a,b]) {
  assert.equal(route[0].id,2525250101);assert.equal(route.at(-2).id,26412045);
  for(const node of [n.kennedy,n.macdonnell,n.may,n.barker]) assert.ok(route.includes(node));
  let length=0;for(let i=1;i<route.length;i++){const [x,z]=route[i].world,[px,pz]=route[i-1].world;length+=Math.hypot(x-px,z-pz);}
  assert.ok(length>1200&&length<1300);
 }
 assert.ok(a.includes(n.a1)&&!b.includes(n.a1));assert.ok(b.includes(n.b1)&&!a.includes(n.b1));
 assert.throws(()=>peakTramRoute('other'),RangeError);
});
test('bridge and building passage metadata preserved',async()=>{
 const {PEAK_TRAM_SEGMENTS:w}=await data;
 assert.deepEqual(w.filter(x=>x.bridge).map(x=>x.id),[1308940441,1046739317,85404052,622565242]);
 assert.equal(w.find(x=>x.id===1117280223).buildingPassage,true);
});
