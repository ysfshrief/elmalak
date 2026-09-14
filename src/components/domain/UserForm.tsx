"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { userSchema } from "@/lib/validation";
import { Input, Select, Label, FieldError, FieldHint } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROLE_OPTIONS } from "@/lib/roles";
import { createUserAction, updateUserAction } from "@/actions/users";
import type { Role } from "@prisma/client";

type FormValues = z.infer<typeof userSchema>;

export type ScopeTree = {
  service: { id: string; name: string } | null;
  stages: {
    id: string;
    name: string;
    divisions: { id: string; name: string; grades: { id: string; name: string; familyName: string | null }[] }[];
  }[];
};

/** كل خيار = مستوى واحد في الهيكل، مُرمَّز كـ"level:id". */
function buildScopeOptions(tree: ScopeTree) {
  const options: { value: string; label: string }[] = [];
  if (tree.service) {
    options.push({ value: `service:${tree.service.id}`, label: `الخدمة كلها — ${tree.service.name}` });
  }
  for (const stage of tree.stages) {
    options.push({ value: `stage:${stage.id}`, label: `مرحلة ${stage.name} (كاملة)` });
    for (const division of stage.divisions) {
      options.push({ value: `division:${division.id}`, label: `${stage.name} › ${division.name}` });
      for (const grade of division.grades) {
        options.push({
          value: `grade:${grade.id}`,
          label: `${stage.name} › ${division.name} › ${grade.name}${grade.familyName ? ` (${grade.familyName})` : ""}`,
        });
      }
    }
  }
  return options;
}

function encodeAssignment(a: FormValues["assignments"][number]) {
  if (a.serviceId) return `service:${a.serviceId}`;
  if (a.stageId) return `stage:${a.stageId}`;
  if (a.divisionId) return `division:${a.divisionId}`;
  if (a.gradeId) return `grade:${a.gradeId}`;
  return "";
}

function decodeAssignment(value: string): FormValues["assignments"][number] {
  const [level, id] = value.split(":");
  return {
    serviceId: level === "service" ? id : "",
    stageId: level === "stage" ? id : "",
    divisionId: level === "division" ? id : "",
    gradeId: level === "grade" ? id : "",
  };
}

export function UserForm({
  tree,
  user,
  onSuccess,
}: {
  tree: ScopeTree;
  user?: {
    id: string;
    name: string;
    username: string;
    phone: string | null;
    role: Role;
    gender: string | null;
    assignments: {
      serviceId: string | null;
      stageId: string | null;
      divisionId: string | null;
      gradeId: string | null;
    }[];
  };
  onSuccess: () => void;
}) {
  const scopeOptions = React.useMemo(() => buildScopeOptions(tree), [tree]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      phone: user?.phone ?? "",
      role: user?.role ?? "SERVANT",
      gender: (user?.gender ?? "") as FormValues["gender"],
      assignments:
        user?.assignments.map((a) => ({
          serviceId: a.serviceId ?? "",
          stageId: a.stageId ?? "",
          divisionId: a.divisionId ?? "",
          gradeId: a.gradeId ?? "",
        })) ?? [],
      password: "",
    },
  });

  const role = watch("role");

  async function onSubmit(values: FormValues) {
    try {
      if (user) {
        await updateUserAction(user.id, values);
        toast.success("تم تحديث بيانات المستخدم");
      } else {
        await createUserAction(values);
        toast.success("تم إنشاء المستخدم بنجاح");
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ البيانات");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" required>
            الاسم
          </Label>
          <Input id="name" autoFocus {...register("name")} error={!!errors.name} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="username" required>
            اسم المستخدم
          </Label>
          <Input id="username" {...register("username")} error={!!errors.username} placeholder="بالإنجليزية" dir="ltr" />
          <FieldError>{errors.username?.message}</FieldError>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">رقم التليفون</Label>
          <Input id="phone" {...register("phone")} inputMode="tel" />
        </div>
        <div>
          <Label htmlFor="gender">النوع</Label>
          <Select id="gender" {...register("gender")}>
            <option value="">غير محدد</option>
            <option value="MALE">ذكر</option>
            <option value="FEMALE">أنثى</option>
          </Select>
          <FieldHint>يحدد صياغة المسمّى: خادم/خادمة، أمين/أمينة</FieldHint>
        </div>
      </div>

      <div>
        <Label htmlFor="role" required>
          الدور — ماذا يستطيع أن يفعل
        </Label>
        <Select id="role" {...register("role")}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      {role !== "ADMIN" && (
        <div>
          <Label required>نطاق التكليف — أين يعمل</Label>
          <Controller
            control={control}
            name="assignments"
            render={({ field }) => {
              const values = field.value.map(encodeAssignment);
              return (
                <div className="space-y-2">
                  {values.map((value, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Select
                          value={value}
                          onChange={(e) => {
                            const next = [...field.value];
                            next[index] = decodeAssignment(e.target.value);
                            field.onChange(next);
                          }}
                        >
                          <option value="">اختر النطاق</option>
                          {scopeOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="حذف التكليف"
                        onClick={() => field.onChange(field.value.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4.5 text-error" />
                      </Button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      field.onChange([
                        ...field.value,
                        { serviceId: "", stageId: "", divisionId: "", gradeId: "" },
                      ])
                    }
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    <Plus className="size-4" />
                    إضافة نطاق
                  </button>
                </div>
              );
            }}
          />
          <FieldHint>
            يمكن إسناد أكثر من نطاق. مثال: «خادم» + نطاق «إعدادي › بنين › الصف الثالث».
          </FieldHint>
          <FieldError>{errors.assignments?.message}</FieldError>
        </div>
      )}

      <div>
        <Label htmlFor="password" required={!user}>
          كلمة المرور
        </Label>
        <Input id="password" type="password" {...register("password")} error={!!errors.password} autoComplete="new-password" />
        {user ? (
          <FieldHint>اتركها فارغة للإبقاء على كلمة المرور الحالية</FieldHint>
        ) : (
          <FieldHint>6 أحرف على الأقل</FieldHint>
        )}
        <FieldError>{errors.password?.message}</FieldError>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={isSubmitting}>
          {user ? "حفظ التعديلات" : "إنشاء المستخدم"}
        </Button>
      </div>
    </form>
  );
}
