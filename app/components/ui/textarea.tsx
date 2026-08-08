import * as React from "react";
import { cn } from "~/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-[var(--color-line)] bg-[#fbfcfd] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-ink-muted)]/70 focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(13,143,124,0.18)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
