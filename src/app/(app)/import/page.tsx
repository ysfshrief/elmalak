import type { Metadata } from "next";
import { FileSpreadsheet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentAcademicYear, getScopedGradeOptions } from "@/lib/queries";
import { ImportWizard } from "@/components/domain/ImportWizard";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "استيراد كشف" };

export default async function ImportPage() {
  const user = await requireUser();
  const [grades, year] = await Promise.all([
    getScopedGradeOptions(user),
    getCurrentAcademicYear(),
  ]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">استيراد كشف المخدومين</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ارفع كشفًا جاهزًا بدل إدخال الأسماء واحدًا واحدًا — وراجعه قبل الحفظ
        </p>
      </div>

      {grades.length === 0 || !year ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={!year ? "لا توجد سنة دراسية مُفعّلة" : "لا توجد صفوف في نطاقك"}
          description={
            !year
              ? "يُفعّل مسؤول النظام السنة الدراسية أولًا، ثم يمكن استيراد الكشوف."
              : "الاستيراد متاح للصفوف التي تخدم فيها. راجع تكليفك مع أمين الخدمة."
          }
        />
      ) : (
        <ImportWizard grades={grades} academicYear={year.name} />
      )}
    </div>
  );
}
