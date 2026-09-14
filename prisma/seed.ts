import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// البيانات الحقيقية لأسرة "الملاك ميخائيل والقديس أبانوب" (خدمة إعدادي بنين)
// كما وردت في ملف بيانات الأسرة المرفق من الخدمة.
const MEMBERS = [
  {
    fullName: "انطونيوس علاء مرزق",
    address: "ش البردان المتفرع من ش الروضة اما برج الكلاف",
    birthDate: "2013-09-30",
    school: "عاشور العبد",
    confessionFather: "ابونا قسطنطين",
    phones: [
      { label: "الأب", number: "01093352538" },
      { label: "الأم", number: "01275818768" },
      { label: "البيت", number: "0453155689" },
    ],
  },
  {
    fullName: "بيشوي عادل انيس",
    address: "مساكن العمال عمارة 23 شقة 5 بجوار شركة دمنهور غرب للكهرباء",
    birthDate: "2013-08-28",
    school: "عاشور العبد",
    confessionFather: "ابونا قسطنطين",
    phones: [{ label: "الأب", number: "01284466469" }],
  },
  {
    fullName: "جوفاني هاني فكري",
    address: "اخر ش الوكيل متفرع من ش الروضة",
    birthDate: "2013-03-17",
    school: "المحبة الخاصة",
    confessionFather: "ابونا ثاؤفيلس",
    phones: [
      { label: "الأب", number: "01555580011" },
      { label: "الأم", number: "01016533048" },
      { label: "المخدوم", number: "01062084711" },
    ],
  },
  {
    fullName: "عماد هاني ملاك",
    address: "مساكن الزخرفية امام مسجد شحاتة عمارة 13 اول دور",
    birthDate: "2013-03-17",
    school: "عاشور العبد",
    confessionFather: "ابونا قسطنطين",
    phones: [
      { label: "البيت", number: "0453345254" },
      { label: "الأم", number: "01552267313" },
      { label: "المخدوم", number: "01554517011" },
    ],
  },
  {
    fullName: "شنودة سعيد منير",
    address: "برج الصعيدي امام بوابة سيدي عدس من جهة محلات الخشب",
    birthDate: "2014-04-10",
    school: "المحبة الخاصة",
    confessionFather: "ابونا انطونيوس",
    phones: [
      { label: "الأب", number: "01281273192" },
      { label: "الأم", number: "01228978843" },
    ],
  },
  {
    fullName: "شنودة عماد نبيل",
    address: "بجوار ص د وسام ود رضوة بجوار م وجية اباظة، من ش مساكن التدريب ش مسجد شحاتة",
    birthDate: "2012-11-29",
    school: "الشهيد عبد المنعم رياض",
    confessionFather: "ابونا جرجس",
    phones: [
      { label: "الأب", number: "01276139516" },
      { label: "الأم", number: "01203367398" },
    ],
  },
  {
    fullName: "فارس امين نبيل",
    address: "مساكن العمال ش المرافق رابع مدخل على اليمين",
    birthDate: "2013-03-11",
    school: "عاشور العبد",
    confessionFather: "ابونا طوبيا",
    phones: [{ label: "الأخ", number: "01229615746" }],
  },
  {
    fullName: "كاراس امير فوزي",
    address: "مساكن الموقف امام بوابة 7 عمارة 9 شقة 11",
    birthDate: "2013-01-21",
    school: "وجية اباظة",
    confessionFather: "ابونا جرجس",
    phones: [
      { label: "الأب", number: "01227227342" },
      { label: "المخدوم", number: "0127788092" },
    ],
  },
  {
    fullName: "كاراس إيهاب ميخائيل",
    address: "18 ش سالم النجار المتفرع من المعهد الديني اول ش السيد عوض",
    birthDate: "2013-09-30",
    school: "وجية اباظة",
    confessionFather: "ابونا جرجس",
    phones: [
      { label: "الأخ", number: "01121212794" },
      { label: "الأم", number: "01211259431" },
    ],
  },
  {
    fullName: "كاراس تامر عطية",
    address: "ش امتداد سوق سوريا بعد المزلقان تحت الكوبري العلوي",
    birthDate: "2012-04-18",
    school: "إسماعيل الحبروك",
    confessionFather: "ابونا بيجيمي الانبا بولا",
    phones: [
      { label: "الأم", number: "01080232085" },
      { label: "المخدوم", number: "01067391234" },
    ],
  },
  {
    fullName: "كاراس حبشي صالح",
    address: "ش المدينة خلف المعسكر اول شارع شمال بعد داخلة البشلاوي من على السريع عند تاني عمود دور ارضي",
    birthDate: "2011-10-10",
    school: "عمرو بن العاص",
    confessionFather: "ابونا طوبيا",
    phones: [
      { label: "الأخ", number: "01227112135" },
      { label: "الأم", number: "01282481750" },
      { label: "المخدوم", number: "01092307686" },
    ],
  },
  {
    fullName: "كاراس مينا نصيف",
    address: "العبارة برج الابراهيمية امام بوابة سيدي عدس الدور 11 اخر شقة",
    birthDate: "2012-08-25",
    school: "المدرسة المتميزة",
    confessionFather: "ابونا ميخا",
    phones: [{ label: "الأب", number: "01155709938" }],
  },
  {
    fullName: "كيرلس إسكندر فتحي",
    address: "شارع الرويني المتفرع من شارع 16 اعلى كافيتيريا الرويني",
    birthDate: "2012-07-14",
    school: "عمرو بن العاص",
    confessionFather: "ابونا ثاؤفيلس",
    phones: [{ label: "الأم", number: "01055840302" }],
  },
  {
    fullName: "كيرلس مينا مكرم",
    address: "ش مدرسة وجية اباظة فوق مطعم أبو الدهب",
    birthDate: "2013-08-13",
    school: "وجية اباظة",
    confessionFather: "ابونا ثاؤفيلس",
    phones: [{ label: "الأم", number: "01140807105" }],
  },
  {
    fullName: "متاؤس سامح عادل",
    address: "شارع مخزن الزيت ص ف ص الخطيب بجوار محل ديجيتال لايف",
    birthDate: "2013-06-30",
    school: "الشهيد عبد المنعم رياض",
    confessionFather: "ابونا جرجس",
    phones: [{ label: "الأم", number: "01285538622" }],
  },
  {
    fullName: "نوفير عادل بخيت",
    address: "ش سالم النجار المتفرع من المعهد الديني اول ش السيد عوض",
    birthDate: "2013-01-19",
    school: "عاشور العبد",
    confessionFather: "ابونا قسطنطين",
    phones: [
      { label: "الأب", number: "01001369204" },
      { label: "الأم", number: "01020995722" },
    ],
  },
  {
    fullName: "يسري هاني يسري",
    address: "مساكن خلف فحص المرور اول عمارة بعد الفحص اخر دور",
    birthDate: "2013-06-24",
    school: "وجية اباظة",
    confessionFather: "ابونا طوبيا",
    phones: [{ label: "الأب", number: "01061941325" }],
  },
  {
    fullName: "يوسف سامح نبيل",
    address: null,
    birthDate: null,
    school: null,
    confessionFather: null,
    phones: [],
  },
  {
    fullName: "يوسف ماجد نظمي",
    address: "شارع 16 بجوار ماركت ميدو اعلى الشرقاوي اللوميتال",
    birthDate: "2011-10-15",
    school: null,
    confessionFather: "ابونا قسطنطين",
    phones: [
      { label: "الأب", number: "01229730658" },
      { label: "المخدوم", number: "01224492543" },
    ],
  },
  {
    fullName: "يوسف موسى هلال",
    address: "ش 16 جوار ص روشتة",
    birthDate: "2012-01-22",
    school: "المحبة الخاصة",
    confessionFather: "ابونا ثاؤفيلس",
    phones: [{ label: "الأب", number: "01281601915" }],
  },
];

async function main() {
  // First-run bootstrap only. The seed runs on every deploy, so once the
  // service is actually using the app we must not resurrect records the
  // servants have since edited or deleted.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log("قاعدة البيانات مُهيّأة بالفعل — تخطّي التعبئة الأولية.");
    return;
  }

  console.log("بدء تجهيز البيانات الأولية...");

  const stage = await prisma.stage.upsert({
    where: { name: "إعدادي بنين" },
    update: {},
    create: { name: "إعدادي بنين", order: 1 },
  });

  const family = await prisma.family.upsert({
    where: { id: "seed-family-malak-mikhail" },
    update: {},
    create: {
      id: "seed-family-malak-mikhail",
      name: "أسرة الملاك ميخائيل والقديس أبانوب",
      stageId: stage.id,
    },
  });

  for (const m of MEMBERS) {
    const existing = await prisma.member.findFirst({
      where: { familyId: family.id, fullName: m.fullName },
    });
    if (existing) continue;

    await prisma.member.create({
      data: {
        familyId: family.id,
        fullName: m.fullName,
        address: m.address,
        birthDate: m.birthDate ? new Date(m.birthDate) : null,
        school: m.school,
        confessionFather: m.confessionFather,
        phones: { create: m.phones },
      },
    });
  }

  const passwordHash = await bcrypt.hash("Elmalak@123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "مسؤول النظام",
      role: "SUPER_ADMIN",
      passwordHash,
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { username: "coordinator" },
    update: {},
    create: {
      username: "coordinator",
      name: "مسؤول مرحلة إعدادي بنين",
      role: "STAGE_COORDINATOR",
      stageId: stage.id,
      passwordHash,
    },
  });

  const servant = await prisma.user.upsert({
    where: { username: "servant" },
    update: {},
    create: {
      username: "servant",
      name: "خادم أسرة الملاك ميخائيل",
      role: "FAMILY_SERVANT",
      passwordHash,
    },
  });

  await prisma.familyAssignment.upsert({
    where: { userId_familyId: { userId: servant.id, familyId: family.id } },
    update: {},
    create: { userId: servant.id, familyId: family.id },
  });

  console.log("تم بنجاح ✓");
  console.log({ admin: admin.username, coordinator: coordinator.username, servant: servant.username });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
