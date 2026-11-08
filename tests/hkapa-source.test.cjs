const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../tools/data/hongkong/hkapa-building-osm.json')));
const xy = ({ lon, lat }) => [(lon - 114.1596) * 103056.81753522092, -(lat - 22.2819) * 110734.09626824585];
const ring = source.geometry.map(xy);
const pointSegment = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)) : 0;
  return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dz);
};
const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const segmentDistance = (a,b,c,d) => {
  const x = cross(a,b,c), y = cross(a,b,d), z = cross(c,d,a), w = cross(c,d,b);
  if (((x > 0 && y < 0) || (x < 0 && y > 0)) && ((z > 0 && w < 0) || (z < 0 && w > 0))) return 0;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
};
function inside(p) {
  let yes = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) yes = !yes;
  }
  return yes;
}
test('HKAPA source is the actual mapped building, not the campus or adjacent Arts Centre', () => {
  assert.equal(source.id, 117088641); assert.equal(source.version, 14);
  assert.equal(source.tags.building, 'university'); assert.equal(source.geometry.length, 68);
  assert.deepEqual(source.geometry[0], source.geometry.at(-1));
  assert.ok(source.geometry.some(p => p.id === 6853998910)); // mapped main entrance
  assert.ok(source.geometry.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)));
  assert.equal(inside(xy({ lat: 22.2802, lon: 114.1708 })), false); // neighbouring Arts Centre
});

test('existing inferred road ribbons do not intrude on the mapped outline', async () => {
  const { HK_FULL_ROADS } = await import('../js/cities/hongkong/building-priority-roads.js');
  const bounds = {minX: Math.min(...ring.map(p=>p[0])),maxX: Math.max(...ring.map(p=>p[0])),minZ: Math.min(...ring.map(p=>p[1])),maxZ: Math.max(...ring.map(p=>p[1]))};
  const conflicts = [];
  HK_FULL_ROADS.roads.forEach((road, id) => {
    const f = road[5], margin = road[1]/2 + .35;
    for (let i=2;i<f.length;i+=2) {
      const a=[f[i-2],f[i-1]], b=[f[i],f[i+1]];
      if (Math.max(a[0],b[0])<bounds.minX-margin || Math.min(a[0],b[0])>bounds.maxX+margin || Math.max(a[1],b[1])<bounds.minZ-margin || Math.min(a[1],b[1])>bounds.maxZ+margin) continue;
      let d = inside(a) || inside(b) ? 0 : Infinity;
      for (let j=1;j<ring.length;j++) d = Math.min(d,segmentDistance(a,b,ring[j-1],ring[j]));
      if (d < margin) { conflicts.push({id, name:road[0], distance:d, margin}); break; }
    }
  });
  assert.deepEqual(conflicts, []);
});

test('constructed academy has separate driveway-clear volumes, facade bracing and TSL night windows', async () => {
  const THREE = await import('three/webgpu');
  const {buildHkapa} = await import('../js/cities/hongkong/hkapa-world.js');
  const {hkapaPadHeight,rawHongKongTerrainHeight} = await import('../js/cities/hongkong/terrain.js');
  const {HKAPA_ACADEMIC,HKAPA_THEATRE,HKAPA_WEST,hkapaTerrainHeightAt} = await import('../js/cities/hongkong/hkapa-architecture.js');
  const {pointInFlatRing} = await import('../js/cities/hongkong/landmark-site.js');
  const scene = new THREE.Scene(), model=buildHkapa(scene);
  assert.equal(model.stats.hkapaSourceWay,117088641); assert.equal(model.stats.hkapaFacadeRows,4); assert.equal(model.stats.hkapaFacadeBays,6);
  assert.ok(model.stats.hkapaVertices>3000); assert.equal(model.stats.hkapaNonFinite,0);
  const find = name => { let found; model.root.traverse(o=>{if(o.name===name)found=o});return found; };
  const windows=find('Academic individual lit and unlit glazing');
  assert.ok(windows?.material.isMeshStandardNodeMaterial);assert.ok(windows.material.emissiveNode);assert.equal(windows.material.side,THREE.DoubleSide);
  assert.ok(find('Academic facade triangular X-bracing')); assert.ok(find('Glazed atrium over open service drive'));
  const path = [[114.1693111,22.2805117],[114.1695198,22.2803482],[114.1699742,22.2798758]].map(([lon,lat])=>xy({lon,lat}));
  for(let seg=1;seg<path.length;seg++)for(let i=1;i<20;i++){
    const t=i/20, x=path[seg-1][0]*(1-t)+path[seg][0]*t,z=path[seg-1][1]*(1-t)+path[seg][1]*t;
    for(const site of [HKAPA_ACADEMIC,HKAPA_THEATRE,HKAPA_WEST]) assert.equal(pointInFlatRing(site.ring,x,z),false);
    for(const c of model.colliders){const o=c.obb,dx=x-o.cx,dz=z-o.cz;assert.ok(Math.abs(dx*o.cs-dz*o.sn)>o.hx || Math.abs(dx*o.sn+dz*o.cs)>o.hz, `driveway collider at ${x},${z}`);}
    const raw=rawHongKongTerrainHeight(x,z);assert.equal(hkapaTerrainHeightAt(x,z,raw,hkapaPadHeight()),raw);
  }
  assert.ok(Number.isFinite(hkapaPadHeight())); assert.ok(model.colliders.length>10);
});

test('main entrance gap and neighbouring street lamps remain unobstructed', async () => {
  const THREE=await import('three/webgpu');const {buildHkapa}=await import('../js/cities/hongkong/hkapa-world.js');
  const {hkapaPadHeight}=await import('../js/cities/hongkong/terrain.js');
  const {HKAPA_ACADEMIC,HKAPA_THEATRE,HKAPA_WEST}=await import('../js/cities/hongkong/hkapa-architecture.js');
  const {pointInFlatRing}=await import('../js/cities/hongkong/landmark-site.js');
  const {HK_STREET_LIGHTS}=await import('../js/hk-street-light-data.js');const {HK_STREET_LIGHT_CLEARANCE}=await import('../js/hk-street-light-clearance-data.js');
  const model=buildHkapa(new THREE.Scene()),entrance=xy(source.geometry.find(p=>p.id===6853998910)), y=hkapaPadHeight()+1.5;
  for(const c of model.colliders) {if(y<c.minY||y>c.maxY)continue;const o=c.obb,dx=entrance[0]-o.cx,dz=entrance[1]-o.cz;assert.ok(Math.abs(dx*o.cs-dz*o.sn)>o.hx||Math.abs(dx*o.sn+dz*o.cs)>o.hz);}
  const suppress=new Set(HK_STREET_LIGHT_CLEARANCE.suppressed), overrides=new Map(HK_STREET_LIGHT_CLEARANCE.overrides.map(r=>[r[0],r]));
  for(let i=0;i<HK_STREET_LIGHTS.lamps.length;i++){if(suppress.has(i))continue;const lamp=HK_STREET_LIGHTS.lamps[i],o=overrides.get(i),x=lamp[0]+(o?.[1]||0)/100,z=lamp[1]+(o?.[2]||0)/100;for(const site of [HKAPA_ACADEMIC,HKAPA_THEATRE,HKAPA_WEST])assert.equal(pointInFlatRing(site.ring,x,z),false,`lamp ${i} inside building`);}
});

test('all academic glazing panels are in front of the bent mapped wall, not hidden by it', async () => {
  const THREE = await import('three/webgpu');
  const { buildHkapa } = await import('../js/cities/hongkong/hkapa-world.js');
  const scene = new THREE.Scene(), model = buildHkapa(scene); scene.updateMatrixWorld(true);
  const panes = scene.getObjectByName('Academic individual lit and unlit glazing');
  const positions = panes.geometry.getAttribute('position');
  // Sample off-centre within each panel to avoid the intentional X-brace and limit
  // the ray to the near face: this cannot accidentally hit the opposite facade.
  assert.equal(positions.count, 24 * 6);
  for (let j = 0; j < positions.count; j += 6) {
    const point = i => new THREE.Vector3(positions.getX(j+i),positions.getY(j+i),positions.getZ(j+i));
    const v = point(0).add(point(1).sub(point(0)).multiplyScalar(.25)).add(point(5).sub(point(0)).multiplyScalar(.6));
    v.y += model.root.position.y;
    const ray = new THREE.Raycaster(new THREE.Vector3(v.x,v.y,v.z+5),new THREE.Vector3(0,0,-1),0,5.1);
    const hit = ray.intersectObject(model.root,true)[0];
    assert.equal(hit?.object, panes, `front panel ${j/6} is occluded by ${hit?.object.name}`);
  }
  const atrium = scene.getObjectByName('Street-facing atrium glass above driveway');
  assert.ok(atrium?.material.emissiveNode, 'street-facing atrium needs day/night material');
  atrium.geometry.computeBoundingBox();
  assert.ok(atrium.geometry.boundingBox.min.y >= 5, 'service access remains clear under the atrium');
  assert.ok(scene.getObjectByName('Academic block ceramic walls with main entrance').material.emissiveNode);
});
