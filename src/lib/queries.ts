import "server-only";
import { prisma } from "@/lib/prisma";
import { getAccessibleFamilyIds } from "@/lib/rbac";
import { daysUntilNextBirthday } from "@/lib/utils";
import type { User, Role } from "@prisma/client";

type ScopedUser = Pick<User, "id" | "role" | "stageId"> & {
  assignments: { familyId: string }[];
};

export async function getStages() {
  return prisma.stage.findMany({ orderBy: { order: "asc" } });
}

export async function getAccessibleFamilies(user: ScopedUser) {
  const ids = await getAccessibleFamilyIds(user);
  return prisma.family.findMany({
    where: ids === null ? {} : { id: { in: ids } },
    include: {
      stage: true,
      _count: { select: { members: true } },
    },
    orderBy: [{ stage: { order: "asc" } }, { name: "asc" }],
  });
}

export async function getFamilyDetail(user: ScopedUser, familyId: string) {
  const ids = await getAccessibleFamilyIds(user);
  if (ids !== null && !ids.includes(familyId)) return null;

  return prisma.family.findUnique({
    where: { id: familyId },
    include: {
      stage: true,
      members: {
        include: { phones: true },
        orderBy: { fullName: "asc" },
      },
    },
  });
}

export async function getMemberDetail(user: ScopedUser, memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { phones: true, family: { include: { stage: true } } },
  });
  if (!member) return null;
  const ids = await getAccessibleFamilyIds(user);
  if (ids !== null && !ids.includes(member.familyId)) return null;
  return member;
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export async function getDashboardData(user: ScopedUser) {
  const familyIds = await getAccessibleFamilyIds(user);
  const familyFilter = familyIds === null ? {} : { id: { in: familyIds } };

  const [familyCount, memberCount, families] = await Promise.all([
    prisma.family.count({ where: familyFilter }),
    prisma.member.count({ where: { family: familyFilter, isActive: true } }),
    prisma.family.findMany({ where: familyFilter, select: { id: true, name: true } }),
  ]);

  const scopedFamilyIds = families.map((f) => f.id);

  const now = new Date();
  const { start, end } = monthRange(now.getFullYear(), now.getMonth() + 1);

  const [attendanceRecords, visitationRecords, activeMembersInScope] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { session: { familyId: { in: scopedFamilyIds }, date: { gte: start, lt: end } } },
      select: { status: true },
    }),
    prisma.visitationRecord.findMany({
      where: { familyId: { in: scopedFamilyIds }, year: now.getFullYear(), month: now.getMonth() + 1 },
      select: { visited: true },
    }),
    prisma.member.count({ where: { familyId: { in: scopedFamilyIds }, isActive: true } }),
  ]);

  const present = attendanceRecords.filter((r) => r.status === "PRESENT").length;
  const attendanceRate =
    attendanceRecords.length > 0 ? Math.round((present / attendanceRecords.length) * 100) : null;

  const visitedCount = visitationRecords.filter((v) => v.visited).length;
  const visitationRate =
    activeMembersInScope > 0 ? Math.round((visitedCount / activeMembersInScope) * 100) : null;

  const upcomingBirthdays = await getUpcomingBirthdays(user, 30, 6);

  const [recentSessions, recentMembers] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { familyId: { in: scopedFamilyIds } },
      include: { family: true, _count: { select: { records: { where: { status: "PRESENT" } } } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.member.findMany({
      where: { familyId: { in: scopedFamilyIds } },
      include: { family: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const recentActivity = [
    ...recentSessions.map((s) => ({
      type: "attendance" as const,
      id: s.id,
      date: s.createdAt,
      familyName: s.family.name,
      meta: `${s._count.records} حاضر بتاريخ ${s.date.toLocaleDateString("ar-EG")}`,
    })),
    ...recentMembers.map((m) => ({
      type: "member" as const,
      id: m.id,
      date: m.createdAt,
      familyName: m.family.name,
      meta: m.fullName,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6);

  return {
    familyCount,
    memberCount,
    attendanceRate,
    visitationRate,
    upcomingBirthdays,
    recentActivity,
  };
}

export async function getUpcomingBirthdays(user: ScopedUser, withinDays = 30, limit?: number) {
  const familyIds = await getAccessibleFamilyIds(user);
  const members = await prisma.member.findMany({
    where: {
      family: familyIds === null ? {} : { id: { in: familyIds } },
      isActive: true,
      birthDate: { not: null },
    },
    include: { family: true },
  });

  const withDays = members
    .map((m) => ({ member: m, days: daysUntilNextBirthday(m.birthDate!) }))
    .filter((x) => x.days <= withinDays)
    .sort((a, b) => a.days - b.days);

  return limit ? withDays.slice(0, limit) : withDays;
}

export async function getBirthdaysByMonth(user: ScopedUser) {
  const familyIds = await getAccessibleFamilyIds(user);
  const members = await prisma.member.findMany({
    where: {
      family: familyIds === null ? {} : { id: { in: familyIds } },
      isActive: true,
      birthDate: { not: null },
    },
    include: { family: true },
    orderBy: { birthDate: "asc" },
  });

  const byMonth: Record<number, typeof members> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = [];
  for (const member of members) {
    const month = member.birthDate!.getMonth() + 1;
    byMonth[month]!.push(member);
  }
  for (const month of Object.keys(byMonth)) {
    byMonth[Number(month)]!.sort((a, b) => a.birthDate!.getDate() - b.birthDate!.getDate());
  }
  return byMonth;
}

export async function getAttendanceSessions(familyId: string) {
  return prisma.attendanceSession.findMany({
    where: { familyId },
    include: { records: true },
    orderBy: { date: "desc" },
  });
}

export async function getAttendanceSessionByDate(familyId: string, date: Date) {
  return prisma.attendanceSession.findUnique({
    where: { familyId_date: { familyId, date } },
    include: { records: true },
  });
}

export async function getAttendanceSession(sessionId: string) {
  return prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { records: true, family: { include: { members: { orderBy: { fullName: "asc" } } } } },
  });
}

export async function getMemberAttendanceStats(memberId: string) {
  const records = await prisma.attendanceRecord.findMany({
    where: { memberId },
    include: { session: true },
    orderBy: { session: { date: "desc" } },
  });
  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  return {
    total,
    present,
    rate: total > 0 ? Math.round((present / total) * 100) : null,
    records,
  };
}

export async function getMemberVisitationHistory(memberId: string, take = 12) {
  return prisma.visitationRecord.findMany({
    where: { memberId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take,
  });
}

export async function getVisitationMonth(familyId: string, year: number, month: number) {
  const [members, records] = await Promise.all([
    prisma.member.findMany({ where: { familyId, isActive: true }, orderBy: { fullName: "asc" } }),
    prisma.visitationRecord.findMany({ where: { familyId, year, month } }),
  ]);

  const byMember = new Map(records.map((r) => [r.memberId, r]));
  return members.map((m) => ({ member: m, record: byMember.get(m.id) ?? null }));
}

export async function getAllUsers() {
  return prisma.user.findMany({
    include: { stage: true, assignments: { include: { family: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAllFamiliesFlat() {
  return prisma.family.findMany({
    include: { stage: true },
    orderBy: [{ stage: { order: "asc" } }, { name: "asc" }],
  });
}

export type { Role };
