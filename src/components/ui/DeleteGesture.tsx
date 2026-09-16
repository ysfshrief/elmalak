"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";

/**
 * كشف زرّ الحذف بالضغط المطوّل على العنصر (وبالزرّ الأيمن على الحاسوب).
 *
 * الضغط المطوّل لا يحذف شيئًا — يفتح لوحةً فيها زرّ الحذف، ثم يُطلب تأكيد.
 * ثلاث خطوات لفعلٍ لا رجعة فيه، وهي في محلّها.
 *
 * ولا تُفتح اللوحة إن تحرّك الإصبع: التمرير في قائمة طويلة لا يجوز أن ينتهي
 * بنافذة حذف. ولا تظهر أصلًا لمن لا يملك صلاحية الحذف — والخادم يتحقق ثانيةً
 * على كل حال، فالإخفاء للراحة لا للأمان.
 */

const HOLD_MS = 500;
const MOVE_TOLERANCE_PX = 10;

export function useDeleteGesture({
  name,
  description,
  onDelete,
  disabled,
}: {
  /** اسم العنصر كما يُعرض في اللوحة والتأكيد. */
  name: string;
  description: string;
  onDelete: () => Promise<void>;
  disabled?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = React.useRef<{ x: number; y: number } | null>(null);

  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  const open = React.useCallback(() => {
    cancel();
    setSheetOpen(true);
    // اهتزازة قصيرة تؤكّد أن الضغطة سُجّلت، حيث يدعمها الجهاز.
    navigator.vibrate?.(12);
  }, [cancel]);

  const handlers = disabled
    ? {}
    : {
        onPointerDown: (event: React.PointerEvent) => {
          // الزرّ الأيمن ووسط الفأرة لهما مسارهما، والضغط المطوّل للمس والإصبع.
          if (event.button !== 0) return;
          origin.current = { x: event.clientX, y: event.clientY };
          timer.current = setTimeout(open, HOLD_MS);
        },
        onPointerMove: (event: React.PointerEvent) => {
          const start = origin.current;
          if (!start) return;
          const moved =
            Math.abs(event.clientX - start.x) > MOVE_TOLERANCE_PX ||
            Math.abs(event.clientY - start.y) > MOVE_TOLERANCE_PX;
          if (moved) cancel();
        },
        onPointerUp: cancel,
        onPointerLeave: cancel,
        onPointerCancel: cancel,
        // على الحاسوب: الزرّ الأيمن يفتح اللوحة نفسها، فيبقى الحذف مكتشَفًا.
        onContextMenu: (event: React.MouseEvent) => {
          event.preventDefault();
          open();
        },
      };

  async function remove() {
    setBusy(true);
    try {
      await onDelete();
      setConfirmOpen(false);
      setSheetOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const dialogs = (
    <>
      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title={name} size="sm">
        <p className="text-sm text-ink-muted">اختر الإجراء المطلوب.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            حذف
          </Button>
          <Button variant="outline" onClick={() => setSheetOpen(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="تأكيد الحذف"
        description={description}
        confirmLabel="حذف نهائيًا"
        loading={busy}
        onConfirm={remove}
      />
    </>
  );

  return { handlers, dialogs, armed: sheetOpen, openSheet: open };
}

/** تلميح ثابت بأن الضغط المطوّل يكشف الحذف — يُعرض مرة في أعلى القائمة. */
export function LongPressHint({ children = "اضغط مطوّلًا على أي عنصر لحذفه" }: { children?: string }) {
  return <p className="text-xs text-ink-faint">{children}</p>;
}

/**
 * عنصر قائمة يكشف الحذف بالضغط المطوّل. مكوّنٌ مستقل لأن الخطّاف لا يُستدعى
 * داخل حلقة، ولأن كل عنصر يحتاج حالته الخاصة.
 */
export function DeletableRow({
  as: Tag = "li",
  name,
  description,
  onDelete,
  onClick,
  disabled,
  className,
  children,
}: {
  as?: "li" | "tr" | "div";
  name: string;
  description: string;
  onDelete: () => Promise<void>;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { handlers, dialogs, armed } = useDeleteGesture({ name, description, onDelete, disabled });

  return (
    <Tag
      {...handlers}
      onClick={onClick}
      className={className}
      // يمنع قائمة النسخ/اللصق التي يفتحها الضغط المطوّل في متصفّحات الهاتف.
      style={disabled ? undefined : { WebkitTouchCallout: "none" }}
      data-armed={armed || undefined}
    >
      {children}
      {dialogs}
    </Tag>
  );
}
