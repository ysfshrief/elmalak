"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder = "بحث...",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface pr-10 pl-9 text-[0.95rem] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="مسح البحث"
          className="absolute left-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-bg-alt hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
