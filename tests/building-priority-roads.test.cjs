const test=require('node:test'),assert=require('node:assert/strict');

test('World-Wide House mapped podium clears the adjusted road ribbons while retaining lanes, rails and traffic paths',async()=>{
 const polygon=(await import('polygon-clipping')).default;
 const {HK_FULL_ROADS:original}=await import('../js/hk-full-roads-data.js');
 const {HK_FULL_ROADS:adjusted}=await import('../js/cities/hongkong/building-priority-roads.js');
 const {projectHongKongLonLat}=await import('../js/cities/hongkong/authored-landmark-site.js');
 const {HK_TRAM_NETWORK}=await import('../js/hk-tram-network-data.js');
 const {GEO}=await import('../js/hk-geodata.js');
 const {buildTrafficRouteGeometry}=await import('../js/cities/hongkong/traffic-paths.js');
 const {fullRoadWaysNear}=await import('../js/cities/hongkong/full-meta.js');
 const ring=[[114.1574693,22.2825664],[114.1577437,22.2822286],[114.1578264,22.2822346],[114.1578376,22.2822517],[114.1580473,22.2825727],[114.1580766,22.2826175],[114.1578651,22.2828667],[114.1578468,22.2828528],[114.1577784,22.2828009],[114.1574693,22.2825664]].map(([lon,lat])=>projectHongKongLonLat(lon,lat));
 const ribbon=(road)=>{const [ax,az,bx,bz]=road[5],dx=bx-ax,dz=bz-az,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,nx=uz*road[1]/2,nz=-ux*road[1]/2,e=1.2;let p=[[ax-e*ux+nx,az-e*uz+nz],[ax-e*ux-nx,az-e*uz-nz],[bx+e*ux-nx,bz+e*uz-nz],[bx+e*ux+nx,bz+e*uz+nz]];return [...p,p[0]];};
 assert.ok(polygon.intersection([ring],[ribbon(original.roads[17569])]).length>0,'original ribbon overlaps mapped podium');
 for(const id of [17569,17570]){const before=original.roads[id],r=adjusted.roads[id];assert.equal(before[1],11.6);assert.equal(r[1],11.2);assert.equal(r[3],3);assert.deepEqual(r[5],before[5]);assert.equal(polygon.intersection([ring],[ribbon(r)]).length,0);assert.ok(fullRoadWaysNear(r[5][0],r[5][1],20).some(w=>w.id===id&&w.width===11.2));}
 const {paths,routes}=buildTrafficRouteGeometry(GEO.roadGraph.links,GEO.roadGraph.nodes);
 for(const [link,id] of [[5621,17569],[5622,17570]]){assert.equal(routes[link].wayId,id);assert.equal(routes[link].laneWidth,11.2);assert.deepEqual(paths[link].flat(),adjusted.roads[id][5]);}
 // Eastbound tram centre line and both rails remain within the adjusted carriageway
 // in the measured-overlap section (the opposite track is on another carriageway).
 const road=adjusted.roads[17569],f=road[5],dx=f[2]-f[0],dz=f[3]-f[1],len=Math.hypot(dx,dz),track=HK_TRAM_NETWORK.tracks.find(t=>t.id==='hk-tram-east');let count=0;
 for(let i=0;i<track.points.length;i+=3){let x=track.points[i],z=track.points[i+2],along=((x-f[0])*dx+(z-f[1])*dz)/(len*len),offset=((x-f[0])*dz-(z-f[1])*dx)/len;if(along>.85&&along<.99&&Math.abs(offset)<10){count++;assert.ok(Math.abs(offset)+(HK_TRAM_NETWORK.gauge+HK_TRAM_NETWORK.railHeadWidth)/2<=road[1]/2,`rail offset ${offset}`);}}
 assert.ok(count>2);
});
