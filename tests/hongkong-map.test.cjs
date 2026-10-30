const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

let GEO;
let meta;
let hongKongFitZoom;
test.before(async () => {
  ({ GEO } = await import('../js/hk-geodata.js'));
  meta = await import('../js/cities/hongkong/meta.js');
  ({ hongKongFitZoom } = await import('../js/cities/hongkong/map.js'));
});

test('Hong Kong full-map fit uses the available wide and portrait viewports', () => {
  const depth = GEO.bounds.maxZ - GEO.bounds.minZ;
  const width = GEO.bounds.maxX - GEO.bounds.minX;
  const wideZoom = hongKongFitZoom(GEO.bounds, 1568, 756);
  assert.ok(wideZoom * depth / 756 > 0.96, 'the wide-screen fit uses over 96% of the canvas height');
  const portraitZoom = hongKongFitZoom(GEO.bounds, 390, 844);
  assert.ok(portraitZoom * width / 390 > 0.97, 'the portrait fit uses over 97% of the canvas width');
  assert.ok(wideZoom > Math.min(
    1568 / (width * 1.08),
    756 / (depth * 1.1)
  ), 'the tighter fit is larger than the previous padded fit');
});

test('Hong Kong opens on the fitted atlas and prevents tiny manual zoom-outs', () => {
  const source = readFileSync(join(__dirname, '../js/cities/hongkong/map.js'), 'utf8');
  assert.match(source, /this\.resizeFullCanvas\(\);\s*this\.fitAll\(\);\s*this\.renderFullMap\(\)/);
  assert.match(source, /minimumFullZoom\(\)/);
  assert.match(source, /this\.fitZoom\(\) \* 0\.85/);
  assert.match(source, /Math\.max\(this\.minimumFullZoom\(\), this\.viewZoom \/ 1\.45\)/);
  assert.match(source, /Math\.max\(this\.minimumFullZoom\(\), Math\.min\(MAX_FULL_ZOOM, this\.viewZoom \* factor\)\)/);
});

test('Hong Kong road teleports reject water nodes and keep generated spawns on land', () => {
  const click = { x: -3042.4, z: -4389.4 }; // Container Port Road South node at the clipped coast.
  const unfiltered = meta.nearestRoadNode(click.x, click.z);
  assert.equal(unfiltered.id, 7025);
  assert.equal(meta.isLand(unfiltered.x, unfiltered.z), false, 'the regression fixture is really off land');
  const safe = meta.nearestRoadNode(click.x, click.z, { landOnly: true });
  assert.ok(safe && meta.isLand(safe.x, safe.z), 'land-only lookup selects a rendered road node');
  assert.notEqual(safe.id, unfiltered.id);

  const mountParker = meta.spawnOnRoad(5285, 27, { minWidth: 8 });
  assert.ok(meta.isLand(mountParker.x, mountParker.z), 'lane offset cannot move a spawn beyond the coast');
  for (const point of meta.TELEPORTS) assert.ok(meta.isLand(point.x, point.z), `${point.id} is on land`);
  for (const [mode, point] of Object.entries(meta.SPAWN)) {
    if (mode !== 'helicopter') assert.ok(meta.isLand(point.x, point.z), `${mode} spawn is on land`);
  }
});

function graphPoints(index) {
  const graph = GEO.roadGraph;
  const link = graph.links[index];
  const points = [[graph.nodes[link[0] * 2], graph.nodes[link[0] * 2 + 1]]];
  for (let i = 0; i + 1 < link[6].length; i += 2) points.push([link[6][i], link[6][i + 1]]);
  points.push([graph.nodes[link[1] * 2], graph.nodes[link[1] * 2 + 1]]);
  return { link, points };
}

test('Hong Kong traffic rejects coastal runoff without removing ordinary major roads', () => {
  const container = graphPoints(2296);
  assert.equal(GEO.roadGraph.names[container.link[2]], '貨櫃碼頭南路');
  assert.equal(meta.isTrafficPathOnLand(container.points, container.link[3]), false);
  const nathan = graphPoints(1268);
  assert.equal(GEO.roadGraph.names[nathan.link[2]], '彌敦道');
  assert.equal(meta.isTrafficPathOnLand(nathan.points, nathan.link[3]), true);

  const trafficSource = readFileSync(join(__dirname, '../js/cities/hongkong/traffic.js'), 'utf8');
  assert.match(trafficSource, /if \(!onLand\[i\]\) continue;/, 'route transitions use the same land filter');
  assert.match(trafficSource, /if \(onLand\[i\] && graph\[i\]\[3\] >= 7\.4 && total\[i\] >= 100\)/, 'initial placement and restaging use the land filter');
});
