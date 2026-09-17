"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { childSchema } from "@/lib/validation";
import { PHONE_LABELS } from "@/lib/utils";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/Input";
import { DateField } from "@/components/ui/DateField";
import { Button } from "@/components/ui/Button";
import { ChildPhotoField, type ChildPhotoFieldHandle } from "@/components/domain/ChildPhotoField";
import { createChildAction, updateChildAction } from "@/actions/children";

type FormValues = z.infer<typeof childSchema>;

export function ChildForm({
  gradeId,
  enrollmentId,
  child,
  onSuccess,
}: {
  gradeId: string;
  /** موجود عند التعديل فقط. */
  enrollmentId?: string;
  child?: {
    id: string;
    photoPath: string | null;
    fullName: string;
    gender: string | null;
    address: string | null;
    locationUrl?: string | null;
    birthDate: Date | null;
    school: string | null;
    confessionFather: string | null;
    notes: string | null;
    phones: { label: string; number: string }[];
  };
  onSuccess: () => void;
}) {
  const photoRef = React.useRef<ChildPhotoFieldHandle>(null);

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      fullName: child?.fullName ?? "",
      gradeId,
      gender: (child?.gender ?? "") as FormValues["gender"],
      address: child?.address ?? "",
      locationUrl: child?.locationUrl ?? "",
      // ‎toISOString‎ يعطي يوم UTC، وهو نفس اليوم المخزَّن — لا يوم الخادم المحلّي.
      birthDate: child?.birthDate ? child.birthDate.toISOString().slice(0, 10) : "",
      school: child?.school ?? "",
      confessionFather: child?.confessionFather ?? "",
      notes: child?.notes ?? "",
      phones: child?.phones ?? [{ label: "الأب", number: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "phones" });

  async function onSubmit(values: FormValues) {
    try {
      if (enrollmentId) {
        await updateChildAction(enrollmentId, values);
        toast.success("تم تحديث بيانات المخدوم");
        onSuccess();
        return;
      }

      const created = await createChildAction(values);
      toast.success("تم إضافة المخدوم بنجاح");

      // الصورة تُرفع بعد إنشاء السجل، إذ لا تُنسب صورة إلى مخدوم لم يوجد
      // بعد. وفشلُ الرفع لا يُلغي المخدوم: يبقى مضافًا وتُعاد المحاولة من
      // صفحته.
      if (photoRef.current?.hasPending()) {
        try {
          await photoRef.current.uploadPending(created.id);
          // النافذة تُغلق بعد قليل فتختفي رسالة الحقل، والتأكيد لا يُترك للحظة.
          toast.success("تم حفظ صورة المخدوم بنجاح");
        } catch {
          toast.error("أُضيف المخدوم، لكن تعذّر حفظ الصورة — أعد رفعها من صفحته");
        }
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ البيانات");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <input type="hidden" {...register("gradeId")} />

      <ChildPhotoField
        ref={photoRef}
        name={watch("fullName")}
        childId={child?.id}
        initialVersion={child?.photoPath}
        disabled={isSubmitting}
      />

      <div>
        <Label htmlFor="fullName" required>
          الاسم بالكامل
        </Label>
        <Input id="fullName" autoFocus {...register("fullName")} error={!!errors.fullName} placeholder="مثال: مينا سامي فوزي" />
        <FieldError>{errors.fullName?.message}</FieldError>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="birthDate">تاريخ الميلاد</Label>
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <DateField
                id="birthDate"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.birthDate?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="school">المدرسة</Label>
          <Input id="school" {...register("school")} placeholder="اسم المدرسة" />
        </div>
      </div>

      <div>
        <Label htmlFor="address">العنوان</Label>
        <Textarea id="address" rows={2} {...register("address")} placeholder="العنوان بالتفصيل" />
      </div>

      <div>
        <Label htmlFor="locationUrl">لوكيشن المخدوم (رابط)</Label>
        <Input
          id="locationUrl"
          dir="ltr"
          inputMode="url"
          {...register("locationUrl")}
          error={!!errors.locationUrl}
          placeholder="https://maps.app.goo.gl/..."
        />
        <FieldError>{errors.locationUrl?.message}</FieldError>
        <p className="mt-1.5 text-xs text-ink-faint">
          الصق رابط الموقع المشارَك كما هو — يُحفظ بلا تغيير ويُفتح بتطبيق الخرائط الذي
          يختاره جهازك.
        </p>
      </div>

      <div>
        <Label htmlFor="confessionFather">أب الاعتراف</Label>
        <Input id="confessionFather" {...register("confessionFather")} placeholder="مثال: ابونا قسطنطين" />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="mb-0">أرقام التليفونات</Label>
          <button
            type="button"
            onClick={() => append({ label: "الأب", number: "" })}
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <Plus className="size-4" />
            إضافة رقم
          </button>
        </div>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <Controller
                control={control}
                name={`phones.${index}.label`}
                render={({ field: f }) => (
                  <Select {...f} className="w-32 shrink-0">
                    {PHONE_LABELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                )}
              />
              <div className="flex-1">
                <Input
                  {...register(`phones.${index}.number`)}
                  placeholder="01xxxxxxxxx"
                  inputMode="tel"
                  error={!!errors.phones?.[index]?.number}
                />
                <FieldError>{errors.phones?.[index]?.number?.message}</FieldError>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="حذف الرقم">
                <Trash2 className="size-4.5 text-error" />
              </Button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-sm text-ink-faint">لا توجد أرقام مضافة</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea id="notes" rows={2} {...register("notes")} placeholder="أي ملاحظات إضافية" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={isSubmitting}>
          {enrollmentId ? "حفظ التعديلات" : "إضافة المخدوم"}
        </Button>
      </div>
    </form>
  );
}
