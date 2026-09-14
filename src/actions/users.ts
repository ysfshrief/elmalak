"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, hashPassword } from "@/lib/auth";
import { canManageUsers } from "@/lib/roles";
import { userSchema } from "@/lib/validation";
import type { Gender } from "@prisma/client";

async function requireAdmin() {
  const user = await requireUser();
  if (!canManageUsers(user.role)) {
    throw new Error("إدارة الحسابات متاحة لمسؤول النظام فقط");
  }
  return user;
}

type AssignmentInput = {
  serviceId?: string;
  stageId?: string;
  divisionId?: string;
  gradeId?: string;
};

/** يقبل مستوى واحدًا فقط لكل تكليف، ويرفض التكليف الفارغ أو المزدوج. */
function normalizeAssignments(assignments: AssignmentInput[]) {
  return assignments.map((a) => {
    const levels = {
      serviceId: a.serviceId || null,
      stageId: a.stageId || null,
      divisionId: a.divisionId || null,
      gradeId: a.gradeId || null,
    };
    const filled = Object.values(levels).filter(Boolean).length;
    if (filled !== 1) {
      throw new Error("كل تكليف يجب أن يحدد مستوى واحدًا بالضبط (خدمة أو مرحلة أو قسم أو صف)");
    }
    return levels;
  });
}

export async function createUserAction(input: unknown) {
  await requireAdmin();
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const data = parsed.data;
  if (!data.password) throw new Error("كلمة المرور مطلوبة عند إنشاء مستخدم جديد");

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) throw new Error("اسم المستخدم مستخدم بالفعل");

  const assignments = data.role === "ADMIN" ? [] : normalizeAssignments(data.assignments);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      phone: data.phone || null,
      role: data.role,
      gender: (data.gender || null) as Gender | null,
      passwordHash: await hashPassword(data.password),
      assignments: { create: assignments },
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
  const clash = await prisma.user.findFirst({
    where: { username: data.username, NOT: { id: userId } },
  });
  if (clash) throw new Error("اسم المستخدم مستخدم بالفعل");

  const assignments = data.role === "ADMIN" ? [] : normalizeAssignments(data.assignments);
  const passwordHash = data.password ? await hashPassword(data.password) : undefined;

  await prisma.$transaction([
    prisma.assignment.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        username: data.username,
        phone: data.phone || null,
        role: data.role,
        gender: (data.gender || null) as Gender | null,
        ...(passwordHash ? { passwordHash } : {}),
        assignments: { create: assignments },
      },
    }),
  ]);

  revalidatePath("/settings/users");
}

export async function toggleUserActiveAction(userId: string, isActive: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId && !isActive) throw new Error("لا يمكنك تعطيل حسابك الخاص");

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/settings/users");
}

export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error("لا يمكنك حذف حسابك الخاص");

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/settings/users");
}
