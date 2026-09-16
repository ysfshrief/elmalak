"use client";

import * as React from "react";
import { Input, Select, FieldError } from "@/components/ui/Input";
import { cn, monthName } from "@/lib/utils";
import {
  MIN_BIRTH_YEAR,
  isFuture,
  isRealDate,
  parseISODateString,
  toISODateString,
  todayUTC,
  type CalendarDate,
} from "@/lib/dates";

/**
 * إدخال تاريخ الميلاد: يوم / شهر / سنة، ثلاث خانات مستقلة.
 *
 * منتقي التاريخ الأصلي في المتصفّح يفتح على الشهر الحالي، فمن أراد مولودًا
 * سنة ٢٠١٣ تنقّل عبر مئة وخمسين شهرًا. وهنا تُكتب السنة رقمًا مباشرة.
 *
 * والقيمة المتبادلة مع النموذج نصٌّ «YYYY-MM-DD» — نفس صيغة الخادم، فلا
 * يمرّ التاريخ بمحلّل المناطق الزمنية في أي اتجاه.
 */
export function DateField({
  id,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}) {
  const parsed = parseISODateString(value);
  const [draft, setDraft] = React.useState({
    day: parsed ? String(parsed.day) : "",
    month: parsed ? String(parsed.month) : "",
    year: parsed ? String(parsed.year) : "",
  });

  const today = todayUTC();

  function update(part: "day" | "month" | "year", raw: string) {
    const next = { ...draft, [part]: raw };
    setDraft(next);

    const day = Number(next.day);
    const month = Number(next.month);
    const year = Number(next.year);

    // تاريخ ناقص ليس خطأً بعد — قد يكون المستخدم في منتصف الكتابة.
    if (!next.day || !next.month || !next.year) {
      onChange("");
      return;
    }
    // يُمرَّر ما كتبه المستخدم كما هو حتى لو كان يومًا غير موجود؛ فالمخطّط
    // على الخادم هو من يردّه برسالة واحدة، بدل قيمة سحرية تعني «خطأ».
    onChange(toISODateString({ day, month, year }));
  }

  /** خطأ محلّي يظهر فورًا، قبل محاولة الحفظ. */
  const localError = React.useMemo(() => {
    if (!draft.day && !draft.month && !draft.year) return null;
    if (!draft.day || !draft.month || !draft.year) return "أكمل اليوم والشهر والسنة";

    const candidate: CalendarDate = {
      day: Number(draft.day),
      month: Number(draft.month),
      year: Number(draft.year),
    };
    if (candidate.year < MIN_BIRTH_YEAR) return `السنة تبدأ من ${MIN_BIRTH_YEAR}`;
    if (!isRealDate(candidate)) return "هذا اليوم غير موجود في هذا الشهر";
    if (isFuture(candidate, today)) return "تاريخ الميلاد لا يكون في المستقبل";
    return null;
  }, [draft, today]);

  const shown = error ?? localError ?? undefined;
  const invalid = !!shown;

  return (
    <div>
      <div className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-2" dir="rtl">
        <Input
          id={id}
          value={draft.day}
          onChange={(e) => update("day", e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={onBlur}
          disabled={disabled}
          error={invalid}
          inputMode="numeric"
          placeholder="يوم"
          aria-label="يوم الميلاد"
          className="text-center"
        />
        <Select
          value={draft.month}
          onChange={(e) => update("month", e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          error={invalid}
          aria-label="شهر الميلاد"
        >
          <option value="">الشهر</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {monthName(i + 1)}
            </option>
          ))}
        </Select>
        <Input
          value={draft.year}
          onChange={(e) => update("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
          onBlur={onBlur}
          disabled={disabled}
          error={invalid}
          inputMode="numeric"
          placeholder="سنة"
          aria-label="سنة الميلاد"
          className={cn("text-center tabular-nums")}
        />
      </div>
      <FieldError>{shown}</FieldError>
    </div>
  );
}
