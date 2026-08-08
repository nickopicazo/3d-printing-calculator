import { createWorker, PSM, type Worker } from "tesseract.js";
import {
  loadImageFromDataUrl,
  loadImageFromFile,
  preprocessSlicerImage,
} from "./preprocess";
import {
  parseSlicerResult,
  type ParsedSlicerResult,
} from "./parseSlicerResult";

export type OcrProgress = {
  status: string;
  progress: number;
};

let workerPromise: Promise<Worker> | null = null;

async function getWorker(
  onProgress?: (progress: OcrProgress) => void,
): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (!onProgress) return;
          if (typeof message.progress === "number") {
            onProgress({
              status: String(message.status ?? "recognizing"),
              progress: message.progress,
            });
          }
        },
      });
      await worker.setParameters({
        // Keep '.' available — decimals matter for grams
        tessedit_char_whitelist:
          "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.:/-mhgs ",
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      return worker;
    })();
  }
  return workerPromise;
}

export async function extractFromSlicerScreenshot(
  source: File | string,
  onProgress?: (progress: OcrProgress) => void,
): Promise<ParsedSlicerResult & { ocrText: string }> {
  onProgress?.({ status: "loading image", progress: 0.05 });
  const image =
    typeof source === "string"
      ? await loadImageFromDataUrl(source)
      : await loadImageFromFile(source);

  onProgress?.({ status: "preprocessing", progress: 0.15 });
  const canvas = await preprocessSlicerImage(image);

  onProgress?.({ status: "starting OCR", progress: 0.25 });
  const worker = await getWorker(onProgress);
  const result = await worker.recognize(canvas);
  const ocrText = result.data.text ?? "";

  const parsed = parseSlicerResult(ocrText);
  onProgress?.({ status: "done", progress: 1 });
  return { ...parsed, ocrText };
}
