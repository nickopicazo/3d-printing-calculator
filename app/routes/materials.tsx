import { and, desc, eq } from "drizzle-orm";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/materials";
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
import { materials } from "~/db/schema";
import { newId, requireUser } from "~/lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Materials · 3D Printing Calculator" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const rows = await db
    .select()
    .from(materials)
    .where(eq(materials.userId, session.user.id))
    .orderBy(desc(materials.updatedAt));
  return { materials: rows };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "create") {
    const name = String(form.get("name") ?? "").trim();
    const kind = String(form.get("kind") ?? "filament");
    const type = String(form.get("type") ?? "").trim() || null;
    const color = String(form.get("color") ?? "").trim() || null;
    const pricePerUnit = Number(form.get("pricePerUnit"));
    if (!name || !Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      return { error: "Name and a valid unit price are required." };
    }
    await db.insert(materials).values({
      id: newId(),
      userId: session.user.id,
      name,
      kind: kind === "resin" ? "resin" : "filament",
      type,
      color,
      pricePerUnit,
    });
    return redirect("/materials");
  }

  if (intent === "update") {
    const id = String(form.get("id") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const kind = String(form.get("kind") ?? "filament");
    const type = String(form.get("type") ?? "").trim() || null;
    const color = String(form.get("color") ?? "").trim() || null;
    const pricePerUnit = Number(form.get("pricePerUnit"));
    if (!id || !name || !Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      return { error: "Invalid material update." };
    }
    await db
      .update(materials)
      .set({
        name,
        kind: kind === "resin" ? "resin" : "filament",
        type,
        color,
        pricePerUnit,
        updatedAt: new Date(),
      })
      .where(and(eq(materials.id, id), eq(materials.userId, session.user.id)));
    return redirect("/materials");
  }

  if (intent === "delete") {
    const id = String(form.get("id") ?? "");
    if (id) {
      await db
        .delete(materials)
        .where(and(eq(materials.id, id), eq(materials.userId, session.user.id)));
    }
    return redirect("/materials");
  }

  return { error: "Unknown action." };
}

export default function MaterialsPage() {
  const { materials: rows } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 animate-fade-up">
        <h1 className="font-display text-3xl font-extrabold">Materials</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Filament (₱/kg) and resin (₱/L) inventory for the calculator.
        </p>
      </header>

      <Card className="mb-8 animate-fade-up-delay">
        <CardHeader>
          <CardTitle>Add material</CardTitle>
          <CardDescription>
            Choose filament or resin and set the unit price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="intent" value="create" />
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Bambu PETG" />
            </div>
            <div>
              <Label htmlFor="kind">Kind</Label>
              <select
                id="kind"
                name="kind"
                defaultValue="filament"
                className="flex h-10 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-3 text-sm"
              >
                <option value="filament">Filament (per kg)</option>
                <option value="resin">Resin (per L)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input id="type" name="type" placeholder="PETG / Standard Resin" />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" placeholder="#D3C5A3" />
            </div>
            <div>
              <Label htmlFor="pricePerUnit">Price / unit</Label>
              <Input
                id="pricePerUnit"
                name="pricePerUnit"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="650"
              />
            </div>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="text-sm text-[#a33b2b] sm:col-span-2">{actionData.error}</p>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit">Save material</Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No materials yet.</p>
        ) : (
          rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="pt-5">
                <Form method="post" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <input type="hidden" name="id" value={row.id} />
                  <div>
                    <Label>Name</Label>
                    <Input name="name" defaultValue={row.name} required />
                  </div>
                  <div>
                    <Label>Kind</Label>
                    <select
                      name="kind"
                      defaultValue={row.kind}
                      className="flex h-10 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-3 text-sm"
                    >
                      <option value="filament">Filament</option>
                      <option value="resin">Resin</option>
                    </select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Input name="type" defaultValue={row.type ?? ""} />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input name="color" defaultValue={row.color ?? ""} />
                  </div>
                  <div>
                    <Label>Price / {row.kind === "resin" ? "L" : "kg"}</Label>
                    <Input
                      name="pricePerUnit"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={row.pricePerUnit}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" name="intent" value="update" variant="secondary">
                      Update
                    </Button>
                    <Button type="submit" name="intent" value="delete" variant="destructive">
                      Delete
                    </Button>
                  </div>
                </Form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
