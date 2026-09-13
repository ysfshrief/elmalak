"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { NAV_ITEMS } from "./nav-items";
import { CopticCross } from "./CopticCross";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <CopticCross className="size-8 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink leading-tight">خدمة التربية الكنسية</p>
          <p className="truncate text-xs text-ink-faint leading-tight">كنيسة الملاك ميخائيل بدمنهور</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
          const active = item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[0.95rem] font-semibold transition-colors",
                active
                  ? "bg-primary-soft text-primary-ink"
                  : "text-ink-muted hover:bg-bg-alt hover:text-ink"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
