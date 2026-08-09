import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { Box, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Link,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/projects._index";
import { Button } from "~/components/ui/button";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
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
import { customers, printPlates, prints, projects } from "~/db/schema";
import { withParentMeta } from "~/lib/seo";
import { formatMoney } from "~/lib/pricing";
import { requireUser } from "~/lib/session.server";
import { DEFAULT_SETTINGS } from "~/lib/settings";


export function meta({ matches }: Route.MetaArgs) {
  return withParentMeta(matches, [
    { title: "Projects · 3D Printing Calculator" },
    { name: "robots", content: "noindex,nofollow" },
  ]);
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

  const plateRows =
    projectIds.length > 0
      ? await db
          .select({
            projectId: prints.projectId,
            imagePath: printPlates.imagePath,
            plateIndex: printPlates.plateIndex,
            printCreatedAt: prints.createdAt,
          })
          .from(printPlates)
          .innerJoin(prints, eq(printPlates.printId, prints.id))
          .where(
            and(
              inArray(prints.projectId, projectIds),
              isNotNull(printPlates.imagePath),
              eq(printPlates.sliced, true),
            ),
          )
          .orderBy(asc(prints.createdAt), asc(printPlates.plateIndex))
      : [];

  const previewByProject = new Map<string, string>();
  for (const row of plateRows) {
    if (!row.imagePath || previewByProject.has(row.projectId)) continue;
    previewByProject.set(row.projectId, row.imagePath);
  }

  const aggByProject = new Map(printAgg.map((a) => [a.projectId, a]));

  const customerRows = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .orderBy(asc(customers.name));

  return {
    projects: projectRows.map(({ project, customerName }) => {
      const agg = aggByProject.get(project.id);
      const imagePath = previewByProject.get(project.id) ?? null;
      return {
        project,
        customerName,
        total: Number(agg?.total ?? 0),
        materialCost: Number(agg?.materialCost ?? 0),
        printMinutes: Number(agg?.printMinutes ?? 0),
        printCount: Number(agg?.printCount ?? 0),
        previewUrl: imagePath ? `/uploads/${imagePath}` : null,
      };
    }),
    customers: customerRows,
    filters: { customerId },
  };
}

export default function ProjectsIndexPage() {
  const data = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const symbol = DEFAULT_SETTINGS.currencyCode;

  async function deleteProject(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Delete failed.",
        );
      }
      setPendingDelete(null);
      revalidator.revalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page-shell">
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        title="Delete Project"
        description={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? This cannot be undone.`
            : ""
        }
        confirming={deletingId != null}
        onOpenChange={(open) => {
          if (!open && deletingId == null) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) void deleteProject(pendingDelete.id);
        }}
      />
      <header className="mb-6 flex flex-col gap-4 animate-fade-up sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Projects</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)] sm:text-base">
            Saved work you can reopen, edit, and invoice.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link to="/?new=1">
            <Plus />
            Add New Project
          </Link>
        </Button>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-[#a33b2b]">{error}</p>
      ) : null}

      <div className="mb-6 w-full max-w-sm">
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
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
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
          <div className="sm:col-span-2 space-y-3">
            <p className="text-sm text-[var(--color-ink-muted)]">
              No projects yet. Start a quote in the calculator, then save it.
            </p>
            <Button asChild>
              <Link to="/?new=1">
                <Plus />
                Add New Project
              </Link>
            </Button>
          </div>
        ) : (
          data.projects.map(
            ({
              project,
              customerName,
              total,
              materialCost,
              printMinutes,
              printCount,
              previewUrl,
            }) => (
              <Card
                key={project.id}
                className="overflow-hidden transition-shadow hover:shadow-[0_16px_40px_rgba(22,22,26,0.08)]"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <Link
                      to={`/?projectId=${project.id}`}
                      className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[var(--color-paper)] ring-1 ring-[var(--color-line)]"
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[var(--color-ink-muted)]">
                          <Box className="size-7 opacity-50" />
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-lg">
                            <Link to={`/?projectId=${project.id}`}>
                              {project.name}
                            </Link>
                          </CardTitle>
                          <CardDescription>
                            {customerName || "No customer"}
                            {" · "}
                            {new Date(project.updatedAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        <p className="shrink-0 font-display text-xl font-extrabold text-[var(--color-accent-deep)]">
                          {formatMoney(total, symbol)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    {printCount} print{printCount === 1 ? "" : "s"} ·{" "}
                    {printMinutes} min · material{" "}
                    {formatMoney(materialCost, symbol)}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:flex">
                    <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                      <Link to={`/?projectId=${project.id}`}>Open</Link>
                    </Button>
                    <Button asChild size="sm" className="w-full sm:w-auto">
                      <Link to={`/projects/${project.id}/invoice`}>
                        <span className="sm:hidden">PDF</span>
                        <span className="hidden sm:inline">Download PDF</span>
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      disabled={deletingId === project.id}
                      onClick={() =>
                        setPendingDelete({
                          id: project.id,
                          name: project.name,
                        })
                      }
                    >
                      <Trash2 />
                      <span className="sm:inline">Delete</span>
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
