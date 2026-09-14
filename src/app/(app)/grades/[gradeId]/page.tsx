import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, HeartHandshake, Users, ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getGradeDetail } from "@/lib/queries";
import { canRenameGradeFamily } from "@/lib/roles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GradeChildrenList } from "@/components/domain/GradeChildrenList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gradeId: string }>;
}): Promise<Metadata> {
  const { gradeId } = await params;
  const user = await requireUser();
  const grade = await getGradeDetail(user, gradeId);
  return { title: grade ? (grade.familyName ?? grade.name) : "الصف" };
}

export default async function GradePage({ params }: { params: Promise<{ gradeId: string }> }) {
  const { gradeId } = await params;
  const user = await requireUser();
  const grade = await getGradeDetail(user, gradeId);
  if (!grade) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/hierarchy"
        className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        المراحل والصفوف
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
              {grade.familyName ?? grade.name}
            </h1>
            <Badge tone="primary">
              {grade.division.stage.name} › {grade.division.name} › {grade.name}
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <Users className="size-4" />
            {grade.enrollments.length} مخدوم
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/attendance/${grade.id}`}>
            <Button variant="outline">
              <ClipboardCheck className="size-4.5" />
              الحضور
            </Button>
          </Link>
          <Link href={`/visitation/${grade.id}`}>
            <Button variant="outline">
              <HeartHandshake className="size-4.5" />
              الافتقاد
            </Button>
          </Link>
        </div>
      </div>

      <GradeChildrenList
        gradeId={grade.id}
        familyName={grade.familyName}
        canRenameFamily={canRenameGradeFamily(user.role)}
        rows={grade.enrollments.map((e) => ({ enrollmentId: e.id, child: e.child }))}
      />
    </div>
  );
}
