import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFamilyDetail, getAttendanceSessionByDate, getAttendanceSessions } from "@/lib/queries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DateNav } from "@/components/domain/DateNav";
import { AttendanceGrid } from "@/components/domain/AttendanceGrid";
import { formatArabicDate } from "@/lib/utils";
import type { AttendanceStatus } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ familyId: string }>;
}): Promise<Metadata> {
  const { familyId } = await params;
  const user = await requireUser();
  const family = await getFamilyDetail(user, familyId);
  return { title: family ? `الحضور — ${family.name}` : "الحضور" };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendanceFamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { familyId } = await params;
  const { date: dateParam } = await searchParams;
  const user = await requireUser();

  const family = await getFamilyDetail(user, familyId);
  if (!family) notFound();

  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayISO();
  const activeMembers = family.members.filter((m) => m.isActive);

  const [session, history] = await Promise.all([
    getAttendanceSessionByDate(familyId, new Date(date)),
    getAttendanceSessions(familyId),
  ]);

  const initialStatuses: Record<string, AttendanceStatus> = {};
  if (session) {
    for (const r of session.records) initialStatuses[r.memberId] = r.status;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">الحضور والغياب</h1>
            <Badge tone="primary">{family.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{formatArabicDate(date)}</p>
        </div>
        <DateNav basePath={`/attendance/${familyId}`} date={date} />
      </div>

      <Card className="animate-fade-in-up">
        <CardContent className="pt-5">
          <AttendanceGrid
            key={date}
            familyId={familyId}
            date={date}
            sessionId={session?.id ?? null}
            members={activeMembers}
            initialStatuses={initialStatuses}
          />
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4.5 text-primary" />
              سجل الجلسات السابقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {history.slice(0, 8).map((s) => {
                const present = s.records.filter((r) => r.status === "PRESENT").length;
                const iso = s.date.toISOString().slice(0, 10);
                return (
                  <li key={s.id}>
                    <a
                      href={`/attendance/${familyId}?date=${iso}`}
                      className="flex items-center justify-between py-2.5 text-sm hover:text-primary"
                    >
                      <span className={iso === date ? "font-bold text-primary" : "text-ink"}>
                        {formatArabicDate(s.date)}
                      </span>
                      <span className="tabular-nums text-ink-faint">
                        {present} / {s.records.length} حاضر
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
