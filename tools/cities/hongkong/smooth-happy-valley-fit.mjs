// Offline experiment only. Smooth the 720-point estimate circularly, with
// gentler smoothing near mapped at-grade approaches. Never imported by runtime.
import fs from 'node:fs';
const source=new URL('../../data/hongkong/happy-valley-experimental-fit.json',import.meta.url);
const target=process.argv[2] ?? new URL('../../data/hongkong/happy-valley-experimental-smooth-fit.json',import.meta.url);
const fit=JSON.parse(fs.readFileSync(source,'utf8'));
if(fit.status!=='experimental-not-used-in-runtime'||fit.points.length!==720)throw new Error('Unexpected source fit');
const n=fit.points.length;
function smooth(sigma) {
  const radius=Math.ceil(sigma*4), weights=[];
  for(let k=-radius;k<=radius;k++)weights.push(Math.exp(-.5*(k/sigma)**2));
  const sum=weights.reduce((a,b)=>a+b,0);
  return fit.points.map((_,i)=>[0,1].map(axis=>{
    let value=0;for(let k=-radius;k<=radius;k++)value+=weights[k+radius]*fit.points[(i+k+n)%n][axis];
    return value/sum;
  }));
}
const broad=smooth(12), local=smooth(3), lo=140,hi=270,fade=40;
const points=fit.points.map((_,i)=>{
  let weight=0;
  if(i>=lo && i<=hi)weight=1;
  else if(i<lo && i>=lo-fade)weight=(1+Math.cos(Math.PI*(lo-i)/fade))/2;
  else if(i>hi && i<=hi+fade)weight=(1+Math.cos(Math.PI*(i-hi)/fade))/2;
  return [0,1].map(axis=>+(broad[i][axis]*(1-weight)+local[i][axis]*weight).toFixed(4));
});
let length=0;for(let i=0;i<n;i++){let a=points[i],b=points[(i+1)%n];length+=Math.hypot(a[0]-b[0],a[1]-b[1]);}
fs.writeFileSync(target,JSON.stringify({status:'experimental-not-used-in-runtime',description:'Blended circular Gaussian smoothing of 720-point experimental candidate. Estimate only, not surveyed or approved for runtime.',source:'happy-valley-experimental-fit.json',sigmaStations:[12,3],localStations:[lo,hi],fadeStations:fade,centrelineMetres:+length.toFixed(2),trackWidthMetres:30.5,points})+'\n');
console.log(`Wrote ${target.pathname ?? target}, ${length.toFixed(2)} m`);
