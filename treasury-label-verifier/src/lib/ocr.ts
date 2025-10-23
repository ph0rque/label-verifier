import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const OCR_ERROR_TOKEN = "OCR_EXTRACT_FAILED";

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

export async function extractTextFromBuffer(imageBuffer: Buffer): Promise<string> {
  // Prefer in-process recognize on platforms where child_process isn't allowed (e.g., Vercel)
  const preferInProcess = process.env.VERCEL === "1" || process.env.DISABLE_CHILD_OCR === "true";
  if (preferInProcess) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { recognize } = require("tesseract.js") as { recognize: Function };
    const corePath = require.resolve("tesseract.js-core/tesseract-core.wasm.js");
    const langPath = fs.existsSync(path.join(process.cwd(), "eng.traineddata")) || fs.existsSync(path.join(process.cwd(), "eng.traineddata.gz"))
      ? process.cwd()
      : "https://tessdata.projectnaptha.com/4.0.0";
    const { data } = await recognize(imageBuffer, "eng", { corePath, langPath });
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
