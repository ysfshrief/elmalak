import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccessibleFamilies, getStages } from "@/lib/queries";
import { canManageStagesAndFamilies } from "@/lib/rbac";
import { FamiliesGrid } from "@/components/domain/FamiliesGrid";

export const metadata: Metadata = { title: "الأسر والمخدومين" };

export default async function FamiliesPage() {
  const user = await requireUser();
  const families = await getAccessibleFamilies(user);

  if (user.role === "FAMILY_SERVANT" && families.length === 1) {
    redirect(`/families/${families[0]!.id}`);
  }

  const stages = canManageStagesAndFamilies(user.role) ? await getStages() : [];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">الأسر والمخدومين</h1>
        <p className="mt-1 text-sm text-ink-muted">إدارة أسر خدمة التربية الكنسية والمخدومين بها</p>
      </div>
      <FamiliesGrid families={families} stages={stages} canCreate={canManageStagesAndFamilies(user.role)} />
    </div>
  );
}
