import { and, desc, eq } from "drizzle-orm";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/materials";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db } from "~/db/index.server";
import { materials } from "~/db/schema";
import { formatMoney } from "~/lib/pricing";
import { newId, requireUser } from "~/lib/session.server";
import { DEFAULT_SETTINGS } from "~/lib/settings";
import { cn } from "~/lib/utils";

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

function normalizeHex(color: string | null | undefined): string | null {
  if (!color) return null;
  const raw = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, a, b, c] = raw;
    return `#${a}${a}${b}${b}${c}${c}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`.toUpperCase();
  return null;
}

function ColorField({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
}) {
  const initial = normalizeHex(defaultValue) ?? "";
  const [hex, setHex] = useState(initial);

  return (
    <div className="flex gap-2">
      <input
        type="color"
        aria-label="Color swatch"
        className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-[var(--color-line)] bg-[#fafafa] p-1"
        value={normalizeHex(hex) ?? "#CCCCCC"}
        onChange={(e) => setHex(e.target.value.toUpperCase())}
      />
      <Input
        id={id}
        name={name}
        value={hex}
        onChange={(e) => setHex(e.target.value)}
        placeholder="#000000"
        className="font-mono uppercase"
      />
    </div>
  );
}

function KindSelect({
  id,
  name,
  defaultValue,
  detailed,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  detailed?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "filament");

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="filament">
            {detailed ? "Filament (Per Kg)" : "Filament"}
          </SelectItem>
          <SelectItem value="resin">
            {detailed ? "Resin (Per L)" : "Resin"}
          </SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

export default function MaterialsPage() {
  const { materials: rows } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const currency = DEFAULT_SETTINGS.currencyCode;

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-4xl">
        <ConfirmDeleteDialog
          open={pendingDelete != null}
          title="Delete Material"
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
              `delete-material-${pendingDelete.id}`,
            ) as HTMLFormElement | null;
            form?.requestSubmit();
          }}
        />

        <header className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl font-extrabold">Materials</h1>
          <p className="mt-2 text-[var(--color-ink-muted)]">
            Filament and resin inventory for the calculator.
          </p>
        </header>

        <section className="dash-card mb-8 animate-fade-up space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold">Add Material</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Set a unit price once, then pick it from the calculator.
            </p>
          </div>
          <Form method="post" className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="intent" value="create" />
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Bambu PETG HF"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kind">Kind</Label>
              <KindSelect id="kind" name="kind" detailed />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                name="type"
                placeholder="PETG / Standard Resin"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <ColorField id="color" name="color" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pricePerUnit">Price / Unit</Label>
              <Input
                id="pricePerUnit"
                name="pricePerUnit"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="750"
              />
            </div>
            {actionData && "error" in actionData && actionData.error ? (
              <p className="text-sm text-[#a33b2b] sm:col-span-2">
                {actionData.error}
              </p>
            ) : null}
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={busy}>
                <Plus />
                Save Material
              </Button>
            </div>
          </Form>
        </section>

        <section className="dash-card animate-fade-up overflow-hidden !p-0">
          <div className="border-b border-[var(--color-line)] px-5 py-4 sm:px-6">
            <h2 className="font-display text-lg font-bold">Inventory</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {rows.length === 0
                ? "No materials yet."
                : `${rows.length} material${rows.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--color-ink-muted)] sm:px-6">
              Add filament or resin above to reuse prices in quotes.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {rows.map((row) => {
                const hex = normalizeHex(row.color);
                const unit = row.kind === "resin" ? "L" : "kg";
                const editing = editingId === row.id;

                return (
                  <li key={row.id} className="px-5 py-4 sm:px-6">
                    <Form
                      id={`delete-material-${row.id}`}
                      method="post"
                      className="hidden"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="intent" value="delete" />
                    </Form>

                    {editing ? (
                      <Form
                        method="post"
                        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                        onSubmit={() => setEditingId(null)}
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="intent" value="update" />
                        <div className="space-y-1.5">
                          <Label htmlFor={`name-${row.id}`}>Name</Label>
                          <Input
                            id={`name-${row.id}`}
                            name="name"
                            defaultValue={row.name}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`kind-${row.id}`}>Kind</Label>
                          <KindSelect
                            id={`kind-${row.id}`}
                            name="kind"
                            defaultValue={row.kind}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`type-${row.id}`}>Type</Label>
                          <Input
                            id={`type-${row.id}`}
                            name="type"
                            defaultValue={row.type ?? ""}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`color-${row.id}`}>Color</Label>
                          <ColorField
                            id={`color-${row.id}`}
                            name="color"
                            defaultValue={row.color}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`price-${row.id}`}>
                            Price / {unit}
                          </Label>
                          <Input
                            id={`price-${row.id}`}
                            name="pricePerUnit"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={row.pricePerUnit}
                            required
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button type="submit" size="sm" disabled={busy}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingId(null)}
                          >
                            <X />
                            Cancel
                          </Button>
                        </div>
                      </Form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-4">
                        <span
                          className="size-11 shrink-0 rounded-2xl border border-[var(--color-line)] shadow-inner"
                          style={{ background: hex ?? "#E4E4E8" }}
                          title={hex ?? "No color"}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-display text-base font-bold">
                              {row.name}
                            </p>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                row.kind === "resin"
                                  ? "bg-[rgba(124,92,255,0.12)] text-[var(--color-accent-deep)]"
                                  : "bg-[var(--color-paper)] text-[var(--color-ink-muted)]",
                              )}
                            >
                              {row.kind === "resin" ? "Resin" : "Filament"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                            {row.type?.trim() || "No type"}
                            {hex ? ` · ${hex}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 font-display text-lg font-extrabold tabular-nums text-[var(--color-accent-deep)]">
                          {formatMoney(row.pricePerUnit, currency)}
                          <span className="ml-1 text-xs font-semibold text-[var(--color-ink-muted)]">
                            /{unit}
                          </span>
                        </p>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingId(row.id)}
                          >
                            <Pencil />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setPendingDelete({ id: row.id, name: row.name })
                            }
                          >
                            <Trash2 />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
