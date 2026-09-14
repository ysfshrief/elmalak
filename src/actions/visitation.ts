"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertEnrollmentAccess } from "@/lib/scope";
import { visitationUpdateSchema } from "@/lib/validation";

export async function setVisitationAction(input: unknown) {
  const user = await requireUser();
  const parsed = visitationUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const { enrollmentId, year, month, visited, note } = parsed.data;
  const enrollment = await assertEnrollmentAccess(user, enrollmentId);

  await prisma.visitationRecord.upsert({
    where: { enrollmentId_year_month: { enrollmentId, year, month } },
    update: {
      visited,
      note: note || null,
      visitedAt: visited ? new Date() : null,
      recordedById: user.id,
    },
    create: {
      enrollmentId,
      year,
      month,
      visited,
      note: note || null,
      visitedAt: visited ? new Date() : null,
      recordedById: user.id,
    },
  });

  revalidatePath(`/visitation/${enrollment.gradeId}`);
  revalidatePath("/dashboard");
}
