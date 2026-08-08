import { and, asc, eq, inArray } from "drizzle-orm";
import { useEffect } from "react";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/projects.$id.invoice";
import { Button } from "~/components/ui/button";
import { db } from "~/db/index.server";
import {
  customers,
  printMaterials,
  printPlates,
  prints,
  projects,
} from "~/db/schema";
import { formatMoney } from "~/lib/pricing";
import { requireUser } from "~/lib/session.server";
import { DEFAULT_SETTINGS } from "~/lib/settings";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Invoice · 3D Printing Calculator" }];
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
        pricePerUnit: m.pricePerUnit,
      })),
    plates: plateRows
      .filter((pl) => pl.printId === p.id && pl.imagePath)
      .map((pl) => ({
        plateIndex: pl.plateIndex,
        imageUrl: `/uploads/${pl.imagePath}`,
      })),
  }));

  const totals = printRows.reduce(
    (acc, p) => ({
      materialCost: acc.materialCost + p.materialCost,
      electricityCost: acc.electricityCost + p.electricityCost,
      laborCost: acc.laborCost + p.laborCost,
      machineCost: acc.machineCost + p.machineCost,
      hardwareCost: acc.hardwareCost + p.hardwareCost,
      packagingCost: acc.packagingCost + p.packagingCost,
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
      hardwareCost: 0,
      packagingCost: 0,
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
  };
}

export default function ProjectInvoicePage() {
  const data = useLoaderData<typeof loader>();
  const symbol = DEFAULT_SETTINGS.currencySymbol;
  const m = (n: number) => formatMoney(n, symbol);

  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="mx-auto max-w-3xl bg-white px-6 py-10 text-black print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex gap-2 print:hidden">
        <Button asChild variant="secondary" size="sm">
          <Link to={`/?projectId=${data.project.id}`}>Back</Link>
        </Button>
        <Button type="button" size="sm" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>

      <header className="mb-8 border-b border-neutral-300 pb-4">
        <h1 className="text-3xl font-bold">{data.project.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {new Date(data.project.updatedAt).toLocaleString()}
        </p>
      </header>

      {data.customerName ? (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Bill to
          </h2>
          <p className="font-semibold">{data.customerName}</p>
          {data.customerEmail ? <p>{data.customerEmail}</p> : null}
          {data.customerPhone ? <p>{data.customerPhone}</p> : null}
          {data.customerAddress ? (
            <p className="whitespace-pre-line">{data.customerAddress}</p>
          ) : null}
        </section>
      ) : null}

      <section className="mb-6 space-y-4">
        {data.prints.map((p) => (
          <div key={p.id} className="border-b border-neutral-200 pb-4">
            {p.plates.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {p.plates.map((pl) => (
                  <img
                    key={pl.plateIndex}
                    src={pl.imageUrl}
                    alt={`${p.name} plate ${pl.plateIndex}`}
                    className="h-24 w-24 rounded border border-neutral-200 object-cover"
                  />
                ))}
              </div>
            ) : null}
            <div className="flex justify-between gap-4 text-sm">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-neutral-600">
                  {p.technology.toUpperCase()}
                  {p.printerName ? ` · ${p.printerName}` : ""} ·{" "}
                  {Math.floor(p.printMinutes / 60)}h {p.printMinutes % 60}m
                </p>
              </div>
              <p className="font-semibold">{m(p.total)}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Material</span>
          <span>{m(data.totals.materialCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Hardware</span>
          <span>{m(data.totals.hardwareCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Packaging</span>
          <span>{m(data.totals.packagingCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Labor</span>
          <span>{m(data.totals.laborCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Machine</span>
          <span>{m(data.totals.machineCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Electricity</span>
          <span>{m(data.totals.electricityCost)}</span>
        </div>
        {data.totals.failureUplift > 0 ? (
          <div className="flex justify-between">
            <span>Failure uplift</span>
            <span>{m(data.totals.failureUplift)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>Markup</span>
          <span>{m(data.totals.markupAmount)}</span>
        </div>
        {data.totals.vatAmount > 0 ? (
          <div className="flex justify-between">
            <span>VAT</span>
            <span>{m(data.totals.vatAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-neutral-300 pt-2 text-lg font-bold">
          <span>Total</span>
          <span>{m(data.totals.total)}</span>
        </div>
      </div>
    </main>
  );
}
