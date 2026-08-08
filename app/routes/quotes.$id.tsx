import { and, eq } from "drizzle-orm";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/quotes.$id";
import { CostBreakdown } from "~/components/calculator/cost-breakdown";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { db } from "~/db/index.server";
import { customers, projects, quotes } from "~/db/schema";
import type { QuotePrintSnapshot } from "~/lib/calculator-types";
import { formatMoney } from "~/lib/pricing";
import { requireUser } from "~/lib/session.server";
import type { AppSettings } from "~/lib/settings";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Quote · Print Quote" }];
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

export default function QuoteDetailPage() {
  const data = useLoaderData<typeof loader>();
  const settings = data.quote.settingsSnapshot as AppSettings;
  const symbol = settings?.currencySymbol ?? "₱";
  const prints = (data.quote.printsSnapshot ?? []) as QuotePrintSnapshot[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/quotes">← All quotes</Link>
        </Button>
        <Button asChild size="sm">
          <Link to={`/quotes/${data.quote.id}/invoice`}>Print / Download PDF</Link>
        </Button>
        {data.quote.projectId ? (
          <Button asChild variant="secondary" size="sm">
            <Link to={`/?projectId=${data.quote.projectId}`}>Open project</Link>
          </Button>
        ) : null}
      </div>

      <header className="mb-8 animate-fade-up">
        <p className="font-display text-sm font-semibold tracking-[0.18em] text-[var(--color-accent-deep)] uppercase">
          Saved quote
        </p>
        <h1 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl">
          {data.quote.title}
        </h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          {[data.customerName, data.projectName].filter(Boolean).join(" · ") ||
            "No customer"}
          {" · "}
          {new Date(data.quote.createdAt).toLocaleString()}
        </p>
        {(data.customerEmail || data.customerPhone || data.customerAddress) && (
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {[data.customerEmail, data.customerPhone, data.customerAddress]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </header>

      <section className="mb-6 space-y-3">
        <h2 className="font-display text-xl font-bold">Prints</h2>
        {prints.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{p.name}</CardTitle>
              <CardDescription>
                {p.technology.toUpperCase()}
                {p.printerName ? ` · ${p.printerName}` : ""}
                {" · "}
                {Math.floor(p.printMinutes / 60)}h {p.printMinutes % 60}m
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.materials.map((m, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span>
                    {m.label} · {m.quantity}
                    {m.unit} @ {formatMoney(m.pricePerUnit, symbol)}/
                    {m.unit === "ml" ? "L" : "kg"}
                  </span>
                  <span className="font-mono">
                    {formatMoney((m.quantity / 1000) * m.pricePerUnit, symbol)}
                  </span>
                </div>
              ))}
              <p className="pt-1 font-semibold text-[var(--color-accent-deep)]">
                Line total {formatMoney(p.breakdown.total, symbol)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <CostBreakdown
        breakdown={{
          materialCost: data.quote.materialCost,
          electricityCost: data.quote.electricityCost,
          laborCost: data.quote.laborCost,
          machineCost: data.quote.machineCost,
          hardwareCost: data.quote.hardwareCost,
          packagingCost: data.quote.packagingCost,
          consumablesCost: data.quote.consumablesCost,
          landed: data.quote.landed,
          failureUplift: data.quote.failureUplift,
          markupAmount: data.quote.markupAmount,
          preVat: data.quote.preVat,
          vatAmount: data.quote.vatAmount,
          total: data.quote.total,
          printHours: data.quote.printMinutes / 60,
        }}
        currencySymbol={symbol}
      />
    </main>
  );
}
