// OSM way 1356276117 (© OpenStreetMap contributors, ODbL 1.0); the height
// and facade construction are photo-directed estimates, not measured plans.
import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';
export const HAPPY_VALLEY_PAVILION_SOURCE = authoredOsmSource({
  id: 1356276117,
  tags: { building: 'grandstand', 'building:levels': '10', name: '聯合看台 Pavilion Stand' },
  geometry: [
    {lat:22.272941,lon:114.1799465},{lat:22.272992,lon:114.1800983},
    {lat:22.2734988,lon:114.1799023},{lat:22.2734926,lon:114.1798873},
    {lat:22.2735902,lon:114.1798428},{lat:22.2735412,lon:114.1797047},
    {lat:22.2735361,lon:114.1796901},{lat:22.272941,lon:114.1799465},
  ],
  evidence: 'OSM Pavilion Stand footprint and level count; facade and heights require separate verification.',
});
export const HAPPY_VALLEY_PAVILION = makeAuthoredSite('happyValleyPavilion', '聯合看台', 'Pavilion Stand', HAPPY_VALLEY_PAVILION_SOURCE, {
  levels: 10, height: 36, role: 'grandstand',
});

// Entrance C serves Pavilion Stand, but no surveyed door position is available.
// A temporary street-side opening keeps the model passable pending verification.
export const HAPPY_VALLEY_PAVILION_ENTRANCE = Object.freeze({ edge: 6, centre: .5, width: 4.8, height: 3.25 });
