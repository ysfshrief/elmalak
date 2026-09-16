"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * عارض الصورة بالحجم الكامل، بسلوك تطبيقات الصور المعروفة.
 *
 * السحب لأسفل لا يُغلق فجأةً عند حدٍّ خفيّ: الصورة تتبع الإصبع وتصغر قليلًا
 * والخلفية تشفّ معها، فيرى المستخدم أنه يُغلقها قبل أن يرفع إصبعه. وإن رفعه
 * قبل المسافة الكافية رجعت مكانها. وهذا هو الفرق بين إيماءة وحيلة.
 *
 * والسحب يُغلق ما دامت الصورة بحجمها؛ فإن كُبِّرت صار السحب تحريكًا لها —
 * وإلا استحال تصفّح صورة مكبَّرة.
 */

const DISMISS_AFTER_PX = 110;
const MAX_SCALE = 5;

type Point = { x: number; y: number };

export function ImageViewer({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [scale, setScale] = React.useState(1);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const [dismiss, setDismiss] = React.useState(0);
  const [settling, setSettling] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  const pointers = React.useRef(new Map<number, Point>());
  const pinchStart = React.useRef<{ distance: number; scale: number } | null>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const zoomed = scale > 1.02;

  function close() {
    // تُكمل الصورة طريقها لأسفل ثم تختفي، فلا تنقطع الحركة فجأة.
    setLeaving(true);
    window.setTimeout(onClose, 180);
  }

  function onPointerDown(event: React.PointerEvent) {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinchStart.current = null;
    setSettling(false);
  }

  function onPointerMove(event: React.PointerEvent) {
    const active = pointers.current;
    const previous = active.get(event.pointerId);
    if (!previous) return;
    active.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (active.size >= 2) {
      const [a, b] = [...active.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinchStart.current) {
        pinchStart.current = { distance, scale };
        return;
      }
      const next = pinchStart.current.scale * (distance / pinchStart.current.distance);
      setScale(Math.min(MAX_SCALE, Math.max(1, next)));
      return;
    }

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;

    if (zoomed) {
      setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
    } else {
      // بحجمها الطبيعي: السحب لأسفل إغلاق، ولأعلى مقاومة فلا تُسحب بلا معنى.
      setDismiss((current) => Math.max(0, current + dy));
    }
  }

  function onPointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size > 0) return;

    if (!zoomed) {
      if (dismiss > DISMISS_AFTER_PX) close();
      else {
        setSettling(true);
        setDismiss(0);
      }
    }
    if (scale <= 1.02) {
      setSettling(true);
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }

  /** النقر المزدوج يكبّر عند موضع النقر نفسه لا عند مركز الشاشة. */
  function onDoubleClick(event: React.MouseEvent) {
    setSettling(true);
    if (zoomed) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const box = imageRef.current?.getBoundingClientRect();
    if (!box) return;
    const target = 2.5;
    const offsetX = event.clientX - (box.left + box.width / 2);
    const offsetY = event.clientY - (box.top + box.height / 2);
    setScale(target);
    setPan({ x: -offsetX * (target - 1), y: -offsetY * (target - 1) });
  }

  const progress = Math.min(dismiss / 300, 1);
  const backdropOpacity = leaving ? 0 : 1 - progress * 0.75;
  const shrink = 1 - Math.min(dismiss / 900, 0.18);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] touch-none select-none"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div
        className="absolute inset-0 bg-ink backdrop-blur-sm"
        style={{
          opacity: backdropOpacity,
          transition: settling || leaving ? "opacity 180ms ease-out" : undefined,
        }}
        onClick={onClose}
        aria-hidden
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق"
        className="absolute end-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
        style={{ opacity: backdropOpacity }}
      >
        <X className="size-5" aria-hidden />
      </button>

      <div
        className="relative flex size-full items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {!loaded && (
          <span className="absolute size-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        )}
        {/* مسار محمي بالجلسة، فلا يمرّ على مُحسِّن الصور. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className="max-h-full max-w-full object-contain"
          style={{
            opacity: loaded ? (leaving ? 0 : 1) : 0,
            transform: `translate(${pan.x}px, ${pan.y + dismiss + (leaving ? 260 : 0)}px) scale(${scale * shrink})`,
            transition: settling || leaving ? "transform 200ms ease-out, opacity 180ms ease-out" : "opacity 200ms",
            cursor: zoomed ? "grab" : "zoom-out",
          }}
        />
      </div>

      <p
        className="pointer-events-none absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] text-center text-xs text-white/55"
        style={{ opacity: backdropOpacity }}
      >
        {zoomed ? "اضغط مرتين للتصغير" : "اضغط مرتين للتكبير — اسحب لأسفل للإغلاق"}
      </p>
      <span className="sr-only" aria-live="polite">
        {loaded ? "الصورة جاهزة" : "جارٍ تحميل الصورة"}
      </span>
    </div>,
    document.body
  );
}
