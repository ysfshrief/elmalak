"use client";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

/**
 * Small external store so the theme can be read via `useSyncExternalStore`
 * (client value may legitimately differ from the SSR snapshot — that's
 * exactly what this hook is for, without the hydration-mismatch warning
 * a plain `useState` + `useEffect` pair would trigger).
 */
export function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function getServerThemeSnapshot(): Theme {
  return "light";
}

export function subscribeTheme(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* private mode — ignore */
  }
  listeners.forEach((l) => l());
}
