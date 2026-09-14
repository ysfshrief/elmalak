import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export type ScopedUser = {
  id: string;
  role: Role;
  assignments: {
    serviceId: string | null;
    stageId: string | null;
    divisionId: string | null;
    gradeId: string | null;
  }[];
};

/** `"ALL"` = بلا قيد (المسؤول)، وإلا قائمة مُعرِّفات الصفوف المسموح بها. */
export type Scope = "ALL" | string[];

/**
 * يترجم (الدور + التكليفات) إلى الصفوف التي يراها المستخدم فعليًا.
 *
 * هذه هي نقطة الحقيقة الوحيدة للصلاحيات: كل استعلام وكل تعديل يمر منها،
 * فلا يعتمد الأمان على تذكّر كاتب الصفحة أن يفحص.
 */
export async function resolveScope(user: ScopedUser): Promise<Scope> {
  if (user.role === "ADMIN") return "ALL";

  const serviceIds = user.assignments.map((a) => a.serviceId).filter((id): id is string => !!id);
  const stageIds = user.assignments.map((a) => a.stageId).filter((id): id is string => !!id);
  const divisionIds = user.assignments.map((a) => a.divisionId).filter((id): id is string => !!id);
  const directGradeIds = user.assignments.map((a) => a.gradeId).filter((id): id is string => !!id);

  if (
    serviceIds.length === 0 &&
    stageIds.length === 0 &&
    divisionIds.length === 0 &&
    directGradeIds.length === 0
  ) {
    return [];
  }

  const grades = await prisma.grade.findMany({
    where: {
      OR: [
        { id: { in: directGradeIds } },
        { divisionId: { in: divisionIds } },
        { division: { stageId: { in: stageIds } } },
        { division: { stage: { serviceId: { in: serviceIds } } } },
      ],
    },
    select: { id: true },
  });

  return grades.map((g) => g.id);
}

/** شرط Prisma يُدمج في `where` أي استعلام على الصفوف. */
export function gradeWhere(scope: Scope) {
  return scope === "ALL" ? {} : { id: { in: scope } };
}

export function canAccessGrade(scope: Scope, gradeId: string) {
  return scope === "ALL" || scope.includes(gradeId);
}

/** يرفع خطأً إذا كان الصف خارج نطاق المستخدم — يُستخدم في كل mutation. */
export async function assertGradeAccess(user: ScopedUser, gradeId: string) {
  const scope = await resolveScope(user);
  if (!canAccessGrade(scope, gradeId)) {
    throw new Error("لا تملك صلاحية الوصول إلى هذا الصف");
  }
}

/** يرفع خطأً إذا كان قيد المخدوم خارج النطاق، ويرجع القيد عند النجاح. */
export async function assertEnrollmentAccess(user: ScopedUser, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, gradeId: true, childId: true },
  });
  if (!enrollment) throw new Error("القيد غير موجود");
  await assertGradeAccess(user, enrollment.gradeId);
  return enrollment;
}

/**
 * يرفع خطأً إذا لم يكن للمستخدم وصول إلى أي قيد لهذا المخدوم.
 * المخدوم قد يكون له قيود في سنوات وصفوف مختلفة.
 */
export async function assertChildAccess(user: ScopedUser, childId: string) {
  const scope = await resolveScope(user);
  if (scope === "ALL") return;

  const enrollment = await prisma.enrollment.findFirst({
    where: { childId, gradeId: { in: scope } },
    select: { id: true },
  });
  if (!enrollment) {
    throw new Error("لا تملك صلاحية الوصول إلى بيانات هذا المخدوم");
  }
}
