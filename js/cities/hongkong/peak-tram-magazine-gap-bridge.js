import {KENNEDY_APPROACH_POINTS,isMagazineGapBridgeSegment} from './peak-tram-kennedy-approach-site.js';
import {buildPeakTramStoneArch} from './peak-tram-macdonnell-bridge.js';
// Central road-covered portion only; bridge skew and surrounding portals are
// approximate. Existing Magazine Gap Road geometry and traffic remain intact.
export const MAGAZINE_GAP_BRIDGE_POINTS=KENNEDY_APPROACH_POINTS.filter((p,i,r)=>isMagazineGapBridgeSegment(p,r[i+1]||p)||i>0&&isMagazineGapBridgeSegment(r[i-1],p));
export function buildMagazineGapBridge(scene){
 const result=buildPeakTramStoneArch(scene,MAGAZINE_GAP_BRIDGE_POINTS,{name:'Magazine Gap',roadIds:[2062,5701],interiorRings:true});
 return {...result,stats:{peakTramMagazineGapArchSegments:result.sections.length-1}};
}
