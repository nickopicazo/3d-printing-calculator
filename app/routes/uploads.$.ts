import { Readable } from "node:stream";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import type { Route } from "./+types/uploads.$";
import { requireUser } from "~/lib/session.server";
import { resolveUploadPath, uploadRoot } from "~/lib/storage.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);
  const relative = params["*"];
  if (!relative) {
    throw new Response("Not found", { status: 404 });
  }

  const fullPath = resolveUploadPath(relative);
  const root = uploadRoot();
  if (!fullPath.startsWith(root + path.sep) && fullPath !== root) {
    throw new Response("Forbidden", { status: 403 });
  }

  try {
    await access(fullPath);
  } catch {
    throw new Response("Not found", { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : "application/octet-stream";

  const nodeStream = createReadStream(fullPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
