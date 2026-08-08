import { and, desc, eq } from "drizzle-orm";
import { Link, useLoaderData, useSearchParams } from "react-router";
import type { Route } from "./+types/quotes._index";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db } from "~/db/index.server";
import { clients, projects, quotes } from "~/db/schema";
import { formatMoney } from "~/lib/pricing";
import { requireUser } from "~/lib/session.server";
import type { AppSettings } from "~/lib/settings";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Quotes · Print Quote" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const projectId = url.searchParams.get("projectId");

  const conditions = [eq(quotes.userId, session.user.id)];
  if (clientId) conditions.push(eq(quotes.clientId, clientId));
  if (projectId) conditions.push(eq(quotes.projectId, projectId));

  const rows = await db
    .select({
      quote: quotes,
      clientName: clients.name,
      projectName: projects.name,
    })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .leftJoin(projects, eq(quotes.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(desc(quotes.createdAt));

  const clientRows = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .orderBy(clients.name);

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(projects.name);

  return {
    quotes: rows,
    clients: clientRows,
    projects: projectRows,
    filters: { clientId, projectId },
  };
}

export default function QuotesIndexPage() {
  const data = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 animate-fade-up">
        <h1 className="font-display text-3xl font-extrabold">Saved quotes</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Filter by client or project. Each save is a snapshot.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="field-label">Client</p>
          <Select
            value={data.filters.clientId ?? "all"}
            onValueChange={(value) => {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (value === "all") next.delete("clientId");
                else next.set("clientId", value);
                return next;
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {data.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="field-label">Project</p>
          <Select
            value={data.filters.projectId ?? "all"}
            onValueChange={(value) => {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (value === "all") next.delete("projectId");
                else next.set("projectId", value);
                return next;
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {data.projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {data.quotes.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            No saved quotes yet. Build one on the{" "}
            <Link to="/" className="text-[var(--color-accent-deep)] hover:underline">
              estimator
            </Link>
            .
          </p>
        ) : (
          data.quotes.map(({ quote, clientName, projectName }) => {
            const settings = quote.settingsSnapshot as AppSettings;
            const symbol = settings?.currencySymbol ?? "₱";
            return (
              <Link key={quote.id} to={`/quotes/${quote.id}`} className="block">
                <Card className="transition-shadow hover:shadow-[0_16px_40px_rgba(26,35,50,0.1)]">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{quote.title}</CardTitle>
                        <CardDescription>
                          {[clientName, projectName].filter(Boolean).join(" · ") ||
                            "No client"}
                          {" · "}
                          {new Date(quote.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <p className="font-display text-xl font-extrabold text-[var(--color-accent-deep)]">
                        {formatMoney(quote.total, symbol)}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      {quote.printMinutes} min · material{" "}
                      {formatMoney(quote.materialCost, symbol)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
