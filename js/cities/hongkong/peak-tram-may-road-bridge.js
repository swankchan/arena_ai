import {KENNEDY_APPROACH_POINTS,isMayRoadBridgeSegment} from './peak-tram-kennedy-approach-site.js';
import {buildPeakTramStoneArch} from './peak-tram-macdonnell-bridge.js';
// Provisional stone vault beneath the central, completely road-covered portion.
export const MAY_ROAD_BRIDGE_POINTS=KENNEDY_APPROACH_POINTS.filter((p,i,r)=>isMayRoadBridgeSegment(p,r[i+1]||p)||i>0&&isMayRoadBridgeSegment(r[i-1],p));
export function buildMayRoadBridge(scene){
 const result=buildPeakTramStoneArch(scene,MAY_ROAD_BRIDGE_POINTS,{name:'May Road',roadIds:[36167,42840]});
 return {...result,stats:{peakTramMayRoadArchSegments:result.sections.length-1}};
}
