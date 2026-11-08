// Standalone kinematic experiment, not a game vehicle or a safety simulation.
// Distances follow the 3D trial profile, not surveyed rail or cable geometry.
export function measurePeakTramRoute(route) {
 if (!Array.isArray(route) || route.length<2) throw new Error('route needs at least two points');
 const lengths=[0];
 for (let i=1;i<route.length;i++) {
  const a=route[i-1],b=route[i];
  if (![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite)) throw new Error('invalid route coordinate');
  const distance=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
  if (!(distance>0)) throw new Error('duplicate route point');
  lengths.push(lengths[i-1]+distance);
 }
 return {route,lengths,total:lengths.at(-1)};
}
export function samplePeakTramRoute(measured,distance) {
 if (!Number.isFinite(distance)) throw new Error('invalid distance');
 const {route,lengths,total}=measured,d=Math.max(0,Math.min(total,distance));
 let low=0,high=lengths.length-1;
 while(high-low>1){const mid=(low+high)>>1;if(lengths[mid]<=d)low=mid;else high=mid;}
 const a=route[low],b=route[high],t=(d-lengths[low])/(lengths[high]-lengths[low]);
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
}
export function peakTramCarPose(measured,distance,carLength=33) {
 if (!(carLength>0) || measured.total<carLength || !Number.isFinite(distance)) throw new Error('invalid car pose');
 const centre=Math.max(carLength/2,Math.min(measured.total-carLength/2,distance));
 const a=samplePeakTramRoute(measured,centre-carLength/2),b=samplePeakTramRoute(measured,centre+carLength/2);
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,horizontal=Math.hypot(dx,dz);
 return {position:{x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2},yaw:Math.atan2(-dz,dx),pitch:Math.atan2(dy,horizontal),distance:centre};
}
// Analytical triangular cycle with terminal dwells: stable across frame rates and
// arbitrarily large time steps. Each branch is normalized independently because
// the trial branch lengths differ; this is NOT a physical constant-length rope.
export function peakTramExperimentAtTime(a,b,time,{carLength=33,speed=6,dwell=12}={}) {
 if (!Number.isFinite(time)||time<0||!Number.isFinite(speed)||speed<=0||!Number.isFinite(dwell)||dwell<0||!Number.isFinite(carLength)||carLength<=0||a.total<=carLength||b.total<=carLength) throw new Error('invalid motion parameters');
 const run=((a.total+b.total)/2-carLength)/speed,period=2*(run+dwell),phase=time%period;
 let progress,state;
 if(phase<dwell){progress=0;state='lower-dwell';}
 else if(phase<dwell+run){progress=(phase-dwell)/run;state='ascending';}
 else if(phase<2*dwell+run){progress=1;state='upper-dwell';}
 else {progress=1-(phase-2*dwell-run)/run;state='descending';}
 const da=carLength/2+progress*(a.total-carLength),db=carLength/2+(1-progress)*(b.total-carLength);
 return {A:peakTramCarPose(a,da,carLength),B:peakTramCarPose(b,db,carLength),progress,state,period,run};
}
