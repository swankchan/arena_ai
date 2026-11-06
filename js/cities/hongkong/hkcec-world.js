import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, color, smoothstep } from 'three/tsl';
import { cityUniforms } from '../../tsl-materials.js';
import {
  HKCEC_NEW_WING_SITE, HKCEC_OLD_WING_SITE, HKCEC_ATRIUM_SITE, HKCEC_APARTMENT_SITE,
  HKCEC_NEW_WING_OSM_SOURCE, HKCEC_OLD_WING_OSM_SOURCE, HKCEC_ATRIUM_OSM_SOURCE, HKCEC_APARTMENT_OSM_SOURCE,
  HKCEC_SOM_HEIGHT, HKCEC_SOM_STORIES, HKCEC_SOM_SITE_AREA_HECTARES, HKCEC_SOM_GROSS_AREA,
  HKCEC_SOM_CLEAR_SPAN, HKCEC_SOM_VAULTED_CEILING_FEET, HKCEC_WO_ATRIUM_LEVELS, HKCEC_WO_ATRIUM_AREA,
  HKCEC_WO_ATRIUM_SPAN, HKCEC_WO_PHASE2_HALLS, HKCEC_WO_PHASE2_EXHIBITION_AREA, HKCEC_WO_CONVENTION_HALL_SEATS,
  HKCEC_PHASE2_COMPLETION_YEAR, HKCEC_ORIGINAL_COMPLETION_YEAR, HKCEC_ATRIUM_COMPLETION_YEAR,
  HKCEC_PHASE2_ARCHITECTS, HKCEC_ORIGINAL_ARCHITECT, HKCEC_NEW_WING_OSM_LEVELS, HKCEC_OLD_WING_OSM_LEVELS,
  HKCEC_ATRIUM_OSM_LEVELS, HKCEC_APARTMENT_HEIGHT, HKCEC_APARTMENT_OSM_LEVELS, HKCEC_APARTMENT_OSM_MIN_LEVEL,
  HKCEC_APARTMENT_COMPLETION_YEAR, HKCEC_APARTMENT_OFFICIAL_RESIDENTIAL_LEVELS, HKCEC_APARTMENT_OFFICIAL_FIRST_RESIDENTIAL_LEVEL,
  HKCEC_APARTMENT_OFFICIAL_LAST_RESIDENTIAL_LEVEL, HKCEC_APARTMENT_OFFICIAL_APPROX_UNITS, HKCEC_PLAZA_TOP,
  HKCEC_COVERED_ROAD_SOFFIT, HKCEC_VEHICLE_ENVELOPE, HKCEC_OLD_WING_ROOF, HKCEC_ATRIUM_ROOF,
  HKCEC_NEW_WING_HEIGHT, HKCEC_APARTMENT_PODIUM_TOP, HKCEC_APARTMENT_MAIN_ROOF, HKCEC_APARTMENT_VISUAL_COURSES,
  HKCEC_APARTMENT_TARGET_PANEL_WIDTH, HKCEC_MAIN_ENTRANCE, HKCEC_APARTMENT_ENTRANCE, HKCEC_ENTRANCE_LAYOUTS, HKCEC_GROUND_RINGS,
  HKCEC_COLUMN_POSITIONS, HKCEC_GROUND_FACADE_SEGMENTS, hkcecEdgeOutward, hkcecRingColliders, hkcecLocalCollider, hkcecFrameCollider,
  hkcecGroundHeightAt
} from './hkcec-architecture.js';
import { pointInFlatRing } from './landmark-site.js';

const lerp = (a, b, t) => a + (b - a) * t;
const nightAmount = () => smoothstep(.55, 1.4, cityUniforms.uInteriorGlow);
const store = () => ({ positions: [], colors: [], lit: [] });
function hash(a, b, c = 0, d = 0) { const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.19) * 43758.5453; return value - Math.floor(value); }
function tint(base, amount) { return base.map((value) => Math.max(0, Math.min(1, value + amount))); }
function quad(s, a, b, c, d, colour, lit = 0) { for (const p of [a, b, c, a, c, d]) { s.positions.push(...p); s.colors.push(...colour); s.lit.push(lit); } }
function geometry(s) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.colors, 3)); g.setAttribute('aLit', new THREE.Float32BufferAttribute(s.lit, 1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function meshStore(group, s, material, name, shadows = true) {
  if (!s.positions.length) return null; const mesh = new THREE.Mesh(geometry(s), material); mesh.name = name;
  mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function merged(group, parts, material, name, shadows = true) {
  if (!parts.length) return null; const normalized = parts.map((part) => part.index ? part.toNonIndexed() : part);
  const geo = mergeGeometries(normalized, false); for (let i = 0; i < parts.length; i++) { normalized[i].dispose(); if (normalized[i] !== parts[i]) parts[i].dispose(); }
  if (!geo) throw new Error(`HKCEC could not merge ${name}`);
  const mesh = new THREE.Mesh(geo, material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function box(parts, center, size, ry = 0) { const g = new THREE.BoxGeometry(...size); if (ry) g.rotateY(ry); g.translate(...center); parts.push(g); return g; }
function cylinder(parts, center, radius, height, segments = 12, radiusTop = radius) { const g = new THREE.CylinderGeometry(radiusTop, radius, height, segments); g.translate(...center); parts.push(g); return g; }
function sphere(parts, center, scale, segments = 10) { const g = new THREE.SphereGeometry(1, segments, 7); g.scale(...scale); g.translate(...center); parts.push(g); return g; }
function beam(parts, a, b, width = .1, depth = width) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start), length = direction.length(); if (length < .001) return;
  const g = new THREE.BoxGeometry(width, length, depth); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray()); parts.push(g); return g;
}
function shapeGeometry(ring, y) {
  const shape = new THREE.Shape(); for (let i = 0; i < ring.length - 2; i += 2) { if (i === 0) shape.moveTo(ring[i], -ring[i + 1]); else shape.lineTo(ring[i], -ring[i + 1]); }
  shape.closePath(); const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
function shapeMesh(group, ring, y, material, name, shadows = true) { const mesh = new THREE.Mesh(shapeGeometry(ring, y), material); mesh.name = name; mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); return mesh; }
function pointOnRing(ring, edge, t, y, offset = 0) {
  const i = edge * 2, { nx, nz } = hkcecEdgeOutward(ring, edge);
  return [lerp(ring[i], ring[i + 2], t) + nx * offset, y, lerp(ring[i + 1], ring[i + 3], t) + nz * offset];
}
function facadeQuad(s, ring, edge, t0, t1, y0, y1, offset, colour, lit = 0, top1 = y1) {
  quad(s, pointOnRing(ring, edge, t0, y0, offset), pointOnRing(ring, edge, t1, y0, offset), pointOnRing(ring, edge, t1, top1, offset), pointOnRing(ring, edge, t0, y1, offset), colour, lit);
}
function frameGroup(site, frame, lift = 0) { const group = new THREE.Group(); group.position.set(frame.localX, lift, frame.localZ); group.rotation.y = frame.ry - site.ry; return group; }
function textPlane(text, width, height, fontSize = 64, foreground = '#edf4f2', background = 'rgba(10,24,29,.88)') {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 256; const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height); if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.fillStyle = foreground; ctx.font = `600 ${fontSize}px "Noto Sans HK", "PingFang HK", "Microsoft JhengHei", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 44);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.name = `Sign:${text}`; return mesh;
}

// Convention Plaza Apartments (會景閣) reads from the harbour as stacked silver ribbons of glass, not as a plain
// prism: every residential course carries a projecting pale band, the chamfered corners are picked out by full
// height silver pilasters, and the glass sits well back in a deep teal so the banding stays legible at distance.
function ribbonBox(parts, ring, edge, t0, t1, y, height, projection) {
  const i = edge * 2, mid = (t0 + t1) / 2, { nx, nz, ry } = hkcecEdgeOutward(ring, edge);
  const ax = lerp(ring[i], ring[i + 2], t0), az = lerp(ring[i + 1], ring[i + 3], t0);
  const bx = lerp(ring[i], ring[i + 2], t1), bz = lerp(ring[i + 1], ring[i + 3], t1);
  const length = Math.hypot(bx - ax, bz - az);
  if (length < 0.02) return;
  const cx = (ax + bx) / 2 + nx * projection * .5, cz = (az + bz) / 2 + nz * projection * .5;
  box(parts, [cx, y, cz], [length, height, projection], ry);
}

function createApartmentFacade() {
  const glass = store(), bands = store(), frames = store(), ribs = [];
  // The bands and mullions are real extruded boxes, not flat quads, so they are merged separately.
  const ribGeometries = [], mullionGeometries = [];
  let glassPanels = 0, horizontalBands = 0, verticalMullions = 0;
  const ring = HKCEC_APARTMENT_SITE.localRing, height = HKCEC_APARTMENT_MAIN_ROOF - HKCEC_APARTMENT_PODIUM_TOP;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hkcecEdgeOutward(ring, edge).length, bays = Math.max(1, Math.ceil(length / HKCEC_APARTMENT_TARGET_PANEL_WIDTH));
    for (let course = 0; course < HKCEC_APARTMENT_VISUAL_COURSES; course++) {
      const y0 = HKCEC_APARTMENT_PODIUM_TOP + height * course / HKCEC_APARTMENT_VISUAL_COURSES;
      const y1 = HKCEC_APARTMENT_PODIUM_TOP + height * (course + 1) / HKCEC_APARTMENT_VISUAL_COURSES;
      // Every fifth course is a deeper structural band, matching the photographed slab rhythm.
      const major = course % 5 === 0, bandHeight = major ? 1.35 : .86, variation = (hash(edge, course, 1) - .5) * .05;
      ribbonBox(ribGeometries, ring, edge, 0, 1, y0 + bandHeight * .5, bandHeight, major ? .92 : .62);
      horizontalBands++;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = (bay + .018) / bays, t1 = (bay + .982) / bays;
        const lit = hash(edge, course, bay, 2) < .19 ? .25 + hash(edge, course, bay, 3) * .72 : 0;
        const colour = tint([.085, .255, .315], (hash(edge, course, bay, 4) - .5) * .055 + variation);
        facadeQuad(glass, ring, edge, t0, t1, y0 + bandHeight + .035, y1 - .045, .03, colour, lit); glassPanels++;
        ribbonBox(mullionGeometries, ring, edge, t0 - .0025, t0 + .0025, (y0 + bandHeight + y1) * .5, y1 - y0 - bandHeight, .30); verticalMullions++;
      }
    }
    // Full-height silver pilasters at both ends of every edge pick out the chamfered corners as strong verticals.
    for (const t of [0, 1]) {
      const p = pointOnRing(ring, edge, t, 0, .16);
      box(ribs, [p[0], HKCEC_APARTMENT_PODIUM_TOP + height * .5, p[2]], [.86, height, .86]);
    }
  }
  return { glass, bands, frames, ribs, ribGeometries, mullionGeometries,
    glassPanels, horizontalBands, verticalMullions, cornerPilasters: ribs.length };
}

function createApartmentCrown(materials) {
  const group = new THREE.Group(); group.name = 'ConventionPlazaApartmentsConservativeRoofCrown'; const metal = [], dark = [], louvers = [];
  const ring = HKCEC_APARTMENT_SITE.localRing;
  shapeMesh(group, ring, HKCEC_APARTMENT_MAIN_ROOF, materials.roof, 'ApartmentMainRoofDeck');
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const a = pointOnRing(ring, edge, 0, HKCEC_APARTMENT_MAIN_ROOF + .65), b = pointOnRing(ring, edge, 1, HKCEC_APARTMENT_MAIN_ROOF + .65);
    beam(metal, a, b, 1.3, .24);
    const length = hkcecEdgeOutward(ring, edge).length, bays = Math.max(1, Math.ceil(length / 2.4));
    for (let bay = 0; bay < bays; bay++) {
      const t = (bay + .5) / bays, p = pointOnRing(ring, edge, t, HKCEC_APARTMENT_MAIN_ROOF + 2.4, -.18);
      box(louvers, p, [Math.min(1.7, length / bays * .72), 3.1, .16], hkcecEdgeOutward(ring, edge).ry);
    }
  }
  // The roof was not separately surveyed: only a low, photo-neutral service enclosure is inferred inside the OSM 164 m envelope.
  box(dark, [-3, HKCEC_APARTMENT_MAIN_ROOF + 2.6, -1], [24, 5.2, 13]);
  for (let i = 0; i < 6; i++) { cylinder(metal, [-12 + i * 3.6, HKCEC_APARTMENT_MAIN_ROOF + 5.45, -1], 1.05, .35, 16); }
  merged(group, metal, materials.silver, 'ApartmentRoofParapetAndVentCaps'); merged(group, dark, materials.dark, 'ApartmentLowRoofServiceEnclosure'); merged(group, louvers, materials.silver, 'ApartmentCrownVentilationLouvers');
  return { group, colliders: hkcecRingColliders(HKCEC_APARTMENT_SITE, ring, HKCEC_APARTMENT_MAIN_ROOF, HKCEC_APARTMENT_HEIGHT), ventFans: 6 };
}

function createOldWingFacade() {
  const glass = store(), stone = store(), frames = store(); let panels = 0, bands = 0;
  const ring = HKCEC_OLD_WING_SITE.localRing, courses = [8, 13.5, 19, 24.5, 30.5];
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hkcecEdgeOutward(ring, edge).length, bays = Math.max(1, Math.ceil(length / 2.8));
    for (let course = 0; course < courses.length - 1; course++) {
      const y0 = courses[course], y1 = courses[course + 1], solidTop = y0 + 2.15;
      facadeQuad(stone, ring, edge, 0, 1, y0, solidTop, .04, tint([.64, .65, .61], (hash(edge, course) - .5) * .05)); bands++;
      for (let bay = 0; bay < bays; bay++) {
        const t0 = (bay + .025) / bays, t1 = (bay + .975) / bays, lit = hash(edge, course, bay) < .14 ? .18 + hash(edge, bay, course) * .42 : 0;
        facadeQuad(glass, ring, edge, t0, t1, solidTop + .08, y1 - .16, .075, tint([.31, .46, .48], (hash(edge, course, bay, 8) - .5) * .07), lit); panels++;
        facadeQuad(frames, ring, edge, t0, Math.min(1, t0 + .003), solidTop, y1, .10, [.56, .61, .60]);
      }
      facadeQuad(frames, ring, edge, 0, 1, y1 - .13, y1 + .02, .09, [.70, .72, .69]);
    }
  }
  return { glass, stone, frames, panels, bands };
}

function createOldWingRoof(materials) {
  const group = new THREE.Group(); group.name = 'HKCECOldWingRoofPlantAndParapets'; const silver = [], dark = [], glass = [], fans = [];
  const ring = HKCEC_OLD_WING_SITE.localRing; shapeMesh(group, ring, HKCEC_OLD_WING_ROOF, materials.roof, 'OldWingExactFootprintRoofDeck');
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) beam(silver, pointOnRing(ring, edge, 0, HKCEC_OLD_WING_ROOF + .6), pointOnRing(ring, edge, 1, HKCEC_OLD_WING_ROOF + .6), 1.2, .22);
  const plant = [[-20, -65, 22, 12], [15, -60, 15, 18], [-15, -15, 24, 11], [15, 5, 20, 10]];
  let units = 0, fanCount = 0;
  for (const [x, z, w, d] of plant) {
    if (!pointInFlatRing(ring, x, z)) continue;
    box(dark, [x, HKCEC_OLD_WING_ROOF + 2.1, z], [w, 4.2, d]);
    for (let i = 0; i < Math.floor(w / 4); i++) {
      const px = x - w / 2 + 2.2 + i * 4; box(silver, [px, HKCEC_OLD_WING_ROOF + 4.55, z], [3.2, .7, Math.min(5, d - 2)]); units++;
      cylinder(fans, [px, HKCEC_OLD_WING_ROOF + 4.96, z], 1.05, .16, 16); fanCount++;
    }
  }
  for (const [x, z] of [[-15, 35], [0, 35], [-15, 50], [0, 50]]) if (pointInFlatRing(ring, x, z)) box(glass, [x, HKCEC_OLD_WING_ROOF + .75, z], [8, 1.5, 5]);
  merged(group, silver, materials.silver, 'OldWingParapetsAndHVAC'); merged(group, dark, materials.dark, 'OldWingRoofPlantRooms'); merged(group, glass, materials.clearGlass, 'OldWingRoofSkylights', false); merged(group, fans, materials.silver, 'OldWingRoofFanCaps');
  return { group, units, fanCount };
}

function createOldWingRefinement(materials) {
  // HK-B0089: the old wing's harbour-facing elevation has broad, pale curved
  // balcony ribbons in front of its ribbon glazing.  Model the two long north-facing
  // source edges separately from the new wing's bird roof; these are photo-directed
  // slabs and rails, not an invented OSM footprint or a generic box facade.
  const group = new THREE.Group(); group.name = 'HKCECOldWingHK-B0089CurvedBalconyRefinement';
  const slabs = store(), rails = [], posts = [], caps = [];
  const ring = HKCEC_OLD_WING_SITE.localRing;
  let slabCount = 0, railSegments = 0;
  for (const edge of [24, 25]) {
    const length = hkcecEdgeOutward(ring, edge).length, steps = Math.max(1, Math.ceil(length / 4));
    for (const y of [13.55, 19.05, 24.55]) {
      for (let j = 0; j < steps; j++) {
        const t0 = j / steps, t1 = (j + 1) / steps;
        const a = pointOnRing(ring, edge, t0, y, 0), b = pointOnRing(ring, edge, t1, y, 0);
        const c = pointOnRing(ring, edge, t1, y, 1.35), d = pointOnRing(ring, edge, t0, y, 1.35);
        quad(slabs, a, b, c, d, [.78, .80, .75]);
        facadeQuad(slabs, ring, edge, t0, t1, y, y + .42, 1.35, [.78, .80, .75]);
        beam(rails, pointOnRing(ring, edge, t0, y + 1.10, 1.35), pointOnRing(ring, edge, t1, y + 1.10, 1.35), .055, .07);
        beam(posts, pointOnRing(ring, edge, t0, y + .42, 1.35), pointOnRing(ring, edge, t0, y + 1.10, 1.35), .045, .045);
        slabCount++; railSegments++;
      }
      for (const t of [0, 1]) {
        const p = pointOnRing(ring, edge, t, y + .21, .68);
        cylinder(caps, p, .68, .42, 16);
      }
    }
  }
  meshStore(group, slabs, materials.whiteVertex, 'OldWingHK-B0089PaleCurvedBalconySlabs');
  merged(group, rails, materials.dark, 'OldWingHK-B0089BalconyDarkHandrails', false);
  merged(group, posts, materials.dark, 'OldWingHK-B0089BalconyRailPosts', false);
  merged(group, caps, materials.white, 'OldWingHK-B0089RoundedBalconyEndCaps');
  return { group, slabCount, railSegments };
}

function newWingSection(z) {
  const ring = HKCEC_NEW_WING_SITE.localRing, bounds = HKCEC_NEW_WING_SITE.localBounds, intersections = [];
  z = Math.max(bounds.minZ + 1e-6, Math.min(bounds.maxZ - 1e-6, z));
  for (let i = 0; i < ring.length - 2; i += 2) {
    const az = ring[i + 1], bz = ring[i + 3]; if ((az > z) === (bz > z)) continue;
    const t = (z - az) / (bz - az); intersections.push(lerp(ring[i], ring[i + 2], t));
  }
  if (intersections.length < 2) return null; intersections.sort((a, b) => a - b); return [intersections[0], intersections.at(-1)];
}
function newWingShellRange(z, shell) {
  const [left, right] = newWingSection(z), width = Math.max(.001, right - left), mainSpan = Math.min(80, width * .82);
  const mainStart = .5 - mainSpan / width / 2, mainEnd = .5 + mainSpan / width / 2, overlap = Math.min(10, width * .08) / width;
  if (shell === 'main') return [mainStart, mainEnd];
  if (shell === 'left') return [0, Math.min(1, mainStart + overlap)];
  return [Math.max(0, mainEnd - overlap), 1];
}
function newWingShellPoint(z, t, shell) {
  const section = newWingSection(z); if (!section) return [0, 0, 0]; const [left, right] = section, x = lerp(left, right, t);
  // The signature roof is a flying wing: the three shells sweep up towards BOTH ends of the long axis and dip in the
  // middle, so the harbour silhouette lifts at the corners instead of reading as a plain dome.
  const b = HKCEC_NEW_WING_SITE.localBounds, along = (z - b.minZ) / Math.max(.001, b.maxZ - b.minZ);
  const longitudinal = .90 + .10 * Math.cos(2 * Math.PI * along);
  const [start, end] = newWingShellRange(z, shell), u = (t - start) / Math.max(.001, end - start);
  const y = shell === 'main' ? 30 + 24 * longitudinal * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .72)
    : 27 + 8 * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .8);
  return [x, Math.min(HKCEC_NEW_WING_HEIGHT - .2, y), z];
}
function newWingRoofHeightAt(x, z) {
  const section = newWingSection(z); if (!section) return 27; const t = (x - section[0]) / Math.max(.001, section[1] - section[0]); let height = 27;
  for (const shell of ['left', 'main', 'right']) { const [start, end] = newWingShellRange(z, shell); if (t >= start && t <= end) height = Math.max(height, newWingShellPoint(z, t, shell)[1]); }
  return height;
}
// The aluminium roof does not stop at the glass line: it cantilevers out over the harbour curtain wall as a
// projecting eave, which is the sharpest silhouette cue on the seaward elevation.
const HKCEC_NEW_WING_EAVE_SPRING = 27;
function createNewWingEave(materials) {
  const group = new THREE.Group(); group.name = 'HKCECNewWingAluminiumCantileveredHarbourEave';
  const store_ = store(), lip = [], soffitStore = store();
  const ring = HKCEC_NEW_WING_SITE.localRing; const profile = [[0, 0], [.55, .34], [1.5, .62], [2.7, .72]];
  let panels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hkcecEdgeOutward(ring, edge).length; if (length < .4) continue;
    const steps = Math.max(1, Math.ceil(length / 3));
    for (let step = 0; step < steps; step++) {
      const t0 = step / steps, t1 = (step + 1) / steps;
      const shade = tint([.80, .82, .79], (hash(edge, step, 7) - .5) * .05);
      for (let k = 0; k < profile.length - 1; k++) {
        const [o0, y0] = profile[k], [o1, y1] = profile[k + 1];
        quad(store_, pointOnRing(ring, edge, t0, HKCEC_NEW_WING_EAVE_SPRING + y0, o0),
          pointOnRing(ring, edge, t1, HKCEC_NEW_WING_EAVE_SPRING + y0, o0),
          pointOnRing(ring, edge, t1, HKCEC_NEW_WING_EAVE_SPRING + y1, o1),
          pointOnRing(ring, edge, t0, HKCEC_NEW_WING_EAVE_SPRING + y1, o1), shade);
        // Underside of the cantilever, in the darker soffit tone so the overhang reads in silhouette.
        quad(soffitStore, pointOnRing(ring, edge, t0, HKCEC_NEW_WING_EAVE_SPRING - 1.1, 0),
          pointOnRing(ring, edge, t1, HKCEC_NEW_WING_EAVE_SPRING - 1.1, 0),
          pointOnRing(ring, edge, t1, HKCEC_NEW_WING_EAVE_SPRING + y1 - .05, o1),
          pointOnRing(ring, edge, t0, HKCEC_NEW_WING_EAVE_SPRING + y1 - .05, o1), tint([.46, .48, .47], (hash(edge, step, 3) - .5) * .04));
        panels++;
      }
      const [o, y] = profile.at(-1);
      beam(lip, pointOnRing(ring, edge, t0, HKCEC_NEW_WING_EAVE_SPRING + y - .16, o),
        pointOnRing(ring, edge, t1, HKCEC_NEW_WING_EAVE_SPRING + y - .16, o), .30, .34);
    }
  }
  meshStore(group, store_, materials.white, 'NewWingHK-B0088CantileveredEaveUpperSurface');
  meshStore(group, soffitStore, materials.soffit, 'NewWingHK-B0088CantileveredEaveSoffit');
  merged(group, lip, materials.silver, 'NewWingHK-B0088CantileveredEaveLip');
  return { group, panels, projection: profile.at(-1)[0] };
}

function createNewWingRoof(materials) {
  const group = new THREE.Group(); group.name = 'HKCECNewWingThreeLayerFlyingBirdRoof'; const roofStore = store(), seams = [], fascia = [];
  const b = HKCEC_NEW_WING_SITE.localBounds, zs = [];
  for (let z = b.minZ; z < b.maxZ; z += 3) zs.push(z); for (let i = 1; i < HKCEC_NEW_WING_SITE.localRing.length; i += 2) zs.push(HKCEC_NEW_WING_SITE.localRing[i]); zs.push(b.maxZ);
  const rows = [...new Set(zs.map((z) => Math.max(b.minZ, Math.min(b.maxZ, z))).sort((a, b) => a - b))];
  for (const [shell, colour] of [['main', [.61, .65, .65]], ['left', [.72, .75, .73]], ['right', [.72, .75, .73]]]) {
    const segments = shell === 'main' ? 20 : 6;
    for (let row = 0; row < rows.length - 1; row++) for (let j = 0; j < segments; j++) {
      const range0 = newWingShellRange(rows[row], shell), range1 = newWingShellRange(rows[row + 1], shell);
      const t00 = lerp(range0[0], range0[1], j / segments), t01 = lerp(range0[0], range0[1], (j + 1) / segments);
      const t10 = lerp(range1[0], range1[1], j / segments), t11 = lerp(range1[0], range1[1], (j + 1) / segments);
      const a = newWingShellPoint(rows[row], t00, shell), p = newWingShellPoint(rows[row], t01, shell), c = newWingShellPoint(rows[row + 1], t11, shell), d = newWingShellPoint(rows[row + 1], t10, shell);
      quad(roofStore, a, d, c, p, tint(colour, (hash(row, j, shell.length) - .5) * .035));
    }
    for (let j = 0; j <= segments; j += 2) {
      for (let row = 0; row < rows.length - 1; row += 2) {
        const z1 = rows[Math.min(rows.length - 1, row + 2)], range0 = newWingShellRange(rows[row], shell), range1 = newWingShellRange(z1, shell);
        const t0 = lerp(range0[0], range0[1], j / segments), t1 = lerp(range1[0], range1[1], j / segments);
        beam(seams, newWingShellPoint(rows[row], t0, shell).map((v, i) => i === 1 ? v + .07 : v), newWingShellPoint(z1, t1, shell).map((v, i) => i === 1 ? v + .07 : v), .055);
      }
    }
  }
  const ring = HKCEC_NEW_WING_SITE.localRing;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hkcecEdgeOutward(ring, edge).length, steps = Math.max(1, Math.ceil(length / 3));
    for (let j = 0; j < steps; j++) {
      const p0 = pointOnRing(ring, edge, j / steps, 0), p1 = pointOnRing(ring, edge, (j + 1) / steps, 0);
      p0[1] = newWingRoofHeightAt(p0[0], p0[2]) + .03; p1[1] = newWingRoofHeightAt(p1[0], p1[2]) + .03; beam(fascia, p0, p1, .34, .42);
    }
  }
  meshStore(group, roofStore, materials.roofMetal, 'NewWingCentralVaultAndTwoLowerSweptWingShells');
  merged(group, seams, materials.silver, 'NewWingStandingRoofSeams'); merged(group, fascia, materials.white, 'NewWingContinuousCurvedWhiteFascia');
  return { group, shells: 3, roofRows: rows.length, standingSeams: seams.length };
}

function createNewWingFacade() {
  const glass = store(), bands = store(), frames = store(); const ring = HKCEC_NEW_WING_SITE.localRing; let panels = 0, curvedPanels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hkcecEdgeOutward(ring, edge).length, bays = Math.max(1, Math.ceil(length / 3));
    for (let bay = 0; bay < bays; bay++) {
      const t0 = (bay + .018) / bays, t1 = (bay + .982) / bays, p0 = pointOnRing(ring, edge, t0, 0), p1 = pointOnRing(ring, edge, t1, 0);
      const top0 = newWingRoofHeightAt(p0[0], p0[2]) - .25, top1 = newWingRoofHeightAt(p1[0], p1[2]) - .25;
      for (const [y0, y1] of [[8, 14], [14, 20], [20, 26]]) {
        const lit = hash(edge, bay, y0) < .12 ? .16 + hash(edge, bay, y1) * .34 : 0;
        facadeQuad(glass, ring, edge, t0, t1, y0 + .12, y1 - .16, .055, tint([.27, .47, .52], (hash(edge, bay, y0, 2) - .5) * .075), lit); panels++;
      }
      if (Math.max(top0, top1) > 26.2) {
        facadeQuad(glass, ring, edge, t0, t1, 26.05, top0, .055, [.31, .51, .56], hash(edge, bay, 91) < .1 ? .22 : 0, top1); panels++; curvedPanels++;
      }
      facadeQuad(frames, ring, edge, Math.max(0, t0 - .002), Math.min(1, t0 + .002), 8, top0, .09, [.66, .72, .71], 0, top1);
    }
    for (const y of [8, 14, 20, 26]) facadeQuad(bands, ring, edge, 0, 1, y - .16, y + .16, .10, [.72, .75, .72]);
  }
  return { glass, bands, frames, panels, curvedPanels };
}

function createNewWingRefinement(materials) {
  // HK-B0088: the photographed new wing is a dense curved glass wall below a
  // three-dimensional flying-bird roof.  Add fine mullions and transverse roof ribs
  // without replacing the source-ring shell or claiming these are surveyed shop drawings.
  const group = new THREE.Group(); group.name = 'HKCECNewWingHK-B0088PhotoDirectedRefinement';
  const fins = store(), ribs = [];
  let finCount = 0;
  const ring = HKCEC_NEW_WING_SITE.localRing;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hkcecEdgeOutward(ring, edge).length, bays = Math.max(1, Math.ceil(length / 1.5));
    for (let bay = 0; bay < bays; bay++) {
      const t = (bay + .5) / bays, p = pointOnRing(ring, edge, t, 0);
      const top = newWingRoofHeightAt(p[0], p[2]) - .28;
      if (top <= 8.2) continue;
      facadeQuad(fins, ring, edge, Math.max(0, t - .0012), Math.min(1, t + .0012), 8, top, .115, [.58, .69, .69], 0, top);
      finCount++;
    }
  }
  const bounds = HKCEC_NEW_WING_SITE.localBounds, stations = 9, segments = 20;
  for (let station = 1; station <= stations; station++) {
    const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * station / (stations + 1);
    const range = newWingShellRange(z, 'main');
    for (let j = 0; j < segments; j++) {
      const t0 = lerp(range[0], range[1], j / segments), t1 = lerp(range[0], range[1], (j + 1) / segments);
      const a = newWingShellPoint(z, t0, 'main'), b = newWingShellPoint(z, t1, 'main');
      a[1] += .12; b[1] += .12; beam(ribs, a, b, .16, .22);
    }
  }
  meshStore(group, fins, materials.frames, 'NewWingHK-B0088DenseCurvedGlassWallFins', false);
  merged(group, ribs, materials.white, 'NewWingHK-B0088TransverseWhiteBirdRoofRibs');
  return { group, finCount, roofRibs: ribs.length };
}

function createAtrium(materials) {
  const group = new THREE.Group(); group.name = 'HKCECAtriumLinkRoofGardenAndWhiteArchTrusses'; const glass = store(), bands = store(), frames = store();
  const ring = HKCEC_ATRIUM_SITE.localRing; let panels = 0;
  for (let edge = 0; edge < ring.length / 2 - 1; edge++) {
    const length = hkcecEdgeOutward(ring, edge).length, bays = Math.max(1, Math.ceil(length / 2.7));
    for (const [y0, y1] of [[8, 13], [13, 18], [18, 23]]) for (let bay = 0; bay < bays; bay++) {
      const t0 = (bay + .018) / bays, t1 = (bay + .982) / bays, lit = hash(edge, bay, y0) < .18 ? .18 + hash(edge, bay, y1) * .4 : 0;
      facadeQuad(glass, ring, edge, t0, t1, y0 + .12, y1 - .12, .055, tint([.37, .54, .55], (hash(edge, bay, y0, 4) - .5) * .055), lit); panels++;
      facadeQuad(frames, ring, edge, t0, Math.min(1, t0 + .003), y0, y1, .09, [.70, .74, .71]);
    }
    for (const y of [8, 13, 18, 23]) facadeQuad(bands, ring, edge, 0, 1, y - .14, y + .14, .10, [.76, .78, .74]);
  }
  meshStore(group, glass, materials.glass, 'AtriumThreeLevelCurtainWall'); meshStore(group, bands, materials.whiteVertex, 'AtriumWhiteHorizontalFloorEdges'); meshStore(group, frames, materials.frames, 'AtriumCurtainWallMullions');
  shapeMesh(group, ring, HKCEC_COVERED_ROAD_SOFFIT, materials.soffit, 'AtriumRoadBridgeSoffit'); shapeMesh(group, ring, 23.8, materials.paving, 'AtriumRoofGardenDeck');
  const vaultGlass = [], truss = [], purlins = []; const zRows = 9, archSegments = 20, span = 80, centreX = -5;
  const archPoint = (z, j) => { const t = j / archSegments; return [centreX - span / 2 + span * t, 24 + 8 * Math.sin(Math.PI * t), z]; };
  for (let row = 0; row < zRows; row++) {
    const z = -32 + row * 8; for (let j = 0; j < archSegments; j++) beam(truss, archPoint(z, j), archPoint(z, j + 1), .34, .42);
    if (row < zRows - 1) for (let j = 0; j < archSegments; j++) {
      const a = archPoint(z, j), b = archPoint(z, j + 1), c = archPoint(z + 8, j + 1), d = archPoint(z + 8, j);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...d, ...c, ...a, ...c, ...b], 3)); g.computeVertexNormals(); vaultGlass.push(g);
    }
  }
  for (let j = 0; j <= archSegments; j += 2) beam(purlins, archPoint(-32, j), archPoint(32, j), .16);
  merged(group, truss, materials.white, 'AtriumNineExposedWhiteArchedTrusses'); merged(group, purlins, materials.silver, 'AtriumLongitudinalRoofPurlins'); merged(group, vaultGlass, materials.clearGlass, 'AtriumCurvedGlassRoofBetweenTrusses', false);
  const planters = [], leaves = [], trunks = [], benches = []; let trees = 0;
  for (const [x, z] of [[-62, -36], [-62, -16], [-62, 28], [-50, 52], [-28, 52], [28, 50], [43, 30], [58, -12], [58, -34], [-28, -45], [18, -44], [38, -38]]) {
    if (!pointInFlatRing(ring, x, z)) continue; box(planters, [x, 24.35, z], [4.4, 1.1, 4.4]); cylinder(trunks, [x, 26.2, z], .18, 3.2, 8); sphere(leaves, [x, 28.1, z], [1.65, 1.8, 1.65]); trees++;
  }
  for (const [x, z, ry] of [[-50, 5, 0], [-50, 15, 0], [43, 8, 0], [43, 18, 0], [-12, 52, Math.PI / 2], [0, 52, Math.PI / 2]]) if (pointInFlatRing(ring, x, z)) { box(benches, [x, 24.45, z], [2.4, .18, .65], ry); box(benches, [x, 24.85, z - .28], [2.4, .75, .12], ry); }
  merged(group, planters, materials.planter, 'AtriumRoofGardenPlanters'); merged(group, trunks, materials.wood, 'AtriumRoofGardenTreeTrunks'); merged(group, leaves, materials.leaves, 'AtriumRoofGardenTreeCanopies'); merged(group, benches, materials.wood, 'AtriumRoofGardenBenches');
  return { group, colliders: hkcecRingColliders(HKCEC_ATRIUM_SITE, ring, HKCEC_COVERED_ROAD_SOFFIT, HKCEC_ATRIUM_ROOF), panels, arches: zRows, trees, benches: benches.length / 2 };
}

function createColonnade(site, positions, materials, name) {
  const group = new THREE.Group(); group.name = `${name}RoadClearColonnade`; const columns = [], caps = [], colliders = [];
  for (const [x, z] of positions) {
    cylinder(columns, [x, (HKCEC_PLAZA_TOP + HKCEC_COVERED_ROAD_SOFFIT) / 2, z], .46, HKCEC_COVERED_ROAD_SOFFIT - HKCEC_PLAZA_TOP, 12);
    box(caps, [x, HKCEC_COVERED_ROAD_SOFFIT - .22, z], [1.25, .44, 1.25]);
    colliders.push(hkcecLocalCollider(site, x, z, .92, .92, HKCEC_PLAZA_TOP, HKCEC_COVERED_ROAD_SOFFIT));
  }
  merged(group, columns, materials.white, `${name}StructuralColumns`); merged(group, caps, materials.silver, `${name}ColumnCapitals`);
  return { group, colliders, count: positions.length };
}

function createGroundFacade(site, segments, name) {
  const group = new THREE.Group(); group.name = `${name}RoadSafeGroundCurtainWall`; const glass = store(), stone = store(), frames = store(), colliders = [];
  const ring = site.localRing;
  for (const [edge, t0, t1] of segments) {
    const inset0 = Math.min(t1, t0 + .0015), inset1 = Math.max(t0, t1 - .0015), lit = hash(edge, t0, t1) < .1 ? .12 : 0;
    facadeQuad(glass, ring, edge, inset0, inset1, .58, 7.62, .035, [.35, .52, .54], lit);
    facadeQuad(stone, ring, edge, t0, t1, HKCEC_PLAZA_TOP, .56, .055, [.61, .64, .61]);
    facadeQuad(stone, ring, edge, t0, t1, 7.64, HKCEC_COVERED_ROAD_SOFFIT, .06, [.69, .72, .69]);
    facadeQuad(frames, ring, edge, Math.max(0, t0 - .001), Math.min(1, t0 + .001), .52, 7.68, .075, [.57, .64, .63]);
  }
  // Adjacent safe panels share one OBB collider; every carriageway intersection remains an open portal instead of a deleted road.
  let run = null;
  const flush = () => {
    if (!run) return; const { edge, t0, t1 } = run, i = edge * 2, { ry, length } = hkcecEdgeOutward(ring, edge);
    colliders.push(hkcecLocalCollider(site, lerp(ring[i], ring[i + 2], (t0 + t1) * .5), lerp(ring[i + 1], ring[i + 3], (t0 + t1) * .5), length * (t1 - t0), .34, HKCEC_PLAZA_TOP, HKCEC_COVERED_ROAD_SOFFIT, site.ry + ry)); run = null;
  };
  for (const [edge, t0, t1] of segments) {
    if (run && (run.edge !== edge || Math.abs(run.t1 - t0) > .00001)) flush();
    if (!run) run = { edge, t0, t1 }; else run.t1 = t1;
  }
  flush();
  return { group, glass, stone, frames, colliders, panels: segments.length };
}

function createEntrance(site, frame, materials, apartment = false) {
  const group = frameGroup(site, frame, HKCEC_PLAZA_TOP); group.name = apartment ? 'ConventionPlazaApartmentsHarbourRoadEntrance' : 'HKCECHarbourRoadMainEntrance';
  const stone = [], silver = [], glass = [], lights = [], colliders = [];
  const layout = HKCEC_ENTRANCE_LAYOUTS[apartment ? 'apartment' : 'main'];
  const { width, depth, canopy, roadClearWidth, bayCentre, bayWidth, doorWidth, columnRadius, columns } = layout;
  // Local +Z points out of the source footprint. Recessed outer lobby bays and every cylindrical support are
  // individually road-clear; the canopy bridges the central portal and flanking carriageways without walls or floors across them.
  for (const side of [-1, 1]) {
    const centre = side * bayCentre;
    box(stone, [centre, 2.5, -depth + .25], [bayWidth, 5, .5]);
    box(glass, [centre, 2.15, -depth + .56], [doorWidth, 4.1, .12]);
    colliders.push(hkcecFrameCollider(site, frame, centre, -depth + .25, bayWidth, .5, HKCEC_PLAZA_TOP, HKCEC_PLAZA_TOP + 5));
  }
  box(silver, [0, canopy, 1.1], [width + (apartment ? 1.4 : 3), .34, depth + 4.2]);
  for (const [x, z] of columns) {
    cylinder(silver, [x, canopy / 2, z], columnRadius, canopy, 16);
    colliders.push(hkcecFrameCollider(site, frame, x, z, columnRadius * 2, columnRadius * 2, HKCEC_PLAZA_TOP, HKCEC_PLAZA_TOP + canopy));
  }
  for (let i = 0; i < (apartment ? 7 : 8); i++) cylinder(lights, [-width / 2 + 2 + i * (width - 4) / ((apartment ? 7 : 8) - 1), canopy - .22, 1.0], .12, .08, 10);
  if (apartment) {
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), materials.carpet); carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(-bayCentre, .115, -depth + 1); carpet.name = 'ConventionPlazaApartmentsRedEntranceCarpet'; group.add(carpet);
  }
  const sign = textPlane(apartment ? '會景閣  CONVENTION PLAZA APARTMENTS' : '香港會議展覽中心  HKCEC', layout.signWidth, layout.signHeight, layout.fontSize);
  // Put the bilingual fascia on the outer canopy edge, not behind its slab; its underside still exceeds the vehicle envelope.
  sign.position.set(0, canopy, 1.1 + (depth + 4.2) / 2 + .04); group.add(sign);
  merged(group, stone, materials.planter, 'EntranceRoadSafeOuterLobbyBaysAndStoneWalls'); merged(group, silver, materials.silver, 'EntranceCanopyAndRoadSafeCylindricalColumns');
  merged(group, glass, materials.clearGlass, 'EntranceSideBayGlassDoors', false); merged(group, lights, materials.light, 'EntranceWarmCanopyLights', false);
  return { group, colliders, canopyClearance: canopy - .17, roadClearWidth };
}

export function buildHkcec(root, { groundOffset = 0 } = {}) {
  const complex = new THREE.Group(); complex.name = 'HKCECAndConventionPlazaApartments'; complex.userData.landmark = 'hkcec-convention-plaza-apartments'; root.add(complex);
  const glass = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .42, roughness: .19, side: THREE.DoubleSide }); glass.colorNode = attribute('color'); glass.emissiveNode = color(0xffd2a0).mul(attribute('aLit')).mul(nightAmount()).mul(.82);
  const whiteVertex = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .18, roughness: .38, side: THREE.DoubleSide }); whiteVertex.colorNode = attribute('color');
  const frames = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .72, roughness: .26, side: THREE.DoubleSide }); frames.colorNode = attribute('color');
  const roofMetal = new THREE.MeshStandardNodeMaterial({ vertexColors: true, metalness: .68, roughness: .31, side: THREE.DoubleSide }); roofMetal.colorNode = attribute('color'); roofMetal.emissiveNode = color(0xffd8ae).mul(nightAmount()).mul(.018);
  const silver = new THREE.MeshStandardMaterial({ color: 0xaeb9b8, metalness: .74, roughness: .28 });
  const white = new THREE.MeshStandardNodeMaterial({ color: 0xd7dcd6, metalness: .24, roughness: .4 }); white.emissiveNode = color(0xffd8ae).mul(nightAmount()).mul(.035);
  const dark = new THREE.MeshStandardMaterial({ color: 0x273236, metalness: .34, roughness: .5 });
  const soffit = new THREE.MeshStandardMaterial({ color: 0x747b79, roughness: .8, side: THREE.DoubleSide });
  const roof = new THREE.MeshStandardMaterial({ color: 0x626c6b, roughness: .83, side: THREE.DoubleSide });
  const paving = new THREE.MeshStandardMaterial({ color: 0x9a9c91, roughness: .88, side: THREE.DoubleSide });
  const planter = new THREE.MeshStandardMaterial({ color: 0xa6a69a, roughness: .82 });
  const clearGlass = new THREE.MeshStandardNodeMaterial({ color: 0x8db5b8, metalness: .12, roughness: .12, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false }); clearGlass.emissiveNode = color(0xffd2a0).mul(nightAmount()).mul(.06);
  const leaves = new THREE.MeshStandardMaterial({ color: 0x426b45, roughness: .92 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x544638, roughness: .84 });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x8f1822, roughness: .92, side: THREE.DoubleSide });
  const light = new THREE.MeshStandardNodeMaterial({ color: 0xffe0ad }); light.emissiveNode = color(0xffc274).mul(nightAmount()).mul(1.6);
  const materials = { glass, whiteVertex, frames, roofMetal, silver, white, dark, soffit, roof, paving, planter, clearGlass, leaves, wood, carpet, light };

  const apartmentGroup = new THREE.Group(); apartmentGroup.name = 'ConventionPlazaApartments'; apartmentGroup.userData.osm = { type: 'way', id: HKCEC_APARTMENT_OSM_SOURCE.id }; apartmentGroup.position.set(HKCEC_APARTMENT_SITE.x, groundOffset, HKCEC_APARTMENT_SITE.z); apartmentGroup.rotation.y = HKCEC_APARTMENT_SITE.ry; complex.add(apartmentGroup);
  const apartment = createApartmentFacade();
  meshStore(apartmentGroup, apartment.glass, glass, 'ApartmentsBlueGreenGlass35Courses');
  merged(apartmentGroup, apartment.ribGeometries, whiteVertex, 'ApartmentsProjectingSilverCourseBands');
  merged(apartmentGroup, apartment.mullionGeometries, whiteVertex, 'ApartmentsSilverVerticalMullions');
  merged(apartmentGroup, apartment.ribs, whiteVertex, 'ApartmentsFullHeightChamferCornerPilasters');
  const crown = createApartmentCrown(materials); apartmentGroup.add(crown.group);
  const apartmentEntrance = createEntrance(HKCEC_APARTMENT_SITE, HKCEC_APARTMENT_ENTRANCE, materials, true); apartmentGroup.add(apartmentEntrance.group);

  const oldGroup = new THREE.Group(); oldGroup.name = 'HKCECOldWing'; oldGroup.userData.osm = { type: 'way', id: HKCEC_OLD_WING_OSM_SOURCE.id }; oldGroup.position.set(HKCEC_OLD_WING_SITE.x, groundOffset, HKCEC_OLD_WING_SITE.z); oldGroup.rotation.y = HKCEC_OLD_WING_SITE.ry; complex.add(oldGroup);
  const oldFacade = createOldWingFacade(); meshStore(oldGroup, oldFacade.glass, glass, 'OldWingRibbonGlazing'); meshStore(oldGroup, oldFacade.stone, whiteVertex, 'OldWingPaleHorizontalCladding'); meshStore(oldGroup, oldFacade.frames, frames, 'OldWingWindowFrames');
  shapeMesh(oldGroup, HKCEC_OLD_WING_SITE.localRing, HKCEC_COVERED_ROAD_SOFFIT, soffit, 'OldWingRoadClearUpperPodiumSoffit');
  const oldRoof = createOldWingRoof(materials); oldGroup.add(oldRoof.group);
  const oldRefinement = createOldWingRefinement(materials); oldGroup.add(oldRefinement.group);
  const mainEntrance = createEntrance(HKCEC_OLD_WING_SITE, HKCEC_MAIN_ENTRANCE, materials, false); oldGroup.add(mainEntrance.group);
  const oldColumns = createColonnade(HKCEC_OLD_WING_SITE, HKCEC_COLUMN_POSITIONS.oldWing, materials, 'OldWing'); oldGroup.add(oldColumns.group);
  const oldGround = createGroundFacade(HKCEC_OLD_WING_SITE, HKCEC_GROUND_FACADE_SEGMENTS.oldWing, 'OldWing');
  meshStore(oldGroup, oldGround.glass, glass, 'OldWingRoadSafeGroundGlass'); meshStore(oldGroup, oldGround.stone, whiteVertex, 'OldWingGroundStonePlinths'); meshStore(oldGroup, oldGround.frames, frames, 'OldWingGroundCurtainWallFrames'); oldGroup.add(oldGround.group);

  const newGroup = new THREE.Group(); newGroup.name = 'HKCECNewWing'; newGroup.userData.osm = { type: 'way', id: HKCEC_NEW_WING_OSM_SOURCE.id }; newGroup.position.set(HKCEC_NEW_WING_SITE.x, groundOffset, HKCEC_NEW_WING_SITE.z); newGroup.rotation.y = HKCEC_NEW_WING_SITE.ry; complex.add(newGroup);
  const newFacade = createNewWingFacade(); meshStore(newGroup, newFacade.glass, glass, 'NewWingCurvedHarbourGlassWall'); meshStore(newGroup, newFacade.bands, whiteVertex, 'NewWingWhiteHorizontalWindowBands'); meshStore(newGroup, newFacade.frames, frames, 'NewWingCurvedWallMullions');
  shapeMesh(newGroup, HKCEC_NEW_WING_SITE.localRing, HKCEC_COVERED_ROAD_SOFFIT, soffit, 'NewWingRoadClearUpperPodiumSoffit');
  const newRoof = createNewWingRoof(materials); newGroup.add(newRoof.group);
  const newEave = createNewWingEave(materials); newGroup.add(newEave.group);
  const newRefinement = createNewWingRefinement(materials); newGroup.add(newRefinement.group);
  const newColumns = createColonnade(HKCEC_NEW_WING_SITE, HKCEC_COLUMN_POSITIONS.newWing, materials, 'NewWing'); newGroup.add(newColumns.group);
  const newGround = createGroundFacade(HKCEC_NEW_WING_SITE, HKCEC_GROUND_FACADE_SEGMENTS.newWing, 'NewWing');
  meshStore(newGroup, newGround.glass, glass, 'NewWingRoadSafeGroundGlass'); meshStore(newGroup, newGround.stone, whiteVertex, 'NewWingGroundStonePlinths'); meshStore(newGroup, newGround.frames, frames, 'NewWingGroundCurtainWallFrames'); newGroup.add(newGround.group);

  const atrium = createAtrium(materials); const atriumGroup = atrium.group; atriumGroup.userData.osm = { type: 'way', id: HKCEC_ATRIUM_OSM_SOURCE.id }; atriumGroup.position.set(HKCEC_ATRIUM_SITE.x, groundOffset, HKCEC_ATRIUM_SITE.z); atriumGroup.rotation.y = HKCEC_ATRIUM_SITE.ry; complex.add(atriumGroup);
  const atriumColumns = createColonnade(HKCEC_ATRIUM_SITE, HKCEC_COLUMN_POSITIONS.atrium, materials, 'Atrium'); atriumGroup.add(atriumColumns.group);

  const colliders = [
    ...hkcecRingColliders(HKCEC_APARTMENT_SITE, HKCEC_APARTMENT_SITE.localRing, HKCEC_APARTMENT_PODIUM_TOP, HKCEC_APARTMENT_MAIN_ROOF), ...crown.colliders, ...apartmentEntrance.colliders,
    ...hkcecRingColliders(HKCEC_OLD_WING_SITE, HKCEC_OLD_WING_SITE.localRing, HKCEC_COVERED_ROAD_SOFFIT, HKCEC_OLD_WING_ROOF), ...mainEntrance.colliders, ...oldColumns.colliders, ...oldGround.colliders,
    ...hkcecRingColliders(HKCEC_NEW_WING_SITE, HKCEC_NEW_WING_SITE.localRing, HKCEC_COVERED_ROAD_SOFFIT, HKCEC_NEW_WING_HEIGHT), ...newColumns.colliders, ...newGround.colliders,
    ...atrium.colliders, ...atriumColumns.colliders
  ];
  for (const c of colliders) { c.minY += groundOffset; c.maxY += groundOffset; }
  const grounds = { plaza: groundOffset + HKCEC_PLAZA_TOP };
  const landmarks = [
    { id: 'hkcec-convention-plaza-apartments', name: '香港會議展覽中心連會景閣 · HKCEC & Convention Plaza Apartments',
      position: { x: HKCEC_NEW_WING_SITE.x, y: groundOffset, z: HKCEC_NEW_WING_SITE.z }, radius: 230, height: HKCEC_APARTMENT_HEIGHT, components: 4 }
  ];
  const stats = {
    hkcecGroundOffset: groundOffset, hkcecLandmarks: 1, hkcecComponents: 4, hkcecOsmWays: [HKCEC_NEW_WING_OSM_SOURCE.id, HKCEC_OLD_WING_OSM_SOURCE.id, HKCEC_ATRIUM_OSM_SOURCE.id, HKCEC_APARTMENT_OSM_SOURCE.id],
    hkcecOsmWayVersions: [HKCEC_NEW_WING_OSM_SOURCE.version, HKCEC_OLD_WING_OSM_SOURCE.version, HKCEC_ATRIUM_OSM_SOURCE.version, HKCEC_APARTMENT_OSM_SOURCE.version],
    hkcecNewWingRingArea: HKCEC_NEW_WING_SITE.area, hkcecOldWingRingArea: HKCEC_OLD_WING_SITE.area, hkcecAtriumRingArea: HKCEC_ATRIUM_SITE.area, hkcecApartmentRingArea: HKCEC_APARTMENT_SITE.area,
    hkcecSomHeight: HKCEC_SOM_HEIGHT, hkcecSomStories: HKCEC_SOM_STORIES, hkcecSomSiteAreaHectares: HKCEC_SOM_SITE_AREA_HECTARES, hkcecSomGrossArea: HKCEC_SOM_GROSS_AREA,
    hkcecSomClearSpan: HKCEC_SOM_CLEAR_SPAN, hkcecSomVaultedCeilingFeet: HKCEC_SOM_VAULTED_CEILING_FEET, hkcecWoAtriumLevels: HKCEC_WO_ATRIUM_LEVELS, hkcecWoAtriumArea: HKCEC_WO_ATRIUM_AREA,
    hkcecWoAtriumSpan: HKCEC_WO_ATRIUM_SPAN, hkcecWoPhase2Halls: HKCEC_WO_PHASE2_HALLS, hkcecWoPhase2ExhibitionArea: HKCEC_WO_PHASE2_EXHIBITION_AREA, hkcecWoConventionHallSeats: HKCEC_WO_CONVENTION_HALL_SEATS,
    hkcecPhase2CompletionYear: HKCEC_PHASE2_COMPLETION_YEAR, hkcecOriginalCompletionYear: HKCEC_ORIGINAL_COMPLETION_YEAR, hkcecAtriumCompletionYear: HKCEC_ATRIUM_COMPLETION_YEAR,
    hkcecPhase2Architects: HKCEC_PHASE2_ARCHITECTS, hkcecOriginalArchitect: HKCEC_ORIGINAL_ARCHITECT, hkcecNewWingOsmLevels: HKCEC_NEW_WING_OSM_LEVELS, hkcecOldWingOsmLevels: HKCEC_OLD_WING_OSM_LEVELS, hkcecAtriumOsmLevels: HKCEC_ATRIUM_OSM_LEVELS,
    hkcecApartmentHeight: HKCEC_APARTMENT_HEIGHT, hkcecApartmentOsmLevels: HKCEC_APARTMENT_OSM_LEVELS, hkcecApartmentOsmMinLevel: HKCEC_APARTMENT_OSM_MIN_LEVEL,
    hkcecApartmentCompletionYear: HKCEC_APARTMENT_COMPLETION_YEAR, hkcecApartmentOfficialResidentialLevels: HKCEC_APARTMENT_OFFICIAL_RESIDENTIAL_LEVELS,
    hkcecApartmentOfficialResidentialFloorRange: `${HKCEC_APARTMENT_OFFICIAL_FIRST_RESIDENTIAL_LEVEL}–${HKCEC_APARTMENT_OFFICIAL_LAST_RESIDENTIAL_LEVEL}`, hkcecApartmentOfficialApproxUnits: HKCEC_APARTMENT_OFFICIAL_APPROX_UNITS,
    hkcecApartmentVisualCourses: HKCEC_APARTMENT_VISUAL_COURSES, hkcecApartmentGlassPanels: apartment.glassPanels, hkcecApartmentCourseBands: apartment.horizontalBands, hkcecApartmentMullions: apartment.verticalMullions, hkcecApartmentCornerPilasters: apartment.cornerPilasters, hkcecApartmentFacadeMaterial: 'projecting silver courses over recessed blue-green glass',
    hkcecNewWingRoofShells: newRoof.shells, hkcecNewWingCurvedGlassPanels: newFacade.curvedPanels, hkcecNewWingGlassPanels: newFacade.panels, hkcecNewWingRoofSeams: newRoof.standingSeams,
    hkcecNewWingEavePanels: newEave.panels, hkcecNewWingEaveProjectionMetres: newEave.projection,
    hkcecNewWingRefined: true, hkcecNewWingInventoryId: 'HK-B0088', hkcecNewWingFineFacadeFins: newRefinement.finCount, hkcecNewWingRoofRibs: newRefinement.roofRibs,
    hkcecOldWingGlassPanels: oldFacade.panels, hkcecOldWingRoofPlantUnits: oldRoof.units, hkcecOldWingRoofFans: oldRoof.fanCount,
    hkcecOldWingRefined: true, hkcecOldWingInventoryId: 'HK-B0089', hkcecOldWingBalconySlabs: oldRefinement.slabCount, hkcecOldWingBalconyRailSegments: oldRefinement.railSegments,
    hkcecAtriumGlassPanels: atrium.panels, hkcecAtriumWhiteArchTrusses: atrium.arches, hkcecAtriumRoofGardenTrees: atrium.trees, hkcecAtriumRoofGardenBenches: atrium.benches,
    hkcecCoveredRoadSoffit: HKCEC_COVERED_ROAD_SOFFIT, hkcecVehicleEnvelope: HKCEC_VEHICLE_ENVELOPE, hkcecGroundColumns: oldColumns.count + newColumns.count + atriumColumns.count,
    hkcecGroundFacadePanels: oldGround.panels + newGround.panels, hkcecGroundFacadeColliders: oldGround.colliders.length + newGround.colliders.length,
    hkcecMainEntranceCanopyClearance: mainEntrance.canopyClearance, hkcecApartmentEntranceCanopyClearance: apartmentEntrance.canopyClearance,
    hkcecMainEntranceRoadPortalWidth: mainEntrance.roadClearWidth, hkcecApartmentEntranceRoadPortalWidth: apartmentEntrance.roadClearWidth,
    hkcecGroundRings: HKCEC_GROUND_RINGS.length, hkcecPlazaGround: grounds.plaza, hkcecColliders: colliders.length
  };
  complex.userData.stats = stats;
  return { group: complex, colliders, landmarks, stats, groundOffset, grounds, plazaTop: grounds.plaza, groundHeightAt: (x, z, ground) => hkcecGroundHeightAt(x, z, ground, grounds) };
}
