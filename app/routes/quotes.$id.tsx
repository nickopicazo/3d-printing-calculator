import { and, asc, eq } from "drizzle-orm";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/quotes.$id";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { db } from "~/db/index.server";
import {
  clients,
  projects,
  quoteFilamentLines,
  quotePlates,
  quotes,
} from "~/db/schema";
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
      clientName: clients.name,
      clientEmail: clients.email,
      clientPhone: clients.phone,
      projectName: projects.name,
    })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .leftJoin(projects, eq(quotes.projectId, projects.id))
    .where(and(eq(quotes.id, id), eq(quotes.userId, session.user.id)))
    .limit(1);

  if (!row) throw new Response("Not found", { status: 404 });

  const plates = await db
    .select()
    .from(quotePlates)
    .where(eq(quotePlates.quoteId, id))
    .orderBy(asc(quotePlates.plateIndex));

  const lines = await db
    .select()
    .from(quoteFilamentLines)
    .where(eq(quoteFilamentLines.quoteId, id))
    .orderBy(asc(quoteFilamentLines.sortOrder));

  return {
    quote: row.quote,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
    projectName: row.projectName,
    plates,
    lines,
  };
}

export default function QuoteDetailPage() {
  const data = useLoaderData<typeof loader>();
  const settings = data.quote.settingsSnapshot as AppSettings;
  const symbol = settings?.currencySymbol ?? "₱";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/quotes">← All quotes</Link>
        </Button>
      </div>

      <header className="mb-8 animate-fade-up">
        <p className="font-display text-sm font-semibold tracking-[0.18em] text-[var(--color-accent-deep)] uppercase">
          Saved quote
        </p>
        <h1 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl">
          {data.quote.title}
        </h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          {[data.clientName, data.projectName].filter(Boolean).join(" · ") ||
            "No client"}
          {" · "}
          {new Date(data.quote.createdAt).toLocaleString()}
        </p>
        {(data.clientEmail || data.clientPhone) && (
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {[data.clientEmail, data.clientPhone].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      {data.plates.length > 0 ? (
        <section className="mb-6">
          <h2 className="font-display mb-3 text-xl font-bold">Plates</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.plates.map((plate) => (
              <Card key={plate.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Plate {plate.plateIndex}</CardTitle>
                  <CardDescription>
                    {plate.sliced
                      ? `${plate.printMinutes ?? 0} min`
                      : "Unsliced thumbnail"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {plate.imagePath ? (
                    <img
                      src={`/uploads/${plate.imagePath}`}
                      alt={`Plate ${plate.plateIndex}`}
                      className="w-full rounded-xl border border-[var(--color-line)] bg-black"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] text-sm text-[var(--color-ink-muted)]">
                      No image
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filaments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.lines.map((line) => (
            <div
              key={line.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-2">
                {line.color ? (
                  <span
                    className="h-4 w-4 rounded border border-[var(--color-line)]"
                    style={{ background: line.color }}
                  />
                ) : null}
                <span>
                  {line.label} · {line.grams}g @ {formatMoney(line.pricePerKg, symbol)}
                  /kg
                </span>
              </div>
              <span className="font-mono">
                {formatMoney((line.grams / 1000) * line.pricePerKg, symbol)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[var(--color-accent)]/25 bg-[linear-gradient(160deg,#ffffff_0%,#eef8f6_100%)]">
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm sm:text-base">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-ink-muted)]">Material</dt>
              <dd className="font-mono">{formatMoney(data.quote.materialCost, symbol)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-ink-muted)]">Machine</dt>
              <dd className="font-mono">{formatMoney(data.quote.machineCost, symbol)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-ink-muted)]">Markup</dt>
              <dd className="font-mono">{formatMoney(data.quote.markupAmount, symbol)}</dd>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between gap-4">
              <dt className="font-display text-lg font-bold">Total</dt>
              <dd className="font-display text-2xl font-extrabold text-[var(--color-accent-deep)]">
                {formatMoney(data.quote.total, symbol)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {data.quote.sourceName ? (
        <p className="mt-6 text-center text-xs text-[var(--color-ink-muted)]">
          Source: <span className="font-mono">{data.quote.sourceName}</span>
        </p>
      ) : null}
    </main>
  );
}
