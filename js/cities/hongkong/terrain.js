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
  tunnelStats: HK_TERRAIN.stats
});

export { HK_TERRAIN };
