import { and, desc, eq } from "drizzle-orm";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/clients";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { db } from "~/db/index.server";
import { clients, projects, quotes } from "~/db/schema";
import { newId, requireUser } from "~/lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Clients · Print Quote" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const clientRows = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .orderBy(desc(clients.updatedAt));

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt));

  const quoteCounts = await db
    .select({
      clientId: quotes.clientId,
      projectId: quotes.projectId,
    })
    .from(quotes)
    .where(eq(quotes.userId, session.user.id));

  return {
    clients: clientRows.map((c) => ({
      ...c,
      projects: projectRows.filter((p) => p.clientId === c.id),
      quoteCount: quoteCounts.filter((q) => q.clientId === c.id).length,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "create-client") {
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim() || null;
    const phone = String(form.get("phone") ?? "").trim() || null;
    if (!name) return { error: "Client name is required." };
    await db.insert(clients).values({
      id: newId(),
      userId: session.user.id,
      name,
      email,
      phone,
    });
    return redirect("/clients");
  }

  if (intent === "create-project") {
    const clientId = String(form.get("clientId") ?? "");
    const name = String(form.get("name") ?? "").trim();
    if (!clientId || !name) return { error: "Project needs a client and name." };
    const owned = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, session.user.id)))
      .limit(1);
    if (!owned[0]) return { error: "Client not found." };
    await db.insert(projects).values({
      id: newId(),
      userId: session.user.id,
      clientId,
      name,
    });
    return redirect("/clients");
  }

  if (intent === "delete-client") {
    const id = String(form.get("id") ?? "");
    if (id) {
      await db
        .delete(clients)
        .where(and(eq(clients.id, id), eq(clients.userId, session.user.id)));
    }
    return redirect("/clients");
  }

  return { error: "Unknown action." };
}

export default function ClientsPage() {
  const { clients: rows } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 animate-fade-up">
        <h1 className="font-display text-3xl font-extrabold">Clients</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Group quotes under clients and optional projects.
        </p>
      </header>

      <Card className="mb-8 animate-fade-up-delay">
        <CardHeader>
          <CardTitle>Add client</CardTitle>
          <CardDescription>Name plus optional email and phone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="intent" value="create-client" />
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="text-sm text-[#a33b2b] sm:col-span-3">{actionData.error}</p>
            ) : null}
            <div className="sm:col-span-3">
              <Button type="submit">Save client</Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No clients yet.</p>
        ) : (
          rows.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{client.name}</CardTitle>
                    <CardDescription>
                      {[client.email, client.phone].filter(Boolean).join(" · ") ||
                        "No contact details"}
                      {" · "}
                      {client.quoteCount} quote{client.quoteCount === 1 ? "" : "s"}
                    </CardDescription>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-client" />
                    <input type="hidden" name="id" value={client.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Delete
                    </Button>
                  </Form>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="field-label mb-2">Projects</p>
                  {client.projects.length === 0 ? (
                    <p className="text-sm text-[var(--color-ink-muted)]">No projects.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {client.projects.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/quotes?projectId=${p.id}`}
                            className="text-[var(--color-accent-deep)] hover:underline"
                          >
                            {p.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Form method="post" className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="intent" value="create-project" />
                  <input type="hidden" name="clientId" value={client.id} />
                  <div className="min-w-[200px] flex-1">
                    <Label>New project</Label>
                    <Input name="name" placeholder="Project name" required />
                  </div>
                  <Button type="submit" variant="secondary">
                    Add project
                  </Button>
                </Form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
