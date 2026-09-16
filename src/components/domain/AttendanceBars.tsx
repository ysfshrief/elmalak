"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { AttendanceStat } from "@/lib/attendance-stats";

/**
 * مقارنة نسب الحضور.
 *
 * كل الأعمدة تقيس الشيء نفسه (نسبة الحضور) وتُقارَن بالمقدار، فلونها واحد:
 * ألوانٌ مختلفة كانت ستوحي بهويات مختلفة لا وجود لها. والنسبة مكتوبة على كل
 * عمود، فالقراءة لا تتوقّف على تمييز لون ولا على طول عمود.
 */
export function AttendanceBars({
  stats,
  pointsEnabled,
  emptyMessage = "لا توجد بيانات حضور بعد",
}: {
  stats: AttendanceStat[];
  pointsEnabled: boolean;
  emptyMessage?: string;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  if (stats.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-faint">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-1">
      {stats.map((stat) => {
        const open = openId === stat.id;
        const recorded = stat.rate !== null;

        return (
          <li key={stat.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : stat.id)}
              aria-expanded={open}
              aria-label={describe(stat, pointsEnabled)}
              className={cn(
                "group w-full rounded-[var(--radius-sm)] px-2 py-2 text-start transition-colors",
                "hover:bg-bg-alt focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {stat.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-extrabold tabular-nums",
                    recorded ? "text-ink" : "text-ink-faint"
                  )}
                >
                  {recorded ? `${stat.rate}٪` : "—"}
                </span>
              </div>

              {/* المسار خافت والعمود رفيع: البيانات هي ما يُرى، لا الزينة. */}
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-border/70">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: recorded ? `${Math.max(stat.rate ?? 0, 1.5)}%` : "0%" }}
                />
              </div>

              {stat.sublabel && !open && (
                <p className="mt-1 truncate text-xs text-ink-faint">{stat.sublabel}</p>
              )}

              <div
                className={cn(
                  "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr] group-hover:grid-rows-[1fr]"
                )}
              >
                <div className="min-h-0">
                  <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <Detail label="اجتماعات" value={stat.sessions} />
                    <Detail label="حضور" value={stat.present} />
                    <Detail label="غياب" value={stat.absent} />
                    <Detail label="بعذر" value={stat.excused} />
                    {pointsEnabled && stat.points !== null && (
                      <Detail label="نقاط" value={stat.points} strong />
                    )}
                  </dl>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Detail({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <dt>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "font-bold text-primary-ink" : "font-semibold text-ink")}>
        {value}
      </dd>
    </div>
  );
}

/** وصفٌ كامل لقارئ الشاشة — لا يعتمد على رؤية العمود ولا لونه. */
function describe(stat: AttendanceStat, pointsEnabled: boolean) {
  if (stat.rate === null) return `${stat.label}: لا توجد سجلات حضور`;
  const points = pointsEnabled && stat.points !== null ? `، ${stat.points} نقطة` : "";
  return (
    `${stat.label}: نسبة حضور ${stat.rate} بالمئة، ` +
    `${stat.present} حضور من ${stat.records} سجلًا في ${stat.sessions} اجتماعًا${points}`
  );
}
