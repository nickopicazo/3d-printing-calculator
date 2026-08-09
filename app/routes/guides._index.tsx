import { Link } from "react-router";
import type { Route } from "./+types/guides._index";
import { GUIDE_ARTICLES } from "~/lib/guides";
import { landingMeta } from "~/lib/landing-meta";

export async function loader({ request }: Route.LoaderArgs) {
  return { origin: new URL(request.url).origin };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  return landingMeta({
    matches,
    origin: loaderData?.origin ?? "",
    path: "/guides",
    title: "3D Printing Pricing Guides",
    description:
      "Guides on how to price 3D prints, electricity cost, filament per gram, Philippines pricing, and Bambu cost per hour.",
    faqs: [],
  });
}

export default function GuidesIndex() {
  return (
    <main className="page-shell animate-fade-up">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Pricing guides
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        Short articles that link back into the calculators.
      </p>
      <ul className="mt-8 space-y-3">
        {GUIDE_ARTICLES.map((g) => (
          <li key={g.slug}>
            <Link
              to={`/guides/${g.slug}`}
              className="block rounded-2xl border border-[var(--color-line)] bg-white/70 px-4 py-4 transition-colors hover:border-[var(--color-accent)]"
            >
              <span className="font-display font-bold">{g.title}</span>
              <span className="mt-1 block text-sm text-[var(--color-ink-muted)]">
                {g.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
