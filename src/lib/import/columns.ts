/**
 * تعريف أعمدة كشف المخدومين — مصدر الحقيقة الوحيد.
 *
 * يستعمله ثلاثة أطراف، فيستحيل أن يختلفوا:
 *   1. مولّد القالب (‎template.ts‎) — يكتب العناوين والقوائم المنسدلة.
 *   2. قارئ الملفات (‎normalize.ts‎) — يطابق عناوين الملف المرفوع.
 *   3. أداة سطر الأوامر (‎scripts/make-import-file.mjs‎) — تبني ملفًا مطابقًا.
 */

export const PHONE_LABELS = ["الأب", "الأم", "المخدوم", "المنزل", "أخرى"] as const;
export const GENDER_LABELS_AR = { MALE: "ذكر", FEMALE: "أنثى" } as const;

/** أقصى عدد تليفونات يحمله القالب (لكل مخدوم). */
export const PHONE_SLOTS = 3;

export type ColumnKey =
  | "gradePath"
  | "fullName"
  | "gender"
  | "birthDate"
  | "school"
  | "confessionFather"
  | "address"
  | "phone1"
  | "phone1Label"
  | "phone2"
  | "phone2Label"
  | "phone3"
  | "phone3Label"
  | "notes";

export type ColumnKind = "text" | "date" | "gender" | "phone" | "phoneLabel" | "gradePath";

export type ColumnDef = {
  key: ColumnKey;
  header: string;
  /** عناوين بديلة تُقبل عند القراءة من كشوف لم تُكتب على القالب. */
  aliases: string[];
  kind: ColumnKind;
  width: number;
  required?: boolean;
  hint?: string;
};

export const COLUMNS: ColumnDef[] = [
  {
    key: "fullName",
    header: "الاسم",
    aliases: ["اسم المخدوم", "الاسم الرباعي", "الاسم بالكامل", "اسم الطفل", "الاسم كاملا", "اسم"],
    kind: "text",
    width: 30,
    required: true,
    hint: "مطلوب — اكتب الاسم كما هو مسجّل في شهادة الميلاد إن أمكن",
  },
  {
    key: "gradePath",
    header: "الصف",
    aliases: ["الفصل", "المرحلة", "الصف الدراسي", "السنة", "صف"],
    kind: "gradePath",
    width: 34,
    hint: "اختر من القائمة. اتركه فارغًا ليأخذ الصف المحدَّد وقت الرفع.",
  },
  {
    key: "gender",
    header: "النوع",
    aliases: ["الجنس", "ذكر/أنثى", "بنين/بنات", "النوع (ذكر/أنثى)"],
    kind: "gender",
    width: 10,
    hint: "ذكر أو أنثى",
  },
  {
    key: "birthDate",
    header: "تاريخ الميلاد",
    aliases: ["الميلاد", "تاريخ الميلاد ميلادي", "ت. الميلاد", "المواليد", "تاريخ الميلاد (يوم/شهر/سنة)"],
    kind: "date",
    width: 16,
    hint: "يوم/شهر/سنة — مثال: 12/05/2013",
  },
  {
    key: "school",
    header: "المدرسة",
    aliases: ["اسم المدرسة", "المدرسه", "الدراسة"],
    kind: "text",
    width: 24,
  },
  {
    key: "confessionFather",
    header: "أب الاعتراف",
    aliases: ["اب الاعتراف", "أب الإعتراف", "الاب الروحي", "الأب الروحي", "ابونا"],
    kind: "text",
    width: 22,
  },
  {
    key: "address",
    header: "العنوان",
    aliases: ["السكن", "محل الإقامة", "العنوان بالتفصيل"],
    kind: "text",
    width: 36,
  },
  {
    key: "phone1",
    header: "تليفون ١",
    aliases: ["تليفون", "التليفون", "الموبايل", "رقم التليفون", "موبايل", "تليفون 1", "ت1"],
    kind: "phone",
    width: 16,
  },
  {
    key: "phone1Label",
    header: "صاحب تليفون ١",
    aliases: ["صاحب التليفون", "نوع التليفون", "صاحب تليفون 1"],
    kind: "phoneLabel",
    width: 14,
  },
  {
    key: "phone2",
    header: "تليفون ٢",
    aliases: ["تليفون 2", "التليفون الثاني", "موبايل 2", "ت2", "تليفون اخر"],
    kind: "phone",
    width: 16,
  },
  {
    key: "phone2Label",
    header: "صاحب تليفون ٢",
    aliases: ["صاحب تليفون 2", "نوع التليفون الثاني"],
    kind: "phoneLabel",
    width: 14,
  },
  {
    key: "phone3",
    header: "تليفون ٣",
    aliases: ["تليفون 3", "التليفون الثالث", "ت3"],
    kind: "phone",
    width: 16,
  },
  {
    key: "phone3Label",
    header: "صاحب تليفون ٣",
    aliases: ["صاحب تليفون 3"],
    kind: "phoneLabel",
    width: 14,
  },
  {
    key: "notes",
    header: "ملاحظات",
    aliases: ["ملحوظات", "ملاحظة", "بيانات أخرى"],
    kind: "text",
    width: 30,
  },
];

export const COLUMN_BY_KEY = Object.fromEntries(COLUMNS.map((c) => [c.key, c])) as Record<
  ColumnKey,
  ColumnDef
>;

export const PHONE_COLUMNS: { number: ColumnKey; label: ColumnKey }[] = [
  { number: "phone1", label: "phone1Label" },
  { number: "phone2", label: "phone2Label" },
  { number: "phone3", label: "phone3Label" },
];

/** أقصى عدد صفوف يُقبل في ملف واحد — يحدّ من حجم المعاملة على قاعدة البيانات. */
export const MAX_IMPORT_ROWS = 500;
