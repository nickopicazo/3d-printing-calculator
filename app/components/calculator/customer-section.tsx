import { Button } from "~/components/ui/button";
import { Combobox } from "~/components/ui/combobox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { CustomerDraft, SavedCustomer } from "~/lib/calculator-types";

type Props = {
  customer: CustomerDraft;
  saved: SavedCustomer[];
  loggedIn: boolean;
  saving?: boolean;
  onChange: (customer: CustomerDraft) => void;
  onSave?: () => void;
};

export function CustomerSection({
  customer,
  saved,
  loggedIn,
  saving,
  onChange,
  onSave,
}: Props) {
  const options = saved.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">Customer</h3>
        {loggedIn && onSave ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving || !customer.name.trim()}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save customer"}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Customer name</Label>
          {saved.length > 0 ? (
            <Combobox
              options={options}
              value={customer.id ?? customer.name}
              onChange={(v) => {
                const found = saved.find((c) => c.id === v);
                if (found) {
                  onChange({
                    id: found.id,
                    name: found.name,
                    email: found.email ?? "",
                    phone: found.phone ?? "",
                    address: found.address ?? "",
                  });
                } else {
                  onChange({ ...customer, id: null, name: v });
                }
              }}
              placeholder="Select or type name"
              allowCustom
            />
          ) : (
            <Input
              value={customer.name}
              onChange={(e) =>
                onChange({ ...customer, id: null, name: e.target.value })
              }
              placeholder="Customer name"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cust-email">Email</Label>
          <Input
            id="cust-email"
            type="email"
            value={customer.email}
            onChange={(e) => onChange({ ...customer, email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cust-phone">Phone</Label>
          <Input
            id="cust-phone"
            value={customer.phone}
            onChange={(e) => onChange({ ...customer, phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cust-address">Address</Label>
          <Textarea
            id="cust-address"
            rows={2}
            value={customer.address}
            onChange={(e) => onChange({ ...customer, address: e.target.value })}
          />
        </div>
      </div>
      {!loggedIn ? (
        <p className="text-xs text-[var(--color-ink-muted)]">
          Sign in to save customers to your account.
        </p>
      ) : null}
    </div>
  );
}
