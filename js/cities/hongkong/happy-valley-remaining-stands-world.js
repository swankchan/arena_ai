// Grandstand, Members Stand I and Members Stand II: mapped footprints, inferred facades.
// These three stands were removed as misplaced placeholders on the old circuit and never
// rebuilt. Footprints and level counts come from OSM; heights, bays, glazing and the
// temporary entrances are estimates, the same standard as Members Stand III and the Pavilion.
import * as THREE from 'three/webgpu';
import { attribute, color } from 'three/tsl';
import {
  HAPPY_VALLEY_GRANDSTAND, HAPPY_VALLEY_MEMBERS_I, HAPPY_VALLEY_MEMBERS_II,
} from './happy-valley-remaining-stands-site.js';
import { HAPPY_VALLEY_SITE as venue } from './happy-valley-racecourse-architecture.js';
import {
  harbourCityWorldToLocal, harbourCityLocalToWorld, harbourCityEdgeOutward, harbourCitySegmentCollider,
} from './harbour-city-architecture.js';
import { roofGeometry, store, quad, meshStore, beam, merged, nightAmount } from './harbour-city-world-utils.js';
import {
  standOverSameLevelRoad, clearEdgeRanges, clipTrianglesOverRoads, dropCollidersOverRoads,
} from './happy-valley-stand-road-clearance.js';

// Entrance edges are chosen so the opening faces the street side rather than the course;
// no surveyed door position exists, so these are provisional like the Pavilion's Entrance C.
const STANDS = [
  { site: HAPPY_VALLEY_GRANDSTAND, name: 'Grandstand', group: 'HappyValleyMappedGrandstand', entrance: { edge: 9, centre: .5, width: 4.8, height: 3.25 } },
  { site: HAPPY_VALLEY_MEMBERS_I, name: 'MembersStandI', group: 'HappyValleyMappedMembersStandI', entrance: { edge: 8, centre: .5, width: 4.8, height: 3.25 } },
  { site: HAPPY_VALLEY_MEMBERS_II, name: 'MembersStandII', group: 'HappyValleyMappedMembersStandII', entrance: { edge: 3, centre: .5, width: 4.8, height: 3.25 } },
];

function buildStand(parent, site, name, groupName, entrance, groundOffset, materials) {
  const origin = harbourCityWorldToLocal(venue, site.x, site.z);
  const group = new THREE.Group();
  group.name = groupName;
  group.position.set(origin.x, 0, origin.z);
  group.rotation.y = site.ry - venue.ry;
  parent.add(group);

  const shell = store(), panes = store(), decks = store(), threshold = store();
  const bands = [], mullions = [], rails = [], seats = [], lights = [], portal = [];
  const ring = site.localRing;
  const j = entrance.edge * 2;
  const length = Math.hypot(ring[j + 2] - ring[j], ring[j + 3] - ring[j + 1]);
  const start = entrance.centre - entrance.width / (2 * length);
  const end = entrance.centre + entrance.width / (2 * length);

  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], dx = ring[i + 2] - ax, dz = ring[i + 3] - az;
    const edgeLength = Math.hypot(dx, dz);
    const out = harbourCityEdgeOutward(ring, edge);
    const atRaw = (t, y, inset = 0) => [ax + dx * t - out.nx * inset, y, az + dz * t - out.nz * inset];
    // The clearance probe needs world coordinates: roads are a world-space graph and the stand
    // outline is in venue-local metres.
    const atWorld = (t, inset = 0) => {
      const [lx, , lz] = atRaw(t, 0, inset);
      return harbourCityLocalToWorld(venue, lx, lz);
    };
    // 黃泥涌道 is stored as a two-point chord and cuts across the Grandstand outline. The
    // street is real, so the stand gives way: every edge is scanned across all the lateral
    // offsets it builds, and the parts over a carriageway get neither wall nor collider,
    // leaving the same kind of opening the racecourse perimeter already uses.
    const buildInsets = [0, .12, .18, .55, 1.7, 4.0];
    const clearRanges = clearEdgeRanges((t, _y, inset = 0) => {
      const w = atWorld(t, inset);
      return [w.x, 0, w.z];
    }, buildInsets);
    const at = (t, y, inset = 0) => atRaw(Math.max(0, Math.min(1, t)), y, inset);
    if (edgeLength < 7 || clearRanges.length === 0) {
      quad(shell, at(0, 0, .04), at(1, 0, .04), at(1, site.height, .04), at(0, site.height, .04), [.65, .65, .62]);
      continue;
    }
    const bays = Math.max(2, Math.round(edgeLength / 3.6));
    // The long course-facing edge carries the terraces and the canopy.
    const front = edge === entrance.edge + 1 || edge === entrance.edge - 1;
    for (let floor = 0; floor < site.levels; floor++) {
      const y = .65 + (site.height - 3.1) / site.levels * floor, top = y + 2.65;
      // Only the parts of this edge that stand clear of the street are built.
      const windows = clearRanges.flatMap(([lo, hi]) => {
        const span = Math.max(1, Math.round((hi - lo) * Math.max(2, Math.round(edgeLength / 3.6))));
        return Array.from({ length: span }, (_, b) => [
          lo + (hi - lo) * b / span, lo + (hi - lo) * (b + 1) / span,
        ]);
      });
      const inset = front && floor > 0 ? 1.7 : .12;
      for (const [panel, [rawLo, rawHi]] of windows.entries()) {
        const t0 = rawLo, t1 = rawHi;
        const ranges = edge === entrance.edge && floor === 0
          ? [[t0, Math.min(t1, start)], [Math.max(t0, end), t1]]
          : [[t0, t1]];
        const lit = (floor * 19 + panel * 11 + edge * 7) % 8 < 3 ? .28 : 0;
        for (const [lo, hi] of ranges) {
          if (hi > lo) quad(panes, at(lo, y, inset), at(hi, y, inset), at(hi, top, inset), at(lo, top, inset), [.22, .28, .28], lit);
        }
      }
      const fasciaY = y - .18;
      for (const [lo, hi] of clearRanges) {
        if (edge === entrance.edge && floor === 0) {
          beam(bands, at(lo, fasciaY, .25), at(Math.min(hi, start), fasciaY, .25), .4, .4);
          beam(bands, at(Math.max(lo, end), fasciaY, .25), at(hi, fasciaY, .25), .4, .4);
        } else beam(bands, at(lo, fasciaY, .25), at(hi, fasciaY, .25), .82, .65);
        beam(mullions, at(lo, top, inset + .03), at(hi, top, inset + .03), .08, .09);
      }
      for (const [lo, hi] of windows) {
        if (edge === entrance.edge && floor === 0 && lo > start && hi < end) continue;
        beam(mullions, at(lo, y, inset + .04), at(lo, top, inset + .04), .08, .09);
      }
      if (front && floor > 0) {
        for (const [lo, hi] of clearRanges) {
          quad(decks, at(lo, y - .22, .18), at(hi, y - .22, .18), at(hi, y - .22, inset), at(lo, y - .22, inset), [.62, .62, .59]);
          beam(rails, at(lo, y + .75, .28), at(hi, y + .75, .28), .09, .1);
        }
        for (const [lo] of windows) beam(rails, at(lo, y - .12, .28), at(lo, y + .75, .28), .07, .07);
        for (const [lo, hi] of clearRanges) {
          beam(lights, at(lo + (hi - lo) * .15, y + 3.0, 1.0), at(lo + (hi - lo) * .8, y + 3.0, 1.0), .08, .1);
        }
      }
      // Two rows of tip-up seats along the course side, as in the Members Stand III reference.
      if (front && floor === 2 && clearRanges.length) {
        const [lo0, hi0] = clearRanges[0], [lo1, hi1] = clearRanges.at(-1);
        const count = Math.floor((hi1 - lo0) * edgeLength / .53);
        for (let row = 0; row < 2; row++) {
          const near = .55 + row * .72, far = near + .72, yStep = y - .15 + row * .15;
          for (const [lo, hi] of clearRanges) quad(decks, at(lo, yStep, near), at(hi, yStep, near), at(hi, yStep, far), at(lo, yStep, far), [.55, .56, .55]);
        }
        for (let row = 0; row < 2; row++) for (let n = 0; n < count; n++) {
          if (n % 20 === 0 || n % 20 === 1) continue;
          const t = lo0 + (hi1 - lo0) * (n + .5) / count, depth = .85 + row * .72, base = y - .15 + row * .15;
          { const sw = atWorld(t, depth); if (standOverSameLevelRoad(sw.x, sw.z)) continue; }
          beam(seats, at(t, base + .30, depth), at(t, base + .62, depth + .18), .42, .09);
        }
      }
    }
    const portalWorld = atWorld((start + end) / 2, .1);
    const portalClear = edge === entrance.edge && !standOverSameLevelRoad(portalWorld.x, portalWorld.z);
    if (portalClear) {
      for (const t of [start, end]) beam(portal, at(t, 0, .1), at(t, entrance.height, .1), .16, .18);
      beam(portal, at(start, entrance.height, .1), at(end, entrance.height, .1), .16, .18);
      quad(threshold, at(start, .03, .12), at(end, .03, .12), at(end, .03, 3.0), at(start, .03, 3.0), [.6, .58, .53]);
    }
    for (const [lo, hi] of clearRanges) beam(bands, at(lo, site.height - .55, .35), at(hi, site.height - .55, .35), .7, .7);
    if (front) for (const [lo, hi] of clearRanges) quad(decks, at(lo, site.height - .9, .15), at(hi, site.height - .9, .15), at(hi, site.height - .5, 4), at(lo, site.height - .5, 4), [.65, .64, .61]);
  }

  meshStore(group, shell, materials.concrete, `${groupName}EndWalls`);
  meshStore(group, panes, materials.glass, `${groupName}Glazing`);
  meshStore(group, decks, materials.concrete, `${groupName}Terraces`);
  meshStore(group, threshold, materials.concrete, `${groupName}EntranceFloor`, false);
  merged(group, bands, materials.concrete, `${groupName}Fascias`);
  merged(group, mullions, materials.metal, `${groupName}Mullions`);
  merged(group, rails, materials.metal, `${groupName}Rails`);
  merged(group, seats, materials.seat, `${groupName}Seats`);
  merged(group, lights, materials.light, `${groupName}TerraceLights`);
  merged(group, portal, materials.metal, `${groupName}EntranceFrame`);
  const roof = new THREE.Mesh(roofGeometry(ring, site.height), materials.fascia);
  roof.name = `${groupName}Roof`;
  group.add(roof);

  const colliders = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], dx = ring[i + 2] - ax, dz = ring[i + 3] - az;
    const edgeLength = Math.hypot(dx, dz);
    const out = harbourCityEdgeOutward(ring, edge);
    const ranges = edgeLength < 7 ? [] : clearEdgeRanges((t, _y, inset = 0) => {
      const w = harbourCityLocalToWorld(venue, ax + dx * t - out.nx * inset, az + dz * t - out.nz * inset);
      return [w.x, 0, w.z];
    }, [0, .12, .18, .55, 1.7, 4.0]);
    for (const [lo, hi] of ranges) {
      const add = (a, b, min, max) => colliders.push(harbourCitySegmentCollider(site, edge, a, b, min, max, .35));
      if (edge !== entrance.edge) add(lo, hi, groundOffset, groundOffset + site.height);
      else {
        const a = Math.max(lo, 0), lowEnd = Math.min(hi, start), highStart = Math.max(lo, end);
        if (lowEnd > a) add(a, lowEnd, groundOffset, groundOffset + site.height);
        if (hi > highStart) add(highStart, hi, groundOffset, groundOffset + site.height);
        const doorLo = Math.max(lo, start), doorHi = Math.min(hi, end);
        if (doorHi > doorLo) add(doorLo, doorHi, groundOffset + entrance.height, groundOffset + site.height);
      }
    }
  }
  return { group, colliders };
}

export function buildHappyValleyRemainingStands(parent, groundOffset) {
  const concrete = new THREE.MeshStandardMaterial({ color: 0xbab4a4, roughness: .8, side: THREE.DoubleSide });
  const fascia = new THREE.MeshStandardMaterial({ color: 0x9ca5a5, roughness: .55, metalness: .25 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x708087, roughness: .5, metalness: .4 });
  const seat = new THREE.MeshStandardMaterial({ color: 0x18518e, roughness: .7 });
  const glass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .32, metalness: .22 });
  glass.colorNode = attribute('color');
  glass.emissiveNode = color(0xffd19a).mul(attribute('aLit', 'float')).mul(nightAmount()).mul(.58);
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffdcb0 });
  light.emissiveNode = color(0xffca85).mul(nightAmount()).mul(1.2);
  const materials = { concrete, fascia, metal, seat, glass, light };
  const built = [];
  const colliders = [];
  const clipped = [];
  for (const spec of STANDS) {
    const stand = buildStand(parent, spec.site, spec.name, spec.group, spec.entrance, groundOffset, materials);
    // 黃泥涌道 is a real street simplified to a two-point chord that crosses the Grandstand
    // outline. Wall segments give way above, and this drops any terrace or glazing triangle
    // that still lands on the carriageway, so the stand never seals the road.
    clipped.push([stand.group.name, clipTrianglesOverRoads(stand.group)]);
    built.push(stand.group);
    colliders.push(...stand.colliders);
  }
  const fallback = dropCollidersOverRoads(colliders);
  return {
    groups: built, colliders: fallback.colliders,
    clippedTriangles: Object.fromEntries(clipped), droppedColliders: fallback.removed,
  };
}
