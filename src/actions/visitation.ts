"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canAccessFamily } from "@/lib/rbac";
import { visitationUpdateSchema } from "@/lib/validation";

export async function setVisitationAction(input: unknown) {
  const user = await requireUser();
  const parsed = visitationUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const { memberId, familyId, year, month, visited, note } = parsed.data;
  if (!(await canAccessFamily(user, familyId))) {
    throw new Error("لا تملك صلاحية تسجيل افتقاد لهذه الأسرة");
  }

  await prisma.visitationRecord.upsert({
    where: { memberId_year_month: { memberId, year, month } },
    update: { visited, note: note || null, visitedAt: visited ? new Date() : null, recordedById: user.id },
    create: {
      memberId,
      familyId,
      year,
      month,
      visited,
      note: note || null,
      visitedAt: visited ? new Date() : null,
      recordedById: user.id,
    },
  });

  revalidatePath(`/visitation/${familyId}`);
  revalidatePath("/dashboard");
}
