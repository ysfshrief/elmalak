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

export const memberSchema = z.object({
  fullName: z.string().trim().min(2, "اسم المخدوم مطلوب"),
  familyId: z.string().min(1, "اختر الأسرة"),
  address: z.string().trim().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  school: z.string().trim().optional().or(z.literal("")),
  confessionFather: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  phones: z.array(phoneSchema),
});

export const familySchema = z.object({
  name: z.string().trim().min(2, "اسم الأسرة مطلوب"),
  stageId: z.string().min(1, "اختر المرحلة"),
});

export const stageSchema = z.object({
  name: z.string().trim().min(2, "اسم المرحلة مطلوب"),
  order: z.coerce.number().int().default(0),
});

export const userSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب"),
  username: z
    .string()
    .trim()
    .min(3, "اسم المستخدم 3 أحرف على الأقل")
    .regex(/^[a-zA-Z0-9_.]+$/, "اسم المستخدم بالإنجليزية والأرقام فقط"),
  phone: z.string().trim().optional().or(z.literal("")),
  role: z.enum(["SUPER_ADMIN", "STAGE_COORDINATOR", "FAMILY_SERVANT"]),
  stageId: z.string().optional().or(z.literal("")),
  familyIds: z.array(z.string()),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").optional().or(z.literal("")),
});

export const attendanceSessionSchema = z.object({
  familyId: z.string().min(1),
  date: z.string().min(1, "اختر تاريخ الاجتماع"),
  label: z.string().trim().optional().or(z.literal("")),
});

export const visitationUpdateSchema = z.object({
  memberId: z.string().min(1),
  familyId: z.string().min(1),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
  visited: z.boolean(),
  note: z.string().trim().optional().or(z.literal("")),
});
