import * as THREE from 'three/webgpu';
import {LOOP_GRADE_TRIANGLES as triangles} from './peak-tram-loop-grading-data.js';
import {peakTramLoopGrade} from './peak-tram-loop-grading-site.js';

// Replacement terrain inside the clipped union; vertices are a 1m tessellation,
// so grading follows the unchanged DTM at the outer edge rather than a trench wall.
export function buildPeakTramLoopGrading(scene){
 const positions=[],normals=[],cache=new Map();
 // Shapely emits counter-clockwise X/Z polygons, which face down in Three.js.
 // Reverse each triangle so the authored upward normals are not flipped on backfaces.
 for(let i=0;i<triangles.length;i+=6)for(const j of [0,4,2]){
  const x=triangles[i+j],z=triangles[i+j+1],key=`${x},${z}`;let v=cache.get(key);
  if(!v){const y=peakTramLoopGrade(x,z)-.08,e=.5;
   const nx=peakTramLoopGrade(x-e,z)-peakTramLoopGrade(x+e,z),nz=peakTramLoopGrade(x,z-e)-peakTramLoopGrade(x,z+e),len=Math.hypot(nx,2*e,nz);
   v=[y,nx/len,2*e/len,nz/len];cache.set(key,v);}
  positions.push(x,v[0],z);normals.push(v[1],v[2],v[3]);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.computeBoundingBox();geo.computeBoundingSphere();
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x4b5145,roughness:1,side:THREE.DoubleSide}));mesh.name='Peak Tram passing loop regraded hillside';mesh.receiveShadow=true;scene.add(mesh);
 return {mesh,stats:{peakTramLoopGradeTriangles:triangles.length/6}};
}
