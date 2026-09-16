"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePanZoom } from "@/components/ui/usePanZoom";

/**
 * عارض الصورة بالحجم الكامل.
 *
 * يُغلق بأي طريقة يتوقّعها المستخدم: زرّ الإغلاق، أو الضغط على الخلفية، أو
 * مفتاح Escape، أو سحب الصورة لأسفل بإصبعه وهي غير مكبَّرة — كما في تطبيقات
 * الصور المعتادة. والتكبير بالنقر المزدوج وبالعجلة وبإصبعين.
 */
/**
 * يُركَّب عند الفتح ويُفكَّك عند الإغلاق (‎{open && <ImageViewer/>}‎)، فتبدأ
 * حالته نظيفة في كل مرة بلا إعادة ضبط داخل أثرٍ جانبي.
 */
export function ImageViewer({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const { transform, handlers } = usePanZoom({ minScale: 1, maxScale: 6 });
  const [loaded, setLoaded] = React.useState(false);
  const dragStart = React.useRef<number | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /** السحب لأسفل يغلق — لكن فقط والصورة غير مكبَّرة، وإلا صار تحريكًا. */
  const closeOnDragDown = {
    onPointerDown: (event: React.PointerEvent) => {
      dragStart.current = transform.scale <= 1.02 ? event.clientY : null;
    },
    onPointerUp: (event: React.PointerEvent) => {
      const start = dragStart.current;
      dragStart.current = null;
      if (start !== null && event.clientY - start > 110) onClose();
    },
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/95 backdrop-blur-sm animate-fade-in-up"
      style={{ animationDuration: "0.18s" }}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
        aria-label="إغلاق"
        tabIndex={-1}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق"
        className="absolute end-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" aria-hidden />
      </button>

      <div
        {...handlers}
        {...closeOnDragDown}
        onPointerMove={handlers.onPointerMove}
        className="relative flex size-full touch-none items-center justify-center overflow-hidden"
      >
        {!loaded && (
          <span className="absolute size-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        )}
        {/* مسار محمي بالجلسة، فلا يمرّ على مُحسِّن الصور. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onDoubleClick={handlers.onDoubleClick}
          className="max-h-full max-w-full select-none object-contain transition-opacity duration-200"
          style={{
            opacity: loaded ? 1 : 0,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        />
      </div>

      <p className="pointer-events-none absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] text-xs text-white/55">
        اضغط مرتين للتكبير — اسحب لأسفل للإغلاق
      </p>
      <span className="sr-only" aria-live="polite">
        {loaded ? "الصورة جاهزة" : "جارٍ تحميل الصورة"}
      </span>
    </div>,
    document.body
  );
}
