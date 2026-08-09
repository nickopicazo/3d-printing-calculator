import { ImageIcon, LogIn, Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { withSignInSearch } from "~/lib/sign-in";

/** Bump when tour content changes so returning users see updates once. */
const STORAGE_KEY = "3dce-import-3mf-tour-v2";

type Import3mfTourProps = {
  open: boolean;
  loggedIn?: boolean;
  onOpenChange: (open: boolean) => void;
};

function TutorialScreenshot({
  src,
  alt,
  label,
  caption,
}: {
  /** Drop real screenshots under `public/tutorial/` and pass the path here. */
  src?: string;
  alt: string;
  label: string;
  caption?: string;
}) {
  return (
    <figure className="space-y-2">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-paper)] px-4 text-center"
        >
          <ImageIcon
            className="size-8 text-[var(--color-ink-muted)] opacity-50"
            aria-hidden
          />
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {label}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Screenshot placeholder — replace later
          </p>
        </div>
      )}
      {caption ? (
        <figcaption className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function markImport3mfTourSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

export function hasSeenImport3mfTour(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * First-visit highlight for 3MF / G-code auto-import, with Bambu Studio export steps.
 * Control open state from the parent; call {@link markImport3mfTourSeen} when dismissed.
 */
export function Import3mfTour({
  open,
  loggedIn = false,
  onOpenChange,
}: Import3mfTourProps) {
  const location = useLocation();

  function handleOpenChange(next: boolean) {
    if (!next) markImport3mfTourSeen();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:p-0"
        style={{
          maxHeight: "min(90dvh, 52rem)",
          overflowY: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="pr-8">
            <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[rgba(111,82,240,0.1)] px-2.5 py-1 text-xs font-semibold text-[var(--color-accent-deep)]">
              <Sparkles className="size-3.5" aria-hidden />
              Highlight feature
            </div>
            <DialogTitle className="text-xl sm:text-2xl">
              Upload a 3MF — we fill in the numbers
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Drop a Bambu Studio or OrcaSlicer{" "}
              <span className="font-medium text-[var(--color-ink)]">
                .gcode.3mf
              </span>{" "}
              (or .3mf / .gcode) and we auto-extract filament weight, resin
              volume, estimated print time, and plate previews — so you quote
              faster than typing slicer stats by hand.
            </DialogDescription>
          </DialogHeader>

          {!loggedIn ? (
            <div className="rounded-xl border border-[rgba(111,82,240,0.3)] bg-[rgba(111,82,240,0.08)] px-3.5 py-3 text-sm leading-relaxed text-[var(--color-accent-deep)]">
              <p className="flex items-start gap-2">
                <LogIn className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">Sign in required.</span> You
                  need to log in before you can upload a 3MF / G-code file and
                  auto-fill print data.
                </span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]/80 px-3.5 py-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              <p className="flex items-start gap-2">
                <Upload
                  className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-deep)]"
                  aria-hidden
                />
                <span>
                  Look for{" "}
                  <span className="font-semibold text-[var(--color-ink)]">
                    Upload 3MF / G-code
                  </span>{" "}
                  on the Prints section. Best results come from a sliced plate
                  export (not an unsliced project-only 3MF).
                </span>
              </p>
            </div>
          )}

          <Separator />

          <div className="space-y-5">
            <div>
              <h3 className="font-display text-base font-bold tracking-tight">
                Exporting from Bambu Studio
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Use{" "}
                <strong className="font-semibold text-[var(--color-ink)]">
                  File → Save Project As
                </strong>{" "}
                for an editable project 3MF, or slice and choose{" "}
                <strong className="font-semibold text-[var(--color-ink)]">
                  Export plate sliced file
                </strong>{" "}
                for a ready-to-print{" "}
                <code className="rounded bg-white px-1 py-0.5 text-xs font-medium text-[var(--color-ink)]">
                  .gcode.3mf
                </code>{" "}
                with embedded machine instructions.
              </p>
            </div>

            <section className="space-y-3" aria-labelledby="tour-project-3mf">
              <h4
                id="tour-project-3mf"
                className="text-sm font-bold text-[var(--color-ink)]"
              >
                1. Project 3MF (models &amp; settings)
              </h4>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                <li>Open Bambu Studio and load your 3D models.</li>
                <li>Arrange parts, colors, and print settings on the plate.</li>
                <li>
                  Go to the top menu and select{" "}
                  <strong className="font-semibold text-[var(--color-ink)]">
                    File
                  </strong>
                  .
                </li>
                <li>
                  Click{" "}
                  <strong className="font-semibold text-[var(--color-ink)]">
                    Save Project As
                  </strong>{" "}
                  to save a standard{" "}
                  <code className="rounded bg-[var(--color-paper)] px-1 py-0.5 text-xs font-medium text-[var(--color-ink)]">
                    .3mf
                  </code>{" "}
                  file.
                </li>
              </ol>
              <p className="rounded-lg border border-[#e8d9a8] bg-[#fffbeb] px-3 py-2 text-xs leading-relaxed text-[#9a6700]">
                Note: This saves geometry and settings, but it does not contain
                pre-calculated toolpaths (G-code) until you slice. Prefer a
                sliced export for full auto-fill.
              </p>
              <TutorialScreenshot
                src="/tutorial/bambu-save-project-as.png"
                alt="Bambu Studio File menu with Save Project As highlighted"
                label="File → Save Project As"
                caption="File → Save Project As (⇧⌘S) saves a project .3mf."
              />
            </section>

            <section className="space-y-3" aria-labelledby="tour-sliced-3mf">
              <h4
                id="tour-sliced-3mf"
                className="text-sm font-bold text-[var(--color-ink)]"
              >
                2. Sliced G-code (.gcode.3mf) — recommended
              </h4>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                <li>
                  Set up your printer, nozzle size, and filament profiles
                  correctly.
                </li>
                <li>
                  Click{" "}
                  <strong className="font-semibold text-[var(--color-ink)]">
                    Slice plate
                  </strong>{" "}
                  (use the dropdown for Slice all if you have multiple plates).
                </li>
                <li>
                  Once slicing finishes, open the dropdown next to{" "}
                  <strong className="font-semibold text-[var(--color-ink)]">
                    Print plate
                  </strong>
                  .
                </li>
                <li>
                  Select{" "}
                  <strong className="font-semibold text-[var(--color-ink)]">
                    Export plate sliced file
                  </strong>{" "}
                  (or Export all sliced file).
                </li>
                <li>
                  Save the{" "}
                  <code className="rounded bg-[var(--color-paper)] px-1 py-0.5 text-xs font-medium text-[var(--color-ink)]">
                    .gcode.3mf
                  </code>{" "}
                  to your computer — then upload it here.
                </li>
              </ol>
              <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
                Bambu Lab printers use this combined{" "}
                <code className="rounded bg-[var(--color-paper)] px-1 py-0.5 font-medium text-[var(--color-ink)]">
                  .gcode.3mf
                </code>{" "}
                format natively for plate previews and print times — the same
                metadata we read for costing.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TutorialScreenshot
                  src="/tutorial/bambu-slice-plate.png"
                  alt="Bambu Studio Slice plate dropdown showing Slice all and Slice plate"
                  label="Slice plate"
                  caption="Slice plate — or Slice all for every plate in the project."
                />
                <TutorialScreenshot
                  src="/tutorial/bambu-export-sliced.png"
                  alt="Bambu Studio Print plate menu with Export plate sliced file highlighted"
                  label="Export plate sliced file"
                  caption="After slicing: Print plate dropdown → Export plate sliced file."
                />
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 sm:px-6 sm:py-4">
          {!loggedIn ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Maybe later
              </Button>
              <Button asChild>
                <Link
                  to={{ search: withSignInSearch(location.search) }}
                  onClick={() => handleOpenChange(false)}
                >
                  <LogIn />
                  Sign in to upload
                </Link>
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Got it — start quoting
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Opens the tour once per browser until dismissed (or content version bumps). */
export function useImport3mfTourAutoOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeenImport3mfTour()) return;
    const id = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(id);
  }, []);

  return { open, setOpen };
}
