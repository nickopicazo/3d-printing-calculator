import { and, asc, eq, inArray } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/api.projects";
import { db } from "~/db/index.server";
import {
  customers,
  printAddons,
  printMaterials,
  printPlates,
  prints,
  projects,
} from "~/db/schema";
import { dataUrlToBuffer } from "~/lib/calculator-types";
import {
  calculatePrint,
  withFixedServiceFee,
  type AddonLine,
  type MaterialLine,
  type Technology,
} from "~/lib/pricing";
import { normalizeSettings, type AppSettings } from "~/lib/settings";
import { newId, requireUser } from "~/lib/session.server";
import { savePlateImage } from "~/lib/storage.server";

type PlatePayload = {
  plateIndex: number;
  sliced: boolean;
  printMinutes: number | null;
  imageDataUrl: string | null;
  metadata: Record<string, unknown>;
};

type MaterialPayload = {
  id?: string;
  label: string;
  unit: "g" | "ml";
  quantity: number;
  pricePerUnit: number;
  inventoryMaterialId?: string | null;
  slot?: number | null;
  type?: string | null;
  color?: string | null;
};

type AddonPayload = {
  id?: string;
  name: string;
  quantity: number;
  unitCost: number;
};

type PrintPayload = {
  id?: string;
  name: string;
  technology: Technology;
  printerName?: string | null;
  sourceName?: string | null;
  printMinutes: number;
  laborMinutes: number;
  postProcessMinutes?: number;
  addons?: AddonPayload[];
  materials: MaterialPayload[];
  plates?: PlatePayload[];
  metadataSnapshot?: Record<string, unknown> | null;
};

async function loadProjectBundle(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project) return null;

  const printRows = await db
    .select()
    .from(prints)
    .where(eq(prints.projectId, projectId))
    .orderBy(asc(prints.sortOrder));

  const printIds = printRows.map((p) => p.id);
  const materialRows =
    printIds.length > 0
      ? await db
          .select()
          .from(printMaterials)
          .where(inArray(printMaterials.printId, printIds))
          .orderBy(asc(printMaterials.sortOrder))
      : [];
  const addonRows =
    printIds.length > 0
      ? await db
          .select()
          .from(printAddons)
          .where(inArray(printAddons.printId, printIds))
          .orderBy(asc(printAddons.sortOrder))
      : [];
  const plateRows =
    printIds.length > 0
      ? await db
          .select()
          .from(printPlates)
          .where(inArray(printPlates.printId, printIds))
      : [];

  return {
    project,
    prints: printRows.map((p) => ({
      ...p,
      materials: materialRows.filter((m) => m.printId === p.id),
      addons: addonRows.filter((a) => a.printId === p.id),
      plates: plateRows.filter((pl) => pl.printId === p.id),
    })),
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const url = new URL(request.url);
  const projectId = url.searchParams.get("id");

  if (projectId) {
    const bundle = await loadProjectBundle(projectId, session.user.id);
    if (!bundle) throw data({ error: "Project not found." }, { status: 404 });
    return data(bundle);
  }

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(asc(projects.name));

  return data({ projects: rows });
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const method = request.method.toUpperCase();

  if (method === "DELETE") {
    const body = (await request.json()) as { id?: string };
    if (!body.id) throw data({ error: "id required" }, { status: 400 });
    const [owned] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, body.id), eq(projects.userId, session.user.id)),
      )
      .limit(1);
    if (!owned) throw data({ error: "Not found" }, { status: 404 });
    await db.delete(projects).where(eq(projects.id, body.id));
    return data({ ok: true });
  }

  if (method !== "POST" && method !== "PUT") {
    throw data({ error: "Method not allowed" }, { status: 405 });
  }

  const body = (await request.json()) as {
    id?: string | null;
    name?: string;
    customerId?: string | null;
    customer?: {
      id?: string | null;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    settings?: AppSettings;
    prints?: PrintPayload[];
  };

  const name = (body.name ?? "").trim();
  if (!name) {
    throw data({ error: "Project name is required." }, { status: 400 });
  }
  const settings = normalizeSettings(body.settings);
  const printPayloads = body.prints ?? [];
  if (printPayloads.length === 0) {
    throw data({ error: "At least one print is required." }, { status: 400 });
  }
  for (let i = 0; i < printPayloads.length; i++) {
    if (!(printPayloads[i]?.name ?? "").trim()) {
      throw data(
        { error: `Print ${i + 1} needs a name.` },
        { status: 400 },
      );
    }
  }
  if (body.customer?.email?.trim()) {
    const email = body.customer.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw data(
        { error: "Enter a valid customer email address." },
        { status: 400 },
      );
    }
  }

  let customerId: string | null = body.customerId ?? null;
  if (body.customer?.name?.trim()) {
    const c = body.customer;
    const cName = c.name!.trim();
    if (c.id) {
      const [owned] = await db
        .select()
        .from(customers)
        .where(
          and(eq(customers.id, c.id), eq(customers.userId, session.user.id)),
        )
        .limit(1);
      if (owned) {
        await db
          .update(customers)
          .set({
            name: cName,
            email: (c.email ?? "").trim() || null,
            phone: (c.phone ?? "").trim() || null,
            address: (c.address ?? "").trim() || null,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, c.id));
        customerId = c.id;
      }
    } else {
      customerId = newId();
      await db.insert(customers).values({
        id: customerId,
        userId: session.user.id,
        name: cName,
        email: (c.email ?? "").trim() || null,
        phone: (c.phone ?? "").trim() || null,
        address: (c.address ?? "").trim() || null,
      });
    }
  } else if (customerId) {
    const [owned] = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.userId, session.user.id)),
      )
      .limit(1);
    if (!owned) customerId = null;
  }

  let projectId = body.id ?? null;
  if (projectId) {
    const [owned] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
      )
      .limit(1);
    if (!owned) throw data({ error: "Project not found." }, { status: 404 });
    await db
      .update(projects)
      .set({ name, customerId, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    // Replace prints
    await db.delete(prints).where(eq(prints.projectId, projectId));
  } else {
    projectId = newId();
    await db.insert(projects).values({
      id: projectId,
      userId: session.user.id,
      customerId,
      name,
    });
  }

  for (let i = 0; i < printPayloads.length; i++) {
    const p = printPayloads[i]!;
    const printId = newId();
    const materials: MaterialLine[] = (p.materials ?? []).map((m, mi) => ({
      id: m.id ?? `m-${mi}`,
      label: m.label,
      quantity: m.quantity,
      unit: m.unit,
      pricePerUnit: m.pricePerUnit,
      inventoryMaterialId: m.inventoryMaterialId,
      slot: m.slot,
      type: m.type,
      color: m.color,
    }));
    const addons: AddonLine[] = (p.addons ?? []).map((a, ai) => ({
      id: a.id ?? `a-${ai}`,
      name: a.name ?? "",
      quantity: a.quantity,
      unitCost: a.unitCost,
    }));

    let breakdown = calculatePrint({
      technology: p.technology === "sla" ? "sla" : "fdm",
      materials,
      printMinutes: p.printMinutes,
      laborMinutes: p.laborMinutes,
      postProcessMinutes: p.postProcessMinutes ?? 0,
      addons,
      settings,
    });
    if (i === 0) breakdown = withFixedServiceFee(breakdown, settings);

    await db.insert(prints).values({
      id: printId,
      projectId,
      userId: session.user.id,
      name: (p.name ?? "").trim(),
      technology: p.technology === "sla" ? "sla" : "fdm",
      printerName: (p.printerName ?? "").trim() || null,
      sourceName: p.sourceName ?? null,
      printMinutes: p.printMinutes,
      laborMinutes: p.laborMinutes,
      postProcessMinutes: p.postProcessMinutes ?? 0,
      addonsCost: breakdown.addonsCost,
      materialCost: breakdown.materialCost,
      electricityCost: breakdown.electricityCost,
      laborCost: breakdown.laborCost,
      postProcessCost: breakdown.postProcessCost,
      machineCost: breakdown.machineCost,
      consumablesCost: breakdown.consumablesCost,
      landed: breakdown.landed,
      failureUplift: breakdown.failureUplift,
      markupAmount: breakdown.markupAmount,
      preVat: breakdown.preVat,
      vatAmount: breakdown.vatAmount,
      total: breakdown.total,
      sortOrder: i,
      metadataSnapshot: p.metadataSnapshot ?? {},
    });

    if (materials.length > 0) {
      await db.insert(printMaterials).values(
        materials.map((m, mi) => ({
          id: newId(),
          printId,
          inventoryMaterialId: m.inventoryMaterialId ?? null,
          label: m.label,
          unit: m.unit,
          quantity: m.quantity,
          pricePerUnit: m.pricePerUnit,
          slot: m.slot ?? null,
          type: m.type ?? null,
          color: m.color ?? null,
          sortOrder: mi,
        })),
      );
    }

    if (addons.length > 0) {
      await db.insert(printAddons).values(
        addons.map((a, ai) => ({
          id: newId(),
          printId,
          name: a.name.trim(),
          quantity: a.quantity,
          unitCost: a.unitCost,
          sortOrder: ai,
        })),
      );
    }

    for (const plate of p.plates ?? []) {
      let imagePath: string | null = null;
      if (plate.imageDataUrl) {
        const buf = dataUrlToBuffer(plate.imageDataUrl);
        if (buf) {
          imagePath = await savePlateImage({
            ownerId: printId,
            plateIndex: plate.plateIndex,
            bytes: buf,
          });
        }
      }
      await db.insert(printPlates).values({
        id: newId(),
        printId,
        plateIndex: plate.plateIndex,
        imagePath,
        printMinutes: plate.printMinutes,
        sliced: plate.sliced,
        metadata: plate.metadata ?? {},
      });
    }
  }

  const bundle = await loadProjectBundle(projectId, session.user.id);
  return data({ id: projectId, ...bundle });
}
