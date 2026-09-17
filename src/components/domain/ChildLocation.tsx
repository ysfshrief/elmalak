"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, MapPinPlus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { isSafeLocationUrl, locationHost } from "@/lib/location";
import { setChildLocationAction } from "@/actions/children";
import { cn } from "@/lib/utils";

/** النصّ كما طلبه صاحب الخدمة حرفًا بحرف — لا يُترجَم ولا يُختصر. */
export const LOCATION_LABEL = "📍 لوكيشن المخدوم";

/**
 * فتح الموقع يُترك للجهاز: رابطٌ عاديّ في وسم `<a>`، فيفتحه الهاتف بما اختاره
 * صاحبه من تطبيقات الخرائط أو الملاحة. ولو فُرض هنا مزوّدٌ بعينه لانكسر ذلك.
 */
export function LocationLink({
  url,
  className,
  compact,
}: {
  url: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={LOCATION_LABEL}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        compact
          ? "flex size-9 shrink-0 items-center justify-center rounded-full text-primary-ink transition-colors hover:bg-primary-soft"
          : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 py-2.5 text-sm font-bold text-primary-contrast shadow-[var(--shadow-sm)] transition-all hover:brightness-110 active:scale-[0.98] sm:w-auto",
        className
      )}
    >
      {compact ? (
        <MapPin className="size-5" aria-hidden />
      ) : (
        <>
          <span>{LOCATION_LABEL}</span>
          <ExternalLink className="size-4 opacity-80" aria-hidden />
        </>
      )}
    </a>
  );
}

/**
 * بطاقة الموقع في صفحة المخدوم: تفتحه إن كان محفوظًا، وتعرض طريقًا لإضافته
 * إن لم يكن. ولا يُعرض زرٌّ مكسور لمخدومٍ بلا موقع — يُعرض سببُ غيابه وطريقُ
 * إصلاحه، وهذا أنفع من زرٍّ لا يؤدّي إلى شيء.
 */
export function ChildLocationCard({
  enrollmentId,
  locationUrl,
  canEdit = true,
}: {
  enrollmentId: string;
  locationUrl: string | null;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [value, setValue] = React.useState(locationUrl ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // لا مزامنة ولا أثر: الحقل يُملأ من المحفوظ لحظةَ فتح النافذة. فما يُعرض
  // مقروءٌ من الخاصيّة مباشرةً، والمسوَّدة لا تعيش إلا ما دامت النافذة مفتوحة.
  function openEditor() {
    setValue(locationUrl ?? "");
    setError(null);
    setOpen(true);
  }

  async function save(next: string) {
    setSaving(true);
    try {
      await setChildLocationAction(enrollmentId, next);
      toast.success(next ? "تم حفظ اللوكيشن" : "تم حذف اللوكيشن");
      setOpen(false);
      setConfirmRemove(false);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "تعذّر الحفظ";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = value.trim();
    if (!isSafeLocationUrl(next)) {
      setError("أدخل رابطًا صحيحًا يبدأ بـ http أو https");
      return;
    }
    setError(null);
    save(next);
  }

  return (
    <div className="space-y-2.5">
      {locationUrl ? (
        <>
          <LocationLink url={locationUrl} />
          <p className="truncate text-xs text-ink-faint" dir="ltr" title={locationUrl}>
            {locationHost(locationUrl)}
          </p>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEditor}>
                <Pencil className="size-3.5" />
                تعديل اللوكيشن
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="حذف اللوكيشن"
                onClick={() => setConfirmRemove(true)}
              >
                <Trash2 className="size-3.5 text-error" aria-hidden />
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-ink-muted">لا يوجد لوكيشن محفوظ لهذا المخدوم.</p>
          {canEdit ? (
            <Button variant="outline" onClick={openEditor} className="w-full sm:w-auto">
              <MapPinPlus className="size-4" />
              إضافة لوكيشن
            </Button>
          ) : (
            <p className="text-xs text-ink-faint">يمكن لمن يملك تعديل بيانات المخدوم إضافته.</p>
          )}
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={locationUrl ? "تعديل لوكيشن المخدوم" : "إضافة لوكيشن المخدوم"}
        size="sm"
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="locationUrl" required>
              رابط الموقع
            </Label>
            <Input
              id="locationUrl"
              autoFocus
              dir="ltr"
              inputMode="url"
              type="url"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              error={!!error}
              placeholder="https://maps.app.goo.gl/..."
            />
            <FieldError>{error}</FieldError>
            <p className="mt-1.5 text-xs text-ink-faint">
              من تطبيق الخرائط: «مشاركة الموقع» ثم «نسخ الرابط»، والصقه هنا كما هو. الرابط
              يُحفظ بلا تغيير ويُفتح بتطبيق الخرائط الذي تختاره على جهازك.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" loading={saving}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="حذف اللوكيشن"
        description="سيُحذف رابط موقع المخدوم. يمكنك إضافته مرة أخرى في أي وقت."
        confirmLabel="حذف"
        loading={saving}
        onConfirm={() => save("")}
      />
    </div>
  );
}
