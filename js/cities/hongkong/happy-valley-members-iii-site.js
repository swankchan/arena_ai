// OSM way 1356276116; the outline and ten levels are map data, not surveyed plans.
import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
export const HAPPY_VALLEY_MEMBERS_III_SOURCE = authoredOsmSource({
  id: 1356276116,
  tags: { building:'grandstand', 'building:levels':'10', name:'會員看台第三座 Members Stand III' },
  geometry: [
    {lat:22.2725182,lon:114.1800981},{lat:22.2728867,lon:114.1799660},
    {lat:22.2729410,lon:114.1799465},{lat:22.2729920,lon:114.1800983},
    {lat:22.2725815,lon:114.1802550},{lat:22.2725182,lon:114.1800981},
  ],
  evidence: 'OSM stand footprint and level count; facade, height and entrance are estimates.',
});
export const HAPPY_VALLEY_MEMBERS_III = makeAuthoredSite('happyValleyMembersIII','會員看台第三座','Members Stand III',HAPPY_VALLEY_MEMBERS_III_SOURCE,{
  height:36, levels:10, role:'grandstand',
});
// Street-side access is intentionally provisional: HKJC calls this Entrance D,
// but the sources used do not specify its coordinates or clear dimensions.
export const HAPPY_VALLEY_MEMBERS_III_ENTRANCE = Object.freeze({edge:0,centre:.5,width:4.8,height:3.25});
