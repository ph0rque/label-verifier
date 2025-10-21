import { createWorker } from "tesseract.js";

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker();
    await workerPromise.load();
    await workerPromise.loadLanguage("eng");
    await workerPromise.initialize("eng");
  }
  return workerPromise;
}

export async function extractTextFromImage(file: File): Promise<string> {
  const worker = await getWorker();
  const arrayBuffer = await file.arrayBuffer();
  const { data } = await worker.recognize(Buffer.from(arrayBuffer));
  return data.text ?? "";
}
