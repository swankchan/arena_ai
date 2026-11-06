// Central Government Complex, Tamar: source-faithful civic buildings and the Open Door.
// OSM supplies the site and individual rings. HOK / contractor photography directs the facade,
// open-door bridge, LegCo disc and entrances; no photograph is used as a texture or bundled asset.
import {
  authoredOsmSource, makeAuthoredSite, worldRingFromGeometry, localRingFromWorld, authoredTerrainHeightAt,
} from './authored-landmark-site.js';
import { harbourCityEdgeFrame, harbourCityEdgeOutward } from './harbour-city-architecture.js';

const ll = (rows) => rows.map(([lon, lat]) => ({ lon, lat }));
const source = (value) => authoredOsmSource(value);

export const CGO_SITE_OSM_SOURCE = source({
  id: 918333902,
  tags: { amenity: 'townhall', office: 'complex', government: 'administrative', name: '政府總部 Central Government Offices', 'addr:housenumber': '2', 'addr:street:en': 'Tim Mei Avenue' },
  geometry: ll([
    [114.1646881,22.2806640],[114.1648307,22.2806286],[114.1647915,22.2804931],[114.1649681,22.2804493],
    [114.1649496,22.2803854],[114.1651008,22.2803479],[114.1650834,22.2802877],[114.1651642,22.2802242],
    [114.1652635,22.2801554],[114.1654139,22.2800515],[114.1654770,22.2800149],[114.1655218,22.2799889],
    [114.1655572,22.2799733],[114.1655844,22.2799577],[114.1656754,22.2799210],[114.1657693,22.2798914],
    [114.1658656,22.2798691],[114.1658691,22.2798930],[114.1660005,22.2798713],[114.1660099,22.2798978],
    [114.1660591,22.2799045],[114.1661060,22.2799201],[114.1661486,22.2799440],[114.1661852,22.2799753],
    [114.1662143,22.2800126],[114.1662349,22.2800546],[114.1662660,22.2800481],[114.1663116,22.2802169],
    [114.1663246,22.2802671],[114.1663750,22.2804612],[114.1662703,22.2804854],[114.1660254,22.2806138],
    [114.1659994,22.2806274],[114.1660310,22.2806798],[114.1658436,22.2807764],[114.1657346,22.2808298],
    [114.1656758,22.2808444],[114.1652733,22.2809441],[114.1651265,22.2809805],[114.1649456,22.2810254],
    [114.1648030,22.2810607],[114.1646881,22.2806640],
  ]),
  evidence: 'OSM way 918333902 is the Central Government Offices site / townhall boundary, not the Legislative Council Complex or a tower footprint.',
});

export const CGO_WEST_OSM_SOURCE = source({
  type: 'relation', id: 8366346,
  tags: { building: 'office', government: 'administrative', 'building:levels': '27', 'building:min_level': '5', name: '西翼 West Wing', 'addr:housename': '政府總部 Central Government Offices' },
  geometry: ll([
    [114.1647915,22.2804931],[114.1649681,22.2804493],[114.1651193,22.2804118],[114.1655482,22.2803055],
    [114.1655372,22.2802674],[114.1655155,22.2801925],[114.1654976,22.2801306],[114.1657028,22.2800798],
    [114.1657335,22.2801857],[114.1659075,22.2807869],[114.1657346,22.2808298],[114.1656758,22.2808444],
    [114.1652733,22.2809441],[114.1651265,22.2809805],[114.1649456,22.2810254],[114.1648307,22.2806286],
    [114.1647915,22.2804931],
  ]),
  innerGeometry: [ll([
    [114.1651773,22.2806123],[114.1652119,22.2807318],[114.1656529,22.2806225],[114.1656183,22.2805029],[114.1651773,22.2806123],
  ])],
  evidence: 'OSM relation 8366346 preserves the West Wing outer ring and its four-sided inner void. The high link is authored separately so the void stays open below it.',
});

export const CGO_EAST_OSM_SOURCE = source({
  id: 101959166,
  tags: { building: 'office', government: 'administrative', 'building:levels': '23', 'building:min_level': '2', location: 'podium', layer: '1', name: '東翼 East Wing' },
  geometry: ll([
    [114.1654976,22.2802017],[114.1655155,22.2801925],[114.1656849,22.2801051],[114.1657335,22.2801857],
    [114.1657991,22.2802947],[114.1658222,22.2803331],[114.1659994,22.2806274],[114.1660310,22.2806798],
    [114.1658436,22.2807764],[114.1655372,22.2802674],[114.1654976,22.2802017],
  ]),
});

export const CGO_CONFERENCE_OSM_SOURCE = source({
  id: 142227308,
  tags: { building: 'civic', 'building:levels': '4', 'building:min_level': '2', location: 'podium', layer: '1', name: '會議廳 Conference Hall' },
  geometry: ll([
    [114.1646881,22.2806640],[114.1648307,22.2806286],[114.1647915,22.2804931],[114.1649681,22.2804493],
    [114.1649496,22.2803854],[114.1651008,22.2803479],[114.1651193,22.2804118],[114.1651773,22.2806123],
    [114.1652119,22.2807318],[114.1652733,22.2809441],[114.1649456,22.2810254],[114.1648030,22.2810607],
    [114.1646881,22.2806640],
  ]),
});

export const CEO_OSM_SOURCE = source({
  id: 101959219,
  tags: { building: 'government', government: 'administrative', height: '37', 'building:levels': '4', name: '行政長官辦公室 Chief Executive’s Office' },
  geometry: ll([[114.1648680,22.2812776],[114.1651650,22.2811996],[114.1653603,22.2818369],[114.1650633,22.2819148],[114.1648680,22.2812776]]),
});

export const LEGCO_OSM_SOURCE = source({
  id: 925188472,
  tags: { building: 'office', government: 'legislative', 'building:levels': '10', name: '立法會綜合大樓 Legislative Council Complex' },
  geometry: ll([
    [114.1657284,22.2810260],[114.1657915,22.2809857],[114.1657549,22.2809224],[114.1660662,22.2807671],
    [114.1662075,22.2806959],[114.1661957,22.2806758],[114.1662273,22.2806599],[114.1664079,22.2805690],
    [114.1664652,22.2808110],[114.1664813,22.2808848],[114.1663491,22.2809514],[114.1666407,22.2814472],
    [114.1665061,22.2815150],[114.1665060,22.2815600],[114.1664941,22.2816044],[114.1664726,22.2816455],
    [114.1664426,22.2816818],[114.1664051,22.2817116],[114.1663618,22.2817336],[114.1663146,22.2817471],
    [114.1662654,22.2817512],[114.1662164,22.2817460],[114.1661695,22.2817316],[114.1661268,22.2817087],
    [114.1660900,22.2816781],[114.1660692,22.2816371],[114.1657284,22.2810260],
  ]),
});

export const CGO_PODIUM_OSM_SOURCE = source({
  id: 995099219,
  tags: { building: 'yes', 'building:function': 'podium', 'building:levels': '2', 'addr:housename': '政府總部 Central Government Offices' },
  geometry: ll([
    [114.1646881,22.2806640],[114.1648307,22.2806286],[114.1647915,22.2804931],[114.1649681,22.2804493],
    [114.1649496,22.2803854],[114.1651008,22.2803479],[114.1650834,22.2802877],[114.1651642,22.2802242],
    [114.1652635,22.2801554],[114.1654139,22.2800515],[114.1654770,22.2800149],[114.1655218,22.2799889],
    [114.1655572,22.2799733],[114.1655844,22.2799577],[114.1656754,22.2799210],[114.1657693,22.2798914],
    [114.1658656,22.2798691],[114.1658691,22.2798930],[114.1660005,22.2798713],[114.1660099,22.2798978],
    [114.1660591,22.2799045],[114.1661060,22.2799201],[114.1661486,22.2799440],[114.1661852,22.2799753],
    [114.1662143,22.2800126],[114.1662349,22.2800546],[114.1662660,22.2800481],[114.1663116,22.2802169],
    [114.1658833,22.2803185],[114.1658222,22.2803331],[114.1659994,22.2806274],[114.1660310,22.2806798],
    [114.1658436,22.2807764],[114.1657346,22.2808298],[114.1656758,22.2808444],[114.1652733,22.2809441],
    [114.1651265,22.2809805],[114.1649456,22.2810254],[114.1648030,22.2810607],[114.1646881,22.2806640],
  ]),
});

export const CGO_OFFICE_HEIGHT = 120;
export const CGO_LOW_BLOCK_HEIGHT = 25.1;
export const CGO_GROUND_SOFFIT = 7.2;
export const CGO_OPEN_DOOR_SOFFIT = 88;
export const CGO_OFFICE_VISUAL_COURSES = 24;
export const LEGCO_HEIGHT = 52.3;
export const LEGCO_LOW_BLOCK_HEIGHT = 30;
export const CEO_HEIGHT = 37;
export const CGO_ROAD_VEHICLE_CLEARANCE = 4.7;

export const CGO_SITE = makeAuthoredSite('centralGovernmentOffices', '政府總部 Central Government Offices', 'Central Government Offices', CGO_SITE_OSM_SOURCE, { role: 'site', roadIds: [38667, 39082, 40192] });
export const CGO_WEST_SITE = makeAuthoredSite('centralGovernmentWestWing', '政府總部西翼 Central Government Offices West Wing', 'Central Government Offices West Wing', CGO_WEST_OSM_SOURCE, { height: CGO_OFFICE_HEIGHT, levels: 27 });
export const CGO_EAST_SITE = makeAuthoredSite('centralGovernmentEastWing', '政府總部東翼 Central Government Offices East Wing', 'Central Government Offices East Wing', CGO_EAST_OSM_SOURCE, { height: CGO_OFFICE_HEIGHT, levels: 23 });
export const CGO_CONFERENCE_SITE = makeAuthoredSite('centralGovernmentConferenceHall', '政府總部會議廳 Central Government Conference Hall', 'Central Government Conference Hall', CGO_CONFERENCE_OSM_SOURCE, { height: CGO_LOW_BLOCK_HEIGHT, levels: 4 });
export const CEO_SITE = makeAuthoredSite('chiefExecutivesOffice', '行政長官辦公室 Chief Executive’s Office', 'Chief Executive’s Office', CEO_OSM_SOURCE, { height: CEO_HEIGHT, levels: 4, roadIds: [43101] });
export const LEGCO_SITE = makeAuthoredSite('legislativeCouncilComplex', '立法會綜合大樓 Legislative Council Complex', 'Legislative Council Complex', LEGCO_OSM_SOURCE, { height: LEGCO_HEIGHT, levels: 10, roadIds: [38665] });
export const CGO_PODIUM_SITE = makeAuthoredSite('centralGovernmentPodium', '政府總部裙樓 Central Government Offices Podium', 'Central Government Offices Podium', CGO_PODIUM_OSM_SOURCE, { height: CGO_LOW_BLOCK_HEIGHT, levels: 2, roadIds: [38667] });

export const CGO_WEST_INNER_WORLD_RING = worldRingFromGeometry(CGO_WEST_OSM_SOURCE.innerGeometry[0]);
export const CGO_WEST_INNER_LOCAL_RING = localRingFromWorld(CGO_WEST_SITE, CGO_WEST_INNER_WORLD_RING);
export const CGO_OPEN_DOOR_SITE = Object.freeze({
  ...CGO_WEST_SITE, key: 'centralGovernmentOpenDoorVoid', role: 'source-void',
  ring: CGO_WEST_INNER_WORLD_RING, localRing: CGO_WEST_INNER_LOCAL_RING,
  evidence: 'The inner ring of OSM relation 8366346; this is a void, not another building footprint.',
});

// The recognisable "Door Always Open": a full-height breezeway from the harbour frontage into the mapped inner
// void of the West Wing. Both faces it passes through are exact source geometry - the outer relation ring edge 11
// (42.9 m north facade) and the inner-ring edge 1 (47.0 m courtyard wall) - so the 24.4 m deep passage sits where
// OSM already places the void. The three-storey link above 88 m remains the door head. Rocco Design's "Door Always
// Open" concept and the published breezeway description direct the opening; no OSM portal footprint is claimed.
export const CGO_DOOR_OPENING = Object.freeze({
  outerEdge: 11, innerEdge: 1, t0Outer: 0.26, t1Outer: 0.74, t0Inner: 0.2, t1Inner: 0.8,
  y0: CGO_LOW_BLOCK_HEIGHT, y1: CGO_OPEN_DOOR_SOFFIT,
  widthMetres: 20.6, passageDepthMetres: 24.4, clearanceMetres: 4.7,
});

function southernLongEdge(site) {
  let best = -Infinity, result = 0;
  for (let edge = 0; edge < site.localRing.length / 2 - 1; edge++) {
    const i = edge * 2, data = harbourCityEdgeOutward(site.localRing, edge);
    if (data.length < 4) continue;
    const z = (site.localRing[i + 1] + site.localRing[i + 3]) * 0.5;
    const score = z + Math.min(data.length, 40) * 0.025;
    if (score > best) { best = score; result = edge; }
  }
  return result;
}
export const CGO_OPEN_DOOR_ENTRANCE = harbourCityEdgeFrame(
  CGO_OPEN_DOOR_SITE, southernLongEdge(CGO_OPEN_DOOR_SITE), 'Central Government Offices Open Door civic entrance',
  'Photo-directed civic entrance on the source voids Harcourt-facing edge; not an invented OSM entrance node.', 0.5,
);
export const LEGCO_MAIN_ENTRANCE = harbourCityEdgeFrame(
  LEGCO_SITE, southernLongEdge(LEGCO_SITE), 'Legislative Council Complex photo-directed public entrance',
  'Photo-directed entrance on the Tim Mei Avenue / public-open-space side; the source way has no entrance node.', 0.5,
);
export const CEO_MAIN_ENTRANCE = harbourCityEdgeFrame(
  CEO_SITE, southernLongEdge(CEO_SITE), 'Chief Executive’s Office photo-directed entrance',
  'Photo-directed Tim Wa Avenue entrance on the exact four-corner source building; no OSM entrance node is claimed.', 0.5,
);
function pointSegmentDistance(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq)) : 0;
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
function nearestWorldEdge(site, point) {
  let best = Infinity, result = 0;
  for (let edge = 0; edge < site.ring.length / 2 - 1; edge++) {
    const i = edge * 2, distance = pointSegmentDistance(point.x, point.z, site.ring[i], site.ring[i + 1], site.ring[i + 2], site.ring[i + 3]);
    if (distance < best) { best = distance; result = edge; }
  }
  return result;
}
export const CGO_PODIUM_OPEN_DOOR_EDGE = nearestWorldEdge(CGO_PODIUM_SITE, CGO_OPEN_DOOR_ENTRANCE);

export const CGO_GROUND_SITES = Object.freeze([CGO_SITE, CEO_SITE, LEGCO_SITE]);
export const CGO_GROUND_RINGS = Object.freeze(CGO_GROUND_SITES.map((site) => site.ring));
export const CGO_BUILDING_SITES = Object.freeze([CGO_WEST_SITE, CGO_EAST_SITE, CGO_CONFERENCE_SITE, CEO_SITE, LEGCO_SITE]);
export const CGO_GROUND_SAMPLE = Object.freeze({ x: CGO_SITE.x, z: CGO_SITE.z });

export const CGO_RESEARCH_SOURCES = Object.freeze([
  Object.freeze({ url: 'https://www.hok.com/projects/view/tamar-government-complex-hong-kong/', publisher: 'HOK', evidence: 'Reviewed exterior and Open Door soffit photography directs the dark double-skin office glazing, thick pale reveals, elevated link and landscaped civic setting. Images are not redistributed.' }),
  Object.freeze({ url: 'https://www.gammonconstruction.com/en/project-details.php?project_id=92', publisher: 'Gammon Construction', evidence: 'The contractor describes two wings forming an Open Door / breezeway, a 27-storey 120 m CGC, a four-storey low block and a ten-storey LegCo complex, completed in 2011.' }),
  Object.freeze({ url: 'http://www.building.com.hk/downpdf.asp?id=188', publisher: 'Building Journal — Tamar Development cover story', evidence: 'The project table gives CGC 120 m / 27 storeys, CGC Low Block 25.1 m / four storeys and LegCo 52.3 m / ten storeys; the text describes a three-level link between the wings.' }),
  Object.freeze({ url: 'https://www.openstreetmap.org/relation/8366346', publisher: 'OpenStreetMap contributors', evidence: 'West Wing outer and inner rings, 27 levels and min_level=5. The source void is retained rather than replaced by a rectangular tower.' }),
]);

export function centralGovernmentTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt(CGO_GROUND_SITES, x, z, rawHeight, padHeight);
}
