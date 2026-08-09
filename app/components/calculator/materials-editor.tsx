import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Combobox } from "~/components/ui/combobox";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import type { InventoryMaterial } from "~/lib/calculator-types";
import {
  createEmptyMaterial,
  createId,
  FDM_MATERIALS,
  SLA_MATERIALS,
  type MaterialLine,
  type Technology,
} from "~/lib/pricing";
import { cn } from "~/lib/utils";

type Props = {
  technology: Technology;
  materials: MaterialLine[];
  inventory: InventoryMaterial[];
  defaultPrice: number;
  currencySymbol: string;
  onChange: (materials: MaterialLine[]) => void;
};

const INV_PREFIX = "inv:";

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

function colorInputValue(color: string | null | undefined): string {
  return normalizeHex(color) ?? "#CCCCCC";
}

function inventoryOptionValue(id: string) {
  return `${INV_PREFIX}${id}`;
}

function parseInventoryOption(value: string): string | null {
  return value.startsWith(INV_PREFIX) ? value.slice(INV_PREFIX.length) : null;
}

export function MaterialsEditor({
  technology,
  materials,
  inventory,
  defaultPrice,
  currencySymbol,
  onChange,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const presets =
    technology === "sla" ? [...SLA_MATERIALS] : [...FDM_MATERIALS];
  const unitLabel = technology === "sla" ? "ml" : "g";
  const priceLabel = technology === "sla" ? "Cost / L" : "Cost / kg";
  const kind = technology === "sla" ? "resin" : "filament";
  const inv = inventory.filter((m) => m.kind === kind);

  const materialOptions = [
    ...inv.map((i) => ({
      value: inventoryOptionValue(i.id),
      label: i.name,
      keywords: [i.type, i.color].filter(Boolean).join(" "),
      group: "Your materials",
    })),
    ...presets
      .filter(
        (p) =>
          !inv.some(
            (i) =>
              i.name.toLowerCase() === p.toLowerCase() ||
              (i.type ?? "").toLowerCase() === p.toLowerCase(),
          ),
      )
      .map((p) => ({
        value: p,
        label: p,
        group: "Material types",
      })),
  ];

  function update(id: string, patch: Partial<MaterialLine>) {
    onChange(materials.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function remove(id: string) {
    if (materials.length <= 1) return;
    onChange(materials.filter((m) => m.id !== id));
  }

  function add() {
    onChange([
      ...materials,
      createEmptyMaterial(
        technology,
        defaultPrice,
        `Material ${materials.length + 1}`,
      ),
    ]);
  }

  function selectMaterial(lineId: string, value: string) {
    const inventoryId = parseInventoryOption(value);
    if (inventoryId) {
      const found = inv.find((i) => i.id === inventoryId);
      if (found) {
        update(lineId, {
          inventoryMaterialId: found.id,
          label: found.name,
          type: found.type,
          color: found.color,
          pricePerUnit: found.pricePerUnit,
        });
        return;
      }
    }
    update(lineId, {
      inventoryMaterialId: null,
      type: value,
      label: value,
    });
  }

  return (
    <div className="space-y-4">
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        title="Remove Material"
        description={
          pendingDelete
            ? `Remove “${pendingDelete.name || "this material"}”?`
            : ""
        }
        confirmLabel="Remove"
        confirmingLabel="Removing…"
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      <div>
        <Label>Materials</Label>
        {inv.length === 0 ? (
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            No saved {kind}. Pick a type or{" "}
            <a
              href="/materials"
              className="font-semibold text-[var(--color-accent-deep)] hover:underline"
            >
              add inventory
            </a>
            .
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Choose from{" "}
            <span className="font-medium text-[var(--color-ink)]">
              Your materials
            </span>
            , a type, or enter a custom name.
          </p>
        )}
      </div>
      {materials.map((line) => {
        const hex = normalizeHex(line.color);
        const selectedValue = line.inventoryMaterialId
          ? inventoryOptionValue(line.inventoryMaterialId)
          : line.type || line.label;
        const priceId = `price-${line.id}`;
        const qtyId = `qty-${line.id}`;
        const materialId = `material-${line.id}`;
        const colorTextId = `color-text-${line.id}`;

        return (
          <div
            key={line.id}
            className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]/40 p-3 sm:p-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-[1.4] space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor={materialId} className="text-xs">
                    Material
                  </Label>
                  {line.inventoryMaterialId ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                      Your materials
                    </span>
                  ) : null}
                </div>
                <Combobox
                  id={materialId}
                  aria-label={`Material ${line.label || line.type || ""}`.trim()}
                  options={materialOptions}
                  value={selectedValue}
                  onChange={(v) => selectMaterial(line.id, v)}
                  placeholder={
                    inv.length > 0 ? "Select material…" : "Material Type"
                  }
                  searchPlaceholder={
                    inv.length > 0
                      ? "Search your materials or type…"
                      : "Search type…"
                  }
                  emptyText="No materials found."
                  allowCustom
                />
              </div>

              <div className="w-full space-y-2 sm:w-[9.5rem]">
                <Label htmlFor={colorTextId} className="text-xs">
                  Color
                </Label>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-field)] px-2">
                  <label
                    className={cn(
                      "relative size-6 shrink-0 overflow-hidden rounded-md border border-[var(--color-line)]",
                      !hex &&
                        "bg-[repeating-conic-gradient(#ddd_0_25%,#fff_0_50%)] bg-[length:8px_8px]",
                    )}
                    title="Pick Color"
                  >
                    <span className="sr-only">Pick color</span>
                    <input
                      type="color"
                      aria-label={`Color picker for ${line.label || "material"}`}
                      value={colorInputValue(line.color)}
                      onChange={(e) =>
                        update(line.id, {
                          color: e.target.value.toUpperCase(),
                          inventoryMaterialId: null,
                        })
                      }
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    {hex ? (
                      <span
                        className="block size-full"
                        style={{ backgroundColor: hex }}
                        aria-hidden
                      />
                    ) : null}
                  </label>
                  <input
                    id={colorTextId}
                    value={line.color ?? ""}
                    onChange={(e) =>
                      update(line.id, {
                        color: e.target.value || null,
                        inventoryMaterialId: null,
                      })
                    }
                    placeholder="#FFFFFF"
                    aria-label={`Color hex for ${line.label || "material"}`}
                    className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase outline-none placeholder:text-[var(--color-ink-muted)]/60"
                  />
                </div>
              </div>

              <div className="w-full space-y-2 sm:w-32">
                <Label htmlFor={priceId} className="text-xs">
                  {priceLabel}
                </Label>
                <MoneyInput
                  id={priceId}
                  currencySymbol={currencySymbol}
                  value={line.pricePerUnit}
                  onChange={(e) =>
                    update(line.id, {
                      pricePerUnit: Number(e.target.value) || 0,
                      inventoryMaterialId: null,
                    })
                  }
                />
              </div>

              <div className="w-full space-y-2 sm:w-28">
                <Label htmlFor={qtyId} className="text-xs">
                  {technology === "sla" ? "Volume" : "Weight"} ({unitLabel})
                </Label>
                <Input
                  id={qtyId}
                  type="number"
                  min={0}
                  step="0.1"
                  value={line.quantity}
                  onChange={(e) =>
                    update(line.id, { quantity: Number(e.target.value) || 0 })
                  }
                />
              </div>

              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={materials.length <= 1}
                onClick={() =>
                  setPendingDelete({
                    id: line.id,
                    name: (line.label || line.type).trim(),
                  })
                }
                aria-label="Remove Material"
                className="shrink-0 self-end"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        );
      })}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus />
        Add Material
      </Button>
    </div>
  );
}

export function remapMaterialsForTech(
  materials: MaterialLine[],
  technology: Technology,
  defaultPrice: number,
): MaterialLine[] {
  const unit = technology === "sla" ? "ml" : "g";
  if (materials.length === 0) {
    return [createEmptyMaterial(technology, defaultPrice)];
  }
  return materials.map((m) => ({
    ...m,
    id: m.id || createId("mat"),
    unit,
    pricePerUnit: m.pricePerUnit || defaultPrice,
    inventoryMaterialId: null,
  }));
}
