"use client";

import * as React from "react";
import { Camera, Check, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Label } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  formatBytes,
  hasAllowedPhotoExtension,
  isAllowedPhotoType,
} from "@/lib/photo";
import {
  childPhotoUrl,
  deleteChildPhoto,
  uploadChildPhoto,
  type PreparedPhoto,
  type UploadHandle,
} from "@/lib/photo-client";
import { ImageCropper } from "@/components/domain/ImageCropper";
import { ImageViewer } from "@/components/domain/ImageViewer";

/**
 * حقل صورة المخدوم.
 *
 * الرفع يبدأ فور الاختيار حين يكون المخدوم موجودًا. أمّا عند الإضافة فلا
 * يوجد مخدوم بعدُ لتُنسب إليه الصورة، فتُحفظ الصورة المختارة حتى ينشأ السجل
 * ثم تُرفع — ولذلك تُعرِّض المكوّنة `uploadPending` لتناديها الاستمارة.
 */

export type ChildPhotoFieldHandle = {
  /** يرفع الصورة المعلَّقة بعد إنشاء المخدوم. لا يفعل شيئًا إن لم توجد. */
  uploadPending: (childId: string) => Promise<void>;
  hasPending: () => boolean;
};

type Phase = "idle" | "preparing" | "uploading" | "saving" | "done" | "error";

export const ChildPhotoField = React.forwardRef<
  ChildPhotoFieldHandle,
  {
    name: string;
    /** موجود عند التعديل؛ غائب عند الإضافة. */
    childId?: string;
    initialVersion?: string | null;
    disabled?: boolean;
  }
>(function ChildPhotoField({ name, childId, initialVersion, disabled }, ref) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const preparedRef = React.useRef<PreparedPhoto | null>(null);
  const uploadRef = React.useRef<UploadHandle | null>(null);

  // الصورة المجهَّزة تُحفظ في مرجع (لتقرأها `uploadPending` بلا إغلاق قديم)
  // وتُرصد في حالة، لأن العرض لا يجوز أن يقرأ مرجعًا فلا يُعاد رسمه عند تغيّره.
  const [hasPrepared, setHasPrepared] = React.useState(false);
  /** الملف المختار بانتظار القصّ — القصّ يقع قبل الرفع لا بعده. */
  const [cropping, setCropping] = React.useState<File | null>(null);
  const [viewing, setViewing] = React.useState(false);
  const [version, setVersion] = React.useState<string | null>(initialVersion ?? null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // روابط المعاينة المؤقتة تُحرَّر، وإلا بقيت الصور في الذاكرة.
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      uploadRef.current?.abort();
    };
  }, [preview]);

  const shownSrc = preview ?? (version && childId ? childPhotoUrl(childId, version) : null);
  const busy = phase === "preparing" || phase === "uploading" || phase === "saving";

  async function runUpload(targetChildId: string) {
    const prepared = preparedRef.current;
    if (!prepared) return;

    setError(null);
    setProgress(0);
    setPhase("uploading");

    const handle = uploadChildPhoto(targetChildId, prepared, (ratio) => {
      setProgress(ratio);
      // بلغت البايتات وجهتها، وبقي أن يحفظها الخادم في الأرشيف.
      if (ratio >= 1) setPhase("saving");
    });
    uploadRef.current = handle;

    try {
      const newVersion = await handle.promise;
      preparedRef.current = null;
      setHasPrepared(false);
      setVersion(newVersion);
      setPhase("done");
      // المعاينة المحلية تبقى ظاهرة: هي نفس الصورة، وتوفّر طلبًا للشبكة.
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "تعذّر حفظ الصورة");
    } finally {
      uploadRef.current = null;
    }
  }

  React.useImperativeHandle(ref, () => ({
    uploadPending: async (newChildId: string) => {
      if (preparedRef.current) await runUpload(newChildId);
    },
    hasPending: () => preparedRef.current !== null,
  }));

  async function handlePick(file: File) {
    setError(null);

    if (!isAllowedPhotoType(file.type) || !hasAllowedPhotoExtension(file.name)) {
      setPhase("error");
      setError("نوع الصورة غير مدعوم — استخدم JPG أو PNG أو WEBP");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhase("error");
      setError(`الصورة أكبر من ${formatBytes(MAX_PHOTO_BYTES)} — اختر صورة أصغر`);
      return;
    }

    setCropping(file);
  }

  /** بعد اعتماد القصّ: هذه هي البايتات التي تُرفع — لا الملف الأصلي. */
  async function handleCropped(photo: PreparedPhoto) {
    setCropping(null);
    preparedRef.current = photo;
    setHasPrepared(true);

    // لا يُلغى الرابط القديم هنا: الصورة ما تزال تشير إليه حتى يُعاد الرسم.
    // أثرُ التنظيف أدناه يلغيه بعد أن تحلّ الجديدة محلّه.
    setPreview(URL.createObjectURL(photo.blob));
    setProgress(0);

    if (childId) await runUpload(childId);
    // بلا مخدوم بعد: الصورة جاهزة وتُرفع فور إنشائه.
    else setPhase("idle");
  }

  async function handleRemove() {
    if (busy) return;
    preparedRef.current = null;
    setHasPrepared(false);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPhase("idle");
    setError(null);

    if (childId && version) {
      try {
        await deleteChildPhoto(childId);
        setVersion(null);
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : "تعذّر حذف الصورة");
      }
    }
  }

  const percent = Math.round(progress * 100);

  return (
    <div>
      <Label>صورة المخدوم</Label>
      <div className="flex items-center gap-4">
        <div className="relative">
          {shownSrc && !busy ? (
            <button
              type="button"
              onClick={() => setViewing(true)}
              aria-label={`عرض صورة ${name || "المخدوم"} بالحجم الكامل`}
              className="rounded-full transition-transform duration-150 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <Avatar name={name || "؟"} src={shownSrc} size="xl" />
            </button>
          ) : (
            <Avatar name={name || "؟"} src={shownSrc} size="xl" />
          )}

          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/65 backdrop-blur-[1px]">
              <ProgressRing value={phase === "saving" ? 1 : progress} />
              <span className="absolute text-sm font-bold tabular-nums text-white">
                {phase === "preparing" ? "…" : `${percent}%`}
              </span>
            </div>
          )}

          {phase === "done" && (
            <span className="absolute -bottom-0.5 -start-0.5 flex size-7 animate-scale-in items-center justify-center rounded-full border-2 border-surface bg-success text-white">
              <Check className="size-4" aria-hidden />
            </span>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
            aria-label={shownSrc ? "تغيير صورة المخدوم" : "إضافة صورة المخدوم"}
            className={cn(
              "absolute -bottom-0.5 -end-0.5 flex size-8 items-center justify-center rounded-full",
              "border-2 border-surface bg-primary text-primary-contrast shadow-[var(--shadow-sm)]",
              "transition-transform duration-150 hover:scale-105 active:scale-95",
              "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
              "disabled:opacity-50 disabled:hover:scale-100"
            )}
          >
            <Camera className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <StatusLine
            phase={phase}
            percent={percent}
            error={error}
            hasPhoto={!!shownSrc}
            pendingUpload={!childId && hasPrepared}
          />

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {phase === "error" && hasPrepared && childId && (
              <button
                type="button"
                onClick={() => runUpload(childId)}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <RotateCcw className="size-4" aria-hidden />
                إعادة المحاولة
              </button>
            )}
            {shownSrc && !busy && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="flex items-center gap-1.5 text-sm font-semibold text-error hover:underline disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden />
                إزالة الصورة
              </button>
            )}
          </div>
        </div>
      </div>

      {cropping && (
        <ImageCropper
          file={cropping}
          onCancel={() => setCropping(null)}
          onCropped={handleCropped}
        />
      )}

      {viewing && shownSrc && (
        <ImageViewer
          src={shownSrc}
          alt={`صورة ${name || "المخدوم"}`}
          onClose={() => setViewing(false)}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        // بلا `capture` عمدًا: يفتح الهاتف مُنتقيًا يخيّر بين الكاميرا والمعرض.
        accept={ALLOWED_PHOTO_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handlePick(file);
        }}
      />
    </div>
  );
});

function StatusLine({
  phase,
  percent,
  error,
  hasPhoto,
  pendingUpload,
}: {
  phase: Phase;
  percent: number;
  error: string | null;
  hasPhoto: boolean;
  pendingUpload: boolean;
}) {
  if (phase === "error") {
    return (
      <p className="flex items-start gap-1.5 text-sm font-semibold text-error">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {error}
      </p>
    );
  }
  if (phase === "preparing") return <Status text="جارٍ تجهيز الصورة…" />;
  if (phase === "uploading") {
    return <Status text={`جارٍ حفظ صورة المخدوم… ${percent}%`} />;
  }
  if (phase === "saving") return <Status text="جارٍ الحفظ في الأرشيف…" />;
  if (phase === "done") {
    return <p className="text-sm font-semibold text-success">تم حفظ الصورة بنجاح</p>;
  }
  if (pendingUpload) {
    return (
      <p className="text-sm text-ink-muted">الصورة جاهزة — ستُحفظ بعد إضافة المخدوم.</p>
    );
  }
  return (
    <p className="text-sm text-ink-muted">
      {hasPhoto ? "اضغط الكاميرا لتغيير الصورة." : "اختر صورة من جهازك أو التقطها بالكاميرا."}
      <span className="mt-0.5 block text-xs text-ink-faint">
        JPG أو PNG أو WEBP، حتى {formatBytes(MAX_PHOTO_BYTES)}
      </span>
    </p>
  );
}

function Status({ text }: { text: string }) {
  return (
    <p className="text-sm font-semibold text-ink" aria-live="polite">
      {text}
    </p>
  );
}

/** حلقة تقدّم تلتف حول الصورة — تتبع البايتات الخارجة فعلًا. */
function ProgressRing({ value }: { value: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      className="size-24 -rotate-90"
      viewBox="0 0 96 96"
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="تقدّم حفظ الصورة"
    >
      <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-white/25" />
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, value)))}
        className="text-white transition-[stroke-dashoffset] duration-200 ease-out"
      />
    </svg>
  );
}
