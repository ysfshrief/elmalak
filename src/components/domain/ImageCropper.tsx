"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePanZoom } from "@/components/ui/usePanZoom";
import { PHOTO_MAX_DIMENSION, PHOTO_QUALITY } from "@/lib/photo";
import type { PreparedPhoto } from "@/lib/photo-client";

/**
 * اختيار الجزء المطلوب من الصورة قبل رفعها.
 *
 * الإطار دائري لأن الصورة تُعرض دائرية في كل مكان، فما يراه المستخدم هنا هو
 * ما سيراه بعد الحفظ تمامًا. والصورة لا تصغر عن ملء الإطار مهما سُحبت، فلا
 * ينتج قصٌّ نصفه فراغ.
 *
 * ولا يُرفع إلا الجزء المقصوص: القصّ يقع قبل الرفع لا بعده، فلا تُرسل بايتات
 * لا يريدها أحد.
 */
export function ImageCropper({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (photo: PreparedPhoto) => void;
}) {
  const [source, setSource] = React.useState<{ url: string; width: number; height: number } | null>(
    null
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const { transform, setTransform, reset, handlers } = usePanZoom({ minScale: 1, maxScale: 6 });

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (alive) setSource({ url, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      if (alive) setError("تعذّرت قراءة الصورة — جرّب صورة أخرى");
    };
    image.src = url;

    return () => {
      alive = false;
      // يُوقَف التحميل الجاري ويُنسى المصدر قبل إلغاء الرابط: لولا ذلك لبقي
      // طلبٌ معلّقًا على رابطٍ مُلغًى، فيسجّل المتصفّح فشل تحميل لا سبب له.
      image.src = "";
      setSource(null);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  async function crop() {
    const frame = frameRef.current;
    if (!source || !frame) return;
    setBusy(true);
    setError(null);

    try {
      const box = frame.getBoundingClientRect();
      // الصورة معروضة بـobject-fit: cover داخل الإطار، ثم تُحرَّك وتُكبَّر.
      const cover = Math.max(box.width / source.width, box.height / source.height);
      const shown = cover * transform.scale;

      // مركز الإطار في إحداثيات الصورة الأصلية.
      const centerX = source.width / 2 - transform.x / shown;
      const centerY = source.height / 2 - transform.y / shown;
      const side = Math.min(box.width, box.height) / shown;

      const output = Math.min(PHOTO_MAX_DIMENSION, Math.round(side));
      const canvas = document.createElement("canvas");
      canvas.width = output;
      canvas.height = output;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("المتصفّح لا يدعم معالجة الصور");

      // خلفية بيضاء: لو خرج القصّ عن حدود الصورة لا يظهر سواد.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, output, output);

      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      context.drawImage(
        bitmap,
        centerX - side / 2,
        centerY - side / 2,
        side,
        side,
        0,
        0,
        output,
        output
      );
      bitmap.close();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY)
      );
      if (!blob) throw new Error("تعذّر تجهيز الصورة");

      onCropped({ blob, type: "image/jpeg", width: output, height: output });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر قصّ الصورة");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink/95 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 text-white">
        <button
          type="button"
          onClick={onCancel}
          aria-label="إلغاء"
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <X className="size-5" aria-hidden />
        </button>
        <p className="text-sm font-bold">اختر جزء الصورة</p>
        <button
          type="button"
          onClick={reset}
          aria-label="إعادة الضبط"
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <RotateCcw className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-6">
        <div
          ref={frameRef}
          {...handlers}
          className="relative aspect-square w-full max-w-[min(78vw,20rem)] cursor-grab touch-none overflow-hidden rounded-full ring-2 ring-white/70 active:cursor-grabbing"
        >
          {source && (
            // صورة محلّية مؤقّتة (blob:) لا تمرّ على مُحسِّن الصور.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={source.url}
              alt=""
              draggable={false}
              className="size-full select-none object-cover"
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              }}
            />
          )}
        </div>
      </div>

      {error && <p className="px-6 pb-2 text-center text-sm font-semibold text-error">{error}</p>}

      <div className="space-y-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-sm items-center gap-3 text-white">
          <ZoomIn className="size-4 shrink-0 opacity-70" aria-hidden />
          <input
            type="range"
            min={1}
            max={6}
            step={0.01}
            value={transform.scale}
            onChange={(e) =>
              setTransform((current) => ({ ...current, scale: Number(e.target.value) }))
            }
            aria-label="تكبير الصورة"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-[var(--color-primary)]"
          />
        </div>
        <p className="text-center text-xs text-white/60">
          اسحب الصورة لتحريكها، وقرّب بإصبعين أو بالشريط
        </p>
        <div className="mx-auto flex max-w-sm gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} type="button">
            إلغاء
          </Button>
          <Button className="flex-1" onClick={crop} loading={busy} disabled={!source} type="button">
            <Check className="size-4" aria-hidden />
            اعتماد الصورة
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
