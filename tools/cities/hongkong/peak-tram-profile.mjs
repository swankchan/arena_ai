// Experimental feasibility only. Heights and clearance constraints are not surveys.
// Find a monotonic, grade-limited sequence inside sample-wise bounds, favouring the
// terrain at each step. This does not optimise smoothness or design structures.
export function solveProfile(samples, maxGrade) {
 if (!Array.isArray(samples) || !samples.length || !(maxGrade > 0)) throw new RangeError('invalid profile');
 const bounds = samples.map((p, i) => {
  if (!Number.isFinite(p.s) || !Number.isFinite(p.target) || (i && p.s <= samples[i-1].s)) throw new RangeError('invalid sample');
  const lo = p.min ?? -Infinity, hi = p.max ?? Infinity;
  if (Number.isNaN(lo) || Number.isNaN(hi) || lo > hi) throw new RangeError('invalid bounds');
  return {lo, hi};
 });
 // Each backward interval contains all heights from which every later bound can
 // be reached with grades in [0, maxGrade].
 for (let i=bounds.length-2; i>=0; i--) {
  const d=samples[i+1].s-samples[i].s, next=bounds[i+1];
  bounds[i].lo=Math.max(bounds[i].lo,next.lo-maxGrade*d);
  bounds[i].hi=Math.min(bounds[i].hi,next.hi);
  if (bounds[i].lo>bounds[i].hi+1e-9) return {feasible:false, conflictIndex:i};
 }
 const heights=[];
 for (let i=0; i<samples.length; i++) {
  let {lo,hi}=bounds[i];
  if (i) { const d=samples[i].s-samples[i-1].s; lo=Math.max(lo,heights[i-1]); hi=Math.min(hi,heights[i-1]+maxGrade*d); }
  if (lo>hi+1e-9) return {feasible:false, conflictIndex:i};
  heights.push(Math.min(hi,Math.max(lo,samples[i].target)));
 }
 return {feasible:true,heights};
}
