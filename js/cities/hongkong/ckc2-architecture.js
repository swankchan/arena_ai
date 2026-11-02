// HK-B0023 Cheung Kong Center II: exact OSM footprint and independent architectural datums.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';
const geometry=(rows)=>Object.freeze(rows.map(([id,lon,lat])=>Object.freeze({id,lon,lat})));
export const CKC2_OSM_SOURCE=Object.freeze({attribution:'© OpenStreetMap contributors',license:'ODbL 1.0',retrieved:'2026-11-02',sourceUrl:'https://api.openstreetmap.org/api/0.6/way/1272960455/full.json',type:'way',id:1272960455,version:2,
  tags:Object.freeze({building:'commercial','building:levels':'41','building:material':'glass','construction:building':'office',height:'205',name:'長江集團中心二期 Cheung Kong Center II','name:en':'Cheung Kong Center II','name:zh':'長江集團中心二期 Cheung Kong Center II'}),
  geometry:geometry([[11821134978,114.1623249,22.2810132],[11821134979,114.1623132,22.2810326],[6967980723,114.1623597,22.2811853],[11821134982,114.1623781,22.2812456],[11821134984,114.1623991,22.2812563],[11821134983,114.1628427,22.2811405],[11821134981,114.1628545,22.2811211],[6967980728,114.1627896,22.2809082],[11821134980,114.1627686,22.2808974],[11821134978,114.1623249,22.2810132]])});
const KX=103056.81753522092,KY=110734.09626824585,project=(lon,lat)=>[(lon-114.1596)*KX,-(lat-22.2819)*KY];
const worldRing=Object.freeze(CKC2_OSM_SOURCE.geometry.flatMap(({lon,lat})=>project(lon,lat))),footprint=minimumAreaObb(worldRing);
let signedArea=0;for(let i=0;i+3<worldRing.length;i+=2)signedArea+=worldRing[i]*worldRing[i+3]-worldRing[i+2]*worldRing[i+1];
export const CKC2_RING_AREA=Math.abs(signedArea*.5);
export const CKC2_SITE=Object.freeze({name:'長江集團中心二期 Cheung Kong Center II',englishName:'Cheung Kong Center II',address:'夏慤道10號 10 Harcourt Road',osmType:'way',osmId:CKC2_OSM_SOURCE.id,source:CKC2_OSM_SOURCE,ring:worldRing,bounds:flatRingBounds(worldRing),...footprint});
export function ckc2LocalToWorld(x,z){const s=CKC2_SITE,cs=Math.cos(s.ry),sn=Math.sin(s.ry);return{x:s.x+cs*x+sn*z,z:s.z-sn*x+cs*z};}
export function ckc2WorldToLocal(x,z){const s=CKC2_SITE,cs=Math.cos(s.ry),sn=Math.sin(s.ry),dx=x-s.x,dz=z-s.z;return{x:dx*cs-dz*sn,z:dx*sn+dz*cs};}
export const CKC2_LOCAL_RING=Object.freeze(worldRing.flatMap((v,i,a)=>{if(i%2)return[];const p=ckc2WorldToLocal(v,a[i+1]);return[p.x,p.z];}));
export const CKC2_GROUND_SAMPLE=Object.freeze({x:CKC2_SITE.x,z:CKC2_SITE.z});
export const CKC2_OSM_HEIGHT=205,CKC2_CTBUH_HEIGHT=205.5,CKC2_DLN_HEIGHT=205.510,CKC2_HEIGHT=205.510,CKC2_OCCUPIED_HEIGHT=194;
export const CKC2_OSM_LEVELS=41,CKC2_OFFICIAL_LEVELS=41,CKC2_COMPLETION_YEAR=2024,CKC2_STRUCTURE='Concrete-Steel Composite';
export const CKC2_SITE_AREA=3056.509,CKC2_GFA=45847,CKC2_OFFICE_AREA=45534,CKC2_COMMERCIAL_AREA=312,CKC2_PODIUM_FLOORS=5,CKC2_BASEMENT_FLOORS=3,CKC2_PARKING_SPACES=178;
export const CKC2_PUBLISHED_GFA=51096.7,CKC2_PUBLISHED_GFA_SQFT=550000,CKC2_ARCHITECT='DLN Architects Limited';
export const CKC2_PLAZA_TOP=.12,CKC2_JUMBO_GLASS_TOP=18,CKC2_PODIUM_TOP=30,CKC2_OFFICE_TOP=194,CKC2_OFFICE_COURSES=36,CKC2_PANEL_WIDTH=1.55,CKC2_PODIUM_PANEL_WIDTH=3.8;
export const CKC2_BELT_LEVELS=Object.freeze([86,143]),CKC2_BELT_HEIGHT=4.2,CKC2_SIGN_BAND_BASE=199,CKC2_ENTRANCE_EDGE=4;
export function ckc2EdgeOutward(ring,edge){const i=edge*2,ax=ring[i],az=ring[i+1],bx=ring[i+2],bz=ring[i+3],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz)||1;let area=0;for(let j=0;j+3<ring.length;j+=2)area+=ring[j]*ring[j+3]-ring[j+2]*ring[j+1];const sign=area>=0?1:-1;return{nx:dz/length*sign,nz:-dx/length*sign,length,ry:Math.atan2(-dz,dx)};}
function edgeFrame(ring,edge){const i=edge*2,ax=ring[i],az=ring[i+1],bx=ring[i+2],bz=ring[i+3],localX=(ax+bx)*.5,localZ=(az+bz)*.5,world=ckc2LocalToWorld(localX,localZ),data=ckc2EdgeOutward(ring,edge),cs=Math.cos(CKC2_SITE.ry),sn=Math.sin(CKC2_SITE.ry),nx=cs*data.nx+sn*data.nz,nz=-sn*data.nx+cs*data.nz;return Object.freeze({edge,localX,localZ,x:world.x,z:world.z,ry:Math.atan2(nx,nz),nx,nz,evidence:'Photo- and address-directed Harcourt Road jumbo-glass lobby entrance; OSM has no entrance-tagged node'});}
export const CKC2_ENTRANCE=edgeFrame(CKC2_LOCAL_RING,CKC2_ENTRANCE_EDGE),CKC2_ENTRANCE_FORECOURT_WIDTH=14,CKC2_ENTRANCE_FORECOURT_DEPTH=3.2;
export function ckc2FrameToWorld(frame,x,z){const cs=Math.cos(frame.ry),sn=Math.sin(frame.ry);return{x:frame.x+cs*x+sn*z,z:frame.z-sn*x+cs*z};}
export function ckc2LocalCollider(x,z,w,d,minY,maxY,ry=CKC2_SITE.ry){const p=ckc2LocalToWorld(x,z),cs=Math.cos(ry),sn=Math.sin(ry),hx=w*.5,hz=d*.5;return{shape:'box',x:p.x,z:p.z,w,d,ry,minY,maxY,minX:p.x-Math.abs(cs)*hx-Math.abs(sn)*hz,maxX:p.x+Math.abs(cs)*hx+Math.abs(sn)*hz,minZ:p.z-Math.abs(sn)*hx-Math.abs(cs)*hz,maxZ:p.z+Math.abs(sn)*hx+Math.abs(cs)*hz,obb:{cx:p.x,cz:p.z,hx,hz,cs,sn}};}
export function ckc2EdgeCollider(ring,edge,minY,maxY,depth=.62){const i=edge*2,ax=ring[i],az=ring[i+1],bx=ring[i+2],bz=ring[i+3],{ry,length}=ckc2EdgeOutward(ring,edge);return ckc2LocalCollider((ax+bx)*.5,(az+bz)*.5,length+.03,depth,minY,maxY,CKC2_SITE.ry+ry);}
export function ckc2RingColliders(ring,minY,maxY,depth=.62){const out=[];for(let edge=0;edge<ring.length/2-1;edge++)out.push(ckc2EdgeCollider(ring,edge,minY,maxY,depth));return out;}
export function ckc2FrameCollider(frame,x,z,w,d,minY,maxY,base=0){const p=ckc2FrameToWorld(frame,x,z),ry=frame.ry,cs=Math.cos(ry),sn=Math.sin(ry),hx=w*.5,hz=d*.5;return{shape:'box',x:p.x,z:p.z,w,d,ry,minY:minY+base,maxY:maxY+base,minX:p.x-Math.abs(cs)*hx-Math.abs(sn)*hz,maxX:p.x+Math.abs(cs)*hx+Math.abs(sn)*hz,minZ:p.z-Math.abs(sn)*hx-Math.abs(cs)*hz,maxZ:p.z+Math.abs(sn)*hx+Math.abs(cs)*hz,obb:{cx:p.x,cz:p.z,hx,hz,cs,sn}};}
export function isCkc2EntranceForecourtPoint(x,z){const f=CKC2_ENTRANCE,cs=Math.cos(f.ry),sn=Math.sin(f.ry),dx=x-f.x,dz=z-f.z,lx=cs*dx-sn*dz,lz=sn*dx+cs*dz;return Math.abs(lx)<=CKC2_ENTRANCE_FORECOURT_WIDTH*.5+1e-9&&lz>=-.2&&lz<=CKC2_ENTRANCE_FORECOURT_DEPTH;}
export function isCkc2PlazaPoint(x,z){if(isCkc2EntranceForecourtPoint(x,z))return true;const r=CKC2_SITE.ring;if(pointInFlatRing(r,x,z))return true;for(let i=0;i+3<r.length;i+=2){const ax=r[i],az=r[i+1],dx=r[i+2]-ax,dz=r[i+3]-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l)):0;if(Math.hypot(x-ax-dx*t,z-az-dz*t)<1e-7)return true;}return false;}
export function ckc2GroundHeightAt(x,z,ground,grounds){return isCkc2PlazaPoint(x,z)?grounds.plaza:ground;}
