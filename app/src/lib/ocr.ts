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
  // Prefer in-process recognize on platforms where child_process isn't allowed (e.g., Vercel)
  const preferInProcess = process.env.DISABLE_CHILD_OCR === "true";
  if (preferInProcess) {
    const tesseractModule = await import("tesseract.js");
    const recognize =
      (tesseractModule as { recognize?: typeof import("tesseract.js").recognize }).recognize ??
      (tesseractModule as { default?: { recognize?: typeof import("tesseract.js").recognize } }).default
        ?.recognize;

    if (!recognize) {
      throw new Error("Tesseract recognize is unavailable in the current environment");
    }

    const processedBuffer = await preprocessImage(imageBuffer);

    const { data } = await recognize(processedBuffer, "eng", {
      langPath: path.join(process.cwd(), "eng.traineddata"),
      corePath: require.resolve("tesseract.js-core/tesseract-core.wasm.js"),
      workerPath: require.resolve("tesseract.js/dist/worker.min.js"),
      workerBlobURL: false,
    });
    return data?.text ?? "";
  }

  // Default: Run OCR via external Node worker script to avoid Next.js bundler worker path issues in dev
  const tmpPath = path.join(process.cwd(), `.tmp-ocr-${Date.now()}.bin`);
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

