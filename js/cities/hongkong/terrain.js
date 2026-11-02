import { HK_TERRAIN } from '../../hk-terrain-data.js';
import { HSBC_SITE, pointInFlatRing } from './hsbc-headquarters-architecture.js';
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
  return rawHongKongTerrainHeight(x, z);
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
  tunnelStats: HK_TERRAIN.stats
});

export { HK_TERRAIN };
