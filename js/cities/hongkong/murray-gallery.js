import {MURRAY_STAIRS as S} from './murray-stairs.js';
import {MURRAY_RAMP as R,murrayRampLocalHeight} from './murray-ramp.js';
import * as THREE from 'three/webgpu';
import {MURRAY_SITE as SITE} from './murray-architecture.js';
import {authoredWorldToLocal} from './authored-landmark-site.js';
import {harbourCityLocalCollider} from './harbour-city-architecture.js';
import {box,merged,store,quad,meshStore} from './harbour-city-world-utils.js';

// Foster's published 01-floor plan shows circulation along the long sides of the
// core, joined at the tree-side short end. Coordinates and elevation here are
// illustrative and NOT traced or surveyed; this is not the former sloping ramp.
export const MURRAY_GALLERY=Object.freeze({floor:-.14,xInner:5.5,xOuter:10.5,zTurn:-20,zEnd:20});
// Approximate pedestrian link to the existing straight ramp; not an as-built plan.
export const MURRAY_GALLERY_LINK=Object.freeze({x0:6.5,xFlat:10.5,x1:(R.x0+R.x1)/2,z0:20,z1:22.5});
export function isMurrayGalleryLinkLocal(x,z){const l=MURRAY_GALLERY_LINK;return x>=l.x0&&x<=l.x1&&z>=l.z0&&z<=l.z1;}
export function murrayGalleryLinkLocalHeight(x,z){const l=MURRAY_GALLERY_LINK,t=Math.max(0,Math.min(1,(x-l.xFlat)/(l.x1-l.xFlat)));return MURRAY_GALLERY.floor*(1-t)+murrayRampLocalHeight(z)*t;}
export function isMurrayGalleryLocal(x,z){
 const g=MURRAY_GALLERY;
 if(x>=S.x0&&x<=S.x1&&z>=-18&&z<=S.z1)return false;
 return ((Math.abs(x)>=g.xInner&&Math.abs(x)<=g.xOuter&&z>=g.zTurn&&z<=g.zEnd)
  ||(Math.abs(x)<=g.xOuter&&z>=g.zTurn-1.5&&z<=g.zTurn+2.5)
  ||(x>=-1.6&&x<=g.xInner&&z>=-13.5&&z<=-11.3));
}
export function murrayGalleryGroundHeight(x,z,current,ref,datum){
 const p=authoredWorldToLocal(SITE,x,z);
 if(isMurrayGalleryLinkLocal(p.x,p.z)){const y=datum+murrayGalleryLinkLocalHeight(p.x,p.z);return Math.abs(ref-y)<2.5?y:current;}
 const y=datum+MURRAY_GALLERY.floor;
 return isMurrayGalleryLocal(p.x,p.z)&&Math.abs(ref-y)<2.5?y:current;
}
export function buildMurrayGallery(root,datum,colliders){
 const g=MURRAY_GALLERY,y=g.floor,floors=[],joints=[],rails=[],posts=[];
 const stone=new THREE.MeshStandardMaterial({color:0x767974,roughness:.8});
 const bronze=new THREE.MeshStandardMaterial({color:0x907c60,metalness:.55,roughness:.4});
 // Three pieces meet edge to edge around the core, plus a bridge to the lift.
 box(floors,[8,y-.15,1],[5,.3,38]);
 // Opening above the upper part of the stair: avoid a solid slab at head height.
 box(floors,[-8,y-.15,3.5],[5,.3,33]);
 box(floors,[-6.95,y-.15,-15.5],[2.9,.3,5]);
 box(floors,[-10.45,y-.15,-15.5],[.1,.3,5]);
 box(floors,[0,y-.15,-19.5],[21,.3,3]);
 box(floors,[1.95,y-.15,-12.4],[7.1,.3,2.2]);
 for(const x of [-8,8])for(let z=-17;z<=19;z+=2){if(x<0&&z<-13)continue;box(joints,[x,y+.008,z],[4.96,.015,.022]);}
 for(let x=-9;x<=9;x+=2)box(joints,[x,y+.008,-19.5],[.022,.015,2.96]);
 const wall=(x,z,w,d)=>{box(rails,[x,y+.98,z],[w,.06,d]);box(rails,[x,y+.16,z],[w,.08,d]);colliders.push(harbourCityLocalCollider(SITE,x,z,w,d,datum+y,datum+y+1.1));};
 for(const x of [-10.5,10.5])wall(x,1,.1,38);
 wall(-5.5,1,.1,38);
 // Opening on the inner east rail leads to the lift bridge.
 wall(5.5,-15.75,.1,4.5);wall(5.5,4.25,.1,31.5);
 wall(0,-21,21,.1);wall(0,-18,11,.1);
 wall(-8,20,5,.1);wall(6,20,1,.1);wall(10.25,20,.5,.1);
 // Bridge guardrails stop short of the lift opening and the adjoining gallery.
 wall(2.0,-13.5,7,.1);wall(3.6,-11.3,3.8,.1);
 for(const x of [-10.5,-5.5,5.5,10.5])for(let z=-17;z<20;z+=2){if(x===5.5&&z>-13.6&&z<-11.2)continue;box(posts,[x,y+.5,z],[.06,1,.06]);}
 for(let x=-10;x<=10;x+=2)box(posts,[x,y+.5,-21],[.06,1,.06]);
 const l=MURRAY_GALLERY_LINK,link=store();
 for(let z=l.z0;z<l.z1;z+=.5){const z1=Math.min(z+.5,l.z1);for(const [x0,x1] of [[l.x0,l.xFlat],[l.xFlat,l.x1]])quad(link,[x0,murrayGalleryLinkLocalHeight(x0,z),z],[x1,murrayGalleryLinkLocalHeight(x1,z),z],[x1,murrayGalleryLinkLocalHeight(x1,z1),z1],[x0,murrayGalleryLinkLocalHeight(x0,z1),z1],[.35,.36,.34]);}
 const linkMat=new THREE.MeshStandardMaterial({color:0x777b76,roughness:.85,side:THREE.DoubleSide});
 meshStore(root,link,linkMat,'The Murray provisional gallery ramp link',false);
 // Edge guards leave the ramp-side end open; each collider covers the sloping edge.
 for(const [x,z,w,d] of [[l.x0,(l.z0+l.z1)/2,.1,l.z1-l.z0],[(l.x0+11.2)/2,l.z1,11.2-l.x0,.1]]){
  box(rails,[x,y+.9,z],[w,.06,d]);colliders.push(harbourCityLocalCollider(SITE,x,z,w,d,datum+y-.55,datum+y+1.05));
 }
 merged(root,floors,stone,'The Murray 01 level circulation floor');merged(root,joints,bronze,'The Murray 01 level paving joints',false);merged(root,rails,bronze,'The Murray 01 level guardrails',false);merged(root,posts,bronze,'The Murray 01 level railing posts',false);
 return {floor:datum+y};
}
