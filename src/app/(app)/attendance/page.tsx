import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, ChevronLeft, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAccessibleFamilies } from "@/lib/queries";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "الحضور والغياب" };

export default async function AttendanceIndexPage() {
  const user = await requireUser();
  const families = await getAccessibleFamilies(user);

  if (families.length === 1) {
    redirect(`/attendance/${families[0]!.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">الحضور والغياب</h1>
        <p className="mt-1 text-sm text-ink-muted">اختر الأسرة لتسجيل أو مراجعة الحضور</p>
      </div>

      {families.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="لا توجد أسر متاحة" description="لم يتم تعيينك على أي أسرة بعد" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {families.map((f) => (
            <Link
              key={f.id}
              href={`/attendance/${f.id}`}
              className="group flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] transition-all hover:border-primary/40 hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{f.name}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge tone="primary">{f.stage.name}</Badge>
                  <span className="flex items-center gap-1 text-xs text-ink-faint">
                    <Users className="size-3.5" />
                    {f._count.members}
                  </span>
                </div>
              </div>
              <ChevronLeft className="size-5 shrink-0 text-ink-faint transition-transform group-hover:-translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
