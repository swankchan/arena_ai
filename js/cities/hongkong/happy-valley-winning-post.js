// Photo-informed, unsurveyed winning-post marker on the provisional course.
// Dimensions and placement are estimates, not engineering drawings.
import * as THREE from 'three/webgpu';
import {color} from 'three/tsl';
import {HAPPY_VALLEY_TRACK, happyValleyTrackPoint} from './happy-valley-racecourse-architecture.js';
import {nightAmount, box, cylinder, merged} from './harbour-city-world-utils.js';
import {WINNING_POST_GLYPHS} from './happy-valley-winning-post-glyphs.js';

export const HAPPY_VALLEY_WINNING_POST = Object.freeze({station:.30, offset:-HAPPY_VALLEY_TRACK.width-6, rx:4.8, ry:4.2, centreY:2.45, band:.65, depth:.38});

function letteringTexture() {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const scale=88, ox=512, oy=678;
  ctx.fillStyle='#103261';ctx.textAlign='center';ctx.textBaseline='middle';
  // Individual characters follow the elliptical sign, as in the reference.
  function arc(text,start,end) {
    const glyphs=Array.from(text);ctx.font='bold 34px sans-serif';
    // Stub and headless canvases may expose measureText but return no TextMetrics, or omit the
    // key entirely. Fall back to a CJK-ish advance so the lettering still lays out instead of
    // throwing on an incomplete 2D context.
    const measure=glyph=>{
      const metrics=ctx.measureText?.(glyph);
      return typeof metrics?.width==='number'?Math.max(8,metrics.width):34;
    };
    const weights=glyphs.map(glyph=>WINNING_POST_GLYPHS[glyph]?34:measure(glyph));
    const total=weights.reduce((a,b)=>a+b,0);let cursor=0;
    glyphs.forEach((glyph,i)=>{
      const theta=start+(end-start)*(cursor+weights[i]/2)/total;
      cursor+=weights[i];
      const rx=HAPPY_VALLEY_WINNING_POST.rx-HAPPY_VALLEY_WINNING_POST.band/2;
      const ry=HAPPY_VALLEY_WINNING_POST.ry-HAPPY_VALLEY_WINNING_POST.band/2;
      const x=ox+scale*rx*Math.cos(theta), y=oy-scale*(HAPPY_VALLEY_WINNING_POST.centreY+ry*Math.sin(theta));
      // Decreasing theta travels along each inscription from left to right.
      const angle=Math.atan2(ry*Math.cos(theta),rx*Math.sin(theta));
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);
      const outline=WINNING_POST_GLYPHS[glyph];
      if(outline) {
        // Avoid missing-CJK-font tofu on browsers without system Chinese fonts.
        ctx.scale(.034,-.034);ctx.translate(-outline.advance/2,-440);
        // Path2D is a browser global; a headless/stub canvas has no fillable path, so draw the
        // glyph text instead of failing the whole venue build.
        if(typeof Path2D!=='function'){ctx.fillText(glyph,0,0);}
        else ctx.fill(new Path2D(outline.path));
      } else ctx.fillText(glyph,0,0);
      ctx.restore();
    });
  }
  arc('Happy Valley Racecourse 跑馬地馬場',3.42,1.72);
  arc('香港賽馬會 The Hong Kong Jockey Club',1.42,-.28);
  ctx.beginPath();ctx.arc(ox,oy-scale*6.30,27,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f8cc1b';ctx.font='bold 16px sans-serif';ctx.fillText('HKJC',ox,oy-scale*6.30);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

export function buildHappyValleyWinningPost(parent) {
  const {station,offset,rx,ry,centreY,band,depth}=HAPPY_VALLEY_WINNING_POST;
  const p=happyValleyTrackPoint(station,offset),q=happyValleyTrackPoint(station+.0005,offset);
  const direction=Math.atan2(-(q.z-p.z),q.x-p.x)+Math.PI;
  const group=new THREE.Group();group.name='HappyValleyWinningPost';group.position.set(p.x,0,p.z);group.rotation.y=direction;parent.add(group);
  // Vertical elliptic horseshoe, yellow front and sides, open at the bottom.
  const shape=new THREE.Shape(),start=-.55,end=Math.PI+.55,segments=80;
  shape.moveTo(rx*Math.cos(start),0);
  for(let i=0;i<=segments;i++) {
    const a=start+(end-start)*i/segments;
    shape.lineTo(rx*Math.cos(a),centreY+ry*Math.sin(a));
  }
  shape.lineTo(rx*Math.cos(end),0);
  shape.lineTo((rx-band)*Math.cos(end),0);
  for(let i=segments;i>=0;i--) {
    const a=start+(end-start)*i/segments;
    shape.lineTo((rx-band)*Math.cos(a),centreY+(ry-band)*Math.sin(a));
  }
  shape.lineTo((rx-band)*Math.cos(start),0);
  shape.closePath();
  const gold=new THREE.MeshStandardNodeMaterial({color:0xf7ca13,roughness:.58,metalness:.08});
  gold.emissiveNode=color(0xe6aa13).mul(nightAmount().mul(.22).add(.40));
  const arch=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:32}),gold);
  arch.position.z=-depth/2;arch.name='HappyValleyWinningPostArch';group.add(arch);
  const tex=letteringTexture();
  if(tex) {
    // Transparent label overlay: no raster image from the references is used.
    const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(1024/88,768/88),material);
    panel.position.set(0,(678-384)/88,depth/2+.006);panel.name='HappyValleyWinningPostLettering';group.add(panel);
  }
  const dark=new THREE.MeshStandardMaterial({color:0x172725,roughness:.65,metalness:.15});
  const amber=new THREE.MeshStandardNodeMaterial({color:0xe1a51d,roughness:.6});
  amber.emissiveNode=color(0xd38a0c).mul(nightAmount()).mul(.28);
  const base=[],upright=[],slats=[],green=[],red=[],yellow=[];
  box(base,[0,.22,0],[1.12,.44,1.05]);
  box(upright,[0,2.45,0],[.56,4.45,.52]);
  box(slats,[0,2.4,.28],[.39,3.55,.045]);
  // A low bed of flowers behind the marker; layout is illustrative.
  box(green,[0,.18,-.9],[6.4,.36,1.0]);
  for(let i=0;i<96;i++) {
    const x=-3.0+(i%32)*.193,z=-1.22+Math.floor(i/32)*.30;
    cylinder(i%5<2?yellow:red,[x,.44+(i%3)*.025,z],.09,.18,5);
  }
  merged(group,base,dark,'HappyValleyWinningPostBase');
  merged(group,upright,dark,'HappyValleyWinningPostUpright');
  merged(group,slats,amber,'HappyValleyWinningPostPanel');
  if(typeof document!=='undefined') {
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=1024;
    const ctx=canvas.getContext('2d');
    if(ctx) {
      ctx.fillStyle='#102950';ctx.font='bold 80px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      Array.from('HKJC').forEach((letter,i)=>ctx.fillText(letter,64,145+i*235));
      const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
      const letters=new THREE.Mesh(new THREE.PlaneGeometry(.35,3.4),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
      letters.position.set(0,2.42,.305);letters.name='HappyValleyWinningPostColumnLetters';group.add(letters);
    }
  }
  merged(group,green,new THREE.MeshStandardMaterial({color:0x31572e,roughness:1}),'HappyValleyWinningPostPlanting');
  merged(group,red,new THREE.MeshStandardMaterial({color:0xb82d1d,roughness:.95}),'HappyValleyWinningPostFlowersRed');
  merged(group,yellow,new THREE.MeshStandardMaterial({color:0xf1a921,roughness:.95}),'HappyValleyWinningPostFlowersYellow');
  return {group,position:p,direction};
}
