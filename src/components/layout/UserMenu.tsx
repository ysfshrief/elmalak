"use client";

import * as React from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { roleLabel } from "@/lib/roles";
import { logoutAction } from "@/actions/auth";
import type { Role, Gender } from "@prisma/client";

export function UserMenu({ name, role, gender }: { name: string; role: Role; gender: Gender | null }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-[var(--radius-md)] p-1.5 pl-2 hover:bg-bg-alt transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name} size="sm" />
        <span className="hidden sm:block text-right">
          <span className="block text-sm font-semibold text-ink leading-tight">{name}</span>
          <span className="block text-xs text-ink-faint leading-tight">{roleLabel(role, gender)}</span>
        </span>
        <ChevronDown className="hidden sm:block size-4 text-ink-faint" />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-scale-in absolute left-0 top-full mt-2 w-52 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-lg)]"
        >
          <div className="border-b border-border px-3.5 py-3 sm:hidden">
            <p className="text-sm font-semibold text-ink">{name}</p>
            <p className="text-xs text-ink-faint">{roleLabel(role, gender)}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3.5 py-3 text-sm font-medium text-error hover:bg-error-soft transition-colors"
              role="menuitem"
            >
              <LogOut className="size-4" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
