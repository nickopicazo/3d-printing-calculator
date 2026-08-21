import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function uploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
}

export async function savePlateImage(args: {
  ownerId: string;
  plateIndex: number;
  bytes: Buffer;
}): Promise<string> {
  const dir = path.join(uploadRoot(), args.ownerId);
  await mkdir(dir, { recursive: true });
  const filename = `plate_${args.plateIndex}.png`;
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, args.bytes);
  return `${args.ownerId}/${filename}`;
}

export function resolveUploadPath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  // join (not resolve) so an absolute-looking relativePath cannot escape the root
  return path.resolve(path.join(uploadRoot(), normalized));
}
