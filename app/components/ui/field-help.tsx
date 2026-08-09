import { CircleHelp } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

type FieldHelpProps = {
  /** Short text shown on hover. */
  tip: string;
  /** Dialog title. Falls back to a generic label when omitted. */
  title?: string;
  /** Longer explanation shown in a dialog on click. */
  details?: ReactNode;
  className?: string;
};

export function FieldHelp({ tip, title, details, className }: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const hasDialog = details != null;

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                className,
              )}
              aria-label={hasDialog ? `${tip} More info` : tip}
              onClick={
                hasDialog
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpen(true);
                    }
                  : undefined
              }
            >
              <CircleHelp className="size-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="space-y-0.5">
            <p>{tip}</p>
            {hasDialog ? (
              <p className="text-[var(--color-ink-muted)]">Click for more</p>
            ) : null}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {hasDialog ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{title ?? "About this field"}</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 text-sm text-[var(--color-ink-muted)]">
                  {details}
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

type LabelWithHelpProps = {
  htmlFor?: string;
  children: ReactNode;
  tip: string;
  title?: string;
  details?: ReactNode;
  className?: string;
};

/** Label row with an info icon for hover tip / optional details dialog. */
export function LabelWithHelp({
  htmlFor,
  children,
  tip,
  title,
  details,
  className,
}: LabelWithHelpProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Label htmlFor={htmlFor} className="mb-0">
        {children}
      </Label>
      <FieldHelp tip={tip} title={title} details={details} />
    </div>
  );
}
