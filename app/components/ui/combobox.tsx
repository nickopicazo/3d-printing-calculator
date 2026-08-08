"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Extra text matched by search (not shown in the closed trigger). */
  keywords?: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  className?: string;
  id?: string;
  /** Accessible name when a visible <Label htmlFor> is not enough for axe. */
  "aria-label"?: string;
};

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  allowCustom = true,
  className,
  id,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = options.find((o) => o.value === value || o.label === value);
  const display = selected?.label ?? (value || placeholder);

  const filtered = options.filter((o) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const haystack = `${o.label} ${o.value} ${o.keywords ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });

  const showCustom =
    allowCustom &&
    query.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-[var(--color-ink-muted)]",
            className,
          )}
        >
          <span className="truncate">{display}</span>
          <ChevronsUpDown className="opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0",
          "min-w-[min(100%,16rem)]",
        )}
        collisionPadding={16}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  {option.label}
                  {option.keywords ? (
                    <span className="ml-2 truncate text-[var(--color-ink-muted)]">
                      {option.keywords}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
              {showCustom ? (
                <CommandItem
                  value={`custom:${query}`}
                  onSelect={() => {
                    onChange(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  Use “{query.trim()}”
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
