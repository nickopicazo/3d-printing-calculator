import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Combobox } from "~/components/ui/combobox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  onChange: (materials: MaterialLine[]) => void;
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

function colorInputValue(color: string | null | undefined): string {
  return normalizeHex(color) ?? "#CCCCCC";
}

export function MaterialsEditor({
  technology,
  materials,
  inventory,
  defaultPrice,
  onChange,
}: Props) {
  const presets =
    technology === "sla" ? [...SLA_MATERIALS] : [...FDM_MATERIALS];
  const unitLabel = technology === "sla" ? "ml" : "g";
  const priceLabel = technology === "sla" ? "Cost / L" : "Cost / kg";
  const kind = technology === "sla" ? "resin" : "filament";
  const inv = inventory.filter((m) => m.kind === kind);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Materials</Label>
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus />
          Add Material
        </Button>
      </div>
      {materials.map((line) => {
        const hex = normalizeHex(line.color);
        return (
          <div
            key={line.id}
            className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]/40 p-3 sm:p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-[1.4] space-y-1.5">
                <Label className="text-xs">Material</Label>
                {inv.length > 0 ? (
                  <Select
                    value={line.inventoryMaterialId ?? "custom"}
                    onValueChange={(v) => {
                      if (v === "custom") {
                        update(line.id, { inventoryMaterialId: null });
                        return;
                      }
                      const found = inv.find((i) => i.id === v);
                      if (found) {
                        update(line.id, {
                          inventoryMaterialId: found.id,
                          label: found.name,
                          type: found.type,
                          color: found.color,
                          pricePerUnit: found.pricePerUnit,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick Material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      {inv.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          <span className="inline-flex items-center gap-2">
                            {normalizeHex(i.color) ? (
                              <span
                                className="inline-block size-3 rounded-full ring-1 ring-black/10"
                                style={{
                                  backgroundColor: normalizeHex(i.color)!,
                                }}
                              />
                            ) : null}
                            {i.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Combobox
                    options={presets.map((p) => ({ value: p, label: p }))}
                    value={line.type || line.label}
                    onChange={(v) =>
                      update(line.id, {
                        type: v,
                        label: v,
                        inventoryMaterialId: null,
                      })
                    }
                    placeholder="Material Type"
                    allowCustom
                  />
                )}
                {inv.length > 0 && !line.inventoryMaterialId ? (
                  <Combobox
                    options={presets.map((p) => ({ value: p, label: p }))}
                    value={line.type || line.label}
                    onChange={(v) =>
                      update(line.id, {
                        type: v,
                        label: v,
                        inventoryMaterialId: null,
                      })
                    }
                    placeholder="Material Type"
                    allowCustom
                  />
                ) : null}
              </div>

              <div className="w-full space-y-1.5 sm:w-[9.5rem]">
                <Label className="text-xs">Color</Label>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[#fafafa] px-2">
                  <label
                    className={cn(
                      "relative size-6 shrink-0 overflow-hidden rounded-md border border-[var(--color-line)]",
                      !hex &&
                        "bg-[repeating-conic-gradient(#ddd_0_25%,#fff_0_50%)] bg-[length:8px_8px]",
                    )}
                    title="Pick Color"
                  >
                    <input
                      type="color"
                      aria-label="Color"
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
                      />
                    ) : null}
                  </label>
                  <input
                    value={line.color ?? ""}
                    onChange={(e) =>
                      update(line.id, {
                        color: e.target.value || null,
                        inventoryMaterialId: null,
                      })
                    }
                    placeholder="#FFFFFF"
                    className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase outline-none placeholder:text-[var(--color-ink-muted)]/60"
                  />
                </div>
              </div>

              <div className="w-full space-y-1.5 sm:w-28">
                <Label className="text-xs">{priceLabel}</Label>
                <Input
                  type="number"
                  min={0}
                  value={line.pricePerUnit}
                  onChange={(e) =>
                    update(line.id, {
                      pricePerUnit: Number(e.target.value) || 0,
                      inventoryMaterialId: null,
                    })
                  }
                />
              </div>

              <div className="w-full space-y-1.5 sm:w-28">
                <Label className="text-xs">
                  {technology === "sla" ? "Volume" : "Weight"} ({unitLabel})
                </Label>
                <Input
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
                onClick={() => remove(line.id)}
                aria-label="Remove Material"
                className="shrink-0 self-end"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        );
      })}
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
