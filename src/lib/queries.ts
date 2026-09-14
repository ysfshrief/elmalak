import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveScope, canAccessGrade, type ScopedUser, type Scope } from "@/lib/scope";
import { daysUntilNextBirthday } from "@/lib/utils";

/** الصفوف المسموح بها كشرط Prisma على أي جدول يملك `gradeId`. */
function gradeFilter(scope: Scope) {
  return scope === "ALL" ? {} : { gradeId: { in: scope } };
}

export async function getService() {
  return prisma.service.findFirst();
}

export async function getCurrentAcademicYear() {
  return (
    (await prisma.academicYear.findFirst({ where: { isCurrent: true } })) ??
    (await prisma.academicYear.findFirst({ orderBy: { startDate: "desc" } }))
  );
}

export async function getAcademicYears() {
  return prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
}

/**
 * الهيكل التنظيمي كما يراه المستخدم: المراحل والأقسام والصفوف التي تقع
 * داخل نطاقه فقط، مع عدد المخدومين في كل صف للسنة الحالية.
 */
export async function getVisibleHierarchy(user: ScopedUser, academicYearId?: string) {
  const scope = await resolveScope(user);
  const year = academicYearId ?? (await getCurrentAcademicYear())?.id;

  const stages = await prisma.stage.findMany({
    orderBy: { order: "asc" },
    include: {
      divisions: {
        orderBy: { order: "asc" },
        include: {
          grades: {
            where: scope === "ALL" ? {} : { id: { in: scope } },
            orderBy: { order: "asc" },
            include: {
              _count: {
                select: { enrollments: year ? { where: { academicYearId: year } } : true },
              },
            },
          },
        },
      },
    },
  });

  // أخفِ الأقسام والمراحل التي لا يرى المستخدم أي صف بداخلها.
  return stages
    .map((stage) => ({
      ...stage,
      divisions: stage.divisions.filter((d) => d.grades.length > 0),
    }))
    .filter((stage) => stage.divisions.length > 0);
}

export async function getGradeDetail(user: ScopedUser, gradeId: string, academicYearId?: string) {
  const scope = await resolveScope(user);
  if (!canAccessGrade(scope, gradeId)) return null;

  const year = academicYearId ?? (await getCurrentAcademicYear())?.id;
  if (!year) return null;

  return prisma.grade.findUnique({
    where: { id: gradeId },
    include: {
      division: { include: { stage: true } },
      enrollments: {
        where: { academicYearId: year },
        include: { child: { include: { phones: true } } },
        orderBy: { child: { fullName: "asc" } },
      },
    },
  });
}

export async function getEnrollmentDetail(user: ScopedUser, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      child: { include: { phones: true } },
      academicYear: true,
      grade: { include: { division: { include: { stage: true } } } },
    },
  });
  if (!enrollment) return null;

  const scope = await resolveScope(user);
  if (!canAccessGrade(scope, enrollment.gradeId)) return null;
  return enrollment;
}

export async function getDashboardData(user: ScopedUser) {
  const scope = await resolveScope(user);
  const year = await getCurrentAcademicYear();
  const yearFilter = year ? { academicYearId: year.id } : {};

  const gradeScope = scope === "ALL" ? {} : { id: { in: scope } };

  const [gradeCount, childCount, grades] = await Promise.all([
    prisma.grade.count({ where: gradeScope }),
    prisma.enrollment.count({
      where: { ...gradeFilter(scope), ...yearFilter, child: { isActive: true } },
    }),
    prisma.grade.findMany({ where: gradeScope, select: { id: true } }),
  ]);

  const gradeIds = grades.map((g) => g.id);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [attendanceRecords, visitationRecords] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { session: { gradeId: { in: gradeIds }, date: { gte: start, lt: end } } },
      select: { status: true },
    }),
    prisma.visitationRecord.findMany({
      where: {
        enrollment: { gradeId: { in: gradeIds }, ...yearFilter },
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      },
      select: { visited: true },
    }),
  ]);

  const present = attendanceRecords.filter((r) => r.status === "PRESENT").length;
  const attendanceRate =
    attendanceRecords.length > 0 ? Math.round((present / attendanceRecords.length) * 100) : null;

  const visited = visitationRecords.filter((v) => v.visited).length;
  const visitationRate = childCount > 0 ? Math.round((visited / childCount) * 100) : null;

  const upcomingBirthdays = await getUpcomingBirthdays(user, 30, 6);

  const [recentSessions, recentEnrollments] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { gradeId: { in: gradeIds } },
      include: {
        grade: { include: { division: { include: { stage: true } } } },
        _count: { select: { records: { where: { status: "PRESENT" } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.enrollment.findMany({
      where: { gradeId: { in: gradeIds }, ...yearFilter },
      include: {
        child: true,
        grade: { include: { division: { include: { stage: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const recentActivity = [
    ...recentSessions.map((s) => ({
      type: "attendance" as const,
      id: s.id,
      date: s.createdAt,
      where: gradeTitle(s.grade),
      meta: `${s._count.records} حاضر بتاريخ ${s.date.toLocaleDateString("ar-EG")}`,
    })),
    ...recentEnrollments.map((e) => ({
      type: "child" as const,
      id: e.id,
      date: e.createdAt,
      where: gradeTitle(e.grade),
      meta: e.child.fullName,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6);

  return {
    gradeCount,
    childCount,
    attendanceRate,
    visitationRate,
    upcomingBirthdays,
    recentActivity,
    academicYear: year,
  };
}

type GradeWithPath = {
  name: string;
  familyName: string | null;
  division: { name: string; stage: { name: string } };
};

/** «إعدادي › بنين › الصف الثاني» — مسار الصف كاملًا للعرض. */
export function gradeTitle(grade: GradeWithPath) {
  return `${grade.division.stage.name} › ${grade.division.name} › ${grade.name}`;
}

export async function getUpcomingBirthdays(user: ScopedUser, withinDays = 30, limit?: number) {
  const scope = await resolveScope(user);
  const year = await getCurrentAcademicYear();

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...gradeFilter(scope),
      ...(year ? { academicYearId: year.id } : {}),
      child: { isActive: true, birthDate: { not: null } },
    },
    include: {
      child: true,
      grade: { include: { division: { include: { stage: true } } } },
    },
  });

  const withDays = enrollments
    .map((e) => ({ enrollment: e, child: e.child, days: daysUntilNextBirthday(e.child.birthDate!) }))
    .filter((x) => x.days <= withinDays)
    .sort((a, b) => a.days - b.days);

  return limit ? withDays.slice(0, limit) : withDays;
}

export async function getBirthdaysByMonth(user: ScopedUser) {
  const scope = await resolveScope(user);
  const year = await getCurrentAcademicYear();

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...gradeFilter(scope),
      ...(year ? { academicYearId: year.id } : {}),
      child: { isActive: true, birthDate: { not: null } },
    },
    include: {
      child: true,
      grade: { include: { division: { include: { stage: true } } } },
    },
  });

  const byMonth: Record<number, typeof enrollments> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = [];
  for (const e of enrollments) byMonth[e.child.birthDate!.getMonth() + 1]!.push(e);
  for (const m of Object.keys(byMonth)) {
    byMonth[Number(m)]!.sort((a, b) => a.child.birthDate!.getDate() - b.child.birthDate!.getDate());
  }
  return byMonth;
}

export async function getAttendanceSessions(user: ScopedUser, gradeId: string) {
  const scope = await resolveScope(user);
  if (!canAccessGrade(scope, gradeId)) return [];
  return prisma.attendanceSession.findMany({
    where: { gradeId },
    include: { records: true },
    orderBy: { date: "desc" },
  });
}

export async function getAttendanceSessionByDate(user: ScopedUser, gradeId: string, date: Date) {
  const scope = await resolveScope(user);
  if (!canAccessGrade(scope, gradeId)) return null;
  return prisma.attendanceSession.findUnique({
    where: { gradeId_date: { gradeId, date } },
    include: { records: true },
  });
}

export async function getChildAttendanceStats(user: ScopedUser, enrollmentId: string) {
  const enrollment = await getEnrollmentDetail(user, enrollmentId);
  if (!enrollment) return { total: 0, present: 0, rate: null, records: [] };

  const records = await prisma.attendanceRecord.findMany({
    where: { enrollmentId },
    include: { session: true },
    orderBy: { session: { date: "desc" } },
  });
  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  return { total, present, rate: total > 0 ? Math.round((present / total) * 100) : null, records };
}

export async function getVisitationHistory(user: ScopedUser, enrollmentId: string, take = 12) {
  const enrollment = await getEnrollmentDetail(user, enrollmentId);
  if (!enrollment) return [];
  return prisma.visitationRecord.findMany({
    where: { enrollmentId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take,
  });
}

export async function getVisitationMonth(
  user: ScopedUser,
  gradeId: string,
  year: number,
  month: number
) {
  const grade = await getGradeDetail(user, gradeId);
  if (!grade) return [];

  const records = await prisma.visitationRecord.findMany({
    where: { enrollment: { gradeId }, year, month },
  });
  const byEnrollment = new Map(records.map((r) => [r.enrollmentId, r]));

  return grade.enrollments.map((e) => ({
    enrollment: e,
    child: e.child,
    record: byEnrollment.get(e.id) ?? null,
  }));
}

// ───────── إدارة (المسؤول) ─────────

export async function getAllUsers() {
  return prisma.user.findMany({
    include: {
      assignments: {
        include: {
          service: true,
          stage: true,
          division: { include: { stage: true } },
          grade: { include: { division: { include: { stage: true } } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** الهيكل الكامل بلا تصفية — لشاشات المسؤول واختيار نطاق التكليف. */
export async function getFullHierarchy() {
  return prisma.stage.findMany({
    orderBy: { order: "asc" },
    include: {
      divisions: {
        orderBy: { order: "asc" },
        include: { grades: { orderBy: { order: "asc" }, include: { _count: { select: { enrollments: true } } } } },
      },
    },
  });
}
