import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, School, Cross, Cake, ClipboardCheck, HeartHandshake } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMemberDetail, getMemberAttendanceStats, getMemberVisitationHistory } from "@/lib/queries";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { MemberDetailActions } from "@/components/domain/MemberDetailActions";
import { formatArabicDate, formatShortDate, calculateAge, monthName } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ memberId: string }>;
}): Promise<Metadata> {
  const { memberId } = await params;
  const user = await requireUser();
  const member = await getMemberDetail(user, memberId);
  return { title: member?.fullName ?? "مخدوم" };
}

export default async function MemberDetailPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const user = await requireUser();
  const member = await getMemberDetail(user, memberId);
  if (!member) notFound();

  const [attendance, visitation] = await Promise.all([
    getMemberAttendanceStats(memberId),
    getMemberVisitationHistory(memberId, 6),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href={`/families/${member.familyId}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        {member.family.name}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in-up">
        <div className="flex items-center gap-3.5">
          <Avatar name={member.fullName} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{member.fullName}</h1>
              {!member.isActive && <Badge tone="neutral">غير نشط</Badge>}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              <Badge tone="primary">{member.family.stage.name}</Badge>
              {member.birthDate && <span className="tabular-nums">{calculateAge(member.birthDate)} سنة</span>}
            </p>
          </div>
        </div>
        <MemberDetailActions member={member} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-fade-in-up">
          <CardHeader>
            <CardTitle>البيانات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={Cake} label="تاريخ الميلاد" value={formatArabicDate(member.birthDate)} />
            <InfoRow icon={School} label="المدرسة" value={member.school || "—"} />
            <InfoRow icon={Cross} label="أب الاعتراف" value={member.confessionFather || "—"} />
            <InfoRow icon={MapPin} label="العنوان" value={member.address || "—"} />

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-muted">أرقام التليفونات</p>
              {member.phones.length === 0 ? (
                <p className="text-sm text-ink-faint">لا توجد أرقام مسجلة</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {member.phones.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-[var(--radius-sm)] bg-bg-alt px-3 py-2 text-sm"
                    >
                      <span className="text-ink-muted">{p.label}</span>
                      <a href={`tel:${p.number}`} className="font-semibold tabular-nums text-primary-ink hover:underline">
                        {p.number}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {member.notes && (
              <div>
                <p className="mb-1 text-sm font-semibold text-ink-muted">ملاحظات</p>
                <p className="text-sm text-ink whitespace-pre-line">{member.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="size-4.5 text-primary" />
                نسبة الحضور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold tabular-nums text-ink">
                {attendance.rate !== null ? `${attendance.rate}%` : "—"}
              </p>
              <p className="text-sm text-ink-faint">{attendance.present} من {attendance.total} جلسة</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="size-4.5 text-info" />
                آخر افتقاد
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visitation.length === 0 ? (
                <p className="text-sm text-ink-faint">لا توجد سجلات افتقاد بعد</p>
              ) : (
                <ul className="space-y-1.5">
                  {visitation.map((v) => (
                    <li key={v.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">
                        {monthName(v.month)} {v.year}
                      </span>
                      <Badge tone={v.visited ? "success" : "neutral"}>{v.visited ? "تم" : "لم يتم"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {attendance.records.length > 0 && (
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>سجل الحضور</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {attendance.records.slice(0, 20).map((r) => (
                <span
                  key={r.id}
                  title={formatShortDate(r.session.date)}
                  className="flex items-center gap-1.5 rounded-full bg-bg-alt px-2.5 py-1 text-xs font-medium text-ink-muted"
                >
                  <span
                    className={`size-2 rounded-full ${
                      r.status === "PRESENT" ? "bg-success" : r.status === "EXCUSED" ? "bg-warning" : "bg-error"
                    }`}
                  />
                  {formatShortDate(r.session.date)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4.5 shrink-0 text-ink-faint" />
      <div>
        <p className="text-xs text-ink-faint">{label}</p>
        <p className="text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
