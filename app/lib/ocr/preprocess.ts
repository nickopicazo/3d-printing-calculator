/**
 * Preprocess a dark slicer screenshot for OCR:
 * upscale → invert → grayscale → contrast stretch → soft threshold.
 */
export async function preprocessSlicerImage(
  source: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
  const width =
    "naturalWidth" in source
      ? source.naturalWidth || source.width
      : source.width;
  const height =
    "naturalHeight" in source
      ? source.naturalHeight || source.height
      : source.height;

  const canvas = document.createElement("canvas");
  // Dark UI decimals are tiny — upscale aggressively for Tesseract
  const scale = width < 1200 ? 3 : width < 1800 ? 2 : 1.5;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not get canvas context for OCR preprocessing.");
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  const gray = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    gray[j] = 255 - (0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Percentile-based stretch (ignore extreme 2%)
  const sample: number[] = [];
  const step = Math.max(1, Math.floor(gray.length / 5000));
  for (let i = 0; i < gray.length; i += step) sample.push(gray[i]!);
  sample.sort((a, b) => a - b);
  const p2 = sample[Math.floor(sample.length * 0.02)] ?? 0;
  const p98 = sample[Math.floor(sample.length * 0.98)] ?? 255;
  const range = Math.max(1, p98 - p2);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    let stretched = ((gray[j]! - p2) / range) * 255;
    stretched = Math.min(255, Math.max(0, stretched));
    // Mild contrast boost — hard binary threshold destroys decimal points
    const boosted = Math.min(255, Math.max(0, (stretched - 128) * 1.35 + 128));
    const value = boosted;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
    img.src = url;
  });
}

export function loadImageFromDataUrl(
  dataUrl: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load pasted image."));
    img.src = dataUrl;
  });
}
