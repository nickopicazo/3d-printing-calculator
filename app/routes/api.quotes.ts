import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/api.quotes";
import { db } from "~/db/index.server";
import {
  clients,
  projects,
  quoteFilamentLines,
  quotePlates,
  quotes,
} from "~/db/schema";
import { calculateQuote, type FilamentLine } from "~/lib/pricing";
import { newId, requireUser } from "~/lib/session.server";
import type { AppSettings } from "~/lib/settings";
import { savePlateImage } from "~/lib/storage.server";

type PlatePayload = {
  plateIndex: number;
  sliced: boolean;
  printMinutes: number | null;
  imageDataUrl: string | null;
  metadata: Record<string, unknown>;
  filaments?: Array<{
    label: string;
    grams: number;
    slot?: number | null;
    type?: string | null;
    color?: string | null;
  }>;
};

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  if (request.method !== "POST") {
    throw data({ error: "Method not allowed" }, { status: 405 });
  }

  const body = (await request.json()) as {
    title?: string;
    clientMode?: "existing" | "new";
    clientId?: string | null;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    projectMode?: "none" | "existing" | "new";
    projectId?: string | null;
    projectName?: string;
    sourceName?: string | null;
    settings?: AppSettings;
    filaments?: FilamentLine[];
    printMinutes?: number;
    plates?: PlatePayload[];
    metadataSnapshot?: Record<string, unknown>;
  };

  const title = (body.title ?? "").trim();
  if (!title) throw data({ error: "Title is required." }, { status: 400 });

  const filamentLines = body.filaments ?? [];
  const printMinutes = Number(body.printMinutes) || 0;
  const settings = body.settings;
  if (!settings) throw data({ error: "Settings required." }, { status: 400 });

  const breakdown = calculateQuote({
    filaments: filamentLines,
    printMinutes,
    machineRatePerHour: settings.machineRatePerHour,
    markupPercent: settings.markupPercent,
  });

  let clientId: string | null = body.clientId ?? null;
  if (body.clientMode === "new") {
    const name = (body.clientName ?? "").trim();
    if (!name) throw data({ error: "Client name is required." }, { status: 400 });
    clientId = newId();
    await db.insert(clients).values({
      id: clientId,
      userId: session.user.id,
      name,
      email: (body.clientEmail ?? "").trim() || null,
      phone: (body.clientPhone ?? "").trim() || null,
    });
  } else if (clientId) {
    const [owned] = await db
      .select()
      .from(clients)
      .where(
        and(eq(clients.id, clientId), eq(clients.userId, session.user.id)),
      )
      .limit(1);
    if (!owned) throw data({ error: "Client not found." }, { status: 400 });
  }

  let projectId: string | null = null;
  if (body.projectMode === "existing" && body.projectId && clientId) {
    const [owned] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, body.projectId),
          eq(projects.userId, session.user.id),
          eq(projects.clientId, clientId),
        ),
      )
      .limit(1);
    if (!owned) throw data({ error: "Project not found." }, { status: 400 });
    projectId = owned.id;
  } else if (body.projectMode === "new" && clientId) {
    const name = (body.projectName ?? "").trim();
    if (name) {
      projectId = newId();
      await db.insert(projects).values({
        id: projectId,
        userId: session.user.id,
        clientId,
        name,
      });
    }
  }

  const quoteId = newId();
  await db.insert(quotes).values({
    id: quoteId,
    userId: session.user.id,
    clientId,
    projectId,
    title,
    sourceName: body.sourceName ?? null,
    printMinutes,
    materialCost: breakdown.materialCost,
    machineCost: breakdown.machineCost,
    subtotal: breakdown.subtotal,
    markupAmount: breakdown.markupAmount,
    total: breakdown.total,
    settingsSnapshot: settings,
    metadataSnapshot: body.metadataSnapshot ?? {},
  });

  const plates = body.plates ?? [];
  const plateIdByIndex = new Map<number, string>();

  for (const plate of plates) {
    const plateId = newId();
    plateIdByIndex.set(plate.plateIndex, plateId);
    let imagePath: string | null = null;
    if (plate.imageDataUrl?.startsWith("data:image/")) {
      const base64 = plate.imageDataUrl.split(",")[1];
      if (base64) {
        imagePath = await savePlateImage({
          quoteId,
          plateIndex: plate.plateIndex,
          bytes: Buffer.from(base64, "base64"),
        });
      }
    }
    await db.insert(quotePlates).values({
      id: plateId,
      quoteId,
      plateIndex: plate.plateIndex,
      imagePath,
      printMinutes: plate.printMinutes,
      sliced: plate.sliced,
      metadata: plate.metadata ?? {},
    });
  }

  for (let i = 0; i < filamentLines.length; i++) {
    const line = filamentLines[i]!;
    await db.insert(quoteFilamentLines).values({
      id: newId(),
      quoteId,
      plateId: null,
      inventoryFilamentId: line.inventoryFilamentId ?? null,
      label: line.label,
      grams: line.grams,
      pricePerKg: line.pricePerKg,
      slot: line.slot ?? null,
      type: line.type ?? null,
      color: line.color ?? null,
      sortOrder: i,
    });
  }

  return data({ id: quoteId, ok: true as const });
}

export async function loader() {
  throw data({ error: "Method not allowed" }, { status: 405 });
}
