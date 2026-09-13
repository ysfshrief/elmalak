import * as React from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  hint,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: "primary" | "secondary" | "success" | "warning" | "info" | "accent";
  hint?: string;
  className?: string;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary-soft text-primary-ink",
    secondary: "bg-secondary-soft text-secondary-ink",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
    accent: "bg-accent-soft text-accent",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] sm:gap-4 sm:p-4",
        className
      )}
    >
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] sm:size-12", toneMap[tone])}>
        <Icon className="size-5 sm:size-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-snug text-ink-muted sm:text-sm">{label}</p>
        <p className="text-xl font-extrabold tabular-nums text-ink sm:text-2xl">{value}</p>
        {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      </div>
    </div>
  );
}
