"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { monthName } from "@/lib/utils";

export function MonthNav({ basePath, year, month }: { basePath: string; year: number; month: number }) {
  const router = useRouter();

  function go(y: number, m: number) {
    router.push(`${basePath}?year=${y}&month=${m}`);
  }

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    go(y, m);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="الشهر السابق">
        <ChevronRight className="size-4.5" />
      </Button>
      <span className="min-w-28 text-center text-sm font-bold text-ink">
        {monthName(month)} {year}
      </span>
      <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="الشهر التالي">
        <ChevronLeft className="size-4.5" />
      </Button>
    </div>
  );
}
