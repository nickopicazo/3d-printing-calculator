import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  createEmptyAddon,
  type AddonLine,
} from "~/lib/pricing";

type Props = {
  addons: AddonLine[];
  onChange: (addons: AddonLine[]) => void;
};

export function AddonsEditor({ addons, onChange }: Props) {
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  function update(id: string, patch: Partial<AddonLine>) {
    onChange(addons.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function remove(id: string) {
    onChange(addons.filter((a) => a.id !== id));
  }

  function add() {
    onChange([...addons, createEmptyAddon()]);
  }

  return (
    <div className="space-y-3">
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        title="Remove Addon"
        description={
          pendingDelete
            ? `Remove “${pendingDelete.name || "this addon"}”?`
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

      <div className="flex items-center gap-2">
        <Package
          className="size-4 text-[var(--color-ink)]"
          aria-hidden
        />
        <Label className="text-base font-semibold">Addons</Label>
      </div>

      {addons.map((line) => {
        const nameId = `addon-name-${line.id}`;
        const qtyId = `addon-qty-${line.id}`;
        const costId = `addon-cost-${line.id}`;
        return (
          <div
            key={line.id}
            className="flex flex-wrap items-end gap-2 sm:flex-nowrap"
          >
            <div className="min-w-0 flex-1 space-y-1.5 basis-full sm:basis-auto">
              <Label htmlFor={nameId} className="text-xs">
                Item Name
              </Label>
              <Input
                id={nameId}
                value={line.name}
                onChange={(e) => update(line.id, { name: e.target.value })}
                placeholder="e.g. Packaging"
              />
            </div>
            <div className="w-20 space-y-1.5 shrink-0">
              <Label htmlFor={qtyId} className="text-xs">
                Qty
              </Label>
              <Input
                id={qtyId}
                type="number"
                min={0}
                value={line.quantity}
                onChange={(e) =>
                  update(line.id, { quantity: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="w-24 space-y-1.5 shrink-0">
              <Label htmlFor={costId} className="text-xs">
                Cost
              </Label>
              <Input
                id={costId}
                type="number"
                min={0}
                step="0.01"
                value={line.unitCost}
                onChange={(e) =>
                  update(line.id, { unitCost: Number(e.target.value) || 0 })
                }
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() =>
                setPendingDelete({
                  id: line.id,
                  name: line.name.trim(),
                })
              }
              aria-label="Remove addon"
              className="shrink-0"
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}

      <Button type="button" size="sm" variant="secondary" onClick={add}>
        <Plus />
        Add addon
      </Button>
    </div>
  );
}
