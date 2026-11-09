import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {cityUniforms} from '../../tsl-materials.js';
import {centralPlatformPoint as point,CENTRAL_PLATFORM_END as END,CENTRAL_PLATFORM_HALF_WIDTH as WIDTH} from './peak-tram-central-platform-site.js';
import {hongKongTerrainHeight as terrain} from './terrain.js';
import {fullRoadSurfaceAt as road} from './full-meta.js';
import {store,quad,meshStore,beam,merged,nightAmount} from './harbour-city-world-utils.js';

// An inferred lightweight lining below Cotton Tree Drive; sampled road surface
// and nominal train envelope take precedence over the estimated roof shape.
export function centralRoofVertex(s,o){const p=point(s),x=p.x+p.nx*o,z=p.z+p.nz*o,base=p.y,desired=base+4.6-1.2*Math.min(1,Math.max(0,(Math.abs(o)-1.5)/(WIDTH-1.5))),r=road(x,z,.5,terrain(x,z));
 const y=r?Math.min(desired,r.height-.70):desired;return {x,y,z,base,road:r};}
export function buildPeakTramCentralRoof(scene){
 const group=new THREE.Group();group.name='Peak Tram Central inferred platform roof';scene.add(group);
 const n=Math.ceil(END/.5),m=28,grid=[];for(let i=0;i<=n;i++){let row=[];for(let j=0;j<=m;j++)row.push(centralRoofVertex(END*i/n,-WIDTH+2*WIDTH*j/m));grid.push(row);}
 let panels=0;const roof=store(),side=store(),ribs=[],lights=[],asArray=p=>[p.x,p.y,p.z];
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=grid[i][j],b=grid[i+1][j],c=grid[i+1][j+1],d=grid[i][j+1],safe=p=>p.y-p.base>=(Math.abs((j+.5)*2*WIDTH/m-WIDTH)<1.8?4.0:2.97);
  if(![a,b,c,d].every(safe))continue;let v=j%4===0?.41:.47;quad(roof,asArray(a),asArray(b),asArray(c),asArray(d),[v,v+.01,v]);panels++;}
 for(let i=0;i<n;i++){for(const sideSign of [-1,1]){const j=sideSign<0?0:m,a=grid[i][j],b=grid[i+1][j],bottom=p=>Math.min(p.y,Math.max(p.base+.57,Math.min(terrain(p.x,p.z)-.08,p.road?p.road.height-.70:Infinity)));let A=bottom(a),B=bottom(b);if(a.y>A+.03||b.y>B+.03)quad(side,[a.x,A,a.z],[b.x,B,b.z],asArray(b),asArray(a),[.33,.37,.36]);
   {let s=END*i/n,o=sideSign*(WIDTH-.20),q=centralRoofVertex(s,o);beam(lights,[q.x,q.y-.18,q.z],(()=>{const r=centralRoofVertex(END*(i+1)/n,o);return[r.x,r.y-.18,r.z]})(),.045,.065);}
 }
 if(i%4===0)for(let j=0;j<m;j++){let a=grid[i][j],b=grid[i][j+1];beam(ribs,[a.x,a.y+.05,a.z],[b.x,b.y+.05,b.z],.04,.04);}}
 const roofMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.1,side:THREE.DoubleSide}),sideMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.15,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}),metal=new THREE.MeshStandardMaterial({color:0x818783,metalness:.5,roughness:.5}),lamp=new THREE.MeshStandardNodeMaterial({color:0xffe6c7});lamp.emissiveNode=color(0xffca82).mul(nightAmount()).mul(1.3);
 meshStore(group,roof,roofMat,'Central platform fitted roof',false);meshStore(group,side,sideMat,'Central platform roof side glazing',false);merged(group,ribs,metal,'Central platform roof ribs',false);merged(group,lights,lamp,'Central platform roof night lights',false);
 const ambient=[];for(let s=4;s<END;s+=9){let p=point(s),light=new THREE.PointLight(0xffd8a6,8,14,2);light.position.set(p.x+p.nx*3,p.y+2.7,p.z+p.nz*3);light.name='Central platform warm ambient light';group.add(light);ambient.push(light);}
 return {group,panels,update(){const glow=Math.max(0,Math.min(1,(cityUniforms.uInteriorGlow.value-.55)/.85));for(const light of ambient)light.intensity=8+8*glow;}};
}
