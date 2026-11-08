// Local scene corrections for two street lights that overlap the already-built
// Kennedy bridge/approach. Coordinates are game-space metres, not a survey.
// Keep both fixtures and their headings: move the poles away from the railway.
const ADJUSTMENTS = new Map([
 [373,{source:[-317.914,830.283,-1.6349,1],override:[373,326,21,14144],x:-311.5,z:831.75}],
 [4642,{source:[-178.353,625.795,2.756,1],x:-182.60,z:621.55}],
 [4643,{source:[-190.426,647.291,-2.9415,1],x:-194.67,z:643.05}]
]);
export function peakTramAdjustedStreetLight(index,lamp,override){
 const correction=ADJUSTMENTS.get(index);if(!correction)return null;
 if((correction.override ? !override || correction.override.some((v,i)=>override[i]!==v) : Boolean(override))||lamp.length<4||correction.source.some((v,i)=>Math.abs(lamp[i]-v)>1e-6))throw Error(`Peak Tram street light ${index} no longer matches source; review placement`);
 return {x:correction.x,z:correction.z};
}
