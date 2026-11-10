// Local reconstruction of full-world terrain triangles, limited to the venue.
// Useful for visual/raycast regression; does not include full world, coast or
// every authored earthwork and must not be used as game terrain.
import * as THREE from 'three/webgpu';
import {insetCutTriangles} from './happy-valley-inset-cut-data.js';
import {siteCutTriangles} from './happy-valley-site-cut-data.js';
import {HAPPY_VALLEY_SITE as site} from '../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import {HONG_KONG_TERRAIN_META as meta,hongKongTerrainHeight} from '../../js/cities/hongkong/terrain.js';
import {TERRAIN_TUNNEL_OPENING_RECTS} from '../../js/cities/hongkong/road-elevation.js';
import {buildTunnelOpeningRects,subtractTunnelOpenings} from '../../js/cities/hongkong/tunnel-openings.js';
import {happyValleyTrackTerrainCuts} from './happy-valley-experimental-terrain-cut.js';
import {happyValleyTrackTerrainGrade} from './happy-valley-experimental-terrain-grade.js';
export function buildLocalTerrain({cutTrack=false,grade=false,siteCut=false,insetCut=false}={}){
 if((siteCut && (grade || cutTrack || insetCut)) || (insetCut && (grade || cutTrack))) throw new Error("Site-cut comparison cannot be combined with the other offline experiments");
 const grid=meta.grid, pad=80, b=site.bounds;
 const minI=Math.floor((b.minX-pad-grid.minX)/grid.cell),maxI=Math.ceil((b.maxX+pad-grid.minX)/grid.cell);
 const minJ=Math.floor((b.minZ-pad-grid.minZ)/grid.cell),maxJ=Math.ceil((b.maxZ+pad-grid.minZ)/grid.cell);
 const rects=[...TERRAIN_TUNNEL_OPENING_RECTS,...buildTunnelOpeningRects(),...(cutTrack?happyValleyTrackTerrainCuts():[])].filter(r=>r.maxX>=b.minX-pad&&r.minX<=b.maxX+pad&&r.maxZ>=b.minZ-pad&&r.minZ<=b.maxZ+pad);
 const positions=[];
 const base=(x,z)=>{
  const ix=Math.floor((x-grid.minX)/grid.cell),iz=Math.floor((z-grid.minZ)/grid.cell),u=(x-grid.minX)/grid.cell-ix,v=(z-grid.minZ)/grid.cell-iz;
  const h=(i,j)=>hongKongTerrainHeight(grid.minX+i*grid.cell,grid.minZ+j*grid.cell)-.08;
  const a=h(ix,iz),b=h(ix+1,iz),c=h(ix,iz+1),d=h(ix+1,iz+1);
  return u+v<=1?a+u*(b-a)+v*(c-a):d*(u+v-1)+b*(1-v)+c*(1-u);
 };
 const height=(x,z)=>grade?happyValleyTrackTerrainGrade(x,z,base(x,z),meta.happyValleyPadHeight-.08):hongKongTerrainHeight(x,z)-.08;
 for(let j=minJ;j<maxJ;j++)for(let i=minI;i<maxI;i++){
  const x=grid.minX+i*grid.cell,z=grid.minZ+j*grid.cell,w=grid.cell,N=grade?7:1;
  for(let v=0;v<N;v++)for(let u=0;u<N;u++){
   const x0=x+u*w/N,z0=z+v*w/N,step=w/N;
   for(const [k,tri] of [[[x0,z0],[x0,z0+step],[x0+step,z0]],[[x0+step,z0],[x0,z0+step],[x0+step,z0+step]]].entries()) {
    const cut=siteCut ? siteCutTriangles[`${i},${j},${k}`] : insetCut ? insetCutTriangles[`${i},${j},${k}`] : undefined;
    for(const piece of cut??[tri]) for(const poly of subtractTunnelOpenings(piece,rects))for(let k=1;k+1<poly.length;k++)for(const [X,Z] of [poly[0],poly[k],poly[k+1]])positions.push(X,height(X,Z),Z);
   }
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x8a8968,side:THREE.DoubleSide}));mesh.name='LocalTerrainFixture';return mesh;
}
