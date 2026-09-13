"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { getThemeSnapshot, getServerThemeSnapshot, subscribeTheme, setTheme } from "@/lib/theme";

export function ThemeToggle() {
  const theme = React.useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
      className="flex size-10 items-center justify-center rounded-[var(--radius-md)] text-ink-muted hover:bg-bg-alt hover:text-ink transition-colors"
    >
      {theme === "dark" ? <Sun className="size-[1.15rem]" /> : <Moon className="size-[1.15rem]" />}
    </button>
  );
}
