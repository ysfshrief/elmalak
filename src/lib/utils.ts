import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ageOn, daysUntilBirthday, toCalendarDate } from "@/lib/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "ابريل",
  "مايو",
  "يونيو",
  "يوليو",
  "اغسطس",
  "سبتمبر",
  "اكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function monthName(month: number) {
  return ARABIC_MONTHS[(month - 1 + 12) % 12];
}

/**
 * تواريخ المشروع كلها (ميلاد المخدوم، تاريخ الاجتماع) تواريخ تقويمية مخزَّنة
 * عند منتصف ليل UTC، فتُقرأ بدوالّ UTC. وقراءتها محلّيًا تُنقص يومًا كاملًا
 * على أي خادم متأخّر عن UTC.
 */
export function formatArabicDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const parts = toCalendarDate(date);
  if (!parts) return "—";
  return `${parts.day} ${monthName(parts.month)} ${parts.year}`;
}

export function formatShortDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const parts = toCalendarDate(date);
  if (!parts) return "—";
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}

/** العمر الحقيقي اليوم — سنواتٌ مكتملة، لا فرق بين السنتين. */
export function calculateAge(birthDate: Date | string | null | undefined) {
  if (!birthDate) return null;
  const parts = toCalendarDate(birthDate);
  return parts ? ageOn(parts) : null;
}

/** الأيام حتى عيد الميلاد القادم (صفر = اليوم). */
export function daysUntilNextBirthday(birthDate: Date | string) {
  const parts = toCalendarDate(birthDate);
  return parts ? daysUntilBirthday(parts) : Number.POSITIVE_INFINITY;
}

export const PHONE_LABELS = ["الأب", "الأم", "المخدوم", "البيت", "الأخ"] as const;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  return parts[0]![0];
}
