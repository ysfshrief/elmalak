import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getVisibleHierarchy, getCurrentAcademicYear } from "@/lib/queries";
import { HierarchyBrowser } from "@/components/domain/HierarchyBrowser";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "المراحل والصفوف" };

export default async function HierarchyPage() {
  const user = await requireUser();
  const [stages, year] = await Promise.all([getVisibleHierarchy(user), getCurrentAcademicYear()]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-ink">المراحل والصفوف</h1>
          {year && <Badge tone="primary">سنة {year.name}</Badge>}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          تصفّح المراحل والأقسام والصفوف التي تشرف عليها، واختر صفًا لعرض مخدوميه
        </p>
      </div>

      <HierarchyBrowser stages={stages} basePath="/grades" />
    </div>
  );
}
