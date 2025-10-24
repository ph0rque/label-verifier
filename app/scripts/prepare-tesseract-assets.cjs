const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileAsset(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing Tesseract asset: ${source}`);
  }
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

function copyDirAsset(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing Tesseract asset directory: ${source}`);
  }
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const runtimeDir = path.join(projectRoot, '.tesseract-runtime');
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  ensureDir(runtimeDir);

  const assets = [
    [path.join(projectRoot, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js'],
    [path.join(projectRoot, 'node_modules', 'tesseract.js-core', 'tesseract-core.wasm.js'), 'tesseract-core.wasm.js'],
    [path.join(projectRoot, 'node_modules', 'tesseract.js-core', 'tesseract-core.wasm'), 'tesseract-core.wasm'],
    [path.join(projectRoot, 'node_modules', 'tesseract.js-core', 'tesseract-core-simd.wasm'), 'tesseract-core-simd.wasm'],
  ];

  for (const [source, filename] of assets) {
    const destination = path.join(runtimeDir, filename);
    copyFileAsset(source, destination);
  }

  const workerScriptSource = path.join(projectRoot, 'node_modules', 'tesseract.js', 'src', 'worker-script');
  const workerScriptDestination = path.join(runtimeDir, 'worker-script');
  copyDirAsset(workerScriptSource, workerScriptDestination);

  const langSource = path.join(projectRoot, 'eng.traineddata');
  if (fs.existsSync(langSource)) {
    copyFileAsset(langSource, path.join(runtimeDir, 'eng.traineddata'));
  }
}

main();
