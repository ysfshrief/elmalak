"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertGradeAccess, resolveScope, canAccessGrade } from "@/lib/scope";
import { getCurrentAcademicYear, getScopedGradeOptions } from "@/lib/queries";
import { importCommitSchema } from "@/lib/validation";
import { parseImportFile, MAX_FILE_BYTES } from "@/lib/import/parse";
import { tableToRows, normalizeArabic, type ImportRow } from "@/lib/import/normalize";
import { MAX_IMPORT_ROWS } from "@/lib/import/columns";
import type { Gender } from "@prisma/client";

export type ParseActionResult =
  | {
      status: "ok";
      rows: ImportRow[];
      source: string;
      ignoredHeaders: string[];
      truncated: boolean;
      notices: string[];
    }
  | { status: "error"; message: string };

/**
 * يقرأ ملف مكتب مرفوعًا (Excel أو Word أو CSV) ويعيد صفوفًا مقترحة — ولا
 * يحفظ شيئًا. الحفظ خطوة منفصلة بعد مراجعة المستخدم، حتى لا يدخل النظام
 * سطرٌ لم تره عين.
 */
export async function parseImportFileAction(formData: FormData): Promise<ParseActionResult> {
  const user = await requireUser();

  const file = formData.get("file");
  const defaultGradeId = String(formData.get("gradeId") ?? "");
  if (!(file instanceof File)) return { status: "error", message: "لم يُرفع أي ملف" };
  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", message: "حجم الملف أكبر من ٤ ميجابايت" };
  }

  // الصف الافتراضي لا بد أن يكون داخل نطاق المستخدم قبل قراءة أي شيء.
  await assertGradeAccess(user, defaultGradeId);

  const parsed = await parseImportFile(
    Buffer.from(await file.arrayBuffer()),
    file.name || "ملف"
  );
  if (parsed.kind === "error") return { status: "error", message: parsed.message };

  return buildRows(parsed.table, defaultGradeId, parsed.source, user);
}

/**
 * يحوّل جدولًا قرأه المتصفّح (ملف PDF أو صورة) إلى صفوف.
 * المتصفّح هنا مجرّد قارئ: الصلاحيات والتحقق يقعان على الخادم كما في المسار
 * الآخر، ولا يُصدَّق منه إلا النص.
 */
export async function buildRowsFromTableAction(
  table: string[][],
  defaultGradeId: string,
  source: string
): Promise<ParseActionResult> {
  const user = await requireUser();
  await assertGradeAccess(user, defaultGradeId);

  if (!Array.isArray(table) || table.length === 0) {
    return { status: "error", message: "لم يُقرأ أي نص من الملف" };
  }
  const safe = table
    .slice(0, MAX_IMPORT_ROWS + 20)
    .map((row) => (Array.isArray(row) ? row.slice(0, 40).map((c) => String(c ?? "")) : []));

  return buildRows(safe, defaultGradeId, source, user);
}

type ActionUser = Awaited<ReturnType<typeof requireUser>>;

async function buildRows(
  table: string[][],
  defaultGradeId: string,
  source: string,
  user: ActionUser
): Promise<ParseActionResult> {
  const grades = await getScopedGradeOptions(user);
  const { rows, headerRow, ignoredHeaders, notices } = tableToRows(table, {
    defaultGradeId,
    grades,
  });

  if (headerRow < 0) {
    return {
      status: "error",
      message:
        "لم يُتعرَّف على عناوين الأعمدة. نزّل القالب واكتب البيانات فيه — العناوين فيه مضبوطة.",
    };
  }
  if (rows.length === 0) {
    return { status: "error", message: "لم يُعثر على أي اسم في الملف" };
  }

  const truncated = rows.length > MAX_IMPORT_ROWS;
  const kept = truncated ? rows.slice(0, MAX_IMPORT_ROWS) : rows;

  // تنبيه مبكّر بالتكرار: داخل الملف نفسه، وفي قاعدة البيانات.
  await markDuplicates(kept);

  return { status: "ok", rows: kept, source, ignoredHeaders, truncated, notices };
}

/** يضيف تحذيرًا للصفوف المكرّرة — داخل الملف وفي الصف نفسه هذا العام. */
async function markDuplicates(rows: ImportRow[]) {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.gradeId}:${normalizeArabic(row.fullName)}`;
    const first = seen.get(key);
    if (first !== undefined) row.warnings.push(`مكرّر داخل الملف (سطر ${first})`);
    else seen.set(key, row.sourceRow);
  }

  const existing = await existingNames([...new Set(rows.map((r) => r.gradeId))]);
  for (const row of rows) {
    if (existing.get(row.gradeId)?.has(normalizeArabic(row.fullName))) {
      row.warnings.push("مسجّل بالفعل في هذا الصف هذا العام");
    }
  }
}

/** أسماء المخدومين المسجّلين حاليًا في كل صف، بصيغة موحّدة للمقارنة. */
async function existingNames(gradeIds: string[]) {
  const year = await getCurrentAcademicYear();
  const map = new Map<string, Set<string>>();
  if (!year) return map;

  const enrollments = await prisma.enrollment.findMany({
    where: { gradeId: { in: gradeIds }, academicYearId: year.id },
    select: { gradeId: true, child: { select: { fullName: true } } },
  });

  for (const e of enrollments) {
    const set = map.get(e.gradeId) ?? new Set<string>();
    set.add(normalizeArabic(e.child.fullName));
    map.set(e.gradeId, set);
  }
  return map;
}

export type CommitResult = {
  created: number;
  skipped: { name: string; reason: string }[];
};

/** يحفظ الصفوف بعد مراجعتها. لا يثق في شيء أرسله المتصفّح. */
export async function commitImportAction(input: unknown): Promise<CommitResult> {
  const user = await requireUser();

  const parsed = importCommitSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
  const { rows, allowDuplicates } = parsed.data;

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`لا يمكن استيراد أكثر من ${MAX_IMPORT_ROWS} مخدومًا دفعة واحدة`);
  }

  const year = await getCurrentAcademicYear();
  if (!year) throw new Error("لا توجد سنة دراسية مُفعّلة");

  // فحص الصلاحية مرة واحدة لكل صف مذكور في الملف، لا لكل سطر.
  const scope = await resolveScope(user);
  const gradeIds = [...new Set(rows.map((r) => r.gradeId))];
  for (const gradeId of gradeIds) {
    if (!canAccessGrade(scope, gradeId)) {
      throw new Error("الملف يحتوي صفًا خارج نطاق صلاحيتك");
    }
  }
  const known = new Set(
    (await prisma.grade.findMany({ where: { id: { in: gradeIds } }, select: { id: true } })).map(
      (g) => g.id
    )
  );
  for (const gradeId of gradeIds) {
    if (!known.has(gradeId)) throw new Error("الملف يحتوي صفًا غير موجود");
  }

  const existing = await existingNames(gradeIds);
  const skipped: CommitResult["skipped"] = [];
  const toCreate: typeof rows = [];

  for (const row of rows) {
    const key = normalizeArabic(row.fullName);
    const set = existing.get(row.gradeId) ?? new Set<string>();
    if (set.has(key) && !allowDuplicates) {
      skipped.push({ name: row.fullName, reason: "مسجّل بالفعل في هذا الصف" });
      continue;
    }
    set.add(key);
    existing.set(row.gradeId, set);
    toCreate.push(row);
  }

  // معاملة واحدة: إمّا يدخل الكشف كاملًا أو لا يدخل منه شيء، فلا يبقى
  // نصف كشف يُعاد رفعه فيتضاعف.
  await prisma.$transaction(
    toCreate.map((row) =>
      prisma.child.create({
        data: {
          fullName: row.fullName,
          gender: (row.gender || null) as Gender | null,
          birthDate: row.birthDate ? new Date(row.birthDate) : null,
          school: row.school || null,
          confessionFather: row.confessionFather || null,
          address: row.address || null,
          notes: row.notes || null,
          phones: { create: row.phones.map((p) => ({ label: p.label, number: p.number })) },
          enrollments: { create: { gradeId: row.gradeId, academicYearId: year.id } },
        },
      })
    )
  );

  for (const gradeId of gradeIds) revalidatePath(`/grades/${gradeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/hierarchy");
  revalidatePath("/birthdays");

  return { created: toCreate.length, skipped };
}
