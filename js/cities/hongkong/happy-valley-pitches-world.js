// Eight mapped recreation-ground pitches. Other fields require racecourse realignment.
import * as THREE from 'three/webgpu';
import { HAPPY_VALLEY_SITE } from './happy-valley-racecourse-architecture.js';
import { HAPPY_VALLEY_PITCH_SOURCES } from './happy-valley-pitches-data.js';
import { localRingFromWorld, worldRingFromGeometry } from './authored-landmark-site.js';
import { roofGeometry, merged, beam } from './harbour-city-world-utils.js';

export const HAPPY_VALLEY_PITCHES = HAPPY_VALLEY_PITCH_SOURCES.map((source) => ({
  ...source, ring: worldRingFromGeometry(source.geometry),
  localRing: localRingFromWorld(HAPPY_VALLEY_SITE, worldRingFromGeometry(source.geometry)),
}));

// Mapped corners are nearly rectangular; the longest edge defines the play axis.
export function happyValleyPitchFrame(pitch) {
  const ring = pitch.localRing;
  const points = Array.from({length: 4}, (_, i) => ({ x: ring[2*i], z: ring[2*i+1] }));
  let longest = 0;
  for (let i = 1; i < 4; i++) if (Math.hypot(points[(i+1)%4].x-points[i].x, points[(i+1)%4].z-points[i].z) >
    Math.hypot(points[(longest+1)%4].x-points[longest].x, points[(longest+1)%4].z-points[longest].z)) longest = i;
  const a = points[longest], b = points[(longest+1)%4], c = points[(longest+3)%4];
  return { a, b, c, length: Math.hypot(b.x-a.x,b.z-a.z), width: Math.hypot(c.x-a.x,c.z-a.z) };
}

// The two seven-a-side pitches together form one multi-use hockey area. The
// marked rectangle and its exact location are inferred, not a surveyed layout.
export function happyValleyCombinedHockeyFrame() {
  const nine = HAPPY_VALLEY_PITCHES.find(p => p.id === 680858152).localRing;
  const ten = HAPPY_VALLEY_PITCHES.find(p => p.id === 680858151).localRing;
  const a={x:nine[0],z:nine[1]}, b={x:ten[6],z:ten[7]};
  const c={x:nine[2],z:nine[3]}, d={x:ten[4],z:ten[5]};
  const ux=b.x-a.x, uz=b.z-a.z, ulen=Math.hypot(ux,uz);
  const vx=c.x-a.x, vz=c.z-a.z, vlen=Math.hypot(vx,vz);
  return { centreX:(a.x+b.x+c.x+d.x)/4, centreZ:(a.z+b.z+c.z+d.z)/4,
    ux:ux/ulen, uz:uz/ulen, vx:vx/vlen, vz:vz/vlen, length:91.4, width:55 };
}

// Paint as thin horizontal ribbons, not box beams: a stripe should not look
// like a raised kerb at pitch level. Small elevation/offset limits z-fighting.
function paintLine(parts, a, b, width) {
  const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);
  if(length<.001)return;
  const nx=-dz/length*width/2,nz=dx/length*width/2;
  const p=[a[0]+nx,a[1],a[2]+nz],q=[b[0]+nx,b[1],b[2]+nz];
  const r=[b[0]-nx,b[1],b[2]-nz],s=[a[0]-nx,a[1],a[2]-nz];
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([...p,...q,...r,...p,...r,...s],3));
  geometry.computeVertexNormals();parts.push(geometry);
}

function buildCombinedHockeyMarkings(group) {
  const f=happyValleyCombinedHockeyFrame(), parts=[];
  const point=(u,v)=>[f.centreX+f.ux*u+f.vx*v, .215, f.centreZ+f.uz*u+f.vz*v];
  const line=(u,v,x,z)=>paintLine(parts,point(u,v),point(x,z),.075);
  const halfL=f.length/2, halfW=f.width/2;
  line(-halfL,-halfW,halfL,-halfW); line(-halfL,halfW,halfL,halfW);
  for(const u of [-halfL,halfL,0,-halfL+22.9,halfL-22.9]) line(u,-halfW,u,halfW);
  // Goal circle is two 14.63 m quarter arcs joined by a 3.66 m straight.
  for(const sign of [-1,1]) {
    const back=sign*halfL, r=14.63, h=3.66/2;
    line(back-sign*r,-h,back-sign*r,h);
    for(const side of [-1,1]) for(let i=0;i<20;i++) {
      const a=i*Math.PI/40, b=(i+1)*Math.PI/40;
      line(back-sign*r*Math.cos(a),side*(h+r*Math.sin(a)),
        back-sign*r*Math.cos(b),side*(h+r*Math.sin(b)));
    }
    const u=back-sign*6.4;
    line(u,-.06,u,.06);
  }
  // Contrasting colour is provisional; the mapped surface has multiple uses.
  const yellow=new THREE.MeshStandardMaterial({color:0xd4bc56,roughness:.88,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6});
  merged(group,parts,yellow,'HappyValleyCombinedHockeyMarkings',false);
}

export function buildHappyValleyPitches(parent) {
  const group = new THREE.Group(); group.name = 'HappyValleyRecreationPitches'; parent.add(group);
  const artificial = new THREE.MeshStandardMaterial({ color: 0x31673c, roughness: 0.94, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const natural = new THREE.MeshStandardMaterial({ color: 0x486f38, roughness: 0.98, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const white = new THREE.MeshStandardMaterial({ color: 0xd3d9c7, roughness: 0.88, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
  const lineParts = [], cornerParts = [], centreParts = [], goalParts = [], netPositions = [];
  for (const pitch of HAPPY_VALLEY_PITCHES) {
    const ring = pitch.localRing;
    const surface = new THREE.Mesh(roofGeometry(ring, 0.17), pitch.surface === 'grass' ? natural : artificial);
    surface.name = `HappyValleyPitch${pitch.id}`;
    group.add(surface);
    const { a, b, c, length, width } = happyValleyPitchFrame(pitch);
    const point = (u,v,y=0.195) => [a.x+(b.x-a.x)*u+(c.x-a.x)*v, y, a.z+(b.z-a.z)*u+(c.z-a.z)*v];
    const line = (u1,v1,u2,v2) => paintLine(lineParts, point(u1,v1), point(u2,v2), 0.1);
    const u0 = 0.055, u1 = 0.945, v0 = 0.055, v1 = 0.945;
    line(u0,v0,u1,v0); line(u1,v0,u1,v1); line(u1,v1,u0,v1); line(u0,v1,u0,v0);
    line(0.5,v0,0.5,v1);
    // IFAB's 1 m corner quarter-circles and centre mark; the placement of
    // the full playing rectangle itself is still inferred within each OSM pitch.
    const mark=(parts,u1,v1,u2,v2)=>paintLine(parts,point(u1,v1),point(u2,v2),.1);
    mark(centreParts,.5,.5-.06/width,.5,.5+.06/width);
    for(const [end,du] of [[u0,1],[u1,-1]]) for(const [side,dv] of [[v0,1],[v1,-1]]) {
      for(let i=0;i<8;i++) {
        const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
        mark(cornerParts,end+du*Math.cos(a)/length,side+dv*Math.sin(a)/width,
          end+du*Math.cos(b)/length,side+dv*Math.sin(b)/width);
      }
    }
    const centreRadius = Math.min(9.15, length*0.1, width*0.16);
    for (let i=0;i<32;i++) {
      const a0=2*Math.PI*i/32, a1=2*Math.PI*(i+1)/32;
      line(0.5+Math.cos(a0)*centreRadius/length, 0.5+Math.sin(a0)*centreRadius/width,
        0.5+Math.cos(a1)*centreRadius/length, 0.5+Math.sin(a1)*centreRadius/width);
    }
    const penaltyLength = Math.min(16.5, length*0.17)/length;
    const penaltyHalf = Math.min(20.16, width*0.34)/width;
    for (const [end, dir] of [[u0,1],[u1,-1]]) {
      line(end,0.5-penaltyHalf,end+dir*penaltyLength,0.5-penaltyHalf);
      line(end+dir*penaltyLength,0.5-penaltyHalf,end+dir*penaltyLength,0.5+penaltyHalf);
      line(end+dir*penaltyLength,0.5+penaltyHalf,end,0.5+penaltyHalf);
      // Small-sided fields use scaled-down areas; dimensions remain estimates.
      const goalAreaDepth = Math.min(5.5,length*.07)/length;
      const goalAreaHalf = Math.min(9.16,width*.2)/width;
      line(end, .5-goalAreaHalf,end+dir*goalAreaDepth,.5-goalAreaHalf);
      line(end+dir*goalAreaDepth,.5-goalAreaHalf,end+dir*goalAreaDepth,.5+goalAreaHalf);
      line(end+dir*goalAreaDepth,.5+goalAreaHalf,end,.5+goalAreaHalf);
      const spotDistance=Math.min(11,length*.11), radius=Math.min(9.15,length*.1,width*.16);
      const spot=end+dir*spotDistance/length;
      line(spot,.5-.06/width,spot,.5+.06/width);
      const ratio=(penaltyLength*length-spotDistance)/radius;
      if(ratio>-1 && ratio<1) {
        const angle=Math.acos(ratio);
        for(let i=0;i<16;i++) {
          const a=-angle+2*angle*i/16,b=-angle+2*angle*(i+1)/16;
          line(spot+dir*radius*Math.cos(a)/length,.5+radius*Math.sin(a)/width,
            spot+dir*radius*Math.cos(b)/length,.5+radius*Math.sin(b)/width);
        }
      }
      // Goal posts are at the short ends, not along the long touchlines.
      const half = (length > 75 ? 7.32 : 4.8) / (2*width);
      const h = length > 75 ? 2.44 : 2.0;
      const left = point(end,0.5-half,.17), right = point(end,0.5+half,.17);
      beam(goalParts, left, [left[0],h+0.17,left[2]], 0.09);
      beam(goalParts, right, [right[0],h+0.17,right[2]], 0.09);
      beam(goalParts, [left[0],h+0.17,left[2]], [right[0],h+0.17,right[2]], 0.09);
      // Lightweight mesh netting, sloping from crossbar to a rear ground bar.
      // The depth and grid spacing are illustrative, not an as-built survey.
      const depth=length>75?1.8:1.2;
      const behind=end-dir*depth/length;
      const net=(a,b)=>netPositions.push(...a,...b);
      const netPoint=(v,y)=>point(end+(behind-end)*(1-y/h),v,.17+y);
      const steps=Math.ceil((2*half*width)/.45);
      for(let i=0;i<=steps;i++) {
        const v=.5-half+2*half*i/steps;
        net(netPoint(v,h),netPoint(v,0));
      }
      for(let i=0;i<=6;i++) {
        const y=h*i/6;
        net(netPoint(.5-half,y),netPoint(.5+half,y));
        for(const v of [.5-half,.5+half]) net(point(end,v,.17+y),netPoint(v,y));
      }
      const rearLeft=point(behind,.5-half,.17),rearRight=point(behind,.5+half,.17);
      beam(goalParts,left,rearLeft,.06); beam(goalParts,right,rearRight,.06);
      beam(goalParts,rearLeft,rearRight,.06);
    }
  }
  buildCombinedHockeyMarkings(group);
  merged(group, lineParts, white, 'HappyValleyPitchMarkings',false);
  merged(group, cornerParts, white, 'HappyValleyPitchCornerArcs',false);
  merged(group, centreParts, white, 'HappyValleyPitchCentreMarks',false);
  merged(group, goalParts, white, 'HappyValleyPitchGoals');
  const netGeometry=new THREE.BufferGeometry();
  netGeometry.setAttribute('position',new THREE.Float32BufferAttribute(netPositions,3));
  const net=new THREE.LineSegments(netGeometry,new THREE.LineBasicMaterial({color:0xbac4bb,transparent:true,opacity:.68}));
  net.name='HappyValleyPitchGoalNets'; group.add(net);
  return group;
}
