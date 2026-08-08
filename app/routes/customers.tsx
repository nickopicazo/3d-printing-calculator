import { and, desc, eq } from "drizzle-orm";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/customers";
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
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/index.server";
import { customers, projects } from "~/db/schema";
import { newId, requireUser } from "~/lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Customers · 3D Printing Calculator" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const customerRows = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, session.user.id))
    .orderBy(desc(customers.updatedAt));

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt));

  return {
    customers: customerRows.map((c) => ({
      ...c,
      projects: projectRows.filter((p) => p.customerId === c.id),
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "create-customer") {
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim() || null;
    const phone = String(form.get("phone") ?? "").trim() || null;
    const address = String(form.get("address") ?? "").trim() || null;
    if (!name) return { error: "Customer name is required." };
    await db.insert(customers).values({
      id: newId(),
      userId: session.user.id,
      name,
      email,
      phone,
      address,
    });
    return redirect("/customers");
  }

  if (intent === "create-project") {
    const customerId = String(form.get("customerId") ?? "");
    const name = String(form.get("name") ?? "").trim();
    if (!customerId || !name) {
      return { error: "Project needs a customer and name." };
    }
    const owned = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.userId, session.user.id)),
      )
      .limit(1);
    if (!owned[0]) return { error: "Customer not found." };
    await db.insert(projects).values({
      id: newId(),
      userId: session.user.id,
      customerId,
      name,
    });
    return redirect("/customers");
  }

  if (intent === "delete-customer") {
    const id = String(form.get("id") ?? "");
    if (id) {
      await db
        .delete(customers)
        .where(and(eq(customers.id, id), eq(customers.userId, session.user.id)));
    }
    return redirect("/customers");
  }

  return { error: "Unknown action." };
}

export default function CustomersPage() {
  const { customers: rows } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 animate-fade-up">
        <h1 className="font-display text-3xl font-extrabold">Customers</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Save contact details and attach projects for invoicing.
        </p>
      </header>

      <Card className="mb-8 animate-fade-up-delay">
        <CardHeader>
          <CardTitle>Add customer</CardTitle>
          <CardDescription>Name, contact, and address.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="intent" value="create-customer" />
            <div className="sm:col-span-2">
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
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" rows={2} />
            </div>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="text-sm text-[#a33b2b] sm:col-span-2">{actionData.error}</p>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit">Save customer</Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No customers yet.</p>
        ) : (
          rows.map((customer) => (
            <Card key={customer.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{customer.name}</CardTitle>
                    <CardDescription>
                      {[customer.email, customer.phone, customer.address]
                        .filter(Boolean)
                        .join(" · ") || "No contact details"}
                      {" · "}
                      {customer.projects.length} project
                      {customer.projects.length === 1 ? "" : "s"}
                    </CardDescription>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-customer" />
                    <input type="hidden" name="id" value={customer.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Delete
                    </Button>
                  </Form>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="field-label mb-2">Projects</p>
                  {customer.projects.length === 0 ? (
                    <p className="text-sm text-[var(--color-ink-muted)]">No projects.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {customer.projects.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/?projectId=${p.id}`}
                            className="text-[var(--color-accent-deep)] hover:underline"
                          >
                            {p.name}
                          </Link>
                          {" · "}
                          <Link
                            to={`/projects/${p.id}/invoice`}
                            className="text-[var(--color-ink-muted)] hover:underline"
                          >
                            invoice
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Form method="post" className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="intent" value="create-project" />
                  <input type="hidden" name="customerId" value={customer.id} />
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
