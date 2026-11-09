const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
let result;
test.before(()=>{result=JSON.parse(execFileSync(process.execPath,['tools/cities/hongkong/check-peak-tram-crossings.mjs'],{encoding:'utf8'}));});
test('identifies the different structural relationships without pretending pedestrian path is resolved',()=>{
 assert.equal(result.lateralProbeMetres,2);
 const crossing=new Map(result.intersections.map(x=>[x.id,x]));
 for(const id of [720,8998,5701,36167,42840]) assert.equal(crossing.get(id).kind,'road-over');
 for(const id of [13131,36109]) assert.equal(crossing.get(id).kind,'tram-over');
 assert.equal(crossing.get(39703).kind,'unknown');
 assert.ok(result.intersections.every(x=>x.samples>0&&x.start<=x.end));
});
test('does not claim the present terrain at Cotton Tree Drive meets the provisional clearance',()=>{
 assert.ok(result.lowerGroundMetres>40&&result.lowerGroundMetres<55);
 assert.ok(result.initialRoadDeficitMetres>5);
 assert.equal(result.initialRoadDeficitMetres,result.lowerGroundMetres+result.clearanceEnvelopeMetres-result.firstRoadHeightMetres);
});
