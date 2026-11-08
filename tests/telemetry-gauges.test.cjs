const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs');
test('speedometer and metre altimeter map readings to the printed 260 degree dial',async()=>{
 const {gaugeNeedleDegrees:g,SPEED_GAUGE_MAX_KPH:s,ALTITUDE_GAUGE_MAX_METRES:a}=await import('../js/telemetry-gauges.js');
 assert.equal(s,300);assert.equal(a,1000);assert.equal(g(0,s),-130);assert.equal(g(150,s),0);assert.equal(g(300,s),130);assert.equal(g(500,a),0);assert.equal(g(1000,a),130);assert.equal(g(10000,a),130);assert.equal(g(-2,a),-130);assert.equal(g(NaN,a),-130);
 const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('js/app.js','utf8'),css=fs.readFileSync('css/style.css','utf8');
 for(const id of ['hud-speed-needle','hud-altitude-needle','hud-speed','hud-altitude'])assert.ok(html.includes(`id="${id}"`));
 assert.doesNotMatch(html,/class="hud hud-top-left"/);assert.match(css,/body\[data-mode='helicopter'\] \.instrument-altitude/);
 assert.match(app,/gaugeNeedleDegrees\(kmh, SPEED_GAUGE_MAX_KPH\)/);assert.match(app,/gaugeNeedleDegrees\(altitudeMetres, ALTITUDE_GAUGE_MAX_METRES\)/);
 assert.doesNotMatch(html,/hud-speed-meter/);
});
