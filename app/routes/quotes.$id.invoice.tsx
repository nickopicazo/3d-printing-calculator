import { and, eq } from "drizzle-orm";
import { useEffect } from "react";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/quotes.$id.invoice";
import { Button } from "~/components/ui/button";
import { db } from "~/db/index.server";
import { customers, projects, quotes } from "~/db/schema";
import type { QuotePrintSnapshot } from "~/lib/calculator-types";
import { formatMoney } from "~/lib/pricing";
import { requireUser } from "~/lib/session.server";
import type { AppSettings } from "~/lib/settings";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Invoice · Print Quote" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const id = params.id;
  if (!id) throw new Response("Not found", { status: 404 });

  const [row] = await db
    .select({
      quote: quotes,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      projectName: projects.name,
    })
    .from(quotes)
    .leftJoin(customers, eq(quotes.customerId, customers.id))
    .leftJoin(projects, eq(quotes.projectId, projects.id))
    .where(and(eq(quotes.id, id), eq(quotes.userId, session.user.id)))
    .limit(1);

  if (!row) throw new Response("Not found", { status: 404 });

  const snap = row.quote.customerSnapshot as {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };

  return {
    quote: row.quote,
    customerName: snap.name ?? row.customerName,
    customerEmail: snap.email ?? row.customerEmail,
    customerPhone: snap.phone ?? row.customerPhone,
    customerAddress: snap.address ?? row.customerAddress,
    projectName: row.projectName,
  };
}

export default function QuoteInvoicePage() {
  const data = useLoaderData<typeof loader>();
  const settings = data.quote.settingsSnapshot as AppSettings;
  const symbol = settings?.currencySymbol ?? "₱";
  const prints = (data.quote.printsSnapshot ?? []) as QuotePrintSnapshot[];
  const m = (n: number) => formatMoney(n, symbol);

  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="mx-auto max-w-3xl bg-white px-6 py-10 text-black print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex gap-2 print:hidden">
        <Button asChild variant="secondary" size="sm">
          <Link to={`/quotes/${data.quote.id}`}>Back</Link>
        </Button>
        <Button type="button" size="sm" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>

      <header className="mb-8 border-b border-neutral-300 pb-4">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Invoice
        </p>
        <h1 className="mt-1 text-3xl font-bold">{data.quote.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {new Date(data.quote.createdAt).toLocaleString()}
          {data.projectName ? ` · Project: ${data.projectName}` : ""}
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

      <table className="mb-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left">
            <th className="py-2 pr-2">Part</th>
            <th className="py-2 pr-2">Tech</th>
            <th className="py-2 pr-2 text-right">Time</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {prints.map((p) => (
            <tr key={p.id} className="border-b border-neutral-200">
              <td className="py-2 pr-2">{p.name}</td>
              <td className="py-2 pr-2">{p.technology.toUpperCase()}</td>
              <td className="py-2 pr-2 text-right">
                {Math.floor(p.printMinutes / 60)}h {p.printMinutes % 60}m
              </td>
              <td className="py-2 text-right">{m(p.breakdown.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Material</span>
          <span>{m(data.quote.materialCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Hardware</span>
          <span>{m(data.quote.hardwareCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Packaging</span>
          <span>{m(data.quote.packagingCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Labor</span>
          <span>{m(data.quote.laborCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Machine</span>
          <span>{m(data.quote.machineCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Electricity</span>
          <span>{m(data.quote.electricityCost)}</span>
        </div>
        {data.quote.failureUplift > 0 ? (
          <div className="flex justify-between">
            <span>Failure uplift</span>
            <span>{m(data.quote.failureUplift)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>Markup</span>
          <span>{m(data.quote.markupAmount)}</span>
        </div>
        {data.quote.vatAmount > 0 ? (
          <div className="flex justify-between">
            <span>VAT ({data.quote.vatRate}%)</span>
            <span>{m(data.quote.vatAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-neutral-300 pt-2 text-lg font-bold">
          <span>Total</span>
          <span>{m(data.quote.total)}</span>
        </div>
      </div>
    </main>
  );
}
