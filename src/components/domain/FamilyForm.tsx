"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { familySchema } from "@/lib/validation";
import { Input, Select, Label, FieldError } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createFamilyAction, updateFamilyAction } from "@/actions/families";

type FormValues = z.infer<typeof familySchema>;

export function FamilyForm({
  stages,
  family,
  onSuccess,
}: {
  stages: { id: string; name: string }[];
  family?: { id: string; name: string; stageId: string };
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(familySchema),
    defaultValues: { name: family?.name ?? "", stageId: family?.stageId ?? stages[0]?.id ?? "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (family) {
        await updateFamilyAction(family.id, values);
        toast.success("تم تحديث بيانات الأسرة");
      } else {
        await createFamilyAction(values);
        toast.success("تم إنشاء الأسرة بنجاح");
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ البيانات");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="name" required>
          اسم الأسرة
        </Label>
        <Input id="name" autoFocus {...register("name")} error={!!errors.name} placeholder="مثال: أسرة الملاك ميخائيل" />
        <FieldError>{errors.name?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="stageId" required>
          المرحلة
        </Label>
        <Select id="stageId" {...register("stageId")} error={!!errors.stageId}>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <FieldError>{errors.stageId?.message}</FieldError>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={isSubmitting}>
          {family ? "حفظ التعديلات" : "إنشاء الأسرة"}
        </Button>
      </div>
    </form>
  );
}
