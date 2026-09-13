"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { userSchema } from "@/lib/validation";
import { Input, Select, Label, FieldError, FieldHint } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS } from "@/lib/roles";
import { createUserAction, updateUserAction } from "@/actions/users";
import type { Role } from "@prisma/client";

type FormValues = z.infer<typeof userSchema>;

export function UserForm({
  stages,
  families,
  user,
  onSuccess,
}: {
  stages: { id: string; name: string }[];
  families: { id: string; name: string }[];
  user?: {
    id: string;
    name: string;
    username: string;
    phone: string | null;
    role: Role;
    stageId: string | null;
    assignments: { familyId: string }[];
  };
  onSuccess: () => void;
}) {
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
      role: user?.role ?? "FAMILY_SERVANT",
      stageId: user?.stageId ?? "",
      familyIds: user?.assignments.map((a) => a.familyId) ?? [],
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

      <div>
        <Label htmlFor="phone">رقم التليفون</Label>
        <Input id="phone" {...register("phone")} inputMode="tel" />
      </div>

      <div>
        <Label htmlFor="role" required>
          الدور
        </Label>
        <Select id="role" {...register("role")}>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>

      {role === "STAGE_COORDINATOR" && (
        <div>
          <Label htmlFor="stageId" required>
            المرحلة المسؤول عنها
          </Label>
          <Select id="stageId" {...register("stageId")} error={!!errors.stageId}>
            <option value="">اختر المرحلة</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {role === "FAMILY_SERVANT" && (
        <div>
          <Label required>الأسر المسؤول عنها</Label>
          <Controller
            control={control}
            name="familyIds"
            render={({ field }) => (
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-[var(--radius-sm)] border border-border-strong p-3">
                {families.length === 0 && <p className="text-sm text-ink-faint">لا توجد أسر متاحة</p>}
                {families.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={field.value.includes(f.id)}
                      onChange={(e) => {
                        field.onChange(
                          e.target.checked ? [...field.value, f.id] : field.value.filter((id) => id !== f.id)
                        );
                      }}
                      className="size-4 accent-primary"
                    />
                    {f.name}
                  </label>
                ))}
              </div>
            )}
          />
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
