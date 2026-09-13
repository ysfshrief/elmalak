import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFamilyDetail, getVisitationMonth } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MonthNav } from "@/components/domain/MonthNav";
import { VisitationGrid } from "@/components/domain/VisitationGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ familyId: string }>;
}): Promise<Metadata> {
  const { familyId } = await params;
  const user = await requireUser();
  const family = await getFamilyDetail(user, familyId);
  return { title: family ? `الافتقاد — ${family.name}` : "الافتقاد" };
}

export default async function VisitationFamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { familyId } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  const family = await getFamilyDetail(user, familyId);
  if (!family) notFound();

  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month = sp.month && Number(sp.month) >= 1 && Number(sp.month) <= 12 ? Number(sp.month) : now.getMonth() + 1;

  const rows = await getVisitationMonth(familyId, year, month);
  const initialEntries: Record<string, { visited: boolean; note: string }> = {};
  for (const r of rows) {
    initialEntries[r.member.id] = { visited: r.record?.visited ?? false, note: r.record?.note ?? "" };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">الافتقاد</h1>
            <Badge tone="primary">{family.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">متابعة زيارة المخدومين شهريًا</p>
        </div>
        <MonthNav basePath={`/visitation/${familyId}`} year={year} month={month} />
      </div>

      <Card className="animate-fade-in-up">
        <CardContent className="pt-5">
          <VisitationGrid
            key={`${year}-${month}`}
            familyId={familyId}
            year={year}
            month={month}
            members={rows.map((r) => r.member)}
            initialEntries={initialEntries}
          />
        </CardContent>
      </Card>
    </div>
  );
}
