import * as THREE from 'three/webgpu';
import {PEAK_TOWER_SITE as SITE,PEAK_TOWER_BASE as BASE} from './peak-tower-architecture.js';
import {PEAK_UPPER_STATION as S} from './peak-upper-station-site.js';
import {authoredLocalToWorld} from './authored-landmark-site.js';
import {hongKongTerrainHeight} from './terrain.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,merged,store,quad,meshStore} from './harbour-city-world-utils.js';

// Static platform and short track section only: neither a full station nor a working tram.
export function buildPeakUpperStation(root,colliders){
 const stone=new THREE.MeshStandardMaterial({color:0x7f827b,roughness:.87}),metal=new THREE.MeshStandardMaterial({color:0x9ca6a4,roughness:.4,metalness:.65}),track=new THREE.MeshStandardMaterial({color:0x454741,roughness:.9}),glass=new THREE.MeshStandardMaterial({color:0x859a98,roughness:.3,metalness:.22,transparent:true,opacity:.4,side:THREE.DoubleSide}),yellow=new THREE.MeshStandardMaterial({color:0xd2b560,roughness:.8});
 const platforms=[],rails=[],sleepers=[],posts=[],panes=[],strips=[],bed=[],retaining=store();
 const {x0,x1,z0,z1,trackZ}=S,mid=(x0+x1)/2,len=x1-x0;
 for(const [a,b] of [[z0,trackZ-1.25],[trackZ+1.25,z1]]){
  box(platforms,[mid,-.13,(a+b)/2],[len,.26,b-a]);
  // Riser skirt is fitted to the DTM on the platform's exposed outside edge.
  const z=a===z0?a:b;
  for(let x=x0;x<x1;x+=1){let xx=Math.min(x+1,x1),p=authoredLocalToWorld(SITE,x,z),q=authoredLocalToWorld(SITE,xx,z),h=hongKongTerrainHeight(p.x,p.z)-BASE,k=hongKongTerrainHeight(q.x,q.z)-BASE;quad(retaining,[x,h,z],[xx,k,z],[xx,-.13,z],[x,-.13,z],[.40,.41,.38]);}
 }
 box(bed,[mid,-.68,trackZ],[len,.2,2.5]);
 for(const z of [trackZ-S.gauge/2,trackZ+S.gauge/2])box(rails,[mid,-.48,z],[len,.16,.10]);
 for(let x=x0+.35;x<x1;x+=.75)box(sleepers,[x,-.58,trackZ],[.16,.10,2.18]);
 // Transparent guard panels on both platforms, matching the photographed modernised station.
 for(const z of [trackZ-1.28,trackZ+1.28]){
  box(strips,[mid,.012,z+(z<trackZ?-.25:.25)],[len,.024,.12]);
  for(let x=x0;x<x1;x+=2){let next=Math.min(x+2,x1);box(posts,[x,.58,z],[.075,1.16,.075]);box(panes,[(x+next)/2,.59,z],[next-x-.12,1.0,.035]);}
  box(posts,[x1,.58,z],[.075,1.16,.075]);box(posts,[mid,1.17,z],[len,.07,.07]);
  colliders.push(harbourCityLocalCollider(SITE,mid,z,len,.10,BASE,BASE+1.2));
 }
 merged(root,platforms,stone,'Peak Tram upper terminus platforms');merged(root,bed,track,'Peak Tram upper terminus track bed');
 merged(root,rails,metal,'Peak Tram upper terminus rails');merged(root,sleepers,track,'Peak Tram upper terminus sleepers');
 merged(root,posts,metal,'Peak Tram upper terminus safety barrier posts');merged(root,panes,glass,'Peak Tram upper terminus transparent barriers',false);merged(root,strips,yellow,'Peak Tram upper terminus platform edge strips',false);
 meshStore(root,retaining,stone,'Peak Tram upper terminus retaining edges');
 return {x0,x1,trackZ,platformY:S.platformY};
}
