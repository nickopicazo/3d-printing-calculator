import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import {
  createEmptyAddon,
  type AddonLine,
} from "~/lib/pricing";

type Props = {
  addons: AddonLine[];
  currencySymbol: string;
  onChange: (addons: AddonLine[]) => void;
};

export function AddonsEditor({
  addons,
  currencySymbol,
  onChange,
}: Props) {
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
    <div className="space-y-2">
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
          className="size-4 shrink-0 text-[var(--color-ink)]"
          aria-hidden
        />
        <span className="text-base font-semibold leading-none text-[var(--color-ink)]">
          Addons
        </span>
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]/40 p-3 sm:p-4">
        {addons.length > 0 ? (
          <div className="space-y-3">
            <div
              className="hidden items-end gap-2 sm:flex"
              aria-hidden
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-[var(--color-ink-muted)]">
                  Item Name
                </span>
              </div>
              <div className="w-20 shrink-0">
                <span className="text-xs font-medium text-[var(--color-ink-muted)]">
                  Qty
                </span>
              </div>
              <div className="w-28 shrink-0">
                <span className="text-xs font-medium text-[var(--color-ink-muted)]">
                  Cost
                </span>
              </div>
              <div className="size-9 shrink-0" />
            </div>

            {addons.map((line) => {
              const nameId = `addon-name-${line.id}`;
              const qtyId = `addon-qty-${line.id}`;
              const costId = `addon-cost-${line.id}`;
              return (
                <div
                  key={line.id}
                  className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1 basis-full space-y-1 sm:basis-auto sm:space-y-0">
                    <Label htmlFor={nameId} className="text-xs sm:sr-only">
                      Item Name
                    </Label>
                    <Input
                      id={nameId}
                      value={line.name}
                      onChange={(e) =>
                        update(line.id, { name: e.target.value })
                      }
                      placeholder="e.g. Packaging"
                    />
                  </div>
                  <div className="w-[calc(50%-1.75rem)] space-y-1 sm:w-20 sm:shrink-0 sm:space-y-0">
                    <Label htmlFor={qtyId} className="text-xs sm:sr-only">
                      Qty
                    </Label>
                    <Input
                      id={qtyId}
                      type="number"
                      min={0}
                      value={line.quantity}
                      onChange={(e) =>
                        update(line.id, {
                          quantity: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="w-[calc(50%-1.75rem)] space-y-1 sm:w-28 sm:shrink-0 sm:space-y-0">
                    <Label htmlFor={costId} className="text-xs sm:sr-only">
                      Cost
                    </Label>
                    <MoneyInput
                      id={costId}
                      currencySymbol={currencySymbol}
                      value={line.unitCost}
                      onChange={(e) =>
                        update(line.id, {
                          unitCost: Number(e.target.value) || 0,
                        })
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
          </div>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">
            No addons yet. Add packaging, hardware, or other extras.
          </p>
        )}

        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus />
          Add addon
        </Button>
      </div>
    </div>
  );
}
