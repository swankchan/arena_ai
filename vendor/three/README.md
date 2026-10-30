# Vendored Three.js runtime

These files are unmodified copies from [`mrdoob/three.js`](https://github.com/mrdoob/three.js) at commit **`f17eb5d689094a3fbd4cd0d64d54729a48036ce0`** (`0.186.0` development build, 2026-10-27).

The import map in `index.html` uses this directory instead of a CDN, and `tools/build-runtime.mjs` uses the same mappings when producing the self-contained city runtime. Only the three required build files and the addon modules reachable from Slop Cities' imports are included. The upstream MIT license is preserved in `LICENSE`.

When updating Three.js, replace the build files and the complete addon dependency closure from the **same** upstream commit. Do not mix files from different versions, and run the complete unit and browser checks afterward.
