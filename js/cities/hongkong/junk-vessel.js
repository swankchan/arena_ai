import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import { nightAmount } from './harbour-city-world-utils.js';

// A fictional harbour junk inspired by the 28 m, two-deck, three-sail Aqua Luna.
// All dimensions except length are visual estimates; +Z is the bow and y=0 is the waterline.
export const JUNK_DIMENSIONS = Object.freeze({ length: 28, beam: 6.8, height: 18, draft: 1.15 });
export const JUNK_ROUTE = Object.freeze({ x: -350, z: -1150, rx: 185, rz: 111, angularSpeed: 0.028 });
export function sampleJunkRoute(angle) {
  const x = JUNK_ROUTE.x + Math.cos(angle) * JUNK_ROUTE.rx;
  const z = JUNK_ROUTE.z + Math.sin(angle) * JUNK_ROUTE.rz;
  return { x, z, heading: Math.atan2(-Math.sin(angle) * JUNK_ROUTE.rx, Math.cos(angle) * JUNK_ROUTE.rz) };
}

function mesh(parent, geometry, material, name, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material); object.name = name; object.position.set(...position);
  object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
function box(parent, material, name, x, y, z, w, h, d) {
  return mesh(parent, new THREE.BoxGeometry(w, h, d), material, name, [x, y, z]);
}
function rod(parent, material, name, a, b, r = .045) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), d = to.clone().sub(from);
  const part = mesh(parent, new THREE.CylinderGeometry(r, r, d.length(), 6), material, name);
  part.position.copy(from.add(to).multiplyScalar(.5)); part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return part;
}
 // Plan-view sections create a narrow raised bow, fuller midships and a lifted squared stern.
const HULL_SECTIONS = [
    [-14,1.8,2.45,.35],[-12,2.65,2.15,-.65],[-9,3.18,1.8,-1.05],[-4,3.4,1.55,-1.15],
    [2,3.35,1.55,-1.15],[7,2.95,1.75,-.9],[11,1.95,2.15,-.25],[14,.35,2.85,1.3]
  ];
function hullGeometry() {
  const sections = HULL_SECTIONS, p = [], indices = [];
  for (const [z, half, top, bottom] of sections) p.push(-half,top,z, half,top,z, -half*.68,bottom,z, half*.68,bottom,z);
  for (let i = 0; i < sections.length - 1; i++) {
    const a = 4*i, b = a+4;
    indices.push(a,b,a+2, b,b+2,a+2, a+1,a+3,b+1, b+1,a+3,b+3, a+2,b+2,a+3, b+2,b+3,a+3);
  }
  indices.push(0,2,1,1,2,3);
  const n = (sections.length - 1)*4; indices.push(n,n+1,n+2,n+1,n+3,n+2);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p,3)); g.setIndex(indices); g.computeVertexNormals();
  return g;
}
function addSail(group, mastZ, base, height, length, sailMat, sparMat, index) {
  // Broad lug sail, made of separate curved fabric panels, with dark battens along its length.
  const levels = 6, positions = [], indexes = [];
  const edge = (t) => ({ y: base + height*t, lead: mastZ + length*(.23 - .11*t), trail: mastZ - length*(.76 - .52*t) });
  for (let row = 0; row <= levels; row++) {
    const t = row/levels, e = edge(t);
    for (let col = 0; col <= 6; col++) {
      const f = col/6, z = e.lead + (e.trail-e.lead)*f;
      positions.push(Math.sin(Math.PI*f)*Math.sin(Math.PI*t)*.28, e.y, z);
    }
  }
  for (let row = 0; row < levels; row++) for (let col=0; col<6; col++) {
    const a=row*7+col, b=a+7; indexes.push(a,b,a+1,a+1,b,b+1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); g.setIndex(indexes); g.computeVertexNormals();
  mesh(group,g,sailMat,`Junk sail ${index} — curved crimson fabric`);
  rod(group,sparMat,`Junk mast ${index}`,[0,1.55,mastZ],[0,base+height+.8,mastZ],.11);
  for (let i=0;i<=levels;i++) {
    const e=edge(i/levels); rod(group,sparMat,`Junk sail ${index} batten ${i}`,[0,e.y,e.lead+.12],[0,e.y,e.trail-.12],.048);
  }
  rod(group,sparMat,`Junk sail ${index} rigging`,[0,base+height+.7,mastZ],[1.9,1.8,mastZ-3],.018);
  rod(group,sparMat,`Junk sail ${index} rigging`,[0,base+height+.7,mastZ],[-1.9,1.8,mastZ+2],.018);
}
export function createJunkVessel() {
  const group = new THREE.Group(); group.name = 'RedSailedJunk';
  const wood = new THREE.MeshStandardMaterial({color:0x51301c,roughness:.78,metalness:.05,side:THREE.DoubleSide});
  const trim = new THREE.MeshStandardMaterial({color:0x9a6740,roughness:.72});
  const deck = new THREE.MeshStandardMaterial({color:0x8d633d,roughness:.85});
  const dark = new THREE.MeshStandardMaterial({color:0x241710,roughness:.8});
  const glazing = new THREE.MeshStandardNodeMaterial({color:0x352b20,roughness:.4,metalness:.1,side:THREE.DoubleSide});
  glazing.emissiveNode = color(0xffb56e).mul(nightAmount()).mul(.65);
  const sail = new THREE.MeshStandardNodeMaterial({color:0x9d1716,roughness:.8,side:THREE.DoubleSide});
  sail.emissiveNode = color(0xbd1710).mul(nightAmount()).mul(.35);
  const lamp = new THREE.MeshStandardNodeMaterial({color:0xffd899,roughness:.5});
  lamp.emissiveNode = color(0xffb85e).mul(nightAmount()).mul(2.2);
  mesh(group,hullGeometry(),wood,'Junk curved wooden hull');
  for (const side of [-1, 1]) for (const t of [.2, .4, .6, .8]) {
    for (let i = 0; i < HULL_SECTIONS.length - 1; i++) {
      const point = ([z, half, top, bottom]) => [side * (half * (1 - .32*t) + .012), top + (bottom-top)*t, z];
      rod(group, trim, 'Hull timber strake', point(HULL_SECTIONS[i]), point(HULL_SECTIONS[i+1]), .026);
    }
  }
  box(group,deck,'Junk main timber deck',0,1.52,-1,5.6,.18,21);
  // Timber strakes and rails follow the outer hull; low handrails do not block the water surface.
  for (const side of [-1,1]) {
    rod(group,trim,'Junk long gunwale',[side*1.8,2.5,-14],[side*3.25,1.8,-7],.09);
    rod(group,trim,'Junk long gunwale',[side*3.25,1.8,-7],[side*3.1,1.8,7],.09);
    rod(group,trim,'Junk bow gunwale',[side*3.1,1.8,7],[side*.35,2.9,14],.09);
    for (let z=-11;z<=10;z+=1.5) {
      const x=side*(z>7?2.4:3.0); rod(group,dark,'Deck railing post',[x,1.7,z],[x,2.55,z],.035);
    }
    rod(group,dark,'Deck handrail',[side*3,2.55,-11],[side*3,2.55,7],.045);
    for (let z=-8;z<=-2;z+=2.2) {
      box(group,trim,'Cabin timber window frame',side*2.15,2.95,z,.16,1.7,1.9);
      box(group,glazing,'Warm cabin windows',side*2.25,3.05,z,.06,1.05,1.5);
    }
  }
  box(group,wood,'Aft covered saloon',0,2.55,-5.2,4.4,1.8,9);
  box(group,deck,'Upper lounge deck',0,3.5,-5.4,4.8,.18,9.1);
  for (const x of [-1.6,1.6]) for (const z of [-8,-5.7,-3.4]) box(group,dark,'Upper lounge seat',x,3.75,z,1,.35,1.55);
  for (const x of [-2,2]) for (const z of [-9,-2]) rod(group,trim,'Upper deck canopy upright',[x,3.6,z],[x,5.35,z],.055);
  box(group,wood,'Aft upper deck canopy',0,5.4,-5.5,4.4,.22,7.6);
  for (const x of [-1.5,1.5]) for (const z of [-8,-4]) box(group,lamp,'Warm deck light',x,5.25,z,.24,.09,.24);
  // Three differently sized, battened red lug sails; their cloth is lit gently at night.
  addSail(group,8,3.0,9.1,6.0,sail,dark,1);
  addSail(group,1,3.2,13.5,8.2,sail,dark,2);
  addSail(group,-10,5.1,5.7,3.7,sail,dark,3);
  for (const side of [-1,1]) {
    const ring = mesh(group,new THREE.TorusGeometry(.46,.09,8,24),new THREE.MeshStandardMaterial({color:0xe45c29,roughness:.7}),'Orange lifebuoy',[side*2.95,2.3,-6]);
    ring.rotation.y=Math.PI/2;
  }
  return group;
}
