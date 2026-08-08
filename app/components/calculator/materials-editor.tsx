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

type Props = {
  technology: Technology;
  materials: MaterialLine[];
  inventory: InventoryMaterial[];
  defaultPrice: number;
  onChange: (materials: MaterialLine[]) => void;
};

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
      createEmptyMaterial(technology, defaultPrice, `Material ${materials.length + 1}`),
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Materials</Label>
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus />
          Add material
        </Button>
      </div>
      {materials.map((line) => (
        <div
          key={line.id}
          className="grid gap-2 rounded-lg border border-[var(--color-line)] p-3 sm:grid-cols-12"
        >
          <div className="space-y-1.5 sm:col-span-4">
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
                  <SelectValue placeholder="Pick material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  {inv.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
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
              placeholder="Material type"
              allowCustom
            />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
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
          <div className="space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Weight / volume ({unitLabel})</Label>
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
          <div className="flex items-end sm:col-span-2">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              disabled={materials.length <= 1}
              onClick={() => remove(line.id)}
              aria-label="Remove material"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}
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
