import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGradeDetail, getVisitationMonth } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MonthNav } from "@/components/domain/MonthNav";
import { VisitationGrid } from "@/components/domain/VisitationGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gradeId: string }>;
}): Promise<Metadata> {
  const { gradeId } = await params;
  const user = await requireUser();
  const grade = await getGradeDetail(user, gradeId);
  return { title: grade ? `الافتقاد — ${grade.familyName ?? grade.name}` : "الافتقاد" };
}

export default async function VisitationGradePage({
  params,
  searchParams,
}: {
  params: Promise<{ gradeId: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { gradeId } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  const grade = await getGradeDetail(user, gradeId);
  if (!grade) notFound();

  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month =
    sp.month && Number(sp.month) >= 1 && Number(sp.month) <= 12 ? Number(sp.month) : now.getMonth() + 1;

  const rows = await getVisitationMonth(user, gradeId, year, month);
  const initialEntries: Record<string, { visited: boolean; note: string }> = {};
  for (const r of rows) {
    initialEntries[r.enrollment.id] = {
      visited: r.record?.visited ?? false,
      note: r.record?.note ?? "",
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">الافتقاد</h1>
            <Badge tone="primary">{grade.familyName ?? grade.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {grade.division.stage.name} › {grade.division.name} › {grade.name}
          </p>
        </div>
        <MonthNav basePath={`/visitation/${gradeId}`} year={year} month={month} />
      </div>

      <Card className="animate-fade-in-up">
        <CardContent className="pt-5">
          <VisitationGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            rows={rows.map((r) => ({
              enrollmentId: r.enrollment.id,
              fullName: r.child.fullName,
              locationUrl: r.child.locationUrl,
            }))}
            initialEntries={initialEntries}
          />
        </CardContent>
      </Card>
    </div>
  );
}
