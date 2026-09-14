import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getVisibleHierarchy } from "@/lib/queries";
import { HierarchyBrowser } from "@/components/domain/HierarchyBrowser";

export const metadata: Metadata = { title: "الافتقاد" };

export default async function VisitationIndexPage() {
  const user = await requireUser();
  const stages = await getVisibleHierarchy(user);

  const grades = stages.flatMap((s) => s.divisions.flatMap((d) => d.grades));
  if (grades.length === 1) redirect(`/visitation/${grades[0]!.id}`);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">الافتقاد</h1>
        <p className="mt-1 text-sm text-ink-muted">اختر الصف لمتابعة افتقاد مخدوميه</p>
      </div>
      <HierarchyBrowser stages={stages} basePath="/visitation" />
    </div>
  );
}
