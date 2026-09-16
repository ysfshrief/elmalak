"use client";

import * as React from "react";
import { Trash2, MoreVertical } from "lucide-react";
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
 *
 * ولأن اللمس يختلف بين متصفّحٍ وآخر — وبعضها يُلغي مؤشّر اللمس (`pointercancel`)
 * لمجرّد أنه رجّح أن ما يجري تمرير — لا تُبنى إيماءةُ اللمس على أحداث المؤشّر
 * أصلًا، بل على أحداث اللمس نفسها: تبدأ بـ`touchstart` وتنتهي بـ`touchend` أو
 * بحركةٍ تتجاوز التسامح. والفأرة والقلم على مسار المؤشّر كما كانا.
 *
 * ومع هذا كلّه تبقى الإيماءة مخفيّة، والمخفيّ لا يُعتمد عليه وحده: كل صفٍّ
 * يحمل زرّ «⋮» ظاهرًا يفتح اللوحة نفسها. الإيماءة سرعةٌ لمن يعرفها، والزرّ
 * طريقٌ لمن لا يعرفها أو خذله متصفّحه.
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

  const begin = React.useCallback(
    (x: number, y: number, tolerance: number) => {
      swallowClick.current = false;
      origin.current = { x, y, tolerance };
      setHolding(true);
      timer.current = setTimeout(() => {
        swallowClick.current = true;
        open();
      }, HOLD_MS);
    },
    [open]
  );

  const movedTooFar = React.useCallback(
    (x: number, y: number) => {
      const start = origin.current;
      if (!start) return;
      if (Math.abs(x - start.x) > start.tolerance || Math.abs(y - start.y) > start.tolerance) cancel();
    },
    [cancel]
  );

  const handlers = disabled
    ? {}
    : {
        // الفأرة والقلم فقط — اللمس له مساره أدناه.
        onPointerDown: (event: React.PointerEvent) => {
          if (event.pointerType === "touch") return;
          if (event.button !== 0) return;
          begin(event.clientX, event.clientY, MOVE_TOLERANCE_PX.other);
        },
        onPointerMove: (event: React.PointerEvent) => {
          if (event.pointerType === "touch") return;
          movedTooFar(event.clientX, event.clientY);
        },
        onPointerUp: (event: React.PointerEvent) => {
          if (event.pointerType !== "touch") cancel();
        },
        onPointerLeave: (event: React.PointerEvent) => {
          if (event.pointerType !== "touch") cancel();
        },
        onPointerCancel: (event: React.PointerEvent) => {
          if (event.pointerType !== "touch") cancel();
        },
        // اللمس: أحداثه وحدها، فلا يُلغيها ترجيحُ المتصفّح أن ما يجري تمرير.
        onTouchStart: (event: React.TouchEvent) => {
          const touch = event.touches[0];
          if (!touch || event.touches.length > 1) return;
          begin(touch.clientX, touch.clientY, MOVE_TOLERANCE_PX.touch);
        },
        onTouchMove: (event: React.TouchEvent) => {
          const touch = event.touches[0];
          if (touch) movedTooFar(touch.clientX, touch.clientY);
        },
        onTouchEnd: cancel,
        onTouchCancel: cancel,
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
  menu,
  className,
  children,
}: {
  as?: "li" | "tr" | "div";
  name: string;
  description: string;
  onDelete: () => Promise<void>;
  onClick?: () => void;
  disabled?: boolean;
  /**
   * زرّ «⋮» ظاهرٌ يفتح اللوحة نفسها. يُطلب حيث لا يوجد زرّ حذفٍ آخر في الصف،
   * فلا يبقى الحذف معلّقًا بإيماءةٍ مخفيّة قد لا يعرفها المستخدم.
   */
  menu?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { handlers, dialogs, armed, holding, gestureStyle, openSheet } = useDeleteGesture({
    name,
    description,
    onDelete,
    disabled,
  });
  const showMenu = menu && !disabled && Tag !== "tr";

  return (
    <Tag
      {...handlers}
      onClick={onClick}
      className={cn(
        // ردّ فعلٍ فوريّ على الضغطة: بلا هذا لا يعرف الإصبعُ أن شيئًا يحدث.
        "transition-[transform,background-color] duration-200 ease-out",
        showMenu && "relative",
        holding && "bg-primary-soft/40",
        holding && Tag !== "tr" && "scale-[0.98]",
        className
      )}
      style={gestureStyle}
      data-armed={armed || undefined}
      data-holding={holding || undefined}
    >
      {children}
      {showMenu && (
        <button
          type="button"
          aria-label={`خيارات ${name}`}
          onClick={(event) => {
            // الصفّ كلّه رابطٌ أو قابلٌ للنقر، فلا تصل النقرة إليه.
            event.preventDefault();
            event.stopPropagation();
            openSheet();
          }}
          className={cn(
            "absolute end-1 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center",
            "rounded-full text-ink-faint transition-colors hover:bg-bg-alt hover:text-ink active:bg-bg-alt"
          )}
        >
          <MoreVertical className="size-4.5" aria-hidden />
        </button>
      )}
      {dialogs}
    </Tag>
  );
}
