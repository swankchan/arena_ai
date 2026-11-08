const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('tools/cities/hongkong/peak-tram-maps3d.html','utf8');
test('3D reference viewer loads Google only after user input and does not persist a key',()=>{
 assert.match(html,/load\.addEventListener\('click'/);
 assert.match(html,/maps\.googleapis\.com\/maps\/api\/js/);
 assert.match(html,/libraries:'maps3d'/);
 assert.match(html,/input\.value=''/);
 assert.doesNotMatch(html,/AIza[0-9A-Za-z_-]{30,}/);
 assert.doesNotMatch(html,/localStorage\.(setItem|\w+\s*=)/);
 assert.match(html,/gm_authFailure/);
 assert.match(html,/script\.onerror/);
});
test('includes the four Peak Tram reference viewpoints',()=>{
 for(const name of ['central','kennedy','barker','peak'])assert.match(html,new RegExp(`data-place="${name}"`));
});
