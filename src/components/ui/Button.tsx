"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-contrast hover:brightness-105 active:brightness-95 shadow-[var(--shadow-sm)]",
  secondary:
    "bg-secondary text-white hover:brightness-110 active:brightness-95 shadow-[var(--shadow-sm)]",
  outline:
    "border border-border-strong bg-surface text-ink hover:bg-bg-alt active:bg-bg-alt/80",
  ghost: "text-ink-muted hover:bg-bg-alt hover:text-ink",
  danger: "bg-error text-white hover:brightness-105 active:brightness-95",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-11 px-4 text-[0.95rem] gap-2 rounded-[var(--radius-md)]",
  lg: "h-13 px-6 text-base gap-2 rounded-[var(--radius-md)]",
  icon: "h-11 w-11 rounded-[var(--radius-md)] shrink-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150 ease-out",
          "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
