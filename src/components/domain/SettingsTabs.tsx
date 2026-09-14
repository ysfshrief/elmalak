"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/users", label: "المستخدمون" },
  { href: "/settings/structure", label: "الهيكل التنظيمي" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
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
