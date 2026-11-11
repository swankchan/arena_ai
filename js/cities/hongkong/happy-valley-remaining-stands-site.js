// OSM grandstand outlines for the three stands that the runtime still lacks.
// Footprints and level counts are map data; facade, height and entrance are estimates,
// exactly as for Members Stand III and the Pavilion Stand.
// Source: tools/data/hongkong/landmarks.json, © OpenStreetMap contributors, ODbL 1.0.
import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';

export const HAPPY_VALLEY_GRANDSTAND_SOURCE = authoredOsmSource({
  id: 1356276114,
  tags: {building:'grandstand', 'building:levels':'9', name:'大看台 Grandstand', 'name:en':'Grandstand', 'name:zh':'大看台'},
  geometry: [
    {lat:22.2710258,lon:114.1818591},
    {lat:22.2709554,lon:114.1817939},
    {lat:22.2709323,lon:114.1818243},
    {lat:22.270871,lon:114.1817679},
    {lat:22.2708957,lon:114.1817223},
    {lat:22.2709105,lon:114.181696},
    {lat:22.270906,lon:114.1816942},
    {lat:22.2708812,lon:114.1816776},
    {lat:22.2710198,lon:114.1814474},
    {lat:22.2711139,lon:114.1813176},
    {lat:22.2711675,lon:114.1812348},
    {lat:22.2712523,lon:114.1811037},
    {lat:22.2713074,lon:114.1810255},
    {lat:22.2713991,lon:114.1808956},
    {lat:22.2714183,lon:114.180911},
    {lat:22.2714606,lon:114.1808483},
    {lat:22.2715719,lon:114.1806835},
    {lat:22.2715937,lon:114.1807041},
    {lat:22.2716764,lon:114.1808909},
    {lat:22.2710258,lon:114.1818591},
  ],
  evidence: 'OSM stand footprint and level count; facade, height and entrance are estimates.',
});
export const HAPPY_VALLEY_GRANDSTAND = makeAuthoredSite(
  'happyValleyGrandstand', '大看台', 'Grandstand', HAPPY_VALLEY_GRANDSTAND_SOURCE,
  { height: 32.4, levels: 9, role: 'grandstand' },
);

export const HAPPY_VALLEY_MEMBERS_I_SOURCE = authoredOsmSource({
  id: 1356276115,
  tags: {building:'grandstand', 'building:levels':'9', name:'會員看台第一座 Members Stand I', 'name:en':'Members Stand I', 'name:zh':'會員看台第一座'},
  geometry: [
    {lat:22.2715719,lon:114.1806835},
    {lat:22.2716456,lon:114.1805817},
    {lat:22.2717036,lon:114.1805209},
    {lat:22.2717616,lon:114.18046},
    {lat:22.2717548,lon:114.1804458},
    {lat:22.2718263,lon:114.1804008},
    {lat:22.271831,lon:114.1804115},
    {lat:22.2718385,lon:114.1804266},
    {lat:22.2720447,lon:114.1805282},
    {lat:22.2716764,lon:114.1808909},
    {lat:22.2715937,lon:114.1807041},
    {lat:22.2715719,lon:114.1806835},
  ],
  evidence: 'OSM stand footprint and level count; facade, height and entrance are estimates.',
});
export const HAPPY_VALLEY_MEMBERS_I = makeAuthoredSite(
  'happyValleyMembersI', '會員看台第一座', 'Members Stand I', HAPPY_VALLEY_MEMBERS_I_SOURCE,
  { height: 32.4, levels: 9, role: 'grandstand' },
);

export const HAPPY_VALLEY_MEMBERS_II_SOURCE = authoredOsmSource({
  id: 1356276118,
  tags: {building:'grandstand', 'building:levels':'9', name:'會員看台第二座 Members Stand II', 'name:en':'Members Stand II', 'name:zh':'會員看台第二座'},
  geometry: [
    {lat:22.2725815,lon:114.180255},
    {lat:22.2720447,lon:114.1805282},
    {lat:22.2718385,lon:114.1804266},
    {lat:22.271831,lon:114.1804115},
    {lat:22.2718263,lon:114.1804008},
    {lat:22.2725182,lon:114.1800981},
    {lat:22.2725815,lon:114.180255},
  ],
  evidence: 'OSM stand footprint and level count; facade, height and entrance are estimates.',
});
export const HAPPY_VALLEY_MEMBERS_II = makeAuthoredSite(
  'happyValleyMembersII', '會員看台第二座', 'Members Stand II', HAPPY_VALLEY_MEMBERS_II_SOURCE,
  { height: 32.4, levels: 9, role: 'grandstand' },
);
