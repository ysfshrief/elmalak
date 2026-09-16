import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveScope, type ScopedUser } from "@/lib/scope";
import { getCurrentAcademicYear, getService } from "@/lib/queries";
import { toCalendarDate, toISODateString, parseISODateString } from "@/lib/dates";
import { monthName } from "@/lib/utils";

/**
 * إحصاءات الحضور على مستويات الخدمة الأربعة.
 *
 * النسبة = الحضور المسجَّل ÷ السجلات المسجَّلة. واليوم الذي لم يُفتح له
 * اجتماع أصلًا لا يدخل الحساب ولا يُحسب غيابًا — فالخدمة لا تُقاس بأيام لم
 * تُسجَّل، والنسبة لا تنخفض لأن أحدًا نسي أن يفتح الكشف.
 *
 * ولا يُعرض مستوًى إلا إذا كان نطاق المستخدم يغطّيه كاملًا: نسبةُ مرحلةٍ
 * محسوبةٌ من صفٍّ واحد ليست نسبة المرحلة، وعرضها تضليل.
 */

export type AttendanceStat = {
  id: string;
  label: string;
  sublabel?: string;
  /** عدد الاجتماعات التي فُتح لها كشف. */
  sessions: number;
  /** عدد سجلات الحضور (حاضر + غائب + بعذر). */
  records: number;
  present: number;
  excused: number;
  absent: number;
  /** النسبة المئوية، أو `null` إن لم يُسجَّل شيء بعد. */
  rate: number | null;
  /** نقاط الحضور — `null` حين يكون النظام معطَّلًا. */
  points: number | null;
};

export type AttendanceOverview = {
  academicYear: string | null;
  points: { enabled: boolean; pointValue: number };
  /** الخدمة كلها — يظهر للمستخدم الذي يغطّي نطاقه كل الصفوف. */
  service: AttendanceStat | null;
  /** المراحل التي يغطّيها نطاق المستخدم كاملة. */
  stages: AttendanceStat[];
  /** الصفوف التي يراها المستخدم. */
  grades: AttendanceStat[];
  /** مراحل يرى المستخدم بعض صفوفها فقط — تُذكر ولا تُحسب. */
  partialStages: string[];
};

type Tally = { sessions: number; present: number; excused: number; absent: number };

const emptyTally = (): Tally => ({ sessions: 0, present: 0, excused: 0, absent: 0 });

function toStat(
  id: string,
  label: string,
  tally: Tally,
  points: { enabled: boolean; pointValue: number },
  sublabel?: string
): AttendanceStat {
  const records = tally.present + tally.excused + tally.absent;
  return {
    id,
    label,
    sublabel,
    sessions: tally.sessions,
    records,
    present: tally.present,
    excused: tally.excused,
    absent: tally.absent,
    rate: records > 0 ? Math.round((tally.present / records) * 100) : null,
    // النقاط مشتقّة من السجلات لا مخزَّنة معها، فتعطيل النظام لا يمسّ سجلًا.
    points: points.enabled ? tally.present * points.pointValue : null,
  };
}

function add(target: Tally, source: Tally) {
  target.sessions += source.sessions;
  target.present += source.present;
  target.excused += source.excused;
  target.absent += source.absent;
}

export async function getAttendanceOverview(user: ScopedUser): Promise<AttendanceOverview> {
  const [scope, year, service] = await Promise.all([
    resolveScope(user),
    getCurrentAcademicYear(),
    getService(),
  ]);

  const points = {
    enabled: service?.attendancePointsEnabled ?? false,
    pointValue: service?.attendancePointValue ?? 1,
  };
  const empty: AttendanceOverview = {
    academicYear: year?.name ?? null,
    points,
    service: null,
    stages: [],
    grades: [],
    partialStages: [],
  };
  if (!year) return empty;

  // الهيكل كاملًا: نحتاجه لنعرف ما إذا كان النطاق يغطّي مرحلةً بأسرها.
  const stages = await prisma.stage.findMany({
    orderBy: { order: "asc" },
    include: {
      divisions: {
        orderBy: { order: "asc" },
        include: { grades: { orderBy: { order: "asc" } } },
      },
    },
  });

  const visible = (gradeId: string) => scope === "ALL" || scope.includes(gradeId);
  const visibleGradeIds = stages
    .flatMap((s) => s.divisions.flatMap((d) => d.grades))
    .filter((g) => visible(g.id))
    .map((g) => g.id);
  if (visibleGradeIds.length === 0) return empty;

  // استعلام واحد لكل الاجتماعات وسجلاتها، ثم يُجمَّع في الذاكرة: أرخص من
  // استعلام لكل صف، وأدق من عدٍّ لا يعرف حالة كل سجل.
  const sessions = await prisma.attendanceSession.findMany({
    where: { gradeId: { in: visibleGradeIds }, academicYearId: year.id },
    select: { gradeId: true, records: { select: { status: true } } },
  });

  const byGrade = new Map<string, Tally>();
  for (const session of sessions) {
    const tally = byGrade.get(session.gradeId) ?? emptyTally();
    tally.sessions += 1;
    for (const record of session.records) {
      if (record.status === "PRESENT") tally.present += 1;
      else if (record.status === "EXCUSED") tally.excused += 1;
      else tally.absent += 1;
    }
    byGrade.set(session.gradeId, tally);
  }

  const gradeStats: AttendanceStat[] = [];
  const stageStats: AttendanceStat[] = [];
  const partialStages: string[] = [];
  const serviceTally = emptyTally();
  let coversWholeService = true;

  for (const stage of stages) {
    const all = stage.divisions.flatMap((d) => d.grades);
    if (all.length === 0) continue;

    const seen = all.filter((g) => visible(g.id));
    if (seen.length === 0) {
      coversWholeService = false;
      continue;
    }

    const stageTally = emptyTally();
    for (const division of stage.divisions) {
      for (const grade of division.grades) {
        if (!visible(grade.id)) continue;
        const tally = byGrade.get(grade.id) ?? emptyTally();
        add(stageTally, tally);
        gradeStats.push(
          toStat(grade.id, grade.familyName || grade.name, tally, points,
            `${stage.name} › ${division.name}${grade.familyName ? ` › ${grade.name}` : ""}`)
        );
      }
    }

    if (seen.length === all.length) {
      stageStats.push(toStat(stage.id, stage.name, stageTally, points));
      add(serviceTally, stageTally);
    } else {
      // نطاقٌ جزئي: تُعرض صفوفه ولا تُنسب النسبة إلى المرحلة كلها.
      partialStages.push(stage.name);
      coversWholeService = false;
      add(serviceTally, stageTally);
    }
  }

  return {
    academicYear: year.name,
    points,
    service: coversWholeService
      ? toStat(service?.id ?? "service", service?.name ?? "الخدمة", serviceTally, points)
      : null,
    stages: stageStats,
    grades: gradeStats,
    partialStages,
  };
}

/** إحصاء مخدوم واحد — نفس القاعدة: ما لم يُسجَّل لا يُحسب. */
export async function getChildAttendanceSummary(enrollmentId: string) {
  const [records, service] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { enrollmentId },
      select: { status: true },
    }),
    getService(),
  ]);

  const tally = emptyTally();
  tally.sessions = records.length;
  for (const record of records) {
    if (record.status === "PRESENT") tally.present += 1;
    else if (record.status === "EXCUSED") tally.excused += 1;
    else tally.absent += 1;
  }

  return toStat("child", "المخدوم", tally, {
    enabled: service?.attendancePointsEnabled ?? false,
    pointValue: service?.attendancePointValue ?? 1,
  });
}

export type TrendPoint = {
  /** التاريخ بصيغة ISO — المفتاح والمرجع. */
  date: string;
  /** يوم/شهر للعرض تحت الرسم. */
  label: string;
  rate: number;
  present: number;
  records: number;
  /** عدد الصفوف التي فُتح لها كشف في هذا اليوم. */
  grades: number;
};

export type AttendanceTrend = {
  points: TrendPoint[];
  /** متوسط النسبة على المدى المعروض. */
  average: number | null;
  /** الفرق بين آخر نقطة وسابقتها — `null` حين لا توجد نقطتان. */
  delta: number | null;
  best: TrendPoint | null;
};

/**
 * نسبة الحضور في كل يوم اجتماع، لآخر `limit` يومًا سُجّل فيه شيء.
 *
 * يومٌ واحد قد تُفتح فيه كشوف عدة صفوف، فتُجمَّع سجلاتها كلها في نقطة واحدة:
 * الرسم يقيس الخدمة في ذلك اليوم لا صفًّا بعينه. والأيام التي لم يُفتح فيها
 * كشفٌ أصلًا ليست نقاطًا بصفر — هي ليست نقاطًا، فالخط يصل ما سُجّل بما سُجّل.
 */
export async function getAttendanceTrend(user: ScopedUser, limit = 12): Promise<AttendanceTrend> {
  const [scope, year] = await Promise.all([resolveScope(user), getCurrentAcademicYear()]);
  const empty: AttendanceTrend = { points: [], average: null, delta: null, best: null };
  if (!year) return empty;

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      academicYearId: year.id,
      ...(scope === "ALL" ? {} : { gradeId: { in: scope } }),
    },
    orderBy: { date: "desc" },
    select: { date: true, gradeId: true, records: { select: { status: true } } },
  });

  const byDate = new Map<string, { present: number; records: number; grades: Set<string> }>();
  for (const session of sessions) {
    const parts = toCalendarDate(session.date);
    if (!parts) continue;
    const key = toISODateString(parts);
    const bucket = byDate.get(key) ?? { present: 0, records: 0, grades: new Set<string>() };
    bucket.grades.add(session.gradeId);
    for (const record of session.records) {
      bucket.records += 1;
      if (record.status === "PRESENT") bucket.present += 1;
    }
    byDate.set(key, bucket);
  }

  const points: TrendPoint[] = [...byDate.entries()]
    .filter(([, bucket]) => bucket.records > 0)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-limit)
    .map(([date, bucket]) => {
      const parts = parseISODateString(date)!;
      return {
        date,
        label: `${parts.day} ${monthName(parts.month)}`,
        rate: Math.round((bucket.present / bucket.records) * 100),
        present: bucket.present,
        records: bucket.records,
        grades: bucket.grades.size,
      };
    });

  if (points.length === 0) return empty;

  const average = Math.round(points.reduce((sum, p) => sum + p.rate, 0) / points.length);
  const last = points[points.length - 1]!;
  const previous = points.length > 1 ? points[points.length - 2]! : null;
  const best = points.reduce((top, p) => (p.rate > top.rate ? p : top), points[0]!);

  return { points, average, delta: previous ? last.rate - previous.rate : null, best };
}
