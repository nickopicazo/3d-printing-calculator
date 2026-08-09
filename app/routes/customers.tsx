import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
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
import { isValidEmail } from "~/lib/validate-project";
import { cn } from "~/lib/utils";

const FIELD_ERROR_CLASS =
  "border-[#e8c4be] focus:border-[#a33b2b] focus:shadow-[0_0_0_3px_rgba(163,59,43,0.15)]";

type CustomerFieldErrors = {
  name?: string;
  email?: string;
};

type CustomerFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

function parseCustomerForm(form: FormData): {
  values: CustomerFormValues;
  errors: CustomerFieldErrors;
} {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const address = String(form.get("address") ?? "").trim();

  const errors: CustomerFieldErrors = {};
  if (!name) errors.name = "Name is required.";
  if (email && !isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  return {
    values: { name, email, phone, address },
    errors,
  };
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="text-xs text-[#a33b2b]">
      {error}
    </p>
  );
}

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
    const parsed = parseCustomerForm(form);
    if (Object.keys(parsed.errors).length > 0) {
      return { createErrors: parsed.errors, createValues: parsed.values };
    }
    await db.insert(customers).values({
      id: newId(),
      userId: session.user.id,
      name: parsed.values.name,
      email: parsed.values.email || null,
      phone: parsed.values.phone || null,
      address: parsed.values.address || null,
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
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const createErrors =
    actionData && "createErrors" in actionData && actionData.createErrors
      ? actionData.createErrors
      : null;
  const createValues =
    actionData && "createValues" in actionData && actionData.createValues
      ? actionData.createValues
      : null;
  const activeErrors = { ...createErrors, ...fieldErrors };

  useEffect(() => {
    if (createErrors) {
      setAddOpen(true);
      setFieldErrors({});
    }
  }, [createErrors]);

  // Same-route redirect keeps local dialog state; close after a successful save.
  const wasSubmitting = useRef(false);
  useEffect(() => {
    if (navigation.state === "submitting") {
      wasSubmitting.current = true;
      return;
    }
    if (navigation.state !== "idle" || !wasSubmitting.current) return;
    wasSubmitting.current = false;
    if (createErrors) return;
    setAddOpen(false);
    setFieldErrors({});
    setPendingDelete(null);
  }, [navigation.state, createErrors]);

  function onAddSubmit(event: FormEvent<HTMLFormElement>) {
    const parsed = parseCustomerForm(new FormData(event.currentTarget));
    if (Object.keys(parsed.errors).length > 0) {
      event.preventDefault();
      setFieldErrors(parsed.errors);
    }
  }

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-5xl">
        <ConfirmDeleteDialog
          open={pendingDelete != null}
          title="Delete Customer"
          description={
            pendingDelete
              ? `Delete “${pendingDelete.name}”? This cannot be undone.`
              : ""
          }
          confirming={busy && pendingDelete != null}
          onOpenChange={(open) => {
            if (!open && !busy) setPendingDelete(null);
          }}
          onConfirm={() => {
            if (!pendingDelete) return;
            const form = document.getElementById(
              `delete-customer-${pendingDelete.id}`,
            ) as HTMLFormElement | null;
            form?.requestSubmit();
          }}
        />

        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) setFieldErrors({});
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>
                Name, contact, and address for invoicing.
              </DialogDescription>
            </DialogHeader>
            <Form
              method="post"
              className="grid gap-4 sm:grid-cols-2"
              key={
                createValues
                  ? `add-error-${createValues.name}-${createValues.email}`
                  : addOpen
                    ? "add-open"
                    : "add-closed"
              }
              noValidate
              onSubmit={onAddSubmit}
            >
              <input type="hidden" name="intent" value="create-customer" />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">
                  Name <span className="text-[#a33b2b]">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={createValues?.name ?? ""}
                  aria-invalid={Boolean(activeErrors.name)}
                  aria-describedby={
                    activeErrors.name ? "customer-name-error" : undefined
                  }
                  className={cn(activeErrors.name && FIELD_ERROR_CLASS)}
                  onChange={() =>
                    setFieldErrors((prev) => ({ ...prev, name: undefined }))
                  }
                />
                <FieldError id="customer-name-error" error={activeErrors.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={createValues?.email ?? ""}
                  aria-invalid={Boolean(activeErrors.email)}
                  aria-describedby={
                    activeErrors.email ? "customer-email-error" : undefined
                  }
                  className={cn(activeErrors.email && FIELD_ERROR_CLASS)}
                  onChange={() =>
                    setFieldErrors((prev) => ({ ...prev, email: undefined }))
                  }
                />
                <FieldError
                  id="customer-email-error"
                  error={activeErrors.email}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={createValues?.phone ?? ""}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  rows={2}
                  defaultValue={createValues?.address ?? ""}
                />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button
                  type="button"
                  variant="outline"
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
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              Customers
            </h1>
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
                    <Form
                      method="post"
                      id={`delete-customer-${customer.id}`}
                      className="hidden"
                    >
                      <input
                        type="hidden"
                        name="intent"
                        value="delete-customer"
                      />
                      <input type="hidden" name="id" value={customer.id} />
                    </Form>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setPendingDelete({
                          id: customer.id,
                          name: customer.name,
                        })
                      }
                    >
                      Delete
                    </Button>
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
                    <Button type="submit" variant="outline">
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
