import type { Metadata } from "next";
import Link from "next/link";
import { Users, ClipboardCheck, HeartHandshake, Cake, UserPlus, Network, ChartColumn } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getVisibleHierarchy } from "@/lib/queries";
import { getAttendanceTrend, getAttendanceOverview } from "@/lib/attendance-stats";
import { AttendanceTrendChart } from "@/components/domain/AttendanceTrendChart";
import { AttendanceBars } from "@/components/domain/AttendanceBars";
import { roleLabel } from "@/lib/roles";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatArabicDate } from "@/lib/utils";

export const metadata: Metadata = { title: "الرئيسية" };

function greeting() {
  return new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, stages, trend, overview] = await Promise.all([
    getDashboardData(user),
    getVisibleHierarchy(user),
    getAttendanceTrend(user),
    getAttendanceOverview(user),
  ]);

  // أعلى الصفوف نسبةً، وما لم يُسجَّل له شيء لا يزاحم ما سُجّل.
  const topGrades = overview.grades
    .filter((g) => g.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
    .slice(0, 5);

  const grades = stages.flatMap((s) => s.divisions.flatMap((d) => d.grades));
  const singleGrade = grades.length === 1 ? grades[0]! : null;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">
          {greeting()}، {user.name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <Badge tone="primary">{roleLabel(user.role, user.gender)}</Badge>
          {data.academicYear && <Badge tone="secondary">سنة {data.academicYear.name}</Badge>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Network} label="الصفوف في نطاقك" value={data.gradeCount} tone="primary" />
        <StatCard icon={Users} label="عدد المخدومين" value={data.childCount} tone="secondary" />
        <StatCard
          icon={ClipboardCheck}
          label="نسبة الحضور هذا الشهر"
          value={data.attendanceRate !== null ? `${data.attendanceRate}%` : "—"}
          tone="success"
        />
        <StatCard
          icon={HeartHandshake}
          label="نسبة الافتقاد هذا الشهر"
          value={data.visitationRate !== null ? `${data.visitationRate}%` : "—"}
          tone="info"
        />
      </div>

      <Card className="animate-fade-in-up">
        <CardHeader className="flex-wrap">
          <CardTitle>منحنى الحضور</CardTitle>
          <Link href="/statistics" className="text-sm font-semibold text-primary hover:underline">
            كل الإحصائيات
          </Link>
        </CardHeader>
        <CardContent>
          {trend.points.length === 0 ? (
            <EmptyState
              icon={ChartColumn}
              title="لم يُسجَّل حضور بعد"
              description="سجّل أول اجتماع وسيرسم المنحنى نفسه هنا"
            />
          ) : (
            <AttendanceTrendChart trend={trend} />
          )}
        </CardContent>
      </Card>

      {topGrades.length > 0 && (
        <Card className="animate-fade-in-up">
          <CardHeader className="flex-wrap">
            <CardTitle>أعلى الصفوف حضورًا</CardTitle>
            <Link href="/statistics" className="text-sm font-semibold text-primary hover:underline">
              الكل
            </Link>
          </CardHeader>
          <CardContent>
            <AttendanceBars stats={topGrades} pointsEnabled={overview.points.enabled} animate />
          </CardContent>
        </Card>
      )}

      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            href={singleGrade ? `/attendance/${singleGrade.id}` : "/attendance"}
            icon={ClipboardCheck}
            label="تسجيل حضور"
          />
          <QuickAction
            href={singleGrade ? `/visitation/${singleGrade.id}` : "/visitation"}
            icon={HeartHandshake}
            label="متابعة افتقاد"
          />
          <QuickAction
            href={singleGrade ? `/grades/${singleGrade.id}` : "/hierarchy"}
            icon={UserPlus}
            label="المخدومون"
          />
          <QuickAction href="/birthdays" icon={Cake} label="أعياد الميلاد" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>أعياد الميلاد القادمة</CardTitle>
            <Link href="/birthdays" className="text-sm font-semibold text-primary hover:underline">
              الكل
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingBirthdays.length === 0 ? (
              <EmptyState icon={Cake} title="لا توجد أعياد ميلاد قريبة" description="خلال الـ30 يومًا القادمة" />
            ) : (
              <ul className="divide-y divide-border">
                {data.upcomingBirthdays.map(({ enrollment, child, days }) => (
                  <li key={enrollment.id} className="flex items-center gap-3 py-3">
                    <Avatar name={child.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{child.fullName}</p>
                      <p className="text-xs text-ink-faint">{formatArabicDate(child.birthDate)}</p>
                    </div>
                    <Badge tone={days === 0 ? "success" : "neutral"}>
                      {days === 0 ? "اليوم 🎉" : days === 1 ? "غدًا" : `بعد ${days} يوم`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>آخر النشاطات</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="لا يوجد نشاط بعد"
                description="ستظهر هنا آخر عمليات الحضور والمخدومين الجدد"
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentActivity.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="flex items-start gap-3 py-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-alt text-ink-muted">
                      {item.type === "attendance" ? (
                        <ClipboardCheck className="size-4" />
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        {item.type === "attendance" ? "تسجيل حضور" : "مخدوم جديد"} —{" "}
                        <span className="font-semibold">{item.where}</span>
                      </p>
                      <p className="text-xs text-ink-faint">{item.meta}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-2 p-4 text-center transition-all hover:border-primary/40 hover:bg-primary-soft active:scale-[0.98]"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary-ink group-hover:bg-primary group-hover:text-primary-contrast transition-colors">
        <Icon className="size-5" />
      </span>
      <span className="text-xs font-bold text-ink">{label}</span>
    </Link>
  );
}
