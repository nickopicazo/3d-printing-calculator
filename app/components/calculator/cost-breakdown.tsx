import {
  formatMinutesDuration,
  formatMoney,
  type PrintBreakdown,
} from "~/lib/pricing";
import { cn } from "~/lib/utils";

type Props = {
  breakdown: PrintBreakdown;
  currencySymbol: string;
  title?: string;
  variant?: "light" | "dark";
  /** Shown next to the post-processing row when above zero. */
  postProcessMinutes?: number;
};

function Row({
  label,
  value,
  muted,
  dark,
}: {
  label: string;
  value: string;
  muted?: boolean;
  dark?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span
        className={cn(
          muted && !dark && "text-[var(--color-ink-muted)]",
          muted && dark && "text-white/50",
          !muted && dark && "text-white/70",
        )}
      >
        {label}
      </span>
      <span className={cn("font-mono tabular-nums", dark && "text-white")}>
        {value}
      </span>
    </div>
  );
}

export function CostBreakdown({
  breakdown,
  currencySymbol,
  title = "Cost Breakdown",
  variant = "light",
  postProcessMinutes = 0,
}: Props) {
  const m = (n: number) => formatMoney(n, currencySymbol);
  const dark = variant === "dark";

  return (
    <div className={cn(dark ? "dash-card-dark space-y-4" : "dash-card space-y-3")}>
      <div className="flex items-start justify-between gap-3">
        <h3
          className={cn(
            "font-display text-sm font-semibold",
            dark ? "text-white/65" : "text-[var(--color-ink-muted)]",
          )}
        >
          {title}
        </h3>
        {dark ? (
          <span className="rounded-full bg-[var(--color-lime)]/90 px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-charcoal)]">
            Total
          </span>
        ) : null}
      </div>

      {dark ? (
        <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {m(breakdown.total)}
        </p>
      ) : null}

      <div className="space-y-2.5">
        <Row dark={dark} label="Material" value={m(breakdown.materialCost)} />
        {breakdown.addonsCost > 0 ? (
          <Row dark={dark} label="Addons" value={m(breakdown.addonsCost)} />
        ) : null}
        {breakdown.consumablesCost > 0 ? (
          <Row dark={dark} label="Consumables" value={m(breakdown.consumablesCost)} />
        ) : null}
        <Row dark={dark} label="Labor" value={m(breakdown.laborCost)} />
        {breakdown.postProcessCost > 0 || postProcessMinutes > 0 ? (
          <Row
            dark={dark}
            label={
              postProcessMinutes > 0
                ? `Post-processing (${formatMinutesDuration(postProcessMinutes)})`
                : "Post-processing"
            }
            value={m(breakdown.postProcessCost)}
          />
        ) : null}
        <Row dark={dark} label="Machine" value={m(breakdown.machineCost)} />
        <Row dark={dark} label="Electricity" value={m(breakdown.electricityCost)} />
        <Row dark={dark} label="Landed Cost" value={m(breakdown.landed)} muted />
        {breakdown.failureUplift > 0 ? (
          <Row dark={dark} label="Failure Uplift" value={m(breakdown.failureUplift)} />
        ) : null}
        {breakdown.markupAmount > 0 ? (
          <Row dark={dark} label="Service Fee" value={m(breakdown.markupAmount)} />
        ) : null}
        {breakdown.vatAmount > 0 ? (
          <Row dark={dark} label="VAT" value={m(breakdown.vatAmount)} />
        ) : null}
      </div>

      {!dark ? (
        <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-3">
          <span className="font-display text-base font-bold">Total</span>
          <span className="font-display text-xl font-extrabold text-[var(--color-accent)]">
            {m(breakdown.total)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
