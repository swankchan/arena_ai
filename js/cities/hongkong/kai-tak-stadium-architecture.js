// HK-B0104: 啟德主場館 Kai Tak Stadium — the 50,000-seat centrepiece of 啟德體育園 Kai Tak Sports Park.
//
// The footprint is the exact OSM `leisure=stadium` way 609099609 (v21): an ellipse-like oval of 71 ring positions,
// 226 m across and 281 m long, on the former Kai Tak Airport runway apron at 39 承啟道 Shing Kai Road. OSM tags the
// architects (Populous with 關善明建築師事務所 Simon Kwan & Associates), the engineer (Arup), the builder (Hip Hing),
// the operator (ASM Global) and `weather_protection=movable`, so the retractable roof is recorded there too.
//
// The building is Hong Kong's "Pearl of the Orient": a smooth pearl-white ovoid skin of ~27,000 triangular aluminium
// panels coated Fluropon Kameleon Lightning Mist, which shifts between mountain blue, metallic purple, silver and
// sea green with the daylight. There are no horizontal storey bands — the whole 55 m shell is one shimmering surface,
// broken only by the wide glazed "mouth" onto Victoria Harbour, the dark glazed skirt at ground level, and the sliding
// seam of the 4,800-tonne retractable roof along the crown. Everything below is a reproducible construction datum,
// not a surveyed engineering level.
import {
  makeAuthoredSite, authoredOsmSource, authoredTerrainHeightAt, AUTHORED_OSM_RETRIEVED,
} from './authored-landmark-site.js';

// OSM way 609099609 v21, 71 distinct ring positions (the way repeats its first node at the end).
export const KAI_TAK_STADIUM_RING_GEOMETRY = Object.freeze([
  { lon: 114.1962566, lat: 22.3224696 }, { lon: 114.1962602, lat: 22.3223003 }, { lon: 114.1962689, lat: 22.3221293 },
  { lon: 114.1962824, lat: 22.3219601 }, { lon: 114.1963012, lat: 22.3218127 }, { lon: 114.1963256, lat: 22.3217147 },
  { lon: 114.1963454, lat: 22.3216486 }, { lon: 114.1963808, lat: 22.3215547 }, { lon: 114.1964256, lat: 22.3214657 },
  { lon: 114.1964801, lat: 22.3213768 }, { lon: 114.1965091, lat: 22.3213389 }, { lon: 114.1965477, lat: 22.3212887 },
  { lon: 114.1966187, lat: 22.3212147 }, { lon: 114.1967066, lat: 22.3211433 }, { lon: 114.1968112, lat: 22.3210762 },
  { lon: 114.1969346, lat: 22.3210177 }, { lon: 114.1970726, lat: 22.3209767 }, { lon: 114.1972029, lat: 22.3209525 },
  { lon: 114.1973349, lat: 22.3209425 }, { lon: 114.1973981, lat: 22.3209440 }, { lon: 114.1974643, lat: 22.3209455 },
  { lon: 114.1976011, lat: 22.3209633 }, { lon: 114.1977474, lat: 22.3210008 }, { lon: 114.1978849, lat: 22.3210551 },
  { lon: 114.1979938, lat: 22.3211185 }, { lon: 114.1980974, lat: 22.3211977 }, { lon: 114.1981845, lat: 22.3212905 },
  { lon: 114.1982227, lat: 22.3213368 }, { lon: 114.1982548, lat: 22.3213756 }, { lon: 114.1983144, lat: 22.3214620 },
  { lon: 114.1983701, lat: 22.3215739 }, { lon: 114.1984109, lat: 22.3216692 }, { lon: 114.1984182, lat: 22.3217135 },
  { lon: 114.1984323, lat: 22.3217992 }, { lon: 114.1984539, lat: 22.3219334 }, { lon: 114.1984547, lat: 22.3220760 },
  { lon: 114.1984536, lat: 22.3222184 }, { lon: 114.1984525, lat: 22.3223528 }, { lon: 114.1984391, lat: 22.3224958 },
  { lon: 114.1984301, lat: 22.3226014 }, { lon: 114.1984231, lat: 22.3226827 }, { lon: 114.1983958, lat: 22.3228202 },
  { lon: 114.1983638, lat: 22.3229301 }, { lon: 114.1983194, lat: 22.3230256 }, { lon: 114.1982670, lat: 22.3231146 },
  { lon: 114.1982289, lat: 22.3231566 }, { lon: 114.1982002, lat: 22.3231882 }, { lon: 114.1981175, lat: 22.3232583 },
  { lon: 114.1980396, lat: 22.3233150 }, { lon: 114.1979400, lat: 22.3233715 }, { lon: 114.1978283, lat: 22.3234220 },
  { lon: 114.1976658, lat: 22.3234604 }, { lon: 114.1975154, lat: 22.3234783 }, { lon: 114.1973884, lat: 22.3234836 },
  { lon: 114.1972039, lat: 22.3234797 }, { lon: 114.1971595, lat: 22.3234755 }, { lon: 114.1970609, lat: 22.3234506 },
  { lon: 114.1969209, lat: 22.3234162 }, { lon: 114.1967946, lat: 22.3233661 }, { lon: 114.1967133, lat: 22.3233228 },
  { lon: 114.1966368, lat: 22.3232693 }, { lon: 114.1965685, lat: 22.3232101 }, { lon: 114.1964992, lat: 22.3231375 },
  { lon: 114.1964377, lat: 22.3230571 }, { lon: 114.1963851, lat: 22.3229770 }, { lon: 114.1963524, lat: 22.3229124 },
  { lon: 114.1963254, lat: 22.3228499 }, { lon: 114.1962975, lat: 22.3227697 }, { lon: 114.1962793, lat: 22.3226950 },
  { lon: 114.1962712, lat: 22.3226446 }, { lon: 114.1962616, lat: 22.3225854 },
]);

export const KAI_TAK_STADIUM_OSM_SOURCE = authoredOsmSource({
  type: 'way', id: 609099609, version: 21,
  tags: {
    leisure: 'stadium', name: '啟德主場館 Kai Tak Stadium', 'name:en': 'Kai Tak Stadium',
    'name:zh': '啟德主場館', 'addr:housenumber': '39', 'addr:street': '承啟道 Shing Kai Road',
    'addr:housename': '啟德體育園 Kai Tak Sports Park', 'addr:unit': '啟德主場館 Kai Tak Stadium',
    architect: 'Populous;關善明建築師事務所 Simon Kwan & Associates',
    engineer: '奧雅納工程顧問 Ove Arup & Partners Hong Kong',
    builder: '協興工程 Hip Hing Engineering', developer: '啟德體育園有限公司 Kai Tak Sports Park Limited',
    operator: 'ASM Global', ownership: 'government', air_conditioning: 'yes', weather_protection: 'movable',
    location: 'podium', wikidata: 'Q134593792',
  },
  geometry: KAI_TAK_STADIUM_RING_GEOMETRY,
  sourceTimestamp: '2026-07-29T06:46:20Z',
  evidence: `OSM way 609099609 v21 (${AUTHORED_OSM_RETRIEVED}): 72 way nodes / 71 distinct ring positions forming the `
    + 'stadium oval; tagged leisure=stadium with the architects, engineer, builder, operator and '
    + 'weather_protection=movable. The way also carries the entrance nodes (refs A–K) that are used here as the '
    + 'position of the public gates.',
});

export const KAI_TAK_STADIUM_SITE = makeAuthoredSite(
  'kaiTakStadium', '啟德主場館', 'Kai Tak Stadium', KAI_TAK_STADIUM_OSM_SOURCE,
  {
    height: 55, levels: null, roadIds: [],
    evidence: 'Exact OSM stadium oval on the Kai Tak runway apron; the pearl shell is modelled inside it, so the '
      + 'building never spills onto the surrounding roads, promenades or the rest of the sports park.',
  },
);

// The ten OSM entrance nodes, refs A–K (there is no I), on the ring: the real gate positions, at level 2.
export const KAI_TAK_STADIUM_GATES = Object.freeze([
  { ref: 'A', lat: 22.3213368, lon: 114.1982227 }, { ref: 'B', lat: 22.3209440, lon: 114.1973981 },
  { ref: 'C', lat: 22.3213389, lon: 114.1965091 }, { ref: 'D', lat: 22.3216486, lon: 114.1963454 },
  { ref: 'E', lat: 22.3226446, lon: 114.1962712 }, { ref: 'F', lat: 22.3232693, lon: 114.1966368 },
  { ref: 'G', lat: 22.3234836, lon: 114.1973884 }, { ref: 'H', lat: 22.3231566, lon: 114.1982289 },
  { ref: 'J', lat: 22.3226014, lon: 114.1984301 }, { ref: 'K', lat: 22.3217135, lon: 114.1984182 },
]);

// --- the "Pearl of the Orient" ---------------------------------------------------
export const KAI_TAK_STADIUM_CAPACITY = 50000;
export const KAI_TAK_STADIUM_HEIGHT = 55;                 // documented roof height, metres
export const KAI_TAK_STADIUM_WIDTH = 270;                 // documented overall width, metres
export const KAI_TAK_STADIUM_FACADE_PANELS = 27000;       // ~27,000 triangular aluminium panels
export const KAI_TAK_STADIUM_ROOF_TONNES = 4800;          // retractable roof mass
export const KAI_TAK_STADIUM_ROOF_TRUSS_SPAN = '150-180 m';
export const KAI_TAK_STADIUM_TOWER_CORES = 4;             // bearing-free reinforced concrete cores
export const KAI_TAK_STADIUM_SKYBOXES = 57;
export const KAI_TAK_STADIUM_OPENED = '2025-03-01';
export const KAI_TAK_STADIUM_CONSTRUCTION_START = '2019-04-23';
export const KAI_TAK_STADIUM_PARK_HECTARES = 28;
export const KAI_TAK_STADIUM_FACADE_COATING = 'Fluropon Kameleon Lightning Mist (self-cleaning Fluropon Clean topcoat)';

export const KAI_TAK_STADIUM_MASSING = Object.freeze({
  halfX: 111.0,              // shell semi-axis across the oval
  halfZ: 138.0,              // shell semi-axis along the oval
  skirtHeight: 10.4,         // dark glazed podium skirt below the pearl skin
  skirtInset: 2.6,
  panelRows: 34,             // rings of pearl panels from skirt to crown
  panelColumns: 96,          // panels around the shell
  crownSlotWidth: 7.0,       // the sliding seam of the retractable roof
  crownSlotHalfLength: 96,
  mouthAngle: 197,           // degrees around the oval: the glazed mouth onto Victoria Harbour
  mouthHalfSpan: 24,         // degrees of the ring at its widest
  mouthCentre: 0.52,         // height fraction of the glazed mouth
  mouthHalfHeight: 0.092,    // height fraction of the lens, so the opening tapers to points at both ends
});

export const KAI_TAK_STADIUM_COLOURS = Object.freeze({
  // The Kameleon coating shifts between these hues with the daylight; the model cycles them deterministically.
  pearl: [
    [0.62, 0.68, 0.80],   // mountain blue
    [0.52, 0.50, 0.72],   // metallic purple
    [0.80, 0.80, 0.82],   // silver
    [0.55, 0.72, 0.72],   // sea green
    [0.66, 0.60, 0.80],   // pale lilac
  ],
  pearlEdge: [0.40, 0.42, 0.52],
  skirtGlass: [0.16, 0.22, 0.25],
  skirtFrame: [0.62, 0.64, 0.66],
  mouthGlass: [0.30, 0.40, 0.44],
  roof: [0.55, 0.57, 0.62],
  roofGutter: [0.34, 0.36, 0.40],
  concourse: [0.74, 0.73, 0.70],
  paving: [0.68, 0.67, 0.64],
  pitch: [0.26, 0.45, 0.20],
  seatBlue: [0.16, 0.24, 0.42],
  seatPurple: [0.42, 0.28, 0.55],
  seatSilver: [0.74, 0.75, 0.77],
  seatOrange: [0.76, 0.42, 0.18],
  park: [0.28, 0.42, 0.22],
});

export const KAI_TAK_STADIUM_RESEARCH_SOURCES = Object.freeze([
  {
    url: 'https://www.arup.com/en-us/projects/kai-tak-stadium/',
    evidence: 'Exterior photograph: one continuous pearl-white ovoid skin of small triangular panels, no storey '
      + 'bands, a wide lens-shaped glazed mouth on the harbour side, and a dark glazed skirt at ground level.',
  },
  {
    url: 'https://multimedia.scmp.com/infographics/sport/article/3300482/kai-tak-sports-park/',
    evidence: '50,000 seats, approximately 55 m high and 270 m wide, nearly 27,000 triangular aluminium panels that '
      + 'shift between mountain blue, metallic purple and silver, with integrated lighting between the panels.',
  },
  {
    url: 'https://www.tradelinkmedia.biz/publications/7/news/5857',
    evidence: 'Retractable roof of nearly 4,800 t on railway-like mechanisms, two pairs of orthogonal main trusses '
      + 'spanning 150–180 m anchored on four bearing-free reinforced-concrete tower cores; Fluropon Kameleon '
      + 'Lightning Mist coating with a self-cleaning Fluropon Clean topcoat; PV panels over 10% of the roof.',
  },
  {
    url: 'https://hongkongfp.com/2025/03/02/hong-kong-opens-kai-tak-sports-park-featuring-centrepiece-50000-seat-stadium/',
    evidence: 'Opened 1 March 2025 as the centrepiece of the 28-hectare, HK$30 billion Kai Tak Sports Park; the '
      + 'purplish pearl facade is the reason for the "Pearl of the Orient" nickname.',
  },
  {
    url: 'https://baike.baidu.com/en/item/Hong%20Kong%20Kai%20Tak%20Main%20Stadium/3006021',
    evidence: 'Construction started 23 April 2019; 57 skyboxes; seats are colour-blocked to spell 啟德; extensive '
      + 'glass curtain walls overlook Victoria Harbour; stage-pocket seating hinges upward for concert stages.',
  },
]);

// Reproducible construction datum: the highest raw DTM sample anywhere on the exact OSM oval.
export function kaiTakStadiumTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([KAI_TAK_STADIUM_SITE], x, z, rawHeight, padHeight);
}
