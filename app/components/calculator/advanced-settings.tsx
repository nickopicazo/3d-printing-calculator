import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { LabelWithHelp } from "~/components/ui/field-help";
import { Input } from "~/components/ui/input";
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
          Optional. Leave at 0 to exclude from the estimate — electricity,
          labor rate, failure uplift, and depreciation helpers.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <LabelWithHelp
              htmlFor="power-w"
              tip="Used with Electricity / kWh and print time."
              title="Power (W)"
              details={
                <>
                  <p>
                    Electricity cost = (Power ÷ 1000) × print hours ×
                    Electricity / kWh.
                  </p>
                  <p>
                    Both Power and Electricity / kWh must be set above 0, and
                    the print must have print time, or electricity stays at 0.
                  </p>
                </>
              }
            >
              Power (W)
            </LabelWithHelp>
            <Input
              id="power-w"
              type="number"
              min={0}
              value={settings.powerWatts}
              onChange={(e) => set("powerWatts", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <LabelWithHelp
              htmlFor="kwh"
              tip="Used with Power (W) and print time."
              title="Electricity / kWh"
              details={
                <>
                  <p>
                    Electricity cost = (Power ÷ 1000) × print hours ×
                    Electricity / kWh.
                  </p>
                  <p>
                    Leave at 0 to exclude electricity from the estimate.
                  </p>
                </>
              }
            >
              Electricity / kWh
            </LabelWithHelp>
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
            <LabelWithHelp
              htmlFor="labor-rate"
              tip="Required for Labor Time on each print to affect cost."
              title="Labor Rate / Hour"
              details={
                <>
                  <p>
                    Applied to Labor Time (Min) on each print: (minutes ÷ 60) ×
                    this rate.
                  </p>
                  <p>
                    If this is 0, entering labor minutes will not change the
                    total.
                  </p>
                </>
              }
            >
              Labor Rate / Hour
            </LabelWithHelp>
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
            <LabelWithHelp
              htmlFor="failure"
              tip="Adds a % buffer on top of landed print cost."
              title="Failure %"
              details={
                <p>
                  Failure uplift = landed cost × (Failure % ÷ 100). Use this to
                  cover reprints and scrap. Leave at 0 to skip.
                </p>
              }
            >
              Failure %
            </LabelWithHelp>
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
            <LabelWithHelp
              htmlFor="purchase"
              tip="Only used to suggest Machine Rate / Hr — not billed directly."
              title="Printer Purchase Price"
              details={
                <p>
                  Together with Lifespan (Hours), this suggests a machine rate
                  (purchase ÷ lifespan). Click Apply to copy it into Machine
                  Rate / Hr. It does not add cost by itself.
                </p>
              }
            >
              Printer Purchase Price
            </LabelWithHelp>
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
            <LabelWithHelp
              htmlFor="lifespan"
              tip="Only used to suggest Machine Rate / Hr — not billed directly."
              title="Lifespan (Hours)"
              details={
                <p>
                  Expected useful life of the printer. Suggested machine rate =
                  Purchase Price ÷ Lifespan Hours. Apply that suggestion to bill
                  machine time.
                </p>
              }
            >
              Lifespan (Hours)
            </LabelWithHelp>
            <Input
              id="lifespan"
              type="number"
              min={0}
              value={settings.printerLifespanHours}
              onChange={(e) =>
                set("printerLifespanHours", Number(e.target.value) || 0)
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
              <LabelWithHelp
                htmlFor="sla-consumables"
                tip="Flat cost added once per SLA print."
                title="SLA Consumables / Print"
                details={
                  <p>
                    Covers IPA, FEP film wear, gloves, and similar. Added once
                    per SLA print when that technology is selected. Leave at 0
                    to exclude.
                  </p>
                }
              >
                SLA Consumables / Print
              </LabelWithHelp>
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
              <LabelWithHelp
                htmlFor="sla-waste"
                tip="Increases resin quantity for supports / waste."
                title="SLA Support / Waste %"
                details={
                  <p>
                    Resin quantity is multiplied by (1 + waste %). Example: 100
                    ml with 10% waste bills 110 ml. Only applies to SLA
                    materials.
                  </p>
                }
              >
                SLA Support / Waste %
              </LabelWithHelp>
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
