import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      {Icon && (
        <div className="flex size-14 items-center justify-center rounded-full bg-bg-alt text-ink-faint">
          <Icon className="size-6" />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-bold text-ink">{title}</p>
        {description && <p className="text-sm text-ink-muted max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "حدث خطأ غير متوقع",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-error-soft text-error">!</div>
      <div className="space-y-1">
        <p className="font-bold text-ink">{title}</p>
        {description && <p className="text-sm text-ink-muted max-w-sm">{description}</p>}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-[var(--radius-sm)] border border-border-strong px-4 py-2 text-sm font-semibold text-ink hover:bg-bg-alt"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-sm)] bg-bg-alt", className)} />;
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
