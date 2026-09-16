"use client";

import * as React from "react";

/**
 * تحريك وتكبير بإصبع أو إصبعين — يشترك فيه القاصّ وعارض الصورة.
 *
 * مبني على أحداث المؤشّر لا على أحداث اللمس، فتعمل الفأرة واللمس والقلم بنفس
 * الشيفرة. والتكبير بإصبعين يقع حول نقطة المنتصف بينهما، لا حول مركز الشاشة،
 * وإلا انزلقت الصورة من تحت الإصبع.
 */

export type Transform = { x: number; y: number; scale: number };

export function usePanZoom({
  minScale = 1,
  maxScale = 5,
  onChange,
}: {
  minScale?: number;
  maxScale?: number;
  onChange?: (transform: Transform) => void;
} = {}) {
  const [transform, setTransform] = React.useState<Transform>({ x: 0, y: 0, scale: minScale });
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ distance: number; scale: number } | null>(null);

  const apply = React.useCallback(
    (next: Transform | ((previous: Transform) => Transform)) => {
      setTransform((previous) => {
        const value = typeof next === "function" ? next(previous) : next;
        const clamped = {
          ...value,
          scale: Math.min(maxScale, Math.max(minScale, value.scale)),
        };
        onChange?.(clamped);
        return clamped;
      });
    },
    [minScale, maxScale, onChange]
  );

  const reset = React.useCallback(() => apply({ x: 0, y: 0, scale: minScale }), [apply, minScale]);

  const handlers = {
    onPointerDown: (event: React.PointerEvent) => {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      pinch.current = null;
    },

    onPointerMove: (event: React.PointerEvent) => {
      const active = pointers.current;
      if (!active.has(event.pointerId)) return;

      const previous = active.get(event.pointerId)!;
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (active.size === 1) {
        apply((current) => ({
          ...current,
          x: current.x + (event.clientX - previous.x),
          y: current.y + (event.clientY - previous.y),
        }));
        return;
      }

      if (active.size === 2) {
        const [a, b] = [...active.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (!pinch.current) {
          pinch.current = { distance, scale: transform.scale };
          return;
        }
        const ratio = distance / pinch.current.distance;
        apply((current) => ({ ...current, scale: pinch.current!.scale * ratio }));
      }
    },

    onPointerUp: (event: React.PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
    },
    onPointerCancel: (event: React.PointerEvent) => {
      pointers.current.delete(event.pointerId);
      pinch.current = null;
    },

    onWheel: (event: React.WheelEvent) => {
      // التكبير بالعجلة على الحاسوب: خطوة ناعمة متناسبة مع سرعة التمرير.
      const factor = Math.exp(-event.deltaY / 500);
      apply((current) => ({ ...current, scale: current.scale * factor }));
    },

    onDoubleClick: () => {
      apply((current) =>
        current.scale > minScale * 1.05
          ? { x: 0, y: 0, scale: minScale }
          : { ...current, scale: Math.min(maxScale, minScale * 2) }
      );
    },
  };

  return { transform, setTransform: apply, reset, handlers };
}
