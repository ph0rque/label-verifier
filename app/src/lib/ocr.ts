import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const OCR_ERROR_TOKEN = "OCR_EXTRACT_FAILED";
const REMOTE_CORE_BASE = "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0";
const LOCAL_WORKER_PATH = (() => {
  try {
    return require.resolve("tesseract.js/dist/worker.min.js");
  } catch (error) {
    console.warn("Unable to resolve local tesseract worker script", error);
    return undefined;
  }
})();

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
  if (process.env.VERCEL === "1" || process.env.USE_REMOTE_TESSERACT === "true") {
    return `${REMOTE_CORE_BASE}/tesseract-core-simd.wasm.js`;
  }

  try {
    return require.resolve("tesseract.js-core/tesseract-core-simd.wasm.js");
  } catch (error) {
    try {
      return require.resolve("tesseract.js-core/tesseract-core.wasm.js");
    } catch (fallbackError) {
      console.warn("Failed to resolve local tesseract core script", error, fallbackError);
      return `${REMOTE_CORE_BASE}/tesseract-core-simd.wasm.js`;
    }
  }
}

export async function extractTextFromBuffer(imageBuffer: Buffer): Promise<string> {
  // Prefer in-process recognize on platforms where child_process isn't allowed (e.g., Vercel)
  const preferInProcess = process.env.VERCEL === "1" || process.env.DISABLE_CHILD_OCR === "true";
  if (preferInProcess) {
    const tesseractModule = await import("tesseract.js");
    const createWorker =
      (tesseractModule as { createWorker?: typeof import("tesseract.js").createWorker }).createWorker ??
      (tesseractModule as { default?: { createWorker?: typeof import("tesseract.js").createWorker } }).default
        ?.createWorker;
    const PSM =
      (tesseractModule as { PSM?: typeof import("tesseract.js").PSM }).PSM ??
      (tesseractModule as { default?: { PSM?: typeof import("tesseract.js").PSM } }).default?.PSM;

    if (!createWorker) {
      throw new Error("Tesseract createWorker is unavailable in the current environment");
    }
    const corePath = resolveCoreScriptPath();
    const langPath = resolveLanguageDataPath();
    const processedBuffer = await preprocessImage(imageBuffer);

    const workerOptions: Record<string, unknown> = {
      corePath,
      langPath,
      logger: () => {},
      cacheMethod: "none",
    };

    if (LOCAL_WORKER_PATH) {
      workerOptions.workerPath = LOCAL_WORKER_PATH;
    }

    if (corePath.startsWith("http")) {
      workerOptions.cachePath = "";
      workerOptions.cacheMethod = "fetch";
      workerOptions.langPath = REMOTE_CORE_BASE;
      (workerOptions as Record<string, unknown>).workerBlobURL = false;
      (workerOptions as { locateFile?: (path: string, prefix?: string) => string }).locateFile = (file) => {
        if (file.endsWith(".wasm")) {
          return `${REMOTE_CORE_BASE}/${file}`;
        }
        return `${REMOTE_CORE_BASE}/${file}`;
      };
    }

    const worker = await createWorker(workerOptions as any);
    try {
      if (typeof worker.load === "function") {
        await worker.load();
      }
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      if (typeof worker.setParameters === "function" && PSM?.SINGLE_BLOCK !== undefined) {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          preserve_interword_spaces: "1",
          user_defined_dpi: "300",
        });
      }
      const { data } = await worker.recognize(processedBuffer);
      return data?.text ?? "";
    } finally {
      if (typeof worker.terminate === "function") {
        await worker.terminate();
      }
    }
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

