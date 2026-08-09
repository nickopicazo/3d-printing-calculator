import { data, Link } from "react-router";
import type { Route } from "./+types/guides.$slug";
import { getGuide } from "~/lib/guides";
import { landingMeta } from "~/lib/landing-meta";

export async function loader({ params, request }: Route.LoaderArgs) {
  const guide = getGuide(params.slug);
  if (!guide) throw data(null, { status: 404 });
  return { guide, origin: new URL(request.url).origin };
}

export function meta({ loaderData, matches, location }: Route.MetaArgs) {
  const guide = loaderData?.guide;
  if (!guide) return [{ title: "Not found" }];
  return landingMeta({
    matches,
    origin: loaderData.origin,
    path: location.pathname,
    title: guide.title,
    description: guide.description,
    faqs: [],
  });
}

export default function GuideSlug({ loaderData }: Route.ComponentProps) {
  const { guide } = loaderData;
  return (
    <main className="page-shell animate-fade-up">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Guide
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
          {guide.title}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          {guide.description}
        </p>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--color-ink)]">
          {guide.paragraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
        <div className="mt-10 border-t border-[var(--color-line)] pt-6">
          <h2 className="font-display text-lg font-bold">Related tools</h2>
          <ul className="mt-3 space-y-2">
            {guide.related.map((r) => (
              <li key={r.href}>
                <Link
                  to={r.href}
                  className="font-semibold text-[var(--color-accent-deep)] underline"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </main>
  );
}
