import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const OCR_ERROR_TOKEN = "OCR_EXTRACT_FAILED";
const REMOTE_CORE_DIR = "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0";

export async function extractTextFromImage(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await extractTextFromBuffer(Buffer.from(arrayBuffer));
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

function resolveLanguageDataPath(): string {
  const cwd = process.cwd();
  const hasLocalData = ["eng.traineddata", "eng.traineddata.gz"].some((filename) =>
    fs.existsSync(path.join(cwd, filename)),
  );
  return hasLocalData ? cwd : "https://tessdata.projectnaptha.com/4.0.0";
}

function resolveCoreScriptPath(): string {
  if (process.env.TESSERACT_LOCAL_CORE === "1") {
    try {
      return require.resolve("tesseract.js-core/tesseract-core.wasm.js");
    } catch (error) {
      console.warn("Unable to resolve local core wasm", error);
    }
  }

  if (process.env.VERCEL === "1" || process.env.USE_REMOTE_TESSERACT === "true") {
    return `${REMOTE_CORE_DIR}/tesseract-core-simd.wasm.js`;
  }

  try {
    return require.resolve("tesseract.js-core/tesseract-core-simd.wasm.js");
  } catch (error) {
    try {
      return require.resolve("tesseract.js-core/tesseract-core.wasm.js");
    } catch (fallbackError) {
      console.warn("Failed to resolve local tesseract core script", error, fallbackError);
      return `${REMOTE_CORE_DIR}/tesseract-core-simd.wasm.js`;
    }
  }
}

export async function extractTextFromBuffer(imageBuffer: Buffer): Promise<string> {
  // Prefer in-process recognize on platforms where child_process isn't allowed (e.g., Vercel)
  const preferInProcess = process.env.VERCEL === "1" || process.env.DISABLE_CHILD_OCR === "true";
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
      cacheMethod: "fetch",
      corePath: REMOTE_CORE_DIR,
    });
    return data?.text ?? "";
  }

  // Default: Run OCR via external Node worker script to avoid Next.js bundler worker path issues in dev
  const tmpPath = path.join(process.cwd(), `.tmp-ocr-${Date.now()}.bin`);
  fs.writeFileSync(tmpPath, imageBuffer);
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "ocr-worker.cjs");
    const child = spawn(process.execPath, [scriptPath, tmpPath], { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (d) => stdout.push(d));
    child.stderr.on("data", (d) => stderr.push(d));
    const exitCode: number = await new Promise((resolve) => child.on("close", resolve));
    if (exitCode !== 0) {
      throw new Error(`OCR child failed: ${Buffer.concat(stderr).toString()}`);
    }
    return Buffer.concat(stdout).toString();
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

