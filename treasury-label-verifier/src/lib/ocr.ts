import path from "path";
import fs from "fs";

const OCR_ERROR_TOKEN = "OCR_EXTRACT_FAILED";

// Defer requiring tesseract.js until runtime to avoid bundler worker rewriting
let workerPromise: any | null = null;

async function getWorker() {
  if (!workerPromise) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createWorker } = require("tesseract.js") as { createWorker: (opts: any) => Promise<any> | any };
    const cwd = process.cwd();
    const workerPath = path.resolve(cwd, "node_modules/tesseract.js/dist/worker.min.js");
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
    const worker = await getWorker();
    const arrayBuffer = await file.arrayBuffer();
    const { data } = await worker.recognize(Buffer.from(arrayBuffer));
    return data.text ?? "";
  } catch (error) {
    console.error("OCR extraction failed", error);
    workerPromise = null; // allow reinitialization on next try
    const err = error instanceof Error ? error : new Error(String(error));
    err.name = OCR_ERROR_TOKEN;
    throw err;
  }
}
