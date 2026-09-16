"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { setAttendancePointsAction } from "@/actions/structure";

/**
 * نظام نقاط الحضور اختياري.
 *
 * حين يكون معطَّلًا لا يظهر للنقاط أثرٌ في الموقع كلّه، ويسير الحضور كما كان.
 * وحين يُفعَّل تُحسب النقاط من سجلات الحضور الموجودة — بأثر رجعي، إذ ليست
 * مخزَّنة في السجلات حتى تنقص منها أو تفسدها.
 */
export function AttendancePointsForm({
  enabled,
  pointValue,
}: {
  enabled: boolean;
  pointValue: number;
}) {
  const router = useRouter();
  const [on, setOn] = React.useState(enabled);
  const [value, setValue] = React.useState(String(pointValue));
  const [saving, setSaving] = React.useState(false);

  const dirty = on !== enabled || Number(value) !== pointValue;

  async function save() {
    setSaving(true);
    try {
      await setAttendancePointsAction({ enabled: on, pointValue: Number(value) });
      toast.success(on ? "تم تفعيل نقاط الحضور" : "تم تعطيل نقاط الحضور");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر حفظ الإعداد");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-bold text-ink">
            <Sparkles className="size-4 text-primary" aria-hidden />
            تفعيل نقاط الحضور
          </span>
          <span className="mt-1 block text-sm text-ink-muted">
            عند التعطيل يعمل الحضور كالمعتاد: حضور وغياب فقط، بلا أي ذكر للنقاط.
          </span>
        </span>
      </label>

      <div className={on ? "" : "pointer-events-none opacity-50"}>
        <Label htmlFor="pointValue">نقاط الحضور الواحد</Label>
        <Input
          id="pointValue"
          inputMode="numeric"
          value={value}
          disabled={!on}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="max-w-32 text-center tabular-nums"
        />
        <FieldHint>
          تُحتسب للحضور المسجَّل وحده. الغياب والعذر لا ينقصان نقاطًا ولا يضيفانها.
        </FieldHint>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving} disabled={!dirty || (on && Number(value) < 1)}>
          حفظ الإعداد
        </Button>
      </div>
    </div>
  );
}
