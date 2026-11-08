// Bundle the actual game model while replacing unrelated city-wide data dependencies.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const arch = readFileSync('js/cities/hongkong/harbour-city-architecture.js', 'utf8');
function section(start, end) {
  const a = arch.indexOf(start), b = arch.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Cannot extract shared geometry: ${start}`);
  return arch.slice(a, b);
}
const geometry = [
  section('export function flatRingArea', 'const worldRing'),
  section('export function harbourCityLocalToWorld', 'function makeSite'),
  section('export function harbourCityEdgeOutward', 'export function harbourCityEdgeFrame'),
  section('export function harbourCityLocalCollider', 'export function harbourCityRingColliders'),
].join('\n');
const plugin = {name:'isolated-wanchai', setup(b) {
  b.onResolve({filter:/\/harbour-city-architecture\.js$/}, () => ({path:'arch',namespace:'isolated'}));
  b.onResolve({filter:/\/terrain\.js$/}, () => ({path:'terrain',namespace:'isolated'}));
  b.onLoad({filter:/.*/,namespace:'isolated'}, ({path}) => ({contents:path === 'terrain'
    ? 'export const hongKongTerrainHeight = () => 5;'
    : geometry + `\n// These unrelated road operations must never be used by the isolated model.\nconst unavailable = () => { throw new Error('Road data is not available in the isolated export'); };\nexport const harbourCityRoadRecords=unavailable, harbourCityPointInRoadCorridor=unavailable, harbourCityPodiumBayConflict=unavailable, harbourCityRoadConflictAtLocal=unavailable;\nexport const HARBOUR_CITY_ROAD_LINTEL_DEPTH=0, HARBOUR_CITY_PODIUM_BAY_WIDTH=0;`, loader:'js'}));
}};
const result = await build({entryPoints:['js/exports/wanchai-export.js'],outfile:'js/exports/wanchai-export.runtime.js',bundle:true,format:'esm',platform:'browser',target:'es2022',external:['three','three/*'],plugins:[plugin],metafile:true, minifyWhitespace:true,legalComments:'eof'});
const inputs = Object.keys(result.metafile.inputs);
if (inputs.some(p => /hk-full-roads|terrain-data|hongkong\/terrain\.js|harbour-city-architecture\.js/.test(p))) throw new Error('Unexpected full city dependency');
console.log(`Isolated export: ${inputs.length} modules, no city roads or terrain`);
