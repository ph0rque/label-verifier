import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const OCR_ERROR_TOKEN = "OCR_EXTRACT_FAILED";

export async function extractTextFromImage(file: File, coreBaseUrl?: string): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await extractTextFromBuffer(Buffer.from(arrayBuffer), coreBaseUrl);
  } catch (error) {
    console.error("OCR extraction failed", error);
    const err = error instanceof Error ? error : new Error(String(error));
    err.name = OCR_ERROR_TOKEN;
    throw err;
  }
}

async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharpModule = await import("sharp");
    const sharp = (sharpModule as { default?: typeof import("sharp") }).default ??
      (sharpModule as unknown as typeof import("sharp"));

    let image = sharp(imageBuffer).grayscale().normalize().sharpen();
    const metadata = await image.metadata();
    if (metadata.width && metadata.width < 1200) {
      image = image.resize({ width: 1200, withoutEnlargement: false });
    }
    return await image.toBuffer();
  } catch (error) {
    console.warn("Image preprocessing skipped; falling back to raw buffer", error);
    return imageBuffer;
  }
}

export async function extractTextFromBuffer(
  imageBuffer: Buffer,
  coreBaseUrl?: string,
): Promise<string> {
  const isVercel = process.env.VERCEL === "1";
  const preferInProcess = isVercel || process.env.DISABLE_CHILD_OCR === "true";

  if (preferInProcess) {
    const { createWorker, PSM } = await import("tesseract.js");
    const sharp = await import("sharp");

    const deploymentRuntimeBases = [
      path.join(process.cwd(), "..", ".tesseract-runtime"),
      path.join(process.cwd(), "..", "..", ".tesseract-runtime"),
      path.join(process.cwd(), "..", "static", ".tesseract-runtime"),
    ];

    const existingRuntimeBase = deploymentRuntimeBases.find((base) => fs.existsSync(base));
    const runtimeBase = existingRuntimeBase ?? path.join(process.cwd(), ".tesseract-runtime");

    const workerPath = fs.existsSync(path.join(runtimeBase, "worker.min.js"))
      ? path.join(runtimeBase, "worker.min.js")
      : path.join(process.cwd(), "node_modules", "tesseract.js", "dist", "worker.min.js");
    const corePath = fs.existsSync(path.join(runtimeBase, "tesseract-core.wasm.js"))
      ? path.join(runtimeBase, "tesseract-core.wasm.js")
      : path.join(process.cwd(), "node_modules", "tesseract.js-core", "tesseract-core.wasm.js");
    const langPath = fs.existsSync(path.join(runtimeBase, "eng.traineddata"))
      ? path.join(runtimeBase, "eng.traineddata")
      : path.join(process.cwd(), "eng.traineddata");

    let img = sharp.default(imageBuffer).grayscale().normalize().sharpen();
    const meta = await img.metadata();
    if (meta.width && meta.width < 1200) {
      img = img.resize({ width: 1200, withoutEnlargement: false });
    }
    const preprocessed = await img.toBuffer();

    const worker = await createWorker({
      corePath,
      langPath,
      workerPath,
      workerBlobURL: false,
      cachePath: "/tmp",
      logger: () => {},
    });

    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300'
    });

    const { data } = await worker.recognize(preprocessed);
    await worker.terminate();

    return data.text || '';
  }

  // Default spawn logic for non-Vercel
  const tmpPath = path.join('/tmp', `.tmp-ocr-${Date.now()}.bin`);
  fs.writeFileSync(tmpPath, imageBuffer as unknown as Uint8Array);
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "ocr-worker.cjs");
    const child = spawn(process.execPath, [scriptPath, tmpPath], { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (d) => stdout.push(d));
    child.stderr.on("data", (d) => stderr.push(d));
    const exitCode: number = await new Promise((resolve) => child.on("close", resolve));
    if (exitCode !== 0) {
      throw new Error(`OCR child failed: ${Buffer.concat(stderr as unknown as Uint8Array[]).toString()}`);
    }
    return Buffer.concat(stdout as unknown as Uint8Array[]).toString();
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

