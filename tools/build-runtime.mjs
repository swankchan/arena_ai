import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outfile = 'js/app.runtime.js';
const manifestFile = 'js/app.runtime.manifest.json';
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const { imports } = JSON.parse(html.match(/<script type="importmap">([^]*?)<\/script>/)[1]);

const importMapPlugin = {
  name: 'browser-import-map',
  setup(api) {
    api.onResolve({ filter: /^three(?:\/|$)/ }, (args) => {
      let mapped = imports[args.path];
      if (!mapped && args.path.startsWith('three/addons/')) {
        mapped = `${imports['three/addons/']}${args.path.slice('three/addons/'.length)}`;
      }
      return mapped ? { path: resolve(root, mapped) } : null;
    });
  }
};

const result = await build({
  absWorkingDir: root,
  entryPoints: ['js/app.js'],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
  legalComments: 'eof',
  metafile: true,
  plugins: [importMapPlugin]
});

const runtimeInputs = Object.keys(result.metafile.inputs)
  .map((path) => relative(root, resolve(root, path)).replaceAll('\\', '/'));
const inputs = ['index.html', 'package.json', 'tools/build-runtime.mjs', ...runtimeInputs].sort();
const hashInputs = createHash('sha256');
for (const path of inputs) {
  hashInputs.update(path);
  hashInputs.update('\0');
  hashInputs.update(readFileSync(resolve(root, path)));
  hashInputs.update('\0');
}
const bundle = readFileSync(resolve(root, outfile));
const outputMeta = result.metafile.outputs[outfile];
const manifest = {
  entry: 'js/app.js',
  bundle: outfile,
  builder: `esbuild ${result.metafile.version ?? '0.28.2'}`,
  sourceHash: hashInputs.digest('hex'),
  bundleHash: createHash('sha256').update(bundle).digest('hex'),
  bundleBytes: bundle.length,
  externalImports: outputMeta.imports.filter((entry) => entry.external),
  inputs
};
writeFileSync(resolve(root, manifestFile), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${outfile} (${bundle.length} bytes) from ${runtimeInputs.length} modules; no runtime module graph required.`);
