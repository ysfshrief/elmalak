"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { userSchema } from "@/lib/validation";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") throw new Error("هذا الإجراء متاح لمسؤول النظام فقط");
  return user;
}

export async function createUserAction(input: unknown) {
  await requireAdmin();
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const data = parsed.data;
  if (!data.password) throw new Error("كلمة المرور مطلوبة عند إنشاء مستخدم جديد");

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) throw new Error("اسم المستخدم مستخدم بالفعل");

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      phone: data.phone || null,
      role: data.role,
      passwordHash,
      stageId: data.role === "STAGE_COORDINATOR" ? data.stageId || null : null,
      assignments:
        data.role === "FAMILY_SERVANT"
          ? { create: data.familyIds.map((familyId) => ({ familyId })) }
          : undefined,
    },
  });

  revalidatePath("/settings/users");
  return user;
}

export async function updateUserAction(userId: string, input: unknown) {
  await requireAdmin();
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const data = parsed.data;

  const existingUsername = await prisma.user.findFirst({
    where: { username: data.username, NOT: { id: userId } },
  });
  if (existingUsername) throw new Error("اسم المستخدم مستخدم بالفعل");

  await prisma.$transaction(async (tx) => {
    await tx.familyAssignment.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        username: data.username,
        phone: data.phone || null,
        role: data.role,
        stageId: data.role === "STAGE_COORDINATOR" ? data.stageId || null : null,
        ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
        assignments:
          data.role === "FAMILY_SERVANT"
            ? { create: data.familyIds.map((familyId) => ({ familyId })) }
            : undefined,
      },
    });
  });

  revalidatePath("/settings/users");
}

export async function toggleUserActiveAction(userId: string, isActive: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId && !isActive) {
    throw new Error("لا يمكنك تعطيل حسابك الخاص");
  }
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/settings/users");
}

export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error("لا يمكنك حذف حسابك الخاص");
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/settings/users");
}
