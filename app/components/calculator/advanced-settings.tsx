import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  suggestedMachineRate,
  type AppSettings,
} from "~/lib/settings";
import { cn } from "~/lib/utils";

type Props = {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  showSla: boolean;
};

export function AdvancedSettingsPanel({ settings, onChange, showSla }: Props) {
  const [open, setOpen] = useState(false);
  const suggested = suggestedMachineRate(settings);

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="dash-card !p-0 overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex w-full items-center justify-between rounded-none px-5 py-4 font-semibold"
        >
          Advanced Settings
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-[var(--color-line)] px-5 py-4">
        <p className="text-sm text-[var(--color-ink-muted)]">
          Optional. Leave blank (0) to exclude from the estimate — electricity,
          labor rate, failure uplift, and depreciation helpers.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="power-w">Power (W)</Label>
            <Input
              id="power-w"
              type="number"
              min={0}
              value={settings.powerWatts}
              onChange={(e) => set("powerWatts", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kwh">Electricity / kWh</Label>
            <Input
              id="kwh"
              type="number"
              min={0}
              step="0.01"
              value={settings.electricityPerKwh}
              onChange={(e) =>
                set("electricityPerKwh", Number(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="labor-rate">Labor Rate / Hour</Label>
            <Input
              id="labor-rate"
              type="number"
              min={0}
              value={settings.laborRatePerHour}
              onChange={(e) =>
                set("laborRatePerHour", Number(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="failure">Failure %</Label>
            <Input
              id="failure"
              type="number"
              min={0}
              value={settings.failurePercent}
              onChange={(e) =>
                set("failurePercent", Number(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="purchase">Printer Purchase Price</Label>
            <Input
              id="purchase"
              type="number"
              min={0}
              value={settings.printerPurchasePrice}
              onChange={(e) =>
                set("printerPurchasePrice", Number(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lifespan">Lifespan (Hours)</Label>
            <Input
              id="lifespan"
              type="number"
              min={1}
              value={settings.printerLifespanHours}
              onChange={(e) =>
                set("printerLifespanHours", Number(e.target.value) || 1)
              }
            />
          </div>
        </div>
        {suggested > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[var(--color-ink-muted)]">
              Suggested machine rate: {settings.currencySymbol}
              {suggested.toFixed(2)}/hr
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => set("machineRatePerHour", Number(suggested.toFixed(2)))}
            >
              Apply
            </Button>
          </div>
        ) : null}
        {showSla ? (
          <div className="grid gap-3 border-t border-[var(--color-line)] pt-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sla-consumables">SLA Consumables / Print</Label>
              <Input
                id="sla-consumables"
                type="number"
                min={0}
                value={settings.slaConsumablesPerPrint}
                onChange={(e) =>
                  set("slaConsumablesPerPrint", Number(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sla-waste">SLA Support / Waste %</Label>
              <Input
                id="sla-waste"
                type="number"
                min={0}
                value={settings.slaSupportWastePercent}
                onChange={(e) =>
                  set("slaSupportWastePercent", Number(e.target.value) || 0)
                }
              />
            </div>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
