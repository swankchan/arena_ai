// Offline plan-view intersection of the tessellated candidate strip against
// OSM polygons. Does not test roads in 3D, elevation, rails, or swept vehicles.
import fs from 'node:fs';
import polygonClipping from 'polygon-clipping';
import { makeFrame } from '../../geo/frame.mjs';
import cfg from './config.mjs';
import { HAPPY_VALLEY_SITE as site } from '../../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';
const fit=JSON.parse(fs.readFileSync(process.argv[2] ?? new URL('../../data/hongkong/happy-valley-experimental-smooth-fit.json',import.meta.url)));
if(fit.status!=='experimental-not-used-in-runtime'||fit.points.length!==720)throw new Error('Expected offline candidate');
const frame=makeFrame(cfg.frame), n=fit.points.length,c=Math.cos(site.ry),s=Math.sin(site.ry);
const world=(x,z)=>[site.x+c*x+s*z,site.z-s*x+c*z];
const polygon=ring=>[ring];
const close=ring=>{const result=ring.map(p=>[...p]);if(result[0][0]!==result.at(-1)[0]||result[0][1]!==result.at(-1)[1])result.push([...result[0]]);return result;};
const bounds=ring=>({minX:Math.min(...ring.map(p=>p[0])),maxX:Math.max(...ring.map(p=>p[0])),minZ:Math.min(...ring.map(p=>p[1])),maxZ:Math.max(...ring.map(p=>p[1]))});
const overlap=(a,b)=>a.minX<=b.maxX&&a.maxX>=b.minX&&a.minZ<=b.maxZ&&a.maxZ>=b.minZ;
const area=poly=>poly.reduce((sum,p)=>sum+p.reduce((a,r,i)=>{let twice=0;for(let j=1;j<r.length;j++)twice+=r[j-1][0]*r[j][1]-r[j][0]*r[j-1][1];return a+(i?-1:1)*Math.abs(twice)/2;},0),0);
const fromFile=name=>JSON.parse(fs.readFileSync(new URL(`../../data/hongkong/${name}.json`,import.meta.url))).elements;
const pitches=fromFile('parks').filter(e=>e.type==='way'&&e.tags?.leisure==='pitch'&&e.geometry?.length>=4)
 .map(e=>({id:e.id,ring:close(e.geometry.map(p=>frame.toWorld(p.lon,p.lat)))}))
 .filter(p=>p.ring.some(([x,z])=>pointInFlatRing(site.ring,x,z)));
const ids=new Set([494027781,1356276114,1356276115,1356276116,1356276117,1356276118]);
const stands=fromFile('landmarks').filter(e=>e.type==='way'&&ids.has(e.id)).map(e=>({id:e.id,ring:close(e.geometry.map(p=>frame.toWorld(p.lon,p.lat)))}));
if(stands.length!==6)throw new Error('Missing stands');
for(const p of [...pitches,...stands])p.bounds=bounds(p.ring);
const siteRing=close(Array.from({length:site.ring.length/2},(_,i)=>site.ring.slice(i*2,i*2+2))),sitePoly=polygon(siteRing);
const edge=(i,side)=>{const p=fit.points[i],prev=fit.points[(i+n-1)%n],next=fit.points[(i+1)%n],dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz);if(len<1e-6)throw new Error('Degenerate candidate');return world(p[0]-dz/len*15.25*side,p[1]+dx/len*15.25*side);};
let outside=0;const pitchHits=new Map(),standHits=new Map();
for(let i=0;i<n;i++){
 const next=(i+1)%n,quad=close([edge(i,1),edge(next,1),edge(next,-1),edge(i,-1)]),shape=polygon(quad),box=bounds(quad);
 outside+=area(polygonClipping.difference(shape,sitePoly));
 for(const [items,hits] of [[pitches,pitchHits],[stands,standHits]])for(const item of items){
   if(!overlap(box,item.bounds))continue;const a=area(polygonClipping.intersection(shape,polygon(item.ring)));
   if(a>1e-6)hits.set(item.id,(hits.get(item.id)??0)+a);
 }
}
const rounded=map=>Object.fromEntries([...map].map(([k,v])=>[k,+v.toFixed(3)]));
console.log(JSON.stringify({status:fit.status,quads:n,trackWidthMetres:30.5,pitchesChecked:pitches.length,standsChecked:stands.length,outsideSquareMetres:+outside.toFixed(3),pitchIntersectionsSquareMetres:rounded(pitchHits),standIntersectionsSquareMetres:rounded(standHits),caveat:'Plan-view intersections of 720 straight quads and mapped polygons only; excludes roads, railings, height, curves between stations, survey and vehicle sweeps.'},null,2));
