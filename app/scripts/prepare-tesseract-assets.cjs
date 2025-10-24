const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyAsset(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing Tesseract asset: ${source}`);
  }
  fs.copyFileSync(source, destination);
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const runtimeDir = path.join(projectRoot, '.tesseract-runtime');
  ensureDir(runtimeDir);

  const assets = [
    [path.join(projectRoot, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js'],
    [path.join(projectRoot, 'node_modules', 'tesseract.js-core', 'tesseract-core.wasm.js'), 'tesseract-core.wasm.js'],
    [path.join(projectRoot, 'node_modules', 'tesseract.js-core', 'tesseract-core.wasm'), 'tesseract-core.wasm'],
    [path.join(projectRoot, 'node_modules', 'tesseract.js-core', 'tesseract-core-simd.wasm'), 'tesseract-core-simd.wasm'],
  ];

  for (const [source, filename] of assets) {
    const destination = path.join(runtimeDir, filename);
    copyAsset(source, destination);
  }

  // Copy eng trained data alongside runtime assets for consistency
  const langSource = path.join(projectRoot, 'eng.traineddata');
  if (fs.existsSync(langSource)) {
    copyAsset(langSource, path.join(runtimeDir, 'eng.traineddata'));
  }
}

main();
