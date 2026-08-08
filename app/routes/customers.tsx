import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/customers";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/db/index.server";
import { customers, projects } from "~/db/schema";
import { withParentMeta } from "~/lib/seo";
import { newId, requireUser } from "~/lib/session.server";

export function meta({ matches }: Route.MetaArgs) {
  return withParentMeta(matches, [
    { title: "Customers · 3D Printing Calculator" },
    { name: "robots", content: "noindex,nofollow" },
  ]);
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
    if (!name) return { createError: "Customer name is required." };
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
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [addOpen, setAddOpen] = useState(false);
  const createError =
    actionData && "createError" in actionData && actionData.createError
      ? actionData.createError
      : null;

  useEffect(() => {
    if (createError) setAddOpen(true);
  }, [createError]);

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-5xl">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>
                Name, contact, and address for invoicing.
              </DialogDescription>
            </DialogHeader>
            <Form method="post" className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="intent" value="create-customer" />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" rows={2} />
              </div>
              {createError ? (
                <p className="text-sm text-[#a33b2b] sm:col-span-2">
                  {createError}
                </p>
              ) : null}
              <DialogFooter className="sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  <Plus />
                  Save Customer
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>

        <header className="mb-6 flex flex-col gap-4 animate-fade-up sm:mb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Customers</h1>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)] sm:text-base">
              Save contact details and attach projects for invoicing.
            </p>
          </div>
          <Button
            type="button"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            <Plus />
            Add Customer
          </Button>
        </header>

        <div className="space-y-4">
          {rows.length === 0 ? (
            <div className="dash-card flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-[var(--color-ink-muted)]">
                No customers yet.
              </p>
              <Button type="button" onClick={() => setAddOpen(true)}>
                <Plus />
                Add Customer
              </Button>
            </div>
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
                      <input
                        type="hidden"
                        name="intent"
                        value="delete-customer"
                      />
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
                      <p className="text-sm text-[var(--color-ink-muted)]">
                        No projects.
                      </p>
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
                    <input
                      type="hidden"
                      name="customerId"
                      value={customer.id}
                    />
                    <div className="min-w-[200px] flex-1 space-y-1.5">
                      <Label>New Project</Label>
                      <Input name="name" placeholder="Project Name" required />
                    </div>
                    <Button type="submit" variant="secondary">
                      Add Project
                    </Button>
                  </Form>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
