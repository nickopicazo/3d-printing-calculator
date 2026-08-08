import { and, asc, eq, inArray } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/api.quotes";
import { db } from "~/db/index.server";
import {
  customers,
  printMaterials,
  prints,
  projects,
  quotes,
} from "~/db/schema";
import type { QuotePrintSnapshot } from "~/lib/calculator-types";
import {
  calculatePrint,
  calculateProject,
  type MaterialLine,
  type Technology,
} from "~/lib/pricing";
import { normalizeSettings, type AppSettings } from "~/lib/settings";
import { newId, requireUser } from "~/lib/session.server";

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  if (request.method !== "POST") {
    throw data({ error: "Method not allowed" }, { status: 405 });
  }

  const body = (await request.json()) as {
    projectId?: string;
    title?: string;
    settings?: AppSettings;
  };

  const projectId = body.projectId;
  if (!projectId) {
    throw data({ error: "projectId is required." }, { status: 400 });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
    )
    .limit(1);
  if (!project) throw data({ error: "Project not found." }, { status: 404 });

  const settings = normalizeSettings(body.settings);
  const printRows = await db
    .select()
    .from(prints)
    .where(eq(prints.projectId, projectId))
    .orderBy(asc(prints.sortOrder));

  if (printRows.length === 0) {
    throw data({ error: "Project has no prints." }, { status: 400 });
  }

  const printIds = printRows.map((p) => p.id);
  const materialRows = await db
    .select()
    .from(printMaterials)
    .where(inArray(printMaterials.printId, printIds))
    .orderBy(asc(printMaterials.sortOrder));

  let customerSnapshot: Record<string, unknown> = {};
  let customerId = project.customerId;
  if (customerId) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (customer) {
      customerSnapshot = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      };
    }
  }

  const calcInputs = printRows.map((p) => {
    const mats: MaterialLine[] = materialRows
      .filter((m) => m.printId === p.id)
      .map((m) => ({
        id: m.id,
        label: m.label,
        quantity: m.quantity,
        unit: m.unit === "ml" ? "ml" : "g",
        pricePerUnit: m.pricePerUnit,
        inventoryMaterialId: m.inventoryMaterialId,
        slot: m.slot,
        type: m.type,
        color: m.color,
      }));

    return {
      id: p.id,
      name: p.name,
      input: {
        technology: (p.technology === "sla" ? "sla" : "fdm") as Technology,
        materials: mats,
        printMinutes: p.printMinutes,
        laborMinutes: p.laborMinutes,
        hardwareCost: p.hardwareCost,
        packagingCost: p.packagingCost,
        settings,
      },
    };
  });

  const rolled = calculateProject(calcInputs);

  const printsSnapshot: QuotePrintSnapshot[] = calcInputs.map((p, i) => {
    const row = printRows[i]!;
    const mats = p.input.materials;
    return {
      id: p.id,
      name: p.name,
      technology: p.input.technology,
      printerName: row.printerName,
      printMinutes: row.printMinutes,
      laborMinutes: row.laborMinutes,
      materials: mats.map((m) => ({
        label: m.label,
        unit: m.unit,
        quantity: m.quantity,
        pricePerUnit: m.pricePerUnit,
        type: m.type,
      })),
      breakdown: rolled.prints[i]!.breakdown,
    };
  });

  // Recompute to ensure snapshot matches
  for (let i = 0; i < printsSnapshot.length; i++) {
    printsSnapshot[i]!.breakdown = calculatePrint(calcInputs[i]!.input);
  }

  const quoteId = newId();
  const title =
    (body.title ?? "").trim() || `${project.name} — Quote`;

  await db.insert(quotes).values({
    id: quoteId,
    userId: session.user.id,
    customerId,
    projectId,
    title,
    materialCost: rolled.materialCost,
    electricityCost: rolled.electricityCost,
    laborCost: rolled.laborCost,
    machineCost: rolled.machineCost,
    hardwareCost: rolled.hardwareCost,
    packagingCost: rolled.packagingCost,
    consumablesCost: rolled.consumablesCost,
    landed: rolled.landed,
    failureUplift: rolled.failureUplift,
    markupAmount: rolled.markupAmount,
    preVat: rolled.preVat,
    vatAmount: rolled.vatAmount,
    vatRate: settings.vatRate,
    total: rolled.total,
    printMinutes: Math.round(rolled.printHours * 60),
    settingsSnapshot: settings,
    printsSnapshot,
    customerSnapshot,
  });

  return data({ id: quoteId });
}
