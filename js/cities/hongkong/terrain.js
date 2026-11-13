import { HK_TERRAIN } from '../../hk-terrain-data.js';
import { HSBC_SITE, pointInFlatRing as originalPointInFlatRing } from './hsbc-headquarters-architecture.js';
import { SCB_SITE, SCB_STAIR_BOTTOM_WORLD } from './standard-chartered-architecture.js';
import { TWO_IFC_SITE } from './two-ifc-architecture.js';
import { ICC_SITE } from './icc-architecture.js';
import { BANK_OF_CHINA_SITE } from './bank-of-china-architecture.js';
import { CENTRAL_PLAZA_SITE } from './central-plaza-architecture.js';
import { THE_CENTER_SITE } from './the-center-architecture.js';
import { NINA_TOWER_PODIUM_SITE } from './nina-tower-architecture.js';
import { CHEUNG_KONG_SITE } from './cheung-kong-architecture.js';
import { K11_ATELIER_SITE } from './k11-atelier-architecture.js';
import { CULLINAN_I_SITE, CULLINAN_I_GROUND_RINGS } from './cullinan-i-architecture.js';
import { CULLINAN_II_SITE, CULLINAN_II_GROUND_RINGS } from './cullinan-ii-architecture.js';
import { MASTERPIECE_SITE, MASTERPIECE_GROUND_RINGS } from './masterpiece-architecture.js';
import { LANGHAM_PLACE_SITE, LANGHAM_PLACE_GROUND_RINGS } from './langham-place-architecture.js';
import { THE_SUMMIT_ENTRANCE, THE_SUMMIT_GROUND_RINGS } from './summit-architecture.js';
import {
  HOPEWELL_GROUND_SAMPLE, HOPEWELL_KENNEDY_GROUND_SAMPLE, HOPEWELL_QRE_ESCALATOR_RISE,
  HOPEWELL_QRE_UPPER_FORECOURT_RING, HOPEWELL_QRE_LOWER_FORECOURT_RING, HOPEWELL_KENNEDY_FORECOURT_RING
} from './hopewell-architecture.js';
import { SUN_HUNG_KAI_GROUND_SAMPLE, SUN_HUNG_KAI_GROUND_RINGS } from './sun-hung-kai-architecture.js';
import {
  TWO_PACIFIC_PLACE_SITE, TWO_PACIFIC_PLACE_GROUND_SAMPLE, TWO_PACIFIC_PLACE_HOTEL_GROUND_SAMPLE,
  TWO_PACIFIC_PLACE_OFFICE_GROUND_SAMPLE, TWO_PACIFIC_PLACE_HOTEL_FORECOURT_RING, TWO_PACIFIC_PLACE_OFFICE_FORECOURT_RING
} from './two-pacific-place-architecture.js';
import { AIRSIDE_SITE, AIRSIDE_GROUND_SAMPLE, isAirsidePlazaPoint } from './airside-architecture.js';
import { LEE_GARDEN_ONE_GROUND_SAMPLE, isLeeGardenOnePlazaPoint } from './lee-garden-one-architecture.js';
import { ONE_IFC_GROUND_SAMPLE, isOneIfcPlazaPoint } from './one-ifc-architecture.js';
import { CHAMPION_TOWER_GROUND_SAMPLE, isChampionTowerPlazaPoint } from './champion-tower-architecture.js';
import { CKC2_GROUND_SAMPLE, isCkc2PlazaPoint } from './ckc2-architecture.js';
import { QGO_GROUND_SAMPLE, QGO_ENTRANCE_GROUND_SAMPLE, isQgoPlazaPoint, isQgoEntranceForecourtPoint } from './qgo-architecture.js';
import { CONRAD_GROUND_SAMPLE, CONRAD_ENTRANCE_GROUND_SAMPLE, CONRAD_ENTRANCE_LANDING_RISE, conradEntranceStepDrop, isConradPlazaPoint, isConradEntranceForecourtPoint } from './conrad-architecture.js';
import { HYSAN_GROUND_SAMPLE, isHysanPlazaPoint } from './hysan-place-architecture.js';
import { TWO_TAIKOO_GROUND_SAMPLE, isTwoTaikooPlazaPoint } from './two-taikoo-place-architecture.js';
import { HENDERSON_GROUND_SAMPLE, isHendersonPlazaPoint } from './the-henderson-architecture.js';
import { ONE_EXCHANGE_GROUND_SAMPLE, isOneExchangePlazaPoint } from './one-exchange-square-architecture.js';
import { TWO_EXCHANGE_GROUND_SAMPLE, isTwoExchangePlazaPoint } from './two-exchange-square-architecture.js';
import { CFA_GROUND_SAMPLE, isCourtOfFinalAppealPoint } from './court-of-final-appeal-architecture.js';
import { HKCEC_GROUND_SAMPLE, isHkcecPoint } from './hkcec-architecture.js';
import { TIMES_SQUARE_GROUND_SAMPLE, timesSquareTerrainHeightAt } from './times-square-architecture.js';
import { HARBOUR_CITY_SITES, harbourCityTerrainHeightAt } from './harbour-city-architecture.js';
import { SPACE_MUSEUM_SITES, spaceMuseumTerrainHeightAt } from './space-museum-architecture.js';
import { CULTURAL_CENTRE_SITE, culturalCentreTerrainHeightAt } from './cultural-centre-architecture.js';
import { CLOCK_TOWER_SITE, CLOCK_TOWER_GARDEN_SITE, clockTowerTerrainHeightAt } from './clock-tower-architecture.js';
import { PENINSULA_GROUND_SITES, peninsulaTerrainHeightAt } from './peninsula-hotel-architecture.js';
import { tstHotelHighestRawDatum } from './tst-hotel-site.js';
import { SHERATON_GROUND_SITES, sheratonTerrainHeightAt } from './sheraton-hotel-architecture.js';
import { SALISBURY_GROUND_SITES, salisburyTerrainHeightAt } from './salisbury-ymca-architecture.js';
import { MONG_KOK_STADIUM_SITE, mongKokStadiumTerrainHeightAt } from './mong-kok-stadium-architecture.js';
import { HONG_KONG_STADIUM_SITE, hongKongStadiumTerrainHeightAt } from './hong-kong-stadium-architecture.js';
import { LAI_YUEN_SITE, laiYuenTerrainHeightAt } from './lai-yuen-architecture.js';
import { QE_STADIUM_SITE, queenElizabethStadiumTerrainHeightAt } from './queen-elizabeth-stadium-architecture.js';
import { KAI_TAK_STADIUM_SITE, kaiTakStadiumTerrainHeightAt } from './kai-tak-stadium-architecture.js';
import { KAI_TAK_ARENA_SITE, kaiTakArenaTerrainHeightAt } from './kai-tak-arena-architecture.js';
import { KAI_TAK_YOUTH_SITE, kaiTakYouthTerrainHeightAt } from './kai-tak-youth-sports-ground-architecture.js';
import { HAPPY_VALLEY_SITE, happyValleyTerrainHeightAt } from './happy-valley-racecourse-architecture.js';
import { SHA_TIN_SITE, shaTinTerrainHeightAt } from './sha-tin-racecourse-architecture.js';
import { KOWLOON_SHANGRI_LA_GROUND_SITES, kowloonShangriLaTerrainHeightAt } from './kowloon-shangri-la-architecture.js';
import { CGO_GROUND_SITES, centralGovernmentTerrainHeightAt } from './central-government-architecture.js';
import { HERITAGE_1881_GROUND_SITES, heritage1881TerrainHeightAt } from './heritage-1881-architecture.js';
import { THE_ARCH_GROUND_SITES, theArchTerrainHeightAt } from './the-arch-architecture.js';
import { SORRENTO_GROUND_SITES, sorrentoTerrainHeightAt } from './sorrento-architecture.js';
import { AIRPORT_TERRAIN_SITES, airportTerrainHeightAt } from './airport-architecture.js';
import { CITY_HALL_GROUND_SITES, cityHallTerrainHeightAt } from './city-hall-architecture.js';
import { CENTRAL_LIBRARY_GROUND_SITES, centralLibraryTerrainHeightAt } from './central-library-architecture.js';
import { HKAPA_GROUND_SITES, hkapaTerrainHeightAt } from './hkapa-architecture.js';
import { authoredHighestRawDatum, authoredTerrainHeightAt } from './authored-landmark-site.js';
import { ST_JOHNS_CATHEDRAL_SITE } from './st-johns-cathedral-site.js';
import { ART_MUSEUM_SITE, artMuseumTerrainHeightAt } from './art-museum-site.js';
import { SCIENCE_MUSEUM_SITE, scienceMuseumTerrainHeightAt } from './science-museum-site.js';
import { HISTORY_MUSEUM_SITE, historyMuseumTerrainHeightAt } from './history-museum-site.js';

// These authored terrain rings are static. Reject distant queries by their exact
// bounds before invoking the same polygon test; preserve boundary semantics.
const terrainRingBounds = new WeakMap();
function pointInFlatRing(ring, x, z) {
  let b = terrainRingBounds.get(ring);
  if (!b) {
    b = {minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity};
    for (let i = 0; i + 1 < ring.length; i += 2) {
      b.minX = Math.min(b.minX, ring[i]); b.maxX = Math.max(b.maxX, ring[i]);
      b.minZ = Math.min(b.minZ, ring[i + 1]); b.maxZ = Math.max(b.maxZ, ring[i + 1]);
    }
    terrainRingBounds.set(ring, b);
  }
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return false;
  return originalPointInFlatRing(ring, x, z);
}

function decodeBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const grid = HK_TERRAIN.grid;
const elevationBytes = decodeBytes(HK_TERRAIN.elevations);
const elevations = new Uint16Array(elevationBytes.buffer);
const coastLandBits = decodeBytes(HK_TERRAIN.coast.landBits);
const valueAt = (col, row) => elevations[row * grid.w + col] / grid.scale;

export function hongKongTerrainCellLand(index) {
  return Boolean(coastLandBits[index >> 3] & (1 << (index & 7)));
}

// Reprojection into the app grid used bilinear source sampling. Runtime height queries reproduce the exact two
// triangles rendered for each cell, avoiding vehicles floating above or sinking into a coarse sloping triangle.
export function rawHongKongTerrainHeight(x, z) {
  const col = Math.max(0, Math.min(grid.w - 1, (x - grid.minX) / grid.cell));
  const row = Math.max(0, Math.min(grid.h - 1, (z - grid.minZ) / grid.cell));
  const x0 = Math.floor(col), y0 = Math.floor(row);
  const x1 = Math.min(grid.w - 1, x0 + 1), y1 = Math.min(grid.h - 1, y0 + 1);
  const tx = col - x0, ty = row - y0;
  const a = valueAt(x0, y0), b = valueAt(x1, y0), c = valueAt(x0, y1), d = valueAt(x1, y1);
  return tx + ty <= 1 ? a + tx * (b - a) + ty * (c - a)
    : d * (tx + ty - 1) + b * (1 - ty) + c * (1 - tx);
}

// The authored landmarks need level construction pads. Their shapes and architecture stay untouched; only the
// common ground datum is sampled from the DTM. This also prevents a coarse hillside triangle piercing a flat plaza.
const HSBC_PAD_HEIGHT = rawHongKongTerrainHeight(HSBC_SITE.x, HSBC_SITE.z);
const SCB_PAD_HEIGHT = rawHongKongTerrainHeight(SCB_STAIR_BOTTOM_WORLD.x, SCB_STAIR_BOTTOM_WORLD.z);
const TWO_IFC_PAD_HEIGHT = rawHongKongTerrainHeight(TWO_IFC_SITE.x, TWO_IFC_SITE.z);
const ICC_PAD_HEIGHT = rawHongKongTerrainHeight(ICC_SITE.x, ICC_SITE.z);
const BANK_OF_CHINA_PAD_HEIGHT = rawHongKongTerrainHeight(BANK_OF_CHINA_SITE.x, BANK_OF_CHINA_SITE.z);
const CENTRAL_PLAZA_PAD_HEIGHT = rawHongKongTerrainHeight(CENTRAL_PLAZA_SITE.x, CENTRAL_PLAZA_SITE.z);
const THE_CENTER_PAD_HEIGHT = rawHongKongTerrainHeight(THE_CENTER_SITE.x, THE_CENTER_SITE.z);
const NINA_TOWER_PAD_HEIGHT = rawHongKongTerrainHeight(NINA_TOWER_PODIUM_SITE.x, NINA_TOWER_PODIUM_SITE.z);
const CHEUNG_KONG_PAD_HEIGHT = rawHongKongTerrainHeight(CHEUNG_KONG_SITE.x, CHEUNG_KONG_SITE.z);
const K11_ATELIER_PAD_HEIGHT = rawHongKongTerrainHeight(K11_ATELIER_SITE.x, K11_ATELIER_SITE.z);
const CULLINAN_I_PAD_HEIGHT = rawHongKongTerrainHeight(CULLINAN_I_SITE.x, CULLINAN_I_SITE.z);
const CULLINAN_II_PAD_HEIGHT = rawHongKongTerrainHeight(CULLINAN_II_SITE.x, CULLINAN_II_SITE.z);
const MASTERPIECE_PAD_HEIGHT = rawHongKongTerrainHeight(MASTERPIECE_SITE.x, MASTERPIECE_SITE.z);
const LANGHAM_PLACE_PAD_HEIGHT = rawHongKongTerrainHeight(LANGHAM_PLACE_SITE.x, LANGHAM_PLACE_SITE.z);
const SUMMIT_PAD_HEIGHT = rawHongKongTerrainHeight(THE_SUMMIT_ENTRANCE.x, THE_SUMMIT_ENTRANCE.z);
// Hopewell keeps its sloping DTM across the cylinder. Only the two actual entrance nodes and the QRE escalator
// landings receive separate local pads; these DTM-derived surfaces are not surveyed engineering elevations.
const HOPEWELL_DATUM_HEIGHT = rawHongKongTerrainHeight(HOPEWELL_GROUND_SAMPLE.x, HOPEWELL_GROUND_SAMPLE.z);
const HOPEWELL_QRE_UPPER_PAD_HEIGHT = HOPEWELL_DATUM_HEIGHT + 0.12;
const HOPEWELL_QRE_LOWER_PAD_HEIGHT = HOPEWELL_QRE_UPPER_PAD_HEIGHT - HOPEWELL_QRE_ESCALATOR_RISE;
const HOPEWELL_KENNEDY_PAD_HEIGHT = rawHongKongTerrainHeight(HOPEWELL_KENNEDY_GROUND_SAMPLE.x, HOPEWELL_KENNEDY_GROUND_SAMPLE.z) + 0.12;
// Sun Hung Kai Centre uses its Harbour Road entrance DTM sample. The covered service way remains road-priority.
const SUN_HUNG_KAI_PAD_HEIGHT = rawHongKongTerrainHeight(SUN_HUNG_KAI_GROUND_SAMPLE.x, SUN_HUNG_KAI_GROUND_SAMPLE.z);
// Two Pacific Place keeps three DTM-derived construction levels: tower, Supreme Court Road hotel arrival and Queensway office lobby.
// The larger podium overhang is deliberately not a ground pad; its service driveway and natural terrain stay intact.
const TWO_PACIFIC_PLACE_PAD_HEIGHT = rawHongKongTerrainHeight(TWO_PACIFIC_PLACE_GROUND_SAMPLE.x, TWO_PACIFIC_PLACE_GROUND_SAMPLE.z);
const TWO_PACIFIC_PLACE_HOTEL_PAD_HEIGHT = rawHongKongTerrainHeight(TWO_PACIFIC_PLACE_HOTEL_GROUND_SAMPLE.x, TWO_PACIFIC_PLACE_HOTEL_GROUND_SAMPLE.z) + 0.12;
const TWO_PACIFIC_PLACE_OFFICE_PAD_HEIGHT = rawHongKongTerrainHeight(TWO_PACIFIC_PLACE_OFFICE_GROUND_SAMPLE.x, TWO_PACIFIC_PLACE_OFFICE_GROUND_SAMPLE.z) + 0.12;
// AIRSIDE's broad Kai Tak construction platform uses the main-tower DTM sample. Surface access ways share this pad;
// the eight B1 tunnel ways retain their own portal-connected profiles rather than being raised to the podium datum.
const AIRSIDE_PAD_HEIGHT = rawHongKongTerrainHeight(AIRSIDE_GROUND_SAMPLE.x, AIRSIDE_GROUND_SAMPLE.z);
// Lee Garden One uses the OSM building-centre DTM sample. Its exact building / podium ring is the construction pad;
// the smaller floor-plan-directed office tower is not substituted for that base, and the parking access stays road-priority.
const LEE_GARDEN_ONE_PAD_HEIGHT = rawHongKongTerrainHeight(LEE_GARDEN_ONE_GROUND_SAMPLE.x, LEE_GARDEN_ONE_GROUND_SAMPLE.z);
// One IFC uses its stepped-square OSM tower centre. The drive-through keeps the selected road profile above this pad.
const ONE_IFC_PAD_HEIGHT = rawHongKongTerrainHeight(ONE_IFC_GROUND_SAMPLE.x, ONE_IFC_GROUND_SAMPLE.z);
// Champion Tower uses its own OSM centre; the taller ICBC wing and shared retail podium are separate buildings.
const CHAMPION_TOWER_PAD_HEIGHT = rawHongKongTerrainHeight(CHAMPION_TOWER_GROUND_SAMPLE.x, CHAMPION_TOWER_GROUND_SAMPLE.z);
// Cheung Kong Center II uses its own Harcourt Road OSM centre, separate from the original Cheung Kong Center.
const CKC2_PAD_HEIGHT = rawHongKongTerrainHeight(CKC2_GROUND_SAMPLE.x, CKC2_GROUND_SAMPLE.z);
// QGO's documented road portals keep raw DTM under carriageways; the rest of the podium shares one pad.
const QGO_PAD_HEIGHT = rawHongKongTerrainHeight(QGO_GROUND_SAMPLE.x, QGO_GROUND_SAMPLE.z);
const QGO_ENTRANCE_PAD_HEIGHT = rawHongKongTerrainHeight(QGO_ENTRANCE_GROUND_SAMPLE.x, QGO_ENTRANCE_GROUND_SAMPLE.z);
// Conrad's fixed curved tower sits above an open arrival level. Road corridors retain their raw / selected profiles;
// the Supreme Court Road door has a DTM-anchored, photo-directed stepped landing above the driveway, not a surveyed road level.
const CONRAD_PAD_HEIGHT = rawHongKongTerrainHeight(CONRAD_GROUND_SAMPLE.x, CONRAD_GROUND_SAMPLE.z);
const CONRAD_ENTRANCE_PAD_HEIGHT = rawHongKongTerrainHeight(CONRAD_ENTRANCE_GROUND_SAMPLE.x, CONRAD_ENTRANCE_GROUND_SAMPLE.z) + CONRAD_ENTRANCE_LANDING_RISE;
// Hysan Place uses its commercial-building centre DTM sample. The parking-access carriageway remains road-priority.
const HYSAN_PAD_HEIGHT = rawHongKongTerrainHeight(HYSAN_GROUND_SAMPLE.x, HYSAN_GROUND_SAMPLE.z);
// Two Taikoo Place uses its own building-centre DTM sample; surface mouths and the service tunnel stay road-priority.
const TWO_TAIKOO_PAD_HEIGHT = rawHongKongTerrainHeight(TWO_TAIKOO_GROUND_SAMPLE.x, TWO_TAIKOO_GROUND_SAMPLE.z);
// The Henderson keeps its exact OSM site and a road-safe Murray Road forecourt on one DTM-derived construction datum.
const HENDERSON_PAD_HEIGHT = rawHongKongTerrainHeight(HENDERSON_GROUND_SAMPLE.x, HENDERSON_GROUND_SAMPLE.z);
// One Exchange Square uses its own DTM datum while the surface bus-terminal road retains road-priority queries.
const ONE_EXCHANGE_PAD_HEIGHT = rawHongKongTerrainHeight(ONE_EXCHANGE_GROUND_SAMPLE.x, ONE_EXCHANGE_GROUND_SAMPLE.z);
const TWO_EXCHANGE_PAD_HEIGHT = rawHongKongTerrainHeight(TWO_EXCHANGE_GROUND_SAMPLE.x, TWO_EXCHANGE_GROUND_SAMPLE.z);
// The declared-monument court uses its own building-centre DTM sample; surrounding carriageways stay outside its OSM ring.
const CFA_PAD_HEIGHT = rawHongKongTerrainHeight(CFA_GROUND_SAMPLE.x, CFA_GROUND_SAMPLE.z);
// HKCEC and the apartment podium share the Old Wing Harbour Road entrance DTM sample. This is a construction datum, not a surveyed road-engineering level.
const HKCEC_PAD_HEIGHT = rawHongKongTerrainHeight(HKCEC_GROUND_SAMPLE.x, HKCEC_GROUND_SAMPLE.z);
// Times Square keeps the higher natural DTM across its commercial site and only raises lower piazza samples to the
// main-piazza datum. The three tunnel carriageways are excluded and retain their own portal-connected profiles.
const TIMES_SQUARE_PAD_HEIGHT = rawHongKongTerrainHeight(TIMES_SQUARE_GROUND_SAMPLE.x, TIMES_SQUARE_GROUND_SAMPLE.z);
// Harbour City's long marine decks and podium pads use the highest raw DTM sample on each exact source ring.
// These are reproducible construction datums, not surveyed engineering levels; crossing carriageways stay road-priority.
const HARBOUR_CITY_PAD_HEIGHTS = Object.freeze(Object.fromEntries(HARBOUR_CITY_SITES.map((site) => {
  let height = rawHongKongTerrainHeight(site.x, site.z);
  for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHongKongTerrainHeight(site.ring[i], site.ring[i + 1]));
  return [site.key, height];
})));
export function harbourCityPadHeight(key) { const height = HARBOUR_CITY_PAD_HEIGHTS[key]; if (!Number.isFinite(height)) throw new Error(`Unknown Harbour City pad: ${key}`); return height; }
// The two Space Museum wings share one DTM-derived construction datum so their touching shells cannot develop a seam.
// This is not a surveyed engineering level; every selected road remains road-priority in the world ground query.
const SPACE_MUSEUM_PAD_HEIGHT = (() => {
  let height = -Infinity;
  for (const site of SPACE_MUSEUM_SITES) { height = Math.max(height, rawHongKongTerrainHeight(site.x, site.z)); for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHongKongTerrainHeight(site.ring[i], site.ring[i + 1])); }
  return height;
})();
export function spaceMuseumPadHeight() { return SPACE_MUSEUM_PAD_HEIGHT; }
// The Hong Kong Museum of Art shares one DTM-derived datum across its 16-point outline ring.
const ART_MUSEUM_PAD_HEIGHT = (() => {
  const site = ART_MUSEUM_SITE; let height = rawHongKongTerrainHeight(site.x, site.z);
  for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHongKongTerrainHeight(site.ring[i], site.ring[i + 1]));
  return height;
})();
export function artMuseumPadHeight() { return ART_MUSEUM_PAD_HEIGHT; }
// The Hong Kong Science Museum shares one DTM-derived datum across its 7-point outline ring.
const SCIENCE_MUSEUM_PAD_HEIGHT = (() => {
  const site = SCIENCE_MUSEUM_SITE; let height = rawHongKongTerrainHeight(site.x, site.z);
  for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHongKongTerrainHeight(site.ring[i], site.ring[i + 1]));
  return height;
})();
export function scienceMuseumPadHeight() { return SCIENCE_MUSEUM_PAD_HEIGHT; }
// The Hong Kong Museum of History shares one DTM-derived datum across its 67-point stepped ring.
const HISTORY_MUSEUM_PAD_HEIGHT = (() => {
  const site = HISTORY_MUSEUM_SITE; let height = rawHongKongTerrainHeight(site.x, site.z);
  for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHongKongTerrainHeight(site.ring[i], site.ring[i + 1]));
  return height;
})();
export function historyMuseumPadHeight() { return HISTORY_MUSEUM_PAD_HEIGHT; }
// The Cultural Centre shares one DTM-derived construction datum across its exact civic-building ring.
// The lower south-east site remains road-safe; this is not a surveyed architectural or engineering level.
const CULTURAL_CENTRE_PAD_HEIGHT = (() => {
  const site = CULTURAL_CENTRE_SITE; let height = rawHongKongTerrainHeight(site.x, site.z);
  for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHongKongTerrainHeight(site.ring[i], site.ring[i + 1]));
  return height;
})();
export function culturalCentrePadHeight() { return CULTURAL_CENTRE_PAD_HEIGHT; }
// The Clock Tower and its small photo-directed pool apron share the highest DTM sample on their construction rings.
// The wider palm garden keeps its own raw DTM at every tree. No surveyed engineering elevation is claimed.
const CLOCK_TOWER_PAD_HEIGHT = (() => {
  let height = -Infinity;
  for (const site of [CLOCK_TOWER_SITE, CLOCK_TOWER_GARDEN_SITE]) {
    height = Math.max(height, rawHongKongTerrainHeight(site.x, site.z));
    for (let i = 0; i < site.ring.length; i += 2) height = Math.max(height, rawHongKongTerrainHeight(site.ring[i], site.ring[i + 1]));
  }
  return height;
})();
export function clockTowerPadHeight() { return CLOCK_TOWER_PAD_HEIGHT; }
// The Peninsula's two exact building rings and its contained U-shaped forecourt share one DTM-derived datum.
// This is a reproducible construction platform, not a surveyed architectural or road-engineering elevation.
const PENINSULA_PAD_HEIGHT = tstHotelHighestRawDatum(PENINSULA_GROUND_SITES, rawHongKongTerrainHeight);
export function peninsulaPadHeight() { return PENINSULA_PAD_HEIGHT; }
const SHERATON_PAD_HEIGHT = tstHotelHighestRawDatum(SHERATON_GROUND_SITES, rawHongKongTerrainHeight);
export function sheratonPadHeight() { return SHERATON_PAD_HEIGHT; }
const KOWLOON_SHANGRI_LA_PAD_HEIGHT = tstHotelHighestRawDatum(KOWLOON_SHANGRI_LA_GROUND_SITES, rawHongKongTerrainHeight);
export function kowloonShangriLaPadHeight() { return KOWLOON_SHANGRI_LA_PAD_HEIGHT; }
const SALISBURY_PAD_HEIGHT = tstHotelHighestRawDatum(SALISBURY_GROUND_SITES, rawHongKongTerrainHeight);
export function salisburyPadHeight() { return SALISBURY_PAD_HEIGHT; }
// Tamar's civic buildings share a reproducible DTM-derived construction datum. The original access roads
// keep their own profiles; this is not a surveyed engineering or road level.
// Mong Kok Stadium's exact OSM block supplies one reproducible DTM datum for the pitch, bowl and plaza.
const MONG_KOK_STADIUM_PAD_HEIGHT = authoredHighestRawDatum([MONG_KOK_STADIUM_SITE], rawHongKongTerrainHeight);
export function mongKokStadiumPadHeight() { return MONG_KOK_STADIUM_PAD_HEIGHT; }
// Hong Kong Stadium's So Kon Po bowl and its source block share one reproducible DTM datum.
const HONG_KONG_STADIUM_PAD_HEIGHT = authoredHighestRawDatum([HONG_KONG_STADIUM_SITE], rawHongKongTerrainHeight);
export function hongKongStadiumPadHeight() { return HONG_KONG_STADIUM_PAD_HEIGHT; }
// HISTORICAL RECONSTRUCTION: 荔園 Lai Yuen (1949-1997) shares one reproducible DTM datum over its modelled outline.
// 荔園 was levelled ground above the Lai Chi Kok shore, not a mound: hold the park at the median datum of the
// ground inside its own footprint, so the plateau matches the streets round it and the DEM hillside behind it is
// cut back to the park wall instead of lifting the whole park twelve metres into the air.
function authoredMedianInteriorDatum(site, rawHeightAt, step = 4) {
  const samples = [];
  const bounds = site.bounds;
  for (let x = bounds.minX; x <= bounds.maxX; x += step) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += step) {
      if (pointInFlatRing(site.ring, x, z)) samples.push(rawHeightAt(x, z));
    }
  }
  if (!samples.length) return rawHeightAt(site.x, site.z);
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1];
}
const LAI_YUEN_PAD_HEIGHT = authoredMedianInteriorDatum(LAI_YUEN_SITE, rawHongKongTerrainHeight);
export function laiYuenPadHeight() { return LAI_YUEN_PAD_HEIGHT; }
// 伊利沙伯體育館 Queen Elizabeth Stadium sits on Morrison Hill; one reproducible datum over its OSM ring.
const QUEEN_ELIZABETH_STADIUM_PAD_HEIGHT = authoredHighestRawDatum([QE_STADIUM_SITE], rawHongKongTerrainHeight);
export function queenElizabethStadiumPadHeight() { return QUEEN_ELIZABETH_STADIUM_PAD_HEIGHT; }
// 啟德主場館 Kai Tak Stadium: one reproducible datum over the whole stadium oval on the former runway apron.
const KAI_TAK_STADIUM_PAD_HEIGHT = authoredHighestRawDatum([KAI_TAK_STADIUM_SITE], rawHongKongTerrainHeight);
export function kaiTakStadiumPadHeight() { return KAI_TAK_STADIUM_PAD_HEIGHT; }
// 啟德體藝館 Kai Tak Arena and 啟德青年運動場 Kai Tak Youth Sports Ground: one datum each over their OSM blocks.
const KAI_TAK_ARENA_PAD_HEIGHT = authoredHighestRawDatum([KAI_TAK_ARENA_SITE], rawHongKongTerrainHeight);
const KAI_TAK_YOUTH_PAD_HEIGHT = authoredHighestRawDatum([KAI_TAK_YOUTH_SITE], rawHongKongTerrainHeight);
export function kaiTakArenaPadHeight() { return KAI_TAK_ARENA_PAD_HEIGHT; }
export function kaiTakYouthPadHeight() { return KAI_TAK_YOUTH_PAD_HEIGHT; }
// 跑馬地馬場 Happy Valley Racecourse lies on the flat drained floor of the valley, so the course is held at the
// lowest datum round its fence: the DEM rises up the slopes of 渣甸山 and 大坑 on the landward sides, and those
// slopes are the hillsides behind the boundary wall rather than part of the course.
function authoredMedianRawDatum(sites, rawHeightAt) {
  const samples = [];
  for (const site of sites) {
    samples.push(rawHeightAt(site.x, site.z));
    for (let i = 0; i < site.ring.length; i += 2) samples.push(rawHeightAt(site.ring[i], site.ring[i + 1]));
  }
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1];
}
const HAPPY_VALLEY_PAD_HEIGHT = authoredMedianRawDatum([HAPPY_VALLEY_SITE], rawHongKongTerrainHeight);
// 沙田馬場 sits on the Shing Mun River plain: the median of the ground inside the surveyed fence, sampled on a
// 8 m grid, so the 71.7 hectare course is flat without being lifted onto the river terraces.
const SHA_TIN_PAD_HEIGHT = authoredMedianInteriorDatum(SHA_TIN_SITE, rawHongKongTerrainHeight, 8);
export function happyValleyPadHeight() { return HAPPY_VALLEY_PAD_HEIGHT; }
const CENTRAL_GOVERNMENT_PAD_HEIGHT = authoredHighestRawDatum(CGO_GROUND_SITES, rawHongKongTerrainHeight);
export function centralGovernmentPadHeight() { return CENTRAL_GOVERNMENT_PAD_HEIGHT; }
// 1881's source compound, retail podium and Main Building share one reproducible DTM construction datum.
// No retained carriageway centre vertex intersects these rings; this is not a surveyed heritage-site level.
const HERITAGE_1881_PAD_HEIGHT = authoredHighestRawDatum(HERITAGE_1881_GROUND_SITES, rawHongKongTerrainHeight);
export function heritage1881PadHeight() { return HERITAGE_1881_PAD_HEIGHT; }
// The Arch's exact estate ring supplies one DTM datum; its retained station roads keep their own profiles.
const THE_ARCH_PAD_HEIGHT = authoredHighestRawDatum(THE_ARCH_GROUND_SITES, rawHongKongTerrainHeight);
export function theArchPadHeight() { return THE_ARCH_PAD_HEIGHT; }
// Sorrento's exact six-level podium supplies one DTM datum; retained Austin Road / station ways keep their profiles.
const SORRENTO_PAD_HEIGHT = authoredHighestRawDatum(SORRENTO_GROUND_SITES, rawHongKongTerrainHeight);
// City Hall's civic site shares a DTM-derived construction datum. Its internal service ways stay road-priority;
// the overall site is not treated as one building and this is not a surveyed engineering elevation.
const CITY_HALL_PAD_HEIGHT = authoredHighestRawDatum(CITY_HALL_GROUND_SITES, rawHongKongTerrainHeight);
export function cityHallPadHeight() { return CITY_HALL_PAD_HEIGHT; }
const HKAPA_PAD_HEIGHT = authoredHighestRawDatum(HKAPA_GROUND_SITES, rawHongKongTerrainHeight);
export function hkapaPadHeight() { return HKAPA_PAD_HEIGHT; }
const CENTRAL_LIBRARY_PAD_HEIGHT = authoredHighestRawDatum(CENTRAL_LIBRARY_GROUND_SITES, rawHongKongTerrainHeight);
export function centralLibraryPadHeight() { return CENTRAL_LIBRARY_PAD_HEIGHT; }
// Airport construction pads use each source footprint's highest raw DTM sample. They are presentation datums only;
// the northern runway itself remains on the unmodified DTM rather than receiving an invented engineering elevation.
const AIRPORT_PAD_HEIGHTS = Object.freeze(Object.fromEntries(AIRPORT_TERRAIN_SITES.map((site) => [
  site.key, authoredHighestRawDatum([site], rawHongKongTerrainHeight),
])));
export function sorrentoPadHeight() { return SORRENTO_PAD_HEIGHT; }
// 聖約翰座堂 St John's Cathedral stands on one level precinct terrace cut into the Garden Road slope: the mapped ring
// falls 4.11 m from 28.55 m at the north-west to 24.44 m at the south-east, which an 1849 building cannot straddle. The
// terrace is held at the highest raw DTM sample of its own OSM ring, the same reproducible convention used by the other
// authored sites. That raises the south-east threshold ~4 m above the raw DEM and leaves a retaining face towards
// 長江公園; the retaining face is presentation, not a surveyed engineering elevation.
const ST_JOHNS_CATHEDRAL_PAD_HEIGHT = authoredHighestRawDatum([ST_JOHNS_CATHEDRAL_SITE], rawHongKongTerrainHeight);
export function stJohnsCathedralPadHeight() { return ST_JOHNS_CATHEDRAL_PAD_HEIGHT; }
export function stJohnsCathedralTerrainHeightAt(x, z, rawHeight, padHeight) {
  return authoredTerrainHeightAt([ST_JOHNS_CATHEDRAL_SITE], x, z, rawHeight, padHeight);
}

export function hongKongTerrainHeight(x, z) {
  if (pointInFlatRing(HSBC_SITE.ring, x, z)) return HSBC_PAD_HEIGHT;
  if (pointInFlatRing(SCB_SITE.ring, x, z)) return SCB_PAD_HEIGHT;
  if (pointInFlatRing(TWO_IFC_SITE.ring, x, z)) return TWO_IFC_PAD_HEIGHT;
  if (pointInFlatRing(ICC_SITE.ring, x, z)) return ICC_PAD_HEIGHT;
  if (pointInFlatRing(BANK_OF_CHINA_SITE.ring, x, z)) return BANK_OF_CHINA_PAD_HEIGHT;
  if (pointInFlatRing(CENTRAL_PLAZA_SITE.ring, x, z)) return CENTRAL_PLAZA_PAD_HEIGHT;
  if (pointInFlatRing(THE_CENTER_SITE.ring, x, z)) return THE_CENTER_PAD_HEIGHT;
  if (pointInFlatRing(NINA_TOWER_PODIUM_SITE.ring, x, z)) return NINA_TOWER_PAD_HEIGHT;
  if (pointInFlatRing(CHEUNG_KONG_SITE.ring, x, z)) return CHEUNG_KONG_PAD_HEIGHT;
  if (pointInFlatRing(K11_ATELIER_SITE.ring, x, z)) return K11_ATELIER_PAD_HEIGHT;
  if (CULLINAN_I_GROUND_RINGS.some((ring) => pointInFlatRing(ring, x, z))) return CULLINAN_I_PAD_HEIGHT;
  if (CULLINAN_II_GROUND_RINGS.some((ring) => pointInFlatRing(ring, x, z))) return CULLINAN_II_PAD_HEIGHT;
  if (MASTERPIECE_GROUND_RINGS.some((ring) => pointInFlatRing(ring, x, z))) return MASTERPIECE_PAD_HEIGHT;
  if (LANGHAM_PLACE_GROUND_RINGS.some((ring) => pointInFlatRing(ring, x, z))) return LANGHAM_PLACE_PAD_HEIGHT;
  if (THE_SUMMIT_GROUND_RINGS.some((ring) => pointInFlatRing(ring, x, z))) return SUMMIT_PAD_HEIGHT;
  if (pointInFlatRing(HOPEWELL_QRE_UPPER_FORECOURT_RING, x, z)) return HOPEWELL_QRE_UPPER_PAD_HEIGHT;
  if (pointInFlatRing(HOPEWELL_QRE_LOWER_FORECOURT_RING, x, z)) return HOPEWELL_QRE_LOWER_PAD_HEIGHT;
  if (pointInFlatRing(HOPEWELL_KENNEDY_FORECOURT_RING, x, z)) return HOPEWELL_KENNEDY_PAD_HEIGHT;
  if (SUN_HUNG_KAI_GROUND_RINGS.some((ring) => pointInFlatRing(ring, x, z))) return SUN_HUNG_KAI_PAD_HEIGHT;
  if (pointInFlatRing(TWO_PACIFIC_PLACE_HOTEL_FORECOURT_RING, x, z)) return TWO_PACIFIC_PLACE_HOTEL_PAD_HEIGHT;
  if (pointInFlatRing(TWO_PACIFIC_PLACE_OFFICE_FORECOURT_RING, x, z)) return TWO_PACIFIC_PLACE_OFFICE_PAD_HEIGHT;
  if (pointInFlatRing(TWO_PACIFIC_PLACE_SITE.ring, x, z)) return TWO_PACIFIC_PLACE_PAD_HEIGHT;
  if (isAirsidePlazaPoint(x, z)) return AIRSIDE_PAD_HEIGHT;
  if (isLeeGardenOnePlazaPoint(x, z)) return LEE_GARDEN_ONE_PAD_HEIGHT;
  if (isOneIfcPlazaPoint(x, z)) return ONE_IFC_PAD_HEIGHT;
  if (isChampionTowerPlazaPoint(x, z)) return CHAMPION_TOWER_PAD_HEIGHT;
  if (isCkc2PlazaPoint(x, z)) return CKC2_PAD_HEIGHT;
  if (isQgoEntranceForecourtPoint(x, z)) return QGO_ENTRANCE_PAD_HEIGHT;
  if (isQgoPlazaPoint(x, z)) return QGO_PAD_HEIGHT;
  if (isConradEntranceForecourtPoint(x, z)) return CONRAD_ENTRANCE_PAD_HEIGHT - conradEntranceStepDrop(x, z);
  if (isConradPlazaPoint(x, z)) return CONRAD_PAD_HEIGHT;
  if (isHysanPlazaPoint(x, z)) return HYSAN_PAD_HEIGHT;
  if (isTwoTaikooPlazaPoint(x, z)) return TWO_TAIKOO_PAD_HEIGHT;
  if (isHendersonPlazaPoint(x, z)) return HENDERSON_PAD_HEIGHT;
  if (isOneExchangePlazaPoint(x, z)) return ONE_EXCHANGE_PAD_HEIGHT;
  if (isTwoExchangePlazaPoint(x, z)) return TWO_EXCHANGE_PAD_HEIGHT;
  if (isCourtOfFinalAppealPoint(x, z)) return CFA_PAD_HEIGHT;
  if (isHkcecPoint(x, z)) return HKCEC_PAD_HEIGHT;
  const rawHeight = rawHongKongTerrainHeight(x, z);
  const timesSquareHeight = timesSquareTerrainHeightAt(x, z, rawHeight, TIMES_SQUARE_PAD_HEIGHT);
  const harbourCityHeight = harbourCityTerrainHeightAt(x, z, timesSquareHeight, HARBOUR_CITY_PAD_HEIGHTS);
  const spaceMuseumHeight = spaceMuseumTerrainHeightAt(x, z, harbourCityHeight, SPACE_MUSEUM_PAD_HEIGHT);
  const artMuseumHeight = artMuseumTerrainHeightAt(x, z, spaceMuseumHeight, ART_MUSEUM_PAD_HEIGHT);
  const culturalCentreHeight = culturalCentreTerrainHeightAt(x, z, artMuseumHeight, CULTURAL_CENTRE_PAD_HEIGHT);
  const clockTowerHeight = clockTowerTerrainHeightAt(x, z, culturalCentreHeight, CLOCK_TOWER_PAD_HEIGHT);
  const peninsulaHeight = peninsulaTerrainHeightAt(x, z, clockTowerHeight, PENINSULA_PAD_HEIGHT);
  const sheratonHeight = sheratonTerrainHeightAt(x, z, peninsulaHeight, SHERATON_PAD_HEIGHT);
  const salisburyHeight = salisburyTerrainHeightAt(x, z, sheratonHeight, SALISBURY_PAD_HEIGHT);
  const kowloonShangriLaHeight = kowloonShangriLaTerrainHeightAt(x, z, salisburyHeight, KOWLOON_SHANGRI_LA_PAD_HEIGHT);
  const centralGovernmentHeight = centralGovernmentTerrainHeightAt(x, z, kowloonShangriLaHeight, CENTRAL_GOVERNMENT_PAD_HEIGHT);
  const heritage1881Height = heritage1881TerrainHeightAt(x, z, centralGovernmentHeight, HERITAGE_1881_PAD_HEIGHT);
  const theArchHeight = theArchTerrainHeightAt(x, z, heritage1881Height, THE_ARCH_PAD_HEIGHT);
  const sorrentoHeight = sorrentoTerrainHeightAt(x, z, theArchHeight, SORRENTO_PAD_HEIGHT);
  const stJohnsCathedralHeight = stJohnsCathedralTerrainHeightAt(x, z, sorrentoHeight, ST_JOHNS_CATHEDRAL_PAD_HEIGHT);
  const cityHallHeight = cityHallTerrainHeightAt(x, z, stJohnsCathedralHeight, CITY_HALL_PAD_HEIGHT);
  const centralLibraryHeight = centralLibraryTerrainHeightAt(x, z, cityHallHeight, CENTRAL_LIBRARY_PAD_HEIGHT);
  const hkapaHeight = hkapaTerrainHeightAt(x, z, centralLibraryHeight, HKAPA_PAD_HEIGHT);
  const stadiumHeight = mongKokStadiumTerrainHeightAt(x, z, hkapaHeight, MONG_KOK_STADIUM_PAD_HEIGHT);
  const bigStadiumHeight = hongKongStadiumTerrainHeightAt(x, z, stadiumHeight, HONG_KONG_STADIUM_PAD_HEIGHT);
  const laiYuenHeight = laiYuenTerrainHeightAt(x, z, bigStadiumHeight, LAI_YUEN_PAD_HEIGHT);
  const qeStadiumHeight = queenElizabethStadiumTerrainHeightAt(x, z, laiYuenHeight, QUEEN_ELIZABETH_STADIUM_PAD_HEIGHT);
  const kaiTakStadiumHeight = kaiTakStadiumTerrainHeightAt(x, z, qeStadiumHeight, KAI_TAK_STADIUM_PAD_HEIGHT);
  const kaiTakArenaHeight = kaiTakArenaTerrainHeightAt(x, z, kaiTakStadiumHeight, KAI_TAK_ARENA_PAD_HEIGHT);
  const kaiTakYouthHeight = kaiTakYouthTerrainHeightAt(x, z, kaiTakArenaHeight, KAI_TAK_YOUTH_PAD_HEIGHT);
  const happyValleyHeight = happyValleyTerrainHeightAt(x, z, kaiTakYouthHeight, HAPPY_VALLEY_PAD_HEIGHT);
  const shaTinHeight = shaTinTerrainHeightAt(x, z, happyValleyHeight, SHA_TIN_PAD_HEIGHT);
  const scienceMuseumHeight = scienceMuseumTerrainHeightAt(x, z, shaTinHeight, SCIENCE_MUSEUM_PAD_HEIGHT);
  const historyMuseumHeight = historyMuseumTerrainHeightAt(x, z, scienceMuseumHeight, HISTORY_MUSEUM_PAD_HEIGHT);
  return airportTerrainHeightAt(AIRPORT_TERRAIN_SITES, AIRPORT_PAD_HEIGHTS, x, z, historyMuseumHeight);
}

export const HONG_KONG_TERRAIN_META = Object.freeze({
  source: HK_TERRAIN.source,
  grid,
  hsbcPadHeight: HSBC_PAD_HEIGHT,
  scbPadHeight: SCB_PAD_HEIGHT,
  twoIfcPadHeight: TWO_IFC_PAD_HEIGHT,
  iccPadHeight: ICC_PAD_HEIGHT,
  bankOfChinaPadHeight: BANK_OF_CHINA_PAD_HEIGHT,
  centralPlazaPadHeight: CENTRAL_PLAZA_PAD_HEIGHT,
  theCenterPadHeight: THE_CENTER_PAD_HEIGHT,
  ninaTowerPadHeight: NINA_TOWER_PAD_HEIGHT,
  cheungKongPadHeight: CHEUNG_KONG_PAD_HEIGHT,
  k11AtelierPadHeight: K11_ATELIER_PAD_HEIGHT,
  cullinanIPadHeight: CULLINAN_I_PAD_HEIGHT,
  cullinanIIPadHeight: CULLINAN_II_PAD_HEIGHT,
  masterpiecePadHeight: MASTERPIECE_PAD_HEIGHT,
  langhamPlacePadHeight: LANGHAM_PLACE_PAD_HEIGHT,
  summitPadHeight: SUMMIT_PAD_HEIGHT,
  hopewellDatumHeight: HOPEWELL_DATUM_HEIGHT,
  hopewellQreUpperPadHeight: HOPEWELL_QRE_UPPER_PAD_HEIGHT,
  hopewellQreLowerPadHeight: HOPEWELL_QRE_LOWER_PAD_HEIGHT,
  hopewellKennedyPadHeight: HOPEWELL_KENNEDY_PAD_HEIGHT,
  sunHungKaiPadHeight: SUN_HUNG_KAI_PAD_HEIGHT,
  twoPacificPlacePadHeight: TWO_PACIFIC_PLACE_PAD_HEIGHT,
  twoPacificPlaceHotelPadHeight: TWO_PACIFIC_PLACE_HOTEL_PAD_HEIGHT,
  twoPacificPlaceOfficePadHeight: TWO_PACIFIC_PLACE_OFFICE_PAD_HEIGHT,
  airsidePadHeight: AIRSIDE_PAD_HEIGHT,
  leeGardenOnePadHeight: LEE_GARDEN_ONE_PAD_HEIGHT,
  oneIfcPadHeight: ONE_IFC_PAD_HEIGHT,
  championTowerPadHeight: CHAMPION_TOWER_PAD_HEIGHT,
  ckc2PadHeight: CKC2_PAD_HEIGHT,
  qgoPadHeight: QGO_PAD_HEIGHT,
  qgoEntrancePadHeight: QGO_ENTRANCE_PAD_HEIGHT,
  conradPadHeight: CONRAD_PAD_HEIGHT,
  conradEntrancePadHeight: CONRAD_ENTRANCE_PAD_HEIGHT,
  hysanPadHeight: HYSAN_PAD_HEIGHT,
  twoTaikooPadHeight: TWO_TAIKOO_PAD_HEIGHT,
  hendersonPadHeight: HENDERSON_PAD_HEIGHT,
  oneExchangePadHeight: ONE_EXCHANGE_PAD_HEIGHT,
  twoExchangePadHeight: TWO_EXCHANGE_PAD_HEIGHT,
  cfaPadHeight: CFA_PAD_HEIGHT,
  hkcecPadHeight: HKCEC_PAD_HEIGHT,
  timesSquarePadHeight: TIMES_SQUARE_PAD_HEIGHT,
  harbourCityPadHeights: HARBOUR_CITY_PAD_HEIGHTS,
  spaceMuseumPadHeight: SPACE_MUSEUM_PAD_HEIGHT,
  artMuseumPadHeight: ART_MUSEUM_PAD_HEIGHT,
  scienceMuseumPadHeight: SCIENCE_MUSEUM_PAD_HEIGHT,
  historyMuseumPadHeight: HISTORY_MUSEUM_PAD_HEIGHT,
  culturalCentrePadHeight: CULTURAL_CENTRE_PAD_HEIGHT,
  clockTowerPadHeight: CLOCK_TOWER_PAD_HEIGHT,
  peninsulaPadHeight: PENINSULA_PAD_HEIGHT,
  sheratonPadHeight: SHERATON_PAD_HEIGHT,
  salisburyPadHeight: SALISBURY_PAD_HEIGHT,
  kowloonShangriLaPadHeight: KOWLOON_SHANGRI_LA_PAD_HEIGHT,
  mongKokStadiumPadHeight: MONG_KOK_STADIUM_PAD_HEIGHT,
  hongKongStadiumPadHeight: HONG_KONG_STADIUM_PAD_HEIGHT,
  laiYuenPadHeight: LAI_YUEN_PAD_HEIGHT,
  queenElizabethStadiumPadHeight: QUEEN_ELIZABETH_STADIUM_PAD_HEIGHT,
  kaiTakStadiumPadHeight: KAI_TAK_STADIUM_PAD_HEIGHT,
  kaiTakArenaPadHeight: KAI_TAK_ARENA_PAD_HEIGHT,
  kaiTakYouthPadHeight: KAI_TAK_YOUTH_PAD_HEIGHT,
  happyValleyPadHeight: HAPPY_VALLEY_PAD_HEIGHT,
  shaTinPadHeight: SHA_TIN_PAD_HEIGHT,
  centralGovernmentPadHeight: CENTRAL_GOVERNMENT_PAD_HEIGHT,
  heritage1881PadHeight: HERITAGE_1881_PAD_HEIGHT,
  theArchPadHeight: THE_ARCH_PAD_HEIGHT,
  sorrentoPadHeight: SORRENTO_PAD_HEIGHT,
  stJohnsCathedralPadHeight: ST_JOHNS_CATHEDRAL_PAD_HEIGHT,
  cityHallPadHeight: CITY_HALL_PAD_HEIGHT,
  centralLibraryPadHeight: CENTRAL_LIBRARY_PAD_HEIGHT,
  hkapaPadHeight: HKAPA_PAD_HEIGHT,
  airportPadHeights: AIRPORT_PAD_HEIGHTS,
  tunnelStats: HK_TERRAIN.stats
});

export { HK_TERRAIN };
