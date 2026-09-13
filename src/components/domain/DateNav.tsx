"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

function shiftDate(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DateNav({ basePath, date }: { basePath: string; date: string }) {
  const router = useRouter();

  function go(next: string) {
    router.push(`${basePath}?date=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => go(shiftDate(date, -1))} aria-label="اليوم السابق">
        <ChevronRight className="size-4.5" />
      </Button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="h-11 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <Button variant="outline" size="icon" onClick={() => go(shiftDate(date, 1))} aria-label="اليوم التالي">
        <ChevronLeft className="size-4.5" />
      </Button>
    </div>
  );
}
