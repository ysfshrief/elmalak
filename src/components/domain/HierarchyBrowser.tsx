"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Users, Layers, Network } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";

export type HierarchyGrade = {
  id: string;
  name: string;
  familyName: string | null;
  _count: { enrollments: number };
};

export type HierarchyDivision = {
  id: string;
  name: string;
  grades: HierarchyGrade[];
};

export type HierarchyStage = {
  id: string;
  name: string;
  divisions: HierarchyDivision[];
};

/**
 * يعرض المراحل ← الأقسام ← الصفوف. `basePath` يحدد وجهة الضغط على الصف
 * (تصفّح، أو تسجيل حضور، أو افتقاد).
 */
export function HierarchyBrowser({
  stages,
  basePath,
  emptyHint,
}: {
  stages: HierarchyStage[];
  basePath: string;
  emptyHint?: string;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) return stages;
    return stages
      .map((stage) => ({
        ...stage,
        divisions: stage.divisions
          .map((d) => ({
            ...d,
            grades: d.grades.filter(
              (g) =>
                g.name.includes(q) ||
                g.familyName?.includes(q) ||
                d.name.includes(q) ||
                stage.name.includes(q)
            ),
          }))
          .filter((d) => d.grades.length > 0),
      }))
      .filter((s) => s.divisions.length > 0);
  }, [stages, query]);

  if (stages.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="لا توجد صفوف متاحة لك"
        description={emptyHint ?? "لم يتم تكليفك بأي مرحلة أو صف بعد. راجع مسؤول النظام."}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="ابحث بالمرحلة أو الصف أو اسم الأسرة..."
        className="sm:max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Network} title="لا توجد نتائج" description="جرّب كلمات بحث أخرى" />
      ) : (
        filtered.map((stage) => (
          <section key={stage.id} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink-muted">
              <Layers className="size-4 text-primary" />
              {stage.name}
            </h2>

            {stage.divisions.map((division) => (
              <div key={division.id} className="space-y-2">
                {division.name !== stage.name && (
                  <p className="text-xs font-semibold text-ink-faint">{division.name}</p>
                )}
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {division.grades.map((grade) => (
                    <Link
                      key={grade.id}
                      href={`${basePath}/${grade.id}`}
                      className="group flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-all hover:border-primary/40 hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{grade.name}</p>
                        {grade.familyName ? (
                          <p className="truncate text-xs text-primary-ink">{grade.familyName}</p>
                        ) : (
                          <p className="text-xs text-ink-faint">بدون اسم أسرة</p>
                        )}
                        <Badge tone="neutral" className="mt-1.5">
                          <Users className="size-3" />
                          {grade._count.enrollments} مخدوم
                        </Badge>
                      </div>
                      <ChevronLeft className="size-5 shrink-0 text-ink-faint transition-transform group-hover:-translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
