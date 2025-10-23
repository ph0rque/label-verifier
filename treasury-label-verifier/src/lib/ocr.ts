import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const OCR_ERROR_TOKEN = "OCR_EXTRACT_FAILED";

// Defer requiring tesseract.js until runtime to avoid bundler worker rewriting
let workerPromise: any | null = null;

async function getWorker() {
  if (!workerPromise) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createWorker } = require("tesseract.js") as { createWorker: (opts: any) => Promise<any> | any };
    const cwd = process.cwd();
    // Use the Node worker entry, not the browser worker
    const workerPath = require.resolve("tesseract.js/src/worker/node/index.js");
    const corePath = path.resolve(cwd, "node_modules/tesseract.js-core/tesseract-core.wasm.js");
    const localEng = fs.existsSync(path.resolve(cwd, "eng.traineddata")) || fs.existsSync(path.resolve(cwd, "eng.traineddata.gz"));
    const langPath = localEng ? cwd : "https://tessdata.projectnaptha.com/4.0.0";

    const worker = await createWorker({
      logger: () => {},
      workerPath,
      corePath,
      langPath,
    });

    if (typeof worker.load === "function") {
      await worker.load();
    }
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    workerPromise = worker;
  }
  return workerPromise;
}

export async function extractTextFromImage(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await extractTextFromBuffer(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("OCR extraction failed", error);
    workerPromise = null; // allow reinitialization on next try
    const err = error instanceof Error ? error : new Error(String(error));
    err.name = OCR_ERROR_TOKEN;
    throw err;
  }
}

export async function extractTextFromBuffer(imageBuffer: Buffer): Promise<string> {
  // Run OCR via external Node worker script to avoid Next.js worker path issues in dev
  const tmpPath = path.join(process.cwd(), `.tmp-ocr-${Date.now()}.bin`);
  fs.writeFileSync(tmpPath, imageBuffer);
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "ocr-worker.cjs");
    const child = spawn(process.execPath, [scriptPath, tmpPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
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
