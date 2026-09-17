"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * صندوقٌ يشبه صفَّ المخدوم تمامًا — رابطٌ داخل عنصرٍ يحمل الإيماءة نفسها —
 * ويسجّل كل حدثٍ يُطلقه إصبعك بتوقيته بالملّي ثانية.
 *
 * لا يحذف شيئًا ولا يذهب إلى مكان. غايته أن يقول: هل وصل `touchstart`؟ وهل
 * اكتملت نصف الثانية؟ وإن لم تكتمل، فأيُّ حدثٍ قطعها — حركةٌ تجاوزت التسامح،
 * أم إلغاءٌ من المتصفّح نفسه؟ ثم يُنسخ السجلّ كاملًا بضغطة.
 */

const HOLD_MS = 420;
const TOLERANCE = 16;

type Entry = { at: number; text: string };

/**
 * وصفُ الجهاز يُقرأ من المتصفّح، وهو ثابتٌ لا يتغيّر، فيُقرأ مرةً ويُخزَّن.
 * والخادم لا يعرف عنه شيئًا، فيرى لا شيء حتى يصل إلى المتصفّح.
 */
const NO_ENV: string[] = [];
let envCache: string[] | null = null;
const subscribeNothing = () => () => {};

function readEnvironment() {
  if (envCache) return envCache;
  const media = (query: string) => (window.matchMedia(query).matches ? "نعم" : "لا");
  envCache = [
    `المتصفّح: ${navigator.userAgent}`,
    `نقاط لمس قصوى: ${navigator.maxTouchPoints}`,
    `مؤشّر خشن (لمس): ${media("(pointer: coarse)")}`,
    `يدعم التحويم: ${media("(hover: hover)")}`,
    `تقليل الحركة: ${media("(prefers-reduced-motion: reduce)")}`,
    `عرض الشاشة: ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
    `PointerEvent: ${"PointerEvent" in window ? "مدعوم" : "غير مدعوم"}`,
    `TouchEvent: ${"ontouchstart" in window ? "مدعوم" : "غير مدعوم"}`,
    `vibrate: ${typeof navigator.vibrate === "function" ? "مدعوم" : "غير مدعوم"}`,
  ];
  return envCache;
}

export function GestureProbe() {
  const [log, setLog] = React.useState<Entry[]>([]);
  const [result, setResult] = React.useState<"idle" | "done" | "cut">("idle");
  const [holding, setHolding] = React.useState(false);
  const env = React.useSyncExternalStore(subscribeNothing, readEnvironment, () => NO_ENV);
  const started = React.useRef(0);
  const origin = React.useRef<{ x: number; y: number } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** انتهت الضغطة السابقة، فأوّلُ حدثٍ بعدها يبدأ سجلًّا جديدًا. */
  const ended = React.useRef(true);

  // يُستدعى قبل تسجيل أول حدث، لا داخل `begin`: بعض المتصفّحات تُطلق
  // `pointerdown` قبل `touchstart`، فلو مُسح السجلّ عند البدء لضاع أوّلُ سطر.
  const newSession = React.useCallback(() => {
    if (!ended.current) return;
    ended.current = false;
    started.current = performance.now();
    setLog([]);
    setResult("idle");
  }, []);

  const add = React.useCallback((text: string) => {
    setLog((prev) =>
      prev.length > 60 ? prev : [...prev, { at: Math.round(performance.now() - started.current), text }]
    );
  }, []);

  const stop = React.useCallback(
    (why: string) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        setResult("cut");
        add(`⛔ انقطعت الإيماءة — ${why}`);
      }
      origin.current = null;
      setHolding(false);
    },
    [add]
  );

  function begin(x: number, y: number, source: string) {
    setHolding(true);
    origin.current = { x, y };
    add(`▶ بدأ الضغط (${source})`);
    timer.current = setTimeout(() => {
      timer.current = null;
      setResult("done");
      setHolding(false);
      add(`✅ اكتملت الإيماءة بعد ${HOLD_MS} ملّي — هنا كانت لوحة الحذف ستُفتح`);
      navigator.vibrate?.(12);
    }, HOLD_MS);
  }

  function move(x: number, y: number) {
    const start = origin.current;
    if (!start) return;
    const dx = Math.round(Math.abs(x - start.x));
    const dy = Math.round(Math.abs(y - start.y));
    if (dx > TOLERANCE || dy > TOLERANCE) stop(`تحرّك الإصبع ${dx}px أفقيًا و${dy}px رأسيًا`);
  }

  const report = [
    ...env,
    "",
    ...log.map((entry) => `${String(entry.at).padStart(4, " ")}ms  ${entry.text}`),
  ].join("\n");

  return (
    <Card className="animate-fade-in-up">
      <CardHeader className="flex-wrap">
        <CardTitle>اختبار الضغط المطوّل</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(report);
              toast.success("نُسخ التقرير — أرسِله كما هو");
            } catch {
              toast.error("تعذّر النسخ، صوّر الشاشة بدلًا منه");
            }
          }}
        >
          <Copy className="size-4" />
          نسخ التقرير
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-ink-muted">
          اضغط مطوّلًا على الصندوق بالأسفل نصف ثانية تقريبًا، ثم ارفع إصبعك. لا يُحذف شيء
          ولا تنتقل الصفحة — يُسجَّل فقط ما فعله جهازك.
        </p>

        <div
          onPointerDown={(e) => {
            newSession();
            add(`pointerdown (${e.pointerType})`);
            if (e.pointerType === "touch") return;
            if (e.button === 0) begin(e.clientX, e.clientY, "فأرة/قلم");
          }}
          onPointerMove={(e) => e.pointerType !== "touch" && move(e.clientX, e.clientY)}
          onPointerUp={(e) => {
            add(`pointerup (${e.pointerType})`);
            ended.current = true;
            if (e.pointerType !== "touch") stop("رُفع الإصبع قبل اكتمال المدة");
          }}
          onPointerCancel={(e) => {
            add(`⚠ pointercancel (${e.pointerType}) — المتصفّح ألغى المؤشّر`);
            if (e.pointerType !== "touch") {
              ended.current = true;
              stop("ألغى المتصفّح المؤشّر");
            }
          }}
          onTouchStart={(e) => {
            newSession();
            const touch = e.touches[0];
            add(`touchstart (${e.touches.length} إصبع)`);
            if (touch && e.touches.length === 1) begin(touch.clientX, touch.clientY, "لمس");
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (touch) move(touch.clientX, touch.clientY);
          }}
          onTouchEnd={() => {
            add("touchend");
            ended.current = true;
            stop("رُفع الإصبع قبل اكتمال المدة");
          }}
          onTouchCancel={() => {
            add("⚠ touchcancel — المتصفّح استولى على اللمسة");
            ended.current = true;
            stop("استولى المتصفّح على اللمسة");
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            add("contextmenu — قائمة النظام (مُنعت)");
          }}
          onClickCapture={() => add("click")}
          style={{
            touchAction: "pan-y pinch-zoom",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            WebkitTapHighlightColor: "transparent",
          }}
          className={cn(
            "rounded-[var(--radius-lg)] border-2 border-dashed p-5 text-center transition-colors",
            result === "done"
              ? "border-success bg-success-soft"
              : result === "cut"
                ? "border-error bg-error-soft"
                : holding
                  ? "border-primary bg-primary-soft"
                  : "border-border-strong bg-surface-2"
          )}
        >
          {/* رابطٌ حقيقي في الداخل: الصفُّ الحقيقي كذلك، وهو مصدر أغلب المشاكل. */}
          <a
            href="#probe"
            onClick={(e) => e.preventDefault()}
            className="block text-base font-bold text-ink"
          >
            اضغط هنا مطوّلًا
          </a>
          <p className="mt-1 text-xs text-ink-faint">
            {result === "done"
              ? "نجحت الإيماءة على جهازك"
              : result === "cut"
                ? "انقطعت — التفصيل في السجلّ بالأسفل"
                : "بانتظار الضغطة"}
          </p>
        </div>

        {log.length > 0 && (
          <div className="rounded-[var(--radius-md)] border border-border bg-bg-alt p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-ink-muted">سجلّ الأحداث</p>
              <button
                type="button"
                onClick={() => {
                  setLog([]);
                  setResult("idle");
                }}
                className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
              >
                <RotateCcw className="size-3.5" />
                مسح
              </button>
            </div>
            <ul className="mt-2 space-y-0.5 font-mono text-[0.7rem] leading-relaxed text-ink" dir="ltr">
              {log.map((entry, i) => (
                <li key={i}>
                  {String(entry.at).padStart(4, "0")}ms · {entry.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="text-xs text-ink-muted">
          <summary className="cursor-pointer font-semibold">بيانات الجهاز</summary>
          <ul className="mt-2 space-y-1 break-all" dir="ltr">
            {env.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
