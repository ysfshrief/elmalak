import type { Role, Gender } from "@prisma/client";

/**
 * المسمّى يعتمد على الدور + نوع المستخدم، فيظهر «أمينة مرحلة» و«خادمة»
 * بصياغتهما الصحيحة دون أن يكونا دورين منفصلين في قاعدة البيانات.
 */
export function roleLabel(role: Role, gender?: Gender | null) {
  const female = gender === "FEMALE";
  switch (role) {
    case "ADMIN":
      return "مسؤول النظام";
    case "SERVICE_SECRETARY":
      return female ? "أمينة خدمة التربية الكنسية" : "أمين خدمة التربية الكنسية";
    case "STAGE_SECRETARY":
      return female ? "أمينة مرحلة" : "أمين مرحلة";
    case "SERVANT":
      return female ? "خادمة" : "خادم";
  }
}

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "مسؤول النظام" },
  { value: "SERVICE_SECRETARY", label: "أمين/أمينة خدمة التربية الكنسية" },
  { value: "STAGE_SECRETARY", label: "أمين/أمينة مرحلة" },
  { value: "SERVANT", label: "خادم/خادمة" },
];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "ذكر",
  FEMALE: "أنثى",
};

/** إدارة حسابات المستخدمين وصلاحياتهم — للمسؤول وحده. */
export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

/** إنشاء/حذف المراحل والأقسام والصفوف — تغيير هيكلي، للمسؤول وحده. */
export function canManageStructure(role: Role) {
  return role === "ADMIN";
}

/** تسمية أسرة الفصل — أمين المرحلة فما فوق، داخل نطاقه. */
export function canRenameGradeFamily(role: Role) {
  return role === "ADMIN" || role === "SERVICE_SECRETARY" || role === "STAGE_SECRETARY";
}

/** حذف مخدوم نهائيًا — أمين المرحلة فما فوق، داخل نطاقه. */
export function canDeleteChild(role: Role) {
  return role === "ADMIN" || role === "SERVICE_SECRETARY" || role === "STAGE_SECRETARY";
}
