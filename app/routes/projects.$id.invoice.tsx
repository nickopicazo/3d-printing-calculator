import { and, asc, eq, inArray } from "drizzle-orm";
import { useEffect } from "react";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/projects.$id.invoice";
import { QuoteDocument } from "~/components/calculator/quote-document";
import { Button } from "~/components/ui/button";
import { db } from "~/db/index.server";
import {
  customers,
  printMaterials,
  printPlates,
  prints,
  projects,
} from "~/db/schema";
import { requireUser } from "~/lib/session.server";
import { withParentMeta } from "~/lib/seo";
import { DEFAULT_SETTINGS } from "~/lib/settings";

export function meta({ matches }: Route.MetaArgs) {
  return withParentMeta(matches, [
    { title: "Quote · 3D Printing Calculator" },
    { name: "robots", content: "noindex,nofollow" },
  ]);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const id = params.id;
  if (!id) throw new Response("Not found", { status: 404 });

  const [row] = await db
    .select({
      project: projects,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerAddress: customers.address,
    })
    .from(projects)
    .leftJoin(customers, eq(projects.customerId, customers.id))
    .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)))
    .limit(1);

  if (!row) throw new Response("Not found", { status: 404 });

  const printRows = await db
    .select()
    .from(prints)
    .where(eq(prints.projectId, id))
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
  const plateRows =
    printIds.length > 0
      ? await db
          .select()
          .from(printPlates)
          .where(inArray(printPlates.printId, printIds))
          .orderBy(asc(printPlates.plateIndex))
      : [];

  const printsView = printRows.map((p) => ({
    id: p.id,
    name: p.name,
    technology: p.technology,
    printerName: p.printerName,
    printMinutes: p.printMinutes,
    total: p.total,
    materials: materialRows
      .filter((m) => m.printId === p.id)
      .map((m) => ({
        label: m.label,
        unit: m.unit,
        quantity: m.quantity,
      })),
    previewUrls: plateRows
      .filter((pl) => pl.printId === p.id && pl.sliced && pl.imagePath)
      .map((pl) => `/uploads/${pl.imagePath}`),
  }));

  const totals = printRows.reduce(
    (acc, p) => ({
      materialCost: acc.materialCost + p.materialCost,
      electricityCost: acc.electricityCost + p.electricityCost,
      laborCost: acc.laborCost + p.laborCost,
      machineCost: acc.machineCost + p.machineCost,
      addonsCost: acc.addonsCost + p.addonsCost,
      consumablesCost: acc.consumablesCost + p.consumablesCost,
      failureUplift: acc.failureUplift + p.failureUplift,
      markupAmount: acc.markupAmount + p.markupAmount,
      vatAmount: acc.vatAmount + p.vatAmount,
      total: acc.total + p.total,
    }),
    {
      materialCost: 0,
      electricityCost: 0,
      laborCost: 0,
      machineCost: 0,
      addonsCost: 0,
      consumablesCost: 0,
      failureUplift: 0,
      markupAmount: 0,
      vatAmount: 0,
      total: 0,
    },
  );

  return {
    project: row.project,
    prints: printsView,
    totals,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    customerAddress: row.customerAddress,
    currencyCode: DEFAULT_SETTINGS.currencyCode,
  };
}

export default function ProjectInvoicePage() {
  const data = useLoaderData<typeof loader>();

  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <style>{`
        @media print {
          @page { margin: 14mm 14mm 16mm; }
          body { background: #fff !important; }
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to={`/?projectId=${data.project.id}`}>Back</Link>
        </Button>
        <Button type="button" size="sm" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_8px_28px_rgba(22,22,26,0.04)] sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <QuoteDocument
          projectName={data.project.name}
          issuedAt={data.project.updatedAt}
          documentLabel="Quote"
          customer={
            data.customerName
              ? {
                  name: data.customerName,
                  email: data.customerEmail,
                  phone: data.customerPhone,
                  address: data.customerAddress,
                }
              : null
          }
          prints={data.prints}
          totals={data.totals}
          currencyCode={data.currencyCode}
        />
      </div>
    </main>
  );
}
