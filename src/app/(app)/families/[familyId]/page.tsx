import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, HeartHandshake, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFamilyDetail } from "@/lib/queries";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FamilyMembersList } from "@/components/domain/FamilyMembersList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ familyId: string }>;
}): Promise<Metadata> {
  const { familyId } = await params;
  const user = await requireUser();
  const family = await getFamilyDetail(user, familyId);
  return { title: family?.name ?? "الأسرة" };
}

export default async function FamilyDetailPage({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const user = await requireUser();
  const family = await getFamilyDetail(user, familyId);
  if (!family) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{family.name}</h1>
            <Badge tone="primary">{family.stage.name}</Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <Users className="size-4" />
            {family.members.length} مخدوم
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/attendance/${family.id}`}>
            <Button variant="outline">
              <ClipboardCheck className="size-4.5" />
              الحضور
            </Button>
          </Link>
          <Link href={`/visitation/${family.id}`}>
            <Button variant="outline">
              <HeartHandshake className="size-4.5" />
              الافتقاد
            </Button>
          </Link>
        </div>
      </div>

      <FamilyMembersList familyId={family.id} members={family.members} canEdit />
    </div>
  );
}
