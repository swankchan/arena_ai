// Local model-only cut under the existing provisional racing surface.
// The racecourse lawn covers this cut; the existing tunnel openings stay open.
// This is not surveyed grading or a replacement for fixing the track alignment.
import { HAPPY_VALLEY_SITE as site,HAPPY_VALLEY_TRACK as track,happyValleyTrackPoint } from '../../js/cities/hongkong/happy-valley-racecourse-architecture.js';
const c=Math.cos(site.ry),s=Math.sin(site.ry);
const world=p=>({x:site.x+c*p.x+s*p.z,z:site.z-s*p.x+c*p.z});
export function happyValleyTrackTerrainCuts() {
  const cuts=[],segments=360;
  for(let i=0;i<segments;i++) {
    const a=world(happyValleyTrackPoint(i/segments,-track.width/2));
    const b=world(happyValleyTrackPoint((i+1)/segments,-track.width/2));
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(len<.01)continue;
    const ux=dx/len,uz=dz/len,cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,hx=len/2+1,hz=track.width/2+.55;
    const ex=Math.abs(ux)*hx+Math.abs(uz)*hz,ez=Math.abs(uz)*hx+Math.abs(ux)*hz;
    cuts.push({cx,cz,ux,uz,hx,hz,minX:cx-ex,maxX:cx+ex,minZ:cz-ez,maxZ:cz+ez,routeId:'happy-valley-provisional-track'});
  }
  return cuts;
}
