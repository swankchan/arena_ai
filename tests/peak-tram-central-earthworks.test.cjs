const {test}=require('node:test'),assert=require('node:assert/strict');
test('Central approach grade covers its opening, follows terrain and stays below track and sampled roads',async()=>{
 const T=await import('three/webgpu');
 const {CENTRAL_GRADE_POINTS:p,centralApproachGrade:grade,centralGradeRects:rects}=await import('../js/cities/hongkong/peak-tram-central-earthworks-site.js');
 const {buildCentralApproachEarthworks:build}=await import('../js/cities/hongkong/peak-tram-central-earthworks.js');
 const {hongKongTerrainHeight:h}=await import('../js/cities/hongkong/terrain.js');const {fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js');
 const scene=new T.Group(),{mesh}=build(scene);scene.updateMatrixWorld(true);const ray=new T.Raycaster(),v=new T.Vector3(),down=new T.Vector3(0,-1,0);let count=0,maxError=0;
 for(let i=1;i<p.length;i++){let a=p[i-1],b=p[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  for(let t of [.15,.35,.55,.75,.95])for(let o=-4.5;o<=4.5;o+=.5){let x=a.x+dx*t+nx*o,z=a.z+dz*t+nz*o,y=a.y+(b.y-a.y)*t;ray.set(v.set(x,100,z),down);let hits=ray.intersectObject(mesh);assert.ok(hits.length,`missing earthworks ${i}/${t}/${o}`);let expected=grade(x,z)-.08;maxError=Math.max(maxError,Math.abs(hits[0].point.y-expected));assert.ok(grade(x,z)<=h(x,z)+1e-7);assert.equal(road(x,z,.25,h(x,z)),null,`road near regrade ${i}/${o}`);if(Math.abs(o)<=1)assert.ok(hits[0].point.y<y-.29,`terrain above track ${i}`);count++;}
 }
 assert.ok(count>1000);assert.ok(maxError<.12,`mesh/query error ${maxError}`);
 for(const r of rects())for(const s of [-1,1])for(const t of [-.8,0,.8]){let x=r.cx+r.ux*r.hx*t-r.uz*r.hz*s,z=r.cz+r.uz*r.hx*t+r.ux*r.hz*s;assert.ok(Math.abs(grade(x,z)-h(x,z))<.01, 'outer boundary matches DTM');}
});
