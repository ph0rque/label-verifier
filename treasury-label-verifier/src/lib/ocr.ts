import { createWorker } from "tesseract.js";

const OCR_ERROR_TOKEN = "OCR_EXTRACT_FAILED";

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker({ logger: () => {} });
    await workerPromise.load();
    await workerPromise.loadLanguage("eng");
    await workerPromise.initialize("eng");
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
