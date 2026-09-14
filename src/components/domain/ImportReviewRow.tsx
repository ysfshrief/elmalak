"use client";

import * as React from "react";
import { ChevronDown, Trash2, AlertTriangle } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { PHONE_LABELS, PHONE_SLOTS } from "@/lib/import/columns";
import type { ImportRow, GradeOption } from "@/lib/import/normalize";

export function ImportReviewRow({
  row,
  index,
  grades,
  selected,
  error,
  onToggle,
  onChange,
  onRemove,
}: {
  row: ImportRow;
  index: number;
  grades: GradeOption[];
  selected: boolean;
  error: string | null;
  onToggle: (checked: boolean) => void;
  onChange: (next: ImportRow) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const set = <K extends keyof ImportRow>(key: K, value: ImportRow[K]) =>
    onChange({ ...row, [key]: value });

  // خانات التليفون ثابتة أثناء المراجعة حتى لا يقفز ما يكتبه المستخدم من
  // خانة إلى أخرى. تُضغط الخانات الفارغة عند الحفظ لا قبله.
  const setPhone = (slot: number, patch: { label?: string; number?: string }) => {
    const phones = Array.from(
      { length: PHONE_SLOTS },
      (_, i) => row.phones[i] ?? { label: i === 0 ? PHONE_LABELS[0] : "أخرى", number: "" }
    );
    phones[slot] = { ...phones[slot], ...patch };
    onChange({ ...row, phones });
  };

  const phoneCount = row.phones.filter((p) => p.number.trim()).length;

  const grade = grades.find((g) => g.id === row.gradeId);
  const fieldId = (name: string) => `row-${row.key}-${name}`;

  return (
    <li
      className={cn(
        "rounded-[var(--radius-md)] border transition-colors",
        error
          ? "border-error/50 bg-error-soft/30"
          : selected
            ? "border-border-strong bg-surface"
            : "border-border bg-bg-alt/40"
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <input
          type="checkbox"
          className="mt-2 size-4 shrink-0 accent-[var(--color-primary)]"
          checked={selected}
          disabled={!!error}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`استيراد ${row.fullName || `السطر ${index + 1}`}`}
        />

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-start"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold text-ink">{row.fullName || "— بلا اسم —"}</span>
            {grade && <Badge tone="primary">{grade.path.split("›").pop()?.trim()}</Badge>}
            {row.birthDate && <span className="text-xs text-ink-faint">{row.birthDate}</span>}
            {phoneCount > 0 && (
              <span className="text-xs text-ink-faint">{phoneCount} تليفون</span>
            )}
          </span>
          {(error || row.warnings.length > 0) && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              {error && (
                <Badge tone="error">
                  <AlertTriangle className="size-3" aria-hidden />
                  {error}
                </Badge>
              )}
              {row.warnings.map((w, i) => (
                <Badge key={i} tone="warning">
                  {w}
                </Badge>
              ))}
            </span>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-[var(--radius-sm)] p-2 text-ink-faint transition-colors hover:bg-error-soft hover:text-error"
            aria-label={`حذف ${row.fullName || `السطر ${index + 1}`} من الكشف`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-[var(--radius-sm)] p-2 text-ink-faint transition-colors hover:bg-bg-alt hover:text-ink"
            aria-expanded={open}
            aria-label={open ? "إخفاء التفاصيل" : "عرض التفاصيل وتعديلها"}
          >
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-4 border-t border-border p-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor={fieldId("name")} required>
              الاسم
            </Label>
            <Input
              id={fieldId("name")}
              value={row.fullName}
              error={!!error}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor={fieldId("grade")} required>
              الصف
            </Label>
            <Select
              id={fieldId("grade")}
              value={row.gradeId}
              onChange={(e) => set("gradeId", e.target.value)}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor={fieldId("gender")}>النوع</Label>
            <Select
              id={fieldId("gender")}
              value={row.gender}
              onChange={(e) => set("gender", e.target.value as ImportRow["gender"])}
            >
              <option value="">غير محدّد</option>
              <option value="MALE">ذكر</option>
              <option value="FEMALE">أنثى</option>
            </Select>
          </div>

          <div>
            <Label htmlFor={fieldId("birth")}>تاريخ الميلاد</Label>
            <Input
              id={fieldId("birth")}
              type="date"
              value={row.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor={fieldId("school")}>المدرسة</Label>
            <Input
              id={fieldId("school")}
              value={row.school}
              onChange={(e) => set("school", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor={fieldId("father")}>أب الاعتراف</Label>
            <Input
              id={fieldId("father")}
              value={row.confessionFather}
              onChange={(e) => set("confessionFather", e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor={fieldId("address")}>العنوان</Label>
            <Input
              id={fieldId("address")}
              value={row.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          {Array.from({ length: PHONE_SLOTS }, (_, slot) => {
            const phone = row.phones[slot];
            const defaultLabel = slot === 0 ? PHONE_LABELS[0] : "أخرى";
            return (
              <div key={slot}>
                <Label htmlFor={fieldId(`phone${slot}`)}>تليفون {slot + 1}</Label>
                <div className="flex gap-2">
                  <Input
                    id={fieldId(`phone${slot}`)}
                    inputMode="tel"
                    dir="ltr"
                    className="text-end"
                    value={phone?.number ?? ""}
                    onChange={(e) => setPhone(slot, { number: e.target.value })}
                  />
                  <Select
                    className="w-32 shrink-0"
                    aria-label={`صاحب تليفون ${slot + 1}`}
                    value={phone?.label ?? defaultLabel}
                    onChange={(e) => setPhone(slot, { label: e.target.value })}
                  >
                    {PHONE_LABELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            );
          })}

          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor={fieldId("notes")}>ملاحظات</Label>
            <Input
              id={fieldId("notes")}
              value={row.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
      )}
    </li>
  );
}
