import { Link } from "react-router";
import type { Route } from "./+types/printers._index";
import { LANDING_PAGES } from "~/lib/landing-pages";
import { landingMeta } from "~/lib/landing-meta";

export async function loader({ request }: Route.LoaderArgs) {
  return { origin: new URL(request.url).origin };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  return landingMeta({
    matches,
    origin: loaderData?.origin ?? "",
    path: "/printers",
    title: "Printer Cost Calculators",
    description:
      "Bambu Lab and printer-specific 3D print cost calculators with power and pricing defaults.",
    faqs: [],
  });
}

export default function PrintersIndex() {
  const pages = LANDING_PAGES.filter((p) => p.section === "printers");
  return (
    <main className="page-shell animate-fade-up">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Printer calculators
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        Start from Bambu Lab presets, then edit watts, filament, and shop rates.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link
              to={`/printers/${p.slug}`}
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
    </main>
  );
}
