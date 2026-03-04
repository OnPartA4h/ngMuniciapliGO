/**
 * Post-build script: Décompresse voxel.wasm.br → voxel.wasm
 * dans le dossier public/assets/godot/ (source) ET dans le dossier
 * de build dist/ si présent.
 *
 * Usage: node scripts/decompress-wasm.js
 */
const fs = require('fs');
const path = require('path');
const brotli = require('brotli');

const dirs = [
  path.resolve(__dirname, '..', 'public', 'assets', 'godot'),
  path.resolve(__dirname, '..', 'dist', 'ng-municipali-go', 'browser', 'assets', 'godot'),
];

for (const dir of dirs) {
  const brFile = path.join(dir, 'voxel.wasm.br');
  const wasmFile = path.join(dir, 'voxel.wasm');

  if (!fs.existsSync(brFile)) {
    console.log(`⏩  Skipping ${brFile} (not found)`);
    continue;
  }

  if (fs.existsSync(wasmFile)) {
    console.log(`✅  ${wasmFile} already exists, skipping.`);
    continue;
  }

  console.log(`🔧  Decompressing ${brFile} → ${wasmFile} ...`);
  const compressed = fs.readFileSync(brFile);
  const decompressed = brotli.decompress(compressed);

  if (!decompressed) {
    console.error(`❌  Failed to decompress ${brFile}`);
    process.exit(1);
  }

  fs.writeFileSync(wasmFile, Buffer.from(decompressed));
  const sizeMB = (decompressed.length / 1024 / 1024).toFixed(1);
  console.log(`✅  Done! ${wasmFile} (${sizeMB} MB)`);
}
