/**
 * تواريخ التقويم (تاريخ الميلاد خاصة).
 *
 * تاريخ الميلاد ليس لحظةً بل يومًا في التقويم: «٢٠ سبتمبر ٢٠١٠» هو نفسه في
 * دمنهور وفي أي مكان. ولو عُومل كلحظة، تحوّل إلى «١٩ سبتمبر ٧:٠٠ م» في منطقة
 * زمنية متأخّرة عن UTC، فيظهر اليوم ناقصًا واحدًا وقد ينقص العمر سنةً كاملة
 * حول يوم الميلاد.
 *
 * فالقاعدة هنا واحدة لا تُخرق: يُخزَّن اليوم عند منتصف ليل UTC، ويُقرأ
 * بدوالّ UTC وحدها. ولا تُستعمل ‎getDate()‎ ولا ‎getMonth()‎ المحلّية على
 * تاريخ ميلاد في أي موضع من المشروع.
 */

export type CalendarDate = { day: number; month: number; year: number };

/** أقدم سنة ميلاد معقولة — تحمي من أخطاء الكتابة لا من الأعمار. */
export const MIN_BIRTH_YEAR = 1900;

/** يقرأ اليوم والشهر والسنة من تاريخ مخزَّن، بتوقيت UTC دائمًا. */
export function toCalendarDate(date: Date | string): CalendarDate | null {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return null;
  return {
    day: value.getUTCDate(),
    month: value.getUTCMonth() + 1,
    year: value.getUTCFullYear(),
  };
}

/** هل هذه التواريخ موجودة فعلًا؟ (٣١ فبراير ليست تاريخًا) */
export function isRealDate({ day, month, year }: CalendarDate) {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  // الانزلاق إلى شهر آخر دليل على أن اليوم لا يوجد في هذا الشهر.
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** يبني لحظة منتصف ليل UTC لليوم المعطى. */
export function fromCalendarDate({ day, month, year }: CalendarDate) {
  return new Date(Date.UTC(year, month - 1, day));
}

/** اليوم الحالي كتاريخ تقويمي بتوقيت UTC. */
export function todayUTC(): CalendarDate {
  const now = new Date();
  return { day: now.getUTCDate(), month: now.getUTCMonth() + 1, year: now.getUTCFullYear() };
}

function compare(a: CalendarDate, b: CalendarDate) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function isFuture(date: CalendarDate, today: CalendarDate = todayUTC()) {
  return compare(date, today) > 0;
}

/** نص «YYYY-MM-DD» — الصيغة المتبادلة بين النماذج والخادم. */
export function toISODateString({ day, month, year }: CalendarDate) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** يقرأ «YYYY-MM-DD» دون المرور بمحلّل التواريخ ومناطقه الزمنية. */
export function parseISODateString(value: string): CalendarDate | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isRealDate(date) ? date : null;
}

/**
 * العمر الحقيقي اليوم: عدد السنوات المكتملة.
 *
 * المولود في ٢٠ سبتمبر ٢٠١٠ يبقى ابن ١٥ يوم ١٦ سبتمبر ٢٠٢٦، ويصير ابن ١٦
 * يوم ٢٠ سبتمبر — لا تُطرح السنتان طرحًا مجرّدًا.
 */
export function ageOn(birth: CalendarDate, today: CalendarDate = todayUTC()): number | null {
  if (compare(birth, today) > 0) return null;
  let age = today.year - birth.year;
  // لم يبلغ يوم ميلاده هذه السنة بعد.
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) {
    age -= 1;
  }
  return age;
}

/** الأيام حتى عيد الميلاد القادم (صفر = اليوم). */
export function daysUntilBirthday(birth: CalendarDate, today: CalendarDate = todayUTC()): number {
  // ٢٩ فبراير في سنة غير كبيسة يُحتفل به في اليوم الأخير من فبراير.
  const occurrence = (year: number) => {
    const day = isRealDate({ ...birth, year }) ? birth.day : birth.day - 1;
    return Date.UTC(year, birth.month - 1, day);
  };

  const todayMs = Date.UTC(today.year, today.month - 1, today.day);
  const thisYear = occurrence(today.year);
  const target = thisYear >= todayMs ? thisYear : occurrence(today.year + 1);
  return Math.round((target - todayMs) / 86_400_000);
}
