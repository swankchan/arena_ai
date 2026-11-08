const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('unified Hong Kong scene includes bridge, stats and colliders',()=>{
 const src=fs.readFileSync('js/cities/hongkong/simple-world.js','utf8');
 for(const r of [/buildPeakTramKennedyBridge\(scene\)/,/\.\.\.peakTramKennedyBridge\.stats/,/\.\.\.peakTramKennedyBridge\.colliders/])assert.match(src,r);
});
