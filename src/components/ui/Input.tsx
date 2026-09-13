"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[var(--radius-sm)] border bg-surface px-3.5 text-[0.95rem] text-ink placeholder:text-ink-faint",
        "transition-colors duration-150 outline-none",
        "focus:border-primary focus:ring-2 focus:ring-primary/15",
        error ? "border-error focus:border-error focus:ring-error/15" : "border-border-strong",
        "disabled:opacity-50 disabled:bg-bg-alt",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-sm)] border bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-ink-faint",
        "transition-colors duration-150 outline-none resize-y min-h-24",
        "focus:border-primary focus:ring-2 focus:ring-primary/15",
        error ? "border-error focus:border-error focus:ring-error/15" : "border-border-strong",
        "disabled:opacity-50 disabled:bg-bg-alt",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  ({ className, error, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full rounded-[var(--radius-sm)] border bg-surface px-3.5 pl-9 text-[0.95rem] text-ink",
          "transition-colors duration-150 outline-none appearance-none",
          "focus:border-primary focus:ring-2 focus:ring-primary/15",
          error ? "border-error focus:border-error focus:ring-error/15" : "border-border-strong",
          "disabled:opacity-50 disabled:bg-bg-alt",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
    </div>
  )
);
Select.displayName = "Select";

export function Label({ className, required, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-sm font-semibold text-ink-muted", className)} {...props}>
      {children}
      {required && <span className="text-error mr-1">*</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-error">{children}</p>;
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-ink-faint">{children}</p>;
}
