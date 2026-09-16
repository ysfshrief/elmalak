"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import type { Role } from "@prisma/client";
import { NAV_ITEMS, MOBILE_NAV_HREFS, mobileOverflowItems } from "./nav-items";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const items = MOBILE_NAV_HREFS.map((href) => NAV_ITEMS.find((i) => i.href === href)!).filter(
    Boolean
  );
  const overflow = mobileOverflowItems(role);
  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
  // زرّ «المزيد» يُضيء حين تكون الصفحة الحالية إحدى صفحاته.
  const inOverflow = overflow.some(isActive);

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-30 flex lg:hidden border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
        aria-label="التنقل الرئيسي"
      >
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-14"
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn("size-5.5 transition-colors", active ? "text-primary" : "text-ink-faint")}
              />
              <span
                className={cn(
                  "text-[0.68rem] font-semibold transition-colors",
                  active ? "text-primary" : "text-ink-faint"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-14"
        >
          <MoreHorizontal
            className={cn("size-5.5 transition-colors", inOverflow ? "text-primary" : "text-ink-faint")}
          />
          <span
            className={cn(
              "text-[0.68rem] font-semibold transition-colors",
              inOverflow ? "text-primary" : "text-ink-faint"
            )}
          >
            المزيد
          </span>
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="المزيد" size="sm">
        <ul className="-mx-1 space-y-1">
          {overflow.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-3 text-[0.95rem] font-semibold transition-colors",
                    active ? "bg-primary-soft text-primary-ink" : "text-ink-muted hover:bg-bg-alt hover:text-ink"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
