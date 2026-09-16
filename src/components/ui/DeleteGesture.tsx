"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * كشف زرّ الحذف بالضغط المطوّل على العنصر (وبالزرّ الأيمن على الحاسوب).
 *
 * الضغط المطوّل لا يحذف شيئًا — يفتح لوحةً فيها زرّ الحذف، ثم يُطلب تأكيد.
 * ثلاث خطوات لفعلٍ لا رجعة فيه، وهي في محلّها.
 *
 * ولا تُفتح اللوحة إن تحرّك الإصبع: التمرير في قائمة طويلة لا يجوز أن ينتهي
 * بنافذة حذف. ولا تظهر أصلًا لمن لا يملك صلاحية الحذف — والخادم يتحقق ثانيةً
 * على كل حال، فالإخفاء للراحة لا للأمان.
 *
 * ثلاثة أشياء تخصّ اللمس وحده، وغيابها كان يجعل الإيماءة تعمل على الحاسوب
 * ولا تعمل على الهاتف:
 *
 *  ١) رفعُ الإصبع بعد الضغطة المطوّلة يُطلق `click` على الرابط تحته، فتنتقل
 *     الصفحة وتختفي اللوحة التي فُتحت لتوّها. الحاسوب لم يُظهر ذلك لأن الزرّ
 *     الأيمن لا يُطلق `click` أصلًا. لذلك نبتلع تلك النقرة في طور الالتقاط.
 *  ٢) المتصفّح نفسه يملك ضغطةً مطوّلة عند ٥٠٠ ملّي تقريبًا: تحديد نص، أو قائمة
 *     الرابط، أو سحبه. أيّها سبقنا ألغى إيماءتنا (`pointercancel`). فنُعطّل تلك
 *     السلوكيات على الصفّ ونسبقها بوقتٍ أقصر.
 *  ٣) الإصبع يهتزّ. تسامحٌ بعشر بكسلات كافٍ للفأرة وضيّقٌ على اللمس.
 */

const HOLD_MS = 420;
const MOVE_TOLERANCE_PX = { touch: 16, other: 8 };

/** تعطيل ضغطات المتصفّح المطوّلة كي لا تسبق ضغطتنا وتُلغيها. */
const SUPPRESS_NATIVE_GESTURES: React.CSSProperties = {
  // يُبقي تمرير الصفحة والتكبير بإصبعين، ويمنع ما عداهما.
  touchAction: "pan-y pinch-zoom",
  // بلا هذا يبدأ الهاتف تحديد النص عند ٥٠٠ ملّي فيُلغي الإيماءة.
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",
};

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
  const [holding, setHolding] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = React.useRef<{ x: number; y: number; tolerance: number } | null>(null);
  /** النقرة التالية ناتجةٌ عن رفع الإصبع بعد الضغطة المطوّلة، فتُبتلع. */
  const swallowClick = React.useRef(false);

  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
    setHolding(false);
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
          swallowClick.current = false;
          origin.current = {
            x: event.clientX,
            y: event.clientY,
            tolerance:
              event.pointerType === "touch" ? MOVE_TOLERANCE_PX.touch : MOVE_TOLERANCE_PX.other,
          };
          setHolding(true);
          timer.current = setTimeout(() => {
            swallowClick.current = true;
            open();
          }, HOLD_MS);
        },
        onPointerMove: (event: React.PointerEvent) => {
          const start = origin.current;
          if (!start) return;
          const moved =
            Math.abs(event.clientX - start.x) > start.tolerance ||
            Math.abs(event.clientY - start.y) > start.tolerance;
          if (moved) cancel();
        },
        onPointerUp: cancel,
        onPointerLeave: cancel,
        onPointerCancel: cancel,
        // في طور الالتقاط، فتُمنع النقرة قبل أن تصل إلى الرابط في الداخل.
        onClickCapture: (event: React.MouseEvent) => {
          if (!swallowClick.current) return;
          swallowClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        },
        // الضغط المطوّل على رابطٍ أو صورة يبدأ سحبًا في بعض المتصفّحات.
        onDragStart: (event: React.DragEvent) => event.preventDefault(),
        // على الحاسوب: الزرّ الأيمن يفتح اللوحة نفسها، فيبقى الحذف مكتشَفًا.
        // وعلى أندرويد تُطلق الضغطةُ المطوّلة هذا الحدث، فمنعه يمنع قائمة النظام.
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

  return {
    handlers,
    dialogs,
    armed: sheetOpen,
    holding,
    openSheet: open,
    gestureStyle: disabled ? undefined : SUPPRESS_NATIVE_GESTURES,
  };
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
  const { handlers, dialogs, armed, holding, gestureStyle } = useDeleteGesture({
    name,
    description,
    onDelete,
    disabled,
  });

  return (
    <Tag
      {...handlers}
      onClick={onClick}
      className={cn(
        // ردّ فعلٍ فوريّ على الضغطة: بلا هذا لا يعرف الإصبعُ أن شيئًا يحدث.
        "transition-[transform,background-color] duration-200 ease-out",
        holding && "bg-primary-soft/40",
        holding && Tag !== "tr" && "scale-[0.98]",
        className
      )}
      style={gestureStyle}
      data-armed={armed || undefined}
      data-holding={holding || undefined}
    >
      {children}
      {dialogs}
    </Tag>
  );
}
