import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PRIMARY_GRADES = [
  "الصف الأول",
  "الصف الثاني",
  "الصف الثالث",
  "الصف الرابع",
  "الصف الخامس",
  "الصف السادس",
];
const SECONDARY_GRADES = ["الصف الأول", "الصف الثاني", "الصف الثالث"];

/**
 * الهيكل الرسمي للخدمة. مرحلة الحضانة بلا أقسام بنين/بنات وبلا صفوف، فتُمثَّل
 * بقسم واحد غير مُقسّم بالنوع وصف واحد — حتى يبقى كل مخدوم على نفس المسار
 * الموحّد (مرحلة ← قسم ← صف) في الصلاحيات والاستعلامات بلا حالات خاصة.
 */
const STRUCTURE = [
  {
    stage: "حضانة",
    divisions: [{ name: "حضانة", gender: null, grades: ["حضانة"] }],
  },
  {
    stage: "ابتدائي",
    divisions: [
      { name: "بنين", gender: "MALE" as const, grades: PRIMARY_GRADES },
      { name: "بنات", gender: "FEMALE" as const, grades: PRIMARY_GRADES },
    ],
  },
  {
    stage: "إعدادي",
    divisions: [
      { name: "بنين", gender: "MALE" as const, grades: SECONDARY_GRADES },
      { name: "بنات", gender: "FEMALE" as const, grades: SECONDARY_GRADES },
    ],
  },
  {
    stage: "ثانوي",
    divisions: [
      { name: "بنين", gender: "MALE" as const, grades: SECONDARY_GRADES },
      { name: "بنات", gender: "FEMALE" as const, grades: SECONDARY_GRADES },
    ],
  },
];

function currentAcademicYear() {
  // السنة الدراسية تبدأ في سبتمبر.
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    name: `${startYear}/${startYear + 1}`,
    startDate: new Date(startYear, 8, 1),
    endDate: new Date(startYear + 1, 7, 31),
  };
}

async function main() {
  // تهيئة أولية فقط: تعمل مرة واحدة على قاعدة بيانات فارغة، فلا تُعيد إنشاء
  // ما حذفه أو عدّله المستخدمون لاحقًا.
  if ((await prisma.user.count()) > 0) {
    console.log("قاعدة البيانات مُهيّأة بالفعل — تخطّي التهيئة.");
    return;
  }

  console.log("بدء تهيئة الهيكل التنظيمي...");

  const service = await prisma.service.create({
    data: {
      name: "خدمة التربية الكنسية",
      churchName: "كنيسة رئيس الملائكة الجليل ميخائيل بدمنهور",
    },
  });

  for (const [stageIndex, entry] of STRUCTURE.entries()) {
    const stage = await prisma.stage.create({
      data: { serviceId: service.id, name: entry.stage, order: stageIndex },
    });

    for (const [divIndex, div] of entry.divisions.entries()) {
      await prisma.division.create({
        data: {
          stageId: stage.id,
          name: div.name,
          gender: div.gender,
          order: divIndex,
          grades: {
            create: div.grades.map((name, i) => ({ name, order: i })),
          },
        },
      });
    }
  }

  const year = currentAcademicYear();
  await prisma.academicYear.create({ data: { ...year, isCurrent: true } });

  await prisma.user.create({
    data: {
      username: "admin",
      name: "مسؤول النظام",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("Elmalak@123", 10),
    },
  });

  const stages = await prisma.stage.count();
  const divisions = await prisma.division.count();
  const grades = await prisma.grade.count();
  console.log(`تم بنجاح ✓  (${stages} مراحل، ${divisions} أقسام، ${grades} صفوف، سنة ${year.name})`);
  console.log("حساب الدخول: admin / Elmalak@123 — غيّر كلمة المرور فورًا.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
