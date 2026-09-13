import type { Metadata } from "next";
import Link from "next/link";
import { Users, ClipboardCheck, HeartHandshake, Cake, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getAccessibleFamilies } from "@/lib/queries";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatArabicDate } from "@/lib/utils";

export const metadata: Metadata = { title: "الرئيسية" };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء الخير";
  return "مساء الخير";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, families] = await Promise.all([getDashboardData(user), getAccessibleFamilies(user)]);

  const singleFamily = families.length === 1 ? families[0] : null;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">{greeting()}، {user.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-ink-muted">نظرة سريعة على خدمة التربية الكنسية اليوم</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="عدد الأسر" value={data.familyCount} tone="primary" />
        <StatCard icon={Users} label="عدد المخدومين" value={data.memberCount} tone="secondary" />
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
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            href={singleFamily ? `/attendance/${singleFamily.id}` : "/attendance"}
            icon={ClipboardCheck}
            label="تسجيل حضور"
          />
          <QuickAction
            href={singleFamily ? `/visitation/${singleFamily.id}` : "/visitation"}
            icon={HeartHandshake}
            label="متابعة افتقاد"
          />
          <QuickAction href="/families" icon={UserPlus} label="إضافة مخدوم" />
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
                {data.upcomingBirthdays.map(({ member, days }) => (
                  <li key={member.id} className="flex items-center gap-3 py-3">
                    <Avatar name={member.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{member.fullName}</p>
                      <p className="text-xs text-ink-faint">{formatArabicDate(member.birthDate)}</p>
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
              <EmptyState icon={ClipboardCheck} title="لا يوجد نشاط بعد" description="ستظهر هنا آخر عمليات الحضور والمخدومين الجدد" />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentActivity.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="flex items-start gap-3 py-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-alt text-ink-muted">
                      {item.type === "attendance" ? <ClipboardCheck className="size-4" /> : <UserPlus className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        {item.type === "attendance" ? "تسجيل حضور" : "مخدوم جديد"} — <span className="font-semibold">{item.familyName}</span>
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

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
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
