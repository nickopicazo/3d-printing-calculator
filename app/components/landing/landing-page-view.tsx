import { Link } from "react-router";
import { CalculatorSurface } from "~/components/calculator/calculator-surface";
import type { LandingPage } from "~/lib/landing-pages";
import { embedSrcPath } from "~/lib/landing-pages";

type Props = {
  page: LandingPage;
  /** Show embed snippet (calculators/embed). */
  showEmbedSnippet?: boolean;
  origin?: string;
};

export function LandingPageView({
  page,
  showEmbedSnippet = false,
  origin = "",
}: Props) {
  const embedPath = embedSrcPath(
    page.section === "calculators" && page.slug === "embed"
      ? undefined
      : page.section,
    page.slug === "embed" ? undefined : page.slug,
  );
  const embedUrl = origin ? `${origin.replace(/\/$/, "")}${embedPath}` : embedPath;

  return (
    <main className="page-shell animate-fade-up">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          {page.section === "calculators"
            ? "Calculator"
            : page.section === "printers"
              ? "Printer"
              : "Filament"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
          {page.h1}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-base">
          {page.intro}
        </p>
      </div>

      {page.example ? (
        <div className="mb-8 rounded-2xl border border-[var(--color-line)] bg-white/70 px-5 py-4">
          <p className="font-display text-sm font-bold">{page.example.title}</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--color-ink-muted)]">
            {page.example.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {showEmbedSnippet ? (
        <div className="mb-8 space-y-3 rounded-2xl border border-[var(--color-line)] bg-white/70 p-5">
          <h2 className="font-display text-lg font-bold">Iframe snippet</h2>
          <pre className="overflow-x-auto rounded-xl bg-[var(--color-charcoal)] p-4 text-xs text-white">
            {`<iframe
  src="${embedUrl}"
  title="3D Printing Cost Calculator"
  width="100%"
  height="900"
  style="border:0;border-radius:16px;"
  loading="lazy"
></iframe>`}
          </pre>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Prefer a printer- or material-specific embed? Use paths like{" "}
            <code className="text-xs">/embed/printers/bambu-lab-a1</code> or{" "}
            <code className="text-xs">/embed/filament/pla</code>.
          </p>
        </div>
      ) : null}

      <div id="calculator" className="scroll-mt-24">
        <CalculatorSurface
          seedKey={`${page.section}/${page.slug}`}
          preset={page.preset}
          heading="Try the calculator"
          subheading="Edit the sample values or enter your own grams, hours, and shop rates."
          showShare
          showPrintQuote
        />
      </div>

      <section className="mt-14 space-y-8 border-t border-[var(--color-line)] pt-12">
        {page.body.map((block) => (
          <div key={block.heading} className="max-w-3xl">
            <h2 className="font-display text-xl font-extrabold tracking-tight">
              {block.heading}
            </h2>
            {block.paragraphs.map((p) => (
              <p
                key={p.slice(0, 48)}
                className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]"
              >
                {p}
              </p>
            ))}
          </div>
        ))}

        <div className="w-full space-y-4">
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {page.faqs.map((item) => (
              <details
                key={item.question}
                className="rounded-xl border border-[var(--color-line)] bg-white/70 px-4 py-3"
              >
                <summary className="cursor-pointer font-semibold">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>

        <p className="text-sm text-[var(--color-ink-muted)]">
          Need the full workspace with 3MF import and saved projects?{" "}
          <Link to="/" className="font-semibold text-[var(--color-ink)] underline">
            Open the main calculator
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
