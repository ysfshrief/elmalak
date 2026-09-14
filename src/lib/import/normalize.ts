/**
 * تحويل جدول خام (صفوف من نصوص) إلى صفوف مخدومين جاهزة للمراجعة.
 *
 * كل ما هنا نقيٌّ وبلا اعتماد على بيئة — يعمل على الخادم وفي المتصفّح،
 * فتظهر للمستخدم نفس النتيجة التي سيحفظها الخادم لاحقًا.
 */
import {
  COLUMNS,
  PHONE_COLUMNS,
  PHONE_LABELS,
  type ColumnKey,
} from "./columns";

/* ————————————————————————— أدوات نصية ————————————————————————— */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

/** يحوّل الأرقام العربية والفارسية إلى أرقام لاتينية. */
export function toLatinDigits(input: string) {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const ai = ARABIC_INDIC.indexOf(d);
    if (ai >= 0) return String(ai);
    return String(EASTERN_ARABIC_INDIC.indexOf(d));
  });
}

/**
 * يوحّد الكتابة العربية لأغراض المقارنة فقط: يحذف التشكيل والتطويل،
 * ويوحّد الألف والياء والتاء المربوطة، ويزيل المسافات وعلامات الترقيم.
 */
export function normalizeArabic(input: string) {
  return toLatinDigits(String(input ?? ""))
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    // بعض مولّدات PDF تكتب رابطة «لام ألف» بحرفيها مقلوبين، فيخرج «الاسم»
    // من الملف «االسم». القلب لا يُردّ في النص (فـ«المالك» قد تكون «الملاك»
    // وقد تكون على حالها)، لكن توحيد الترتيب هنا يكفي ليتطابق العنوان
    // المقلوب مع نظيره السليم عند البحث والمقارنة.
    .replace(/لا/g, "ال")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * محارف اتجاه وتنسيق غير مرئية تدسّها القراءة الضوئية ومحرّرات النصوص في
 * النصوص المختلطة. لا معنى لها داخل اسم أو رقم، وتفسد البحث والمقارنة، فتُحذف.
 */
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** تنظيف قيمة خلية للعرض: بلا محارف خفيّة، ومسافات مضغوطة. */
export function cleanCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return toISODate(value) ?? "";
  return String(value).replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}

/* ————————————————————————— مطابقة العناوين ————————————————————————— */

const HEADER_INDEX = new Map<string, ColumnKey>();
for (const col of COLUMNS) {
  for (const label of [col.header, ...col.aliases]) {
    HEADER_INDEX.set(normalizeArabic(label), col.key);
  }
}
/** أعمدة معروفة لا يحتاجها النظام (الترقيم المسلسل) — تُهمَل بلا تنبيه. */
const IGNORABLE_HEADERS = new Set(
  ["م", "مسلسل", "رقم", "م.", "ت", "#"].map(normalizeArabic)
);

export function isIgnorableHeader(header: string) {
  return IGNORABLE_HEADERS.has(normalizeArabic(header));
}

/**
 * بدايات تدل على سطر تذييل («إجمالي: ٢٠») لا على اسم مخدوم. لا يبدأ بها
 * اسم عربي، فإسقاطها آمن.
 */
const SUMMARY_PREFIXES = ["اجمالي", "الاجمالي", "المجموع", "مجموع", "العدد", "عدد", "الاجماليات"];

export function isSummaryRow(name: string) {
  const key = normalizeArabic(name);
  return SUMMARY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function matchColumn(header: string): ColumnKey | null {
  return HEADER_INDEX.get(normalizeArabic(header)) ?? null;
}

/** أفضل صف عناوين في الجدول: الصف الذي يطابق أكبر عدد من الأعمدة المعروفة. */
export function findHeaderRow(table: string[][]): { index: number; matched: number } {
  let best = { index: -1, matched: 0 };
  const limit = Math.min(table.length, 15);
  for (let i = 0; i < limit; i++) {
    const matched = new Set(table[i].map(matchColumn).filter(Boolean)).size;
    if (matched > best.matched) best = { index: i, matched };
  }
  return best;
}

/* ————————————————————————— محلّلات القيم ————————————————————————— */

export function toISODate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  if (y < 1900 || y > 2200) return null;
  return `${y}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

/**
 * يقبل: كائن Date، ورقم Excel التسلسلي، و«يوم/شهر/سنة» بأي فاصل،
 * و«سنة-شهر-يوم». الترتيب المصري (يوم أولًا) هو الافتراض عند الالتباس.
 */
export function parseDateValue(value: unknown): { iso: string | null; error?: string } {
  if (value == null || value === "") return { iso: null };
  if (value instanceof Date) return { iso: toISODate(value) };

  const raw = toLatinDigits(String(value)).trim();
  if (!raw) return { iso: null };

  // رقم Excel التسلسلي (المرجع 1899-12-30).
  if (/^\d{5}$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 0 && serial < 80000) {
      return { iso: toISODate(new Date(Date.UTC(1899, 11, 30) + serial * 86400000)) };
    }
  }

  const parts = raw.split(/[^\d]+/).filter(Boolean).map(Number);
  if (parts.length < 3) return { iso: null, error: "تاريخ غير مفهوم" };

  const [a, b, c] = parts;
  let day: number, month: number, year: number;
  if (a > 31) {
    [year, month, day] = [a, b, c];
  } else {
    [day, month, year] = [a, b, c];
    // 12/5 مقبولان في الاتجاهين؛ إن تجاوز «اليوم» ١٢ والشهر لا، فالترتيب مقلوب.
    if (day <= 12 && month > 12) [day, month] = [month, day];
  }
  if (year < 100) year += year > 30 ? 1900 : 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { iso: null, error: "تاريخ غير صحيح" };
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return { iso: null, error: "تاريخ غير صحيح" };
  const iso = toISODate(date);
  return iso ? { iso } : { iso: null, error: "تاريخ خارج المدى المعقول" };
}

const MALE_WORDS = new Set(["ذكر", "ولد", "بنين", "م", "male", "m", "ذ"].map(normalizeArabic));
const FEMALE_WORDS = new Set(
  ["انثي", "أنثى", "بنت", "بنات", "female", "f", "ث", "انثى"].map(normalizeArabic)
);

export function parseGenderValue(value: unknown): "MALE" | "FEMALE" | "" {
  const key = normalizeArabic(cleanCell(value));
  if (!key) return "";
  if (MALE_WORDS.has(key)) return "MALE";
  if (FEMALE_WORDS.has(key)) return "FEMALE";
  return "";
}

/** أسماء أصحاب الأرقام كما تُكتب في الكشوف، وما تؤول إليه في النظام. */
const PHONE_LABEL_ALIASES: [string[], string][] = [
  [["الاب", "اب", "والد", "الوالد"], "الأب"],
  [["الام", "ام", "والده", "الوالده"], "الأم"],
  [["البيت", "المنزل", "ارضي", "الارضي", "منزل"], "المنزل"],
  [["المخدوم", "مخدوم", "الطفل", "الابن", "الابنه", "البنت"], "المخدوم"],
  [["الاخ", "اخ", "الاخت", "اخت"], "الأخ"],
  [["الجد", "جد", "الجده", "جده"], "الجد"],
  [["العم", "عم", "الخال", "خال", "العمه", "الخاله"], "قريب"],
];

/**
 * يستخرج كل الأرقام من نص واحد مع صاحب كلٍّ منها.
 *
 * خانة التليفون في الكشوف ليست رقمًا مفردًا، بل عمودًا يتراصّ فيه «الأب:»
 * و«الأم:» و«البيت:»؛ وحين تُدمج سطور المخدوم في سجل واحد تجتمع كلها في نصّ
 * واحد. فيُقرأ كل رقم ويُنسب إلى الاسم الذي يسبقه.
 */
export function extractPhones(
  text: string,
  fallbackLabel: string
): { phones: ImportPhone[]; errors: string[] } {
  const raw = toLatinDigits(cleanCell(text));
  const phones: ImportPhone[] = [];
  const errors: string[] = [];
  if (!raw) return { phones, errors };

  const matches = [...raw.matchAll(/\+?\d[\d\s-]{5,18}\d|\d{5,}/g)];
  if (matches.length === 0) {
    // نصٌّ بلا أرقام أصلًا («المخدوم:» وحدها) ليس خطأً بل خانة فارغة.
    if (/\d/.test(raw)) errors.push(`رقم غير مفهوم: «${raw}»`);
    return { phones, errors };
  }

  let cursor = 0;
  for (const match of matches) {
    const before = raw.slice(cursor, match.index);
    cursor = (match.index ?? 0) + match[0].length;

    const parsed = parsePhoneValue(match[0]);
    if (!parsed.number) {
      if (parsed.error) errors.push(parsed.error);
      continue;
    }
    phones.push({ label: labelFromContext(before) ?? fallbackLabel, number: parsed.number });
  }
  return { phones, errors };
}

/**
 * صاحب الرقم هو أقرب اسم يسبقه، لا أول اسم في النص: «الأب: الأم: ٠١٢…»
 * رقمٌ للأم وقد تُرك مكان رقم الأب فارغًا. ولذلك يُقرأ ما قبل الرقم من آخره.
 */
function labelFromContext(text: string) {
  const words = cleanCell(text)
    .split(/[\s:،,.-]+/)
    .filter(Boolean);

  for (let i = words.length - 1; i >= 0; i--) {
    const key = normalizeArabic(words[i]);
    if (!key) continue;
    for (const [aliases, label] of PHONE_LABEL_ALIASES) {
      if (aliases.some((alias) => normalizeArabic(alias) === key)) return label;
    }
  }

  // اسمٌ غير معروف («الخال» مثلًا) يُؤخذ كما كُتب بدل أن يُنسب الرقم خطأً.
  const last = words[words.length - 1];
  if (last && /\p{Script=Arabic}/u.test(last) && last.length <= 20) return last;

  return null;
}

/** يستخلص رقمًا صالحًا أو يعيد خطأً — لا يُخمّن ولا يُصلح. */
export function parsePhoneValue(value: unknown): { number: string | null; error?: string } {
  const raw = toLatinDigits(cleanCell(value));
  if (!raw) return { number: null };
  const cleaned = raw.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7) return { number: null, error: `رقم قصير: «${raw}»` };
  if (digits.length > 15) return { number: null, error: `رقم طويل: «${raw}»` };
  return { number: cleaned };
}

export function parsePhoneLabel(value: unknown, fallback: string): string {
  const key = normalizeArabic(cleanCell(value));
  if (!key) return fallback;
  const match = PHONE_LABELS.find((l) => normalizeArabic(l) === key);
  if (match) return match;
  // تسميات حرّة مقبولة كما هي (مثل «الجد») ما دامت قصيرة.
  const raw = cleanCell(value);
  return raw.length <= 20 ? raw : fallback;
}

/* ————————————————————————— الصف الناتج ————————————————————————— */

export type ImportPhone = { label: string; number: string };

export type ImportRow = {
  /** معرّف محلّي ثابت أثناء المراجعة (ليس معرّف قاعدة بيانات). */
  key: string;
  sourceRow: number;
  fullName: string;
  gradeId: string;
  gender: "MALE" | "FEMALE" | "";
  birthDate: string;
  school: string;
  confessionFather: string;
  address: string;
  notes: string;
  phones: ImportPhone[];
  /** رسائل تحذير من القراءة (قيمة غير مفهومة، صف غير معروف...). */
  warnings: string[];
};

export type GradeOption = { id: string; path: string; label: string };

/** يبني فهرسًا يطابق نص الصف المكتوب في الملف بمعرّف الصف الحقيقي. */
export function buildGradeIndex(grades: GradeOption[]) {
  const index = new Map<string, string>();
  for (const grade of grades) {
    index.set(normalizeArabic(grade.path), grade.id);
    // «إعدادي › بنين › الصف الأول» يُطابَق أيضًا بـ«الصف الأول إعدادي بنين»
    // وبأي ترتيب آخر لأن المقارنة تتم بعد إزالة الفواصل والمسافات.
    index.set(normalizeArabic(grade.path.split("›").reverse().join(" ")), grade.id);
  }
  return index;
}

export function resolveGrade(
  value: string,
  index: Map<string, string>,
  grades: GradeOption[]
): string | null {
  const key = normalizeArabic(value);
  if (!key) return null;
  const direct = index.get(key);
  if (direct) return direct;
  // مطابقة متساهلة: صفٌّ واحد فقط يحتوي النص المكتوب.
  const candidates = grades.filter((g) => {
    const path = normalizeArabic(g.path);
    return path.includes(key) || key.includes(path);
  });
  return candidates.length === 1 ? candidates[0].id : null;
}

/**
 * يحوّل جدولًا خامًا إلى صفوف. `defaultGradeId` يُستعمل حين لا يذكر الملف الصف.
 */
export function tableToRows(
  table: string[][],
  options: { defaultGradeId: string; grades: GradeOption[] }
): {
  rows: ImportRow[];
  headerRow: number;
  mapped: ColumnKey[];
  ignoredHeaders: string[];
  notices: string[];
} {
  const { index: headerRow, matched } = findHeaderRow(table);
  if (headerRow < 0 || matched === 0) {
    return { rows: [], headerRow: -1, mapped: [], ignoredHeaders: [], notices: [] };
  }

  const headers = table[headerRow];
  const columnOf = new Map<number, ColumnKey>();
  const ignoredHeaders: string[] = [];
  const used = new Set<ColumnKey>();

  headers.forEach((header, i) => {
    const key = matchColumn(header);
    if (!key) {
      const text = cleanCell(header);
      if (text && !isIgnorableHeader(text)) ignoredHeaders.push(text);
      return;
    }
    // عمود مكرّر؟ وجّهه إلى أول خانة تليفون فارغة بدل إسقاطه.
    if (used.has(key)) {
      const slot = PHONE_COLUMNS.find((p) => p.number === key);
      if (slot) {
        const free = PHONE_COLUMNS.find((p) => !used.has(p.number));
        if (free) {
          columnOf.set(i, free.number);
          used.add(free.number);
          return;
        }
      }
      ignoredHeaders.push(cleanCell(header));
      return;
    }
    columnOf.set(i, key);
    used.add(key);
  });

  const gradeIndex = buildGradeIndex(options.grades);
  const rows: ImportRow[] = [];

  for (let r = headerRow + 1; r < table.length; r++) {
    const cells = table[r];
    const get = (key: ColumnKey) => {
      for (const [i, k] of columnOf) if (k === key) return cleanCell(cells[i]);
      return "";
    };

    const fullName = get("fullName");
    // الصفوف الفارغة، وشظايا القراءة الضوئية، وسطور التذييل («الإجمالي: ٢٠»)
    // ليست مخدومين. وكذلك صف العناوين نفسه، فهو يتكرّر في أعلى كل صفحة.
    if (!fullName) continue;
    if ((fullName.match(/\p{L}/gu)?.length ?? 0) < 3) continue;
    if (isSummaryRow(fullName)) continue;
    if (matchColumn(fullName)) continue;
    if (!looksLikeName(fullName)) continue;

    const warnings: string[] = [];

    const gradeText = get("gradePath");
    let gradeId = options.defaultGradeId;
    if (gradeText) {
      const resolved = resolveGrade(gradeText, gradeIndex, options.grades);
      if (resolved) gradeId = resolved;
      else warnings.push(`الصف «${gradeText}» غير معروف — استُعمل الصف المحدَّد`);
    }

    const birth = parseDateValue(get("birthDate"));
    if (birth.error) warnings.push(`${birth.error}: «${get("birthDate")}»`);

    const phones: ImportPhone[] = [];
    PHONE_COLUMNS.forEach((slot, i) => {
      const numberText = get(slot.number);
      if (!numberText) return;
      const fallback = parsePhoneLabel(get(slot.label), i === 0 ? "الأب" : "أخرى");
      const found = extractPhones(numberText, fallback);
      warnings.push(...found.errors);
      phones.push(...found.phones);
    });

    const genderText = get("gender");
    const gender = parseGenderValue(genderText);
    if (genderText && !gender) warnings.push(`النوع «${genderText}» غير مفهوم`);

    rows.push({
      key: `r${r}`,
      sourceRow: r + 1,
      fullName,
      gradeId,
      gender,
      birthDate: birth.iso ?? "",
      school: get("school"),
      confessionFather: get("confessionFather"),
      address: get("address"),
      notes: get("notes"),
      phones,
      warnings,
    });
  }

  const notices: string[] = [];
  if (hasSwappedLamAlef(table)) {
    notices.push(
      "هذا الملف يكتب رابطة «لا» بحرفيها مقلوبين (فيخرج «الاسم» هكذا: «االسم»). " +
        "صُحِّحت العناوين تلقائيًا، لكن الأسماء المعلَّمة بتحذير تحتاج مراجعتك — " +
        "وكذلك أسماء المدارس وآباء الاعتراف."
    );
    for (const row of rows) {
      if (looksLamAlefSwapped(row.fullName)) row.warnings.push("راجع كتابة «لا» في الاسم");
    }
  }

  return { rows: mergeRepeatedChildren(rows), headerRow, mapped: [...used], ignoredHeaders, notices };
}

/**
 * يكشف الملفات التي كُتبت فيها رابطة «لام ألف» مقلوبة.
 *
 * نصٌّ عربي طويل لا يخلو من «لا» أبدًا؛ فخلوّه منها تمامًا مع وفرة الحروف
 * دليلٌ قاطع على القلب. ولا يمكن ردّه آليًا: «المالك» قد تكون «الملاك» وقد
 * تكون على حالها، فالأسلم أن يُنبَّه صاحب الكشف ليراجع.
 */
function hasSwappedLamAlef(table: string[][]): boolean {
  const text = table.flat().join(" ");
  const arabicLetters = text.match(/\p{Script=Arabic}/gu)?.length ?? 0;
  if (arabicLetters < 400) return false;
  return !text.includes("لا");
}

/** أسماء الشهور كما تُكتب في جداول الافتقاد وأعياد الميلاد. */
const MONTH_NAMES = new Set(
  [
    "يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يونية",
    "يوليو", "يولية", "اغسطس", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر",
    "كانون الثاني", "شباط", "اذار", "نيسان", "ايار", "حزيران",
    "تموز", "اب", "ايلول", "تشرين الاول", "تشرين الثاني", "كانون الاول",
    "توت", "بابه", "هاتور", "كيهك", "طوبه", "امشير", "برمهات",
    "برموده", "بشنس", "بؤونه", "ابيب", "مسرى", "نسيء",
  ].map(normalizeArabic)
);

/**
 * هل يصلح النص اسم مخدوم؟
 *
 * صفحات الحضور والافتقاد تتصدّرها آيات وتُعنون أعمدتها بأسماء الشهور، وكلاهما
 * يقع في عمود الاسم حين تُقرأ الصفحة. والاسم المصري لا يتجاوز ستّ كلمات ولا
 * يحمل أقواسًا ولا علامات اقتباس ولا أرقامًا.
 */
function looksLikeName(text: string) {
  if (text.length > 70) return false;
  if (text.split(/\s+/).length > 6) return false;
  if (/[()«»"'\[\]:;\d]/.test(text)) return false;
  if (MONTH_NAMES.has(normalizeArabic(text))) return false;
  return true;
}

/** كلمة فيها «ال» في غير أولها — موضع الشك في الاسم المقلوب. */
export function looksLamAlefSwapped(name: string) {
  return name.split(/\s+/).some((word) => word.indexOf("ال") > 0);
}

/**
 * يدمج تكرار المخدوم الواحد داخل الملف.
 *
 * الكشف الواحد يجمع عادةً صفحة البيانات وصفحات الحضور والافتقاد، فيتكرّر
 * الاسم في كل صفحة ولا تحمل بياناته الكاملة إلا صفحة واحدة. فتُجمع المواضع
 * في سجل واحد بدل أن تُعرض عشرات الصفوف الفارغة.
 */
function mergeRepeatedChildren(rows: ImportRow[]): ImportRow[] {
  const byKey = new Map<string, ImportRow>();
  const SCALARS = [
    ["birthDate", "تاريخ الميلاد"],
    ["school", "المدرسة"],
    ["confessionFather", "أب الاعتراف"],
    ["address", "العنوان"],
    ["gender", "النوع"],
    ["notes", "ملاحظات"],
  ] as const;

  for (const row of rows) {
    const key = `${row.gradeId}:${normalizeArabic(row.fullName)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }

    for (const [field, label] of SCALARS) {
      const incoming = row[field];
      if (!incoming) continue;
      const current = existing[field];
      if (!current) {
        // الحقول المدموجة كلها نصّية، والقيمة الواردة من الحقل نفسه.
        (existing[field] as string) = incoming;
      } else if (current !== incoming) {
        // قيمتان مختلفتان للاسم نفسه: إمّا خطأ قراءة أو مخدومان بالاسم ذاته.
        existing.warnings.push(`«${label}» مذكور بقيمتين: «${current}» و«${incoming}»`);
      }
    }

    for (const phone of row.phones) {
      if (!existing.phones.some((p) => p.number === phone.number)) existing.phones.push(phone);
    }
    for (const warning of row.warnings) {
      if (!existing.warnings.includes(warning)) existing.warnings.push(warning);
    }
  }

  return [...byKey.values()];
}
