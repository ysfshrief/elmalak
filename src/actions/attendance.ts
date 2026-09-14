"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertGradeAccess } from "@/lib/scope";
import { attendanceSessionSchema } from "@/lib/validation";
import { getCurrentAcademicYear } from "@/lib/queries";
import type { AttendanceStatus } from "@prisma/client";

export async function createAttendanceSessionAction(input: unknown) {
  const user = await requireUser();
  const parsed = attendanceSessionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const { gradeId, date, label } = parsed.data;
  await assertGradeAccess(user, gradeId);

  const year = await getCurrentAcademicYear();
  if (!year) throw new Error("لا توجد سنة دراسية مُفعّلة");

  const existing = await prisma.attendanceSession.findUnique({
    where: { gradeId_date: { gradeId, date: new Date(date) } },
  });
  if (existing) return existing;

  const enrollments = await prisma.enrollment.findMany({
    where: { gradeId, academicYearId: year.id, child: { isActive: true } },
    select: { id: true },
  });

  const session = await prisma.attendanceSession.create({
    data: {
      gradeId,
      academicYearId: year.id,
      date: new Date(date),
      label: label || null,
      createdById: user.id,
      records: {
        create: enrollments.map((e) => ({
          enrollmentId: e.id,
          status: "ABSENT" as AttendanceStatus,
        })),
      },
    },
  });

  revalidatePath(`/attendance/${gradeId}`);
  revalidatePath("/dashboard");
  return session;
}

export async function setAttendanceStatusAction(
  sessionId: string,
  enrollmentId: string,
  status: AttendanceStatus
) {
  const user = await requireUser();

  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("الجلسة غير موجودة");
  await assertGradeAccess(user, session.gradeId);

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { gradeId: true },
  });
  if (!enrollment || enrollment.gradeId !== session.gradeId) {
    throw new Error("هذا المخدوم ليس ضمن هذا الصف");
  }

  await prisma.attendanceRecord.upsert({
    where: { sessionId_enrollmentId: { sessionId, enrollmentId } },
    update: { status },
    create: { sessionId, enrollmentId, status },
  });

  revalidatePath(`/attendance/${session.gradeId}`);
  revalidatePath("/dashboard");
}

export async function deleteAttendanceSessionAction(sessionId: string) {
  const user = await requireUser();
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("الجلسة غير موجودة");
  await assertGradeAccess(user, session.gradeId);

  await prisma.attendanceSession.delete({ where: { id: sessionId } });
  revalidatePath(`/attendance/${session.gradeId}`);
  revalidatePath("/dashboard");
}
