import { GEO } from '../../hk-geodata.js';
import { pointInFlatRing } from './landmark-site.js';

// 尖沙咀海旁建築、有蓋行人道、星光大道及岸邊 3D 海堤工程
// Tsim Sha Tsui Waterfront Promenade, Covered Colonnade Walkways, Avenue of Stars & 3D Seawall
//
// Extends from TST Star Ferry Pier (vertex 346, X ~ 1024, Z ~ -1226), past Star Ferry Bus Terminus,
// Clock Tower, Kowloon Public Pier No. 1–4, Hong Kong Cultural Centre (1989, José Lei / ArchSD),
// Salisbury Garden, Hong Kong Museum of Art, and Victoria Dockside to Avenue of Stars (星光大道)
// and Tsim Sha Tsui East (vertex 373, X ~ 1806, Z ~ -1587) over a continuous 1.09 km coastline.

export const TST_WATERFRONT_PROMENADE_SOURCE = Object.freeze({
  id: 'HK-TST-WATERFRONT-PROMENADE',
  landRing: 0,
  firstVertex: 346,
  lastVertex: 373,
  lengthMetres: 1089,
  start: 'Tsim Sha Tsui Star Ferry Pier / Bus Terminus / Clock Tower',
  mid: 'Hong Kong Cultural Centre Grand Colonnade & Kowloon Public Pier',
  east: 'Salisbury Garden, Museum of Art & Avenue of Stars (星光大道)',
  end: 'Tsim Sha Tsui East Waterfront',
  starFerryPierYear: 1957,
  culturalCentreYear: 1989,
  avenueOfStarsRevitalisationYear: 2019,
  avenueOfStarsLandscapeArchitect: 'James Corner Field Operations (JCFO)',
  culturalCentreArchitect: 'José Lei (李銘儀, ArchSD)',
  designerAvenueOfStars: 'James Corner Field Operations (JCFO, 2019 redesign)',
  designerCulturalCentre: 'José Lei, Public Works Department / ArchSD (1989)',
  historicalStarFerry: 'Tsim Sha Tsui Star Ferry Pier opened 1957; bus terminus colonnade arcade',
  researchSources: Object.freeze([
    {
      url: 'https://www.avenueofstars.com.hk/',
      title: 'Avenue of Stars Official Portal',
      evidence: '440-metre waterfront promenade reopened in 2019; features wave-form timber handrail, trellised shade canopies, tiered wooden seating, and movie star handprints.'
    },
    {
      url: 'https://www.lcsd.gov.hk/en/hkcc/index.html',
      title: 'Hong Kong Cultural Centre — LCSD',
      evidence: 'Opened 1989; features monumental tiled harbour colonnade, covered ground-level waterfront walkway, and elevated two-level harbour viewing deck.'
    },
    {
      url: 'https://www.cedd.gov.hk/eng/public_services_and_access_to_information/public_piers/index.html',
      title: 'Kowloon Public Pier No. 1–4 — CEDD',
      evidence: 'Public boat landing steps with granite stairs, timber rubbing fenders, and safety handrails fronting Victoria Harbour.'
    },
    {
      url: 'https://www.greening.gov.hk/en/greening-landscape/landscape-corner/index_id_6.html',
      title: 'Greening, Landscape and Tree Management Section (GLTMS)',
      evidence: 'TST Waterfront Promenade features bio-based wood substitute handrail, seaward-leaning wave balusters, and integrated energy-efficient under-handrail night lighting.'
    }
  ])
});

// Dimensions and structural parameters for the promenade components
export const TST_WATERFRONT_PROMENADE_CONFIG = Object.freeze({
  // 3D Seawall Revetment & Coping
  seawall: Object.freeze({
    copingWidth: 0.55,
    copingHeight: 0.28,
    faceBottomY: -2.80, // Descends well beneath mean water level (-2.26 m) into Victoria Harbour
    bollardSpacing: 24.0, // Cast-iron mooring bollards every ~24 m
    lifebuoySpacing: 48.0, // Emergency lifebuoy stanchions every ~48 m
  }),

  // Star Ferry Pier Forecourt & Bus Terminus Covered Passenger Walkway
  starFerryWalkway: Object.freeze({
    startX: 924.0,
    startZ: -1252.0,
    midX: 972.0,
    midZ: -1251.0,
    endX: 1022.0,
    endZ: -1252.0,
    width: 5.2,
    clearHeight: 3.5,
    roofThickness: 0.32,
    columnSpacing: 4.8,
  }),

  // Cultural Centre Grand Covered Colonnade & Elevated Viewing Deck
  culturalColonnade: Object.freeze({
    startX: 1032.0,
    startZ: -1254.0,
    endX: 1192.0,
    endZ: -1258.0,
    width: 11.5,
    deckHeight: 5.4,
    columnSpacing: 8.0,
    columnWidth: 0.85,
    columnDepth: 1.25,
    tiltAngleRad: 0.21, // ~12 degrees inclination towards harbour
    staircaseWidth: 8.0,
  }),

  // Kowloon Public Pier No. 1–4 Landing Steps
  publicPierSteps: Object.freeze([
    { id: 'pier-1', x: 1056.0, z: -1227.0, width: 4.2, steps: 12 },
    { id: 'pier-2', x: 1088.0, z: -1229.0, width: 4.2, steps: 12 },
    { id: 'pier-3', x: 1120.0, z: -1231.0, width: 4.2, steps: 12 },
    { id: 'pier-4', x: 1152.0, z: -1233.0, width: 4.2, steps: 12 },
  ]),

  // Avenue of Stars Wave Shade Canopies (波浪型遮蔭涼亭)
  avenuePavilions: Object.freeze([
    { id: 'pavilion-1', s: 520, length: 18.0, width: 5.8, height: 3.8 },
    { id: 'pavilion-2', s: 680, length: 22.0, width: 6.2, height: 4.0 },
    { id: 'pavilion-3', s: 840, length: 20.0, width: 6.0, height: 3.8 },
    { id: 'pavilion-4', s: 980, length: 18.0, width: 5.8, height: 3.8 },
  ]),

  // Statues plazas along Avenue of Stars
  statues: Object.freeze([
    { id: 'bruce-lee', name: 'Bruce Lee Statue 李小龍銅像', s: 885, offsetInland: 2.8 },
    { id: 'anita-mui', name: 'Anita Mui Statue 梅艷芳銅像', s: 720, offsetInland: 2.8 },
    { id: 'mcdull', name: 'McDull Statue 麥兜銅像', s: 610, offsetInland: 2.5 },
  ])
});
