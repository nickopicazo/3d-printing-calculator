import { data } from "react-router";
import type { Route } from "./+types/embed.$section.$slug";
import { CalculatorSurface } from "~/components/calculator/calculator-surface";
import {
  getLandingPage,
  type LandingSection,
} from "~/lib/landing-pages";
import { noIndexMeta } from "~/lib/landing-meta";

export function headers() {
  return {
    "Content-Security-Policy": "frame-ancestors *",
  };
}

export function meta({ matches }: Route.MetaArgs) {
  return noIndexMeta(
    matches,
    "Embed · 3D Printing Calculator",
    "Embeddable 3D print cost calculator.",
  );
}

export async function loader({ params }: Route.LoaderArgs) {
  const raw = params.section;
  const section: LandingSection | null =
    raw === "calculators" || raw === "printers"
      ? raw
      : raw === "filament" || raw === "materials"
        ? "materials"
        : null;
  if (!section) throw data(null, { status: 404 });
  const page = getLandingPage(section, params.slug);
  if (!page || page.slug === "embed") throw data(null, { status: 404 });
  return { page };
}

export default function EmbedPreset({ loaderData }: Route.ComponentProps) {
  const { page } = loaderData;
  return (
    <div className="min-h-screen bg-[var(--color-paper)] p-3 sm:p-4">
      <CalculatorSurface
        seedKey={`embed-${page.section}-${page.slug}`}
        preset={page.preset}
        compact
        showShare={false}
        showPrintQuote={false}
        showOpenFullApp
      />
    </div>
  );
}
