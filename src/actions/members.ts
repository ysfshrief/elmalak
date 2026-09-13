"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canAccessFamily } from "@/lib/rbac";
import { memberSchema } from "@/lib/validation";

export async function createMemberAction(input: unknown) {
  const user = await requireUser();
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const data = parsed.data;
  if (!(await canAccessFamily(user, data.familyId))) {
    throw new Error("لا تملك صلاحية الإضافة لهذه الأسرة");
  }

  const member = await prisma.member.create({
    data: {
      familyId: data.familyId,
      fullName: data.fullName,
      address: data.address || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      school: data.school || null,
      confessionFather: data.confessionFather || null,
      notes: data.notes || null,
      phones: { create: data.phones.map((p) => ({ label: p.label, number: p.number })) },
    },
  });

  revalidatePath(`/families/${data.familyId}`);
  revalidatePath("/birthdays");
  revalidatePath("/dashboard");
  return member;
}

export async function updateMemberAction(memberId: string, input: unknown) {
  const user = await requireUser();
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

  const data = parsed.data;
  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) throw new Error("المخدوم غير موجود");

  if (!(await canAccessFamily(user, existing.familyId)) || !(await canAccessFamily(user, data.familyId))) {
    throw new Error("لا تملك صلاحية تعديل بيانات هذا المخدوم");
  }

  await prisma.$transaction([
    prisma.memberPhone.deleteMany({ where: { memberId } }),
    prisma.member.update({
      where: { id: memberId },
      data: {
        familyId: data.familyId,
        fullName: data.fullName,
        address: data.address || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        school: data.school || null,
        confessionFather: data.confessionFather || null,
        notes: data.notes || null,
        phones: { create: data.phones.map((p) => ({ label: p.label, number: p.number })) },
      },
    }),
  ]);

  revalidatePath(`/families/${data.familyId}`);
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/birthdays");
  revalidatePath("/dashboard");
}

export async function deleteMemberAction(memberId: string) {
  const user = await requireUser();
  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) throw new Error("المخدوم غير موجود");

  if (!(await canAccessFamily(user, existing.familyId))) {
    throw new Error("لا تملك صلاحية حذف هذا المخدوم");
  }

  await prisma.member.delete({ where: { id: memberId } });
  revalidatePath(`/families/${existing.familyId}`);
  revalidatePath("/birthdays");
  revalidatePath("/dashboard");
}

export async function toggleMemberActiveAction(memberId: string, isActive: boolean) {
  const user = await requireUser();
  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) throw new Error("المخدوم غير موجود");

  if (!(await canAccessFamily(user, existing.familyId))) {
    throw new Error("لا تملك صلاحية تعديل هذا المخدوم");
  }

  await prisma.member.update({ where: { id: memberId }, data: { isActive } });
  revalidatePath(`/families/${existing.familyId}`);
  revalidatePath(`/members/${memberId}`);
}
