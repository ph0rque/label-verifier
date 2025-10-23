#!/usr/bin/env node
/* Simple Node OCR runner to avoid Next.js bundler interference */
const { createWorker, PSM, OEM } = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('NO_INPUT_IMAGE_PATH');
    process.exit(2);
  }

  const corePath = require.resolve('tesseract.js-core/tesseract-core.wasm.js');
  const langPath = process.cwd();
  const buffer = fs.readFileSync(imagePath);
  // Basic pre-processing to improve OCR accuracy
  let img = sharp(buffer).grayscale().normalize().sharpen();
  const meta = await img.metadata();
  if (meta.width && meta.width < 1200) {
    img = img.resize({ width: 1200, withoutEnlargement: false });
  }
  const preprocessed = await img.toBuffer();

  const worker = await createWorker({ corePath, langPath, logger: () => {},
    // Explicit OEM to default LSTM
    // Note: some versions ignore OEM here but we keep for completeness
    // eslint-disable-next-line no-unused-vars
    // oem: OEM.LSTM_ONLY
  });
  if (typeof worker.load === 'function') {
    await worker.load();
  }
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  if (typeof worker.setParameters === 'function') {
    await worker.setParameters({
      tessedit_pageseg_mode: String(PSM.SINGLE_BLOCK),
      preserve_interword_spaces: '1',
      user_defined_dpi: '300'
    });
  }

  const { data } = await worker.recognize(preprocessed);
  if (typeof worker.terminate === 'function') {
    await worker.terminate();
  }

  process.stdout.write(data.text || '');
}

main().catch((err) => {
  console.error('ERR', err && err.stack ? err.stack : String(err));
  process.exit(1);
});


