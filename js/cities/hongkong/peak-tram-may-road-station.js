import {MAY_PLATFORM_START,MAY_PLATFORM_END} from './peak-tram-kennedy-approach-site.js';
import {buildIntermediateStation} from './peak-tram-macdonnell-station.js';
// A visual placeholder built from the shared hillside-platform vocabulary;
// detailed May Road station configuration and actual site access are unverified.
export function buildMayRoadStation(scene){
 const result=buildIntermediateStation(scene,{start:MAY_PLATFORM_START,end:MAY_PLATFORM_END,name:'May Road',english:'May Road',chinese:'梅道',informationBoard:true});
 return {...result,stats:{peakTramMayRoadPlatformSteps:result.steps}};
}
