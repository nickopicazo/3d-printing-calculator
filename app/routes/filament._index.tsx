import { Link } from "react-router";
import type { Route } from "./+types/filament._index";
import { LANDING_PAGES, landingPath } from "~/lib/landing-pages";
import { landingMeta } from "~/lib/landing-meta";

export async function loader({ request }: Route.LoaderArgs) {
  return { origin: new URL(request.url).origin };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  return landingMeta({
    matches,
    origin: loaderData?.origin ?? "",
    path: "/filament",
    title: "Filament Cost Calculators",
    description:
      "PLA, PETG, ABS, ASA, and TPU filament cost calculators with shop pricing.",
    faqs: [],
  });
}

export default function FilamentIndex() {
  const pages = LANDING_PAGES.filter((p) => p.section === "materials");
  return (
    <main className="page-shell animate-fade-up">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Filament calculators
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        Filament-specific starting prices you can edit for your spools.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link
              to={landingPath(p)}
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
