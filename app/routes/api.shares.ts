import { data } from "react-router";
import type { Route } from "./+types/api.shares";
import { db } from "~/db/index.server";
import { shares } from "~/db/schema";
import { createId } from "~/lib/pricing";
import { createSharePayload } from "~/lib/landing-preset";
import type { ProjectDraft } from "~/lib/calculator-types";
import type { AppSettings } from "~/lib/settings";

const MAX_BODY_BYTES = 120_000;
const SHARE_TTL_DAYS = 90;

function shortCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    throw data({ error: "Method not allowed" }, { status: 405 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw data({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw data({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as {
    settings?: Partial<AppSettings>;
    project?: ProjectDraft;
  };

  if (!raw?.settings || !raw?.project || !Array.isArray(raw.project.prints)) {
    throw data({ error: "settings and project.prints are required" }, { status: 400 });
  }

  if (raw.project.prints.length > 20) {
    throw data({ error: "Too many prints" }, { status: 400 });
  }

  const payload = createSharePayload(
    raw.settings as AppSettings,
    raw.project,
  );

  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_BODY_BYTES) {
    throw data({ error: "Payload too large" }, { status: 413 });
  }

  const origin = new URL(request.url).origin;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SHARE_TTL_DAYS);

  try {
    let code = shortCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await db.insert(shares).values({
          id: createId("share"),
          code,
          payload,
          expiresAt,
        });
        break;
      } catch {
        code = shortCode();
        if (attempt === 4) throw new Error("Could not allocate share code");
      }
    }

    return data({
      code,
      url: `${origin}/c/${code}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.warn("Share create failed:", error);
    throw data(
      { error: "Could not create share. Database may be unavailable." },
      { status: 503 },
    );
  }
}

export async function loader() {
  throw data({ error: "Method not allowed" }, { status: 405 });
}
