"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertGradeAccess } from "@/lib/scope";
import { canManageStructure, canRenameGradeFamily } from "@/lib/roles";
import {
  stageSchema,
  divisionSchema,
  gradeSchema,
  gradeFamilyNameSchema,
  attendancePointsSchema,
} from "@/lib/validation";
import type { Gender } from "@prisma/client";

async function requireStructureAdmin() {
  const user = await requireUser();
  if (!canManageStructure(user.role)) {
    throw new Error("تعديل الهيكل التنظيمي متاح لمسؤول النظام فقط");
  }
  return user;
}

function revalidateStructure() {
  revalidatePath("/settings/structure");
  revalidatePath("/hierarchy");
  revalidatePath("/dashboard");
}

export async function createStageAction(input: unknown) {
  await requireStructureAdmin();
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const service = await prisma.service.findFirst();
  if (!service) throw new Error("لم يتم تهيئة الخدمة بعد");

  const stage = await prisma.stage.create({
    data: { ...parsed.data, serviceId: service.id },
  });
  revalidateStructure();
  return stage;
}

export async function deleteStageAction(stageId: string) {
  await requireStructureAdmin();
  const children = await prisma.enrollment.count({ where: { grade: { division: { stageId } } } });
  if (children > 0) throw new Error("لا يمكن حذف المرحلة لوجود مخدومين مقيّدين بها");

  await prisma.stage.delete({ where: { id: stageId } });
  revalidateStructure();
}

export async function createDivisionAction(input: unknown) {
  await requireStructureAdmin();
  const parsed = divisionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const { gender, ...rest } = parsed.data;
  const division = await prisma.division.create({
    data: { ...rest, gender: (gender || null) as Gender | null },
  });
  revalidateStructure();
  return division;
}

export async function deleteDivisionAction(divisionId: string) {
  await requireStructureAdmin();
  const children = await prisma.enrollment.count({ where: { grade: { divisionId } } });
  if (children > 0) throw new Error("لا يمكن حذف القسم لوجود مخدومين مقيّدين به");

  await prisma.division.delete({ where: { id: divisionId } });
  revalidateStructure();
}

export async function createGradeAction(input: unknown) {
  await requireStructureAdmin();
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const { familyName, ...rest } = parsed.data;
  const grade = await prisma.grade.create({
    data: { ...rest, familyName: familyName || null },
  });
  revalidateStructure();
  return grade;
}

export async function deleteGradeAction(gradeId: string) {
  await requireStructureAdmin();
  const children = await prisma.enrollment.count({ where: { gradeId } });
  if (children > 0) throw new Error("لا يمكن حذف الصف لوجود مخدومين مقيّدين به");

  await prisma.grade.delete({ where: { id: gradeId } });
  revalidateStructure();
}

/**
 * تسمية أسرة الفصل — أمين المرحلة يسجّلها لصفوف نطاقه (وليس للهيكل كله).
 */
export async function setGradeFamilyNameAction(input: unknown) {
  const user = await requireUser();
  const parsed = gradeFamilyNameSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  if (!canRenameGradeFamily(user.role)) {
    throw new Error("تسمية أسرة الفصل متاحة لأمين المرحلة فما فوق");
  }
  await assertGradeAccess(user, parsed.data.gradeId);

  await prisma.grade.update({
    where: { id: parsed.data.gradeId },
    data: { familyName: parsed.data.familyName || null },
  });

  revalidatePath(`/grades/${parsed.data.gradeId}`);
  revalidateStructure();
}

/**
 * إعدادات نقاط الحضور — إعدادٌ على مستوى الخدمة، فهو لمسؤول النظام وحده.
 * ولا يمسّ سجلًا واحدًا من سجلات الحضور: النقاط تُحسب منها ولا تُخزَّن فيها.
 */
export async function setAttendancePointsAction(input: unknown) {
  await requireStructureAdmin();

  const parsed = attendancePointsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const service = await prisma.service.findFirst({ select: { id: true } });
  if (!service) throw new Error("لا توجد خدمة مُهيّأة");

  await prisma.service.update({
    where: { id: service.id },
    data: {
      attendancePointsEnabled: parsed.data.enabled,
      attendancePointValue: parsed.data.pointValue,
    },
  });

  revalidatePath("/settings/points");
  revalidatePath("/statistics");
  revalidatePath("/dashboard");
}
