import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Link, useLoaderData, useSearchParams } from "react-router";
import type { Route } from "./+types/projects._index";
import { Button } from "~/components/ui/button";
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
import { customers, prints, projects } from "~/db/schema";
import { formatMoney } from "~/lib/pricing";
import { requireUser } from "~/lib/session.server";
import { DEFAULT_SETTINGS } from "~/lib/settings";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Projects · 3D Printing Calculator" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  const conditions = [eq(projects.userId, session.user.id)];
  if (customerId) conditions.push(eq(projects.customerId, customerId));

  const projectRows = await db
    .select({
      project: projects,
      customerName: customers.name,
    })
    .from(projects)
    .leftJoin(customers, eq(projects.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt));

  const projectIds = projectRows.map((r) => r.project.id);
  const printAgg =
    projectIds.length > 0
      ? await db
          .select({
            projectId: prints.projectId,
            total: sql<number>`coalesce(sum(${prints.total}), 0)`,
            materialCost: sql<number>`coalesce(sum(${prints.materialCost}), 0)`,
            printMinutes: sql<number>`coalesce(sum(${prints.printMinutes}), 0)`,
            printCount: sql<number>`count(*)::int`,
          })
          .from(prints)
          .where(inArray(prints.projectId, projectIds))
          .groupBy(prints.projectId)
      : [];

  const aggByProject = new Map(printAgg.map((a) => [a.projectId, a]));

  const customerRows = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .orderBy(asc(customers.name));

  return {
    projects: projectRows.map(({ project, customerName }) => {
      const agg = aggByProject.get(project.id);
      return {
        project,
        customerName,
        total: Number(agg?.total ?? 0),
        materialCost: Number(agg?.materialCost ?? 0),
        printMinutes: Number(agg?.printMinutes ?? 0),
        printCount: Number(agg?.printCount ?? 0),
      };
    }),
    customers: customerRows,
    filters: { customerId },
  };
}

export default function ProjectsIndexPage() {
  const data = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const symbol = DEFAULT_SETTINGS.currencySymbol;

  return (
    <main className="page-shell">
      <header className="mb-8 animate-fade-up">
        <h1 className="font-display text-3xl font-extrabold">Projects</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Saved work you can reopen, edit, and invoice.
        </p>
      </header>

      <div className="mb-6">
        <p className="field-label">Customer</p>
        <Select
          value={data.filters.customerId ?? "all"}
          onValueChange={(value) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (value === "all") next.delete("customerId");
              else next.set("customerId", value);
              return next;
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {data.customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.projects.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)] sm:col-span-2">
            No projects yet. Open the{" "}
            <Link
              to="/"
              className="text-[var(--color-accent-deep)] hover:underline"
            >
              Calculator
            </Link>
            , then click{" "}
            <span className="font-medium text-[var(--color-ink)]">
              Save project
            </span>
            .
          </p>
        ) : (
          data.projects.map(
            ({ project, customerName, total, materialCost, printMinutes, printCount }) => (
              <Card
                key={project.id}
                className="transition-shadow hover:shadow-[0_16px_40px_rgba(22,22,26,0.08)]"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        <Link to={`/?projectId=${project.id}`}>{project.name}</Link>
                      </CardTitle>
                      <CardDescription>
                        {customerName || "No customer"}
                        {" · "}
                        {new Date(project.updatedAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <p className="font-display text-xl font-extrabold text-[var(--color-accent-deep)]">
                      {formatMoney(total, symbol)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    {printCount} print{printCount === 1 ? "" : "s"} ·{" "}
                    {printMinutes} min · material{" "}
                    {formatMoney(materialCost, symbol)}
                  </p>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/?projectId=${project.id}`}>Open</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to={`/projects/${project.id}/invoice`}>
                        Download PDF
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ),
          )
        )}
      </div>
    </main>
  );
}
