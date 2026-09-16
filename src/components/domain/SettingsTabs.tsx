"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/users", label: "المستخدمون" },
  { href: "/settings/structure", label: "الهيكل التنظيمي" },
  { href: "/settings/points", label: "نقاط الحضور" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
