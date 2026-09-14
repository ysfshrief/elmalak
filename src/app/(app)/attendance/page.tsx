import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getVisibleHierarchy } from "@/lib/queries";
import { HierarchyBrowser } from "@/components/domain/HierarchyBrowser";

export const metadata: Metadata = { title: "الحضور والغياب" };

/** يختصر الخطوات: الخادم المكلّف بصف واحد يذهب إليه مباشرة. */
function onlyGradeId(stages: Awaited<ReturnType<typeof getVisibleHierarchy>>) {
  const grades = stages.flatMap((s) => s.divisions.flatMap((d) => d.grades));
  return grades.length === 1 ? grades[0]!.id : null;
}

export default async function AttendanceIndexPage() {
  const user = await requireUser();
  const stages = await getVisibleHierarchy(user);

  const single = onlyGradeId(stages);
  if (single) redirect(`/attendance/${single}`);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">الحضور والغياب</h1>
        <p className="mt-1 text-sm text-ink-muted">اختر الصف لتسجيل أو مراجعة الحضور</p>
      </div>
      <HierarchyBrowser stages={stages} basePath="/attendance" />
    </div>
  );
}
