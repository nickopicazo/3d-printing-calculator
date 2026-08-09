import type { Route } from "./+types/embed";
import { CalculatorSurface } from "~/components/calculator/calculator-surface";
import { noIndexMeta } from "~/lib/landing-meta";

export function headers() {
  return {
    "Content-Security-Policy": "frame-ancestors *",
    "X-Frame-Options": "",
  };
}

export function meta({ matches }: Route.MetaArgs) {
  return noIndexMeta(
    matches,
    "Embed · 3D Printing Calculator",
    "Embeddable 3D print cost calculator.",
  );
}

export default function EmbedDefault() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] p-3 sm:p-4">
      <CalculatorSurface
        seedKey="embed-default"
        preset={{
          settings: {
            currencyCode: "PHP",
            electricityPerKwh: 12,
            powerWatts: 350,
            defaultFilamentPricePerKg: 650,
            machineRatePerHour: 50,
            laborRatePerHour: 150,
            failurePercent: 10,
            serviceFeeValue: 40,
          },
          quantity: 100,
          printHours: 5,
          materialType: "PLA",
          materialLabel: "PLA",
        }}
        compact
        showShare={false}
        showPrintQuote={false}
        showOpenFullApp
      />
    </div>
  );
}
