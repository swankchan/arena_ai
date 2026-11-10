// Offline only: difference original 70m terrain triangles against an 8m inset of the OSM site.
// Not used by runtime; edge seams, roads and physics remain unresolved.
import fs from 'node:fs';
import clip from 'polygon-clipping';
import earcut from 'earcut';
import {HAPPY_VALLEY_SITE as site} from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import {HONG_KONG_TERRAIN_META as meta} from '../../../js/cities/hongkong/terrain.js';
const oneMetre=process.argv.includes('--1m');
let g=meta.grid,b=site.bounds;let shape=[[JSON.parse(fs.readFileSync(new URL(oneMetre?'../../data/hongkong/happy-valley-inset-1m-experiment.json':'../../data/hongkong/happy-valley-inset-experiment.json', import.meta.url)))]];let out={};
for(let j=Math.floor((b.minZ-g.minZ)/g.cell);j<=Math.floor((b.maxZ-g.minZ)/g.cell);j++)for(let i=Math.floor((b.minX-g.minX)/g.cell);i<=Math.floor((b.maxX-g.minX)/g.cell);i++){
let x=g.minX+i*g.cell,z=g.minZ+j*g.cell,w=g.cell;let tris=[[[x,z],[x,z+w],[x+w,z]],[[x+w,z],[x,z+w],[x+w,z+w]]];
for(let k=0;k<2;k++){
 let tri=tris[k],result=clip.difference([[ [...tri,tri[0]] ]],shape),ret=[];
 for(const poly of result){let flat=[],holes=[];for(let r=0;r<poly.length;r++){if(r)holes.push(flat.length/2);let ring=poly[r];for(let q=0;q<ring.length-1;q++)flat.push(...ring[q]);}let indices=earcut(flat,holes,2);for(let t=0;t<indices.length;t+=3)ret.push([indices[t],indices[t+2],indices[t+1]].map(n=>[flat[n*2],flat[n*2+1]]));}
 out[`${i},${j},${k}`]=ret;
}}
process.stdout.write('export const '+(oneMetre?'inset1mCutTriangles':'insetCutTriangles')+'='+JSON.stringify(out)+';\n');
