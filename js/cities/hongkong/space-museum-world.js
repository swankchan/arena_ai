import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import {
  SPACE_MUSEUM_EAST_SITE, SPACE_MUSEUM_WEST_SITE, SPACE_MUSEUM_SITES,
  SPACE_MUSEUM_DOME_HEIGHT, SPACE_MUSEUM_SCREEN_DIAMETER, SPACE_MUSEUM_OPENING_YEAR,
  SPACE_MUSEUM_WEST_WALL_HIGH, SPACE_MUSEUM_WEST_WALL_LOW,
  SPACE_MUSEUM_EAST_BLADE_HEIGHT, SPACE_MUSEUM_WEST_BLADE_HEIGHT, SPACE_MUSEUM_MAIN_ENTRANCE,
  spaceMuseumRoadRecords, spaceMuseumTerrainHeightAt,
} from './space-museum-architecture.js';
import {
  harbourCityLocalCollider, harbourCityRingColliders, harbourCitySegmentCollider,
} from './harbour-city-architecture.js';
import { spaceMuseumPadHeight } from './terrain.js';
import {
  merged, box, beam, ringFrame, polygonCentre, nightAmount, edgeBox,
} from './harbour-city-world-utils.js';

function westWallHeightAt(x, z) {
  const t = Math.max(0, Math.min(1, (23.34 - z) / 46.68));
  const smooth = t * t * (3 - 2 * t);
  return SPACE_MUSEUM_WEST_WALL_LOW + (SPACE_MUSEUM_WEST_WALL_HIGH - SPACE_MUSEUM_WEST_WALL_LOW) * smooth;
}

// The real west wing has a low flat roof behind its tall sweeping street wall, not a giant sloping solid wedge.
function westWingBodyGeometry(ring) {
  const contour = [], positions = [], indices = [];
  for (let i = 0; i < ring.length - 2; i += 2) contour.push(new THREE.Vector2(ring[i], ring[i + 1]));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  for (const p of contour) positions.push(p.x, SPACE_MUSEUM_WEST_WALL_LOW, p.y);
  for (const triangle of triangles) indices.push(triangle[2], triangle[1], triangle[0]);
  const sideOffset = positions.length / 3;
  for (let i = 0; i < contour.length; i += 1) {
    const a = contour[i], b = contour[(i + 1) % contour.length], j = sideOffset + i * 4;
    positions.push(a.x, 0, a.y, b.x, 0, b.y, b.x, SPACE_MUSEUM_WEST_WALL_LOW, b.y, a.x, SPACE_MUSEUM_WEST_WALL_LOW, a.y);
    indices.push(j, j + 1, j + 2, j, j + 2, j + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
function sweepingFacadeGeometry(ring) {
  const positions = [], indices = [];
  for (let edge = 0; edge <= 12; edge += 1) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const ah = westWallHeightAt(ax, az), bh = westWallHeightAt(bx, bz);
    if (ah <= SPACE_MUSEUM_WEST_WALL_LOW + .02 && bh <= SPACE_MUSEUM_WEST_WALL_LOW + .02) continue;
    const j = positions.length / 3;
    positions.push(ax, SPACE_MUSEUM_WEST_WALL_LOW - .04, az, bx, SPACE_MUSEUM_WEST_WALL_LOW - .04, bz, bx, bh, bz, ax, ah, az);
    indices.push(j, j + 1, j + 2, j, j + 2, j + 3);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}
const westEdgeHeightAt = (edge, x, z) => edge <= 12 ? westWallHeightAt(x, z) : SPACE_MUSEUM_WEST_WALL_LOW;

const domeCentre = (() => {
  const centre = polygonCentre(SPACE_MUSEUM_EAST_SITE.localRing);
  // The off-centre crown gives the source outline its observed egg-like rather than spherical-cap profile.
  return { x: centre.x, z: centre.z - 2.15 };
})();
function domePoint(boundary, r, lift = 0) {
  const x = domeCentre.x + (boundary.x - domeCentre.x) * r;
  const z = domeCentre.z + (boundary.z - domeCentre.z) * r;
  const y = SPACE_MUSEUM_DOME_HEIGHT * Math.pow(Math.max(0, 1 - r * r), 0.56) + lift;
  return [x, y, z];
}
function domeGeometry() {
  const ring = SPACE_MUSEUM_EAST_SITE.localRing, positions = [domeCentre.x, SPACE_MUSEUM_DOME_HEIGHT, domeCentre.z], indices = [];
  const radial = 18, segments = ring.length / 2 - 1;
  for (let row = 1; row <= radial; row += 1) for (let segment = 0; segment < segments; segment += 1) {
    const boundary = { x: ring[segment * 2], z: ring[segment * 2 + 1] };
    positions.push(...domePoint(boundary, row / radial));
  }
  for (let segment = 0; segment < segments; segment += 1) indices.push(0, 1 + segment, 1 + (segment + 1) % segments);
  for (let row = 1; row < radial; row += 1) for (let segment = 0; segment < segments; segment += 1) {
    const a = 1 + (row - 1) * segments + segment, b = 1 + (row - 1) * segments + (segment + 1) % segments;
    const c = 1 + row * segments + segment, d = 1 + row * segments + (segment + 1) % segments;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}
function domePanelSeams() {
  const ring = SPACE_MUSEUM_EAST_SITE.localRing, positions = [], segments = ring.length / 2 - 1;
  const boundaryAt = (value) => {
    const wrapped = ((value % segments) + segments) % segments, index = Math.floor(wrapped), t = wrapped - index, next = (index + 1) % segments;
    return { x: ring[index * 2] + (ring[next * 2] - ring[index * 2]) * t, z: ring[index * 2 + 1] + (ring[next * 2 + 1] - ring[index * 2 + 1]) * t };
  };
  // Two diagonal families follow the photographed rhombic metal-panel joints rather than a latitude / longitude globe grid.
  for (const direction of [-1, 1]) for (let segment = 0; segment < segments; segment += 1) for (let step = 0; step < 20; step += 1) {
    const r0 = .045 + step / 20 * .955, r1 = .045 + (step + 1) / 20 * .955;
    const a = domePoint(boundaryAt(segment + direction * r0 * 10), r0, .035), b = domePoint(boundaryAt(segment + direction * r1 * 10), r1, .035);
    positions.push(...a, ...b);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); return geometry;
}

function wingTileGrid(ring) {
  const positions = [];
  for (let edge = 0; edge < ring.length / 2 - 1; edge += 1) {
    const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3];
    const length = Math.hypot(bx - ax, bz - az), divisions = Math.max(1, Math.ceil(length / 1.5));
    for (let y = 1.45; y < SPACE_MUSEUM_WEST_WALL_HIGH; y += 1.45) for (let step = 0; step < divisions; step += 1) {
      const t0 = step / divisions, t1 = (step + 1) / divisions;
      const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      if (westEdgeHeightAt(edge, x0, z0) > y + .08 && westEdgeHeightAt(edge, x1, z1) > y + .08) positions.push(x0, y, z0, x1, y, z1);
    }
    const verticals = Math.max(1, Math.ceil(length / 2.8));
    for (let step = 0; step <= verticals; step += 1) {
      const t = step / verticals, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      positions.push(x, .18, z, x, westEdgeHeightAt(edge, x, z) - .08, z);
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); return geometry;
}

function entranceLettering() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 320;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#272b29';
  ctx.font = '600 65px Arial, sans-serif'; ctx.fillText('HONG KONG', 512, 82);
  ctx.font = '600 57px Arial, sans-serif'; ctx.fillText('SPACE MUSEUM', 512, 158);
  ctx.font = '400 28px Arial, sans-serif'; ctx.fillText('10 SALISBURY ROAD', 512, 238);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: .08, roughness: .72, metalness: .02, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 2.1), material); mesh.name = 'Space Museum direct wall lettering'; return mesh;
}

function buildEntrance(west, materials) {
  const frame = ringFrame(SPACE_MUSEUM_WEST_SITE, SPACE_MUSEUM_MAIN_ENTRANCE.sourceEdge, SPACE_MUSEUM_MAIN_ENTRANCE.t), facade = new THREE.Group(); facade.name = 'Space Museum recessed north entrance and arrival ramp';
  facade.position.set(frame.x, 0, frame.z); facade.rotation.y = Math.atan2(frame.nx, frame.nz); west.add(facade);
  const recess = [], glazing = [], frames = [], canopy = [], steps = [], rails = [];
  box(recess, [-1.6, 9.15, .065], [10.8, 18.3, .13]);
  for (let i = 0; i < 6; i += 1) {
    const x = -6.1 + i * 1.8, pane = new THREE.PlaneGeometry(1.66, 17.35); pane.translate(x, 8.9, .15); glazing.push(pane);
    box(frames, [x - .88, 8.9, .2], [.085, 17.5, .11]);
  }
  for (const y of [.21, 4.05, 8.15, 12.25, 17.62]) box(frames, [-1.6, y, .2], [10.8, .1, .11]);
  // The two source-aligned blades are joined by the photographed high tiled entablature above the tall glass atrium.
  box(canopy, [0, 21.1, .08], [18.4, 4.2, .85]);
  for (let i = 0; i < 3; i += 1) box(steps, [-1.2, .04 + i * .04, 1.45 - i * .48], [13.8 - i * .25, .08 + i * .08, .52]);
  // A separate shallow accessible ramp runs beside the steps; the nearest carriageway is well beyond this apron.
  const ramp = new THREE.BoxGeometry(2.2, .12, 5.8); ramp.rotateX(Math.atan2(.22, 5.8)); ramp.translate(6.25, .14, 3.25); steps.push(ramp);
  for (const x of [5.08, 7.42]) {
    for (const h of [.58, 1.02]) beam(rails, [x, .36 + h, .35], [x, .14 + h, 6.15], .055, .055);
    for (let i = 0; i <= 4; i += 1) { const z = .35 + i * 1.45, y = .36 - i / 4 * .22; beam(rails, [x, y, z], [x, y + 1.04, z], .05, .05); }
  }
  for (const x of [-7.9, 4.7]) { beam(rails, [x, .15, .15], [x, 1.15, .15], .055, .055); beam(rails, [x, .08, 1.85], [x, 1.08, 1.85], .055, .055); beam(rails, [x, 1.08, 1.85], [x, 1.15, .15], .055, .055); }
  merged(facade, recess, materials.dark, 'Space Museum deep dark entrance recess');
  merged(facade, glazing, materials.glass, 'Space Museum warm recessed entrance glazing', false);
  merged(facade, frames, materials.metal, 'Space Museum entrance door mullions and transom');
  merged(facade, canopy, materials.wall, 'Space Museum high tiled entrance entablature');
  merged(facade, steps, materials.paving, 'Space Museum shallow arrival steps and accessible ramp');
  merged(facade, rails, materials.metal, 'Space Museum stainless-steel ramp and stair handrails');
  const lettering = entranceLettering(); lettering.position.set(5.6, 3.05, .19); facade.add(lettering);
  return facade;
}

export function buildSpaceMuseum(scene, { groundOffset } = {}) {
  const base = groundOffset ?? spaceMuseumPadHeight(), root = new THREE.Group(); root.name = 'Hong Kong Space Museum — exact east and west OSM wings';
  const east = new THREE.Group(); east.name = 'Space Museum East Wing — panelled egg dome';
  east.position.set(SPACE_MUSEUM_EAST_SITE.x, base, SPACE_MUSEUM_EAST_SITE.z); east.rotation.y = SPACE_MUSEUM_EAST_SITE.ry; root.add(east);
  const west = new THREE.Group(); west.name = 'Space Museum West Wing — sweeping tiled wall and entrance';
  west.position.set(SPACE_MUSEUM_WEST_SITE.x, base, SPACE_MUSEUM_WEST_SITE.z); west.rotation.y = SPACE_MUSEUM_WEST_SITE.ry; root.add(west);
  const wall = new THREE.MeshStandardMaterial({ color: 0xc8c0aa, roughness: .82, metalness: .02, side: THREE.DoubleSide });
  const dome = new THREE.MeshStandardMaterial({ color: 0xd9dcd7, roughness: .69, metalness: .08, side: THREE.DoubleSide });
  dome.emissiveNode = color(.32, .42, .55).mul(nightAmount()).mul(.11);
  const glass = new THREE.MeshStandardMaterial({ color: 0x203536, roughness: .24, metalness: .25, side: THREE.DoubleSide });
  glass.emissiveNode = color(1, .69, .35).mul(nightAmount()).mul(.7);
  const materials = {
    wall, dome, glass,
    dark: new THREE.MeshStandardMaterial({ color: 0x151d1d, roughness: .76 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9ba5a2, roughness: .3, metalness: .78 }),
    paving: new THREE.MeshStandardMaterial({ color: 0x8b8074, roughness: .92, metalness: .01 }),
    blade: new THREE.MeshStandardMaterial({ color: 0xbcb49f, roughness: .84, metalness: .02 }),
    reveal: new THREE.MeshStandardMaterial({ color: 0x8f8674, roughness: .88, metalness: .01 }),
  };
  const domeMesh = new THREE.Mesh(domeGeometry(), dome); domeMesh.name = 'Space Museum 25 m OSM-height egg-shaped exterior dome'; domeMesh.castShadow = true; domeMesh.receiveShadow = true; east.add(domeMesh);
  const seamMaterial = new THREE.LineBasicMaterial({ color: 0x727a78, transparent: true, opacity: .38, depthWrite: false });
  const seams = new THREE.LineSegments(domePanelSeams(), seamMaterial); seams.name = 'Space Museum diagonal dome panel seams'; east.add(seams);

  const wing = new THREE.Mesh(westWingBodyGeometry(SPACE_MUSEUM_WEST_SITE.localRing), wall); wing.name = 'Space Museum exact west wing and low flat roof'; wing.castShadow = true; wing.receiveShadow = true; west.add(wing);
  const sweepingWall = new THREE.Mesh(sweepingFacadeGeometry(SPACE_MUSEUM_WEST_SITE.localRing), wall); sweepingWall.name = 'Space Museum sweeping curved street wall above flat roof'; sweepingWall.castShadow = true; sweepingWall.receiveShadow = true; west.add(sweepingWall);
  const tileMaterial = new THREE.LineBasicMaterial({ color: 0x817665, transparent: true, opacity: .4, depthWrite: false });
  const tiles = new THREE.LineSegments(wingTileGrid(SPACE_MUSEUM_WEST_SITE.localRing), tileMaterial); tiles.name = 'Space Museum fine beige ceramic tile grid'; west.add(tiles);
  const blades = [], bladeBands = [], skylights = [], skylightGlass = [], reveals = [];
  for (const y of [3.1, 5.35, 7.6]) edgeBox(reveals, SPACE_MUSEUM_WEST_SITE, 0, .5, y, .035, 19.7, .12, .07);
  merged(west, reveals, materials.reveal, 'Space Museum three long west-wing horizontal reveals');
  box(blades, [-12.1, SPACE_MUSEUM_EAST_BLADE_HEIGHT * .5, -16.1], [1.3, SPACE_MUSEUM_EAST_BLADE_HEIGHT, 2.9]);
  box(blades, [-12.1, SPACE_MUSEUM_WEST_BLADE_HEIGHT * .5, 1], [1.3, SPACE_MUSEUM_WEST_BLADE_HEIGHT, 2.9]);
  for (const [z, height] of [[-16.1, SPACE_MUSEUM_EAST_BLADE_HEIGHT], [1, SPACE_MUSEUM_WEST_BLADE_HEIGHT]]) for (let y = 1.45; y < height; y += 1.45) box(bladeBands, [-12.1, y, z], [1.34, .035, 2.94]);
  for (const z of [3.2, 7.1, 11, 14.9, 18.8]) {
    box(skylights, [-2.3, 8.96, z], [9.2, .92, 1.65]);
    box(skylightGlass, [-2.3, 9.46, z], [8.55, .1, 1.18]);
  }
  merged(west, blades, materials.blade, 'Space Museum two tall narrow tiled blade walls');
  merged(west, bladeBands, materials.wall, 'Space Museum blade-wall horizontal tile courses');
  merged(west, skylights, materials.wall, 'Space Museum five flat-roof skylight monitors');
  merged(west, skylightGlass, materials.glass, 'Space Museum skylight glazing', false);
  const uplights = [];
  for (let i = 0; i < 8; i += 1) {
    const edge = i * 5 % (SPACE_MUSEUM_EAST_SITE.localRing.length / 2 - 1), j = edge * 2;
    box(uplights, [SPACE_MUSEUM_EAST_SITE.localRing[j] * .97, .12, SPACE_MUSEUM_EAST_SITE.localRing[j + 1] * .97], [.28, .22, .28]);
  }
  const uplightMaterial = new THREE.MeshStandardMaterial({ color: 0xb8c2c1, roughness: .45, metalness: .35 });
  uplightMaterial.emissiveNode = color(.65, .76, 1).mul(nightAmount()).mul(.8);
  merged(east, uplights, uplightMaterial, 'Space Museum restrained dome uplight fixtures', false);
  const entrance = buildEntrance(west, materials);

  const colliders = harbourCityRingColliders(SPACE_MUSEUM_EAST_SITE, base, base + SPACE_MUSEUM_DOME_HEIGHT, .38);
  for (let edge = 0; edge < SPACE_MUSEUM_WEST_SITE.localRing.length / 2 - 1; edge += 1) {
    if (edge === 1 || edge === 2) continue;
    const ring = SPACE_MUSEUM_WEST_SITE.localRing, i = edge * 2, x = (ring[i] + ring[i + 2]) * .5, z = (ring[i + 1] + ring[i + 3]) * .5;
    colliders.push(harbourCitySegmentCollider(SPACE_MUSEUM_WEST_SITE, edge, 0, 1, base, base + westEdgeHeightAt(edge, x, z), .34));
  }
  for (const [edge, t0, t1] of [[1, 0, .45], [2, .55, 1]]) {
    const ring = SPACE_MUSEUM_WEST_SITE.localRing, i = edge * 2, t = (t0 + t1) * .5;
    const x = ring[i] + (ring[i + 2] - ring[i]) * t, z = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t;
    colliders.push(harbourCitySegmentCollider(SPACE_MUSEUM_WEST_SITE, edge, t0, t1, base, base + westEdgeHeightAt(edge, x, z), .34));
  }
  for (const [edge, t0, t1] of [[1, .45, 1], [2, 0, .55]]) {
    const ring = SPACE_MUSEUM_WEST_SITE.localRing, i = edge * 2, t = (t0 + t1) * .5;
    const x = ring[i] + (ring[i + 2] - ring[i]) * t, z = ring[i + 1] + (ring[i + 3] - ring[i + 1]) * t;
    colliders.push(harbourCitySegmentCollider(SPACE_MUSEUM_WEST_SITE, edge, t0, t1, base + 4.45, base + westEdgeHeightAt(edge, x, z), .34));
  }
  colliders.push(harbourCityLocalCollider(SPACE_MUSEUM_WEST_SITE, -12.1, -16.1, 1.3, 2.9, base, base + SPACE_MUSEUM_EAST_BLADE_HEIGHT));
  colliders.push(harbourCityLocalCollider(SPACE_MUSEUM_WEST_SITE, -12.1, 1, 1.3, 2.9, base, base + SPACE_MUSEUM_WEST_BLADE_HEIGHT));
  scene.add(root);
  const landmark = { id: 'hong-kong-space-museum', name: '香港太空館 Hong Kong Space Museum', position: { x: SPACE_MUSEUM_EAST_SITE.x, y: base, z: SPACE_MUSEUM_EAST_SITE.z }, radius: 70, height: SPACE_MUSEUM_EAST_BLADE_HEIGHT };
  return {
    root, east, west, entrance, colliders, landmarks: [landmark], groundOffset: base,
    eastSite: SPACE_MUSEUM_EAST_SITE, westSite: SPACE_MUSEUM_WEST_SITE,
    roads: SPACE_MUSEUM_SITES.flatMap((site) => spaceMuseumRoadRecords(site)),
    stats: {
      spaceMuseumSourceWings: 2, spaceMuseumEastSourceVertices: 41, spaceMuseumWestSourceVertices: 19,
      spaceMuseumEastRingArea: SPACE_MUSEUM_EAST_SITE.ringArea, spaceMuseumWestRingArea: SPACE_MUSEUM_WEST_SITE.ringArea,
      spaceMuseumDomeHeight: SPACE_MUSEUM_DOME_HEIGHT, spaceMuseumTheatreScreenDiameter: SPACE_MUSEUM_SCREEN_DIAMETER,
      spaceMuseumOpeningYear: SPACE_MUSEUM_OPENING_YEAR, spaceMuseumWestLevels: 3, spaceMuseumRoadCrossings: 0,
    },
    groundHeightAt: (x, z, ground) => spaceMuseumTerrainHeightAt(x, z, ground, base),
  };
}
