import * as React from "react";
import { cn } from "~/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[var(--color-line)] bg-[#fafafa] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-ink-muted)]/70 focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
