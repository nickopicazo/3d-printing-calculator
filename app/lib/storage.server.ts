import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function uploadRoot(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export async function savePlateImage(args: {
  quoteId: string;
  plateIndex: number;
  bytes: Buffer;
}): Promise<string> {
  const dir = path.join(uploadRoot(), args.quoteId);
  await mkdir(dir, { recursive: true });
  const filename = `plate_${args.plateIndex}.png`;
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, args.bytes);
  return `${args.quoteId}/${filename}`;
}

export function resolveUploadPath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(uploadRoot(), normalized);
}
