import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "secondary" | "success" | "warning" | "error" | "info";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-bg-alt text-ink-muted",
  primary: "bg-primary-soft text-primary-ink",
  secondary: "bg-secondary-soft text-secondary-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  error: "bg-error-soft text-error",
  info: "bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        toneStyles[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
