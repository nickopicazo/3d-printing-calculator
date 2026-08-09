import { Link } from "react-router";
import type { Route } from "./+types/calculators._index";
import { LANDING_PAGES } from "~/lib/landing-pages";
import { landingMeta } from "~/lib/landing-meta";

export async function loader({ request }: Route.LoaderArgs) {
  return { origin: new URL(request.url).origin };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  return landingMeta({
    matches,
    origin: loaderData?.origin ?? "",
    path: "/calculators",
    title: "3D Printing Calculators",
    description:
      "Free 3D printing calculators for cost, price, filament, electricity, and profit.",
    faqs: [],
  });
}

export default function CalculatorsIndex() {
  const pages = LANDING_PAGES.filter((p) => p.section === "calculators");
  return (
    <main className="page-shell animate-fade-up">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Calculators
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        Keyword tools that open the same pricing engine with useful defaults.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link
              to={`/calculators/${p.slug}`}
              className="block rounded-2xl border border-[var(--color-line)] bg-white/70 px-4 py-4 transition-colors hover:border-[var(--color-accent)]"
            >
              <span className="font-display font-bold">{p.h1}</span>
              <span className="mt-1 block text-sm text-[var(--color-ink-muted)]">
                {p.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-10 space-y-3">
        <h2 className="font-display text-xl font-extrabold">Also browse</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="font-semibold underline" to="/printers">
            Printer calculators
          </Link>
          <Link className="font-semibold underline" to="/filament">
            Filament
          </Link>
          <Link className="font-semibold underline" to="/filament/pla">
            PLA
          </Link>
          <Link className="font-semibold underline" to="/filament/petg">
            PETG
          </Link>
          <Link className="font-semibold underline" to="/philippines">
            Philippines
          </Link>
          <Link className="font-semibold underline" to="/guides">
            Pricing guides
          </Link>
        </div>
      </div>
    </main>
  );
}
