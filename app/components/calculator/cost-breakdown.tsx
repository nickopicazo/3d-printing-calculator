import { formatMoney, type PrintBreakdown } from "~/lib/pricing";

type Props = {
  breakdown: PrintBreakdown;
  currencySymbol: string;
  title?: string;
};

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className={muted ? "text-[var(--color-ink-muted)]" : ""}>
        {label}
      </span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

export function CostBreakdown({
  breakdown,
  currencySymbol,
  title = "Cost breakdown",
}: Props) {
  const m = (n: number) => formatMoney(n, currencySymbol);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <div className="space-y-2">
        <Row label="Material" value={m(breakdown.materialCost)} />
        <Row label="Hardware" value={m(breakdown.hardwareCost)} />
        <Row label="Packaging" value={m(breakdown.packagingCost)} />
        {breakdown.consumablesCost > 0 ? (
          <Row label="Consumables" value={m(breakdown.consumablesCost)} />
        ) : null}
        <Row label="Labor" value={m(breakdown.laborCost)} />
        <Row label="Machine" value={m(breakdown.machineCost)} />
        <Row label="Electricity" value={m(breakdown.electricityCost)} />
        <Row label="Landed cost" value={m(breakdown.landed)} muted />
        {breakdown.failureUplift > 0 ? (
          <Row label="Failure uplift" value={m(breakdown.failureUplift)} />
        ) : null}
        <Row label="Markup" value={m(breakdown.markupAmount)} />
        {breakdown.vatAmount > 0 ? (
          <Row label="VAT" value={m(breakdown.vatAmount)} />
        ) : null}
      </div>
      <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-3">
        <span className="font-display text-base font-bold">Total</span>
        <span className="font-display text-xl font-extrabold text-[var(--color-accent-deep)]">
          {m(breakdown.total)}
        </span>
      </div>
    </div>
  );
}
