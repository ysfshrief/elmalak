"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, MOBILE_NAV_HREFS } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const items = MOBILE_NAV_HREFS.map((href) => NAV_ITEMS.find((i) => i.href === href)!).filter(Boolean);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 flex lg:hidden border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="التنقل الرئيسي"
    >
      {items.map((item) => {
        const active = item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-14"
            aria-current={active ? "page" : undefined}
          >
            <Icon className={cn("size-5.5 transition-colors", active ? "text-primary" : "text-ink-faint")} />
            <span className={cn("text-[0.68rem] font-semibold transition-colors", active ? "text-primary" : "text-ink-faint")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
