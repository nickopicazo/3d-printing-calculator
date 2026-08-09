import { and, desc, eq } from "drizzle-orm";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { Combobox } from "~/components/ui/combobox";
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
import { MoneyInput } from "~/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db } from "~/db/index.server";
import { materials } from "~/db/schema";
import { withParentMeta } from "~/lib/seo";
import {
  FDM_MATERIALS,
  formatMoney,
  SLA_MATERIALS,
} from "~/lib/pricing";
import { newId, requireUser } from "~/lib/session.server";
import { DEFAULT_SETTINGS } from "~/lib/settings";
import { cn } from "~/lib/utils";

const FIELD_ERROR_CLASS =
  "border-[#e8c4be] focus:border-[#a33b2b] focus:shadow-[0_0_0_3px_rgba(163,59,43,0.15)]";

type MaterialFieldErrors = {
  name?: string;
  type?: string;
  pricePerUnit?: string;
  color?: string;
};

type MaterialFormValues = {
  name: string;
  kind: string;
  type: string;
  color: string;
  pricePerUnit: string;
};

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

function parseMaterialForm(form: FormData): {
  values: MaterialFormValues;
  kind: "filament" | "resin";
  price: number;
  color: string | null;
  errors: MaterialFieldErrors;
} {
  const name = String(form.get("name") ?? "").trim();
  const kindRaw = String(form.get("kind") ?? "filament");
  const kind = kindRaw === "resin" ? "resin" : "filament";
  const type = String(form.get("type") ?? "").trim();
  const colorRaw = String(form.get("color") ?? "").trim();
  const priceRaw = String(form.get("pricePerUnit") ?? "").trim();
  const price = priceRaw === "" ? NaN : Number(priceRaw);

  const errors: MaterialFieldErrors = {};
  if (!name) errors.name = "Name is required.";
  if (!type) errors.type = "Type is required.";
  if (!priceRaw) errors.pricePerUnit = "Price is required.";
  else if (!Number.isFinite(price) || price < 0) {
    errors.pricePerUnit = "Enter a valid price (0 or greater).";
  }
  if (colorRaw && !normalizeHex(colorRaw)) {
    errors.color = "Use a hex color like #000000.";
  }

  return {
    values: {
      name,
      kind,
      type,
      color: colorRaw,
      pricePerUnit: priceRaw,
    },
    kind,
    price,
    color: colorRaw ? normalizeHex(colorRaw) ?? colorRaw : null,
    errors,
  };
}

export function meta({ matches }: Route.MetaArgs) {
  return withParentMeta(matches, [
    { title: "Materials · 3D Printing Calculator" },
    { name: "robots", content: "noindex,nofollow" },
  ]);
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
    const parsed = parseMaterialForm(form);
    if (Object.keys(parsed.errors).length > 0) {
      return { createErrors: parsed.errors, createValues: parsed.values };
    }
    await db.insert(materials).values({
      id: newId(),
      userId: session.user.id,
      name: parsed.values.name,
      kind: parsed.kind,
      type: parsed.values.type,
      color: parsed.color,
      pricePerUnit: parsed.price,
    });
    return redirect("/materials");
  }

  if (intent === "update") {
    const id = String(form.get("id") ?? "");
    const parsed = parseMaterialForm(form);
    if (!id) return { error: "Invalid material update." };
    if (Object.keys(parsed.errors).length > 0) {
      return {
        updateErrors: parsed.errors,
        updateValues: parsed.values,
        updateId: id,
      };
    }
    await db
      .update(materials)
      .set({
        name: parsed.values.name,
        kind: parsed.kind,
        type: parsed.values.type,
        color: parsed.color,
        pricePerUnit: parsed.price,
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

function ColorField({
  id,
  name,
  defaultValue,
  error,
  onValueChange,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  error?: string;
  onValueChange?: () => void;
}) {
  const initial = normalizeHex(defaultValue) ?? defaultValue?.trim() ?? "";
  const [hex, setHex] = useState(initial);
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="color"
          aria-label="Color swatch"
          className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-[var(--color-line)] bg-[var(--color-field)] p-1"
          value={normalizeHex(hex) ?? "#CCCCCC"}
          onChange={(e) => {
            setHex(e.target.value.toUpperCase());
            onValueChange?.();
          }}
        />
        <Input
          id={id}
          name={name}
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            onValueChange?.();
          }}
          placeholder="#000000"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn("font-mono uppercase", error && FIELD_ERROR_CLASS)}
        />
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-[#a33b2b]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function KindSelect({
  id,
  name,
  defaultValue,
  value: valueProp,
  onValueChange,
  detailed,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  detailed?: boolean;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "filament");
  const value = valueProp ?? internal;

  function setValue(next: string) {
    setInternal(next);
    onValueChange?.(next);
  }

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

function MaterialTypeField({
  id,
  name,
  kind,
  defaultValue,
  extraTypes = [],
  error,
  onValueChange,
}: {
  id: string;
  name: string;
  kind: string;
  defaultValue?: string | null;
  extraTypes?: string[];
  error?: string;
  onValueChange?: () => void;
}) {
  const [value, setValue] = useState(defaultValue?.trim() ?? "");
  const presets = kind === "resin" ? [...SLA_MATERIALS] : [...FDM_MATERIALS];
  const presetSet = new Set(presets.map((t) => t.toLowerCase()));
  const customExtras = Array.from(
    new Set(
      [...extraTypes, value]
        .map((t) => t.trim())
        .filter((t) => t && !presetSet.has(t.toLowerCase())),
    ),
  );
  const options = [
    ...presets.map((t) => ({ value: t, label: t })),
    ...customExtras.map((t) => ({ value: t, label: t })),
  ];
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={value} />
      <Combobox
        id={id}
        options={options}
        value={value}
        onChange={(next) => {
          setValue(next);
          onValueChange?.();
        }}
        placeholder="Select or type…"
        searchPlaceholder="Search or add type…"
        emptyText="No types found."
        allowCustom
        aria-label="Material type"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="text-xs text-[#a33b2b]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="text-xs text-[#a33b2b]">
      {error}
    </p>
  );
}

export default function MaterialsPage() {
  const { materials: rows } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState("filament");
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState("filament");
  const [addErrors, setAddErrors] = useState<MaterialFieldErrors>({});
  const [editErrors, setEditErrors] = useState<MaterialFieldErrors>({});
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const currencyCode = DEFAULT_SETTINGS.currencyCode;
  const currencySymbol = DEFAULT_SETTINGS.currencySymbol;
  const createErrors =
    actionData && "createErrors" in actionData && actionData.createErrors
      ? actionData.createErrors
      : null;
  const createValues =
    actionData && "createValues" in actionData && actionData.createValues
      ? actionData.createValues
      : null;
  const updateErrors =
    actionData && "updateErrors" in actionData && actionData.updateErrors
      ? actionData.updateErrors
      : null;
  const updateId =
    actionData && "updateId" in actionData && actionData.updateId
      ? actionData.updateId
      : null;
  const updateValues =
    actionData && "updateValues" in actionData && actionData.updateValues
      ? actionData.updateValues
      : null;
  const knownTypes = rows
    .map((row) => row.type?.trim() ?? "")
    .filter(Boolean);
  const activeAddErrors = { ...createErrors, ...addErrors };
  const activeEditErrors =
    updateId && editingId === updateId
      ? { ...updateErrors, ...editErrors }
      : editErrors;

  useEffect(() => {
    if (createErrors) {
      setAddOpen(true);
      setAddErrors({});
      if (createValues?.kind) setAddKind(createValues.kind);
    }
  }, [createErrors, createValues]);

  useEffect(() => {
    if (updateId && updateErrors) {
      setEditingId(updateId);
      setEditErrors({});
      if (updateValues?.kind) setEditKind(updateValues.kind);
    }
  }, [updateId, updateErrors, updateValues]);

  // Same-route redirect keeps local dialog/edit state; close after a successful save.
  const wasSubmitting = useRef(false);
  useEffect(() => {
    if (navigation.state === "submitting") {
      wasSubmitting.current = true;
      return;
    }
    if (navigation.state !== "idle" || !wasSubmitting.current) return;
    wasSubmitting.current = false;
    if (createErrors || updateErrors) return;
    setAddOpen(false);
    setAddKind("filament");
    setAddErrors({});
    setEditingId(null);
    setEditErrors({});
    setPendingDelete(null);
  }, [navigation.state, createErrors, updateErrors]);

  function validateMaterialSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const parsed = parseMaterialForm(new FormData(form));
    return parsed.errors;
  }

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

        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) {
              setAddKind("filament");
              setAddErrors({});
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Material</DialogTitle>
              <DialogDescription>
                Set a unit price once, then pick it from the calculator.
              </DialogDescription>
            </DialogHeader>
            <Form
              method="post"
              className="grid gap-4 sm:grid-cols-2"
              key={
                createValues
                  ? `add-error-${createValues.name}-${createValues.type}`
                  : addOpen
                    ? "add-open"
                    : "add-closed"
              }
              noValidate
              onSubmit={(event) => {
                const errors = validateMaterialSubmit(event);
                if (Object.keys(errors).length > 0) {
                  event.preventDefault();
                  setAddErrors(errors);
                }
              }}
            >
              <input type="hidden" name="intent" value="create" />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">
                  Name <span className="text-[#a33b2b]">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={createValues?.name ?? ""}
                  placeholder="Bambu PETG HF"
                  aria-invalid={Boolean(activeAddErrors.name)}
                  aria-describedby={
                    activeAddErrors.name ? "name-error" : undefined
                  }
                  className={cn(activeAddErrors.name && FIELD_ERROR_CLASS)}
                  onChange={() =>
                    setAddErrors((prev) => ({ ...prev, name: undefined }))
                  }
                />
                <FieldError id="name-error" error={activeAddErrors.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kind">Kind</Label>
                <KindSelect
                  id="kind"
                  name="kind"
                  value={addKind}
                  onValueChange={setAddKind}
                  detailed
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">
                  Type <span className="text-[#a33b2b]">*</span>
                </Label>
                <MaterialTypeField
                  id="type"
                  name="type"
                  kind={addKind}
                  defaultValue={createValues?.type ?? ""}
                  extraTypes={knownTypes}
                  error={activeAddErrors.type}
                  onValueChange={() =>
                    setAddErrors((prev) => ({ ...prev, type: undefined }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="color">Color</Label>
                <ColorField
                  id="color"
                  name="color"
                  defaultValue={createValues?.color ?? ""}
                  error={activeAddErrors.color}
                  onValueChange={() =>
                    setAddErrors((prev) => ({ ...prev, color: undefined }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pricePerUnit">
                  Price / Unit <span className="text-[#a33b2b]">*</span>
                </Label>
                <MoneyInput
                  id="pricePerUnit"
                  name="pricePerUnit"
                  currencySymbol={currencySymbol}
                  defaultValue={createValues?.pricePerUnit ?? ""}
                  placeholder="750"
                  aria-invalid={Boolean(activeAddErrors.pricePerUnit)}
                  aria-describedby={
                    activeAddErrors.pricePerUnit
                      ? "pricePerUnit-error"
                      : undefined
                  }
                  className={cn(
                    activeAddErrors.pricePerUnit && FIELD_ERROR_CLASS,
                  )}
                  onChange={() =>
                    setAddErrors((prev) => ({
                      ...prev,
                      pricePerUnit: undefined,
                    }))
                  }
                />
                <FieldError
                  id="pricePerUnit-error"
                  error={activeAddErrors.pricePerUnit}
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
                  Save Material
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>

        <header className="mb-6 flex flex-col gap-4 animate-fade-up sm:mb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Materials</h1>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)] sm:text-base">
              Filament and resin inventory for the calculator.
            </p>
          </div>
          <Button
            type="button"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            <Plus />
            Add Material
          </Button>
        </header>

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
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center sm:px-6">
              <p className="text-sm text-[var(--color-ink-muted)]">
                Add filament or resin to reuse prices in quotes.
              </p>
              <Button type="button" onClick={() => setAddOpen(true)}>
                <Plus />
                Add Material
              </Button>
            </div>
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
                        noValidate
                        onSubmit={(event) => {
                          const errors = validateMaterialSubmit(event);
                          if (Object.keys(errors).length > 0) {
                            event.preventDefault();
                            setEditErrors(errors);
                            return;
                          }
                          setEditErrors({});
                        }}
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="intent" value="update" />
                        <div className="space-y-1.5">
                          <Label htmlFor={`name-${row.id}`}>
                            Name <span className="text-[#a33b2b]">*</span>
                          </Label>
                          <Input
                            id={`name-${row.id}`}
                            name="name"
                            defaultValue={
                              updateId === row.id && updateValues
                                ? updateValues.name
                                : row.name
                            }
                            aria-invalid={Boolean(activeEditErrors.name)}
                            aria-describedby={
                              activeEditErrors.name
                                ? `name-${row.id}-error`
                                : undefined
                            }
                            className={cn(
                              activeEditErrors.name && FIELD_ERROR_CLASS,
                            )}
                            onChange={() =>
                              setEditErrors((prev) => ({
                                ...prev,
                                name: undefined,
                              }))
                            }
                          />
                          <FieldError
                            id={`name-${row.id}-error`}
                            error={activeEditErrors.name}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`kind-${row.id}`}>Kind</Label>
                          <KindSelect
                            id={`kind-${row.id}`}
                            name="kind"
                            defaultValue={row.kind}
                            value={editKind}
                            onValueChange={setEditKind}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`type-${row.id}`}>
                            Type <span className="text-[#a33b2b]">*</span>
                          </Label>
                          <MaterialTypeField
                            id={`type-${row.id}`}
                            name="type"
                            kind={editKind}
                            defaultValue={
                              updateId === row.id && updateValues
                                ? updateValues.type
                                : row.type
                            }
                            extraTypes={knownTypes}
                            error={activeEditErrors.type}
                            onValueChange={() =>
                              setEditErrors((prev) => ({
                                ...prev,
                                type: undefined,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`color-${row.id}`}>Color</Label>
                          <ColorField
                            id={`color-${row.id}`}
                            name="color"
                            defaultValue={
                              updateId === row.id && updateValues
                                ? updateValues.color
                                : row.color
                            }
                            error={activeEditErrors.color}
                            onValueChange={() =>
                              setEditErrors((prev) => ({
                                ...prev,
                                color: undefined,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`price-${row.id}`}>
                            Price / {unit}{" "}
                            <span className="text-[#a33b2b]">*</span>
                          </Label>
                          <MoneyInput
                            id={`price-${row.id}`}
                            name="pricePerUnit"
                            currencySymbol={currencySymbol}
                            defaultValue={
                              updateId === row.id && updateValues
                                ? updateValues.pricePerUnit
                                : row.pricePerUnit
                            }
                            aria-invalid={Boolean(
                              activeEditErrors.pricePerUnit,
                            )}
                            aria-describedby={
                              activeEditErrors.pricePerUnit
                                ? `price-${row.id}-error`
                                : undefined
                            }
                            className={cn(
                              activeEditErrors.pricePerUnit &&
                                FIELD_ERROR_CLASS,
                            )}
                            onChange={() =>
                              setEditErrors((prev) => ({
                                ...prev,
                                pricePerUnit: undefined,
                              }))
                            }
                          />
                          <FieldError
                            id={`price-${row.id}-error`}
                            error={activeEditErrors.pricePerUnit}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button type="submit" size="sm" disabled={busy}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setEditErrors({});
                            }}
                          >
                            <X />
                            Cancel
                          </Button>
                        </div>
                      </Form>
                    ) : (
                      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
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
                                    ? "bg-[rgba(111,82,240,0.12)] text-[var(--color-accent-deep)]"
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
                            {formatMoney(row.pricePerUnit, currencyCode)}
                            <span className="ml-1 text-xs font-semibold text-[var(--color-ink-muted)]">
                              /{unit}
                            </span>
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => {
                              setEditKind(row.kind);
                              setEditErrors({});
                              setEditingId(row.id);
                            }}
                          >
                            <Pencil />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="w-full sm:w-auto"
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
