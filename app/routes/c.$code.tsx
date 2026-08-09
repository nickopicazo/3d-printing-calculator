import { eq } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/c.$code";
import { CalculatorSurface } from "~/components/calculator/calculator-surface";
import { db } from "~/db/index.server";
import { shares } from "~/db/schema";
import type { ProjectDraft } from "~/lib/calculator-types";
import { noIndexMeta } from "~/lib/landing-meta";
import type { AppSettings } from "~/lib/settings";

export async function loader({ params }: Route.LoaderArgs) {
  const code = params.code?.trim();
  if (!code) throw data(null, { status: 404 });

  try {
    const [row] = await db
      .select()
      .from(shares)
      .where(eq(shares.code, code))
      .limit(1);

    if (!row) throw data(null, { status: 404 });
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      throw data(null, { status: 410 });
    }

    const payload = row.payload as {
      settings: Partial<AppSettings>;
      project: ProjectDraft;
    };

    return { code, payload };
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) throw error;
    console.warn("Share load failed:", error);
    throw data(null, { status: 404 });
  }
}

export function meta({ matches }: Route.MetaArgs) {
  return noIndexMeta(
    matches,
    "Shared calculation · 3D Printing Calculator",
    "Shared 3D print cost estimate.",
  );
}

export default function SharedCalculation({
  loaderData,
}: Route.ComponentProps) {
  const { code, payload } = loaderData;
  return (
    <main className="page-shell animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Shared calculation
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
          You&apos;re viewing a copy of a shared estimate. Edits stay in your
          browser unless you create a new share link.
        </p>
      </div>
      <CalculatorSurface
        seedKey={`share-${code}`}
        initialShare={payload}
        showShare
        showPrintQuote
      />
    </main>
  );
}
