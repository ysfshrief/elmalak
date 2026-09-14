import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "من فضلك أدخل اسم المستخدم"),
  password: z.string().min(1, "من فضلك أدخل كلمة المرور"),
});

export const phoneSchema = z.object({
  label: z.string().min(1, "اختر نوع الرقم"),
  number: z
    .string()
    .trim()
    .min(6, "رقم التليفون غير صحيح")
    .regex(/^[0-9+\s-]+$/, "رقم التليفون يجب أن يحتوي على أرقام فقط"),
});

export const childSchema = z.object({
  fullName: z.string().trim().min(2, "اسم المخدوم مطلوب"),
  gradeId: z.string().min(1, "اختر الصف"),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  school: z.string().trim().optional().or(z.literal("")),
  confessionFather: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  phones: z.array(phoneSchema),
});

export const stageSchema = z.object({
  name: z.string().trim().min(2, "اسم المرحلة مطلوب"),
  order: z.coerce.number().int().default(0),
});

export const divisionSchema = z.object({
  stageId: z.string().min(1, "اختر المرحلة"),
  name: z.string().trim().min(2, "اسم القسم مطلوب"),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  order: z.coerce.number().int().default(0),
});

export const gradeSchema = z.object({
  divisionId: z.string().min(1, "اختر القسم"),
  name: z.string().trim().min(1, "اسم الصف مطلوب"),
  familyName: z.string().trim().optional().or(z.literal("")),
  order: z.coerce.number().int().default(0),
});

export const gradeFamilyNameSchema = z.object({
  gradeId: z.string().min(1),
  familyName: z.string().trim().max(120, "الاسم طويل جدًا").optional().or(z.literal("")),
});

/** نطاق تكليف واحد: يُملأ مستوى واحد فقط. */
export const assignmentSchema = z.object({
  serviceId: z.string().optional().or(z.literal("")),
  stageId: z.string().optional().or(z.literal("")),
  divisionId: z.string().optional().or(z.literal("")),
  gradeId: z.string().optional().or(z.literal("")),
});

export const userSchema = z
  .object({
    name: z.string().trim().min(2, "الاسم مطلوب"),
    username: z
      .string()
      .trim()
      .min(3, "اسم المستخدم 3 أحرف على الأقل")
      .regex(/^[a-zA-Z0-9_.]+$/, "اسم المستخدم بالإنجليزية والأرقام فقط"),
    phone: z.string().trim().optional().or(z.literal("")),
    role: z.enum(["ADMIN", "SERVICE_SECRETARY", "STAGE_SECRETARY", "SERVANT"]),
    gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
    assignments: z.array(assignmentSchema),
    password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").optional().or(z.literal("")),
  })
  .refine((v) => v.role === "ADMIN" || v.assignments.length > 0, {
    message: "يجب تحديد نطاق تكليف واحد على الأقل لغير المسؤول",
    path: ["assignments"],
  });

export const attendanceSessionSchema = z.object({
  gradeId: z.string().min(1),
  date: z.string().min(1, "اختر تاريخ الاجتماع"),
  label: z.string().trim().optional().or(z.literal("")),
});

export const visitationUpdateSchema = z.object({
  enrollmentId: z.string().min(1),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
  visited: z.boolean(),
  note: z.string().trim().optional().or(z.literal("")),
});

/** صف واحد من كشف الاستيراد بعد مراجعة المستخدم وقبل الحفظ. */
export const importRowSchema = z.object({
  key: z.string().min(1),
  fullName: z.string().trim().min(2, "اسم المخدوم مطلوب"),
  gradeId: z.string().min(1, "اختر الصف"),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  school: z.string().trim().optional().or(z.literal("")),
  confessionFather: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  phones: z.array(phoneSchema),
});

export const importCommitSchema = z.object({
  rows: z.array(importRowSchema).min(1, "لا توجد صفوف للحفظ"),
  /** إضافة أسماء موجودة بالفعل في الصف نفسه هذا العام. */
  allowDuplicates: z.boolean(),
});
