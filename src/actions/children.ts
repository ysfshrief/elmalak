"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertGradeAccess, assertEnrollmentAccess } from "@/lib/scope";
import { canDeleteChild } from "@/lib/roles";
import { childSchema } from "@/lib/validation";
import { getCurrentAcademicYear } from "@/lib/queries";
import { deletePhoto } from "@/lib/drive";
import type { Gender } from "@prisma/client";

function childData(data: {
  fullName: string;
  gender?: string;
  address?: string;
  birthDate?: string;
  school?: string;
  confessionFather?: string;
  notes?: string;
}) {
  return {
    fullName: data.fullName,
    gender: (data.gender || null) as Gender | null,
    address: data.address || null,
    birthDate: data.birthDate ? new Date(data.birthDate) : null,
    school: data.school || null,
    confessionFather: data.confessionFather || null,
    notes: data.notes || null,
  };
}

export async function createChildAction(input: unknown) {
  const user = await requireUser();
  const parsed = childSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const data = parsed.data;
  await assertGradeAccess(user, data.gradeId);

  const year = await getCurrentAcademicYear();
  if (!year) throw new Error("لا توجد سنة دراسية مُفعّلة");

  const child = await prisma.child.create({
    data: {
      ...childData(data),
      phones: { create: data.phones.map((p) => ({ label: p.label, number: p.number })) },
      enrollments: { create: { gradeId: data.gradeId, academicYearId: year.id } },
    },
  });

  revalidatePath(`/grades/${data.gradeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/birthdays");
  return child;
}

export async function updateChildAction(enrollmentId: string, input: unknown) {
  const user = await requireUser();
  const parsed = childSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const data = parsed.data;
  const enrollment = await assertEnrollmentAccess(user, enrollmentId);
  // نقل المخدوم إلى صف آخر يتطلب صلاحية على الصف الجديد أيضًا.
  if (data.gradeId !== enrollment.gradeId) await assertGradeAccess(user, data.gradeId);

  await prisma.$transaction([
    prisma.childPhone.deleteMany({ where: { childId: enrollment.childId } }),
    prisma.child.update({
      where: { id: enrollment.childId },
      data: {
        ...childData(data),
        phones: { create: data.phones.map((p) => ({ label: p.label, number: p.number })) },
      },
    }),
    prisma.enrollment.update({ where: { id: enrollmentId }, data: { gradeId: data.gradeId } }),
  ]);

  revalidatePath(`/grades/${data.gradeId}`);
  revalidatePath(`/grades/${enrollment.gradeId}`);
  revalidatePath(`/children/${enrollmentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/birthdays");
}

export async function deleteChildAction(enrollmentId: string) {
  const user = await requireUser();
  if (!canDeleteChild(user.role)) {
    throw new Error("حذف المخدوم متاح لأمين المرحلة فما فوق");
  }
  const enrollment = await assertEnrollmentAccess(user, enrollmentId);

  const child = await prisma.child.findUnique({
    where: { id: enrollment.childId },
    select: { photoFileId: true },
  });

  await prisma.child.delete({ where: { id: enrollment.childId } });

  // تنظيف الصورة بعد حذف السجل: لو فشل بقي ملفٌ زائد في الخزنة لا أكثر،
  // أمّا العكس فقد يحذف صورةً ثم يُبقي مخدومًا يشير إليها.
  if (child?.photoFileId) await deletePhoto(child.photoFileId);

  revalidatePath(`/grades/${enrollment.gradeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/birthdays");
}

export async function toggleChildActiveAction(enrollmentId: string, isActive: boolean) {
  const user = await requireUser();
  const enrollment = await assertEnrollmentAccess(user, enrollmentId);

  await prisma.child.update({ where: { id: enrollment.childId }, data: { isActive } });

  revalidatePath(`/grades/${enrollment.gradeId}`);
  revalidatePath(`/children/${enrollmentId}`);
}
