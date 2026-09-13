import type { Metadata } from "next";
import Link from "next/link";
import { Cake } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getBirthdaysByMonth } from "@/lib/queries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { monthName, calculateAge } from "@/lib/utils";

export const metadata: Metadata = { title: "أعياد الميلاد" };

export default async function BirthdaysPage() {
  const user = await requireUser();
  const byMonth = await getBirthdaysByMonth(user);
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const totalCount = Object.values(byMonth).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-ink">أعياد الميلاد</h1>
        <p className="mt-1 text-sm text-ink-muted">تقويم أعياد ميلاد المخدومين موزّعًا على شهور السنة</p>
      </div>

      {totalCount === 0 ? (
        <EmptyState icon={Cake} title="لا توجد بيانات ميلاد مسجلة" description="أضف تاريخ الميلاد عند إنشاء أو تعديل بيانات المخدوم" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const members = byMonth[month] ?? [];
            const isCurrent = month === currentMonth;
            return (
              <Card key={month} className={isCurrent ? "animate-fade-in-up ring-2 ring-primary/30" : "animate-fade-in-up"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {monthName(month)}
                    {isCurrent && <Badge tone="primary">الشهر الحالي</Badge>}
                  </CardTitle>
                  <span className="text-xs text-ink-faint">{members.length}</span>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="py-4 text-center text-sm text-ink-faint">لا توجد أعياد ميلاد</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {members.map((m) => {
                        const day = m.birthDate!.getDate();
                        const isToday = isCurrent && day === currentDay;
                        return (
                          <li key={m.id}>
                            <Link
                              href={`/members/${m.id}`}
                              className="flex items-center gap-2.5 py-2.5 transition-colors hover:text-primary"
                            >
                              <Avatar name={m.fullName} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink">{m.fullName}</p>
                                <p className="text-xs text-ink-faint">{m.family.name}</p>
                              </div>
                              <span className="text-left">
                                <span className="block text-sm font-bold tabular-nums text-ink">{day}</span>
                                <span className="block text-[0.65rem] text-ink-faint">{calculateAge(m.birthDate)} سنة</span>
                              </span>
                              {isToday && <Badge tone="success">اليوم 🎉</Badge>}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
