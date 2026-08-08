import { and, desc, eq } from "drizzle-orm";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/filaments";
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
import { filaments } from "~/db/schema";
import { newId, requireUser } from "~/lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Filaments · Print Quote" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const rows = await db
    .select()
    .from(filaments)
    .where(eq(filaments.userId, session.user.id))
    .orderBy(desc(filaments.updatedAt));
  return { filaments: rows };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireUser(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "create") {
    const name = String(form.get("name") ?? "").trim();
    const type = String(form.get("type") ?? "").trim() || null;
    const color = String(form.get("color") ?? "").trim() || null;
    const pricePerKg = Number(form.get("pricePerKg"));
    if (!name || !Number.isFinite(pricePerKg) || pricePerKg < 0) {
      return { error: "Name and a valid price per kg are required." };
    }
    await db.insert(filaments).values({
      id: newId(),
      userId: session.user.id,
      name,
      type,
      color,
      pricePerKg,
    });
    return redirect("/filaments");
  }

  if (intent === "update") {
    const id = String(form.get("id") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const type = String(form.get("type") ?? "").trim() || null;
    const color = String(form.get("color") ?? "").trim() || null;
    const pricePerKg = Number(form.get("pricePerKg"));
    if (!id || !name || !Number.isFinite(pricePerKg) || pricePerKg < 0) {
      return { error: "Invalid filament update." };
    }
    await db
      .update(filaments)
      .set({
        name,
        type,
        color,
        pricePerKg,
        updatedAt: new Date(),
      })
      .where(and(eq(filaments.id, id), eq(filaments.userId, session.user.id)));
    return redirect("/filaments");
  }

  if (intent === "delete") {
    const id = String(form.get("id") ?? "");
    if (id) {
      await db
        .delete(filaments)
        .where(and(eq(filaments.id, id), eq(filaments.userId, session.user.id)));
    }
    return redirect("/filaments");
  }

  return { error: "Unknown action." };
}

export default function FilamentsPage() {
  const { filaments: rows } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 animate-fade-up">
        <h1 className="font-display text-3xl font-extrabold">Filaments</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Store your materials and prices, then pick them when building a quote.
        </p>
      </header>

      <Card className="mb-8 animate-fade-up-delay">
        <CardHeader>
          <CardTitle>Add filament</CardTitle>
          <CardDescription>Name, type, color, and ₱/kg (or your currency).</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="intent" value="create" />
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Bambu PETG Beige" />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input id="type" name="type" placeholder="PETG" />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" placeholder="#D3C5A3" />
            </div>
            <div>
              <Label htmlFor="pricePerKg">Price / kg</Label>
              <Input
                id="pricePerKg"
                name="pricePerKg"
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
              <Button type="submit">Save filament</Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No filaments yet.</p>
        ) : (
          rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="pt-5">
                <Form method="post" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <input type="hidden" name="id" value={row.id} />
                  <div>
                    <Label>Name</Label>
                    <Input name="name" defaultValue={row.name} required />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Input name="type" defaultValue={row.type ?? ""} />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      {row.color ? (
                        <span
                          className="mt-2 h-6 w-6 shrink-0 rounded-md border border-[var(--color-line)]"
                          style={{ background: row.color }}
                          aria-hidden
                        />
                      ) : null}
                      <Input name="color" defaultValue={row.color ?? ""} />
                    </div>
                  </div>
                  <div>
                    <Label>Price / kg</Label>
                    <Input
                      name="pricePerKg"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={row.pricePerKg}
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
