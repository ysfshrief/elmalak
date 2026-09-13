"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canManageStagesAndFamilies } from "@/lib/rbac";
import { familySchema, stageSchema } from "@/lib/validation";

export async function createFamilyAction(input: unknown) {
  const user = await requireUser();
  if (!canManageStagesAndFamilies(user.role)) {
    throw new Error("لا تملك صلاحية إضافة أسرة جديدة");
  }

  const parsed = familySchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const family = await prisma.family.create({ data: parsed.data });
  revalidatePath("/families");
  return family;
}

export async function updateFamilyAction(familyId: string, input: unknown) {
  const user = await requireUser();
  if (!canManageStagesAndFamilies(user.role)) {
    throw new Error("لا تملك صلاحية تعديل هذه الأسرة");
  }

  const parsed = familySchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const family = await prisma.family.update({ where: { id: familyId }, data: parsed.data });
  revalidatePath("/families");
  revalidatePath(`/families/${familyId}`);
  return family;
}

export async function deleteFamilyAction(familyId: string) {
  const user = await requireUser();
  if (!canManageStagesAndFamilies(user.role)) {
    throw new Error("لا تملك صلاحية حذف هذه الأسرة");
  }

  const memberCount = await prisma.member.count({ where: { familyId } });
  if (memberCount > 0) {
    throw new Error("لا يمكن حذف الأسرة لوجود مخدومين بها. انقلهم أو احذفهم أولًا");
  }

  await prisma.family.delete({ where: { id: familyId } });
  revalidatePath("/families");
}

export async function createStageAction(input: unknown) {
  const user = await requireUser();
  if (!canManageStagesAndFamilies(user.role)) {
    throw new Error("لا تملك صلاحية إضافة مرحلة جديدة");
  }

  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const stage = await prisma.stage.create({ data: parsed.data });
  revalidatePath("/settings/structure");
  revalidatePath("/families");
  return stage;
}

export async function deleteStageAction(stageId: string) {
  const user = await requireUser();
  if (!canManageStagesAndFamilies(user.role)) {
    throw new Error("لا تملك صلاحية حذف هذه المرحلة");
  }

  const familyCount = await prisma.family.count({ where: { stageId } });
  if (familyCount > 0) {
    throw new Error("لا يمكن حذف المرحلة لوجود أسر بها");
  }

  await prisma.stage.delete({ where: { id: stageId } });
  revalidatePath("/settings/structure");
  revalidatePath("/families");
}
