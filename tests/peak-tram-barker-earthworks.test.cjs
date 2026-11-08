const {test}=require('node:test'),assert=require('node:assert/strict');
test('infill covers the terrain-opening union and leaves road and rail envelopes clear at samples',async()=>{
 const T=await import('three/webgpu'),{buildBarkerRoadEarthworks,barkerRoadDatum}=await import('../js/cities/hongkong/peak-tram-barker-earthworks.js'),{BARKER_OPENING_TRIANGLES:tri}=await import('../js/cities/hongkong/peak-tram-barker-cut-data.js'),{TERRAIN_TUNNEL_OPENING_RECTS:rects}=await import('../js/cities/hongkong/road-elevation.js'),{fullRoadSurfaceAt:road}=await import('../js/cities/hongkong/full-meta.js'),{hongKongTerrainHeight:g}=await import('../js/cities/hongkong/terrain.js'),{barkerStationTrackPoint:p}=await import('../js/cities/hongkong/peak-tram-barker-station-track-site.js');
 const cuts=rects.filter(r=>r.routeId==='osm-tunnel:36109'),inside=(x,z,r)=>Math.abs((x-r.cx)*r.ux+(z-r.cz)*r.uz)<=r.hx+2e-6&&Math.abs(-(x-r.cx)*r.uz+(z-r.cz)*r.ux)<=r.hz+2e-6;
 let area=0;for(let i=0;i<tri.length;i+=6){let [x,z,X,Z,u,v]=tri.slice(i,i+6),cx=(x+X+u)/3,cz=(z+Z+v)/3;assert.ok(cuts.some(r=>inside(cx,cz,r)));area+=Math.abs((X-x)*(v-z)-(Z-z)*(u-x))/2;let r=road(cx,cz,0,g(cx,cz));if(r){let y=(barkerRoadDatum(x,z)+barkerRoadDatum(X,Z)+barkerRoadDatum(u,v))/3;assert.ok(y<r.height+.05,`infill above road ${r.way.id}`);}}
 assert.ok(Math.abs(area-534.375601)<.0001,`opening fill area ${area}`);
 const result=buildBarkerRoadEarthworks(new T.Group());assert.ok(result.stats.peakTramBarkerCutFaces>100);for(const name of ['Plantation Road opening infill','Plantation Road cutting retaining faces'])assert.ok(result.group.getObjectByName(name));
 const mesh=result.group.getObjectByName('Plantation Road cutting retaining faces').geometry.attributes.position;
 for(let i=0;i<mesh.count;i++){let x=mesh.getX(i),y=mesh.getY(i),z=mesh.getZ(i),r=road(x,z,0,g(x,z));if(r)assert.ok(y<r.height-.1||y>r.height+4.5);for(let s=1098;s<=1116;s+=.4){let q=p(s);if(Math.hypot(x-q.x,z-q.z)<1.8)assert.ok(y<q.y-.65);}}
});
