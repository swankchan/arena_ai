const assert = require('node:assert/strict');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { dirname, join, resolve, sep } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '..');
const vendorRoot = join(root, 'vendor', 'three');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const { imports } = JSON.parse(html.match(/<script type="importmap">([^]*?)<\/script>/)[1]);
const importPatterns = [
  /(?:^|\n)\s*(?:import|export)\s+[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
];
const specifiers = (source) => importPatterns.flatMap((pattern) =>
  [...source.matchAll(pattern)].map((match) => match[1]));

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test('vendored Three.js is licensed and covers the complete application module graph', () => {
  assert.match(readFileSync(join(vendorRoot, 'LICENSE'), 'utf8'), /The MIT License/);
  assert.match(
    readFileSync(join(vendorRoot, 'README.md'), 'utf8'),
    /f17eb5d689094a3fbd4cd0d64d54729a48036ce0/
  );

  const visited = new Set();
  function visit(specifier, parent) {
    let file;
    if (specifier.startsWith('.')) {
      file = resolve(dirname(parent), specifier);
    } else {
      const exact = imports[specifier];
      const prefix = Object.keys(imports).find((key) => key.endsWith('/') && specifier.startsWith(key));
      const mapped = exact ?? (prefix ? `${imports[prefix]}${specifier.slice(prefix.length)}` : null);
      assert.ok(mapped, `unmapped dependency: ${specifier}`);
      file = resolve(root, mapped);
    }
    assert.ok(file.startsWith(`${vendorRoot}${sep}`), `dependency escapes vendor/three: ${file}`);
    if (visited.has(file)) return;
    assert.ok(existsSync(file), `missing vendored dependency: ${file}`);
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    for (const child of specifiers(source)) {
      assert.ok(
        child.startsWith('.') || child === 'three' || child === 'three/webgpu'
          || child === 'three/tsl' || child.startsWith('three/addons/'),
        `unexpected external dependency ${child} in ${file}`
      );
      visit(child, file);
    }
  }

  visit('three/webgpu');
  visit('three/tsl');
  for (const file of walk(join(root, 'js')).filter((path) => path.endsWith('.js'))) {
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      if (specifier.startsWith('three/addons/')) visit(specifier);
    }
  }
  assert.equal(visited.size, 18, 'three builds plus every transitive addon dependency are present');
});
