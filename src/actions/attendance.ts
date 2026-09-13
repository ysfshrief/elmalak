"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canAccessFamily } from "@/lib/rbac";
import { attendanceSessionSchema } from "@/lib/validation";
import type { AttendanceStatus } from "@prisma/client";

export async function createAttendanceSessionAction(input: unknown) {
  const user = await requireUser();
  const parsed = attendanceSessionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const { familyId, date, label } = parsed.data;
  if (!(await canAccessFamily(user, familyId))) {
    throw new Error("لا تملك صلاحية تسجيل حضور لهذه الأسرة");
  }

  const members = await prisma.member.findMany({ where: { familyId, isActive: true }, select: { id: true } });

  const existing = await prisma.attendanceSession.findUnique({
    where: { familyId_date: { familyId, date: new Date(date) } },
  });
  if (existing) return existing;

  const session = await prisma.attendanceSession.create({
    data: {
      familyId,
      date: new Date(date),
      label: label || null,
      createdById: user.id,
      records: {
        create: members.map((m) => ({ memberId: m.id, status: "ABSENT" as AttendanceStatus })),
      },
    },
  });

  revalidatePath(`/attendance/${familyId}`);
  revalidatePath("/dashboard");
  return session;
}

export async function setAttendanceStatusAction(
  sessionId: string,
  memberId: string,
  status: AttendanceStatus
) {
  const user = await requireUser();

  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("الجلسة غير موجودة");
  if (!(await canAccessFamily(user, session.familyId))) {
    throw new Error("لا تملك صلاحية تعديل هذا الحضور");
  }

  await prisma.attendanceRecord.upsert({
    where: { sessionId_memberId: { sessionId, memberId } },
    update: { status },
    create: { sessionId, memberId, status },
  });

  revalidatePath(`/attendance/${session.familyId}`);
  revalidatePath("/dashboard");
}

export async function deleteAttendanceSessionAction(sessionId: string) {
  const user = await requireUser();
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("الجلسة غير موجودة");
  if (!(await canAccessFamily(user, session.familyId))) {
    throw new Error("لا تملك صلاحية حذف هذه الجلسة");
  }

  await prisma.attendanceSession.delete({ where: { id: sessionId } });
  revalidatePath(`/attendance/${session.familyId}`);
  revalidatePath("/dashboard");
}
