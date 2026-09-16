import type { Metadata } from "next";
import { ClipboardCheck, CalendarDays, Sparkles, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAttendanceOverview } from "@/lib/attendance-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { AttendanceBars } from "@/components/domain/AttendanceBars";

export const metadata: Metadata = { title: "إحصائيات الحضور" };

export default async function StatisticsPage() {
  const user = await requireUser();
  const overview = await getAttendanceOverview(user);
  const { points } = overview;

  // الصفوف التي لها سجلات تتصدّر، وما لم يُسجَّل بعد يبقى مذكورًا في آخر
  // القائمة: إخفاؤه يُوهم أنه غير موجود، وتصديره يُغرق ما فيه معلومة.
  const grades = [...overview.grades].sort((a, b) => {
    if ((a.rate === null) !== (b.rate === null)) return a.rate === null ? 1 : -1;
    return 0;
  });

  const nothingRecorded =
    overview.grades.length > 0 && overview.grades.every((g) => g.rate === null);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">إحصائيات الحضور</h1>
        <p className="mt-1 text-sm text-ink-muted">
          نسبة الحضور = الحضور المسجَّل ÷ السجلات المسجَّلة
          {overview.academicYear && ` — السنة الدراسية ${overview.academicYear}`}
        </p>
      </div>

      {overview.grades.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="لا توجد صفوف في نطاقك"
          description="الإحصائيات تُحسب من الصفوف التي تخدم فيها."
        />
      ) : nothingRecorded ? (
        <EmptyState
          icon={CalendarDays}
          title="لم يُسجَّل حضور بعد"
          description="سجّل أول اجتماع من صفحة الحضور والغياب، وستظهر النسب هنا."
        />
      ) : (
        <>
          {overview.service && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={ClipboardCheck}
                label="نسبة حضور الخدمة"
                value={overview.service.rate !== null ? `${overview.service.rate}٪` : "—"}
                hint={`${overview.service.present} حضور من ${overview.service.records} سجلًا`}
              />
              <StatCard
                icon={CalendarDays}
                label="اجتماعات مسجَّلة"
                value={overview.service.sessions}
                tone="secondary"
              />
              <StatCard
                icon={Users}
                label="صفوف"
                value={overview.grades.length}
                tone="info"
              />
              {points.enabled && (
                <StatCard
                  icon={Sparkles}
                  label="مجموع النقاط"
                  value={overview.service.points ?? 0}
                  tone="warning"
                  hint={`${points.pointValue} نقطة لكل حضور`}
                />
              )}
            </div>
          )}

          {overview.stages.length > 0 && (
            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle>حسب المرحلة</CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceBars stats={overview.stages} pointsEnabled={points.enabled} animate />
              </CardContent>
            </Card>
          )}

          <Card className="animate-fade-in-up">
            <CardHeader className="flex-wrap">
              <CardTitle>حسب الصف</CardTitle>
              <p className="text-xs text-ink-faint">اضغط على أي صف لتفصيل أرقامه</p>
            </CardHeader>
            <CardContent>
              <AttendanceBars stats={grades} pointsEnabled={points.enabled} animate />
            </CardContent>
          </Card>

          {overview.partialStages.length > 0 && (
            <p className="text-center text-xs text-ink-faint">
              لا تُعرض نسبة {overview.partialStages.join(" و")} لأن نطاقك يشمل بعض صفوفها فقط،
              ونسبةٌ محسوبة من جزء ليست نسبة المرحلة.
            </p>
          )}
        </>
      )}
    </div>
  );
}
