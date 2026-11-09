import {CENTRAL_PLATFORM_POINTS as points, centralPlatformPoint} from './peak-tram-central-profile.js';
import {PEAK_TRAM_CAR, PEAK_TRAM_DOOR_OFFSETS} from './peak-tram-car.js';
import {measurePeakTramRoute, peakTramCarPose} from './peak-tram-motion.js';

// Scene-fit diagnostic for a stationary rigid visual car only. This is not a
// vehicle, a swept envelope, or a verified operational docking position. Project
// each door centre at chest height so gate frames correspond to the tilted car.
export function centralTrialDocking() {
 const measured=measurePeakTramRoute(points);
 const pose=peakTramCarPose(measured,measured.total/2,PEAK_TRAM_CAR.length);
 const origin=centralPlatformPoint(0),carUp=1.85,cos=Math.cos(pose.pitch),sin=Math.sin(pose.pitch);
 const along=(pose.position.x-origin.x)*origin.ux+(pose.position.z-origin.z)*origin.uz;
 return {pose,measuredLength:measured.total,doorStations:PEAK_TRAM_DOOR_OFFSETS.map(x=>along+x*cos-carUp*sin)};
}
