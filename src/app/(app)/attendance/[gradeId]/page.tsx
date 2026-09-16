import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getGradeDetail, getAttendanceSessionByDate, getAttendanceSessions } from "@/lib/queries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DateNav } from "@/components/domain/DateNav";
import { AttendanceGrid } from "@/components/domain/AttendanceGrid";
import { AttendanceHistory } from "@/components/domain/AttendanceHistory";
import { formatArabicDate } from "@/lib/utils";
import type { AttendanceStatus } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gradeId: string }>;
}): Promise<Metadata> {
  const { gradeId } = await params;
  const user = await requireUser();
  const grade = await getGradeDetail(user, gradeId);
  return { title: grade ? `الحضور — ${grade.familyName ?? grade.name}` : "الحضور" };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendanceGradePage({
  params,
  searchParams,
}: {
  params: Promise<{ gradeId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { gradeId } = await params;
  const { date: dateParam } = await searchParams;
  const user = await requireUser();

  const grade = await getGradeDetail(user, gradeId);
  if (!grade) notFound();

  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayISO();
  const activeRows = grade.enrollments
    .filter((e) => e.child.isActive)
    .map((e) => ({ enrollmentId: e.id, fullName: e.child.fullName }));

  const [session, history] = await Promise.all([
    getAttendanceSessionByDate(user, gradeId, new Date(date)),
    getAttendanceSessions(user, gradeId),
  ]);

  const initialStatuses: Record<string, AttendanceStatus> = {};
  if (session) for (const r of session.records) initialStatuses[r.enrollmentId] = r.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">الحضور والغياب</h1>
            <Badge tone="primary">{grade.familyName ?? grade.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {grade.division.stage.name} › {grade.division.name} › {grade.name} — {formatArabicDate(date)}
          </p>
        </div>
        <DateNav basePath={`/attendance/${gradeId}`} date={date} />
      </div>

      <Card className="animate-fade-in-up">
        <CardContent className="pt-5">
          <AttendanceGrid
            key={date}
            gradeId={gradeId}
            date={date}
            sessionId={session?.id ?? null}
            rows={activeRows}
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
            <AttendanceHistory
              gradeId={gradeId}
              activeDate={date}
              sessions={history.slice(0, 8).map((s) => ({
                id: s.id,
                date: s.date.toISOString().slice(0, 10),
                present: s.records.filter((r) => r.status === "PRESENT").length,
                total: s.records.length,
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
